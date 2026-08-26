/**
 * Edits to a single already-generated card.
 *
 * Two things here are easy to get wrong.
 *
 * **A reroll does not replay the stored prompt verbatim.** It re-runs prompt
 * assembly against the *current* roster and the *current* style preset, so a
 * card regenerated after the user swapped the active preset (or fixed a
 * character's appearance) picks those up. Scene tags stay pinned via
 * `meta.setup` when that field is still scene-only; hand-edited cards that
 * mirrored the full `main_prompt` into `meta.setup` keep the edited main and
 * only rebuild per-character captions. Explicit overrides always win.
 *
 * **A reroll allocates a new card id** and deletes the old row, so callers must
 * follow `replaced` rather than assume the id survived. The image location
 * (message index, content hash, y position) is carried across unchanged — that
 * is what keeps the new image anchored to the same message.
 *
 * `rerollMessageCards` holds `messageBusyKeys` for the whole batch instead of
 * taking a job epoch: it is a single-shot operation with no shots to supersede,
 * and it only needs to stop a concurrent generation from targeting the same
 * message while it works.
 */

import type { ApiResult, CardRow, ShotCharacter, TaggedShot } from '../core/types';
import {
  ASSISTANT_PREVIEW_LIMIT,
  cleanText,
  splitTagTokens,
  stripCbs,
  toInt,
  toOptionalFloat,
  unifiedSessionIdForCharacter,
  uuid,
} from '../core/util/text';
import { characterMaxLimit, normalizeCharacterCaptionTags, stripPersonCountTags } from '../domain/character/tags';
import {
  collectStylePositives,
  resolveRerollLockedSetup,
} from '../domain/prompt/reroll-setup';
import {
  commandRewriteHasDeltas,
  mergeCommandRewriteCharacters,
  mergeCommandRewriteDeltas,
  mergeCommandRewriteMain,
} from '../domain/prompt/command-rewrite';
import { QUALITY_TAGS } from '../config/defaults';
import { dbg } from '../core/debug';
import { parseJsonLoose } from '../core/util/object';
import { attachImageUrls, publishImage, resolveImageUrl } from '../storage/image-urls';
import { idbGet, idbGetAll, idbPut } from '../storage/stores';
import { callLlm } from '../providers/llm/client';
import type { LlmMessage } from '../providers/llm/transform';
import { rosterForSession } from './characters';
import { getConfig, messageBusyKeys, clearMessageRerollStop, isMessageRerollStopRequested } from './context';
import {
  buildGenerationForShot,
  cardMetaFromLocation,
  generateImage,
  locationFieldsForCard,
  readImageLocation,
} from './generation';
import type { NaiCaption } from './generation';
import { deleteCard } from './gallery';
import { busyReplyForRequest, jobKey } from './job-locks';
import { createJob } from './jobs';
import { getPrompt } from './settings';
import { modelToNaia } from '../providers/nai/payload';
import { resolveShotRoute } from '../domain/nai/routing';
import type { ShotNaiRoute } from '../domain/nai/routing';
import { captionWithSpeech, speechCaptionTagsForShot } from '../domain/nai/speech';
import type { SpeechCharacter } from '../domain/nai/speech';

/** Serialised card columns are user data; a malformed one must not fail the request. */
function storedComplexity(meta: Record<string, unknown>): string {
  return cleanText(meta.complexity, 20);
}

function parseJsonOr(raw: unknown, fallback: unknown): unknown {
  try {
    return JSON.parse(raw as string);
  } catch {
    return fallback;
  }
}

export interface RerollOptions {
  /** Set by `rerollMessageCards`, which already holds the message lock. */
  skipBusyCheck?: boolean;
}

export interface RerollMessageArgs {
  /** Straight from the request body, so every field may be any JSON value. */
  session_id?: unknown;
  content_hash?: unknown;
  message_index?: unknown;
}

/**
 * Applies hand-edited tags to a card without regenerating the image.
 */
