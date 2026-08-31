/**
 * In-memory row stores backed by device storage.
 *
 * Every read is served from memory; storage is a write-behind durability layer.
 * That mirrors 1.x, but with three changes that account for nearly all of the
 * measured cost in the old backend:
 *
 *  1. **Lazy PNG hydration.** 1.x decoded every stored PNG from base64 during
 *     boot, so start-up cost grew linearly with gallery size. Here the images
 *     store holds only metadata (`has_png` / `png_bytes`) and pixel data is
 *     fetched on first real use (module `readImage`, or a leftover `inx_nximg_*`),
 *     then held in a byte-budgeted LRU. Callers that only need a size use
 *     `imageMeta()` and never touch storage at all.
 *  2. **Coalesced persistence.** 1.x re-serialised an entire store on every
 *     single row write, so a job that touched `meta` 47 times wrote 47 full
 *     snapshots. Writes now mark the store dirty and one flush covers the burst.
 *  3. **Session index for cards.** Per-session lookups were full scans.
 *  4. **Job retention.** Completed job rows are capped at the newest 3 so
 *     `inx_nxstore_jobs` cannot grow without bound. In-flight rows stay.
 *
 * Row shapes on disk are unchanged, so 1.x data loads as-is and a downgrade
 * would still read anything written here.
 */

import {
  CARD_PACK_KEY,
  ROOM_INDEX_KEY,
  charRefDiskDataKey,
  charRefDiskImageKey,
  IMAGE_KEY,
  LEGACY_IMAGE_KEY,
  LEGACY_REF_IMAGE_KEY,
  LEGACY_STORE_KEY,
  MIGRATION_META_KEY,
  MIGRATION_VERSION,
  REF_IMAGE_KEY,
  STORE_KEY,
  STORE_NAMES,
  VIBE_DATA_KEY,
  VIBE_IMAGE_KEY,
  VIBE_PRESET_DATA_KEY,
  VIBE_PRESET_IMAGE_KEY,
  characterIdFromCharRefMetaKey,
  isCharRefMetaKey,
  isVibePresetMetaKey,
  presetIdFromVibeMetaKey,
} from '../core/constants';
import { dbg } from '../core/debug';
import { base64ToAb, bytesToBase64Async } from '../core/util/bytes';
import type { CardRow, CharacterRecord, JobRow, MetaRow, StoreName } from '../core/types';
import { cardIdsToStripPreview } from '../domain/gallery/preview-retention';
import { jobIdsToPrune } from '../domain/jobs/retention';
import { psGet, psRemove, psSet, resetDeviceStore } from './device-store';
import { blobUrlCache, explorerThumbCache } from './blob-url-cache';
import {
  dropShotAsset,
  listShotAssets,
  putShotAsset,
  readShotAssetBytes,
  restampShotAssetNames,
  setKnownShotCount,
} from './shot-module';

/** Rows as held in memory. Images carry metadata even when pixels are absent. */
interface ImageMemRow {
  id: string;
  location: Record<string, unknown>;
  /**
   * Set when the image is published, absent after a reload — 1.x never wrote it
   * to the index and readers fall back to sniffing the bytes, which yields the
   * same answer. Kept off disk so the on-disk shape stays byte-compatible.
   */
  mime?: string;
  png: ArrayBuffer | null;
  has_png: boolean;
  png_bytes: number;
  /** False when `has_png` is true but the bytes have not been fetched yet. */
  hydrated: boolean;
  /**
   * True once the bytes are known to exist in storage. Freshly written rows are
   * not durable until the background blob write lands, and until then the
   * in-memory copy is the only one, so it must never be evicted.
   */
  durable: boolean;
  /** Risu module path from saveAsset. Empty when the row is legacy plugin storage. */
  asset_path?: string;
  asset_name?: string;
}

type RowOf<S extends StoreName> = S extends 'cards'
  ? CardRow
  : S extends 'characters'
    ? CharacterRecord
    : S extends 'jobs'
      ? JobRow
      : S extends 'meta'
        ? MetaRow
        : ImageMemRow;

const memStores = {
  meta: new Map<string, MetaRow>(),
  cards: new Map<string, CardRow>(),
  characters: new Map<string, CharacterRecord>(),
  jobs: new Map<string, JobRow>(),
  images: new Map<string, ImageMemRow>(),
};

/** session_id -> card ids. Maintained on every cards mutation. */
const cardsBySession = new Map<string, Set<string>>();

function indexCard(row: CardRow): void {
  const sid = String(row.session_id ?? '');
  if (!sid) return;
  let set = cardsBySession.get(sid);
  if (!set) {
    set = new Set();
    cardsBySession.set(sid, set);
  }
  set.add(String(row.id));
}

function deindexCard(row: CardRow | undefined): void {
  if (!row) return;
  const sid = String(row.session_id ?? '');
  const set = sid ? cardsBySession.get(sid) : undefined;
  if (!set) return;
  set.delete(String(row.id));
  if (set.size === 0) cardsBySession.delete(sid);
}

// ---------------------------------------------------------------------------
// Per-room packs
// ---------------------------------------------------------------------------

/**
 * `cards` and `images` are stored one character-chat at a time.
 *
 * They used to be two rows holding every room, so opening any chat read the
 * whole gallery's metadata — roughly 3 MB before it could draw anything. A room
 * pack holds both stores for one chat, because a card and its image row share an
 * id and are always wanted together.
 *
 * `inx_nxrooms` is the index: it says which rooms exist and how much each holds,
 * so totals and the explorer's folder list never open a pack.
 */
interface RoomPack {
  cards: Record<string, unknown>;
  images: Record<string, unknown>;
}

/** What `inx_nxrooms` keeps per room. Counts come from the pack as it is written. */
export interface RoomIndexRow {
  session_id: string;
  cards: number;
  images: number;
  png_bytes: number;
  character_id: string;
  character_name: string;
  chat_id: string;
  chat_name: string;
  char_index: number;
  chat_index: number;
  newest_at: number;
}

/** Rows with no session at all still need somewhere to live. */
const NO_ROOM = '__noroom';

/** Stores that are still one row for everything. */
const MONO_STORES = STORE_NAMES.filter((name) => name !== 'cards' && name !== 'images');

const roomIndex = new Map<string, RoomIndexRow>();
const loadedRooms = new Set<string>();
const dirtyRooms = new Set<string>();

/**
 * Which room a card id belongs to, for ids we have not loaded yet.
 *
 * Built from the gallery module's asset names, which carry the room since 2.5.23.
 * That is the only inventory readable without opening a pack.
 */
let cardRoomHint: Map<string, string> | null = null;

/**
 * The room for one id, from whichever of the two rows names a session.
 *
 * Both stores go through this so a card and its image can never be split across
 * packs: the card is written after its image during generation, so the image row
 * is the only one with a session at first, and the card is the only one with one
 * after an import.
 */
function roomOf(id: string): string {
  const card = memStores.cards.get(id);
  const fromCard = String(card?.session_id || '');
  if (fromCard) return fromCard;
  const img = memStores.images.get(id);
  const fromImage = String((img?.location as { session_id?: unknown } | undefined)?.session_id || '');
  return fromImage || NO_ROOM;
}

function markRoomDirty(sid: string): void {
  if (!sid) return;
  dirtyRooms.add(sid);
  loadedRooms.add(sid);
}

/** Both rooms, when a rewrite may have moved an id between them. */
function markRoomDirtyFor(id: string, previous?: string): void {
  if (previous) markRoomDirty(previous);
  markRoomDirty(roomOf(id));
}

// ---------------------------------------------------------------------------
// Key derivation (unchanged from 1.x — these define the on-disk layout)
// ---------------------------------------------------------------------------

