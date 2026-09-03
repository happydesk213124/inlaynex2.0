/**
 * The character roster: per-session rows, global rows, and the rules that decide
 * when two rows are the same person.
 *
 * Three constraints shape everything here.
 *
 * **Writes always land on the live chat session.** "Unified" is a read-only
 * merge across linked chats, never a store of its own, so `rosterStoreSessionId`
 * and `mergeRosterFromTagged` deliberately ignore the unified id when choosing a
 * write target. Editing the unified view therefore patches the root chats that
 * already hold the character and never creates rows in them.
 *
 * **Session rows with no appearance are legacy wardrobe overlays.** They no
 * longer rewrite a global's attire/accessories at merge time; shot `wear_state` /
 * `weapon` flags control wear at generation instead. `clearSessionWearOverlaysFor`
 * still clears stale overlays when the user edits global wear.
 *
 * **The `appearance:<session>` meta rows are still written.** Nothing reads them
 * any more except the one-time migration, but they are on disk in every existing
 * install and a downgrade would need them, so the shape stays.
 *
 * Identity decisions (Korean/English spellings, surname/given-name variants,
 * alias folding) all belong to `domain/character/*`; this module only sequences
 * storage around them.
 */

import { GLOBAL_SCOPE, charRefScopeForCharacter } from '../core/constants';
import { dbg } from '../core/debug';
import { compactAssetKey } from '../domain/nai-meta/match.ts';
import type { ApiResult, CharacterRecord, ShotCharacter, TaggerResult } from '../core/types';
import { cleanText, joinTags, normalizeAlias, parseAliasList } from '../core/util/text';
import { characterMatchesIdentity, inferGenderFromExactTags, normalizeGender, latinGivenTokenOverlap, absorbAliasesFromDonor, ASSET_LOOKS_PRIORITY } from '../domain/character/identity';
import type { CharacterInput, MigratedCharacter } from '../domain/character/identity';
import {
  characterAliasKeys,
  characterTriggers,
  foldCharacterUpsert,
  matchCharactersInText,
  mergeCharactersByAlias,
  mergeSessionAndGlobalRoster,
  normalizeCharacterRecord,
  pickUnifiedWinners,
  resolveCharacter,
} from '../domain/character/roster';
import {
  characterHasAppearance,
  incomingLooksForIncomplete,
  fullTags,
  normalizeTaggedLookBuckets,
  parseWearState,
  wearLocked,
  type WearState,
} from '../domain/character/tags';
import {
  collectCostumePairs,
  ensureCostumes,
  mergeCostumeLists,
  promoteCostumeToDefault,
  resolveCostumeIndex,
  syncActiveCostumeFromWear,
} from '../domain/character/costume';
import { sanitizeHash } from '../domain/character/char-ref-store';
import { normalizeEyeColorSlot, normalizeHairColorSlot } from '../domain/character/looks-fields';
import { restoreAssetTagWeights } from '../domain/nai-meta/prompt-tags.ts';
import { idbDelete, idbGet, idbGetAll, idbPut } from '../storage/stores';
import { getLastAssetWeightMap } from './asset-tags';
import { getCharRefPreviewUrl, getConfig, getExamplePreviewUrl } from './context';
import { seedCharRefsFromLooks } from './nai-assets';

export interface ReplaceOptions {
  prune?: boolean;
  rootSessionIds?: unknown[];
}

/** Mirrors the `_runJob` call site: the tagger's own arguments, in order. */
export interface MergeRosterArgs {
  sessionId: string;
  /** Mutated in place: `new_characters` is rewritten with the shot-derived additions. */
  tagged: TaggerResult;
  /** Every character of every shot, flattened. */
  shotChars: ShotCharacter[];
  /** Threaded through to `rosterForSession`, which ignores it. */
  unifiedSessionId?: string;
  characterId?: string;
  sourceSessionIds?: unknown[];
  /** When true (char_looks prepass), bump written rows to ASSET_LOOKS_PRIORITY. */
  assetLooks?: boolean;
  /** Compact trigger/name → NAI identity tag; wins over LLM `original` when set. */
  originalHints?: Record<string, string>;
}

interface SessionEditCount {
  sessions: number;
}

/** Anything that might carry name parts: a roster row, or a raw cast entry. */
type NamePartSource = {
  surname?: unknown;
  given_name?: unknown;
  surname_variants?: unknown;
  given_name_variants?: unknown;
  [key: string]: unknown;
} | null | undefined;

interface NameParts {
  surname: string;
  given_name: string;
  surname_variants: string[];
  given_name_variants: string[];
}

const hasOwn = (value: unknown, field: string): boolean =>
  !!value && Object.prototype.hasOwnProperty.call(value as object, field);

/** Mirrors `[...(value || [])]`: a string spreads into characters, as it always has. */
const spreadLoose = (value: unknown): unknown[] => (value ? [...(value as Iterable<unknown>)] : []);

const asRoster = (rows: readonly CharacterInput[]): CharacterRecord[] => rows as CharacterRecord[];

// ── reads ──────────────────────────────────────────────────────────────────

