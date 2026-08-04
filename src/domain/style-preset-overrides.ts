/**
 * Per-style-preset CFG overrides (vibe is a separate device-store image).
 *
 * Empty / missing CFG fields mean "use the model-settings NAI defaults".
 */

import type { NaiSettings, StylePreset } from '../core/types.ts';

export interface GenerationCfgParams {
  cfg_scale: number;
  cfg_rescale: number;
}

function optionalFinite(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Resolve CFG for one generation from NAI settings and the active preset. */
export function resolveGenerationCfgParams(
  nai: Pick<NaiSettings, 'cfg_scale' | 'cfg_rescale'>,
  preset: Pick<StylePreset, 'cfg_scale' | 'cfg_rescale'> | null | undefined,
): GenerationCfgParams {
  let cfg_scale = Number(nai.cfg_scale ?? 7);
  let cfg_rescale = Number(nai.cfg_rescale ?? 0.36);
  if (!Number.isFinite(cfg_scale)) cfg_scale = 7;
  if (!Number.isFinite(cfg_rescale)) cfg_rescale = 0.36;

  if (preset) {
    const cfg = optionalFinite(preset.cfg_scale);
    if (cfg != null) cfg_scale = cfg;
    const rescale = optionalFinite(preset.cfg_rescale);
    if (rescale != null) cfg_rescale = rescale;
  }

  return { cfg_scale, cfg_rescale };
}

/** @deprecated Use resolveGenerationCfgParams — vibe is no longer a select mode. */
export function resolveGenerationNaiParams(
  nai: Pick<NaiSettings, 'cfg_scale' | 'cfg_rescale' | 'vibe_transfer'>,
  preset: Pick<StylePreset, 'cfg_scale' | 'cfg_rescale'> | null | undefined,
): GenerationCfgParams & { vibe_transfer: string } {
  const cfg = resolveGenerationCfgParams(nai, preset);
  return { ...cfg, vibe_transfer: String(nai.vibe_transfer || 'none').toLowerCase() || 'none' };
}
