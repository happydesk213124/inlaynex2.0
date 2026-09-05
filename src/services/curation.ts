/**
 * Curation catalog + embedding store and job-time helpers.
 */
import { focusFieldsForShots } from '../domain/curation/focus';
import {
  applyCurationTagsToShot,
  applyPerActorOptionIds,
  castForRefinePayload,
  catalogHasPresets,
  catalogSha,
  clampOptionIdsByLanes,
  countCatalogOptions,
  curationEmbedHintSystemMessage,
  curationGroupsSystemMessage,
  curationRefineSystemMessage,
  defaultCurationCatalog,
  flattenCatalogItems,
  normalizeCurationCatalog,
  parsePerActorOptionIds,
  splitTagsFromOptionIds,
  type CurationCatalog,
} from '../domain/curation/catalog';
import {
  continuityBindingsForChain,
  curationPresetRefineSystemMessage,
  curationPresetsSystemMessage,
  normalizeShotPresetFields,
  resolveMaidPresetSelection,
  resolvePresetChain,
  type PresetModifierBinding,
} from '../domain/curation/presets';
import {
  normalizeCurationMode,
  normalizeCurationStrictIds,
  type CurationMode,
} from '../config/schema';
import {
  splitSceneTagUnits,
  snapSceneTokens,
  type EmbeddedItem,
} from '../domain/curation/match';
import {
  CURATION_CATALOG_KEY,
  CURATION_EMBEDDINGS_KEY,
} from '../core/constants';
import type { ApiResult } from '../core/types';
import { dbg } from '../core/debug';
import { cleanText, joinTags } from '../core/util/text';
import {
  defaultEndpointForEmbedding,
  defaultModelForEmbedding,
  embedTexts,
  normalizeEmbeddingProvider,
  testEmbedding,
  type EmbeddingSettings,
} from '../providers/embedding/client';
import { parseJsonLoose } from '../core/util/object';
import { psGet, psRemove, psSet } from '../storage/device-store';
import { getConfig, setConfig } from './context';
import { getPrompt, saveConfig } from './settings';
import { resolveLlmRole } from '../domain/llm/roles';
import { callLlm } from './llm-call';
import type { Settings } from '../core/types';

export interface CurationEmbeddingStore {
  catalog_sha: string;
  model: string;
  provider: string;
  updated_at: number;
  items: EmbeddedItem[];
}

export interface CurationStatus {
  mode: CurationMode;
  catalog_name: string;
  catalog_sha: string;
  option_count: number;
  group_count: number;
  /** True when imported catalog still has NovelAI `presets` tree. */
  has_presets: boolean;
  embed_status: 'missing' | 'ready' | 'stale';
  embed_count: number;
  embed_model: string;
  embed_updated_at: number;
  large_warning: boolean;
  embed_progress?: { running: boolean; done: number; total: number; message: string };
}

const LARGE_CATALOG_OPTIONS = 400;

export type EmbedProgressFn = (done: number, total: number, message: string) => void;

let embedProgress: { running: boolean; done: number; total: number; message: string } = {
  running: false,
  done: 0,
  total: 0,
  message: '',
};

export function getEmbedProgress(): typeof embedProgress {
  return { ...embedProgress };
}

export function getCurationMode(): CurationMode {
  const cfg = getConfig() as Record<string, unknown>;
  const curation = cfg.curation && typeof cfg.curation === 'object'
    ? (cfg.curation as Record<string, unknown>)
    : {};
  return normalizeCurationMode(curation.mode);
}

/**
 * `curation.strict_ids`: only meaningful when mode is `two_stage`. When on,
 * pass 1 leaves scene fields empty and pass 2 assembles ONLY from catalog
 * option ids (no freeform camera/situation/action fallback).
 */
export function getCurationStrictIds(): boolean {
  const cfg = getConfig() as Record<string, unknown>;
  const curation = cfg.curation && typeof cfg.curation === 'object'
    ? (cfg.curation as Record<string, unknown>)
    : {};
  return normalizeCurationStrictIds(curation.strict_ids);
}

