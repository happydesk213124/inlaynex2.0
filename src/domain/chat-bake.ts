/**
 * Permanent chat-image tokens. Stored as `[[@inray::cardId::inxshot_…]]`.
 * Display (center / hover fullscreen) is a Risu editdisplay module, not this
 * string. Strip before hashing, tagging, or placing the next shot.
 */
import { isShotAssetName, sanitizeShotId } from './gallery/shot-assets.ts';
import { cleanText } from '../core/util/text.ts';

const INRAY_TOKEN_RE = /\[\[@inray::[^\]]+\]\]/g;
const LEGACY_BAKE_RE = /\{\{#asset::inxbake_[^}]+\}\}/g;

export function bakeTokenForCard(cardId: unknown, assetName?: unknown): string {
  const id = sanitizeShotId(cardId);
  const name = cleanText(assetName, 400);
  if (!id || !name || !isShotAssetName(name)) return '';
  return `[[@inray::${id}::${name}]]`;
}

export function messageHasBakeToken(text: unknown): boolean {
  const raw = String(text || '');
  return /\[\[@inray::[^\]]+\]\]/.test(raw) || /\{\{#asset::inxbake_[^}]+\}\}/.test(raw);
}

export function messageHasBakeTokenForCard(text: unknown, cardId: unknown): boolean {
  const id = sanitizeShotId(cardId);
  if (!id) return false;
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const raw = String(text || '');
  return new RegExp(`\\[\\[@inray::${escaped}::`).test(raw)
    || new RegExp(`\\{\\{#asset::inxbake_${escaped}`).test(raw);
}

export function stripBakeTokens(text: unknown): string {
  INRAY_TOKEN_RE.lastIndex = 0;
  LEGACY_BAKE_RE.lastIndex = 0;
  return String(text ?? '')
    .replace(/\[\[@inray::[^\]]+\]\]\n?/g, '')
    .replace(/\{\{#asset::inxbake_[^}]+\}\}\n?/g, '')
    .replace(/\n{3,}/g, '\n\n');
}

/** Hash / tagger prose — bake marks must not change the fingerprint. */
export function proseForHash(text: unknown): string {
  return stripBakeTokens(text);
}

/** Swap one baked card's token for a reroll — same slot, new id / asset name. */
export function replaceBakeTokenCard(
  text: unknown,
  prevCardId: unknown,
  nextCardId: unknown,
  nextAssetName: unknown,
): string {
  const prev = sanitizeShotId(prevCardId);
  const token = bakeTokenForCard(nextCardId, nextAssetName);
  if (!prev || !token) return String(text ?? '');
  const escaped = prev.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return String(text ?? '').replace(new RegExp(`\\[\\[@inray::${escaped}::[^\\]]+\\]\\]`, 'g'), token);
}

export function stripBakeTokenForCard(text: unknown, cardId: unknown): string {
  const id = sanitizeShotId(cardId);
  if (!id) return String(text ?? '');
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return String(text ?? '')
    .replace(new RegExp(`\\[\\[@inray::${escaped}::[^\\]]+\\]\\]\\n?`, 'g'), '')
    .replace(new RegExp(`\\{\\{#asset::inxbake_${escaped}(?:\\.webp)?\\}\\}\\n?`, 'g'), '');
}
