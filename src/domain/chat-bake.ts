/**
 * Permanent chat-image tokens. Risu renders `{{#asset::inxbake_*}}`.
 * Strip these before hashing, tagging, or placing the next shot.
 */
import { sanitizeShotId } from './gallery/shot-assets.ts';

export const BAKE_ASSET_PREFIX = 'inxbake_';

const BAKE_TOKEN_RE = /\{\{#asset::inxbake_[^}]+\}\}/g;

export function bakeAssetName(cardId: unknown): string {
  const id = sanitizeShotId(cardId);
  return id ? `${BAKE_ASSET_PREFIX}${id}.webp` : '';
}

export function bakeTokenForCard(cardId: unknown): string {
  const name = bakeAssetName(cardId);
  return name ? `{{#asset::${name}}}` : '';
}

export function isBakeAssetName(name: unknown): boolean {
  return String(name || '').toLowerCase().startsWith(BAKE_ASSET_PREFIX);
}

export function messageHasBakeToken(text: unknown): boolean {
  return /\{\{#asset::inxbake_[^}]+\}\}/.test(String(text || ''));
}

export function stripBakeTokens(text: unknown): string {
  BAKE_TOKEN_RE.lastIndex = 0;
  return String(text ?? '')
    .replace(/\{\{#asset::inxbake_[^}]+\}\}\n?/g, '')
    .replace(/\n{3,}/g, '\n\n');
}

/** Hash / tagger prose — bake marks must not change the fingerprint. */
export function proseForHash(text: unknown): string {
  return stripBakeTokens(text);
}

export function stripBakeTokenForCard(text: unknown, cardId: unknown): string {
  const token = bakeTokenForCard(cardId);
  if (!token) return String(text ?? '');
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return String(text ?? '').replace(new RegExp(`${escaped}\\n?`, 'g'), '');
}
