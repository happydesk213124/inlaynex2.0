/**
 * Gallery pixels in a dedicated Risu module.
 *
 * The images index still keys by card id. This module stores the bytes via
 * saveAsset and remembers the exact path in location.asset_path. A miss is a
 * missing image — plugin storage is not a pixel fallback.
 */
import { dbg } from '../core/debug';
import { hostHas, risuHost } from '../core/host';
import { asU8, sniffImageMime, u8ToArrayBuffer, type BytesLike } from '../core/util/bytes';
import { cleanText } from '../core/util/text';
import {
  SHOT_MODULE_ID,
  SHOT_MODULE_NAME,
  SHOT_MODULE_NS,
  asShotAssetRows,
  idFromShotAssetName,
  isShotAssetName,
  normalizeAssetPath,
  parseShotModuleAssets,
  sanitizeShotId,
  shotAssetName,
} from '../domain/gallery/shot-assets';

type ModuleRow = {
  id?: string;
  name?: string;
  description?: string;
  namespace?: string;
  hideIcon?: boolean;
  lorebook?: unknown[];
  assets?: Array<[string, string, string] | unknown>;
};

const MIN_IMAGE_BYTES = 32;

function hostOrNull(): ReturnType<typeof risuHost> {
  return risuHost();
}

export function shotModuleAvailable(): boolean {
  return hostHas('saveAsset') && hostHas('readImage') && hostHas('getDatabase') && hostHas('setDatabase');
}

async function ensureDbAccess(): Promise<void> {
  const host = hostOrNull();
  if (host && typeof host.requestPluginPermission === 'function') {
    try {
      await host.requestPluginPermission('db');
    } catch {
      /* already granted or older host */
    }
  }
}

function storeExtFromBytes(bytes: BytesLike): string {
  const mime = sniffImageMime(bytes);
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  return 'webp';
}

function readModules(db: { modules?: unknown } | null | undefined): ModuleRow[] {
  return asShotAssetRows(db?.modules).filter((row): row is ModuleRow => Boolean(row && typeof row === 'object'));
}

function findModuleIndex(modules: ModuleRow[]): number {
  return modules.findIndex(
    (m) => cleanText(m?.id, 80) === SHOT_MODULE_ID || cleanText(m?.namespace, 80) === SHOT_MODULE_NS,
  );
}

