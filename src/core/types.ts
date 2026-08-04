/**
 * Shared data shapes.
 *
 * These describe what is *persisted* and what crosses the UI boundary, so they
 * double as documentation for `docs/UI-CONTRACT.md`. Fields are intentionally
 * permissive (`?`, `unknown`) where 1.x was permissive — tightening them would
 * reject data that real installs already contain.
 */

// ── settings ──────────────────────────────────────────────────────────────

export type ExecuteMode = 'auto' | 'manual';
export type CardMode = 'illustration' | 'asset';
export type PersonTagMode = 'gender' | 'girls' | 'people' | 'off';
export type LoreExtraMode = 'tags' | 'full' | 'off';
export type LlmSource = 'custom' | 'main' | 'aux';
export type ImageBackend = 'nai' | 'comfy';

export interface StylePreset {
  id: string;
  name: string;
  positive: string;
  negative: string;
  /** Empty / null → use NAI model-settings cfg_scale. */
  cfg_scale?: number | null;
  /** Empty / null → use NAI model-settings cfg_rescale. */
  cfg_rescale?: number | null;
  /**
   * Ephemeral / UI: true when this preset has its own vibe image on device.
   * Not a mode select — upload/clear only. Missing → fall back to NAI vibe.
   */
  vibe_configured?: boolean;
  /** Ephemeral preview data URL for the card-settings UI. */
  vibe_preview_url?: string;
}

/** Everything under `settings.card` — mostly UI behaviour plus prompt assembly. */
export interface CardSettings {
  power: boolean;
  execute: ExecuteMode;
  mode: CardMode;
  image_min: number;
  image_max: number;
  character_max: number;
  include_min: number;
  include_max: number;
  preset: number;
  lorebook: boolean;
  lore_extra: LoreExtraMode;
  char_info: boolean;
  user_info: boolean;
  char_appearance: boolean;
  preprocessing: boolean;
  person_tag_mode: PersonTagMode;
  auto_person_tags: boolean;
  original_text: string;
  custom_pos: string;
  custom_neg: string;
  presets: StylePreset[];
  active_preset_id: string;
  userchat: boolean;
  unified_chat_priority: boolean;
  generate_all_roles: boolean;
  auto_gen_on_reply: boolean;
  [key: string]: unknown;
}

export interface LlmSettings {
  source: LlmSource;
  provider: string;
  endpoint: string;
  model: string;
  api_key: string;
  service_account_json: string;
  temperature: number;
  max_tokens: number;
  timeout_seconds: number;
  reasoning_effort: string;
  vertex_region: string;
  anthropic_version: string;
  [key: string]: unknown;
}

export interface NaiSettings {
  provider: string;
  backend: ImageBackend;
  request_url: string;
  api_key: string;
  model: string;
  width: number;
  height: number;
  sampler: string;
  scheduler: string;
  steps: number;
  cfg_scale: number;
  cfg_rescale: number;
  seed: number;
  variety_plus: boolean;
  enable_i2i: boolean;
  image_reference: string;
  image_reference_strength: number;
  image_reference_fidelity: number;
  image_reference_type: string;
  vibe_transfer: string;
  vibe_transfer_strength: number;
  vibe_transfer_information_extracted: number;
  uc_preset: string;
  apply_quality_tags: boolean;
  comfy_url: string;
  comfy_workflow_json: string;
  backend_timeout_seconds: number;
  [key: string]: unknown;
}

export interface Settings {
  auth_token: string;
  card: CardSettings;
  llm: LlmSettings;
  nai: NaiSettings;
  /** Legacy Python-era fields the UI still displays. */
  database_path: string;
  images_dir: string;
  prompts_dir: string;
  storage: Record<string, unknown>;
  [key: string]: unknown;
}

// ── characters ────────────────────────────────────────────────────────────

/** `"__global__"` or a session id. */
export type Scope = string;

export interface CharacterRecord {
  id: string;
  name: string;
  original: string;
  aliases: string[];
  surname: string;
  given_name: string;
  surname_variants: string[];
  given_name_variants: string[];
  appearance: string;
  attire: string;
  accessories: string;
  attire_locked?: boolean;
  accessories_locked?: boolean;
  priority?: number;
  scope?: Scope;
  schema_version?: number;
  /** Convenience field the UI reads: original + appearance + attire + accessories. */
  tags?: string;
  [key: string]: unknown;
}

