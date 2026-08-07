/**
 * Tag classification: body vs clothes+jewelry vs weapons/props, plus person-count
 * tags for a shot's cast.
 *
 * Hint tables are substring matches. Order: weapon/prop → jewelry → clothing →
 * identity, so "holding umbrella" never lands in attire and earrings stay with
 * clothes (not the weapons tab).
 */
import clothingHints from '../../config/clothing-hints.json';
import jewelryHints from '../../config/jewelry-hints.json';
import weaponHints from '../../config/weapon-hints.json';
import type { CardSettings, PersonTagMode, ShotCharacter } from '../../core/types.ts';
import { cleanText, joinTags, normalizeAlias, splitTagTokens, toInt } from '../../core/util/text.ts';
import type { CharacterInput } from './identity.ts';
import { normalizeGender } from './identity.ts';
import { resolveCharacter } from './roster.ts';
import { ensureCostumes, resolveCostumeWear } from './costume.ts';

export { normalizeGender } from './identity.ts';
export {
  ensureCostumes,
  formatCostumeCatalog,
  mergeCostumeLists,
  normalizeCostume,
  promoteCostumeToDefault,
  resolveCostumeIndex,
  resolveCostumeWear,
  syncActiveCostumeFromWear,
} from './costume.ts';

const CLOTHING_HINTS: readonly string[] = clothingHints;
/** Permanent worn jewelry / glasses / earbuds — stored in attire with clothes. */
const JEWELRY_HINTS: readonly string[] = jewelryHints;
/** Weapons, bags, held props, ID gear — stored in accessories (무기·기타). */
const WEAPON_HINTS: readonly string[] = weaponHints;

const PERSON_TAG_MODES: readonly PersonTagMode[] = ['off', 'girls', 'people', 'gender'];
/** Exact comma-tokens only — never substring (girlyboy ≠ girl). */
const FEMALE_EXACT = new Set(['girl', 'woman', 'female']);
const MALE_EXACT = new Set(['boy', 'man', 'male']);
const PERSON_COUNT_TAG_RE = /^\d+\+?(?:girls?|boys?|people|person)$/i;
/** Bare person-count tokens (not `solo` — that is a normal scene tag too). */
const PERSON_BARE_RE = /^(?:1girl|1boy)$/i;
const PERSON_WORD = '(?:\\d+\\+?(?:girls?|boys?|people|person)|1girl|1boy|solo)';
/**
 * A whole NAI emphasis group whose inner tags are only person-count / solo
 * (e.g. `3::1girl, 1boy::`, `3::1boy, solo::`). `splitTagTokens` always keeps
 * such a group as one token, so this only needs to match the full token.
 */
const PERSON_EMPHASIS_GROUP_RE = new RegExp(
  `^-?\\d+(?:\\.\\d+)?::\\s*${PERSON_WORD}(?:\\s*,\\s*${PERSON_WORD})*\\s*::$`,
  'i',
);

const isPersonTagMode = (value: string): value is PersonTagMode =>
  (PERSON_TAG_MODES as readonly string[]).includes(value);

const hintMatch = (low: string, hints: readonly string[]): boolean =>
  hints.some((hint) => {
    // Short hints use token boundaries so "hat" does not match inside "chat".
    if (hint.length <= 3) {
      const escaped = hint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, 'i').test(low);
    }
    return low.includes(hint);
  });

/** True for weapons, bags, held props, ID gear (accessories / 무기·기타 tab). */
export function isWeaponPropTag(tag: unknown): boolean {
  const low = cleanText(tag).toLowerCase();
  if (!low) return false;
  return hintMatch(low, WEAPON_HINTS);
}

/** True for permanent jewelry / glasses / earbuds (lives in attire with clothes). */
export function isJewelryTag(tag: unknown): boolean {
  const low = cleanText(tag).toLowerCase();
  if (!low) return false;
  if (isWeaponPropTag(low)) return false;
  return hintMatch(low, JEWELRY_HINTS);
}

