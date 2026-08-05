/**
 * Asset Maid presets-tree assembly: LLM picks a leaf path; tags come from
 * ancestor path→prompt maps + chosen modifier options (local, no LLM tags).
 */
import { cleanText, joinTags } from '../../core/util/text';
import {
  catalogHasPresets,
  clampOptionIdsByLanes,
  curationPass2ContextRules,
  curationTagSplitFromBySlot,
  getCurationGroup,
  getCurationOption,
  inferCurationSlot,
  isContinuityGroup,
  maidPromptToBySlot,
  maidPromptToTags,
  mergeCurationTagSplits,
  parseOptionIdList,
  strictPerActorSchemaRules,
  type CurationCatalog,
  type CurationGroup,
  type CurationSlot,
  type CurationTagSplit,
} from './catalog';

export interface PresetLeafInfo {
  /** Position (or terminal) node id — e.g. `male_behind_female`. */
  id: string;
  /** Ids from composition down to this leaf (excludes root `preset`). */
  path: string[];
  /** Top-level composition id (`1girl_1boy`, …). */
  composition: string;
  when: string;
  avoid: string;
  variants: string[];
  description: string;
}

export interface PresetModifierBinding {
  ref: string;
  include_options?: string[];
  replace?: boolean;
  order?: number;
  /** Maid action routing: put option tags on source/target actor slots. */
  action?: {
    source?: string;
    target?: string;
    include_options?: string[];
  };
}

export interface PresetSelection {
  /** Full id path, or composition…position (+ optional variant as last). */
  preset_path?: unknown;
  composition_id?: unknown;
  composition_variant?: unknown;
  curation_option_ids?: unknown;
}

/**
 * Normalize LLM alias fields onto composition_id / composition_variant.
 * Also accepts path-shaped ids the model copies from the catalog dump
 * (`"1girl_1boy / general / facing_each_other"` → preset_path + leaf id).
 * Mutates the shot. Returns true when a leaf id is present after normalization.
 */
export function normalizeShotPresetFields(shot: Record<string, unknown>): boolean {
  let id =
    cleanText(shot.composition_id, 160)
    || cleanText(shot.preset_id, 160)
    || cleanText(shot.leaf_id, 160)
    || cleanText(shot.position_id, 160)
    || cleanText(shot.curation_leaf, 160)
    || cleanText(shot.composition, 160);

  // Path string from catalog `path: a / b / leaf` lines — not a real node id.
  if (id && /[|/]/.test(id)) {
    const parts = id
      .split(/[/|]/)
      .map((p) => cleanText(p, 160))
      .filter(Boolean);
    if (parts.length >= 2) {
      if (!Array.isArray(shot.preset_path) || !shot.preset_path.length) {
        shot.preset_path = parts;
      }
      id = parts[parts.length - 1]!;
    }
  }

  const variant =
    cleanText(shot.composition_variant, 120)
    || cleanText(shot.selected_variant_id, 120)
    || cleanText(shot.variant_id, 120)
    || cleanText(shot.variant, 120);
  if (id) shot.composition_id = id;
  if (variant) shot.composition_variant = variant;
  if (Array.isArray(shot.preset_path) && shot.preset_path.length) return true;
  return Boolean(id);
}

export interface PresetNode {
  id?: unknown;
  type?: unknown;
  description?: unknown;
  when_to_use?: unknown;
  avoid_when?: unknown;
  prompt?: unknown;
  modifiers?: unknown;
  children?: unknown;
  variants?: unknown;
  [key: string]: unknown;
}

function asNode(value: unknown): PresetNode | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as PresetNode)
    : null;
}

function childList(node: PresetNode): PresetNode[] {
  const out: PresetNode[] = [];
  for (const key of ['children', 'variants'] as const) {
    const raw = node[key];
    if (!Array.isArray(raw)) continue;
    for (const item of raw) {
      const n = asNode(item);
      if (n) out.push(n);
    }
  }
  return out;
}

