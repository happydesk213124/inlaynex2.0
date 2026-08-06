/**
 * Collect NovelAI tags from Risu character additionalAssets and active module assets.
 */
import { dbg } from '../core/debug';
import { hostHas, risuHost } from '../core/host';
import type { ApiResult, LoreEntry } from '../core/types';
import { cleanText } from '../core/util/text.ts';
import { collectTriggeredLoreKeys } from '../domain/lore/assemble';
import {
  formatAssetTagsInjectBlock,
  mergeWeightMaps,
  packAssetTagGroups,
  tagsFromImageBytes,
  type PackedAssetTags,
} from '../domain/nai-meta/index.ts';
import {
  ASSETS_PER_TRIGGER,
  assetMatchTriggers,
  assetPriorityForTrigger,
  orderTriggersForAssetPick,
  pickAssetsPerTrigger,
  scoreAssetName,
} from '../domain/nai-meta/match.ts';
import {
  assetsFromEnabledModules,
  collectEnabledModuleIds,
  mergeNamedAssets,
  parseRisuAssetRows,
  personaEmbeddedModule,
  type RisuNamedAsset,
} from '../domain/nai-meta/risu-asset-list.ts';
import { asU8 } from '../core/util/bytes.ts';
import { getConfig } from './context';

const MAX_ASSETS_HARD = 8;
/** Cap how many name-matched candidates we try to read before giving up. */
const MAX_READ_ATTEMPTS = 24;

export interface AssetTagCollectResult {
  block: string;
  packed: PackedAssetTags;
  weightMap: Map<string, string>;
}

interface AssetPoolInfo {
  assets: RisuNamedAsset[];
  characterCount: number;
  moduleCount: number;
  personaCount: number;
  enabledModuleIds: string[];
}

/** Last successful collect — used to restore emphasis when merging new_characters. */
let lastWeightMap: Map<string, string> = new Map();

/** Cache: asset storage key → filtered plains + weight entries. */
const tagCache = new Map<string, { plains: string[]; weights: Array<[string, string]> }>();

export function getLastAssetWeightMap(): Map<string, string> {
  return lastWeightMap;
}

export function setLastAssetWeightMap(map: Map<string, string>): void {
  lastWeightMap = map;
}

export function clearAssetTagCache(): void {
  tagCache.clear();
  lastWeightMap = new Map();
}

async function readAssetBytes(path: string): Promise<Uint8Array | null> {
  const host = risuHost();
  if (!host || typeof host.readImage !== 'function') return null;
  try {
    const data = await host.readImage(path);
    if (!data) return null;
    if (data instanceof ArrayBuffer) return asU8(data);
    if (data instanceof Uint8Array) return data;
    if (typeof Blob !== 'undefined' && data instanceof Blob) {
      return asU8(await data.arrayBuffer());
    }
    if (typeof data === 'string') {
      const m = data.match(/^data:[^;]+;base64,(.+)$/i);
      if (m) {
        const bin = atob(m[1]!);
        const u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i);
        return u8;
      }
      // bare base64
      try {
        const bin = atob(data.replace(/\s+/g, ''));
        const u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i);
        return u8;
      } catch {
        return null;
      }
    }
    if (data && typeof data === 'object') {
      const rec = data as Record<string, unknown>;
      if (rec.data instanceof ArrayBuffer) return asU8(rec.data);
      if (typeof rec.data === 'string') return readAssetBytes(rec.data);
    }
  } catch (err) {
    dbg('asset-tags.read.fail', { path, message: String((err as Error)?.message || err) }, 'warn');
  }
  return null;
}

async function tryCurrentChat(): Promise<unknown | null> {
  const host = risuHost();
  if (
    !host ||
    typeof host.getCurrentCharacterIndex !== 'function' ||
    typeof host.getCurrentChatIndex !== 'function' ||
    typeof host.getChatFromIndex !== 'function'
  ) {
    return null;
  }
  try {
    const charIdx = await host.getCurrentCharacterIndex();
    const chatIdx = await host.getCurrentChatIndex();
    return await host.getChatFromIndex(charIdx, chatIdx);
  } catch (err) {
    dbg('asset-tags.chat.fail', { message: String((err as Error)?.message || err) }, 'warn');
    return null;
  }
}

