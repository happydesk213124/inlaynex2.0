/**
 * Comic LLM JSON → pages attached onto tagged comic shots (order fallback).
 */
import type { ShotCharacter, TaggedShot } from '../../core/types.ts';
import { cleanText } from '../../core/util/text.ts';
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
  bubble: string;
  text: string;
  center_x: number | null;
  center_y: number | null;
}

export interface ComicPage {
  shot_index: number | null;
  koma: number;
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
  const bubble = cleanText(row.bubble ?? row.balloon, 40).toLowerCase() || 'speech';
  const text = cleanText(row.text ?? row.speech ?? row.dialogue, 400);
  return {
    name,
    action,
    costume,
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
    speech,
    speech_lang: speech ? 'korean' : '',
    center_x: slot.center_x ?? undefined,
    center_y: slot.center_y ?? undefined,
    bubble: slot.bubble,
  };
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
  shot.comic_page = { ...page, aspect };
  shot.characters = page.slots.map(comicSlotToCharacter);
}
