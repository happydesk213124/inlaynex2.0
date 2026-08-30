/**
 * The two singleton NovelAI reference images.
 *
 * Image reference and vibe transfer are one image each rather than a
 * collection, so they live in `meta` under fixed keys instead of the image
 * store, and their preview data URLs sit in `context` so the settings payload
 * can report them without touching storage.
 *
 * Vibe transfer additionally needs a server-side encode, which is a NovelAI
 * round trip. `ensureVibeEncoded` is therefore the read path used before
 * generation: it re-encodes only when the stored blob no longer matches the
 * configured model or extraction level, so an unchanged image costs nothing.
 */

import { dbg } from '../core/debug';
import type { ApiResult, MetaRow } from '../core/types';
import { u8ToArrayBuffer } from '../core/util/bytes';
import {
  GLOBAL_SCOPE,
  isCharRefMetaKey,
  isVibePresetMetaKey,
  normalizeCharRefScope,
  presetIdFromVibeMetaKey,
  vibePresetMetaKey,
} from '../core/constants';
import { cleanText } from '../core/util/text';
import { lookBytesForTarget, refSeedTargets } from '../domain/character/char-ref-seed';
import { sanitizeHash } from '../domain/character/char-ref-store';
import { collectBestLookAssets } from './asset-tags';
import { vibeEncodeToken } from '../domain/nai/keys';
import { modelToNaia, resolveModel } from '../providers/nai/payload';
import { encodeVibe } from '../providers/nai/vibe';
import { pngToDataUrl } from '../storage/image-urls';
import { idbDelete, idbGet, idbGetAll, idbPut } from '../storage/stores';
import {
  clearAllCharRefPreviewUrls,
  getCharRefPreviewUrl,
  getConfig,
  getPresetVibePreviewUrl,
  getRefPreviewUrl,
  getVibePreviewUrl,
  setCharRefPreviewUrl,
  setPresetVibePreviewUrl,
  setRefPreviewUrl,
  setVibePreviewUrl,
} from './context';
import {
  getCharRefAssetBytes,
  putCharRefAsset,
  refreshCharRefAssetIndex,
  resetCharRefLibrary,
} from './char-ref-module';
import { saveConfig } from './settings';

const CHAR_REF_VIBE_PREFIX = 'char_ref_vibe_';

/** Both images are inlined into request payloads as base64, so they stay small. */
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

/** Anything smaller than this cannot be a real image header. */
const MIN_IMAGE_BYTES = 32;

function requireVibeEncodeToken(forUpload: boolean): string {
  const token = vibeEncodeToken(getConfig().nai);
  if (!token) {
    throw new Error(
      forUpload
        ? 'NAI api_key가 설정되지 않았습니다. encode-vibe에 키가 필요합니다.'
        : 'NAI api_key가 설정되지 않았습니다.',
    );
  }
  return token;
}

// ── image reference ────────────────────────────────────────────────────────

/**
 * Presence check for synchronous callers. The preview URL is set whenever the
 * image is stored, so it doubles as the in-memory "configured" flag.
 */
export function hasReferenceImageSync(): boolean {
  return Boolean(getRefPreviewUrl());
}

export async function hasReferenceImage(): Promise<boolean> {
  const ref = await idbGet('meta', 'reference_image');
  return Boolean(ref?.png && ref.png.byteLength > MIN_IMAGE_BYTES);
}

export async function getReferenceImageBytes(): Promise<ArrayBuffer | null> {
  const ref = await idbGet('meta', 'reference_image');
  return ref?.png || null;
}

export async function setReferenceImage(png: ArrayBuffer): Promise<ApiResult> {
  if (!png || png.byteLength < MIN_IMAGE_BYTES) throw new Error('참조 이미지가 비어 있습니다');
  if (png.byteLength > MAX_IMAGE_BYTES) throw new Error('참조 이미지가 너무 큽니다 (최대 12MB)');
  await idbPut('meta', { key: 'reference_image', png });
  setRefPreviewUrl(pngToDataUrl(png));
  getConfig().nai.image_reference = 'file';
  await saveConfig();
  return {
    ok: true,
    image_reference: 'file',
    configured: true,
    bytes: png.byteLength,
    // The UI treats this as an opaque marker; the bytes come from the route.
    preview_url: '/v1/nai/reference.png',
  };
}

