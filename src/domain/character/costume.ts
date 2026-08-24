/**
 * Named wardrobe sets on a character (clothes + weapons/props).
 *
 * Missing shot pick inherits the previous shot, then roster `active_costume`.
 * `attire` / `accessories` on the roster row remain the editing mirror.
 */

import type { CharacterCostume, CharacterRecord } from '../../core/types.ts';
import { cleanText } from '../../core/util/text.ts';

export type CostumeInput = Partial<CharacterCostume> & Record<string, unknown>;

const costumeKey = (value: unknown): string =>
  cleanText(value, 120).normalize('NFKC').toLocaleLowerCase().replace(/[\s_.·•･-]+/g, '');

/** Sanitize one costume row. Empty name → `default` when index is 0, else `costumeN`. */
export function normalizeCostume(raw: unknown, index = 0): CharacterCostume | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as CostumeInput;
  const attire = cleanText(row.attire ?? row.clothing ?? row.outfit ?? '', 4000);
  const accessories = cleanText(row.accessories ?? row.weapon ?? row.weapons ?? '', 4000);
  let name = cleanText(row.name ?? row.id ?? row.label ?? '', 80);
  if (!name) name = index === 0 ? 'default' : `costume${index}`;
  // Collapse spaces for LLM-facing ids; keep alnum-ish + underscore.
  name = name.replace(/\s+/g, '').replace(/[^a-zA-Z0-9_\uac00-\ud7a3-]+/g, '') || (index === 0 ? 'default' : `costume${index}`);
  const note = cleanText(row.note ?? row.description ?? row.desc ?? '', 200);
  return { name, note, attire, accessories };
}

/**
 * Ensure a non-empty costumes array. Missing → one `default` from attire/accessories.
 * Clamps `active_costume` into range.
 */
export function ensureCostumes(
  rec: Partial<CharacterRecord> | null | undefined,
): { costumes: CharacterCostume[]; active_costume: number } {
  const attire = cleanText(rec?.attire || '', 4000);
  const accessories = cleanText(rec?.accessories || '', 4000);
  const rawList = Array.isArray(rec?.costumes) ? rec!.costumes! : [];
  const costumes: CharacterCostume[] = [];
  for (let i = 0; i < rawList.length; i++) {
    const c = normalizeCostume(rawList[i], i);
    if (c) costumes.push(c);
  }
  if (!costumes.length) {
    costumes.push({ name: 'default', note: '', attire, accessories });
  } else if (!costumes[0]!.name) {
    costumes[0]!.name = 'default';
  }
  let active = Number(rec?.active_costume);
  if (!Number.isFinite(active)) active = 0;
  active = Math.max(0, Math.min(costumes.length - 1, Math.floor(active)));
  return { costumes, active_costume: active };
}

/** Promote current wear to index 0; previous default shifts to index 1. */
export function promoteCostumeToDefault(
  costumes: CharacterCostume[],
  wear: { attire?: unknown; accessories?: unknown; name?: unknown; note?: unknown },
): CharacterCostume[] {
  const next = normalizeCostume(
    {
      name: wear.name || 'default',
      note: wear.note || '',
      attire: wear.attire,
      accessories: wear.accessories,
    },
    0,
  ) || {
    name: 'default',
    note: '',
    attire: cleanText(wear.attire, 4000),
    accessories: cleanText(wear.accessories, 4000),
  };
  next.name = 'default';
  const prev = Array.isArray(costumes) ? costumes.map((c) => ({ ...c })) : [];
  const shifted = prev.length ? [{ ...prev[0]!, name: prev[0]!.name === 'default' ? 'previous' : prev[0]!.name }, ...prev.slice(1)] : [];
  const seen = new Set([costumeKey(next.name)]);
  const out = [next];
  for (const c of shifted) {
    const k = costumeKey(c.name);
    if (k && seen.has(k)) continue;
    if (k) seen.add(k);
    out.push(c);
  }
  return out;
}

/**
 * Parse shot.costume: number, "2", "swimsuit", "swimsuit[2]".
 * Returns index into costumes, or -1 if unreadable → caller uses 0.
 */
export function resolveCostumeIndex(
  costumes: CharacterCostume[] | null | undefined,
  pick: unknown,
): number {
  const list = Array.isArray(costumes) && costumes.length ? costumes : null;
  if (!list) return -1;
  if (pick == null || pick === '') return -1;

  if (typeof pick === 'number' && Number.isFinite(pick)) {
    const i = Math.floor(pick);
    return i >= 0 && i < list.length ? i : -1;
  }

  const text = cleanText(pick, 120);
  if (!text) return -1;

  const bracket = text.match(/^(.*?)\[(\d+)\]\s*$/);
  if (bracket) {
    const idx = Number(bracket[2]);
    if (Number.isFinite(idx) && idx >= 0 && idx < list.length) return idx;
    const byName = costumeKey(bracket[1]);
    if (byName) {
      const found = list.findIndex((c) => costumeKey(c.name) === byName);
      if (found >= 0) return found;
    }
    return -1;
  }

  if (/^\d+$/.test(text)) {
    const idx = Number(text);
    return idx >= 0 && idx < list.length ? idx : -1;
  }

  const want = costumeKey(text);
  if (!want) return -1;
  return list.findIndex((c) => costumeKey(c.name) === want);
}

/**
 * Wear for a shot. Missing pick → previous pick → roster `active_costume`.
 * Index 0 only when that is the active/previous slot — not a silent default.
 */
