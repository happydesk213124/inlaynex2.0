/**
 * Chat-overlay geometry and matching logic.
 *
 * Pure by contract: every DOM-shaped argument is a plain object, so nothing here
 * touches `document`, storage or the network. The frozen UI bundle reads these
 * symbols off the global, so no export may be renamed.
 */

// ── shared shapes ─────────────────────────────────────────────────────────

/** A gallery card as the viewer reads it — every field is optional on purpose. */
export interface GalleryCard {
  id?: string;
  content_hash?: string;
  character_id?: string;
  chat_id?: string;
  session_id?: string;
  message_index?: number;
  message_role?: string;
  role?: string;
  assistant_preview?: string;
  paragraph?: number;
  shot_index?: number;
  created_at?: number;
  y_percent?: number;
  anchor_percent?: number;
  read_percent?: number;
  [key: string]: unknown;
}

/** The message the viewer is currently pinned to. */
export interface SelectedMessage {
  hash?: string;
  sessionId?: string;
  chatIndex?: number;
  text?: string;
  [key: string]: unknown;
}

/** One row of `chat.message[]` as delivered by the host API. */
export interface ChatMessage {
  index?: number;
  role?: string;
  type?: string;
  speaker?: string;
  sender?: string;
  from?: string;
  name?: string;
  text?: string;
  data?: string;
  content?: string;
  isUser?: boolean;
  fromUser?: boolean;
  isAssistant?: boolean;
  isBot?: boolean;
  isChar?: boolean;
  generationInfo?: unknown;
  generation_info?: unknown;
  messageGenerationInfo?: unknown;
  [key: string]: unknown;
}

/** A `getBoundingClientRect()` result reduced to the fields used here. */
export interface MessageRect {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  height?: number;
}

export type StickyCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface SizeBox {
  w?: number;
  h?: number;
}

const INLINE_BASE_WIDTH = 528;
const INLINE_BASE_HEIGHT = 720;

function finiteNumber(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function mergePatch(
  target: Record<string, unknown>,
  patch: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries<unknown>(patch || {})) {
    const current = result[key];
    result[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? mergePatch(
        current && typeof current === 'object' ? current as Record<string, unknown> : {},
        value as Record<string, unknown>,
      )
      : value;
  }
  return result;
}

// ── inline thumbnail scaling ──────────────────────────────────────────────

/** Inline preview box for a user-facing scale percentage (100% = the legacy 600%). */
export function scaleInlineThumbnail(percent: unknown): { width: number; height: number; percent: number } {
  const normalized = Math.max(1, finiteNumber(percent, 100));
  return {
    width: Math.max(1, Math.round(INLINE_BASE_WIDTH * normalized / 100)),
    height: Math.max(1, Math.round(INLINE_BASE_HEIGHT * normalized / 100)),
    percent: normalized,
  };
}

// ── text similarity ───────────────────────────────────────────────────────

/** Strip to letters/digits for soft text matching (streaming-safe). */
export function normalizeMatchText(value: unknown): string {
  return String(value || '').replace(/[^a-zA-Z0-9\uac00-\ud7a3\u3040-\u30ff\u3400-\u9fff\uff00-\uffef]/g, '').toLowerCase();
}

/** @deprecated use HASH_REBIND_THRESHOLD — kept for older call sites */
export const PREFIX_MATCH_THRESHOLD = 0.6;
/** Minimum soft-similarity score that may re-bind a card to a new content hash. */
export const HASH_REBIND_THRESHOLD = 0.6;
/** Below this many normalized characters, soft matching is refused as too risky. */
export const PREFIX_MATCH_MIN_CHARS = 24;
/** Cap soft compare length (Dice is O(n); keep headroom for long chats). */
export const SIMILARITY_COMPARE_MAX = 800;

/** Normalize role families: char/assistant/bot → char, user/human → user. */
export function normalizeMessageRole(role: unknown): string {
  const r = String(role || '').toLowerCase().trim();
  if (!r) return '';
  if (r === 'char' || r === 'assistant' || r === 'bot') return 'char';
  if (r === 'user' || r === 'human') return 'user';
  return r;
}

/** Longest common prefix length of two already-normalized strings. */
export function longestCommonPrefixLength(a: string, b: string): number {
  const x = String(a || '');
  const y = String(b || '');
  const n = Math.min(x.length, y.length);
  let i = 0;
  while (i < n && x.charCodeAt(i) === y.charCodeAt(i)) i += 1;
  return i;
}

/** Character-bigram multiset counts for Dice coefficient. */
export function bigramCounts(text: string): Map<string, number> {
  const s = String(text || '');
  const counts = new Map<string, number>();
  if (s.length < 2) return counts;
  for (let i = 0; i < s.length - 1; i += 1) {
    const g = s.charCodeAt(i) + ',' + s.charCodeAt(i + 1);
    counts.set(g, (counts.get(g) || 0) + 1);
  }
  return counts;
}

/**
 * Dice coefficient on character bigrams in [0,1].
 * Famous fuzzy measure; O(n), tolerates a few edits anywhere (including the opening).
 */
export function diceBigramRatio(a: string, b: string, aCounts: Map<string, number> | null = null): number {
  const x = String(a || '');
  const y = String(b || '');
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.length < 2 || y.length < 2) return 0;
  const left = aCounts || bigramCounts(x);
  const right = bigramCounts(y);
  let inter = 0;
  for (const [g, rc] of right) {
    const lc = left.get(g) || 0;
    if (lc) inter += Math.min(lc, rc);
  }
  const leftN = x.length - 1;
  const rightN = y.length - 1;
  return (2 * inter) / (leftN + rightN);
}

/**
 * Soft similarity in [0,1] for one-shot hash rebind (not gallery hot path).
 * LCP fast-path for streaming prefix; else Dice bigrams.
 */
export function prefixMatchRatio(a: unknown, b: unknown): number {
  const x = normalizeMatchText(a);
  const y = normalizeMatchText(b);
  if (!x || !y) return 0;
  const maxLen = Math.max(x.length, y.length);
  if (maxLen < PREFIX_MATCH_MIN_CHARS) return 0;
  if (x === y) return 1;
  const lcp = longestCommonPrefixLength(x, y);
  const lcpRatio = lcp / maxLen;
  if (lcpRatio >= HASH_REBIND_THRESHOLD) return lcpRatio;
  const xs = x.length > SIMILARITY_COMPARE_MAX ? x.slice(0, SIMILARITY_COMPARE_MAX) : x;
  const ys = y.length > SIMILARITY_COMPARE_MAX ? y.slice(0, SIMILARITY_COMPARE_MAX) : y;
  return diceBigramRatio(xs, ys);
}

// ── gallery ordering and message linking ──────────────────────────────────

/** Identity of the message a streaming rebind is looking for. */
export interface RebindIdentity {
  newHash?: string;
  hash?: string;
  text?: string;
  characterId?: string;
  chatId?: string;
  sessionId?: string;
  messageIndex?: number;
  role?: string;
  messageRole?: string;
}

/**
 * Hot-path link: exact content_hash only.
 * Soft/streaming upgrades go through findHashRebindCandidates + API rebind.
 */
export function linkCardsForMessage<T extends GalleryCard = GalleryCard>(
  cards: T[] | null | undefined,
  selectedMessage: SelectedMessage | null | undefined,
): T[] {
  if (!selectedMessage) return [];
  const list = Array.isArray(cards) ? cards : [];
  const hash = String(selectedMessage.hash || '');
  if (!hash) return [];
  return dedupeShotSlots(list.filter((card) => card?.content_hash && card.content_hash === hash));
}

/**
 * Candidates for one-shot hash rebind after streaming changes content_hash.
 * Requires same character + chat + message_index + role; hash differs; Dice≥60%.
 * Cards without message_role are skipped (no guessed role).
 */
export function findHashRebindCandidates<T extends GalleryCard = GalleryCard>(
  cards: T[] | null | undefined,
  identity: RebindIdentity = {},
): T[] {
  const list = Array.isArray(cards) ? cards : [];
  const newHash = String(identity.newHash || identity.hash || '');
  const text = String(identity.text || '');
  const characterId = String(identity.characterId || '');
  const chatId = String(identity.chatId || '');
  const sessionId = String(identity.sessionId || '');
  const messageIndex = Number(identity.messageIndex);
  const role = normalizeMessageRole(identity.role || identity.messageRole || '');
  if (!newHash || !text || !characterId || !role || !Number.isFinite(messageIndex) || messageIndex < 0) return [];
  if (list.some((card) => card?.content_hash && card.content_hash === newHash)) return [];

  const textNorm = normalizeMatchText(text);
  if (textNorm.length < PREFIX_MATCH_MIN_CHARS) return [];
  const out: Array<{ card: T; score: number }> = [];
  for (const card of list) {
    const cardHash = String(card?.content_hash || '');
    if (!cardHash || cardHash === newHash) continue;
    if (String(card?.character_id || '') !== characterId) continue;
    const cardChat = String(card?.chat_id || '');
    const cardSession = String(card?.session_id || '');
    if (chatId) {
      if (cardChat !== chatId) continue;
    } else if (sessionId) {
      if (cardSession && cardSession !== sessionId) continue;
    } else {
      continue;
    }
    if (Number(card?.message_index) !== messageIndex) continue;
    const cardRole = normalizeMessageRole(card?.message_role || card?.role || '');
    if (!cardRole || cardRole !== role) continue;
    const preview = String(card?.assistant_preview || '');
    if (!preview) continue;
    const score = prefixMatchRatio(text, preview);
    if (score < HASH_REBIND_THRESHOLD) continue;
    out.push({ card, score });
  }
  out.sort((a, b) => b.score - a.score || finiteNumber(b.card?.created_at) - finiteNumber(a.card?.created_at));
  return dedupeShotSlots(out.map((row) => row.card));
}

