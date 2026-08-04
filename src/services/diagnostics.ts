/**
 * The four "does my configuration actually work?" probes behind the Models tab.
 *
 * Users paste these results into bug reports verbatim, so the message strings are
 * the module's real output contract — they are copied character-for-character and
 * must not be reworded or reordered.
 *
 * Two of the probes also mutate state, which is unusual for a diagnostics module:
 * `testLlm` persists the credentials the user just typed before testing them (so
 * a successful test leaves a working configuration behind), and
 * `probeNaiGenerate` retags the debug ring buffer while it runs so its events can
 * be told apart from a real job's.
 */

import { API_URL } from '../core/constants';
import { dbg, dbgSpan, debugSnapshot, setJobContext } from '../core/debug';
import { hostHas } from '../core/host';
import type { ApiResult } from '../core/types';
import { asU8, bytesToBase64Async, isPngBytes } from '../core/util/bytes';
import { prepareAutotagImage } from '../core/util/image';
import { deepMerge } from '../core/util/object';
import { cleanText, stripCbs } from '../core/util/text';
import {
  buildComfyPlaceholderValues,
  buildComfyWorkflowFromTemplate,
  comfyBaseUrl,
  comfyConfigured,
  fetchJsonCompat,
  imageBackendKind,
} from '../providers/comfy/client';
import { callLlm } from '../providers/llm/client';
import { normalizeLlmProvider } from '../providers/llm/providers';
import { llmConfigured, normalizeLlmSource, type LlmMessage } from '../providers/llm/transform';
import { generateT2i, getAnlas } from '../providers/nai/client';
import { modelToNaia, type T2iRequest } from '../providers/nai/payload';
import { parseAutotagLookJson } from '../ui-contract/viewer-core';
import { getConfig } from './context';
import { getPrompt, saveConfig } from './settings';

/** The fields of ComfyUI's `/system_stats` the connection test reports back. */
interface ComfySystemStats {
  devices?: Array<{ name?: string }>;
  system?: { os?: string };
}

/**
 * The abbreviated debug block the success paths return. `core/debug` owns the
 * ring buffer and exposes it only through `debugSnapshot()`, so the tail is taken
 * from there rather than from the array itself.
 */
function debugTail(): Record<string, unknown> {
  const snapshot = debugSnapshot();
  const events = snapshot['events'];
  return {
    last_stage: snapshot['last_stage'],
    events: Array.isArray(events) ? events.slice(-20) : [],
  };
}

/**
 * Saves the credentials in `llmOverride` onto the live settings, then runs a
 * one-token round trip. Secrets are only overwritten when non-blank, so the UI
 * can post the whole form back without clearing a stored key it never received.
 */
export async function testLlm(llmOverride: unknown): Promise<ApiResult> {
  if (llmOverride) {
    const config = getConfig();
    const llm: Record<string, unknown> = { ...(llmOverride as Record<string, unknown>) };
    if (cleanText(llm.api_key)) {
      config.llm.api_key = cleanText(llm.api_key);
      delete llm.api_key;
    } else delete llm.api_key;
    delete llm.api_key_configured;
    if (cleanText(llm.service_account_json)) {
      config.llm.service_account_json = cleanText(llm.service_account_json);
      delete llm.service_account_json;
    } else delete llm.service_account_json;
    delete llm.service_account_configured;
    if (Object.keys(llm).length) config.llm = deepMerge(config.llm, llm);
    await saveConfig();
  }
  try {
    const cfg = getConfig().llm;
    const source = normalizeLlmSource(cfg.source);
    const provider = normalizeLlmProvider(cfg.provider);
    if (source === 'custom' && !llmConfigured(cfg)) {
      return {
        ok: false,
        message: provider === 'vertex'
          ? 'Vertex AI: Model + Service Account JSON(또는 access token)이 필요합니다.'
          : '태깅 LLM Model/API key가 비어 있습니다. NovelAI 키가 아니라 태깅용 LLM 키를 넣으세요.',
      };
    }
    if ((source === 'main' || source === 'aux') && !hostHas('runLLMModel')) {
      return { ok: false, message: 'RisuAI runLLMModel API를 사용할 수 없습니다.' };
    }
    const text = await callLlm(cfg, [{ role: 'user', content: 'Reply with exactly: ok' }]);
    return { ok: true, message: `LLM ok (${source}): ${text.slice(0, 120)}` };
  } catch (exc) {
    return { ok: false, message: String((exc as Error)?.message || exc) };
  }
}