export function getEmbeddingSettingsFromConfig(): EmbeddingSettings {
  const cfg = getConfig() as Record<string, unknown>;
  const curation = (cfg.curation && typeof cfg.curation === 'object'
    ? cfg.curation
    : {}) as Record<string, unknown>;
  const emb = (curation.embedding && typeof curation.embedding === 'object'
    ? curation.embedding
    : {}) as Record<string, unknown>;
  const provider = normalizeEmbeddingProvider(emb.provider);
  return {
    provider,
    model: cleanText(emb.model, 200) || defaultModelForEmbedding(provider),
    endpoint: cleanText(emb.endpoint, 500) || defaultEndpointForEmbedding(provider),
    api_key: cleanText(emb.api_key, 4000),
  };
}

export async function loadCurationCatalog(): Promise<CurationCatalog> {
  const raw = await psGet(CURATION_CATALOG_KEY);
  if (raw == null || raw === '') return defaultCurationCatalog();
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return normalizeCurationCatalog(parsed);
  } catch (err) {
    dbg('curation.catalog.load', { message: String((err as Error)?.message || err) }, 'warn');
    return defaultCurationCatalog();
  }
}

export async function saveCurationCatalog(input: unknown): Promise<ApiResult & { status: CurationStatus }> {
  const catalog = normalizeCurationCatalog(input);
  await psSet(CURATION_CATALOG_KEY, catalog);
  // Catalog change invalidates embeddings (stale until regenerate).
  const emb = await loadEmbeddingStore();
  if (emb && emb.catalog_sha !== catalog.sha) {
    // Keep store but status will report stale — do not auto-delete user vectors.
  }
  return { ok: true, status: await curationStatus() };
}

export async function resetCurationCatalog(): Promise<ApiResult & { status: CurationStatus }> {
  const catalog = defaultCurationCatalog();
  await psSet(CURATION_CATALOG_KEY, catalog);
  await psRemove(CURATION_EMBEDDINGS_KEY);
  return { ok: true, status: await curationStatus() };
}

async function loadEmbeddingStore(): Promise<CurationEmbeddingStore | null> {
  const raw = await psGet(CURATION_EMBEDDINGS_KEY);
  if (raw == null || raw === '') return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object') return null;
    const store = parsed as CurationEmbeddingStore;
    if (!Array.isArray(store.items)) return null;
    return store;
  } catch {
    return null;
  }
}

export async function curationStatus(): Promise<CurationStatus> {
  const catalog = await loadCurationCatalog();
  const emb = await loadEmbeddingStore();
  const optionCount = countCatalogOptions(catalog);
  let embedStatus: CurationStatus['embed_status'] = 'missing';
  if (emb?.items?.length) {
    embedStatus = emb.catalog_sha === catalog.sha ? 'ready' : 'stale';
    const settings = getEmbeddingSettingsFromConfig();
    const model = cleanText(settings.model);
    if (model && emb.model && emb.model !== model) embedStatus = 'stale';
  }
  return {
    mode: getCurationMode(),
    catalog_name: catalog.name,
    catalog_sha: catalog.sha || catalogSha(catalog),
    option_count: optionCount,
    group_count: catalog.groups.length,
    has_presets: catalogHasPresets(catalog),
    embed_status: embedStatus,
    embed_count: emb?.items?.length || 0,
    embed_model: emb?.model || '',
    embed_updated_at: emb?.updated_at || 0,
    large_warning: optionCount > LARGE_CATALOG_OPTIONS,
    embed_progress: getEmbedProgress(),
  };
}

