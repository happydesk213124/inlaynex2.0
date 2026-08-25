/**
 * `globalThis.__INLAY_NATIVE__` — the only backend surface the UI can see.
 *
 * The UI is a frozen, minified bundle that cannot be rebuilt from source, so
 * this object's shape is a hard contract: every property below is called by the
 * UI and none may be renamed, removed, or changed from sync to async. See
 * `docs/UI-CONTRACT.md`.
 *
 * Boot is lazy and idempotent. The UI calls `ready()` before its first request
 * and again after an error, so a failed boot must drop its cached promise and
 * allow a genuine retry instead of replaying the same failure forever.
 */

import { VERSION } from '../core/constants';
import { clearDebug, dbg, debugSnapshot, setDebugCounts } from '../core/debug';
import { errorBody, isFetchError, makeFetchError } from '../core/errors';
import { hostHas } from '../core/host';
import { routeFetch } from '../api/router';
import { getDeviceStore } from '../storage/device-store';
import { ensureBlobUrl, pngToDataUrl, resolveImageUrl, warmImages, warmProgress, warmFocusProgress, onWarmProgress, pinImageUrls, retainImageUrls, dropImageUrl, prioritizeWarmFocus, clearWarmFocus } from '../storage/image-urls';
import { loadSettingsFromStorage } from '../storage/settings-store';
import { blobUrlCount, idbGet, openDb, storeSize } from '../storage/stores';
import {
  getRefPreviewUrl,
  getVibePreviewUrl,
  setConfig,
  setRefPreviewUrl,
  setVibePreviewUrl,
} from '../services/context';
import { migrateAppearanceToCharacters, migrateCharacterIdentity } from '../services/characters';
import { hydratePresetVibePreviews } from '../services/nai-assets';
import { restoreChatCardChrome } from '../services/char-ref-module';
import { seedPrompts } from '../services/settings';

let readyPromise: Promise<void> | null = null;

async function boot(): Promise<void> {
  dbg('boot.ready.start', { message: VERSION });
  await openDb();
  const store = await getDeviceStore().catch((err: unknown) => {
    dbg('boot.storage', { message: String((err as Error)?.message || err) }, 'error');
    throw err;
  });
  dbg('boot.storage', { message: store.kind });

  setConfig(await loadSettingsFromStorage());
  await seedPrompts();
  await migrateAppearanceToCharacters();
  await migrateCharacterIdentity();

  // Both singletons are small and always visible in settings, so they are
  // encoded once here rather than on demand.
  const ref = await idbGet('meta', 'reference_image');
  if (ref?.png) setRefPreviewUrl(pngToDataUrl(ref.png));
  const vibe = await idbGet('meta', 'vibe_transfer');
  if (vibe?.png) setVibePreviewUrl(pngToDataUrl(vibe.png));
  await hydratePresetVibePreviews();
  await restoreChatCardChrome().catch((err: unknown) => {
    dbg('boot.chat_chrome', { message: String((err as Error)?.message || err) }, 'warn');
  });

  dbg('boot.ready.done', {
    message: VERSION,
    has_nativeFetch: hostHas('nativeFetch'),
    has_idb: hostHas('getLocalPluginStorage'),
  });
}

export async function ready(): Promise<boolean> {
  if (!readyPromise) {
    readyPromise = boot().catch((error: unknown) => {
      readyPromise = null;
      throw error;
    });
  }
  await readyPromise;
  return true;
}

/**
 * `timeoutMs` is accepted for contract compatibility but not enforced, matching
 * the deployed behaviour: image generation legitimately runs past the UI's
 * default, and cutting the request off would abandon an image the user has
 * already spent Anlas on.
 */
export async function fetch(
  path: string,
  options: Record<string, unknown> = {},
  _timeoutMs = 120000,
): Promise<unknown> {
  await ready();
  try {
    const result = await routeFetch(path, options);
    if (result.raw) return result.data;
    if (result.status >= 400) throw makeFetchError(result.status, result.data);
    return result.data;
  } catch (err) {
    if (isFetchError(err)) throw err;
    const message = String((err as Error)?.message || err);
    throw makeFetchError(500, { ok: false, ...errorBody(message, 'internal') }, message);
  }
}

async function ensureImageUrl(id: string): Promise<string> {
  await ready();
  return ensureBlobUrl(id);
}

/** Publishes the bridge and feeds the debug snapshot its storage counters. */
export function installNativeBridge(): void {
  // Injected rather than imported so `core/debug` need not depend on storage.
  setDebugCounts(() => ({
    cards: storeSize('cards'),
    images: storeSize('images'),
    jobs: storeSize('jobs'),
    blob_urls: blobUrlCount(),
  }));

  Reflect.set(globalThis, '__INLAY_NATIVE__', {
    VERSION,
    ready,
    fetch,
    resolveImageUrl,
    refPreviewUrl: getRefPreviewUrl,
    vibePreviewUrl: getVibePreviewUrl,
    ensureImageUrl,
    warmImages,
    pinImageUrls,
    prioritizeWarmFocus,
    clearWarmFocus,
    retainImageUrls,
    dropImageUrl,
    warmProgress,
    warmFocusProgress,
    onWarmProgress,
    debug: debugSnapshot,
    clearDebug,
  });
}