export async function listCharacters(scope: string): Promise<CharacterRecord[]> {
  const all = await idbGetAll('characters');
  const rows = all
    .filter((r) => r.scope === cleanText(scope, 200))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  const out: CharacterRecord[] = [];
  for (const row of rows) {
    let aliases: unknown = row.aliases;
    if (typeof aliases === 'string') {
      try {
        aliases = JSON.parse(aliases);
      } catch {
        aliases = parseAliasList(aliases);
      }
    }
    const appearance = cleanText(row.appearance || '', 4000);
    const attire = row.attire || '';
    const accessories = row.accessories || '';
    let gender = normalizeGender(row.gender ?? row.sex);
    // Reads stay pure: infer legacy gender for this view, then persist it only
    // when the row is next explicitly written.
    if (!gender) {
      const inferred = inferGenderFromExactTags(appearance, attire, accessories);
      if (inferred) gender = inferred;
    }
    const ensured = ensureCostumes({
      attire,
      accessories,
      costumes: Array.isArray(row.costumes) ? row.costumes : undefined,
      active_costume: row.active_costume,
    });
    const rec: CharacterRecord = {
      id: row.id,
      name: row.name,
      aliases: Array.isArray(aliases) ? (aliases as string[]) : parseAliasList(aliases),
      surname: row.surname || '',
      given_name: row.given_name || '',
      surname_variants: parseAliasList(row.surname_variants),
      given_name_variants: parseAliasList(row.given_name_variants),
      priority: Number(row.priority || 0),
      attire_locked: wearLocked(row.attire_locked),
      accessories_locked: wearLocked(row.accessories_locked),
      schema_version: Number(row.schema_version || 1),
      original: row.original || '',
      appearance,
      attire,
      accessories,
      costumes: ensured.costumes,
      active_costume: ensured.active_costume,
      gender,
      wear_state: parseWearState(row.wear_state) || undefined,
      updated_at: row.updated_at,
      scope: row.scope,
    };
    const hairColor = normalizeHairColorSlot(row.hair_color || '', 120);
    const hairStyle = cleanText(row.hair_style || '', 400);
    const eyeColor = normalizeEyeColorSlot(row.eye_color || '', 120);
    const height = cleanText(row.height || '', 80);
    const penisSize = cleanText(row.penis_size || '', 40);
    if (hairColor) rec.hair_color = hairColor;
    if (hairStyle) rec.hair_style = hairStyle;
    if (eyeColor) rec.eye_color = eyeColor;
    if (height) rec.height = height;
    if (row.age != null && row.age !== '') rec.age = row.age;
    if (penisSize) rec.penis_size = penisSize;
    rec.tags = fullTags(rec);
    const cid = cleanText(rec.id, 200);
    if (cid) {
      const refScope = charRefScopeForCharacter(rec.scope, scope, scope);
      const hash = sanitizeHash(row.ref_hash);
      if (hash) rec.ref_hash = hash;
      rec.ref_configured = Boolean(hash);
      rec.ref_preview_url = hash ? getCharRefPreviewUrl(refScope, cid) : '';
      const ex = sanitizeHash(row.example_hash);
      if (ex) {
        rec.example_hash = ex;
        rec.example_configured = true;
        rec.example_preview_url = getExamplePreviewUrl(refScope, cid);
      }
    }
    out.push(rec);
  }
  return out;
}

// ── per-character global toggles ───────────────────────────────────────────

export async function getDisabledGlobals(characterId: string): Promise<string[]> {
  const cid = cleanText(characterId, 200);
  if (!cid) return [];
  const all = await idbGetAll('meta');
  return all
    .filter((r) => r.key?.startsWith(`toggle:${cid}:`) && r.enabled === 0)
    .map((r) => cleanText(r.global_key || r.key.split(':').slice(2).join(':'), 200))
    .filter(Boolean);
}

export async function setDisabledGlobals(characterId: string, disabledKeys: unknown[]): Promise<ApiResult> {
  const cid = cleanText(characterId, 200);
  if (!cid) return { ok: false, error: { code: 'bad_request', message: 'character_id required' } };
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const raw of disabledKeys || []) {
    const key = cleanText(raw, 200);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }
  const all = await idbGetAll('meta');
  for (const row of all) {
    if (row.key?.startsWith(`toggle:${cid}:`)) await idbDelete('meta', row.key);
  }
  const now = Date.now() / 1000;
  for (const key of keys) {
    await idbPut('meta', { key: `toggle:${cid}:${key}`, character_id: cid, global_key: key, enabled: 0, updated_at: now });
  }
  return { ok: true, character_id: cid, disabled_globals: keys };
}

/** A toggle may have been stored under the id or the name, in either case. */
function globalCharKeys(char: { id?: unknown; name?: unknown }): string[] {
  const keys: string[] = [];
  for (const raw of [char.id, char.name]) {
    const text = cleanText(raw, 200);
    if (!text) continue;
    keys.push(text);
    const low = text.toLowerCase();
    if (low !== text) keys.push(low);
  }
  return [...new Set(keys)];
}

function globalToggleKeyDisabled(char: { id?: unknown; name?: unknown }, disabled: Set<string> | undefined): boolean {
  if (!disabled?.size) return false;
  for (const key of globalCharKeys(char)) {
    if (disabled.has(key)) return true;
  }
  return false;
}

export async function getDisabledGlobalsSet(characterId: string): Promise<Set<string>> {
  const list = await getDisabledGlobals(characterId);
  return new Set(list);
}

export async function globalEnabledMap(characterId: string): Promise<Record<string, boolean>> {
  const disabled = await getDisabledGlobalsSet(characterId);
  const out: Record<string, boolean> = {};
  for (const char of await listCharacters(GLOBAL_SCOPE)) {
    const enabled = !globalToggleKeyDisabled(char, disabled);
    for (const key of globalCharKeys(char)) out[key] = enabled;
    // Unconditional, so a nameless row writes an empty-string key. The UI looks
    // rows up by name and never asks for "", so the stray entry is inert.
    out[cleanText(char.name, 200)] = enabled;
  }
  return out;
}

// ── session roster ─────────────────────────────────────────────────────────

/**
 * Writes always target the live chat session. Unified is a read-only merge view.
 * (unifiedSessionId kept in the signature for call-site compatibility.)
 */
export function rosterStoreSessionId(sessionId: string, _unifiedSessionId = ''): string {
  return cleanText(sessionId || '', 200);
}

