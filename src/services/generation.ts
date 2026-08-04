/**
 * One shot → one image, plus the record of where that image belongs.
 *
 * Two responsibilities live together here because they share the same input:
 * turning a tagged shot into a NovelAI/ComfyUI request, and writing the
 * "location" sidecar that lets a card be re-attached to its message after the
 * chat is edited, renamed or re-linked.
 *
 * The location shape is frozen. Its fields are read by the gallery, the
 * explorer and the re-bind path, and older rows may be missing any of them, so
 * every read falls back through `location → card meta → default` in that order.
 */

import { QUALITY_TAGS, UC_PRESETS } from '../config/defaults';
import { normalizeNaturalBaseMode } from '../config/schema';
import { API_URL, IMAGE_KEY } from '../core/constants';
import { dbg } from '../core/debug';
import type { JobRequest, NaiSettings, ShotCharacter, StylePreset, TaggedShot } from '../core/types';
import {
  ASSISTANT_PREVIEW_LIMIT,
  cleanText,
  extractPreset,
  joinTags,
  toInt,
  toOptionalFloat,
} from '../core/util/text';
import type { CharacterInput } from '../domain/character/identity';
import { dedupeShotCharacters, resolveCharacter } from '../domain/character/roster';
import {
  characterMaxLimit,
  composeCharacterCaptionTags,
  normalizePersonTagMode,
  personCountTagsForShot,
  stripPersonCountTags,
} from '../domain/character/tags';
import { resolveGenerationNaiParams } from '../domain/style-preset-overrides';
import { generateViaComfy, imageBackendKind } from '../providers/comfy/client';
import { generateT2i } from '../providers/nai/client';
import { modelToNaia, type CharacterReference, type T2iRequest, type VibeReference } from '../providers/nai/payload';
import { idbGet, idbPut, imageLocation } from '../storage/stores';
import { getConfig } from './context';
import { ensureVibeEncoded, getReferenceImageBytes } from './nai-assets';
import { getPrompt } from './settings';

/**
 * One NovelAI character caption. Deliberately anonymous — the provider payload
 * identifies characters by position, and the display name is carried separately
 * in `GenerationMeta.characters`.
 */
export interface NaiCaption {
  prompt: string;
  uc: string;
  center_x: number;
  center_y: number;
}

/** A caption plus the bookkeeping the card row and the reroll path need. */
export interface GenerationCharacter extends NaiCaption {
  name: string;
  /** The tagger's original entry, replayed verbatim when the card is rerolled. */
  raw: ShotCharacter;
}

/** The non-payload half of a plan: what the card row records about the shot. */
export interface GenerationMeta {
  setup: string;
  person: string;
  characters: GenerationCharacter[];
  paragraph: number | undefined;
}

export interface GenerationPlan {
  main: string;
  neg: string;
  captions: NaiCaption[];
  meta: GenerationMeta;
}

/**
 * The payload half of a plan. `rerollCard`'s prompt-override path builds one of
 * these without ever producing a `GenerationMeta`, so `generateImage` asks for
 * no more than it uses.
 */
export type ImageRequest = Pick<GenerationPlan, 'main' | 'neg' | 'captions'>;

export interface GeneratedImage {
  bytes: ArrayBuffer;
  seed: number;
}

export interface ShotArgs {
  shot: TaggedShot;
  roster: CharacterInput[];
  /** Pins the scene tags so a reroll re-renders only the cast. */
  lockedSetup?: string;
}

export interface LocationArgs {
  imageId: string;
  sessionId: string;
  request: JobRequest;
  shotIndex: number;
  paragraph: unknown;
  yPercent: number | null;
  contentHash?: string;
}

/** Written alongside every image; a type alias so it stays an open record. */
export type ImageLocation = {
  version: number;
  image_id: string;
  session_id: string;
  unified_session_id: string;
  character_id: string;
  character_name: string;
  chat_id: string;
  chat_name: string;
  char_index: number;
  chat_index: number;
  message_index: number;
  message_role: string;
  shot_index: number;
  paragraph: number;
  y_percent: number | null;
  content_hash: string;
  assistant_preview: string;
};

/** The location fields a card response carries, resolved against its stored meta. */
export type CardLocationFields = {
  character_id: string;
  chat_id: string;
  character_name: string;
  chat_name: string;
  char_index: number;
  chat_index: number;
  message_index: number;
  message_role: string;
  shot_index: number;
  paragraph: number;
  y_percent: number | null;
  content_hash: string;
  assistant_preview: string;
  unified_session_id: string;
  location_file: string;
  storage: string;
  storage_key: string;
};