export function storeKeyOf(store: StoreName, key: unknown): string {
  if (store === 'characters') {
    if (Array.isArray(key)) return `${key[0]}\t${key[1]}`;
    if (key && typeof key === 'object') {
      const k = key as { scope?: unknown; id?: unknown };
      return `${k.scope}\t${k.id}`;
    }
  }
  return String(key);
}

export function recordKeyOf(store: StoreName, value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  const v = value as Record<string, unknown>;
  if (store === 'meta') return String(v.key || '');
  if (store === 'characters') return `${v.scope}\t${v.id}`;
  return String(v.id || '');
}

// ---------------------------------------------------------------------------
// Write-behind persistence
// ---------------------------------------------------------------------------

/**
 * Bursts of row writes are common (a single job touches `jobs` and `meta`
 * repeatedly). Collapsing them into one snapshot per store is the single
 * largest saving in the backend; the flush delay only widens the pre-existing
 * fire-and-forget durability window, it does not change read semantics.
 */
const PERSIST_DEBOUNCE_MS = 25;

const dirty = new Set<StoreName>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushChain: Promise<void> = Promise.resolve();
let imagePersistChain: Promise<void> = Promise.resolve();
let pauseDiskPersist = false;

export function setPauseDiskPersist(paused: boolean): void {
  pauseDiskPersist = paused;
}

export function isDiskPersistPaused(): boolean {
  return pauseDiskPersist;
}

function slimJobRowForDisk(row: JobRow): JobRow {
  if (!row || typeof row !== 'object') return row;
  const out: JobRow = { ...row };
  if (!out.result_json) return out;
  try {
    const parsed = JSON.parse(out.result_json) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== 'object') return out;
    const slim: Record<string, unknown> = { ...parsed };
    delete slim.tagged;
    delete slim.appearance;
    delete slim.debug_tail;
    if (Array.isArray(slim.cards)) {
      slim.cards = (slim.cards as unknown[]).map((c) => {
        if (!c || typeof c !== 'object') return c;
        const card = { ...(c as Record<string, unknown>) };
        if (typeof card.image_url === 'string' && card.image_url.startsWith('data:')) card.image_url = '';
        return card;
      });
    }
    out.result_json = JSON.stringify(slim);
  } catch {
    /* leave result_json as-is when unparseable */
  }
  return out;
}

/** One row in the shape it is stored in. Shared by the store and pack writers. */
function diskRow(store: StoreName, k: string, v: unknown): unknown {
  if (store === 'images') {
    const img = v as ImageMemRow;
    const assetPath = String(img.asset_path || '');
    return {
      id: img.id,
      location: locationWithoutPreview(img.location),
      has_png: img.has_png,
      png_bytes: img.png_bytes,
      storage: assetPath ? 'module' : 'indexeddb',
      storage_key: assetPath || IMAGE_KEY(k),
      ...(assetPath ? { asset_path: assetPath, asset_name: img.asset_name || '' } : {}),
    };
  }
  const row = v as Record<string, unknown>;
  if (store === 'meta' && row?.key === 'reference_image') {
    return { key: 'reference_image', has_png: Boolean(row.png), updated_at: row.updated_at || 0 };
  }
  return diskMetaOrJobRow(store, v, row);
}

function snapshotOf(store: StoreName): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of memStores[store] as Map<string, unknown>) obj[k] = diskRow(store, k, v);
  return obj;
}

function diskMetaOrJobRow(store: StoreName, v: unknown, row: Record<string, unknown>): unknown {
  if (store === 'meta' && row?.key === 'vibe_transfer') {
    return {
      key: 'vibe_transfer',
      has_png: Boolean(row.png),
      has_encoded: Boolean(row.encoded),
      model: row.model || '',
      information_extracted: row.information_extracted ?? 1.0,
      updated_at: row.updated_at || 0,
    };
  }
  if (store === 'meta' && isVibePresetMetaKey(row?.key)) {
    return {
      key: row.key,
      has_png: Boolean(row.png),
      has_encoded: Boolean(row.encoded),
      model: row.model || '',
      information_extracted: row.information_extracted ?? 1.0,
      updated_at: row.updated_at || 0,
    };
  }
  // Never JSON-embed ArrayBuffers into the meta blob — they become `{}` and
  // leave "configured" ghosts with no preview after reload (same as vibe).
  if (store === 'meta' && isCharRefMetaKey(row?.key)) {
    return {
      key: row.key,
      has_png: Boolean(row.png && (row.png as ArrayBuffer).byteLength > 0),
      has_encoded: Boolean(row.encoded),
      model: row.model || '',
      information_extracted: row.information_extracted ?? 1.0,
      updated_at: row.updated_at || 0,
    };
  }
  if (store === 'jobs') return slimJobRowForDisk(row as JobRow);
  return v;
}

/** Everything loaded that belongs to one room, in its on-disk shape. */
function packForRoom(sid: string): RoomPack {
  const pack: RoomPack = { cards: {}, images: {} };
  for (const [k, v] of memStores.cards) if (roomOf(k) === sid) pack.cards[k] = diskRow('cards', k, v);
  for (const [k, v] of memStores.images) if (roomOf(k) === sid) pack.images[k] = diskRow('images', k, v);
  return pack;
}

/**
 * The index entry for a room, derived from the pack about to be written.
 *
 * A room is always fully loaded before it can be written, so counting the pack
 * is exact — the index never drifts from what is on disk.
 */
function roomRowFrom(sid: string, pack: RoomPack): RoomIndexRow {
  const row: RoomIndexRow = {
    session_id: sid,
    cards: Object.keys(pack.cards).length,
    images: Object.keys(pack.images).length,
    png_bytes: 0,
    character_id: '',
    character_name: '',
    chat_id: '',
    chat_name: '',
    char_index: -1,
    chat_index: -1,
    newest_at: 0,
  };
  for (const img of Object.values(pack.images) as Array<Record<string, unknown>>) {
    row.png_bytes += Number(img.png_bytes) || 0;
    const loc = (img.location || {}) as Record<string, unknown>;
    row.character_id ||= String(loc.character_id || '');
    row.character_name ||= String(loc.character_name || '');
    row.chat_id ||= String(loc.chat_id || '');
    row.chat_name ||= String(loc.chat_name || '');
    if (row.char_index < 0) row.char_index = Number(loc.char_index ?? -1);
    if (row.chat_index < 0) row.chat_index = Number(loc.chat_index ?? -1);
  }
  for (const card of Object.values(pack.cards) as Array<Record<string, unknown>>) {
    row.newest_at = Math.max(row.newest_at, Number(card.created_at) || 0);
  }
  return row;
}

function roomIndexSnapshot(): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [sid, row] of roomIndex) obj[sid] = row;
  return obj;
}

/** Bulk rewrites touch every loaded row, so they dirty every loaded room. */
function markAllLoadedRoomsDirty(): void {
  for (const sid of loadedRooms) dirtyRooms.add(sid);
}

/** Writes the rooms that changed, then the index. */
async function persistRooms(): Promise<void> {
  const rooms = [...dirtyRooms];
  dirtyRooms.clear();
  if (!rooms.length) return;
  for (const sid of rooms) {
    const pack = packForRoom(sid);
    if (!Object.keys(pack.cards).length && !Object.keys(pack.images).length) {
      roomIndex.delete(sid);
      await psRemove(CARD_PACK_KEY(sid));
      continue;
    }
    roomIndex.set(sid, roomRowFrom(sid, pack));
    await psSet(CARD_PACK_KEY(sid), pack);
  }
  await psSet(ROOM_INDEX_KEY, roomIndexSnapshot());
}

