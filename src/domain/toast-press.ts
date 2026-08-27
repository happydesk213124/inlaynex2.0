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