export async function listMergedSessionCharacters(sourceSessionIds: unknown[] = []): Promise<CharacterRecord[]> {
  const collected: CharacterRecord[] = [];
  const seen = new Set<string>();
  for (const raw of sourceSessionIds || []) {
    const sid = cleanText(raw, 200);
    if (!sid || sid === GLOBAL_SCOPE || seen.has(sid)) continue;
    seen.add(sid);
    collected.push(...(await listCharacters(sid)));
  }
  return collected;
}

export async function listUnifiedViewCharacters(sourceSessionIds: unknown[] = []): Promise<CharacterRecord[]> {
  const collected = await listMergedSessionCharacters(sourceSessionIds);
  if (getConfig()?.card?.unified_winners_only) {
    return asRoster(pickUnifiedWinners(collected, characterHasAppearance));
  }
  return collected;
}

/**
 * The roster a chat sees: its own rows plus every global the character has not
 * switched off. With `unified_chat_priority` the session half is the linked
 * chats concatenated. `unified_winners_only` then keeps one row per name.
 */
export async function rosterForSession(
  sessionId: string,
  _unifiedSessionId = '',
  characterId = '',
  sourceSessionIds: unknown[] = [],
): Promise<CharacterRecord[]> {
  const prefer = !!getConfig()?.card?.unified_chat_priority;
  const winnersOnly = !!getConfig()?.card?.unified_winners_only;
  const sources = (Array.isArray(sourceSessionIds) ? sourceSessionIds : [])
    .map((s) => cleanText(s, 200))
    .filter(Boolean);
  let session: CharacterRecord[];
  if (prefer && sources.length) {
    const merged = await listMergedSessionCharacters(sources);
    session = asRoster(winnersOnly ? pickUnifiedWinners(merged, characterHasAppearance) : merged);
  } else {
    session = await listCharacters(cleanText(sessionId || '', 200));
  }
  const cid = cleanText(characterId || '', 200);
  const disabled = cid ? await getDisabledGlobalsSet(cid) : new Set<string>();
  const globalChars = (await listCharacters(GLOBAL_SCOPE)).filter((c) => !globalToggleKeyDisabled(c, disabled));
  return asRoster(mergeSessionAndGlobalRoster(session, globalChars, {
    hasAppearance: characterHasAppearance,
    resolve: resolveCharacter,
    aliasKeys: characterAliasKeys,
    normalizeName: normalizeAlias,
    fullTags,
    clean: cleanText,
    globalScope: GLOBAL_SCOPE,
  }));
}

/** Same arguments `buildTaggerMessages` threads into `rosterForSession`. */
export interface TaggerRosterArgs {
  sessionId?: string;
  unifiedSessionId?: string;
  characterId?: string;
  sourceSessionIds?: unknown[];
}

/**
 * Roster the main tagger injects (merged session/unified + enabled globals,
 * then latin-peer alias absorb). The message-chip picker must call this —
 * not the raw GET session+global lists.
 */
export async function loadTaggerRoster(args: TaggerRosterArgs = {}): Promise<CharacterRecord[]> {
  const sessionId = cleanText(args.sessionId || '', 200);
  const unifiedSessionId = cleanText(args.unifiedSessionId || '', 200);
  const characterId = cleanText(args.characterId || '', 200);
  const sourceSessionIds = args.sourceSessionIds ?? [];
  const roster = await rosterForSession(sessionId, unifiedSessionId, characterId, sourceSessionIds);
  if (!roster.length) return roster;
  return absorbAliasesOntoLatinPeers({ sessionId, unifiedSessionId, characterId, sourceSessionIds });
}

/** Characters the tagger would list as "Characters in this message". */
export async function matchTriggeredCharacters(
  args: TaggerRosterArgs & { message?: unknown },
): Promise<CharacterRecord[]> {
  const roster = await loadTaggerRoster(args);
  return matchCharactersInText(cleanText(args.message, 20000), roster) as CharacterRecord[];
}

export async function matchTriggeredCharactersPayload(
  body: Record<string, unknown> | null | undefined,
): Promise<Record<string, unknown>> {
  const rec = body && typeof body === 'object' ? body : {};
  const characters = await matchTriggeredCharacters({
    message: rec.message ?? rec.text ?? rec.assistant_text ?? '',
    sessionId: String(rec.session_id || rec.sessionId || ''),
    unifiedSessionId: String(rec.unified_session_id || rec.unifiedSessionId || ''),
    characterId: String(rec.character_id || rec.characterId || ''),
    sourceSessionIds: (rec.source_session_ids || rec.sourceSessionIds || []) as unknown[],
  });
  return { ok: true, characters };
}

// ── writes ─────────────────────────────────────────────────────────────────

