/**
 * Character identity: name normalisation, surname/given-name matching, and the
 * folded roster view.
 *
 * Korean and English spellings of one person must fold together, while two
 * people who merely share a surname must stay apart. Everything here encodes
 * that single rule and the unit tests pin it.
 *
 * The local `clean`/`key` helpers are deliberately *not* `cleanText` from
 * core/util/text: they collapse newlines into single spaces and skip the
 * blank-line/NUL handling, which is what the identity keys have always been
 * built from. Swapping them changes matching.
 */
import type { CharacterRecord } from '../../core/types.ts';

/** A roster row as it arrives from storage, the UI or an LLM — every field optional. */
export type CharacterInput = Partial<CharacterRecord>;

/** A row after `migrateCharacter`: identity fields are guaranteed present. */
export type MigratedCharacter = CharacterInput & {
  id: string;
  name: string;
  aliases: string[];
  surname: string;
  given_name: string;
  surname_variants: string[];
  given_name_variants: string[];
  priority: number;
  attire_locked: boolean;
  accessories_locked: boolean;
  schema_version: number;
};

/** The three buckets `mergeCharacterView` reports. */
export interface CharacterView {
  records: MigratedCharacter[];
  active: MigratedCharacter[];
  groups: MigratedCharacter[][];
}

const clean = (value: unknown): string => String(value ?? '').trim().replace(/\s+/g, ' ');
const key = (value: unknown): string =>
  clean(value).normalize('NFKC').toLocaleLowerCase().replace(/[\s_.·•･-]+/g, '');

function list(value: unknown): string[] {
  const input = Array.isArray(value) ? value : String(value ?? '').split(/[,/\n]/);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of input) {
    const text = clean(item);
    const normalized = key(text);
    if (!text || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(text);
  }
  return out;
}