async function persistStore(store: StoreName): Promise<void> {
  // Both packed stores live in the same pack, so either one flushes both. The
  // second call in a flush finds `dirtyRooms` already empty and does nothing.
  if (store === 'cards' || store === 'images') {
    await persistRooms();
    return;
  }
  await psSet(STORE_KEY(store), snapshotOf(store));
}

function runFlush(): void {
  flushTimer = null;
  const stores = [...dirty];
  dirty.clear();
  if (!stores.length) return;
  flushChain = flushChain
    .then(async () => {
      for (const store of stores) {
        if (pauseDiskPersist) {
          dbg('storage.persist.skip', { message: store, background: true });
          continue;
        }
        try {
          await persistStore(store);
        } catch (err) {
          console.warn('[Inlay Nexus] persist failed', store, (err as Error)?.message || err);
        }
      }
    })
    .catch(() => {});
}

function schedulePersist(store: StoreName): void {
  dirty.add(store);
  if (flushTimer) return;
  flushTimer = setTimeout(runFlush, PERSIST_DEBOUNCE_MS);
}

/**
 * Drop completed jobs past the retention cap. Must not await `openDb` — boot
 * calls this while the open promise is still unsettled.
 */
function pruneJobStoreUnlocked(opts: { persist?: boolean } = {}): number {
  const rows = [...memStores.jobs.entries()].map(([k, row]) => ({
    id: String(row.id || k),
    state: String(row.state || ''),
    created_at: Number(row.created_at || 0),
    updated_at: Number(row.updated_at || 0),
  }));
  const drop = new Set(jobIdsToPrune(rows));
  if (!drop.size) return 0;
  for (const [k, row] of memStores.jobs) {
    if (drop.has(String(row.id || k))) memStores.jobs.delete(k);
  }
  if (opts.persist !== false) schedulePersist('jobs');
  dbg('jobs.prune', { message: `${drop.size} dropped`, dropped: drop.size, kept: memStores.jobs.size });
  return drop.size;
}

function locationWithoutPreview(
  loc: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!loc || typeof loc !== 'object') return loc ?? null;
  if (!Object.prototype.hasOwnProperty.call(loc, 'assistant_preview')) return loc;
  const next = { ...loc };
  delete next.assistant_preview;
  return next;
}

function clearCardAssistantPreview(row: CardRow): boolean {
  let changed = false;
  if (row.assistant_preview) {
    delete row.assistant_preview;
    changed = true;
  }
  const raw = row.meta_json;
  if (typeof raw !== 'string' || !raw.includes('assistant_preview')) return changed;
  try {
    const meta = JSON.parse(raw) as Record<string, unknown>;
    if (!meta || typeof meta !== 'object' || !meta.assistant_preview) return changed;
    delete meta.assistant_preview;
    row.meta_json = JSON.stringify(meta);
    return true;
  } catch {
    return changed;
  }
}

/** Newest 20 cards keep preview for stream rematch; older cards drop the prose. */
function pruneCardPreviewsUnlocked(opts: { persist?: boolean } = {}): number {
  const rows = [...memStores.cards.values()].map((row) => ({
    id: String(row.id || ''),
    created_at: Number(row.created_at || 0),
  }));
  const drop = new Set(cardIdsToStripPreview(rows));
  if (!drop.size) return 0;
  let n = 0;
  for (const [k, row] of memStores.cards) {
    if (!drop.has(String(row.id || k))) continue;
    if (clearCardAssistantPreview(row)) n += 1;
  }
  if (n && opts.persist !== false) schedulePersist('cards');
  return n;
}

function stripImageLocationPreviewsUnlocked(): number {
  let n = 0;
  for (const row of memStores.images.values()) {
    const loc = row.location;
    if (!loc || typeof loc !== 'object' || !Object.prototype.hasOwnProperty.call(loc, 'assistant_preview')) {
      continue;
    }
    const next = { ...loc };
    delete next.assistant_preview;
    row.location = next;
    n += 1;
  }
  return n;
}

// ---------------------------------------------------------------------------
// One-time migration stamp
// ---------------------------------------------------------------------------

/**
 * Reads the stamp from memory only, so `openDb` can consult it mid-load.
 * `meta` is the first store loaded, so it is already populated by then.
 */
function migratedVersionUnlocked(): number {
  const row = memStores.meta.get(MIGRATION_META_KEY);
  return Number(row?.version ?? 0) || 0;
}

function stampMigratedUnlocked(version: number): void {
  memStores.meta.set(MIGRATION_META_KEY, {
    key: MIGRATION_META_KEY,
    version,
    at: Date.now(),
  });
}

/** 0 when the storage migration has never run on this device. */
export async function storageMigratedVersion(): Promise<number> {
  await openDb();
  return migratedVersionUnlocked();
}

export async function isStorageMigrated(): Promise<boolean> {
  return (await storageMigratedVersion()) >= MIGRATION_VERSION;
}

/** Records the migration. Written through rather than debounced — it gates boot. */
export async function stampStorageMigrated(version: number = MIGRATION_VERSION): Promise<number> {
  await openDb();
  stampMigratedUnlocked(version);
  await persistStore('meta');
  return version;
}

/**
 * Writes one store snapshot immediately, ignoring both the debounce and the
 * pause flag. The migration needs this: it pauses write-behind so a gallery
 * walk cannot rewrite the index thousands of times, but must still checkpoint
 * each batch — and a paused `runFlush` drops the write rather than deferring it.
 */
export async function persistStoreNow(store: StoreName): Promise<void> {
  await openDb();
  dirty.delete(store);
  await persistStore(store);
}

/** Waits until every pending row write and image blob write has landed. */
export async function flushPersist(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    runFlush();
  }
  await flushChain;
  await imagePersistChain;
}

/**
 * Write-behind persistence leaves a ~25 ms window in which a mutation exists only
 * in memory. Callers that must not lose data await `flushPersist()` directly; this
 * covers everything else by flushing as soon as the page starts going away.
 *
 * `visibilitychange` is the hook that matters — it is the last point at which an
 * async write can still be relied on, whereas `pagehide` may not outlive the
 * transaction. Neither can be awaited, so this starts the write rather than
 * guaranteeing it, which is strictly better than letting the timer run down.
 */
function installFlushOnHide(): void {
  const doc = (globalThis as { document?: Document }).document;
  if (!doc?.addEventListener) return;
  const flush = (): void => {
    if (!flushTimer && !dirty.size) return;
    void flushPersist();
  };
  doc.addEventListener('visibilitychange', () => {
    if (doc.visibilityState === 'hidden') flush();
  });
  (globalThis as { addEventListener?: typeof addEventListener }).addEventListener?.('pagehide', flush);
}

installFlushOnHide();

// ---------------------------------------------------------------------------
// Lazy PNG hydration
// ---------------------------------------------------------------------------

/**
 * Decoded PNGs are large, so the cache is bounded by bytes rather than count and
 * evicts least-recently-used entries. A Map preserves insertion order, so
 * re-inserting on read is enough to maintain recency.
 */
const PNG_CACHE_BUDGET = 96 * 1024 * 1024;
let pngCacheBytes = 0;

function touchPng(id: string, row: ImageMemRow): void {
  memStores.images.delete(id);
  memStores.images.set(id, row);
}

function chargePng(bytes: number): void {
  pngCacheBytes += bytes;
  if (pngCacheBytes <= PNG_CACHE_BUDGET) return;
  for (const row of memStores.images.values()) {
    if (pngCacheBytes <= PNG_CACHE_BUDGET) break;
    if (!row.png || !row.durable) continue;
    pngCacheBytes -= row.png.byteLength;
    row.png = null;
    row.hydrated = false;
  }
}

const hydrating = new Map<string, Promise<ArrayBuffer | null>>();

/** Storage hands back `unknown`; only a non-empty string can be decoded. */
const decodeStoredPng = (raw: unknown): ArrayBuffer | null =>
  typeof raw === 'string' && raw ? base64ToAb(raw) : null;

