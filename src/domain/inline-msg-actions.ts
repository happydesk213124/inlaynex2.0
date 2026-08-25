export type InlineMsgActionsMode = 'off' | 'legacy' | 'compat';

/** Saved true (old checkbox) becomes compat — the current non-wipe path. */
export function normalizeInlineMsgActions(raw: unknown): InlineMsgActionsMode {
  if (raw === true || raw === 1) return 'compat';
  const v = String(raw ?? '').trim().toLowerCase();
  if (v === 'legacy' || v === 'convenience' || v === '2.4.7') return 'legacy';
  if (v === 'compat' || v === 'compatible' || v === '2.4.9') return 'compat';
  if (v === 'true' || v === '1') return 'compat';
  return 'off';
}

export function inlineMsgActionsOn(raw: unknown): boolean {
  return normalizeInlineMsgActions(raw) !== 'off';
}

export function inlineMsgActionsLegacy(raw: unknown): boolean {
  return normalizeInlineMsgActions(raw) === 'legacy';
}