/** Fallback when getChatFromIndex is missing — Risu stores modules on character.chats[chatPage]. */
function chatModulesFromCharacter(character: unknown): unknown {
  const c = character && typeof character === 'object' ? (character as Record<string, unknown>) : null;
  if (!c) return null;
  const chats = Array.isArray(c.chats) ? c.chats : null;
  if (!chats?.length) return null;
  const page = typeof c.chatPage === 'number' ? c.chatPage : 0;
  const chat = chats[Math.max(0, Math.min(chats.length - 1, page))];
  return chat && typeof chat === 'object' ? chat : null;
}

async function listSearchableAssets(character: unknown): Promise<AssetPoolInfo> {
  const charRec = character && typeof character === 'object' ? (character as Record<string, unknown>) : null;
  const charAssets = parseRisuAssetRows(charRec?.additionalAssets ?? charRec?.additional_assets);

  let moduleAssets: RisuNamedAsset[] = [];
  let embeddedAssets: RisuNamedAsset[] = [];
  let enabledModuleIds: string[] = [];

  if (hostHas('getDatabase')) {
    try {
      const db = await risuHost()!.getDatabase!([
        'modules',
        'enabledModules',
        'moduleIntergration',
        'personas',
        'selectedPersona',
      ]);
      if (db) {
        const chat = (await tryCurrentChat()) || chatModulesFromCharacter(character);
        const chatRec = chat && typeof chat === 'object' ? (chat as Record<string, unknown>) : null;
        const embedded = personaEmbeddedModule(db);
        const embeddedRec =
          embedded && typeof embedded === 'object' ? (embedded as Record<string, unknown>) : null;
        enabledModuleIds = collectEnabledModuleIds({
          enabledModules: db.enabledModules,
          characterModules: charRec?.modules,
          chatModules: chatRec?.modules,
          moduleIntergration: db.moduleIntergration,
          personaEmbeddedModuleId: embeddedRec?.id,
        });
        const dbModules = Array.isArray(db.modules) ? db.modules : [];
        moduleAssets = assetsFromEnabledModules(dbModules, enabledModuleIds, embedded ? [embedded] : []);
        if (embeddedRec) embeddedAssets = parseRisuAssetRows(embeddedRec.assets);

        // Probe-friendly: how many assets each enabled id actually has on the module row.
        const idSet = new Set(enabledModuleIds);
        const perMod: Array<{ id: string; name: string; assets: number }> = [];
          for (const raw of dbModules) {
          if (!raw || typeof raw !== 'object') continue;
          const m = raw as unknown as Record<string, unknown>;
          const id = cleanText(m.id, 200);
          const ns = cleanText(m.namespace, 200);
          if (!(id && idSet.has(id)) && !(ns && idSet.has(ns))) continue;
          perMod.push({
            id: id || ns,
            name: cleanText(m.name, 200),
            assets: parseRisuAssetRows(m.assets).length,
          });
        }
        dbg('asset-tags.modules', {
          enabled: enabledModuleIds.length,
          module_assets: moduleAssets.length,
          per_module: perMod.slice(0, 12),
        });
      }
    } catch (err) {
      dbg('asset-tags.modules.fail', { message: String((err as Error)?.message || err) }, 'warn');
    }
  }

  return {
    assets: mergeNamedAssets(charAssets, moduleAssets, embeddedAssets),
    characterCount: charAssets.length,
    moduleCount: moduleAssets.length,
    personaCount: embeddedAssets.length,
    enabledModuleIds,
  };
}

type ScoredAsset = RisuNamedAsset & { score: number; hits: string[] };