export async function upsertCharacter(scope: string, raw: unknown): Promise<CharacterRecord | null> {
  const appearanceProvided = hasOwn(raw, 'appearance');
  const attireProvided = hasOwn(raw, 'attire');
  const accessoriesProvided = hasOwn(raw, 'accessories');
  const originalProvided = hasOwn(raw, 'original');
  const surnameProvided = hasOwn(raw, 'surname');
  const givenProvided = hasOwn(raw, 'given_name');
  const surnameVariantsProvided = hasOwn(raw, 'surname_variants');
  const givenVariantsProvided = hasOwn(raw, 'given_name_variants');
  const costumesProvided = hasOwn(raw, 'costumes');
  const activeCostumeProvided = hasOwn(raw, 'active_costume');
  const wearStateProvided = hasOwn(raw, 'wear_state');
  const promoteDefault = Boolean(
    raw && typeof raw === 'object' && (raw as Record<string, unknown>).promote_costume_default,
  );
  let rec = normalizeCharacterRecord(raw);
  if (!rec) return null;
  const scopeKey = cleanText(scope, 200) || GLOBAL_SCOPE;
  const existingList = await listCharacters(scopeKey);
  const selfId = cleanText(rec.id, 80);
  const incoming = rec;
  const provided = {
    appearance: appearanceProvided,
    attire: attireProvided,
    accessories: accessoriesProvided,
    original: originalProvided,
    surname: surnameProvided,
    given_name: givenProvided,
    surname_variants: surnameVariantsProvided,
    given_name_variants: givenVariantsProvided,
    costumes: costumesProvided,
    active_costume: activeCostumeProvided,
    wear_state: wearStateProvided,
    attire_locked: hasOwn(raw, 'attire_locked'),
    accessories_locked: hasOwn(raw, 'accessories_locked'),
    hair_color: hasOwn(raw, 'hair_color'),
    hair_style: hasOwn(raw, 'hair_style'),
    eye_color: hasOwn(raw, 'eye_color'),
    height: hasOwn(raw, 'height'),
    age: hasOwn(raw, 'age'),
    penis_size: hasOwn(raw, 'penis_size'),
    gender: hasOwn(raw, 'gender'),
    priority: hasOwn(raw, 'priority'),
  };
  const sameRow = selfId
    ? existingList.find((c) => cleanText(c.id, 80) === selfId)
    : undefined;
  if (sameRow) {
    rec = foldCharacterUpsert(sameRow, rec, provided);
    if (!rec) return null;
  }
  const dup = existingList.find((c) => {
    if (selfId && cleanText(c.id, 80) === selfId) return false;
    if (rec && cleanText(c.id, 80) === cleanText(rec.id, 80)) return false;
    return Boolean(resolveCharacter(incoming.name, [c]) || (incoming.aliases || []).some((a) => resolveCharacter(a, [c])));
  });
  if (dup) {
    rec = foldCharacterUpsert(dup, rec, provided);
    if (!rec) return null;
  }

  // Normalize costumes: seed from attire if missing; sync active slot from wear on save.
  {
    let { costumes, active_costume } = ensureCostumes(rec);
    if (attireProvided || accessoriesProvided) {
      costumes = syncActiveCostumeFromWear(costumes, active_costume, {
        attire: rec.attire,
        accessories: rec.accessories,
      });
    }
    if (promoteDefault) {
      costumes = promoteCostumeToDefault(costumes, {
        attire: rec.attire,
        accessories: rec.accessories,
      });
      active_costume = 0;
      // Mirror default wear onto top-level fields.
      rec.attire = costumes[0]!.attire;
      rec.accessories = costumes[0]!.accessories;
    }
    rec.costumes = costumes;
    rec.active_costume = active_costume;
  }

  const now = Date.now() / 1000;
  const gender = normalizeGender(rec.gender ?? rec.sex);
  const appearance = cleanText(rec.appearance || '', 4000);
  await idbPut('characters', {
    scope: scopeKey,
    id: rec.id,
    name: rec.name,
    aliases: rec.aliases,
    surname: rec.surname || '',
    given_name: rec.given_name || '',
    surname_variants: rec.surname_variants || [],
    given_name_variants: rec.given_name_variants || [],
    priority: Number(rec.priority || 0),
    attire_locked: wearLocked(rec.attire_locked),
    accessories_locked: wearLocked(rec.accessories_locked),
    schema_version: 2,
    appearance,
    attire: rec.attire,
    accessories: rec.accessories || '',
    costumes: rec.costumes || [],
    active_costume: Number(rec.active_costume || 0),
    original: rec.original || '',
    gender,
    hair_color: normalizeHairColorSlot(rec.hair_color || '', 120),
    hair_style: cleanText(rec.hair_style || '', 400),
    eye_color: normalizeEyeColorSlot(rec.eye_color || '', 120),
    height: cleanText(rec.height || '', 80),
    age: rec.age ?? '',
    penis_size: cleanText(rec.penis_size || '', 40),
    wear_state: parseWearState(rec.wear_state) || '',
    ref_hash: hasOwn(raw, 'ref_hash')
      ? sanitizeHash((raw as Record<string, unknown>).ref_hash)
      : sanitizeHash(sameRow?.ref_hash || dup?.ref_hash || rec.ref_hash),
    example_hash: hasOwn(raw, 'example_hash')
      ? sanitizeHash((raw as Record<string, unknown>).example_hash)
      : sanitizeHash(sameRow?.example_hash || rec.example_hash),
    updated_at: now,
  });
  rec.appearance = appearance;
  rec.gender = gender;
  if (scopeKey !== GLOBAL_SCOPE) {
    const appKey = `appearance:${scopeKey}`;
    const existing = ((await idbGet('meta', appKey))?.value || {}) as Record<string, unknown>;
    const tags = fullTags(rec);
    if (tags) existing[rec.name] = tags;
    else delete existing[rec.name];
    await idbPut('meta', { key: appKey, value: existing, updated_at: now });
  } else if (attireProvided || accessoriesProvided) {
    // Global wear edits must win over stale session overlays (LLM re-injects accessories).
    await clearSessionWearOverlaysFor(rec, {
      clearAttire: attireProvided,
      clearAccessories: accessoriesProvided,
    });
  }
  return rec as CharacterRecord;
}

/**
 * Drop attire/accessories on appearance-empty session rows that match a global character.
 * Those rows are wardrobe overlays and otherwise keep shadowing a manual global clear
 * (e.g. removing "airpods in one ear" from global while a chat overlay still has it).
 */