export async function clearReferenceImage(): Promise<ApiResult> {
  await idbDelete('meta', 'reference_image');
  setRefPreviewUrl('');
  getConfig().nai.image_reference = 'none';
  await saveConfig();
  return { ok: true, image_reference: 'none', configured: false };
}

// ── vibe transfer ──────────────────────────────────────────────────────────

export function hasVibeTransferSync(): boolean {
  return Boolean(getVibePreviewUrl());
}

export async function hasVibeTransfer(): Promise<boolean> {
  const vibe = await idbGet('meta', 'vibe_transfer');
  return Boolean(vibe?.encoded && vibe?.png && vibe.png.byteLength > MIN_IMAGE_BYTES);
}

export async function getVibeTransfer(): Promise<MetaRow | null> {
  return (await idbGet('meta', 'vibe_transfer')) || null;
}

export async function getVibeImageBytes(): Promise<ArrayBuffer | null> {
  const vibe = await idbGet('meta', 'vibe_transfer');
  return vibe?.png || null;
}

export interface VibeOptions {
  model?: unknown;
  information_extracted?: unknown;
  strength?: unknown;
}

/** Clamped to the range NovelAI accepts; anything unparseable falls back to full. */
function normalizeInformationExtracted(value: unknown): number {
  let ie = Number(value ?? 1.0);
  if (Number.isNaN(ie)) ie = 1.0;
  return Math.max(0, Math.min(1, ie));
}

export async function setVibeTransfer(png: ArrayBuffer, opts: VibeOptions = {}): Promise<ApiResult> {
  if (!png || png.byteLength < MIN_IMAGE_BYTES) throw new Error('Vibe 이미지가 비어 있습니다');
  if (png.byteLength > MAX_IMAGE_BYTES) throw new Error('Vibe 이미지가 너무 큽니다 (최대 12MB)');
  const cfg = getConfig();
  const token = requireVibeEncodeToken(true);
  const model = modelToNaia(opts.model || cfg.nai.model || 'nai-diffusion-4-5-full');
  const ie = normalizeInformationExtracted(opts.information_extracted ?? cfg.nai.vibe_transfer_information_extracted);
  const encoded = await encodeVibe(token, png, model, ie);
  await idbPut('meta', {
    key: 'vibe_transfer',
    png,
    encoded,
    model: resolveModel(model),
    information_extracted: ie,
  });
  setVibePreviewUrl(pngToDataUrl(png));
  cfg.nai.vibe_transfer = 'file';
  if (opts.strength != null && !Number.isNaN(Number(opts.strength))) {
    cfg.nai.vibe_transfer_strength = Math.max(0, Math.min(1, Number(opts.strength)));
  }
  cfg.nai.vibe_transfer_information_extracted = ie;
  await saveConfig();
  return {
    ok: true,
    vibe_transfer: 'file',
    configured: true,
    bytes: png.byteLength,
    encoded_bytes: encoded.length,
    model: resolveModel(model),
    information_extracted: ie,
    preview_url: '/v1/nai/vibe.png',
  };
}

export async function clearVibeTransfer(): Promise<ApiResult> {
  await idbDelete('meta', 'vibe_transfer');
  setVibePreviewUrl('');
  getConfig().nai.vibe_transfer = 'none';
  await saveConfig();
  return { ok: true, vibe_transfer: 'none', configured: false };
}

/**
 * The stored vibe blob, re-encoding it first if the configured model or
 * extraction level has moved since it was made. Returns null when no vibe image
 * is stored, so callers can treat "not configured" and "nothing to send" alike.
 */
export async function ensureVibeEncoded(): Promise<MetaRow | null> {
  const vibe = await getVibeTransfer();
  if (!vibe?.png || vibe.png.byteLength < MIN_IMAGE_BYTES) return null;
  const cfg = getConfig();
  const token = requireVibeEncodeToken(false);
  const model = resolveModel(modelToNaia(cfg.nai.model || 'nai-diffusion-4-5-full'));
  const ie = normalizeInformationExtracted(cfg.nai.vibe_transfer_information_extracted);
  const needEncode =
    !cleanText(vibe.encoded) ||
    cleanText(vibe.model) !== model ||
    Math.abs(Number(vibe.information_extracted ?? 1) - ie) > 0.001;
  if (!needEncode) return vibe;
  const encoded = await encodeVibe(token, vibe.png, model, ie);
  const next: MetaRow = { ...vibe, key: 'vibe_transfer', encoded, model, information_extracted: ie };
  await idbPut('meta', next);
  return next;
}