/** Prefer saved y%/anchor%; missing → +Infinity so they sort after placed shots. */
function cardYPercent(card: GalleryCard | null | undefined): number {
  const raw = card?.y_percent ?? card?.anchor_percent ?? card?.read_percent;
  const n = Number(raw);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

function selectedOrder(left: GalleryCard | null | undefined, right: GalleryCard | null | undefined): number {
  return cardYPercent(left) - cardYPercent(right)
    || finiteNumber(left?.paragraph) - finiteNumber(right?.paragraph)
    || finiteNumber(left?.shot_index) - finiteNumber(right?.shot_index)
    || finiteNumber(right?.created_at) - finiteNumber(left?.created_at);
}

function newestOrder(left: GalleryCard | null | undefined, right: GalleryCard | null | undefined): number {
  return finiteNumber(right?.created_at) - finiteNumber(left?.created_at)
    || finiteNumber(right?.message_index) - finiteNumber(left?.message_index)
    || finiteNumber(right?.paragraph) - finiteNumber(left?.paragraph)
    || finiteNumber(right?.shot_index) - finiteNumber(left?.shot_index);
}

/** Keep newest card per paragraph|shot slot. */
function dedupeShotSlots<T extends GalleryCard>(cards: T[] | null | undefined): T[] {
  const unique = new Map<string, T>();
  for (const card of cards || []) {
    const key = `${card?.paragraph ?? '?'}|${card?.shot_index ?? card?.id}`;
    const prev = unique.get(key);
    if (!prev || finiteNumber(card?.created_at) >= finiteNumber(prev?.created_at)) unique.set(key, card);
  }
  return [...unique.values()];
}

/**
 * Viewer strip:
 * 1) LEFT — all current-message images, y% ascending (small → large)
 * 2) RIGHT — up to `maxCount` other session images, newest first
 * Selected shots are never squeezed out by the right-side cap.
 */
export function galleryForMessage<T extends GalleryCard = GalleryCard>(
  cards: T[] | null | undefined,
  selectedMessage: SelectedMessage | null | undefined,
  maxCount = 8,
): T[] {
  const unique = new Map<string, T>();
  for (const card of cards || []) {
    const id = String(card?.id || '');
    if (!id || unique.has(id)) continue;
    unique.set(id, card);
  }
  const values = [...unique.values()];
  const restCap = Math.max(0, Math.min(64, finiteNumber(maxCount, 8) || 8));
  if (!selectedMessage) {
    return values.sort(newestOrder).slice(0, Math.max(1, restCap || 8));
  }
  const selected = linkCardsForMessage(values, selectedMessage).sort(selectedOrder);
  const selectedIds = new Set(selected.map((card) => String(card.id)));
  const sessionId = String(selectedMessage.sessionId || '');
  const remaining = values
    .filter((card) => !selectedIds.has(String(card.id)))
    .filter((card) => !sessionId || !card?.session_id || card.session_id === sessionId)
    .sort(newestOrder)
    .slice(0, restCap);
  return [...selected, ...remaining];
}

/** How many gallery cards belong to the selected message. */
export function gallerySelectedCount(
  cards: GalleryCard[] | null | undefined,
  selectedMessage: SelectedMessage | null | undefined,
): number {
  if (!selectedMessage) return 0;
  return linkCardsForMessage(cards, selectedMessage).length;
}

/**
 * Message used for the left "current message images" strip.
 * When the live selection has no images yet, keep the last imaged message so the strip does not collapse/rebuild.
 * Never fall back across sessions — a chat switch must not keep the previous chat's strip.
 */
export function galleryFocusMessage(
  selectedMessage: SelectedMessage | null | undefined,
  lastImagedMessage: SelectedMessage | null | undefined,
  cards: GalleryCard[] | null | undefined,
): SelectedMessage | null {
  if (selectedMessage && gallerySelectedCount(cards, selectedMessage) > 0) return selectedMessage;
  const selSession = String(selectedMessage?.sessionId || selectedMessage?.session_id || '');
  const lastSession = String(lastImagedMessage?.sessionId || lastImagedMessage?.session_id || '');
  const lastOk = !!lastImagedMessage
    && gallerySelectedCount(cards, lastImagedMessage) > 0
    && (!selSession || !lastSession || selSession === lastSession);
  if (lastOk) return lastImagedMessage!;
  return selectedMessage || null;
}

// ── message role detection ────────────────────────────────────────────────

/**
 * Archive-style role from chat.message fields only (never from DOM/text).
 * Returns: "user" | "char" | "system" | "".
 */
export function rawMessageRole(message: ChatMessage | null | undefined): string {
  const role = String(
    message?.role || message?.type || message?.speaker || message?.sender || message?.from || message?.name || '',
  ).trim().toLowerCase();
  if (
    message?.isUser === true
    || message?.fromUser === true
    || /^(user|human|player|you|me)$/.test(role)
    || role.includes('user')
  ) return 'user';
  if (
    message?.isAssistant === true
    || message?.isBot === true
    || message?.isChar === true
    || /^(assistant|bot|char|character|model|ai)$/.test(role)
    || role.includes('assistant')
    || role.includes('bot')
    || role.includes('char')
  ) return 'char';
  if (role === 'system' || role === 'developer') return 'system';
  return '';
}

/** Risu AI turns usually carry generationInfo / generation_info. */
export function hasGenerationInfo(message: ChatMessage | null | undefined): boolean {
  const info = message?.generationInfo ?? message?.generation_info ?? message?.messageGenerationInfo;
  if (info == null) return false;
  if (typeof info === 'string') return info.trim().length > 0;
  if (typeof info === 'object') return Object.keys(info).length > 0;
  return true;
}

/**
 * Optional hint only: Risu AI turns often carry generationInfo.
 * Do NOT use this as the selection role — prefer message.role via rawMessageRole.
 */
export function roleFromGenerationInfo(message: ChatMessage | null | undefined): string {
  return hasGenerationInfo(message) ? 'char' : 'user';
}

/** True when the message is a character/assistant turn eligible for image gen. */
export function isCharMessageRole(roleOrMessage: string | ChatMessage | null | undefined): boolean {
  if (roleOrMessage && typeof roleOrMessage === 'object') {
    return rawMessageRole(roleOrMessage) === 'char';
  }
  const role = String(roleOrMessage || '').trim().toLowerCase();
  return role === 'char' || role === 'assistant' || role === 'bot';
}

// ── DOM ↔ API message matching ────────────────────────────────────────────

export type ChatMatchMethod = 'reverse' | 'fallback';

export interface ChatMessageMatch {
  chatIndex: number;
  text: string;
  role: string;
  matchMethod: ChatMatchMethod;
  score: number;
}

export interface DomApiCompare {
  domChars: number;
  apiChars: number;
  domCompactChars: number;
  apiCompactChars: number;
  shareScore: number;
  overlap: boolean;
  shortExact: boolean;
  apiInDom: boolean;
  domInApi: boolean;
  apiKey: string;
  domKey: string;
}

/** Whitespace-stripped key; allows short user words (<8). */
export function messageCompactKey(text: unknown, maxChars = 48): string {
  const cap = Math.max(1, finiteNumber(maxChars, 48));
  return String(text || '').replace(/\s+/g, '').slice(0, cap);
}

/** API-side context fingerprint: prev|self|next|role (oldest-first neighbors). */
export function messageContextTriplet(
  messages: ChatMessage[] | null | undefined,
  index: number,
  maxChars = 48,
): string {
  const list = Array.isArray(messages) ? messages : [];
  const i = Math.floor(finiteNumber(index, -1));
  const self = i >= 0 && i < list.length ? list[i] : null;
  const prev = i > 0 ? list[i - 1] : null;
  const next = i >= 0 && i < list.length - 1 ? list[i + 1] : null;
  return [
    messageCompactKey(prev?.text, maxChars),
    messageCompactKey(self?.text, maxChars),
    messageCompactKey(next?.text, maxChars),
    rawMessageRole(self) || String(self?.role || '').trim().toLowerCase(),
  ].join('|');
}

/**
 * Shared-character score between DOM bubble and API body (whitespace-stripped).
 * Longer shared runs win — stops short option lines from beating full char turns
 * just because the option text also appears inside the rendered bubble.
 */
export function messagesTextOverlapScore(domText: unknown, apiText: unknown): number {
  const dom = String(domText || '').replace(/\s+/g, '');
  const api = String(apiText || '').replace(/\s+/g, '');
  if (!dom || !api) return 0;
  if (dom.includes(api)) return api.length;
  if (api.includes(dom)) return dom.length;

  let best = 0;
  const longestPrefixIn = (needle: string, haystack: string, minLen = 8, maxLen = 512): number => {
    let lo = minLen;
    let hi = Math.min(needle.length, maxLen);
    let found = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (haystack.includes(needle.slice(0, mid))) {
        found = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return found;
  };
  best = Math.max(best, longestPrefixIn(api, dom), longestPrefixIn(dom, api));

  // Sample mid-body chunks (API headers/markup often differ from DOM chrome).
  const limit = Math.min(api.length, 2400);
  for (let i = 0; i + 8 <= limit; i += 32) {
    const chunkMax = Math.min(64, limit - i);
    for (let len = chunkMax; len >= 8; len -= 8) {
      if (dom.includes(api.slice(i, i + len))) {
        best = Math.max(best, len);
        break;
      }
    }
  }
  return best;
}

/** Debug helper: why DOM text and API text do/don't match. */
export function describeDomApiCompare(domText: unknown, apiText: unknown): DomApiCompare {
  const dom = String(domText || '');
  const api = String(apiText || '');
  const domCompact = messageCompactKey(dom);
  const apiCompact = messageCompactKey(api);
  const shareScore = messagesTextOverlapScore(dom, api);
  const overlap = shareScore >= 8;
  const shortExact = domCompact.length > 0 && domCompact.length < 8 && domCompact === apiCompact;
  const apiKey = apiCompact.slice(0, 48);
  const domKey = domCompact.slice(0, 48);
  return {
    domChars: dom.length,
    apiChars: api.length,
    domCompactChars: domCompact.length,
    apiCompactChars: apiCompact.length,
    shareScore,
    overlap,
    shortExact,
    apiInDom: !!(apiKey && apiKey.length >= 8 && domCompact.includes(apiKey)),
    domInApi: !!(domKey && domKey.length >= 8 && apiCompact.includes(domKey)),
    apiKey,
    domKey,
  };
}

/**
 * Remap card.message_index from current API messages via content_hash.
 * Unique hash hit → update index; ambiguous → -1; missing hash → leave unchanged.
 */
export function rebindGalleryMessageIndexes<T extends GalleryCard = GalleryCard>(
  cards: T[] | null | undefined,
  messages: ChatMessage[] | null | undefined,
  hashOf: ((text: string) => string) | null | undefined,
): { cards: T[]; changed: number } {
  const list = Array.isArray(messages) ? messages : [];
  const hashFn = typeof hashOf === 'function' ? hashOf : null;
  const byHash = new Map<string, number[]>();
  if (hashFn) {
    for (let i = 0; i < list.length; i += 1) {
      const text = String(list[i]?.text ?? list[i]?.data ?? list[i]?.content ?? '');
      const hash = String(hashFn(text) || '');
      if (!hash) continue;
      const idx = Number.isFinite(Number(list[i]?.index)) ? Number(list[i].index) : i;
      const bucket = byHash.get(hash);
      if (bucket) bucket.push(idx);
      else byHash.set(hash, [idx]);
    }
  }
  let changed = 0;
  const out = (Array.isArray(cards) ? cards : []).map((card) => {
    const hash = String(card?.content_hash || '');
    const idxs = hash ? byHash.get(hash) : undefined;
    if (!hash || !idxs) return card;
    if (idxs.length !== 1) {
      if (Number(card?.message_index) !== -1) {
        changed += 1;
        return { ...card, message_index: -1 };
      }
      return card;
    }
    if (Number(card?.message_index) !== idxs[0]) {
      changed += 1;
      return { ...card, message_index: idxs[0] };
    }
    return card;
  });
  return { cards: out, changed };
}

/**
 * Map a clicked chat DOM bubble to chat.message[].
 * Ultra-simple: DOM is newest-first, API is oldest-first →
 *   API index = (messageCount - 1) - DOM index
 * Role from that API row (rawMessageRole). Text/share matching intentionally unused,
 * which is why `domText` only survives as a fallback and the trailing arguments are ignored.
 */
export function resolveChatMessageMatch(
  domText: string | null | undefined,
  messages: ChatMessage[] | null | undefined,
  domIndex: number,
  _domCount?: number,
  _opts?: Record<string, unknown>,
): ChatMessageMatch {
  const list = Array.isArray(messages) ? messages : [];
  const idx = Math.floor(finiteNumber(domIndex, -1));
  const pick = (
    row: ChatMessage | null | undefined,
    method: ChatMatchMethod,
    score: number,
    rowIndex = -1,
  ): ChatMessageMatch => ({
    chatIndex: Number.isFinite(Number(row?.index)) ? Number(row?.index) : (rowIndex >= 0 ? rowIndex : idx),
    text: String(row?.text || domText || ''),
    role: rawMessageRole(row) || String(row?.role || '').trim().toLowerCase(),
    matchMethod: method,
    score,
  });

  if (!list.length) {
    return {
      chatIndex: Math.max(0, idx),
      text: String(domText || ''),
      role: '',
      matchMethod: 'fallback',
      score: 0,
    };
  }

  const reverseIdx = list.length - 1 - idx;
  if (reverseIdx >= 0 && reverseIdx < list.length) {
    return pick(list[reverseIdx], 'reverse', 100, reverseIdx);
  }

  // DOM index out of range (e.g. stale) → clamp to nearest API end.
  const clamped = Math.max(0, Math.min(list.length - 1, reverseIdx));
  return pick(list[clamped], 'reverse', 50, clamped);
}

// ── sticky pin percent ↔ px ───────────────────────────────────────────────

/** Saved defaults for the sticky pin, expressed as bottom-left percentages. */
export interface PinPercentDefaults {
  x?: number;
  y?: number;
}

/** Card settings the pin resolver reads; values are stored loosely by 1.x clients. */
export interface PinCardSettings {
  overlay_pin_origin?: string;
  overlay_x_pct?: unknown;
  overlay_y_pct?: unknown;
  overlay_x_offset?: unknown;
  overlay_y_offset?: unknown;
  [key: string]: unknown;
}

/** Clamp sticky-pin screen percent to 0–100 (integer, decimals truncated). */
export function clampPinPercent(value: unknown, fallback: unknown = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return Math.max(0, Math.min(100, Math.floor(finiteNumber(fallback, 0))));
  return Math.max(0, Math.min(100, Math.floor(n)));
}

/** Percent from the left/top edge → clamped pixel (pin top-left). */
export function pinPercentToPx(percent: unknown, viewportSize: number, pinSize = 22, pad = 4): number {
  const view = Math.max(1, finiteNumber(viewportSize, 1));
  const size = Math.max(1, finiteNumber(pinSize, 1));
  const edge = Math.max(0, finiteNumber(pad, 0));
  const raw = Math.floor(view * clampPinPercent(percent, 0) / 100);
  return Math.max(edge, Math.min(view - size - edge, raw));
}

/**
 * Percent from the bottom edge → CSS `top` for the pin.
 * y=0 → bottom; y=50 → mid; y=100 → top (clamped). Scales with viewport resize.
 */
export function pinPercentToPxFromBottom(percent: unknown, viewportSize: number, pinSize = 22, pad = 8): number {
  const view = Math.max(1, finiteNumber(viewportSize, 1));
  const size = Math.max(1, finiteNumber(pinSize, 1));
  const edge = Math.max(0, finiteNumber(pad, 0));
  const fromBottom = Math.floor(view * clampPinPercent(percent, 0) / 100);
  const top = view - fromBottom - size;
  return Math.max(edge, Math.min(view - size - edge, top));
}

/** Pixel from left/top → percent of viewport (integer, decimals truncated). */
export function pinPxToPercent(px: number, viewportSize: number): number {
  const view = Math.max(1, finiteNumber(viewportSize, 1));
  return clampPinPercent(finiteNumber(px, 0) / view * 100, 0);
}

/**
 * Read pin % from settings (origin = bottom-left).
 * Prefer overlay_*_pct whenever present — DEFAULT_CONFIG always deepMerges
 * legacy overlay_*_offset (px), which must not shadow saved percentages on boot.
 * defaults: { x: 38, y: 80 }
 */
export function resolveStoredPinPercent(
  card: PinCardSettings | null | undefined,
  axis: string,
  viewportSize: number,
  defaults: PinPercentDefaults | null = null,
): number {
  const def = defaults && typeof defaults === 'object' ? defaults : { x: 38, y: 80 };
  const isY = axis === 'y' || axis === 'Y';
  const fallback = isY ? finiteNumber(def.y, 80) : finiteNumber(def.x, 38);
  const pctKey = isY ? 'overlay_y_pct' : 'overlay_x_pct';
  const pxKey = isY ? 'overlay_y_offset' : 'overlay_x_offset';
  const origin = String(card?.overlay_pin_origin || '');
  const topOrigin = origin === 'top' || origin === 'tl' || origin === 'top-left';
  const rawPct = card?.[pctKey];
  const hasPct = rawPct != null && Number.isFinite(Number(rawPct));
  const px = Number(card?.[pxKey]);
  const hasPx = Number.isFinite(px);
  const asBottomY = (topish: unknown): number => clampPinPercent(100 - Number(topish), fallback);

  // Saved % wins over default/legacy px (fixes first-load pin ignoring settings %).
  if (hasPct) {
    if (!isY) return clampPinPercent(rawPct, fallback);
    if (topOrigin) return asBottomY(rawPct);
    return clampPinPercent(rawPct, fallback);
  }
  if (hasPx) {
    if (!isY) return pinPxToPercent(px, viewportSize);
    // Legacy top-edge px → bottom-origin %
    return clampPinPercent((finiteNumber(viewportSize, 1) - px) / Math.max(1, finiteNumber(viewportSize, 1)) * 100, fallback);
  }
  return clampPinPercent(fallback, fallback);
}

// ── message selection gestures ────────────────────────────────────────────

export type SelectionGesture = 'single' | 'double';

export interface MessageSelectionGestureOptions {
  gesture?: SelectionGesture;
  detail?: number;
  movement?: number;
  textSelecting?: boolean;
  excludedTarget?: boolean;
}

export interface ClickSelectionOptions {
  gesture?: SelectionGesture;
  detail?: number;
  pendingDomIndex?: number | null;
  targetDomIndex?: number | null;
}

export interface ClickSelectionAction {
  action: 'provisional' | 'confirm' | 'ignore';
  pendingDomIndex?: number | null;
  clearPending?: boolean;
  matchedPending?: boolean;
}

export interface TextDragSelectionOptions {
  enabled?: boolean;
  movement?: number;
  hasSelection?: boolean;
  excludedTarget?: boolean;
}

/**
 * Pick message index nearest to a pointer: prefer rect containing the point, else closest center.
 * `rects` entries: { top, bottom, left?, right? }. Missing left/right → Y-only containment.
 */
export function pickMessageIndexNearPoint(
  rects: Array<MessageRect | null | undefined> | null | undefined,
  pointY: number,
  pointX: number | null = null,
  viewportH = 800,
): number {
  const list = Array.isArray(rects) ? rects : [];
  if (!list.length) return -1;
  const vh = Math.max(1, finiteNumber(viewportH, 800));
  const py = Number.isFinite(Number(pointY)) ? Number(pointY) : vh * 0.5;
  const px = Number.isFinite(Number(pointX)) ? Number(pointX) : null;
  let contain = -1;
  let containH = Infinity;
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < list.length; i += 1) {
    const r = list[i];
    if (!r) continue;
    const top = finiteNumber(r.top, 0);
    const bottom = finiteNumber(r.bottom, top);
    if (bottom <= 0 || top >= vh) continue;
    const midY = (top + bottom) * 0.5;
    const midX = Number.isFinite(Number(r.left)) && Number.isFinite(Number(r.right))
      ? (Number(r.left) + Number(r.right)) * 0.5
      : null;
    const dist = midX != null && px != null
      ? Math.hypot(midX - px, midY - py)
      : Math.abs(midY - py);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
    const inY = py >= top && py <= bottom;
    const inX = px == null || !Number.isFinite(Number(r.left)) || !Number.isFinite(Number(r.right))
      || (px >= Number(r.left) && px <= Number(r.right));
    if (inY && inX) {
      const h = Math.max(1, bottom - top);
      if (h < containH) {
        containH = h;
        contain = i;
      }
    }
  }
  return contain >= 0 ? contain : best;
}

/** True when a pointer event is a real message-selection click, not a drag or text pick. */
export function isMessageSelectionGesture({
  gesture = 'single',
  detail = 1,
  movement = 0,
  textSelecting = false,
  excludedTarget = false,
}: MessageSelectionGestureOptions = {}): boolean {
  const expectedDetail = gesture === 'double' ? 2 : 1;
  return !excludedTarget
    && !textSelecting
    && finiteNumber(movement, Infinity) <= 8
    && finiteNumber(detail) === expectedDetail;
}

/**
 * Click-only selection state machine.
 * double: detail 1 → provisional, detail 2 → confirm.
 * single: detail 1 → confirm; other details ignored.
 */
export function resolveClickSelectionAction({
  gesture = 'single',
  detail = 1,
  pendingDomIndex = null,
  targetDomIndex = null,
}: ClickSelectionOptions = {}): ClickSelectionAction {
  const d = finiteNumber(detail, 1);
  if (gesture === 'double') {
    if (d === 1) {
      return {
        action: 'provisional',
        pendingDomIndex: targetDomIndex,
      };
    }
    if (d === 2) {
      return {
        action: 'confirm',
        clearPending: true,
        matchedPending: pendingDomIndex != null
          && Number(pendingDomIndex) === Number(targetDomIndex),
      };
    }
    return { action: 'ignore' };
  }
  if (d === 1) return { action: 'confirm', clearPending: true };
  return { action: 'ignore' };
}

/** True when a text-drag gesture should select the message under the pointer. */
export function shouldSelectMessageByTextDrag({
  enabled = true,
  movement = 0,
  hasSelection = false,
  excludedTarget = false,
}: TextDragSelectionOptions = {}): boolean {
  return !!enabled
    && !excludedTarget
    && !!hasSelection
    && finiteNumber(movement, 0) > 8;
}

// ── scroll / session / save debounce helpers ──────────────────────────────

export interface ScrollSettleTracker {
  bump(): void;
  settleNow(): void;
  cancel(): void;
  readonly pending: boolean;
}

export interface SessionChangeGuard {
  observe(session: string | null | undefined): boolean;
  current(): string;
  reset(session?: string): void;
}

export type SavePatch = Record<string, unknown>;

export interface DebouncedSaveQueue {
  enqueue(patch: SavePatch): void;
  flush(): Promise<void>;
  hasPending(): boolean;
}

/**
 * Idle debounce helper for scroll-settle selection.
 * bump() on scroll/wheel; settleNow() on scrollend; onSettle fires once per idle.
 */
export function createScrollSettleTracker({
  delayMs = 160,
  onSettle,
}: { delayMs?: number; onSettle?: () => void } = {}): ScrollSettleTracker {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const delay = Math.max(0, finiteNumber(delayMs, 160));
  const fire = (): void => {
    timer = null;
    if (typeof onSettle === 'function') onSettle();
  };
  return {
    bump() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(fire, delay);
    },
    settleNow() {
      if (timer) clearTimeout(timer);
      timer = null;
      fire();
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
    },
    get pending() {
      return timer != null;
    },
  };
}