async function clearSessionWearOverlaysFor(
  globalRec: CharacterInput | null | undefined,
  { clearAttire = true, clearAccessories = true }: { clearAttire?: boolean; clearAccessories?: boolean } = {},
): Promise<number> {
  if (!globalRec || (!clearAttire && !clearAccessories)) return 0;
  const match = (row: CharacterRecord): boolean => {
    if (!row || row.scope === GLOBAL_SCOPE) return false;
    if (characterHasAppearance(row)) return false;
    return !!characterMatchesIdentity(row, globalRec);
  };
  let changed = 0;
  try {
    const rows = await idbGetAll('characters');
    for (const row of rows || []) {
      if (!match(row)) continue;
      const nextAttire = clearAttire ? '' : (row.attire || '');
      const nextAcc = clearAccessories ? '' : (row.accessories || '');
      if ((row.attire || '') === nextAttire && (row.accessories || '') === nextAcc) continue;
      await idbPut('characters', {
        ...row,
        attire: nextAttire,
        accessories: nextAcc,
        updated_at: Date.now() / 1000,
      });
      changed += 1;
    }
  } catch {
    /* a storage failure must not abort the upsert that triggered the cleanup */
  }
  return changed;
}

export async function deleteCharacter(scope: string, id: string): Promise<boolean> {
  const scopeKey = cleanText(scope, 200) || GLOBAL_SCOPE;
  const idKey = cleanText(id, 80);
  if (!idKey) return false;
  const row = await idbGet('characters', { scope: scopeKey, id: idKey });
  await idbDelete('characters', { scope: scopeKey, id: idKey });
  if (scopeKey !== GLOBAL_SCOPE && row?.name) {
    const appKey = `appearance:${scopeKey}`;
    const existing = { ...(((await idbGet('meta', appKey))?.value || {}) as Record<string, unknown>) };
    delete existing[row.name];
    await idbPut('meta', { key: appKey, value: existing, updated_at: Date.now() / 1000 });
  }
  return true;
}

const characterMatchesDeleteRef = (char: CharacterInput, ref: CharacterInput): boolean =>
  !!characterMatchesIdentity(char, ref);

/** Anything object-shaped carrying an id or a name is a usable reference. */
function refList(value: unknown[]): CharacterInput[] {
  return (Array.isArray(value) ? value : []).filter((r): r is CharacterInput => {
    if (!r || typeof r !== 'object') return false;
    const rec = r as CharacterInput;
    return Boolean(rec.id || rec.name);
  });
}

async function originScopeForUnifiedRow(
  raw: CharacterInput,
  sessionIds: unknown[],
): Promise<string> {
  const roots = [...new Set(
    (sessionIds || []).map((s) => cleanText(s, 200)).filter((sid) => sid && sid !== GLOBAL_SCOPE),
  )];
  const hinted = cleanText((raw as { scope?: unknown }).scope, 200);
  if (hinted && roots.includes(hinted)) return hinted;
  const id = cleanText(raw.id, 80);
  if (id) {
    const idHits: string[] = [];
    for (const sid of roots) {
      const hit = (await listCharacters(sid)).find((c) => cleanText(c.id, 80) === id);
      if (hit) idHits.push(sid);
    }
    if (idHits.length === 1) return idHits[0]!;
  }
  const nameHits: string[] = [];
  for (const sid of roots) {
    const list = await listCharacters(sid);
    if (resolveCharacter(raw.name, list) || (id && list.some((c) => cleanText(c.id, 80) === id))) {
      nameHits.push(sid);
    }
  }
  if (nameHits.length === 1) return nameHits[0]!;
  return '';
}

/**
 * Delete matching roster rows from root chat sessions (unified view delete → roots).
 * Never creates rows.
 */
export async function deleteMatchingInSessions(
  sessionIds: unknown[],
  deletedRefs: unknown[],
  skipSessionId = '',
): Promise<SessionEditCount & { deleted: number }> {
  const refs = refList(deletedRefs);
  if (!refs.length) return { deleted: 0, sessions: 0 };
  const skip = cleanText(skipSessionId, 200);
  let deleted = 0;
  let sessions = 0;
  const touched = new Set<string>();
  for (const ref of refs) {
    const sid = await originScopeForUnifiedRow(ref, sessionIds);
    if (!sid || sid === skip) continue;
    const list = await listCharacters(sid);
    for (const char of list) {
      if (!characterMatchesDeleteRef(char, ref) && cleanText(char.id, 80) !== cleanText(ref.id, 80)) continue;
      await deleteCharacter(sid, char.id);
      deleted += 1;
      touched.add(sid);
    }
  }
  sessions = touched.size;
  return { deleted, sessions };
}

export async function patchExistingInSessions(
  sessionIds: unknown[],
  characters: unknown[],
  skipSessionId = '',
): Promise<SessionEditCount & { updated: number }> {
  const rows = refList(characters);
  if (!rows.length) return { updated: 0, sessions: 0 };
  const skip = cleanText(skipSessionId, 200);
  let updated = 0;
  const touched = new Set<string>();
  for (const raw of rows) {
    const sid = await originScopeForUnifiedRow(raw, sessionIds);
    if (!sid || sid === skip) continue;
    const list = await listCharacters(sid);
    const existing = (cleanText(raw.id, 80) ? list.find((c) => cleanText(c.id, 80) === cleanText(raw.id, 80)) : null)
      || resolveCharacter(raw.name, list)
      || (Array.isArray(raw.aliases) ? raw.aliases.map((a) => resolveCharacter(a, list)).find(Boolean) : null);
    if (!existing) continue;
    const rec = await upsertCharacter(sid, {
      ...raw,
      id: existing.id,
      name: existing.name || raw.name,
    });
    if (rec) {
      updated += 1;
      touched.add(sid);
    }
  }
  return { updated, sessions: touched.size };
}