async function scoreAndReadAssets(
  assets: readonly RisuNamedAsset[],
  triggers: readonly string[],
): Promise<{
  scored: ScoredAsset[];
  packedRows: Array<{ name: string; plains: string[]; weightMap: Map<string, string> }>;
  attempts: number;
  attemptLog: Array<Record<string, unknown>>;
}> {
  const scored = assets
    .map((a) => {
      const s = scoreAssetName(a.name, triggers);
      return s ? { ...a, score: s.score, hits: s.hits } : null;
    })
    .filter(Boolean) as ScoredAsset[];

  const packedRows: Array<{ name: string; plains: string[]; weightMap: Map<string, string> }> = [];
  const attemptLog: Array<Record<string, unknown>> = [];
  const claimed = new Set<string>();
  let attempts = 0;

  const tryRead = async (asset: ScoredAsset): Promise<boolean> => {
    if (claimed.has(asset.key)) return false;
    if (packedRows.length >= MAX_ASSETS_HARD) return false;
    if (attempts >= MAX_READ_ATTEMPTS) return false;
    attempts += 1;

    let plains: string[];
    let weightMap: Map<string, string>;
    let fromCache = false;

    const cached = tagCache.get(asset.key);
    if (cached) {
      plains = cached.plains;
      weightMap = new Map(cached.weights);
      fromCache = true;
    } else {
      const bytes = await readAssetBytes(asset.key);
      if (!bytes?.length) {
        attemptLog.push({ name: asset.name, key: asset.key, ok: false, reason: 'read_empty' });
        return false;
      }
      const filtered = await tagsFromImageBytes(bytes);
      if (!filtered?.plains.length) {
        dbg('asset-tags.no_meta', { name: asset.name });
        attemptLog.push({ name: asset.name, key: asset.key, ok: false, reason: 'no_nai_meta', bytes: bytes.length });
        return false;
      }
      plains = filtered.plains;
      weightMap = filtered.weightMap;
      tagCache.set(asset.key, {
        plains,
        weights: [...weightMap.entries()],
      });
    }

    claimed.add(asset.key);
    packedRows.push({ name: asset.name, plains, weightMap });
    attemptLog.push({
      name: asset.name,
      key: asset.key,
      ok: true,
      from_cache: fromCache,
      plains: plains.length,
      hits: asset.hits,
      score: asset.score,
    });
    return true;
  };

  // Prefer the planned picks (exact/normal first), then fall through the rest of that trigger's pool.
  const planned = new Set(pickAssetsPerTrigger(scored, triggers, ASSETS_PER_TRIGGER).map((a) => a.key));
  for (const tr of orderTriggersForAssetPick(triggers)) {
    if (packedRows.length >= MAX_ASSETS_HARD) break;
    const pool = scored
      .filter((a) => a.hits.includes(tr))
      .sort((a, b) => {
        const pa = planned.has(a.key) ? 1 : 0;
        const pb = planned.has(b.key) ? 1 : 0;
        if (pb !== pa) return pb - pa;
        return (
          assetPriorityForTrigger(b.name, tr) - assetPriorityForTrigger(a.name, tr)
          || a.name.localeCompare(b.name)
        );
      });
    let got = 0;
    for (const asset of pool) {
      if (got >= ASSETS_PER_TRIGGER) break;
      if (await tryRead(asset)) got += 1;
    }
  }

  return { scored, packedRows, attempts, attemptLog };
}

/**
 * Match lore triggers to character + active-module assets, read NAI metadata, pack common+unique.
 * Returns null when nothing usable was found.
 */
export async function collectAssetNaiTags(triggerKeys: readonly unknown[]): Promise<AssetTagCollectResult | null> {
  const triggers = assetMatchTriggers(triggerKeys);
  if (!triggers.length) {
    dbg('asset-tags.skip', { reason: 'no_long_triggers' });
    return null;
  }
  if (!hostHas('getCharacter') || !hostHas('readImage')) {
    dbg('asset-tags.skip', { reason: 'host_api_missing' });
    return null;
  }

  let character: unknown;
  try {
    character = await risuHost()!.getCharacter!();
  } catch (err) {
    dbg('asset-tags.getCharacter.fail', { message: String((err as Error)?.message || err) }, 'warn');
    return null;
  }

  const pool = await listSearchableAssets(character);
  if (!pool.assets.length) {
    dbg('asset-tags.skip', { reason: 'no_assets' });
    return null;
  }

  const { scored, packedRows, attempts } = await scoreAndReadAssets(pool.assets, triggers);

  if (!packedRows.length) {
    dbg('asset-tags.skip', { reason: 'no_meta_hits', matched: scored.length, attempts });
    return null;
  }

  const packed = packAssetTagGroups(packedRows);
  const weightMap = mergeWeightMaps(packed.weightMap);
  lastWeightMap = weightMap;
  const block = formatAssetTagsInjectBlock(packed);
  dbg('asset-tags.done', {
    assets: packed.assets.map((a) => a.name),
    pool: pool.assets.length,
    common: packed.common.length,
    unique: packed.assets.reduce((n, a) => n + a.unique.length, 0),
  });
  return { block, packed, weightMap };
}

