/**
 * Persist + seed the character lore whitelist (lorefilter).
 */
import { dbg } from '../core/debug.ts';
import { hostHas, risuHost } from '../core/host.ts';
import type { ApiResult, LoreEntry } from '../core/types.ts';
import { cleanText } from '../core/util/text.ts';
import { resolveLlmRole } from '../domain/llm/roles.ts';
import {
  buildLoreCatalog,
  filterLoreEntriesBySelected,
  matchCatalogIdsFromNames,
  normalizeLorefilterSelected,
  parseLorefilterNameArray,
  type LoreCatalogItem,
} from '../domain/lore/lorefilter.ts';
import { callLlm } from './llm-call.ts';
import { idbGet, idbPut } from '../storage/stores.ts';
import { getPrompt } from './settings.ts';
import { getConfig } from './context.ts';

export const lorefilterMetaKey = (characterId: string): string =>
  `lorefilter_${cleanText(characterId, 200) || 'unknown'}`;

interface LorefilterMetaRow {
  key: string;
  selected?: string[];
  updated_at?: number;
}

async function readSelected(characterId: string): Promise<string[]> {
  const row = (await idbGet('meta', lorefilterMetaKey(characterId))) as LorefilterMetaRow | null;
  return normalizeLorefilterSelected(row?.selected);
}

async function writeSelected(characterId: string, selected: string[]): Promise<string[]> {
  const next = normalizeLorefilterSelected(selected);
  await idbPut('meta', {
    key: lorefilterMetaKey(characterId),
    selected: next,
    updated_at: Date.now() / 1000,
  });
  return next;
}

/** Full lorebook from Risu host when available. */
export async function fetchHostLorebookEntries(): Promise<LoreEntry[]> {
  if (!hostHas('getCurrentLorebookEntries')) return [];
  try {
    const host = risuHost() as { getCurrentLorebookEntries?: () => Promise<unknown> };
    const raw = await host.getCurrentLorebookEntries?.();
    return Array.isArray(raw) ? (raw as LoreEntry[]) : [];
  } catch (err) {
    dbg('lorefilter.host_lore.fail', { message: String((err as Error)?.message || err) }, 'warn');
    return [];
  }
}

async function seedSelectedFromLlm(catalog: LoreCatalogItem[]): Promise<string[]> {
  if (!catalog.length) return [];
  const system = (await getPrompt('lorefilter_scan')).trim()
    || 'Extract distinct RP character names from lorebook entry titles. Return JSON array of strings only.';
  const titles = catalog.map((c) => (c.keys.length ? `${c.title} (${c.keys.slice(0, 4).join(', ')})` : c.title));
  const messages = [
    { role: 'system' as const, content: system },
    {
      role: 'user' as const,
      content: JSON.stringify({ lorebookEntryIdentifiers: titles }),
    },
  ];
  const raw = await callLlm(resolveLlmRole(getConfig(), 'asset_char'), messages);
  const names = parseLorefilterNameArray(raw);
  const ids = matchCatalogIdsFromNames(catalog, names);
  dbg('lorefilter.seed', { titles: titles.length, names: names.length, matched: ids.length, focus: true });
  return ids;
}

/**
 * Load selected; if empty, LLM-seed from catalog and persist.
 * `force` re-scans even when selected already exists.
 */
export async function ensureLorefilter(
  characterId: string,
  entries: LoreEntry[] | null | undefined,
  opts: { force?: boolean } = {},
): Promise<string[]> {
  const cid = cleanText(characterId, 200);
  if (!cid) return [];
  const existing = await readSelected(cid);
  if (existing.length && !opts.force) return existing;
  const catalog = buildLoreCatalog(entries);
  if (!catalog.length) return existing;
  try {
    const seeded = await seedSelectedFromLlm(catalog);
    if (!seeded.length) {
      dbg('lorefilter.seed.empty', { character_id: cid, catalog: catalog.length }, 'warn');
      return existing;
    }
    return await writeSelected(cid, seeded);
  } catch (err) {
    dbg('lorefilter.seed.fail', { message: String((err as Error)?.message || err) }, 'warn');
    return existing;
  }
}

/** Apply whitelist; fail-open when empty / no matches. */
export function applyLorefilter(
  entries: LoreEntry[] | null | undefined,
  selected: readonly string[] | null | undefined,
): LoreEntry[] {
  return filterLoreEntriesBySelected(entries, selected);
}

export async function getLorefilterPayload(args: {
  character_id?: string;
  lorebook?: LoreEntry[] | null;
} = {}): Promise<ApiResult> {
  const cid = cleanText(args.character_id || '', 200);
  if (!cid) return { ok: false, error: { code: 'bad_request', message: 'character_id required' } };
  const hostLore = Array.isArray(args.lorebook) && args.lorebook.length
    ? args.lorebook
    : await fetchHostLorebookEntries();
  const catalog = buildLoreCatalog(hostLore);
  const selected = await readSelected(cid);
  return {
    ok: true,
    character_id: cid,
    selected,
    catalog,
    count_selected: selected.length,
    count_catalog: catalog.length,
  };
}

export async function setLorefilterSelected(args: {
  character_id?: string;
  selected?: unknown;
} = {}): Promise<ApiResult> {
  const cid = cleanText(args.character_id || '', 200);
  if (!cid) return { ok: false, error: { code: 'bad_request', message: 'character_id required' } };
  const selected = await writeSelected(cid, normalizeLorefilterSelected(args.selected));
  return { ok: true, character_id: cid, selected, count_selected: selected.length };
}

export async function rescanLorefilter(args: {
  character_id?: string;
  lorebook?: LoreEntry[] | null;
} = {}): Promise<ApiResult> {
  const cid = cleanText(args.character_id || '', 200);
  if (!cid) return { ok: false, error: { code: 'bad_request', message: 'character_id required' } };
  const hostLore = Array.isArray(args.lorebook) && args.lorebook.length
    ? args.lorebook
    : await fetchHostLorebookEntries();
  const selected = await ensureLorefilter(cid, hostLore, { force: true });
  const catalog = buildLoreCatalog(hostLore);
  return {
    ok: true,
    character_id: cid,
    selected,
    catalog,
    count_selected: selected.length,
    count_catalog: catalog.length,
    rescanned: true,
  };
}

/** For UI helpers without importing the service graph. */
export {
  loreEntryId,
  loreEntryTitle,
  buildLoreCatalog,
  filterLoreEntriesBySelected,
  normalizeLorefilterSelected,
} from '../domain/lore/lorefilter.ts';