function variantNodes(node: PresetNode): PresetNode[] {
  if (!Array.isArray(node.variants)) return [];
  return node.variants.map(asNode).filter(Boolean) as PresetNode[];
}

function whenText(node: PresetNode): string {
  const w = node.when_to_use;
  if (typeof w === 'string') return cleanText(w, 400);
  if (Array.isArray(w)) {
    return cleanText(w.map((x) => cleanText(x, 200)).filter(Boolean).join(' '), 400);
  }
  return cleanText(node.description, 400);
}

function avoidText(node: PresetNode): string {
  const w = node.avoid_when;
  if (typeof w === 'string') return cleanText(w, 400);
  if (Array.isArray(w)) {
    return cleanText(w.map((x) => cleanText(x, 200)).filter(Boolean).join(' '), 400);
  }
  return '';
}

function parseModifierBinding(raw: unknown): PresetModifierBinding | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const ref = cleanText(o.ref ?? o.id ?? o.group, 160);
  if (!ref) return null;
  const include = Array.isArray(o.include_options)
    ? o.include_options.map((x) => cleanText(x, 120)).filter(Boolean)
    : undefined;
  const actionRaw = o.action && typeof o.action === 'object' && !Array.isArray(o.action)
    ? (o.action as Record<string, unknown>)
    : null;
  const action = actionRaw
    ? {
      source: cleanText(actionRaw.source, 40) || undefined,
      target: cleanText(actionRaw.target, 40) || undefined,
      include_options: Array.isArray(actionRaw.include_options)
        ? actionRaw.include_options.map((x) => cleanText(x, 120)).filter(Boolean)
        : undefined,
    }
    : undefined;
  return {
    ref,
    include_options: include?.length ? include : undefined,
    replace: o.replace === true,
    order: Number.isFinite(Number(o.order)) ? Number(o.order) : undefined,
    action,
  };
}

function modifiersOf(node: PresetNode): PresetModifierBinding[] {
  if (!Array.isArray(node.modifiers)) return [];
  return node.modifiers.map(parseModifierBinding).filter(Boolean) as PresetModifierBinding[];
}

/** DFS: pickable leaves = `type=position` or nodes that only have variants (no children). */
export function listPresetLeaves(catalog: CurationCatalog): PresetLeafInfo[] {
  if (!catalogHasPresets(catalog)) return [];
  const root = asNode(catalog.presets);
  if (!root) return [];
  const out: PresetLeafInfo[] = [];

  const walk = (node: PresetNode, path: string[], composition: string) => {
    const id = cleanText(node.id, 160);
    const nextPath = id && id !== 'preset' ? [...path, id] : path;
    const nextComp = !composition && id && id !== 'preset' ? id : composition;
    const structuralKids = Array.isArray(node.children)
      ? (node.children.map(asNode).filter(Boolean) as PresetNode[])
      : [];
    const vars = variantNodes(node);
    const isPosition = cleanText(node.type, 40) === 'position';
    // Category/composition keep walking children; position (or variant-only) is pickable.
    const isPickable =
      id
      && id !== 'preset'
      && (isPosition || (vars.length > 0 && structuralKids.length === 0));

    if (isPickable) {
      out.push({
        id,
        path: nextPath,
        composition: nextComp || id,
        when: whenText(node),
        avoid: avoidText(node),
        variants: vars.map((v) => cleanText(v.id, 120)).filter(Boolean),
        description: cleanText(node.description, 300) || id,
      });
    }

    for (const child of structuralKids) {
      walk(child, nextPath, nextComp);
    }
  };

  walk(root, [], '');
  return out;
}

/**
 * Find ancestor chain for composition_id (+ optional variant).
 * Returns nodes from root → … → position → variant (if any).
 */
