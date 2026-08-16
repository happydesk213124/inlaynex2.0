/**
 * The generation job engine.
 *
 * A job turns one chat message into N illustrated cards: tag the scene with an
 * LLM, reconcile the character roster, then generate and store one image per
 * shot. Two properties dominate the design:
 *
 * **Supersession.** The user can edit or reroll a message while its job is still
 * running. Results from the old run must never appear. Each target message has
 * an epoch (`jobEpochByKey`); starting a job bumps it, and the running job
 * re-checks `isJobCurrent` at every await boundary. A superseded job deletes any
 * cards it already published and marks itself cancelled. In-flight NovelAI
 * requests are deliberately allowed to finish rather than aborted — the image is
 * already paid for in Anlas, and discarding after the fact is simpler than
 * unwinding a partial HTTP read. As soon as a shot's PNG exists, publish +
 * spinner→image run immediately (and in parallel across shots). Card-row
 * idb can trail that reveal while the next NovelAI request is already in flight.
 *
 * **Progress without I/O.** Progress ticks every few seconds for potentially
 * minutes. Persisting a full jobs snapshot per tick is what made 1.x stall
 * during NovelAI calls, so `generating`→`generating` transitions stay in memory
 * (`persist: false`) and only state changes reach disk. Payloads are also kept
 * small: `tagged`, `appearance` and data URLs are stripped before storage
 * because they run to megabytes and would block the storage RPC.
 */

import { ASSISTANT_PREVIEW_LIMIT } from '../core/constants';
import { normalizeAssetNaiTagsMode } from '../config/schema';
import {
  dbg,
  dbgSpan,
  eventsForJob,
  getFocusStage,
  getJobContext,
  getLastError,
  getLastStage,
  setJobContext,
} from '../core/debug';
import type { ApiResult, JobRequest, JobState, TaggedShot, TaggerResult } from '../core/types';
import { cleanText, stripCbs, toInt, uuid } from '../core/util/text';
import { parseJsonLoose } from '../core/util/object';
import {
  forceFinishNaiBody,
  getNaiBodyBytesExpected,
  getNaiBodyBytesReceived,
  getNaiLastByteAt,
  hasNaiBodyControl,
} from '../providers/nai/http';
import { callLlm } from '../providers/llm/client';
import { resolveLlmRole } from '../domain/llm/roles';
import { characterHasAppearance, characterMaxLimit, applyWearContinuityToShots } from '../domain/character/tags';
import { dedupeShotCharacters, resolveCharacter } from '../domain/character/roster';
import { attachImageUrls, publishImage, resolveImageUrl } from '../storage/image-urls';
import { flushPersist, idbGet, idbPut } from '../storage/stores';
import { getConfig, jobEpochByKey, jobRunMeta, requestMessageRerollStop } from './context';
import { mergeRosterFromTagged, persistChatWearStates, rosterForSession } from './characters';
import { buildGenerationForShot, buildImageLocation, cardMetaFromLocation, generateImage, readImageLocation } from './generation';
import { buildCharacterLooksMessages, buildTaggerMessages, collectAssetTagsForTagger, extractTaggerChatContext, flattenShots } from './tagger';
import {
  applyLorefilter,
  ensureLorefilter,
  fetchHostLorebookEntries,
} from './lorefilter';
import { collectTriggeredLoreKeys } from '../domain/lore/assemble';
import { applyCharRefsFromPreviewTargets } from './asset-tags';
import {
  getCurationMode,
  refineShotsWithCuration,
  snapShotsSceneTags,
} from './curation';
import { deleteCard, rebindCardsHash, unlinkCardsForMessage } from './gallery';
import { ACTIVE_JOB_STATES, busyReplyForRequest, jobKey } from './job-locks';
import { getPrompt } from './settings';
import {
  canRetargetJobSaveHash,
  jobMatchesMessageIdentity,
} from '../ui-contract/viewer-core';

export { canRetargetJobSaveHash, jobMatchesMessageIdentity };


/** Progress heartbeat period while waiting on NovelAI. */
const HEARTBEAT_MS = 5000;

/**
 * Mid-job streaming can rebind earlier shots to a newer message hash while later
 * shots are still generating. Prefer (1) an explicit save-hash retarget on the
 * running job, then (2) a sibling card's rebound hash, so the rest of the job
 * lands on the same message. Lock key / request.content_hash stay untouched.
 */
async function resolveJobContentHash(
  jobId: string,
  requestHash: string,
): Promise<{ contentHash: string; assistantPreview: string }> {
  const fallback = cleanText(requestHash || '', 128);
  const meta = jobRunMeta.get(jobId);
  const saveHash = cleanText(meta?.saveContentHash || '', 128);
  if (saveHash && fallback && saveHash !== fallback) {
    return {
      contentHash: saveHash,
      assistantPreview: cleanText(meta?.saveAssistantPreview || '', ASSISTANT_PREVIEW_LIMIT),
    };
  }
  const published = meta?.publishedIds || [];
  for (const id of published) {
    try {
      const loc = await readImageLocation(id);
      const h = cleanText(loc?.content_hash || '', 128);
      if (h && fallback && h !== fallback) {
        return {
          contentHash: h,
          assistantPreview: cleanText(loc?.assistant_preview || '', ASSISTANT_PREVIEW_LIMIT),
        };
      }
    } catch {
      /* try next sibling */
    }
  }
  return { contentHash: fallback, assistantPreview: '' };
}