/** Debounce chat switches: a new session id only counts after two consistent observations. */
export function createSessionChangeGuard(initialSession = ''): SessionChangeGuard {
  let currentSession = String(initialSession || '');
  let candidate = '';
  let observations = 0;
  return {
    observe(session) {
      const next = String(session || '');
      if (!next || next === currentSession) {
        candidate = '';
        observations = 0;
        return false;
      }
      if (next !== candidate) {
        candidate = next;
        observations = 1;
        return false;
      }
      observations += 1;
      if (observations < 2) return false;
      currentSession = candidate;
      candidate = '';
      observations = 0;
      return true;
    },
    current() {
      return currentSession;
    },
    reset(session = '') {
      currentSession = String(session || '');
      candidate = '';
      observations = 0;
    },
  };
}

/** Coalesce setting patches into one debounced write that never runs twice concurrently. */
export function createDebouncedSaveQueue(
  write: (patch: SavePatch) => unknown,
  delayMs = 300,
): DebouncedSaveQueue {
  let pending: SavePatch = {};
  let timer: ReturnType<typeof setTimeout> | null = null;
  let draining: Promise<void> | null = null;

  const drain = async (): Promise<void> => {
    if (draining) return draining;
    draining = (async () => {
      while (Object.keys(pending).length) {
        const patch = pending;
        pending = {};
        await write(patch);
      }
    })().finally(() => {
      draining = null;
    });
    return draining;
  };

  return {
    enqueue(patch) {
      pending = mergePatch(pending, patch);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        drain().catch(() => {});
      }, Math.max(0, finiteNumber(delayMs, 300)));
    },
    async flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      do {
        await drain();
      } while (Object.keys(pending).length || draining);
    },
    hasPending() {
      return !!timer || !!draining || Object.keys(pending).length > 0;
    },
  };
}

