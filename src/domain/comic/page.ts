/**
 * Comic LLM JSON → pages attached onto tagged comic shots (order fallback).
 */
import type { ShotCharacter, TaggedShot } from '../../core/types.ts';
import { cleanText } from '../../core/util/text.ts';
import { parseWearState, type WearState } from '../character/wear-state.ts';
import { readNaiCoord } from '../nai/coords.ts';
import { normalizeComicPageCoords } from './coords.ts';
import { resolveShotAspect } from '../nai-meta/aspect.ts';
import { normalizeShotKind } from './kind.ts';

/** NAI V5 caption ceiling. Comic pages ignore `card.character_max`. */
export const COMIC_SLOT_MAX = 6;

export function comicSlotLimit(): number {
  return COMIC_SLOT_MAX;
}

export function takeComicGenerationSlots<T>(slots: readonly T[] | null | undefined): T[] {
  return (Array.isArray(slots) ? slots.slice() : []).slice(0, COMIC_SLOT_MAX);
}

export interface ComicSlot {
  name: string;
  action: string;
  costume: string;
  wear_state?: WearState;
  bubble: string;
  text: string;
  center_x: number | null;
  center_y: number | null;
}

export interface ComicPage {
  shot_index: number | null;
  koma: number;
  location: string;
  aspect: string;
  coords: 'position' | 'ai_choice' | '';
  layout: string;
  slots: ComicSlot[];
}

function readSlot(raw: unknown): ComicSlot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const name = cleanText(row.name, 200);
  const action = cleanText(row.action, 800);
  const costume = cleanText(row.costume ?? row.outfit, 4000);
  const wear_state = parseWearState(row.wear_state ?? row.nude) || undefined;
  const bubble = cleanText(row.bubble ?? row.balloon, 40).toLowerCase() || 'speech';
  const text = cleanText(row.text ?? row.speech ?? row.dialogue, 400);
  return {
    name,
    action,
    costume,
    ...(wear_state ? { wear_state } : {}),
    bubble,
    text,
    center_x: readNaiCoord(row.center_x),
    center_y: readNaiCoord(row.center_y),
  };
}

export function parseComicPages(raw: unknown): ComicPage[] {
  const root = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(root.pages)
      ? root.pages
      : root.page
        ? [root.page]
        : [];
  const pages: ComicPage[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const slotsRaw = Array.isArray(row.slots) ? row.slots : Array.isArray(row.characters) ? row.characters : [];
    const slots: ComicSlot[] = [];
    for (const s of slotsRaw) {
      const slot = readSlot(s);
      if (slot) slots.push(slot);
      if (slots.length >= COMIC_SLOT_MAX) break;
    }
    if (!slots.length) continue;
    let koma = Math.floor(Number(row.koma ?? row.panels ?? slots.length));
    if (!Number.isFinite(koma) || koma < 1) koma = Math.min(COMIC_SLOT_MAX, slots.length);
    koma = Math.max(1, Math.min(COMIC_SLOT_MAX, koma));
    const idx = Math.floor(Number(row.shot_index ?? row.shot ?? row.index));
    pages.push({
      shot_index: Number.isFinite(idx) ? idx : null,
      koma,
      location: cleanText(row.location, 800),
      aspect: cleanText(row.aspect, 40) || 'portrait',
      coords: normalizeComicPageCoords(row.coords ?? row.use_coords),
      layout: cleanText(row.layout ?? row.base ?? row.main, 2000),
      slots,
    });
  }
  return pages;
}

export function comicSlotToCharacter(slot: ComicSlot): ShotCharacter {
  const speech = slot.text;
  return {
    name: slot.name,
    action: slot.action,
    costume: slot.costume,
    ...(slot.wear_state ? { wear_state: slot.wear_state } : {}),
    speech,
    speech_lang: speech ? 'korean' : '',
    center_x: slot.center_x ?? undefined,
    center_y: slot.center_y ?? undefined,
    bubble: slot.bubble,
  };
}