export async function updateCardTags(cardId: string, body: Record<string, unknown> = {}): Promise<ApiResult> {
  const id = cleanText(cardId, 80);
  const row = await idbGet('cards', id);
  if (!row) return { ok: false, error: { code: 'not_found', message: 'card not found' } };

  const parsedOld = parseJsonOr(row.characters_json || '[]', []);
  const oldChars: unknown[] = Array.isArray(parsedOld) ? parsedOld : [];

  let main = row.main_prompt;
  if ('main_prompt' in body) main = cleanText(body.main_prompt, 8000);
  let neg = row.negative_prompt;
  if ('negative_prompt' in body) neg = cleanText(body.negative_prompt, 8000);

  let chars: unknown[] = oldChars;
  if ('characters' in body) {
    const rawChars = body.characters || [];
    if (!Array.isArray(rawChars)) {
      return { ok: false, error: { code: 'bad_request', message: 'characters must be a list' } };
    }
    chars = [];
    const limit = characterMaxLimit(getConfig().card || {});
    for (let idx = 0; idx < rawChars.slice(0, limit).length; idx++) {
      const entry: unknown = rawChars[idx];
      if (typeof entry !== 'object') continue;
      // `typeof null === 'object'`, so a null element survives the guard and the
      // reads below throw. Preserved from 1.x — the UI never sends one.
      const ch = entry as Record<string, unknown>;
      const prev = (idx < oldChars.length && typeof oldChars[idx] === 'object'
        ? oldChars[idx]
        : {}) as Record<string, unknown>;
      const name = cleanText(ch.name != null ? ch.name : prev.name, 200);
      const prompt = cleanText(ch.prompt != null ? ch.prompt : prev.prompt, 4000);
      if (!name && !prompt) continue;
      const out: Record<string, unknown> = { ...prev, name: name || `char${idx + 1}`, prompt: prompt || 'girl' };
      if ('uc' in ch) out.uc = cleanText(ch.uc, 2000);
      for (const key of ['center_x', 'center_y']) {
        if (key in ch) {
          try {
            out[key] = Number(ch[key]);
          } catch {
            /* Number() only throws on symbols/bigints; 1.x swallowed it */
          }
        }
      }
      chars.push(out);
    }
  }

  row.main_prompt = main;
  row.negative_prompt = neg;
  row.characters_json = JSON.stringify(chars);
  // Mirror into meta so a plain /reroll with no overrides reuses the saved tags
  // instead of falling back to the LLM's original scene.
  try {
    let meta = parseJsonOr(row.meta_json || '{}', {});
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) meta = {};
    const metaRec = meta as Record<string, unknown>;
    metaRec.setup = main;
    metaRec.characters = chars;
    row.meta_json = JSON.stringify(metaRec);
  } catch {
    /* the mirror is best-effort; the card columns are already correct */
  }
  await idbPut('cards', row);

  const loc = await locationFieldsForCard(id, {});
  const card = {
    id,
    main_prompt: main,
    negative_prompt: neg,
    characters: chars,
    paragraph: row.paragraph,
    shot_index: row.shot_index,
    y_percent: loc.y_percent,
    message_index: loc.message_index,
    content_hash: loc.content_hash,
    image_url: resolveImageUrl(id),
  };
  await attachImageUrls(card);
  return { ok: true, card };
}

/**
 * Pin a costume pick onto a card's cast so later rerolls keep that wardrobe
 * without changing roster costumes[0].
 */
