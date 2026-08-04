/**
 * Settings, the prompt store, and the health payload.
 *
 * Three things are grouped here because they are all views of the same live
 * config object: `publicSettings` is what the UI renders, `health` is what the
 * status panel polls, and the prompt store is settings that happen to be too
 * large for the settings blob so they live as `meta` rows instead.
 *
 * Two invariants the rest of the backend relies on:
 *
 *  - Every load path merges stored settings over `DEFAULT_CONFIG`, so
 *    `cfg.card`, `cfg.llm` and `cfg.nai` are always objects and write paths do
 *    not have to re-create them.
 *  - Secrets never leave this module. `publicSettings` blanks each secret and
 *    replaces it with a `*_configured` boolean, and the import/reset paths carry
 *    the previous secrets forward rather than accepting new ones.
 */

import { DEFAULT_CONFIG } from '../config/defaults';
import { promptText } from '../config/prompts';
import { exportSettings, importSettings } from '../config/schema';
import { FORCE_PROMPT_KEYS, PROMPT_KEYS, PROMPT_PACK, VERSION } from '../core/constants';
import { getEventCount, getFocusStage, getLastError, getLastStage } from '../core/debug';
import type { ApiResult, StylePreset } from '../core/types';
import { deepcopy, deepMerge } from '../core/util/object';
import { cleanText } from '../core/util/text';
import { characterMaxLimit } from '../domain/character/tags';
import { comfyConfigured, imageBackendKind } from '../providers/comfy/client';
import { llmConfigured } from '../providers/llm/transform';
import { saveSettingsToStorage } from '../storage/settings-store';
import { idbGet, idbGetAll, idbPut, imageLocations, storeSize, totalImageBytes } from '../storage/stores';
import { configLock, getConfig, getPresetVibePreviewUrl, getRefPreviewUrl, getVibePreviewUrl, setConfig } from './context';

/** Values that read as "the feature is switched off" in the settings UI. */
const OFF_VALUES = ['', 'none', 'off', 'false', '0'];

// ── prompt store ───────────────────────────────────────────────────────────

export interface PromptRow {
  key: string;
  text: string;
  updated_at: number;
}

/**
 * Installs the shipped prompt pack.
 *
 * A user edit normally wins forever, but when the pack identifier changes the
 * prompts in `FORCE_PROMPT_KEYS` are overwritten anyway: those encode the
 * response format the tagger parser expects, so a stale edit does not degrade
 * output, it breaks generation entirely.
 */
export async function seedPrompts(): Promise<void> {
  const pack = await idbGet('meta', 'prompt:__pack__');
  const force = !pack || pack.text !== PROMPT_PACK;
  const now = Date.now() / 1000;
  for (const key of PROMPT_KEYS) {
    const existing = await idbGet('meta', `prompt:${key}`);
    if (existing && !(force && FORCE_PROMPT_KEYS.includes(key))) continue;
    await idbPut('meta', { key: `prompt:${key}`, text: promptText(key), updated_at: now });
  }
  await idbPut('meta', { key: 'prompt:__pack__', text: PROMPT_PACK, updated_at: now });
}

export async function getPrompt(key: string): Promise<string> {
  const row = await idbGet('meta', `prompt:${key}`);
  if (row?.text != null) return row.text as string;
  return promptText(key);
}

export async function setPrompt(key: string, text: string): Promise<ApiResult> {
  const now = Date.now() / 1000;
  await idbPut('meta', { key: `prompt:${key}`, text, updated_at: now });
  return { ok: true, key, updated_at: now };
}

/** Every prompt, in pack order first so the editor list is stable. */
export async function listPrompts(): Promise<PromptRow[]> {
  const all = await idbGetAll('meta');
  const byKey = new Map<string, PromptRow>(
    all
      // `prompt:__pack__` is bookkeeping, not an editable prompt.
      .filter((r) => r.key?.startsWith('prompt:') && !r.key.startsWith('prompt:__'))
      .map((r): [string, PromptRow] => [
        r.key.slice(7),
        { key: r.key.slice(7), text: (r.text as string) || '', updated_at: r.updated_at || 0 },
      ]),
  );
  const ordered: PromptRow[] = [];
  for (const key of PROMPT_KEYS) {
    const row = byKey.get(key);
    if (row) ordered.push(row);
    else ordered.push({ key, text: promptText(key), updated_at: 0 });
    byKey.delete(key);
  }
  for (const row of byKey.values()) ordered.push(row);
  return ordered;
}

// ── persistence ────────────────────────────────────────────────────────────

/**
 * Persists the current settings.
 *
 * The snapshot is taken before queuing, so each queued write stores the config
 * as it was when that write was requested. Ordering matters more than freshness
 * here: two callers mutating different sections must not have the second write
 * silently replay the first caller's view.
 */
export async function saveConfig(): Promise<void> {
  const snapshot = deepcopy(getConfig());
  await configLock.run(() => saveSettingsToStorage(snapshot));
}

export function exportSettingsJson(): string {
  return exportSettings(getConfig());
}

