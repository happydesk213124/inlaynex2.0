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

export function shotAssetName(id: unknown, ext = 'webp'): string {
  const safe = sanitizeShotId(id);
  const e = String(ext || 'webp').toLowerCase().replace(/[^a-z0-9]/g, '') || 'webp';
  return safe ? `${SHOT_ASSET_PREFIX}${safe}.${e}` : '';
}

export function idFromShotAssetName(name: unknown): string {
  const n = cleanText(name, 400);
  const lower = n.toLowerCase();
  if (!lower.startsWith(SHOT_ASSET_PREFIX)) return '';
  return sanitizeShotId(n.slice(SHOT_ASSET_PREFIX.length).replace(/\.[a-z0-9]+$/i, ''));
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
