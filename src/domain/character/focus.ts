/** Optional per-shot focus cast → out-of-frame on everyone else. Pure. */

import { joinTags } from '../../core/util/text.ts';

export const FOCUS_OUT_OF_FRAME_TAG = '2::out of frame::';

/**
 * Parse one focus token into a 0-based cast index, or null if invalid.
 * Accepts `1`/`2`… or `char1`/`char2`… (case-insensitive).
 */
export function parseFocusToken(token: unknown, castLen: number): number | null {
  if (castLen <= 0) return null;
  if (typeof token === 'number' && Number.isFinite(token)) {
    const n = Math.trunc(token);
    return n >= 1 && n <= castLen ? n - 1 : null;
  }
  const raw = String(token ?? '').trim().toLowerCase();
  if (!raw) return null;
  const charM = /^char(\d+)$/.exec(raw);
  if (charM) {
    const n = Number(charM[1]);
    return n >= 1 && n <= castLen ? n - 1 : null;
  }
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 && n <= castLen ? n - 1 : null;
}

/**
 * Resolve shot `focus` to sorted unique 0-based indexes.
 * Accepts a number, `"1"`, `"char2"`, `"1,2"`, `[1, 2]`, `["char1","char3"]`, etc.
 * Empty / all-invalid → `[]` (no focus).
 */
export function parseFocusIndexes(focus: unknown, castLen: number): number[] {
  if (castLen <= 0 || focus == null || focus === '') return [];
  const tokens: unknown[] = [];
  if (Array.isArray(focus)) {
    tokens.push(...focus);
  } else if (typeof focus === 'string') {
    const parts = focus.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length) tokens.push(...parts);
    else tokens.push(focus);
  } else {
    tokens.push(focus);
  }
  const out = new Set<number>();
  for (const tok of tokens) {
    const idx = parseFocusToken(tok, castLen);
    if (idx != null) out.add(idx);
  }
  return [...out].sort((a, b) => a - b);
}

/** Append out-of-frame to captions whose index is not in `focusIndexes`. No-op if focus empty. */
export function applyFocusOutOfFrame<T extends { prompt: string }>(
  captions: T[],
  focusIndexes: number[],
): T[] {
  if (!focusIndexes.length || !captions.length) return captions;
  const focus = new Set(focusIndexes);
  return captions.map((cap, i) => {
    if (focus.has(i)) return cap;
    if (/\bout of frame\b/i.test(cap.prompt)) return cap;
    return { ...cap, prompt: joinTags(cap.prompt, FOCUS_OUT_OF_FRAME_TAG) || FOCUS_OUT_OF_FRAME_TAG };
  });
}