/**
 * True when any active job targets the same char/chat/msg/role (hash ignored).
 * Lets the UI skip Ka while tagging/generating under a streaming hash.
 */
export async function busyJobForMessage(args: {
  session_id?: string;
  character_id?: string;
  chat_id?: string;
  message_index?: unknown;
  role?: string;
} = {}): Promise<ApiResult> {
  const identity = {
    sessionId: cleanText(args.session_id || '', 200),
    characterId: cleanText(args.character_id || '', 200),
    chatId: cleanText(args.chat_id || '', 200),
    messageIndex: toInt(args.message_index, -1),
    role: args.role || '',
  };
  if (!identity.characterId || identity.messageIndex < 0) {
    return { ok: true, busy: false };
  }
  for (const [jobId, meta] of jobRunMeta.entries()) {
    if (!jobMatchesMessageIdentity(meta, identity)) continue;
    const row = await idbGet('jobs', jobId);
    const state = String(row?.state || '');
    if (!ACTIVE_JOB_STATES.includes(state)) continue;
    return {
      ok: true,
      busy: true,
      job_id: jobId,
      state,
      content_hash: cleanText(meta.saveContentHash || '', 128),
    };
  }
  return { ok: true, busy: false };
}

/**
 * While a job is still running, point later card saves at the finished message
 * hash — only when identity matches and text is ≥60% similar to the job-start
 * preview. Does not change the busy/lock key (still the original hash).
 */
export async function retargetJobSaveHash(args: {
  session_id?: string;
  character_id?: string;
  chat_id?: string;
  message_index?: unknown;
  role?: string;
  to_hash?: string;
  assistant_text?: string;
  assistant_preview?: string;
} = {}): Promise<ApiResult> {
  const toHash = cleanText(args.to_hash || '', 128);
  const text = cleanText(args.assistant_preview || args.assistant_text || '', ASSISTANT_PREVIEW_LIMIT);
  const identity = {
    toHash,
    text,
    sessionId: cleanText(args.session_id || '', 200),
    characterId: cleanText(args.character_id || '', 200),
    chatId: cleanText(args.chat_id || '', 200),
    messageIndex: toInt(args.message_index, -1),
    role: args.role || '',
  };
  if (!toHash || !text || !identity.characterId || identity.messageIndex < 0) {
    return { ok: false, error: { code: 'bad_request', message: 'to_hash, text, character_id, message_index required' }, retargeted: false };
  }
  for (const [jobId, meta] of jobRunMeta.entries()) {
    if (!canRetargetJobSaveHash(meta, identity)) continue;
    const row = await idbGet('jobs', jobId);
    const state = String(row?.state || '');
    if (!ACTIVE_JOB_STATES.includes(state)) continue;
    meta.saveContentHash = toHash;
    meta.saveAssistantPreview = text;
    let rebound = 0;
    if (meta.publishedIds?.length) {
      try {
        const res = await rebindCardsHash({
          session_id: identity.sessionId || meta.sessionId,
          card_ids: [...meta.publishedIds],
          to_hash: toHash,
          assistant_preview: text,
        });
        rebound = Number((res as { rebound?: unknown })?.rebound || 0);
      } catch {
        /* save-hash still updated; published cards may catch up on next rebind */
      }
    }
    dbg('job.retarget', {
      job_id: jobId,
      to: toHash.slice(0, 8),
      msg: identity.messageIndex,
      rebound,
      focus: true,
    });
    return { ok: true, retargeted: true, job_id: jobId, content_hash: toHash, rebound };
  }
  return { ok: true, retargeted: false, job_id: '', content_hash: toHash };
}


/**
 * NovelAI occasionally delivers the whole ZIP then never closes the stream. Once
 * bytes have arrived and gone quiet this long, treat the body as complete.
 */
const NAI_IDLE_FINISH_MS = 2500;
const NAI_MIN_BODY_BYTES = 64;

/** A request as it arrives from the UI: `session_id` is filled in by `createJob`. */
type IncomingRequest = Partial<JobRequest> & Record<string, unknown>;

// ── target identity and epochs ──────────────────────────────────────────────

function beginJobEpoch(jobId: string, request: IncomingRequest, sessionId: string): { key: string; epoch: number } {
  const key = jobKey(request, sessionId);
  const prev = jobEpochByKey.get(key);
  const epoch = (prev?.epoch || 0) + 1;
  // Deliberately does not cancel a running job for the same key; callers must
  // busy-check first, so that a queued duplicate is rejected rather than
  // silently replacing work the user is already waiting on.
  jobEpochByKey.set(key, { epoch, jobId });
  const preview = cleanText(request.assistant_text || '', ASSISTANT_PREVIEW_LIMIT);
  const hash = cleanText(request.content_hash || '', 128);
  jobRunMeta.set(jobId, {
    key,
    epoch,
    cancelRequested: false,
    publishedIds: [],
    saveContentHash: hash,
    saveAssistantPreview: preview,
    sourcePreview: preview,
    sessionId,
    characterId: cleanText(request.character_id || '', 200),
    chatId: cleanText(request.chat_id || '', 200),
    messageIndex: toInt(request.message_index, -1),
    messageRole: cleanText(request.message_role || request.role || '', 40).toLowerCase(),
  });
  return { key, epoch };
}

function isJobCurrent(jobId: string): boolean {
  const meta = jobRunMeta.get(jobId);
  if (!meta || meta.cancelRequested) return false;
  const cur = jobEpochByKey.get(meta.key);
  return Boolean(cur && cur.jobId === jobId && cur.epoch === meta.epoch);
}

