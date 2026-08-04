/**
 * Request/response shape translation for the LLM lanes.
 *
 * Everything here is pure: OpenAI-shaped messages in, Anthropic-shaped messages
 * or plain text out. The response readers are deliberately forgiving because the
 * same call site handles OpenAI, Anthropic and Risu's `runLLMModel`, and Risu can
 * hand back a string, a typed envelope or a stream.
 */
import type { LlmSettings, LlmSource } from '../../core/types.ts';
import { cleanText } from '../../core/util/text.ts';
import { normalizeLlmProvider } from './providers.ts';

/** One OpenAI-style content part: text, or an image for vision requests. */
export interface LlmContentPart {
  type?: string;
  text?: string;
  /** Either `{ url }` or a bare URL string — both spellings appear in the wild. */
  image_url?: { url?: string } | string;
  [key: string]: unknown;
}

/** An OpenAI-style chat message; `content` is an array only for vision requests. */
export interface LlmMessage {
  role: string;
  content: string | Array<LlmContentPart | string>;
  [key: string]: unknown;
}

export interface AnthropicTextBlock {
  type: 'text';
  text: string;
}

export interface AnthropicImageBlock {
  type: 'image';
  source: { type: 'base64'; media_type: string; data: string };
}

export type AnthropicContentBlock = AnthropicTextBlock | AnthropicImageBlock;

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
}

/** Anthropic splits the system prompt out of the message list. */
export interface AnthropicRequest {
  system: string;
  messages: AnthropicMessage[];
}

export interface ChatCompletionPayload {
  choices?: Array<{
    message?: { content?: unknown };
    text?: unknown;
    delta?: { content?: unknown };
  }>;
  [key: string]: unknown;
}

export interface AnthropicPayload {
  content?: unknown;
  completion?: unknown;
  [key: string]: unknown;
}

/** Anything with `getReader()` — a DOM stream or Risu's stream proxy. */
interface StreamLike {
  getReader(): { read(): Promise<{ done?: boolean; value?: unknown }> };
}

const isStreamLike = (value: unknown): value is StreamLike =>
  Boolean(value) && typeof (value as StreamLike).getReader === 'function';

/** `{ text }` blocks stringify to their text; anything else to itself. */
const partText = (part: unknown): unknown =>
  (typeof part === 'object' ? (part as { text?: unknown } | null)?.text || '' : String(part || ''));

/** custom | main (Risu) | aux (Risu otherAx) */
export function normalizeLlmSource(value: unknown): LlmSource {
  const s = String(value || '').trim().toLowerCase();
  if (s === 'main' || s === 'risu_main' || s === 'risu-main') return 'main';
  if (s === 'aux' || s === 'otherax' || s === 'other_ax' || s === 'risu_aux' || s === 'risu-aux' || s === 'sub' || s === 'secondary') return 'aux';
  return 'custom';
}

/** True when the request should be delegated to Risu's own model instead of our HTTP lane. */
export function llmIsRisuSource(value: unknown): boolean {
  const s = normalizeLlmSource(value);
  return s === 'main' || s === 'aux';
}

/** True when the LLM settings are complete enough to attempt a tagging call. */
export function llmConfigured(llm: Partial<LlmSettings> | null | undefined): boolean {
  const cfg: Partial<LlmSettings> = llm || {};
  if (llmIsRisuSource(cfg.source)) return true;
  const provider = normalizeLlmProvider(cfg.provider);
  if (provider === 'vertex') {
    return Boolean(cleanText(cfg.model) && (cleanText(cfg.api_key) || cleanText(cfg.service_account_json)));
  }
  return Boolean(cleanText(cfg.model) && cleanText(cfg.api_key));
}

/** Rewrites OpenAI messages as an Anthropic `{ system, messages }` pair. */
export function openaiMessagesToAnthropic(messages: readonly LlmMessage[] | null | undefined): AnthropicRequest {
  let system = '';
  const out: AnthropicMessage[] = [];
  for (const row of messages || []) {
    const role = String(row?.role || '');
    const content = row?.content;
    if (role === 'system') {
      const text = typeof content === 'string'
        ? content
        : Array.isArray(content)
          ? content.map((part) => (typeof part === 'object' ? part.text || '' : String(part))).join('')
          : String(content ?? '');
      system = system ? `${system}\n${text}` : text;
      continue;
    }
    if (Array.isArray(content)) {
      const parts: AnthropicContentBlock[] = [];
      for (const part of content) {
        if (!part || typeof part !== 'object') {
          const t = String(part || '').trim();
          if (t) parts.push({ type: 'text', text: t });
          continue;
        }
        const image = part.image_url;
        const url = (typeof image === 'object' && image ? image.url : '')
          || (typeof image === 'string' ? image : '');
        if (part.type === 'image_url' || url) {
          const m = String(url).match(/^data:([^;]+);base64,([\s\S]+)$/i);
          if (m) {
            parts.push({
              type: 'image',
              source: { type: 'base64', media_type: m[1] || 'image/png', data: m[2].replace(/\s+/g, '') },
            });
          }
          continue;
        }
        const t = String(part.text || '').trim();
        if (t) parts.push({ type: 'text', text: t });
      }
      out.push({
        role: role === 'assistant' ? 'assistant' : 'user',
        content: parts.length ? parts : [{ type: 'text', text: '' }],
      });
      continue;
    }
    out.push({
      role: role === 'assistant' ? 'assistant' : 'user',
      content: String(content ?? ''),
    });
  }
  return { system, messages: out };
}