// ── per-style-preset vibe transfer ─────────────────────────────────────────

export async function hasPresetVibeTransfer(presetId: string): Promise<boolean> {
  const id = cleanText(presetId, 120);
  if (!id) return false;
  const vibe = await idbGet('meta', vibePresetMetaKey(id));
  return Boolean(vibe?.png && vibe.png.byteLength > MIN_IMAGE_BYTES);
}

export async function getPresetVibeTransfer(presetId: string): Promise<MetaRow | null> {
  const id = cleanText(presetId, 120);
  if (!id) return null;
  return (await idbGet('meta', vibePresetMetaKey(id))) || null;
}

export async function getPresetVibeImageBytes(presetId: string): Promise<ArrayBuffer | null> {
  const vibe = await getPresetVibeTransfer(presetId);
  return vibe?.png || null;
}

export async function setPresetVibeTransfer(
  presetId: string,
  png: ArrayBuffer,
  opts: VibeOptions = {},
): Promise<ApiResult> {
  const id = cleanText(presetId, 120);
  if (!id) throw new Error('preset_id required');
  if (!png || png.byteLength < MIN_IMAGE_BYTES) throw new Error('Vibe 이미지가 비어 있습니다');
  if (png.byteLength > MAX_IMAGE_BYTES) throw new Error('Vibe 이미지가 너무 큽니다 (최대 12MB)');
  const cfg = getConfig();
  const token = requireVibeEncodeToken(true);
  const model = modelToNaia(opts.model || cfg.nai.model || 'nai-diffusion-4-5-full');
  const ie = normalizeInformationExtracted(opts.information_extracted ?? cfg.nai.vibe_transfer_information_extracted);
  const encoded = await encodeVibe(token, png, model, ie);
  const metaKey = vibePresetMetaKey(id);
  await idbPut('meta', {
    key: metaKey,
    png,
    encoded,
    model: resolveModel(model),
    information_extracted: ie,
  });
  const preview = pngToDataUrl(png);
  setPresetVibePreviewUrl(id, preview);
  return {
    ok: true,
    preset_id: id,
    vibe_transfer: 'file',
    configured: true,
    bytes: png.byteLength,
    encoded_bytes: encoded.length,
    model: resolveModel(model),
    information_extracted: ie,
    preview_url: preview,
  };
}

export async function clearPresetVibeTransfer(presetId: string): Promise<ApiResult> {
  const id = cleanText(presetId, 120);
  if (!id) throw new Error('preset_id required');
  await idbDelete('meta', vibePresetMetaKey(id));
  setPresetVibePreviewUrl(id, '');
  return { ok: true, preset_id: id, vibe_transfer: 'none', configured: false };
}

/** Copy vibe bytes from one preset id to another (duplicate preset). */
export async function copyPresetVibeTransfer(fromId: string, toId: string): Promise<boolean> {
  const src = await getPresetVibeTransfer(fromId);
  if (!src?.png || src.png.byteLength < MIN_IMAGE_BYTES) return false;
  const dest = cleanText(toId, 120);
  if (!dest) return false;
  await idbPut('meta', {
    key: vibePresetMetaKey(dest),
    png: src.png,
    encoded: src.encoded || '',
    model: src.model || '',
    information_extracted: src.information_extracted ?? 1.0,
  });
  const preview = getPresetVibePreviewUrl(fromId) || (src.png ? pngToDataUrl(src.png) : '');
  if (preview) setPresetVibePreviewUrl(dest, preview);
  return true;
}

/**
 * Preset vibe for generation: re-encode when model / IE drifted. Returns null
 * when this preset has no vibe image (caller should fall back to NAI default).
 */
