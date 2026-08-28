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
 *     fetched on first real use (module `readImage` or legacy `inx_nximg_*`),
 *     then held in a byte-budgeted LRU. Callers that only need a size use
 *     `imageMeta()` and never touch storage at all.
 *  2. **Coalesced persistence.** 1.x re-serialised an entire store on every
 *     single row write, so a job that touched `meta` 47 times wrote 47 full
 *     snapshots. Writes now mark the store dirty and one flush covers the burst.
 *  3. **Session index for cards.** Per-session lookups were full scans.
 *  4. **Job retention.** Completed job rows are capped at the newest 10 so
 *     `inx_nxstore_jobs` cannot grow without bound. In-flight rows stay.
 *
 * Row shapes on disk are unchanged, so 1.x data loads as-is and a downgrade
 * would still read anything written here.
 */

import {
  charRefDiskDataKey,
  charRefDiskImageKey,
  IMAGE_KEY,
  LEGACY_IMAGE_KEY,
  LEGACY_REF_IMAGE_KEY,
  LEGACY_STORE_KEY,
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
import { jobIdsToPrune } from '../domain/jobs/retention';
import { psGet, psRemove, psSet } from './device-store';
import { blobUrlCache } from './blob-url-cache';
import { dropShotAsset, putShotAsset, readShotAssetBytes } from './shot-module';

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

function snapshotOf(store: StoreName): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  if (store === 'images') {
    for (const [k, v] of memStores.images) {
      const assetPath = String(v.asset_path || '');
      obj[k] = {
        id: v.id,
        location: v.location || null,
        has_png: v.has_png,
        png_bytes: v.png_bytes,
        storage: assetPath ? 'module' : 'indexeddb',
        storage_key: assetPath || IMAGE_KEY(k),
        ...(assetPath ? { asset_path: assetPath, asset_name: v.asset_name || '' } : {}),
      };
    }
    return obj;
  }
  for (const [k, v] of memStores[store] as Map<string, unknown>) {
    const row = v as Record<string, unknown>;
    if (store === 'meta' && row?.key === 'reference_image') {
      obj[k] = { key: 'reference_image', has_png: Boolean(row.png), updated_at: row.updated_at || 0 };
      continue;
    }
    if (store === 'meta' && row?.key === 'vibe_transfer') {
      obj[k] = {
        key: 'vibe_transfer',
        has_png: Boolean(row.png),
        has_encoded: Boolean(row.encoded),
        model: row.model || '',
        information_extracted: row.information_extracted ?? 1.0,
        updated_at: row.updated_at || 0,
      };
      continue;
    }
    if (store === 'meta' && isVibePresetMetaKey(row?.key)) {
      obj[k] = {
        key: row.key,
        has_png: Boolean(row.png),
        has_encoded: Boolean(row.encoded),
        model: row.model || '',
        information_extracted: row.information_extracted ?? 1.0,
        updated_at: row.updated_at || 0,
      };
      continue;
    }
    // Never JSON-embed ArrayBuffers into the meta blob — they become `{}` and
    // leave "configured" ghosts with no preview after reload (same as vibe).
    if (store === 'meta' && isCharRefMetaKey(row?.key)) {
      obj[k] = {
        key: row.key,
        has_png: Boolean(row.png && (row.png as ArrayBuffer).byteLength > 0),
        has_encoded: Boolean(row.encoded),
        model: row.model || '',
        information_extracted: row.information_extracted ?? 1.0,
        updated_at: row.updated_at || 0,
      };
      continue;
    }
    if (store === 'jobs') {
      obj[k] = slimJobRowForDisk(row as JobRow);
      continue;
    }
    obj[k] = v;
  }
  return obj;
}

