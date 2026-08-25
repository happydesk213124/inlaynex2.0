/**
 * PocketRisu Standard keeps avatar + name on the same card as the message.
 * Reused Chat instances keep a smashed header until the mount hash changes.
 * largePortrait is in that hash; flip then restore remounts without keeping the flip.
 */
import { hostHas, risuHost } from '../core/host';

async function ensureDbAccess(): Promise<void> {
  const host = risuHost();
  if (typeof host?.requestPluginPermission === 'function') {
    try {
      await host.requestPluginPermission('db');
    } catch {
      // Already granted or older host.
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

async function remountCharacterCards(): Promise<boolean> {
  const host = risuHost();
  const getChar = hostHas('getCharacter') ? host?.getCharacter : hostHas('getChar') ? host?.getChar : null;
  const setChar = hostHas('setCharacter') ? host?.setCharacter : hostHas('setChar') ? host?.setChar : null;
  if (!getChar || !setChar) return false;
  const char = asRecord(await getChar());
  if (!char) return false;
  const prev = Boolean(char.largePortrait);
  await setChar({ ...char, largePortrait: !prev });
  await setChar({ ...char, largePortrait: prev });
  return true;
}

async function remountPersonaCards(): Promise<boolean> {
  if (!hostHas('getDatabase') || !hostHas('setDatabase')) return false;
  await ensureDbAccess();
  const host = risuHost()!;
  const db = asRecord(await host.getDatabase!(['personas', 'selectedPersona']));
  const personas = (Array.isArray(db?.personas) ? db.personas : [])
    .map((row) => asRecord(row))
    .filter((row): row is Record<string, unknown> => Boolean(row));
  if (!personas.length) return false;
  const selected = Number(db?.selectedPersona);
  const idx = Number.isInteger(selected) && selected >= 0 && selected < personas.length ? selected : 0;
  const persona = personas[idx];
  if (!persona) return false;
  const prev = Boolean(persona.largePortrait);
  const flip = personas.map((row, i) => (i === idx ? { ...row, largePortrait: !prev } : row));
  const restore = personas.map((row, i) => (i === idx ? { ...row, largePortrait: prev } : row));
  await host.setDatabase!({ personas: flip as never });
  await host.setDatabase!({ personas: restore as never });
  return true;
}

export async function remountChatCardChrome(): Promise<{ ok: true; remounted: boolean }> {
  const charOk = await remountCharacterCards().catch(() => false);
  const personaOk = await remountPersonaCards().catch(() => false);
  return { ok: true, remounted: Boolean(charOk || personaOk) };
}
