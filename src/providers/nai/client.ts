/** NovelAI generate-image and account endpoints. */
import { ANLAS_URL } from '../../core/constants.ts';
import { dbg, dbgSpan } from '../../core/debug.ts';
import { Mutex } from '../../core/util/async.ts';
import { isPngBytes } from '../../core/util/bytes.ts';
import { unzipFirstEntry } from '../../core/util/zip.ts';
import { naiPost, networkFetch, type NaiPostOptions } from './http.ts';
import { buildBaseParameters, resolveModel, type T2iRequest } from './payload.ts';

/**
 * NovelAI rejects overlapping generations, so this lane serialises every one we
 * make. It lives here rather than in a caller because it is a property of the
 * upstream API: two callers generate images — the job pipeline and the
 * diagnostics probe — and a lane owned by either would leave the other
 * unserialised, letting a "test generation" collide with the image a user is
 * waiting on.
 *
 * 1.x shared one lock with the ComfyUI lane and stole it after 8s of contention,
 * which is shorter than a normal generation, so under load that lock did nothing.
 * This lane is NovelAI-only and never stolen; `naiPost` carries its own wall-clock
 * watchdog, so a wedged request cannot hold it open.
 */
const naiLane = new Mutex();

export interface T2iResult {
  raw_bytes: ArrayBuffer;
  seed: number;
}

export interface AnlasBalance {
  fixed: number;
  purchased: number;
  total: number;
  opus: boolean;
}

interface SubscriptionPayload {
  trainingStepsLeft?: {
    fixedTrainingStepsLeft?: number;
    purchasedTrainingSteps?: number;
  };
  perks?: { unlimitedMaxPriority?: boolean };
}

/**
 * Runs one text-to-image generation and unzips the single image NAI returns.
 *
 * The lane only covers the HTTP round-trip — NovelAI rejects overlapping
 * generations, but unzip is local CPU and must not delay the next request.
 */
export async function generateT2i(
  token: string,
  req: T2iRequest,
  apiUrl: string,
  opts: NaiPostOptions = {},
): Promise<T2iResult> {
  const payload = {
    input: req.prompt,
    model: resolveModel(req.model),
    action: 'generate',
    parameters: buildBaseParameters(req),
  };
  dbg('nai.generate.start', {
    message: payload.model,
    prompt_len: String(req.prompt || '').length,
    chars: (req.characters || []).length,
    has_char_refs: Boolean(req.character_refs?.length),
    has_vibes: Boolean(req.vibes?.length),
  });
  const zipBytes = await naiLane.run(() => naiPost(token, payload, apiUrl, opts));
  const spanUnzip = dbgSpan('nai.unzip');
  try {
    const rawBytes = await unzipFirstEntry(new Uint8Array(zipBytes));
    const isPng = isPngBytes(new Uint8Array(rawBytes));
    spanUnzip.end({ bytes: rawBytes?.byteLength || 0, is_png: isPng, zip_bytes: zipBytes?.byteLength || 0 });
    if (!isPng) dbg('nai.unzip', { message: 'unzipped but not PNG magic', bytes: rawBytes?.byteLength || 0 }, 'warn');
    return { raw_bytes: rawBytes, seed: req.seed || 0 };
  } catch (err) {
    spanUnzip.fail(err, { zip_bytes: zipBytes?.byteLength || 0 });
    throw err;
  }
}

/** Reads the account's remaining Anlas and Opus status. */
export async function getAnlas(token: string): Promise<AnlasBalance> {
  const resp = await networkFetch(ANLAS_URL, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  const status = Number(resp?.status || 0);
  if (status === 401) throw new Error('인증 실패 (401). API 토큰을 확인하세요.');
  if (status >= 400) throw new Error(`Anlas 조회 실패: HTTP ${status}`);
  const data = await (resp as { json(): Promise<SubscriptionPayload> }).json();
  const steps = data.trainingStepsLeft || {};
  const fixed = steps.fixedTrainingStepsLeft || 0;
  const purchased = steps.purchasedTrainingSteps || 0;
  const opus = data.perks?.unlimitedMaxPriority || false;
  return { fixed, purchased, total: fixed + purchased, opus };
}