/** Recover bytes from a legacy meta row that still holds a live ArrayBuffer. */
const legacyImageBytes = (raw: unknown): ArrayBuffer | null => {
  if (raw instanceof ArrayBuffer && raw.byteLength > 32) return raw;
  if (ArrayBuffer.isView(raw) && raw.byteLength > 32) {
    return new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength).slice().buffer;
  }
  return null;
};

async function hydrateImage(id: string, row: ImageMemRow): Promise<ArrayBuffer | null> {
  if (row.hydrated) return row.png;
  const existing = hydrating.get(id);
  if (existing) return existing;
  const task = (async () => {
    const assetPath = String(row.asset_path || row.location?.asset_path || '');
    let png = assetPath ? await readShotAssetBytes(assetPath) : null;
    if (!png) {
      // Once migrated there is no 1.x `nximg_*` row left to find, so asking the
      // save file for one is a round-trip that can only ever miss.
      const migrated = migratedVersionUnlocked() >= MIGRATION_VERSION;
      png = decodeStoredPng(
        migrated ? await psGet(IMAGE_KEY(id)) : await psGet(IMAGE_KEY(id), LEGACY_IMAGE_KEY(id)),
      );
    }
    row.png = png;
    row.hydrated = true;
    row.durable = true;
    if (png) {
      row.png_bytes = png.byteLength;
      chargePng(png.byteLength);
    } else {
      row.has_png = false;
      row.png_bytes = 0;
    }
    return png;
  })().finally(() => hydrating.delete(id));
  hydrating.set(id, task);
  return task;
}

// ---------------------------------------------------------------------------
// Open / load
// ---------------------------------------------------------------------------

let storeReady: Promise<boolean> | null = null;

/** Parses a stored row, whether it came from a room pack or the old blob. */
function loadImageRow(k: string, v: Record<string, unknown>): void {
  const hasPng = Boolean(v.has_png);
  const loc = (v.location as Record<string, unknown>) || {};
  memStores.images.set(k, {
    id: String(v.id || k),
    location: loc,
    png: null,
    has_png: hasPng,
    png_bytes: Number(v.png_bytes) || 0,
    hydrated: !hasPng,
    durable: true,
    ...(typeof v.asset_path === 'string' && v.asset_path
      ? { asset_path: v.asset_path, asset_name: String(v.asset_name || '') }
      : typeof loc.asset_path === 'string' && loc.asset_path
        ? { asset_path: String(loc.asset_path), asset_name: String(loc.asset_name || '') }
        : {}),
  });
}

function loadCardRow(k: string, v: Record<string, unknown>): void {
  const row = v as unknown as CardRow;
  memStores.cards.set(k, row);
  indexCard(row);
}

/** Reads a stored JSON value that may already be parsed. */
function parseStored(raw: unknown): Record<string, unknown> | null {
  if (raw == null || raw === '') return null;
  let obj: unknown = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return obj && typeof obj === 'object' ? (obj as Record<string, unknown>) : null;
}

function loadRoomIndex(obj: Record<string, unknown> | null): void {
  if (!obj) return;
  for (const [sid, raw] of Object.entries(obj)) {
    const v = (raw ?? {}) as Record<string, unknown>;
    roomIndex.set(sid, {
      session_id: String(v.session_id || sid),
      cards: Number(v.cards) || 0,
      images: Number(v.images) || 0,
      png_bytes: Number(v.png_bytes) || 0,
      character_id: String(v.character_id || ''),
      character_name: String(v.character_name || ''),
      chat_id: String(v.chat_id || ''),
      chat_name: String(v.chat_name || ''),
      char_index: Number.isFinite(Number(v.char_index)) ? Number(v.char_index) : -1,
      chat_index: Number.isFinite(Number(v.chat_index)) ? Number(v.chat_index) : -1,
      newest_at: Number(v.newest_at) || 0,
    });
  }
}

/**
 * Turns the two whole-gallery rows into one pack per room. Runs once.
 *
 * Everything lands in memory for this boot, which is exactly what the old layout
 * did, so the preview-pruning passes still see every row. Afterwards the old
 * keys are emptied rather than deleted: `psGet` falls back to the 1.x save-file
 * key when a device key is missing, and a deleted key would be re-found and
 * re-split on every boot.
 */
async function splitLegacyPacks(): Promise<boolean> {
  const cardsRaw = parseStored(await psGet(STORE_KEY('cards'), LEGACY_STORE_KEY('cards')));
  const imagesRaw = parseStored(await psGet(STORE_KEY('images'), LEGACY_STORE_KEY('images')));
  const cardEntries = Object.entries(cardsRaw || {});
  const imageEntries = Object.entries(imagesRaw || {});
  if (!cardEntries.length && !imageEntries.length) return false;

  for (const [k, v] of cardEntries) loadCardRow(k, (v ?? {}) as Record<string, unknown>);
  for (const [k, v] of imageEntries) loadImageRow(k, (v ?? {}) as Record<string, unknown>);
  for (const k of memStores.cards.keys()) markRoomDirty(roomOf(k));
  for (const k of memStores.images.keys()) markRoomDirty(roomOf(k));

  stripImageLocationPreviewsUnlocked();
  pruneCardPreviewsUnlocked({ persist: false });
  markAllLoadedRoomsDirty();
  await persistRooms();
  await psSet(STORE_KEY('cards'), {});
  await psSet(STORE_KEY('images'), {});
  await restampAssetRooms().catch(() => {});
  dbg('storage.rooms.split', {
    message: `${roomIndex.size} rooms`,
    cards: cardEntries.length,
    images: imageEntries.length,
  });
  return true;
}

