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
import { normalizeFocusCharacterMode, normalizeFocusPromptMode, normalizeFocusWeight, normalizeNaturalBaseMode } from '../config/schema';
import { API_URL, IMAGE_KEY, charRefScopeForCharacter } from '../core/constants';
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
import {
  applyFocusOutOfFrame,
  focusIndexesToMeta,
  manualFocusIndexesByGender,
  parseFocusIndexes,
} from '../domain/character/focus';
import { dedupeShotCharacters, resolveCharacter } from '../domain/character/roster';
import {
  characterMaxLimit,
  composeCharacterCaptionTags,
  emphasizePersonTags,
  normalizePersonTagMode,
  personCountTagsForShot,
  stripPersonCountTags,
  appendNoHumansWhenNoCast,
} from '../domain/character/tags';
import { dimsForAspect } from '../domain/nai-meta/aspect.ts';
import { shouldUseNaiCoords, readNaiCoord } from '../domain/nai/coords';
import { speechTagsForShot, stripSpokenBubbleSuppression } from '../domain/nai/speech';
import { tokensForFamily } from '../domain/nai/keys';
import { naiSamplerForFamily, naiStepsForFamily } from '../domain/nai/samplers';
import {
  cardFlagOn,
  characterReferenceCandidates,
  effectiveCharacterReferenceMode,
  pickPresetForFamily,
  resolveShotRoute,
  shouldPrepareSharedVibe,
  type ShotNaiRoute,
} from '../domain/nai/routing';
import { resolveGenerationSeed } from '../domain/prompt/command-rewrite';
import { resolveGenerationCfgParams } from '../domain/style-preset-overrides';
import { prepareDirectorReferenceWebp } from '../core/util/image';
import { generateViaComfy, imageBackendKind } from '../providers/comfy/client';
import { generateT2i } from '../providers/nai/client';
import {
  isNaiV5,
  modelToNaia,
  supportsDirectorReference,
  supportsVibeTransfer,
  type CharacterReference,
  type T2iRequest,
  type VibeReference,
} from '../providers/nai/payload';
import { imageLocation, putImageLocation } from '../storage/stores';
import { getConfig } from './context';
import { loadCurationCatalog } from './curation';
import { ensureCharRefVibeEncoded, ensurePresetVibeEncoded, ensureVibeEncoded, getCharRefImageBytes, getReferenceImageBytes } from './nai-assets';
import { getPrompt } from './settings';

/** NAI width/height: accept any positive size up to 5000 (no 832/1216 portrait ceiling). */
function clampNaiDim(value: unknown, fallback: number): number {
  const n = Number(value);
  const base = Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
  return Math.max(1, Math.min(5000, base));
}

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
  /** Roster id when resolved — used for per-character NAI reference images. */
  id?: string;
  /** Roster scope (`__global__` or chat session id). Required to load a ref. */
  scope?: string;
  /** The tagger's original entry, replayed verbatim when the card is rerolled. */
  raw: ShotCharacter;
}

/** The non-payload half of a plan: what the card row records about the shot. */
export interface GenerationMeta {
  setup: string;
  person: string;
  characters: GenerationCharacter[];
  paragraph: number | undefined;
  /** Tagger shot `focus` (indexes / charN); kept so reroll re-applies out of frame. */
  focus?: unknown;
}

export interface GenerationPlan {
  main: string;
  neg: string;
  captions: NaiCaption[];
  meta: GenerationMeta;
  route: ShotNaiRoute;
  use_coords: boolean;
}

/**
 * The payload half of a plan. `rerollCard`'s prompt-override path builds one of
 * these without ever producing a `GenerationMeta`, so `generateImage` asks for
 * no more than it uses.
 */
export type ImageRequest = Pick<GenerationPlan, 'main' | 'neg' | 'captions'> & {
  /** Optional per-shot canvas override (auto_aspect). */
  width?: number;
  height?: number;
  /**
   * Optional fixed seed (shot-tag 시드고정). When missing/0, falls back to
   * `nai.seed`, then a random seed — same as a normal generation.
   */
  seed?: number;
  /**
   * Shot cast with roster ids. V4.5 attaches every stored character ref;
   * explicit `vibe` selects vibe encoding, otherwise stored images use Precise Reference.
   */
  characters?: Array<{ id?: string; name?: string; scope?: string }>;
  token?: string;
  model?: string;
  preset?: StylePreset | null;
  use_coords?: boolean;
};