export function findPresetAncestorChain(
  catalog: CurationCatalog,
  compositionId: unknown,
  variantId?: unknown,
): PresetNode[] | null {
  const root = asNode(catalog.presets);
  const want = cleanText(compositionId, 160);
  if (!root || !want) return null;

  const hit: { chain: PresetNode[] | null } = { chain: null };

  const walk = (node: PresetNode, chain: PresetNode[]): void => {
    if (hit.chain) return;
    const next = [...chain, node];
    const id = cleanText(node.id, 160);
    if (id === want) {
      hit.chain = next;
      return;
    }
    const structuralKids = Array.isArray(node.children)
      ? (node.children.map(asNode).filter(Boolean) as PresetNode[])
      : [];
    for (const child of structuralKids) walk(child, next);
  };

  walk(root, []);
  const found = hit.chain;
  if (!found) return null;

  const variant = cleanText(variantId, 120);
  if (!variant) return found;

  const leaf = found[found.length - 1]!;
  const match = variantNodes(leaf).find((v) => cleanText(v.id, 120) === variant);
  if (match) return [...found, match];
  return found;
}

/** Resolve preset_path array OR composition_id + variant into an ancestor chain. */
export function resolvePresetChain(
  catalog: CurationCatalog,
  selection: PresetSelection,
): PresetNode[] | null {
  const pathRaw = selection.preset_path;
  if (Array.isArray(pathRaw) && pathRaw.length) {
    const ids = pathRaw.map((x) => cleanText(x, 160)).filter(Boolean);
    const root = asNode(catalog.presets);
    if (!root || !ids.length) return null;
    const chain: PresetNode[] = [root];
    let cur = root;
    for (const id of ids) {
      if (cleanText(cur.id, 160) === id) continue;
      const kids = childList(cur);
      const next = kids.find((k) => cleanText(k.id, 160) === id);
      if (!next) {
        // try global search by last id as composition_id
        return findPresetAncestorChain(catalog, ids[ids.length - 1], undefined);
      }
      chain.push(next);
      cur = next;
    }
    return chain;
  }

  const compositionId =
    selection.composition_id
    ?? (typeof pathRaw === 'string' ? pathRaw : '');
  return findPresetAncestorChain(
    catalog,
    compositionId,
    selection.composition_variant,
  );
}

/** Merge modifier bindings along the chain; later `replace:true` replaces same ref. */
export function collectModifierBindings(chain: PresetNode[]): PresetModifierBinding[] {
  const byRef = new Map<string, PresetModifierBinding>();
  for (const node of chain) {
    for (const mod of modifiersOf(node)) {
      const prev = byRef.get(mod.ref);
      if (mod.replace || !prev) {
        byRef.set(mod.ref, mod);
        continue;
      }
      // Merge include_options when not replacing.
      const include = [
        ...new Set([...(prev.include_options || []), ...(mod.include_options || [])]),
      ];
      byRef.set(mod.ref, {
        ...prev,
        ...mod,
        include_options: include.length ? include : prev.include_options,
        action: mod.action || prev.action,
      });
    }
  }
  return [...byRef.values()];
}

/**
 * Groups/options allowed for pass-2 given selected leaves' modifier refs.
 * Continuity groups are deliberately excluded — see `continuityBindingsForChains`,
 * which resolves them locally instead of asking the LLM every batch.
 */
export function allowedModifierGroupsForChains(
  catalog: CurationCatalog,
  chains: PresetNode[][],
): CurationGroup[] {
  const bindings = new Map<string, PresetModifierBinding>();
  const denied = new Set<string>();
  for (const chain of chains) {
    for (const b of collectModifierBindings(chain)) {
      bindings.set(b.ref, b);
    }
    for (const d of collectModifierDenyKeys(chain)) denied.add(d);
  }
  const groups: CurationGroup[] = [];
  for (const [ref, binding] of bindings) {
    if (isContinuityGroup(catalog, ref)) continue;
    const g = getCurationGroup(catalog, ref);
    if (!g) continue;
    const allow = binding.include_options?.length
      ? new Set(binding.include_options)
      : null;
    let options = allow
      ? g.options.filter((o) => allow.has(o.id))
      : g.options;
    if (denied.size) {
      const kept = filterOptionsByModifierDeny(
        catalog,
        options.map((o) => o.id),
        denied,
      );
      const keepSet = new Set(kept);
      options = options.filter((o) => keepSet.has(o.id));
    }
    if (!options.length) continue;
    groups.push({ id: g.id, label: g.label, options });
  }
  return groups;
}