export async function importSettingsJson(json: string): Promise<ApiResult> {
  // One byte past the parser's own limit, so oversized input reaches the
  // explicit "too large" rejection instead of being silently truncated.
  const imported = importSettings(String(json ?? '').slice(0, 2_000_001));
  const previous = deepcopy(getConfig());
  await idbPut('meta', { key: 'settings_backup', value: previous, updated_at: Date.now() / 1000 });
  const next = deepMerge(DEFAULT_CONFIG, imported);
  next.llm = { ...next.llm, api_key: previous.llm?.api_key || '' };
  next.nai = { ...next.nai, api_key: previous.nai?.api_key || '' };
  next.auth_token = previous.auth_token || '';
  setConfig(next);
  await saveConfig();
  return { ok: true, settings: publicSettings() };
}

export async function resetSettings(): Promise<ApiResult> {
  const previous = deepcopy(getConfig());
  await idbPut('meta', { key: 'settings_backup', value: previous, updated_at: Date.now() / 1000 });
  const next = deepcopy(DEFAULT_CONFIG);
  next.llm = { ...next.llm, api_key: previous.llm?.api_key || '' };
  next.nai = { ...next.nai, api_key: previous.nai?.api_key || '' };
  next.auth_token = previous.auth_token || '';
  // Card style presets are user content — never wipe on settings reset.
  const prevCard = previous.card;
  next.card = {
    ...next.card,
    presets: Array.isArray(prevCard.presets) ? deepcopy(prevCard.presets) : next.card.presets || [],
    active_preset_id: String(prevCard.active_preset_id || next.card.active_preset_id || ''),
    custom_pos: String(prevCard.custom_pos ?? next.card.custom_pos ?? ''),
    custom_neg: String(prevCard.custom_neg ?? next.card.custom_neg ?? ''),
  };
  setConfig(next);
  await saveConfig();
  return { ok: true, settings: publicSettings() };
}

// ── status ─────────────────────────────────────────────────────────────────

/**
 * Status payload for the UI panel.
 *
 * `pid` and `port` are always zero and `source_file` is always `"native"`: the
 * UI was written against a companion HTTP server and still renders those
 * fields, so they are reported as constants rather than removed.
 */
export function health(): Record<string, unknown> {
  const cfg = getConfig();
  const nai = cfg.nai;
  const llm = cfg.llm;
  let cards = 0;
  let images = 0;
  let pngBytes = 0;
  let folders = 0;
  try {
    cards = storeSize('cards');
    images = storeSize('images');
    // From the metadata index: summing decoded buffers would force every stored
    // image to be hydrated just to report a number.
    pngBytes = totalImageBytes();
    const folderKeys = new Set<string>();
    for (const loc of imageLocations()) {
      const cid = cleanText((loc.character_id as string) || '', 200) || 'unknown';
      const chid = cleanText((loc.chat_id as string) || '', 200) || 'unknown';
      folderKeys.add(`${cid}|${chid}`);
    }
    folders = folderKeys.size;
  } catch {
    /* counters are best-effort; a storage hiccup must not fail the health probe */
  }
  return {
    ok: true,
    version: VERSION,
    pid: 0,
    source_file: 'native',
    nai_configured: imageBackendKind(nai) === 'comfy' ? comfyConfigured(nai) : Boolean(cleanText(nai.api_key)),
    image_backend: imageBackendKind(nai),
    llm_configured: llmConfigured(llm),
    port: 0,
    image_mode: 'data-url',
    storage: 'indexeddb',
    storage_api: 'getLocalPluginStorage',
    storage_scope: 'device-local',
    cards,
    images,
    folders,
    png_bytes: pngBytes,
    last_stage: getLastStage(),
    focus_stage: getFocusStage(),
    last_error: getLastError(),
    debug_events: getEventCount(),
  };
}

/**
 * The settings object the UI is allowed to see: secrets blanked, derived flags
 * filled in, and the storage descriptors the UI displays appended.
 */