function coerceImageBytes(data: unknown): ArrayBuffer | null {
  if (!data) return null;
  if (data instanceof ArrayBuffer) return data.byteLength >= MIN_IMAGE_BYTES ? data : null;
  if (data instanceof Uint8Array) {
    return data.byteLength >= MIN_IMAGE_BYTES ? u8ToArrayBuffer(data) : null;
  }
  if (typeof Blob !== 'undefined' && data instanceof Blob) return null;
  if (typeof data === 'string') {
    const m = data.match(/^data:[^;]+;base64,(.+)$/i);
    const payload = m?.[1] || (data.startsWith('data:') ? '' : data.replace(/\s+/g, ''));
    if (!payload) return null;
    try {
      const bin = atob(payload);
      if (bin.length < MIN_IMAGE_BYTES) return null;
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i);
      return u8ToArrayBuffer(u8);
    } catch {
      return null;
    }
  }
  if (typeof data === 'object') {
    const rec = data as Record<string, unknown>;
    if (rec.data instanceof ArrayBuffer || rec.data instanceof Uint8Array || typeof rec.data === 'string') {
      return coerceImageBytes(rec.data);
    }
    if (Array.isArray(rec.data) && rec.data.every((n) => typeof n === 'number')) {
      const u8 = Uint8Array.from(rec.data as number[]);
      return u8.byteLength >= MIN_IMAGE_BYTES ? u8ToArrayBuffer(u8) : null;
    }
    if (typeof rec.length === 'number' && rec.length >= MIN_IMAGE_BYTES) {
      try {
        const u8 = Uint8Array.from(rec as unknown as ArrayLike<number>);
        return u8.byteLength >= MIN_IMAGE_BYTES ? u8ToArrayBuffer(u8) : null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

export async function readShotAssetBytes(path: string): Promise<ArrayBuffer | null> {
  const host = hostOrNull();
  if (!host || typeof host.readImage !== 'function' || !path) return null;
  try {
    const data = await host.readImage(path);
    if (typeof Blob !== 'undefined' && data instanceof Blob) {
      const buf = await data.arrayBuffer();
      return buf.byteLength >= MIN_IMAGE_BYTES ? buf : null;
    }
    return coerceImageBytes(data);
  } catch (err) {
    dbg('shot.module.read.fail', {
      path: cleanText(path, 220),
      message: cleanText((err as Error)?.message ?? err, 220),
      background: true,
    }, 'warn');
    return null;
  }
}

function copyBytes(bytes: BytesLike): ArrayBuffer {
  return u8ToArrayBuffer(asU8(bytes));
}

/** Saves bytes and proves they can be read back, or null. No DB write. */
async function storeShotBytes(
  id: string,
  bytes: BytesLike,
): Promise<{ path: string; name: string } | null> {
  const host = hostOrNull();
  if (!host || typeof host.saveAsset !== 'function') return null;
  const stored = copyBytes(bytes);
  if (stored.byteLength < MIN_IMAGE_BYTES) return null;
  const name = shotAssetName(id, storeExtFromBytes(stored));
  if (!name) return null;
  const path = normalizeAssetPath(await host.saveAsset(stored));
  if (!path) return null;
  // The readback is what lets a caller drop its own copy of the bytes.
  const readBack = await readShotAssetBytes(path);
  if (!readBack || readBack.byteLength < MIN_IMAGE_BYTES) {
    dbg('shot.module.readback.fail', { id, path }, 'warn');
    return null;
  }
  return { path, name };
}

/** Upserts asset tuples into the module array in place. Mutates `modules`. */
function upsertShotTuples(modules: ModuleRow[], saved: ShotAssetSaved[]): void {
  if (!saved.length) return;
  let idx = findModuleIndex(modules);
  if (idx < 0) {
    modules.push({
      id: SHOT_MODULE_ID,
      name: SHOT_MODULE_NAME,
      description: '생성된 이미지. Inlay가 관리합니다.',
      namespace: SHOT_MODULE_NS,
      hideIcon: false,
      lorebook: [],
      assets: [],
    });
    idx = modules.length - 1;
  }
  const assets = parseShotModuleAssets(modules[idx]!.assets);
  for (const row of saved) {
    const same = assets.findIndex(
      (a) => idFromShotAssetName(a[0]) === sanitizeShotId(row.id) || a[0] === row.name,
    );
    if (same >= 0) assets[same] = [row.name, row.path, row.name];
    else assets.push([row.name, row.path, row.name]);
  }
  modules[idx] = {
    ...modules[idx],
    id: SHOT_MODULE_ID,
    name: modules[idx]?.name || SHOT_MODULE_NAME,
    namespace: SHOT_MODULE_NS,
    hideIcon: false,
    lorebook: Array.isArray(modules[idx]?.lorebook) ? modules[idx]!.lorebook : [],
    assets,
  };
}

export async function putShotAsset(
  id: string,
  bytes: BytesLike,
): Promise<{ path: string; name: string } | null> {
  const saved = await putShotAssetsBatch([{ id, bytes }]);
  const hit = saved[0];
  return hit ? { path: hit.path, name: hit.name } : null;
}

export type ShotAssetSaved = { id: string; path: string; name: string };

/**
 * Stores many shots against a single Risu DB commit.
 *
 * `getDatabase`/`setDatabase` rewrite the whole module array, so doing that per
 * image is what makes migrating a full gallery slow — the bytes are the cheap
 * part. Batching turns N DB round-trips into one.
 *
 * `saveAsset` stays sequential on purpose: it is a host call whose internals we
 * do not own, and a one-time migration is not worth racing it.
 */
export async function putShotAssetsBatch(
  entries: Array<{ id: string; bytes: BytesLike }>,
): Promise<ShotAssetSaved[]> {
  const list = (Array.isArray(entries) ? entries : []).filter((e) => e && cleanText(e.id, 80));
  if (!list.length || !shotModuleAvailable()) return [];
  await ensureDbAccess();
  const host = hostOrNull();
  if (!host || typeof host.saveAsset !== 'function') return [];

  const saved: ShotAssetSaved[] = [];
  for (const entry of list) {
    const hit = await storeShotBytes(entry.id, entry.bytes);
    if (hit) saved.push({ id: entry.id, path: hit.path, name: hit.name });
  }
  if (!saved.length) return [];

  // Read the DB only after the bytes are in, so a long batch cannot commit a
  // module array that went stale while we were writing assets.
  const db = await host.getDatabase!(['modules', 'enabledModules']);
  if (!db) return [];
  const modules = readModules(db);
  const enabled = asShotAssetRows(db.enabledModules).map((row) => cleanText(row, 200)).filter(Boolean);
  const moduleEnabled = enabled.includes(SHOT_MODULE_ID) || enabled.includes(SHOT_MODULE_NS);
  upsertShotTuples(modules, saved);
  if (!moduleEnabled) enabled.push(SHOT_MODULE_ID);
  await host.setDatabase!({ modules: modules as never, enabledModules: enabled as string[] });
  return saved;
}

export async function dropShotAsset(id: string): Promise<boolean> {
  if (!shotModuleAvailable()) return false;
  await ensureDbAccess();
  const host = hostOrNull();
  if (!host) return false;
  const db = await host.getDatabase!(['modules', 'enabledModules']);
  const modules = readModules(db);
  const idx = findModuleIndex(modules);
  if (idx < 0) return false;
  const want = sanitizeShotId(id);
  const assets = parseShotModuleAssets(modules[idx]!.assets);
  const kept = assets.filter((row) => {
    if (!isShotAssetName(row[0])) return true;
    return idFromShotAssetName(row[0]) !== want;
  });
  if (kept.length === assets.length) return false;
  modules[idx] = { ...modules[idx], assets: kept };
  await host.setDatabase!({
    modules: modules as never,
    enabledModules: asShotAssetRows(db?.enabledModules).map((row) => cleanText(row, 200)).filter(Boolean) as string[],
  });
  return true;
}