/**
 * Continuity modifier bindings for one shot's chain: the composition/leaf tree
 * decides these deterministically (`include_options` on the binding), not the
 * pass-2 LLM. Callers (services/curation.ts) fold the result into a job-scoped
 * map so a group this shot's chain is silent about still keeps its last value.
 */
export function continuityBindingsForChain(
  catalog: CurationCatalog,
  chain: PresetNode[] | null | undefined,
): PresetModifierBinding[] {
  if (!chain?.length) return [];
  return collectModifierBindings(chain).filter((b) => isContinuityGroup(catalog, b.ref));
}

function slotFromActorSide(side: unknown): CurationSlot | null {
  const s = cleanText(side, 40).toLowerCase();
  if (!s) return null;
  if (['male', 'm', 'boy', 'man'].includes(s)) return 'male';
  if (['female', 'f', 'girl', 'woman'].includes(s)) return 'female';
  if (['primary', 'main'].includes(s)) return 'primary';
  if (['secondary', 'partner'].includes(s)) return 'secondary';
  if (['global', 'base', 'scene', 'camera'].includes(s)) return 'base';
  if (['char', 'both', 'all'].includes(s)) return 'char';
  return null;
}

function splitFromPathPrompt(prompt: unknown): CurationTagSplit {
  return curationTagSplitFromBySlot(maidPromptToBySlot(prompt));
}

/**
 * Place a flat option's tags using Maid action source/target when the binding
 * covers this option; else by_slot; else group-id heuristic.
 */
function splitForOption(
  catalog: CurationCatalog,
  optionId: string,
  bindings: PresetModifierBinding[],
): CurationTagSplit {
  const hit = getCurationOption(catalog, optionId);
  if (!hit) return curationTagSplitFromBySlot({});

  const binding = bindings.find((b) => {
    if (b.ref !== hit.group.id) return false;
    if (!b.include_options?.length && !b.action?.include_options?.length) return true;
    const ids = new Set([
      ...(b.include_options || []),
      ...(b.action?.include_options || []),
    ]);
    return ids.has(optionId);
  }) || bindings.find((b) => b.ref === hit.group.id);

  if (hit.option.by_slot && Object.keys(hit.option.by_slot).length) {
    return curationTagSplitFromBySlot(hit.option.by_slot);
  }

  const tags = hit.option.tags || maidPromptToTags(hit.option.tags);
  if (!tags) return curationTagSplitFromBySlot({});

  if (binding?.action) {
    const source = slotFromActorSide(binding.action.source);
    const target = slotFromActorSide(binding.action.target);
    const buckets: Partial<Record<CurationSlot, string>> = {};
    if (source) buckets[source] = tags;
    if (target) buckets[target] = joinTags(buckets[target], tags);
    if (source || target) return curationTagSplitFromBySlot(buckets);
  }

  // Re-infer from group id (ignore stale imported option.slot — interaction.* used to land on base).
  const slot = inferCurationSlot(hit.group.id);
  return curationTagSplitFromBySlot({ [slot]: tags });
}

/** Collect Maid variant/node `modifier_filter.deny` entries (option ids + tag phrases). */
export function collectModifierDenyKeys(chain: PresetNode[]): Set<string> {
  const denied = new Set<string>();
  for (const node of chain) {
    const filter = node.modifier_filter;
    if (!filter || typeof filter !== 'object' || Array.isArray(filter)) continue;
    const deny = (filter as Record<string, unknown>).deny;
    if (!deny || typeof deny !== 'object' || Array.isArray(deny)) continue;
    for (const list of Object.values(deny as Record<string, unknown>)) {
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        const key = cleanText(item, 160).toLowerCase();
        if (key) denied.add(key);
      }
    }
  }
  return denied;
}

