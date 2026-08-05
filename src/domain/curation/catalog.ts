/**
 * Curation catalog: modifier/composition groups with verified Danbooru tags.
 * Pure — no I/O. LLM sees group/option ids+descriptions; tags stay local.
 */
import defaultCatalog from '../../config/curation-catalog.default.json';
import { cleanText, joinTags } from '../../core/util/text';
import { resolveCharacterGender } from '../character/tags';

export const MAX_OPTIONS_PER_GROUP = 10;
/** Soft cap for user-uploaded catalogs (Asset Maid groups can exceed 10). */
export const MAX_OPTIONS_PER_GROUP_IMPORT = 80;

/** Where assembled option tags go in the NAI prompt / tag-edit popup. */
export type CurationSlot = 'base' | 'char' | 'primary' | 'secondary' | 'female' | 'male';

export interface CurationOption {
  id: string;
  description: string;
  tags: string;
  /** Default slot when `by_slot` is empty. */
  slot: CurationSlot;
  /** Maid-style path split (global/primary/secondary/female/male). */
  by_slot?: Partial<Record<CurationSlot, string>>;
}

export interface CurationGroup {
  id: string;
  label: string;
  options: CurationOption[];
  /**
   * Asset Maid "continuity" group (e.g. a wear/injury state that persists once
   * set). Never offered to the pass-2 LLM — see `nonContinuityGroups`. The last
   * value picked for it is instead carried forward job-scope (services/curation.ts).
   */
  continuity?: boolean;
}

export interface CurationCatalog {
  version: number;
  name: string;
  groups: CurationGroup[];
  /** Stable fingerprint for stale-embedding checks. */
  sha?: string;
  /**
   * Asset Maid `presets` tree (composition → category → position → variant).
   * When present, two_stage uses leaf-path assembly instead of flat group pick.
   */
  presets?: unknown;
  /** True when `presets` is a non-null object (saved explicitly for status/UI). */
  has_presets?: boolean;
  /**
   * Asset Maid `modifier_lanes` — e.g. manual lane max_active_groups:1 so
   * arm_pose and partner_contact are not both kept.
   */
  modifier_lanes?: CurationModifierLanes;
  /** Maid `global.fixed_positive` (e.g. `-3::grid, multiple views…`). */
  fixed_positive?: string;
  /** Maid `global.fixed_negative`. */
  fixed_negative?: string;
  /**
   * Maid `subjects` (actor/role definitions) — preserved as-is. Not interpreted
   * by Inlay; `by_slot` already carries per-actor tags at the option level.
   */
  subjects?: unknown;
  /**
   * Maid `selection` (pass-2 selection metadata, e.g. per-scene pick rules).
   * Preserved as-is; `modifier_lanes` is Inlay's own enforced subset of this.
   */
  selection?: unknown;
  /**
   * Maid `global.prompt_order` — the slot/category join order the original tool
   * used. Used to order assembled tags as closely as practical; missing → the
   * existing base/char/primary/secondary/female/male order (no behaviour change
   * for catalogs that never had it).
   */
  prompt_order?: string[];
  /** Group ids with `continuity: true`, flattened for quick lookup. */
  continuity_group_ids?: string[];
}

/** One lane: at most N matching modifier groups may stay active. */
export interface CurationModifierLane {
  scope?: string;
  max_active_groups: number;
  /** Glob-ish patterns (`manual.sexual.*`); earlier = higher priority when truncating. */
  fallback_order: string[];
}

export type CurationModifierLanes = Record<string, CurationModifierLane>;

/** Whether this catalog should use Maid-style leaf assembly. */
export function catalogHasPresets(catalog: CurationCatalog | null | undefined): boolean {
  if (!catalog) return false;
  if (catalog.has_presets === true) return true;
  return catalog.presets != null && typeof catalog.presets === 'object';
}

function normalizeModifierLanes(raw: unknown): CurationModifierLanes | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: CurationModifierLanes = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const id = cleanText(key, 80);
    if (!id || !value || typeof value !== 'object' || Array.isArray(value)) continue;
    const v = value as Record<string, unknown>;
    const order = Array.isArray(v.fallback_order)
      ? v.fallback_order.map((x) => cleanText(x, 160)).filter(Boolean)
      : [];
    const max = Math.max(1, Math.min(8, Number(v.max_active_groups) || 1));
    if (!order.length) continue;
    out[id] = {
      max_active_groups: max,
      fallback_order: order,
      ...(cleanText(v.scope, 40) ? { scope: cleanText(v.scope, 40) } : {}),
    };
  }
  return Object.keys(out).length ? out : undefined;
}

