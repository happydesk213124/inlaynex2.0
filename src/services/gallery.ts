/**
 * Gallery listings, relinking, and the destructive gallery operations.
 *
 * `png_bytes` is read from the images index, never from image bytes. 1.x fetched
 * one image row per gallery row purely to read `png.byteLength`, which decoded
 * every stored image out of base64 on every gallery open — the single worst cost
 * in the old backend. `imageMeta()` reports the same number from memory, and the
 * fallback order 1.x used (`byteLength` first, then the card's `meta.png_bytes`)
 * is preserved because the index value is exactly that `byteLength`.
 *
 * Two field names are frozen by the UI and must not be unified: a folder
 * identifies itself with `key`, an item points at its folder with `folder_key`.
 *
 * The explorer listing is also the source of truth for ZIP export/import, which
 * is why both go through it rather than reading cards themselves: the manifest
 * and the reattach decision must see rows exactly as the explorer showed them.
 */

import { IMAGE_KEY } from '../core/constants';
import { dbg } from '../core/debug';
import { errorBody } from '../core/errors';
import type { ApiResult, CardRow } from '../core/types';
import { asU8, base64ToBytes, bytesToBase64, u8ToArrayBuffer } from '../core/util/bytes';
import { ASSISTANT_PREVIEW_LIMIT, cleanText, toInt, toOptionalFloat, uuid } from '../core/util/text';
import { attachImageUrls, publishImage, resolveImageUrl } from '../storage/image-urls';
import { cardsForSession, idbDelete, idbGet, idbGetAll, idbPut, imageMeta, imagePng } from '../storage/stores';
import type { ZipEntryInput } from '../ui-contract/gallery-zip';
import { buildGalleryManifest, packGalleryZip, resolveReattach, unpackGalleryZip } from '../ui-contract/gallery-zip';
import {
  cardMetaFromLocation,
  locationFieldsForCard,
  readImageLocation,
  writeImageLocation,
} from './generation';

/** One chat's bucket in the explorer tree. The UI keys these off `key`. */
type ExploreFolder = {
  key: string;
  character_id: string;
  chat_id: string;
  character_name: string;
  chat_name: string;
  char_index: number;
  chat_index: number;
  count: number;
  storage: string;
};

/** One explorer row. `folder_key` names the `key` of its folder. */
type ExploreRow = {
  id: string;
  job_id: string;
  session_id: string;
  folder_key: string;
  shot_index: number;
  paragraph: number;
  y_percent: number | null;
  line?: number | null;
  message_index: number;
  message_role: string;
  content_hash: string;
  character_id: string;
  character_name: string;
  chat_id: string;
  chat_name: string;
  char_index: number;
  chat_index: number;
  assistant_preview: string;
  main_prompt: string;
  characters: unknown[];
  image_url: string;
  seed: number | null;
  created_at: number | undefined;
  storage: string;
  storage_key: string;
  location_file: string;
  png_bytes: number;
};

type ExplorePayload = {
  ok: true;
  folders: ExploreFolder[];
  items: ExploreRow[];
  total: number;
  storage: string;
  storage_api: string;
};

/** One per-session gallery row. Narrower than an explorer row, and unfoldered. */
type GalleryRow = {
  id: string;
  job_id: string;
  shot_index: number;
  paragraph: number;
  y_percent: number | null;
  line?: number | null;
  message_index: number;
  message_role: string;
  content_hash: string;
  character_id: string;
  chat_id: string;
  character_name: string;
  chat_name: string;
  char_index: number;
  chat_index: number;
  assistant_preview: unknown;
  main_prompt: string;
  negative_prompt: string;
  characters: unknown[];
  image_url: string;
  seed: number | null;
  created_at: number | undefined;
  storage: string;
  storage_key: string;
  png_bytes: number;
};

type DeleteResult =
  | { ok: true; deleted: number; ids: string[] }
  | { ok: false; error: { code: string; message: string } };

