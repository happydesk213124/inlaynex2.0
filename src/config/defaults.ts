/**
 * Frozen default configuration and prompt fallbacks.
 *
 * The JSON files beside this module were extracted verbatim from the 1.x
 * backend by `tools/extract-defaults.mjs` rather than retyped, because every
 * key here is a settings key a user may already have stored — a typo would
 * silently reset that setting on upgrade. Regenerate them with that tool; do
 * not hand-edit.
 */

import type { Settings } from '../core/types';
import defaultSettings from './default-settings.json';
import models from './models.json';
import promptFallbacks from './prompt-fallbacks.json';
import qualityTags from './quality-tags.json';
import ucPresets from './uc-presets.json';

export const DEFAULT_CONFIG = defaultSettings as unknown as Settings;

export const PROMPT_FALLBACKS: Readonly<Record<string, string>> = promptFallbacks;

export const QUALITY_TAGS: Readonly<Record<string, string>> = qualityTags;

export const UC_PRESETS: Readonly<Record<string, Record<string, string>>> = ucPresets as Readonly<
  Record<string, Record<string, string>>
>;

export const MODELS: Readonly<Record<string, string>> = models as Readonly<Record<string, string>>;
