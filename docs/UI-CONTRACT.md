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
| `__INLAY_VIEWER_CORE__` | overlay/pin geometry, gallery ordering, DOM↔API message matching; sticky always-image size via `resolveStickyThumbPct` / `stickyThumbBoxFromPct` (hide = 0%, not display:none) + `fitBoxInside` against NAI w×h; overlay toggle OFF keeps sync alive and parks via 0% thumb + off-screen pin (avoids hideStickyMarker thrash); with 말풍선 삽화 ON, `stickySegmentForInlineChat` picks the shot nearest the pointer for sticky activation; sticky thumb HTML/shell use transparent backgrounds (no opaque letterbox bars); `claimStickyMarkerByCardId` reuses a still-mounted pin on partial card-set swaps so sticky pins do not duplicate |
| `__INLAY_LLM__` | provider list, endpoint defaults, model placeholders |
| `__INLAY_LORE_EXTRA__` | `lb-xnai.lb.extra` lorebook trimming |
| `__INLAY_STYLE_PRESETS__` | style-preset parse/export: card.json `character_book` + Risu `lorebook_export` (`type: risu`) |
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
| `PUT /v1/settings` | partial `{card?, llm?, llm_roles?, nai?}` → `{ settings }` |
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

`card.asset_nai_tags` is a string mode: `off` | `inline` | `prepass` |
`prepass_vision` (legacy `true` → `prepass_vision`, `false` → `off`). Card
settings places a `<select>` under the solo/costume row (asserted vendor
patch); dashboard checkbox was removed. `prepass` / `prepass_vision`
use a slim looks LLM (asset tags + Character Image lore only; no chat body,
no filled-roster dump, no story lore). `prepass_vision` also attaches up to
one representative image per matched character (max 5).
`card.person_tag_weight` is `0`–`5` (default `3`): NAI emphasis on Inlay
person-count tags (`0` = plain `1girl, 1boy`; `N` = `N::1girl, 1boy::`). Card
settings packs Include Max, person_tag_weight, person_tag_mode, lore_extra, and
natural_base in one auto-fit row (asserted vendor patch).

`card.person_tag_solo` (boolean, default `false`): when the shot has exactly one
character, put `solo` instead of `1girl`/`1boy` (still emphasized by weight).
Also applies when `person_tag_mode` is `off`. UI replaces the unused Preprocessing
checkbox (asserted vendor patch); `card.preprocessing` remains a silent dummy.

`card.costume` (boolean, default `false`): when on, the main tagger receives each
character's `costumes[]` catalog and may set shot `characters[].costume` /
`new_costumes`. When off, generation still resolves missing picks to index 0.
Asset `char_looks` always may populate `costumes[]` regardless of this toggle.
Card-settings checkbox sits in a `checks-grid` of `toggle-row`s with
person_tag_solo (same UX as dashboard toggles). Character tab and chip edit
popup use a costume name+arrow combobox (no field labels; placeholder only).

`card.char_ref_mode` is `off` | `vibe` | `image` (default `off`); with
`char_ref_strength` / `char_ref_fidelity` in `0.01`–`1` (defaults `0.6` / `1`).
When mode is `image`, `char_ref_image_type` is `character` | `style` |
`character&style` (default `character&style`).
Dashboard controls sit beside 이미지 모서리 (asserted vendor patch). Per-character
bytes live in meta (`char_ref_<id>`) via `POST /v1/characters/ref` — stored
as-is (webp preferred; no re-encode). Character list rows may include
`ref_configured` / `ref_preview_url`. When mode ≠ `off`, generation adds each
shot character's ref to NAI `vibes[]` or `character_refs[]` (additive with the
global model vibe/ref). Asset `char_looks` may seed a missing ref from the
priority-1 asset without overwriting.

`card.fixed_prompt_prefix` / `card.fixed_prompt_suffix` (strings, default `""`,
max 8000 chars each): always wrapped around the assembled positive after
person-count tags and before NAI quality tags. Card settings → 생성 옵션 shows a
2-column pair of textareas, a dedicated save button, plus JSON export/import
(`{ fixed_prompt_prefix, fixed_prompt_suffix }`).

### LLM role profiles (`settings.llm` + `settings.llm_roles`)