export async function ensurePresetVibeEncoded(presetId: string): Promise<MetaRow | null> {
  const vibe = await getPresetVibeTransfer(presetId);
  if (!vibe?.png || vibe.png.byteLength < MIN_IMAGE_BYTES) return null;
  const cfg = getConfig();
  const token = requireVibeEncodeToken(false);
  const model = resolveModel(modelToNaia(cfg.nai.model || 'nai-diffusion-4-5-full'));
  const ie = normalizeInformationExtracted(cfg.nai.vibe_transfer_information_extracted);
  const needEncode =
    !cleanText(vibe.encoded) ||
    cleanText(vibe.model) !== model ||
    Math.abs(Number(vibe.information_extracted ?? 1) - ie) > 0.001;
  if (!needEncode) return vibe;
  const encoded = await encodeVibe(token, vibe.png, model, ie);
  const metaKey = vibePresetMetaKey(cleanText(presetId, 120));
  const next: MetaRow = { ...vibe, key: metaKey, encoded, model, information_extracted: ie };
  await idbPut('meta', next);
  return next;
}

/** Warm preview URLs for any preset vibe rows already in memory after boot. */
export async function hydratePresetVibePreviews(): Promise<void> {
  for (const row of await idbGetAll('meta')) {
    const key = String((row as MetaRow)?.key || '');
    if (!isVibePresetMetaKey(key)) continue;
    const png = (row as MetaRow).png;
    if (!png || png.byteLength < MIN_IMAGE_BYTES) continue;
    setPresetVibePreviewUrl(presetIdFromVibeMetaKey(key), pngToDataUrl(png));
  }
}

// ── per-character refs: roster hash + Risu module webp ──

export type CharRefHydrateRow = {
  id: string;
  scope: string;
  hash: string;
  configured: boolean;
  preview_url: string;
};

type CharRefRosterRow = { ref_hash?: unknown } | null;

function withoutLegacyRefPath<T extends object>(row: T): Omit<T, 'ref_path'> {
  const next = { ...row } as T & { ref_path?: unknown };
  delete next.ref_path;
  return next;
}

async function readRosterRefHash(
  scope: unknown,
  characterId: string,
): Promise<string> {
  const id = cleanText(characterId, 200);
  const sc = normalizeCharRefScope(scope);
  if (!id || !sc) return '';
  const row = await idbGet('characters', { scope: sc, id });
  return sanitizeHash((row as CharRefRosterRow)?.ref_hash);
}

async function writeRosterRefHash(
  scope: unknown,
  characterId: string,
  hash: string,
): Promise<void> {
  const id = cleanText(characterId, 200);
  const sc = normalizeCharRefScope(scope);
  if (!id || !sc) throw new Error('character_id/scope required');
  const row = await idbGet('characters', { scope: sc, id });
  if (!row) throw new Error('캐릭터가 없습니다');
  const h = sanitizeHash(hash);
  const next = withoutLegacyRefPath({
    ...row,
    ref_hash: h,
    updated_at: Date.now() / 1000,
  });
  await idbPut('characters', next);
}

export function hasCharRefImageSync(scope: unknown, characterId: string): boolean {
  return Boolean(getCharRefPreviewUrl(normalizeCharRefScope(scope), characterId));
}

export async function hasCharRefImage(scope: unknown, characterId: string): Promise<boolean> {
  return Boolean(await readRosterRefHash(scope, characterId));
}

export async function ensureCharRefPreviewUrl(scope: unknown, characterId: string): Promise<string> {
  const id = cleanText(characterId, 200);
  const sc = normalizeCharRefScope(scope);
  if (!id) return '';
  const existing = getCharRefPreviewUrl(sc, id);
  if (existing) return existing;
  const bytes = await getCharRefImageBytes(sc, id);
  if (!bytes || bytes.byteLength < MIN_IMAGE_BYTES) return '';
  const preview = pngToDataUrl(bytes);
  setCharRefPreviewUrl(sc, id, preview);
  return preview;
}

export async function getCharRefImageBytes(scope: unknown, characterId: string): Promise<ArrayBuffer | null> {
  const hash = await readRosterRefHash(scope, characterId);
  return hash ? getCharRefAssetBytes(hash) : null;
}

