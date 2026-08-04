/**
 * Roster operations: trigger aliases, name → character resolution, cast dedupe
 * and the session/global merge used for tagging and generation.
 *
 * Every identity decision is delegated to identity.ts. The 1.x build could not
 * import across files, so it reached the identity module through
 * `globalThis.__INLAY_IDENTITY__` and carried an inline duplicate as a fallback;
 * both are gone — this module imports the real thing.
 */
import type { ShotCharacter } from '../../core/types.ts';
import { cleanText, compactText, hashCode, joinTags, normalizeAlias, parseAliasList } from '../../core/util/text.ts';
import type { CharacterInput, MigratedCharacter } from './identity.ts';
import { mergeCharacterView, migrateCharacter, resolveCharacterIdentity } from './identity.ts';
import { splitLookTags } from './tags.ts';

/** Injected helpers for `mergeSessionAndGlobalRoster`; every one has a no-op default. */
export interface RosterMergeHelpers {
  hasAppearance?: (char: CharacterInput | null | undefined) => boolean;
  resolve?: (name: unknown, list: CharacterInput[]) => CharacterInput | null;
  aliasKeys?: (char: CharacterInput | null | undefined) => Set<string>;
  normalizeName?: (name: unknown) => string;
  fullTags?: (char: CharacterInput) => string;
  clean?: (value: unknown, limit?: number) => string;
  globalScope?: string;
}

/** Every name a message can mention to summon this character; bare surnames excluded. */
export function characterTriggers(char: CharacterInput | null | undefined): string[] {
  const migrated = migrateCharacter(char || {});
  const out = parseAliasList([migrated.name, ...(migrated.aliases || [])]);
  const surnames = parseAliasList([migrated.surname, ...(migrated.surname_variants || [])]);
  const givenNames = parseAliasList([migrated.given_name, ...(migrated.given_name_variants || [])]);
  for (const surname of surnames) {
    for (const given of givenNames) {
      out.push(`${surname} ${given}`, `${surname}${given}`, `${given} ${surname}`);
    }
  }
  return parseAliasList(out).filter((token) => {
    const isSurnameOnly = surnames.some((surname) => normalizeAlias(surname) === normalizeAlias(token));
    return !isSurnameOnly;
  });
}

/** Resolves a name against a roster; ambiguous names resolve to nothing. */
export function resolveCharacter(
  name: unknown,
  characters: CharacterInput[] | null | undefined,
): MigratedCharacter | null {
  return resolveCharacterIdentity(name, characters || []);
}

/** Merge duplicate cast entries that resolve to the same roster/name alias (LLM sometimes doubles char1/char2). */
export function dedupeShotCharacters(
  chars: ShotCharacter[] | null | undefined,
  roster: CharacterInput[] | null | undefined,
  charMax: unknown = 6,
): ShotCharacter[] {
  const limit = Math.max(1, Math.min(6, Number(charMax) || 6));
  const out: Array<ShotCharacter & { _dedupeKey: string }> = [];
  const seen = new Set<string>();
  const mergeFields = (dst: Record<string, unknown>, src: ShotCharacter): Record<string, unknown> => {
    if (!dst || !src) return dst;
    for (const field of ['action', 'expression', 'attire', 'accessories', 'appearance', 'label', 'age', 'body', 'sex', 'original', 'original_tag', 'negative']) {
      const cur = cleanText(dst[field] || '', 2000);
      const add = cleanText(src[field] || '', 2000);
      if (!add) continue;
      if (!cur) dst[field] = add;
      else if (!cur.toLowerCase().includes(add.toLowerCase())) dst[field] = joinTags(cur, add);
    }
    return dst;
  };
  for (const raw of chars || []) {
    if (!raw || typeof raw !== 'object') continue;
    const name = cleanText(raw.name, 200);
    if (!name) continue;
    const stored = resolveCharacter(name, roster);
    const key = stored
      ? `id:${cleanText(stored.id || stored.name, 200)}`
      : `name:${normalizeAlias(name)}`;
    if (!key || key === 'id:' || key === 'name:') continue;
    const idx = out.findIndex((item) => item._dedupeKey === key);
    if (idx >= 0) {
      mergeFields(out[idx], raw);
      continue;
    }
    if (out.length >= limit) continue;
    seen.add(key);
    out.push({
      ...raw,
      name: stored?.name || name,
      _dedupeKey: key,
    });
  }
  return out.map(({ _dedupeKey, ...rest }) => rest);
}