export function publicSettings(): Record<string, unknown> {
  const cfg = deepcopy(getConfig());
  if (cfg.nai?.api_key) {
    cfg.nai.api_key = '';
    cfg.nai.api_key_configured = true;
  } else cfg.nai = { ...cfg.nai, api_key_configured: false };
  if (cfg.llm?.api_key) {
    cfg.llm.api_key = '';
    cfg.llm.api_key_configured = true;
  } else cfg.llm = { ...cfg.llm, api_key_configured: false };
  if (cfg.llm?.service_account_json) {
    cfg.llm.service_account_json = '';
    cfg.llm.service_account_configured = true;
  } else cfg.llm = { ...cfg.llm, service_account_configured: false };
  const nai = cfg.nai;
  nai.backend = imageBackendKind(nai);
  nai.image_backend = nai.backend;
  nai.comfy_configured = comfyConfigured(nai);
  // A stored preview URL is what `nai-assets` treats as "an image is present",
  // so it is both the presence test and the value the UI renders.
  const refPreview = getRefPreviewUrl();
  const vibePreview = getVibePreviewUrl();
  // "Configured" means switched on *and* holding an image, so the UI never shows
  // a reference as active when the bytes are gone.
  const refOn = !OFF_VALUES.includes(cleanText(nai.image_reference));
  nai.image_reference_configured = Boolean(refOn && refPreview);
  if (!nai.image_reference) nai.image_reference = nai.image_reference_configured ? 'file' : 'none';
  if (nai.image_reference_configured && refPreview) nai.reference_preview_url = refPreview;
  const vibeOn = !OFF_VALUES.includes(cleanText(nai.vibe_transfer));
  nai.vibe_transfer_configured = Boolean(vibeOn && vibePreview);
  if (!nai.vibe_transfer) nai.vibe_transfer = nai.vibe_transfer_configured ? 'file' : 'none';
  if (nai.vibe_transfer_configured && vibePreview) nai.vibe_preview_url = vibePreview;
  // Annotate style presets with per-preset vibe presence (preview map filled at boot/upload).
  if (Array.isArray(cfg.card?.presets)) {
    for (const raw of cfg.card.presets) {
      if (!raw || typeof raw !== 'object') continue;
      const p = raw as StylePreset & Record<string, unknown>;
      const pid = cleanText(p.id, 120);
      const preview = pid ? getPresetVibePreviewUrl(pid) : '';
      if (preview) {
        p.vibe_configured = true;
        p.vibe_preview_url = preview;
      } else {
        delete p.vibe_configured;
        delete p.vibe_preview_url;
      }
      delete p.vibe_transfer;
    }
  }
  cfg.card.character_max = characterMaxLimit(cfg.card);
  cfg.database_path = 'indexeddb:getLocalPluginStorage';
  cfg.images_dir = 'indexeddb:inx_nximg_*';
  cfg.prompts_dir = 'embedded';
  cfg.storage = {
    ...cfg.storage,
    backend: 'indexeddb',
    api: 'getLocalPluginStorage',
    image_encoding: 'base64',
    scope: 'device-local',
    image_mode: 'data-url',
  };
  return cfg;
}

/**
 * Applies a settings patch from the UI.
 *
 * Secrets are handled apart from the generic merge: an absent or blank key means
 * "leave it alone", because the UI only ever sends back the blanked value it was
 * given. Clearing therefore needs an explicit flag.
 */
export async function updateSettings(patch: Record<string, unknown>): Promise<ApiResult> {
  const payload: Record<string, unknown> = patch && typeof patch === 'object' ? patch : {};
  const cfg = getConfig();
  const nai: Record<string, unknown> = { ...((payload.nai as Record<string, unknown> | undefined) || {}) };
  const llm: Record<string, unknown> = { ...((payload.llm as Record<string, unknown> | undefined) || {}) };
  const card: Record<string, unknown> = { ...((payload.card as Record<string, unknown> | undefined) || {}) };
  // Note: the clear flags are only honoured when `api_key` is also present in
  // the patch, and `clearApiKey` is only stripped from the merge on that same
  // path. Both are load-bearing for the UI, which always sends the pair.
  if ('api_key' in nai) {
    const key = nai.api_key;
    delete nai.api_key;
    delete nai.api_key_configured;
    if (cleanText(key)) {
      cfg.nai.api_key = key as string;
    }
    if (nai.clearApiKey || payload.clear_nai_key) {
      cfg.nai.api_key = '';
    }
    delete nai.clearApiKey;
  }
  if ('api_key' in llm) {
    const key = llm.api_key;
    delete llm.api_key;
    delete llm.api_key_configured;
    if (cleanText(key)) {
      cfg.llm.api_key = key as string;
    }
    if (llm.clearApiKey || payload.clear_llm_key) {
      cfg.llm.api_key = '';
    }
    delete llm.clearApiKey;
  }
  if ('service_account_json' in llm) {
    const sa = llm.service_account_json;
    delete llm.service_account_json;
    delete llm.service_account_configured;
    if (cleanText(sa)) {
      cfg.llm.service_account_json = sa as string;
    }
    if (llm.clearServiceAccount || payload.clear_llm_service_account) {
      cfg.llm.service_account_json = '';
    }
    delete llm.clearServiceAccount;
  }
  if (Object.keys(card).length) {
    // Replace arrays (presets) outright — deepMerge already does, but be explicit.
    const merged = deepMerge(cfg.card, card);
    if (Array.isArray(card.presets)) merged.presets = card.presets as StylePreset[];
    if ('active_preset_id' in card) merged.active_preset_id = card.active_preset_id as string;
    if ('custom_pos' in card) merged.custom_pos = card.custom_pos as string;
    if ('custom_neg' in card) merged.custom_neg = card.custom_neg as string;
    cfg.card = merged;
    cfg.card.character_max = characterMaxLimit(cfg.card);
  }
  if (Object.keys(nai).length) cfg.nai = deepMerge(cfg.nai, nai);
  if (Object.keys(llm).length) cfg.llm = deepMerge(cfg.llm, llm);
  for (const key of ['bind_host', 'port', 'auth_token']) {
    if (key in payload) (cfg as Record<string, unknown>)[key] = payload[key];
  }
  await saveConfig();
  return { ok: true, settings: publicSettings() };
}
