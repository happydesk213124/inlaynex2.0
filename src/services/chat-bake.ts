/**
 * Write / strip `[[@inray::cardId::inxshot_…]]` on one Risu chat message.
 */
import { risuHost } from '../core/host';
import { toInt } from '../core/util/text';
import { stripBakeTokens } from '../domain/chat-bake';
import { isShotAssetName, shotAssetName } from '../domain/gallery/shot-assets';
import { normalizeInlineChatTextSide } from '../domain/inline-chat';
import { applyBakeTokensToBody } from '../ui-contract/viewer-core';
import { getConfig } from './context';
import { imageAssetRef } from '../storage/stores';
import { ensureInrayDisplayModule } from '../storage/inray-display-module';

export type BakeCardRow = {
  id?: unknown;
  line?: unknown;
};

function chatMessageList(chat: Record<string, unknown>): Record<string, unknown>[] {
  const raw = chat.message ?? chat.messages;
  return Array.isArray(raw) ? raw.filter((row) => row && typeof row === 'object') as Record<string, unknown>[] : [];
}

function messageBody(msg: Record<string, unknown>): string {
  if (typeof msg.data === 'string') return msg.data;
  if (typeof msg.saying === 'string') return msg.saying;
  return '';
}

function setMessageBody(msg: Record<string, unknown>, text: string): void {
  if (typeof msg.data === 'string' || !('saying' in msg)) msg.data = text;
  else msg.saying = text;
}

async function aroundScrollHold(work: () => Promise<void>): Promise<void> {
  const hold = (globalThis as { __INLAY_SCROLL_HOLD__?: (fn: () => Promise<void>) => Promise<void> }).__INLAY_SCROLL_HOLD__;
  if (typeof hold === 'function') {
    await hold(work);
    return;
  }
  await work();
}

async function loadTargetChat(
  charIndex: number,
  chatIndex: number,
): Promise<{ host: NonNullable<ReturnType<typeof risuHost>>; chat: Record<string, unknown> } | null> {
  const host = risuHost();
  if (!host || typeof host.getChatFromIndex !== 'function' || typeof host.setChatToIndex !== 'function') {
    return null;
  }
  if (charIndex < 0 || chatIndex < 0) return null;
  const chat = await host.getChatFromIndex(charIndex, chatIndex);
  if (!chat || typeof chat !== 'object') return null;
  return { host, chat: chat as Record<string, unknown> };
}

async function writeChat(
  host: NonNullable<ReturnType<typeof risuHost>>,
  charIndex: number,
  chatIndex: number,
  chat: Record<string, unknown>,
): Promise<void> {
  await aroundScrollHold(async () => {
    await host.setChatToIndex!(charIndex, chatIndex, chat);
  });
}

export async function bakeCardsIntoChatMessage(opts: {
  charIndex: number;
  chatIndex: number;
  messageIndex: number;
  cards: BakeCardRow[];
}): Promise<boolean> {
  const loaded = await loadTargetChat(opts.charIndex, opts.chatIndex);
  if (!loaded) return false;
  await ensureInrayDisplayModule();
  const messages = chatMessageList(loaded.chat);
  const idx = Math.floor(Number(opts.messageIndex));
  if (!Number.isFinite(idx) || idx < 0 || idx >= messages.length) return false;
  const msg = messages[idx]!;
  const side = normalizeInlineChatTextSide(getConfig().card?.inline_chat_text_side);
  const placements: Array<{ line: number; cardId: string; assetName: string }> = [];
  for (const card of opts.cards) {
    const cardId = String(card?.id || '');
    const line = Math.floor(Number(card?.line));
    if (!cardId || !Number.isFinite(line) || line < 1) continue;
    const asset = await imageAssetRef(cardId);
    if (!asset?.path) continue;
    const assetName = isShotAssetName(asset.name) ? asset.name : shotAssetName(cardId, 'webp');
    if (!assetName) continue;
    placements.push({ line, cardId, assetName });
  }
  const next = applyBakeTokensToBody(messageBody(msg), placements, side);
  if (next === messageBody(msg)) return placements.length > 0;
  setMessageBody(msg, next);
  messages[idx] = msg;
  if (Array.isArray(loaded.chat.message)) loaded.chat.message = messages;
  else loaded.chat.messages = messages;
  await writeChat(loaded.host, opts.charIndex, opts.chatIndex, loaded.chat);
  return true;
}

export async function stripBakedImagesFromChatMessage(opts: {
  charIndex: number;
  chatIndex: number;
  messageIndex: number;
}): Promise<boolean> {
  const loaded = await loadTargetChat(opts.charIndex, opts.chatIndex);
  if (!loaded) return false;
  const messages = chatMessageList(loaded.chat);
  const idx = Math.floor(Number(opts.messageIndex));
  if (!Number.isFinite(idx) || idx < 0 || idx >= messages.length) return false;
  const msg = messages[idx]!;
  const prev = messageBody(msg);
  const next = stripBakeTokens(prev);
  if (next === prev) return false;
  setMessageBody(msg, next);
  messages[idx] = msg;
  if (Array.isArray(loaded.chat.message)) loaded.chat.message = messages;
  else loaded.chat.messages = messages;
  await writeChat(loaded.host, opts.charIndex, opts.chatIndex, loaded.chat);
  return true;
}

export function persistChatImagesOn(): boolean {
  return getConfig().card?.persist_chat_images === true;
}

export function jobChatTarget(request: {
  char_index?: unknown;
  chat_index?: unknown;
  message_index?: unknown;
}): { charIndex: number; chatIndex: number; messageIndex: number } {
  return {
    charIndex: toInt(request.char_index, -1),
    chatIndex: toInt(request.chat_index, -1),
    messageIndex: toInt(request.message_index, -1),
  };
}