export async function openDb(): Promise<boolean> {
  if (storeReady) return storeReady;
  storeReady = (async () => {
    // Legacy sidecar rewrites found while loading. Deferred because the stamp
    // row is written late in `meta` and so is not yet visible mid-loop.
    const legacyWrites: Array<() => Promise<void>> = [];
    // `cards` and `images` are deliberately absent: they are read one room at a
    // time by `ensureRoom`, which is the whole point of the per-room packs.
    for (const store of MONO_STORES) {
      const obj = parseStored(await psGet(STORE_KEY(store), LEGACY_STORE_KEY(store)));
      if (!obj) continue;
      for (const [k, rawRow] of Object.entries(obj)) {
        const v = (rawRow ?? {}) as Record<string, unknown>;
        if (store === 'meta' && (v.key === 'reference_image' || k === 'reference_image')) {
          const png = decodeStoredPng(await psGet(REF_IMAGE_KEY, LEGACY_REF_IMAGE_KEY));
          memStores.meta.set('reference_image', { key: 'reference_image', png });
        } else if (store === 'meta' && (v.key === 'vibe_transfer' || k === 'vibe_transfer')) {
          const png = decodeStoredPng(await psGet(VIBE_IMAGE_KEY));
          let data = await psGet(VIBE_DATA_KEY);
          if (typeof data === 'string') {
            try {
              data = JSON.parse(data);
            } catch {
              data = null;
            }
          }
          const d = (data ?? {}) as Record<string, unknown>;
          memStores.meta.set('vibe_transfer', {
            key: 'vibe_transfer',
            png,
            encoded: (d.encoded as string) || '',
            model: (d.model as string) || (v.model as string) || '',
            information_extracted: (d.information_extracted ?? v.information_extracted ?? 1.0) as number,
          });
        } else if (store === 'meta' && isVibePresetMetaKey(v.key || k)) {
          const metaKey = String(v.key || k);
          const presetId = presetIdFromVibeMetaKey(metaKey);
          const png = decodeStoredPng(await psGet(VIBE_PRESET_IMAGE_KEY(presetId)));
          let data = await psGet(VIBE_PRESET_DATA_KEY(presetId));
          if (typeof data === 'string') {
            try {
              data = JSON.parse(data);
            } catch {
              data = null;
            }
          }
          const d = (data ?? {}) as Record<string, unknown>;
          memStores.meta.set(metaKey, {
            key: metaKey,
            png,
            encoded: (d.encoded as string) || '',
            model: (d.model as string) || (v.model as string) || '',
            information_extracted: (d.information_extracted ?? v.information_extracted ?? 1.0) as number,
          });
        } else if (store === 'meta' && isCharRefMetaKey(v.key || k)) {
          const metaKey = String(v.key || k);
          const characterId = characterIdFromCharRefMetaKey(metaKey);
          let png = decodeStoredPng(await psGet(charRefDiskImageKey(metaKey)));
          // Pre-2.2.9 wrote ArrayBuffers into the meta blob; recover once if the
          // dedicated key is empty and the host still has a live buffer.
          if (!png) {
            png = legacyImageBytes(v.png);
            if (png) {
              const migrate = png;
              legacyWrites.push(async () => {
                try {
                  await psSet(charRefDiskImageKey(metaKey), await bytesToBase64Async(new Uint8Array(migrate)));
                } catch (err) {
                  console.warn('[Inlay Nexus] char ref migrate failed', characterId, (err as Error)?.message || err);
                }
              });
            }
          }
          let data = await psGet(charRefDiskDataKey(metaKey));
          if (typeof data === 'string') {
            try {
              data = JSON.parse(data);
            } catch {
              data = null;
            }
          }
          const d = (data ?? {}) as Record<string, unknown>;
          // Legacy rows may still carry encoded on the meta blob itself.
          const encoded =
            (d.encoded as string) || (typeof v.encoded === 'string' ? v.encoded : '') || '';
          memStores.meta.set(metaKey, {
            key: metaKey,
            png,
            encoded,
            model: (d.model as string) || (v.model as string) || '',
            information_extracted: (d.information_extracted ?? v.information_extracted ?? 1.0) as number,
          });
          if (encoded && !d.encoded) {
            const enc = encoded;
            const model = (d.model as string) || (v.model as string) || '';
            const ie = (d.information_extracted ?? v.information_extracted ?? 1.0) as number;
            legacyWrites.push(async () => {
              try {
                await psSet(charRefDiskDataKey(metaKey), {
                  encoded: enc,
                  model,
                  information_extracted: ie,
                });
              } catch {
                /* sidecar rewrite is best-effort */
              }
            });
          }
        } else {
          (memStores[store] as Map<string, unknown>).set(k, v);
        }
      }
    }
    loadRoomIndex(parseStored(await psGet(ROOM_INDEX_KEY)));
    await splitLegacyPacks();

    if (migratedVersionUnlocked() >= MIGRATION_VERSION) return true;

    if (legacyWrites.length) {
      imagePersistChain = imagePersistChain
        .then(async () => {
          for (const write of legacyWrites) await write();
        })
        .catch(() => {});
    }

    const empty =
      !roomIndex.size && STORE_NAMES.every((name) => (memStores[name] as Map<string, unknown>).size === 0);
    if (empty) {
      // Fresh install: there is no pre-2.5 data to find, so stamp now and never
      // pay for a boot scan at all.
      stampMigratedUnlocked(MIGRATION_VERSION);
      schedulePersist('meta');
      return true;
    }

    // Unmigrated install: keep doing the full-store cleanup every boot. These
    // only ever find legacy rows, but a user who never presses the migrate
    // button must not be worse off than before.
    // The card and image passes run inside `splitLegacyPacks`, which is the one
    // boot that has those rows in memory. Later boots load no packs, so running
    // them here would only ever scan nothing.
    if (pruneJobStoreUnlocked({ persist: false }) > 0) await persistStore('jobs');
    return true;
  })().catch((error: unknown) => {
    storeReady = null;
    throw error;
  });
  return storeReady;
}

// ---------------------------------------------------------------------------
// Room loading
// ---------------------------------------------------------------------------

let restampChecked = false;

/**
 * Hands pre-2.5.23 asset names their room, once per page load.
 *
 * Only called from the two places that already have every row in memory: the
 * one-time split, and the all-rooms fallback in `ensureCard`. A name without a
 * room is exactly what forces that fallback, so this removes its own cause.
 */
async function restampAssetRooms(): Promise<void> {
  if (restampChecked) return;
  restampChecked = true;
  const rooms = new Map<string, string>();
  for (const row of await listShotAssets()) {
    if (row.session) continue;
    const sid = roomOf(row.id);
    if (sid !== NO_ROOM) rooms.set(row.id, sid);
  }
  await restampShotAssetNames(rooms);
}

/** Reads one room's pack into memory. A loaded room is never dropped. */
export async function ensureRoom(sessionId: unknown): Promise<void> {
  await openDb();
  const sid = String(sessionId || '');
  if (!sid || loadedRooms.has(sid)) return;
  loadedRooms.add(sid);
  const pack = parseStored(await psGet(CARD_PACK_KEY(sid)));
  if (!pack) return;
  const cards = (pack.cards || {}) as Record<string, unknown>;
  const images = (pack.images || {}) as Record<string, unknown>;
  // A row already in memory is newer than the pack: it was written during this
  // session and its room may not have been flushed yet.
  for (const [k, v] of Object.entries(cards)) {
    if (!memStores.cards.has(k)) loadCardRow(k, (v ?? {}) as Record<string, unknown>);
  }
  for (const [k, v] of Object.entries(images)) {
    if (!memStores.images.has(k)) loadImageRow(k, (v ?? {}) as Record<string, unknown>);
  }
}

/**
 * Reads every room. The slow path, for callers that genuinely need the whole
 * gallery: the ZIP export, the legacy image migration, and retention cleanup.
 */
export async function ensureAllRooms(): Promise<void> {
  await openDb();
  for (const sid of [...roomIndex.keys()]) await ensureRoom(sid);
  await ensureRoom(NO_ROOM);
}

/**
 * Loads the room that owns one card id.
 *
 * The room index counts rooms, not ids, so the id-to-room map comes from the
 * gallery module's asset names. A card with no asset — one whose image failed,
 * or an old name written before rooms were stamped — falls back to reading every
 * room, which is correct and rare.
 */
export async function ensureCard(id: unknown): Promise<void> {
  await openDb();
  const k = String(id || '');
  if (!k || memStores.cards.has(k) || memStores.images.has(k)) return;
  if (!cardRoomHint) {
    cardRoomHint = new Map();
    for (const row of await listShotAssets()) {
      if (row.session) cardRoomHint.set(row.id, row.session);
    }
  }
  const sid = cardRoomHint.get(k) || '';
  if (sid) {
    await ensureRoom(sid);
    if (memStores.cards.has(k) || memStores.images.has(k)) return;
  }
  await ensureAllRooms();
  await restampAssetRooms().catch(() => {});
}

// ---------------------------------------------------------------------------
// Row API
// ---------------------------------------------------------------------------

/**
 * Reads a row. For images this hydrates the PNG, so prefer `imageMeta()` when
 * only `has_png` / `png_bytes` are needed.
 */
export async function idbGet<S extends StoreName>(store: S, key: unknown): Promise<RowOf<S> | undefined> {
  await openDb();
  const k = storeKeyOf(store, key);
  if (store === 'cards' || store === 'images') await ensureCard(k);
  if (store === 'images') {
    const row = memStores.images.get(k);
    if (!row) return undefined;
    if (!row.hydrated) await hydrateImage(k, row);
    else if (row.png) touchPng(k, row);
    return row as RowOf<S>;
  }
  const row = (memStores[store] as Map<string, unknown>).get(k);
  return (row == null ? undefined : row) as RowOf<S> | undefined;
}

