/**
 * Collect NovelAI tags from Risu character additionalAssets for tagger inject.
 */
import { dbg } from '../core/debug';
import { hostHas, risuHost } from '../core/host';
import {
  formatAssetTagsInjectBlock,
  mergeWeightMaps,
  packAssetTagGroups,
  tagsFromImageBytes,
  type PackedAssetTags,
} from '../domain/nai-meta/index.ts';
import { assetMatchTriggers, scoreAssetName } from '../domain/nai-meta/match.ts';
import { asU8 } from '../core/util/bytes.ts';
import { cleanText } from '../core/util/text.ts';

const MAX_ASSETS = 4;
/** Cap how many name-matched candidates we try to read before giving up. */
const MAX_READ_ATTEMPTS = 12;

export interface AssetTagCollectResult {
  block: string;
  packed: PackedAssetTags;
  weightMap: Map<string, string>;
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

interface RisuAsset {
  name: string;
  key: string;
}

function listAdditionalAssets(character: unknown): RisuAsset[] {
  const c = character && typeof character === 'object' ? (character as Record<string, unknown>) : null;
  const raw = c?.additionalAssets ?? c?.additional_assets;
  if (!Array.isArray(raw)) return [];
  const out: RisuAsset[] = [];
  for (const row of raw) {
    if (Array.isArray(row)) {
      const name = cleanText(row[0], 400);
      const key = cleanText(row[1], 800);
      if (name && key) out.push({ name, key });
      continue;
    }
    if (row && typeof row === 'object') {
      const r = row as Record<string, unknown>;
      const name = cleanText(r.name ?? r.assetName ?? r.fileName, 400);
      const key = cleanText(r.key ?? r.path ?? r.id ?? r.asset, 800);
      if (name && key) out.push({ name, key });
    }
  }
  return out;
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

/**
 * Match lore triggers to character assets, read NAI metadata, pack common+unique.
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

  const assets = listAdditionalAssets(character);
  if (!assets.length) {
    dbg('asset-tags.skip', { reason: 'no_assets' });
    return null;
  }

  const scored = assets
    .map((a) => {
      const s = scoreAssetName(a.name, triggers);
      return s ? { ...a, score: s.score, hits: s.hits } : null;
    })
    .filter(Boolean) as Array<RisuAsset & { score: number; hits: string[] }>;
  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  const packedRows: Array<{ name: string; plains: string[]; weightMap: Map<string, string> }> = [];
  let attempts = 0;
  for (const asset of scored) {
    if (packedRows.length >= MAX_ASSETS) break;
    if (attempts >= MAX_READ_ATTEMPTS) break;
    attempts += 1;

    const cacheKey = asset.key;
    let plains: string[];
    let weightMap: Map<string, string>;

    const cached = tagCache.get(cacheKey);
    if (cached) {
      plains = cached.plains;
      weightMap = new Map(cached.weights);
    } else {
      const bytes = await readAssetBytes(asset.key);
      if (!bytes?.length) continue;
      const filtered = await tagsFromImageBytes(bytes);
      if (!filtered?.plains.length) {
        dbg('asset-tags.no_meta', { name: asset.name });
        continue;
      }
      plains = filtered.plains;
      weightMap = filtered.weightMap;
      tagCache.set(cacheKey, {
        plains,
        weights: [...weightMap.entries()],
      });
    }

    packedRows.push({ name: asset.name, plains, weightMap });
  }

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
    common: packed.common.length,
    unique: packed.assets.reduce((n, a) => n + a.unique.length, 0),
  });
  return { block, packed, weightMap };
}
