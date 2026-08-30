/**
 * NovelAI Comment / stealth blob → scene + T2iRequest.
 * Used to replay a saved image (new seed) without the settings tab.
 */
import type { T2iRequest } from '../../providers/nai/payload.ts';
import { cleanText } from '../../core/util/text.ts';
import { negativeFromNaiMetadata } from './from-metadata.ts';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const t = value.trim();
  if (!t || (t[0] !== '{' && t[0] !== '[')) return value;
  try {
    return JSON.parse(t);
  } catch {
    return value;
  }
}

function num(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function commentRoot(meta: unknown): Record<string, unknown> {
  let root = parseMaybeJson(meta);
  const rootObj = asRecord(root) || {};
  const comment = parseMaybeJson(rootObj.Comment ?? rootObj.comment);
  return asRecord(comment) || rootObj;
}

export interface NaiSceneChar {
  prompt: string;
  uc: string;
  center_x: number;
  center_y: number;
}

export interface NaiScene {
  main: string;
  negative: string;
  characters: NaiSceneChar[];
  width: number;
  height: number;
  steps: number;
  cfg_scale: number;
  cfg_rescale: number;
  sampler: string;
  scheduler: string;
  model: string;
  seed?: number;
  /** Set by studio overrides. Absent → infer from non-0.5 centers. */
  use_coords?: boolean;
}

function captionChars(caption: unknown, negCaption: unknown): NaiSceneChar[] {
  const pos = asRecord(caption);
  const neg = asRecord(negCaption);
  const posList = Array.isArray(pos?.char_captions ?? pos?.charCaptions)
    ? (pos!.char_captions ?? pos!.charCaptions) as unknown[]
    : [];
  const negList = Array.isArray(neg?.char_captions ?? neg?.charCaptions)
    ? (neg!.char_captions ?? neg!.charCaptions) as unknown[]
    : [];
  const out: NaiSceneChar[] = [];
  for (let i = 0; i < posList.length; i += 1) {
    const row = asRecord(posList[i]);
    if (!row) continue;
    const text = cleanText(row.char_caption ?? row.charCaption ?? row.caption ?? '', 8000);
    const n = asRecord(negList[i]);
    const uc = cleanText(n?.char_caption ?? n?.charCaption ?? n?.caption ?? '', 4000);
    if (!text && !uc) continue;
    const centers = Array.isArray(row.centers) ? asRecord(row.centers[0]) : null;
    out.push({
      prompt: text || 'girl',
      uc,
      center_x: num(centers?.x ?? row.center_x, 0.5),
      center_y: num(centers?.y ?? row.center_y, 0.5),
    });
  }
  return out;
}

/** Map PNG Source / Software labels to an API model name. */
export function modelFromNaiSource(source: unknown): string {
  const s = cleanText(source).toLowerCase();
  if (!s) return '';
  if (s.includes('5-curated') || s.includes('v5 curated') || s.includes('nai diffusion 5 curated')) {
    return 'nai-diffusion-5-curated';
  }
  if (s.includes('nai-diffusion-5') || s.includes('v5') || s.includes('nai diffusion 5')) {
    return 'nai-diffusion-5-full';
  }
  if (s.includes('4-5') || s.includes('4.5') || s.includes('v4.5')) return 'nai-diffusion-4-5-full';
  if (s.includes('nai-diffusion-4') || s.includes('v4')) return 'nai-diffusion-4-full';
  if (s.includes('nai-diffusion-3') || s.includes('v3')) return 'nai-diffusion-3';
  return '';
}

/**
 * Split base vs char captions. Do not join them — the tag popup base field
 * is the scene only.
 */
export function sceneFromNaiMetadata(meta: unknown): NaiScene {
  const root = asRecord(parseMaybeJson(meta)) || {};
  const comment = commentRoot(meta);
  const v4 = asRecord(comment.v4_prompt ?? comment.v4Prompt ?? root.v4_prompt);
  const v4neg = asRecord(comment.v4_negative_prompt ?? comment.v4NegativePrompt ?? root.v4_negative_prompt);
  const cap = asRecord(v4?.caption) || asRecord(comment.caption);
  const negCap = asRecord(v4neg?.caption);
  const base = cleanText(
    cap?.base_caption ?? cap?.baseCaption ?? comment.prompt ?? comment.Prompt ?? '',
    20000,
  );
  const source = root.Source ?? root.source ?? comment.Source ?? comment.source;
  const model = cleanText(comment.model ?? root.model ?? '', 200)
    || modelFromNaiSource(source);
  const seedRaw = Number(comment.seed ?? root.seed);
  const seed = Number.isFinite(seedRaw) && seedRaw > 0 ? Math.floor(seedRaw) : 0;
  return {
    main: base,
    negative: negativeFromNaiMetadata(meta),
    characters: captionChars(cap, negCap),
    width: Math.max(64, Math.floor(num(comment.width, 832))),
    height: Math.max(64, Math.floor(num(comment.height, 1216))),
    steps: Math.max(1, Math.floor(num(comment.steps, 28))),
    cfg_scale: num(comment.scale ?? comment.cfg_scale, 5),
    cfg_rescale: num(comment.cfg_rescale ?? comment.cfgRescale, 0),
    sampler: cleanText(comment.sampler, 80) || 'k_euler_ancestral',
    scheduler: cleanText(comment.noise_schedule ?? comment.noiseSchedule ?? comment.scheduler, 80) || 'karras',
    model,
    ...(seed ? { seed } : {}),
  };
}

/** Comic pages bake `Nkoma` into the base caption. */
export function isComicNaiScene(scene: Pick<NaiScene, 'main'>): boolean {
  return /\d+\s*koma\b/i.test(scene.main) || /::\d+koma::/i.test(scene.main);
}

export function t2iRequestFromScene(scene: NaiScene, seed: number): T2iRequest {
  return {
    prompt: scene.main,
    negative_prompt: scene.negative,
    width: scene.width,
    height: scene.height,
    seed,
    steps: scene.steps,
    cfg_scale: scene.cfg_scale,
    cfg_rescale: scene.cfg_rescale,
    sampler: scene.sampler,
    scheduler: scene.scheduler,
    model: scene.model,
    use_coords: typeof scene.use_coords === 'boolean'
      ? scene.use_coords
      : scene.characters.some((c) => c.center_x !== 0.5 || c.center_y !== 0.5),
    characters: scene.characters.map((c) => ({
      name: '',
      prompt: c.prompt,
      uc: c.uc,
      center_x: c.center_x,
      center_y: c.center_y,
    })),
  };
}

/** Prompt / size / model / coord flags from the tag studio generate body. */
export function applyNaiSceneOverrides(scene: NaiScene, ov: Record<string, unknown> | null | undefined): void {
  if (!ov) return;
  if ('main_prompt' in ov) {
    const main = cleanText(ov.main_prompt || '', 8000);
    if (main) scene.main = main;
  }
  if ('negative_prompt' in ov && cleanText(ov.negative_prompt || '', 8000)) {
    scene.negative = cleanText(ov.negative_prompt || '', 8000);
  }
  const model = cleanText(ov.model, 200);
  if (model) scene.model = model;
  const width = Math.floor(Number(ov.width));
  const height = Math.floor(Number(ov.height));
  if (Number.isFinite(width) && width >= 64) scene.width = width;
  if (Number.isFinite(height) && height >= 64) scene.height = height;
  if (ov.steps !== '' && ov.steps != null) {
    const steps = Math.floor(Number(ov.steps));
    if (Number.isFinite(steps) && steps >= 1) scene.steps = steps;
  }
  if (ov.cfg_scale != null && ov.cfg_scale !== '') {
    const cfg = Number(ov.cfg_scale);
    if (Number.isFinite(cfg)) scene.cfg_scale = cfg;
  }
  if (ov.cfg_rescale != null && ov.cfg_rescale !== '') {
    const rescale = Number(ov.cfg_rescale);
    if (Number.isFinite(rescale)) scene.cfg_rescale = rescale;
  }
  const sampler = cleanText(ov.sampler, 80);
  if (sampler) scene.sampler = sampler;
  const scheduler = cleanText(ov.scheduler, 80);
  if (scheduler) scene.scheduler = scheduler;
  if ('use_coords' in ov) scene.use_coords = ov.use_coords === true;
  if (Array.isArray(ov.characters)) {
    scene.characters = ov.characters.slice(0, 6).map((raw) => {
      const c = asRecord(raw) || {};
      return {
        prompt: cleanText(c.prompt, 8000),
        uc: cleanText(c.uc, 4000),
        center_x: num(c.center_x, 0.5),
        center_y: num(c.center_y, 0.5),
      };
    }).filter((c) => c.prompt || c.uc);
  }
}

export function randomNaiSeed(): number {
  return Math.floor(Math.random() * 4294967295) || 1;
}
