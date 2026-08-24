/**
 * Pass-2 shot focus bands: map y_percent → chat slice without mutating the
 * cached full-chat user message.
 */

export interface ShotFocusBand {
  from_percent: number;
  to_percent: number;
}

export interface ShotFocusFields {
  focus: ShotFocusBand;
  focus_hint: string;
}

const DEFAULT_HALF_WIDTH = 15;
const HINT_MAX_CHARS = 600;

function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function readYPercent(shot: Record<string, unknown> | null | undefined): number | null {
  if (!shot) return null;
  for (const key of ['y_percent', 'anchor_percent', 'read_percent'] as const) {
    const n = Number(shot[key]);
    if (Number.isFinite(n)) return clampPercent(n);
  }
  return null;
}

/**
 * For each shot (input order preserved), compute a percent band.
 * Neighbors are taken from shots sorted by y_percent; midpoints split the gap.
 * Solo / missing y → ±DEFAULT_HALF_WIDTH around y (or even bands if all missing).
 */
export function focusBandsForShots(
  shots: ReadonlyArray<Record<string, unknown> | null | undefined>,
): ShotFocusBand[] {
  const n = shots.length;
  if (!n) return [];

  const withY = shots.map((shot, index) => ({
    index,
    y: readYPercent(shot),
  }));

  // Fill missing y with even spacing so bands still cover the message.
  const ys = withY.map((row, i) => {
    if (row.y != null) return row.y;
    if (n === 1) return 50;
    return clampPercent((i / Math.max(1, n - 1)) * 100);
  });

  const order = ys
    .map((y, index) => ({ y, index }))
    .sort((a, b) => a.y - b.y || a.index - b.index);

  const bandByIndex: ShotFocusBand[] = Array.from({ length: n }, () => ({
    from_percent: 0,
    to_percent: 100,
  }));

  for (let oi = 0; oi < order.length; oi++) {
    const { y, index } = order[oi]!;
    const prevY = oi > 0 ? order[oi - 1]!.y : null;
    const nextY = oi < order.length - 1 ? order[oi + 1]!.y : null;

    let from: number;
    let to: number;
    if (prevY == null && nextY == null) {
      from = clampPercent(y - DEFAULT_HALF_WIDTH);
      to = clampPercent(y + DEFAULT_HALF_WIDTH);
    } else if (prevY == null) {
      from = 0;
      to = clampPercent((y + (nextY as number)) / 2);
    } else if (nextY == null) {
      from = clampPercent((prevY + y) / 2);
      to = 100;
    } else {
      from = clampPercent((prevY + y) / 2);
      to = clampPercent((y + nextY) / 2);
    }
    if (to < from) to = from;
    // Ensure a minimum sliver so hint is never empty solely due to equal percents.
    if (to - from < 1) {
      from = clampPercent(y - 0.5);
      to = clampPercent(y + 0.5);
      if (to < from) to = from;
    }
    bandByIndex[index] = {
      from_percent: Math.round(from * 100) / 100,
      to_percent: Math.round(to * 100) / 100,
    };
  }

  return bandByIndex;
}

/** Percent → exclusive-ish char range inside `text` (by UTF-16 length). */
export function percentSpanToOffsets(
  text: string,
  fromPercent: number,
  toPercent: number,
): { start: number; end: number } {
  const len = text.length;
  if (!len) return { start: 0, end: 0 };
  const from = clampPercent(fromPercent);
  const to = clampPercent(toPercent);
  let start = Math.floor((len * from) / 100);
  let end = Math.ceil((len * to) / 100);
  if (end < start) end = start;
  if (end === start && start < len) end = Math.min(len, start + 1);
  return { start: Math.max(0, start), end: Math.min(len, end) };
}

/**
 * Snap slice edges toward nearby newlines (cheap readability), then cap length.
 */
export function sliceChatFocusHint(
  chat: string,
  fromPercent: number,
  toPercent: number,
  maxChars = HINT_MAX_CHARS,
): string {
  const raw = typeof chat === 'string' ? chat : '';
  if (!raw) return '';
  let { start, end } = percentSpanToOffsets(raw, fromPercent, toPercent);

  // Expand start back to previous newline within 80 chars.
  const back = raw.lastIndexOf('\n', start);
  if (back >= 0 && start - back <= 80) start = back + 1;
  // Expand end forward to next newline within 80 chars.
  const fwd = raw.indexOf('\n', end);
  if (fwd >= 0 && fwd - end <= 80) end = fwd;

  let slice = raw.slice(start, end).trim();
  if (slice.length > maxChars) {
    slice = `${slice.slice(0, maxChars).trimEnd()}…`;
  }
  return slice;
}

/** Build focus + focus_hint for every shot in input order. */
export function focusFieldsForShots(
  shots: ReadonlyArray<Record<string, unknown> | null | undefined>,
  chatContext: string,
): ShotFocusFields[] {
  const bands = focusBandsForShots(shots);
  return bands.map((focus) => ({
    focus,
    focus_hint: sliceChatFocusHint(chatContext, focus.from_percent, focus.to_percent),
  }));
}