export interface ImageMeta {
  has_png: boolean;
  png_bytes: number;
  /** Placement metadata, `{}` when the row never got one. Shared, not copied. */
  location: Record<string, unknown>;
}

/**
 * Everything about an image except its pixels, in one index lookup.
 *
 * Placement and byte count live on the same row, so a listing that wants both
 * should ask once. `imageLocation` remains for callers that only need placement.
 */
export async function imageMeta(id: string): Promise<ImageMeta | undefined> {
  await ensureCard(id);
  const row = memStores.images.get(String(id));
  if (!row) return undefined;
  const loc = row.location;
  return {
    has_png: row.has_png,
    png_bytes: row.png_bytes,
    location: loc && typeof loc === 'object' ? (loc as Record<string, unknown>) : {},
  };
}

export interface PutOptions {
  /** When false the containing store snapshot is not scheduled for a write. */
  persist?: boolean;
}

export async function idbPut(store: StoreName, value: Record<string, unknown>, opts: PutOptions = {}): Promise<string> {
  await openDb();
  const k = recordKeyOf(store, value);
  if (!k) throw new Error(`invalid ${store} key`);
  const persist = opts.persist !== false;

  if (store === 'images') {
    // The room must be in memory before the row is replaced, or the pack write
    // that follows would drop every other row in that room.
    await ensureCard(k);
    const png = (value.png as ArrayBuffer | null) || null;
    const prev = memStores.images.get(k);
    const prevRoom = prev ? roomOf(k) : '';
    if (prev?.png) pngCacheBytes -= prev.png.byteLength;
    const row: ImageMemRow = {
      id: String(value.id),
      location: locationWithoutPreview(value.location as Record<string, unknown>) || {},
      ...(typeof value.mime === 'string' && value.mime ? { mime: value.mime } : {}),
      png,
      has_png: Boolean(png),
      png_bytes: png ? png.byteLength : 0,
      hydrated: true,
      durable: !png,
    };
    memStores.images.set(k, row);
    markRoomDirtyFor(k, prevRoom);
    if (png) {
      chargePng(png.byteLength);
      imagePersistChain = imagePersistChain
        .then(async () => {
          // The room goes in the asset name so the module array alone can say
          // which character-chat a shot belongs to, without loading its pack.
          const saved = await putShotAsset(k, png, String(row.location?.session_id || ''));
          if (saved?.path) {
            row.asset_path = saved.path;
            row.asset_name = saved.name;
            await psRemove(IMAGE_KEY(k));
            // This runs long after the debounced flush that the write scheduled,
            // so the room has to be named again or the pack write finds nothing.
            markRoomDirtyFor(k);
            await persistStore('images');
          } else if (memStores.images.get(k) === row) {
            // One try at the gallery module. Plugin IDB is never a pixel store —
            // a miss means the shot is gone, not parked as inx_nximg_*.
            if (row.png) pngCacheBytes -= row.png.byteLength;
            row.png = null;
            row.has_png = false;
            row.png_bytes = 0;
            row.hydrated = true;
            delete row.asset_path;
            delete row.asset_name;
            dropBlobUrl(k);
            markRoomDirtyFor(k);
            await persistStore('images');
          }
          // Only now may the cache reclaim these bytes.
          if (memStores.images.get(k) === row) row.durable = true;
        })
        .catch((err: unknown) => console.warn('[Inlay Nexus] image persist failed', k, (err as Error)?.message || err));
    } else {
      imagePersistChain = imagePersistChain.then(() => psRemove(IMAGE_KEY(k))).catch(() => {});
    }
    if (persist) schedulePersist('images');
    return k;
  }

  if (store === 'meta' && value.key === 'reference_image') {
    const png = (value.png as ArrayBuffer | null) || null;
    memStores.meta.set('reference_image', { key: 'reference_image', png });
    if (png) {
      imagePersistChain = imagePersistChain
        .then(async () => {
          await psSet(REF_IMAGE_KEY, await bytesToBase64Async(new Uint8Array(png)));
        })
        .catch((err: unknown) => console.warn('[Inlay Nexus] ref persist failed', (err as Error)?.message || err));
    } else {
      imagePersistChain = imagePersistChain.then(() => psRemove(REF_IMAGE_KEY)).catch(() => {});
    }
    if (persist) schedulePersist('meta');
    return 'reference_image';
  }

  if (store === 'meta' && value.key === 'vibe_transfer') {
    const row: MetaRow = {
      key: 'vibe_transfer',
      png: (value.png as ArrayBuffer | null) || null,
      encoded: (value.encoded as string) || '',
      model: (value.model as string) || '',
      information_extracted: (value.information_extracted ?? 1.0) as number,
    };
    memStores.meta.set('vibe_transfer', row);
    imagePersistChain = imagePersistChain
      .then(async () => {
        if (row.png) await psSet(VIBE_IMAGE_KEY, await bytesToBase64Async(new Uint8Array(row.png)));
        else await psRemove(VIBE_IMAGE_KEY);
        if (row.encoded) {
          await psSet(VIBE_DATA_KEY, {
            encoded: row.encoded,
            model: row.model,
            information_extracted: row.information_extracted,
          });
        } else {
          await psRemove(VIBE_DATA_KEY);
        }
      })
      .catch((err: unknown) => console.warn('[Inlay Nexus] vibe persist failed', (err as Error)?.message || err));
    if (persist) schedulePersist('meta');
    return 'vibe_transfer';
  }

  if (store === 'meta' && isVibePresetMetaKey(value.key)) {
    const metaKey = String(value.key);
    const presetId = presetIdFromVibeMetaKey(metaKey);
    const row: MetaRow = {
      key: metaKey,
      png: (value.png as ArrayBuffer | null) || null,
      encoded: (value.encoded as string) || '',
      model: (value.model as string) || '',
      information_extracted: (value.information_extracted ?? 1.0) as number,
    };
    memStores.meta.set(metaKey, row);
    imagePersistChain = imagePersistChain
      .then(async () => {
        if (row.png) await psSet(VIBE_PRESET_IMAGE_KEY(presetId), await bytesToBase64Async(new Uint8Array(row.png)));
        else await psRemove(VIBE_PRESET_IMAGE_KEY(presetId));
        if (row.encoded) {
          await psSet(VIBE_PRESET_DATA_KEY(presetId), {
            encoded: row.encoded,
            model: row.model,
            information_extracted: row.information_extracted,
          });
        } else {
          await psRemove(VIBE_PRESET_DATA_KEY(presetId));
        }
      })
      .catch((err: unknown) =>
        console.warn('[Inlay Nexus] preset vibe persist failed', (err as Error)?.message || err),
      );
    if (persist) schedulePersist('meta');
    return metaKey;
  }

  if (store === 'meta' && isCharRefMetaKey(value.key)) {
    const metaKey = String(value.key);
    const characterId = characterIdFromCharRefMetaKey(metaKey);
    const row: MetaRow = {
      key: metaKey,
      png: (value.png as ArrayBuffer | null) || null,
      encoded: (value.encoded as string) || '',
      model: (value.model as string) || '',
      information_extracted: (value.information_extracted ?? 1.0) as number,
    };
    memStores.meta.set(metaKey, row);
    imagePersistChain = imagePersistChain
      .then(async () => {
        if (row.png) await psSet(charRefDiskImageKey(metaKey), await bytesToBase64Async(new Uint8Array(row.png)));
        else await psRemove(charRefDiskImageKey(metaKey));
        if (row.encoded) {
          await psSet(charRefDiskDataKey(metaKey), {
            encoded: row.encoded,
            model: row.model,
            information_extracted: row.information_extracted,
          });
        } else {
          await psRemove(charRefDiskDataKey(metaKey));
        }
      })
      .catch((err: unknown) =>
        console.warn('[Inlay Nexus] char ref persist failed', characterId, (err as Error)?.message || err),
      );
    if (persist) schedulePersist('meta');
    return metaKey;
  }

  if (store === 'cards') {
    await ensureCard(k);
    const prevRoom = memStores.cards.has(k) || memStores.images.has(k) ? roomOf(k) : '';
    deindexCard(memStores.cards.get(k));
    const row = value as unknown as CardRow;
    memStores.cards.set(k, row);
    indexCard(row);
    markRoomDirtyFor(k, prevRoom);
    // Stripping previews rewrites rows across every loaded room, not just this one.
    const stripped = pruneCardPreviewsUnlocked({ persist: false });
    if (stripped > 0) markAllLoadedRoomsDirty();
    if (persist || stripped > 0) schedulePersist('cards');
    return k;
  }

  (memStores[store] as Map<string, unknown>).set(k, value);
  const pruned = store === 'jobs' ? pruneJobStoreUnlocked({ persist: false }) : 0;
  if (persist || pruned > 0) schedulePersist(store);
  return k;
}

