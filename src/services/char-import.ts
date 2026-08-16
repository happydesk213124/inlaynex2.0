/**
 * Manual roster fill from personas / character-lore / CharInfo.
 * One HTTP; classify then batch looks LLM (meta 8 / vision 4 / text ~60k).
 */
import { dbg } from '../core/debug';
import { hostHas, risuHost } from '../core/host';
import { GLOBAL_SCOPE } from '../core/constants';
import type { ApiResult } from '../core/types';
import { asU8, bytesToBase64Async } from '../core/util/bytes';
import { parseJsonLoose } from '../core/util/object';
import { cleanText, stripCbs } from '../core/util/text';
import { characterHasAppearance } from '../domain/character/tags';
import { resolveLlmRole } from '../domain/llm/roles';
import {
  formatAssetTagsInjectBlock,
  tagsFromImageBytes,
  type PackedAssetTags,
} from '../domain/nai-meta/index';
import { compactAssetKey, originalTagFromPlains } from '../domain/nai-meta/match';
import { prepareAutotagImage } from '../core/util/image';
import type { LlmContentPart, LlmMessage } from '../providers/llm/transform';
import { callLlm } from '../providers/llm/client';
import { getConfig } from './context';
import { listCharacters, upsertCharacter } from './characters';
import { getLorefilterPayload } from './lorefilter';
import { getPrompt } from './settings';

const META_PER = 8;
const VISION_PER = 4;
const TEXT_TOKEN_BUDGET = 60_000;
const PARALLEL_MAX = 10;

export type ImportKind = 'persona' | 'lore' | 'charinfo';

interface ImportPick {
  kind: ImportKind;
  id: string;
}

interface ResolvedRow {
  pick: ImportPick;
  name: string;
  aliases: string[];
  text: string;
  bytes: Uint8Array | null;
  plains: string[];
  originalHint: string;
}

function estimateTokens(s: string): number {
  return Math.max(1, Math.ceil(s.length / 2));
}

async function readHostImage(path: string): Promise<Uint8Array | null> {
  const host = risuHost();
  if (!host || typeof host.readImage !== 'function' || !path) return null;
  try {
    const data = await host.readImage(path);
    if (!data) return null;
    if (data instanceof ArrayBuffer) return asU8(data);
    if (data instanceof Uint8Array) return data;
    if (typeof Blob !== 'undefined' && data instanceof Blob) return asU8(await data.arrayBuffer());
    if (typeof data === 'string') {
      const m = data.match(/^data:[^;]+;base64,(.+)$/i);
      const b64 = m ? m[1] : data.replace(/\s+/g, '');
      try {
        const bin = atob(b64);
        const u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i);
        return u8;
      } catch {
        return null;
      }
    }
  } catch (err) {
    dbg('char-import.read.fail', { message: String((err as Error)?.message || err) }, 'warn');
  }
  return null;
}

async function mapPool<T>(
  items: T[],
  parallel: boolean,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const n = parallel ? Math.min(PARALLEL_MAX, Math.max(1, items.length)) : 1;
  let i = 0;
  const worker = async (): Promise<void> => {
    while (i < items.length) {
      const idx = i;
      i += 1;
      await fn(items[idx]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) || 1 }, () => worker()));
}

function packedFromRows(rows: ResolvedRow[]): PackedAssetTags {
  return {
    weightMap: new Map(),
    groups: rows.map((r) => ({
      trigger: compactAssetKey(r.name, 200) || r.name,
      lore_keys: [r.name, ...r.aliases].filter(Boolean),
      common: r.plains,
      assets: [{ name: r.name, unique: [] }],
    })),
  };
}

async function looksSystem(): Promise<string> {
  const looks = stripCbs(await getPrompt('char_looks')).trim();
  const how = stripCbs(await getPrompt('asset_tags_inject')).replace(/\{asset_tags_block\}/g, '').trim();
  return [looks, how].filter(Boolean).join('\n\n');
}

async function callLooks(messages: LlmMessage[]): Promise<Record<string, unknown>[]> {
  const raw = await callLlm(resolveLlmRole(getConfig(), 'asset_char'), messages);
  const parsed = parseJsonLoose(raw) as { new_characters?: unknown };
  const list = Array.isArray(parsed?.new_characters) ? parsed.new_characters : [];
  return list.filter((x) => x && typeof x === 'object') as Record<string, unknown>[];
}

