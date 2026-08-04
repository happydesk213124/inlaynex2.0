/**
 * Tag classification: deciding whether a tag describes the body, the clothes or
 * a carried prop, and the person-count tags derived from a shot's cast.
 *
 * The hint tables are substring matches. Accessories are always tested first so
 * that "holding umbrella" never lands in attire.
 */
import accessoryHints from '../../config/accessory-hints.json';
import clothingHints from '../../config/clothing-hints.json';
import type { CardSettings, PersonTagMode, ShotCharacter } from '../../core/types.ts';
import { cleanText, joinTags, normalizeAlias, toInt } from '../../core/util/text.ts';
import type { CharacterInput } from './identity.ts';
import { resolveCharacter } from './roster.ts';

const CLOTHING_HINTS: readonly string[] = clothingHints;
/** Jewelry, bags, weapons, held props, ID gear — not body identity, not clothes. */
const ACCESSORY_HINTS: readonly string[] = accessoryHints;

const PERSON_TAG_MODES: readonly PersonTagMode[] = ['off', 'girls', 'people', 'gender'];
const FEMALE_RE = /\b(?:\d+\+?)?girls?\b|\bwom(?:an|en)\b|\bfemale\b|\blady\b|\bladies\b|\bmilf\b|\bloli\b|\bmaiden\b/i;
const MALE_RE = /\b(?:\d+\+?)?boys?\b|\bm(?:a|e)n\b|\bmale\b|\bguys?\b|\bgentleman\b|\botoko\b/i;
const PERSON_COUNT_TAG_RE = /^\d+\+?(?:girls?|boys?|people|person)$/i;

const isPersonTagMode = (value: string): value is PersonTagMode =>
  (PERSON_TAG_MODES as readonly string[]).includes(value);

/** True for jewelry, bags, weapons and other carried props. */
export function isAccessoryTag(tag: unknown): boolean {
  const low = cleanText(tag).toLowerCase();
  if (!low) return false;
  return ACCESSORY_HINTS.some((hint) => low.includes(hint));
}

/** True for worn clothing; accessories win the tie. */
export function isClothingTag(tag: unknown): boolean {
  const low = cleanText(tag).toLowerCase();
  if (!low) return false;
  if (isAccessoryTag(low)) return false;
  return CLOTHING_HINTS.some((hint) => low.includes(hint));
}

/** Split tags → [identity, attire(clothes), accessories(jewelry/weapons/props)]. */
export function splitLookTags(tags: unknown): [string, string, string] {
  const identity: string[] = [];
  const attire: string[] = [];
  const accessories: string[] = [];
  for (const token of cleanText(tags).split(',')) {
    const t = token.trim();
    if (!t) continue;
    if (isAccessoryTag(t)) accessories.push(t);
    else if (isClothingTag(t)) attire.push(t);
    else identity.push(t);
  }
  return [joinTags(...identity), joinTags(...attire), joinTags(...accessories)];
}

/** `splitLookTags` without the accessories bucket. */
export function splitIdentityAndAttire(tags: unknown): [string, string] {
  const [identity, attire] = splitLookTags(tags);
  return [identity, attire];
}

/** Re-splits a whole look around a new attire string, keeping identity tags. */
export function replaceAttire(
  appearance: unknown,
  attire: unknown,
  accessories: unknown,
  newAttire: unknown,
): [string, string, string] {
  const [identity, oldAttire, oldAcc] = splitLookTags(joinTags(appearance, attire, accessories));
  const incoming = cleanText(newAttire);
  if (!incoming) return [identity, oldAttire, oldAcc];
  const [extraId, clothing, acc] = splitLookTags(incoming);
  return [
    joinTags(identity, extraId),
    clothing || (!acc ? incoming : oldAttire),
    acc || oldAcc,
  ];
}

/** Re-splits a whole look around new accessories, keeping identity and clothes. */
export function replaceAccessories(
  appearance: unknown,
  attire: unknown,
  accessories: unknown,
  newAccessories: unknown,
): [string, string, string] {
  const [identity, oldAttire, oldAcc] = splitLookTags(joinTags(appearance, attire, accessories));
  const incoming = cleanText(newAccessories);
  if (!incoming) return [identity, oldAttire, oldAcc];
  const [extraId, clothing, acc] = splitLookTags(incoming);
  return [
    joinTags(identity, extraId),
    joinTags(oldAttire, clothing),
    acc || incoming,
  ];
}

