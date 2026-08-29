/**
 * Explorer grid thumbs: bytes → Blob → object URL.
 * Overlay display URLs stay on the other cache and are not used here.
 */

import { sniffImageMime } from '../core/util/bytes';
import { explorerThumbCache } from './blob-url-cache';
import { imagePng } from './stores';

export function resolveExplorerThumbUrl(cardOrId: unknown): string {
  const id = typeof cardOrId === 'string' ? cardOrId : (cardOrId as { id?: unknown } | null)?.id;
  if (!id) return '';
  return explorerThumbCache.get(String(id)) || '';
}

export async function ensureExplorerThumbUrl(id: string): Promise<string> {
  const key = String(id || '');
  if (!key) return '';
  const hit = explorerThumbCache.get(key);
  if (hit) return hit;
  const png = await imagePng(key);
  if (!png?.byteLength) return '';
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return '';
  const mime = sniffImageMime(png);
  const url = URL.createObjectURL(new Blob([new Uint8Array(png)], { type: mime || 'image/png' }));
  explorerThumbCache.set(key, url, png.byteLength);
  return url;
}

export async function warmExplorerThumbs(ids: unknown[] = []): Promise<string[]> {
  const list = [...new Set((ids || []).map(String).filter(Boolean))];
  await Promise.all(list.map((id) => ensureExplorerThumbUrl(id)));
  return list.map((id) => resolveExplorerThumbUrl(id)).filter(Boolean);
}

export function dropExplorerThumbUrl(id: unknown): void {
  explorerThumbCache.drop(String(id || ''));
}

export function retainExplorerThumbs(ids: unknown[] = []): void {
  explorerThumbCache.retainOnly(ids);
}

export function pinExplorerThumbs(ids: unknown[] = []): void {
  explorerThumbCache.pin(ids);
}