// ── cards / images ────────────────────────────────────────────────────────

export interface ShotCharacter {
  name: string;
  prompt?: string;
  uc?: string;
  action?: string;
  expression?: string;
  appearance?: string;
  attire?: string;
  accessories?: string;
  sex?: string;
  center_x?: number;
  center_y?: number;
  [key: string]: unknown;
}

/** One generated image plus its placement and prompt metadata. */
export interface CardRow {
  id: string;
  job_id: string;
  session_id: string;
  folder_key?: string;
  shot_index: number;
  paragraph: number;
  y_percent: number;
  message_index: number;
  message_role?: string;
  content_hash: string;
  character_id?: string;
  character_name?: string;
  chat_id?: string;
  chat_name?: string;
  char_index?: number;
  chat_index?: number;
  assistant_preview?: string;
  main_prompt: string;
  negative_prompt: string;
  characters: ShotCharacter[];
  /** Serialised columns kept for on-disk compatibility with 1.x rows. */
  characters_json?: string;
  meta_json?: string;
  image_url?: string;
  created_at?: number;
  [key: string]: unknown;
}

export interface ImageRow {
  id: string;
  mime: string;
  bytes: number;
  location_file?: string;
  location?: Record<string, unknown>;
  created_at?: number;
  [key: string]: unknown;
}

// ── meta ──────────────────────────────────────────────────────────────────

/**
 * Singleton rows keyed by name rather than id. `reference_image` and
 * `vibe_transfer` keep their PNG bytes in dedicated storage keys, so the row
 * itself carries the decoded buffer plus whatever fields that key needs.
 */
export interface MetaRow {
  key: string;
  png?: ArrayBuffer | null;
  encoded?: string;
  model?: string;
  information_extracted?: number;
  updated_at?: number;
  [key: string]: unknown;
}

/** The five row stores, in the order they are loaded at boot. */
export type StoreName = 'meta' | 'cards' | 'characters' | 'jobs' | 'images';

// ── jobs ──────────────────────────────────────────────────────────────────

export type JobState = 'queued' | 'tagging' | 'generating' | 'done' | 'cancelled' | 'error';

export interface JobRequest {
  session_id: string;
  character_id?: string;
  character_name?: string;
  chat_id?: string;
  chat_name?: string;
  unified_session_id?: string;
  source_session_ids?: string[];
  char_index?: number;
  chat_index?: number;
  assistant_text?: string;
  message_index?: number;
  message_role?: string;
  content_hash?: string;
  recent_messages?: Array<{ role: string; content: string }>;
  lorebook?: LoreEntry[];
  lore_trigger_keys?: string[];
  character_description?: string;
  persona_description?: string;
  force?: boolean;
  [key: string]: unknown;
}

export interface JobRow {
  id: string;
  state: JobState;
  request_json?: string;
  result_json?: string;
  error?: string;
  progress?: Record<string, unknown>;
  created_at?: number;
  [key: string]: unknown;
}

// ── lorebook ──────────────────────────────────────────────────────────────

export interface LoreEntry {
  comment?: string;
  content?: string;
  key?: string | string[];
  keys?: string | string[];
  always?: boolean;
  alwaysActive?: boolean;
  [key: string]: unknown;
}

// ── tagger output ─────────────────────────────────────────────────────────

export interface TaggedShot {
  paragraph?: number;
  y_percent?: number;
  camera?: string;
  situation?: string;
  place?: string;
  characters?: ShotCharacter[];
  [key: string]: unknown;
}

export interface TaggedScene {
  place?: string;
  shots?: TaggedShot[];
  [key: string]: unknown;
}

export interface TaggerResult {
  scenes?: TaggedScene[];
  new_characters?: Partial<CharacterRecord>[];
  [key: string]: unknown;
}

// ── api ───────────────────────────────────────────────────────────────────

export interface RawApiResult {
  /** Marks a raw byte response (images) rather than JSON. */
  raw: true;
  status: number;
  bytes: ArrayBuffer | Uint8Array;
  mime: string;
}

export type ApiResult = Record<string, unknown> | RawApiResult;

export interface RequestContext {
  pathname: string;
  query: URLSearchParams;
  method: string;
  body: Record<string, unknown>;
  headers: Record<string, string>;
  /** Path segments captured by the route pattern. */
  params: Record<string, string>;
}