export async function idbDelete(store: StoreName, key: unknown): Promise<boolean> {
  await openDb();
  const k = storeKeyOf(store, key);
  if (store === 'cards' || store === 'images') {
    // Loading first is what makes the pack rewrite a deletion of one row rather
    // than of every row in the room that is not currently in memory.
    await ensureCard(k);
    markRoomDirtyFor(k);
  }
  if (store === 'cards') deindexCard(memStores.cards.get(k));
  if (store === 'images') {
    const prev = memStores.images.get(k);
    if (prev?.png) pngCacheBytes -= prev.png.byteLength;
  }
  (memStores[store] as Map<string, unknown>).delete(k);
  if (store === 'images') {
    await dropShotAsset(k).catch(() => false);
    await psRemove(IMAGE_KEY(k));
  }
  if (store === 'meta' && k === 'reference_image') await psRemove(REF_IMAGE_KEY);
  if (store === 'meta' && k === 'vibe_transfer') {
    await psRemove(VIBE_IMAGE_KEY);
    await psRemove(VIBE_DATA_KEY);
  }
  if (store === 'meta' && isVibePresetMetaKey(k)) {
    const presetId = presetIdFromVibeMetaKey(k);
    await psRemove(VIBE_PRESET_IMAGE_KEY(presetId));
    await psRemove(VIBE_PRESET_DATA_KEY(presetId));
  }
  if (store === 'meta' && isCharRefMetaKey(k)) {
    await psRemove(charRefDiskImageKey(k));
    await psRemove(charRefDiskDataKey(k));
  }
  schedulePersist(store);
  if (store === 'images') dropBlobUrl(k);
  return true;
}

/**
 * Drop many card+image rows, persist each store once, then wipe disk bytes.
 * Per-id `idbDelete` was a persist + psRemove round-trip each time.
 */
export async function removeCardImageRows(ids: readonly string[]): Promise<string[]> {
  await openDb();
  const deleted: string[] = [];
  const disk: string[] = [];
  for (const raw of ids) {
    const k = String(raw || '');
    if (!k) continue;
    await ensureCard(k);
    markRoomDirtyFor(k);
    const card = memStores.cards.get(k);
    if (card) {
      deindexCard(card);
      memStores.cards.delete(k);
    }
    const prev = memStores.images.get(k);
    if (prev) {
      if (prev.png) pngCacheBytes -= prev.png.byteLength;
      memStores.images.delete(k);
      disk.push(k);
    }
    dropBlobUrl(k);
    explorerThumbCache.drop(k);
    if (card || prev) deleted.push(k);
  }
  if (deleted.length) {
    schedulePersist('cards');
    schedulePersist('images');
  }
  await Promise.all(disk.map(async (k) => {
    await dropShotAsset(k).catch(() => false);
    await psRemove(IMAGE_KEY(k));
  }));
  return deleted;
}

/**
 * Every row in a store.
 *
 * For `cards` and `images` that means opening every room pack, so it is the slow
 * path by construction — the ZIP export and the legacy image migration are the
 * callers that genuinely need it. A per-room listing goes through
 * `cardsForSession`, and an all-rooms *listing* should use the module asset array.
 */
export async function idbGetAll<S extends StoreName>(store: S): Promise<Array<RowOf<S>>> {
  await openDb();
  if (store === 'cards' || store === 'images') await ensureAllRooms();
  return [...(memStores[store] as Map<string, unknown>).values()] as Array<RowOf<S>>;
}

/** Cards for one session — one pack read, then the session index. */
export async function cardsForSession(sessionId: string): Promise<CardRow[]> {
  await ensureRoom(sessionId);
  const ids = cardsBySession.get(String(sessionId));
  if (!ids) return [];
  const out: CardRow[] = [];
  for (const id of ids) {
    const row = memStores.cards.get(id);
    if (row) out.push(row);
  }
  return out;
}

/**
 * How many rows a store holds.
 *
 * `cards` and `images` come from the room index rather than from memory, so the
 * answer is the whole gallery whether or not a single pack has been opened.
 */
export function storeSize(store: StoreName): number {
  if (store === 'cards' || store === 'images') {
    let total = closedRoomTotal(store === 'cards' ? 'cards' : 'images');
    // A row can only reach memory through `ensureRoom` or a write, both of which
    // mark the room loaded, so memory is the whole of every loaded room — and it
    // is fresher than the index, which catches up when the pack is written.
    total += (store === 'cards' ? memStores.cards : memStores.images).size;
    return total;
  }
  return (memStores[store] as Map<string, unknown>).size;
}

/** The index's tally for rooms not currently in memory. */
function closedRoomTotal(field: 'cards' | 'images' | 'png_bytes'): number {
  let total = 0;
  for (const [sid, room] of roomIndex) {
    if (!loadedRooms.has(sid)) total += room[field];
  }
  return total;
}

/** Total bytes of stored PNGs, from the room index — never hydrates. */
export function totalImageBytes(): number {
  let total = closedRoomTotal('png_bytes');
  for (const row of memStores.images.values()) total += row.png_bytes;
  return total;
}

/** Which rooms exist and what each holds, without opening a pack. */
export function roomRows(): RoomIndexRow[] {
  return [...roomIndex.values()];
}

/**
 * Like `roomRows`, but a loaded room is counted from memory.
 *
 * The index catches up when a pack is written, so a room that was just written
 * to and not yet flushed reads short there. Anything showing the user a count
 * has to see the write it just made.
 */
export function roomTallies(): RoomIndexRow[] {
  const out = new Map<string, RoomIndexRow>();
  for (const [sid, row] of roomIndex) out.set(sid, { ...row });
  for (const sid of loadedRooms) {
    const row = out.get(sid) ?? { ...EMPTY_ROOM_ROW, session_id: sid };
    row.cards = cardsBySession.get(sid)?.size ?? 0;
    // A room written this session has no index entry yet, so its names are still
    // blank. They are in memory, on the image rows.
    if (!row.character_id) nameRoomFromMemory(sid, row);
    if (!row.cards && !row.images) {
      out.delete(sid);
      continue;
    }
    out.set(sid, row);
  }
  return [...out.values()];
}

/** Fills a room's names from the loaded image rows that belong to it. */
function nameRoomFromMemory(sid: string, row: RoomIndexRow): void {
  for (const [id, img] of memStores.images) {
    if (roomOf(id) !== sid) continue;
    const loc = img.location || {};
    row.character_id ||= String(loc.character_id || '');
    row.character_name ||= String(loc.character_name || '');
    row.chat_id ||= String(loc.chat_id || '');
    row.chat_name ||= String(loc.chat_name || '');
    if (row.char_index < 0) row.char_index = Number(loc.char_index ?? -1);
    if (row.chat_index < 0) row.chat_index = Number(loc.chat_index ?? -1);
    if (row.character_id) return;
  }
}