/** Embed entire catalog and persist. Batches texts for API efficiency. */
export async function embedCurationCatalog(
  onProgress?: EmbedProgressFn,
): Promise<ApiResult & { status: CurationStatus }> {
  const catalog = await loadCurationCatalog();
  const flat = flattenCatalogItems(catalog);
  const settings = getEmbeddingSettingsFromConfig();
  if (!flat.length) throw new Error('임베딩할 카탈로그 항목이 없습니다.');
  if (
    normalizeEmbeddingProvider(settings.provider) !== 'ollama'
    && normalizeEmbeddingProvider(settings.provider) !== 'lmstudio'
    && !cleanText(settings.api_key)
  ) {
    throw new Error('임베딩 API key가 없습니다. 큐레이팅 탭에서 키를 저장하세요.');
  }

  const report = (done: number, total: number, message: string) => {
    embedProgress = { running: done < total, done, total, message };
    onProgress?.(done, total, message);
  };

  const batchSize = normalizeEmbeddingProvider(settings.provider) === 'ollama' ? 1 : 16;
  const items: EmbeddedItem[] = [];
  let modelUsed = settings.model;
  report(0, flat.length, '임베딩 시작…');
  try {
    for (let i = 0; i < flat.length; i += batchSize) {
      const slice = flat.slice(i, i + batchSize);
      report(i, flat.length, `임베딩 중… ${i}/${flat.length}`);
      const { vectors, model } = await embedTexts(
        settings,
        slice.map((s) => s.text),
      );
      modelUsed = model || modelUsed;
      for (let j = 0; j < slice.length; j++) {
        const row = slice[j]!;
        const vector = vectors[j];
        if (!vector?.length) throw new Error(`임베딩 실패: ${row.key}`);
        items.push({
          key: row.key,
          groupId: row.groupId,
          optionId: row.optionId,
          tags: row.tags,
          slot: row.slot,
          vector,
        });
      }
    }
    report(flat.length, flat.length, '저장 중…');
    const store: CurationEmbeddingStore = {
      catalog_sha: catalog.sha || catalogSha(catalog),
      model: modelUsed,
      provider: String(settings.provider),
      updated_at: Date.now() / 1000,
      items,
    };
    await psSet(CURATION_EMBEDDINGS_KEY, store);
    report(flat.length, flat.length, '완료');
    embedProgress = { running: false, done: flat.length, total: flat.length, message: '완료' };
    return { ok: true, status: await curationStatus() };
  } catch (err) {
    embedProgress = {
      running: false,
      done: embedProgress.done,
      total: flat.length,
      message: `실패: ${(err as Error)?.message || err}`,
    };
    throw err;
  }
}

export async function testCurationEmbedding(): Promise<ApiResult & { dims: number; model: string }> {
  const settings = getEmbeddingSettingsFromConfig();
  return testEmbedding(settings);
}

function splitHasTags(split: {
  base?: string;
  char?: string;
  primary?: string;
  secondary?: string;
  female?: string;
  male?: string;
}): boolean {
  return Boolean(
    split.base || split.char || split.primary || split.secondary || split.female || split.male,
  );
}

/** System inject for tagger pass 1 depending on mode. */
export async function curationTaggerSystemMessage(): Promise<string | null> {
  const mode = getCurationMode();
  if (mode === 'off') return null;
  if (mode === 'embed_snap') {
    const custom = cleanText(await getPrompt('curation_embed_hint'), 4000);
    return custom || curationEmbedHintSystemMessage();
  }
  // two_stage — presets tree when imported, else flat groups
  const catalog = await loadCurationCatalog();
  const strictIds = getCurationStrictIds();
  if (catalogHasPresets(catalog)) return curationPresetsSystemMessage(catalog, strictIds);
  return curationGroupsSystemMessage(catalog, strictIds);
}

/**
 * Pass-2 refine for two_stage: ONE LLM call for all shots (not per-image).
 * Mutates each shot's camera/place and characters[].action (base vs char split).
 * When catalog has Maid `presets`, assembles leaf path prompts + modifier options.
 * `chatContext` should be byte-identical to the tagger's chat user message (prompt cache).
 */
export async function refineShotsWithCuration(
  shots: Record<string, unknown>[],
  opts?: { chatContext?: string },
): Promise<void> {
  if (!shots.length) return;
  const chatContext = cleanText(opts?.chatContext, 100_000);
  const catalog = await loadCurationCatalog();
  if (catalogHasPresets(catalog)) {
    for (const shot of shots) normalizeShotPresetFields(shot);
    const anyLeaf = shots.some((shot) =>
      Boolean(
        resolvePresetChain(catalog, {
          preset_path: shot.preset_path,
          composition_id: shot.composition_id,
          composition_variant: shot.composition_variant,
        }),
      ));
    if (anyLeaf) {
      await refineShotsWithPresets(catalog, shots, chatContext);
      return;
    }
    // LLM omitted composition_id (often blocked by format schema) — fall back to flat groups
    // so curation still does something instead of silently no-oping.
    dbg(
      'curation.preset_refine',
      { message: 'no composition_id on shots → falling back to group refine' },
      'warn',
    );
  }

  await refineShotsWithGroups(catalog, shots, chatContext);
}