export interface GeneratedImage {
  bytes: ArrayBuffer;
  seed: number;
}

export interface ShotArgs {
  shot: TaggedShot;
  roster: CharacterInput[];
  /** Chat this shot belongs to — used when a roster row has no scope. */
  sessionId?: string;
  /** Pins the scene tags so a reroll re-renders only the cast. */
  lockedSetup?: string;
  /** Forced route (quota fallback to V4). */
  route?: ShotNaiRoute;
}

/** Bind a ref to this roster row only — never fall back session ↔ global. */
function charRefScopeForStored(stored: CharacterInput | null, sessionId: string): string | undefined {
  if (!stored) return undefined;
  return charRefScopeForCharacter(stored.scope, '', sessionId) || undefined;
}

export interface LocationArgs {
  imageId: string;
  sessionId: string;
  request: JobRequest;
  shotIndex: number;
  paragraph: unknown;
  yPercent: number | null;
  line?: number | null;
  contentHash?: string;
  /** When set (e.g. inherited after mid-job hash rebind), overrides request.assistant_text. */
  assistantPreview?: string;
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
  line: number | null;
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
  line: number | null;
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
  // Only source of person-count tags: cast count (or solo), optionally wrapped N::…::
  const person = emphasizePersonTags(
    personCountTagsForShot(chars, roster, personMode, null, card.person_tag_solo),
    card.person_tag_weight,
  );
  const [filePos, fileNeg] = extractPreset(await getPrompt('preset_1'));
  const route = args.route || resolveShotRoute(card, nai, shot);
  const active = route.preset as (StylePreset & Record<string, unknown>) | null;
  let stylePos: string;
  let styleNeg: string;
  if (active) {
    stylePos = cleanText(active.positive || active.pos || '');
    styleNeg = cleanText(active.negative || active.neg || '');
  } else {
    stylePos = joinTags(cleanText(card.custom_pos), filePos);
    styleNeg = joinTags(cleanText(card.custom_neg), fileNeg);
  }
  const speechTags = route.useSpeech
    ? speechTagsForShot(shot, chars, (name) => resolveCharacter(name, roster))
    : '';
  if (speechTags) stylePos = stripSpokenBubbleSuppression(stylePos);
  let situation: unknown = shot.situation || shot.scene;
  const lockedSetup = cleanText(args.lockedSetup || '');
  let setup: string;
  if (lockedSetup) {
    setup = lockedSetup;
  } else {
    setup = joinTags(shot.camera, situation, shot.place, shot.action);
    if (card.mode === 'asset') {
      setup = joinTags(setup, 'white background', 'simple background', 'cowboy shot', 'looking at viewer', 'portrait');
    }
  }
  const naturalMode = normalizeNaturalBaseMode(card.natural_base);
  const naturalCap = route.useV5Natural
    ? 600
    : naturalMode === 'supplement' ? 600 : naturalMode === 'detailed' ? 480 : 400;
  // V5 shots always take `natural` (positions). V4 follows the left-hand mode.
  const natural = route.useV5Natural
    ? cleanText(shot.natural || shot.natural_base || shot.nl || '', naturalCap)
    : naturalMode === 'off'
      ? ''
      : cleanText(shot.natural || shot.natural_base || shot.nl || '', naturalCap);
  let fixedPos = '';
  let fixedNeg = '';
  if (cleanText(shot.composition_id, 160) || cleanText(shot.curation_fixed_positive, 200)) {
    try {
      const cat = await loadCurationCatalog();
      fixedPos = cleanText(shot.curation_fixed_positive, 800) || cleanText(cat.fixed_positive, 800);
      fixedNeg = cleanText(cat.fixed_negative, 800);
    } catch {
      fixedPos = cleanText(shot.curation_fixed_positive, 800);
    }
  }
  // Cut foreign person-count tags from body, then prepend our ONE wrapped block.
  // joinTags must not split N::1girl, 1boy:: (see splitTagTokens).
  let body = joinTags(stylePos, speechTags, natural, setup, fixedPos);
  if (personMode !== 'off') {
    body = stripPersonCountTags(body);
    setup = stripPersonCountTags(setup);
  }
  // Card-level fixed prompts always wrap style/scene (after person tags, before quality).
  const lead = cleanText(card.fixed_prompt_prefix, 8000);
  const trail = cleanText(card.fixed_prompt_suffix, 8000);
  body = joinTags(lead, body, trail);
  let main = person ? (body ? `${person}, ${body}` : person) : body;
  const naiaModel = modelToNaia(route.model || nai.model || 'nai-diffusion-4-5-full');
  if (nai.apply_quality_tags !== false) main += QUALITY_TAGS[naiaModel] || '';
  main = appendNoHumansWhenNoCast(main, chars.length, card.no_humans_when_no_char);
  const ucPreset = cleanText(nai.uc_preset) || 'human_focus';
  const neg = joinTags(styleNeg, fixedNeg, (UC_PRESETS[naiaModel] || {})[ucPreset] || '');

