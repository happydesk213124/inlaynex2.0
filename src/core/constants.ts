/**
 * Frozen identifiers and storage keys.
 *
 * WARNING: every key in this file is load-bearing for existing installs. Risu
 * namespaces plugin storage by the plugin id, and these keys address rows inside
 * that namespace. Renaming any of them orphans user data with no way back.
 */

declare const __PLUGIN_VERSION__: string;

export const VERSION: string = typeof __PLUGIN_VERSION__ === 'string' ? __PLUGIN_VERSION__ : '2.3.64';

/**
 * Bumping this re-seeds the prompt pack over user edits for FORCE_PROMPT_KEYS.
 * Only bump it when a prompt change is mandatory for correctness.
 */
export const PROMPT_PACK = '2026-08-07-command-reroll';

export const PROMPT_KEYS = [
  'author_note', 'asset_author_note', 'tagger', 'format', 'prefill', 'preprocess',
  'preset_1', 'lore_inject', 'char_inject', 'appearance_inject', 'asset_tags_inject', 'char_looks', 'autotag',
  'curation_refine', 'curation_embed_hint', 'command_reroll', 'lorefilter_scan',
] as const;

export type PromptKey = (typeof PROMPT_KEYS)[number];

/** Prompts that must track the shipped pack even if the user edited them. */
export const FORCE_PROMPT_KEYS: readonly PromptKey[] = [
  'tagger', 'format', 'appearance_inject', 'lore_inject', 'asset_tags_inject', 'char_looks', 'autotag',
  'curation_refine', 'curation_embed_hint', 'command_reroll',
];

export const GLOBAL_SCOPE = '__global__';

// --- device-store keys (IndexedDB via risuai.getLocalPluginStorage) ---
// Settings also mirror to risuai.pluginStorage (account save). Images do not.
export const SETTINGS_KEY = 'inx_native_settings';
export const STORE_KEY = (name: string): string => `inx_nxstore_${name}`;
export const IMAGE_KEY = (id: string): string => `inx_nximg_${String(id).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
export const REF_IMAGE_KEY = 'inx_nxref_image';
export const VIBE_IMAGE_KEY = 'inx_nxvibe_image';
export const VIBE_DATA_KEY = 'inx_nxvibe_data';
/** User/default curation catalog JSON (device-local). */
export const CURATION_CATALOG_KEY = 'inx_nx_curation_catalog';
/** Precomputed embedding vectors for the curation catalog. */
export const CURATION_EMBEDDINGS_KEY = 'inx_nx_curation_embeddings';
/** Per-style-preset vibe PNG (device store). */
export const VIBE_PRESET_IMAGE_KEY = (presetId: string): string =>
  `inx_nxvibe_p_${String(presetId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)}`;
/** Per-style-preset vibe encode sidecar. */
export const VIBE_PRESET_DATA_KEY = (presetId: string): string =>
  `inx_nxvibe_pd_${String(presetId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)}`;
/** Meta row key for a preset's vibe blob. */
export const vibePresetMetaKey = (presetId: string): string => `vibe_preset_${String(presetId)}`;
export const isVibePresetMetaKey = (key: unknown): boolean =>
  typeof key === 'string' && key.startsWith('vibe_preset_');
export const presetIdFromVibeMetaKey = (key: string): string => key.slice('vibe_preset_'.length);

/** Per-character reference image (webp/png/jpeg bytes as-is ??no re-encode). */
export const charRefMetaKey = (characterId: string): string => `char_ref_${String(characterId)}`;
export const isCharRefMetaKey = (key: unknown): boolean =>
  typeof key === 'string' && key.startsWith('char_ref_');
export const characterIdFromCharRefMetaKey = (key: string): string => key.slice('char_ref_'.length);
/** Per-character reference PNG/webp (device store) ??same durability pattern as vibe. */
export const CHAR_REF_IMAGE_KEY = (characterId: string): string =>
  `inx_nxcref_${String(characterId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)}`;
/** Per-character vibe encode sidecar for char refs. */
export const CHAR_REF_DATA_KEY = (characterId: string): string =>
  `inx_nxcrefd_${String(characterId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)}`;

// --- legacy save-file keys (one-time migration source) ---
export const LEGACY_SETTINGS_KEY = 'native_settings';
export const LEGACY_STORE_KEY = (name: string): string => `nxstore_${name}`;
export const LEGACY_IMAGE_KEY = (id: string): string => `nximg_${String(id).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
export const LEGACY_REF_IMAGE_KEY = 'nxref_image';

// --- external endpoints ---
export const API_URL = 'https://image.novelai.net/ai/generate-image';
export const ENCODE_URL = 'https://image.novelai.net/ai/encode-vibe';
export const ANLAS_URL = 'https://api.novelai.net/user/subscription';

export const STORE_NAMES = ['meta', 'cards', 'characters', 'jobs', 'images'] as const;
export type StoreName = (typeof STORE_NAMES)[number];

export const DEBUG_MAX = 240;

/**
 * How much assistant text a card stores for display and for message rematching.
 * Long enough that the prefix-similarity matcher stays reliable, short enough
 * that a folder of cards does not carry a copy of the whole chat.
 */
export const ASSISTANT_PREVIEW_LIMIT = 4000;