async function saveLooks(
  scope: string,
  chars: Record<string, unknown>[],
  hints: Record<string, string>,
): Promise<number> {
  let n = 0;
  const existing = await listCharacters(scope);
  for (const raw of chars) {
    const name = cleanText(raw.name, 200);
    if (!name) continue;
    const hit = existing.find((c) => cleanText(c.name, 200) === name);
    if (hit && characterHasAppearance(hit)) continue;
    const ck = compactAssetKey(name, 200);
    const original = cleanText(raw.original, 200) || (ck ? hints[ck] : '') || '';
    const rec = await upsertCharacter(scope, {
      ...raw,
      name,
      original,
      appearance: raw.appearance,
      attire: raw.attire,
      accessories: raw.accessories,
      aliases: raw.aliases,
      surname: raw.surname,
      given_name: raw.given_name,
      gender: raw.gender,
    });
    if (rec) n += 1;
  }
  return n;
}

async function runMetaBatch(scope: string, rows: ResolvedRow[]): Promise<{ filled: number; failed: string[] }> {
  const failed: string[] = [];
  try {
    const sys = await looksSystem();
    const block = formatAssetTagsInjectBlock(packedFromRows(rows));
    const names = rows.map((r) => `- ${r.name}`).join('\n');
    const chars = await callLooks([
      { role: 'system', content: sys },
      {
        role: 'user',
        content:
          `# Reference: NovelAI asset tags\n${block}\n\n`
          + `## Incomplete\n${names}\n\n`
          + 'Fill `new_characters` for these names. COPY tags verbatim. JSON only.',
      },
    ]);
    const hints: Record<string, string> = {};
    for (const r of rows) {
      const ck = compactAssetKey(r.name, 200);
      if (ck && r.originalHint) hints[ck] = r.originalHint;
    }
    const filled = await saveLooks(scope, chars, hints);
    return { filled, failed };
  } catch (err) {
    dbg('char-import.meta.fail', { message: String((err as Error)?.message || err) }, 'warn');
    return { filled: 0, failed: rows.map((r) => r.name) };
  }
}

async function runVisionBatch(scope: string, rows: ResolvedRow[]): Promise<{ filled: number; failed: ResolvedRow[] }> {
  try {
    const sys = await looksSystem();
    const parts: LlmContentPart[] = [{
      type: 'text',
      text:
        'Fill `new_characters` from these images + names. COPY visual tags. JSON only.\n'
        + rows.map((r) => `- ${r.name}${r.text ? `: ${cleanText(r.text, 800)}` : ''}`).join('\n'),
    }];
    for (const r of rows) {
      if (!r.bytes?.length) continue;
      const prepared = await prepareAutotagImage(r.bytes);
      const b64 = await bytesToBase64Async(prepared.bytes);
      parts.push({ type: 'text', text: `Image name: ${r.name}` });
      parts.push({ type: 'image_url', image_url: { url: `data:${prepared.mime || 'image/png'};base64,${b64}` } });
    }
    const chars = await callLooks([
      { role: 'system', content: sys },
      { role: 'user', content: parts },
    ]);
    const filled = await saveLooks(scope, chars, {});
    return { filled, failed: [] };
  } catch (err) {
    dbg('char-import.vision.fail', { message: String((err as Error)?.message || err) }, 'warn');
    return { filled: 0, failed: rows };
  }
}

