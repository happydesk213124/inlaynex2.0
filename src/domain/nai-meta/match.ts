/**
 * Match lore trigger keys to Risu additionalAssets names (token-exact).
 *
 * Hangul triggers may be 1–2 chars (나루, 이한). Latin/Hanja-only keys still
 * need length ≥3 so noise like "an" / single letters do not match.
 *
 * Selection prefers exact/near-exact names and `normal`/`default` outfit tokens,
 * and allocates up to {@link ASSETS_PER_TRIGGER} assets per trigger so one
 * character cannot fill the whole inject budget.
 */
import { cleanText } from '../../core/util/text.ts';

const MIN_LATIN_HANJA_LEN = 3;
/** Hangul syllables + jamo (covers NFD names before NFC normalize). */
const HANGUL_RE = /[\uac00-\ud7a3\u1100-\u11ff\u3130-\u318f]/;

/** Preferred “default look” tokens in asset filenames. */
const PREFERRED_OUTFIT = new Set([
  'normal',
  'default',
  'base',
  'neutral',
  'profile',
  '프로필',
]);

/** Max assets kept per lore trigger (with NAI meta). */
export const ASSETS_PER_TRIGGER = 2;

function foldAssetText(value: unknown, max: number): string {
  return cleanText(value, max).normalize('NFC').toLowerCase();
}

/** True when the key has Hangul — short Korean names are allowed. */
export function triggerHasHangul(key: string): boolean {
  return HANGUL_RE.test(key);
}

/** Lore trigger eligible for asset name matching. */
export function isAssetMatchTrigger(key: unknown): boolean {
  const t = foldAssetText(key, 200);
  if (!t) return false;
  if (triggerHasHangul(t)) return true;
  return t.length >= MIN_LATIN_HANJA_LEN;
}

/** Split an asset display name into matchable tokens. */
export function assetNameTokens(name: unknown): string[] {
  const base = foldAssetText(name, 400).replace(/\.[a-z0-9]{2,5}$/i, '');
  if (!base) return [];
  return base
    .split(/[\s_\-/\\.|]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Lore trigger keys eligible for asset matching. */
export function assetMatchTriggers(triggers: readonly unknown[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of triggers) {
    if (!isAssetMatchTrigger(raw)) continue;
    const t = foldAssetText(raw, 200);
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/**
 * Longer triggers first so `백주원` claims assets before short `주원`/`juwon`
 * aliases of the same cast member burn the per-trigger budget alone.
 */
export function orderTriggersForAssetPick(triggers: readonly string[]): string[] {
  return [...triggers].sort((a, b) => b.length - a.length || a.localeCompare(b));
}

export interface AssetMatchScore {
  name: string;
  key: string;
  score: number;
  hits: string[];
}

/**
 * Priority within one trigger's candidate pool (higher = better).
 * Exact name / trigger+normal|default beat long outfit suffixes.
 */
export function assetPriorityForTrigger(name: unknown, trigger: string): number {
  const tr = foldAssetText(trigger, 200);
  if (!tr) return -1;
  const tokens = assetNameTokens(name);
  if (!tokens.includes(tr)) return -1;

  const extras = tokens.filter((t) => t !== tr);
  const preferred = extras.filter((t) => PREFERRED_OUTFIT.has(t));
  const other = extras.filter((t) => !PREFERRED_OUTFIT.has(t));

  let score = tr.length * 10;
  // Bare `Juwon.png` / `나루.webp`
  if (tokens.length === 1) score += 100_000;
  // `Juwon_normal` / `나루_default` / `Juwon_프로필`
  if (preferred.length && other.length === 0) score += 50_000 + preferred.length * 1_000;
  else if (preferred.length) score += 20_000 + preferred.length * 500;
  // Fewer unrelated outfit tokens → closer to the trigger
  score += Math.max(0, 5_000 - other.length * 400);
  return score;
}

/** Score how well an asset name matches trigger tokens (exact token hits). */
export function scoreAssetName(name: unknown, triggers: readonly string[]): AssetMatchScore | null {
  const display = cleanText(name, 400);
  if (!display) return null;
  const tokens = new Set(assetNameTokens(display));
  if (!tokens.size) return null;
  const hits: string[] = [];
  for (const tr of triggers) {
    const folded = foldAssetText(tr, 200);
    if (tokens.has(folded)) hits.push(folded);
  }
  if (!hits.length) return null;
  // Prefer the best single-trigger priority among hits as the global sort key.
  const bestPri = Math.max(...hits.map((h) => assetPriorityForTrigger(display, h)));
  return {
    name: display,
    key: display,
    score: bestPri,
    hits,
  };
}

export interface RankedAssetCandidate {
  name: string;
  key: string;
  /** Storage key for read/cache (caller fills if different from name). */
  storageKey?: string;
  score: number;
  hits: string[];
}

/**
 * Pick up to {@link ASSETS_PER_TRIGGER} candidates per trigger (deduped by key).
 * Does not read image bytes — caller tries meta in this order.
 */
export function pickAssetsPerTrigger<T extends RankedAssetCandidate>(
  scored: readonly T[],
  triggers: readonly string[],
  perTrigger = ASSETS_PER_TRIGGER,
): T[] {
  const orderedTriggers = orderTriggersForAssetPick(triggers);
  const picked: T[] = [];
  const seen = new Set<string>();

  for (const tr of orderedTriggers) {
    const pool = scored
      .filter((a) => a.hits.includes(tr) && !seen.has(a.key))
      .sort(
        (a, b) =>
          assetPriorityForTrigger(b.name, tr) - assetPriorityForTrigger(a.name, tr)
          || a.name.localeCompare(b.name),
      );

    let got = 0;
    for (const asset of pool) {
      if (got >= perTrigger) break;
      if (seen.has(asset.key)) continue;
      seen.add(asset.key);
      picked.push(asset);
      got += 1;
    }
  }
  return picked;
}
