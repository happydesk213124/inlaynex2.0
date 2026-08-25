/** Settings migration + export/import. Pure: no storage, no I/O. */

import type { FocusCharacterMode, FocusPromptMode } from '../core/types.ts';
import { parseStreamKeywords } from '../domain/prompt/stream-keywords.ts';
import { normalizeLlmRolesSettings } from '../domain/llm/roles.ts';
import { naiStepsForFamily, normalizeNaiSampler, optionalNaiSampler } from '../domain/nai/samplers.ts';

/** NovelAI base natural-language mode (replaces the old boolean toggle). */
export type NaturalBaseMode = 'off' | 'short' | 'detailed' | 'supplement';

export type { FocusCharacterMode, FocusPromptMode };

const FOCUS_CHARACTER_MODES = new Set<FocusCharacterMode>(['off', 'female', 'male', 'auto']);
const FOCUS_PROMPT_MODES = new Set<FocusPromptMode>(['default', 'strong', 'always', 'manual']);

/** Clamp card.focus_weight to 0–5, one decimal (missing/NaN → 2). */
export function normalizeFocusWeight(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 2;
  return Math.max(0, Math.min(5, Math.round(n * 10) / 10));
}

/** Normalize `card.focus_prompt`. Missing/unknown → `default`. */
export function normalizeFocusPromptMode(value: unknown): FocusPromptMode {
  const s = String(value ?? '').toLowerCase().trim();
  if (s === 'stronger' || s === 'hard' || s === 'push') return 'strong';
  if (s === 'force' || s === 'forced' || s === 'must' || s === 'required') return 'always';
  if (s === 'code' || s === 'gender' || s === 'auto_gender') return 'manual';
  if (FOCUS_PROMPT_MODES.has(s as FocusPromptMode)) return s as FocusPromptMode;
  return 'default';
}

/** Normalize `card.focus_character`. Missing/unknown → `off`. */
export function normalizeFocusCharacterMode(value: unknown): FocusCharacterMode {
  if (value === false || value === 'false' || value === 0 || value === '0' || value === 'none') return 'off';
  if (value === true || value === 'true' || value === 1 || value === '1' || value === 'on') return 'auto';
  const s = String(value ?? '').toLowerCase().trim();
  if (s === 'woman' || s === 'women' || s === 'girl' || s === 'girls') return 'female';
  if (s === 'man' || s === 'men' || s === 'boy' || s === 'boys') return 'male';
  if (s === 'llm' || s === 'any' || s === 'free') return 'auto';
  if (FOCUS_CHARACTER_MODES.has(s as FocusCharacterMode)) return s as FocusCharacterMode;
  return 'off';
}

/** Settings-tab curation pipeline mode. */
export type CurationMode = 'off' | 'two_stage' | 'embed_snap';

/** How matched Risu asset NAI tags are fed to the tagger. */
export type AssetNaiTagsMode = 'off' | 'inline' | 'prepass';

const NATURAL_BASE_MODES = new Set<NaturalBaseMode>(['off', 'short', 'detailed', 'supplement']);
const CURATION_MODES = new Set<CurationMode>(['off', 'two_stage', 'embed_snap']);
const ASSET_NAI_TAGS_MODES = new Set<AssetNaiTagsMode>(['off', 'inline', 'prepass']);

/**
 * 2단 / 임베딩식 are still being fixed. Keep the enum so the UI can show
 * the buttons disabled; live generation and saved settings stay `off`.
 * Flip this when those modes ship again.
 */
export const CURATION_PIPELINE_LOCKED = true;

/** Clamp card.person_tag_weight to 0–5 (missing/NaN → 3). */
export function normalizePersonTagWeight(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 3;
  return Math.max(0, Math.min(5, Math.round(n)));
}

/**
 * Normalize `card.asset_nai_tags` from legacy booleans / unknown strings.
 * Legacy true / `prepass_vision` → `prepass` (vision-on-looks-LLM was removed).
 */
