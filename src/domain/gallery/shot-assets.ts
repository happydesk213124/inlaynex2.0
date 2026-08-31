/**
 * Pure rules for the gallery shot module.
 * Bytes live in a Risu module; the images index keeps card id + asset_path.
 */
import { cleanText } from '../../core/util/text.ts';

export const SHOT_ASSET_PREFIX = 'inxshot_';
export const SHOT_MODULE_ID = 'inlay-gallery';
export const SHOT_MODULE_NS = 'inlay.gallery';
export const SHOT_MODULE_NAME = 'Inlay 갤러리';

export function sanitizeShotId(id: unknown): string {
  return String(id || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
}

export function isShotAssetName(name: unknown): boolean {
  const n = cleanText(name, 400).toLowerCase();
  return n.startsWith(SHOT_ASSET_PREFIX);
}

/**
 * Marks the room segment of an asset name: `inxshot_<id>.s<session>.<ext>`.
 *
 * `.` separates because `sanitizeShotId` strips it, so neither the card id nor
 * the session id can contain one. That is what keeps the split unambiguous for
 * ids that already hold underscores, and it leaves the extension last for hosts
 * that sniff the name.
 */
const SESSION_MARK = 's';

export function sanitizeSessionId(id: unknown): string {
  return String(id || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
}

export function shotAssetName(id: unknown, ext = 'webp', sessionId?: unknown): string {
  const safe = sanitizeShotId(id);
  if (!safe) return '';
  const e = String(ext || 'webp').toLowerCase().replace(/[^a-z0-9]/g, '') || 'webp';
  const sid = sanitizeSessionId(sessionId);
  const room = sid ? `.${SESSION_MARK}${sid}` : '';
  return `${SHOT_ASSET_PREFIX}${safe}${room}.${e}`;
}

/** The `.s<session>` and `.<ext>` segments of a name, `['', '']` when absent. */
function shotNameParts(name: unknown): { id: string; session: string } {
  const n = cleanText(name, 400);
  if (!n.toLowerCase().startsWith(SHOT_ASSET_PREFIX)) return { id: '', session: '' };
  const parts = n.slice(SHOT_ASSET_PREFIX.length).split('.');
  const id = sanitizeShotId(parts[0]);
  // parts: [id, ext] before rooms were stamped, [id, s<session>, ext] after.
  const mid = parts.length >= 3 ? cleanText(parts[1], 80) : '';
  const session = mid.startsWith(SESSION_MARK) ? sanitizeSessionId(mid.slice(SESSION_MARK.length)) : '';
  return { id, session };
}

export function idFromShotAssetName(name: unknown): string {
  return shotNameParts(name).id;
}

/** Which character-chat a stored shot belongs to, '' for pre-room names. */
export function sessionFromShotAssetName(name: unknown): string {
  return shotNameParts(name).session;
}

/** Risu getDatabase may wrap arrays; accept array-likes and {name,path} rows. */
export function asShotAssetRows(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && typeof (raw as { length?: unknown }).length === 'number') {
    try {
      return Array.from(raw as ArrayLike<unknown>);
    } catch {
      return [];
    }
  }
  return [];
}

export function parseShotModuleAssets(raw: unknown): Array<[string, string, string]> {
  const out: Array<[string, string, string]> = [];
  for (const row of asShotAssetRows(raw)) {
    if (Array.isArray(row) && row.length >= 2) {
      const name = cleanText(row[0], 400);
      const path = cleanText(row[1], 800);
      const ext = cleanText(row[2], 400) || extFromName(name);
      if (name && path) out.push([name, path, ext]);
      continue;
    }
    if (!row || typeof row !== 'object') continue;
    const rec = row as Record<string, unknown>;
    const name = cleanText(rec.name ?? rec.assetName ?? rec.fileName, 400);
    const path = cleanText(rec.key ?? rec.path ?? rec.id ?? rec.asset, 800);
    const ext = cleanText(rec.ext ?? rec.type, 400) || extFromName(name);
    if (name && path) out.push([name, path, ext]);
  }
  return out;
}

function extFromName(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return (m?.[1] || 'webp').toLowerCase();
}

export function normalizeAssetPath(path: unknown): string {
  return cleanText(path, 800).replace(/\\/g, '/').trim();
}
