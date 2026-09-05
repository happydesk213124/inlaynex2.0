import { SESSION_AUTHOR_NOTE_KEY, SESSION_AUTHOR_NOTE_PRESETS_KEY } from '../core/constants';
import type { ApiResult } from '../core/types';
import { cleanText } from '../core/util/text';
import { joinSessionAuthorNote, parseSessionAuthorNote, sessionAuthorNoteSystemContent } from '../domain/tagging/session-note';
import { psGet, psSet } from '../storage/device-store';

export interface SessionNotePreset {
  id: string;
  name: string;
  prefix: string;
  suffix: string;
}

function sessionKey(sessionId: unknown): string {
  const id = cleanText(sessionId, 200);
  if (!id) throw new Error('session_id required');
  return SESSION_AUTHOR_NOTE_KEY(id);
}

function asPresets(raw: unknown): SessionNotePreset[] {
  const rec = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as { items?: unknown } : null;
  const arr = Array.isArray(raw) ? raw : Array.isArray(rec?.items) ? rec!.items : [];
  const out: SessionNotePreset[] = [];
  for (const row of arr) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const id = cleanText(r.id, 80);
    const name = cleanText(r.name, 80);
    if (!id || !name) continue;
    out.push({
      id,
      name,
      prefix: cleanText(r.prefix ?? r.text, 8000),
      suffix: cleanText(r.suffix ?? r.post, 8000),
    });
  }
  return out;
}

export async function getSessionAuthorNote(sessionId: unknown): Promise<ApiResult> {
  const id = cleanText(sessionId, 200);
  if (!id) throw new Error('session_id required');
  const parsed = parseSessionAuthorNote(await psGet(sessionKey(id)));
  const text = joinSessionAuthorNote(parsed.prefix, parsed.suffix);
  return { ok: true, session_id: id, ...parsed, text };
}

/** Empty when no session or no text. Callers append this after the global note. */
export async function sessionAuthorNoteLlmContent(sessionId: unknown): Promise<string> {
  const id = cleanText(sessionId, 200);
  if (!id) return '';
  try {
    return sessionAuthorNoteSystemContent(await getSessionAuthorNote(id));
  } catch {
    return '';
  }
}

export async function setSessionAuthorNote(
  sessionId: unknown,
  body: Record<string, unknown> | unknown,
): Promise<ApiResult> {
  const id = cleanText(sessionId, 200);
  if (!id) throw new Error('session_id required');
  const rec = body && typeof body === 'object' && !Array.isArray(body)
    ? body as Record<string, unknown>
    : { text: body };
  const prefix = rec.prefix != null || rec.suffix != null
    ? cleanText(rec.prefix, 8000)
    : cleanText(rec.text, 8000);
  const suffix = rec.prefix != null || rec.suffix != null
    ? cleanText(rec.suffix, 8000)
    : '';
  const preset_id = cleanText(rec.preset_id || rec.presetId, 80);
  const prev = parseSessionAuthorNote(await psGet(sessionKey(id)));
  const location = rec.location != null || rec.location_tags != null
    ? cleanText(rec.location ?? rec.location_tags, 800)
    : prev.location;
  const next = { prefix, suffix, preset_id, location };
  await psSet(sessionKey(id), next);
  return { ok: true, session_id: id, ...next, text: joinSessionAuthorNote(prefix, suffix) };
}

/** Keep prefix/suffix; write the running place tags after a job. */
export async function persistSessionLocation(sessionId: unknown, location: unknown): Promise<void> {
  const id = cleanText(sessionId, 200);
  if (!id) return;
  const prev = parseSessionAuthorNote(await psGet(sessionKey(id)));
  const nextLoc = cleanText(location, 800);
  if (prev.location === nextLoc) return;
  await psSet(sessionKey(id), { ...prev, location: nextLoc });
}

export async function listSessionAuthorNotePresets(): Promise<ApiResult> {
  const items = asPresets(await psGet(SESSION_AUTHOR_NOTE_PRESETS_KEY));
  return { ok: true, items };
}

export async function saveSessionAuthorNotePresets(items: unknown): Promise<ApiResult> {
  const next = asPresets(items);
  await psSet(SESSION_AUTHOR_NOTE_PRESETS_KEY, { items: next });
  return { ok: true, items: next };
}