export async function replaceCharacters(
  scope: string,
  characters: unknown[],
  opts: ReplaceOptions = {},
): Promise<CharacterRecord[]> {
  const scopeKey = cleanText(scope, 200) || GLOBAL_SCOPE;
  const prune = opts.prune === true;
  const rootSessionIds = Array.isArray(opts.rootSessionIds) ? opts.rootSessionIds : [];
  if (rootSessionIds.length) {
    const rows = (characters || [])
      .map((raw) => normalizeCharacterRecord(raw))
      .filter((c): c is MigratedCharacter => Boolean(c));
    const out: CharacterRecord[] = [];
    for (const raw of rows) {
      const sid = await originScopeForUnifiedRow(raw, rootSessionIds);
      if (!sid) continue;
      const rec = await upsertCharacter(sid, raw);
      if (rec) out.push(rec);
    }
    return out;
  }
  const merged = mergeCharactersByAlias((characters || []) as CharacterInput[]);
  const out: CharacterRecord[] = [];
  for (const raw of merged) {
    const rec = await upsertCharacter(scopeKey, raw);
    if (rec) out.push(rec);
  }
  if (prune) {
    const keep = new Set(out.map((c) => cleanText(c.id, 80)).filter(Boolean));
    for (const old of await listCharacters(scopeKey)) {
      const oid = cleanText(old.id, 80);
      if (oid && !keep.has(oid)) await deleteCharacter(scopeKey, oid);
    }
  }
  return out;
}

// ── payloads ───────────────────────────────────────────────────────────────

export async function getCharactersPayload(sessionId: string, characterId = ''): Promise<Record<string, unknown>> {
  const sid = cleanText(sessionId, 200);
  const cid = cleanText(characterId, 200);
  const session = sid ? await listCharacters(sid) : [];
  const disabled = cid ? await getDisabledGlobalsSet(cid) : new Set<string>();
  const globalChars: CharacterRecord[] = [];
  for (const char of await listCharacters(GLOBAL_SCOPE)) {
    const item = { ...char };
    item.enabled_for_character = cid ? !globalToggleKeyDisabled(char, disabled) : true;
    globalChars.push(item);
  }
  const appearance = Object.fromEntries(session.map((c) => [c.name, fullTags(c)]));
  return {
    ok: true,
    session_id: sid,
    character_id: cid,
    characters: session,
    global: globalChars,
    appearance,
    disabled_globals: [...disabled].sort(),
    global_enabled: cid ? await globalEnabledMap(cid) : {},
  };
}

export async function unifyCharacterSessions(
  targetSessionId: string,
  sourceSessionIds: unknown[],
  includeTarget = true,
): Promise<ApiResult> {
  const target = cleanText(targetSessionId, 200);
  if (!target) return { ok: false, error: { code: 'bad_request', message: 'target_session_id required' } };
  // UI unified view always sends include_target:false and target=__unified__ id.
  // Drop leftover display-cache rows so GET of that id cannot resurrect them.
  if (!includeTarget) {
    for (const old of await listCharacters(target)) {
      await deleteCharacter(target, old.id);
    }
  }
  const sources = [...(sourceSessionIds || [])];
  if (includeTarget) sources.push(target);
  const listed = await listUnifiedViewCharacters(sources);
  const payload = await getCharactersPayload('', '');
  const appearance = Object.fromEntries(listed.map((c) => [c.name, fullTags(c)]));
  return {
    ...payload,
    ok: true,
    session_id: target,
    characters: listed,
    appearance,
    merged: listed.length,
    sources: [...new Set(
      (sourceSessionIds || []).map((s) => cleanText(s, 200)).filter(Boolean),
    )],
  };
}

export async function getAppearance(sessionId: string): Promise<Record<string, string>> {
  return Object.fromEntries((await listCharacters(sessionId)).map((c) => [c.name, fullTags(c)]));
}

export async function setAppearance(sessionId: string, mapping: unknown): Promise<ApiResult> {
  const chars = Object.entries((mapping || {}) as Record<string, unknown>).map(([name, tags]) => ({ name, tags }));
  await replaceCharacters(sessionId, chars);
  return { ok: true, appearance: await getAppearance(sessionId) };
}

// ── tagger merge ───────────────────────────────────────────────────────────

/**
 * Copy aliases from latin-given peers onto appearance-filled hosts (asset refs).
 * Does not delete or fold donor rows. Persist before LLM trigger inject.
 */
export async function absorbAliasesOntoLatinPeers(args: {
  sessionId?: string;
  unifiedSessionId?: string;
  characterId?: string;
  sourceSessionIds?: unknown[];
}): Promise<CharacterRecord[]> {
  const sessionId = cleanText(args.sessionId || '', 200);
  const unifiedSessionId = cleanText(args.unifiedSessionId || '', 200);
  const characterId = cleanText(args.characterId || '', 200);
  const sourceSessionIds = args.sourceSessionIds ?? [];
  let roster = await rosterForSession(sessionId, unifiedSessionId, characterId, sourceSessionIds);
  const hosts = roster.filter((row) => characterHasAppearance(row));
  for (const host of hosts) {
    let aliases = parseAliasList([...(host.aliases || []), host.name]);
    let changed = false;
    for (const donor of roster) {
      if (!donor || cleanText(donor.id, 80) === cleanText(host.id, 80)) continue;
      if (!latinGivenTokenOverlap(host, donor)) continue;
      const next = absorbAliasesFromDonor(host, donor);
      const nextList = parseAliasList(next);
      if (nextList.length > aliases.length || nextList.some((a) => !aliases.includes(a))) {
        aliases = nextList;
        changed = true;
      }
    }
    if (!changed) continue;
    const writeScope = host.scope === GLOBAL_SCOPE ? GLOBAL_SCOPE : (host.scope || sessionId);
    await upsertCharacter(writeScope, {
      ...host,
      aliases,
    });
    roster = await rosterForSession(sessionId, unifiedSessionId, characterId, sourceSessionIds);
  }
  return roster;
}

/**
 * Folds the tagger's `new_characters` and every shot's cast back into the roster,
 * then returns the roster the generator should use.
 *
 * The roster is re-read after every write because each upsert can fold two rows
 * into one, which changes what the next name resolves to.
 */
