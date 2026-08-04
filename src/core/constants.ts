/**
 * Frozen identifiers and storage keys.
 *
 * WARNING: every key in this file is load-bearing for existing installs. Risu
 * namespaces plugin storage by the plugin id, and these keys address rows inside
 * that namespace. Renaming any of them orphans user data with no way back.
 */

declare const __PLUGIN_VERSION__: string;

export const VERSION: string = typeof __PLUGIN_VERSION__ === 'string' ? __PLUGIN_VERSION__ : '2.0.13';

/**
 * Bumping this re-seeds the prompt pack over user edits for FORCE_PROMPT_KEYS.
 * Only bump it when a prompt change is mandatory for correctness.
 */
export const PROMPT_PACK = '2026-08-05-base-wear-fixed';

export const PROMPT_KEYS = [
  'author_note', 'tagger', 'format', 'prefill', 'preprocess',
  'preset_1', 'lore_inject', 'char_inject', 'appearance_inject', 'autotag',
] as const;

export type PromptKey = (typeof PROMPT_KEYS)[number];

/** Prompts that must track the shipped pack even if the user edited them. */
export const FORCE_PROMPT_KEYS: readonly PromptKey[] = [
  'tagger', 'format', 'appearance_inject', 'lore_inject', 'autotag',
];

export const GLOBAL_SCOPE = '__global__';

// ── device-store keys (IndexedDB via risuai.getLocalPluginStorage) ──────────
export const SETTINGS_KEY = 'inx_native_settings';
export const STORE_KEY = (name: string): string => `inx_nxstore_${name}`;
export const IMAGE_KEY = (id: string): string => `inx_nximg_${String(id).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
export const REF_IMAGE_KEY = 'inx_nxref_image';
export const VIBE_IMAGE_KEY = 'inx_nxvibe_image';
export const VIBE_DATA_KEY = 'inx_nxvibe_data';

// ── legacy save-file keys (one-time migration source) ──────────────────────
export const LEGACY_SETTINGS_KEY = 'native_settings';
export const LEGACY_STORE_KEY = (name: string): string => `nxstore_${name}`;
export const LEGACY_IMAGE_KEY = (id: string): string => `nximg_${String(id).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
export const LEGACY_REF_IMAGE_KEY = 'nxref_image';

// ── external endpoints ────────────────────────────────────────────────────
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
