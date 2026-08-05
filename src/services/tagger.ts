/**
 * The tagging request: prose in, a scene/shot plan out.
 *
 * Almost everything below is prompt assembly, and the assembly *is* the
 * behaviour. Block order, the blank lines between blocks and the exact wording
 * were tuned against real model output, so the concatenations are reproduced
 * character-for-character and must not be reflowed or "tidied". Two constraints
 * are worth knowing before touching them:
 *
 *  - The lorebook injection wraps the `lb-xnai.lb.extra` pack in explicit
 *    START/END markers. Without them models treat the ordinary matched lore that
 *    follows as image-tag ground truth and copy lore prose into appearance tags.
 *  - The `y_percent` instruction is emitted unconditionally even when the
 *    display toggle is off, because the value is persisted either way; the
 *    toggle only chooses between equal bands and the model's percentages.
 */

import { dbg } from '../core/debug';
import type { CharacterRecord, JobRequest, TaggedShot, TaggerResult } from '../core/types';
import { deepMerge } from '../core/util/object';
import { cleanText, stripCbs } from '../core/util/text';
import { normalizeNaturalBaseMode, type NaturalBaseMode } from '../config/schema';
import { characterTriggers, dedupeShotCharacters, matchCharactersInText } from '../domain/character/roster';
import { characterHasAppearance, characterMaxLimit } from '../domain/character/tags';
import {
  assembleLorebookForTagger,
  filledNamesForLoreExtra,
  normalizeLoreExtraMode,
} from '../domain/lore/assemble';
import { isCharacterImageExtraLore } from '../domain/lore/extra';
import type { LlmMessage } from '../providers/llm/transform';
import { rosterForSession } from './characters';
import { getConfig } from './context';
import { curationTaggerSystemMessage } from './curation';
import { getPrompt } from './settings';

/** The job request, as the tagger reads it. */
export type TaggerArgs = JobRequest;

/**
 * Chat user payload from tagger messages (byte-identical for pass-2 cache).
 * Skips Author's Note follow-up user turns.
 */
export function extractTaggerChatContext(messages: readonly LlmMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const row = messages[i];
    if (!row || row.role !== 'user') continue;
    const content = typeof row.content === 'string' ? row.content : '';
    if (!content.trim()) continue;
    if (content.startsWith('# Priority: Author')) continue;
    return content;
  }
  return '';
}