`settings.llm` remains the **메인 태깅** profile (key name unchanged — no
migration). Secondary roles live under `settings.llm_roles`:

| Role id | Used for | Default |
|---|---|---|
| `autotag` | vision autotag (character chips / models) | `follow_main: true` |
| `asset_char` | asset NAI looks prepass (`char_looks`) | `follow_main: true` |
| `curator` | curation two_stage refine | `follow_main: true` |

`resolveLlmRole(settings, role)` (`src/domain/llm/roles.ts`): `main` →
`settings.llm`; otherwise `follow_main` (or missing role) → `settings.llm`;
own profile → role fields only (no merge with main). Command rewrite /
preprocess / unscoped model test stay on main.

GET settings blanks each role's `api_key` / `service_account_json` and sets
`api_key_configured` / `service_account_configured` like the main LLM.
Export still redacts `api_key` recursively (including under `llm_roles`).

Models tab UI (asserted vendor patches): four LLM subtabs
(메인 태깅 / 오토태그 / 에셋캐릭 / 큐레이터); NovelAI/Comfy stays **one shared**
block below. Secondary source selects include 「태깅 LLM 따라가기」
(`follow_main`). Save PUT sends `{ llm, llm_roles, nai }`; connection test uses
the active tab's resolved profile in `POST /v1/models/test`.

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
| `POST /v1/jobs/retarget-hash` | While a job runs: if same char/chat/msg/role and text Dice≥60% vs job-start preview, set **save** `content_hash` (lock key unchanged) + rebind published siblings |
| `POST /v1/jobs/busy-message` | `{session_id, character_id, chat_id, message_index, role}` → `{ busy, job_id? }` — active job for that turn (hash ignored); UI skips Ka |
| `POST /v1/jobs/stop` | `{session_id?}` → `{ stopped, job_ids, reroll_stop }` — soft-stop active jobs **and** message reroll batches (keep published / finished shots; do not abort in-flight LLM/NAI; remaining shots/rerolls skip). UI may clear busy immediately. |
| `/v1/jobs/:id` | `{ ok, state, error?, progress? }`, state ∈ `queued\|tagging\|generating\|done\|cancelled\|error` |

Auto-gen (`Ka`): after soft rebind/retarget, skip `Be` when (1) `busy-message` is true, or (2) gallery already has cards for the same char/chat/msg/role (hash may differ). Generate only when neither applies.

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
| `GET /v1/characters/ref?character_id=` | `{ configured, preview_url }` |
| `POST /v1/characters/ref` | `{character_id, image_b64}` or `{character_id, copy_from}` or `{character_id, clear:true}` — bytes as-is |
| `POST /v1/characters/ref/clear` | `{character_id}` |
| `/v1/appearance/:sessionId` · `POST` | legacy alias |

Record: `id, name, original, aliases[], surname, given_name, surname_variants[],
given_name_variants[], appearance, attire, accessories, costumes[], active_costume,
attire_locked, accessories_locked, priority, gender (`girl`|`boy`|`other`|``),
`ref_configured?`, `ref_preview_url?`.
`attire` = clothes + permanent jewelry; `accessories` = weapons/props only.
`costumes[]` = named wardrobe sets (`name`, `note?`, `attire`, `accessories`);
index **0** is the generation default when a shot has no `costume` pick.
`active_costume` is the UI select index (editing mirror into `attire`/`accessories`).
`attire_locked` / `accessories_locked` default **ON** (`!== false`). When locked, freeform shot
`attire`/`accessories` are ignored for generation; a shot `costume` name/index still
selects from the roster catalog. When unlocked, shot wear applies to
**that shot's caption only** — it is never written back to the roster. Roster wear
changes via character edit/create; or when appearance is still empty, a
`new_characters` re-collect **overwrites** appearance+attire+accessories (and may
fill `costumes[]`). Viewer character save may send `stamp_card_id` so that card's
cast keeps `costume` across rerolls without changing `costumes[0]`.
UI: dashboard `card.costume` toggle injects the catalog into the main tagger;
character tab / edit popup costume bar: name · when-to-use note · delete · slot
save · make-default · select (top option = add). At least one costume is kept.
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