export interface RebindArgs {
  session_id?: unknown;
  card_ids?: unknown;
  to_hash?: unknown;
  assistant_preview?: unknown;
}

/**
 * A card's `meta_json`. A `"null"` body yields `{}` here rather than the
 * property-access throw it produced in 1.x.
 */
function parseMeta(row: CardRow): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(row.meta_json || '{}');
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * `png_bytes` as 1.x reported it: the stored image's byte length when there is
 * one, else whatever the card recorded. The index holds that byte length, so the
 * precedence survives without hydrating anything.
 */
async function pngBytesOf(id: string, meta: Record<string, unknown>): Promise<number> {
  const info = await imageMeta(id);
  return info?.png_bytes || Number(meta.png_bytes) || 0;
}

/**
 * The explorer listing. Kept internal and typed so export/import can consume the
 * rows directly while `galleryExplore` still hands the UI a plain result.
 */
async function exploreCards(limit: number): Promise<ExplorePayload> {
  const rows = (await idbGetAll('cards'))
    .sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
    .slice(0, Math.max(1, Math.min(2000, limit)));
  const folders: Record<string, ExploreFolder> = {};
  const items: ExploreRow[] = [];
  for (const row of rows) {
    const meta = parseMeta(row);
    const loc = await locationFieldsForCard(row.id, meta);
    const sidecar = await readImageLocation(row.id);
    const characterName = cleanText(loc.character_name || sidecar.character_name || meta.character_name || '', 200);
    const chatName = cleanText(loc.chat_name || sidecar.chat_name || meta.chat_name || '', 200);
    const characterId = cleanText(loc.character_id || '', 200) || 'unknown';
    const chatId = cleanText(loc.chat_id || '', 200) || 'unknown';
    const folderKey = `${characterId}|${chatId}`;
    let folder = folders[folderKey];
    if (!folder) {
      folder = {
        key: folderKey,
        character_id: characterId,
        chat_id: chatId,
        character_name: characterName || characterId.slice(0, 12) || 'Unknown',
        chat_name: chatName || `chat ${loc.chat_index ?? '?'}`,
        char_index: loc.char_index ?? -1,
        chat_index: loc.chat_index ?? -1,
        count: 0,
        storage: 'indexeddb',
      };
      folders[folderKey] = folder;
    }
    // Unreachable: the folder was just seeded with a non-empty name. Kept because
    // dropping it would be a behaviour change if that ever stops holding.
    if (characterName && !folder.character_name) folder.character_name = characterName;
    if (chatName) folder.chat_name = chatName;
    folder.count += 1;
    items.push({
      id: row.id,
      job_id: row.job_id,
      session_id: row.session_id,
      folder_key: folderKey,
      shot_index: loc.shot_index >= 0 ? loc.shot_index : row.shot_index,
      paragraph: Object.keys(sidecar).length ? loc.paragraph : row.paragraph,
      y_percent: loc.y_percent,
      line: loc.line,
      message_index: loc.message_index ?? -1,
      message_role: loc.message_role || '',
      content_hash: loc.content_hash || '',
      character_id: characterId,
      character_name: folder.character_name,
      chat_id: chatId,
      chat_name: folder.chat_name,
      char_index: loc.char_index ?? -1,
      chat_index: loc.chat_index ?? -1,
      assistant_preview: cleanText(
        loc.assistant_preview || sidecar.assistant_preview || meta.assistant_preview || '',
        ASSISTANT_PREVIEW_LIMIT,
      ),
      main_prompt: row.main_prompt,
      characters: JSON.parse(row.characters_json || '[]'),
      image_url: resolveImageUrl(row.id),
      // `seed` is not declared on CardRow, so it arrives as an open-bag value;
      // 1.x emitted it verbatim and the manifest builder wants that number.
      seed: row.seed as number | null,
      created_at: row.created_at,
      storage: 'indexeddb',
      storage_key: loc.storage_key || IMAGE_KEY(row.id),
      location_file: loc.location_file || '',
      png_bytes: await pngBytesOf(row.id, meta),
    });
  }
  const folderList = Object.values(folders).sort((a, b) =>
    `${a.character_name || ''}`.localeCompare(`${b.character_name || ''}`, undefined, { sensitivity: 'base' })
    || `${a.chat_name || ''}`.localeCompare(`${b.chat_name || ''}`, undefined, { sensitivity: 'base' }),
  );
  const payload: ExplorePayload = {
    ok: true,
    folders: folderList,
    items,
    total: items.length,
    storage: 'indexeddb',
    storage_api: 'getLocalPluginStorage',
  };
  // Do not enqueueWarm every miss — explorer warms the visible window only.
  // Refresh used to queue hundreds of base64 encodes and freeze Chrome.
  await attachImageUrls(payload, { cachedOnly: true, warmMissing: false });
  return payload;
}