async function runTextBatch(scope: string, rows: ResolvedRow[]): Promise<{ filled: number; failed: string[] }> {
  try {
    const sys = await looksSystem();
    const body = rows.map((r) => `### ${r.name}\n${r.text || '(no description)'}`).join('\n\n');
    const chars = await callLooks([
      { role: 'system', content: sys },
      {
        role: 'user',
        content:
          '# Reference: descriptions\n' + body + '\n\nFill `new_characters` for each heading. JSON only.',
      },
    ]);
    const filled = await saveLooks(scope, chars, {});
    return { filled, failed: [] };
  } catch (err) {
    dbg('char-import.text.fail', { message: String((err as Error)?.message || err) }, 'warn');
    return { filled: 0, failed: rows.map((r) => r.name) };
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function chunkText(rows: ResolvedRow[]): ResolvedRow[][] {
  const out: ResolvedRow[][] = [];
  let cur: ResolvedRow[] = [];
  let tokens = 0;
  for (const r of rows) {
    const t = estimateTokens(r.text || r.name);
    if (cur.length && tokens + t > TEXT_TOKEN_BUDGET) {
      out.push(cur);
      cur = [];
      tokens = 0;
    }
    cur.push(r);
    tokens += t;
  }
  if (cur.length) out.push(cur);
  return out;
}

async function personasFromHost(): Promise<Array<Record<string, unknown>>> {
  if (!hostHas('getDatabase')) return [];
  try {
    const db = await risuHost()!.getDatabase!(['personas']);
    const list = db && Array.isArray((db as { personas?: unknown }).personas)
      ? (db as { personas: unknown[] }).personas
      : [];
    return list.filter((p) => p && typeof p === 'object') as Array<Record<string, unknown>>;
  } catch {
    return [];
  }
}

async function currentCharacter(): Promise<Record<string, unknown> | null> {
  if (!hostHas('getCharacter')) return null;
  try {
    const c = await risuHost()!.getCharacter!();
    return c && typeof c === 'object' ? (c as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function listImportPicker(kind: string, characterId: string): Promise<ApiResult> {
  const mode = cleanText(kind, 40).toLowerCase() || 'session';
  if (mode === 'persona') {
    const personas = await personasFromHost();
    const items = personas.map((p, i) => {
      const id = cleanText(p.id, 80) || `p:${i}`;
      return {
        kind: 'persona' as const,
        id,
        name: cleanText(p.name, 200) || `persona ${i + 1}`,
        preview: cleanText(p.note || p.personaPrompt, 240),
        badge: '페소',
        has_image: Boolean(cleanText(p.icon, 400)),
      };
    });
    return { ok: true, kind: 'persona', items, lore_empty: false };
  }
  const cid = cleanText(characterId, 200);
  const lfRaw = cid ? await getLorefilterPayload({ character_id: cid }) : {};
  const lf = lfRaw as Record<string, unknown>;
  const selected = Array.isArray(lf.selected) ? lf.selected as string[] : [];
  const catalog = Array.isArray(lf.catalog) ? lf.catalog as Array<{ id: string; title: string; content?: string; keys?: string[] }> : [];
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const loreItems = selected.map((id) => {
    const row = byId.get(id);
    return {
      kind: 'lore' as const,
      id,
      name: cleanText(row?.title, 200) || id,
      preview: cleanText(row?.content, 240),
      badge: '캐릭로어',
      has_image: false,
    };
  });
  const ch = await currentCharacter();
  const desc = cleanText(ch?.description || ch?.desc, 12000);
  const charName = cleanText(ch?.name, 200) || 'CharInfo';
  const charinfo = {
    kind: 'charinfo' as const,
    id: 'charinfo',
    name: charName,
    preview: desc.slice(0, 240),
    badge: 'CharInfo',
    has_image: Boolean(cleanText(ch?.image, 400)),
  };
  return {
    ok: true,
    kind: 'session',
    items: [charinfo, ...loreItems],
    lore_empty: !loreItems.length,
  };
}

async function resolvePicks(picks: ImportPick[], characterId: string): Promise<ResolvedRow[]> {
  const personas = await personasFromHost();
  const ch = await currentCharacter();
  const cid = cleanText(characterId, 200) || cleanText(String(ch?.chaId || ch?.chid || ''), 200);
  const lfRaw = cid ? await getLorefilterPayload({ character_id: cid }) : null;
  const lf = (lfRaw || {}) as Record<string, unknown>;
  const catalog = Array.isArray(lf.catalog)
    ? (lf.catalog as Array<{ id: string; title: string; content?: string; keys?: string[] }>)
    : [];
  const byLore = new Map(catalog.map((c) => [c.id, c]));
  const out: ResolvedRow[] = [];
  for (const pick of picks) {
    if (pick.kind === 'persona') {
      const idx = personas.findIndex((p, i) => (cleanText(p.id, 80) || `p:${i}`) === pick.id);
      const p = idx >= 0 ? personas[idx]! : null;
      if (!p) continue;
      const name = cleanText(p.name, 200) || pick.id;
      const text = cleanText(p.personaPrompt || p.note, 12000);
      const bytes = await readHostImage(cleanText(p.icon, 400));
      let plains: string[] = [];
      let originalHint = '';
      if (bytes?.length) {
        const tags = await tagsFromImageBytes(bytes);
        plains = tags?.plains || [];
        originalHint = originalTagFromPlains(plains, name);
      }
      out.push({ pick, name, aliases: [], text, bytes, plains, originalHint });
      continue;
    }
    if (pick.kind === 'charinfo') {
      const name = cleanText(ch?.name, 200) || 'character';
      const text = cleanText(ch?.description || ch?.desc, 12000);
      const bytes = await readHostImage(cleanText(ch?.image, 400));
      let plains: string[] = [];
      let originalHint = '';
      if (bytes?.length) {
        const tags = await tagsFromImageBytes(bytes);
        plains = tags?.plains || [];
        originalHint = originalTagFromPlains(plains, name);
      }
      out.push({ pick, name, aliases: [], text, bytes, plains, originalHint });
      continue;
    }
    const row = byLore.get(pick.id);
    if (!row) continue;
    const name = cleanText(row.title, 200) || pick.id;
    const text = cleanText(row.content, 12000);
    const aliases = Array.isArray(row.keys) ? row.keys.map((k) => cleanText(k, 200)).filter(Boolean) : [];
    out.push({
      pick,
      name,
      aliases,
      text,
      bytes: null,
      plains: [],
      originalHint: '',
    });
  }
  return out;
}

export async function runImportFill(body: Record<string, unknown>): Promise<ApiResult> {
  const scope = cleanText(body.scope || body.session_id, 200)
    || (cleanText(body.kind, 40) === 'persona' ? GLOBAL_SCOPE : '');
  const sessionId = cleanText(body.session_id, 200);
  const writeScope = cleanText(body.scope, 200) === GLOBAL_SCOPE || body.global === true
    ? GLOBAL_SCOPE
    : (sessionId || scope || GLOBAL_SCOPE);
  const parallel = body.parallel === true || body.parallel === 'true';
  const rawPicks = Array.isArray(body.picks) ? body.picks : [];
  const picks: ImportPick[] = rawPicks
    .map((p) => {
      if (!p || typeof p !== 'object') return null;
      const rec = p as Record<string, unknown>;
      const kind = cleanText(rec.kind, 20) as ImportKind;
      const id = cleanText(rec.id, 200);
      if (!id || (kind !== 'persona' && kind !== 'lore' && kind !== 'charinfo')) return null;
      return { kind, id };
    })
    .filter((x): x is ImportPick => Boolean(x));
  if (!picks.length) return { ok: false, error: { code: 'bad_request', message: 'picks required' } };

  const characterId = cleanText(body.character_id || body.characterId, 200);
  const resolved = await resolvePicks(picks, characterId);
  const roster = await listCharacters(writeScope);
  const skip = new Set(
    roster.filter((c) => characterHasAppearance(c)).map((c) => cleanText(c.name, 200)),
  );
  const work = resolved.filter((r) => r.name && !skip.has(r.name));
  const meta = work.filter((r) => r.plains.length);
  const vision = work.filter((r) => !r.plains.length && r.bytes?.length);
  const text = work.filter((r) => !r.plains.length && !r.bytes?.length);

  let filled = 0;
  const failed: string[] = [];
  let visionToText = 0;

  const metaChunks = chunk(meta, META_PER);
  await mapPool(metaChunks, parallel, async (rows) => {
    const r = await runMetaBatch(writeScope, rows);
    filled += r.filled;
    failed.push(...r.failed);
  });

  const visFail: ResolvedRow[] = [];
  const visChunks = chunk(vision, VISION_PER);
  await mapPool(visChunks, parallel, async (rows) => {
    const r = await runVisionBatch(writeScope, rows);
    filled += r.filled;
    visFail.push(...r.failed);
  });
  visionToText = visFail.length;

  const textRows = [...text, ...visFail];
  const textChunks = chunkText(textRows);
  await mapPool(textChunks, parallel, async (rows) => {
    const r = await runTextBatch(writeScope, rows);
    filled += r.filled;
    failed.push(...r.failed);
  });

  dbg('char-import.done', {
    scope: writeScope,
    picks: picks.length,
    filled,
    failed: failed.length,
    vision_to_text: visionToText,
    parallel,
  });
  return {
    ok: true,
    filled,
    failed,
    skipped: resolved.length - work.length,
    vision_to_text: visionToText,
    message: visionToText
      ? `비전 실패 → 설명으로 ${visionToText}명`
      : '',
  };
}