/**
 * Checks the configured image backend without spending Anlas or queueing a job.
 * A NovelAI key that cannot read its own Anlas balance still reports `ok: true`:
 * the balance endpoint is flaky and blocked by some proxies, and refusing to
 * generate on that basis would be wrong.
 */
export async function testNai(): Promise<ApiResult> {
  const nai = getConfig().nai;
  if (imageBackendKind(nai) === 'comfy') {
    try {
      if (!comfyConfigured(nai)) {
        return { ok: false, message: 'ComfyUI 워크플로 JSON이 없습니다.', debug: debugSnapshot() };
      }
      // Validate placeholders without submitting a job.
      const values = buildComfyPlaceholderValues({
        main: 'test',
        neg: 'test',
        captions: [{ name: '', prompt: 'char1' }, { name: '', prompt: 'char2' }],
        nai,
        seed: 1,
      });
      const wf = buildComfyWorkflowFromTemplate(nai.comfy_workflow_json, values);
      const baseUrl = comfyBaseUrl(nai);
      const { status, data } = await fetchJsonCompat<ComfySystemStats>(`${baseUrl}/system_stats`, { method: 'GET' });
      if (status >= 400) {
        return {
          ok: false,
          message: `ComfyUI 연결 실패 (HTTP ${status}) · ${baseUrl}`,
          debug: debugSnapshot(),
        };
      }
      const device = data?.devices?.[0]?.name || data?.system?.os || 'ok';
      return {
        ok: true,
        message: `ComfyUI ok · ${baseUrl} · nodes=${Object.keys(wf).length} · ${device}`,
        debug: debugTail(),
      };
    } catch (exc) {
      dbg('comfy.test', { message: String((exc as Error)?.message || exc) }, 'error');
      return { ok: false, message: String((exc as Error)?.message || exc), debug: debugSnapshot() };
    }
  }
  if (!cleanText(nai.api_key)) return { ok: false, message: 'NAI api_key missing', debug: debugSnapshot() };
  try {
    const token = cleanText(nai.api_key);
    try {
      const span = dbgSpan('nai.test.anlas');
      const anlas = await getAnlas(token);
      span.end({ message: 'anlas ok' });
      return { ok: true, message: `NAI token ok · Anlas=${JSON.stringify(anlas)}`, debug: debugTail() };
    } catch (exc) {
      const model = modelToNaia(nai.model || 'nai-diffusion-4-5-full');
      dbg('nai.test.anlas', { message: String((exc as Error)?.message || exc) }, 'warn');
      return {
        ok: true,
        message: `NAI config present · model=${model} · anlas_skip=${(exc as Error)?.message || exc}`,
        debug: debugTail(),
      };
    }
  } catch (exc) {
    // Unreachable in practice: the inner catch already absorbs every failure.
    dbg('nai.test', { message: String((exc as Error)?.message || exc) }, 'error');
    return { ok: false, message: String((exc as Error)?.message || exc), debug: debugSnapshot() };
  }
}