/** Normalised alias keys for a character, including the display name itself. */
export function characterAliasKeys(char: CharacterInput | null | undefined): Set<string> {
  const keys = new Set<string>();
  for (const token of characterTriggers(char)) {
    const key = normalizeAlias(token);
    if (key) keys.add(key);
  }
  const name = normalizeAlias(char?.name);
  if (name) keys.add(name);
  return keys;
}

/** One row per person: rows that are the same character fold into their best record. */
export function mergeCharactersByAlias(
  characters: CharacterInput[] | null | undefined,
): MigratedCharacter[] {
  return mergeCharacterView(characters || []).active;
}

/** Characters whose trigger aliases appear in the text, in roster order. */
export function matchCharactersInText(
  text: unknown,
  characters: CharacterInput[] | null | undefined,
): CharacterInput[] {
  const hay = cleanText(text).toLowerCase();
  const hayCompact = compactText(text);
  if (!hay) return [];
  const matched: CharacterInput[] = [];
  const seenIds = new Set<string>();
  for (const char of characters || []) {
    const cid = cleanText(char.id || char.name, 200);
    if (!cid || seenIds.has(cid)) continue;
    for (const trigger of characterTriggers(char)) {
      const key = normalizeAlias(trigger);
      const compact = compactText(trigger);
      if (compact.length < 2) continue;
      if (hay.includes(key) || hayCompact.includes(compact)) {
        matched.push(char);
        seenIds.add(cid);
        break;
      }
    }
  }
  return matched;
}

/** Coerces anything character-shaped into a storable record, or null if unusable. */
export function normalizeCharacterRecord(
  raw: unknown,
  fallbackName = '',
): MigratedCharacter | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const rec = raw as CharacterInput;
  const name = cleanText(rec.name || fallbackName, 200);
  if (!name) return null;
  let aliases = parseAliasList(rec.aliases);
  aliases = [name, ...aliases.filter((a) => normalizeAlias(a) !== normalizeAlias(name))];
  const original = cleanText(rec.original || rec.original_tag || rec.copyright || '', 400);
  let appearance = cleanText(rec.appearance || '', 4000);
  let attire = cleanText(rec.attire || '', 4000);
  let accessories = cleanText(rec.accessories || '', 4000);
  const tags = cleanText(rec.tags || '', 4000);
  if (tags && !appearance && !attire && !accessories) {
    [appearance, attire, accessories] = splitLookTags(tags);
  } else if (tags) {
    const [id, clothes, acc] = splitLookTags(joinTags(appearance, tags));
    appearance = id;
    attire = joinTags(attire, clothes);
    accessories = joinTags(accessories, acc);
  }
  // Keep appearance identity-only; spill clothes/accessories into their fields.
  if (appearance) {
    const [id, clothes, acc] = splitLookTags(appearance);
    appearance = id;
    attire = joinTags(attire, clothes);
    accessories = joinTags(accessories, acc);
  }
  if (original && appearance) {
    appearance = joinTags(...appearance.split(',').filter((t) => normalizeAlias(t) !== normalizeAlias(original)));
  }
  let cid = cleanText(rec.id, 80) || name.replace(/[^a-zA-Z0-9_\uac00-\ud7a3]+/g, '_').replace(/^_|_$/g, '').slice(0, 64);
  if (!cid) cid = `char_${Math.abs(hashCode(name)) % 10000000}`;
  return migrateCharacter({
    ...rec,
    id: cid,
    name,
    aliases,
    original,
    appearance,
    attire,
    accessories,
  });
}