export function normalizeAssetNaiTagsMode(value: unknown): AssetNaiTagsMode {
  if (value === true || value === 'true' || value === 1 || value === '1' || value === 'on') {
    return 'prepass';
  }
  if (
    value === false
    || value === 'false'
    || value === 0
    || value === '0'
    || value === 'off'
    || value === 'none'
    || value == null
    || value === ''
  ) {
    return 'off';
  }
  const s = String(value).toLowerCase().trim();
  if (s === 'legacy' || s === 'together' || s === 'single') return 'inline';
  if (s === 'split' || s === 'looks') return 'prepass';
  if (s === 'vision' || s === 'split_vision' || s === 'prepass+vision' || s === 'prepass_vision') return 'prepass';
  if (ASSET_NAI_TAGS_MODES.has(s as AssetNaiTagsMode)) return s as AssetNaiTagsMode;
  return 'off';
}

/**
 * Normalize `curation.mode` from legacy card.composition_curation / unknown strings.
 * Missing → `off`. Legacy true/`full` → `two_stage` (then locked to `off`
 * while `CURATION_PIPELINE_LOCKED` is set, so an old save cannot keep running).
 */
export function normalizeCurationMode(value: unknown): CurationMode {
  let mode: CurationMode = 'off';
  if (value === true || value === 'true' || value === 1 || value === '1' || value === 'on' || value === 'full') {
    mode = 'two_stage';
  } else if (value === false || value === 'false' || value === 0 || value === '0' || value === 'none') {
    mode = 'off';
  } else if (typeof value === 'string' && CURATION_MODES.has(value as CurationMode)) {
    mode = value as CurationMode;
  }
  return CURATION_PIPELINE_LOCKED ? 'off' : mode;
}

/** Clamp `curation.strict_ids` to a boolean. Missing/unknown → false. */
export function normalizeCurationStrictIds(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1' || value === 'on';
}

export type MessageSelectGesture = 'single' | 'double' | 'context' | 'longpress';

/** Normalize `card.message_select_gesture`. Missing/unknown → `single`. */
export function normalizeMessageSelectGesture(value: unknown): MessageSelectGesture {
  const v = String(value ?? '').toLowerCase().trim();
  if (v === 'double' || v === 'dbl' || v === '2' || v === 'dblclick') return 'double';
  if (v === 'context' || v === 'right' || v === 'contextmenu' || v === 'rightclick') return 'context';
  if (v === 'longpress' || v === 'long' || v === 'press' || v === 'hold') return 'longpress';
  return 'single';
}

/**
 * Normalize `card.natural_base` from legacy booleans / unknown strings.
 * Missing or unknown → `short` (matches the old default of `true`).
 */
export function normalizeNaturalBaseMode(value: unknown): NaturalBaseMode {
  if (value === false || value === 'false' || value === 'off' || value === 'none') return 'off';
  if (value === true || value === 'true' || value === 'on') return 'short';
  if (value === 'detailed' || value === 'detail') return 'detailed';
  if (value === 'supplement' || value === 'supp') return 'supplement';
  if (typeof value === 'string' && NATURAL_BASE_MODES.has(value as NaturalBaseMode)) {
    return value as NaturalBaseMode;
  }
  return 'short';
}

/** What `migrateSettings` guarantees on the way out — everything else stays as found. */
export interface MigratedSettings {
  card: Record<string, unknown>;
  settings_schema_version: number;
  [key: string]: unknown;
}

/**
 * JSON round trip on purpose: it drops functions, symbols and `undefined`, which
 * is what keeps a live settings object safe to hand to `JSON.stringify` later.
 */
const jsonClone = <T>(value: T): T => JSON.parse(JSON.stringify(value ?? {})) as T;

/**
 * Keys dropped from an exported settings file, compared lowercase so `API_KEY`
 * is caught too.
 *
 * Note that `service_account_json` is deliberately NOT in this set, matching the
 * deployed behaviour: exports are also how users move settings between devices,
 * and dropping the Vertex credential would silently break Vertex on the target
 * machine. It does mean an exported file can carry a Google service-account
 * private key, so treat exports as secrets.
 */
const SECRET_KEYS = new Set(['api_key', 'api_keys_v5', 'api_keys_v4', 'auth_token', 'password', 'secret']);

function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (!value || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [name, child] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEYS.has(name.toLowerCase())) continue;
    out[name] = redactSecrets(child);
  }
  return out;
}