/** Drop option ids blocked by chain modifier_filter.deny (id or tag text). */
export function filterOptionsByModifierDeny(
  catalog: CurationCatalog,
  optionIds: string[],
  denied: Set<string>,
): string[] {
  if (!denied.size) return optionIds;
  return optionIds.filter((id) => {
    const low = id.toLowerCase();
    if (denied.has(low)) return false;
    const hit = getCurationOption(catalog, id);
    if (!hit) return true;
    const tags = cleanText(hit.option.tags, 800).toLowerCase();
    const desc = cleanText(hit.option.description, 400).toLowerCase();
    for (const d of denied) {
      const phrase = d.replace(/_/g, ' ');
      if (tags.includes(d) || tags.includes(phrase) || desc.includes(phrase)) return false;
    }
    return true;
  });
}

/**
 * Order option ids by their owning modifier binding's Maid `order` (ascending;
 * bindings without one sort last, ties keep input order) so assembly follows
 * "modifier order" as closely as practical. Options outside any binding (e.g.
 * continuity ids folded in by the caller) keep their relative input position.
 */
function sortIdsByBindingOrder(
  catalog: CurationCatalog,
  optionIds: string[],
  bindings: PresetModifierBinding[],
): string[] {
  const orderOf = new Map<string, number>();
  for (const b of bindings) {
    if (Number.isFinite(b.order)) orderOf.set(b.ref, b.order!);
  }
  if (!orderOf.size) return optionIds;
  return optionIds
    .map((id, i) => ({ id, i }))
    .sort((a, b) => {
      const ga = getCurationOption(catalog, a.id)?.group.id;
      const gb = getCurationOption(catalog, b.id)?.group.id;
      const oa = ga != null && orderOf.has(ga) ? orderOf.get(ga)! : Number.MAX_SAFE_INTEGER;
      const ob = gb != null && orderOf.has(gb) ? orderOf.get(gb)! : Number.MAX_SAFE_INTEGER;
      return oa !== ob ? oa - ob : a.i - b.i;
    })
    .map((x) => x.id);
}

/**
 * Resolve a shot's preset selection into base/actor slot tags (Maid-style).
 * Returns null when the catalog has no presets or the leaf id is unknown.
 * Applies `modifier_lanes` caps before assembling option tags.
 *
 * `extra.optionIds`/`extra.bindings` let the caller fold in a pick the LLM
 * never made this batch — job-scoped continuity carry-forward
 * (services/curation.ts) — using the ORIGINAL binding that produced it (so
 * source/target actor routing survives even on a later shot whose own chain
 * never mentions that continuity group).
 */
export function resolveMaidPresetSelection(
  catalog: CurationCatalog,
  selection: PresetSelection,
  extra?: { optionIds?: string[]; bindings?: PresetModifierBinding[] },
): CurationTagSplit | null {
  if (!catalogHasPresets(catalog)) return null;
  const chain = resolvePresetChain(catalog, selection);
  if (!chain?.length) return null;

  const pathSplits = chain.map((node) => splitFromPathPrompt(node.prompt));
  const ownBindings = collectModifierBindings(chain);
  const ownRefs = new Set(ownBindings.map((b) => b.ref));
  // This shot's own chain wins when both define the same ref.
  const bindings = [...ownBindings, ...(extra?.bindings || []).filter((b) => !ownRefs.has(b.ref))];
  const denied = collectModifierDenyKeys(chain);
  const combinedIds = [
    ...parseOptionIdList(selection.curation_option_ids),
    ...(extra?.optionIds || []),
  ];
  let optionIds = clampOptionIdsByLanes(catalog, combinedIds);
  optionIds = filterOptionsByModifierDeny(catalog, optionIds, denied);
  optionIds = sortIdsByBindingOrder(catalog, optionIds, bindings);
  const optionSplits = optionIds.map((id) => splitForOption(catalog, id, bindings));

  return mergeCurationTagSplits(...pathSplits, ...optionSplits);
}

