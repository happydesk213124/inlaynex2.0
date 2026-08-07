/**
 * Match lore trigger keys to Risu additionalAssets names.
 *
 * Matching is case-insensitive **substring contains** after compacting both
 * sides: space, `-`, `_`, and `.` are dropped (not split delimiters) so the
 * remaining characters are concatenated. e.g. `sen_oy-default` ↔ `senoy`.
 *
 * Hangul triggers may be short; Latin/Hanja-only keys still need length ≥3
 * on the compact form.
 *
 * Per-trigger pick order (higher first), up to {@link ASSETS_PER_TRIGGER}:
 * 1. Exact compact basename == compact trigger (e.g. `Senoy.webp`)
 * 2. Contains trigger + preferred look word (default/normal/profile/smile); shorter wins
 * 3. Contains trigger; shorter name wins
 */
import { cleanText } from '../../core/util/text.ts';
import type { CharacterInput } from '../character/identity.ts';
import { characterTriggers } from '../character/roster.ts';
import { characterHasAppearance } from '../character/tags.ts';

const MIN_LATIN_HANJA_LEN = 3;
/** Hangul syllables + jamo (covers NFD names before NFC normalize). */
const HANGUL_RE = /[\uac00-\ud7a3\u1100-\u11ff\u3130-\u318f]/;

/** Preferred look keywords in the filename (rank 2). Checked on compact text. */
const PREFERRED_LOOK = ['default', 'normal', 'profile', 'smile'] as const;

/** Max assets kept per lore trigger (with NAI meta). */
export const ASSETS_PER_TRIGGER = 2;

/**
 * Fold + drop separators that users treat as absent (space / - / _ / .).
 * Remaining characters are joined — do not use these as split points.
 */
export function compactAssetKey(value: unknown, max = 400): string {
  return cleanText(value, max)
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\s_\-.]/g, '');
}

/** Basename without extension, then compacted. */
export function assetBasenameCompact(name: unknown): string {
  const folded = cleanText(name, 400)
    .normalize('NFC')
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,5}$/i, '');
  return folded.replace(/[\s_\-.]/g, '');
}

/** @deprecated Prefer {@link assetBasenameCompact}. */
export function assetBasename(name: unknown): string {
  return cleanText(name, 400)
    .normalize('NFC')
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,5}$/i, '');
}

/** True when the key has Hangul — short Korean names are allowed. */
export function triggerHasHangul(key: string): boolean {
  return HANGUL_RE.test(key);
}

/** Lore trigger eligible for asset name matching (length checked after compact). */
export function isAssetMatchTrigger(key: unknown): boolean {
  const t = compactAssetKey(key, 200);
  if (!t) return false;
  if (triggerHasHangul(t)) return true;
  return t.length >= MIN_LATIN_HANJA_LEN;
}

/**
 * Drop lore triggers that belong to characters who already have looks.
 * Keep incomplete-character triggers and triggers that match nobody on the roster
 * (possible new cast). Empty roster → no filtering.
 */
export function filterAssetTriggersForUnfilledLooks(
  triggers: readonly unknown[],
  roster: readonly CharacterInput[] | null | undefined,
): string[] {
  const eligible = assetMatchTriggers(triggers);
  if (!roster?.length) return eligible;

  const filledKeys = new Set<string>();
  const incompleteKeys = new Set<string>();
  for (const char of roster) {
    const keys = characterTriggers(char)
      .map((t) => compactAssetKey(t, 200))
      .filter((k) => k.length >= 2);
    if (characterHasAppearance(char)) {
      for (const k of keys) filledKeys.add(k);
    } else if (cleanText(char.name, 200)) {
      for (const k of keys) incompleteKeys.add(k);
    }
  }

  return eligible.filter((tr) => {
    const k = compactAssetKey(tr, 200);
    if (!k) return false;
    if (incompleteKeys.has(k)) return true;
    if (filledKeys.has(k)) return false;
    return true;
  });
}