// ── sticky thumb + corner layout ──────────────────────────────────────────

export interface StickyCornerBox {
  left: number;
  top: number;
  w: number;
  h: number;
}

export interface StickyEdgeBox {
  w: number;
  h: number;
  top: number | null;
  bottom: number | null;
  left: number | null;
  right: number | null;
}

export interface StickyPinEdgeBox {
  size: number;
  top: number | null;
  bottom: number | null;
  left: number | null;
  right: number | null;
}

/** True when gallery card id list/order changed enough to warrant a viewer refresh. */
export function shouldRefreshGallery(
  prevIds: Array<string | number> | null | undefined,
  nextIds: Array<string | number> | null | undefined,
): boolean {
  const prev = Array.isArray(prevIds) ? prevIds.map(String) : [];
  const next = Array.isArray(nextIds) ? nextIds.map(String) : [];
  if (prev.length !== next.length) return true;
  for (let i = 0; i < prev.length; i += 1) {
    if (prev[i] !== next[i]) return true;
  }
  return false;
}

/**
 * Claim an already-mounted sticky marker from the active list by card id.
 *
 * overlay.place used to create a fresh pin DOM whenever takePooledMarker
 * missed — and the pool only held *parked* markers, not the ones still in
 * `markers`. On a partial card-set swap (A,B → A,C) that left the old A pin
 * orphaned in the layer while a second A pin was appended. Splice the hit
 * out so the leftover park pass can retire only unused nodes.
 */
export function claimStickyMarkerByCardId<T extends { card?: { id?: unknown } | null; thumb?: unknown }>(
  active: T[] | null | undefined,
  cardId: unknown,
): T | null {
  const id = String(cardId || '');
  if (!id || !Array.isArray(active) || !active.length) return null;
  const idx = active.findIndex((m) => String(m?.card?.id || '') === id);
  if (idx < 0) return null;
  const m = active[idx];
  if (!m?.thumb) return null;
  active.splice(idx, 1);
  return m;
}

/** Sticky pin thumb HTML rewrite only when the active card id changes. */
export function shouldRewriteStickyThumb(
  prevCardId: string | null | undefined,
  nextCardId: string | null | undefined,
): boolean {
  return String(prevCardId || '') !== String(nextCardId || '');
}

/** Keep sticky always-image hidden only while the user-hidden card is still active. */
export function shouldKeepStickyThumbHidden(
  userHidden: boolean,
  hiddenCardId: string | null | undefined,
  activeCardId: string | null | undefined,
): boolean {
  if (!userHidden) return false;
  const hidden = String(hiddenCardId || '');
  const active = String(activeCardId || '');
  return !!hidden && !!active && hidden === active;
}

/**
 * Effective sticky always-image size %.
 *
 * Hide is size 0 (not display:none): 상시 off, click-collapse, or shot/char
 * editor open all collapse to 0; otherwise use the settings percentage.
 */
export function resolveStickyThumbPct(opts: {
  settingsPct: unknown;
  alwaysOn: boolean;
  userCollapsed: boolean;
  editorOpen: boolean;
}): number {
  if (!opts.alwaysOn || opts.userCollapsed || opts.editorOpen) return 0;
  const pct = finiteNumber(opts.settingsPct, 0);
  return pct > 0 ? pct : 0;
}

/** Pixel box from an effective sticky thumb %. Allows 0×0 for hide-by-pct. */
export function stickyThumbBoxFromPct(
  pct: unknown,
  baseW: number,
  baseH: number,
): { pct: number; w: number; h: number } {
  const p = Math.max(0, finiteNumber(pct, 0));
  const bw = Math.max(0, finiteNumber(baseW, 0));
  const bh = Math.max(0, finiteNumber(baseH, 0));
  return {
    pct: p,
    w: Math.max(0, Math.round(bw * p / 100)),
    h: Math.max(0, Math.round(bh * p / 100)),
  };
}

/**
 * Fit `imgW×imgH` inside a max envelope, preserving aspect ratio.
 * Missing/invalid image size → return the envelope (caller letterboxes with contain).
 */
export function fitBoxInside(
  maxW: unknown,
  maxH: unknown,
  imgW: unknown = 0,
  imgH: unknown = 0,
): { w: number; h: number } {
  const mw = Math.max(0, finiteNumber(maxW, 0));
  const mh = Math.max(0, finiteNumber(maxH, 0));
  if (mw <= 0 || mh <= 0) return { w: 0, h: 0 };
  const iw = Math.max(0, finiteNumber(imgW, 0));
  const ih = Math.max(0, finiteNumber(imgH, 0));
  if (iw <= 0 || ih <= 0) return { w: mw, h: mh };
  const scale = Math.min(mw / iw, mh / ih);
  return {
    w: Math.max(1, Math.round(iw * scale)),
    h: Math.max(1, Math.round(ih * scale)),
  };
}

/**
 * Sticky thumb HTML. Prefer a single <img> — dual-stack under/over doubles the
 * data-URL payload through SafeDOM setInnerHTML and is what made scroll flashes lag.
 * `contain` (not cover): portrait / landscape / square all show fully in the box.
 * Transparent bg: La() already shrinks the frame via fitBoxInside; any residual
 * contain letterbox must not paint opaque bars over the chat.
 */
export function composeStickyThumbHtml(src: string | null | undefined, underSrc: string | null | undefined = ''): string {
  const next = typeof src === 'string' ? src : '';
  void underSrc; // kept for call-site compat; stacking is intentionally unused
  if (!next) return '<div style="width:100%;height:100%;background:transparent"></div>';
  const fit = 'width:100%;height:100%;object-fit:contain;display:block;background:transparent';
  return `<img src="${next}" style="${fit}" />`;
}

/**
 * True when the sticky thumb node already holds this card's image — scroll flash
 * can show/hide without another setInnerHTML of a multi-MB data URL.
 */
export function stickyThumbNeedsHtmlPaint(
  paintedSrc: unknown,
  thumbSrc: unknown,
  paintedId: unknown,
  activeId: unknown,
): boolean {
  const src = typeof thumbSrc === 'string' ? thumbSrc : '';
  if (!src) return false;
  return String(paintedSrc || '') !== src || String(paintedId || '') !== String(activeId || '');
}