/**
 * Merge per-chat session characters with globals for tagging / generation.
 *
 * Attire-only session rows (empty appearance, optional attire/accessories) must NOT
 * hide a filled global look — those rows are clothes overlays, not "incomplete" chars.
 */
export function mergeSessionAndGlobalRoster(
  session: CharacterInput[] | null | undefined,
  globalChars: CharacterInput[] | null | undefined,
  helpers: RosterMergeHelpers = {},
): CharacterInput[] {
  const list = Array.isArray(session) ? session : [];
  const globals = Array.isArray(globalChars) ? globalChars : [];
  const hasAppearance: Required<RosterMergeHelpers>['hasAppearance'] =
    typeof helpers.hasAppearance === 'function' ? helpers.hasAppearance : () => false;
  const resolve: Required<RosterMergeHelpers>['resolve'] =
    typeof helpers.resolve === 'function' ? helpers.resolve : () => null;
  const aliasKeys: Required<RosterMergeHelpers>['aliasKeys'] =
    typeof helpers.aliasKeys === 'function' ? helpers.aliasKeys : () => new Set<string>();
  const normalizeName: Required<RosterMergeHelpers>['normalizeName'] =
    typeof helpers.normalizeName === 'function'
      ? helpers.normalizeName
      : (name: unknown) => String(name || '').trim().toLowerCase();
  const fullTags: Required<RosterMergeHelpers>['fullTags'] =
    typeof helpers.fullTags === 'function' ? helpers.fullTags : () => '';
  const clean: Required<RosterMergeHelpers>['clean'] =
    typeof helpers.clean === 'function' ? helpers.clean : (v: unknown) => String(v || '').trim();
  const globalScope = helpers.globalScope || '__global__';

  const merged: CharacterInput[] = [];
  const sessionIncomplete = new Set<string>();

  for (const schar of list) {
    if (!clean(schar?.name, 200) || hasAppearance(schar)) continue;
    // Empty chat row + filled global = attire overlay, not an incomplete blocker.
    const globalHit = resolve(schar.name, globals);
    if (globalHit && hasAppearance(globalHit)) continue;
    for (const key of aliasKeys(schar)) sessionIncomplete.add(key);
    const nameKey = normalizeName(schar.name);
    if (nameKey) sessionIncomplete.add(nameKey);
  }

  for (const gchar of globals) {
    const overlay = resolve(gchar.name, list);
    // Previously skipped globals when overlay had empty appearance — that blocked looks.
    const gKeys = aliasKeys(gchar);
    if ([...gKeys].some((k) => sessionIncomplete.has(k))) continue;
    const attire = !gchar.attire_locked && clean(overlay?.attire || '')
      ? overlay?.attire || ''
      : gchar.attire || '';
    const accessories = !gchar.accessories_locked && clean(overlay?.accessories || '')
      ? overlay?.accessories || ''
      : gchar.accessories || '';
    const attireChanged = attire !== (gchar.attire || '');
    const accChanged = accessories !== (gchar.accessories || '');
    if (overlay && (attireChanged || accChanged)) {
      merged.push({
        ...gchar,
        attire,
        accessories,
        aliases: gchar.aliases || overlay.aliases || [],
        tags: fullTags({ ...gchar, attire, accessories }),
        scope: globalScope,
      });
    } else merged.push(gchar);
  }

  for (const schar of list) {
    const hit = resolve(schar.name, merged);
    if (hit && hasAppearance(schar)) continue;
    if (hit && !hasAppearance(schar)) {
      // Keep a filled global (or merged attire overlay) — do not replace with empty session row.
      if (hasAppearance(hit)) continue;
      const idx = merged.findIndex((c) => resolve(schar.name, [c]));
      if (idx >= 0) merged[idx] = schar;
      else merged.push(schar);
      continue;
    }
    if (hit) continue;
    merged.push(schar);
  }

  return merged;
}
