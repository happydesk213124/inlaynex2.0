/**
 * Shared application state.
 *
 * 1.x kept all of this on a single 92-method `InlayNexus` instance, so every
 * feature could reach every other feature's internals and nothing could be
 * tested in isolation. The state itself is genuinely process-wide though — one
 * settings object, one job registry — so it lives here as an explicit module
 * with narrow accessors, and services import only the pieces they need.
 *
 * Nothing in this module may import a service, which keeps the dependency graph
 * pointing one way: services -> context -> storage -> core.
 */

import { DEFAULT_CONFIG } from '../config/defaults';
import type { Settings } from '../core/types';
import { Mutex } from '../core/util/async';
import { deepcopy } from '../core/util/object';

// ── settings ───────────────────────────────────────────────────────────────

let config: Settings = deepcopy(DEFAULT_CONFIG);

/**
 * Live settings. Callers read freely but must never mutate the result; use
 * `updateConfig` so persistence and derived caches stay consistent.
 */
export function getConfig(): Settings {
  return config;
}

export function setConfig(next: Settings): void {
  config = next;
}

/**
 * Serialises read-modify-write cycles on settings. Two concurrent updates
 * without this would each merge onto their own snapshot and the later write
 * would silently discard the earlier one.
 */
export const configLock = new Mutex();

// ── job bookkeeping ────────────────────────────────────────────────────────

export interface JobEpoch {
  epoch: number;
  jobId: string;
}

export interface JobRunMeta {
  key: string;
  epoch: number;
  cancelRequested: boolean;
  publishedIds: string[];
}

/**
 * Per-target generation epoch. A "target" is a message slot; starting a new job
 * for a slot bumps its epoch, which is how a superseded run detects that its
 * results are no longer wanted and must not be published.
 */
export const jobEpochByKey = new Map<string, JobEpoch>();

export const jobRunMeta = new Map<string, JobRunMeta>();

/** Message-level reroll lock. Distinct from jobs: no epoch, no shots. */
export const messageBusyKeys = new Set<string>();

// ── preview data URLs for the two singleton reference images ────────────────

let refPreviewUrl = '';
let vibePreviewUrl = '';

export function getRefPreviewUrl(): string {
  return refPreviewUrl;
}

export function setRefPreviewUrl(url: string): void {
  refPreviewUrl = url;
}

export function getVibePreviewUrl(): string {
  return vibePreviewUrl;
}

export function setVibePreviewUrl(url: string): void {
  vibePreviewUrl = url;
}

/** Test seam: returns the module to its post-import state. */
export function resetContext(): void {
  config = deepcopy(DEFAULT_CONFIG);
  jobEpochByKey.clear();
  jobRunMeta.clear();
  messageBusyKeys.clear();
  refPreviewUrl = '';
  vibePreviewUrl = '';
}