/** Pulls the assistant text out of an OpenAI-compatible chat completion. */
export function extractChatCompletionText(payload: ChatCompletionPayload | null | undefined): string {
  const choices = payload?.choices || [];
  if (!choices.length) throw new Error('LLM returned no choices.');
  const message: { content?: unknown } = choices[0].message || {};
  let content = message.content;
  if (Array.isArray(content)) {
    content = content.map(partText).join('');
  }
  // Some reasoning models put final text in content; keep content only (ignore reasoning fields).
  return cleanText(content);
}

/** Joins an Anthropic `content` block list into text, rejecting an empty result. */
export function extractAnthropicText(payload: AnthropicPayload | null | undefined): string {
  const raw = payload?.content;
  const blocks: unknown[] = Array.isArray(raw) ? raw : [];
  const text = blocks.map(partText).join('');
  const out = cleanText(text || payload?.completion || '');
  if (!out) throw new Error('Anthropic 응답이 비어 있습니다.');
  return out;
}

/** Drains a text/byte/chunk-object stream into one string. */
export async function readStreamToText(stream: unknown): Promise<string> {
  if (!isStreamLike(stream)) return '';
  const reader = stream.getReader();
  const decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;
  let lastObjText = '';
  let byteText = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (typeof value === 'string') {
      lastObjText = value;
      byteText += value;
    } else if (value instanceof Uint8Array) {
      byteText += decoder ? decoder.decode(value, { stream: true }) : '';
    } else if (value && typeof value === 'object') {
      // Risu StreamResponseChunk: { "0": cumulativeFullText }
      const chunk = value as { 0?: unknown; content?: unknown; text?: unknown };
      const cumulative = chunk[0];
      if (typeof cumulative === 'string') lastObjText = cumulative;
      else if (typeof chunk.content === 'string') lastObjText = chunk.content;
      else if (typeof chunk.text === 'string') lastObjText = chunk.text;
    }
  }
  if (decoder) byteText += decoder.decode();
  return lastObjText || byteText;
}

interface LlmResponseLike {
  type?: unknown;
  result?: unknown;
  data?: unknown;
  stream?: unknown;
  message?: unknown;
  error?: unknown;
  choices?: Array<{ message?: { content?: unknown }; text?: unknown; delta?: { content?: unknown } }>;
  content?: unknown;
  text?: unknown;
  response?: unknown;
  output?: unknown;
  [key: string]: unknown;
}

/**
 * Normalize Risu runLLMModel / OpenAI-like responses to plain text.
 * Risu returns { type: 'success'|'fail'|'streaming', result } — not raw chat completion.
 */
export async function llmResponseToText(response: unknown): Promise<string> {
  if (typeof response === 'string') return response;
  if (isStreamLike(response)) {
    return readStreamToText(response);
  }
  if (response == null) return '';
  if (typeof response === 'number' || typeof response === 'boolean') return String(response);
  if (typeof response === 'object') {
    const res = response as LlmResponseLike;
    const risuType = cleanText(res.type, 40).toLowerCase();
    if (risuType === 'fail' || risuType === 'error') {
      const errMsg = cleanText(res.result || res.message || res.error || 'Risu LLM 실패', 800);
      throw new Error(`Risu LLM 실패: ${errMsg}`);
    }
    if (risuType === 'streaming' || risuType === 'stream') {
      const stream = res.result ?? res.data ?? res.stream;
      const streamed = await readStreamToText(stream);
      if (streamed.trim()) return streamed;
    }
    if (risuType === 'success' || risuType === 'ok') {
      const ok = res.result ?? res.data ?? res.content;
      if (typeof ok === 'string') return ok;
      if (isStreamLike(ok)) return readStreamToText(ok);
    }

    const preferred: unknown[] = [
      res.choices?.[0]?.message?.content,
      res.choices?.[0]?.text,
      res.choices?.[0]?.delta?.content,
      (res.message as { content?: unknown } | undefined)?.content,
      res.content,
      res.text,
      res.response,
      // Prefer unwrapping only after typed Risu handling above.
      risuType ? null : res.result,
      res.output,
    ];
    for (const part of preferred) {
      if (typeof part === 'string' && part.trim()) return part;
      if (Array.isArray(part)) {
        const joined = part.map(partText).join('');
        if (joined.trim()) return joined;
      }
      if (isStreamLike(part)) {
        const streamed = await readStreamToText(part);
        if (streamed.trim()) return streamed;
      }
    }
    try {
      return JSON.stringify(response);
    } catch {
      return String(response);
    }
  }
  return String(response || '');
}
