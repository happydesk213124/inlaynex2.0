# UI CONTRACT

Everything the frozen UI (`vendor/inlay-nexus-ui.js`) requires from the backend.
The UI cannot be rebuilt, so this contract is **fixed**. `npm run parity` enforces it.

---

## 1. `globalThis.__INLAY_NATIVE__`

The UI's fetch wrapper is `K(path, init, timeoutMs)`; it throws
`"Inlay Nexus backend unavailable"` if `.fetch` is missing.

| Member | Signature | Notes |
|---|---|---|
| `ready` | `() => Promise<boolean>` | Awaited before every request |
| `fetch` | `(path, {method, body}, timeoutMs) => Promise<any>` | `body` is a **plain object**, not a JSON string. Resolves with the parsed response; throws on error with `.status`/`.data` |
| `resolveImageUrl` | `(cardOrId) => string` | Synchronous cache hit, else `""` |
| `ensureImageUrl` | `(id) => Promise<string>` | Loads and caches |
| `warmImages` | `(ids: string[]) => Promise<void>` | Fire-and-forget prefetch |
| `pinImageUrls` | `(ids: string[]) => void` | Pin sticky-window ids against data-URL LRU eviction; prioritizes their warm queue |
| `refPreviewUrl` | `() => string` | Reference-image preview `src` |
| `vibePreviewUrl` | `() => string` | Vibe-image preview `src` |
| `VERSION` | `string` | Not read by the UI; kept for diagnostics |
| `debug` / `clearDebug` | `() => any` | Not read by the UI |

> **Image URLs must be `data:image/...`.** The UI passes them through DOMPurify,
> which strips `blob:`. Returning a `blob:` URL renders nothing.
>
> Explorer thumbs: `/v1/gallery/explore` attaches URLs with `cachedOnly`, so the
> grid paints from `resolveImageUrl` and fills in via `warmImages` /
> `onWarmProgress`. While the explorer panel is open, warm progress must still
> reapply `src` on `.explorer-card img` (build patch); otherwise freshly generated
> cards stay on the broken-image icon until a full panel remount.
>
> Style presets may carry optional `cfg_scale` / `cfg_rescale` (empty → NAI
> model defaults). Per-preset vibe is a device-local upload like NAI vibe
> (`POST /v1/nai/vibe` with `preset_id`); when set it replaces the NAI vibe for
> that generation. JSON export does not embed vibe bytes.

## 2. Other globals the UI reads

Supplied by `src/bridge/ui-globals.ts`. The UI degrades gracefully if a method is
missing, which historically hid bugs — so we publish the full surface.

| Global | Purpose |
|---|---|
| `__INLAY_VIEWER_CORE__` | overlay/pin geometry, gallery ordering, DOM↔API message matching; sticky always-image size via `resolveStickyThumbPct` / `stickyThumbBoxFromPct` (hide = 0%, not display:none) + `fitBoxInside` against NAI w×h; sticky thumb HTML/shell use transparent backgrounds (no opaque letterbox bars); `claimStickyMarkerByCardId` reuses a still-mounted pin on partial card-set swaps so sticky pins do not duplicate |
| `__INLAY_LLM__` | provider list, endpoint defaults, model placeholders |
| `__INLAY_LORE_EXTRA__` | `lb-xnai.lb.extra` lorebook trimming |
| `__INLAY_EXPLORER__` | explorer multi-select state machine |

The UI also sets `globalThis.INLAY_NEXUS_RUNTIME` to its own state object, and
requires the host `globalThis.risuai`.

## 3. Routes

`GET` unless noted. Auth: `Authorization: Bearer <token>` or `X-Inlay-Nexus-Token`,
skipped for health/debug.

### Health
| Route | Response |
|---|---|
| `/v1/health`, `/healthz`, `/readyz` | `{ health: { version, storage, … } }` |

### Settings
| Route | Body → Response |
|---|---|
| `/v1/settings` | `{ settings }` |
| `PUT /v1/settings` | partial `{card?, llm?, nai?}` → `{ settings }` |
| `POST /v1/settings/update` | alias of the above |
| `/v1/settings/export` | `{ json }` — drops `api_key`/`auth_token`/`password`/`secret`, but **not** `service_account_json`; see the note in `src/config/schema.ts` |
| `POST /v1/settings/import` | `{ json }` |
| `POST /v1/settings/reset` | `{}` → `{ settings }`; **keeps API keys + presets** |

The UI guards writes with a `settingsWriteGen` counter and merges pending patches,
so out-of-order responses are discarded client-side. The backend just answers.