/** Guesses a character's sex from their tags; null when the signals tie. */
export function classifyGenderFromTags(...parts: unknown[]): 'f' | 'm' | null {
  const text = joinTags(...parts.filter((p) => p != null).map((p) => cleanText(p)));
  if (!text) return null;
  // Neither regex is global on purpose: a hit counts once per side.
  const femaleHits = (text.match(FEMALE_RE) || []).length;
  const maleHits = (text.match(MALE_RE) || []).length;
  if (femaleHits > maleHits) return 'f';
  if (maleHits > femaleHits) return 'm';
  return null;
}

/** Danbooru count tag for `n` of one kind: `1girl` / `3girls` / `6+girls`. */
export function formatCountTag(n: number, one: string, many: string, manyPlus: string): string {
  if (n <= 0) return '';
  if (n === 1) return one;
  if (n <= 5) return `${n}${many}`;
  return manyPlus;
}

/** Combined girl/boy count tags for a mixed cast. */
export function formatPersonCountTags(female: number, male: number): string {
  const parts: string[] = [];
  const girl = formatCountTag(female, '1girl', 'girls', '6+girls');
  const boy = formatCountTag(male, '1boy', 'boys', '6+boys');
  if (girl) parts.push(girl);
  if (boy) parts.push(boy);
  return parts.join(', ');
}

/** Drops `1girl` / `2boys` / `6+people` style tags from a tag string. */
export function stripPersonCountTags(tags: unknown): string {
  const kept: string[] = [];
  for (const token of cleanText(tags).split(',')) {
    const t = token.trim();
    if (!t) continue;
    if (PERSON_COUNT_TAG_RE.test(t)) continue;
    kept.push(t);
  }
  return joinTags(...kept);
}

/** Per-character captions may only say `girl`/`boy`, never a count. */
export function normalizeCharacterCaptionTags(tags: unknown): string {
  const kept: string[] = [];
  const seen = new Set<string>();
  for (const token of cleanText(tags).split(',')) {
    let t = token.trim();
    if (!t) continue;
    if (PERSON_COUNT_TAG_RE.test(t)) {
      const low = t.toLowerCase();
      if (low.includes('girl')) t = 'girl';
      else if (low.includes('boy')) t = 'boy';
      else continue;
    }
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(t);
  }
  return joinTags(...kept);
}

/** Accepts every legacy spelling of the person-tag setting, including the old boolean. */
export function normalizePersonTagMode(value: unknown, legacyAuto: unknown = null): PersonTagMode {
  let raw = value;
  if (raw == null && legacyAuto != null) raw = legacyAuto;
  if (raw === false) return 'off';
  if (raw === true) return 'gender';
  const text = cleanText(raw, 40).toLowerCase();
  if (['', 'auto', 'mixed', 'true', '1', 'on'].includes(text)) return 'gender';
  if (['off', 'none', 'false', '0', 'disable', 'disabled'].includes(text)) return 'off';
  if (['girl', 'all_girls', 'girls_only'].includes(text)) return 'girls';
  if (['person', 'persons'].includes(text)) return 'people';
  if (isPersonTagMode(text)) return text;
  return 'gender';
}

/** Person-count tags for one shot's cast, using roster looks to guess each sex. */
export function personCountTagsForShot(
  chars: ShotCharacter[] | null | undefined,
  roster: CharacterInput[] | null | undefined,
  mode: unknown = 'gender',
  legacyAuto: unknown = null,
): string {
  const modeKey = normalizePersonTagMode(mode, legacyAuto);
  if (modeKey === 'off') return '';
  const cast = (chars || []).slice(0, 6);
  const n = cast.length;
  if (n <= 0) return '';
  if (modeKey === 'girls') return formatCountTag(n, '1girl', 'girls', '6+girls');
  if (modeKey === 'people') return formatCountTag(n, '1person', 'people', '6+people');
  let female = 0;
  let male = 0;
  for (const char of cast) {
    const name = cleanText(char.name, 200);
    const stored = name ? resolveCharacter(name, roster) : null;
    const gender = classifyGenderFromTags(
      stored?.appearance,
      stored?.attire,
      stored?.accessories,
      char.sex,
      char.label,
      char.age,
      char.appearance,
      char.body,
      char.attire,
      char.accessories,
    );
    if (gender === 'f') female++;
    else if (gender === 'm') male++;
  }
  return formatPersonCountTags(female, male);
}

