/**
 * First-tagger comic kind + prose range. Neighbor shot lines are never used
 * to invent a range — only `line` + `comic_line_end`.
 */
import { cleanText } from '../../core/util/text.ts';

export type ShotKind = 'illustration' | 'comic';

export function comicGenOn(card: { comic_gen?: unknown } | null | undefined): boolean {
  const raw = card?.comic_gen;
  if (raw == null || raw === '') return false;
  const s = String(raw).toLowerCase().trim();
  return raw === true || s === 'on' || s === 'true' || s === '1';
}

export function normalizeShotKind(raw: unknown): ShotKind {
  const s = cleanText(raw, 40).toLowerCase();
  if (s === 'comic' || s === 'manga' || s === 'koma') return 'comic';
  return 'illustration';
}

/** Clamp inclusive 1-based [start, end] into the message line count. */
export function comicLineRange(
  line: unknown,
  comicLineEnd: unknown,
  lineCount: number,
): [number, number] {
  const max = Math.max(1, Math.floor(Number(lineCount) || 1));
  let start = Math.floor(Number(line));
  if (!Number.isFinite(start) || start < 1) start = 1;
  start = Math.min(max, start);
  let end = Math.floor(Number(comicLineEnd));
  if (!Number.isFinite(end) || end < 1) end = start;
  end = Math.min(max, Math.max(start, end));
  return [start, end];
}

export function clampComicPages<T extends { kind?: unknown }>(
  shots: readonly T[],
  maxPages: unknown,
): T[] {
  let max = Math.floor(Number(maxPages));
  if (!Number.isFinite(max) || max < 0) max = 2;
  max = Math.min(12, max);
  if (!max) return shots.filter((s) => normalizeShotKind(s.kind) !== 'comic');
  let kept = 0;
  const out: T[] = [];
  for (const shot of shots) {
    if (normalizeShotKind(shot.kind) !== 'comic') {
      out.push(shot);
      continue;
    }
    if (kept < max) {
      out.push(shot);
      kept += 1;
    }
  }
  return out;
}

export function applyComicKindGuard<T extends { kind?: unknown; comic_line_end?: unknown }>(
  shots: T[],
  enabled: boolean,
): T[] {
  if (enabled) {
    for (const shot of shots) {
      shot.kind = normalizeShotKind(shot.kind);
      if (shot.kind !== 'comic') delete shot.comic_line_end;
    }
    return shots;
  }
  for (const shot of shots) {
    delete shot.kind;
    delete shot.comic_line_end;
  }
  return shots;
}
