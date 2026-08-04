/**
 * The HTTP-shaped API the frozen UI bundle calls.
 *
 * 1.x expressed this as one ~280-line if/else chain, which made the two things
 * that actually matter here invisible:
 *
 *  1. **Order is semantics.** Matching is prefix-based, so `/v1/gallery/explore`
 *     must be tested before the `/v1/gallery` prefix or explore requests get
 *     served as a plain gallery list. The route table below is evaluated
 *     top-to-bottom and its order is load-bearing — reordering entries changes
 *     behaviour even though no individual entry changed.
 *  2. **Two routes are public.** `/v1/health` and `/v1/debug` are answered before
 *     the auth check so a user with a misconfigured token can still see why.
 *
 * Adding a route means adding one entry. Every route reads its inputs from the
 * `RouteContext` and returns a `RouteResult`; nothing else in this file needs to
 * change.
 */

import { errorBody, isFetchError, makeFetchError } from '../core/errors';
import { clearDebug, debugSnapshot } from '../core/debug';
import { base64ToBytes, u8ToArrayBuffer } from '../core/util/bytes';
import { cleanText } from '../core/util/text';
import { GLOBAL_SCOPE } from '../core/constants';
import { promptText } from '../config/prompts';
import { getConfig, getPresetVibePreviewUrl } from '../services/context';
import * as cards from '../services/cards';
import * as characters from '../services/characters';
import * as diagnostics from '../services/diagnostics';
import * as gallery from '../services/gallery';
import * as generation from '../services/generation';
import * as jobs from '../services/jobs';
import * as naiAssets from '../services/nai-assets';
import * as settings from '../services/settings';
import { authorized, parseQuery, q, type Headers, type Query } from './http';

export interface RouteResult {
  status: number;
  data: unknown;
  contentType?: string;
  /** True when `data` is raw bytes rather than a JSON value. */
  raw?: boolean;
}

export interface RouteContext {
  method: string;
  pathname: string;
  query: Query;
  body: Record<string, unknown>;
  /** The variable part of the path, for prefix and wrapped matches. */
  param: string;
}

type Matcher = (pathname: string) => string | null;

/** Matches any of the given paths exactly. */
const exact =
  (...paths: string[]): Matcher =>
  (pathname) =>
    paths.includes(pathname) ? '' : null;

/** Matches a path prefix; the remainder becomes `ctx.param`. */
const under =
  (prefix: string): Matcher =>
  (pathname) =>
    pathname.startsWith(prefix) ? pathname.slice(prefix.length) : null;

/** Matches `<prefix><param><suffix>`, e.g. `/v1/cards/:id/tags`. */
const wrapped =
  (prefix: string, suffix: string): Matcher =>
  (pathname) =>
    pathname.startsWith(prefix) && pathname.endsWith(suffix)
      ? pathname.slice(prefix.length, pathname.length - suffix.length)
      : null;

interface Route {
  match: Matcher;
  handler: (ctx: RouteContext) => Promise<RouteResult> | RouteResult;
}

const ok = (data: unknown): RouteResult => ({ status: 200, data });
const png = (data: ArrayBuffer): RouteResult => ({ status: 200, data, contentType: 'image/png', raw: true });
const notFound = (message: string): never => {
  throw makeFetchError(404, { ok: false, ...errorBody(message, 'not_found') }, message);
};

/** Strips a `data:` prefix and whitespace from a base64 upload field. */
function uploadBase64(body: Record<string, unknown>): string {
  let raw = body.image_b64 || body.data || '';
  if (typeof raw === 'string' && raw.startsWith('data:')) raw = raw.split(',', 2)[1] ?? '';
  return String(raw || '');
}

// ── GET ────────────────────────────────────────────────────────────────────