/** Every tag a character contributes: original + appearance + attire + accessories. */
export function fullTags(char: CharacterInput | null | undefined): string {
  return joinTags(char?.original || '', char?.appearance || '', char?.attire || '', char?.accessories || '');
}

/** True when a row carries a real look, not just gender/count or misfiled clothes. */
export function characterHasAppearance(char: unknown): boolean {
  if (typeof char !== 'object' || char === null) return false;
  const rec = char as CharacterInput;
  let appearance = cleanText(rec.appearance || '', 4000);
  if (!appearance) return false;
  // original-only leftovers in appearance are not a filled look
  const original = cleanText(rec.original || '', 400);
  if (original) {
    appearance = joinTags(
      ...appearance.split(',').filter((t) => normalizeAlias(t) !== normalizeAlias(original)),
    );
  }
  // clothing misfiled into appearance does not count as identity
  const [identity] = splitIdentityAndAttire(appearance);
  appearance = cleanText(identity || '', 4000);
  if (!appearance) return false;
  // gender / person-count only → treat as empty so the LLM re-collects looks
  const weak = new Set(['girl', 'boy', 'man', 'woman', 'male', 'female', '1girl', '1boy', '2girls', '2boys', 'solo', 'other']);
  const meaningful = appearance
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .filter((t) => !weak.has(t) && !/^\d+(girl|boy)s?$/.test(t));
  return meaningful.length > 0;
}

/**
 * Character caption for one shot.
 *
 * Filled roster looks: identity (original + appearance) stays on the stored base;
 * attire/accessories use the shot override when the LLM sent one, else the base.
 * Tagging must not rewrite the stored base wear — only this per-shot mix.
 */
export function composeCharacterCaptionTags(
  stored: CharacterInput | null | undefined,
  shot: {
    original?: unknown;
    original_tag?: unknown;
    label?: unknown;
    age?: unknown;
    appearance?: unknown;
    body?: unknown;
    attire?: unknown;
    accessories?: unknown;
    expression?: unknown;
    action?: unknown;
    sex?: unknown;
    negative?: unknown;
  } | null | undefined,
): string {
  const hasLooks = characterHasAppearance(stored);
  const shotOriginal = cleanText(shot?.original || shot?.original_tag || '', 400);
  const storedOriginal = cleanText(stored?.original || '', 400);
  if (hasLooks) {
    const attire = cleanText(shot?.attire || '', 4000) || cleanText(stored?.attire || '', 4000);
    const accessories = cleanText(shot?.accessories || '', 4000) || cleanText(stored?.accessories || '', 4000);
    return normalizeCharacterCaptionTags(
      joinTags(
        storedOriginal || shotOriginal,
        stored?.appearance,
        attire,
        accessories,
        shot?.expression,
        shot?.action,
        shot?.sex,
      ),
    );
  }
  return normalizeCharacterCaptionTags(
    joinTags(
      storedOriginal ? '' : shotOriginal,
      shot?.label,
      shot?.age,
      shot?.appearance,
      shot?.body,
      cleanText(shot?.attire || '', 4000) || cleanText(stored?.attire || '', 4000),
      cleanText(shot?.accessories || '', 4000) || cleanText(stored?.accessories || '', 4000),
      shot?.expression,
      shot?.action,
      shot?.sex,
    ),
  );
}

/** Cast size cap from card settings, clamped to NovelAI's 1..6 characters. */
export function characterMaxLimit(card: Partial<CardSettings> | null | undefined): number {
  const settings = (typeof card === 'object' && card ? card : {}) as Record<string, unknown>;
  const n = toInt(settings.character_max ?? settings.char_max ?? 6, 6);
  return Math.max(1, Math.min(6, n));
}
