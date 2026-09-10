/**
 * Ensures the Inray display-modify module exists and is enabled.
 * Regex only — gallery bytes stay on Inlay 갤러리.
 */
import { dbg } from '../core/debug';
import { hostHas, risuHost } from '../core/host';
import { cleanText } from '../core/util/text';
import {
  INRAY_DISPLAY_MODULE_ID,
  INRAY_DISPLAY_MODULE_NAME,
  INRAY_DISPLAY_MODULE_NS,
  INRAY_DISPLAY_SCRIPT_COMMENT,
  inrayDisplayRegexScript,
} from '../domain/inray-display';
import { asShotAssetRows } from '../domain/gallery/shot-assets';

type ModuleRow = {
  id?: string;
  name?: string;
  description?: string;
  namespace?: string;
  hideIcon?: boolean;
  lorebook?: unknown[];
  regex?: unknown[];
  assets?: unknown[];
};

function readModules(db: { modules?: unknown }): ModuleRow[] {
  return asShotAssetRows(db.modules).filter((row) => row && typeof row === 'object') as ModuleRow[];
}

function findModuleIndex(modules: ModuleRow[]): number {
  return modules.findIndex(
    (m) =>
      cleanText(m?.id, 80) === INRAY_DISPLAY_MODULE_ID ||
      cleanText(m?.namespace, 80) === INRAY_DISPLAY_MODULE_NS,
  );
}

function scriptComment(row: unknown): string {
  if (!row || typeof row !== 'object') return '';
  return cleanText((row as { comment?: unknown }).comment, 80);
}

export async function ensureInrayDisplayModule(): Promise<boolean> {
  if (!hostHas('getDatabase') || !hostHas('setDatabase')) return false;
  const host = risuHost();
  if (!host?.getDatabase || !host.setDatabase) return false;
  try {
    if (typeof host.requestPluginPermission === 'function') {
      try {
        await host.requestPluginPermission('db');
      } catch {
        /* older hosts */
      }
    }
    const db = await host.getDatabase(['modules', 'enabledModules']);
    if (!db) return false;
    const modules = readModules(db);
    const wanted = inrayDisplayRegexScript();
    let idx = findModuleIndex(modules);
    let changed = false;
    if (idx < 0) {
      modules.push({
        id: INRAY_DISPLAY_MODULE_ID,
        name: INRAY_DISPLAY_MODULE_NAME,
        description: '채팅에 박제한 Inray 그림을 가운데 정렬하고 전체화면 버튼을 붙입니다.',
        namespace: INRAY_DISPLAY_MODULE_NS,
        hideIcon: false,
        lorebook: [],
        assets: [],
        regex: [wanted],
      });
      idx = modules.length - 1;
      changed = true;
    } else {
      const cur = modules[idx]!;
      const regex = Array.isArray(cur.regex) ? [...cur.regex] : [];
      const hit = regex.findIndex((row) => scriptComment(row) === INRAY_DISPLAY_SCRIPT_COMMENT);
      const nextJson = JSON.stringify(wanted);
      const prevJson = hit >= 0 ? JSON.stringify(regex[hit]) : '';
      if (hit < 0) {
        regex.push(wanted);
        changed = true;
      } else if (prevJson !== nextJson) {
        regex[hit] = wanted;
        changed = true;
      }
      if (
        cur.hideIcon ||
        cur.id !== INRAY_DISPLAY_MODULE_ID ||
        cur.namespace !== INRAY_DISPLAY_MODULE_NS ||
        cur.name !== INRAY_DISPLAY_MODULE_NAME
      ) {
        changed = true;
      }
      if (changed) {
        modules[idx] = {
          ...cur,
          id: INRAY_DISPLAY_MODULE_ID,
          name: INRAY_DISPLAY_MODULE_NAME,
          namespace: INRAY_DISPLAY_MODULE_NS,
          hideIcon: false,
          regex,
        };
      }
    }
    const enabled = asShotAssetRows(db.enabledModules).map((row) => cleanText(row, 200)).filter(Boolean);
    if (!enabled.includes(INRAY_DISPLAY_MODULE_ID) && !enabled.includes(INRAY_DISPLAY_MODULE_NS)) {
      enabled.push(INRAY_DISPLAY_MODULE_ID);
      changed = true;
    }
    if (!changed) return true;
    await host.setDatabase({ modules: modules as never, enabledModules: enabled as string[] });
    return true;
  } catch (err) {
    dbg('inray-display.ensure.fail', { message: String((err as Error)?.message || err) }, 'warn');
    return false;
  }
}
