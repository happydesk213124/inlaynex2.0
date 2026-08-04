/** Pure explorer selection + sort helpers (no DOM). */

export interface SelectionState {
  selected: Set<string>;
  anchorId: string;
  focusId: string;
}

/** The only fields the explorer grid reads off a card row. */
export interface ExplorerItem {
  id?: string;
  created_at?: number;
  message_index?: number;
  shot_index?: number;
  [key: string]: unknown;
}

export interface ExplorerClickOptions {
  index?: number;
  ids?: Array<string | number>;
  shift?: boolean;
  ctrl?: boolean;
}

export type ExplorerSortMode = 'newest' | 'oldest' | 'message' | 'shot';

export type ThumbSize = 's' | 'm' | 'l';

/** Fresh selection state seeded with already-selected ids. */
export function createSelectionState(ids: Array<string | number> = []): SelectionState {
  return {
    selected: new Set((ids || []).map(String).filter(Boolean)),
    anchorId: '',
    focusId: '',
  };
}

/** Ids of the currently rendered rows, in render order. */
export function visibleIds(items: Array<ExplorerItem | null | undefined> = []): string[] {
  return (items || []).map((item) => String(item?.id || '')).filter(Boolean);
}

/** Next selection state for a click, honouring shift-range and ctrl-toggle. */
export function applyExplorerClick(
  state: SelectionState | null | undefined,
  id: string,
  { index, ids, shift = false, ctrl = false }: ExplorerClickOptions = {},
): SelectionState {
  const next: SelectionState = {
    selected: new Set(state?.selected || []),
    anchorId: String(state?.anchorId || ''),
    focusId: String(state?.focusId || ''),
  };
  const target = String(id || '');
  if (!target) return next;
  const list = Array.isArray(ids) ? ids.map(String) : [];
  const idx = typeof index === 'number' && Number.isFinite(index) ? index : list.indexOf(target);

  if (shift && next.anchorId && list.length) {
    const a = list.indexOf(next.anchorId);
    const b = idx >= 0 ? idx : list.indexOf(target);
    if (a >= 0 && b >= 0) {
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      next.selected = new Set(list.slice(lo, hi + 1));
      next.focusId = target;
      return next;
    }
  }

  if (ctrl) {
    if (next.selected.has(target)) next.selected.delete(target);
    else next.selected.add(target);
    next.anchorId = target;
    next.focusId = target;
    return next;
  }

  next.selected = new Set([target]);
  next.anchorId = target;
  next.focusId = target;
  return next;
}

/** Select every visible id, keeping the existing anchor/focus when there is one. */
export function selectAll(state: SelectionState | null | undefined, ids: Array<string | number> = []): SelectionState {
  return {
    selected: new Set((ids || []).map(String).filter(Boolean)),
    anchorId: String(state?.anchorId || ids?.[0] || ''),
    focusId: String(state?.focusId || ids?.[0] || ''),
  };
}

/** Empty selection that keeps the anchor so a following shift-click still works. */
export function clearSelection(state: SelectionState | null = null): SelectionState {
  return {
    selected: new Set<string>(),
    anchorId: String(state?.anchorId || ''),
    focusId: '',
  };
}

/** Id `delta` steps from the focused one, clamped at both ends (no wrap). */
export function moveFocus(ids: Array<string | number> = [], focusId = '', delta = 1): string {
  const list = (ids || []).map(String).filter(Boolean);
  if (!list.length) return '';
  const cur = list.indexOf(String(focusId || ''));
  if (cur < 0) return list[0];
  return list[Math.max(0, Math.min(list.length - 1, cur + delta))];
}

/** Sorted copy of the explorer rows for the selected sort mode. */
export function sortExplorerItems<T extends ExplorerItem>(items: T[] = [], mode: ExplorerSortMode = 'newest'): T[] {
  const list = [...(items || [])];
  const num = (v: unknown, d = 0): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  };
  if (mode === 'oldest') {
    return list.sort((a, b) => num(a.created_at) - num(b.created_at) || String(a.id).localeCompare(String(b.id)));
  }
  if (mode === 'message') {
    return list.sort(
      (a, b) =>
        num(a.message_index, 1e9) - num(b.message_index, 1e9) ||
        num(a.shot_index) - num(b.shot_index) ||
        num(b.created_at) - num(a.created_at),
    );
  }
  if (mode === 'shot') {
    return list.sort(
      (a, b) =>
        num(a.shot_index) - num(b.shot_index) ||
        num(a.message_index, 1e9) - num(b.message_index, 1e9) ||
        num(b.created_at) - num(a.created_at),
    );
  }
  // newest (default)
  return list.sort((a, b) => num(b.created_at) - num(a.created_at) || String(b.id).localeCompare(String(a.id)));
}

/** Grid track minimum for the three thumbnail size presets. */
export function thumbMinWidth(size: ThumbSize = 'm'): number {
  if (size === 's') return 96;
  if (size === 'l') return 200;
  return 148;
}

/** Reorder by an explicit id list; anything not named keeps its relative order at the end. */
export function reorderByIds<T>(list: T[] = [], orderedIds: Array<string | number> = []): T[] {
  // Entries may be card objects or bare ids, so key on `.id` when there is one.
  const keyOf = (item: T): string => {
    const id = item && typeof item === 'object' ? (item as { id?: unknown }).id : undefined;
    return String(id ?? item);
  };
  const map = new Map<string, T>((list || []).map((item) => [keyOf(item), item]));
  const out: T[] = [];
  for (const id of orderedIds || []) {
    const key = String(id);
    if (map.has(key)) {
      out.push(map.get(key) as T);
      map.delete(key);
    }
  }
  for (const item of map.values()) out.push(item);
  return out;
}