/**
 * @deprecated Kept for older tests — matching no longer uses tokens.
 * Splits a folded basename on common separators (does not drive scoring).
 */
export function assetNameTokens(name: unknown): string[] {
  const base = assetBasename(name);
  if (!base) return [];
  return base
    .split(/[\s_\-/\\.|()]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Lore trigger keys eligible for asset matching (returned compacted + deduped). */
export function assetMatchTriggers(triggers: readonly unknown[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of triggers) {
    if (!isAssetMatchTrigger(raw)) continue;
    const t = compactAssetKey(raw, 200);
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/**
 * For each compact match trigger, collect original lore spellings for the inject block.
 *
 * 1. Raw keys that compact to the trigger (e.g. `Senoy` / `sen-oy` → `senoy`).
 * 2. If a fired lore entry contains any key that compacts to the trigger, **all** keys
 *    of that entry are included (so `Senoy` pulls `세노이` / `추기경` from the same row).
 */
export function loreKeysByCompactTrigger(
  rawTriggers: readonly unknown[],
  compactTriggers: readonly string[],
  relatedKeyGroups: readonly (readonly unknown[])[] = [],
): Map<string, string[]> {
  const allowed = new Set(
    compactTriggers.map((t) => compactAssetKey(t, 200)).filter(Boolean),
  );
  const out = new Map<string, string[]>();
  const seen = new Map<string, Set<string>>();

  const add = (compact: string, displayRaw: unknown) => {
    if (!allowed.has(compact)) return;
    const display = cleanText(displayRaw, 200);
    if (!display) return;
    let list = out.get(compact);
    let seenSet = seen.get(compact);
    if (!list) {
      list = [];
      seenSet = new Set();
      out.set(compact, list);
      seen.set(compact, seenSet!);
    }
    const fold = display.normalize('NFC').toLowerCase();
    if (seenSet!.has(fold)) return;
    seenSet!.add(fold);
    list.push(display);
  };

  for (const raw of rawTriggers) {
    const display = cleanText(raw, 200);
    if (!display) continue;
    const compact = compactAssetKey(display, 200);
    if (!compact) continue;
    add(compact, display);
  }

  for (const group of relatedKeyGroups) {
    const displays = (group || []).map((k) => cleanText(k, 200)).filter(Boolean);
    if (!displays.length) continue;
    const groupCompacts = new Set(
      displays.map((d) => compactAssetKey(d, 200)).filter((c) => c && allowed.has(c)),
    );
    if (!groupCompacts.size) continue;
    for (const compact of groupCompacts) {
      for (const display of displays) add(compact, display);
    }
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

function hasPreferredLook(compactBase: string): boolean {
  return PREFERRED_LOOK.some((w) => compactBase.includes(w));
}

/**
 * Priority within one trigger's candidate pool (higher = better).
 * 1 exact → 2 preferred look words → 3 shorter contains → 4 longer contains.
 */
export function assetPriorityForTrigger(name: unknown, trigger: string): number {
  const tr = compactAssetKey(trigger, 200);
  if (!tr) return -1;
  const base = assetBasenameCompact(name);
  if (!base.includes(tr)) return -1;

  const exact = base === tr;
  const preferred = hasPreferredLook(base);
  // Shorter basename wins among the same tier (cap length so scores stay ordered).
  const shortBonus = Math.max(0, 2_000 - base.length);

  if (exact) return 3_000_000 + shortBonus;
  if (preferred) return 2_000_000 + shortBonus;
  return 1_000_000 + shortBonus;
}

/** Score asset name vs triggers: compact contains, best trigger priority. */
export function scoreAssetName(name: unknown, triggers: readonly string[]): AssetMatchScore | null {
  const display = cleanText(name, 400);
  if (!display) return null;
  const base = assetBasenameCompact(display);
  if (!base) return null;
  const hits: string[] = [];
  for (const tr of triggers) {
    const folded = compactAssetKey(tr, 200);
    if (folded && base.includes(folded)) hits.push(folded);
  }
  if (!hits.length) return null;
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
