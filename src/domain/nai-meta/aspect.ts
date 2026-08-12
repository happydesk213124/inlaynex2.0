/**
 * Map tagger `aspect` to NovelAI canvas sizes (NovelAI size_id 1/2/5 trio).
 */
import type { NaiSettings } from '../../core/types.ts';

export type ShotAspect = 'portrait' | 'square' | 'landscape';

export const ASPECT_SIZES: Record<ShotAspect, { width: number; height: number }> = {
  portrait: { width: 832, height: 1216 },
  square: { width: 1024, height: 1024 },
  landscape: { width: 1216, height: 832 },
};

/** Normalize LLM aspect strings to the three supported values, or null. */
export function normalizeShotAspect(value: unknown): ShotAspect | null {
  const raw = String(value ?? '').trim().toLowerCase().replace(/\s+/g, '');
  if (!raw) return null;
  if (
    raw === 'portrait'
    || raw === 'vertical'
    || raw === 'tall'
    || raw === '832x1216'
    || raw === '3:4'
    || raw === '2:3'
  ) {
    return 'portrait';
  }
  if (
    raw === 'square'
    || raw === '1:1'
    || raw === '1x1'
    || raw === '1024x1024'
  ) {
    return 'square';
  }
  if (
    raw === 'landscape'
    || raw === 'horizontal'
    || raw === 'wide'
    || raw === '1216x832'
    || raw === '4:3'
    || raw === '3:2'
  ) {
    return 'landscape';
  }
  return null;
}

export function dimsForAspect(
  aspect: unknown,
  nai: Pick<NaiSettings, 'width' | 'height'>,
  autoAspect: boolean,
): { width: number; height: number; aspect: ShotAspect | 'settings' } {
  if (autoAspect) {
    const a = normalizeShotAspect(aspect) || 'portrait';
    return { ...ASPECT_SIZES[a], aspect: a };
  }
  const width = Math.max(64, Math.min(5000, Math.round(Number(nai.width) || 832)));
  const height = Math.max(64, Math.min(5000, Math.round(Number(nai.height) || 1216)));
  return { width, height, aspect: 'settings' };
}
