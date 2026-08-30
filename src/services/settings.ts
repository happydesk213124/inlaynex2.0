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

import { DEFAULT_CONFIG, RESET_FACTORY_CONFIG } from '../config/defaults';
import { promptText } from '../config/prompts';
import { applySettingsResetKeeps, exportSettings, importSettings } from '../config/schema';
import { FORCE_PROMPT_KEYS, PROMPT_KEYS, PROMPT_PACK, VERSION } from '../core/constants';
import { getEventCount, getFocusStage, getLastError, getLastStage } from '../core/debug';
import type { ApiResult, StylePreset } from '../core/types';
import { deepcopy, deepMerge } from '../core/util/object';
import { cleanText } from '../core/util/text';
import { characterMaxLimit } from '../domain/character/tags';
import { naiHasAnyToken, normalizeTokenList, publicKeyRows } from '../domain/nai/keys';
import { LLM_ROLE_IDS, normalizeLlmRolesSettings } from '../domain/llm/roles';
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

/** Stable JSON for export: `{ version, prompts: { [key]: text } }` in pack order. */
export async function exportPromptsPack(): Promise<{ version: string; prompts: Record<string, string> }> {
  const rows = await listPrompts();
  const prompts: Record<string, string> = {};
  for (const row of rows) prompts[row.key] = row.text;
  return { version: VERSION, prompts };
}

/**
 * Import a prompts JSON pack. Accepts `{ prompts: { key: text } }`,
 * `{ prompts: [{ key, text }] }`, or a flat `{ key: text }` map.
 * Unknown keys are skipped. Returns how many known keys were written.
 */
export async function importPromptsPack(raw: unknown): Promise<ApiResult> {
  const map = parsePromptsImport(raw);
  let updated = 0;
  const now = Date.now() / 1000;
  for (const key of PROMPT_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(map, key)) continue;
    await idbPut('meta', { key: `prompt:${key}`, text: String(map[key] ?? ''), updated_at: now });
    updated += 1;
  }
  return { ok: true, updated, prompts: await listPrompts() };
}

/** Reset every shipped prompt to pack default, optionally keeping author_note. */
export async function resetPromptsToDefaults(opts?: { keep_author_note?: boolean }): Promise<ApiResult> {
  const keepAuthor = opts?.keep_author_note !== false;
  const now = Date.now() / 1000;
  let updated = 0;
  for (const key of PROMPT_KEYS) {
    if (keepAuthor && (key === 'author_note' || key === 'asset_author_note')) continue;
    await idbPut('meta', { key: `prompt:${key}`, text: promptText(key), updated_at: now });
    updated += 1;
  }
  return { ok: true, updated, keep_author_note: keepAuthor, prompts: await listPrompts() };
}