/** system + optional cached chat user + variable shots user — maximize prompt-cache hits. */
function curationRefineLlmMessages(
  system: string,
  chatContext: string,
  shotsPayload: unknown,
): Array<{ role: 'system' | 'user'; content: string }> {
  const msgs: Array<{ role: 'system' | 'user'; content: string }> = [
    { role: 'system', content: system },
  ];
  if (chatContext) {
    msgs.push({ role: 'user', content: chatContext });
  }
  msgs.push({ role: 'user', content: JSON.stringify(shotsPayload) });
  return msgs;
}

async function refineShotsWithGroups(
  catalog: CurationCatalog,
  shots: Record<string, unknown>[],
  chatContext: string,
): Promise<void> {
  const strictIds = getCurationStrictIds();
  const parseGroupIds = (shot: Record<string, unknown>): string[] => {
    const rawGroups = shot.curation_groups;
    return Array.isArray(rawGroups)
      ? rawGroups.map((g) => cleanText(g, 160)).filter(Boolean)
      : cleanText(rawGroups, 400)
        .split(/[,|]/)
        .map((s) => s.trim())
        .filter(Boolean);
  };

  const perShotGroups = shots.map(parseGroupIds);
  const unionGroups = [...new Set(perShotGroups.flat())];
  // Nothing to refine if no shot picked groups.
  if (!unionGroups.length) {
    dbg('curation.group_refine', { message: 'no curation_groups on shots — skip' }, 'warn');
    return;
  }

  const refineMsg = curationRefineSystemMessage(catalog, unionGroups, { strictIds });
  const systemBase = cleanText(await getPrompt('curation_refine'), 6000) || refineMsg;
  const system = `${systemBase}\n\n${refineMsg}`;
  const focuses = focusFieldsForShots(shots, chatContext);
  const shotsPayload = {
    shots: shots.map((shot, shot_index) => ({
      shot_index,
      y_percent: shot.y_percent ?? shot.anchor_percent ?? null,
      ...focuses[shot_index],
      curation_groups: perShotGroups[shot_index],
      camera: shot.camera || '',
      situation: shot.situation || shot.scene || '',
      place: shot.place || '',
      action: shot.action || '',
      natural: shot.natural || '',
      character_count: Array.isArray(shot.characters) ? shot.characters.length : 0,
      cast: castForRefinePayload(shot),
    })),
  };
  const raw = await callLlm(
    resolveLlmRole(getConfig(), 'curator'),
    curationRefineLlmMessages(system, chatContext, shotsPayload),
  );
  const parsed = parseJsonLoose(raw) as Record<string, unknown>;
  if (!parsed || typeof parsed !== 'object') return;

  const applyOne = (shot: Record<string, unknown>, row: Record<string, unknown> | null | undefined) => {
    if (!row || typeof row !== 'object') return;
    const optionIds = row.curation_option_ids ?? row.option_ids;
    const split = splitTagsFromOptionIds(catalog, optionIds);
    if (splitHasTags(split)) {
      applyCurationTagsToShot(shot, split, {
        place: row.place != null ? row.place : shot.place,
        situation: '',
      });
      shot.curation_option_ids = optionIds;
    } else {
      // No catalog ids matched. `place` is still a plain location hint in
      // strict mode; camera/situation/action are the freeform Danbooru-scene
      // escape hatch strict_ids exists to remove, so those stay empty.
      if (row.place != null) shot.place = cleanText(row.place, 400);
      if (!strictIds) {
        if (row.camera != null) shot.camera = cleanText(row.camera, 600);
        if (row.situation != null) shot.situation = cleanText(row.situation, 600);
        if (row.action != null) shot.action = cleanText(row.action, 600);
      }
    }
    if (strictIds && Array.isArray(row.characters)) {
      applyPerActorOptionIds(shot, parsePerActorOptionIds(row.characters), catalog);
    }
  };

  applyRefineRows(shots, parsed, applyOne);
}

