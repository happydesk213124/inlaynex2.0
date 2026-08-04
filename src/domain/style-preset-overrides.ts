/**
 * Per-style-preset NovelAI overrides (CFG / vibe).
 *
 * Empty / missing preset fields mean "use the model-settings NAI defaults".
 * Explicit values on the active preset win for that generation only.
 */

import { cleanText } from '../core/util/text.ts';
import type { NaiSettings, StylePreset } from '../core/types.ts';

export interface GenerationNaiParams {
  cfg_scale: number;
  cfg_rescale: number;
  /** Effective vibe mode after preset overlay (`none` / `file` / other). */
  vibe_transfer: string;
}

function optionalFinite(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Resolve CFG + vibe for one generation from NAI settings and the active preset. */
export function resolveGenerationNaiParams(
  nai: Pick<NaiSettings, 'cfg_scale' | 'cfg_rescale' | 'vibe_transfer'>,
  preset: Pick<StylePreset, 'cfg_scale' | 'cfg_rescale' | 'vibe_transfer'> | null | undefined,
): GenerationNaiParams {
  let cfg_scale = Number(nai.cfg_scale ?? 7);
  let cfg_rescale = Number(nai.cfg_rescale ?? 0.36);
  if (!Number.isFinite(cfg_scale)) cfg_scale = 7;
  if (!Number.isFinite(cfg_rescale)) cfg_rescale = 0.36;

  let vibe_transfer = cleanText(nai.vibe_transfer || 'none').toLowerCase() || 'none';

  if (preset) {
    const cfg = optionalFinite(preset.cfg_scale);
    if (cfg != null) cfg_scale = cfg;
    const rescale = optionalFinite(preset.cfg_rescale);
    if (rescale != null) cfg_rescale = rescale;
    const vibe = cleanText(preset.vibe_transfer || '', 40).toLowerCase();
    if (vibe) vibe_transfer = vibe;
  }

  return { cfg_scale, cfg_rescale, vibe_transfer };
}
