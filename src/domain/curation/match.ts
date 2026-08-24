/** Cosine similarity matching for curation embed-snap. Pure — no I/O. */
import { inferCurationSlot, type CurationSlot } from './catalog';

export interface EmbeddedItem {
  key: string;
  groupId: string;
  optionId: string;
  tags: string;
  vector: number[];
  /** When missing (old stores), inferred from groupId at snap time. */
  slot?: CurationSlot;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return -1;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na <= 0 || nb <= 0) return -1;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Snap a query vector to the nearest catalog item.
 * Prefer same groupId when provided and a match beats `minScore`.
 */
export function matchNearest(
  query: number[],
  items: readonly EmbeddedItem[],
  opts?: { groupId?: string; minScore?: number },
): EmbeddedItem | null {
  const minScore = opts?.minScore ?? 0.35;
  const prefer = clean(opts?.groupId);
  let best: EmbeddedItem | null = null;
  let bestScore = -1;
  let bestPrefer: EmbeddedItem | null = null;
  let bestPreferScore = -1;
  for (const item of items) {
    const score = cosineSimilarity(query, item.vector);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
    if (prefer && item.groupId === prefer && score > bestPreferScore) {
      bestPreferScore = score;
      bestPrefer = item;
    }
  }
  if (bestPrefer && bestPreferScore >= minScore) return bestPrefer;
  if (best && bestScore >= minScore) return best;
  return null;
}

function itemSlot(item: EmbeddedItem): CurationSlot {
  return item.slot || inferCurationSlot(item.groupId);
}

/**
 * Snap freeform scene tag tokens to catalog tags.
 * Routes snapped items by slot; unsapped freeform stays in baseTags.
 */
export function snapSceneTokens(
  tokens: string[],
  queryVectors: Array<number[] | null | undefined>,
  items: readonly EmbeddedItem[],
  minScore = 0.4,
): {
  tags: string[];
  baseTags: string[];
  charTags: string[];
  primaryTags: string[];
  secondaryTags: string[];
  femaleTags: string[];
  maleTags: string[];
  snapped: number;
  kept: number;
} {
  const tags: string[] = [];
  const baseTags: string[] = [];
  const charTags: string[] = [];
  const primaryTags: string[] = [];
  const secondaryTags: string[] = [];
  const femaleTags: string[] = [];
  const maleTags: string[] = [];
  let snapped = 0;
  let kept = 0;
  const pushSlot = (slot: CurationSlot, value: string) => {
    if (slot === 'base') baseTags.push(value);
    else if (slot === 'primary') primaryTags.push(value);
    else if (slot === 'secondary') secondaryTags.push(value);
    else if (slot === 'female') femaleTags.push(value);
    else if (slot === 'male') maleTags.push(value);
    else charTags.push(value);
  };
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!.trim();
    if (!token) continue;
    const vec = queryVectors[i];
    if (!vec || !vec.length) {
      tags.push(token);
      baseTags.push(token);
      kept += 1;
      continue;
    }
    const hit = matchNearest(vec, items, { minScore });
    if (hit) {
      tags.push(hit.tags);
      pushSlot(itemSlot(hit), hit.tags);
      snapped += 1;
    } else {
      tags.push(token);
      baseTags.push(token);
      kept += 1;
    }
  }
  return {
    tags,
    baseTags,
    charTags,
    primaryTags,
    secondaryTags,
    femaleTags,
    maleTags,
    snapped,
    kept,
  };
}

/** Split a comma/weight-aware tag string into snap units (keeps `n::...::` blocks). */
export function splitSceneTagUnits(text: string): string[] {
  const raw = String(text || '').trim();
  if (!raw) return [];
  const units: string[] = [];
  let buf = '';
  let depth = 0;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!;
    if (ch === ':' && raw[i + 1] === ':') {
      // weight open/close tracked loosely via ::
      depth += buf.includes('::') ? -1 : 1;
      buf += '::';
      i += 1;
      continue;
    }
    if (ch === ',' && depth <= 0) {
      const t = buf.trim();
      if (t) units.push(t);
      buf = '';
      continue;
    }
    buf += ch;
  }
  const last = buf.trim();
  if (last) units.push(last);
  return units;
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
