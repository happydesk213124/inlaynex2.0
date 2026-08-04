/**
 * Settings persistence.
 *
 * Settings are small and correctness-critical, so unlike row stores they are
 * written straight through and the write is verified by reading back. A silent
 * storage failure here would look to the user like "the plugin keeps forgetting
 * my API key", which is far worse than a visible error.
 */

import { SETTINGS_KEY, LEGACY_SETTINGS_KEY } from '../core/constants';
import type { Settings } from '../core/types';
import { deepcopy, deepMerge } from '../core/util/object';
import { migrateSettings } from '../config/schema';
import { DEFAULT_CONFIG } from '../config/defaults';
import { psGet, psSet } from './device-store';

export async function loadSettingsFromStorage(): Promise<Settings> {
  try {
    const raw = await psGet(SETTINGS_KEY, LEGACY_SETTINGS_KEY);
    if (raw == null || raw === '') return deepcopy(DEFAULT_CONFIG);
    const parsed = (typeof raw === 'string' ? JSON.parse(raw) : raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return deepcopy(DEFAULT_CONFIG);
    const migrated = migrateSettings(parsed);
    const config = deepMerge(DEFAULT_CONFIG, migrated) as Settings;
    // Persist immediately when migration actually rewrote something, so the
    // next load is cheap and a downgrade cannot resurrect the old shape.
    if (JSON.stringify(parsed) !== JSON.stringify(migrated)) await saveSettingsToStorage(config);
    return config;
  } catch (err) {
    console.warn('[Inlay Nexus] settings load failed', (err as Error)?.message || err);
  }
  return deepcopy(DEFAULT_CONFIG);
}

export async function saveSettingsToStorage(config: Settings): Promise<void> {
  // Stored as an object; the IndexedDB backend serialises it for us.
  await psSet(SETTINGS_KEY, deepcopy(config));
  const check = await psGet(SETTINGS_KEY);
  if (check == null) {
    throw new Error('설정 저장 실패: IndexedDB(getLocalPluginStorage)에 기록되지 않았습니다.');
  }
}