export async function stampCardCostume(
  cardId: string,
  characterName: string,
  costume: unknown,
  charIndex: number | null = null,
): Promise<ApiResult> {
  const id = cleanText(cardId, 80);
  const name = cleanText(characterName, 200);
  if (!id || !name) {
    return { ok: false, error: { code: 'bad_request', message: 'card_id and character name required' } };
  }
  const row = await idbGet('cards', id);
  if (!row) return { ok: false, error: { code: 'not_found', message: 'card not found' } };

  const parsed = parseJsonOr(row.characters_json || '[]', []);
  const chars: Record<string, unknown>[] = Array.isArray(parsed)
    ? parsed.map((c) => (c && typeof c === 'object' ? { ...(c as Record<string, unknown>) } : c)).filter(Boolean) as Record<string, unknown>[]
    : [];

  let hit = false;
  const wantIdx = charIndex != null && Number.isFinite(Number(charIndex)) ? Number(charIndex) : -1;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    const chName = cleanText(ch.name, 200);
    if (wantIdx >= 0 ? i !== wantIdx : chName !== name) continue;
    ch.costume = costume;
    if (ch.raw && typeof ch.raw === 'object') {
      ch.raw = { ...(ch.raw as Record<string, unknown>), costume, name: chName || name };
    } else {
      ch.raw = { ...(typeof ch.raw === 'object' && ch.raw ? ch.raw as Record<string, unknown> : {}), name: chName || name, costume };
    }
    hit = true;
    if (wantIdx >= 0) break;
  }
  if (!hit) {
    return { ok: false, error: { code: 'not_found', message: 'character not on card' } };
  }

  row.characters_json = JSON.stringify(chars);
  try {
    let meta = parseJsonOr(row.meta_json || '{}', {});
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) meta = {};
    const metaRec = meta as Record<string, unknown>;
    const metaChars = Array.isArray(metaRec.characters)
      ? (metaRec.characters as unknown[]).map((c) => (c && typeof c === 'object' ? { ...(c as object) } : c))
      : chars;
    for (let i = 0; i < metaChars.length; i++) {
      const ch = metaChars[i];
      if (!ch || typeof ch !== 'object') continue;
      const rec = ch as Record<string, unknown>;
      const chName = cleanText(rec.name, 200);
      if (wantIdx >= 0 ? i !== wantIdx : chName !== name) continue;
      rec.costume = costume;
      if (rec.raw && typeof rec.raw === 'object') {
        rec.raw = { ...(rec.raw as Record<string, unknown>), costume, name: chName || name };
      }
    }
    metaRec.characters = metaChars;
    row.meta_json = JSON.stringify(metaRec);
  } catch {
    /* best-effort meta mirror */
  }
  await idbPut('cards', row);
  return { ok: true, card_id: id, costume };
}

/**
 * Regenerates one card's image, replacing it with a new card at the same place.
 *
 * `mode: "full"` re-runs the entire originating job (tagging included) rather
 * than just the image.
 */
