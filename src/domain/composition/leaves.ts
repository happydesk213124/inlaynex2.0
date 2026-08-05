/**
 * Curated composition leaves (Asset Maid-style): LLM picks an id; tags are copied
 * from this catalog into NAI base / char captions. Pure — no I/O.
 */
import catalog from '../../config/composition-leaves.json';
import { cleanText, joinTags } from '../../core/util/text';

export type CompositionSlot = 'primary' | 'secondary' | 'both';

export interface CompositionModifier {
  id: string;
  tags: string;
  slot: CompositionSlot;
}

export interface CompositionVariant {
  id: string;
  global: string;
}

export interface CompositionLeaf {
  id: string;
  composition: string;
  when: string;
  avoid?: string;
  global: string;
  actors: { primary?: string; secondary?: string };
  variants: CompositionVariant[];
  modifiers: CompositionModifier[];
}

export interface ResolvedComposition {
  leafId: string;
  variantId: string;
  modifierIds: string[];
  /** Camera / framing / shared pose → NAI base_caption setup. */
  global: string;
  /** Per cast index (0 = primary, 1 = secondary). */
  actorTags: string[];
}

type CatalogFile = { leaves: CompositionLeaf[] };

const LEAVES: readonly CompositionLeaf[] = (catalog as CatalogFile).leaves || [];
const BY_ID = new Map(LEAVES.map((leaf) => [leaf.id, leaf]));

/** All leaves (for tagger system inject). */
export function listCompositionLeaves(): readonly CompositionLeaf[] {
  return LEAVES;
}

export function getCompositionLeaf(id: unknown): CompositionLeaf | null {
  const key = cleanText(id, 120);
  if (!key) return null;
  return BY_ID.get(key) || null;
}

export function compositionCurationOn(card: { composition_curation?: unknown } | null | undefined): boolean {
  const v = card?.composition_curation;
  return v === true || v === 'true' || v === 1 || v === '1' || v === 'on';
}

/** Compact catalog text for the tagger when curation is on. */
export function compositionCatalogSystemMessage(): string {
  const blocks = LEAVES.map((leaf) => {
    const variants = (leaf.variants || []).map((v) => v.id).join('|') || 'default';
    const mods = (leaf.modifiers || []).map((m) => m.id).join('|') || '(none)';
    return [
      `### ${leaf.id} (${leaf.composition})`,
      `when: ${leaf.when}`,
      leaf.avoid ? `avoid: ${leaf.avoid}` : '',
      `variants: ${variants}`,
      `modifiers: ${mods}`,
    ]
      .filter(Boolean)
      .join('\n');
  });
  return [
    'Composition curation ON.',
    'For EVERY shot you MUST pick one catalog leaf. Do NOT invent camera/pose Danbooru tags.',
    'Set these fields on each shot:',
    '- `composition_id`: exact leaf id from the catalog below',
    '- `composition_variant`: one variant id for that leaf (or omit for the first)',
    '- `composition_modifiers`: array of allowed modifier ids for that leaf (may be [])',
    'Leave `camera` empty. Leave `situation` empty (person-count is added by code).',
    'Leave `characters[].action` empty for pose/interaction — the leaf supplies those tags.',
    '`place` still describes background/location only (no camera/pose).',
    '`natural` still follows the Natural base mode system message (unchanged).',
    '`expression` / attire / accessories on characters are still allowed when relevant.',
    '',
    '## Composition catalog',
    ...blocks,
  ].join('\n');
}

function slotTags(
  leaf: CompositionLeaf,
  slot: 'primary' | 'secondary',
  modifierIds: Set<string>,
): string {
  const base = cleanText(leaf.actors?.[slot] || '');
  const fromMods: string[] = [];
  for (const mod of leaf.modifiers || []) {
    if (!modifierIds.has(mod.id)) continue;
    if (mod.slot === 'both' || mod.slot === slot) fromMods.push(cleanText(mod.tags));
  }
  return joinTags(base, ...fromMods);
}

/**
 * Resolve a tagged shot's composition_* fields into global + per-actor tags.
 * Returns null when the id is missing/unknown (caller falls back to freeform setup).
 */
export function resolveCompositionForShot(shot: {
  composition_id?: unknown;
  composition_variant?: unknown;
  composition_modifiers?: unknown;
  characters?: unknown[];
} | null | undefined): ResolvedComposition | null {
  const leaf = getCompositionLeaf(shot?.composition_id);
  if (!leaf) return null;

  const variants = leaf.variants?.length ? leaf.variants : [{ id: 'default', global: '' }];
  const wantVariant = cleanText(shot?.composition_variant, 120);
  const variant =
    (wantVariant && variants.find((v) => v.id === wantVariant)) || variants[0];

  const rawMods = shot?.composition_modifiers;
  const modList: string[] = Array.isArray(rawMods)
    ? rawMods.map((m) => cleanText(m, 80)).filter(Boolean)
    : cleanText(rawMods, 400)
      .split(/[,|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  const allowed = new Set((leaf.modifiers || []).map((m) => m.id));
  const modifierIds = modList.filter((id) => allowed.has(id));
  const modSet = new Set(modifierIds);

  const n = Math.max(1, Array.isArray(shot?.characters) ? shot!.characters!.length : 1);
  const actorTags: string[] = [];
  for (let i = 0; i < n; i++) {
    const slot = i === 0 ? 'primary' : 'secondary';
    actorTags.push(slotTags(leaf, slot, modSet));
  }

  return {
    leafId: leaf.id,
    variantId: variant.id,
    modifierIds,
    global: joinTags(leaf.global, variant.global),
    actorTags,
  };
}