/** Builds the prompt, negative prompt and per-character captions for one shot. */
export async function buildGenerationForShot(args: ShotArgs): Promise<GenerationPlan> {
  const { shot, roster } = args;
  const card = getConfig().card;
  const nai = getConfig().nai;
  const charMax = characterMaxLimit(card);
  const chars = dedupeShotCharacters(shot.characters || [], roster, charMax).slice(0, charMax);
  const n = Math.max(1, chars.length);
  const personMode = normalizePersonTagMode(card.person_tag_mode, card.auto_person_tags);
  const person = personCountTagsForShot(chars, roster, personMode);
  const [filePos, fileNeg] = extractPreset(await getPrompt('preset_1'));
  const presets: unknown[] = Array.isArray(card.presets) ? card.presets : [];
  const activeId = cleanText(card.active_preset_id, 120);
  let active: Record<string, unknown> | null = null;
  if (presets.length) {
    if (activeId) {
      active = (presets.find(
        (item) => typeof item === 'object' && cleanText((item as Record<string, unknown>).id, 120) === activeId,
      ) as Record<string, unknown> | undefined) || null;
    }
    if (!active && typeof presets[0] === 'object') active = presets[0] as Record<string, unknown>;
  }
  let stylePos: string;
  let styleNeg: string;
  if (active) {
    stylePos = cleanText(active.positive || active.pos || '');
    styleNeg = cleanText(active.negative || active.neg || '');
  } else {
    stylePos = joinTags(cleanText(card.custom_pos), filePos);
    styleNeg = joinTags(cleanText(card.custom_neg), fileNeg);
  }
  let situation: unknown = shot.situation || shot.scene;
  if (personMode !== 'off') situation = stripPersonCountTags(situation || '');
  let setup: string;
  const lockedSetup = cleanText(args.lockedSetup || '');
  if (lockedSetup) {
    setup = lockedSetup;
  } else {
    setup = joinTags(shot.camera, situation, shot.place, shot.action);
    if (card.mode === 'asset') setup = joinTags(setup, 'white background', 'simple background', 'cowboy shot', 'looking at viewer', 'portrait');
  }
  // Natural-language base phrase (LLM shots[].natural) — mode from card.natural_base.
  const naturalMode = normalizeNaturalBaseMode(card.natural_base);
  const naturalCap = naturalMode === 'supplement' ? 600 : naturalMode === 'detailed' ? 480 : 400;
  const natural =
    naturalMode === 'off'
      ? ''
      : cleanText(shot.natural || shot.natural_base || shot.nl || '', naturalCap);
  let main = joinTags(person, stylePos, natural, setup);
  const naiaModel = modelToNaia(nai.model || 'nai-diffusion-4-5-full');
  if (nai.apply_quality_tags !== false) main += QUALITY_TAGS[naiaModel] || '';
  const ucPreset = cleanText(nai.uc_preset) || 'human_focus';
  const neg = joinTags(styleNeg, (UC_PRESETS[naiaModel] || {})[ucPreset] || '');

  const captions: NaiCaption[] = [];
  const charMeta: GenerationCharacter[] = [];
  for (let idx = 0; idx < chars.length; idx++) {
    const char = chars[idx];
    const name = cleanText(char.name, 200);
    const stored = name ? resolveCharacter(name, roster) : null;
    const prompt = composeCharacterCaptionTags(stored, char);
    const uc = cleanText(char.negative);
    const cx = n === 1 ? 0.5 : Math.round((0.1 + (0.8 * idx) / Math.max(1, n - 1)) * 10) / 10;
    const cy = 0.5;
    captions.push({ prompt: prompt || 'girl', uc, center_x: cx, center_y: cy });
    charMeta.push({ name: stored?.name || name, prompt, uc, center_x: cx, center_y: cy, raw: char });
  }
  return { main, neg, captions, meta: { setup, person, characters: charMeta, paragraph: shot.paragraph } };
}