/** Bring any stored settings blob up to the current schema (clone in, clone out). */
export function migrateSettings(input: unknown = {}): MigratedSettings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Settings must be an object');
  const settings = jsonClone(input) as Record<string, unknown>;
  const card = settings.card && typeof settings.card === 'object' && !Array.isArray(settings.card)
    ? settings.card as Record<string, unknown>
    : {};
  settings.card = card;
  if (Number(card.scale_semantics_version || 0) < 2) {
    const legacy = Number(card.inline_thumb_pct);
    // 0% is valid (hide always-image by size); only coerce non-finite → 100.
    card.inline_thumb_pct = Number.isFinite(legacy) ? Math.max(0, legacy / 6) : 100;
    card.scale_semantics_version = 2;
  }
  // Sticky pin: prefer stored %; mark unit/origin so clients and future merges stay consistent.
  const hasPinPct =
    Number.isFinite(Number(card.overlay_x_pct)) ||
    Number.isFinite(Number(card.overlay_y_pct));
  if (hasPinPct || card.overlay_pin_unit === 'pct') {
    card.overlay_pin_unit = 'pct';
    const origin = String(card.overlay_pin_origin || '');
    if (!origin || origin === 'bottom-left') card.overlay_pin_origin = 'bl';
  }
  // lore_extra: boolean → "tags" | "full" | "off"
  const loreExtra = card.lore_extra;
  if (loreExtra === true || loreExtra === 'true' || loreExtra === 'sections') card.lore_extra = 'tags';
  else if (loreExtra === false || loreExtra === 'false' || loreExtra === 'none') card.lore_extra = 'off';
  else if (loreExtra === 'full' || loreExtra === 'tags' || loreExtra === 'off') card.lore_extra = loreExtra;
  else card.lore_extra = 'tags';
  // asset_nai_tags: off | inline | prepass (legacy bool / prepass_vision → prepass)
  card.asset_nai_tags = normalizeAssetNaiTagsMode(card.asset_nai_tags);
  card.auto_aspect = card.auto_aspect === true || card.auto_aspect === 'true' || card.auto_aspect === 1 || card.auto_aspect === '1';
  card.llm_json_retry =
    card.llm_json_retry === true
    || card.llm_json_retry === 'true'
    || card.llm_json_retry === 1
    || card.llm_json_retry === '1'
    || card.llm_json_retry === 'on';
  // natural_base: legacy boolean → "off" | "short" | "detailed" | "supplement"
  card.natural_base = normalizeNaturalBaseMode(card.natural_base);
  // person_tag_solo: one-character shots use `solo` instead of 1girl/1boy
  card.person_tag_solo =
    card.person_tag_solo === true
    || card.person_tag_solo === 'true'
    || card.person_tag_solo === 1
    || card.person_tag_solo === '1'
    || card.person_tag_solo === 'on';
  card.no_humans_when_no_char =
    card.no_humans_when_no_char === true
    || card.no_humans_when_no_char === 'true'
    || card.no_humans_when_no_char === 1
    || card.no_humans_when_no_char === '1'
    || card.no_humans_when_no_char === 'on';
  // person_tag_weight: NAI emphasis on Inlay person-count tags (0 = plain, 1–5 = N::…::)
  card.person_tag_weight = normalizePersonTagWeight(card.person_tag_weight);
  card.message_select_gesture = normalizeMessageSelectGesture(card.message_select_gesture);
  // costume: main-tagger catalog inject (char_looks always builds costumes[])
  card.costume =
    card.costume === true
    || card.costume === 'true'
    || card.costume === 1
    || card.costume === '1'
    || card.costume === 'on';
  card.focus_character = normalizeFocusCharacterMode(card.focus_character);
  card.focus_weight = normalizeFocusWeight(card.focus_weight);
  card.focus_prompt = normalizeFocusPromptMode(card.focus_prompt);
  // curation.mode: off | two_stage | embed_snap. Legacy composition_curation
  // used to become two_stage; while the pipeline is locked, that also becomes off.
  const curationRaw =
    settings.curation && typeof settings.curation === 'object' && !Array.isArray(settings.curation)
      ? { ...(settings.curation as Record<string, unknown>) }
      : {};
  const legacyOn =
    card.composition_curation === true
    || card.composition_curation === 'true'
    || card.composition_curation === 1
    || card.composition_curation === '1'
    || card.composition_curation === 'on';
  if (curationRaw.mode == null && legacyOn) curationRaw.mode = 'two_stage';
  curationRaw.mode = normalizeCurationMode(curationRaw.mode);
  // strict_ids: two_stage assembles ONLY from catalog option ids (no freeform
  // camera/situation/natural/action fallback). Meaningless outside two_stage,
  // but stored as-is so re-enabling two_stage remembers the last choice.
  curationRaw.strict_ids = normalizeCurationStrictIds(curationRaw.strict_ids);
  const embRaw =
    curationRaw.embedding && typeof curationRaw.embedding === 'object' && !Array.isArray(curationRaw.embedding)
      ? { ...(curationRaw.embedding as Record<string, unknown>) }
      : {};
  if (!embRaw.provider) embRaw.provider = 'openai';
  if (!embRaw.model) embRaw.model = 'text-embedding-3-small';
  if (!embRaw.endpoint) embRaw.endpoint = 'https://api.openai.com/v1/embeddings';
  if (embRaw.api_key == null) embRaw.api_key = '';
  curationRaw.embedding = embRaw;
  settings.curation = curationRaw;
  card.composition_curation = false;
  // llm_roles: autotag / asset_char / curator — missing → follow_main true
  settings.llm_roles = normalizeLlmRolesSettings(settings.llm_roles);
  // Left-line overlay + always-on image are one feature: overlay_markers is canonical.
  const overlayOn = card.overlay_markers !== false;
  card.overlay_markers = overlayOn;
  card.inline_previews = overlayOn;
  if (card.inline_chat_images == null) card.inline_chat_images = false;
  else card.inline_chat_images = card.inline_chat_images === true || card.inline_chat_images === 'true' || card.inline_chat_images === 1 || card.inline_chat_images === '1';
  if (card.inline_msg_actions == null) card.inline_msg_actions = false;
  else card.inline_msg_actions = card.inline_msg_actions === true || card.inline_msg_actions === 'true' || card.inline_msg_actions === 1 || card.inline_msg_actions === '1';
  {
    const raw = Number(card.inline_chat_scale_pct);
    card.inline_chat_scale_pct = Number.isFinite(raw) && raw > 0
      ? Math.max(25, Math.min(200, Math.round(raw)))
      : 100;
  }
  if (card.progress_toast == null) card.progress_toast = false;
  else card.progress_toast = card.progress_toast === true || card.progress_toast === 'true' || card.progress_toast === 1 || card.progress_toast === '1';
  {
    const mode = String(card.char_ref_mode || 'off').toLowerCase();
    card.char_ref_mode = mode === 'vibe' || mode === 'image' ? mode : 'off';
    const clamp01 = (raw: unknown, fallback: number) => {
      const n = Number(raw);
      if (!Number.isFinite(n)) return fallback;
      return Math.max(0.01, Math.min(1, n));
    };
    card.char_ref_strength = clamp01(card.char_ref_strength, 0.6);
    card.char_ref_fidelity = clamp01(card.char_ref_fidelity, 1);
    {
      const t = String(card.char_ref_image_type || 'character&style').toLowerCase();
      card.char_ref_image_type =
        t === 'character' || t === 'style' || t === 'character&style' ? t : 'character&style';
    }
  }
  card.unified_winners_only =
    card.unified_winners_only === true
    || card.unified_winners_only === 'true'
    || card.unified_winners_only === 1
    || card.unified_winners_only === '1'
    || card.unified_winners_only === 'on';
  card.stream_keywords = String(card.stream_keywords ?? '').slice(0, 4000);
  if (Object.prototype.hasOwnProperty.call(card, 'stream_keywords_enabled')) {
    card.stream_keywords_enabled =
      card.stream_keywords_enabled === true
      || card.stream_keywords_enabled === 'true'
      || card.stream_keywords_enabled === 1
      || card.stream_keywords_enabled === '1'
      || card.stream_keywords_enabled === 'on';
  } else {
    // Pre-toggle saves: non-empty usable needles meant on.
    card.stream_keywords_enabled = parseStreamKeywords(card.stream_keywords).length > 0;
  }
  // Always-on fixed prompt wrappers (empty = unused). Cap keeps settings JSON lean.
  card.fixed_prompt_prefix = String(card.fixed_prompt_prefix ?? '').trim().slice(0, 8000);
  card.fixed_prompt_suffix = String(card.fixed_prompt_suffix ?? '').trim().slice(0, 8000);
  card.secondary_preset_id = String(card.secondary_preset_id ?? '').trim().slice(0, 120);
  const flagOn = (raw: unknown, fallback: boolean): boolean => {
    if (raw == null || raw === '') return fallback;
    return raw === true || raw === 'true' || raw === 1 || raw === '1' || raw === 'on';
  };
  card.nai5_first = flagOn(card.nai5_first, false);
  card.nai5_only = flagOn(card.nai5_only, false);
  card.nai4_fallback = flagOn(card.nai4_fallback, false);
  card.nai5_speech = flagOn(card.nai5_speech, false);
  {
    const lang = String(card.v5_natural_lang || 'en').toLowerCase().trim();
    card.v5_natural_lang = lang === 'ja' || lang === 'jp' || lang === 'japanese' ? 'ja' : 'en';
  }
  // Missing → on (new toggle; no legacy off).
  card.nai_use_coords = card.nai_use_coords == null || card.nai_use_coords === ''
    ? true
    : flagOn(card.nai_use_coords, true);
  if (Array.isArray(card.presets)) {
    for (const raw of card.presets) {
      if (!raw || typeof raw !== 'object') continue;
      const p = raw as Record<string, unknown>;
      const fam = String(p.model_family || '').toLowerCase();
      p.model_family = fam === 'v5' || fam === '5' || fam === 'nai5' ? 'v5' : 'v4';
      const optNum = (v: unknown): number | null => {
        if (v == null || v === '') return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
      if ('steps' in p) p.steps = optNum(p.steps);
      if ('sampler' in p) p.sampler = optionalNaiSampler(p.sampler);
      if ('scheduler' in p) {
        const s = String(p.scheduler || '').trim();
        p.scheduler = s || null;
      }
    }
  }
  {
    const nai = settings.nai && typeof settings.nai === 'object' && !Array.isArray(settings.nai)
      ? settings.nai as Record<string, unknown>
      : {};
    settings.nai = nai;
    const list = (raw: unknown): string[] => {
      if (!Array.isArray(raw)) return [];
      const seen = new Set<string>();
      const out: string[] = [];
      for (const item of raw) {
        const t = String(item || '').trim();
        if (!t || seen.has(t)) continue;
        seen.add(t);
        out.push(t);
      }
      return out;
    };
    nai.api_keys_v5 = list(nai.api_keys_v5);
    nai.api_keys_v4 = list(nai.api_keys_v4);
    const sharedSteps = naiStepsForFamily({ steps: nai.steps }, 'v4');
    const sharedSampler = normalizeNaiSampler(nai.sampler);
    nai.sampler = sharedSampler;
    nai.sampler_v5 = normalizeNaiSampler(nai.sampler_v5 || sharedSampler);
    nai.sampler_v4 = normalizeNaiSampler(nai.sampler_v4 || sharedSampler);
    nai.steps = sharedSteps;
    nai.steps_v5 = nai.steps_v5 == null || nai.steps_v5 === ''
      ? sharedSteps
      : naiStepsForFamily({ steps_v5: nai.steps_v5, steps: sharedSteps }, 'v5');
    nai.steps_v4 = nai.steps_v4 == null || nai.steps_v4 === ''
      ? sharedSteps
      : naiStepsForFamily({ steps_v4: nai.steps_v4, steps: sharedSteps }, 'v4');
  }
  // sticky_layout_v2 was a temporary toggle; v2 is always-on — drop leftover saves.
  if (card && typeof card === 'object' && 'sticky_layout_v2' in card) delete card.sticky_layout_v2;
  {
    const mm = String(card.viewer_minimize_mode || 'icon');
    card.viewer_minimize_mode = mm === 'toolbar' || mm === 'actions' ? mm : 'icon';
  }
  settings.settings_schema_version = 2;
  return settings as MigratedSettings;
}

/** Migrated settings as pretty JSON, minus `SECRET_KEYS` — read its note first. */
export function exportSettings(input: unknown): string {
  return JSON.stringify(redactSecrets(migrateSettings(input)), null, 2);
}

/** Parse and migrate a settings JSON document, rejecting anything that is not an object. */
export function importSettings(text: unknown): MigratedSettings {
  if (typeof text !== 'string') throw new TypeError('Settings JSON must be text');
  if (text.length > 2_000_000) throw new RangeError('Settings JSON is too large');
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new TypeError('Settings JSON must contain an object');
  return migrateSettings(parsed);
}