export async function galleryExplore(limit = 400): Promise<ApiResult> {
  return exploreCards(limit);
}

export async function gallery(sessionId: string, limit = 40): Promise<ApiResult> {
  const rows = (await cardsForSession(sessionId))
    .sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
    .slice(0, Number(limit));
  const items: GalleryRow[] = [];
  for (const row of rows) {
    const meta = parseMeta(row);
    const loc = await locationFieldsForCard(row.id, meta);
    const sidecar = await readImageLocation(row.id);
    items.push({
      id: row.id,
      job_id: row.job_id,
      shot_index: loc.shot_index >= 0 ? loc.shot_index : row.shot_index,
      paragraph: Object.keys(sidecar).length ? loc.paragraph : row.paragraph,
      y_percent: loc.y_percent,
      line: loc.line,
      message_index: loc.message_index ?? -1,
      message_role: loc.message_role || '',
      content_hash: loc.content_hash || '',
      character_id: loc.character_id || '',
      chat_id: loc.chat_id || '',
      character_name: loc.character_name || '',
      chat_name: loc.chat_name || '',
      char_index: loc.char_index ?? -1,
      chat_index: loc.chat_index ?? -1,
      // Unlike the explorer row this one is not cleaned, and the sidecar is not
      // consulted. Both are 1.x behaviour the UI already renders around.
      assistant_preview: loc.assistant_preview || meta.assistant_preview || '',
      main_prompt: row.main_prompt,
      negative_prompt: row.negative_prompt,
      characters: JSON.parse(row.characters_json || '[]'),
      image_url: resolveImageUrl(row.id),
      seed: row.seed as number | null,
      created_at: row.created_at,
      storage: 'indexeddb',
      storage_key: loc.storage_key || IMAGE_KEY(row.id),
      png_bytes: await pngBytesOf(row.id, meta),
    });
  }
  const payload = { ok: true, session_id: sessionId, items, storage: 'indexeddb' };
  await attachImageUrls(payload, { cachedOnly: true });
  return payload;
}

/**
 * One-shot streaming hash upgrade: rewrite content_hash (+ preview) on chosen cards.
 * Client filters by character/chat/msg/role + Dice; server only writes.
 * Also upgrades other cards that share a rebound card's job_id (mid-job siblings
 * that finished on the old streaming hash).
 */