async function refineShotsWithPresets(
  catalog: CurationCatalog,
  shots: Record<string, unknown>[],
  chatContext: string,
): Promise<void> {
  const strictIds = getCurationStrictIds();
  const chains = shots.map((shot) =>
    resolvePresetChain(catalog, {
      preset_path: shot.preset_path,
      composition_id: shot.composition_id,
      composition_variant: shot.composition_variant,
    }));
  const anyLeaf = chains.some(Boolean);
  if (!anyLeaf) return;

  const system = curationPresetRefineSystemMessage(
    catalog,
    chains.filter(Boolean) as NonNullable<(typeof chains)[number]>[],
    { strictIds },
  );
  const focuses = focusFieldsForShots(shots, chatContext);
  const shotsPayload = {
    shots: shots.map((shot, shot_index) => ({
      shot_index,
      y_percent: shot.y_percent ?? shot.anchor_percent ?? null,
      ...focuses[shot_index],
      composition_id: shot.composition_id || '',
      composition_variant: shot.composition_variant || '',
      place: shot.place || '',
      natural: shot.natural || '',
      character_count: Array.isArray(shot.characters) ? shot.characters.length : 0,
      cast: castForRefinePayload(shot),
    })),
  };

  let parsed: Record<string, unknown> | null = null;
  try {
    const raw = await callLlm(
      resolveLlmRole(getConfig(), 'curator'),
      curationRefineLlmMessages(system, chatContext, shotsPayload),
    );
    parsed = parseJsonLoose(raw) as Record<string, unknown>;
  } catch (err) {
    dbg('curation.preset_refine', { message: String((err as Error)?.message || err) }, 'warn');
  }

  // Job-scoped (this call only) continuity: last binding+ids seen per
  // continuity group ref, keyed so a later shot whose own chain is silent
  // about that group still gets it — and its original source/target routing.
  const continuity = new Map<string, { ids: string[]; binding: PresetModifierBinding }>();

  const applyOne = (shot: Record<string, unknown>, row: Record<string, unknown> | null | undefined, index: number) => {
    const optionIds = row && typeof row === 'object'
      ? (row.curation_option_ids ?? row.option_ids)
      : shot.curation_option_ids;
    const clamped = optionIds != null ? clampOptionIdsByLanes(catalog, optionIds) : [];

    for (const binding of continuityBindingsForChain(catalog, chains[index])) {
      const ids = [...(binding.include_options || []), ...(binding.action?.include_options || [])];
      if (ids.length) continuity.set(binding.ref, { ids, binding });
    }
    const continuityIds = [...continuity.values()].flatMap((v) => v.ids);
    const continuityBindingList = [...continuity.values()].map((v) => v.binding);

    const split = resolveMaidPresetSelection(
      catalog,
      {
        preset_path: shot.preset_path,
        composition_id: shot.composition_id,
        composition_variant: shot.composition_variant,
        curation_option_ids: clamped,
      },
      { optionIds: continuityIds, bindings: continuityBindingList },
    );
    if (split && splitHasTags(split)) {
      applyCurationTagsToShot(shot, split, {
        place: row && row.place != null ? row.place : shot.place,
        situation: '',
      });
      if (optionIds != null) shot.curation_option_ids = clamped;
      if (catalog.fixed_positive) shot.curation_fixed_positive = catalog.fixed_positive;
    }
    if (strictIds) {
      const perActorRaw = row && typeof row === 'object' ? row.characters : undefined;
      if (Array.isArray(perActorRaw)) {
        applyPerActorOptionIds(shot, parsePerActorOptionIds(perActorRaw), catalog);
      }
    }
  };

  if (parsed && typeof parsed === 'object') {
    applyRefineRows(shots, parsed, applyOne);
    return;
  }
  // LLM failed — still apply leaf path prompts (+ continuity) alone.
  shots.forEach((shot, index) => applyOne(shot, null, index));
}

function applyRefineRows(
  shots: Record<string, unknown>[],
  parsed: Record<string, unknown>,
  applyOne: (shot: Record<string, unknown>, row: Record<string, unknown> | null | undefined, index: number) => void,
): void {
  const rows = Array.isArray(parsed.shots) ? parsed.shots : Array.isArray(parsed) ? parsed : null;
  if (rows) {
    for (let i = 0; i < shots.length; i++) {
      const byIndex = rows.find(
        (r) => r && typeof r === 'object' && Number((r as Record<string, unknown>).shot_index) === i,
      ) as Record<string, unknown> | undefined;
      applyOne(shots[i]!, byIndex || (rows[i] as Record<string, unknown> | undefined), i);
    }
    return;
  }
  if (shots.length === 1) applyOne(shots[0]!, parsed, 0);
}