/** Maid analyzer-style selection rules adapted to Inlay shot fields. */
function maidAnalyzerSelectionRules(): string[] {
  return [
    '# Preset selection (Asset Maid analyzer rules)',
    'Use ONLY information in the chat/shot context. Do not invent unseen actors or actions.',
    '',
    '## Actors → composition first',
    'Count actors that are required for the current moment\'s action/contact.',
    'Pick a composition that matches actor count and genders (e.g. 1girl_solo vs 1girl_1boy).',
    'Do NOT drop a visible partner to force solo. If a male hand/arm is visible contacting the girl from POV, that male is an actor → prefer 1girl_1boy, not 1girl_solo.',
    '',
    '## Walk the tree',
    'Read the leaf list as composition → category → position.',
    'For each candidate use description / when / avoid. Prefer the leaf whose when matches the current moment; reject ones whose avoid matches.',
    'Prefer a leaf that can support the stated action (hug from behind, facing, etc.) over a leaf that only matches vague posture words.',
    'Pick exactly ONE `composition_id` (position leaf) per shot.',
    '',
    '## Variant',
    'If the leaf lists variants, pick `composition_variant` for the camera that fits (from_side, pov, default…).',
    'If unsure and a default/from_side exists, prefer that over inventing camera tags.',
    '',
    '## What NOT to do in pass 1',
    'Do NOT invent Danbooru camera/pose tags into camera/situation/action.',
    'Do NOT return modifier option ids here (pass 2 does that).',
    'Do NOT set `curation_groups`.',
  ];
}

/** Compact leaf catalog for tagger pass 1 (no modifier dump). */
export function curationPresetsSystemMessage(catalog: CurationCatalog, strictIds = false): string {
  const leaves = listPresetLeaves(catalog);
  // Group by composition so the model walks like Maid's tree.
  const byComp = new Map<string, typeof leaves>();
  for (const leaf of leaves) {
    const list = byComp.get(leaf.composition) || [];
    list.push(leaf);
    byComp.set(leaf.composition, list);
  }
  const blocks: string[] = [];
  for (const [composition, comps] of byComp) {
    blocks.push(`## composition: ${composition}`);
    for (const leaf of comps) {
      const variants = leaf.variants.length ? leaf.variants.join('|') : '(none)';
      blocks.push(
        [
          `### ${leaf.id}`,
          `path: ${leaf.path.join(' / ')}`,
          leaf.when ? `when: ${leaf.when}` : '',
          leaf.avoid ? `avoid: ${leaf.avoid}` : '',
          leaf.description && leaf.description !== leaf.id ? `description: ${leaf.description}` : '',
          `variants: ${variants}`,
        ]
          .filter(Boolean)
          .join('\n'),
      );
    }
  }
  return [
    'Curation two-stage ON (pass 1 — Asset Maid presets).',
    'CRITICAL: every shot MUST include `composition_id` (exact leaf id). This overrides the base format schema.',
    'Also set `composition_variant` when the leaf lists variants.',
    ...maidAnalyzerSelectionRules(),
    '',
    'On every shot set:',
    '- `composition_id`: exact leaf id ONLY (e.g. `facing_each_other`, `free`) — NOT a path like `1girl_1boy / general / free`',
    '- `composition_variant`: one variant id for that leaf, or omit if none',
    'Still fill characters (appearance/attire/accessories) as usual.',
    '`place` may stay as a short location hint.',
    ...(strictIds
      ? [
        'STRICT catalog-id mode is ON: leave `camera`, `situation`, `natural`, and every `characters[].action` / `characters[].expression` completely EMPTY.',
        'Pass 2 assembles ALL scene and per-actor tags from catalog ids only, keyed off the `composition_id`/`composition_variant` you pick here.',
      ]
      : [
        'Leave `situation` empty or non-person scene words only — NEVER put 1girl/1boy/solo there (host adds person-count tags).',
        '`camera`/`action` must NOT include 1girl/1boy/solo either.',
        '`natural` still follows the Natural base mode system message.',
      ]),
    '',
    '## Preset leaf catalog (do not invent ids)',
    ...(blocks.length ? blocks : ['(empty presets tree)']),
  ].join('\n');
}

