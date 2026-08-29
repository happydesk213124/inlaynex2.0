/**
 * The build composes three things it does not generate: the frozen vendor UI
 * bundle, the prompt text files, and the 1.x bundle the audit diffs against.
 * If any goes missing the build still succeeds but produces a plugin with no
 * interface, so their presence is asserted separately.
 *
 * Everything about the *composed output* is checked by `tools/audit.mjs`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');
const exists = (...p) => fs.existsSync(path.join(root, ...p));

test('frozen vendor UI bundle is present', () => {
  assert.ok(exists('vendor', 'inlay-nexus-ui.js'), 'missing vendor/inlay-nexus-ui.js');
});

test('every prompt file is listed for embedding', () => {
  const promptsDir = path.join(root, 'prompts');
  assert.ok(fs.existsSync(promptsDir), 'missing prompts/');
  const keys = fs.readdirSync(promptsDir).filter((f) => f.endsWith('.txt')).map((f) => path.basename(f, '.txt'));
  assert.ok(keys.length > 0, 'prompts/ has no .txt files');
  // A prompt the build forgets degrades silently to a one-line stub rather than
  // failing, so catch it here. `tools/audit.mjs` then verifies the text that
  // actually landed in the bundle matches both disk and 1.x.
  const promptKeys = read('vite.config.ts').match(/const PROMPT_KEYS = \[([\s\S]*?)\]/)?.[1] ?? '';
  for (const key of keys) {
    assert.match(promptKeys, new RegExp(`'${key}'`), `prompts/${key}.txt is not in vite.config.ts PROMPT_KEYS`);
  }
});

test('reference copies the audit and parity harness need are present', () => {
  assert.ok(exists('reference', 'native-backend.js'), 'missing reference/native-backend.js');
  // old-built-plugin.js embeds the plaintext prompt pack, so it is gitignored and
  // kept only on machines that run parity/audit against 1.x.
  if (!exists('reference', 'old-built-plugin.js')) {
    console.log('[build-layout] note: reference/old-built-plugin.js absent (local-only for parity)');
  }
});

test('package version matches the version the backend reports', () => {
  const pkg = JSON.parse(read('package.json'));
  const constants = read('src', 'core', 'constants.ts');
  // The real value is injected at build time from package.json; this only checks
  // the fallback used when the define is absent has not drifted.
  assert.match(constants, /__PLUGIN_VERSION__/);
  assert.match(constants, new RegExp(String(pkg.version).replace(/\./g, '\\.')));
});

test('character reads never write stale roster rows back', () => {
  const source = read('src', 'services', 'characters.ts');
  const start = source.indexOf('export async function listCharacters');
  const end = source.indexOf('// ── per-character global toggles', start);
  assert.ok(start >= 0 && end > start, 'listCharacters section not found');
  assert.doesNotMatch(source.slice(start, end), /\bidbPut\s*\(/);
});

test('character list returns look slots so the settings tab can show them', () => {
  const source = read('src', 'services', 'characters.ts');
  const start = source.indexOf('export async function listCharacters');
  const end = source.indexOf('// ── per-character global toggles', start);
  const body = source.slice(start, end);
  assert.ok(start >= 0 && end > start, 'listCharacters section not found');
  assert.match(body, /normalizeHairColorSlot\(row\.hair_color/);
  assert.match(body, /cleanText\(row\.hair_style/);
  assert.match(body, /normalizeEyeColorSlot\(row\.eye_color/);
  assert.match(body, /cleanText\(row\.height/);
  assert.match(body, /cleanText\(row\.penis_size/);
  assert.match(body, /rec\.hair_color\s*=/);
  assert.match(body, /rec\.hair_style\s*=/);
  assert.match(body, /charRefScopeForCharacter/);
  assert.match(body, /ref_hash/);
  assert.doesNotMatch(body, /ensureCharRefPreviewUrl/);
});

test('character ref UI has refresh and library reset', () => {
  const source = read('vite.config.ts');
  assert.match(source, /data-char-ref-refresh/);
  assert.match(source, /data-ce-ref-refresh/);
  assert.match(source, /id="nx-reset-char-refs"/);
  assert.match(source, /\/v1\/characters\/ref\/hydrate/);
  assert.match(source, /\/v1\/characters\/ref\/reset/);
});

// 2.5 took the dashboard slot that used to hold 채팅 카드 복구. The route stays
// (documented, still callable); only the button is gone, so assert both halves
// or the next reader cannot tell an intentional swap from a lost patch.
test('dashboard offers the 2.5 data migration in place of chat-card restore', () => {
  const source = read('vite.config.ts');
  assert.match(source, /id="nx-migrate-legacy"/);
  assert.match(source, /id="nx-migrate-dot"/);
  assert.match(source, /"nx-migrate-legacy":\s*\{\s*title:/);
  assert.match(source, /\/v1\/storage\/migrate/);
  assert.match(source, /\/v1\/storage\/migrate\/status/);
  assert.match(source, /\/v1\/storage\/migrate\/cancel/);
  assert.doesNotMatch(source, /id="nx-restore-chat-chrome"/);
  const router = read('src', 'api', 'router.ts');
  assert.match(router, /\/v1\/chat\/restore-chrome/);
});

test('manual character save and read never rewrite the appearance bucket', () => {
  const source = read('src', 'services', 'characters.ts');
  const readStart = source.indexOf('export async function listCharacters');
  const readEnd = source.indexOf('// ── per-character global toggles', readStart);
  const writeStart = source.indexOf('export async function upsertCharacter');
  const writeEnd = source.indexOf('async function clearSessionWearOverlaysFor', writeStart);
  assert.ok(readStart >= 0 && readEnd > readStart, 'listCharacters section not found');
  assert.ok(writeStart >= 0 && writeEnd > writeStart, 'upsertCharacter section not found');
  assert.doesNotMatch(source.slice(readStart, readEnd), /syncGenderIntoAppearance/);
  assert.doesNotMatch(source.slice(writeStart, writeEnd), /syncGenderIntoAppearance/);
});

test('wear-state persistence does not resend roster look fields', () => {
  const source = read('src', 'services', 'characters.ts');
  const start = source.indexOf('export async function persistChatWearStates');
  const end = source.indexOf('// ── one-time migrations', start);
  assert.ok(start >= 0 && end > start, 'persistChatWearStates section not found');
  const body = source.slice(start, end);
  assert.doesNotMatch(body, /appearance:\s*rec\.appearance/);
  assert.doesNotMatch(body, /attire:\s*rec\.attire/);
  assert.doesNotMatch(body, /accessories:\s*rec\.accessories/);
});

test('nai5_first toggle lives in gen options next to coords, not dashboard', () => {
  const source = read('vite.config.ts');
  const cardHtml = source.slice(
    source.indexOf('GEN_OPTION_TOGGLES_HTML'),
    source.indexOf('VENDOR_PERSON_TAG_WEIGHT_CT_NEEDLE'),
  );
  const dashHtml = source.slice(
    source.indexOf('VENDOR_INLINE_TOGGLE_PATCH'),
    source.indexOf('VENDOR_INLINE_SAVE_NEEDLE'),
  );
  assert.match(cardHtml, /LLM한테 NAI V4, V5 선택권주기/);
  assert.match(cardHtml, /무조건 NAI V5한테만 요청하기/);
  assert.match(cardHtml, /id="nx-nai5-first"/);
  assert.match(cardHtml, /id="nx-nai5-only"/);
  assert.match(cardHtml, /nx-nai-coords[\s\S]*nx-nai5-first[\s\S]*nx-nai5-only/);
  assert.doesNotMatch(dashHtml, /nx-nai5-first/);
  assert.doesNotMatch(source, /NAI5 우선/);
  // Mt() (dashboard collector) has no `e`. nai5_first lives on the card
  // tab and is saved by Ct(). A fallback to e.nai5_first here throws
  // ReferenceError and aborts xa() — every settings save fails.
  const mtSave = source.slice(
    source.indexOf('const VENDOR_INLINE_SAVE_PATCH'),
    source.indexOf('const VENDOR_DE_STRIP_NEEDLE'),
  );
  assert.doesNotMatch(mtSave, /e\.nai5_first/);
  assert.doesNotMatch(mtSave, /\be\./);
});

test('inline msg-actions is a 3-way select, not a checkbox', () => {
  const source = read('vite.config.ts');
  const dashHtml = source.slice(
    source.indexOf('VENDOR_INLINE_TOGGLE_PATCH'),
    source.indexOf('VENDOR_INLINE_SAVE_NEEDLE'),
  );
  assert.match(dashHtml, /<select id="nx-inline-msg-actions">/);
  assert.match(dashHtml, /value="off"/);
  assert.match(dashHtml, /value="legacy"/);
  assert.match(dashHtml, /value="compat"/);
  assert.match(dashHtml, /사용안함/);
  assert.match(dashHtml, /편의성 \(오류율 있음 · 2\.4\.7\)/);
  assert.match(dashHtml, /호환성 \(2\.4\.9\)/);
  assert.doesNotMatch(dashHtml, /<input type="checkbox" id="nx-inline-msg-actions"/);
  assert.match(source, /function nxMsgAct\(\)/);
  assert.match(source, /if \(nxMsgAct\(\) === "legacy"\)/);
  assert.match(source, /msgActionMountKind\(end, nxMsgAct\(\)\)/);
});

test('NAI connection test saves family keys then tests', () => {
  const source = read('vite.config.ts');
  assert.match(source, /const VENDOR_NAI_TEST_NEEDLE/);
  assert.match(source, /const VENDOR_NAI_TEST_PATCH/);
  const bundle = read('dist', 'inlaynexus2.0.js');
  const start = bundle.indexOf('getElementById("nx-test-nai")?.addEventListener');
  const mid = bundle.indexOf('/v1/nai/test', start);
  assert.ok(start >= 0 && mid > start, 'built NAI test handler not found');
  const body = bundle.slice(start, mid + 80);
  assert.match(body, /저장 후 테스트 중/);
  assert.match(body, /api_keys_v5/);
  assert.match(body, /api_keys_v4/);
  assert.match(body, /pe\(\{ nai: s \}\)/);
  assert.match(body, /\/v1\/nai\/test/);
  assert.doesNotMatch(body, /!s\.api_key && !t\.backendSettings\?\.nai\?\.api_key_configured/);
});

test('testNai persists posted nai keys and checks every stored token', () => {
  const source = read('src', 'services', 'diagnostics.ts');
  const start = source.indexOf('export async function testNai');
  const end = source.indexOf('export async function probeNaiGenerate');
  assert.ok(start >= 0 && end > start, 'testNai not found');
  const body = source.slice(start, end);
  assert.match(body, /allUniqueNaiTokens/);
  assert.match(body, /updateSettings/);
});

test('Oe() collect writes per-family NAI sampler and steps', () => {
  const bundle = read('dist', 'inlaynexus2.0.js');
  const start = bundle.indexOf('function Oe()');
  const end = bundle.indexOf('function ba()', start);
  assert.ok(start >= 0 && end > start, 'built Oe() not found');
  const body = bundle.slice(start, end);
  assert.match(body, /nx-nai-steps-v5/);
  assert.match(body, /nx-nai-steps-v4/);
  assert.match(body, /nx-nai-sampler-v5/);
  assert.match(body, /nx-nai-sampler-v4/);
  assert.match(body, /steps_v5/);
  assert.match(body, /steps_v4/);
  assert.match(body, /sampler_v5/);
  assert.match(body, /sampler_v4/);
});

test('ce() does not speculatively warm the viewer strip', () => {
  const source = read('vite.config.ts');
  assert.match(source, /VENDOR_GALLERY_CE_WARM_NEEDLE/);
  assert.match(source, /List only — viewer \/ inline \/ overlay warm the shots they actually paint/);
  const bundle = read('dist', 'inlaynexus2.0.js');
  assert.match(bundle, /List only — viewer \/ inline \/ overlay warm the shots they actually paint/);
  assert.doesNotMatch(bundle, /VC\.galleryForMessage\(t\.gallery, focus, 8\)/);
});

test('new chat/reply schedules a pointer-near message select', () => {
  const source = read('vite.config.ts');
  assert.match(source, /function schedulePointerSelect/);
  assert.match(source, /async function runPointerSelect/);
  assert.match(source, /schedulePointerSelect\("session"\)/);
  assert.match(source, /schedulePointerSelect\("boot"\)/);
  assert.match(source, /schedulePointerSelect\("reply"\)/);
  assert.match(source, /source: "provisional"/);
  // A switch awaits the newest bubble once. There is no retry ladder after it:
  // the paint places every marker and each image arrives on its own
  // subscription, so a pass can no longer end "attached but empty".
  assert.match(source, /async function nxWaitNewestDom/);
  assert.match(source, /fresh \? 0 : rawWait/);
  assert.match(source, /t\._inlineHeadFirst = 1/);
  assert.match(source, /async function dtNewest/);
  assert.match(source, /await Da\(0, newest, \{ source: "provisional", auto: 1 \}\);/);
  // Absence is checked against the shipped bundle, not this file: vite.config.ts
  // names the removed symbols on purpose, in the guards that keep them out.
  const bundle = read('dist', 'inlaynexus2.0.js');
  assert.doesNotMatch(bundle, /schedulePointerSelect\("session", 7e2\)/);
  assert.doesNotMatch(bundle, /schedulePointerSelect\("boot", 200\)/);
  assert.doesNotMatch(bundle, /nxScheduleAttachRetry/);
});

test('inline paint puts chips before shots so the bar is not blocked by encode', () => {
  const source = read('vite.config.ts');
  const start = source.indexOf('if (keep.has(paintIdx) && els[paintIdx] && !reuseIdxs.has(paintIdx))');
  const end = source.indexOf('for (const row of neighborCardLists)', start);
  assert.ok(start >= 0 && end > start, 'selected-bubble paint block not found');
  const body = source.slice(start, end);
  assert.ok(
    body.indexOf('await injectChatMsgActions(els[paintIdx]') < body.indexOf('await injectChatInlineImages(els[paintIdx]'),
    'chips must paint before inline shots on the selected bubble',
  );
});

test('a shot without bytes gets its marker now and its image by subscription', () => {
  const source = read('vite.config.ts');
  const start = source.indexOf('async function injectChatInlineImages(msgEl, cards, pendingRows, opts) {');
  const end = source.indexOf('async function refreshSelectedInlineImages(force) {', start);
  assert.ok(start >= 0 && end > start, 'inject body not found');
  const inject = source.slice(start, end);
  assert.match(inject, /VC\.canSkipInlineInject\(\{/);
  assert.match(inject, /readyImgCount:\s*readyImgs/);
  // A cell nobody is watching still has to be repainted; one that a live
  // subscription owns is finished work even with an empty <img>.
  assert.match(inject, /awaitingCount:\s*awaiting/);
  // Placing the marker must never wait on the bytes, and the pass must not
  // await an encode — that was the bake loop the retries existed to rescue.
  assert.doesNotMatch(inject, /ensureStickyCardImage/);
  assert.doesNotMatch(inject, /runBoundedPool/);
  assert.ok(
    inject.indexOf('const tPlace') < inject.indexOf('nxWatchInlineShots(lockKey'),
    'markers must be placed before the subscription is registered',
  );

  const bundle = read('dist', 'inlaynexus2.0.js');
  assert.doesNotMatch(bundle, /_inlineEncodeLeft/);
  assert.doesNotMatch(bundle, /inlineAttachSucceeded/);
  // A pass that has been superseded stops instead of painting the old selection.
  assert.match(source.slice(end), /if \(stale\(\)\) \{/);
});

test('the bubble host scan is shared by chips and inline shots', () => {
  const bundle = read('dist', 'inlaynexus2.0.js');
  assert.equal(
    (bundle.match(/querySelectorAll\(hostSel\)/g) || []).length,
    1,
    'the per-paragraph scan must exist once, not once per consumer',
  );
  assert.match(bundle, /async function nxScanBubbleHosts\(msgEl\)/);
  assert.equal((bundle.match(/await nxScanBubbleHosts\(msgEl\)/g) || []).length, 2);
});

test('only legacy pays to walk the bubble DIVs', () => {
  const bundle = read('dist', 'inlaynexus2.0.js');
  // Non-legacy modes drop every DIV in isMessageBodyHostTag moments later, after
  // spending four round-trips on each. A bubble holds far more DIV chrome than
  // paragraphs, so asking for them was most of the cost of a paint.
  assert.match(bundle, /const legacy = mode === "legacy";/);
  assert.match(bundle, /\? "p,h1,h2,h3,h4,h5,h6,li,blockquote,div"/);
  assert.match(bundle, /: "p,h1,h2,h3,h4,h5,h6,li,blockquote";/);
  assert.match(bundle, /if \(legacy && name === "DIV"\)/);
});

test('an unchanged bubble reuses its paragraph scan instead of rewalking it', () => {
  const bundle = read('dist', 'inlaynexus2.0.js');
  // The scan and the line matching depend only on the bubble text, and lockKey
  // already hashes it. One query proves our marker (and therefore the bubble)
  // survived; without that proof the cached handles could be detached nodes.
  assert.match(bundle, /async function nxBubbleKeyIntact\(msgEl, key\)/);
  assert.match(bundle, /const cached = nxPlaceCacheGet\(lockKey, msgEl\);/);
  assert.match(bundle, /nxPlaceCacheSet\(lockKey, msgEl, \{ hosts, hostTags, hostTexts, messageLines, rawCount \}\)/);
  // The stamp is what makes the probe answerable — without it the cache is
  // written and never read.
  assert.match(bundle, /markerBlockHtml\(shot, t\.backendSettings\?\.card\?\.inline_chat_scale_pct \?\? 100, lockKey\)/);
  assert.ok(
    bundle.indexOf('await nxBubbleKeyIntact(msgEl, lockKey)') < bundle.indexOf('cacheHit = !0'),
    'the cached scan must be validated before it is used',
  );
  // Handles from the outgoing chat's DOM must not survive a switch.
  assert.match(bundle, /t\._inlinePlaceCache = null;/);
  // The probe's selector is hand-written in the UI patch while the marker's
  // attribute comes from INLAY_INLINE_KEY_ATTR in the backend. They live in
  // different halves of the file, so only the composed bundle can tie them —
  // and if they drift the cache is written, never read, and nothing else
  // notices. Two occurrences: the marker emit and the probe selector.
  assert.ok(
    (bundle.match(/data-inlay-inline-key/g) || []).length >= 2,
    'the cache probe selector and the marker attribute must be the same name',
  );
});

test('the inject lock is per bubble so neighbours do not serialize', () => {
  const bundle = read('dist', 'inlaynexus2.0.js');
  assert.doesNotMatch(bundle, /_inlineInjectBusy/);
  assert.doesNotMatch(bundle, /_inlineInjectQueued/);
  assert.match(bundle, /t\._inlineInjectLocks\.get\(lockKey\)/);
});

test('the neighbour window is painted in the same pass, mid-scroll included', () => {
  const bundle = read('dist', 'inlaynexus2.0.js');
  // Deferring it to "the pass that follows" left it blank for good: settle only
  // re-enters the pass when the selected index changes, and a scroll that ends on
  // the same bubble hits the cheap keep skip and returns. stale() is what handles
  // a moving selection — it abandons the pass as soon as a newer one starts.
  assert.doesNotMatch(bundle, /inline\.paint\.defer/);
  assert.equal((bundle.match(/if \(stale\(\)\) \{/g) || []).length, 2);
});

test('a superseded pass records what it painted and clears its toast', () => {
  const bundle = read('dist', 'inlaynexus2.0.js');
  // Committing only on the finished path made the next pass repaint a bubble that
  // was already correct, and left the progress toast up forever.
  assert.match(bundle, /const commitPaint = \(\) => \{/);
  assert.equal((bundle.match(/commitPaint\(\);/g) || []).length, 2);
  assert.doesNotMatch(bundle, /superseded after head`\);\s*\n\s*return;/);
});

test('keep window and paint keys survive a DOM index shift', () => {
  const bundle = read('dist', 'inlaynexus2.0.js');
  // The chat is newest-first, so a new message renumbers every slot. Neither the
  // keep list nor the paint fingerprint may be keyed on that number.
  assert.doesNotMatch(bundle, /_inlineKeepIdxs/);
  assert.match(bundle, /t\._inlineKeepEls = nextKeep;/);
  assert.match(bundle, /setAttribute\("x-inlay-msg-index", String\(msgIdx\)\)/);
});

test('auto select paints inline shots and chips without a click', () => {
  const source = read('vite.config.ts');
  assert.match(source, /await Da\(pick, els, \{ source: "provisional", auto: 1 \}\)/);
  assert.equal((source.match(/source === "provisional" && opts\.auto/g) || []).length, 2);
  // The double-click first tap and the chip dispatch stay unpainted (no auto flag).
  assert.doesNotMatch(source, /t\._pendingSelectDom = r, await Da\(r, a, \{ source: "provisional", auto/);
});

test('session switch is rechecked on user input instead of a faster idle poll', () => {
  const source = read('vite.config.ts');
  assert.match(source, /function nxScopeCheckSoon\(\)/);
  assert.match(source, /now - t\._scopeCheckAt < 700/);
  assert.equal((source.match(/nxScopeCheckSoon\(\);/g) || []).length, 3);
  assert.match(source, /const VENDOR_SCOPE_POLL_PATCH = `n\._scopeTick % 24 === 0/);
});

test('legacy char reference off value is labeled as 안함', () => {
  const source = read('vite.config.ts');
  assert.match(source, /const VENDOR_CHAR_REF_MODE_OFF_LABEL_NEEDLE/);
  assert.match(source, /const VENDOR_CHAR_REF_MODE_OFF_LABEL_PATCH/);
  assert.match(source, /assertOnce\(out, VENDOR_CHAR_REF_MODE_OFF_LABEL_NEEDLE/);
  const bundle = read('dist', 'inlaynexus2.0.js');
  const start = bundle.indexOf('id="nx-char-ref-mode"');
  const end = bundle.indexOf('</select>', start);
  assert.ok(start >= 0 && end > start, 'built char reference selector not found');
  const selector = bundle.slice(start, end);
  assert.match(selector, />안함</);
  assert.doesNotMatch(selector, />끄기</);
  assert.doesNotMatch(selector, /자동 \(V4\.5 Image Reference · Anlas\)/);
});

test('bind pointer repaint keeps boot scheduling and queues a delayed fallback', async () => {
  const source = read('vite.config.ts');
  const patchStart = source.indexOf('const VENDOR_POINTER_SELECT_PATCH =');
  const patchEnd = source.indexOf('const VENDOR_RISU_SETTINGS_HIDE_VIEWER_NEEDLE', patchStart);
  const patch = source.slice(patchStart, patchEnd);
  const scheduleStart = patch.indexOf('  function schedulePointerSelect');
  const scheduleEnd = patch.indexOf('  async function runPointerSelect', scheduleStart);
  assert.ok(scheduleStart >= 0 && scheduleEnd > scheduleStart, 'pointer scheduler patch not found');
  const scheduleSource = patch.slice(scheduleStart, scheduleEnd);
  const timers = new Map();
  let nextTimer = 0;
  const setTimeoutFake = (fn, delay) => {
    const id = ++nextTimer;
    timers.set(id, { fn, delay });
    return id;
  };
  const clearTimeoutFake = (id) => timers.delete(id);
  const calls = [];
  const t = {};
  const schedule = new Function(
    't',
    'setTimeout',
    'clearTimeout',
    'runPointerSelect',
    `${scheduleSource}; return schedulePointerSelect;`,
  )(t, setTimeoutFake, clearTimeoutFake, async (reason) => {
    calls.push(reason);
    return false;
  });

  schedule('boot');
  const bootTimer = t._pointerSelectTimer;
  schedule('bind', 0);

  assert.ok(timers.has(bootTimer), 'bind must not cancel the boot timer');
  assert.notEqual(t._pointerSelectBindTimer, bootTimer);
  const immediate = timers.get(t._pointerSelectBindTimer);
  assert.equal(immediate?.delay, 0);
  timers.delete(t._pointerSelectBindTimer);
  await immediate.fn();
  await Promise.resolve();

  assert.deepEqual(calls, ['bind']);
  assert.ok(timers.has(bootTimer), 'bind fallback must leave the boot timer intact');
  assert.equal(timers.get(t._pointerSelectBindTimer)?.delay, 1000);
});

test('click select scroll uses nearest-offscreen delta, not 45% recenter', () => {
  const source = read('vite.config.ts');
  assert.match(source, /VENDOR_ENSURE_IN_VIEW_PATCH/);
  assert.match(source, /messageClickScrollDelta/);
  const patch = source.slice(
    source.indexOf('const VENDOR_ENSURE_IN_VIEW_PATCH'),
    source.indexOf('const VENDOR_INLINE_CALL_NEEDLE'),
  );
  assert.doesNotMatch(patch, /n\.height \* 0\.5 - o \* 0\.45/);
});

test('in-message action bar uses the same H+prepend host path as inline shots', () => {
  const source = read('vite.config.ts');
  const start = source.indexOf('async function openSettingsTab');
  const end = source.indexOf('async function ensureMessageInView', start);
  assert.ok(start >= 0 && end > start, 'injectChatMsgActions section not found');
  const body = source.slice(start, end);
  assert.match(body, /async function clearMsgActionBars/);
  assert.match(source, /await clearMsgActionBars\(e\)/);
  assert.match(source, /schedulePointerSelect\("bind", 0\)/);
  assert.match(source, /function schedulePointerSelect\(reason, delayMs = 1e3\)/);
  const bindPatch = source.slice(
    source.indexOf('const VENDOR_SELECT_BIND_PATCH'),
    source.indexOf('const VENDOR_SELECT_OVERLAY_NEEDLE'),
  );
  assert.ok(
    bindPatch.indexOf('await clearMsgActionBars(e)') < bindPatch.indexOf('await fe(e, "pointermove", l)'),
    'stale bars must be removed before listeners bind',
  );
  assert.ok(
    bindPatch.indexOf('await fe(e, "pointermove", l)') < bindPatch.indexOf('schedulePointerSelect("bind", 0)'),
    'bind repaint must run after listeners bind',
  );
  assert.match(body, /H\(doc, "div"/);
  assert.match(body, /host\.prepend\(wrap\)/);
  assert.match(body, /prependBar/);
  assert.match(body, /msgActionMountKind/);
  assert.match(body, /canMountMsgActionOnParent/);
  // Host eligibility moved into the scan the bars now share with inline shots.
  assert.match(body, /nxScanBubbleHosts\(msgEl\)/);
  assert.match(source, /isInlayPaintHost/);
  assert.match(source, /isMessageBodyHostTag/);
  assert.match(body, /getParent/);
  assert.match(body, /x-inlay-msg-end/);
  assert.match(body, /keepMsgActionBarIndexes/);
  assert.match(body, /wantBottom/);
  assert.doesNotMatch(body, /existing\.length >= 1 && !knownDifferent/);
  assert.match(source, /\[x-inlay-msg-actions\],\[data-inlay-inline-pending\]|\[data-inlay-inline-shot\],\[data-inlay-inline-pending\],\[x-inlay-msg-actions\]/);
  assert.match(source, /unwrapGone\("\[x-inlay-msg-actions\]/);
  assert.doesNotMatch(source, /unwrapGone\("\[data-inlay-msg-actions\]"\)/);
  assert.doesNotMatch(body, /insertAdjacentHTML/);
  assert.doesNotMatch(body, /msgEl\.prepend/);
  assert.match(body, /chipLabels = \{ tag: "태그", regen: "재생성", stop: "중단", char: "캐릭터", preset: "프리셋" \}/);
  assert.match(body, /t\.uiTab = next/);
  assert.match(body, /await At\(\)/);
  assert.match(body, /async function openMsgCharPicker/);
  assert.match(body, /\/v1\/characters\/triggered/);
  assert.match(body, /showContainer\("fullscreen"\)/);
  assert.match(body, /await Ua\(picked\)/);
  assert.match(body, /await openMsgCharPicker\(A\)/);
  assert.match(body, /openSettingsTab\("style_presets"\)/);
  assert.doesNotMatch(body, /openMsgActionPop/);
  assert.doesNotMatch(body, /openMsgPresetPicker/);
  const pickerStart = body.indexOf('async function openMsgCharPicker');
  const pickerEnd = body.indexOf('async function clearMsgActionBars', pickerStart);
  assert.ok(pickerStart >= 0 && pickerEnd > pickerStart, 'message character picker section not found');
  const picker = body.slice(pickerStart, pickerEnd);
  assert.match(picker, /if \(!matched\.length\) \{[\s\S]*await nxHostToast\([\s\S]*return;/);
  assert.match(picker, /root\?\.remove\?\.\(\)/);
  assert.match(picker, /document\.addEventListener\("keydown", onKeyDown\)/);
  assert.match(picker, /document\.removeEventListener\("keydown", onKeyDown\)/);
  assert.match(picker, /ev\.target === backdrop[\s\S]*closePicker\(\)/);
  assert.match(picker, /ev\.key === "Escape"[\s\S]*closePicker\(\)/);
  assert.match(picker, /closePicker\(\{ handoff: !0 \}\)[\s\S]*await Ua\(picked\)/);
  assert.match(picker, /const text = String\(message\?\.text \|\| ""\)/);
  assert.match(picker, /K\("\/v1\/characters\/triggered"/);
  assert.match(picker, /rootChatSessionIds\(scope\)/);
  assert.match(picker, /unified_session_id: scope\?\.unifiedSessionId/);
  assert.doesNotMatch(picker, /matchCharactersInText/);
  assert.doesNotMatch(picker, /enabledGlobalsForCharacter\(\)/);
  assert.match(picker, /const duplicateNames = new Set/);
  assert.match(picker, /picked\.scope === "__global__" \? "글로벌" : "채팅"/);
  assert.match(picker, /button\.textContent = duplicateNames\.has\(String\(picked\.name\)\)/);
  assert.doesNotMatch(picker, /\.map\(\(character, index\) => \(\{ \.\.\.character, index \}\)\)/);
  assert.doesNotMatch(picker, /t\.hostDoc/);
  assert.match(picker, /if \(typeof k\.showContainer != "function"\) throw new Error\("fullscreen container unavailable"\)/);
  assert.ok(
    picker.indexOf('await k.showContainer("fullscreen")') < picker.indexOf('document.body.appendChild(root)'),
    'picker must open the plugin fullscreen container before appending to plugin body',
  );
  assert.match(body, /hitMsgChipAt/);
  assert.match(body, /querySelectorAll\("\[x-inlay-msg-chip\]"\)/);
  assert.match(body, /hitEl\(node, x, y\)/);
  assert.doesNotMatch(body, /elementFromPoint/);
  assert.match(body, /setAttribute\("x-inlay-msg-chip"/);
  assert.match(body, /setAttribute\("x-inlay-msg-index"/);
  assert.match(body, /setAttribute\("x-inlay-ignore"/);
  assert.match(body, /getAttribute\("x-inlay-msg-chip"\)/);
  assert.match(body, /getAttribute\("x-inlay-msg-index"\)/);
  // paintIdx must carry the cards of the bubble it paints, not the selection's:
  // selCards is [] on a user turn and [] strips the remapped char's shots.
  assert.match(source, /injectChatMsgActions\(els\[paintIdx\], paintPlan\.cards, paintIdx\)/);
  assert.match(source, /injectChatInlineImages\(els\[paintIdx\], paintPlan\.cards, t\._inlinePending, \{/);
  assert.match(source, /role: roleAt\(paintIdx\)/);
  assert.match(source, /VC\.roleForInlineBubble\(\{/);
  assert.match(source, /VC\.cardsForInlineBubble\(\{/);
  assert.match(source, /VC\.inlineRoleDisposition\(opts\.role/);
  assert.match(source, /if \(roleDisposition === "hold"\) return/);
  assert.match(source, /forceStrip: roleDisposition === "deny"/);
  assert.match(source, /heldKeepHashes/);
  assert.match(source, /getAttribute\("data-inlay-inline-layout"\)/);
  assert.match(source, /layoutVersion: mark\.layoutVersion/);
  assert.match(source, /VC\.INLINE_FRAME_LAYOUT_VERSION/);
  assert.match(source, /VC\.inlineChatOverlayImgStyle/);
  assert.match(source, /id="nx-inline-dom-radius" type="number" min="3" max="20" step="1"/);
  assert.match(source, /inline_chat_dom_radius: Math\.max\(3, Math\.min\(20,/);
  assert.match(source, /inline_chat_dom_radius\) \|\| 4/);
  assert.match(source, /prefetchInlineRoleDomIndices\(\{ selIdx, length: els\.length, radius: maxPerSide \}\)/);
  {
    const injectFrom = source.indexOf('async function injectChatInlineImages(msgEl, cards, pendingRows, opts) {');
    const injectTo = source.indexOf('async function refreshSelectedInlineImages(force) {', injectFrom);
    const inject = injectFrom >= 0 && injectTo > injectFrom ? source.slice(injectFrom, injectTo) : '';
    assert.match(inject, /querySelectorAll\("\[data-inlay-inline-img\]"\)/);
    assert.match(inject, /querySelectorAll\("\[data-inlay-inline-stack\]"\)/);
    assert.match(inject, /VC\.inlineChatOverlayImgStyle\(!0\)/);
    assert.doesNotMatch(inject, /spin\.setStyleAttribute\("display:none"\)/);
    assert.doesNotMatch(inject, /typeof spin\.remove/);
  }
  {
    const goneFrom = source.indexOf('const inlineGoneFromSel = async () => {');
    const goneTo = source.indexOf('// Cheap skip before any SafeDOM', goneFrom);
    const gone = goneFrom >= 0 && goneTo > goneFrom ? source.slice(goneFrom, goneTo) : '';
    assert.match(gone, /querySelectorAll\("\[data-inlay-inline-img\]"\)/);
    assert.doesNotMatch(gone, /querySelectorAll\("img"\)/);
  }
  {
    const stripFrom = source.indexOf('const stripInlineMarkersIn = async (el) => {');
    const stripTo = source.indexOf('// Diff strip only:', stripFrom);
    const strip = stripFrom >= 0 && stripTo > stripFrom ? source.slice(stripFrom, stripTo) : '';
    assert.match(strip, /querySelectorAll\("\[data-inlay-inline-img\]"\)/);
    assert.doesNotMatch(strip, /data-inlay-inline-shot/);
    assert.doesNotMatch(strip, /x-inlay-msg-actions/);
  }
  assert.match(source, /resolveInlinePaintCards\(\{ selIdx, paintIdx, selCards, paintCards \}\)/);
  assert.doesNotMatch(source, /injectChatInlineImages\(els\[paintIdx\], selCards,/);
  assert.match(source, /injectChatMsgActions\(els\[row\.idx\], row\.cards, row\.idx\)/);
  // Automatic selection must take the same char±4 path a click takes. Nothing
  // reschedules it any more — the images come to the markers, not the other way.
  const bundle = read('dist', 'inlaynexus2.0.js');
  assert.doesNotMatch(bundle, /_inlineSelfOnly/);
  assert.doesNotMatch(bundle, /nxScheduleAttachRetry/);
  assert.doesNotMatch(bundle, /NX_SESSION_ATTACH_BACKOFF/);
  assert.match(bundle, /subscribeImageUrl/);
  assert.match(body, /Da\(idx, els, \{ source: "provisional" \}\)/);
  assert.doesNotMatch(body, /<span x-inlay-msg-chip=/);
  assert.doesNotMatch(body, /getAttribute\("data-inlay-msg-/);
  assert.doesNotMatch(body, /\.contains\(msgEl\)/);
  assert.doesNotMatch(body, /bindMsgActionBar/);
  assert.doesNotMatch(body, /fe\(chip, "click"/);
  assert.doesNotMatch(body, /Da\(idx, "provisional"\)/);
  assert.doesNotMatch(body, /nameLabel/);
  assert.doesNotMatch(body, /"char" \+ \(i \+ 1\)/);
});

test('msg chips share host pointer hit-test with inline shots', () => {
  const source = read('vite.config.ts');
  const down = source.slice(
    source.indexOf('VENDOR_INLINE_LONGPRESS_PATCH'),
    source.indexOf('VENDOR_STICKY_PRESS_NEEDLE'),
  );
  assert.match(down, /hitMsgChipAt\(e, x, I\)/);
  assert.match(down, /t\._msgChipPress/);
  assert.match(source, /VENDOR_MSG_CHIP_UP_PATCH/);
  assert.match(source, /runMsgChipAction\(chip\.kind, chip\.index\)/);
});

test('message character picker handoff cannot race viewer restore or strand a stub', () => {
  const source = read('vite.config.ts');
  const charPatch = source.slice(
    source.indexOf('const VENDOR_STICKY_OPEN_CHAR_PATCH'),
    source.indexOf('const VENDOR_STICKY_CLOSE_CARD_NEEDLE'),
  );
  assert.match(
    charPatch,
    /const pickerHandoff = t\._msgCharPickerHandoff === !0;[\s\S]*t\._msgCharPickerHandoff = !1;[\s\S]*if \(!e\?\.name\) return;/,
  );
  assert.match(charPatch, /if \(!pickerHandoff\) void xe\(\);/);
  assert.match(charPatch, /_openGen: openGen/);

  const start = source.indexOf('async function openMsgCharPicker');
  const end = source.indexOf('async function clearMsgActionBars', start);
  assert.ok(start >= 0 && end > start, 'message character picker section not found');
  const picker = source.slice(start, end);
  assert.match(picker, /const cleanupFailedCharHandoff = async \(failedGen\) =>/);
  assert.match(picker, /const ownsFailedOpen = Number\(t\._editOpenGen \|\| 0\) === failedGen;/);
  assert.match(picker, /if \(ownsFailedOpen && typeof xe == "function"\) \{[\s\S]*await xe\(\)/);
  assert.match(picker, /const remaining = t\.charEditUi \|\| \(failedUi\?\._stub \? failedUi : null\);/);
  assert.match(picker, /remaining\?\._stub[\s\S]*remaining\.root\?\.remove\?\.\(\)/);
  assert.match(picker, /if \(t\.charEditUi === remaining\) t\.charEditUi = null;/);
  assert.match(picker, /t\.autotagFocus\?\.scope === "modal"[\s\S]*t\.charRefFocus\?\.scope === "modal"/);
  assert.match(picker, /await restoreFloatingViewerAfterModal\(\)/);
  assert.match(picker, /ownedContainer[\s\S]*typeof k\.hideContainer == "function"[\s\S]*await k\.hideContainer\(\)/);
  assert.match(
    picker,
    /t\._msgCharPickerHandoff = !0;[\s\S]*await Ua\(picked\);[\s\S]*await cleanupFailedCharHandoff\(failedGen\);[\s\S]*finally \{[\s\S]*t\._msgCharPickerHandoff = !1;/,
  );
  assert.match(
    picker,
    /await Ua\(picked\);\s*if \(!t\.charEditUi\) await cleanupFailedCharHandoff\(failedGen\);/,
  );
});

test('character editor header omits char slot when picker row has no finite index', () => {
  const source = read('vite.config.ts');
  assert.match(source, /const VENDOR_CHAR_EDIT_HEADER_NEEDLE/);
  assert.match(source, /const VENDOR_CHAR_EDIT_HEADER_PATCH/);
  assert.match(source, /assertOnce\(raw, VENDOR_CHAR_EDIT_HEADER_NEEDLE/);
  assert.match(source, /\.replace\(VENDOR_CHAR_EDIT_HEADER_NEEDLE, VENDOR_CHAR_EDIT_HEADER_PATCH\)/);

  const bundle = read('dist', 'inlaynexus2.0.js');
  const finiteAt = bundle.indexOf('Number.isFinite(e.index)');
  const title = finiteAt >= 0 ? bundle.lastIndexOf('>캐릭터 태그 수정</div><div style=', finiteAt) : -1;
  const tail = bundle.indexOf('data-ce-x', title);
  assert.ok(title >= 0 && tail > title, 'built character editor header not found');
  const header = bundle.slice(title, tail);
  assert.match(header, /Number\.isFinite\(e\.index\)/);
  assert.doesNotMatch(header, />char\$\{e\.index \+ 1\} · \$\{h\(n\.name \|\| e\.name\)\}/);
  assert.doesNotMatch(header, /charNaN/);
  const templateStart = bundle.lastIndexOf('`<div><div', title);
  const templateEnd = bundle.indexOf('`,', title);
  assert.ok(templateStart >= 0 && templateEnd > title, 'built character editor header template not found');
  const render = new Function(
    'e',
    'n',
    'a',
    'h',
    `return ${bundle.slice(templateStart, templateEnd + 1)};`,
  );
  const escape = (value) => String(value).replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  assert.match(render({ index: 0 }, { name: '<이름>' }, '<채팅>', escape), /char1 · &lt;이름&gt; · &lt;채팅&gt;/);
  assert.doesNotMatch(render({}, { name: '이름' }, '채팅', escape), /char(?:NaN|\d+)/);
  assert.doesNotMatch(render({ index: Number.NaN }, { name: '이름' }, '채팅', escape), /char(?:NaN|\d+)/);
  assert.doesNotMatch(render({ index: Number.POSITIVE_INFINITY }, { name: '이름' }, '채팅', escape), /char/);
});

test('character tab and edit popup pack identity and looks onto compact rows', () => {
  const source = read('vite.config.ts');
  const identity = source.slice(
    source.indexOf('VENDOR_CHAR_TAB_IDENTITY_HTML_PATCH'),
    source.indexOf('VENDOR_CHAR_TAB_GENDER_HTML_NEEDLE'),
  );
  const looks = source.slice(
    source.indexOf('VENDOR_CHAR_TAB_LOOKS_HTML_PATCH'),
    source.indexOf('VENDOR_CHAR_TAB_AUTOTAG_APPLY_NEEDLE'),
  );
  const edit = source.slice(
    source.indexOf('VENDOR_CHAR_EDIT_GENDER_HTML_PATCH'),
    source.indexOf('VENDOR_CHAR_EDIT_GENDER_REF_NEEDLE'),
  );
  assert.match(identity, /char-meta-row/);
  assert.match(identity, /<span>우선<\/span>/);
  assert.match(identity, /data-char-gender/);
  assert.match(looks, /char-looks-row/);
  assert.match(looks, /data-char-appearance rows="2"/);
  assert.match(looks, /<span>머리<\/span>/);
  assert.doesNotMatch(looks, /머리색/);
  assert.match(edit, /char-looks-row/);
  assert.match(edit, /grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(edit, /<span>스타일<\/span>/);
  assert.match(source, /data-ce-appearance rows="3"/);
  assert.match(source, /min-height:72px/);
});

test('reply and stream-keyword gen bypass execute=manual in Ka', () => {
  const source = read('vite.config.ts');
  assert.match(source, /_afterGenAllowManual/);
  assert.match(source, /execute === "manual" && !t\._afterGenAllowManual/);
  assert.match(source, /kwAlready \|\| kwNow\) && \(t\._afterGenTimer \|\| t\._afterGenRunning\)/);
});

test('character ref upload binds to the roster row scope, not the unified id', () => {
  const source = read('vite.config.ts');
  assert.match(source, /data-char-ref-scope=/);
  assert.match(source, /charRefScopeForCharacter|data-char-ref-scope/);
  assert.match(source, /asRefScope\(card\)/);
});

test('character-list save cannot silently succeed without a session id', () => {
  const source = read('src', 'api', 'router.ts');
  const start = source.indexOf('async function updateCharacters');
  const end = source.indexOf('// ── dispatch', start);
  assert.ok(start >= 0 && end > start, 'updateCharacters section not found');
  assert.match(source.slice(start, end), /'characters'\s+in\s+body\s*&&\s*!sessionId/);
  assert.match(source.slice(start, end), /makeFetchError\(400/);
});

test('import picker is centered and offers lb-xnai next to parallel', () => {
  const source = read('vite.config.ts');
  const start = source.indexOf('const VENDOR_CHAR_IMPORT_EVT_PATCH');
  const end = source.indexOf('const VENDOR_CHAR_TAB_BTNS_NEEDLE', start);
  assert.ok(start >= 0 && end > start, 'import picker patch not found');
  const patch = source.slice(start, end);
  assert.match(patch, /align-items:center/);
  assert.doesNotMatch(patch, /align-items:flex-end/);
  assert.match(patch, /height:min\(86vh,720px\)/);
  assert.match(patch, /data-imp-parallel[\s\S]*data-imp-xnai[\s\S]*data-imp-fill/);
  assert.match(patch, /xnai,/);
});

test('import-fill text path can attach lb-xnai; asset looks cannot', () => {
  const fill = read('src', 'services', 'char-import.ts');
  const textStart = fill.indexOf('async function runTextBatch');
  const textEnd = fill.indexOf('function chunk<T>', textStart);
  assert.ok(textStart >= 0 && textEnd > textStart, 'runTextBatch not found');
  const text = fill.slice(textStart, textEnd);
  assert.match(text, /xnai/);
  assert.match(text, /formatLoreExtraAuthorNote/);
  assert.match(text, /role:\s*'system'/);

  const packedStart = fill.indexOf('async function runPackedLooks');
  const packedEnd = fill.indexOf('async function looksSystem', packedStart);
  assert.ok(packedStart >= 0 && packedEnd > packedStart, 'runPackedLooks not found');
  assert.doesNotMatch(fill.slice(packedStart, packedEnd), /formatLoreExtraAuthorNote|loreExtraInstructionBody/);

  const visStart = fill.indexOf('async function runVisionBatch');
  const visEnd = fill.indexOf('async function runTextBatch', visStart);
  assert.ok(visStart >= 0 && visEnd > visStart, 'runVisionBatch not found');
  assert.doesNotMatch(fill.slice(visStart, visEnd), /formatLoreExtraAuthorNote|loreExtraInstructionBody/);

  const looks = read('src', 'services', 'tagger.ts');
  const looksStart = looks.indexOf('export async function buildCharacterLooksMessages');
  const looksEnd = looks.indexOf('function appearancePayload', looksStart);
  assert.ok(looksStart >= 0 && looksEnd > looksStart, 'buildCharacterLooksMessages not found');
  assert.doesNotMatch(looks.slice(looksStart, looksEnd), /extraOnly/);
  assert.doesNotMatch(looks.slice(looksStart, looksEnd), /collectLorePayload/);
});