/** Fill empty ref slots from name-triggered Risu assets. Never overwrites a hash. */
export async function seedCharRefsFromLooks(characters: readonly unknown[]): Promise<number> {
  const targets = refSeedTargets(characters);
  if (!targets.length) return 0;
  const triggers = [...new Set(targets.flatMap((row) => row.names))];
  let looks: Awaited<ReturnType<typeof collectBestLookAssets>> = [];
  try {
    looks = await collectBestLookAssets(triggers);
  } catch (err) {
    dbg('char_ref.seed.looks.fail', { message: String((err as Error)?.message || err) }, 'warn');
    return 0;
  }
  if (!looks.length) return 0;
  let seeded = 0;
  for (const target of targets) {
    const bytes = lookBytesForTarget(target, looks);
    if (!bytes?.byteLength) continue;
    try {
      const saved = await setCharRefImage(target.scope, target.id, u8ToArrayBuffer(bytes), {
        overwrite: false,
      }) as { ok?: unknown; skipped?: unknown };
      if (saved?.ok && !saved.skipped) seeded += 1;
    } catch (err) {
      dbg('char_ref.seed.put.fail', {
        character_id: target.id,
        message: String((err as Error)?.message || err),
      }, 'warn');
    }
  }
  if (seeded) dbg('char_ref.seed', { seeded, targets: targets.length, looks: looks.length });
  return seeded;
}

export async function setCharRefImage(
  scope: unknown,
  characterId: string,
  bytes: ArrayBuffer,
  opts: { overwrite?: boolean } = {},
): Promise<ApiResult> {
  const id = cleanText(characterId, 200);
  const sc = normalizeCharRefScope(scope);
  if (!id) throw new Error('character_id required');
  if (!sc) throw new Error('scope required');
  if (!bytes || bytes.byteLength < MIN_IMAGE_BYTES) throw new Error('참고 이미지가 비어 있습니다');
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error('참고 이미지가 너무 큽니다 (최대 12MB)');
  if (opts.overwrite === false) {
    const existing = await readRosterRefHash(sc, id);
    if (existing) {
      const preview = await ensureCharRefPreviewUrl(sc, id);
      return {
        ok: true,
        character_id: id,
        scope: sc,
        configured: true,
        skipped: true,
        ref_hash: existing,
        preview_url: preview,
      };
    }
  }
  const stored = await putCharRefAsset(bytes);
  await writeRosterRefHash(sc, id, stored.hash);
  const preview = pngToDataUrl(stored.bytes);
  setCharRefPreviewUrl(sc, id, preview);
  return {
    ok: true,
    character_id: id,
    scope: sc,
    configured: true,
    ref_hash: stored.hash,
    bytes: stored.bytes.byteLength,
    preview_url: preview,
  };
}

export async function clearCharRefImage(scope: unknown, characterId: string): Promise<ApiResult> {
  const id = cleanText(characterId, 200);
  const sc = normalizeCharRefScope(scope);
  if (!id) throw new Error('character_id required');
  if (!sc) throw new Error('scope required');
  const row = await idbGet('characters', { scope: sc, id });
  if (row) {
    const next = withoutLegacyRefPath({ ...row, ref_hash: '', updated_at: Date.now() / 1000 });
    await idbPut('characters', next);
  }
  setCharRefPreviewUrl(sc, id, '');
  return { ok: true, character_id: id, scope: sc, configured: false };
}

export async function copyCharRefImage(
  fromScope: unknown,
  fromId: string,
  toScope: unknown,
  toId: string,
): Promise<boolean> {
  const hash = await readRosterRefHash(fromScope, fromId);
  if (!hash) return false;
  const dest = cleanText(toId, 200);
  const destScope = normalizeCharRefScope(toScope);
  if (!dest || !destScope) return false;
  await writeRosterRefHash(destScope, dest, hash);
  const fromSc = normalizeCharRefScope(fromScope);
  const preview = getCharRefPreviewUrl(fromSc, fromId) || (await ensureCharRefPreviewUrl(fromSc, fromId));
  if (preview) setCharRefPreviewUrl(destScope, dest, preview);
  return true;
}