export async function rerollCard(
  cardId: string,
  mode = 'nai',
  overrides: unknown = null,
  opts: RerollOptions = {},
): Promise<ApiResult> {
  const row = await idbGet('cards', cardId);
  if (!row) return { ok: false, error: { code: 'not_found', message: 'card not found' } };
  const sessionId = row.session_id;
  const meta = parseJsonOr(row.meta_json || '{}', {}) as Record<string, unknown>;
  const prevLocMeta = (meta.location || {}) as Record<string, unknown>;

  if (!opts.skipBusyCheck) {
    try {
      const loc0 = await locationFieldsForCard(cardId, meta);
      const busy = await busyReplyForRequest(
        {
          session_id: sessionId,
          content_hash: cleanText(loc0.content_hash || meta.content_hash || '', 128),
          message_index: toInt(loc0.message_index, -1),
        },
        sessionId,
      );
      if (busy) return busy;
    } catch {
      /* an unreadable location must not block a reroll */
    }
  }

  const characterId = cleanText(prevLocMeta.character_id || meta.character_id || '', 200);
  let unifiedSessionId = cleanText(meta.unified_session_id || prevLocMeta.unified_session_id || '', 200);
  if (!unifiedSessionId && characterId) unifiedSessionId = unifiedSessionIdForCharacter(characterId);
  let sourceSessionIds: string[] = [];
  try {
    const job = await idbGet('jobs', row.job_id);
    if (job?.request_json) {
      const req = JSON.parse(job.request_json) as Record<string, unknown>;
      if (Array.isArray(req.source_session_ids)) {
        sourceSessionIds = req.source_session_ids.map((s) => cleanText(s, 200)).filter(Boolean);
      }
    }
  } catch {
    /* no readable job request means no cross-session sources */
  }
  const roster = await rosterForSession(sessionId, unifiedSessionId, characterId, sourceSessionIds);

  if (mode === 'full') {
    const job = await idbGet('jobs', row.job_id);
    if (!job) return { ok: false, error: { code: 'no_job', message: 'original job missing' } };
    const request = JSON.parse(job.request_json as string) as Record<string, unknown>;
    request.force = true;
    return createJob(request);
  }

  let main: string;
  let neg: string;
  let captions: NaiCaption[];
  let charList: unknown;
  let genMetaExtra: Record<string, unknown> = {};
  // The prompt is built for one family (V5 speech, natural, family preset). Send
  // that family's model with it, or a V5 prompt lands on the model-tab V4 model.
  let route: ShotNaiRoute | null = null;

  const ov = overrides as Record<string, unknown> | null;
  if (ov && ('main_prompt' in ov || 'negative_prompt' in ov || 'characters' in ov)) {
    main = 'main_prompt' in ov ? cleanText(ov.main_prompt || '') : cleanText(row.main_prompt);
    neg = 'negative_prompt' in ov ? cleanText(ov.negative_prompt || '') : cleanText(row.negative_prompt);
    charList = 'characters' in ov ? ov.characters : null;
    if (charList == null) charList = parseJsonOr(row.characters_json || '[]', []);
    captions = ((charList || []) as Array<Record<string, unknown>>)
      .slice(0, characterMaxLimit(getConfig().card || {}))
      .map((ch) => ({
        prompt: normalizeCharacterCaptionTags(ch.prompt || 'girl') || 'girl',
        uc: cleanText(ch.uc),
        center_x: Number(ch.center_x ?? 0.5),
        center_y: Number(ch.center_y ?? 0.5),
      }));
    route = resolveShotRoute(
      getConfig().card,
      getConfig().nai,
      { complexity: storedComplexity(meta) } as TaggedShot,
    );
    // Hand-edited captions come back without the bubble, because the tag editor is
    // never shown the dialogue. Re-derive it from the stored cast or a tag edit
    // would silently drop the speech on the next reroll.
    if (route.useSpeech) {
      const speechCaps = speechCaptionTagsForShot(
        {},
        rawCharactersFromMeta(meta) as SpeechCharacter[],
      );
      for (let i = 0; i < captions.length; i++) {
        const tag = speechCaps[i];
        if (!tag) continue;
        captions[i] = { ...captions[i]!, prompt: captionWithSpeech(captions[i]!.prompt, tag) };
      }
    }
  } else if (cleanText(row.main_prompt || '')) {
    const parsedStored = parseJsonOr(row.characters_json || '[]', []);
    const storedChars: unknown[] = Array.isArray(parsedStored) ? parsedStored : [];
    const rawFromMeta = rawCharactersFromMeta(meta);
    const rawFromStored: unknown[] = storedChars
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const c = item as Record<string, unknown>;
        if (c.raw && typeof c.raw === 'object') {
          const inner = c.raw as Record<string, unknown>;
          return { ...inner, name: cleanText(inner.name || c.name, 200) };
        }
        return {
          name: cleanText(c.name, 200),
          action: c.action,
          expression: c.expression,
          sex: c.sex,
          label: c.label,
          age: c.age,
          original: c.original || c.original_tag,
          costume: c.costume,
          attire: c.attire,
          accessories: c.accessories,
          wear_state: c.wear_state,
          nude: c.nude,
          weapon: c.weapon,
        };
      })
      .filter(Boolean);
    const cardCfg = (getConfig().card || {}) as Record<string, unknown>;
    const naiaModel = modelToNaia(getConfig().nai?.model || 'nai-diffusion-4-5-full');
    const qualitySuffixes = Object.values(QUALITY_TAGS).filter(Boolean);
    if (QUALITY_TAGS[naiaModel]) qualitySuffixes.unshift(QUALITY_TAGS[naiaModel]);
    const decision = resolveRerollLockedSetup({
      setup: meta.setup,
      main: row.main_prompt,
      person: meta.person,
      stylePositives: collectStylePositives(cardCfg),
      qualitySuffixes,
    });
    const shot: TaggedShot = {
      characters: (rawFromMeta.length ? rawFromMeta : rawFromStored) as ShotCharacter[],
      paragraph: row.paragraph,
      camera: decision.rebuildMain && decision.lockedSetup ? '' : cleanText(meta.camera || ''),
      situation:
        decision.rebuildMain && decision.lockedSetup
          ? ''
          : cleanText(meta.situation || meta.scene || ''),
      place: decision.rebuildMain && decision.lockedSetup ? '' : cleanText(meta.place || ''),
      action: decision.rebuildMain && decision.lockedSetup ? '' : cleanText(meta.action || ''),
      focus: meta.focus,
      complexity: storedComplexity(meta),
    };
    // Never pass the full main_prompt as lockedSetup: joinTags would re-append
    // person/style/quality tags that are already baked into it.
    const plan = await buildGenerationForShot({
      shot,
      roster,
      sessionId,
      lockedSetup: decision.rebuildMain ? decision.lockedSetup : undefined,
    });
    route = plan.route;
    if (decision.rebuildMain) {
      main = plan.main;
      neg = plan.neg;
      captions = plan.captions;
      charList = plan.meta.characters;
      genMetaExtra = {
        setup: plan.meta.setup,
        person: plan.meta.person,
        characters: charList,
        focus: plan.meta.focus ?? meta.focus,
        complexity: plan.meta.complexity || storedComplexity(meta),
      };
    } else {
      // Hand-edited main (setup mirrored the full prompt): keep tags, refresh cast.
      main = cleanText(row.main_prompt);
      neg = cleanText(row.negative_prompt) || plan.neg;
      captions = plan.captions;
      charList = plan.meta.characters;
      genMetaExtra = {
        setup: main,
        person: plan.meta.person,
        characters: charList,
        focus: plan.meta.focus ?? meta.focus,
        complexity: plan.meta.complexity || storedComplexity(meta),
      };
    }
  } else {
    const storedChars = parseJsonOr(row.characters_json || '[]', []);
    const rawFromMeta = rawCharactersFromMeta(meta);
    const rawFromStored: unknown[] = ((storedChars || []) as unknown[])
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const c = item as Record<string, unknown>;
        return c.raw || { name: c.name, action: c.action, expression: c.expression };
      })
      .filter(Boolean);
    const lockedSetup = cleanText(meta.setup || '');
    const shot: TaggedShot = {
      characters: (rawFromMeta.length ? rawFromMeta : rawFromStored) as ShotCharacter[],
      paragraph: row.paragraph,
      camera: lockedSetup ? '' : cleanText(meta.camera || ''),
      situation: lockedSetup ? '' : cleanText(meta.situation || meta.scene || ''),
      place: lockedSetup ? '' : cleanText(meta.place || ''),
      action: lockedSetup ? '' : cleanText(meta.action || ''),
      focus: meta.focus,
      complexity: storedComplexity(meta),
    };
    const plan = await buildGenerationForShot({ shot, roster, sessionId, lockedSetup });
    route = plan.route;
    main = plan.main;
    neg = plan.neg;
    captions = plan.captions;
    charList = plan.meta.characters;
    genMetaExtra = {
      setup: plan.meta.setup,
      person: plan.meta.person,
      characters: charList,
      focus: plan.meta.focus ?? meta.focus,
      complexity: plan.meta.complexity || storedComplexity(meta),
    };
  }

  if (!captions.length && !(ov && 'characters' in ov)) {
    const shot: TaggedShot = {
      characters: ((meta.characters || []) as unknown[]).map(
        (c) => (c as Record<string, unknown>).raw || c,
      ) as ShotCharacter[],
      camera: meta.setup as string,
      focus: meta.focus,
      complexity: storedComplexity(meta),
    };
    const plan = await buildGenerationForShot({ shot, roster, sessionId });
    route = plan.route;
    main = plan.main;
    neg = plan.neg;
    captions = plan.captions;
    charList = plan.meta.characters;
    genMetaExtra = {
      setup: plan.meta.setup,
      person: plan.meta.person,
      characters: charList,
      focus: plan.meta.focus ?? meta.focus,
      complexity: plan.meta.complexity || storedComplexity(meta),
    };
  }

  const ovSeed = ov && 'seed' in ov ? Number(ov.seed) : NaN;
  const seedOverride = Number.isFinite(ovSeed) && ovSeed > 0 ? Math.floor(ovSeed) : undefined;
  const { bytes, seed } = await generateImage(
    {
      main,
      neg,
      captions,
      seed: seedOverride,
      characters: Array.isArray(charList)
        ? (charList as Array<{ id?: string; name?: string }>)
        : undefined,
      model: route?.model,
      preset: route?.preset ?? undefined,
    },
    meta.aspect ?? ov?.aspect,
  );
  const newId = uuid();
  const now = Date.now() / 1000;
  let prevLoc = await readImageLocation(row.id);
  if (!Object.keys(prevLoc).length) prevLoc = await locationFieldsForCard(row.id, meta);
  const location = {
    version: 1,
    image_id: newId,
    session_id: sessionId,
    unified_session_id: unifiedSessionId,
    character_id: cleanText(prevLoc.character_id || '', 200),
    character_name: cleanText(prevLoc.character_name || meta.character_name || '', 200),
    chat_id: cleanText(prevLoc.chat_id || '', 200),
    chat_name: cleanText(prevLoc.chat_name || meta.chat_name || '', 200),
    char_index: toInt(prevLoc.char_index, -1),
    chat_index: toInt(prevLoc.chat_index, -1),
    message_index: toInt(prevLoc.message_index, -1),
    shot_index: toInt(prevLoc.shot_index, toInt(row.shot_index, 0)),
    paragraph: toInt(prevLoc.paragraph, toInt(row.paragraph, 0)),
    y_percent: toOptionalFloat(prevLoc.y_percent),
    content_hash: cleanText(prevLoc.content_hash || '', 128),
    assistant_preview: cleanText(prevLoc.assistant_preview || meta.assistant_preview || '', ASSISTANT_PREVIEW_LIMIT),
  };
  await publishImage(newId, bytes, location);

  const genMeta = cardMetaFromLocation({ ...meta, ...genMetaExtra }, location, bytes.byteLength);
  // The old card's y position lives under three historical key names; drop all
  // of them so the location's value is the only one left.
  for (const key of ['y_percent', 'anchor_percent', 'read_percent']) delete genMeta[key];
  genMeta.y_percent = location.y_percent;

  await idbPut('cards', {
    id: newId,
    job_id: row.job_id,
    session_id: sessionId,
    shot_index: row.shot_index,
    paragraph: row.paragraph,
    main_prompt: main,
    negative_prompt: neg,
    characters_json: JSON.stringify(charList),
    seed,
    meta_json: JSON.stringify(genMeta),
    created_at: now,
  });
  try {
    await deleteCard(cardId);
  } catch {
    /* the replacement is stored; a leftover row is not worth failing the call */
  }

  const card = {
    id: newId,
    image_url: resolveImageUrl(newId),
    main_prompt: main,
    negative_prompt: neg,
    characters: charList,
    seed,
    paragraph: location.paragraph,
    y_percent: location.y_percent,
    message_index: location.message_index,
    shot_index: location.shot_index,
    content_hash: location.content_hash,
    character_id: location.character_id,
    chat_id: location.chat_id,
    character_name: location.character_name,
    chat_name: location.chat_name,
    assistant_preview: location.assistant_preview,
    storage: 'indexeddb',
    png_bytes: bytes.byteLength,
  };
  await attachImageUrls(card);
  return { ok: true, replaced: cardId, card };
}

