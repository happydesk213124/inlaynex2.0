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

import type { ApiResult, MetaRow } from '../core/types';
import { isVibePresetMetaKey, presetIdFromVibeMetaKey, vibePresetMetaKey } from '../core/constants';
import { cleanText } from '../core/util/text';
import { modelToNaia, resolveModel } from '../providers/nai/payload';
import { encodeVibe } from '../providers/nai/vibe';
import { pngToDataUrl } from '../storage/image-urls';
import { idbDelete, idbGet, idbGetAll, idbPut } from '../storage/stores';
import {
  getConfig,
  getPresetVibePreviewUrl,
  getRefPreviewUrl,
  getVibePreviewUrl,
  setPresetVibePreviewUrl,
  setRefPreviewUrl,
  setVibePreviewUrl,
} from './context';
import { saveConfig } from './settings';

/** Both images are inlined into request payloads as base64, so they stay small. */
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

/** Anything smaller than this cannot be a real image header. */
const MIN_IMAGE_BYTES = 32;

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
  const token = cleanText(cfg.nai.api_key);
  if (!token) throw new Error('NAI api_key가 설정되지 않았습니다. encode-vibe에 키가 필요합니다.');
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
  const token = cleanText(cfg.nai.api_key);
  if (!token) throw new Error('NAI api_key가 설정되지 않았습니다.');
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
  const token = cleanText(cfg.nai.api_key);
  if (!token) throw new Error('NAI api_key가 설정되지 않았습니다. encode-vibe에 키가 필요합니다.');
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
  const token = cleanText(cfg.nai.api_key);
  if (!token) throw new Error('NAI api_key가 설정되지 않았습니다.');
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
