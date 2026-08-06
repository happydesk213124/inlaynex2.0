/**
 * Match lore trigger keys to Risu additionalAssets names (token-exact, min length 3).
 */
import { cleanText } from '../../core/util/text.ts';

const MIN_TRIGGER_LEN = 3;

/** Split an asset display name into matchable tokens. */
export function assetNameTokens(name: unknown): string[] {
  const base = cleanText(name, 400)
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .toLowerCase();
  if (!base) return [];
  return base
    .split(/[\s_\-/\\.|]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Lore trigger keys eligible for asset matching (≥3 chars after trim). */
export function assetMatchTriggers(triggers: readonly unknown[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of triggers) {
    const t = cleanText(raw, 200).toLowerCase();
    if (t.length < MIN_TRIGGER_LEN) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export interface AssetMatchScore {
  name: string;
  key: string;
  score: number;
  hits: string[];
}

/** Score how well an asset name matches trigger tokens (exact token hits). */
export function scoreAssetName(name: unknown, triggers: readonly string[]): AssetMatchScore | null {
  const display = cleanText(name, 400);
  if (!display) return null;
  const tokens = new Set(assetNameTokens(display));
  if (!tokens.size) return null;
  const hits: string[] = [];
  for (const tr of triggers) {
    if (tokens.has(tr)) hits.push(tr);
  }
  if (!hits.length) return null;
  return {
    name: display,
    key: display,
    score: hits.reduce((s, h) => s + h.length, 0) * 10 + hits.length,
    hits,
  };
}