export async function mergeRosterFromTagged(args: MergeRosterArgs): Promise<CharacterRecord[]> {
  const { sessionId, tagged, shotChars } = args;
  const unifiedSessionId = args.unifiedSessionId ?? '';
  const sourceSessionIds = args.sourceSessionIds ?? [];
  const characterId = cleanText(args.characterId || '', 200);
  const assetLooks = !!args.assetLooks;
  const assetPriorityFloor = assetLooks ? ASSET_LOOKS_PRIORITY : 0;
  const originalHints = args.originalHints && typeof args.originalHints === 'object' ? args.originalHints : {};
  const originalFromHint = (raw: unknown): string => {
    if (!raw || typeof raw !== 'object') return '';
    const rec = raw as CharacterInput;
    const keys = [rec.name, ...(rec.aliases || []), ...characterTriggers(rec)];
    let best = '';
    for (const k of keys) {
      const ck = compactAssetKey(k, 200);
      const hit = ck ? originalHints[ck] : '';
      if (hit && hit.length > best.length) best = hit;
    }
    return best;
  };
  // Autotag / new chars always land on the live chat — never the unified cache.
  const writeSessionId = cleanText(sessionId || '', 200);
  const readRoster = (): Promise<CharacterRecord[]> =>
    rosterForSession(sessionId, unifiedSessionId, characterId, sourceSessionIds);

  let roster = await readRoster();
  const pool = sourceSessionIds.length
    ? await listMergedSessionCharacters([writeSessionId, ...sourceSessionIds])
    : roster;
  const newList = [...(tagged.new_characters || [])];
  const covered = new Set(newList.map((raw) => normalizeAlias(raw?.name)));
  for (const row of pool) {
    const key = normalizeAlias(row.name);
    if (key && characterHasAppearance(row)) covered.add(key);
  }
  const shotLookFallbacks = new Map<string, { appearance: string; attire: string; accessories: string }>();
  const namePartsFrom = (rec: NamePartSource, existing: NamePartSource = null): NameParts => ({
    surname: cleanText(rec?.surname || existing?.surname || '', 200),
    given_name: cleanText(rec?.given_name || existing?.given_name || '', 200),
    surname_variants: parseAliasList([
      ...spreadLoose(existing?.surname_variants),
      ...spreadLoose(rec?.surname_variants),
      rec?.surname,
      existing?.surname,
    ]),
    given_name_variants: parseAliasList([
      ...spreadLoose(existing?.given_name_variants),
      ...spreadLoose(rec?.given_name_variants),
      rec?.given_name,
      existing?.given_name,
    ]),
  });
  for (const char of shotChars || []) {
    const name = cleanText(char.name, 200);
    if (!name) continue;
    const key = normalizeAlias(name);
    const shotApp = joinTags(char.label, char.age, char.appearance, char.body);
    const shotAttire = cleanText(char.attire || '');
    const shotAcc = cleanText(char.accessories || '');
    if (covered.has(key)) {
      if (shotApp || shotAttire || shotAcc) {
        const previous = shotLookFallbacks.get(key);
        shotLookFallbacks.set(key, {
          appearance: joinTags(previous?.appearance, shotApp),
          attire: joinTags(previous?.attire, shotAttire),
          accessories: joinTags(previous?.accessories, shotAcc),
        });
      }
      continue;
    }
    const existing = resolveCharacter(name, pool);
    if (existing && characterHasAppearance(existing)) continue;
    if (!shotApp && !shotAttire && !shotAcc) continue;
    newList.push({
      name,
      aliases: parseAliasList(char.aliases) || [name],
      original: cleanText(char.original || char.original_tag || '', 400),
      appearance: shotApp,
      attire: shotAttire,
      accessories: shotAcc,
      ...namePartsFrom(char, null),
    });
    covered.add(key);
  }
  if (typeof tagged === 'object') tagged.new_characters = newList;

  for (const raw of newList) {
    const rec = normalizeCharacterRecord(raw);
    if (!rec) continue;
    const hinted = originalFromHint(raw) || originalFromHint(rec);
    if (hinted) rec.original = hinted;
    const weightMap = getLastAssetWeightMap();
    if (weightMap.size) {
      rec.appearance = restoreAssetTagWeights(rec.appearance, weightMap);
      rec.attire = restoreAssetTagWeights(rec.attire, weightMap);
      rec.accessories = restoreAssetTagWeights(rec.accessories, weightMap);
    }
    const buckets = normalizeTaggedLookBuckets(rec, shotLookFallbacks.get(normalizeAlias(rec.name)));
    rec.appearance = buckets.appearance;
    rec.attire = buckets.attire;
    rec.accessories = buckets.accessories;
    const existing = resolveCharacter(rec.name, pool) || resolveCharacter(rec.name, roster);
    const newApp = cleanText(rec.appearance || '');
    const newAttire = cleanText(rec.attire || '');
    const newAccessories = cleanText(rec.accessories || '');
    if (existing) {
      const fill = incomingLooksForIncomplete(existing, {
        appearance: newApp,
        attire: newAttire,
        accessories: newAccessories,
      });
      if (fill) {
        const writeScope = existing.scope === GLOBAL_SCOPE ? GLOBAL_SCOPE : (existing.scope || writeSessionId);
        await upsertCharacter(writeScope, {
          id: existing.id,
          name: existing.name,
          appearance: fill.appearance,
          attire: fill.attire,
          accessories: fill.accessories,
          ...(hinted ? { original: hinted } : {}),
          ...(cleanText(rec.hair_color || '') ? { hair_color: rec.hair_color } : {}),
          ...(cleanText(rec.hair_style || '') ? { hair_style: rec.hair_style } : {}),
          ...(cleanText(rec.eye_color || '') ? { eye_color: rec.eye_color } : {}),
          ...(cleanText(rec.height || '') ? { height: rec.height } : {}),
          ...(rec.age != null && rec.age !== '' ? { age: rec.age } : {}),
          ...(cleanText(rec.penis_size || '') ? { penis_size: rec.penis_size } : {}),
          ...(rec.gender ? { gender: rec.gender } : {}),
        });
      }
      roster = await readRoster();
      continue;
    }
    const costumes = mergeCostumeLists(
      null,
      Array.isArray(raw.costumes) && raw.costumes.length
        ? raw.costumes
        : [{ name: 'default', attire: newAttire, accessories: newAccessories }],
      { protectDefault: false },
    );
    const appearance = newApp || '';
    const attire = newAttire || costumes[0]?.attire || '';
    const accessories = newAccessories || costumes[0]?.accessories || '';
    const { appearance: _dropApp, attire: _dropAtt, accessories: _dropAcc, ...rest } = rec;
    void _dropApp;
    void _dropAtt;
    void _dropAcc;
    await upsertCharacter(writeSessionId, {
      ...rest,
      costumes,
      active_costume: 0,
      attire_locked: wearLocked(rec.attire_locked),
      accessories_locked: wearLocked(rec.accessories_locked),
      priority: Math.max(assetPriorityFloor, Number(rec.priority || 0)),
      ...(appearance ? { appearance } : {}),
      ...(attire ? { attire } : {}),
      ...(accessories ? { accessories } : {}),
    });
    roster = await readRoster();
  }

  const costumePairs = collectCostumePairs({
    new_costumes: (tagged as { new_costumes?: unknown }).new_costumes,
    new_characters: tagged.new_characters,
    shots: [{ characters: shotChars }],
  });
  for (const pair of costumePairs) {
    const name = pair.name;
    const incoming = pair.costumes;
    if (!incoming.length) continue;
    const existing = resolveCharacter(name, roster);
    if (!existing) continue;
    const writeScope = existing.scope === GLOBAL_SCOPE ? GLOBAL_SCOPE : (existing.scope || writeSessionId);
    const protectDefault = characterHasAppearance(existing);
    const merged = mergeCostumeLists(existing.costumes, incoming, { protectDefault });
    const wearName = incoming[incoming.length - 1]?.name;
    const wearIndex = wearName ? resolveCostumeIndex(merged, wearName) : -1;
    await upsertCharacter(writeScope, {
      id: existing.id,
      name: existing.name,
      costumes: merged,
      active_costume: wearIndex >= 0 ? wearIndex : existing.active_costume,
    });
    roster = await readRoster();
  }

  for (const char of shotChars || []) {
    const name = cleanText(char.name, 200);
    if (!name) continue;
    const existing = resolveCharacter(name, pool) || resolveCharacter(name, roster);
    if (existing) continue;
    {
      const appearance = joinTags(char.label, char.age, char.appearance || '', char.body || '');
      const attire = cleanText(char.attire || '');
      const accessories = cleanText(char.accessories || '');
      if (!appearance && !attire && !accessories) continue;
      await upsertCharacter(writeSessionId, {
        name,
        aliases: parseAliasList(char.aliases) || [name],
        original: cleanText(char.original || char.original_tag || '', 400),
        attire_locked: true,
        accessories_locked: true,
        ...namePartsFrom(char, null),
        ...(appearance ? { appearance } : {}),
        ...(attire ? { attire } : {}),
        ...(accessories ? { accessories } : {}),
      });
    }
    roster = await readRoster();
  }
  await absorbAliasesOntoLatinPeers({
    sessionId,
    unifiedSessionId,
    characterId,
    sourceSessionIds,
  });
  const seededRoster = await readRoster();
  await seedCharRefsFromLooks(seededRoster).catch((err) => {
    dbg('char_ref.seed.merge.fail', { message: String((err as Error)?.message || err) }, 'warn');
  });
  return readRoster();
}

