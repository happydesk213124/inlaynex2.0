import { cleanText } from '../../core/util/text.ts';

export function parseSessionAuthorNote(raw: unknown): {
  prefix: string;
  suffix: string;
  preset_id: string;
  location: string;
} {
  if (typeof raw === 'string') {
    return { prefix: cleanText(raw, 8000), suffix: '', preset_id: '', location: '' };
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const rec = raw as Record<string, unknown>;
    const prefix = cleanText(rec.prefix ?? rec.text ?? '', 8000);
    const suffix = cleanText(rec.suffix ?? rec.post ?? '', 8000);
    const preset_id = cleanText(rec.preset_id ?? rec.presetId ?? '', 80);
    const location = cleanText(rec.location ?? rec.location_tags ?? '', 800);
    return { prefix, suffix, preset_id, location };
  }
  return { prefix: '', suffix: '', preset_id: '', location: '' };
}

/** Shared / per-lane user note. Empty body is omitted. */
export function authorNoteSystemContent(label: string, body: unknown): string {
  const text = cleanText(body, 8000);
  if (!text) return '';
  return [
    `# Priority: ${label}`,
    text,
    '> These are instructions explicitly given by the user. If in conflict with previous instructions, this section MUST take precedence.',
  ].join('\n');
}

export function joinSessionAuthorNote(prefix: unknown, suffix: unknown): string {
  return [cleanText(prefix, 8000), cleanText(suffix, 8000)].filter(Boolean).join('\n');
}

/** System turn after the global Author's Note. Session text wins on conflict. */
export function sessionAuthorNoteSystemContent(raw: unknown): string {
  const { prefix, suffix } = typeof raw === 'string' || (raw && typeof raw === 'object' && ('prefix' in (raw as object) || 'suffix' in (raw as object) || 'text' in (raw as object)))
    ? parseSessionAuthorNote(raw)
    : { prefix: cleanText(raw, 8000), suffix: '' };
  if (!prefix && !suffix) return '';
  const body = [
    prefix ? `## 선행\n${prefix}` : '',
    suffix ? `## 후행\n${suffix}` : '',
  ].filter(Boolean).join('\n\n');
  return [
    '# Priority: 이세션 명령어',
    body,
    '> These instructions apply only to this Risu session. If they conflict with the global Author\'s Note above, this section MUST take precedence.',
  ].join('\n');
}