export async function rebindCardsHash(args: RebindArgs = {}): Promise<ApiResult> {
  const sessionId = cleanText(args.session_id, 200);
  const toHash = cleanText(args.to_hash, 128);
  const preview = cleanText(args.assistant_preview || '', ASSISTANT_PREVIEW_LIMIT);
  const ids = (Array.isArray(args.card_ids) ? args.card_ids : []).map((id) => cleanText(id, 80)).filter(Boolean);
  if (!toHash || !ids.length) {
    return { ok: false, ...errorBody('to_hash and card_ids required', 'bad_request'), rebound: 0, ids: [] };
  }
  const want = new Set(ids);
  const jobIds = new Set<string>();
  for (const cardId of ids) {
    const row = await idbGet('cards', cardId);
    const jid = cleanText(row?.job_id || '', 80);
    if (jid) jobIds.add(jid);
  }
  if (jobIds.size && sessionId) {
    for (const row of await cardsForSession(sessionId)) {
      const jid = cleanText(row?.job_id || '', 80);
      if (!jid || !jobIds.has(jid)) continue;
      const id = cleanText(row?.id || '', 80);
      if (id) want.add(id);
    }
  }
  const rebound: string[] = [];
  for (const cardId of want) {
    const row = await idbGet('cards', cardId);
    if (!row) continue;
    if (sessionId && cleanText(row.session_id || '', 200) !== sessionId) continue;
    const meta = parseMeta(row);
    const existing = await readImageLocation(cardId);
    const already = cleanText(existing.content_hash || meta.content_hash || '', 128);
    if (already === toHash) continue;
    const nextLoc = {
      ...existing,
      image_id: cardId,
      content_hash: toHash,
      assistant_preview: preview || existing.assistant_preview || '',
    };
    await writeImageLocation(cardId, nextLoc);
    meta.content_hash = toHash;
    if (preview) meta.assistant_preview = preview;
    meta.message_role = cleanText(meta.message_role || existing.message_role || '', 40).toLowerCase();
    row.meta_json = JSON.stringify(meta);
    await idbPut('cards', row);
    rebound.push(cardId);
  }
  dbg('gallery.rebind', { n: rebound.length, to: toHash.slice(0, 8) });
  return { ok: true, rebound: rebound.length, ids: rebound, content_hash: toHash };
}

export async function unlinkCardsForMessage(
  sessionId: string,
  contentHash = '',
  messageIndex: unknown = null,
): Promise<ApiResult> {
  const sid = cleanText(sessionId, 200);
  const hash = cleanText(contentHash);
  let msgIdx: number | null = null;
  try {
    // Unparseable input leaves NaN rather than null, so the guard below lets it
    // through and the scan simply matches nothing. 1.x behaviour, preserved.
    if (messageIndex != null && String(messageIndex).trim() !== '') msgIdx = parseInt(String(messageIndex), 10);
  } catch {
    msgIdx = null;
  }
  if (!sid || (!hash && msgIdx == null)) return { ok: true, unlinked: 0, ids: [] };
  // The returned id order is 1.x's cards-store scan order, i.e. creation order.
  // The session index reorders a card when it is rewritten, so sort rather than
  // depend on it.
  const rows = (await cardsForSession(sid)).sort((a, b) => (a.created_at || 0) - (b.created_at || 0));
  const unlinkedIds: string[] = [];
  for (const row of rows) {
    const meta = parseMeta(row);
    const loc = await locationFieldsForCard(row.id, meta);
    const cardHash = cleanText(loc.content_hash || '');
    const cardMsg = toInt(loc.message_index, -1);
    let match = false;
    if (hash && cardHash && cardHash === hash) match = true;
    else if (msgIdx != null && msgIdx >= 0 && cardMsg === msgIdx) match = true;
    if (!match) continue;
    const existing = await readImageLocation(row.id);
    const cleared = {
      ...existing,
      version: 1,
      image_id: row.id,
      session_id: sid,
      content_hash: '',
      message_index: -1,
      character_id: '',
      chat_id: '',
      char_index: -1,
      chat_index: -1,
      unlinked_at: Date.now() / 1000,
    };
    await writeImageLocation(row.id, cleared);
    if (meta.content_hash || meta.message_index != null || meta.assistant_preview) {
      meta.content_hash = '';
      meta.assistant_preview = '';
      meta.message_index = -1;
      meta.unlinked_at = Date.now() / 1000;
      row.meta_json = JSON.stringify(meta);
      await idbPut('cards', row);
    }
    unlinkedIds.push(row.id);
  }
  return { ok: true, unlinked: unlinkedIds.length, ids: unlinkedIds };
}

