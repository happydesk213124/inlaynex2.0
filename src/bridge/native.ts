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

import { BOOT_STAMP_KEY, VERSION } from '../core/constants';
import { bootId, clearDebug, dbg, debugSnapshot, setDebugCounts, setDebugMemory, setPrevBootGap, startStallMonitor } from '../core/debug';
import { errorBody, isFetchError, makeFetchError } from '../core/errors';
import { hostHas } from '../core/host';
import { routeFetch } from '../api/router';
import { getDeviceStore, psGet, psSet } from '../storage/device-store';
import { ensureBlobUrl, imageUrlStats, pngToDataUrl, resolveImageUrl, subscribeImageUrl, warmImages, warmProgress, warmFocusProgress, onWarmProgress, pinImageUrls, retainImageUrls, dropImageUrl, prioritizeWarmFocus, clearWarmFocus } from '../storage/image-urls';
import { dropExplorerThumbUrl, ensureExplorerThumbUrl, pinExplorerThumbs, resolveExplorerThumbUrl, retainExplorerThumbs, warmExplorerThumbs } from '../storage/explorer-thumbs';
import { loadSettingsFromStorage } from '../storage/settings-store';
import { blobUrlCount, idbGet, imageCacheStats, isStorageMigrated, knownCharRefHashCount, openDb, storeSize } from '../storage/stores';
import { setKnownCharRefCount } from '../services/char-ref-module';
import {
  getRefPreviewUrl,
  getVibePreviewUrl,
  setConfig,
  setRefPreviewUrl,
  setVibePreviewUrl,
} from '../services/context';
import { migrateAppearanceToCharacters, migrateCharacterIdentity } from '../services/characters';
import { hydratePresetVibePreviews } from '../services/nai-assets';
import { hydratePresetLookPreviews } from '../services/preset-look';
import { seedPrompts } from '../services/settings';
import { closeTagStudio, openTagStudio } from '../tag-studio/mount';
import {
  bindCharacterExampleShot,
  bindCharacterHeaderRef,
  closeCharacterCommandEdit,
  closeImagePeek,
  openCharacterCommandEdit,
  openImagePeek,
  paintExampleSlot,
  paintHeaderRefSlot,
  readCharacterFromForm,
  setGenSpin,
} from '../char-command/mount';

let readyPromise: Promise<void> | null = null;

async function boot(): Promise<void> {
  dbg('boot.ready.start', { message: VERSION });
  await openDb();
  const store = await getDeviceStore().catch((err: unknown) => {
    dbg('boot.storage', { message: String((err as Error)?.message || err) }, 'error');
    throw err;
  });
  dbg('boot.storage', { message: store.kind });
  await stampBoot();

  setConfig(await loadSettingsFromStorage());
  await seedPrompts();
  // Both only ever find pre-roster / schema-1 rows. Once the storage migration
  // has run they are guaranteed to be no-ops, so skip the scans entirely.
  if (!(await isStorageMigrated())) {
    await migrateAppearanceToCharacters();
    await migrateCharacterIdentity();
  }

  // Both singletons are small and always visible in settings, so they are
  // encoded once here rather than on demand.
  const ref = await idbGet('meta', 'reference_image');
  if (ref?.png) setRefPreviewUrl(pngToDataUrl(ref.png));
  const vibe = await idbGet('meta', 'vibe_transfer');
  if (vibe?.png) setVibePreviewUrl(pngToDataUrl(vibe.png));
  await hydratePresetVibePreviews();
  await hydratePresetLookPreviews();

  dbg('boot.ready.done', {
    message: VERSION,
    has_nativeFetch: hostHas('nativeFetch'),
    has_idb: hostHas('getLocalPluginStorage'),
  });
}

/**
 * Records this boot against the previous one. A gap of a few seconds means the
 * plugin iframe was reloaded under us — which, right after a settings click, is
 * the host re-parenting the iframe rather than our shell failing to paint.
 */
async function stampBoot(): Promise<void> {
  const now = Date.now();
  try {
    const prev = Number(await psGet(BOOT_STAMP_KEY));
    const gap = Number.isFinite(prev) && prev > 0 ? now - prev : null;
    setPrevBootGap(gap);
    dbg('boot.stamp', { message: bootId(), prev_boot_gap_ms: gap, background: true }, gap != null && gap < 30_000 ? 'warn' : 'info');
    await psSet(BOOT_STAMP_KEY, now);
  } catch {
    /* a diagnostic must never fail boot */
  }
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
  setDebugMemory(() => ({ ...imageCacheStats(), encode: imageUrlStats() }));
  startStallMonitor();

  // Same reason: the reference-image module must be able to tell "no assets
  // stored" from "the host did not load them", and only the roster knows.
  setKnownCharRefCount(knownCharRefHashCount);

  Reflect.set(globalThis, '__INLAY_NATIVE__', {
    VERSION,
    ready,
    fetch,
    resolveImageUrl,
    refPreviewUrl: getRefPreviewUrl,
    vibePreviewUrl: getVibePreviewUrl,
    ensureImageUrl,
    // Inline shots place their markers first and fill each cell as its own id
    // resolves, so they never re-run a paint pass just to catch a late encode.
    subscribeImageUrl,
    warmImages,
    pinImageUrls,
    prioritizeWarmFocus,
    clearWarmFocus,
    retainImageUrls,
    dropImageUrl,
    resolveExplorerThumbUrl,
    ensureExplorerThumbUrl,
    warmExplorerThumbs,
    dropExplorerThumbUrl,
    retainExplorerThumbs,
    pinExplorerThumbs,
    warmProgress,
    warmFocusProgress,
    onWarmProgress,
    debug: debugSnapshot,
    clearDebug,
    openTagStudio,
    closeTagStudio,
    openCharacterCommandEdit,
    closeCharacterCommandEdit,
    openImagePeek,
    closeImagePeek,
    bindCharacterHeaderRef,
    paintHeaderRefSlot,
    bindCharacterExampleShot,
    paintExampleSlot,
    readCharacterFromForm,
    setGenSpin,
  });
}
