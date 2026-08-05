/** Settings migration + export/import. Pure: no storage, no I/O. */

/** NovelAI base natural-language mode (replaces the old boolean toggle). */
export type NaturalBaseMode = 'off' | 'short' | 'detailed' | 'supplement';

const NATURAL_BASE_MODES = new Set<NaturalBaseMode>(['off', 'short', 'detailed', 'supplement']);

/**
 * Normalize `card.natural_base` from legacy booleans / unknown strings.
 * Missing or unknown → `short` (matches the old default of `true`).
 */
export function normalizeNaturalBaseMode(value: unknown): NaturalBaseMode {
  if (value === false || value === 'false' || value === 'off' || value === 'none') return 'off';
  if (value === true || value === 'true' || value === 'on') return 'short';
  if (value === 'detailed' || value === 'detail') return 'detailed';
  if (value === 'supplement' || value === 'supp') return 'supplement';
  if (typeof value === 'string' && NATURAL_BASE_MODES.has(value as NaturalBaseMode)) {
    return value as NaturalBaseMode;
  }
  return 'short';
}

/** What `migrateSettings` guarantees on the way out — everything else stays as found. */
export interface MigratedSettings {
  card: Record<string, unknown>;
  settings_schema_version: number;
  [key: string]: unknown;
}

/**
 * JSON round trip on purpose: it drops functions, symbols and `undefined`, which
 * is what keeps a live settings object safe to hand to `JSON.stringify` later.
 */
const jsonClone = <T>(value: T): T => JSON.parse(JSON.stringify(value ?? {})) as T;

/**
 * Keys dropped from an exported settings file, compared lowercase so `API_KEY`
 * is caught too.
 *
 * Note that `service_account_json` is deliberately NOT in this set, matching the
 * deployed behaviour: exports are also how users move settings between devices,
 * and dropping the Vertex credential would silently break Vertex on the target
 * machine. It does mean an exported file can carry a Google service-account
 * private key, so treat exports as secrets.
 */
const SECRET_KEYS = new Set(['api_key', 'auth_token', 'password', 'secret']);

function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (!value || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [name, child] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEYS.has(name.toLowerCase())) continue;
    out[name] = redactSecrets(child);
  }
  return out;
}

/** Bring any stored settings blob up to the current schema (clone in, clone out). */
export function migrateSettings(input: unknown = {}): MigratedSettings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Settings must be an object');
  const settings = jsonClone(input) as Record<string, unknown>;
  const card = settings.card && typeof settings.card === 'object' && !Array.isArray(settings.card)
    ? settings.card as Record<string, unknown>
    : {};
  settings.card = card;
  if (Number(card.scale_semantics_version || 0) < 2) {
    const legacy = Number(card.inline_thumb_pct);
    card.inline_thumb_pct = Number.isFinite(legacy) ? Math.max(1, legacy / 6) : 100;
    card.scale_semantics_version = 2;
  }
  // Sticky pin: prefer stored %; mark unit/origin so clients and future merges stay consistent.
  const hasPinPct =
    Number.isFinite(Number(card.overlay_x_pct)) ||
    Number.isFinite(Number(card.overlay_y_pct));
  if (hasPinPct || card.overlay_pin_unit === 'pct') {
    card.overlay_pin_unit = 'pct';
    const origin = String(card.overlay_pin_origin || '');
    if (!origin || origin === 'bottom-left') card.overlay_pin_origin = 'bl';
  }
  // lore_extra: boolean → "tags" | "full" | "off"
  const loreExtra = card.lore_extra;
  if (loreExtra === true || loreExtra === 'true' || loreExtra === 'sections') card.lore_extra = 'tags';
  else if (loreExtra === false || loreExtra === 'false' || loreExtra === 'none') card.lore_extra = 'off';
  else if (loreExtra === 'full' || loreExtra === 'tags' || loreExtra === 'off') card.lore_extra = loreExtra;
  else card.lore_extra = 'tags';
  // natural_base: legacy boolean → "off" | "short" | "detailed" | "supplement"
  card.natural_base = normalizeNaturalBaseMode(card.natural_base);
  // composition_curation: LLM picks curated leaf ids instead of freeform camera/pose tags
  card.composition_curation =
    card.composition_curation === true
    || card.composition_curation === 'true'
    || card.composition_curation === 1
    || card.composition_curation === '1'
    || card.composition_curation === 'on';
  // Left-line overlay + always-on image are one feature: overlay_markers is canonical.
  const overlayOn = card.overlay_markers !== false;
  card.overlay_markers = overlayOn;
  card.inline_previews = overlayOn;
  settings.settings_schema_version = 2;
  return settings as MigratedSettings;
}

/** Migrated settings as pretty JSON, minus `SECRET_KEYS` — read its note first. */
export function exportSettings(input: unknown): string {
  return JSON.stringify(redactSecrets(migrateSettings(input)), null, 2);
}

/** Parse and migrate a settings JSON document, rejecting anything that is not an object. */
export function importSettings(text: unknown): MigratedSettings {
  if (typeof text !== 'string') throw new TypeError('Settings JSON must be text');
  if (text.length > 2_000_000) throw new RangeError('Settings JSON is too large');
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new TypeError('Settings JSON must contain an object');
  return migrateSettings(parsed);
}
