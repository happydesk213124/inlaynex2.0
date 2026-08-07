/**
 * Pure helpers for shot-tag "명령 수정" — merge LLM rewrite output into the
 * form fields the UI shows (textareas only; no image generation here).
 */

import { cleanText, joinTags } from '../../core/util/text.ts';
import { recoverSceneFromMain } from './reroll-setup.ts';

export type CommandRewriteCharIn = {
  name?: unknown;
  prompt?: unknown;
  action?: unknown;
  uc?: unknown;
  center_x?: unknown;
  center_y?: unknown;
};

export type CommandRewriteLlmChar = {
  index?: unknown;
  name?: unknown;
  prompt?: unknown;
  action?: unknown;
  uc?: unknown;
};

export type CommandRewriteCharOut = {
  name: string;
  prompt: string;
  action: string;
  uc: string;
  center_x: number;
  center_y: number;
};

/**
 * Look-locked: keep prior caption tags; append LLM action (expression/pose).
 * Unlocked: prefer LLM full prompt, else prior + action.
 */
export function mergeLookLockedCaption(
  previousPrompt: unknown,
  llmPrompt: unknown,
  llmAction: unknown,
  lookLocked: boolean,
): string {
  const prev = cleanText(previousPrompt, 4000);
  const action = cleanText(llmAction, 800);
  if (lookLocked) return joinTags(prev, action) || prev;
  const next = cleanText(llmPrompt, 4000);
  if (next) return joinTags(next, action) || next;
  return joinTags(prev, action) || prev;
}

export function mergeCommandRewriteCharacters(
  current: CommandRewriteCharIn[],
  llmChars: CommandRewriteLlmChar[] | unknown,
  lookLocked: boolean[],
): CommandRewriteCharOut[] {
  const llmList = Array.isArray(llmChars) ? llmChars : [];
  const byIndex = new Map<number, CommandRewriteLlmChar>();
  for (const raw of llmList) {
    if (!raw || typeof raw !== 'object') continue;
    const idx = Math.floor(Number((raw as CommandRewriteLlmChar).index));
    if (!Number.isFinite(idx) || idx < 0) continue;
    byIndex.set(idx, raw as CommandRewriteLlmChar);
  }

  return current.map((ch, i) => {
    const llm = byIndex.get(i);
    const locked = lookLocked[i] === true;
    const prevPrompt = cleanText(ch.prompt, 4000);
    const prompt = mergeLookLockedCaption(prevPrompt, llm?.prompt, llm?.action, locked);
    return {
      name: cleanText(llm?.name ?? ch.name, 200),
      prompt: prompt || 'girl',
      action: cleanText(llm?.action ?? ch.action, 800),
      uc: cleanText(llm?.uc ?? ch.uc, 2000),
      center_x: Number(ch.center_x ?? 0.5),
      center_y: Number(ch.center_y ?? 0.5),
    };
  });
}

/**
 * Prefer an explicit LLM `main_prompt`. Else splice `setup` into the form main:
 * with a selected style positive, rebuild as style+setup (UI re-applies person);
 * otherwise replace the recovered scene chunk inside the current main.
 */
export function mergeCommandRewriteMain(args: {
  currentMain: string;
  setup?: unknown;
  mainPrompt?: unknown;
  stylePositive?: unknown;
  person?: unknown;
  stylePositives?: readonly string[];
  qualitySuffixes?: readonly string[];
}): string {
  const explicit = cleanText(args.mainPrompt, 8000);
  if (explicit) return explicit;
  const setup = cleanText(args.setup, 8000);
  if (!setup) return cleanText(args.currentMain, 8000);
  const style = cleanText(args.stylePositive, 8000);
  if (style) return joinTags(style, setup);
  const scene = recoverSceneFromMain(
    args.currentMain,
    cleanText(args.person || ''),
    args.stylePositives || [],
    args.qualitySuffixes || [],
  );
  const cur = cleanText(args.currentMain, 8000);
  if (scene && cur.includes(scene)) return cleanText(cur.replace(scene, setup), 8000);
  return setup;
}

/** Fixed seed for generation when > 0; otherwise 0 (caller randomises). */
export function resolveGenerationSeed(planSeed: unknown, naiSeed: unknown = 0): number {
  const plan = Number(planSeed);
  if (Number.isFinite(plan) && plan > 0) return Math.floor(plan);
  const nai = Number(naiSeed ?? 0);
  if (Number.isFinite(nai) && nai > 0) return Math.floor(nai);
  return 0;
}