// `/v1/debug` is absent from both tables on purpose: `routeFetch` answers it
// before the auth check and returns unconditionally, so an entry here could
// never be reached.
const GET_ROUTES: readonly Route[] = [
  { match: exact('/v1/settings/export'), handler: () => ok({ ok: true, json: settings.exportSettingsJson() }) },
  { match: exact('/v1/settings'), handler: () => ok({ ok: true, settings: settings.publicSettings() }) },
  { match: exact('/v1/prompts'), handler: async () => ok({ ok: true, prompts: await settings.listPrompts() }) },
  {
    match: under('/v1/prompts/'),
    handler: async ({ param }) => ok({ ok: true, key: param, text: await settings.getPrompt(param) }),
  },
  { match: under('/v1/jobs/'), handler: async ({ param }) => ok(await jobs.getJob(param)) },
  {
    match: under('/v1/gallery/explore'),
    handler: async ({ query }) => ok(await gallery.galleryExplore(Number(q(query, 'limit', '400')))),
  },
  { match: exact('/v1/gallery/favorites'), handler: async () => ok(await gallery.getExplorerFavorites()) },
  {
    match: under('/v1/gallery'),
    handler: async ({ query }) => ok(await gallery.gallery(q(query, 'session_id'), Number(q(query, 'limit', '40')))),
  },
  {
    match: exact('/v1/nai/reference.png'),
    handler: async () => png((await naiAssets.getReferenceImageBytes()) ?? notFound('no reference')),
  },
  {
    match: exact('/v1/nai/vibe.png'),
    handler: async () => png((await naiAssets.getVibeImageBytes()) ?? notFound('no vibe')),
  },
  {
    match: exact('/v1/nai/reference'),
    handler: async () => {
      const configured = await naiAssets.hasReferenceImage();
      return ok({
        ok: true,
        configured,
        image_reference: getConfig().nai?.image_reference || 'none',
        preview_url: configured ? '/v1/nai/reference.png' : '',
      });
    },
  },
  {
    match: exact('/v1/nai/vibe'),
    handler: async () => {
      const configured = await naiAssets.hasVibeTransfer();
      return ok({
        ok: true,
        configured,
        vibe_transfer: getConfig().nai?.vibe_transfer || 'none',
        preview_url: configured ? '/v1/nai/vibe.png' : '',
      });
    },
  },
  {
    match: under('/v1/characters'),
    handler: async ({ query }) =>
      ok(await characters.getCharactersPayload(q(query, 'session_id'), q(query, 'character_id'))),
  },
  {
    match: under('/v1/appearance/'),
    handler: async ({ param }) => ok(await characters.getCharactersPayload(param)),
  },
  {
    match: under('/v1/images/'),
    handler: async ({ param }) => {
      let cardId = param.replace(/^\/+|\/+$/g, '');
      if (cardId.endsWith('.json')) {
        const loc = await generation.readImageLocation(cardId.slice(0, -'.json'.length));
        if (!Object.keys(loc).length) notFound('location missing');
        return ok(loc);
      }
      if (cardId.endsWith('.png')) cardId = cardId.slice(0, -'.png'.length);
      return png((await gallery.getImageBytes(cardId)) ?? notFound('image missing'));
    },
  },
];

// ── POST / PUT / PATCH ─────────────────────────────────────────────────────