/** Jewelry or weapon/prop — anything that is not body identity or clothing fabric. */
export function isAccessoryTag(tag: unknown): boolean {
  return isWeaponPropTag(tag) || isJewelryTag(tag);
}

/** True for worn clothing; jewelry and weapons win the tie. */
export function isClothingTag(tag: unknown): boolean {
  const low = cleanText(tag).toLowerCase();
  if (!low) return false;
  if (isAccessoryTag(low)) return false;
  return hintMatch(low, CLOTHING_HINTS);
}

/** Split tags → [identity, attire(clothes+jewelry), accessories(weapons/props)]. */
export function splitLookTags(tags: unknown): [string, string, string] {
  const identity: string[] = [];
  const attire: string[] = [];
  const accessories: string[] = [];
  for (const token of cleanText(tags).split(',')) {
    const t = token.trim();
    if (!t) continue;
    if (isWeaponPropTag(t)) accessories.push(t);
    else if (isJewelryTag(t) || isClothingTag(t)) attire.push(t);
    else identity.push(t);
  }
  return [joinTags(...identity), joinTags(...attire), joinTags(...accessories)];
}

/** Jewelry tokens only (for nude captions that keep earrings etc.). */
export function jewelryFromAttire(attire: unknown): string {
  const jewelry: string[] = [];
  for (const token of cleanText(attire).split(',')) {
    const t = token.trim();
    if (t && isJewelryTag(t)) jewelry.push(t);
  }
  return joinTags(...jewelry);
}

/** Shot/roster flag: true / "true" / "on" / 1 / "1" (case-insensitive). */
export function flagOn(value: unknown): boolean {
  if (value === true || value === 1) return true;
  const text = cleanText(value, 20).toLowerCase();
  return text === 'true' || text === 'on' || text === '1';
}

/**
 * Nude caption level for a shot character.
 * 0 off · 1 torn · 2 nude · 3 completely nude.
 * Legacy `on`/`true` map to 3 (old “fully nude” intent). Bare `1` is torn
 * under the new scale (prefer `"on"` / `"nude"` / `"completely"` in prompts).
 */
export type NudeLevel = 0 | 1 | 2 | 3;

export function parseNudeLevel(value: unknown): NudeLevel {
  if (value == null || value === false) return 0;
  if (value === true) return 3;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const n = Math.floor(value);
    if (n <= 0) return 0;
    if (n === 1) return 1;
    if (n === 2) return 2;
    return 3;
  }
  const text = cleanText(value, 40).toLowerCase().replace(/_/g, ' ').trim();
  if (!text || text === 'off' || text === 'false' || text === '0' || text === 'none') return 0;
  if (text === '1' || text === 'torn' || text === 'torn clothes') return 1;
  if (text === '2' || text === 'nude') return 2;
  if (
    text === '3'
    || text === 'on'
    || text === 'true'
    || text === 'completely'
    || text === 'completely nude'
    || text === 'complete'
  ) {
    return 3;
  }
  return 0;
}

/**
 * Wear tags for a nude level — always keeps base attire; appends weighted state
 * + gendered anatomy (f: nipples,pussy · m: penis · unknown: state only).
 */
export function wearTagsForNudeLevel(
  attire: unknown,
  level: NudeLevel,
  gender: 'f' | 'm' | null = null,
): string {
  const base = cleanText(attire, 4000);
  if (level <= 0) return base;
  let state = '';
  if (level === 1) state = '2::torn clothes::';
  else if (level === 2) state = '2.5::nude::';
  else if (gender === 'm') state = '2.5::completely nude::';
  else state = '2::completely nude::';
  if (gender === 'f') return joinTags(base, state, 'nipples', 'pussy');
  if (gender === 'm') return joinTags(base, state, 'penis');
  return joinTags(base, state);
}

/** `splitLookTags` without the accessories bucket. */
export function splitIdentityAndAttire(tags: unknown): [string, string] {
  const [identity, attire] = splitLookTags(tags);
  return [identity, attire];
}