  const captions: NaiCaption[] = [];
  const charMeta: GenerationCharacter[] = [];
  for (let idx = 0; idx < chars.length; idx++) {
    const char = chars[idx];
    const name = cleanText(char.name, 200);
    const stored = name ? resolveCharacter(name, roster) : null;
    const prompt = joinTags(composeCharacterCaptionTags(stored, char));
    const uc = cleanText(char.negative);
    const taggedX = readNaiCoord(char.center_x);
    const taggedY = readNaiCoord(char.center_y);
    // Payload still wants a center even when use_coords is off; do not feed
    // these invented values into the use_coords decision.
    const cx = taggedX ?? (n === 1 ? 0.5 : Math.round((0.1 + (0.8 * idx) / Math.max(1, n - 1)) * 10) / 10);
    const cy = taggedY ?? 0.5;
    captions.push({ prompt: prompt || 'girl', uc, center_x: cx, center_y: cy });
    charMeta.push({
      name: stored?.name || name,
      id: cleanText(stored?.id || '', 80) || undefined,
      scope: charRefScopeForStored(stored, args.sessionId || ''),
      prompt,
      uc,
      center_x: cx,
      center_y: cy,
      raw: char,
    });
  }
  const focusMode = normalizeFocusCharacterMode(card.focus_character);
  const focusPrompt = normalizeFocusPromptMode(card.focus_prompt);
  let appliedFocus: unknown = shot.focus;
  if (focusMode !== 'off') {
    let focusIdxs: number[] = [];
    if (focusPrompt === 'manual' && (focusMode === 'female' || focusMode === 'male')) {
      focusIdxs = manualFocusIndexesByGender(chars, roster, focusMode);
      appliedFocus = focusIdxs.length ? focusIndexesToMeta(focusIdxs) : '';
    } else if (focusPrompt !== 'manual') {
      focusIdxs = parseFocusIndexes(shot.focus, chars.length);
    }
    if (focusIdxs.length) {
      const focused = applyFocusOutOfFrame(captions, focusIdxs, normalizeFocusWeight(card.focus_weight));
      for (let i = 0; i < captions.length; i++) {
        captions[i] = focused[i]!;
        charMeta[i] = { ...charMeta[i]!, prompt: focused[i]!.prompt };
      }
    }
  }
  const taggedPairs = chars.map((char) => {
    const x = readNaiCoord(char.center_x);
    const y = readNaiCoord(char.center_y);
    return x != null && y != null ? { x, y } : null;
  });
  const use_coords = shouldUseNaiCoords(cardFlagOn(card.nai_use_coords, true), taggedPairs);
  return {
    main,
    neg,
    captions,
    meta: {
      setup,
      person,
      characters: charMeta,
      paragraph: shot.paragraph,
      focus: appliedFocus,
    },
    route,
    use_coords,
  };
}