/** Builds the full system/user message list for one tagging call. */
export async function buildTaggerMessages(request: TaggerArgs): Promise<LlmMessage[]> {
  const card = deepMerge(getConfig().card, (request.card as Record<string, unknown>) || {});
  const sessionId = cleanText(request.session_id, 200);
  const tagger = stripCbs(await getPrompt('tagger'));
  const fmt = stripCbs(await getPrompt('format'));
  const messages: LlmMessage[] = [{ role: 'system', content: `${tagger}\n\n${fmt}`.trim() }];

  if (card.char_info && cleanText(request.character_description)) {
    messages.push({
      role: 'system',
      content: `${await getPrompt('char_inject')}\n## {{char}} Info\n${cleanText(request.character_description, 12000)}`,
    });
  }
  if (card.user_info && cleanText(request.persona_description)) {
    messages.push({
      role: 'system',
      content: `${await getPrompt('char_inject')}\n## {{user}} Info\n${cleanText(request.persona_description, 8000)}`,
    });
  }

  const assistant = cleanText(request.assistant_text, 20000);
  const sourceSessionIds = Array.isArray(request.source_session_ids)
    ? request.source_session_ids.map((s) => cleanText(s, 200)).filter(Boolean)
    : [];
  const rosterEarly: CharacterRecord[] = card.lorebook || card.char_appearance !== false
    ? await rosterForSession(
      sessionId,
      cleanText(request.unified_session_id || '', 200),
      cleanText(request.character_id || '', 200),
      sourceSessionIds,
    )
    : [];
  const filledNames = filledNamesForLoreExtra(rosterEarly);

  if (card.lorebook) {
    const triggerKeys = Array.isArray(request.lore_trigger_keys) ? request.lore_trigger_keys : null;
    const loreExtraMode = normalizeLoreExtraMode(card.lore_extra);
    const filtered = assembleLorebookForTagger(
      request.lorebook || [],
      assistant,
      filledNames,
      5,
      1200,
      triggerKeys,
      loreExtraMode,
    );
    const extraBlocks: string[] = [];
    const refBlocks: string[] = [];
    for (const entry of filtered) {
      const isExtra = isCharacterImageExtraLore(entry) || entry.always;
      const content = cleanText(entry.content || '', isExtra ? 50000 : 1200);
      if (!content) continue;
      const comment = cleanText(entry.comment || '', 200);
      const block = comment ? `### ${comment}\n${content}` : content;
      if (isExtra) extraBlocks.push(block);
      else refBlocks.push(block);
    }
    const loreParts: string[] = [];
    if (extraBlocks.length) {
      loreParts.push(
        '## lb-xnai.lb.extra — OFFICIAL PACK (START)\n'
        + 'Until END: lb-xnai pack only (custom prompt + Character Image Tags). '
        + '`### Name` headings here are pack sections, not separate lore.\n\n'
        + extraBlocks.join('\n\n')
        + '\n\n## lb-xnai.lb.extra — OFFICIAL PACK (END)\n'
        + '[END OF lb-xnai.lb.extra] Pack finished — text below is not lb-xnai ground truth.',
      );
    }
    if (refBlocks.length) {
      loreParts.push(
        '## Reference Lorebook (trigger-matched only)\n'
        + 'Naming/context only. Not lb-xnai. Do not copy lore prose into tags.\n\n'
        + refBlocks.join('\n\n'),
      );
    }
    dbg('job.lore.extra', {
      trigger_keys: Array.isArray(triggerKeys) ? triggerKeys.length : 0,
      injected: extraBlocks.length,
      reference: refBlocks.length,
      sections: filtered
        .filter((e) => isCharacterImageExtraLore(e) || e.always)
        .map((e) => e.key || '')
        .filter(Boolean)
        .join(' | '),
    });
    if (loreParts.length) {
      messages.push({ role: 'system', content: `${await getPrompt('lore_inject')}\n${loreParts.join('\n\n')}` });
    }
  }

  if (card.char_appearance !== false) {
    const roster = rosterEarly;
    const filled = roster.filter((c) => characterHasAppearance(c));
    const incomplete = roster.filter((c) => cleanText(c.name, 200) && !characterHasAppearance(c));
    const matched = matchCharactersInText(assistant, roster);
    if (filled.length || incomplete.length || matched.length) {
      const formatFilledLine = (c: CharacterRecord): string => {
        const name = cleanText(c.name, 200);
        const appearance = cleanText(c.appearance || '', 200);
        const attire = cleanText(c.attire || '', 160);
        const accessories = cleanText(c.accessories || '', 120);
        const parts = [
          appearance ? `appearance=${appearance}` : '',
          attire ? `attire=${attire}` : '',
          accessories ? `accessories=${accessories}` : '',
        ].filter(Boolean);
        return parts.length ? `${name} ← ${parts.join(' | ')}` : name;
      };
      // Looks only for characters actually hit in this message — not the whole roster.
      const matchedFilled = matched.filter((c) => characterHasAppearance(c));
      const matchedIncomplete = matched.filter((c) => !characterHasAppearance(c));
      const detectedBlock = matchedFilled.length
        ? matchedFilled.map(formatFilledLine).filter(Boolean).join('\n')
        : '(none)';
      const incompleteBlock = matchedIncomplete.length
        ? matchedIncomplete
          .map((char) => `- ${char.name} (aliases: ${characterTriggers(char).slice(0, 8).join(', ')}) → empty appearance; full looks required in new_characters`)
          .join('\n')
        : '(none)';
      let content = await getPrompt('appearance_inject');
      // Legacy templates still had {registered_block}; keep replace so custom prompts do not leak the placeholder.
      if (content.includes('{registered_block}')) {
        content = content.replace('{registered_block}', detectedBlock);
      }
      content = content.includes('{incomplete_block}') ? content.replace('{incomplete_block}', incompleteBlock) : `${content}\n\n## Incomplete\n${incompleteBlock}`;
      content = content.includes('{detected_block}') ? content.replace('{detected_block}', detectedBlock) : `${content}\n\n${detectedBlock}`;
      messages.push({ role: 'system', content });
      dbg('job.roster.split', {
        filled: filled.map((c) => c.name),
        incomplete: incomplete.map((c) => c.name),
        matched: matched.map((c) => c.name),
        matched_with_looks: matchedFilled.map((c) => c.name),
        session_id: sessionId,
      });
    }
  }

  const naturalMode = normalizeNaturalBaseMode(card.natural_base);
  const charMax = characterMaxLimit(card);
  // One system block: placement + natural mode + cast cap (was three near-duplicate messages).
  messages.push({
    role: 'system',
    content: [
      // Always ask for y_percent so values are saved. Toggle only affects display (equal bands vs LLM %).
      'Every shot MUST include `y_percent` (0–100): reading position top→bottom. Spread across the full range in order (shot0 < shot1 < …); ~even gaps. E.g. 2→~25/~75; 3→~20/~50/~80; 4→~15/~40/~65/~90. Forbidden: all under 40, duplicates, or gaps under ~15 unless 1 shot.',
      naturalBaseSystemMessage(naturalMode),
      `CHARACTER CAP: at most ${charMax} characters per shot (char1..char${charMax}). If more are visible, keep the ${charMax} most important; fold extras into situation/place.`,
    ].join('\n'),
  });

  const curationMsg = await curationTaggerSystemMessage();
  if (curationMsg) {
    messages.push({
      role: 'system',
      content: curationMsg,
    });
  }

  const chunks: string[] = [];
  const includeMax = Number(card.include_max || 0);
  if (includeMax > 0) {
    for (const msg of request.recent_messages || []) {
      const role = cleanText(msg?.role, 40) || 'char';
      const body = cleanText(msg?.content || (msg as Record<string, unknown> | undefined)?.data, 12000);
      if (!body) continue;
      if (assistant && body === assistant && ['char', 'assistant', 'bot'].includes(role.toLowerCase())) continue;
      chunks.push(`[${role}]\n${body}`);
    }
  }
  if (assistant) chunks.push(assistant);
  const userContent = chunks.length ? chunks.join('\n\n') : assistant;
  if (!userContent) throw new Error('태깅할 메시지 텍스트가 없습니다.');
  messages.push({ role: 'user', content: userContent });

  // User author's note — empty by default; when set, highest-priority override (like module CustomInst).
  const authorNote = cleanText(await getPrompt('author_note'), 8000);
  if (authorNote) {
    messages.push({
      role: 'user',
      content:
        `# Priority: Author's Note\n${authorNote}\n`
        + '> These are instructions explicitly given by the user. If in conflict with previous instructions, this section MUST take precedence.',
    });
  }
  return messages;
}

