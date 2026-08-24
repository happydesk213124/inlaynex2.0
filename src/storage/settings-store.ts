/**
 * Settings persistence.
 *
 * Settings are small and correctness-critical, so unlike row stores they are
 * written straight through to device IndexedDB and mirrored to Risu
 * `pluginStorage` (account save) so the same login can pick them up on another
 * phone. Images stay device-local.
 *
 * A silent storage failure here would look like "the plugin keeps forgetting
 * my API key", which is far worse than a visible error.
 */

import { SETTINGS_KEY, LEGACY_SETTINGS_KEY } from '../core/constants';
import type { Settings } from '../core/types';
import { deepcopy, deepMerge } from '../core/util/object';
import { migrateSettings } from '../config/schema';
import { DEFAULT_CONFIG } from '../config/defaults';
import { getDeviceStore, psGet, psSet, saveFileGet, saveFileSet } from './device-store';

function parseSettingsRaw(raw: unknown): unknown | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return typeof raw === 'object' ? raw : null;
}

export async function loadSettingsFromStorage(): Promise<Settings> {
  try {
    const { kind } = await getDeviceStore();
    const localRaw = await psGet(SETTINGS_KEY, LEGACY_SETTINGS_KEY);
    let raw: unknown = localRaw;
    if (kind === 'idb') {
      const cloudRaw = await saveFileGet(SETTINGS_KEY);
      if (cloudRaw != null && cloudRaw !== '') {
        raw = cloudRaw;
        try {
          await psSet(SETTINGS_KEY, cloudRaw);
        } catch {
          /* local mirror is best-effort */
        }
      } else if (localRaw != null && localRaw !== '') {
        void saveFileSet(SETTINGS_KEY, localRaw);
      }
    }
    const parsed = parseSettingsRaw(raw);
    if (!parsed) return deepcopy(DEFAULT_CONFIG);
    const migrated = migrateSettings(parsed);
    const config = deepMerge(DEFAULT_CONFIG, migrated) as Settings;
    if (JSON.stringify(parsed) !== JSON.stringify(migrated)) await saveSettingsToStorage(config);
    return config;
  } catch (err) {
    console.warn('[Inlay Nexus] settings load failed', (err as Error)?.message || err);
  }
  return deepcopy(DEFAULT_CONFIG);
}

export async function saveSettingsToStorage(config: Settings): Promise<void> {
  const copy = deepcopy(config);
  try {
    await psSet(SETTINGS_KEY, copy);
  } catch (err) {
    const msg = String((err as Error)?.message || err);
    if (/setItem\s*Error/i.test(msg)) {
      throw new Error(
        '설정 저장 실패(setItem Error): 저장소 쓰기 한도를 넘겼을 수 있습니다. 고정 프롬프트·스타일 프리셋 길이를 줄인 뒤 다시 저장하세요.',
      );
    }
    throw err instanceof Error ? err : new Error(msg);
  }
  const check = await psGet(SETTINGS_KEY);
  if (check == null) {
    throw new Error('설정 저장 실패: IndexedDB(getLocalPluginStorage)에 기록되지 않았습니다.');
  }
  try {
    const { kind } = await getDeviceStore();
    if (kind === 'idb') await saveFileSet(SETTINGS_KEY, copy);
  } catch {
    /* account mirror must not block a successful device write */
  }
}