async function persistStore(store: StoreName): Promise<void> {
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
    if (!png) png = decodeStoredPng(await psGet(IMAGE_KEY(id), LEGACY_IMAGE_KEY(id)));
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

export async function openDb(): Promise<boolean> {
  if (storeReady) return storeReady;
  storeReady = (async () => {
    for (const store of STORE_NAMES) {
      const raw = await psGet(STORE_KEY(store), LEGACY_STORE_KEY(store));
      if (raw == null || raw === '') continue;
      let obj: unknown = raw;
      if (typeof raw === 'string') {
        try {
          obj = JSON.parse(raw);
        } catch {
          continue;
        }
      }
      if (!obj || typeof obj !== 'object') continue;
      for (const [k, rawRow] of Object.entries(obj as Record<string, unknown>)) {
        const v = (rawRow ?? {}) as Record<string, unknown>;
        if (store === 'images') {
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
        } else if (store === 'meta' && (v.key === 'reference_image' || k === 'reference_image')) {
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
              imagePersistChain = imagePersistChain
                .then(async () => {
                  await psSet(charRefDiskImageKey(metaKey), await bytesToBase64Async(new Uint8Array(migrate)));
                })
                .catch((err: unknown) =>
                  console.warn('[Inlay Nexus] char ref migrate failed', characterId, (err as Error)?.message || err),
                );
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
            imagePersistChain = imagePersistChain
              .then(async () => {
                await psSet(charRefDiskDataKey(metaKey), {
                  encoded: enc,
                  model,
                  information_extracted: ie,
                });
              })
              .catch(() => {});
          }
        } else if (store === 'cards') {
          const row = v as unknown as CardRow;
          memStores.cards.set(k, row);
          indexCard(row);
        } else {
          (memStores[store] as Map<string, unknown>).set(k, v);
        }
      }
    }
    // Drop leftover 1.x / uncapped job history on first open so the disk key
    // shrinks before the UI starts polling.
    if (pruneJobStoreUnlocked({ persist: false }) > 0) await persistStore('jobs');
    return true;
  })().catch((error: unknown) => {
    storeReady = null;
    throw error;
  });
  return storeReady;
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
  await openDb();
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
    const png = (value.png as ArrayBuffer | null) || null;
    const prev = memStores.images.get(k);
    if (prev?.png) pngCacheBytes -= prev.png.byteLength;
    const row: ImageMemRow = {
      id: String(value.id),
      location: (value.location as Record<string, unknown>) || {},
      ...(typeof value.mime === 'string' && value.mime ? { mime: value.mime } : {}),
      png,
      has_png: Boolean(png),
      png_bytes: png ? png.byteLength : 0,
      hydrated: true,
      durable: !png,
    };
    memStores.images.set(k, row);
    if (png) {
      chargePng(png.byteLength);
      imagePersistChain = imagePersistChain
        .then(async () => {
          const saved = await putShotAsset(k, png);
          if (saved?.path) {
            row.asset_path = saved.path;
            row.asset_name = saved.name;
            await psRemove(IMAGE_KEY(k));
            await persistStore('images');
          } else {
            const b64 = await bytesToBase64Async(new Uint8Array(png));
            await psSet(IMAGE_KEY(k), b64);
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
    deindexCard(memStores.cards.get(k));
    const row = value as unknown as CardRow;
    memStores.cards.set(k, row);
    indexCard(row);
    if (persist) schedulePersist('cards');
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

export async function idbGetAll<S extends StoreName>(store: S): Promise<Array<RowOf<S>>> {
  await openDb();
  return [...(memStores[store] as Map<string, unknown>).values()] as Array<RowOf<S>>;
}

/** Cards for one session, via the session index instead of a full scan. */
export async function cardsForSession(sessionId: string): Promise<CardRow[]> {
  await openDb();
  const ids = cardsBySession.get(String(sessionId));
  if (!ids) return [];
  const out: CardRow[] = [];
  for (const id of ids) {
    const row = memStores.cards.get(id);
    if (row) out.push(row);
  }
  return out;
}

export function storeSize(store: StoreName): number {
  return (memStores[store] as Map<string, unknown>).size;
}

/** Total bytes of stored PNGs, from metadata — never hydrates. */
export function totalImageBytes(): number {
  let total = 0;
  for (const row of memStores.images.values()) total += row.png_bytes;
  return total;
}

export function imageIds(): string[] {
  return [...memStores.images.keys()];
}

/**
 * Every stored image's location, from the index. Synchronous and never hydrates,
 * so the health payload can count gallery folders without decoding any PNG.
 */
export function imageLocations(): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  for (const row of memStores.images.values()) out.push(row.location || {});
  return out;
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
  await openDb();
  const row = memStores.images.get(String(id));
  const loc = row?.location;
  return loc && typeof loc === 'object' ? (loc as Record<string, unknown>) : {};
}

/**
 * Updates placement metadata without hydrating PNG bytes.
 * `idbGet`+`idbPut` would decode base64 just to rewrite `location`.
 */
export async function putImageLocation(id: string, location: Record<string, unknown>): Promise<void> {
  await openDb();
  const k = String(id);
  const row = memStores.images.get(k);
  if (row) {
    row.location = location;
    schedulePersist('images');
    return;
  }
  memStores.images.set(k, {
    id: k,
    location,
    png: null,
    has_png: false,
    png_bytes: 0,
    hydrated: true,
    durable: true,
  });
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

/** Test seam: clears every in-memory store and forces a reload on next access. */
export function resetStores(): void {
  for (const name of STORE_NAMES) (memStores[name] as Map<string, unknown>).clear();
  cardsBySession.clear();
  blobUrlCache.clear();
  dirty.clear();
  pngCacheBytes = 0;
  storeReady = null;
}