/** Split look strings into exact lowercase tag tokens (strips `n::tag::` weights). */
export function exactTagTokens(...parts: unknown[]): string[] {
  const out: string[] = [];
  for (const part of parts) {
    if (part == null) continue;
    for (const raw of cleanText(part).split(',')) {
      let t = raw.trim().toLowerCase();
      if (!t) continue;
      const weighted = t.match(/^\d+(?:\.\d+)?::(.+)::$/);
      if (weighted) t = weighted[1]!.trim().toLowerCase();
      // Underscore form of the same exact word only (girl ↔ girl, not girly_boy).
      t = t.replace(/_/g, ' ').trim();
      if (t) out.push(t);
    }
  }
  return out;
}

/** Exact gender markers we manage on the appearance field (not `pretty girl`). */
const GENDER_APPEARANCE_TOKENS = new Set(['girl', '1girl', 'boy', '1boy', 'other']);

function normalizeAppearanceAtomic(tag: string): string {
  return tag.trim().toLowerCase().replace(/_/g, ' ').trim();
}

function genderAppearancePresence(gender: 'girl' | 'boy' | 'other'): Set<string> {
  if (gender === 'girl') return new Set(['girl', '1girl']);
  if (gender === 'boy') return new Set(['boy', '1boy']);
  return new Set(['other']);
}

function appearanceTokenHasGenderMark(token: string, marks: Set<string>): boolean {
  const m = token.match(/^(-?\d+(?:\.\d+)?)::(.+)::$/i);
  if (m) {
    return m[2]!
      .split(',')
      .map((s) => normalizeAppearanceAtomic(s))
      .some((k) => marks.has(k));
  }
  return marks.has(normalizeAppearanceAtomic(token));
}

/** Drop managed gender atomics; keep other tags (including inside weight groups). */
function stripManagedGenderFromAppearanceToken(token: string, keep: Set<string>): string | null {
  const m = token.match(/^(-?\d+(?:\.\d+)?)::(.+)::$/i);
  if (m) {
    const next = m[2]!
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((inner) => {
        const key = normalizeAppearanceAtomic(inner);
        if (keep.has(key)) return true;
        return !GENDER_APPEARANCE_TOKENS.has(key);
      });
    if (!next.length) return null;
    return `${m[1]}::${next.join(', ')}::`;
  }
  const key = normalizeAppearanceAtomic(token);
  if (keep.has(key)) return token.trim();
  if (GENDER_APPEARANCE_TOKENS.has(key)) return null;
  return token.trim();
}

/**
 * Keep roster appearance's leading gender tag aligned with explicit `gender`.
 *
 * - gender empty/미정 → appearance unchanged
 * - girl → ensure exact `girl` or `1girl` (insert `girl` at front if neither)
 * - boy → `boy` / `1boy` (insert `boy`); other → `other`
 * - `pretty girl` is NOT `girl`. Weight groups are scanned for exact inners.
 * - Opposite gender markers are removed when syncing.
 */
export function syncGenderIntoAppearance(appearance: unknown, genderRaw: unknown): string {
  const gender = normalizeGender(genderRaw);
  const text = cleanText(appearance, 4000);
  if (!gender) return text;
  const keep = genderAppearancePresence(gender);
  const tokens = splitTagTokens(text);
  let hasPresence = false;
  for (const token of tokens) {
    if (appearanceTokenHasGenderMark(token, keep)) {
      hasPresence = true;
      break;
    }
  }
  const kept: string[] = [];
  for (const token of tokens) {
    const next = stripManagedGenderFromAppearanceToken(token, keep);
    if (next) kept.push(next);
  }
  if (!hasPresence) kept.unshift(gender);
  return kept.join(', ');
}

/**
 * Guess sex from exact tokens only: girl|woman|female vs boy|man|male,
 * plus count tags `1girl` / `2boys` (not substrings like girlyboy).
 */