/** Shared by the three delete entry points, which all report `ok` per card. */
async function removeCard(cardId: unknown): Promise<DeleteResult> {
  const id = cleanText(cardId, 80);
  if (!id) return { ok: false, ...errorBody('card_id required', 'bad_request') };
  const row = await idbGet('cards', id);
  if (!row) return { ok: false, ...errorBody('card not found', 'not_found') };
  await idbDelete('cards', id);
  // Deleting the image row is also what drops its cached data URL.
  await idbDelete('images', id);
  return { ok: true, deleted: 1, ids: [id] };
}

export async function deleteCard(cardId: string): Promise<ApiResult> {
  return removeCard(cardId);
}

export async function deleteCards(cardIds: unknown[] = []): Promise<ApiResult> {
  const ids = [...new Set((cardIds || []).map((id) => cleanText(id, 80)).filter(Boolean))];
  const deleted: string[] = [];
  for (const id of ids) {
    const result = await removeCard(id);
    if (result.ok) deleted.push(id);
  }
  return { ok: true, deleted: deleted.length, ids: deleted };
}

export async function getExplorerFavorites(): Promise<ApiResult> {
  const row = await idbGet('meta', 'explorer_favorites');
  const raw = row?.ids;
  const ids = Array.isArray(raw) ? raw.map((id) => cleanText(id, 80)).filter(Boolean) : [];
  return { ok: true, ids };
}

export async function setExplorerFavorites(ids: unknown[] = []): Promise<ApiResult> {
  const clean = [...new Set((ids || []).map((id) => cleanText(id, 80)).filter(Boolean))].slice(0, 5000);
  await idbPut('meta', { key: 'explorer_favorites', ids: clean, updated_at: Date.now() / 1000 });
  return { ok: true, ids: clean };
}

export async function exportGalleryZip(body: Record<string, unknown> = {}): Promise<ApiResult> {
  const explore = await exploreCards(2000);
  let items = explore.items;
  const folderKey = cleanText(body.folder_key || '', 400);
  if (body.all) {
    // keep all
  } else if (folderKey) {
    items = items.filter((it) => it.folder_key === folderKey);
  } else if (Array.isArray(body.card_ids) && body.card_ids.length) {
    const want = new Set(body.card_ids.map((id) => cleanText(id, 80)));
    items = items.filter((it) => want.has(it.id));
  } else {
    return { ok: false, ...errorBody('card_ids, folder_key, or all required', 'bad_request') };
  }
  if (!items.length) return { ok: false, ...errorBody('no images to export', 'empty') };
  const manifest = buildGalleryManifest(items);
  const files: ZipEntryInput[] = [
    { name: 'manifest.json', data: new TextEncoder().encode(JSON.stringify(manifest, null, 2)) },
  ];
  for (const item of items) {
    const png = await getImageBytes(item.id);
    if (!png?.byteLength) continue;
    files.push({ name: `images/${item.id}.png`, data: asU8(png) });
  }
  if (files.length < 2) return { ok: false, ...errorBody('image bytes missing', 'empty') };
  const zip = packGalleryZip(files);
  return {
    ok: true,
    count: files.length - 1,
    filename: `inlay-gallery-${Date.now()}.zip`,
    zip_base64: bytesToBase64(zip),
    bytes: zip.length,
  };
}