/** Corner box for sticky always-image in mobile layout mode. */
export function stickyCornerImageBox(
  corner: StickyCorner | null | undefined,
  size: SizeBox | null | undefined,
  viewport: { width?: number; height?: number } | null | undefined,
  pad = 16,
): StickyCornerBox {
  const w = Math.max(1, Math.round(finiteNumber(size?.w, 1)));
  const h = Math.max(1, Math.round(finiteNumber(size?.h, 1)));
  const vw = Math.max(w, Math.round(finiteNumber(viewport?.width, w)));
  const vh = Math.max(h, Math.round(finiteNumber(viewport?.height, h)));
  const p = Math.max(0, Math.round(finiteNumber(pad, 16)));
  const c = String(corner || 'bottom-right');
  const left = c.includes('left') ? p : Math.max(p, vw - w - p);
  const top = c.includes('top') ? p : Math.max(p, vh - h - p);
  return { left, top, w, h };
}

/**
 * Edge-anchored corner box (left/right/top/bottom).
 * Prefer this over absolute left/top so right/bottom corners stay glued on window resize.
 */
export function stickyCornerEdgeBox(
  corner: StickyCorner | null | undefined,
  size: SizeBox | null | undefined,
  pad = 16,
): StickyEdgeBox {
  const w = Math.max(1, Math.round(finiteNumber(size?.w, 1)));
  const h = Math.max(1, Math.round(finiteNumber(size?.h, 1)));
  const p = Math.max(0, Math.round(finiteNumber(pad, 16)));
  const c = String(corner || 'bottom-right');
  return {
    w,
    h,
    top: c.includes('top') ? p : null,
    bottom: c.includes('bottom') ? p : null,
    left: c.includes('left') ? p : null,
    right: c.includes('right') ? p : null,
  };
}

/** Sticky pin sitting on the top-center edge of an image box. */
export function stickyPinOverImage(
  box: { left?: number; top?: number; w?: number; h?: number } | null | undefined,
  pinSize = 28,
  gap = 6,
): { left: number; top: number } {
  const left = Math.round(finiteNumber(box?.left, 0));
  const top = Math.round(finiteNumber(box?.top, 0));
  const w = Math.max(1, Math.round(finiteNumber(box?.w, 1)));
  const pin = Math.max(1, Math.round(finiteNumber(pinSize, 28)));
  const g = Math.max(0, Math.round(finiteNumber(gap, 6)));
  return {
    left: Math.round(left + (w - pin) / 2),
    top: top - g,
  };
}

/** Edge-anchored pin on the top-center of a corner sticky image. */
export function stickyPinEdgeBox(
  corner: StickyCorner | null | undefined,
  size: SizeBox | null | undefined,
  pinSize = 28,
  gap = 6,
  pad = 16,
): StickyPinEdgeBox {
  const box = stickyCornerEdgeBox(corner, size, pad);
  const pin = Math.max(1, Math.round(finiteNumber(pinSize, 28)));
  const g = Math.max(0, Math.round(finiteNumber(gap, 6)));
  const sidePad = box.left != null ? box.left : box.right;
  const side = Math.round(finiteNumber(sidePad, 0) + (box.w - pin) / 2);
  return {
    size: pin,
    top: box.top != null ? Math.round(box.top - g) : null,
    bottom: box.bottom != null ? Math.round(box.bottom + box.h + g) : null,
    left: box.left != null ? side : null,
    right: box.right != null ? side : null,
  };
}

// ── gallery thumb strip geometry ──────────────────────────────────────────

/** Viewer strip thumb geometry (must match UI flex styles). */
export const VIEWER_THUMB_LAYOUT = Object.freeze({
  width: 64,
  height: 88,
  gap: 8,
  splitWidth: 16,
  splitExtraMargin: 4,
});

export interface StripGeometryOptions {
  count?: number;
  selectedCount?: number;
  thumbWidth?: number;
  gap?: number;
  splitWidth?: number;
  splitExtraMargin?: number;
}

type StripChild =
  | { type: 'split' }
  | { type: 'thumb'; galIdx: number; marginLeft: number };

/** Index of the `|` separator among gallery items, or 0 when no separator is shown. */
export function galleryStripSplitAt(selectedCount: number, length: number): number {
  const n = Math.max(0, Math.floor(finiteNumber(length, 0)));
  const s = Math.max(0, Math.min(Math.floor(finiteNumber(selectedCount, 0)), n));
  return s > 0 && s < n ? s : 0;
}

/**
 * Map a flex child index (including the `|` node) back to a gallery index.
 * Returns -1 for the separator itself or out-of-range children.
 */
export function galleryIndexFromChildIndex(childIndex: number, selectedCount: number, length: number): number {
  const n = Math.max(0, Math.floor(finiteNumber(length, 0)));
  const child = Math.floor(finiteNumber(childIndex, -1));
  if (child < 0 || n <= 0) return -1;
  const splitAt = galleryStripSplitAt(selectedCount, n);
  if (splitAt <= 0) return child < n ? child : -1;
  if (child === splitAt) return -1;
  const gal = child > splitAt ? child - 1 : child;
  return gal >= 0 && gal < n ? gal : -1;
}

/**
 * Map content-X inside the thumb strip to a gallery index.
 * `localX` = clientX - strip.left + scrollOffset (transform or scrollLeft).
 * Accounts for the `|` separator flex child and post-split margin-left.
 */
export function thumbIndexAtStripX(localX: number, {
  count = 0,
  selectedCount = 0,
  thumbWidth = VIEWER_THUMB_LAYOUT.width,
  gap = VIEWER_THUMB_LAYOUT.gap,
  splitWidth = VIEWER_THUMB_LAYOUT.splitWidth,
  splitExtraMargin = VIEWER_THUMB_LAYOUT.splitExtraMargin,
}: StripGeometryOptions = {}): number {
  const n = Math.max(0, Math.floor(finiteNumber(count, 0)));
  if (n <= 0) return -1;
  const x = finiteNumber(localX, NaN);
  if (!Number.isFinite(x) || x < 0) return -1;
  const tw = Math.max(1, finiteNumber(thumbWidth, VIEWER_THUMB_LAYOUT.width));
  const g = Math.max(0, finiteNumber(gap, VIEWER_THUMB_LAYOUT.gap));
  const sw = Math.max(0, finiteNumber(splitWidth, VIEWER_THUMB_LAYOUT.splitWidth));
  const sm = Math.max(0, finiteNumber(splitExtraMargin, VIEWER_THUMB_LAYOUT.splitExtraMargin));
  const splitAt = galleryStripSplitAt(selectedCount, n);
  const kids: StripChild[] = [];
  for (let i = 0; i < n; i += 1) {
    if (splitAt > 0 && i === splitAt) kids.push({ type: 'split' });
    kids.push({
      type: 'thumb',
      galIdx: i,
      marginLeft: splitAt > 0 && i === splitAt ? sm : 0,
    });
  }
  let cursor = 0;
  for (let k = 0; k < kids.length; k += 1) {
    if (k > 0) cursor += g;
    const kid = kids[k];
    if (kid.type === 'split') {
      if (x >= cursor && x < cursor + sw) return -1;
      cursor += sw;
      continue;
    }
    cursor += kid.marginLeft;
    if (x >= cursor && x < cursor + tw) return kid.galIdx;
    cursor += tw;
  }
  return -1;
}

/** Full content width of the thumb strip (for transform-scroll clamping). */
export function galleryStripContentWidth({
  count = 0,
  selectedCount = 0,
  thumbWidth = VIEWER_THUMB_LAYOUT.width,
  gap = VIEWER_THUMB_LAYOUT.gap,
  splitWidth = VIEWER_THUMB_LAYOUT.splitWidth,
  splitExtraMargin = VIEWER_THUMB_LAYOUT.splitExtraMargin,
}: StripGeometryOptions = {}): number {
  const n = Math.max(0, Math.floor(finiteNumber(count, 0)));
  if (n <= 0) return 0;
  const tw = Math.max(1, finiteNumber(thumbWidth, VIEWER_THUMB_LAYOUT.width));
  const g = Math.max(0, finiteNumber(gap, VIEWER_THUMB_LAYOUT.gap));
  const sw = Math.max(0, finiteNumber(splitWidth, VIEWER_THUMB_LAYOUT.splitWidth));
  const sm = Math.max(0, finiteNumber(splitExtraMargin, VIEWER_THUMB_LAYOUT.splitExtraMargin));
  const splitAt = galleryStripSplitAt(selectedCount, n);
  const childCount = n + (splitAt > 0 ? 1 : 0);
  let width = n * tw + Math.max(0, childCount - 1) * g;
  if (splitAt > 0) width += sw + sm;
  return width;
}

/** Clamp transform-scroll offset into [0, max(0, content - viewport)]. */
export function clampThumbScrollOffset(offset: number, contentWidth: number, viewportWidth: number): number {
  const max = Math.max(0, finiteNumber(contentWidth, 0) - Math.max(0, finiteNumber(viewportWidth, 0)));
  const raw = finiteNumber(offset, 0);
  return Math.max(0, Math.min(max, raw));
}