function parsePromptsImport(raw: unknown): Record<string, string> {
  let data: unknown = raw;
  if (typeof raw === 'string') {
    const text = raw.trim();
    if (!text) return {};
    data = JSON.parse(text);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const obj = data as Record<string, unknown>;
  const out: Record<string, string> = {};
  const bag = obj.prompts;
  if (bag && typeof bag === 'object' && !Array.isArray(bag)) {
    for (const [k, v] of Object.entries(bag as Record<string, unknown>)) {
      if (typeof k === 'string') out[k] = String(v ?? '');
    }
    return out;
  }
  if (Array.isArray(bag)) {
    for (const item of bag) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const key = String(row.key || '');
      if (!key) continue;
      out[key] = String(row.text ?? '');
    }
    return out;
  }
  // Flat map of key → text (single-prompt export may be `{ key, text }` too).
  if (typeof obj.key === 'string' && 'text' in obj) {
    out[obj.key] = String(obj.text ?? '');
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'version' || k === 'ok') continue;
    if (typeof v === 'string') out[k] = v;
  }
  return out;
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
  const next = deepcopy(RESET_FACTORY_CONFIG);
  next.llm = {
    ...next.llm,
    api_key: previous.llm?.api_key || '',
    service_account_json: previous.llm?.service_account_json || '',
  };
  next.nai = {
    ...next.nai,
    api_key: previous.nai?.api_key || '',
    api_keys_v5: Array.isArray(previous.nai?.api_keys_v5) ? deepcopy(previous.nai.api_keys_v5) : [],
    api_keys_v4: Array.isArray(previous.nai?.api_keys_v4) ? deepcopy(previous.nai.api_keys_v4) : [],
  };
  next.auth_token = previous.auth_token || '';
  const prevCuration = previous.curation as { embedding?: { api_key?: unknown } } | undefined;
  const nextCuration = next.curation as { embedding?: Record<string, unknown> } | undefined;
  const prevEmbedKey = prevCuration?.embedding && typeof prevCuration.embedding === 'object'
    ? String(prevCuration.embedding.api_key || '')
    : '';
  if (prevEmbedKey && nextCuration?.embedding) {
    next.curation = {
      ...nextCuration,
      embedding: { ...nextCuration.embedding, api_key: prevEmbedKey },
    };
  }
  const prevRoles = previous.llm_roles;
  if (next.llm_roles && prevRoles) {
    for (const id of LLM_ROLE_IDS) {
      const role = next.llm_roles[id];
      const prev = prevRoles[id];
      if (!role || !prev) continue;
      next.llm_roles[id] = {
        ...role,
        api_key: String(prev.api_key || ''),
        service_account_json: String(prev.service_account_json || ''),
      };
    }
  }
  applySettingsResetKeeps(previous as Record<string, unknown>, next as Record<string, unknown>);
  setConfig(next);
  await saveConfig();
  // Same as the prompts-tab “기본값” button: pack text, author notes kept.
  await resetPromptsToDefaults({ keep_author_note: true });
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
    nai_configured: imageBackendKind(nai) === 'comfy' ? comfyConfigured(nai) : naiHasAnyToken(nai),
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
  {
    const rows = publicKeyRows(getConfig().nai);
    cfg.nai.api_keys_v5 = [];
    cfg.nai.api_keys_v4 = [];
    cfg.nai.api_keys_v5_suffixes = rows.v5.map((r) => r.suffix);
    cfg.nai.api_keys_v4_suffixes = rows.v4.map((r) => r.suffix);
    cfg.nai.api_keys_v5_configured = rows.v5.length;
    cfg.nai.api_keys_v4_configured = rows.v4.length;
  }
  if (cfg.llm?.api_key) {
    cfg.llm.api_key = '';
    cfg.llm.api_key_configured = true;
  } else cfg.llm = { ...cfg.llm, api_key_configured: false };
  if (cfg.llm?.service_account_json) {
    cfg.llm.service_account_json = '';
    cfg.llm.service_account_configured = true;
  } else cfg.llm = { ...cfg.llm, service_account_configured: false };
  // Per-role LLM secrets
  {
    const roles = normalizeLlmRolesSettings(cfg.llm_roles);
    for (const id of LLM_ROLE_IDS) {
      const role = { ...roles[id] } as Record<string, unknown>;
      if (role.api_key) {
        role.api_key = '';
        role.api_key_configured = true;
      } else {
        role.api_key_configured = false;
      }
      if (role.service_account_json) {
        role.service_account_json = '';
        role.service_account_configured = true;
      } else {
        role.service_account_configured = false;
      }
      roles[id] = role as typeof roles[typeof id];
    }
    cfg.llm_roles = roles;
  }
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
  // Curation embedding secrets
  const curation = (cfg.curation && typeof cfg.curation === 'object'
    ? cfg.curation
    : {}) as Record<string, unknown>;
  const emb = (curation.embedding && typeof curation.embedding === 'object'
    ? { ...(curation.embedding as Record<string, unknown>) }
    : {}) as Record<string, unknown>;
  if (emb.api_key) {
    emb.api_key = '';
    emb.api_key_configured = true;
  } else {
    emb.api_key_configured = false;
  }
  curation.embedding = emb;
  cfg.curation = curation;
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
  if ('api_keys_v5' in nai) {
    const raw = nai.api_keys_v5;
    delete nai.api_keys_v5;
    delete nai.api_keys_v5_configured;
    delete nai.api_keys_v5_suffixes;
    const listed = normalizeTokenList(raw);
    if (listed.length) cfg.nai.api_keys_v5 = listed;
    if (nai.clearApiKeysV5) cfg.nai.api_keys_v5 = [];
    delete nai.clearApiKeysV5;
  }
  if ('api_keys_v4' in nai) {
    const raw = nai.api_keys_v4;
    delete nai.api_keys_v4;
    delete nai.api_keys_v4_configured;
    delete nai.api_keys_v4_suffixes;
    const listed = normalizeTokenList(raw);
    if (listed.length) cfg.nai.api_keys_v4 = listed;
    if (nai.clearApiKeysV4) cfg.nai.api_keys_v4 = [];
    delete nai.clearApiKeysV4;
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
    // updateSettings does not run migrateSettings — cap here so a pasted wall of
    // text cannot blow IndexedDB / Risu save-file writes ("setItem Error").
    if ('fixed_prompt_prefix' in card) {
      merged.fixed_prompt_prefix = String(card.fixed_prompt_prefix ?? '').trim().slice(0, 8000);
    }
    if ('fixed_prompt_suffix' in card) {
      merged.fixed_prompt_suffix = String(card.fixed_prompt_suffix ?? '').trim().slice(0, 8000);
    }
    cfg.card = merged;
    cfg.card.character_max = characterMaxLimit(cfg.card);
  }
  if (Object.keys(nai).length) cfg.nai = deepMerge(cfg.nai, nai);
  if (Object.keys(llm).length) cfg.llm = deepMerge(cfg.llm, llm);
  if (payload.llm_roles && typeof payload.llm_roles === 'object' && !Array.isArray(payload.llm_roles)) {
    const incoming = payload.llm_roles as Record<string, unknown>;
    const cur = normalizeLlmRolesSettings(cfg.llm_roles);
    for (const id of LLM_ROLE_IDS) {
      if (!(id in incoming) || !incoming[id] || typeof incoming[id] !== 'object') continue;
      const patchRole = { ...(incoming[id] as Record<string, unknown>) };
      const prev = { ...cur[id] } as Record<string, unknown>;
      if ('api_key' in patchRole) {
        const key = patchRole.api_key;
        delete patchRole.api_key;
        delete patchRole.api_key_configured;
        if (cleanText(key)) prev.api_key = key;
        if (patchRole.clearApiKey) prev.api_key = '';
        delete patchRole.clearApiKey;
      }
      if ('service_account_json' in patchRole) {
        const sa = patchRole.service_account_json;
        delete patchRole.service_account_json;
        delete patchRole.service_account_configured;
        if (cleanText(sa)) prev.service_account_json = sa;
        if (patchRole.clearServiceAccount) prev.service_account_json = '';
        delete patchRole.clearServiceAccount;
      }
      cur[id] = normalizeLlmRolesSettings({ [id]: { ...prev, ...patchRole } })[id];
    }
    cfg.llm_roles = cur;
  }
  if (payload.curation && typeof payload.curation === 'object') {
    const { updateCurationSettings } = await import('./curation');
    await updateCurationSettings(payload.curation as Record<string, unknown>);
    // updateCurationSettings already saved; still fall through for other keys
  }
  for (const key of ['bind_host', 'port', 'auth_token']) {
    if (key in payload) (cfg as Record<string, unknown>)[key] = payload[key];
  }
  await saveConfig();
  return { ok: true, settings: publicSettings() };
}