export async function importGalleryZip(body: Record<string, unknown> = {}): Promise<ApiResult> {
  const preferNewIds = body.prefer_new_ids === undefined ? true : body.prefer_new_ids;
  const b64 = String(body.zip_base64 || '').replace(/^data:.*base64,/, '');
  if (!b64) return { ok: false, ...errorBody('zip_base64 required', 'bad_request') };
  let raw: Uint8Array;
  try {
    raw = base64ToBytes(b64);
  } catch (err) {
    return { ok: false, ...errorBody(`invalid base64: ${(err as Error)?.message || err}`, 'bad_request') };
  }
  const { manifest, images } = unpackGalleryZip(raw);
  if (!manifest?.items?.length) return { ok: false, ...errorBody('manifest.items missing', 'bad_request') };
  const explore = await exploreCards(2000);
  const existing = explore.items;
  const imported: Array<{ id: string; reattach: string; content_hash: string }> = [];
  const report = { exact: 0, candidate: 0, orphan: 0, skipped: 0 };
  for (const item of manifest.items) {
    const file = String(item.file || `images/${item.id}.png`).replace(/\\/g, '/');
    const png = images.get(file) || images.get(`images/${item.id}.png`);
    if (!png?.byteLength) {
      report.skipped += 1;
      continue;
    }
    const decision = resolveReattach(item, existing);
    report[decision.status] = (report[decision.status] || 0) + 1;
    const loc = { ...(item.location || {}) };
    // Location is kept even for an orphan, so the UI can still jump to it or fix
    // the link by hand later.
    const newId = preferNewIds ? uuid() : cleanText(item.id || '', 80) || uuid();
    const sessionId = cleanText(loc.session_id || '', 200) || `import_${uuid().replace(/-/g, '').slice(0, 10)}`;
    const location = {
      version: 1,
      image_id: newId,
      session_id: sessionId,
      character_id: cleanText(loc.character_id || '', 200),
      character_name: cleanText(loc.character_name || '', 200),
      chat_id: cleanText(loc.chat_id || '', 200),
      chat_name: cleanText(loc.chat_name || '', 200),
      char_index: toInt(loc.char_index, -1),
      chat_index: toInt(loc.chat_index, -1),
      message_index: toInt(loc.message_index, -1),
      shot_index: toInt(loc.shot_index, 0),
      paragraph: toInt(loc.paragraph, 0),
      y_percent: toOptionalFloat(loc.y_percent),
      content_hash: cleanText(loc.content_hash || '', 128),
      assistant_preview: cleanText(loc.assistant_preview || '', ASSISTANT_PREVIEW_LIMIT),
      imported_at: Date.now() / 1000,
      reattach: decision.status,
    };
    const bytes = u8ToArrayBuffer(png);
    await publishImage(newId, bytes, location);
    const meta = cardMetaFromLocation(
      {
        ...(item.meta || {}),
        assistant_preview: location.assistant_preview,
        imported_at: location.imported_at,
        reattach: decision.status,
      },
      location,
      bytes.byteLength || 0,
    );
    await idbPut('cards', {
      id: newId,
      job_id: `import_${newId.slice(0, 8)}`,
      session_id: sessionId,
      shot_index: location.shot_index,
      paragraph: location.paragraph,
      main_prompt: cleanText(item.meta?.main_prompt || '', 8000),
      negative_prompt: '',
      characters_json: JSON.stringify(item.meta?.characters || []),
      seed: item.meta?.seed ?? 0,
      meta_json: JSON.stringify(meta),
      created_at: Number(item.meta?.created_at) || Date.now() / 1000,
    });
    imported.push({ id: newId, reattach: decision.status, content_hash: location.content_hash });
  }
  return { ok: true, imported: imported.length, items: imported, report };
}

export async function deleteFolder(folderKey: string): Promise<ApiResult> {
  const key = cleanText(folderKey, 400);
  if (!key || !key.includes('|')) return { ok: false, ...errorBody('folder_key required', 'bad_request') };
  const [characterId, chatId] = key.split('|', 2);
  const cid = cleanText(characterId, 200) || 'unknown';
  const chid = cleanText(chatId, 200) || 'unknown';
  const rows = await idbGetAll('cards');
  const deletedIds: string[] = [];
  for (const row of rows) {
    const meta = parseMeta(row);
    const loc = await locationFieldsForCard(row.id, meta);
    const rowCid = cleanText(loc.character_id || '', 200) || 'unknown';
    const rowChid = cleanText(loc.chat_id || '', 200) || 'unknown';
    if (rowCid !== cid || rowChid !== chid) continue;
    const result = await removeCard(row.id);
    if (result.ok) deletedIds.push(row.id);
  }
  return { ok: true, deleted: deletedIds.length, ids: deletedIds, folder_key: `${cid}|${chid}` };
}

export async function getImageBytes(cardId: string): Promise<ArrayBuffer | null> {
  return imagePng(cardId);
}