/**
 * Debug probe: same pipeline as collect, but always returns a readable report.
 */
export async function probeAssetNaiTags(body: Record<string, unknown> = {}): Promise<ApiResult> {
  const message = cleanText(body.message ?? body.text ?? '', 20000);
  const lorebook = (Array.isArray(body.lorebook) ? body.lorebook : []) as LoreEntry[];
  const uiKeys = Array.isArray(body.lore_trigger_keys)
    ? body.lore_trigger_keys.map((k) => cleanText(k, 200)).filter(Boolean)
    : [];
  const backendKeys = collectTriggeredLoreKeys(lorebook, message);
  const triggerPool = [...uiKeys, ...backendKeys];
  const matchTriggers = assetMatchTriggers(triggerPool);
  const card = getConfig().card;
  const settingOn = card.asset_nai_tags === true;

  const report: Record<string, unknown> = {
    setting_asset_nai_tags: settingOn,
    message_preview: message.slice(0, 240),
    message_len: message.length,
    lorebook_entries: lorebook.length,
    lore_trigger_keys_ui: uiKeys,
    lore_trigger_keys_backend: backendKeys,
    asset_match_triggers: matchTriggers,
    note: 'per trigger ≤2 assets; prefer exact/normal/default names; Hangul any length; Latin/Hanja ≥3',
  };

  if (!message) {
    report.skip = 'no_message';
    return { ok: true, report };
  }
  if (!matchTriggers.length) {
    report.skip = 'no_long_triggers';
    return { ok: true, report };
  }
  if (!hostHas('getCharacter') || !hostHas('readImage')) {
    report.skip = 'host_api_missing';
    report.host = {
      getCharacter: hostHas('getCharacter'),
      readImage: hostHas('readImage'),
      getDatabase: hostHas('getDatabase'),
    };
    return { ok: true, report };
  }

  let character: unknown;
  try {
    character = await risuHost()!.getCharacter!();
  } catch (err) {
    report.skip = 'getCharacter_fail';
    report.error = String((err as Error)?.message || err);
    return { ok: false, message: report.error as string, report };
  }

  const pool = await listSearchableAssets(character);
  report.pool = {
    total: pool.assets.length,
    character: pool.characterCount,
    module: pool.moduleCount,
    persona: pool.personaCount,
    enabled_module_ids: pool.enabledModuleIds,
    sample_names: pool.assets.slice(0, 40).map((a) => a.name),
  };

  if (!pool.assets.length) {
    report.skip = 'no_assets';
    return { ok: true, report };
  }

  const { scored, packedRows, attempts, attemptLog } = await scoreAndReadAssets(pool.assets, matchTriggers);
  report.name_matches = scored.slice(0, 20).map((a) => ({
    name: a.name,
    key: a.key,
    score: a.score,
    hits: a.hits,
  }));
  report.read_attempts = attempts;
  report.read_log = attemptLog;
  report.picked = packedRows.map((r) => ({
    name: r.name,
    plains_count: r.plains.length,
    plains_sample: r.plains.slice(0, 12),
  }));

  if (!packedRows.length) {
    report.skip = 'no_meta_hits';
    return { ok: true, report };
  }

  const packed = packAssetTagGroups(packedRows);
  report.packed = {
    common: packed.common,
    assets: packed.assets.map((a) => ({ name: a.name, unique: a.unique })),
  };
  report.inject_block_preview = formatAssetTagsInjectBlock(packed).slice(0, 2000);
  report.ok_picked = packedRows.length;
  return { ok: true, report };
}