function seedWearByName(chars: readonly ShotCharacter[] | null | undefined): Map<string, WearState> {
  const running = new Map<string, WearState>();
  for (const ch of chars || []) {
    const name = cleanText(ch?.name, 200);
    const wear = parseWearState(ch?.wear_state) || parseWearState(ch?.nude);
    if (name && wear) running.set(name.toLowerCase(), wear);
  }
  return running;
}

/** Slot wear wins; omitted copies the last state for that name (cast or earlier slot). */
function slotsWithInheritedWear(
  prevChars: readonly ShotCharacter[] | null | undefined,
  slots: readonly ComicSlot[],
): ComicSlot[] {
  const running = seedWearByName(prevChars);
  return slots.map((slot) => {
    const key = cleanText(slot.name, 200).toLowerCase();
    const parsed = parseWearState(slot.wear_state);
    if (parsed) {
      if (key) running.set(key, parsed);
      return { ...slot, wear_state: parsed };
    }
    const prev = key ? running.get(key) : undefined;
    return prev ? { ...slot, wear_state: prev } : slot;
  });
}

function comicShotIndexes(shots: readonly TaggedShot[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < shots.length; i += 1) {
    if (normalizeShotKind(shots[i]?.kind) === 'comic') out.push(i);
  }
  return out;
}

/** Match page.shot_index to a comic shot; leftover pages fill remaining comics in order. */
export function assignComicPagesToShots(shots: TaggedShot[], pages: readonly ComicPage[]): Set<number> {
  const comicIdx = comicShotIndexes(shots);
  const assigned = new Set<number>();
  const usedPages = new Set<number>();

  const tryIndex = (raw: number): number | null => {
    if (comicIdx.includes(raw) && !assigned.has(raw)) return raw;
    const asOne = raw - 1;
    if (comicIdx.includes(asOne) && !assigned.has(asOne)) return asOne;
    return null;
  };

  for (let p = 0; p < pages.length; p += 1) {
    const page = pages[p]!;
    if (page.shot_index == null) continue;
    const hit = tryIndex(page.shot_index);
    if (hit == null) continue;
    attachPage(shots[hit]!, page);
    assigned.add(hit);
    usedPages.add(p);
  }
  const leftover = comicIdx.filter((i) => !assigned.has(i));
  let li = 0;
  for (let p = 0; p < pages.length && li < leftover.length; p += 1) {
    if (usedPages.has(p)) continue;
    const hit = leftover[li++]!;
    attachPage(shots[hit]!, pages[p]!);
    assigned.add(hit);
  }
  return assigned;
}

function attachPage(shot: TaggedShot, page: ComicPage): void {
  const aspect = resolveShotAspect(shot.aspect);
  shot.aspect = aspect;
  const slots = slotsWithInheritedWear(shot.characters, page.slots);
  shot.comic_page = { ...page, aspect, slots };
  shot.characters = slots.map(comicSlotToCharacter);
  if (page.location) shot.location = page.location;
}

/** Nested `comic_page` only — never treat shot.characters as slots. */
export function readComicPageFromShot(shot: unknown): ComicPage | null {
  if (!shot || typeof shot !== 'object' || Array.isArray(shot)) return null;
  const nested = (shot as Record<string, unknown>).comic_page;
  if (!nested || typeof nested !== 'object' || Array.isArray(nested)) return null;
  return parseComicPages({ pages: [nested] })[0] || null;
}

/** Cast already comes from `comic_page.slots` — do not name-merge or apply character_max. */
export function shotKeepsComicSlots(shot: unknown): boolean {
  return readComicPageFromShot(shot) != null;
}

export function attachInlineComicPages(shots: TaggedShot[]): Set<number> {
  const assigned = new Set<number>();
  for (let i = 0; i < shots.length; i += 1) {
    const shot = shots[i];
    if (!shot || normalizeShotKind(shot.kind) !== 'comic') continue;
    const page = readComicPageFromShot(shot);
    if (!page) continue;
    attachPage(shot, page);
    assigned.add(i);
  }
  return assigned;
}