const WRITE_ROUTES: readonly Route[] = [
  { match: exact('/v1/settings/reset'), handler: async () => ok(await settings.resetSettings()) },
  {
    match: exact('/v1/settings/import'),
    handler: async ({ body }) => ok(await settings.importSettingsJson(String(body.json || body.text || ''))),
  },
  {
    match: exact('/v1/settings', '/v1/settings/update'),
    handler: async ({ body }) => ok(await settings.updateSettings(body)),
  },
  {
    match: wrapped('/v1/prompts/', '/reset'),
    handler: async ({ param }) => ok(await settings.setPrompt(param, promptText(param))),
  },
  {
    match: under('/v1/prompts/'),
    handler: async ({ param, body }) => ok(await settings.setPrompt(param, String(body.text || ''))),
  },
  {
    match: exact('/v1/jobs/create', '/v1/jobs'),
    handler: async ({ body }) => ({ status: 202, data: await jobs.createJob(body) }),
  },
  {
    match: exact('/v1/gallery/unlink', '/v1/cards/unlink'),
    handler: async ({ body }) =>
      ok(
        await gallery.unlinkCardsForMessage(
          String(body.session_id || ''),
          String(body.content_hash || ''),
          body.message_index,
        ),
      ),
  },
  {
    match: exact('/v1/gallery/rebind-hash', '/v1/cards/rebind-hash'),
    handler: async ({ body }) =>
      ok(
        await gallery.rebindCardsHash({
          session_id: String(body.session_id || body.sessionId || ''),
          card_ids: (body.card_ids || body.ids || []) as unknown[],
          to_hash: String(body.to_hash || body.content_hash || ''),
          assistant_preview: String(body.assistant_preview || body.assistant_text || ''),
        }),
      ),
  },
  {
    match: exact('/v1/gallery/delete', '/v1/cards/delete'),
    handler: async ({ body }) => {
      const folderKey = cleanText(body.folder_key || '', 400);
      const cardId = cleanText(body.card_id || body.id || '', 80);
      const cardIds = Array.isArray(body.card_ids) ? body.card_ids : null;
      if (folderKey) return ok(await gallery.deleteFolder(folderKey));
      if (cardIds?.length) return ok(await gallery.deleteCards(cardIds));
      if (cardId) return ok(await gallery.deleteCard(cardId));
      const message = 'card_id or folder_key required';
      throw makeFetchError(400, { ok: false, ...errorBody(message, 'bad_request') }, message);
    },
  },
  { match: exact('/v1/gallery/export'), handler: async ({ body }) => ok(await gallery.exportGalleryZip(body)) },
  { match: exact('/v1/gallery/import'), handler: async ({ body }) => ok(await gallery.importGalleryZip(body)) },
  {
    match: exact('/v1/gallery/favorites'),
    handler: async ({ body }) => {
      if (Array.isArray(body.ids)) return ok(await gallery.setExplorerFavorites(body.ids));
      return ok(await gallery.getExplorerFavorites());
    },
  },
  {
    match: wrapped('/v1/cards/', '/tags'),
    handler: async ({ param, body }) => ok(await cards.updateCardTags(param, body)),
  },
  {
    match: wrapped('/v1/cards/', '/reroll'),
    handler: async ({ param, body }) => ok(await cards.rerollCard(param, String(body.mode || 'nai'), body.overrides)),
  },
  {
    match: exact('/v1/messages/reroll', '/v1/gallery/reroll-message'),
    handler: async ({ body }) =>
      ok(
        await cards.rerollMessageCards({
          session_id: String(body.session_id || body.sessionId || ''),
          content_hash: String(body.content_hash || body.contentHash || ''),
          message_index: Number(body.message_index ?? body.messageIndex ?? -1),
        }),
      ),
  },
  {
    match: exact('/v1/characters/global-toggles', '/v1/characters/global_toggles'),
    handler: async ({ body }) =>
      ok(
        await characters.setDisabledGlobals(
          String(body.character_id || ''),
          (body.disabled_globals || body.disabled || []) as unknown[],
        ),
      ),
  },
  {
    match: exact('/v1/characters/unify', '/v1/characters/merge'),
    handler: async ({ body }) =>
      ok(
        await characters.unifyCharacterSessions(
          String(body.target_session_id || body.session_id || ''),
          (body.source_session_ids || body.session_ids || []) as unknown[],
          body.include_target !== false,
        ),
      ),
  },
  { match: exact('/v1/characters', '/v1/characters/update'), handler: ({ body }) => updateCharacters(body) },
  {
    match: under('/v1/appearance/'),
    handler: async ({ param, body }) => {
      if (body.characters != null || body.global != null) {
        if (body.characters != null) {
          await characters.replaceCharacters(param, (body.characters || []) as unknown[], { prune: true });
        }
        if (body.global != null) {
          await characters.replaceCharacters(GLOBAL_SCOPE, (body.global || []) as unknown[], { prune: true });
        }
        return ok(await characters.getCharactersPayload(param));
      }
      return ok(await characters.setAppearance(param, body.appearance || {}));
    },
  },
  {
    match: exact('/v1/models/test'),
    handler: async ({ body }) => ok(await diagnostics.testLlm(body.llm && typeof body.llm === 'object' ? body.llm : null)),
  },
  { match: exact('/v1/nai/test'), handler: async () => ok(await diagnostics.testNai()) },
  {
    match: exact('/v1/nai/probe', '/v1/debug/probe-nai'),
    handler: async () => ok(await diagnostics.probeNaiGenerate()),
  },
  {
    match: exact('/v1/debug/clear'),
    handler: () => {
      clearDebug();
      return ok({ ok: true, cleared: true });
    },
  },
  {
    match: exact('/v1/nai/reference', '/v1/nai/reference/upload'),
    handler: async ({ body }) => {
      if (body.clear) return ok(await naiAssets.clearReferenceImage());
      const rawB64 = uploadBase64(body);
      if (!cleanText(rawB64)) throw new Error('image_b64 required');
      return ok(await naiAssets.setReferenceImage(u8ToArrayBuffer(base64ToBytes(rawB64))));
    },
  },
  { match: exact('/v1/nai/reference/clear'), handler: async () => ok(await naiAssets.clearReferenceImage()) },
  {
    match: exact('/v1/nai/vibe', '/v1/nai/vibe/upload'),
    handler: async ({ body }) => {
      const presetId = cleanText(body.preset_id || body.presetId || '', 120);
      if (body.clear) {
        if (presetId) return ok(await naiAssets.clearPresetVibeTransfer(presetId));
        return ok(await naiAssets.clearVibeTransfer());
      }
      if (presetId && body.copy_from) {
        const from = cleanText(body.copy_from, 120);
        const copied = from ? await naiAssets.copyPresetVibeTransfer(from, presetId) : false;
        return ok({
          ok: true,
          preset_id: presetId,
          configured: copied,
          preview_url: copied ? getPresetVibePreviewUrl(presetId) : '',
        });
      }
      const rawB64 = uploadBase64(body);
      if (!cleanText(rawB64)) throw new Error('image_b64 required');
      const opts = {
        model: body.model,
        information_extracted: body.information_extracted ?? body.vibe_transfer_information_extracted,
        strength: body.strength ?? body.vibe_transfer_strength,
      };
      if (presetId) {
        return ok(await naiAssets.setPresetVibeTransfer(presetId, u8ToArrayBuffer(base64ToBytes(rawB64)), opts));
      }
      return ok(await naiAssets.setVibeTransfer(u8ToArrayBuffer(base64ToBytes(rawB64)), opts));
    },
  },
  {
    match: exact('/v1/nai/vibe/clear'),
    handler: async ({ body }) => {
      const presetId = cleanText(body?.preset_id || body?.presetId || '', 120);
      if (presetId) return ok(await naiAssets.clearPresetVibeTransfer(presetId));
      return ok(await naiAssets.clearVibeTransfer());
    },
  },
  {
    match: exact('/v1/autotag', '/v1/autotag/evaluate'),
    handler: async ({ body }) => {
      const rawB64 = uploadBase64(body).replace(/\s+/g, '');
      if (!rawB64) throw new Error('image_b64 required');
      const bytes = base64ToBytes(rawB64);
      return ok(await diagnostics.evaluateAutotag(u8ToArrayBuffer(bytes), Number(body.threshold ?? 0.2)));
    },
  },
];