/** Removes cards a now-superseded run already published. */
async function discardJobPublished(jobId: string): Promise<number> {
  const meta = jobRunMeta.get(jobId);
  const ids = meta?.publishedIds ? [...meta.publishedIds] : [];
  if (meta) meta.publishedIds = [];
  for (const id of ids) {
    try {
      await deleteCard(id);
    } catch {
      /* a card the user already deleted is not an error here */
    }
  }
  return ids.length;
}

/** Returns true when the job was stale and has now been cancelled. */
async function cancelJobIfStale(jobId: string, note = 'interrupted'): Promise<boolean> {
  if (isJobCurrent(jobId)) return false;
  const meta = jobRunMeta.get(jobId);
  // User soft-stop: keep published cards (already paid / already shown).
  if (meta?.userStop) {
    await finishUserStoppedJob(jobId, note);
    return true;
  }
  const dropped = await discardJobPublished(jobId);
  await setJob(
    jobId,
    'cancelled',
    {
      phase: 'cancelled',
      progress: 0,
      message: `${note}${dropped ? ` · discarded ${dropped}` : ''}`,
      shot_count: 0,
      shot_done: 0,
    },
    null,
  );
  dbg('job.cancelled', { job_id: jobId, message: note, discarded: dropped, focus: true });
  return true;
}

/** Soft-stop terminal: cancelled UI, no card discard. */
async function finishUserStoppedJob(jobId: string, note = '사용자 중단'): Promise<void> {
  const meta = jobRunMeta.get(jobId);
  const n = meta?.publishedIds?.length || 0;
  await setJob(
    jobId,
    'cancelled',
    {
      phase: 'cancelled',
      progress: 100,
      message: `${note}${n ? ` · 유지 ${n}장` : ''}`,
      shot_count: n,
      shot_done: n,
    },
    null,
  );
  dbg('job.user_stop', { job_id: jobId, message: note, kept: n, focus: true });
}

/**
 * Optimistic stop: mark active jobs cancelRequested+userStop so in-flight
 * LLM/NAI finish, remaining shots skip, published cards stay.
 */
export async function requestJobStop(args: { session_id?: string } = {}): Promise<ApiResult> {
  // Soft-stop message-level reroll batches / UI live loops (do not abort in-flight NAI).
  requestMessageRerollStop();
  const sid = cleanText(args.session_id || '', 200);
  const stopped: string[] = [];
  for (const [jobId, meta] of jobRunMeta.entries()) {
    if (sid && meta.sessionId && meta.sessionId !== sid) continue;
    const row = await idbGet('jobs', jobId);
    const state = String(row?.state || '');
    if (!ACTIVE_JOB_STATES.includes(state)) continue;
    meta.cancelRequested = true;
    meta.userStop = true;
    const prev = (row?.result_json && (() => {
      try {
        return JSON.parse(String(row.result_json));
      } catch {
        return null;
      }
    })()) as Record<string, unknown> | null;
    const shotDone = toInt(prev?.shot_done, meta.publishedIds?.length || 0);
    const shotCount = toInt(prev?.shot_count, Math.max(shotDone, meta.publishedIds?.length || 0));
    await setJob(
      jobId,
      'cancelled',
      {
        phase: 'cancelled',
        progress: Number(prev?.progress) || Math.round((shotDone / Math.max(1, shotCount || 1)) * 100) || 0,
        message: '사용자 중단',
        shot_count: shotCount,
        shot_done: shotDone,
      },
      null,
    );
    stopped.push(jobId);
    dbg('job.stop_requested', { job_id: jobId, session: (sid || meta.sessionId || '').slice(-8), focus: true });
  }
  return {
    ok: true,
    stopped: stopped.length,
    job_ids: stopped,
    reroll_stop: true,
  };
}

// ── progress and state ─────────────────────────────────────────────────────

interface ProgressExtra {
  shot_count?: number;
  shot_index?: number;
  shot_done?: number;
  progress?: number;
  phase?: string;
  message?: string;
  cards_so_far?: number;
  /** Known line slots for bubble inline placeholders (spinner until image ready). */
  pending_inline?: Array<{ shot_index: number; line: number }>;
  /** Message index the pending rows belong to — UI must not paint them on other turns. */
  pending_message_index?: number;
}

/** Small by design: a progress row must never carry the tagged scene. */
function progressPayload(extra: ProgressExtra = {}): Record<string, unknown> {
  return {
    shot_count: extra.shot_count ?? 0,
    shot_index: extra.shot_index ?? 0,
    shot_done: extra.shot_done ?? 0,
    progress: extra.progress ?? 0,
    phase: extra.phase || 'generating',
    message: extra.message || '',
    cards_so_far: extra.cards_so_far,
    pending_inline: Array.isArray(extra.pending_inline) ? extra.pending_inline : undefined,
    pending_message_index: Number.isFinite(Number(extra.pending_message_index))
      ? Number(extra.pending_message_index)
      : undefined,
    debug_stage: getFocusStage() || getLastStage(),
    debug_error: getLastError()?.message || '',
  };
}

/** Strips payload fields that must never reach storage. */
function slimResultForStorage(result: unknown): unknown {
  if (!result || typeof result !== 'object') return result;
  return JSON.parse(
    JSON.stringify(result, (key, val: unknown) => {
      if (key === 'image_url' && typeof val === 'string' && val.startsWith('data:')) return '';
      if (key === 'tagged' || key === 'appearance' || key === 'debug_tail') return undefined;
      return val;
    }),
  );
}