/** Flattens the tagger's `scenes[].shots[]` reply into a flat shot list. */
export function flattenShots(tagged: unknown): TaggedShot[] {
  const charMax = characterMaxLimit(getConfig().card);
  const result = tagged as TaggerResult;
  const shots: TaggedShot[] = [];
  for (const scene of result.scenes || []) {
    const place = cleanText(scene.place);
    for (const shot of scene.shots || []) {
      // Roster is not available yet, so this dedupe is name-only;
      // buildGenerationForShot runs it again once the roster is merged.
      const item: TaggedShot = {
        ...shot,
        place,
        characters: dedupeShotCharacters(shot.characters || [], [], charMax).slice(0, charMax),
      };
      shots.push(item);
    }
  }
  return shots;
}

function naturalBaseSystemMessage(mode: NaturalBaseMode): string {
  if (mode === 'off') {
    return 'Natural base mode OFF. Omit the `natural` field (or leave it empty). Do not invent natural-language base phrases.';
  }
  if (mode === 'detailed') {
    return [
      'Natural base mode DETAILED. Every shot MUST include `natural`: a compact English phrase for NovelAI base caption only (NOT Danbooru comma tags, NOT characters[].action).',
      'Include framing/vantage when useful (side view, close-up, viewed through, reflected in…), then for each visible person in left-to-right (or front-to-back) order: hair color + age band + gender, facial expression, clothing, and pose/action as separate details.',
      'Multi-person: NEVER use character names — use position (left girl, right boy) or hair. Add shared action and lighting/atmosphere briefly.',
      'Telegraphic and objective. Example: `side view upper body, left red hair adult woman tense smile in coat pulling right blue hair teen boy startled arms pinned, warm cafe light`. Keep ~12–28 words, English only.',
    ].join(' ');
  }
  if (mode === 'supplement') {
    return [
      'Natural base mode SUPPLEMENT. Every shot MUST include `natural`: telegraphic English sentences describing what tags cannot express (composition, framing, actions, atmosphere, lighting) for NovelAI base caption only (NOT Danbooru comma tags, NOT characters[].action).',
      'Keep tags and natural language clearly separated. Multi-person: NEVER use names — identify by position (left girl, bottom boy) or appearance. For each person include facial expression and clothing as distinct details; also hair and pose unless already obvious.',
      'Unusual framing welcome (viewed through, reflected in shards of a broken mirror, behind…). Concise, minimal, objective — no subjective interpretation.',
      'Example: `Side view, upper body. Left: adult woman with red hair, tense smile, coat, pulling. Right: teen boy with blue hair, startled face, arms pinned. Warm cafe lighting.` Prefer ~2–5 short sentences, English only.',
    ].join(' ');
  }
  // short (default)
  return [
    'Natural base mode SHORT. Every shot MUST include `natural`: a short English natural-language phrase for NovelAI base caption only (NOT Danbooru comma tags, NOT characters[].action).',
    'Include hair color + age band + gender for each visible person, plus the shared action. Example: `red hair adult woman forced hug blue hair boy`. Keep ~6–20 words, English only.',
  ].join(' ');
}