export type CommandRewriteBody = {
  instruction?: unknown;
  preset_id?: unknown;
  look_locked?: unknown;
  main_prompt?: unknown;
  negative_prompt?: unknown;
  characters?: unknown;
};

/**
 * LLM rewrite for shot-tag form fields. Does not generate an image — the UI
 * fills textareas and the user chooses 저장 / 저장·리롤.
 */
export async function commandRewriteCard(cardId: string, body: CommandRewriteBody = {}): Promise<ApiResult> {
  const row = await idbGet('cards', cardId);
  if (!row) return { ok: false, error: { code: 'not_found', message: 'card not found' } };

  const currentMain = cleanText(body.main_prompt ?? row.main_prompt, 8000);
  const currentNeg = cleanText(body.negative_prompt ?? row.negative_prompt, 8000);
  let currentChars: Array<Record<string, unknown>> = [];
  if (Array.isArray(body.characters)) {
    currentChars = body.characters.filter((c) => c && typeof c === 'object') as Array<Record<string, unknown>>;
  } else {
    const parsed = parseJsonOr(row.characters_json || '[]', []);
    currentChars = Array.isArray(parsed)
      ? (parsed.filter((c) => c && typeof c === 'object') as Array<Record<string, unknown>>)
      : [];
  }
  currentChars = currentChars.slice(0, characterMaxLimit(getConfig().card || {}));

  const lookLockedRaw = Array.isArray(body.look_locked) ? body.look_locked : [];
  const lookLocked = currentChars.map((_, i) => lookLockedRaw[i] === true);

  const cardCfg = (getConfig().card || {}) as Record<string, unknown>;
  const presets: unknown[] = Array.isArray(cardCfg.presets) ? (cardCfg.presets as unknown[]) : [];
  const wantPreset = cleanText(body.preset_id, 120);
  const activeId = cleanText(cardCfg.active_preset_id, 120);
  let stylePositive = '';
  let chosenPreset: Record<string, unknown> | null = null;
  if (presets.length) {
    const id = wantPreset || activeId;
    if (id) {
      chosenPreset =
        (presets.find(
          (p) => typeof p === 'object' && p && cleanText((p as Record<string, unknown>).id, 120) === id,
        ) as Record<string, unknown> | undefined) || null;
    }
    if (!chosenPreset && typeof presets[0] === 'object') chosenPreset = presets[0] as Record<string, unknown>;
    if (chosenPreset) {
      stylePositive = cleanText(chosenPreset.positive || chosenPreset.pos || '', 8000);
    }
  }

  const instruction = cleanText(body.instruction, 4000);
  const payload = {
    instruction: instruction || '(empty — creatively randomize unlocked fields)',
    main_prompt: currentMain,
    negative_prompt: currentNeg,
    characters: currentChars.map((ch, i) => ({
      index: i,
      name: cleanText(ch.name, 200),
      prompt: cleanText(ch.prompt, 4000),
      look_locked: lookLocked[i],
      look_tags: lookLocked[i] ? cleanText(ch.prompt, 4000) : '',
      uc: cleanText(ch.uc, 2000),
    })),
  };

  const system = stripCbs(await getPrompt('command_reroll'));
  const messages: LlmMessage[] = [
    { role: 'system', content: system || 'Rewrite prompts. Return JSON only.' },
    { role: 'user', content: JSON.stringify(payload) },
  ];
  let raw = '';
  try {
    raw = await callLlm(getConfig().llm, messages);
  } catch (err) {
    return {
      ok: false,
      error: {
        code: 'llm_failed',
        message: `명령 수정 LLM 실패: ${String((err as Error)?.message || err).slice(0, 240)}`,
      },
    };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = parseJsonLoose(raw) as Record<string, unknown>;
  } catch (err) {
    return {
      ok: false,
      error: {
        code: 'parse_failed',
        message: String((err as Error)?.message || err).slice(0, 240),
      },
    };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: { code: 'parse_failed', message: 'LLM returned non-object JSON' } };
  }

  const naiaModel = modelToNaia(getConfig().nai?.model || 'nai-diffusion-4-5-full');
  const qualitySuffixes = Object.values(QUALITY_TAGS).filter(Boolean);
  if (QUALITY_TAGS[naiaModel]) qualitySuffixes.unshift(QUALITY_TAGS[naiaModel]);
  const stylePositives = collectStylePositives(cardCfg);
  const meta = parseJsonOr(row.meta_json || '{}', {}) as Record<string, unknown>;
  const person = cleanText(meta.person || '', 400);
  const presetId = cleanText((chosenPreset?.id as string) || wantPreset || activeId, 120);

  if (commandRewriteHasDeltas(parsed)) {
    const sceneKeys = new Set(splitTagTokens(stripPersonCountTags(currentMain)).map((t) => t.toLowerCase()));
    const personFromMain = splitTagTokens(currentMain).filter((t) => !sceneKeys.has(t.toLowerCase()));
    const merged = mergeCommandRewriteDeltas({
      currentMain,
      currentNeg,
      currentChars,
      lookLocked,
      parsed,
      protectMain: [...stylePositives, ...qualitySuffixes, person, ...personFromMain],
    });
    return { ok: true, ...merged, preset_id: presetId };
  }

  const main_prompt = mergeCommandRewriteMain({
    currentMain,
    setup: parsed.setup,
    mainPrompt: parsed.main_prompt,
    stylePositive,
    person,
    stylePositives,
    qualitySuffixes,
  });
  const negFromLlm = cleanText(parsed.negative_prompt, 8000);
  const negative_prompt = negFromLlm || currentNeg;
  const characters = mergeCommandRewriteCharacters(currentChars, parsed.characters, lookLocked);

  return {
    ok: true,
    main_prompt,
    negative_prompt,
    characters,
    preset_id: presetId,
  };
}