/** Glob-ish match: `manual.sexual.*` → prefix; exact otherwise. */
export function matchLanePattern(pattern: string, groupId: string): boolean {
  const p = cleanText(pattern, 160).toLowerCase();
  const g = cleanText(groupId, 160).toLowerCase();
  if (!p || !g) return false;
  if (p.endsWith('.*')) {
    const prefix = p.slice(0, -1); // keep trailing dot: "manual.sexual."
    return g.startsWith(prefix) || g === p.slice(0, -2);
  }
  if (p.endsWith('*')) return g.startsWith(p.slice(0, -1));
  return g === p;
}

/** Parse `["id", ...]` or a `"id,id"` string into a deduped, cleaned id list. */
export function parseOptionIdList(optionIds: unknown): string[] {
  const raw = Array.isArray(optionIds)
    ? optionIds
    : cleanText(optionIds, 800).split(/[,|]/);
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const id = cleanText(item, 120);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

/**
 * Drop excess option ids so each modifier_lane keeps ≤ max_active_groups.
 * Priority = earliest matching pattern in that lane's fallback_order.
 */
export function clampOptionIdsByLanes(
  catalog: CurationCatalog,
  optionIds: unknown,
): string[] {
  const ids = parseOptionIdList(optionIds);
  const lanes = catalog.modifier_lanes;
  if (!lanes || !Object.keys(lanes).length) return ids;

  // option → group
  const groupOf = new Map<string, string>();
  for (const id of ids) {
    const hit = getCurationOption(catalog, id);
    if (hit) groupOf.set(id, hit.group.id);
  }

  const dropGroups = new Set<string>();
  for (const lane of Object.values(lanes)) {
    const matchedGroups = new Set<string>();
    for (const gid of groupOf.values()) {
      if (lane.fallback_order.some((pat) => matchLanePattern(pat, gid))) {
        matchedGroups.add(gid);
      }
    }
    if (matchedGroups.size <= lane.max_active_groups) continue;

    const ranked = [...matchedGroups].map((gid) => {
      let rank = lane.fallback_order.length;
      for (let i = 0; i < lane.fallback_order.length; i++) {
        if (matchLanePattern(lane.fallback_order[i]!, gid)) {
          rank = i;
          break;
        }
      }
      return { gid, rank };
    });
    ranked.sort((a, b) => a.rank - b.rank || a.gid.localeCompare(b.gid));
    const keep = new Set(ranked.slice(0, lane.max_active_groups).map((r) => r.gid));
    for (const { gid } of ranked) {
      if (!keep.has(gid)) dropGroups.add(gid);
    }
  }

  if (!dropGroups.size) return ids;
  return ids.filter((id) => {
    const g = groupOf.get(id);
    return !g || !dropGroups.has(g);
  });
}

export interface CurationTagSplit {
  base: string;
  char: string;
  primary: string;
  secondary: string;
  female: string;
  male: string;
}

function emptySplit(): CurationTagSplit {
  return { base: '', char: '', primary: '', secondary: '', female: '', male: '' };
}

/**
 * Resolve option slot. Explicit wins; else group-id heuristics:
 * place/camera/solo composition → base; pose/expression/duo composition → char.
 */
export function inferCurationSlot(groupId: unknown, explicit?: unknown): CurationSlot {
  const ex = cleanText(explicit, 40).toLowerCase();
  if (['char', 'character', 'actor'].includes(ex)) return 'char';
  if (['primary', 'main'].includes(ex)) return 'primary';
  if (['secondary', 'partner'].includes(ex)) return 'secondary';
  if (['female', 'f', 'girl', 'woman'].includes(ex)) return 'female';
  if (['male', 'm', 'boy', 'man'].includes(ex)) return 'male';
  if (['base', 'global', 'scene', 'camera', 'place'].includes(ex)) return 'base';
  const g = cleanText(groupId, 160).toLowerCase();
  // Actor / contact / hands — go on characters, not NAI base (Maid subject path).
  if (
    /^(pose|expression|gesture|emotion|contact|action|interaction|manual|relation|gaze)([./_]|$)/.test(g)
    || /\.(pose|expression|gesture|interaction|manual|contact)\b/.test(g)
  ) {
    return 'char';
  }
  if (/^composition\.(duo|pair|multi|group|couple)/.test(g)) return 'char';
  if (/^(place|camera|background|location|framing|view|lighting|scene)([./_]|$)/.test(g)) return 'base';
  if (/^composition\./.test(g)) return 'base';
  if (/^state\./.test(g)) return 'char';
  return 'base';
}

/** Map Maid prompt path key (`female.orientation.body`) → curation slot. */
export function slotFromMaidPath(path: unknown): CurationSlot | null {
  const key = cleanText(path, 200).toLowerCase();
  if (!key) return null;
  const head = key.split('.')[0] || '';
  if (head === 'global' || head === 'scene' || head === 'camera') return 'base';
  if (head === 'primary') return 'primary';
  if (head === 'secondary') return 'secondary';
  if (head === 'female' || head === 'girl' || head === 'woman') return 'female';
  if (head === 'male' || head === 'boy' || head === 'man') return 'male';
  if (head === 'persona') return 'base';
  return null;
}

/**
 * Asset Maid option.prompt may be weight pairs OR a path→prompt map
 * (`{"female.orientation.body":[[2,"facing another"]], "global.camera.view":...}`).
 */
/**
 * Maid composition nodes put person-count on `global.composition` (`3::1girl, 1boy::`).
 * Inlay owns person tags via card.person_tag_weight — skip that path on assembly.
 */
function isMaidPersonCompositionPath(path: string): boolean {
  return path.trim().toLowerCase() === 'global.composition';
}

export function maidPromptToBySlot(prompt: unknown): Partial<Record<CurationSlot, string>> {
  if (!prompt || typeof prompt !== 'object' || Array.isArray(prompt)) return {};
  const out: Partial<Record<CurationSlot, string>> = {};
  for (const [path, value] of Object.entries(prompt as Record<string, unknown>)) {
    if (isMaidPersonCompositionPath(path)) continue;
    const slot = slotFromMaidPath(path);
    if (!slot) continue;
    const tags = maidPromptToTags(value);
    if (!tags) continue;
    out[slot] = joinTags(out[slot], tags);
  }
  return out;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Asset Maid option.prompt is usually `[[weight, "tag"], ...]` (or plain strings).
 * Convert to NovelAI-style `2::tag::` comma list. Empty prompt → "".
 */
export function maidPromptToTags(prompt: unknown): string {
  if (typeof prompt === 'string') return cleanText(prompt, 800);
  if (!Array.isArray(prompt) || !prompt.length) return '';
  const parts: string[] = [];
  for (const row of prompt) {
    if (typeof row === 'string') {
      const t = cleanText(row, 200);
      if (t) parts.push(t);
      continue;
    }
    if (!Array.isArray(row) || row.length < 2) continue;
    const weight = Number(row[0]);
    const tag = cleanText(row[1], 200);
    if (!tag) continue;
    if (Number.isFinite(weight) && weight !== 1) {
      parts.push(`${weight}::${tag}::`);
    } else {
      parts.push(tag);
    }
  }
  return joinTags(...parts);
}

function normalizeOption(raw: unknown, index: number, groupId: string): CurationOption | null {
  const o = asRecord(raw);
  if (!o) return null;
  const id = cleanText(o.id, 120) || `opt_${index}`;
  const fromPaths = maidPromptToBySlot(o.prompt);
  const explicitBySlot = asRecord(o.by_slot) || asRecord(o.slots) || asRecord(o.actors);
  const by_slot: Partial<Record<CurationSlot, string>> = { ...fromPaths };
  if (explicitBySlot) {
    for (const key of ['base', 'char', 'primary', 'secondary', 'female', 'male'] as CurationSlot[]) {
      const tags = cleanText(explicitBySlot[key], 800);
      if (tags) by_slot[key] = joinTags(by_slot[key], tags);
    }
    // Maid actors: { primary: "tags", secondary: "tags" } string values
    for (const [k, v] of Object.entries(explicitBySlot)) {
      const slot = inferCurationSlot(groupId, k);
      if (typeof v === 'string' && cleanText(v)) {
        by_slot[slot] = joinTags(by_slot[slot], cleanText(v, 800));
      }
    }
  }
  // Prefer explicit tags; then Maid `prompt` arrays; then string tag/prompt.
  let tags = cleanText(o.tags ?? o.tag, 800);
  if (!tags) tags = Array.isArray(o.prompt) ? maidPromptToTags(o.prompt) : '';
  if (!tags) tags = cleanText(typeof o.prompt === 'string' ? o.prompt : '', 800);
  if (!tags && Object.keys(by_slot).length) {
    tags = joinTags(...Object.values(by_slot));
  }
  if (!tags) return null;
  const slot = inferCurationSlot(groupId, o.slot ?? o.target ?? o.apply_to);
  const cleanedBySlot = Object.keys(by_slot).length ? by_slot : undefined;
  return {
    id,
    description: cleanText(o.description ?? o.label ?? o.when, 400) || id,
    tags,
    slot,
    ...(cleanedBySlot ? { by_slot: cleanedBySlot } : {}),
  };
}

function normalizeGroup(raw: unknown, index: number, maxOptions: number): CurationGroup | null {
  const g = asRecord(raw);
  if (!g) return null;
  const id = cleanText(g.id, 160) || `group_${index}`;
  const label = cleanText(g.label ?? g.name ?? g.description, 200) || id;
  const src = Array.isArray(g.options)
    ? g.options
    : Array.isArray(g.include_options)
      ? g.include_options
      : [];
  const options: CurationOption[] = [];
  for (let i = 0; i < src.length && options.length < maxOptions; i++) {
    const opt = normalizeOption(src[i], i, id);
    if (opt) options.push(opt);
  }
  if (!options.length) return null;
  const continuity = g.continuity === true || g.continuity === 'true';
  return { id, label, options, ...(continuity ? { continuity: true as const } : {}) };
}

/**
 * Asset Maid DEFAULT_PRESET_CATALOG: `{ modifier_library: Group[] | Record }`.
 * Flatten into our groups list. The `presets` tree is preserved separately on the catalog.
 */
function groupsFromMaidLibrary(library: unknown, maxOptions: number): CurationGroup[] {
  const entries: unknown[] = Array.isArray(library)
    ? library
    : library && typeof library === 'object'
      ? Object.values(library as Record<string, unknown>)
      : [];
  const groups: CurationGroup[] = [];
  for (let i = 0; i < entries.length; i++) {
    const g = normalizeGroup(entries[i], i, maxOptions);
    if (g) groups.push(g);
  }
  return groups;
}

function extractGroupList(root: Record<string, unknown>, input: unknown): {
  list: unknown[];
  maxOptions: number;
  nameHint: string;
  preNormalized: boolean;
} {
  if (root.modifier_library != null) {
    return {
      list: groupsFromMaidLibrary(root.modifier_library, MAX_OPTIONS_PER_GROUP_IMPORT),
      maxOptions: MAX_OPTIONS_PER_GROUP_IMPORT,
      nameHint: 'Asset Maid catalog',
      preNormalized: true,
    };
  }
  if (Array.isArray(root.groups)) {
    return { list: root.groups, maxOptions: MAX_OPTIONS_PER_GROUP_IMPORT, nameHint: '', preNormalized: false };
  }
  if (Array.isArray(input)) {
    return { list: input, maxOptions: MAX_OPTIONS_PER_GROUP_IMPORT, nameHint: '', preNormalized: false };
  }
  return { list: [], maxOptions: MAX_OPTIONS_PER_GROUP, nameHint: '', preNormalized: false };
}

/** Normalize any uploaded / default JSON into a catalog. Throws on empty. */
export function normalizeCurationCatalog(input: unknown, fallbackName = 'catalog'): CurationCatalog {
  const root = asRecord(input) || {};
  const { list, maxOptions, nameHint, preNormalized } = extractGroupList(root, input);
  const groups: CurationGroup[] = [];
  for (let i = 0; i < list.length; i++) {
    if (preNormalized) {
      const g = list[i] as CurationGroup;
      if (g?.id && Array.isArray(g.options) && g.options.length) {
        const options = g.options.slice(0, maxOptions).map((o, oi) => ({
          ...o,
          slot: o.slot || inferCurationSlot(g.id, (o as CurationOption).slot),
          id: o.id || `opt_${oi}`,
          description: o.description || o.id || `opt_${oi}`,
          tags: o.tags,
        }));
        groups.push({ id: g.id, label: g.label || g.id, options, ...(g.continuity ? { continuity: true } : {}) });
      }
      continue;
    }
    const g = normalizeGroup(list[i], i, maxOptions);
    if (g) groups.push(g);
  }
  if (!groups.length) {
    throw new Error(
      '큐레이션 카탈로그에 그룹이 없습니다. Inlay `{groups:[…]}` 또는 Asset Maid `modifier_library` JSON인지 확인하세요.',
    );
  }
  const version = Number(root.version) || 1;
  const name = cleanText(root.name, 200) || nameHint || fallbackName;
  const presets =
    root.presets != null && typeof root.presets === 'object' ? root.presets : undefined;
  const modifier_lanes = normalizeModifierLanes(root.modifier_lanes);
  const global = asRecord(root.global) || {};
  const fixed_positive =
    maidPromptToTags(global.fixed_positive)
    || cleanText(global.fixed_positive ?? root.fixed_positive, 800);
  const fixed_negative =
    maidPromptToTags(global.fixed_negative)
    || cleanText(global.fixed_negative ?? root.fixed_negative, 800);
  // Maid metadata we don't interpret but must not drop on re-export/re-import.
  const subjects = root.subjects ?? global.subjects;
  const selection = root.selection ?? global.selection;
  const promptOrderRaw = global.prompt_order ?? root.prompt_order;
  const prompt_order = Array.isArray(promptOrderRaw)
    ? promptOrderRaw.map((x) => cleanText(x, 40)).filter(Boolean)
    : undefined;
  // A group can self-mark `continuity: true`; the root can also list ids
  // directly (`continuity: ["group.a", ...]`) for catalogs that keep the flag
  // out of the group body.
  const continuityIds = new Set<string>(groups.filter((g) => g.continuity).map((g) => g.id));
  const rootContinuity = root.continuity ?? global.continuity;
  if (Array.isArray(rootContinuity)) {
    for (const id of rootContinuity) {
      const key = cleanText(id, 160);
      if (!key) continue;
      continuityIds.add(key);
      const hit = groups.find((g) => g.id === key);
      if (hit) hit.continuity = true;
    }
  }
  const catalog: CurationCatalog = {
    version,
    name,
    groups,
    ...(presets ? { presets, has_presets: true as const } : { has_presets: false as const }),
    ...(modifier_lanes ? { modifier_lanes } : {}),
    ...(fixed_positive ? { fixed_positive } : {}),
    ...(fixed_negative ? { fixed_negative } : {}),
    ...(subjects != null && typeof subjects === 'object' ? { subjects } : {}),
    ...(selection != null && typeof selection === 'object' ? { selection } : {}),
    ...(prompt_order?.length ? { prompt_order } : {}),
    ...(continuityIds.size ? { continuity_group_ids: [...continuityIds].sort() } : {}),
  };
  catalog.sha = catalogSha(catalog);
  return catalog;
}

/** True when `groupId` is a Maid continuity group (never offered to pass-2 LLM). */
export function isContinuityGroup(catalog: CurationCatalog, groupId: unknown): boolean {
  const id = cleanText(groupId, 160);
  if (!id) return false;
  if (catalog.continuity_group_ids?.includes(id)) return true;
  return getCurationGroup(catalog, id)?.continuity === true;
}

/** Groups safe to dump into an LLM prompt — continuity groups are resolved locally instead. */
export function nonContinuityGroups(catalog: CurationCatalog): CurationGroup[] {
  return catalog.groups.filter((g) => !isContinuityGroup(catalog, g.id));
}

export function defaultCurationCatalog(): CurationCatalog {
  return normalizeCurationCatalog(defaultCatalog, 'Inlay default (SFW)');
}

/** FNV-1a-ish hex over stable JSON — good enough for stale detection. */
export function catalogSha(
  catalog: Pick<
    CurationCatalog,
    | 'version'
    | 'name'
    | 'groups'
    | 'presets'
    | 'modifier_lanes'
    | 'fixed_positive'
    | 'fixed_negative'
    | 'subjects'
    | 'selection'
    | 'prompt_order'
    | 'continuity_group_ids'
  >,
): string {
  const payload = JSON.stringify({
    version: catalog.version,
    name: catalog.name,
    groups: catalog.groups.map((g) => ({
      id: g.id,
      continuity: g.continuity ?? null,
      options: g.options.map((o) => ({
        id: o.id,
        tags: o.tags,
        description: o.description,
        slot: o.slot,
        by_slot: o.by_slot,
      })),
    })),
    // Fingerprint the tree so re-importing presets invalidates embeddings.
    presets: catalog.presets ?? null,
    modifier_lanes: catalog.modifier_lanes ?? null,
    fixed_positive: catalog.fixed_positive ?? null,
    fixed_negative: catalog.fixed_negative ?? null,
    subjects: catalog.subjects ?? null,
    selection: catalog.selection ?? null,
    prompt_order: catalog.prompt_order ?? null,
    continuity_group_ids: catalog.continuity_group_ids ?? null,
  });
  let h = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Merge two slot splits (later tags append). */
export function mergeCurationTagSplits(
  ...parts: Array<Partial<CurationTagSplit> | null | undefined>
): CurationTagSplit {
  const out = emptySplit();
  for (const part of parts) {
    if (!part) continue;
    out.base = joinTags(out.base, part.base);
    out.char = joinTags(out.char, part.char);
    out.primary = joinTags(out.primary, part.primary);
    out.secondary = joinTags(out.secondary, part.secondary);
    out.female = joinTags(out.female, part.female);
    out.male = joinTags(out.male, part.male);
  }
  return out;
}

export function curationTagSplitFromBySlot(
  by: Partial<Record<CurationSlot, string>> | null | undefined,
): CurationTagSplit {
  if (!by) return emptySplit();
  return {
    base: cleanText(by.base, 800),
    char: cleanText(by.char, 800),
    primary: cleanText(by.primary, 800),
    secondary: cleanText(by.secondary, 800),
    female: cleanText(by.female, 800),
    male: cleanText(by.male, 800),
  };
}

export function listCurationGroups(catalog: CurationCatalog): readonly CurationGroup[] {
  return catalog.groups;
}

export function getCurationGroup(catalog: CurationCatalog, id: unknown): CurationGroup | null {
  const key = cleanText(id, 160);
  if (!key) return null;
  return catalog.groups.find((g) => g.id === key) || null;
}

export function getCurationOption(
  catalog: CurationCatalog,
  optionId: unknown,
): { group: CurationGroup; option: CurationOption } | null {
  const key = cleanText(optionId, 120);
  if (!key) return null;
  for (const group of catalog.groups) {
    const option = group.options.find((o) => o.id === key);
    if (option) return { group, option };
  }
  return null;
}

/** Flat list of embeddable items (option tags + description). */
export function flattenCatalogItems(catalog: CurationCatalog): Array<{
  key: string;
  groupId: string;
  optionId: string;
  text: string;
  tags: string;
  slot: CurationSlot;
}> {
  const out: Array<{
    key: string;
    groupId: string;
    optionId: string;
    text: string;
    tags: string;
    slot: CurationSlot;
  }> = [];
  for (const group of catalog.groups) {
    for (const option of group.options) {
      out.push({
        key: `${group.id}::${option.id}`,
        groupId: group.id,
        optionId: option.id,
        text: `${option.description} | ${option.tags}`,
        tags: option.tags,
        slot: option.slot || inferCurationSlot(group.id),
      });
    }
  }
  return out;
}

/** Slim group list for 1st-pass LLM (no tags). Continuity groups are resolved locally, never listed. */
export function curationGroupsSystemMessage(catalog: CurationCatalog, strictIds = false): string {
  const blocks = nonContinuityGroups(catalog).map((g) => {
    const opts = g.options.map((o) => `  - ${o.id}: ${o.description}`).join('\n');
    return `### ${g.id} (${g.label})\n${opts}`;
  });
  return [
    'Curation two-stage ON (pass 1).',
    'Pick which modifier/composition GROUPS apply to each shot.',
    'On every shot set `curation_groups`: array of exact group ids from the list below (may be []).',
    'Still fill characters (appearance/attire/accessories) as usual.',
    ...(strictIds
      ? [
        'STRICT catalog-id mode is ON: leave `camera`, `situation`, `natural`, and every `characters[].action` / `characters[].expression` completely EMPTY.',
        'Pass 2 assembles ALL scene and per-actor tags from catalog ids only — do not pre-write any of them here.',
      ]
      : [
        'Keep camera/situation/action SHORT or empty — pass 2 will refine scene tags from the chosen groups.',
        '`natural` still follows the Natural base mode system message.',
      ]),
    '`place` may stay as a short location hint.',
    '',
    '## Group catalog (ids only — do not invent ids)',
    ...blocks,
  ].join('\n');
}

/** Per-actor schema block shared by both pass-2 refine messages when `strict_ids` is on. */
export function strictPerActorSchemaRules(): string[] {
  return [
    '## Per-actor ids (strict catalog-id mode)',
    'Add `"characters": [ { "index": 0, "option_ids": ["id", "..."] }, ... ]` to EVERY shot.',
    '`index` is 0-based and must match that shot\'s `characters` array position (see `character_count`).',
    'Put an option on `characters[].option_ids` when it targets ONE specific actor (pose, contact, expression, gaze).',
    'Put an option on the shot-level `curation_option_ids` instead when it is scene-wide (camera, place, framing) — do not duplicate it into every actor.',
    'Every actor with `character_count > 0` needs an entry, even if `option_ids` is `[]`.',
    'This mode has NO freeform camera/situation/action fallback — an unlisted concept is simply omitted, never paraphrased.',
  ];
}

/** Options for selected groups — 2nd pass (batched over all shots in one LLM call). */
export function curationRefineSystemMessage(
  catalog: CurationCatalog,
  groupIds: string[],
  opts?: { strictIds?: boolean },
): string {
  const strictIds = opts?.strictIds === true;
  const wanted = new Set(groupIds.map((id) => cleanText(id, 160)).filter(Boolean));
  const groups = nonContinuityGroups(catalog).filter((g) => wanted.has(g.id));
  const blocks = (groups.length ? groups : []).map((g) => {
    const opts = g.options
      .map((o) => `  - ${o.id}: ${o.description}`)
      .join('\n');
    return `### ${g.id} (${g.label})\n${opts}`;
  });
  return [
    'Curation two-stage ON (pass 2 — scene refine, BATCH).',
    'You receive ALL shots in one request. Return ONE JSON object covering every shot.',
    strictIds
      ? 'Schema: { "shots": [ { "shot_index": 0, "curation_option_ids": ["id", "..."], "characters": [ { "index": 0, "option_ids": ["id", "..."] } ] }, ... ] }'
      : 'Schema: { "shots": [ { "shot_index": 0, "curation_option_ids": ["id", "..."], "camera": "...", "situation": "...", "place": "...", "action": "..." }, ... ] }',
    strictIds
      ? 'Example: { "shots": [ { "shot_index": 0, "curation_option_ids": ["bedroom"], "characters": [ { "index": 0, "option_ids": ["cowboy_shot", "smile"] }, { "index": 1, "option_ids": ["facing_each_other"] } ] } ] }'
      : 'Example: { "shots": [ { "shot_index": 0, "curation_option_ids": ["cowboy_shot", "facing_each_other", "smile", "bedroom"], "place": "bedroom" } ] }',
    'shot_index must match the input shots array (0-based). Return exactly one entry per input shot, same order.',
    '',
    '## CRITICAL: fill curation_option_ids',
    '`curation_option_ids` is the MAIN output — host injects catalog tags from those ids.',
    'For EVERY shot pick ALL listed options that match the chat at that y_percent (pose, contact, expression, place…).',
    'Typical **2–8 ids**; `[]` ONLY if nothing fits. Do not skip obvious matches.',
    strictIds
      ? 'Do NOT invent character appearance/attire. Do NOT invent option ids. Do NOT write freeform camera/situation/action text — ids only.'
      : 'Prefer ids over freeform camera/situation/action paraphrase.',
    ...(strictIds ? [] : ['Do NOT invent character appearance/attire. Do NOT invent option ids.']),
    ...curationPass2ContextRules(),
    ...(strictIds ? ['', ...strictPerActorSchemaRules()] : []),
    '',
    blocks.length ? '## Allowed options (union of all shots\' groups)' : '## Allowed options\n(none — leave scene fields empty)',
    ...blocks,
  ].join('\n');
}

/** Shared pass-2 rules: read-only chat context + y_percent focus (cache-friendly). */
export function curationPass2ContextRules(): string[] {
  return [
    '## Chat context (separate user message, READ-ONLY)',
    'A prior user message is the exact chat text from pass 1 (for LLM prompt cache).',
    'Use it ONLY as evidence for which options fit each shot.',
    'Do NOT rewrite, quote-edit, summarize into the JSON, or invent missing plot beats.',
    'Do NOT change shot count, shot_index, composition_id, composition_variant, or y_percent.',
    '',
    '## y_percent focus',
    'Each shot has `y_percent` (0–100): reading position in that chat text (top→bottom).',
    'For shot_index N, judge actions/contact mainly from the band around that percent',
    '(e.g. 20 ≈ early fifth, 50 ≈ middle, 80 ≈ late). Do not pull actions from far-away bands into this shot.',
    'Map every clear visual cue in that band to a listed option id when one exists.',
    'y_percent is already final — never output a new y_percent.',
  ];
}

/** Stronger freeform Danbooru scene writing for embed_snap (no catalog dump). */
export function curationEmbedHintSystemMessage(): string {
  return [
    'Curation embed-snap mode: write DETAILED English Danbooru scene tags.',
    'Fill camera, situation, place, action with concrete tags (framing, pose, contact, location, expression-as-scene).',
    'Use standard Danbooru spacing (underscores as spaces): e.g. "cowboy shot", "from side", "hand on own chest", "facing another".',
    'Prefer specific pose/contact/framing over vague words like "intimate" or "dramatic".',
    'Character appearance/attire/accessories stay in character fields — do not move them into camera/situation.',
    '`natural` still follows the Natural base mode system message.',
  ].join('\n');
}

/** Slot join order used when a catalog has no `prompt_order` opinion — current/default behaviour. */
const DEFAULT_SLOT_ORDER: CurationSlot[] = ['base', 'char', 'primary', 'secondary', 'female', 'male'];

/**
 * Maid `global.prompt_order` lists path-style tokens (`global`, `primary`,
 * `female.orientation`, …); map each to our slot and keep first-seen order,
 * then append any slot it didn't mention so nothing is silently dropped.
 */
function slotJoinOrder(catalog: CurationCatalog): CurationSlot[] {
  const order = catalog.prompt_order;
  if (!order?.length) return DEFAULT_SLOT_ORDER;
  const out: CurationSlot[] = [];
  const seen = new Set<CurationSlot>();
  for (const token of order) {
    const slot = slotFromMaidPath(token) || (cleanText(token, 40).toLowerCase() === 'char' ? 'char' : null);
    if (slot && !seen.has(slot)) {
      seen.add(slot);
      out.push(slot);
    }
  }
  for (const slot of DEFAULT_SLOT_ORDER) {
    if (!seen.has(slot)) out.push(slot);
  }
  return out;
}

/** Resolve option ids → joined tags (local assembly), ordered by Maid `prompt_order` when present. */
export function tagsFromOptionIds(catalog: CurationCatalog, optionIds: unknown): string {
  const split = splitTagsFromOptionIds(catalog, optionIds);
  return joinTags(...slotJoinOrder(catalog).map((slot) => split[slot]));
}

/** Resolve option ids into Maid-style slots (base / primary / secondary / female / male / char). */
export function splitTagsFromOptionIds(
  catalog: CurationCatalog,
  optionIds: unknown,
): CurationTagSplit {
  const raw = Array.isArray(optionIds)
    ? optionIds
    : cleanText(optionIds, 800).split(/[,|]/);
  const buckets: Record<CurationSlot, string[]> = {
    base: [],
    char: [],
    primary: [],
    secondary: [],
    female: [],
    male: [],
  };
  const seen = new Set<string>();
  for (const item of raw) {
    const id = cleanText(item, 120);
    if (!id || seen.has(id)) continue;
    const hit = getCurationOption(catalog, id);
    if (!hit) continue;
    seen.add(id);
    const by = hit.option.by_slot;
    if (by && Object.keys(by).length) {
      for (const slot of Object.keys(by) as CurationSlot[]) {
        const tags = cleanText(by[slot], 800);
        if (tags) buckets[slot].push(tags);
      }
      continue;
    }
    const slot = inferCurationSlot(hit.group.id);
    buckets[slot].push(hit.option.tags);
  }
  return {
    base: joinTags(...buckets.base),
    char: joinTags(...buckets.char),
    primary: joinTags(...buckets.primary),
    secondary: joinTags(...buckets.secondary),
    female: joinTags(...buckets.female),
    male: joinTags(...buckets.male),
  };
}

function appendCharAction(ch: Record<string, unknown>, tags: string): void {
  if (!tags) return;
  ch.action = joinTags(cleanText(ch.action, 600), tags);
}

/**
 * Apply curated tags onto a shot (Maid-style):
 * - base → camera
 * - primary / secondary → char index 0 / 1
 * - female / male → characters matching gender (explicit gender, else exact girl/boy/… tokens)
 * - char → every character (legacy)
 */
export function applyCurationTagsToShot(
  shot: Record<string, unknown>,
  split: Partial<CurationTagSplit> & { base?: string; char?: string },
  extras?: { place?: unknown; situation?: unknown },
): void {
  const full: CurationTagSplit = { ...emptySplit(), ...split };
  shot.camera = cleanText(full.base, 800);
  shot.situation = cleanText(extras?.situation, 400) || '';
  if (extras && 'place' in extras) {
    shot.place = cleanText(extras.place, 400);
  }
  const chars = Array.isArray(shot.characters) ? shot.characters : [];
  const liveChars = chars.filter((ch) => ch && typeof ch === 'object') as Record<string, unknown>[];
  const hasActorTags = Boolean(
    full.char || full.primary || full.secondary || full.female || full.male,
  );
  if (!liveChars.length) {
    shot.action = hasActorTags
      ? joinTags(full.char, full.primary, full.secondary, full.female, full.male)
      : '';
    return;
  }
  if (hasActorTags) shot.action = '';
  appendActorTags(liveChars, full);
}

export interface PerActorOptionIds {
  index: number;
  option_ids: unknown;
}

/** Parse the strict-mode `characters:[{index, option_ids}]` pass-2 field. */
export function parsePerActorOptionIds(raw: unknown): PerActorOptionIds[] {
  if (!Array.isArray(raw)) return [];
  const out: PerActorOptionIds[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const index = Number(rec.index);
    if (!Number.isInteger(index) || index < 0) continue;
    out.push({ index, option_ids: rec.option_ids ?? rec.ids ?? rec.curation_option_ids });
  }
  return out;
}

/**
 * Strict-mode local assembly: append each actor's own option ids onto that
 * character's `action` by array index — never by gender/slot inference, and
 * never onto `appearance`/`attire` (roster identity stays LLM/roster-owned).
 */
export function applyPerActorOptionIds(
  shot: Record<string, unknown>,
  perActor: PerActorOptionIds[],
  catalog: CurationCatalog,
): void {
  if (!perActor.length) return;
  const chars = Array.isArray(shot.characters) ? shot.characters : [];
  for (const { index, option_ids } of perActor) {
    const ch = chars[index];
    if (!ch || typeof ch !== 'object') continue;
    const tags = tagsFromOptionIds(catalog, option_ids);
    if (!tags) continue;
    appendCharAction(ch as Record<string, unknown>, tags);
  }
}

function appendActorTags(liveChars: Record<string, unknown>[], full: CurationTagSplit): void {
  if (full.primary) appendCharAction(liveChars[0]!, full.primary);
  if (full.secondary && liveChars[1]) appendCharAction(liveChars[1]!, full.secondary);
  for (const ch of liveChars) {
    if (full.char) appendCharAction(ch, full.char);
    const g = resolveCharacterGender(ch);
    if (full.female && g === 'f') appendCharAction(ch, full.female);
    if (full.male && g === 'm') appendCharAction(ch, full.male);
  }
  // Gender-targeted tags with unknown gender: fall back onto all chars so tags aren't dropped.
  const anyKnown = liveChars.some((ch) => resolveCharacterGender(ch) != null);
  if (!anyKnown) {
    const orphan = joinTags(full.female, full.male);
    if (orphan) {
      for (const ch of liveChars) appendCharAction(ch, orphan);
    }
  }
}

export function countCatalogOptions(catalog: CurationCatalog): number {
  return catalog.groups.reduce((n, g) => n + g.options.length, 0);
}
