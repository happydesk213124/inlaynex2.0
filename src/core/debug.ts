/**
 * Diagnostics ring buffer.
 *
 * The debug panel is often the only view a user can give us when generation
 * fails, so this stays deliberately chatty. It is bounded (`DEBUG_MAX`) and holds
 * only clipped scalars, so the cost is fixed.
 */
import { DEBUG_MAX, VERSION } from './constants.ts';
import { risuHost } from './host.ts';

export type DebugLevel = 'info' | 'warn' | 'error';

export interface DebugDetail {
  readonly ms?: number;
  readonly bytes?: number;
  readonly status?: unknown;
  readonly message?: unknown;
  readonly job_id?: string;
  /** Background noise: recorded, but never becomes the focus stage. */
  readonly background?: boolean;
  /** Force this stage to become the focus stage. */
  readonly focus?: boolean;
  readonly [key: string]: unknown;
}

export interface DebugEvent {
  t: number;
  iso: string;
  stage: string;
  level: DebugLevel;
  job_id: string;
  ms?: number | undefined;
  bytes?: number | undefined;
  status?: unknown;
  message?: unknown;
  detail: Record<string, unknown>;
}

/** Keys lifted onto the event itself rather than into `detail`. */
const HOISTED = new Set(['ms', 'bytes', 'status', 'message', 'job_id', 'background', 'focus']);

const events: DebugEvent[] = [];
let jobCtx = '';
let lastError: { stage: string; message: string; t: number } | null = null;
let lastStage = 'boot';
/** The job heartbeat shows this, so background storage churn must not claim it. */
let focusStage = 'boot';

/** Counts the debug snapshot reports; injected to avoid a storage→debug import cycle. */
let countsProvider: (() => Record<string, number>) | null = null;
export const setDebugCounts = (fn: () => Record<string, number>): void => { countsProvider = fn; };

export const setJobContext = (jobId: string): void => { jobCtx = jobId; };
export const getJobContext = (): string => jobCtx;
export const getFocusStage = (): string => focusStage;
export const getLastStage = (): string => lastStage;
export const getLastError = (): { stage: string; message: string; t: number } | null => lastError;
/** Ring-buffer occupancy, reported by the health payload. */
export const getEventCount = (): number => events.length;

/**
 * The tail of a job's own events. Attached to job results so a failure report
 * carries its own trace instead of whatever happened to be logged last.
 */
export const eventsForJob = (jobId: string, limit: number): DebugEvent[] =>
  events.filter((e) => e.job_id === jobId).slice(-limit);

const clip = (value: unknown, max = 280): unknown => {
  if (value == null) return value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  let s: string;
  if (typeof value === 'string') s = value;
  else {
    try { s = JSON.stringify(value) ?? String(value); } catch { s = String(value); }
  }
  return s.length <= max ? s : `${s.slice(0, max)}…(+${s.length - max})`;
};

/** Stage prefixes that represent user-visible progress. */
const isProgressStage = (stage: string): boolean =>
  stage.startsWith('job.') || stage.startsWith('nai.') || stage.startsWith('llm.') || stage.startsWith('image.');

export function dbg(stage: string, detail: DebugDetail = {}, level: DebugLevel = 'info'): DebugEvent {
  const entry: DebugEvent = {
    t: Date.now(),
    iso: new Date().toISOString(),
    stage: String(stage || ''),
    level,
    job_id: jobCtx || detail.job_id || '',
    ms: detail.ms != null ? Number(detail.ms) : undefined,
    bytes: detail.bytes != null ? Number(detail.bytes) : undefined,
    status: detail.status != null ? detail.status : undefined,
    message: detail.message != null ? clip(detail.message, 240) : undefined,
    detail: {},
  };

  for (const [k, v] of Object.entries(detail)) {
    if (HOISTED.has(k)) continue;
    entry.detail[k] = v == null || typeof v === 'number' || typeof v === 'boolean' ? v : clip(v, 220);
  }

  events.push(entry);
  while (events.length > DEBUG_MAX) events.shift();

  lastStage = entry.stage;
  if (detail.focus || (!detail.background && isProgressStage(entry.stage))) focusStage = entry.stage;
  if (level === 'error') lastError = { stage: entry.stage, message: String(entry.message ?? ''), t: entry.t };

  const line = `[InlayNX:${entry.stage}]`
    + (entry.message ? ` ${String(entry.message)}` : '')
    + (entry.ms != null ? ` ${entry.ms}ms` : '')
    + (entry.bytes != null ? ` ${entry.bytes}B` : '');
  if (level === 'error') console.error(line, entry.detail);
  else if (level === 'warn') console.warn(line, entry.detail);
  else console.log(line, entry.detail);

  return entry;
}

export interface DebugSpan {
  end(detail?: DebugDetail, level?: DebugLevel): DebugEvent;
  fail(err: unknown, detail?: DebugDetail): DebugEvent;
}

export function dbgSpan(stage: string): DebugSpan {
  const t0 = Date.now();
  return {
    end: (detail = {}, level = 'info') => dbg(stage, { ...detail, ms: Date.now() - t0 }, level),
    fail: (err, detail = {}) => dbg(
      stage,
      { ...detail, message: String((err as Error)?.message ?? err), ms: Date.now() - t0 },
      'error',
    ),
  };
}

export function debugSnapshot(): Record<string, unknown> {
  const host = risuHost() ?? {};
  let hidden: boolean | null = null;
  try {
    hidden = typeof document !== 'undefined' ? Boolean(document.hidden) : null;
  } catch { /* no document (tests / worker) */ }

  const recent = events.slice(-80);
  const byStage: Record<string, number> = {};
  for (const e of recent) byStage[e.stage] = (byStage[e.stage] ?? 0) + 1;

  return {
    ok: true,
    version: VERSION,
    now: Date.now(),
    last_stage: lastStage,
    focus_stage: focusStage,
    last_error: lastError,
    job_ctx: jobCtx || null,
    env: {
      has_nativeFetch: typeof host['nativeFetch'] === 'function',
      has_getLocalPluginStorage: typeof host['getLocalPluginStorage'] === 'function',
      has_pluginStorage: Boolean((host['pluginStorage'] as { getItem?: unknown } | undefined)?.getItem),
      has_DecompressionStream: typeof DecompressionStream === 'function',
      has_AbortController: typeof AbortController !== 'undefined',
      document_hidden: hidden,
    },
    counts: { events: events.length, ...(countsProvider?.() ?? {}) },
    by_stage: byStage,
    errors: events.filter((e) => e.level === 'error').slice(-20),
    events: recent,
  };
}

export function clearDebug(): true {
  events.length = 0;
  lastError = null;
  lastStage = 'cleared';
  // `focusStage` is deliberately left alone: it names the operation the job
  // heartbeat is currently reporting, and clearing the log must not blank the
  // progress message of a run that is still going.
  return true;
}