export function classifyGenderFromTags(...parts: unknown[]): 'f' | 'm' | null {
  const tokens = exactTagTokens(...parts);
  if (!tokens.length) return null;
  let female = 0;
  let male = 0;
  for (const t of tokens) {
    if (FEMALE_EXACT.has(t) || /^\d+\+?girls?$/.test(t)) female += 1;
    if (MALE_EXACT.has(t) || /^\d+\+?boys?$/.test(t)) male += 1;
  }
  if (female > male) return 'f';
  if (male > female) return 'm';
  return null;
}

/**
 * Explicit roster/shot `gender` wins; else exact tag tokens on looks.
 * Shot `sex` is caption content (acts), not an explicit gender field — only
 * mined as tags. `stored` is the roster row when resolving a shot character.
 */
export function resolveCharacterGender(
  char: {
    gender?: unknown;
    sex?: unknown;
    appearance?: unknown;
    attire?: unknown;
    accessories?: unknown;
    label?: unknown;
    age?: unknown;
    body?: unknown;
    prompt?: unknown;
  } | null | undefined,
  stored?: {
    gender?: unknown;
    sex?: unknown;
    appearance?: unknown;
    attire?: unknown;
    accessories?: unknown;
  } | null,
): 'f' | 'm' | null {
  // Do not read shot.sex as explicit gender — tagger puts act tags there.
  const explicit = normalizeGender(char?.gender ?? stored?.gender ?? stored?.sex);
  if (explicit === 'girl') return 'f';
  if (explicit === 'boy') return 'm';
  if (explicit === 'other') return null;
  return classifyGenderFromTags(
    stored?.appearance,
    stored?.attire,
    stored?.accessories,
    char?.appearance,
    char?.attire,
    char?.accessories,
    char?.label,
    char?.age,
    char?.body,
    char?.prompt,
    char?.sex,
  );
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

/** Drops `1girl` / `2boys` / `6+people` and NAI-weighted person-count blocks. */
export function stripPersonCountTags(tags: unknown): string {
  const text = cleanText(tags);
  if (!text) return '';
  const kept: string[] = [];
  for (const token of splitTagTokens(text)) {
    const t = token.trim();
    if (!t) continue;
    if (PERSON_COUNT_TAG_RE.test(t)) continue;
    if (PERSON_BARE_RE.test(t)) continue;
    if (PERSON_EMPHASIS_GROUP_RE.test(t)) continue;
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

/**
 * Clamp card.person_tag_weight to 0–5. Missing/NaN → 3 (Maid-parity default).
 * Kept here so generation can wrap without importing schema.
 */
export function normalizePersonTagWeight(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 3;
  return Math.max(0, Math.min(5, Math.round(n)));
}

/** Wrap person-count tags in NAI emphasis when weight ≥ 1. Weight 0 → plain. */
export function emphasizePersonTags(tags: unknown, weight: unknown = 3): string {
  const text = cleanText(tags, 200);
  if (!text) return '';
  const w = normalizePersonTagWeight(weight);
  if (w <= 0) return text;
  return `${w}::${text}::`;
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

/** Truthy forms for card.person_tag_solo. */
export function personTagSoloOn(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1' || value === 'on';
}

/**
 * Person-count tags for one shot's cast, using roster looks to guess each sex.
 * When `soloWhenOne` is on and the cast is exactly one character, returns `solo`
 * instead of `1girl`/`1boy` — including when mode is `off` (안 넣기 still allows solo).
 */
export function personCountTagsForShot(
  chars: ShotCharacter[] | null | undefined,
  roster: CharacterInput[] | null | undefined,
  mode: unknown = 'gender',
  legacyAuto: unknown = null,
  soloWhenOne: unknown = false,
): string {
  const cast = (chars || []).slice(0, 6);
  const n = cast.length;
  if (n <= 0) return '';
  // Solo wins over mode=off: one char → `solo` at the front (then emphasized by caller).
  if (personTagSoloOn(soloWhenOne) && n === 1) return 'solo';
  const modeKey = normalizePersonTagMode(mode, legacyAuto);
  if (modeKey === 'off') return '';
  if (modeKey === 'girls') return formatCountTag(n, '1girl', 'girls', '6+girls');
  if (modeKey === 'people') return formatCountTag(n, '1person', 'people', '6+people');
  let female = 0;
  let male = 0;
  let unknown = 0;
  for (const char of cast) {
    const name = cleanText(char.name, 200);
    const stored = name ? resolveCharacter(name, roster) : null;
    const gender = resolveCharacterGender(char, stored);
    if (gender === 'f') female++;
    else if (gender === 'm') male++;
    else if (normalizeGender(char.gender ?? stored?.gender) === 'other') {
      // Explicit other: leave out of girl/boy counts.
    } else {
      // No gender signal — anime default so a silent girl is not dropped
      // (otherwise cast [girl-looks, boy] becomes just `1boy` → `N::1boy::`).
      unknown++;
    }
  }
  female += unknown;
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

/** Wear lock default ON: missing/undefined counts as locked. */
export function wearLocked(value: unknown): boolean {
  return value !== false;
}

/**
 * Character caption for one shot.
 *
 * Base: appearance + attire (clothes+jewelry). Weapons only when weapon=on.
 * nude level: 0 off · 1 torn · 2 nude · 3 completely — always keeps attire
 * tags and appends weighted state + gendered anatomy (never strips clothes).
 *
 * Wear source: `shot.costume` → roster costumes[i]; unreadable/missing →
 * costumes[0] (not the UI active mirror). Freeform shot attire/accessories
 * still apply only when the matching lock is off.
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
    costume?: unknown;
    expression?: unknown;
    action?: unknown;
    sex?: unknown;
    gender?: unknown;
    nude?: unknown;
    weapon?: unknown;
    negative?: unknown;
  } | null | undefined,
): string {
  const hasLooks = characterHasAppearance(stored);
  const shotOriginal = cleanText(shot?.original || shot?.original_tag || '', 400);
  const storedOriginal = cleanText(stored?.original || '', 400);
  const costumeWear = resolveCostumeWear(stored || {}, shot?.costume);
  // Prefer catalog wear when the row has a costumes array (or attire to seed one).
  const hasCostumeList = Array.isArray(stored?.costumes) && (stored!.costumes as unknown[]).length > 0;
  const seeded = ensureCostumes(stored || {});
  const useCatalog = hasCostumeList || Boolean(seeded.costumes[0]?.attire || seeded.costumes[0]?.accessories || stored?.attire);
  const catalogAttire = useCatalog ? costumeWear.attire : cleanText(stored?.attire || '', 4000);
  const catalogAcc = useCatalog ? costumeWear.accessories : cleanText(stored?.accessories || '', 4000);
  const shotAttire = cleanText(shot?.attire || '', 4000);
  const shotAcc = cleanText(shot?.accessories || '', 4000);
  const attire = wearLocked(stored?.attire_locked)
    ? catalogAttire
    : (shotAttire || catalogAttire);
  const accessories = wearLocked(stored?.accessories_locked)
    ? catalogAcc
    : (shotAcc || catalogAcc);
  const nudeLevel = parseNudeLevel(shot?.nude);
  const weapon = flagOn(shot?.weapon);
  const gender = resolveCharacterGender(shot, stored);
  const wear = wearTagsForNudeLevel(attire, nudeLevel, gender);
  const weapons = weapon ? accessories : '';
  const explicitGender = normalizeGender(shot?.gender ?? stored?.gender ?? stored?.sex);
  const storedAppearance = syncGenderIntoAppearance(stored?.appearance, explicitGender);
  const shotAppearance = syncGenderIntoAppearance(shot?.appearance, explicitGender);

  if (hasLooks) {
    return normalizeCharacterCaptionTags(
      joinTags(
        storedOriginal || shotOriginal,
        storedAppearance,
        wear,
        weapons,
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
      shotAppearance,
      shot?.body,
      wear,
      weapons,
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