### Prompts
`/v1/prompts` → `{ prompts: [{key, text}] }` · `/v1/prompts/:key` ·
`PUT /v1/prompts/:key` `{text}` · `POST /v1/prompts/:key/reset` ·
`GET /v1/prompts/export` → `{ version, prompts: { [key]: text } }` ·
`POST /v1/prompts/import` `{ json | prompts }` ·
`POST /v1/prompts/reset-defaults` `{ keep_author_note?: true }` (default keeps
`author_note`, resets every other pack key to the shipped default).

The frozen UI prompts tab has pack-level toolbar buttons (reset defaults except
author note, export/import all JSON) and per-prompt JSON export/import beside
save/reset — asserted build patches in `vite.config.ts`. Reset (single and pack)
asks `globalThis.confirm` first.

`card.natural_base` is a string mode: `off` | `short` | `detailed` | `supplement`
(legacy booleans migrate in `schema.ts`). The dashboard control is a `<select>`
patched in at build time (was a checkbox).

`card.person_tag_weight` is `0`–`5` (default `3`): NAI emphasis on Inlay
person-count tags (`0` = plain `1girl, 1boy`; `N` = `N::1girl, 1boy::`). Card
settings places a number input beside Include Max (asserted vendor patch).

`card.person_tag_solo` (boolean, default `false`): when the shot has exactly one
character, put `solo` instead of `1girl`/`1boy` (still emphasized by weight).
Also applies when `person_tag_mode` is `off`. UI replaces the unused Preprocessing
checkbox (asserted vendor patch); `card.preprocessing` remains a silent dummy.

`curation.mode` (`off` | `two_stage` | `embed_snap`) lives on the **큐레이팅**
settings tab (asserted vendor patch). Legacy `card.composition_curation: true`
migrates to `two_stage`. Character appearance/attire tags are never replaced by
catalog snap. Curated option tags split by `slot` (`base` | `char`, inferred from
group id when omitted): **base** → shot camera/place (`main_prompt` setup);
**char** → every `characters[].action`. Shot-tag popup prefers the **stored**
`characters[].prompt` (generation / image metadata); live roster rebuild is only
a fallback when that prompt is empty.

`curation.strict_ids` (boolean, default `false`) is a checkbox on the same tab
(asserted vendor patch, `nx-curation-strict-ids`), enabled only when
`mode === "two_stage"`. When on: pass-1 leaves `camera`/`situation`/`natural`
and every `characters[].action|expression` empty (names, `y_percent`, and the
composition leaf id are still requested), and pass-2's schema additionally
accepts per-actor `characters: [{index, option_ids}]` beside the existing flat
`curation_option_ids`, so the LLM assembles scene/action tags from catalog ids
only — never freeform text. Local assembly applies global ids as usual, then
applies each actor's `option_ids` onto that character's action; roster
appearance/attire is never overwritten. Catalog groups with `continuity: true`
(Maid continuity chains) are withheld from both passes — they carry forward
automatically job-to-job via preset modifier bindings instead of being
LLM-picked. Off, or `mode !== "two_stage"`, behaves exactly as before.
| Route | Notes |
|---|---|
| `GET /v1/curation/status` | mode, catalog meta, embed_status, embed_progress |
| `GET /v1/curation/catalog` | active catalog JSON |
| `PUT /v1/curation/catalog` | `{catalog}` upload/replace |
| `POST /v1/curation/catalog/reset` | restore small default + clear embeddings |
| `POST /v1/curation/embed` | pre-embed catalog → device store |
| `POST /v1/curation/embed/test` | embedding connection smoke test |
| `POST /v1/curation/settings` | `{mode?, strict_ids?, embedding?}` |

Keys: `author_note, tagger, format, prefill, preprocess, preset_1, lore_inject,
char_inject, appearance_inject, asset_tags_inject, autotag, curation_refine, curation_embed_hint`.

### Jobs
| Route | Notes |
|---|---|
| `POST /v1/jobs/create` | → `{ job_id }` (**202**) or `{ busy: true }` / `{ error: { code: "busy" } }` |
| `/v1/jobs/:id` | `{ ok, state, error?, progress? }`, state ∈ `queued\|tagging\|generating\|done\|cancelled\|error` |

Create body: `session_id, character_id, character_name, chat_id, chat_name,
unified_session_id, source_session_ids[], char_index, chat_index, assistant_text,
message_index, message_role, content_hash, recent_messages[], lorebook[],
lore_trigger_keys[], character_description, persona_description, force`.

