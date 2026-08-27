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

/** Move of a *different* finger must not kill the first image press. */
export function imagePressMoveCancels(opts: {
  pressPointerId?: unknown;
  eventPointerId?: unknown;
  fromX?: unknown;
  fromY?: unknown;
  toX?: unknown;
  toY?: unknown;
  slopPx?: unknown;
} = {}): boolean {
  const ev = opts.eventPointerId;
  const pr = opts.pressPointerId;
  if (ev != null && pr != null && ev !== pr) return false;
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