/**
 * Persist per-chat clothing state on the live session row (never the global).
 * Overlay rows with empty appearance still carry wear_state into the next tagger inject.
 */
export async function persistChatWearStates(
  sessionId: string,
  roster: CharacterRecord[],
  wearByName: Map<string, WearState>,
): Promise<void> {
  const writeSessionId = cleanText(sessionId || '', 200);
  if (!writeSessionId || !wearByName.size) return;
  for (const [key, state] of wearByName) {
    const rec = resolveCharacter(key, roster);
    if (!rec) continue;
    const prev = parseWearState(rec.wear_state) || 'clothed';
    if (prev === state) continue;
    await upsertCharacter(writeSessionId, {
      id: rec.id,
      name: rec.name,
      aliases: rec.aliases,
      wear_state: state,
    });
  }
}

// ── one-time migrations ────────────────────────────────────────────────────

/** Seeds the roster from the pre-roster `appearance:<session>` meta rows. */
export async function migrateAppearanceToCharacters(): Promise<void> {
  const chars = await idbGetAll('characters');
  if (chars.length) return;
  const appearanceRows = await idbGetAll('meta');
  const appRows = appearanceRows.filter((r) => r.key?.startsWith('appearance:'));
  if (!appRows.length) return;
  for (const row of appRows) {
    const sessionId = row.key.slice('appearance:'.length);
    const mapping = (row.value || {}) as Record<string, unknown>;
    for (const [name, tags] of Object.entries(mapping)) {
      const rec = normalizeCharacterRecord({ name, tags }, name);
      if (rec) await upsertCharacter(sessionId, rec);
    }
  }
}

/** Lifts schema-1 rows to the surname/given-name identity model. */
export async function migrateCharacterIdentity(): Promise<void> {
  const rows = await idbGetAll('characters');
  for (const row of rows) {
    if (Number(row.schema_version || 0) >= 2) continue;
    const rec = normalizeCharacterRecord(row);
    if (!rec) continue;
    await idbPut('characters', {
      ...row,
      ...rec,
      scope: row.scope,
      updated_at: row.updated_at || Date.now() / 1000,
    });
  }
}