/**
 * Embed-snap: ONE embedding API batch for all shots' scene tags, then snap locally.
 * Returns false when embeddings missing/stale/fail → caller uses freeform as-is (off path).
 */
export async function snapShotsSceneTags(
  shots: Record<string, unknown>[],
): Promise<{ ok: boolean; reason?: string; snapped?: number }> {
  if (!shots.length) return { ok: true, snapped: 0 };
  const catalog = await loadCurationCatalog();
  const store = await loadEmbeddingStore();
  const sha = catalog.sha || catalogSha(catalog);
  if (!store?.items?.length) return { ok: false, reason: '임베딩 없음 → 큐레이션 없이 생성' };
  if (store.catalog_sha !== sha) return { ok: false, reason: '임베딩 stale → 큐레이션 없이 생성' };

  const perShotUnits = shots.map((shot) => {
    const sceneText = joinTags(
      cleanText(shot.camera, 600),
      cleanText(shot.situation || shot.scene, 600),
      cleanText(shot.place, 400),
      cleanText(shot.action, 600),
    );
    return splitSceneTagUnits(sceneText);
  });
  const flatUnits = perShotUnits.flat();
  if (!flatUnits.length) return { ok: true, snapped: 0 };

  try {
    const settings = getEmbeddingSettingsFromConfig();
    const { vectors } = await embedTexts(settings, flatUnits);
    let offset = 0;
    let snappedTotal = 0;
    for (let i = 0; i < shots.length; i++) {
      const units = perShotUnits[i]!;
      const shotVecs = vectors.slice(offset, offset + units.length);
      offset += units.length;
      if (!units.length) continue;
      const { baseTags, charTags, primaryTags, secondaryTags, femaleTags, maleTags, snapped } =
        snapSceneTokens(units, shotVecs, store.items);
      snappedTotal += snapped;
      applyCurationTagsToShot(shots[i]!, {
        base: joinTags(...baseTags),
        char: joinTags(...charTags),
        primary: joinTags(...primaryTags),
        secondary: joinTags(...secondaryTags),
        female: joinTags(...femaleTags),
        male: joinTags(...maleTags),
      }, { place: '', situation: '' });
    }
    return { ok: true, snapped: snappedTotal };
  } catch (err) {
    const reason = `임베딩 API 실패 → 큐레이션 없이 생성 (${(err as Error)?.message || err})`;
    dbg('curation.snap', { message: reason }, 'warn');
    return { ok: false, reason };
  }
}

/** Merge curation patch into live config (secrets: blank = keep). */
export async function updateCurationSettings(patch: Record<string, unknown>): Promise<ApiResult> {
  const cfg = getConfig() as Record<string, unknown>;
  const prev = (cfg.curation && typeof cfg.curation === 'object'
    ? { ...(cfg.curation as Record<string, unknown>) }
    : {}) as Record<string, unknown>;
  const next = { ...prev, ...patch };
  if (patch.mode != null) next.mode = normalizeCurationMode(patch.mode);
  if (patch.strict_ids != null) next.strict_ids = normalizeCurationStrictIds(patch.strict_ids);
  if (patch.embedding && typeof patch.embedding === 'object') {
    const prevEmb = (prev.embedding && typeof prev.embedding === 'object'
      ? { ...(prev.embedding as Record<string, unknown>) }
      : {}) as Record<string, unknown>;
    const embPatch = patch.embedding as Record<string, unknown>;
    const emb = { ...prevEmb, ...embPatch };
    if ('api_key' in embPatch) {
      const key = embPatch.api_key;
      delete emb.api_key;
      delete emb.api_key_configured;
      if (cleanText(key)) emb.api_key = key;
      if (embPatch.clearApiKey || patch.clear_embedding_key) emb.api_key = '';
      delete emb.clearApiKey;
    }
    if (emb.provider != null) emb.provider = normalizeEmbeddingProvider(emb.provider);
    next.embedding = emb;
  }
  cfg.curation = next;
  // Clear legacy card flag once user sets mode via curation tab.
  if (patch.mode != null && cfg.card && typeof cfg.card === 'object') {
    (cfg.card as Record<string, unknown>).composition_curation = false;
  }
  setConfig(cfg as Settings);
  await saveConfig();
  return { ok: true };
}

// re-export for tests
export { catalogSha };