/** Runs one generation on the configured backend and returns the bytes and seed. */
export async function generateImage(plan: ImageRequest, shotAspect?: unknown): Promise<GeneratedImage> {
  const nai: NaiSettings = getConfig().nai;
  const autoAspect = Boolean(getConfig().card?.auto_aspect);
  const dims = plan.width && plan.height
    ? { width: clampNaiDim(plan.width, 832), height: clampNaiDim(plan.height, 1216), aspect: 'settings' as const }
    : dimsForAspect(shotAspect, nai, autoAspect);
  // Both providers type their cast as `ShotCharacter`, which requires a `name`;
  // captions carry none and only the four caption fields are ever read.
  const characters = plan.captions as unknown as ShotCharacter[];
  const resolvedSeed = resolveGenerationSeed(plan.seed, nai.seed);
  const routeModelEarly = cleanText(plan.model) || nai.model || 'nai-diffusion-4-5-full';
  const routeFamily = isNaiV5(routeModelEarly) ? 'v5' : 'v4';
  if (imageBackendKind(nai) === 'comfy') {
    const naiSized = {
      ...nai,
      width: dims.width,
      height: dims.height,
      seed: resolvedSeed,
      steps: naiStepsForFamily(nai, routeFamily),
      sampler: naiSamplerForFamily(nai, routeFamily),
    };
    const wantsRef = /\[\[\s*ref\s*\]\]/i.test(String(nai.comfy_workflow_json || ''));
    const refBytes = wantsRef ? await getReferenceImageBytes() : null;
    const [comfyBytes, comfySeed] = await generateViaComfy(
      naiSized,
      plan.main,
      plan.neg,
      characters,
      refBytes,
    );
    return { bytes: comfyBytes, seed: comfySeed };
  }
  const routePreset = plan.preset ?? null;
  const routeModel = routeModelEarly;
  const token = cleanText(plan.token)
    || tokensForFamily(nai, routeFamily)[0]
    || cleanText(nai.api_key);
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
      try {
        characterRefs.push({
          image: await prepareDirectorReferenceWebp(refBytes, 0.5),
          type: refType,
          strength: Math.max(0, Math.min(1, strength)),
          fidelity: Math.max(0, Math.min(1, fidelity)),
        });
      } catch (err) {
        dbg('nai.ref.prepare_fail', { message: String((err as Error)?.message || err) }, 'warn');
      }
    }
  }
  // Active style preset may override CFG; preset vibe image replaces NAI vibe when set.
  const card = getConfig().card;
  const charRefMode = effectiveCharacterReferenceMode(routeModel, card.char_ref_mode);
  const activePreset = (routePreset || pickPresetForFamily(card, routeFamily)) as StylePreset | null;
  const presetId = cleanText(activePreset?.id || card.active_preset_id, 120);
  const cfgParams = resolveGenerationCfgParams(
    {
      ...nai,
      steps: naiStepsForFamily(nai, routeFamily),
      sampler: naiSamplerForFamily(nai, routeFamily),
    },
    activePreset,
  );

  const vibes: VibeReference[] = [];
  let charRefStrength = Number(card.char_ref_strength ?? 0.6);
  let charRefFidelity = Number(card.char_ref_fidelity ?? 1);
  if (Number.isNaN(charRefStrength)) charRefStrength = 0.6;
  if (Number.isNaN(charRefFidelity)) charRefFidelity = 1;
  charRefStrength = Math.max(0.01, Math.min(1, charRefStrength));
  charRefFidelity = Math.max(0.01, Math.min(1, charRefFidelity));
  const cast = charRefMode === 'off'
    ? []
    : characterReferenceCandidates(Array.isArray(plan.characters) ? plan.characters : []);
  if (charRefMode === 'image') {
    for (const { id: cid, scope } of cast) {
      const bytes = await getCharRefImageBytes(scope, cid);
      if (!bytes) continue;
      let refType = cleanText(card.char_ref_image_type || 'character&style') || 'character&style';
      if (!['character', 'style', 'character&style'].includes(refType)) refType = 'character&style';
      try {
        characterRefs.push({
          image: await prepareDirectorReferenceWebp(bytes, 0.5),
          type: refType,
          strength: charRefStrength,
          fidelity: charRefFidelity,
        });
      } catch (err) {
        dbg(
          'nai.char_ref.prepare_fail',
          { message: String((err as Error)?.message || err), character_id: cid, scope },
          'warn',
        );
      }
    }
  }

  // Precise Reference and Vibe Transfer cannot be combined. Decide only after
  // collecting actual refs so an empty automatic-image cast keeps shared vibes.
  if (shouldPrepareSharedVibe(characterRefs.length)) {
    let vibeRow = presetId ? await ensurePresetVibeEncoded(presetId) : null;
    if (!vibeRow) {
      const vibeMode = cleanText(nai.vibe_transfer || 'none').toLowerCase();
      if (!['', 'none', 'off', 'false', '0'].includes(vibeMode)) {
        vibeRow = await ensureVibeEncoded();
      }
    }
    if (vibeRow?.encoded) {
      let strength = Number(nai.vibe_transfer_strength ?? 0.6);
      let ie = Number(nai.vibe_transfer_information_extracted ?? vibeRow.information_extracted ?? 1.0);
      if (Number.isNaN(strength)) strength = 0.6;
      if (Number.isNaN(ie)) ie = 1.0;
      vibes.push({
        encoded: vibeRow.encoded,
        strength: Math.max(0, Math.min(1, strength)),
        information_extracted: Math.max(0, Math.min(1, ie)),
      });
    }
  }

  if (charRefMode === 'vibe' && shouldPrepareSharedVibe(characterRefs.length)) {
    for (const { id: cid, scope } of cast) {
      const row = await ensureCharRefVibeEncoded(scope, cid, charRefFidelity);
      if (!row?.encoded) continue;
      vibes.push({
        encoded: row.encoded,
        strength: charRefStrength,
        information_extracted: charRefFidelity,
      });
    }
  }

  // Official NAI: Precise Reference and Vibe Transfer cannot be combined.
  // Prefer director refs when both would be present (global/preset vibe + image mode).
  if (characterRefs.length && vibes.length) {
    dbg('nai.ref.drop_vibes', {
      message: `Precise Reference ${characterRefs.length}개 — 동시 vibe ${vibes.length}개 제외`,
      focus: true,
    });
    vibes.length = 0;
  }

  const naiModel = modelToNaia(routeModel);
  if (characterRefs.length && !supportsDirectorReference(naiModel)) {
    dbg('nai.ref.drop_director', {
      message: `이 모델은 Precise Reference를 아직 안 받음 · ${characterRefs.length}개 제외`,
      focus: true,
    });
    characterRefs.length = 0;
  }
  if (vibes.length && !supportsVibeTransfer(naiModel)) {
    dbg('nai.ref.drop_vibes', {
      message: `이 모델은 Vibe Transfer를 아직 안 받음 · ${vibes.length}개 제외`,
      focus: true,
    });
    vibes.length = 0;
  }

  const req: T2iRequest = {
    prompt: plan.main,
    negative_prompt: plan.neg,
    width: dims.width,
    height: dims.height,
    seed: resolvedSeed,
    steps: cfgParams.steps,
    cfg_scale: cfgParams.cfg_scale,
    cfg_rescale: cfgParams.cfg_rescale,
    sampler: cfgParams.sampler,
    scheduler: cfgParams.scheduler,
    model: naiModel,
    use_coords: Boolean(plan.use_coords),
    var_plus: Boolean(nai.variety_plus),
    characters,
    character_refs: characterRefs,
    vibes,
  };
  dbg('nai.generate.dims', {
    message: `${req.width}x${req.height}`,
    aspect: dims.aspect,
    auto_aspect: autoAspect,
    steps: req.steps,
    focus: true,
  });
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
  line = null,
  contentHash = '',
  assistantPreview = '',
}: LocationArgs): ImageLocation {
  const lineN = Math.floor(Number(line));
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
    line: Number.isFinite(lineN) && lineN >= 1 ? lineN : null,
    content_hash: cleanText(contentHash || request.content_hash || '', 128),
    assistant_preview: cleanText(assistantPreview || request.assistant_text || '', ASSISTANT_PREVIEW_LIMIT),
  };
}

export async function readImageLocation(imageId: string): Promise<Record<string, unknown>> {
  // Metadata-only: this runs once per row when a gallery is listed, so it must not
  // pull the pixels in with it. See `imageLocation` in storage/stores.
  return imageLocation(imageId);
}

export async function writeImageLocation(imageId: string, location: unknown): Promise<void> {
  const loc = (location || {}) as Record<string, unknown>;
  await putImageLocation(cleanText(imageId, 80), {
    ...loc,
    version: Number(loc.version || 1),
    image_id: cleanText(imageId, 80),
  });
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
    line: (() => {
      const n = Math.floor(Number(loc.line ?? base.line));
      return Number.isFinite(n) && n >= 1 ? n : null;
    })(),
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
    line: (() => {
      const n = Math.floor(Number(loc.line ?? base.line));
      return Number.isFinite(n) && n >= 1 ? n : null;
    })(),
    storage: 'indexeddb',
    // Empty when the location carries no image_id — 1.x emitted the bare prefix
    // here too, and the explorer treats it as "no blob key" rather than a miss.
    storage_key: IMAGE_KEY(cleanText(loc.image_id || '', 80)),
    png_bytes: Number(pngBytes) || 0,
  };
}
