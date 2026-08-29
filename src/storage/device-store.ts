/**
 * Raw key/value access to Risu's device-local storage.
 *
 * Two backends, in strict preference order:
 *  1. `getLocalPluginStorage()` — IndexedDB via localforage. Device-local, holds
 *     structured values, and does not bloat the user's save file.
 *  2. `pluginStorage` — save-file scoped. Every write re-serialises the whole
 *     save, so a few MB of PNG will visibly stall Risu. Fallback only.
 *
 * When running on backend 1 we also transparently migrate values written by
 * 1.x under its unprefixed keys, so upgrading users keep their galleries.
 */

import { dbg, dbgSpan } from '../core/debug';
import { risuHost } from '../core/host';

/** Both host backends narrowed to what we use. Members are optional because an
 *  older host may hand back a partial object. */
export interface KvApi {
  getItem?(key: string): Promise<unknown>;
  setItem?(key: string, value: unknown): Promise<unknown> | unknown;
  removeItem?(key: string): Promise<unknown> | unknown;
}

/** A `KvApi` proven to support reads and writes. */
type UsableKvApi = KvApi & Required<Pick<KvApi, 'getItem' | 'setItem'>>;

export type StoreKind = 'idb' | 'plugin';

interface DeviceStore {
  readonly kind: StoreKind;
  readonly api: UsableKvApi;
}

const isUsable = (api: KvApi | null | undefined): api is UsableKvApi =>
  typeof api?.getItem === 'function' && typeof api?.setItem === 'function';

let deviceStorePromise: Promise<DeviceStore> | null = null;

export async function getDeviceStore(): Promise<DeviceStore> {
  if (deviceStorePromise) return deviceStorePromise;
  deviceStorePromise = (async (): Promise<DeviceStore> => {
    const g = risuHost();
    if (typeof g?.getLocalPluginStorage === 'function') {
      try {
        const span = dbgSpan('storage.open');
        const api = (await g.getLocalPluginStorage()) as KvApi | null | undefined;
        if (isUsable(api)) {
          span.end({ message: 'idb/getLocalPluginStorage' });
          return { kind: 'idb', api };
        }
        span.end({ message: 'getLocalPluginStorage returned unusable api' }, 'warn');
      } catch (err) {
        dbg('storage.open', { message: String((err as Error)?.message || err) }, 'error');
        console.warn('[Inlay Nexus] getLocalPluginStorage failed', (err as Error)?.message || err);
      }
    }
    const legacy = g?.pluginStorage as KvApi | undefined;
    if (isUsable(legacy)) {
      dbg('storage.open', { message: 'fallback pluginStorage (save-file)' }, 'warn');
      console.warn('[Inlay Nexus] falling back to pluginStorage (save-file scoped)');
      return { kind: 'plugin', api: legacy };
    }
    dbg('storage.open', { message: 'no storage API' }, 'error');
    throw new Error('기기 로컬 IndexedDB 저장소(getLocalPluginStorage)를 사용할 수 없습니다.');
  })().catch((error: unknown) => {
    deviceStorePromise = null;
    throw error;
  });
  return deviceStorePromise;
}

function saveFileApi(): UsableKvApi | null {
  const api = risuHost()?.pluginStorage as KvApi | undefined;
  return isUsable(api) ? api : null;
}

function legacyPluginStorage(): KvApi | null {
  return saveFileApi();
}

/** Save-file `pluginStorage` (account sync). Null when the host has no save store. */
export async function saveFileGet(key: string): Promise<unknown> {
  try {
    const api = saveFileApi();
    if (!api) return null;
    const v = await api.getItem(key);
    if (v != null && v !== '') return v;
    return null;
  } catch {
    return null;
  }
}

/** Mirror a small JSON value into the save file. Never used for PNG rows. */
export async function saveFileSet(key: string, value: unknown): Promise<boolean> {
  const api = saveFileApi();
  if (!api) return false;
  const approx = approxBytes(value);
  try {
    await api.setItem(key, value);
    if (approx > 8_000) dbg('storage.savefile.set', { message: key, bytes: approx, background: true });
    return true;
  } catch (err) {
    dbg(
      'storage.savefile.set',
      { message: `${key}: ${(err as Error)?.message || err}`, bytes: approx, background: true },
      'warn',
    );
    return false;
  }
}

/**
 * Deletes a 1.x key from the save file. Returns false when it refused.
 *
 * Refuses whenever the device store *is* `pluginStorage`. On that host the save
 * file is the live store, so the "legacy" key and the current one are the same
 * row and deleting it destroys data the plugin is still reading. Callers report
 * the false as a skip rather than treating the key as gone.
 */
export async function saveFileRemove(key: string): Promise<boolean> {
  if (!key) return false;
  try {
    const { kind } = await getDeviceStore();
    if (kind !== 'idb') {
      dbg('storage.savefile.remove.skip', { message: key, kind, background: true }, 'warn');
      return false;
    }
    const api = saveFileApi();
    if (typeof api?.removeItem !== 'function') return false;
    await api.removeItem(key);
    return true;
  } catch (err) {
    dbg(
      'storage.savefile.remove',
      { message: `${key}: ${(err as Error)?.message || err}`, background: true },
      'warn',
    );
    return false;
  }
}

/** Reads a key, falling back once to the 1.x key and migrating it forward. */
export async function psGet(key: string, legacyKey?: string): Promise<unknown> {
  try {
    const { kind, api } = await getDeviceStore();
    const v = await api.getItem(key);
    if (v != null && v !== '') return v;
    if (kind === 'idb' && legacyKey) {
      const old = legacyPluginStorage();
      if (old?.getItem) {
        try {
          const legacy = await old.getItem(legacyKey);
          if (legacy != null && legacy !== '') {
            await api.setItem(key, legacy);
            return legacy;
          }
        } catch {
          /* legacy read is best-effort */
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

function approxBytes(value: unknown): number {
  if (typeof value === 'string') return value.length;
  try {
    return JSON.stringify(value).length;
  } catch {
    return 0;
  }
}

export async function psSet(key: string, value: unknown): Promise<boolean> {
  const { kind, api } = await getDeviceStore();
  const approx = approxBytes(value);
  const large = approx > 50_000;
  const span = large ? dbgSpan('storage.set.large') : null;
  try {
    await api.setItem(key, value);
    if (span) span.end({ message: key, bytes: approx, kind, background: true });
    else if (approx > 8_000) dbg('storage.set', { message: key, bytes: approx, kind, background: true });
    return true;
  } catch (err) {
    if (span) span.fail(err, { message: key, bytes: approx, kind, background: true });
    else {
      dbg(
        'storage.set',
        { message: `${key}: ${(err as Error)?.message || err}`, bytes: approx, kind, background: true },
        'error',
      );
    }
    throw err;
  }
}

export async function psRemove(key: string): Promise<void> {
  try {
    const { api } = await getDeviceStore();
    if (api?.removeItem) await api.removeItem(key);
  } catch {
    /* removal is best-effort */
  }
}

/** Test seam: forces the next `getDeviceStore()` to re-resolve the backend. */
export function resetDeviceStore(): void {
  deviceStorePromise = null;
}