async function setJob(
  jobId: string,
  state: JobState,
  result: unknown = null,
  error: string | null = null,
): Promise<void> {
  const meta = jobRunMeta.get(jobId);
  // After optimistic user-stop, ignore non-terminal progress (heartbeat / mid-shot).
  if (
    meta?.userStop
    && state !== 'cancelled'
    && state !== 'error'
    && state !== 'done'
  ) {
    return;
  }
  const row = await idbGet('jobs', jobId);
  if (!row) return;
  const prevState = row.state;
  const next: Record<string, unknown> = { ...(row as unknown as Record<string, unknown>), state };
  const stored = slimResultForStorage(result);
  next.result_json = stored != null ? JSON.stringify(stored) : null;
  next.error = error;
  next.updated_at = Date.now() / 1000;
  // A tick within `generating` is transient: it will be superseded within
  // seconds, so skipping the disk write costs nothing and keeps the storage RPC
  // free for the image bytes.
  const persistDisk = state !== 'generating' || prevState !== 'generating' || Boolean(error);
  await idbPut('jobs', next, { persist: persistDisk });
  // Row writes are normally coalesced into a flush 25 ms later, which is fine for
  // transient progress but not for the end of a job: the cards written during it
  // are the images the user just paid for, and a reload inside that window would
  // lose them. Terminal states therefore wait for the write to land, as 1.x did.
  if (state === 'done' || state === 'error' || state === 'cancelled') {
    await flushPersist();
  }
  dbg('job.set', {
    message: `${state}${error ? ' ERR' : ''}${persistDisk ? '' : ' (mem)'}`,
    job_id: jobId,
    state,
    persist: persistDisk,
    err: error ? String(error).slice(0, 160) : '',
    background: state === 'generating',
    focus: state !== 'generating',
  });
}

// ── public API ─────────────────────────────────────────────────────────────

export async function createJob(request: IncomingRequest): Promise<ApiResult> {
  const card = getConfig().card || {};
  if (!card.power && !request.force) throw new Error('Power가 OFF 상태입니다.');
  const sessionId = cleanText(request.session_id, 200) || `sess_${uuid().replace(/-/g, '').slice(0, 12)}`;
  const payload: JobRequest = { ...request, session_id: sessionId };
  const busy = await busyReplyForRequest(payload, sessionId);
  if (busy) {
    dbg('job.busy', { message: busy.error.message || 'busy', key: jobKey(payload, sessionId), focus: true }, 'warn');
    return busy;
  }
  const jobId = uuid();
  const now = Date.now() / 1000;
  beginJobEpoch(jobId, payload, sessionId);
  // A forced retag starts a fresh cohort, so drop the previous cards for this
  // message. Only on force: a normal run must be additive.
  if (payload.force) {
    try {
      await unlinkCardsForMessage(sessionId, cleanText(payload.content_hash || ''), payload.message_index);
    } catch {
      /* nothing to unlink */
    }
  }
  await idbPut('jobs', {
    id: jobId,
    session_id: sessionId,
    state: 'queued',
    request_json: JSON.stringify(payload),
    result_json: null,
    error: null,
    created_at: now,
    updated_at: now,
  });
  // Intentionally not awaited: the UI polls `getJob`, so createJob returns as
  // soon as the job is durable.
  runJob(jobId).catch(async (err: unknown) => {
    console.error('[Inlay Nexus] job crashed', jobId, err);
    try {
      await setJob(jobId, 'error', null, String((err as Error)?.message || err).slice(0, 1500));
    } catch {
      /* the job row is already gone */
    }
  });
  return { ok: true, accepted: true, job_id: jobId, session_id: sessionId, job_state: 'queued' };
}