/**
 * Rerolls every card attached to one message, in reading order.
 *
 * Stops at the first card that reports busy, since that means something else
 * has taken the message and the remaining rerolls would race it.
 */
export async function rerollMessageCards({
  session_id = '',
  content_hash = '',
  message_index = -1,
}: RerollMessageArgs = {}): Promise<ApiResult> {
  const sessionId = cleanText(session_id, 200);
  const contentHash = cleanText(content_hash, 128);
  const msgIndex = toInt(message_index, -1);
  if (!sessionId && !contentHash && msgIndex < 0) {
    return { ok: false, error: { code: 'bad_request', message: 'session_id or content_hash required' } };
  }

  const rows = await idbGetAll('cards');
  const targets: Array<{ row: CardRow; y: number; shot: number; paragraph: number }> = [];
  for (const row of rows) {
    if (sessionId && row.session_id !== sessionId) continue;
    const meta = parseJsonOr(row.meta_json || '{}', {}) as Record<string, unknown>;
    const loc = await locationFieldsForCard(row.id, meta);
    const hash = cleanText(loc.content_hash || meta.content_hash || '', 128);
    const mi = toInt(loc.message_index, -1);
    if (contentHash) {
      if (hash !== contentHash) continue;
    } else if (msgIndex >= 0) {
      if (mi !== msgIndex) continue;
    } else {
      continue;
    }
    const yRaw = loc.y_percent ?? meta.y_percent ?? meta.anchor_percent ?? meta.read_percent;
    const y = Number(yRaw);
    targets.push({
      row,
      // Cards with no y position sort last rather than to the top.
      y: Number.isFinite(y) ? y : 999,
      shot: toInt(row.shot_index, 0),
      // CardRow declares paragraph required, but rows written by 1.x may omit it.
      paragraph: toInt((row as Record<string, unknown>).paragraph ?? loc.paragraph, 0),
    });
  }
  targets.sort((a, b) => a.y - b.y || a.shot - b.shot || a.paragraph - b.paragraph);
  if (!targets.length) return { ok: false, error: { code: 'not_found', message: 'no cards for message' } };

  const sid = sessionId || cleanText(targets[0]?.row?.session_id || '', 200);
  const keyReq = { session_id: sid, content_hash: contentHash, message_index: msgIndex };
  const busy = await busyReplyForRequest(keyReq, sid);
  if (busy) return busy;

  const key = jobKey(keyReq, sid);
  clearMessageRerollStop();
  messageBusyKeys.add(key);
  const cards: unknown[] = [];
  const replaced: unknown[] = [];
  const failed: Array<{ id: string; error: unknown }> = [];
  let stopped = false;
  try {
    for (const item of targets) {
      if (isMessageRerollStopRequested()) {
        stopped = true;
        dbg('cards.reroll_message.stop', { done: cards.length, total: targets.length, focus: true });
        break;
      }
      const row = item.row;
      try {
        const result = (await rerollCard(row.id, 'nai', null, { skipBusyCheck: true })) as Record<string, unknown>;
        if (result?.busy) {
          failed.push({ id: row.id, error: (result.error as Record<string, unknown>)?.message || 'busy' });
          break;
        }
        if (result?.ok && result.card) {
          cards.push(result.card);
          if (result.replaced) replaced.push(result.replaced);
        } else {
          failed.push({
            id: row.id,
            error: cleanText((result?.error as Record<string, unknown>)?.message || 'reroll failed', 400),
          });
        }
      } catch (error) {
        failed.push({ id: row.id, error: cleanText((error as Error)?.message || error, 400) });
      }
    }
    return { ok: cards.length > 0 || stopped, count: cards.length, replaced, cards, failed, stopped };
  } finally {
    messageBusyKeys.delete(key);
  }
}

/** `meta.characters` entries keep the tagger's original shot under `raw`. */
function rawCharactersFromMeta(meta: Record<string, unknown>): unknown[] {
  if (!Array.isArray(meta.characters)) return [];
  return (meta.characters as unknown[])
    .map((c) => (c && typeof c === 'object' ? (c as Record<string, unknown>).raw || c : null))
    .filter(Boolean);
}