/** Runs one generation on the configured backend and returns the bytes and seed. */
export async function generateImage(plan: ImageRequest): Promise<GeneratedImage> {
  const nai: NaiSettings = getConfig().nai;
  // Both providers type their cast as `ShotCharacter`, which requires a `name`;
  // captions carry none and only the four caption fields are ever read.
  const characters = plan.captions as unknown as ShotCharacter[];
  if (imageBackendKind(nai) === 'comfy') {
    const [comfyBytes, comfySeed] = await generateViaComfy(nai, plan.main, plan.neg, characters);
    return { bytes: comfyBytes, seed: comfySeed };
  }
  const token = cleanText(nai.api_key);
  if (!token) throw new Error('NAI api_key가 설정되지 않았습니다.');
  const characterRefs: CharacterReference[] = [];
  const refMode = cleanText(nai.image_reference || 'none').toLowerCase();
  if (!['', 'none', 'off', 'false', '0'].includes(refMode)) {
    const refBytes = await getReferenceImageBytes();
    if (refBytes) {
      let refType = cleanText(nai.image_reference_type || 'character&style') || 'character&style';
      if (!['character', 'style', 'character&style'].includes(refType)) refType = 'character&style';
      let strength = Number(nai.image_reference_strength ?? 0.6);
      let fidelity = Number(nai.image_reference_fidelity ?? 1.0);
      if (Number.isNaN(strength)) strength = 0.6;
      if (Number.isNaN(fidelity)) fidelity = 1.0;
      characterRefs.push({
        image: refBytes,
        type: refType,
        strength: Math.max(0, Math.min(1, strength)),
        fidelity: Math.max(0, Math.min(1, fidelity)),
      });
    }
  }
  // Active style preset may override CFG / vibe; empty preset fields keep NAI defaults.
  const card = getConfig().card;
  const presets: unknown[] = Array.isArray(card.presets) ? card.presets : [];
  const activeId = cleanText(card.active_preset_id, 120);
  let activePreset: Record<string, unknown> | null = null;
  if (presets.length) {
    if (activeId) {
      activePreset =
        (presets.find(
          (item) =>
            typeof item === 'object' && cleanText((item as Record<string, unknown>).id, 120) === activeId,
        ) as Record<string, unknown> | undefined) || null;
    }
    if (!activePreset && typeof presets[0] === 'object') activePreset = presets[0] as Record<string, unknown>;
  }
  const naiParams = resolveGenerationNaiParams(nai, activePreset as StylePreset | null);

  const vibes: VibeReference[] = [];
  const vibeMode = cleanText(naiParams.vibe_transfer || 'none').toLowerCase();
  if (!['', 'none', 'off', 'false', '0'].includes(vibeMode)) {
    const vibe = await ensureVibeEncoded();
    if (vibe?.encoded) {
      let strength = Number(nai.vibe_transfer_strength ?? 0.6);
      let ie = Number(nai.vibe_transfer_information_extracted ?? vibe.information_extracted ?? 1.0);
      if (Number.isNaN(strength)) strength = 0.6;
      if (Number.isNaN(ie)) ie = 1.0;
      vibes.push({
        encoded: vibe.encoded,
        strength: Math.max(0, Math.min(1, strength)),
        information_extracted: Math.max(0, Math.min(1, ie)),
      });
    }
  }
  const req: T2iRequest = {
    prompt: plan.main,
    negative_prompt: plan.neg,
    // Keep payload small — Risu nativeFetch has no body stream; arrayBuffer() of multi-MB ZIPs often hangs.
    width: Math.min(Number(nai.width ?? 640) || 640, 832),
    height: Math.min(Number(nai.height ?? 960) || 960, 1216),
    seed: Number(nai.seed ?? 0) || 0,
    steps: Math.min(Number(nai.steps ?? 28) || 28, 28),
    cfg_scale: naiParams.cfg_scale,
    cfg_rescale: naiParams.cfg_rescale,
    sampler: cleanText(nai.sampler) || 'k_euler_ancestral',
    scheduler: cleanText(nai.scheduler) || 'karras',
    model: modelToNaia(nai.model || 'nai-diffusion-4-5-full'),
    var_plus: Boolean(nai.variety_plus),
    characters,
    character_refs: characterRefs,
    vibes,
  };
  // Hard cap pixel count for plugin RPC reliability (~0.8MP).
  if (req.width * req.height > 832 * 1216) {
    req.width = 640;
    req.height = 960;
  }
  dbg('nai.generate.dims', { message: `${req.width}x${req.height}`, steps: req.steps, focus: true });
  if (!req.seed) req.seed = Math.floor(Math.random() * 4294967295) || 1;
  const apiUrl = cleanText(nai.request_url) || API_URL;
  // `generateT2i` serialises NovelAI generations internally.
  const result = await generateT2i(token, req, apiUrl, { timeoutMs: 90000 });
  return { bytes: result.raw_bytes, seed: req.seed || 0 };
}

/** The location record for a freshly generated image. */
export function buildImageLocation({
  imageId,
  sessionId,
  request,
  shotIndex,
  paragraph,
  yPercent,
  contentHash = '',
}: LocationArgs): ImageLocation {
  return {
    version: 1,
    image_id: cleanText(imageId, 80),
    session_id: cleanText(sessionId, 200),
    unified_session_id: cleanText(request.unified_session_id || '', 200),
    character_id: cleanText(request.character_id || '', 200),
    character_name: cleanText(request.character_name || '', 200),
    chat_id: cleanText(request.chat_id || '', 200),
    chat_name: cleanText(request.chat_name || '', 200),
    char_index: toInt(request.char_index, -1),
    chat_index: toInt(request.chat_index, -1),
    message_index: toInt(request.message_index, -1),
    message_role: cleanText(request.message_role || request.role || '', 40).toLowerCase(),
    shot_index: toInt(shotIndex, 0),
    paragraph: toInt(paragraph, 0),
    y_percent: yPercent,
    content_hash: cleanText(contentHash || request.content_hash || '', 128),
    assistant_preview: cleanText(request.assistant_text || '', ASSISTANT_PREVIEW_LIMIT),
  };
}

