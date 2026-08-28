/**
 * Second LLM: comic pages for shots the first tagger marked kind=comic.
 */
import type { CharacterRecord, TaggedShot } from '../core/types.ts';
import { cleanText } from '../core/util/text.ts';
import { parseJsonLoose } from '../core/util/object.ts';
import { resolveLlmRole } from '../domain/llm/roles.ts';
import { resolveCharacter } from '../domain/character/roster.ts';
import { ensureCostumes } from '../domain/character/costume.ts';
import { formatComicCostumeCatalog } from '../domain/comic/costume.ts';
import { comicLineRange } from '../domain/comic/kind.ts';
import { normalizeComicLlmBatch } from '../domain/comic/params.ts';
import { assignComicPagesToShots, parseComicPages, type ComicPage } from '../domain/comic/page.ts';
import { splitTaggerMessageLines } from '../domain/tagging/shot-line.ts';
import { callLlm } from '../providers/llm/client.ts';
import { getConfig } from './context.ts';
import { getPrompt } from './settings.ts';

function sliceLines(text: unknown, start: unknown, end: unknown): string {
  const lines = splitTaggerMessageLines(text);
  const [a, b] = comicLineRange(start, end, lines.length);
  return lines.slice(a - 1, b).map((line, i) => `L${a + i}|${line}`).join('\n');
}

function rosterBlock(
  names: string[],
  roster: CharacterRecord[],
): string {
  const blocks: string[] = [];
  const seen = new Set<string>();
  for (const raw of names) {
    const name = cleanText(raw, 200);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    const rec = resolveCharacter(name, roster);
    const looks = cleanText(rec?.appearance || rec?.original || '', 800);
    const catalog = formatComicCostumeCatalog(rec || {});
    const { costumes, active_costume } = ensureCostumes(rec || {});
    const active = costumes[active_costume]?.name || 'default';
    blocks.push(
      `## ${name}\nlooks: ${looks || '(none)'}\nactive_costume: ${active}\ncostumes (reference only):\n${catalog || '(none)'}`,
    );
  }
  return blocks.join('\n\n');
}

async function callComicLlm(user: string, extraNote: string): Promise<ComicPage[]> {
  const sys = (await getPrompt('comic')).trim();
  const note = cleanText(extraNote, 8000);
  const messages = [
    { role: 'system' as const, content: sys },
    ...(note
      ? [{
        role: 'system' as const,
        content: `# Priority: Comic author's note\n${note}\nIf this conflicts with earlier rules, follow this note (except never emit comic/manga/hatching/thick outlines).`,
      }]
      : []),
    { role: 'user' as const, content: user },
  ];
  const raw = await callLlm(resolveLlmRole(getConfig(), 'main'), messages);
  return parseComicPages(parseJsonLoose(raw));
}

export async function fillComicPagesForShots(args: {
  shots: TaggedShot[];
  roster: CharacterRecord[];
  assistantText: unknown;
}): Promise<Set<number>> {
  const { shots, roster, assistantText } = args;
  const card = getConfig().card || {};
  const note = cleanText(card.comic_author_note, 8000);
  const batch = normalizeComicLlmBatch(card.comic_llm_batch);
  const comicIdx: number[] = [];
  for (let i = 0; i < shots.length; i += 1) {
    if (String(shots[i]?.kind || '').toLowerCase() === 'comic') comicIdx.push(i);
  }
  if (!comicIdx.length) return new Set();

  const packOne = (i: number): string => {
    const shot = shots[i]!;
    const names = (shot.characters || []).map((c) => cleanText(c.name, 200)).filter(Boolean);
    const prose = sliceLines(assistantText, shot.line, shot.comic_line_end);
    return [
      `shot_index: ${i}`,
      `line: ${shot.line ?? ''}–${shot.comic_line_end ?? shot.line ?? ''}`,
      `cast: ${names.join(', ') || '(none)'}`,
      rosterBlock(names, roster),
      `## prose\n${prose || '(empty)'}`,
    ].join('\n');
  };

  let pages: ComicPage[] = [];
  if (batch === 'per_shot') {
    for (const i of comicIdx) {
      try {
        const got = await callComicLlm(packOne(i), note);
        if (got[0]) got[0]!.shot_index = i;
        pages.push(...got);
      } catch {
        /* this comic shot stays unassigned → skipped */
      }
    }
  } else {
    const body = comicIdx.map((i) => packOne(i)).join('\n\n----\n\n');
    pages = await callComicLlm(
      `Produce one page per comic shot below, in order.\n\n${body}`,
      note,
    );
  }
  return assignComicPagesToShots(shots, pages);
}