function laneRulesForPrompt(catalog: CurationCatalog): string[] {
  const lanes = catalog.modifier_lanes;
  if (!lanes || !Object.keys(lanes).length) return [];
  const lines = [
    '## Modifier lanes (hard caps — host also enforces)',
    'Within each lane, keep at most max_active_groups distinct groups.',
  ];
  for (const [name, lane] of Object.entries(lanes)) {
    lines.push(
      `- lane \`${name}\`: max ${lane.max_active_groups} group(s) among [${lane.fallback_order.join(', ')}] (earlier pattern wins if over cap)`,
    );
  }
  lines.push('Example: do not pick both manual.arm_pose and manual.partner_contact options together.');
  return lines;
}

/** Pass-2 system message: only modifiers allowed on the selected leaves. */
export function curationPresetRefineSystemMessage(
  catalog: CurationCatalog,
  chains: PresetNode[][],
  opts?: { strictIds?: boolean },
): string {
  const strictIds = opts?.strictIds === true;
  const groups = allowedModifierGroupsForChains(catalog, chains);
  const blocks = groups.map((g) => {
    const opts = g.options.map((o) => `  - ${o.id}: ${o.description}`).join('\n');
    return `### ${g.id} (${g.label})\n${opts}`;
  });
  return [
    'Curation two-stage ON (pass 2 — preset modifiers, BATCH).',
    'You receive ALL shots in one request. Return ONE JSON object covering every shot.',
    strictIds
      ? 'Schema: { "shots": [ { "shot_index": 0, "curation_option_ids": ["id", "..."], "characters": [ { "index": 0, "option_ids": ["id", "..."] } ], "place": "..." }, ... ] }'
      : 'Schema: { "shots": [ { "shot_index": 0, "curation_option_ids": ["id", "..."], "place": "..." }, ... ] }',
    strictIds
      ? 'Example: { "shots": [ { "shot_index": 0, "curation_option_ids": ["bedroom"], "characters": [ { "index": 0, "option_ids": ["hug", "from_side"] }, { "index": 1, "option_ids": ["blush"] } ] } ] }'
      : 'Example: { "shots": [ { "shot_index": 0, "curation_option_ids": ["hug", "from_side", "blush", "bedroom"], "place": "bedroom" } ] }',
    'shot_index must match the input shots array (0-based). Return exactly one entry per input shot, same order.',
    '',
    '## CRITICAL: fill curation_option_ids',
    '`curation_option_ids` is the MAIN output. Host injects those catalog tags into the image — empty array = weak/empty pose.',
    'For EVERY shot, pick ALL options that match the chat band at that shot\'s y_percent:',
    '- contact / hug / hands / pose / expression / gaze / blush / location / lighting / clothing state when visible',
    'Typical count: **2–8 ids** when the scene has clear action; 1 id only if truly minimal; `[]` ONLY if nothing in the list fits.',
    'Do NOT leave `curation_option_ids` empty just to be safe — if hug/facing/hand contact is in the text and listed below, INCLUDE those ids.',
    'Pick ONLY ids listed below. Never invent ids. Never invent character appearance/attire.',
    'Do NOT put Danbooru tags in freeform fields instead of picking ids — prefer ids.',
    '`place` may repeat a short location hint; optional.',
    'Host assembles path prompts + these options into base vs char slots.',
    ...(strictIds ? ['', ...strictPerActorSchemaRules()] : []),
    ...curationPass2ContextRules(),
    ...laneRulesForPrompt(catalog),
    '',
    blocks.length ? '## Allowed modifier options' : '## Allowed modifier options\n(none — return empty curation_option_ids)',
    ...blocks,
  ].join('\n');
}
