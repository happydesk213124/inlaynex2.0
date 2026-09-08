/** Tail so a preset look shot always shows a girl face, not an empty style plate. */
export const PRESET_LOOK_TAIL = '1girl, smile,';

/** Character 예제샷 / 헤더 참고 — roster tags only. Never the look-plate tail. */
export function joinCharacterPreviewPrompt(pos: unknown): string {
  return String(pos ?? '').replace(/\s+/g, ' ').trim();
}

export const EXAMPLE_SHOT_TAIL = '1girl, 2::solo::, portrait,';

/** Append example-shot framing tags once. Empty positive → just the tail. */
export function joinExampleShotPrompt(pos: unknown): string {
  const base = String(pos ?? '').replace(/\s+/g, ' ').trim();
  const marker = '2::solo::';
  if (!base) return EXAMPLE_SHOT_TAIL;
  if (base.toLowerCase().includes(marker)) return base.endsWith(',') ? base : `${base},`;
  return base.endsWith(',') ? `${base} ${EXAMPLE_SHOT_TAIL}` : `${base}, ${EXAMPLE_SHOT_TAIL}`;
}

/** Append `1girl, smile,` once. Empty positive → just the tail. */
export function joinPresetLookPrompt(pos: unknown): string {
  const base = String(pos ?? '').replace(/\s+/g, ' ').trim();
  if (!base) return PRESET_LOOK_TAIL;
  const collapsed = base.toLowerCase();
  if (collapsed.includes('1girl, smile')) return base.endsWith(',') ? base : `${base},`;
  return base.endsWith(',') ? `${base} ${PRESET_LOOK_TAIL}` : `${base}, ${PRESET_LOOK_TAIL}`;
}