/** Nearby gallery card ids for eager data-URL encoding (visible window, capped). */
export function visibleGalleryImageIds(
  items: Array<{ id?: string } | null | undefined> | null | undefined,
  index = 0,
  radius = 1,
  maxCount = 8,
  pinPrefixCount = 0,
): string[] {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return [];
  const idx = Math.max(0, Math.min(finiteNumber(index, 0), list.length - 1));
  const cap = Math.max(1, Math.min(list.length, finiteNumber(maxCount, 8) || 8));
  // Prefer a centered window of up to maxCount; radius is a minimum span hint.
  const minSpan = Math.min(cap, 1 + 2 * Math.max(0, finiteNumber(radius, 1)));
  const span = Math.max(minSpan, cap);
  let start = Math.max(0, idx - Math.floor((span - 1) / 2));
  const end = Math.min(list.length - 1, start + span - 1);
  start = Math.max(0, end - span + 1);
  const ids: string[] = [];
  const seen = new Set<string>();
  const add = (i: number) => {
    const id = String(list[i]?.id || '');
    if (!id || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };
  // Optional: keep the leading "current message" strip warm even when focus is far right.
  const pin = Math.max(0, Math.min(list.length, finiteNumber(pinPrefixCount, 0)));
  for (let i = 0; i < pin; i += 1) add(i);
  for (let i = start; i <= end; i += 1) {
    add(i);
    if (ids.length >= cap) break;
  }
  return ids;
}

/**
 * Card ids for the focused chat message and ±radius neighbors (by message_index).
 * Sticky scroll stays snappy when these data URLs are already in the sync cache.
 */
export function nearbyMessageImageIds(
  cards: GalleryCard[] | null | undefined,
  focus:
    | {
        messageIndex?: unknown;
        message_index?: unknown;
        sessionId?: unknown;
        session_id?: unknown;
        chatId?: unknown;
        chat_id?: unknown;
        hash?: unknown;
      }
    | null
    | undefined,
  radius = 2,
  extraIds: Array<string | null | undefined> | null | undefined = [],
): string[] {
  const list = Array.isArray(cards) ? cards : [];
  const r = Math.max(0, Math.min(8, finiteNumber(radius, 2)));
  const focusIdx = finiteNumber(focus?.messageIndex ?? focus?.message_index, Number.NaN);
  const sessionId = String(focus?.sessionId || focus?.session_id || '');
  const chatId = String(focus?.chatId || focus?.chat_id || '');
  const focusHash = String(focus?.hash || '');
  const seen = new Set<string>();
  const ids: string[] = [];
  const add = (id: unknown) => {
    const key = String(id || '');
    if (!key || seen.has(key)) return;
    seen.add(key);
    ids.push(key);
  };
  for (const id of extraIds || []) add(id);
  for (const card of list) {
    if (!card?.id) continue;
    if (sessionId && card.session_id && String(card.session_id) !== sessionId) continue;
    if (chatId && card.chat_id && String(card.chat_id) !== chatId) continue;
    const mi = finiteNumber(card.message_index, Number.NaN);
    if (Number.isFinite(focusIdx) && Number.isFinite(mi)) {
      if (Math.abs(mi - focusIdx) <= r) add(card.id);
      continue;
    }
    if (focusHash && String(card.content_hash || '') === focusHash) add(card.id);
  }
  return ids;
}

/** True when two DOM message indices are within ±radius (optimistic nearby reuse). */
export function isNearbyDomIndex(prev: unknown, next: unknown, radius = 2): boolean {
  const a = finiteNumber(prev, Number.NaN);
  const b = finiteNumber(next, Number.NaN);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  const r = Math.max(0, finiteNumber(radius, 2));
  return Math.abs(a - b) <= r;
}

/** Inclusive [lo, hi] window of DOM indices centered on focus with ±radius. */
export function nearbyDomIndexWindow(center: unknown, count: unknown, radius = 2): { lo: number; hi: number; center: number } {
  const n = Math.max(0, Math.floor(finiteNumber(count, 0)));
  const c = Math.max(0, Math.min(Math.max(0, n - 1), Math.floor(finiteNumber(center, 0))));
  const r = Math.max(0, Math.floor(finiteNumber(radius, 2)));
  if (n <= 0) return { lo: 0, hi: -1, center: 0 };
  return { lo: Math.max(0, c - r), hi: Math.min(n - 1, c + r), center: c };
}

const PAINT_RANK: Record<string, number> = { chrome: 1, content: 2, full: 3 };

/** Coalesce pending viewer paint jobs — fuller modes win. */
export function mergeViewerPaintJob(pending: string | null | undefined, next: string | null | undefined): string {
  const a = PAINT_RANK[String(pending ?? '')] || 0;
  const b = PAINT_RANK[String(next ?? '')] || 0;
  if (!a && !b) return 'full';
  if (b >= a) return next || pending || 'full';
  return pending || next || 'full';
}

// ── autotag JSON parsing ──────────────────────────────────────────────────

export interface AutotagLook {
  appearance: string;
  attire: string;
  accessories: string;
  text: string;
  /** `female` | `male` | `""` from vision JSON when present. */
  gender?: string;
}

/**
 * Parse LLM vision autotag JSON into appearance / attire / accessories.
 * Accepts fenced ```json blocks or a bare object; falls back to splitting a flat tag string.
 */
export function parseAutotagLookJson(raw: unknown): AutotagLook {
  const text = String(raw || '').trim();
  if (!text) {
    return { appearance: '', attire: '', accessories: '', text: '', gender: '' };
  }
  let obj: Record<string, unknown> | null = null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  const brace = candidate.match(/\{[\s\S]*\}/);
  if (brace) {
    try {
      const parsed: unknown = JSON.parse(brace[0]);
      // Arrays deliberately pass this check, exactly as the untyped original did:
      // they yield empty look fields rather than falling through to the flat path.
      obj = parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
    } catch {
      obj = null;
    }
  }
  if (obj && typeof obj === 'object') {
    const appearance = String(obj.appearance ?? obj.look ?? obj.identity ?? '').trim();
    const attire = String(obj.attire ?? obj.clothing ?? obj.outfit ?? '').trim();
    const accessories = String(obj.accessories ?? obj.accessory ?? obj.props ?? '').trim();
    const genderRaw = String(obj.gender ?? obj.sex ?? '').trim().toLowerCase();
    const gender = ['girl', 'female', 'f', 'woman'].includes(genderRaw)
      ? 'girl'
      : ['boy', 'male', 'm', 'man'].includes(genderRaw)
        ? 'boy'
        : genderRaw === 'other'
          ? 'other'
          : '';
    const joined = [appearance, attire, accessories].filter(Boolean).join(', ');
    return { appearance, attire, accessories, text: joined, gender };
  }
  // Legacy flat tag dump → put everything in appearance.
  const flat = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return { appearance: flat, attire: '', accessories: '', text: flat, gender: '' };
}

/**
 * Resolve the mint "indexing" bar: image warm progress wins; else tagging phase.
 */
export function resolveIndexProgress(args: {
  warmPct?: unknown;
  warmBusy?: unknown;
  jobState?: unknown;
  jobPct?: unknown;
} = {}): { pct: number; busy: boolean; label: string } {
  const warmBusy = Boolean(args.warmBusy);
  const warmPct = Math.max(0, Math.min(100, Math.round(finiteNumber(args.warmPct, 0))));
  const state = String(args.jobState || '');
  const jobPct = Math.max(0, Math.min(100, Math.round(finiteNumber(args.jobPct, 0))));
  if (warmBusy) return { pct: Math.max(warmBusy ? 6 : 0, warmPct), busy: true, label: '인덱싱' };
  if (state === 'tagging') return { pct: Math.max(6, jobPct), busy: true, label: '인덱싱' };
  return { pct: 0, busy: false, label: '인덱싱' };
}

/** Two stacked rails: purple job (top) + mint indexing (bottom). Floating viewer status still uses this. */
export function composeDualProgressBarsHtml(args: {
  jobPct?: unknown;
  indexPct?: unknown;
  jobBusy?: unknown;
  indexBusy?: unknown;
  error?: unknown;
} = {}): string {
  const jobBusy = Boolean(args.jobBusy);
  const indexBusy = Boolean(args.indexBusy);
  const jobPct = Math.max(jobBusy ? 6 : 0, Math.min(100, Math.round(finiteNumber(args.jobPct, 0))));
  const indexPct = Math.max(indexBusy ? 6 : 0, Math.min(100, Math.round(finiteNumber(args.indexPct, 0))));
  const jobColor = args.error ? '#f87171' : '#7c6cff';
  const indexColor = '#2dd4bf';
  const rail = (pct: number, color: string) =>
    `<span style="display:block;height:4px;border-radius:2px;background:#1e2633;overflow:hidden"><span style="display:block;height:100%;width:${pct}%;background:${color}"></span></span>`;
  return `<span style="flex:0 0 120px;display:flex;flex-direction:column;gap:3px;justify-content:center">${rail(jobPct, jobColor)}${rail(indexPct, indexColor)}</span>`;
}

/** Single progress rail for the unified progress toast. */
export function composeSingleProgressBarHtml(args: {
  pct?: unknown;
  busy?: unknown;
  error?: unknown;
  /** `index` = mint (indexing); default purple job/regen */
  tone?: unknown;
} = {}): string {
  const busy = Boolean(args.busy);
  const pct = Math.max(busy ? 6 : 0, Math.min(100, Math.round(finiteNumber(args.pct, 0))));
  const tone = String(args.tone || '');
  const color = args.error ? '#f87171' : tone === 'index' ? '#2dd4bf' : '#7c6cff';
  return `<span style="flex:0 0 120px;display:block;height:6px;border-radius:3px;background:#1e2633;overflow:hidden"><span style="display:block;height:100%;width:${pct}%;background:${color}"></span></span>`;
}

/**
 * Top-center progress toast chip HTML (inline styles only — no CSS runtime).
 * One stage + one bar. Empty string when there is nothing to show.
 */
export function composeProgressToastHtml(args: {
  stage?: unknown;
  meta?: unknown;
  pct?: unknown;
  /** @deprecated dual-bar fields — collapsed into pct when `pct` omitted */
  jobPct?: unknown;
  indexPct?: unknown;
  jobBusy?: unknown;
  indexBusy?: unknown;
  busy?: unknown;
  error?: unknown;
  /** `index` = mint bar (indexing); otherwise purple */
  tone?: unknown;
  escapeHtml?: ((s: string) => string) | null;
} = {}): string {
  const jobBusy = Boolean(args.jobBusy);
  const indexBusy = Boolean(args.indexBusy);
  const busy = Boolean(args.busy) || jobBusy || indexBusy;
  if (!busy && !args.error) return '';
  const esc = typeof args.escapeHtml === 'function'
    ? args.escapeHtml
    : (s: string) => String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  const tone = String(args.tone || (!jobBusy && indexBusy ? 'index' : 'job'));
  const stage = esc(String(args.stage || (tone === 'index' ? '인덱싱' : '작업 중')).slice(0, 80));
  const meta = esc(String(args.meta || '').slice(0, 160));
  let pct = args.pct;
  if (pct == null) {
    if (jobBusy) pct = args.jobPct;
    else if (indexBusy) pct = args.indexPct;
    else pct = Math.max(finiteNumber(args.jobPct, 0), finiteNumber(args.indexPct, 0));
  }
  const bar = composeSingleProgressBarHtml({
    pct,
    busy: busy || Boolean(args.error),
    error: args.error,
    tone,
  });
  const accent = args.error ? '#f87171' : tone === 'index' ? '#5eead4' : '#c4b5fd';
  return `<div data-inlay-progress-toast="1" style="display:flex;align-items:center;gap:10px;min-width:220px;max-width:min(420px,92vw);padding:10px 14px;border-radius:8px;background:#121820;border:1px solid #2a3344;cursor:pointer;user-select:none"><span style="flex:0 0 auto;font-weight:700;color:${accent};font-size:11px;white-space:nowrap">${stage}</span><span style="min-width:0;flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#8b97ab;font-size:11px">${meta}</span>${bar}</div>`;
}

// ── anchor / reading / segment index ──────────────────────────────────────

function clampPercent(value: unknown): number {
  return Math.max(0, Math.min(100, finiteNumber(value, 0)));
}

/**
 * Equal band start for index in [0, count): 4 shots → 0 / 25 / 50 / 75.
 * Sticky segments then own [start, next) slices of the message (0–25, 25–50, …).
 */
export function evenAnchorPercent(index: number, count: number): number {
  const n = Math.max(1, finiteNumber(count, 1));
  const i = Math.max(0, Math.min(finiteNumber(index, 0), n - 1));
  return (i / n) * 100;
}

/**
 * Prefer card y_percent / anchor_percent; else even band starts.
 * Pass `{ forceEven: true }` when LLM placement is OFF so saved y% is ignored.
 */
export function resolveCardAnchorPercent(
  card: GalleryCard | null | undefined,
  index = 0,
  count = 1,
  opts: { forceEven?: boolean } | null = null,
): number {
  if (opts && opts.forceEven) return evenAnchorPercent(index, count);
  const raw = card?.y_percent ?? card?.anchor_percent ?? card?.read_percent;
  const n = Number(raw);
  if (Number.isFinite(n)) return clampPercent(n);
  return evenAnchorPercent(index, count);
}

/**
 * Reading line as % through a message rect.
 * Returns null when the reading line is outside the message box.
 */
export function readingPercentInMessage(
  rect: MessageRect | null | undefined,
  viewportH: number,
  lineRatio = 0.5,
): number | null {
  if (!rect) return null;
  const height = Math.max(1, finiteNumber(rect.height, 0));
  const lineY = Math.max(0, finiteNumber(viewportH, 0)) * (Number.isFinite(lineRatio) ? lineRatio : 0.5);
  if (lineY < finiteNumber(rect.top, 0) || lineY > finiteNumber(rect.bottom, 0)) return null;
  return clampPercent((lineY - finiteNumber(rect.top, 0)) / height * 100);
}

/** Clamp reading % when the line is outside but we still want a band. */
export function clampReadingPercent(
  rect: MessageRect | null | undefined,
  viewportH: number,
  lineRatio = 0.5,
): number {
  const inside = readingPercentInMessage(rect, viewportH, lineRatio);
  if (inside != null) return inside;
  const lineY = Math.max(0, finiteNumber(viewportH, 0)) * (Number.isFinite(lineRatio) ? lineRatio : 0.5);
  return finiteNumber(rect?.bottom, 0) < lineY ? 100 : 0;
}

/**
 * Active sticky segment for sorted marker y% thresholds.
 * Single marker ≤20% is treated as 1% so it activates early.
 * Before the first threshold → -1 (no active band yet).
 */
export function activeSegmentIndex(markerPercents: number[] | null | undefined, readingPct: number): number {
  const list = Array.isArray(markerPercents) ? markerPercents : [];
  if (!list.length) return -1;
  const reading = clampPercent(readingPct);
  const raw = list.map((v) => clampPercent(v));
  const low = raw.reduce<number[]>((acc, v, i) => (v <= 20 ? acc.concat(i) : acc), []);
  // Sole early marker → 1% (legacy). Keep exact 0 so equal band starts [0, 25, …] activate from the top.
  const thresholds = low.length === 1 && raw[low[0]] > 0
    ? raw.map((v, i) => (i === low[0] ? 1 : v))
    : raw;
  if (thresholds[0] > 0 && reading < thresholds[0]) return -1;
  let active = 0;
  for (let i = 0; i < thresholds.length; i += 1) {
    if (reading >= thresholds[i]) active = i;
  }
  return active;
}

// ── beta: chat-bubble inline images at newline lines ──────────────────────

const INLAY_INLINE_ATTR = 'data-inlay-inline-shot';

const BLOCK_CLOSE_RE = /^<\/(?:p|div|li|blockquote|h[1-6]|tr)>$/i;
const BR_RE = /^<br\s*\/?>$/i;

/** Strip our beta illustration blocks so hashing / line splits see original prose. */
export function stripInlayInlineHtml(html: unknown): string {
  const raw = String(html || '');
  if (!raw) return '';
  return raw
    .replace(/<div[^>]*\bdata-inlay-inline-shot\b[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<(?:span|p)[^>]*\bdata-inlay-inline-shot\b[^>]*>[\s\S]*?<\/(?:span|p)>/gi, '');
}

/** Same newline split as vendor Xt — non-empty trimmed lines. */
export function splitMessageLines(text: unknown): string[] {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 1-based line clamped into [1, lineCount]; null if missing/invalid or no lines. */
export function clampShotLine(line: unknown, lineCount: number): number | null {
  const n = Math.floor(Number(line));
  const max = Math.max(0, Math.floor(Number(lineCount) || 0));
  if (!max || !Number.isFinite(n) || n < 1) return null;
  return Math.max(1, Math.min(max, n));
}

export interface InlineImagePlacement {
  line: number;
  src: string;
  shotIndex?: number;
  cardId?: string;
  /** No image yet — show spinner + br spacing at the line. */
  pending?: boolean;
}

export interface InlineInjectOptions {
  /** Bubble client width — clamps img so intrinsic size cannot expand the parent. */
  maxWidthPx?: number;
}

type MappedChar = { ch: string; htmlIndex: number };

function escapeHtmlAttr(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function decodeHtmlEntity(entity: string): string | null {
  const e = entity.toLowerCase();
  if (e === '&nbsp;') return ' ';
  if (e === '&amp;') return '&';
  if (e === '&lt;') return '<';
  if (e === '&gt;') return '>';
  if (e === '&quot;') return '"';
  if (e === '&#39;' || e === '&apos;') return "'";
  const dec = /^&#(\d+);$/.exec(entity);
  if (dec) {
    const code = Number(dec[1]);
    if (Number.isFinite(code) && code > 0 && code < 0x110000) return String.fromCodePoint(code);
  }
  const hex = /^&#x([0-9a-f]+);$/i.exec(entity);
  if (hex) {
    const code = Number.parseInt(hex[1]!, 16);
    if (Number.isFinite(code) && code > 0 && code < 0x110000) return String.fromCodePoint(code);
  }
  return null;
}

/**
 * Prefer inserting before wrapping open tags so we get
 * `…<div marker/>…<b>line</b>` instead of `…<b><div marker/>…line</b>`.
 * Stops at text, entities, br, or closing tags.
 */
function nudgeInsertBeforeOpenTags(html: string, htmlIndex: number): number {
  let i = Math.max(0, Math.min(html.length, Math.floor(htmlIndex)));
  while (i > 0) {
    let j = i;
    while (j > 0 && /[ \t\r\n]/.test(html[j - 1]!)) j -= 1;
    if (j <= 0 || html[j - 1] !== '>') break;
    const open = html.lastIndexOf('<', j - 1);
    if (open < 0 || open >= j - 1) break;
    const tag = html.slice(open, j);
    if (BR_RE.test(tag) || BLOCK_CLOSE_RE.test(tag) || /^<\//.test(tag)) break;
    if (!/^<[a-zA-Z][^>]*>$/.test(tag)) break;
    i = open;
  }
  return i;
}

/**
 * Match vendor `ln`: HTML → plain, while remembering each plain char's splice
 * index in the original HTML (insert *before* that index).
 */
function mapHtmlToPlain(html: string): MappedChar[] {
  const raw: MappedChar[] = [];
  let i = 0;
  const s = String(html || '');
  while (i < s.length) {
    if (s[i] === '<') {
      const close = s.indexOf('>', i);
      if (close < 0) break;
      const tag = s.slice(i, close + 1);
      if (BR_RE.test(tag) || BLOCK_CLOSE_RE.test(tag)) {
        raw.push({ ch: '\n', htmlIndex: i });
      }
      // open block + other tags dropped (same as vendor ln)
      i = close + 1;
      continue;
    }
    if (s[i] === '&') {
      const semi = s.indexOf(';', i);
      if (semi > i && semi - i < 16) {
        const ent = s.slice(i, semi + 1);
        const decoded = decodeHtmlEntity(ent);
        if (decoded != null) {
          for (let k = 0; k < decoded.length; k += 1) {
            raw.push({ ch: decoded[k]!, htmlIndex: i });
          }
          i = semi + 1;
          continue;
        }
      }
    }
    raw.push({ ch: s[i]!, htmlIndex: i });
    i += 1;
  }

  // [^\S\n]+ → single space
  const spaced: MappedChar[] = [];
  for (let j = 0; j < raw.length; j += 1) {
    const c = raw[j]!;
    if (c.ch !== '\n' && /\s/.test(c.ch)) {
      spaced.push({ ch: ' ', htmlIndex: c.htmlIndex });
      while (j + 1 < raw.length && raw[j + 1]!.ch !== '\n' && /\s/.test(raw[j + 1]!.ch)) j += 1;
      continue;
    }
    spaced.push(c);
  }
  // *\n* → \n
  const trimmedNl = spaced.filter((c, j) => {
    if (c.ch !== ' ') return true;
    return spaced[j - 1]?.ch !== '\n' && spaced[j + 1]?.ch !== '\n';
  });
  // \n{2,} → \n
  const collapsed: MappedChar[] = [];
  for (const c of trimmedNl) {
    if (c.ch === '\n' && collapsed.length && collapsed[collapsed.length - 1]!.ch === '\n') continue;
    collapsed.push(c);
  }
  while (collapsed.length && (collapsed[0]!.ch === '\n' || collapsed[0]!.ch === ' ')) collapsed.shift();
  while (
    collapsed.length
    && (collapsed[collapsed.length - 1]!.ch === '\n' || collapsed[collapsed.length - 1]!.ch === ' ')
  ) {
    collapsed.pop();
  }
  return collapsed;
}

/** Vendor `ln` equivalent — plain text used for hashing / line numbers. */
export function htmlToPlainLn(html: unknown): string {
  return mapHtmlToPlain(String(html || '')).map((c) => c.ch).join('');
}

/**
 * Char offset in ln-plain of the first non-whitespace char of 1-based line N
 * (Xt numbering: empty lines skipped). Null if out of range.
 */
export function findPlainLineStartOffset(plain: unknown, line: unknown): number | null {
  const text = String(plain ?? '').replace(/\r\n/g, '\n');
  const want = Math.floor(Number(line));
  if (!Number.isFinite(want) || want < 1) return null;
  let lineNo = 0;
  let i = 0;
  while (i <= text.length) {
    const next = text.indexOf('\n', i);
    const end = next < 0 ? text.length : next;
    const segment = text.slice(i, end);
    if (segment.trim()) {
      lineNo += 1;
      if (lineNo === want) {
        const lead = /^\s*/.exec(segment)?.[0].length || 0;
        return i + lead;
      }
    }
    if (next < 0) break;
    i = next + 1;
  }
  return null;
}

/** Collapse whitespace for line↔element text matching. */
export function normalizeInlineMatchText(text: unknown): string {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Plain line at 1-based `line` plus how many times that same text has appeared
 * in lines[1..line] (1-based occurrence). Duplicates resolve by document order.
 */
export function lineTextOccurrence(
  lines: string[] | null | undefined,
  line1Based: unknown,
): { text: string; occurrence: number } | null {
  const list = Array.isArray(lines) ? lines : [];
  const idx = Math.floor(Number(line1Based)) - 1;
  if (!Number.isFinite(idx) || idx < 0 || idx >= list.length) return null;
  const text = normalizeInlineMatchText(list[idx]);
  if (!text) return null;
  let occurrence = 0;
  for (let i = 0; i <= idx; i += 1) {
    if (normalizeInlineMatchText(list[i]) === text) occurrence += 1;
  }
  return { text, occurrence };
}

/**
 * Split each host element's plain text into line entries (multi-line `<p>` →
 * several rows pointing at the same element index).
 */
export function expandElementLineEntries(
  elementTexts: unknown[] | null | undefined,
): { text: string; elementIndex: number }[] {
  const out: { text: string; elementIndex: number }[] = [];
  const list = Array.isArray(elementTexts) ? elementTexts : [];
  for (let i = 0; i < list.length; i += 1) {
    for (const line of splitMessageLines(list[i])) {
      const text = normalizeInlineMatchText(line);
      if (text) out.push({ text, elementIndex: i });
    }
  }
  return out;
}

/**
 * Map a 1-based message `line` onto a text-bearing element index by matching
 * normalized line text + occurrence order (not unique-string search).
 */
export function findElementIndexForLine(
  elementTexts: unknown[] | null | undefined,
  messageLines: string[] | null | undefined,
  line1Based: unknown,
): number {
  const key = lineTextOccurrence(messageLines, line1Based);
  if (!key) return -1;
  const entries = expandElementLineEntries(elementTexts);
  let seen = 0;
  for (const entry of entries) {
    if (entry.text !== key.text) continue;
    seen += 1;
    if (seen === key.occurrence) return entry.elementIndex;
  }
  return -1;
}

/**
 * If the matched host is a `DIV`, place into the nearest preferred tag (default
 * `P`) by host-list distance. Returns -1 when no preferred neighbour exists
 * (caller should skip — do not inject into the div).
 */
export function preferNearbyHostIndex(
  tagNames: unknown[] | null | undefined,
  matchedIndex: unknown,
  preferTags: string[] | null | undefined = ['P'],
): number {
  const tags = (Array.isArray(tagNames) ? tagNames : []).map((t) => String(t || '').toUpperCase());
  const idx = Math.floor(Number(matchedIndex));
  if (!Number.isFinite(idx) || idx < 0 || idx >= tags.length) return -1;
  const prefer = new Set(
    (Array.isArray(preferTags) && preferTags.length ? preferTags : ['P']).map((t) => String(t || '').toUpperCase()),
  );
  const cur = tags[idx] || '';
  if (cur !== 'DIV') return idx;
  for (let dist = 1; dist < tags.length; dist += 1) {
    const left = idx - dist;
    const right = idx + dist;
    if (left >= 0 && prefer.has(tags[left]!)) return left;
    if (right < tags.length && prefer.has(tags[right]!)) return right;
  }
  return -1;
}

/**
 * Resolve a placeable host index for `line`, then try line+1, line+2, …
 * when text match / nearby-`P` redirect fails (common for awkward line-4 cases).
 */
export function findElementIndexForLineWithFallback(
  elementTexts: unknown[] | null | undefined,
  tagNames: unknown[] | null | undefined,
  messageLines: string[] | null | undefined,
  line1Based: unknown,
  preferTags: string[] | null | undefined = ['P'],
): { elementIndex: number; usedLine: number } | null {
  const lines = Array.isArray(messageLines) ? messageLines : [];
  const start = Math.floor(Number(line1Based));
  if (!Number.isFinite(start) || start < 1 || !lines.length) return null;
  const max = lines.length;
  for (let line = Math.max(1, start); line <= max; line += 1) {
    const matched = findElementIndexForLine(elementTexts, lines, line);
    const idx = preferNearbyHostIndex(tagNames, matched, preferTags);
    if (idx >= 0) return { elementIndex: idx, usedLine: line };
  }
  return null;
}

export function markerBlockHtml(p: InlineImagePlacement, _maxWidthPx?: number): string {
  const shot = Number.isFinite(Number(p.shotIndex)) ? String(Math.floor(Number(p.shotIndex))) : '';
  const id = escapeHtmlAttr(String(p.cardId || (p.pending ? `pending-${shot || p.line}` : '') || shot || p.line || '0'));
  void _maxWidthPx;
  // Centered block; <br> keeps Risu bubble spacing. Size tracks the bubble (≤60%),
  // so mobile narrow bubbles shrink the image instead of clipping (no fixed zoom).
  const wrapStyle = 'display:block;margin:10px 0;text-align:center;line-height:0;max-width:100%;box-sizing:border-box';
  if (p.pending || !/^data:image\//i.test(String(p.src || ''))) {
    const spin = '<svg width="28" height="28" viewBox="0 0 28 28" style="display:inline-block;vertical-align:middle" aria-hidden="true"><circle cx="14" cy="14" r="11" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="3"/><circle cx="14" cy="14" r="11" fill="none" stroke="#c4b5fd" stroke-width="3" stroke-linecap="round" stroke-dasharray="18 52"><animateTransform attributeName="transform" type="rotate" from="0 14 14" to="360 14 14" dur="0.75s" repeatCount="indefinite"/></circle></svg>';
    return (
      `<div ${INLAY_INLINE_ATTR}="${id}" data-inlay-inline-pending="1" x-inlay-inline-shot="${id}" contenteditable="false" style="${wrapStyle}">`
      + `<br><br><span style="display:inline-flex;align-items:center;justify-content:center;min-width:48px;min-height:48px;padding:10px;border-radius:12px;background:rgba(124,108,255,.12);border:1px solid rgba(196,181,253,.35)">${spin}</span><br><br>`
      + `</div>`
    );
  }
  const imgStyle = 'width:auto;height:auto;max-width:min(60%,100%);max-height:min(70vh,900px);object-fit:contain;border-radius:8px;display:inline-block;vertical-align:top';
  return (
    `<div ${INLAY_INLINE_ATTR}="${id}" x-inlay-inline-shot="${id}" contenteditable="false" style="${wrapStyle}">`
    + `<br><img src="${escapeHtmlAttr(p.src)}" alt="" style="${imgStyle}" loading="eager" decoding="async"><br>`
    + `</div>`
  );
}

/**
 * Insert illustration markers into existing bubble HTML without rebuilding
 * prose from plain text — tags/formatting stay; plain/`line` is position only.
 */
export function injectInlineImagesIntoHtml(
  html: unknown,
  placements: InlineImagePlacement[] | null | undefined,
  opts?: InlineInjectOptions | null,
): string {
  const cleaned = stripInlayInlineHtml(html);
  const list = Array.isArray(placements) ? placements : [];
  if (!cleaned || !list.length) return cleaned;

  const mapped = mapHtmlToPlain(cleaned);
  const plain = mapped.map((c) => c.ch).join('');
  const lineCount = splitMessageLines(plain).length;
  if (!lineCount || !mapped.length) return cleaned;

  const byLine = new Map<number, InlineImagePlacement>();
  const seenCard = new Set<string>();
  for (const p of list) {
    const line = clampShotLine(p?.line, lineCount);
    const src = String(p?.src || '');
    const cardId = String(p?.cardId || '');
    const pending = p?.pending === true || (!!line && !/^data:image\//i.test(src));
    if (!line) continue;
    if (!pending && !/^data:image\//i.test(src)) continue;
    if (cardId && seenCard.has(cardId)) continue;
    if (byLine.has(line)) continue;
    if (cardId) seenCard.add(cardId);
    byLine.set(line, { ...p, line, src, pending });
  }
  if (!byLine.size) return cleaned;

  const maxWidthPx = opts?.maxWidthPx;
  /** htmlIndex → marker HTML (one shot per line). */
  const atIndex = new Map<number, string>();
  for (const [line, shot] of byLine) {
    const offset = findPlainLineStartOffset(plain, line);
    if (offset == null || offset < 0 || offset >= mapped.length) continue;
    const htmlIndex = nudgeInsertBeforeOpenTags(cleaned, mapped[offset]!.htmlIndex);
    if (atIndex.has(htmlIndex)) continue;
    atIndex.set(htmlIndex, markerBlockHtml(shot, maxWidthPx));
  }
  if (!atIndex.size) return cleaned;

  const inserts = [...atIndex.entries()]
    .map(([htmlIndex, html]) => ({ htmlIndex, html }))
    .sort((a, b) => b.htmlIndex - a.htmlIndex);

  let out = cleaned;
  for (const ins of inserts) {
    out = out.slice(0, ins.htmlIndex) + ins.html + out.slice(ins.htmlIndex);
  }
  return out;
}

/**
 * @deprecated Prefer injectInlineImagesIntoHtml — rebuilds from plain and drops formatting.
 * Kept only so older call sites/tests do not break mid-migrate.
 */
export function buildInlineChatHtml(
  plainText: unknown,
  placements: InlineImagePlacement[] | null | undefined,
  opts?: InlineInjectOptions | null,
): string {
  const lines = splitMessageLines(plainText);
  if (!lines.length) return '';
  const escaped = lines.map((line) =>
    String(line)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;'),
  );
  const body = escaped.join('<br>');
  return injectInlineImagesIntoHtml(body, placements, opts);
}