export async function getJob(jobId: string): Promise<ApiResult> {
  const row = await idbGet('jobs', jobId);
  if (!row) return { ok: false, error: { code: 'not_found', message: 'job not found' } };
  const result = row.result_json ? (JSON.parse(row.result_json) as Record<string, unknown> | null) : null;
  const progress: Record<string, unknown> = {};
  if (result && typeof result === 'object') {
    for (const key of [
      'shot_count',
      'shot_index',
      'shot_done',
      'progress',
      'phase',
      'message',
      'cards_so_far',
      'pending_inline',
      'pending_message_index',
      'debug_stage',
      'debug_error',
    ]) {
      if (key in result) progress[key] = result[key];
    }
  }
  if (result) await attachImageUrls(result);
  return {
    ok: true,
    job_id: row.id,
    session_id: row.session_id,
    state: row.state,
    error: row.error,
    result,
    progress,
    debug: {
      last_stage: getLastStage(),
      last_error: getLastError(),
      events: eventsForJob(jobId, 40),
    },
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ── the run loop ───────────────────────────────────────────────────────────

/** Reads the LLM's vertical anchor for a shot, if it gave one. */
function shotAnchorPercent(shot: TaggedShot): number | null {
  for (const key of ['y_percent', 'anchor_percent', 'read_percent'] as const) {
    const raw = (shot as unknown as Record<string, unknown>)[key];
    if (raw == null) continue;
    try {
      return Math.max(0, Math.min(100, Number(raw)));
    } catch {
      return null;
    }
  }
  return null;
}

async function runJob(jobId: string): Promise<void> {
  const row = await idbGet('jobs', jobId);
  if (!row) return;
  const request = JSON.parse(row.request_json ?? '{}') as JobRequest;
  const sessionId = String(row.session_id ?? '');
  const prevCtx = getJobContext();
  setJobContext(jobId);
  const jobSpan = dbgSpan('job.run');
  dbg('job.start', {
    job_id: jobId,
    session_id: sessionId,
    message_index: request.message_index,
    text_len: String(request.assistant_text || '').length,
  });
  // Background shot saves (publish/hash/card row). Hoisted so catch can drain.
  let pendingShotSave: Promise<void> = Promise.resolve();
  let shotSaveFailed: unknown = null;
  try {
    if (await cancelJobIfStale(jobId, 'superseded before start')) return;
    // createJob already unlinked on force; repeated here because a job can also
    // be started by a retry path that skips createJob's unlink.
    if (request.force) {
      await unlinkCardsForMessage(sessionId, cleanText(request.content_hash || ''), request.message_index);
    }
    if (await cancelJobIfStale(jobId, 'superseded before tagging')) return;
    await setJob(jobId, 'tagging', {
      phase: 'tagging',
      progress: 0,
      message: '장면 태깅 중…',
      shot_count: 0,
      shot_done: 0,
      debug_stage: 'job.tagging',
    });

    const unifiedSessionId = cleanText(request.unified_session_id || '', 200);
    const characterId = cleanText(request.character_id || '', 200);
    const sourceSessionIds = Array.isArray(request.source_session_ids)
      ? request.source_session_ids.map((s) => cleanText(s, 200)).filter(Boolean)
      : [];

    // Lorefilter: whitelist character lore before assets/tagger (fail-open).
    if (characterId && getConfig().card?.lorebook !== false) {
      try {
        const hostLore = await fetchHostLorebookEntries();
        const book = hostLore.length
          ? hostLore
          : Array.isArray(request.lorebook)
            ? request.lorebook
            : [];
        if (book.length) {
          const selected = await ensureLorefilter(characterId, book);
          const filtered = applyLorefilter(book, selected);
          request.lorebook = filtered;
          request.lore_trigger_keys = collectTriggeredLoreKeys(
            filtered,
            cleanText(request.assistant_text || '', 20000),
          );
          dbg('job.lorefilter', {
            character_id: characterId,
            selected: selected.length,
            in: book.length,
            out: filtered.length,
            focus: true,
          });
        }
      } catch (err) {
        dbg(
          'job.lorefilter.fail',
          { message: String((err as Error)?.message || err) },
          'warn',
        );
      }
    }

    // Asset NAI modes: off | inline (soup on main) | prepass | prepass_vision.
    // Prepass fills roster looks first; lore Character Image auto-drops when filled.
    // prepass_vision attaches ≤1 image per character (max 5) on the looks call.
    // Fail → fall back to inline soup on the main tagger.
    const assetMode = normalizeAssetNaiTagsMode(getConfig().card?.asset_nai_tags);
    let skipAssetInject = false;
    if (assetMode === 'prepass' || assetMode === 'prepass_vision') {
      const assetCollected = await collectAssetTagsForTagger(request, {
        withPreviews: assetMode === 'prepass_vision',
      });
      if (assetCollected?.block) {
        await setJob(jobId, 'tagging', {
          phase: 'tagging',
          progress: 0.05,
          message: '에셋 캐릭터 룩 태깅 중…',
          shot_count: 0,
          shot_done: 0,
          debug_stage: 'job.char_looks',
        });
        if (await cancelJobIfStale(jobId, 'superseded before char looks')) return;
        try {
          const lookAssetNames = assetCollected.packed.groups.flatMap((g) => g.assets.map((a) => a.name));
          const lookMessages = await buildCharacterLooksMessages(
            request,
            assetCollected.block,
            lookAssetNames,
            assetMode === 'prepass_vision' ? (assetCollected.previews || []) : [],
          );
          dbg('job.char_looks.messages', {
            mode: assetMode,
            msgs: lookMessages.length,
            assets: lookAssetNames,
            groups: assetCollected.packed.groups.map((g) => g.trigger),
            previews: (assetCollected.previews || []).map((p) => p.name),
          });
          const lookRaw = await callLlm(resolveLlmRole(getConfig(), 'asset_char'), lookMessages);
          if (await cancelJobIfStale(jobId, 'superseded after char looks')) return;
          const lookTagged = parseJsonLoose(lookRaw) as TaggerResult;
          const newChars = Array.isArray(lookTagged?.new_characters) ? lookTagged.new_characters : [];
          if (newChars.length) {
            await mergeRosterFromTagged({
              sessionId,
              tagged: { new_characters: newChars, scenes: [] },
              shotChars: [],
              unifiedSessionId,
              characterId,
              sourceSessionIds,
              assetLooks: true,
              originalHints: assetCollected.originalHints || {},
            });
            try {
              const lookRoster = await rosterForSession(
                sessionId,
                unifiedSessionId,
                characterId,
                sourceSessionIds,
              );
              const refN = await applyCharRefsFromPreviewTargets(
                newChars,
                assetCollected.previewTargets || [],
                lookRoster,
              );
              if (refN) dbg('job.char_looks.char_refs', { applied: refN });
            } catch (refErr) {
              dbg(
                'job.char_looks.char_refs.fail',
                { message: String((refErr as Error)?.message || refErr) },
                'warn',
              );
            }
          }
          const filledLooks = newChars.filter((c) => characterHasAppearance(c)).length;
          skipAssetInject = true;
          dbg('job.char_looks.done', {
            mode: assetMode,
            new_characters: newChars.length,
            filled_looks: filledLooks,
            raw_len: String(lookRaw || '').length,
          });
        } catch (err) {
          skipAssetInject = false;
          dbg(
            'job.char_looks.fail',
            { mode: assetMode, message: String((err as Error)?.message || err) },
            'warn',
          );
        }
      }
    }

    const messages = await buildTaggerMessages(request, { skipAssetInject });
    // Same chat user blob as pass 1 — keep byte-identical for LLM prompt cache on pass 2.
    const chatContext = extractTaggerChatContext(messages);
    dbg('job.tagger.messages', { msgs: messages.length, skip_asset_inject: skipAssetInject });
    if (getConfig().card?.preprocessing) {
      const pre = stripCbs(await getPrompt('preprocess'));
      if (pre) {
        const preMessages = [{ role: 'system', content: pre }, messages[messages.length - 1]];
        const summary = await callLlm(resolveLlmRole(getConfig(), 'main'), preMessages);
        if (await cancelJobIfStale(jobId, 'superseded during preprocess')) return;
        messages.splice(messages.length - 1, 0, {
          role: 'system',
          content: `## Preprocess Summary\n${summary}`,
        });
      }
    }
    const taggedRaw0 = await callLlm(resolveLlmRole(getConfig(), 'main'), messages);
    if (await cancelJobIfStale(jobId, 'superseded after tagging')) return;
    let taggedRaw = taggedRaw0;
    let tagged: TaggerResult;
    try {
      tagged = parseJsonLoose(taggedRaw) as TaggerResult;
    } catch (parseErr) {
      const retryOn = getConfig().card?.llm_json_retry === true;
      if (!retryOn) throw parseErr;
      if (await cancelJobIfStale(jobId, 'superseded before json retry')) return;
      const errMsg = String((parseErr as Error)?.message || parseErr).slice(0, 800);
      dbg('job.tagger.json_retry', { err: errMsg.slice(0, 160), raw_len: String(taggedRaw || '').length }, 'warn');
      await setJob(jobId, 'tagging', {
        phase: 'tagging',
        progress: 0.28,
        message: '태거 JSON 오류 → 재시도 중…',
        shot_count: 0,
        shot_done: 0,
        debug_stage: 'job.tagger_json_retry',
      });
      messages.push(
        { role: 'assistant', content: String(taggedRaw || '').slice(0, 12000) },
        {
          role: 'user',
          content:
            `이전 응답 JSON 파싱 실패:\n${errMsg}\nformat 스키마에 맞는 JSON 객체 하나만 다시 출력하세요.`,
        },
      );
      taggedRaw = await callLlm(resolveLlmRole(getConfig(), 'main'), messages);
      if (await cancelJobIfStale(jobId, 'superseded after json retry')) return;
      tagged = parseJsonLoose(taggedRaw) as TaggerResult;
    }
    let shots = flattenShots(tagged, request.assistant_text);
    dbg('job.tagger.done', { shots: shots.length, raw_len: String(taggedRaw || '').length });
    if (!shots.length) throw new Error('태거가 shot을 반환하지 않았습니다.');
    const card = getConfig().card || {};
    const imageMin = Math.max(1, Number(card.image_min ?? 1));
    const imageMax = Math.max(imageMin, Number(card.image_max ?? 3));
    shots = shots.slice(0, imageMax);

    const curationMode = getCurationMode();
    if (curationMode === 'two_stage') {
      await setJob(jobId, 'tagging', {
        phase: 'tagging',
        progress: 0.35,
        message: '큐레이션 2단 씬 태그 보강 중…',
        shot_count: shots.length,
        shot_done: 0,
        debug_stage: 'job.curation_refine',
      });
      if (await cancelJobIfStale(jobId, 'superseded during curation refine')) return;
      // One LLM call for all shots — not per image. Chat context = pass-1 user text (cache).
      await refineShotsWithCuration(shots as unknown as Record<string, unknown>[], { chatContext });
    } else if (curationMode === 'embed_snap') {
      await setJob(jobId, 'tagging', {
        phase: 'tagging',
        progress: 0.4,
        message: '씬 태그 임베딩 매칭 중…',
        shot_count: shots.length,
        shot_done: 0,
        debug_stage: 'job.curation_snap',
      });
      if (await cancelJobIfStale(jobId, 'superseded during curation snap')) return;
      // One embedding batch for all shots' scene tags.
      const result = await snapShotsSceneTags(shots as unknown as Record<string, unknown>[]);
      if (!result.ok) {
        dbg('job.curation_snap.fallback', { message: result.reason }, 'warn');
        await setJob(jobId, 'tagging', {
          phase: 'tagging',
          progress: 0.45,
          message: result.reason || '임베딩 없음 → 큐레이션 없이 생성',
          shot_count: shots.length,
          shot_done: 0,
          debug_stage: 'job.curation_snap_fallback',
        });
      }
    }

    const allChars = shots.flatMap((shot) => shot.characters || []);
    const roster = await mergeRosterFromTagged({
      sessionId,
      tagged,
      shotChars: allChars,
      unifiedSessionId,
      characterId,
      sourceSessionIds,
    });
    dbg('job.roster', { roster: roster.length });
    const charMax = characterMaxLimit(card);
    for (const shot of shots) {
      shot.characters = dedupeShotCharacters(shot.characters || [], roster, charMax);
    }
    const wearByName = applyWearContinuityToShots(shots, (name) => resolveCharacter(name, roster)?.wear_state);
    await persistChatWearStates(sessionId, roster, wearByName);


    if (await cancelJobIfStale(jobId, 'superseded before generate')) return;
    const pendingMessageIndex =
      request.message_index != null ? toInt(request.message_index, -1) : -1;
    const pendingInline = shots
      .map((shot, i) => {
        const line = Math.floor(Number((shot as { line?: unknown }).line));
        if (!Number.isFinite(line) || line < 1) return null;
        return { shot_index: i, line };
      })
      .filter((row): row is { shot_index: number; line: number } => !!row);
    await setJob(
      jobId,
      'generating',
      progressPayload({
        shot_count: shots.length,
        shot_index: 0,
        shot_done: 0,
        progress: 0,
        phase: 'generating',
        message: `이미지 1/${shots.length} 생성 준비`,
        pending_inline: pendingInline,
        pending_message_index: pendingMessageIndex,
      }),
    );

    const cards: Array<Record<string, unknown> | undefined> = new Array(shots.length);
    const wantAnchor = Boolean(card.llm_anchor_percent);
    // After unzip, reveal (publish + spinner→image) starts immediately and in
    // parallel across shots — do not serialize behind an earlier shot's idb.
    // Next NAI still overlaps those reveals. Drain before done/cancel/discard.
    const shotSaveTasks: Promise<void>[] = [];
    shotSaveFailed = null;
    const drainSaves = async (): Promise<void> => {
      pendingShotSave = Promise.all(shotSaveTasks).then(() => undefined);
      await pendingShotSave;
    };
    const cardsDone = (): number => cards.reduce((n, c) => n + (c ? 1 : 0), 0);

    for (let idx = 0; idx < shots.length; idx += 1) {
      if (shotSaveFailed) throw shotSaveFailed;
      // Prior saves must finish before discard so publishedIds is complete.
      if (!isJobCurrent(jobId)) {
        await drainSaves();
        if (await cancelJobIfStale(jobId, `superseded before shot ${idx + 1}`)) return;
      }
      const shot = shots[idx];
      const { main, neg, captions, meta } = await buildGenerationForShot({ shot, roster });
      const cardId = uuid();
      const now = Date.now() / 1000;
      // Resolve hash at reveal time (below) so mid-job retarget/sibling rebind is fresh.
      // The LLM's anchor is always stored when present; the setting only affects
      // how it is used at display time.
      let yPercent = shotAnchorPercent(shot);
      // With anchoring on but no LLM value, fall back to an equal band start so
      // the sticky-pin logic still has a threshold to compare against.
      if (yPercent == null && wantAnchor) {
        yPercent = Math.round((idx / Math.max(1, shots.length)) * 10000) / 100;
      }

      dbg('job.shot.prepare', {
        shot: idx,
        card_id: cardId,
        prompt_len: String(main || '').length,
        captions: (captions || []).length,
      });
      await setJob(
        jobId,
        'generating',
        progressPayload({
          shot_count: shots.length,
          shot_index: idx,
          shot_done: cardsDone(),
          progress: Math.round((idx / Math.max(1, shots.length)) * 1000) / 10,
          phase: 'generating',
          message: `NovelAI 요청 중 ${idx + 1}/${shots.length}… [${getFocusStage()}]`,
          pending_inline: pendingInline,
        pending_message_index: pendingMessageIndex,
        }),
      );

      let hbTicks = 0;
      const hb = setInterval(() => {
        hbTicks += HEARTBEAT_MS / 1000;
        const lastByteAt = getNaiLastByteAt();
        if (
          hasNaiBodyControl() &&
          getNaiBodyBytesReceived() >= NAI_MIN_BODY_BYTES &&
          lastByteAt &&
          Date.now() - lastByteAt >= NAI_IDLE_FINISH_MS
        ) {
          forceFinishNaiBody('heartbeat-idle');
        }
        const kb = getNaiBodyBytesReceived() || getNaiBodyBytesExpected();
        setJob(
          jobId,
          'generating',
          progressPayload({
            shot_count: shots.length,
            shot_index: idx,
            shot_done: cardsDone(),
            progress: Math.round((idx / Math.max(1, shots.length)) * 1000) / 10,
            phase: 'generating',
            message: `NovelAI 대기 ${idx + 1}/${shots.length} (${hbTicks}s) · ${getFocusStage()}${
              kb ? ` ${Math.round(kb / 1024)}KB` : ''
            }`,
            pending_inline: pendingInline,
        pending_message_index: pendingMessageIndex,
          }),
        ).catch(() => {});
      }, HEARTBEAT_MS);

      let raw: ArrayBuffer;
      let seed: number;
      try {
        // Not cancelled mid-flight on purpose: the image is already being paid
        // for, so let it land and discard afterwards if the job went stale.
        ({ bytes: raw, seed } = await generateImage(
          { main, neg, captions, characters: meta.characters },
          shot.aspect,
        ));
      } finally {
        clearInterval(hb);
      }
      dbg('job.shot.nai_done', { shot: idx, bytes: raw?.byteLength || 0, seed });

      // Supersession: drop without saving. User soft-stop: save this paid shot, then exit.
      {
        const metaAfterNai = jobRunMeta.get(jobId);
        if (!isJobCurrent(jobId) && !metaAfterNai?.userStop) {
          await drainSaves();
          if (await cancelJobIfStale(jobId, `superseded after shot ${idx + 1} nai`)) return;
        }
      }

      // Reveal as soon as PNG bytes exist — do not wait on another shot's persist.
      // Next loop iteration may already be on NovelAI while this runs.
      const saveP = (async () => {
        await setJob(
          jobId,
          'generating',
          progressPayload({
            shot_count: shots.length,
            shot_index: idx,
            shot_done: cardsDone(),
            progress: Math.round(((idx + 0.5) / Math.max(1, shots.length)) * 1000) / 10,
            phase: 'generating',
            message: `이미지 반영 중 ${idx + 1}/${shots.length}… [${getFocusStage()}]`,
            pending_inline: pendingInline,
            pending_message_index: pendingMessageIndex,
          }),
        );
        const inherited = await resolveJobContentHash(jobId, cleanText(request.content_hash || ''));
        const contentHash = inherited.contentHash;
        const assistantPreview =
          inherited.assistantPreview || cleanText(request.assistant_text || '', ASSISTANT_PREVIEW_LIMIT);
        const location = buildImageLocation({
          imageId: cardId,
          sessionId,
          request,
          shotIndex: idx,
          paragraph: shot.paragraph,
          yPercent,
          line: (() => {
            const n = Math.floor(Number((shot as { line?: unknown }).line));
            return Number.isFinite(n) && n >= 1 ? n : null;
          })(),
          contentHash,
          assistantPreview,
        });
        // publishImage = webp + image row + URL — spinner can flip after this.
        await publishImage(cardId, raw, location);
        const runMeta = jobRunMeta.get(jobId);
        if (runMeta) runMeta.publishedIds.push(cardId);
        const cardMeta = {
          ...cardMetaFromLocation(meta, location, raw?.byteLength || 0),
          aspect: shot.aspect || undefined,
        };
        cards[idx] = {
          id: cardId,
          shot_index: idx,
          paragraph: location.paragraph,
          y_percent: location.y_percent,
          line: location.line,
          message_index: location.message_index ?? -1,
          message_role: location.message_role || '',
          content_hash: location.content_hash || '',
          character_id: location.character_id || '',
          chat_id: location.chat_id || '',
          character_name: location.character_name || '',
          chat_name: location.chat_name || '',
          char_index: location.char_index ?? -1,
          chat_index: location.chat_index ?? -1,
          assistant_preview: assistantPreview,
          main_prompt: main,
          negative_prompt: neg,
          characters: meta.characters || [],
          image_url: resolveImageUrl(cardId),
          seed,
          storage: 'indexeddb',
          png_bytes: raw?.byteLength || 0,
        };
        const done = cardsDone();
        dbg('job.shot.revealed', { shot: idx, card_id: cardId, has_url: Boolean(resolveImageUrl(cardId)) });
        await setJob(
          jobId,
          'generating',
          progressPayload({
            shot_count: shots.length,
            shot_index: idx,
            shot_done: done,
            progress: Math.round((done / Math.max(1, shots.length)) * 1000) / 10,
            phase: 'generating',
            message: `이미지 ${idx + 1}/${shots.length} 완료`,
            cards_so_far: done,
            pending_inline: pendingInline,
            pending_message_index: pendingMessageIndex,
          }),
        );
        // Card row persist can trail the visible swap; next NAI already overlaps.
        await idbPut('cards', {
          id: cardId,
          job_id: jobId,
          session_id: sessionId,
          shot_index: idx,
          paragraph: Number(shot.paragraph || 0),
          main_prompt: main,
          negative_prompt: neg,
          characters_json: JSON.stringify(meta.characters || []),
          seed,
          meta_json: JSON.stringify(cardMeta),
          created_at: now,
        });
        dbg('job.shot.saved', { shot: idx, card_id: cardId });
      })().catch((err) => {
        shotSaveFailed = err;
        throw err;
      });
      shotSaveTasks.push(saveP);
      pendingShotSave = Promise.all(shotSaveTasks).then(() => undefined);

      // Soft-stop / supersession after queueing this paid save: flush then exit.
      if (!isJobCurrent(jobId)) {
        await drainSaves();
        if (await cancelJobIfStale(jobId, `superseded after shot ${idx + 1} save`)) return;
      }
    }
    await drainSaves();
    if (shotSaveFailed) throw shotSaveFailed;
    if (await cancelJobIfStale(jobId, 'superseded before done')) return;
    const finalCards = cards.filter((c): c is Record<string, unknown> => Boolean(c));
    const result = {
      cards: finalCards,
      message_index: request.message_index != null ? Number(request.message_index) : -1,
      shot_count: shots.length,
      shot_done: shots.length,
      progress: 100,
      phase: 'done',
      message: `이미지 ${shots.length}/${shots.length} 완료`,
      // Done = no spinners. Leaving pending_inline here kept circles on finished bubbles.
    };
    await attachImageUrls(result);
    await setJob(jobId, 'done', result);
    // The run succeeded, so its cards are the user's now and must survive any
    // later supersession of this job id.
    const doneMeta = jobRunMeta.get(jobId);
    if (doneMeta) doneMeta.publishedIds = [];
    jobSpan.end({ message: 'done', cards: finalCards.length });
  } catch (exc) {
    try {
      await pendingShotSave;
    } catch {
      /* prefer the primary error below */
    }
    jobSpan.fail(exc);
    const err = exc as Error;
    const errText = `${err?.message || exc}\n${err?.stack || ''}`.slice(-1500);
    await setJob(
      jobId,
      'error',
      {
        phase: 'error',
        message: String(err?.message || exc).slice(0, 240),
        debug_stage: getLastStage(),
        debug_tail: eventsForJob(jobId, 12),
      },
      errText,
    );
  } finally {
    setJobContext(prevCtx);
  }
}