### Gallery / cards
| Route | Notes |
|---|---|
| `/v1/gallery?session_id=&limit=` | `{ items: Card[] }` |
| `/v1/gallery/explore?limit=` | `{ folders[], items[] }` — folder rows use `key`, item rows use `folder_key` |
| `/v1/gallery/favorites` · `POST` `{ids}` | explorer favourites |
| `POST /v1/gallery/unlink` | `{session_id, content_hash, message_index}` |
| `POST /v1/gallery/rebind-hash` | `{session_id, card_ids[], to_hash, assistant_preview}` |
| `POST /v1/gallery/delete` | `{card_ids[]}` **or** `{folder_key}` |
| `POST /v1/gallery/export` | `{all\|folder_key\|card_ids}` → `{ok, zip_base64, filename, count}` |
| `POST /v1/gallery/import` | `{zip_base64, prefer_new_ids}` → `{ok, imported, report}` |
| `POST /v1/cards/:id/tags` | `{main_prompt, negative_prompt, characters[]}` |
| `POST /v1/cards/:id/reroll` | `{mode:"nai", overrides?}` → `{ok, card, replaced?}` |
| `POST /v1/messages/reroll` | `{session_id, content_hash, message_index}` |
| `/v1/images/:id`, `/v1/images/:id.json` | raw bytes / placement sidecar |

Card fields the UI reads: `id, content_hash, session_id, message_index, paragraph,
shot_index, y_percent, anchor_percent, read_percent, created_at, image_url,
main_prompt, negative_prompt, assistant_preview, text, characters[],
character_name, chat_name, folder_key`.

### Characters
| Route | Notes |
|---|---|
| `/v1/characters?session_id=&character_id=` | `{ characters[], global[], appearance, disabled_globals[] }` |
| `POST /v1/characters` | 6 body shapes: bulk save, single `character`, unified patch (`root_session_ids`), move-to-global, delete (`root_delete[]`), create |
| `POST /v1/characters/global-toggles` | `{character_id, disabled_globals[]}` |
| `POST /v1/characters/unify` | `{target_session_id, source_session_ids[], include_target}` |
| `/v1/appearance/:sessionId` · `POST` | legacy alias |

Record: `id, name, original, aliases[], surname, given_name, surname_variants[],
given_name_variants[], appearance, attire, accessories, attire_locked,
accessories_locked, priority, gender (`girl`|`boy`|`other`|``), original, aliases[].
`attire` = clothes + permanent jewelry; `accessories` = weapons/props only.
`attire_locked` / `accessories_locked` default **ON** (`!== false`). When locked, shot
`attire`/`accessories` are ignored for generation. When unlocked, shot wear applies to
**that shot's caption only** — it is never written back to the roster. Roster wear
changes via character edit/create; or when appearance is still empty, a
`new_characters` re-collect **overwrites** appearance+attire+accessories. UI exposes
lock toggles on the character tab and edit/create popups.
Autotag returns the same look fields plus `gender`. Missing roster `gender` is
filled once from exact look tokens (`girl`/`woman`/`female` vs `boy`/`man`/`male`)
then persisted.

### NovelAI / models / autotag
`POST /v1/models/test` `{llm?}` · `POST /v1/nai/test` · `POST /v1/nai/probe` ·
`POST /v1/nai/reference` `{image_b64}` · `POST /v1/nai/reference/clear` ·
`POST /v1/nai/vibe` `{image_b64, information_extracted, strength}` ·
`POST /v1/nai/vibe/clear` · `/v1/nai/reference` · `/v1/nai/vibe` ·
`POST /v1/autotag` `{image_b64, threshold}` → `{ok, appearance, attire, accessories, tags, text}`
`POST /v1/presets/from-image` `{image_b64}` → `{ok, positive, negative, cfg_scale, cfg_rescale, name}`

### Debug
`/v1/debug`, `POST /v1/debug/clear` → `{ events[], by_stage{}, env{} }`

### Errors
404 unknown path · 405 unsupported method · 500 handler failure. Errors carry
`.status` and `.data.error.message`; the UI surfaces the latter.

---

## 4. Plugin arguments

Declared in the header; read by the UI via `risuai.getArgument`.

| Arg | Default | Used for |
|---|---|---|
| `inlay_enabled` | `true` | master toggle |
| `inlay_capture_delay_ms` | `1400` | quiet time before capture |
| `inlay_debug` | `false` | console verbosity |

`inlay_backend_url` and `inlay_backend_token` are still *read* by the UI but are
dead — the patched fetch path ignores them. `inlay_request_timeout_ms` is read but
undeclared, so it is always blank → 120000 ms.

---

## 5. Client-side only (no backend involvement)

Risu host integration and message DOM scanning, overlay/viewer mounting, viewer
geometry (`risuai.pluginStorage` keys `viewerGeo`, `viewerIconGeo`,
`viewerCastOpen`, `viewerMinimized`), settings-panel tab routing and autosave
debounce, preset/character JSON file download, explorer marquee + lightbox, the
in-chat debug log ring buffer, and the 2200 ms gallery cache.