const EMPTY_ROOM_ROW: RoomIndexRow = {
  session_id: '',
  cards: 0,
  images: 0,
  png_bytes: 0,
  character_id: '',
  character_name: '',
  chat_id: '',
  chat_name: '',
  char_index: -1,
  chat_index: -1,
  newest_at: 0,
};

/**
 * Every stored shot, newest first, with the room it belongs to.
 *
 * Read from the gallery module's asset array, so it costs one host call and no
 * pack reads at all — this is what lets the explorer show every room at once.
 * Insertion order is generation order, so reversing gives newest first.
 *
 * A name written before 2.5.23 carries no room. The first call that sees one
 * loads every room and rewrites the names, so later calls are clean.
 */
export async function galleryIndexNewestFirst(): Promise<Array<{ id: string; session: string }>> {
  await openDb();
  let rows = await listShotAssets();
  if (!restampChecked && rows.some((row) => !row.session)) {
    await ensureAllRooms();
    await restampAssetRooms().catch(() => {});
    rows = await listShotAssets();
  }
  return rows.reverse().map((row) => ({ id: row.id, session: row.session }));
}

/**
 * One image's location, without hydrating its pixels.
 *
 * `idbGet('images', id)` decodes the stored base64 on first touch, which is right
 * for a caller that wants the bytes and badly wrong for one that only wants
 * placement metadata. Listing a gallery reads a location per row, so going
 * through `idbGet` there decodes the entire gallery — the exact cost the lazy
 * hydration was introduced to avoid.
 */
export async function imageLocation(id: string): Promise<Record<string, unknown>> {
  await ensureCard(id);
  const row = memStores.images.get(String(id));
  const loc = row?.location;
  return loc && typeof loc === 'object' ? (loc as Record<string, unknown>) : {};
}

/** One unmigrated image: pixels exist but not in the gallery module. */
export interface LegacyImageRow {
  id: string;
  png_bytes: number;
  /** Stamped into the module asset name so the room survives the move. */
  session_id: string;
}

/**
 * Images whose bytes still live in a legacy `inx_nximg_*` / `nximg_*` row.
 *
 * Reads the index only — the whole point of the migration is to move these
 * without decoding the gallery twice. It does open every room, because a legacy
 * row can be in any of them and there is no cheaper way to find out.
 */
export async function legacyImageRows(): Promise<LegacyImageRow[]> {
  await ensureAllRooms();
  const out: LegacyImageRow[] = [];
  for (const row of memStores.images.values()) {
    if (!row.has_png) continue;
    if (String(row.asset_path || row.location?.asset_path || '')) continue;
    out.push({
      id: row.id,
      png_bytes: row.png_bytes,
      session_id: String(row.location?.session_id || ''),
    });
  }
  return out;
}

/**
 * Points a row at its new module asset and drops the in-memory copy.
 *
 * Releasing the bytes matters: a migration walks the whole gallery, and holding
 * every decode would push the PNG cache to evict rows that are actually on
 * screen. The next read fetches from the module, which is where they now live.
 */
export async function setImageAssetPath(id: string, path: string, name: string): Promise<boolean> {
  await ensureCard(id);
  const k = String(id);
  const row = memStores.images.get(k);
  if (!row || !path) return false;
  markRoomDirtyFor(k);
  row.asset_path = path;
  row.asset_name = name;
  if (row.png) {
    pngCacheBytes -= row.png.byteLength;
    row.png = null;
    row.hydrated = false;
  }
  row.durable = true;
  schedulePersist('images');
  return true;
}

/**
 * The retention passes that boot used to run unconditionally, as one call.
 * Returns how many rows each pass touched so the migration can report it.
 */
export async function runRetentionCleanup(): Promise<{ jobs: number; images: number; cards: number }> {
  // Both card passes rewrite rows wherever they are, so every room has to be in
  // memory first or the ones left closed would keep their previews.
  await ensureAllRooms();
  const jobs = pruneJobStoreUnlocked({ persist: false });
  const images = stripImageLocationPreviewsUnlocked();
  const cards = pruneCardPreviewsUnlocked({ persist: false });
  if (jobs > 0) await persistStore('jobs');
  if (images > 0 || cards > 0) {
    markAllLoadedRoomsDirty();
    await persistRooms();
  }
  return { jobs, images, cards };
}

/**
 * Updates placement metadata without hydrating PNG bytes.
 * `idbGet`+`idbPut` would decode base64 just to rewrite `location`.
 */
export async function putImageLocation(id: string, location: Record<string, unknown>): Promise<void> {
  await ensureCard(id);
  const k = String(id);
  const row = memStores.images.get(k);
  const prevRoom = row ? roomOf(k) : '';
  const loc = locationWithoutPreview(location) || {};
  if (row) {
    row.location = loc;
  } else {
    memStores.images.set(k, {
      id: k,
      location: loc,
      png: null,
      has_png: false,
      png_bytes: 0,
      hydrated: true,
      durable: true,
    });
  }
  // A rewritten location can name a different room, so both ends are dirty.
  markRoomDirtyFor(k, prevRoom);
  schedulePersist('images');
}

// ---------------------------------------------------------------------------
// Data-URL cache (the UI's synchronous image source)
// ---------------------------------------------------------------------------

export function getBlobUrl(id: string): string | undefined {
  return blobUrlCache.get(String(id));
}

export function setBlobUrl(id: string, url: string, byteLen?: number): void {
  blobUrlCache.set(String(id), url, byteLen);
}

export function dropBlobUrl(id: string): void {
  blobUrlCache.drop(String(id));
}

/** Protect sticky-window ids from LRU eviction (see blob-url-cache.ts). */
export function pinBlobUrls(ids: Iterable<unknown>): void {
  blobUrlCache.pin(ids);
}

/** Pin these ids and drop every other cached data-URL (explorer folder hops). */
export function retainBlobUrls(ids: Iterable<unknown>): void {
  blobUrlCache.retainOnly(ids);
}

export function blobUrlCount(): number {
  return blobUrlCache.size;
}

/** Loads the PNG for an id, hydrating from storage if necessary. */
export async function imagePng(id: string): Promise<ArrayBuffer | null> {
  const row = await idbGet('images', String(id));
  return row?.png ?? null;
}

/**
 * How many shots our own index accounts for.
 *
 * The gallery module guard compares this against the asset list the host hands
 * back: an empty list here means "nothing stored", while an empty list *there*
 * with a non-zero count here means the host did not load the assets.
 */
export function knownShotRowCount(): number {
  return storeSize('images');
}

/** Distinct reference-image hashes the roster still points at. */
export function knownCharRefHashCount(): number {
  const seen = new Set<string>();
  for (const rec of memStores.characters.values()) {
    const hash = String((rec as { ref_hash?: unknown }).ref_hash || '');
    if (hash) seen.add(hash);
  }
  return seen.size;
}

setKnownShotCount(knownShotRowCount);

/** Test seam: clears every in-memory store and forces a reload on next access. */
export function resetStores(): void {
  for (const name of STORE_NAMES) (memStores[name] as Map<string, unknown>).clear();
  cardsBySession.clear();
  roomIndex.clear();
  loadedRooms.clear();
  dirtyRooms.clear();
  cardRoomHint = null;
  restampChecked = false;
  blobUrlCache.clear();
  explorerThumbCache.clear();
  dirty.clear();
  pngCacheBytes = 0;
  storeReady = null;
  resetDeviceStore();
}