/**
 * The characters write route is the one endpoint that performs several
 * operations per request, because the unified editor saves a whole view at once
 * and the order of those writes matters.
 */
async function updateCharacters(body: Record<string, unknown>): Promise<RouteResult> {
  const sessionId = cleanText(body.session_id || '', 200);
  const characterId = cleanText(body.character_id || '', 200);
  // The unified view edits root sessions only: patch what exists, delete what
  // matches, never create. Creating here would resurrect characters the user
  // deleted in another session.
  const rootSessionIds = (
    Array.isArray(body.root_session_ids)
      ? body.root_session_ids
      : Array.isArray(body.cascade_session_ids)
        ? body.cascade_session_ids
        : []
  )
    .map((s: unknown) => cleanText(s, 200))
    .filter(Boolean);

  if ('characters' in body && sessionId) {
    await characters.replaceCharacters(sessionId, (body.characters || []) as unknown[], {
      prune: true,
      rootSessionIds,
    });
  }
  if ('global' in body) {
    await characters.replaceCharacters(GLOBAL_SCOPE, (body.global || []) as unknown[], { prune: true });
  }
  if ('character' in body) {
    const scope = cleanText(body.scope || sessionId || GLOBAL_SCOPE, 200);
    if (rootSessionIds.length && scope !== GLOBAL_SCOPE) {
      await characters.patchExistingInSessions(rootSessionIds, [body.character || {}], '');
    } else {
      await characters.upsertCharacter(scope, body.character || {});
    }
  }
  const deleteRefs = Array.isArray(body.root_delete)
    ? body.root_delete
    : Array.isArray(body.cascade_delete)
      ? body.cascade_delete
      : [];
  if (deleteRefs.length && rootSessionIds.length) {
    await characters.deleteMatchingInSessions(rootSessionIds, deleteRefs, '');
  }
  // Root edits invalidate the unified view, so rebuild it before responding.
  if (rootSessionIds.length && sessionId) {
    await characters.unifyCharacterSessions(sessionId, rootSessionIds, false);
  }
  return ok(await characters.getCharactersPayload(sessionId, characterId));
}