export async function readImageLocation(imageId: string): Promise<Record<string, unknown>> {
  // Metadata-only: this runs once per row when a gallery is listed, so it must not
  // pull the pixels in with it. See `imageLocation` in storage/stores.
  return imageLocation(imageId);
}

export async function writeImageLocation(imageId: string, location: unknown): Promise<void> {
  const rec = await idbGet('images', imageId);
  const next: Record<string, unknown> = rec ? { ...rec } : { id: imageId };
  const loc = (location || {}) as Record<string, unknown>;
  next.location = { ...loc, version: Number(loc.version || 1), image_id: cleanText(imageId, 80) };
  await idbPut('images', next);
}

/** Location fields for a card response, filling gaps from the card's own meta. */
export async function locationFieldsForCard(imageId: string, meta: unknown = {}): Promise<CardLocationFields> {
  const loc = await readImageLocation(imageId);
  const base = (typeof meta === 'object' && meta ? meta : {}) as Record<string, unknown>;
  let yPercent: unknown = loc.y_percent;
  if (yPercent == null) yPercent = base.y_percent ?? base.anchor_percent ?? base.read_percent;
  const hasLoc = Object.keys(loc).length > 0;
  const storageKey = IMAGE_KEY(cleanText(imageId, 80));
  return {
    character_id: cleanText(loc.character_id || base.character_id || '', 200),
    chat_id: cleanText(loc.chat_id || base.chat_id || '', 200),
    character_name: cleanText(loc.character_name || base.character_name || '', 200),
    chat_name: cleanText(loc.chat_name || base.chat_name || '', 200),
    char_index: toInt(loc.char_index ?? base.char_index, -1),
    chat_index: toInt(loc.chat_index ?? base.chat_index, -1),
    message_index: toInt('message_index' in loc ? loc.message_index : base.message_index, -1),
    message_role: cleanText(loc.message_role || base.message_role || '', 40).toLowerCase(),
    shot_index: toInt(loc.shot_index, -1),
    paragraph: toInt('paragraph' in loc ? loc.paragraph : base.paragraph, 0),
    y_percent: toOptionalFloat(yPercent),
    content_hash: cleanText(loc.content_hash || base.content_hash || '', 128),
    assistant_preview: cleanText(loc.assistant_preview || base.assistant_preview || '', ASSISTANT_PREVIEW_LIMIT),
    unified_session_id: cleanText(loc.unified_session_id || base.unified_session_id || '', 200),
    // UI-compat field: was a sidecar .json path; now an IndexedDB key ref.
    location_file: hasLoc ? `idb:${storageKey}` : '',
    storage: 'indexeddb',
    storage_key: storageKey,
  };
}

/** Merges a card's stored meta with its location into the meta the card row keeps. */
export function cardMetaFromLocation(meta: unknown, location: unknown, pngBytes = 0): Record<string, unknown> {
  const base = (typeof meta === 'object' && meta ? { ...meta } : {}) as Record<string, unknown>;
  const loc = (location || {}) as Record<string, unknown>;
  return {
    ...base,
    character_id: cleanText(loc.character_id || base.character_id || '', 200),
    chat_id: cleanText(loc.chat_id || base.chat_id || '', 200),
    character_name: cleanText(loc.character_name || base.character_name || '', 200),
    chat_name: cleanText(loc.chat_name || base.chat_name || '', 200),
    char_index: toInt(loc.char_index ?? base.char_index, -1),
    chat_index: toInt(loc.chat_index ?? base.chat_index, -1),
    message_index: toInt(loc.message_index ?? base.message_index, -1),
    message_role: cleanText(loc.message_role || base.message_role || '', 40).toLowerCase(),
    content_hash: cleanText(loc.content_hash || base.content_hash || '', 128),
    assistant_preview: cleanText(loc.assistant_preview || base.assistant_preview || '', ASSISTANT_PREVIEW_LIMIT),
    unified_session_id: cleanText(loc.unified_session_id || base.unified_session_id || '', 200),
    y_percent: toOptionalFloat(loc.y_percent ?? base.y_percent),
    storage: 'indexeddb',
    // Empty when the location carries no image_id — 1.x emitted the bare prefix
    // here too, and the explorer treats it as "no blob key" rather than a miss.
    storage_key: IMAGE_KEY(cleanText(loc.image_id || '', 80)),
    png_bytes: Number(pngBytes) || 0,
  };
}