/** Minimal 1-shot NAI generate to locate hang vs auth vs unzip failures. */
export async function probeNaiGenerate(): Promise<ApiResult> {
  const nai = getConfig().nai;
  const token = cleanText(nai.api_key);
  if (!token) return { ok: false, message: 'NAI api_key missing', debug: debugSnapshot() };
  const prevCtx = String(debugSnapshot()['job_ctx'] ?? '');
  setJobContext('probe-nai');
  const span = dbgSpan('nai.probe');
  try {
    dbg('nai.probe.start', { message: 'tiny generate' });
    const req: T2iRequest = {
      prompt: '1girl, solo, simple background, best quality',
      negative_prompt: 'lowres, bad quality',
      width: 512,
      height: 768,
      steps: 10,
      cfg_scale: 5,
      cfg_rescale: 0,
      sampler: 'k_euler_ancestral',
      scheduler: 'karras',
      model: modelToNaia(nai.model || 'nai-diffusion-4-5-full'),
      var_plus: false,
      characters: [],
      seed: Math.floor(Math.random() * 4294967295) || 1,
    };
    const apiUrl = cleanText(nai.request_url) || API_URL;
    // Shares the provider's generation lane, so a probe cannot collide with an
    // image the user is waiting on.
    const result = await generateT2i(token, req, apiUrl, { timeoutMs: 90000 });
    const bytes = result.raw_bytes.byteLength;
    const isPng = isPngBytes(asU8(result.raw_bytes));
    span.end({ bytes, is_png: isPng, seed: result.seed });
    return {
      ok: true,
      message: `probe ok · png=${isPng} · ${bytes}B · seed=${result.seed}`,
      bytes,
      is_png: isPng,
      seed: result.seed,
      debug: debugSnapshot(),
    };
  } catch (exc) {
    span.fail(exc);
    return { ok: false, message: String((exc as Error)?.message || exc), debug: debugSnapshot() };
  } finally {
    setJobContext(prevCtx);
  }
}

/**
 * Reads appearance / attire / accessories off a reference image with the tagging
 * LLM's vision lane.
 *
 * `threshold` is accepted and echoed for API compatibility only — it was a WD
 * tagger score cutoff, and the LLM path has no per-tag score to compare it
 * against. Note it is echoed as `Number(threshold || 0.2)`, so an explicit `0`
 * comes back as `0.2`.
 */
export async function evaluateAutotag(bytes: ArrayBuffer, threshold: number): Promise<ApiResult> {
  if (!bytes?.byteLength) throw new Error('image is empty');
  const prepared = await prepareAutotagImage(bytes);
  const u8 = prepared.bytes;
  const mime = prepared.mime || 'image/png';
  const filename = prepared.filename || 'image.png';
  const b64 = await bytesToBase64Async(u8);
  const dataUrl = `data:${mime};base64,${b64}`;
  const prompt = stripCbs(await getPrompt('autotag')) || [
    'Tag ONE character reference image into Danbooru-style English prompts.',
    'Return ONE JSON object only: {"appearance":"...","attire":"...","accessories":"..."}.',
    'appearance = identity/hair/eyes/body (no clothes). attire = clothing only. accessories = jewelry/props/earbuds/etc.',
  ].join('\n');
  dbg('autotag.start', {
    message: `llm-vision ${filename} ${u8.length}B`,
    bytes: u8.length,
    focus: true,
    source: normalizeLlmSource(getConfig().llm.source),
  });
  const messages: LlmMessage[] = [
    { role: 'system', content: prompt },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Tag this character image. JSON only with appearance, attire, accessories.' },
        { type: 'image_url', image_url: { url: dataUrl } },
      ],
    },
  ];
  let raw = '';
  try {
    raw = await callLlm(getConfig().llm, messages);
  } catch (err) {
    dbg('autotag.llm.fail', { message: String((err as Error)?.message || err) }, 'error');
    throw new Error(`오토태그 LLM 실패: ${String((err as Error)?.message || err).slice(0, 240)}`);
  }
  const parsed = parseAutotagLookJson(raw);
  const appearance = cleanText(parsed.appearance || '', 4000);
  const attire = cleanText(parsed.attire || '', 4000);
  const accessories = cleanText(parsed.accessories || '', 4000);
  const text = cleanText(parsed.text || [appearance, attire, accessories].filter(Boolean).join(', '), 8000);
  if (!appearance && !attire && !accessories) {
    throw new Error('LLM이 외형/의상/악세사리 태그를 반환하지 않았습니다. 비전(이미지) 지원 모델인지 확인하세요.');
  }
  const tags = text.split(',').map((t) => t.trim()).filter(Boolean);
  dbg('autotag.done', {
    message: `app=${appearance.length} attire=${attire.length} acc=${accessories.length}`,
    focus: true,
  });
  return {
    ok: true,
    appearance,
    attire,
    accessories,
    tags,
    text,
    count: tags.length,
    threshold: Number(threshold || 0.2),
    engine: 'llm-vision',
  };
}