// ── dispatch ───────────────────────────────────────────────────────────────

async function dispatch(routes: readonly Route[], ctx: Omit<RouteContext, 'param'>): Promise<RouteResult> {
  for (const route of routes) {
    const param = route.match(ctx.pathname);
    if (param === null) continue;
    return route.handler({ ...ctx, param });
  }
  return notFound(ctx.pathname);
}

export interface RouteOptions {
  method?: string;
  body?: unknown;
  headers?: Headers;
}

export async function routeFetch(path: string, options: RouteOptions = {}): Promise<RouteResult> {
  const { pathname, query } = parseQuery(path);
  const method = String(options.method || 'GET').toUpperCase();
  let body: Record<string, unknown>;
  if (typeof options.body === 'string') {
    try {
      body = JSON.parse(options.body) as Record<string, unknown>;
    } catch {
      body = {};
    }
  } else body = (options.body as Record<string, unknown>) ?? {};

  // Answered before auth so a bad token is still diagnosable.
  if (['/v1/health', '/healthz', '/readyz'].includes(pathname)) {
    return ok({ ok: true, health: settings.health() });
  }
  if (pathname === '/v1/debug' || pathname === '/v1/debug/log') {
    if (method === 'DELETE' || (method === 'POST' && body.clear)) {
      clearDebug();
      return ok({ ok: true, cleared: true });
    }
    return ok(debugSnapshot());
  }

  if (!authorized(getConfig(), options.headers || {})) {
    const message = 'invalid token';
    throw makeFetchError(401, { ok: false, ...errorBody(message, 'unauthorized') }, message);
  }

  const ctx = { method, pathname, query, body };
  if (method === 'GET') return dispatch(GET_ROUTES, ctx);

  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    // Writes report failures as 500 with the message intact; reads let the
    // error propagate so a missing image stays a 404 rather than becoming a 500.
    try {
      return await dispatch(WRITE_ROUTES, ctx);
    } catch (exc) {
      if (isFetchError(exc)) throw exc;
      const message = String((exc as Error)?.message || exc);
      throw makeFetchError(500, { ok: false, ...errorBody(message, 'internal') }, message);
    }
  }

  throw makeFetchError(405, { ok: false, ...errorBody(method, 'method_not_allowed') }, method);
}