export function resolveCostumeWear(
  stored: Partial<CharacterRecord> | null | undefined,
  pick: unknown,
  previousPick: unknown = undefined,
): { attire: string; accessories: string; index: number; name: string } {
  const { costumes, active_costume } = ensureCostumes(stored || {});
  let index = resolveCostumeIndex(costumes, pick);
  if (index < 0) index = resolveCostumeIndex(costumes, previousPick);
  if (index < 0) index = active_costume;
  if (index < 0 || index >= costumes.length) index = 0;
  const c = costumes[index]!;
  return {
    attire: cleanText(c.attire || '', 4000),
    accessories: cleanText(c.accessories || '', 4000),
    index,
    name: c.name,
  };
}

type ShotCostumeLike = { characters?: Array<{ name?: unknown; costume?: unknown } | null> | null };

function costumePickReadable(pick: unknown): boolean {
  if (pick == null || pick === '') return false;
  if (typeof pick === 'number') return Number.isFinite(pick);
  return Boolean(cleanText(pick, 120));
}

/**
 * Walk shots like wear_state. Empty / omitted `costume` inherit the running
 * pick, then roster `active_costume`. Bakes that pick onto each char.
 */
export function applyCostumeContinuityToShots<T extends ShotCostumeLike>(
  shots: T[],
  previousForName: (name: string) => unknown,
): Map<string, unknown> {
  const running = new Map<string, unknown>();
  const last = new Map<string, unknown>();
  for (const shot of shots || []) {
    const chars = Array.isArray(shot.characters) ? shot.characters : [];
    for (const ch of chars) {
      if (!ch || typeof ch !== 'object') continue;
      const name = cleanText(ch.name, 200);
      if (!name) continue;
      const key = name.toLowerCase();
      const next = costumePickReadable(ch.costume)
        ? ch.costume
        : (running.has(key) ? running.get(key) : previousForName(name));
      if (costumePickReadable(next)) {
        ch.costume = next as string | number;
        running.set(key, next);
        last.set(key, next);
      }
    }
  }
  return last;
}

/** Compact catalog line for LLM inject: `default[0] casual; swimsuit[1] beach`. */
export function formatCostumeCatalog(costumes: CharacterCostume[] | null | undefined): string {
  const { costumes: list } = ensureCostumes({ costumes: costumes || [] });
  return list
    .map((c, i) => {
      const note = cleanText(c.note, 80);
      return note ? `${c.name}[${i}] ${note}` : `${c.name}[${i}]`;
    })
    .join('; ');
}

/**
 * Merge incoming costume rows into existing. Never overwrites index 0 when
 * `protectDefault` (filled characters). Same-name rows deepen tags if longer.
 */
export function mergeCostumeLists(
  existing: CharacterCostume[] | null | undefined,
  incoming: unknown,
  opts: { protectDefault?: boolean } = {},
): CharacterCostume[] {
  const base = ensureCostumes({ costumes: existing || [] }).costumes;
  const rawIn = Array.isArray(incoming) ? incoming : [];
  if (!rawIn.length) return base;

  const out = base.map((c) => ({ ...c }));
  const indexByName = new Map<string, number>();
  for (let i = 0; i < out.length; i++) {
    const k = costumeKey(out[i]!.name);
    if (k && !indexByName.has(k)) indexByName.set(k, i);
  }

  for (let i = 0; i < rawIn.length; i++) {
    const next = normalizeCostume(rawIn[i], out.length);
    if (!next) continue;
    const k = costumeKey(next.name);
    const hit = k ? indexByName.get(k) : undefined;
    if (hit != null) {
      if (opts.protectDefault && hit === 0) {
        if (!cleanText(out[0]!.attire) && next.attire) out[0]!.attire = next.attire;
        if (!cleanText(out[0]!.accessories) && next.accessories) out[0]!.accessories = next.accessories;
        if (!cleanText(out[0]!.note) && next.note) out[0]!.note = next.note;
        continue;
      }
      if (next.attire.length > cleanText(out[hit]!.attire).length) out[hit]!.attire = next.attire;
      if (next.accessories.length > cleanText(out[hit]!.accessories).length) {
        out[hit]!.accessories = next.accessories;
      }
      if (next.note && !cleanText(out[hit]!.note)) out[hit]!.note = next.note;
      continue;
    }
    if (
      opts.protectDefault
      && out.length === 1
      && !cleanText(out[0]!.attire)
      && !cleanText(out[0]!.accessories)
    ) {
      if (costumeKey(next.name) === 'default' || i === 0) {
        out[0] = next;
        indexByName.set(costumeKey(out[0].name), 0);
        continue;
      }
    }
    indexByName.set(k || `idx${out.length}`, out.length);
    out.push(next);
  }
  return out;
}

/** Sync active slot from attire/accessories textareas; keep other slots. */
export function syncActiveCostumeFromWear(
  costumes: CharacterCostume[],
  active: number,
  wear: { attire?: unknown; accessories?: unknown },
): CharacterCostume[] {
  const { costumes: list, active_costume } = ensureCostumes({ costumes, active_costume: active });
  const out = list.map((c) => ({ ...c }));
  const i = active_costume;
  out[i] = {
    ...out[i]!,
    attire: cleanText(wear.attire, 4000),
    accessories: cleanText(wear.accessories, 4000),
  };
  return out;
}