function inferLatinName(name: unknown): { surname: string; given_name: string } {
  const parts = clean(name).split(' ').filter(Boolean);
  if (
    parts.length !== 2
    || !parts.every((part) => /^[A-Za-z'-]+$/.test(part))
    || !parts.every((part) => part === part.toUpperCase())
  ) {
    return { surname: '', given_name: '' };
  }
  return { surname: parts[0], given_name: parts[1] };
}

/** Normalises a roster row to schema 2, inferring `SURNAME GIVEN` from all-caps Latin names. */
export function migrateCharacter(raw: CharacterInput = {}): MigratedCharacter {
  const name = clean(raw.name);
  const inferred = inferLatinName(name);
  return {
    ...raw,
    id: clean(raw.id) || name,
    name,
    aliases: list(raw.aliases),
    surname: clean(raw.surname) || inferred.surname,
    given_name: clean(raw.given_name) || inferred.given_name,
    surname_variants: list(raw.surname_variants),
    given_name_variants: list(raw.given_name_variants),
    priority: Number.isFinite(Number(raw.priority)) ? Number(raw.priority) : 0,
    attire_locked: raw.attire_locked === true,
    accessories_locked: raw.accessories_locked === true,
    schema_version: 2,
  };
}

function partKeys(
  character: CharacterInput,
  field: 'surname' | 'given_name',
  variantsField: 'surname_variants' | 'given_name_variants',
): Set<string> {
  const char = migrateCharacter(character);
  return new Set(list([char[field], ...(char[variantsField] || [])]).map(key).filter(Boolean));
}

/** Surname + given both overlap (KR/EN variants count). Alias-only overlap does NOT merge. */
export function sameFullNameIdentity(a: CharacterInput, b: CharacterInput): boolean {
  const left = migrateCharacter(a);
  const right = migrateCharacter(b);
  const aSur = partKeys(left, 'surname', 'surname_variants');
  const bSur = partKeys(right, 'surname', 'surname_variants');
  const aGiven = partKeys(left, 'given_name', 'given_name_variants');
  const bGiven = partKeys(right, 'given_name', 'given_name_variants');
  if (!aSur.size || !bSur.size || !aGiven.size || !bGiven.size) return false;
  const surnameHit = [...aSur].some((token) => bSur.has(token));
  const givenHit = [...aGiven].some((token) => bGiven.has(token));
  return surnameHit && givenHit;
}

/**
 * True when two roster rows are the same person for cascade delete.
 * Matches id, full-name identity, or any shared fullName/alias key.
 */
export function characterMatchesIdentity(
  a: CharacterInput | null | undefined,
  b: CharacterInput | null | undefined,
): boolean {
  if (!a || !b) return false;
  const left = migrateCharacter(a);
  const right = migrateCharacter(b);
  if (left.id && right.id && String(left.id) === String(right.id)) return true;
  if (sameFullNameIdentity(left, right)) return true;
  const leftKeys = fullNameKeys(left);
  const rightKeys = fullNameKeys(right);
  for (const token of leftKeys) {
    if (rightKeys.has(token)) return true;
  }
  return false;
}

function fullNameKeys(character: CharacterInput): Set<string> {
  const char = migrateCharacter(character);
  const out = new Set<string>();
  const add = (value: unknown): void => {
    const normalized = key(value);
    if (normalized) out.add(normalized);
  };
  add(char.name);
  const surnameKeys = new Set(list([char.surname, ...char.surname_variants]).map(key));
  for (const alias of char.aliases) {
    if (!surnameKeys.has(key(alias))) add(alias);
  }
  const surnames = list([char.surname, ...char.surname_variants]);
  const givenNames = list([char.given_name, ...char.given_name_variants]);
  for (const surname of surnames) {
    for (const given of givenNames) {
      add(`${surname} ${given}`);
      add(`${surname}${given}`);
      add(`${given} ${surname}`);
    }
  }
  return out;
}

/** Resolves a name to exactly one character; ambiguous or unknown names return null. */
export function resolveCharacterIdentity(
  name: unknown,
  characters: CharacterInput[] = [],
): MigratedCharacter | null {
  const target = key(name);
  if (!target) return null;
  const matches = characters
    .map((character) => migrateCharacter(character))
    .filter((character) => fullNameKeys(character).has(target));
  if (matches.length !== 1) return null;
  return matches[0];
}

function comparePriority(a: MigratedCharacter, b: MigratedCharacter): number {
  const priority = Number(b.priority || 0) - Number(a.priority || 0);
  if (priority) return priority;
  const created = Number(a.created_at || a.updated_at || 0) - Number(b.created_at || b.updated_at || 0);
  if (created) return created;
  return String(a.id).localeCompare(String(b.id));
}

function unionList(...parts: unknown[][]): string[] {
  return list(parts.flat());
}

/** Fold group into one display record. Source records stay in `records` — this does not delete. */
function foldGroup(group: MigratedCharacter[]): MigratedCharacter {
  const sorted = [...group].sort(comparePriority);
  const best: MigratedCharacter = { ...sorted[0] };
  best.aliases = unionList(...sorted.map((entry) => [entry.name, ...(entry.aliases || [])]));
  best.surname_variants = unionList(...sorted.map((entry) => [entry.surname, ...(entry.surname_variants || [])]));
  best.given_name_variants = unionList(...sorted.map((entry) => [entry.given_name, ...(entry.given_name_variants || [])]));
  if (!best.surname) best.surname = sorted.map((entry) => entry.surname).find(Boolean) || '';
  if (!best.given_name) best.given_name = sorted.map((entry) => entry.given_name).find(Boolean) || '';
  for (const entry of sorted) {
    const appearance = clean(entry.appearance || '');
    const attire = clean(entry.attire || '');
    const accessories = clean(entry.accessories || '');
    const original = clean(entry.original || '');
    if (appearance.length > clean(best.appearance || '').length) best.appearance = appearance;
    if (!best.attire_locked && attire.length > clean(best.attire || '').length) best.attire = attire;
    if (!best.accessories_locked && accessories.length > clean(best.accessories || '').length) best.accessories = accessories;
    if (original && !clean(best.original || '')) best.original = original;
  }
  // Prefer non-empty surname/given from the priority winner, else any member.
  best.surname = clean(best.surname) || sorted.map((entry) => clean(entry.surname)).find(Boolean) || '';
  best.given_name = clean(best.given_name) || sorted.map((entry) => clean(entry.given_name)).find(Boolean) || '';
  return best;
}

/** Groups rows that are the same person and folds each group into one display record. */
export function mergeCharacterView(characters: CharacterInput[] = []): CharacterView {
  const records = characters.map((character) => migrateCharacter(character));
  const groups: MigratedCharacter[][] = [];
  const assigned = new Set<number>();
  for (let i = 0; i < records.length; i++) {
    if (assigned.has(i)) continue;
    const group = [records[i]];
    assigned.add(i);
    for (let j = i + 1; j < records.length; j++) {
      if (assigned.has(j)) continue;
      if (group.some((member) => sameFullNameIdentity(member, records[j]))) {
        assigned.add(j);
        group.push(records[j]);
      }
    }
    groups.push(group);
  }
  const active = groups.map(foldGroup);
  return { records, active, groups };
}

/** Writes a new attire unless the row is attire-locked. */
export function applyAttireUpdate(character: CharacterInput, nextAttire: unknown): MigratedCharacter {
  const migrated = migrateCharacter(character);
  if (migrated.attire_locked) return migrated;
  return { ...migrated, attire: clean(nextAttire) };
}

/** Writes new accessories unless the row is accessories-locked. */
export function applyAccessoriesUpdate(
  character: CharacterInput,
  nextAccessories: unknown,
): MigratedCharacter {
  const migrated = migrateCharacter(character);
  if (migrated.accessories_locked) return migrated;
  return { ...migrated, accessories: clean(nextAccessories) };
}