export async function ensureCharRefVibeEncoded(
  scope: unknown,
  characterId: string,
  informationExtracted?: number,
): Promise<MetaRow | null> {
  const hash = await readRosterRefHash(scope, characterId);
  const png = hash ? await getCharRefImageBytes(scope, characterId) : null;
  if (!hash || !png || png.byteLength < MIN_IMAGE_BYTES) return null;
  const cfg = getConfig();
  const token = requireVibeEncodeToken(false);
  const model = resolveModel(modelToNaia(cfg.nai.model || 'nai-diffusion-4-5-full'));
  const ie = normalizeInformationExtracted(
    informationExtracted ?? cfg.card?.char_ref_fidelity ?? 1,
  );
  const vibeKey = `${CHAR_REF_VIBE_PREFIX}${hash}`;
  const cached = await idbGet('meta', vibeKey);
  const needEncode =
    !cleanText(cached?.encoded) ||
    cleanText(cached?.model) !== model ||
    Math.abs(Number(cached?.information_extracted ?? 1) - ie) > 0.001;
  if (!needEncode && cached) return { ...cached, png };
  const encoded = await encodeVibe(token, png, model, ie);
  const next: MetaRow = { key: vibeKey, png, encoded, model, information_extracted: ie };
  await idbPut('meta', { key: vibeKey, encoded, model, information_extracted: ie });
  return next;
}

export async function hydrateCharRefs(opts: {
  sessionId?: string;
  characterId?: string;
  scope?: string;
} = {}): Promise<{ session: CharRefHydrateRow[]; global: CharRefHydrateRow[] }> {
  await refreshCharRefAssetIndex();
  const wantId = cleanText(opts.characterId || '', 200);
  const wantScope = normalizeCharRefScope(opts.scope || '');
  const sessionId = cleanText(opts.sessionId || '', 200);
  let rows = await idbGetAll('characters');
  const seedRows = rows.filter((row) => {
    const id = cleanText(row.id, 200);
    const scope = normalizeCharRefScope(row.scope);
    if (!id || !scope) return false;
    if (wantId && id !== wantId) return false;
    if (wantScope && scope !== wantScope) return false;
    if (!wantId && !wantScope && sessionId && scope !== sessionId && scope !== GLOBAL_SCOPE) return false;
    return true;
  });
  await seedCharRefsFromLooks(seedRows).catch((err) => {
    dbg('char_ref.seed.hydrate.fail', { message: String((err as Error)?.message || err) }, 'warn');
  });
  rows = await idbGetAll('characters');
  const session: CharRefHydrateRow[] = [];
  const global: CharRefHydrateRow[] = [];
  for (const row of rows) {
    const id = cleanText(row.id, 200);
    const scope = normalizeCharRefScope(row.scope);
    if (!id || !scope) continue;
    if (wantId && id !== wantId) continue;
    if (wantScope && scope !== wantScope) continue;
    if (!wantId && !wantScope && sessionId && scope !== sessionId && scope !== GLOBAL_SCOPE) continue;
    const hash = sanitizeHash(row.ref_hash);
    const preview = hash ? await ensureCharRefPreviewUrl(scope, id) : '';
    const item: CharRefHydrateRow = {
      id,
      scope,
      hash,
      configured: Boolean(hash),
      preview_url: preview,
    };
    if (scope === GLOBAL_SCOPE) global.push(item);
    else session.push(item);
  }
  return { session, global };
}

/** @deprecated Boot no longer decodes every ref. Kept so callers compile. */
export async function hydrateCharRefPreviews(): Promise<void> {
  return;
}

export async function resetAllCharacterRefs(): Promise<ApiResult> {
  const rows = await idbGetAll('characters');
  let cleared = 0;
  for (const row of rows) {
    const hasLegacyPath = Object.prototype.hasOwnProperty.call(row, 'ref_path');
    if (!sanitizeHash(row.ref_hash) && !row.ref_hash && !hasLegacyPath) continue;
    const next = withoutLegacyRefPath({ ...row, ref_hash: '', updated_at: Date.now() / 1000 });
    await idbPut('characters', next);
    cleared += 1;
  }
  for (const row of await idbGetAll('meta')) {
    const key = String((row as MetaRow)?.key || '');
    if (isCharRefMetaKey(key) || key.startsWith(CHAR_REF_VIBE_PREFIX) || key.startsWith('char_ref_')) {
      await idbDelete('meta', key);
    }
  }
  clearAllCharRefPreviewUrls();
  const library = await resetCharRefLibrary();
  return { ok: true, cleared, removed: (library as { removed?: number }).removed || 0 };
}
