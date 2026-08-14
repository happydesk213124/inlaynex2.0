/**
 * Per-character clothing state that carries across shots in a chat.
 *
 * The tagger only emits a change. Caption + roster keep the resolved English
 * token so NAI does not flip clothed/nude every shot.
 */
import { cleanText, joinTags } from '../../core/util/text.ts';
import type { ShotCharacter } from '../../core/types.ts';

export const WEAR_STATES = [
  'clothed',
  'torn',
  'topless',
  'bottomless',
  'nude',
  'completely',
] as const;

export type WearState = (typeof WEAR_STATES)[number];

const STATE_SET = new Set<string>(WEAR_STATES);

/** Map legacy shot.nude 0..3 onto wear_state. */
export function wearStateFromNudeLevel(level: 0 | 1 | 2 | 3): WearState {
  if (level <= 0) return 'clothed';
  if (level === 1) return 'torn';
  if (level === 2) return 'nude';
  return 'completely';
}

/** Explicit token, or null when omitted (inherit previous). */
export function parseWearState(value: unknown): WearState | null {
  if (value == null || value === '') return null;
  if (typeof value === 'boolean') return value ? 'completely' : 'clothed';
  if (typeof value === 'number' && Number.isFinite(value)) {
    const n = Math.floor(value);
    if (n <= 0) return 'clothed';
    if (n === 1) return 'torn';
    if (n === 2) return 'nude';
    return 'completely';
  }
  const text = cleanText(value, 40).toLowerCase().replace(/_/g, ' ').trim();
  if (!text) return null;
  if (text === 'clothed' || text === 'dressed' || text === 'clothes') return 'clothed';
  if (text === 'off' || text === 'false' || text === '0' || text === 'none') return 'clothed';
  if (text === 'torn clothes' || text === '1') return 'torn';
  if (text === '2') return 'nude';
  if (text === 'completely nude' || text === 'complete' || text === '3' || text === 'on' || text === 'true') {
    return 'completely';
  }
  if (STATE_SET.has(text)) return text as WearState;
  return null;
}

export function resolveWearState(
  shot: { wear_state?: unknown; nude?: unknown } | null | undefined,
  previous: unknown,
): WearState {
  const fromWear = parseWearState(shot?.wear_state);
  if (fromWear) return fromWear;
  if (shot && Object.prototype.hasOwnProperty.call(shot, 'nude') && shot.nude != null && shot.nude !== '') {
    return parseWearState(shot.nude) || 'clothed';
  }
  return parseWearState(previous) || 'clothed';
}

/**
 * Keep base attire; append English clothing-state tags + anatomy for that state.
 * topless → nipples only; bottomless → penis (male) or pussy (female).
 */
export function wearTagsForWearState(
  attire: unknown,
  state: WearState,
  gender: 'f' | 'm' | null = null,
): string {
  const base = cleanText(attire, 4000);
  if (state === 'clothed') return base;
  if (state === 'torn') return joinTags(base, '2::torn clothes::');
  if (state === 'topless') return joinTags(base, 'topless', 'nipples');
  if (state === 'bottomless') {
    if (gender === 'f') return joinTags(base, 'bottomless', 'pussy');
    if (gender === 'm') return joinTags(base, 'bottomless', 'penis');
    return joinTags(base, 'bottomless');
  }
  if (state === 'nude') {
    const tag = '2.5::nude::';
    if (gender === 'f') return joinTags(base, tag, 'nipples', 'pussy');
    if (gender === 'm') return joinTags(base, tag, 'penis');
    return joinTags(base, tag);
  }
  const full = gender === 'm' ? '2.5::completely nude::' : '2::completely nude::';
  if (gender === 'f') return joinTags(base, full, 'nipples', 'pussy');
  if (gender === 'm') return joinTags(base, full, 'penis');
  return joinTags(base, full);
}

export function wearStateNeedsAnatomyAccessories(state: WearState): boolean {
  return state !== 'clothed' && state !== 'torn';
}

type ShotLike = { characters?: ShotCharacter[] | null };

/**
 * Walk shots in order. Omitted wear_state/nude inherits the running state
 * (roster previous, then this message's earlier shots). Bakes `wear_state`
 * onto each shot character for caption + persistence.
 */
export function applyWearContinuityToShots<T extends ShotLike>(
  shots: T[],
  previousForName: (name: string) => unknown,
): Map<string, WearState> {
  const running = new Map<string, WearState>();
  for (const shot of shots || []) {
    const chars = Array.isArray(shot.characters) ? shot.characters : [];
    for (const ch of chars) {
      if (!ch || typeof ch !== 'object') continue;
      const name = cleanText(ch.name, 200);
      if (!name) continue;
      const key = name.toLowerCase();
      const prev = running.get(key) || parseWearState(previousForName(name)) || 'clothed';
      const next = resolveWearState(ch, prev);
      running.set(key, next);
      if (next === 'clothed') {
        delete ch.wear_state;
      } else {
        ch.wear_state = next;
      }
    }
  }
  return running;
}

export function formatWearStateForPrompt(value: unknown): string {
  return parseWearState(value) || 'clothed';
}
