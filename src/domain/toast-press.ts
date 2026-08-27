export type ToastAnchor = 'tl' | 'bl' | 'tr' | 'br' | 'tc';
export type ImagePressInspect = 'off' | 'hold' | 'two' | 'both';

export function normalizeToastAnchor(value: unknown): ToastAnchor {
  const v = String(value ?? '').toLowerCase().trim();
  if (v === 'tl' || v === 'top-left' || v === 'left-top') return 'tl';
  if (v === 'bl' || v === 'bottom-left' || v === 'left-bottom') return 'bl';
  if (v === 'tr' || v === 'top-right' || v === 'right-top') return 'tr';
  if (v === 'br' || v === 'bottom-right' || v === 'right-bottom') return 'br';
  if (v === 'tc' || v === 'top-center' || v === 'center-top' || v === 'top') return 'tc';
  return 'tc';
}

export function normalizeImagePressInspect(value: unknown): ImagePressInspect {
  const v = String(value ?? '').toLowerCase().trim();
  if (v === 'off' || v === 'none' || v === '0' || v === 'false') return 'off';
  if (v === 'two' || v === 'twohand' || v === 'two-hand' || v === '2') return 'two';
  if (v === 'both' || v === 'all' || v === 'any') return 'both';
  return 'hold';
}

/** two / both: a second pointer must reach the image hit-test, not cancel the first. */
export function imagePressAllowsSecondPointer(mode: unknown): boolean {
  const m = normalizeImagePressInspect(mode);
  return m === 'two' || m === 'both';
}

/**
 * Live image-press pointer bookkeeping.
 *
 * Counting by `pointerId` looked right and never worked on mobile: the host
 * forwards a plain object, so `pointerId` can be missing or repeated and two
 * fingers collapse into one entry. These helpers count *pointerdown events that
 * landed on a shot* instead, so identity never matters. `windowMs` exists
 * because a lost `pointerup` would otherwise leave the count high forever and
 * make one finger pass as two.
 */
export const IMAGE_PRESS_WINDOW_MS = 4000;

export function pruneImagePressDowns(
  downs: unknown,
  now: unknown,
  windowMs: unknown = IMAGE_PRESS_WINDOW_MS,
): number[] {
  const at = Number(now);
  const nowMs = Number.isFinite(at) ? at : 0;
  const raw = Number(windowMs);
  const win = Number.isFinite(raw) && raw > 0 ? raw : IMAGE_PRESS_WINDOW_MS;
  if (!Array.isArray(downs)) return [];
  return downs
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v) && nowMs - v <= win);
}

export function noteImagePressDown(
  downs: unknown,
  now: unknown,
  windowMs: unknown = IMAGE_PRESS_WINDOW_MS,
): number[] {
  const at = Number(now);
  const kept = pruneImagePressDowns(downs, now, windowMs);
  kept.push(Number.isFinite(at) ? at : 0);
  return kept;
}

/** One lifted finger drops one entry — oldest, so a stale row cannot outlive the gesture. */
export function noteImagePressUp(downs: unknown): number[] {
  if (!Array.isArray(downs) || !downs.length) return [];
  return downs.slice(1).map((v) => Number(v)).filter((v) => Number.isFinite(v));
}

export function imagePressDownCount(
  downs: unknown,
  now: unknown,
  windowMs: unknown = IMAGE_PRESS_WINDOW_MS,
): number {
  return pruneImagePressDowns(downs, now, windowMs).length;
}

/**
 * Move of a *different* finger must not kill the first image press, and neither
 * may the jitter of a two-finger hold: with both fingers down the reported point
 * jumps between them, which read as a drag and cancelled every attempt.
 */
export function imagePressMoveCancels(opts: {
  pressPointerId?: unknown;
  eventPointerId?: unknown;
  mode?: unknown;
  pressCount?: unknown;
  fromX?: unknown;
  fromY?: unknown;
  toX?: unknown;
  toY?: unknown;
  slopPx?: unknown;
} = {}): boolean {
  const ev = opts.eventPointerId;
  const pr = opts.pressPointerId;
  if (ev != null && pr != null && ev !== pr) return false;
  if (imagePressAllowsSecondPointer(opts.mode)) {
    const held = Number(opts.pressCount);
    if (Number.isFinite(held) && held >= 2) return false;
  }
  const slop = Number(opts.slopPx);
  const s = Number.isFinite(slop) ? Math.max(0, slop) : 8;
  const dx = Number(opts.toX) - Number(opts.fromX);
  const dy = Number(opts.toY) - Number(opts.fromY);
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return false;
  return Math.hypot(dx, dy) > s;
}

/** Mobile pinch often pointercancel's the first finger — keep the two-finger hold. */
export function imagePressIgnorePointerCancel(mode: unknown, source: unknown): boolean {
  if (!imagePressAllowsSecondPointer(mode)) return false;
  const src = String(source || '');
  return src === 'inline-shot' || src === 'sticky-thumb';
}

export function imagePressOtherPointerUp(opts: {
  pressPointerId?: unknown;
  eventPointerId?: unknown;
} = {}): boolean {
  const ev = opts.eventPointerId;
  const pr = opts.pressPointerId;
  return ev != null && pr != null && ev !== pr;
}
