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
  const start = source.indexOf('async function refreshSelectedInlineImages(force');
  const end = source.indexOf('async function openSettingsTab(tab) {', start);
  assert.ok(start >= 0 && end > start, 'inline refresh block not found');
  const body = source.slice(start, end);
  assert.ok(
    body.indexOf('await injectChatMsgActions(els[idx], cards, idx)') < body.indexOf('await injectChatInlineImages(els[idx], cards,'),
    'chips must paint before inline shots on each spinner-window bubble',
  );
});

test('a shot without bytes gets its marker now and its image by subscription', () => {
  const source = read('vite.config.ts');
  const start = source.indexOf('async function injectChatInlineImages(msgEl, cards, pendingRows, opts) {');
  const end = source.indexOf('async function refreshSelectedInlineImages(force', start);
  assert.ok(start >= 0 && end > start, 'inject body not found');
  const inject = source.slice(start, end);
  assert.match(inject, /VC\.canSkipInlineInject\(\{/);
  assert.match(inject, /readyImgCount:\s*wantPhotos \? readyImgs/);
  // A cell nobody is watching still has to be repainted; one that a live
  // subscription owns is finished work even with an empty <img>.
  assert.match(inject, /awaitingCount:\s*wantPhotos \? awaiting/);
  // Placing the marker must never wait on the bytes, and the pass must not
  // await an encode — that was the bake loop the retries existed to rescue.
  assert.doesNotMatch(inject, /ensureStickyCardImage/);
  assert.doesNotMatch(inject, /runBoundedPool/);
  assert.ok(
    inject.indexOf('const tPlace') < inject.lastIndexOf('nxWatchInlineShots(lockKey, encodeLater, shotNodes, patchShotSrc, ownerClaim)'),
    'the place path must register the subscription after markers exist',
  );
  assert.match(inject, /if \(skipOk \|\| markersReady\)/);

  const bundle = read('dist', 'inlaynexus2.0.js');
  assert.doesNotMatch(bundle, /_inlineEncodeLeft/);
  assert.doesNotMatch(bundle, /inlineAttachSucceeded/);
  // A pass that has been superseded stops instead of painting the old selection.
  assert.match(source.slice(end), /if \(stale\(\)\) return;/);
});

test('normal inline work never removes a mounted frame or photo layer', () => {
  const source = read('vite.config.ts');
  const injectFrom = source.indexOf('async function injectChatInlineImages(msgEl, cards, pendingRows, opts) {');
  const injectTo = source.indexOf('async function refreshSelectedInlineImages(force', injectFrom);
  const inject = source.slice(injectFrom, injectTo);
  assert.ok(injectFrom >= 0 && injectTo > injectFrom, 'inject body not found');
  assert.doesNotMatch(inject, /removeAllMarkers/);
  assert.doesNotMatch(inject, /removeNode/);
  assert.doesNotMatch(inject, /action\.op === "strip"/);
  assert.doesNotMatch(inject, /action\.op === "swap"/);
  assert.doesNotMatch(inject, /\.remove\(\)/);

  const clearFrom = source.indexOf('async function nxClearInlinePhotoWrap(wrap, unwrapSafe, doc, VC) {');
  const clearTo = source.indexOf('async function nxSyncInlinePhotosOnly()', clearFrom);
  const clear = source.slice(clearFrom, clearTo);
  assert.ok(clearFrom >= 0 && clearTo > clearFrom, 'photo clear body not found');
  assert.doesNotMatch(clear, /\.remove\(\)/);
  assert.match(clear, /inlineChatOverlayImgStyle\(!1\)/);
});

test('proven duplicate wrappers are repaired without touching the canonical frame', () => {
  const source = read('vite.config.ts');
  const from = source.indexOf('async function nxRepairDuplicateInlineFrames(');
  const to = source.indexOf('async function nxBubbleHasInlineFrame', from);
  assert.ok(from >= 0 && to > from, 'duplicate-frame repair helper not found');
  const repair = source.slice(from, to);
  assert.match(repair, /VC\?\.partitionInlineFrameDuplicates/);
  assert.match(repair, /if \(!Array\.isArray\(placements\) \|\| !placements\.length\) return list/);
  assert.match(repair, /await node\.remove\(\)/);
  assert.match(repair, /x-inlay-inline-duplicate/);
  assert.match(repair, /inlineChatFrameStyle\(!1\)/);
  assert.ok(
    repair.lastIndexOf('inlineChatFrameStyle(!0)') < repair.lastIndexOf('setAttribute("x-inlay-inline-duplicate", "0")'),
    'a fallback frame must become visible before its hidden marker is cleared',
  );

  const injectFrom = source.indexOf('async function injectChatInlineImages(msgEl, cards, pendingRows, opts) {');
  const injectTo = source.indexOf('async function refreshSelectedInlineImages(force', injectFrom);
  assert.match(
    source.slice(injectFrom, injectTo),
    /prevProbe = await nxRepairDuplicateInlineFrames\(prevProbe, placements, VC\)/,
  );
});

test('prependShot restamps identity after HTML mount so sanitized x-attrs still match', () => {
  const source = read('vite.config.ts');
  const prependFrom = source.indexOf('const prependShot = async (host, hostIdx, shot) => {');
  const applyFrom = source.indexOf('const applyShot = async (shot) => {', prependFrom);
  const prepend = source.slice(prependFrom, applyFrom);
  assert.ok(prependFrom >= 0 && applyFrom > prependFrom, 'prependShot body not found');
  assert.match(prepend, /await host\.prepend\(wrap\)/);
  assert.match(prepend, /await syncFrameMeta\(wrap, shot\)/);
  assert.ok(
    prepend.indexOf('await host.prepend(wrap)') < prepend.indexOf('await syncFrameMeta(wrap, shot)'),
    'identity must be stamped after the wrapper is in the bubble',
  );
  assert.match(prepend, /nxAbandonInlineFrame\(wrap\)/);
  assert.match(prepend, /getAttribute\("x-inlay-inline-shot"\)/);
  assert.match(source, /querySelectorAll\("\[x-inlay-inline-shot\],\[data-inlay-inline-shot\]"\)/);
  const hasFrom = source.indexOf('async function nxBubbleHasInlineFrame');
  const hasTo = source.indexOf('async function nxPredecodeInlineSrc', hasFrom);
  assert.match(source.slice(hasFrom, hasTo), /\.filter\(\(row\) => !row\.duplicate\)/);
});

test('SanitizingSafeElement keeps one wrapper after three HTML prepends when identity is restamped', async () => {
  const stripXAttrs = (html) => String(html || '').replace(/\s+x-[a-z0-9-]+="[^"]*"/gi, '');
  class SanitizingSafeElement {
    constructor(tag = 'div', attrs = new Map(), children = []) {
      this.tag = tag;
      this.attrs = attrs;
      this.children = children;
    }
    static fromHtml(html) {
      const raw = stripXAttrs(html);
      const open = /<div\b([^>]*)>/.exec(raw);
      const attrs = new Map();
      if (open) {
        for (const m of open[1].matchAll(/([a-zA-Z0-9:-]+)="([^"]*)"/g)) {
          if (!m[1].startsWith('x-')) attrs.set(m[1], m[2]);
        }
      }
      return new SanitizingSafeElement('div', attrs);
    }
    async getAttribute(name) {
      if (!String(name).startsWith('x-')) throw new Error(`forbidden read: ${name}`);
      return this.attrs.get(name) ?? null;
    }
    async setAttribute(name, value) {
      if (!String(name).startsWith('x-')) throw new Error(`forbidden write: ${name}`);
      this.attrs.set(name, String(value));
    }
    async getOuterHTML() {
      const bits = [...this.attrs.entries()].map(([k, v]) => `${k}="${v}"`);
      return `<div ${bits.join(' ')}></div>`;
    }
    async querySelectorAll(selector) {
      const wantX = selector.includes('[x-inlay-inline-shot]');
      const wantData = selector.includes('[data-inlay-inline-shot]');
      return this.children.filter((child) => {
        const hasX = child.attrs.has('x-inlay-inline-shot');
        const hasData = child.attrs.has('data-inlay-inline-shot');
        return (wantX && hasX) || (wantData && hasData);
      });
    }
    async prepend(child) {
      this.children.unshift(child);
    }
  }

  const host = new SanitizingSafeElement('p');
  const markerHtml = '<div data-inlay-inline-shot="card-1" data-inlay-inline-slot="s0" x-inlay-inline-shot="card-1" x-inlay-inline-slot="s0"></div>';
  const stamp = async (wrap) => {
    await wrap.setAttribute('x-inlay-inline-shot', 'card-1');
    await wrap.setAttribute('x-inlay-inline-slot', 's0');
  };
  const probe = async () => host.querySelectorAll('[x-inlay-inline-shot],[data-inlay-inline-shot]');
  for (let i = 0; i < 3; i += 1) {
    const live = await probe();
    let found = false;
    for (const node of live) {
      const id = String(await node.getAttribute('x-inlay-inline-shot') || '');
      if (id === 'card-1') found = true;
    }
    if (found) continue;
    const wrap = SanitizingSafeElement.fromHtml(markerHtml);
    assert.equal(wrap.attrs.has('x-inlay-inline-shot'), false, 'HTML path must drop x-*');
    assert.equal(wrap.attrs.get('data-inlay-inline-shot'), 'card-1');
    await host.prepend(wrap);
    await stamp(wrap);
    assert.equal(await wrap.getAttribute('x-inlay-inline-shot'), 'card-1');
  }
  assert.equal(host.children.length, 1);
});

test('inline photo replacement is double-buffered and skips identical src', () => {
  const source = read('vite.config.ts');
  const swapFrom = source.indexOf('async function nxSwapInlinePhoto(');
  const swapTo = source.indexOf('/** Selection-window parking', swapFrom);
  const swap = source.slice(swapFrom, swapTo);
  assert.match(source, /x-inlay-inline-cell/);
  assert.match(swap, /x-inlay-inline-active/);
  assert.match(swap, /rows\.find\(\(row\) => row\.srcKey === srcKey/);
  assert.match(swap, /setAttribute\("x-inlay-inline-src-key", srcKey\)/);
  assert.doesNotMatch(source, /_inlinePhotoSources/);
  assert.match(swap, /await nxPredecodeInlineSrc\(src\)/);
  assert.match(swap, /setInnerHTML\(nxInlinePhotoHtml\(src, VC\)\)/);
  assert.doesNotMatch(swap, /setAttribute\("src"/);
  assert.ok(
    swap.indexOf('await nxPredecodeInlineSrc(src)') < swap.indexOf('setInnerHTML(nxInlinePhotoHtml(src, VC))'),
    'new bytes must decode before entering the hidden layer',
  );
  const fillAt = swap.indexOf('setInnerHTML(nxInlinePhotoHtml(src, VC))');
  const activateAt = swap.indexOf('await wrap.setAttribute("x-inlay-inline-active"', fillAt);
  assert.ok(
    fillAt >= 0 && fillAt < activateAt,
    'new bytes must decode before the visible layer changes',
  );
});

test('inline mutations obey restrictive SafeElement attributes', () => {
  const source = read('vite.config.ts');
  const from = source.indexOf('async function nxProbeInlineShots(msgEl, unwrapSafe) {');
  const to = source.indexOf('async function refreshSelectedInlineImages(force', from);
  const inline = source.slice(from, to);
  assert.ok(from >= 0 && to > from, 'inline SafeDOM body not found');
  for (const forbidden of [
    'getAttribute("data-inlay-',
    'getAttribute("src")',
    'setAttribute("data-inlay-',
    'setAttribute("src"',
    'setAttribute("width"',
    'setAttribute("height"',
  ]) {
    assert.doesNotMatch(inline, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(inline, /getAttribute\("x-inlay-inline-shot"\)/);
  assert.match(inline, /setMeta\("x-inlay-inline-shot", id\)/);
  assert.match(inline, /setInnerHTML\(nxInlinePhotoHtml\(src, VC\)\)/);
});

test('double-buffer swap runs against an x-attributes-only SafeElement', async () => {
  const bundle = read('dist', 'inlaynexus2.0.js');
  const from = bundle.indexOf('function nxMsgAct() {');
  const to = bundle.indexOf('async function refreshSelectedInlineImages(force', from);
  assert.ok(from >= 0 && to > from, 'composed inline runtime not found');

  class StrictSafeElement {
    constructor() {
      this.attrs = new Map();
      this.style = '';
      this.html = '';
    }
    async getAttribute(name) {
      if (!String(name).startsWith('x-')) throw new Error(`forbidden read: ${name}`);
      return this.attrs.get(name) ?? null;
    }
    async setAttribute(name, value) {
      if (!String(name).startsWith('x-')) throw new Error(`forbidden write: ${name}`);
      this.attrs.set(name, String(value));
    }
    async setStyleAttribute(value) {
      this.style = String(value);
    }
    async setInnerHTML(value) {
      this.html = String(value);
    }
  }

  const cells = [];
  const stack = new StrictSafeElement();
  stack.appendChild = async (cell) => {
    cells.push(cell);
  };
  const wrap = new StrictSafeElement();
  wrap.attrs.set('x-inlay-inline-active', '');
  wrap.attrs.set('x-inlay-inline-key', 'bubble-key');
  wrap.attrs.set('x-inlay-inline-slot', 's0');
  wrap.querySelectorAll = async (selector) => {
    if (selector === '[x-inlay-inline-cell]') return [...cells];
    if (selector === '[data-inlay-inline-stack]') return [stack];
    if (selector === 'img[x-inlay-inline-layer]') return [];
    return [];
  };

  class ReadyImage {
    constructor() {
      this.naturalWidth = 128;
      this.onload = null;
      this.onerror = null;
    }
    set src(value) {
      this._src = value;
      queueMicrotask(() => this.onload?.());
    }
    async decode() {
      if (String(this._src || '').includes('slow')) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }
  }

  const runtimeState = {};
  const runtime = Function(
    't',
    'H',
    'h',
    'ye',
    'Image',
    'requestAnimationFrame',
    'nxReadyImg',
    `${bundle.slice(from, to)}
return { nxSwapInlinePhoto, nxHideInlinePhotoWrap, nxClearInlinePhotoWrap };`,
  )(
    runtimeState,
    async () => new StrictSafeElement(),
    (value) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;'),
    (value) => String(value),
    ReadyImage,
    (cb) => setTimeout(cb, 0),
    (src) => /^data:image\//.test(String(src || '')),
  );
  const VC = {
    inlineChatOverlayImgStyle: (visible) => `opacity:${visible ? 1 : 0}`,
    inlineChatOverlayPhotoStyle: () => 'width:100%;height:100%',
  };
  const unwrap = async (value) => value || [];
  const first = 'data:image/png;base64,first';
  const second = 'data:image/png;base64,second';

  assert.equal(await runtime.nxSwapInlinePhoto(wrap, first, unwrap, {}, VC), true);
  assert.equal(cells.length, 2);
  const identities = [...cells];
  assert.equal(wrap.attrs.get('x-inlay-inline-active'), 'a');
  assert.match(cells[0].html, /base64,first/);

  assert.equal(await runtime.nxSwapInlinePhoto(wrap, second, unwrap, {}, VC), true);
  assert.deepEqual(cells, identities, 'the two layer nodes must stay mounted');
  assert.equal(wrap.attrs.get('x-inlay-inline-active'), 'b');
  assert.match(cells[0].html, /base64,first/, 'old photo remains behind the cross-fade');
  assert.match(cells[1].html, /base64,second/);
  assert.equal(cells[0].style, 'opacity:0');
  assert.equal(cells[1].style, 'opacity:1');

  await runtime.nxHideInlinePhotoWrap(wrap, unwrap, {}, VC);
  assert.match(cells[0].html, /base64,first/, 'ordinary parking must retain decoded children');
  assert.match(cells[1].html, /base64,second/);
  await runtime.nxClearInlinePhotoWrap(wrap, unwrap, {}, VC);
  assert.deepEqual(cells.map((cell) => cell.html), ['', '']);
  assert.deepEqual(cells, identities, 'explicit clear still keeps both permanent layer nodes');

  const stale = runtime.nxSwapInlinePhoto(wrap, 'data:image/png;base64,slow', unwrap, {}, VC);
  await new Promise((resolve) => setTimeout(resolve, 1));
  const latest = runtime.nxSwapInlinePhoto(wrap, 'data:image/png;base64,latest', unwrap, {}, VC);
  assert.deepEqual(await Promise.all([stale, latest]), [false, true]);
  const active = cells.find((cell) => cell.attrs.get('x-inlay-inline-layer') === wrap.attrs.get('x-inlay-inline-active'));
  assert.match(active?.html || '', /base64,latest/);
  assert.doesNotMatch(cells.map((cell) => cell.html).join(''), /base64,slow/);

  const oldProxySwap = runtime.nxSwapInlinePhoto(
    wrap,
    'data:image/png;base64,slow-old-proxy',
    unwrap,
    {},
    VC,
  );
  await new Promise((resolve) => setTimeout(resolve, 1));
  const sameDomNewProxy = Object.create(wrap);
  await runtime.nxClearInlinePhotoWrap(sameDomNewProxy, unwrap, {}, VC);
  assert.equal(
    await oldProxySwap,
    false,
    'a clear through a fresh SafeDOM proxy must invalidate the old proxy request',
  );
  assert.deepEqual(
    cells.map((cell) => cell.html),
    ['', ''],
    'an old request must not refill cells after a fresh proxy clears the same frame',
  );

  const delayedOldProxy = Object.create(wrap);
  delayedOldProxy.getAttribute = async (name) => {
    await new Promise((resolve) => setTimeout(resolve, 20));
    return wrap.getAttribute(name);
  };
  const delayedIdentitySwap = runtime.nxSwapInlinePhoto(
    delayedOldProxy,
    'data:image/png;base64,old-delayed-identity',
    unwrap,
    {},
    VC,
  );
  await new Promise((resolve) => setTimeout(resolve, 1));
  await runtime.nxClearInlinePhotoWrap(wrap, unwrap, {}, VC);
  assert.equal(
    await delayedIdentitySwap,
    false,
    'request age must follow invocation order even when an older proxy lookup resolves last',
  );
  assert.deepEqual(cells.map((cell) => cell.html), ['', '']);
  assert.equal(runtimeState._inlinePhotoReq?.size ?? 0, 0, 'settled request generations must be released');
  assert.equal(runtimeState._inlinePhotoLocks?.size ?? 0, 0, 'settled mutation locks must be released');
  assert.equal(runtimeState._inlinePhotoPendingClaims?.size ?? 0, 0);
  assert.equal(runtimeState._inlinePhotoLatestOrder?.size ?? 0, 0);
  assert.equal(runtimeState._inlinePhotoSources, undefined, 'photo state must not retain data URLs in a session Map');

  const outgoingSessionSwap = runtime.nxSwapInlinePhoto(
    delayedOldProxy,
    'data:image/png;base64,outgoing-session',
    unwrap,
    {},
    VC,
  );
  await new Promise((resolve) => setTimeout(resolve, 1));
  runtimeState._inlinePhotoReq = new Map();
  runtimeState._inlinePhotoLocks = new Map();
  assert.equal(
    await outgoingSessionSwap,
    false,
    'replacing session state must invalidate a request still resolving its old DOM identity',
  );
  assert.deepEqual(cells.map((cell) => cell.html), ['', '']);
});

test('stale decode and selection passes cannot overwrite newer photos', () => {
  const source = read('vite.config.ts');
  const swapFrom = source.indexOf('async function nxSwapInlinePhoto(');
  const swapTo = source.indexOf('/** Selection-window parking', swapFrom);
  const swap = source.slice(swapFrom, swapTo);
  assert.match(source, /t\._inlinePhotoReq instanceof Map/);
  assert.match(source, /t\._inlinePhotoLocks instanceof Map/);
  assert.match(source, /async function nxInlinePhotoFrameKey\(wrap, ownerKeyHint\)/);
  assert.match(swap, /await nxClaimInlinePhotoRequest\(wrap, semantic\?\.ownerClaim\?\.key\)/);
  assert.match(swap, /nxRunInlinePhotoMutation\(claim\.frameKey, claim\.token/);
  assert.match(swap, /nxInlinePhotoSemanticCurrent\(wrap, semantic\)/);
  assert.match(source, /probe\.onload = async \(\) =>/);
  assert.match(source, /finish\(!1\)/);
  assert.doesNotMatch(source, /getProperty\("naturalWidth"\)/);
  assert.match(source, /const timer = setTimeout\(finish, 80\)/);
  assert.match(swap, /isCurrent\(\)/);

  const syncFrom = source.indexOf('async function nxSyncInlinePhotosOnly()');
  const syncTo = source.indexOf('async function nxSelectedInlineShotCount()', syncFrom);
  const sync = source.slice(syncFrom, syncTo);
  assert.match(sync, /_inlinePhotoSyncGen/);
  assert.match(sync, /if \(stale\(\)\) return/);

  const refreshFrom = source.indexOf('async function refreshSelectedInlineImages(force');
  const refreshTo = source.indexOf('async function openSettingsTab(tab) {', refreshFrom);
  assert.match(source.slice(refreshFrom, refreshTo), /_inlinePhotoSyncGen/);
});

test('inline subscriptions are bound to live frame nodes and session scope', () => {
  const source = read('vite.config.ts');
  const watchFrom = source.indexOf('function nxWatchInlineShots(');
  const watchTo = source.indexOf('/**\n   * One host scan per bubble', watchFrom);
  const watch = source.slice(watchFrom, watchTo);
  assert.match(watch, /current\.nodes\?\.get\(id\) === shotNodes\.get\(id\)/);
  assert.match(watch, /nodes: new Map\(shotNodes\)/);
  assert.match(source, /function nxDropAllInlineSubs\(\)/);
  assert.match(source, /t\._inlinePlaceCache = null;[\s\S]*nxDropAllInlineSubs\(\)/);
  assert.match(source, /const lockKey = ye/);
  assert.match(source, /row\?\.msg\?\.sessionId \|\| sel\.sessionId/);
});

test('an old image subscription cannot overwrite a rerolled frame', () => {
  const source = read('vite.config.ts');
  const watchFrom = source.indexOf('function nxWatchInlineShots(');
  const watchTo = source.indexOf('/**\n   * One host scan per bubble', watchFrom);
  const watch = source.slice(watchFrom, watchTo);
  assert.match(watch, /getAttribute\("x-inlay-inline-shot"\)/);
  assert.match(watch, /if \(t\._inlineSubs\?\.get\(key\) !== row\) return !1/);
  assert.match(watch, /liveId !== String\(id\)/);
  assert.match(watch, /if \(!ids\.length \|\| typeof N\?\.subscribeImageUrl != "function"\) \{[\s\S]*nxDropInlineSubs\(key\)/);
  assert.match(source, /async function nxDropInlineSubsForWrap\(wrap\)/);
  assert.match(source, /getAttribute\("x-inlay-inline-key"\)[\s\S]*nxDropInlineSubs\(key\)/);
  const clearFrom = source.indexOf('async function nxClearInlinePhotos(msgEl');
  const clearTo = source.indexOf('async function nxRestoreInlinePhotos', clearFrom);
  assert.match(source.slice(clearFrom, clearTo), /nxDropInlineSubsForWrap\(wrap\)/);

  const patchFrom = source.indexOf('async function nxPatchInlinePhotoByCardId(cardId, src, prevId, rootEl, rootKey)');
  const patchTo = source.indexOf('async function refreshSelectedInlineImages(force', patchFrom);
  const patch = source.slice(patchFrom, patchTo);
  assert.ok(
    patch.indexOf('nxDropInlineSubsForWrap(wrap)') < patch.indexOf('nxSwapInlinePhoto(wrap, displaySrc'),
    'old subscriptions must be detached before the new bytes start swapping',
  );
});

test('a queued subscription callback cannot repaint after an alias-proxy clear', async () => {
  const bundle = read('dist', 'inlaynexus2.0.js');
  const from = bundle.indexOf('function nxInlineSubIds(lockKey) {');
  const to = bundle.indexOf('/**\n   * One host scan per bubble', from);
  assert.ok(from >= 0 && to > from, 'inline subscription runtime not found');
  const state = {};
  const runtime = Function(
    't',
    `${bundle.slice(from, to)}
return { nxWatchInlineShots, nxDropInlineSubsForWrap };`,
  )(state);
  const attrs = new Map([
    ['x-inlay-inline-key', 'bubble-key'],
    ['x-inlay-inline-shot', 'old-card'],
  ]);
  const callbackProxy = {
    async getAttribute(name) {
      if (name === 'x-inlay-inline-shot') {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      return attrs.get(name) ?? null;
    },
  };
  const clearProxy = {
    async getAttribute(name) {
      return attrs.get(name) ?? null;
    },
  };
  let publish = null;
  let stopped = 0;
  let patched = 0;
  const previousNative = globalThis.__INLAY_NATIVE__;
  globalThis.__INLAY_NATIVE__ = {
    subscribeImageUrl(_ids, callback) {
      publish = callback;
      return () => {
        stopped += 1;
      };
    },
  };
  try {
    runtime.nxWatchInlineShots(
      'bubble-key',
      [{ id: 'old-card' }],
      new Map([['old-card', callbackProxy]]),
      async () => {
        patched += 1;
        return true;
      },
    );
    publish?.('old-card', 'data:image/png;base64,old');
    await new Promise((resolve) => setTimeout(resolve, 1));
    await runtime.nxDropInlineSubsForWrap(clearProxy);
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(patched, 0);
    assert.equal(stopped, 1);
    assert.equal(state._inlineSubs?.size ?? 0, 0);
  } finally {
    globalThis.__INLAY_NATIVE__ = previousNative;
  }
});

test('an old subscription cannot supersede a newer owner generation', async () => {
  const bundle = read('dist', 'inlaynexus2.0.js');
  const from = bundle.indexOf('function nxMsgAct() {');
  const to = bundle.indexOf('async function refreshSelectedInlineImages(force', from);
  assert.ok(from >= 0 && to > from, 'inline runtime not found');

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  class SafeEl {
    constructor(attrs = {}) {
      this.attrs = new Map(Object.entries(attrs));
      this.html = '';
      this.style = '';
    }
    async getAttribute(name) {
      const value = this.attrs.get(name) ?? null;
      if (name === 'x-inlay-inline-shot') await sleep(10);
      return value;
    }
    async setAttribute(name, value) {
      this.attrs.set(name, String(value));
    }
    async setStyleAttribute(value) {
      if (this.styleBarrier?.value === String(value)) {
        this.styleBarrier.entered();
        await this.styleBarrier.wait;
      }
      this.style = String(value);
    }
    async setInnerHTML(value) {
      this.html = String(value);
    }
  }
  const cells = ['a', 'b'].map((layer) => new SafeEl({
    'x-inlay-inline-layer': layer,
    'x-inlay-inline-live': '0',
    'x-inlay-inline-src-key': '',
  }));
  const wrap = new SafeEl({
    'x-inlay-inline-owner': 'owner-7',
    'x-inlay-inline-key': 'old-key',
    'x-inlay-inline-slot': 's0',
    'x-inlay-inline-shot': 'old',
    'x-inlay-inline-active': '',
  });
  wrap.querySelectorAll = async (selector) => selector === '[x-inlay-inline-cell]' ? cells : [];

  class ReadyImage {
    constructor() {
      this.naturalWidth = 128;
    }
    set src(value) {
      this._src = value;
      queueMicrotask(() => this.onload?.());
    }
    async decode() {
      if (String(this._src || '').includes('newslow')) await sleep(50);
    }
  }

  const state = {};
  const runtime = Function(
    't',
    'H',
    'h',
    'ye',
    'Image',
    'requestAnimationFrame',
    'nxReadyImg',
    'k',
    `${bundle.slice(from, to)}
return {
  nxBeginInlineOwnerEpoch: typeof nxBeginInlineOwnerEpoch == "function" ? nxBeginInlineOwnerEpoch : null,
  nxWatchInlineShots,
  nxSwapInlinePhoto
};`,
  )(
    state,
    async () => new SafeEl(),
    String,
    String,
    ReadyImage,
    (callback) => setTimeout(callback, 0),
    (src) => /^data:image\//.test(String(src || '')),
    {},
  );
  assert.equal(typeof runtime.nxBeginInlineOwnerEpoch, 'function');
  const VC = {
    inlineChatOverlayImgStyle: (visible) => `opacity:${visible ? 1 : 0}`,
    inlineChatOverlayPhotoStyle: () => 'width:100%;height:100%',
  };
  const unwrap = async (value) => value || [];
  const oldOwner = runtime.nxBeginInlineOwnerEpoch('owner-7');
  const oldPatch = (node, src, expectedId) => runtime.nxSwapInlinePhoto(
    node,
    src,
    unwrap,
    {},
    VC,
    { ownerClaim: oldOwner, expectedId },
  );
  let publish = null;
  let subscriptions = 0;
  const previousNative = globalThis.__INLAY_NATIVE__;
  globalThis.__INLAY_NATIVE__ = {
    subscribeImageUrl(_ids, callback) {
      subscriptions += 1;
      publish = callback;
      return () => {};
    },
    warmImages: async () => {},
  };
  try {
    runtime.nxWatchInlineShots(
      'old-key',
      [{ id: 'old' }],
      new Map([['old', wrap]]),
      oldPatch,
    );
    publish?.('old', 'data:image/png;base64,old');
    await sleep(1);

    const newOwner = runtime.nxBeginInlineOwnerEpoch('owner-7');
    await wrap.setAttribute('x-inlay-inline-shot', 'new');
    await wrap.setAttribute('x-inlay-inline-key', 'new-key');
    const newResult = await runtime.nxSwapInlinePhoto(
      wrap,
      'data:image/png;base64,newslow',
      unwrap,
      {},
      VC,
      { ownerClaim: newOwner, expectedId: 'new' },
    );
    await sleep(80);

    assert.equal(newResult, true);
    const visible = cells.find((cell) => cell.style === 'opacity:1');
    assert.match(visible?.html || '', /base64,newslow/);
    assert.doesNotMatch(cells.filter((cell) => cell.style === 'opacity:1').map((cell) => cell.html).join(''), /base64,old/);

    let enteredResolve;
    const entered = new Promise((resolve) => {
      enteredResolve = resolve;
    });
    let releaseStyle;
    const wait = new Promise((resolve) => {
      releaseStyle = resolve;
    });
    visible.styleBarrier = {
      value: 'opacity:1',
      entered: () => enteredResolve(),
      wait,
    };
    const staleSame = runtime.nxSwapInlinePhoto(
      wrap,
      'data:image/png;base64,newslow',
      unwrap,
      {},
      VC,
      { ownerClaim: newOwner, expectedId: 'new' },
    );
    await entered;
    runtime.nxBeginInlineOwnerEpoch('owner-7');
    await wrap.setAttribute('x-inlay-inline-shot', 'newer');
    releaseStyle();
    assert.equal(await staleSame, false);
    assert.equal(visible.style, 'opacity:0', 'semantic invalidation must roll back a same-source reveal');

    const staleWatcher = runtime.nxBeginInlineOwnerEpoch('owner-7');
    runtime.nxBeginInlineOwnerEpoch('owner-7');
    const beforeStaleWatch = subscriptions;
    runtime.nxWatchInlineShots(
      'old-key',
      [{ id: 'old' }],
      new Map([['old', wrap]]),
      oldPatch,
      staleWatcher,
    );
    assert.equal(subscriptions, beforeStaleWatch, 'a stale owner must not replace the current watcher');
  } finally {
    globalThis.__INLAY_NATIVE__ = previousNative;
  }
});

test('an unresolved no-work bubble does not invalidate its live image watcher', () => {
  const source = read('vite.config.ts');
  const from = source.indexOf('async function injectChatInlineImages(msgEl, cards, pendingRows, opts) {');
  const to = source.indexOf('async function refreshSelectedInlineImages(force', from);
  const inject = source.slice(from, to);
  const hold = inject.indexOf('if (roleDisposition === "hold" && !haveWork) return');
  const transient = inject.indexOf('if (!haveWork && !opts?.confirmedEmpty && !denyRole && opts?.wantPhotos !== !1) return');
  const claim = inject.indexOf('nxBeginInlineOwnerEpoch(injectLockKey)');
  assert.ok(hold >= 0 && transient > hold && claim > transient, 'owner generation must begin only after no-work hold gates');
});

test('selection restore carries the frame owner generation and card id', () => {
  const source = read('vite.config.ts');
  const probeFrom = source.indexOf('async function nxProbeInlineShots(msgEl, unwrapSafe) {');
  const probeTo = source.indexOf('async function nxRepairDuplicateInlineFrames(', probeFrom);
  const restoreFrom = source.indexOf('async function nxRestoreInlinePhotos(msgEl');
  const restoreTo = source.indexOf('/** Selection hop:', restoreFrom);
  const probe = source.slice(probeFrom, probeTo);
  const restore = source.slice(restoreFrom, restoreTo);
  assert.match(probe, /getAttribute\("x-inlay-inline-owner"\)/);
  assert.match(probe, /owner/);
  assert.match(restore, /nxCurrentInlineOwnerEpoch\(row\.owner\)/);
  assert.match(restore, /const semantic = \{ ownerClaim, expectedId: id \}/);
  assert.match(restore, /nxShowInlinePhotoWrap\(row\.node, nxUnwrapSafeNodes, t\.hostDoc, VC, semantic\)/);
  assert.match(restore, /nxSwapInlinePhoto\(row\.node, src, nxUnwrapSafeNodes, t\.hostDoc, VC, semantic\)/);
});

test('owner mutation lock makes a newer structural write final', async () => {
  const bundle = read('dist', 'inlaynexus2.0.js');
  const from = bundle.indexOf('function nxMsgAct() {');
  const to = bundle.indexOf('async function refreshSelectedInlineImages(force', from);
  const state = {};
  const runtime = Function(
    't',
    `${bundle.slice(from, to)}
return {
  begin: nxBeginInlineOwnerEpoch,
  run: typeof nxRunInlineOwnerMutation == "function" ? nxRunInlineOwnerMutation : null
};`,
  )(state);
  assert.equal(typeof runtime.run, 'function');
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const writes = [];
  const oldOwner = runtime.begin('owner-9');
  const oldWrite = runtime.run(oldOwner, async (isCurrent) => {
    await sleep(20);
    if (!isCurrent()) return false;
    writes.push('old');
    return true;
  });
  await sleep(1);
  const newOwner = runtime.begin('owner-9');
  const newWrite = runtime.run(newOwner, async (isCurrent) => {
    if (!isCurrent()) return false;
    writes.push('new');
    return true;
  });
  assert.deepEqual(await Promise.all([oldWrite, newWrite]), [false, true]);
  assert.deepEqual(writes, ['new']);

  const source = read('vite.config.ts');
  const syncFrom = source.indexOf('const syncFrameMeta = async (node, shot) => {');
  const prependFrom = source.indexOf('const prependShot = async (host, hostIdx, shot) => {', syncFrom);
  const applyFrom = source.indexOf('const applyShot = async (shot) => {', prependFrom);
  const directFrom = source.indexOf('async function nxPatchInlinePhotoByCardId(', applyFrom);
  const refreshFrom = source.indexOf('async function refreshSelectedInlineImages(force', directFrom);
  assert.match(source.slice(syncFrom, prependFrom), /nxRunInlineOwnerMutation\(ownerClaim/);
  assert.match(source.slice(prependFrom, applyFrom), /nxRunInlineOwnerMutation\(ownerClaim/);
  assert.match(source.slice(applyFrom, directFrom), /if \(!nxInlineOwnerEpochCurrent\(ownerClaim\)\) return !1/);
  assert.match(source.slice(directFrom, refreshFrom), /nxRunInlineOwnerMutation\(ownerClaim/);
});

test('shot completion promotes a pending frame through its stable slot', () => {
  const source = read('vite.config.ts');
  const from = source.indexOf('async function nxPatchInlinePhotoByCardId(cardId, src, prevId, rootEl, rootKey)');
  const to = source.indexOf('async function refreshSelectedInlineImages(force', from);
  const patch = source.slice(from, to);
  assert.ok(from >= 0 && to > from, 'card photo patch body not found');
  assert.match(patch, /VC\?\.inlinePlacementSlotKey[\s\S]*VC\.inlinePlacementSlotKey\(card\)/);
  assert.match(patch, /x-inlay-inline-slot/);
  assert.match(patch, /slot && \/\^\[sl\]\\\\d\+\$\//);
  assert.match(patch, /if \(!exactHits\.length && safeKey && slot/);
  assert.ok(
    patch.indexOf('let exactHits') < patch.indexOf('if (!exactHits.length && safeKey && slot'),
    'all exact-id candidates must run before a message-scoped slot fallback',
  );
  assert.match(patch, /\[x-inlay-inline-key=.*\[x-inlay-inline-slot=/);
  assert.match(patch, /\[x-inlay-inline-key=.*\[x-inlay-inline-shot=/);
});

test('reroll patch searches the live host document and cold image urls', () => {
  const source = read('vite.config.ts');
  const from = source.indexOf('async function nxPatchInlinePhotoByCardId(cardId, src, prevId, rootEl, rootKey)');
  const to = source.indexOf('async function refreshSelectedInlineImages(force', from);
  const patch = source.slice(from, to);
  assert.match(patch, /N\?\.ensureImageUrl/);
  assert.match(patch, /const roots = \[t\.hostDoc, rootEl\]/);
  assert.match(patch, /root\.querySelectorAll\(selector\)/);
  assert.doesNotMatch(patch, /getCachedMsgEls/);
});

test('duplicate message text gets distinct frame, watcher, and patch identity', () => {
  const source = read('vite.config.ts');
  const keyFrom = source.indexOf('function nxInlineStampKey(sel) {');
  const keyTo = source.indexOf('function nxNeedsInlineStamp(sel)', keyFrom);
  const key = source.slice(keyFrom, keyTo);
  assert.match(key, /sel\?\.messageIndex \?\? sel\?\.chatIndex/);
  assert.match(key, /sessionId.*hash.*messageIndex/s);
  assert.match(source, /const frameKey = nxInlineStampKey\(row\?\.msg\)/);
  assert.match(source, /const lockKey = ye\(frameKey/);
  assert.match(source, /setMeta\("x-inlay-inline-key", String\(lockKey\)\)/);
});

test('reroll photo patches require a message-scoped frame key', () => {
  const source = read('vite.config.ts');
  const from = source.indexOf('async function nxPatchInlinePhotoByCardId(cardId, src, prevId, rootEl, rootKey)');
  const to = source.indexOf('async function refreshSelectedInlineImages(force', from);
  const patch = source.slice(from, to);
  assert.match(patch, /nxInlineRootKeyForCard\(card\)/);
  assert.doesNotMatch(patch, /if \(!safeKey\) return !1/);
  assert.match(patch, /idSel = '\[x-inlay-inline-shot="' \+ look \+ '"\],\[data-inlay-inline-shot="' \+ look \+ '"\]'/);
  assert.doesNotMatch(patch, /safeKey\s*\?\s*['"`]\[x-inlay-inline-key=/);

  for (const marker of [
    'VENDOR_INSPECT_REROLL_INLINE_PATCH',
    'VENDOR_INSPECT_REGEN_INLINE_PATCH',
    'VENDOR_REROLL_IMAGE_INLINE_PATCH',
    'VENDOR_REROLL_ALL_INLINE_PATCH',
  ]) {
    const markerFrom = source.indexOf(`const ${marker} =`);
    const markerTo = source.indexOf('\nconst ', markerFrom + 10);
    const body = source.slice(markerFrom, markerTo > markerFrom ? markerTo : undefined);
    assert.match(body, /nxInlineRootKeyForCard\(/, `${marker} must carry the target message identity`);
  }
});

test('message click cannot enter the structural inline refresh', () => {
  const source = read('vite.config.ts');
  const callFrom = source.indexOf('const VENDOR_INLINE_CALL_PATCH =');
  const callTo = source.indexOf('const VENDOR_INLINE_SAME_NEEDLE', callFrom);
  const callPatch = source.slice(callFrom, callTo);
  assert.match(callPatch, /source === "provisional" && opts\.auto/);
  assert.match(callPatch, /if \(await nxBubbleHasInlineFrame\(o, linkedCards\(t\.selectedMessage\), nxPendingForInlineSelection\(t\.selectedMessage\)\)\) await nxSyncInlinePhotosOnly\(\);[\s\S]*else await refreshSelectedInlineImages\(\)/);

  const sameFrom = source.indexOf('const VENDOR_INLINE_SAME_PATCH =');
  const sameTo = source.indexOf('/** Progressive bubble inline', sameFrom);
  const samePatch = source.slice(sameFrom, sameTo);
  assert.doesNotMatch(samePatch, /nxSyncInlinePhotosOnly/);
  assert.match(samePatch, /!\(await nxBubbleHasInlineFrame\(o, linkedCards\(t\.selectedMessage\), nxPendingForInlineSelection\(t\.selectedMessage\)\)\)[\s\S]*await refreshSelectedInlineImages\(\)/);
  assert.match(source, /source === "click"[\s\S]*await nxBubbleHasInlineFrame\(o, linkedCards\(t\.selectedMessage\), nxPendingForInlineSelection\(t\.selectedMessage\)\)\) return !0/);
});

test('partial inline frames cannot suppress append-only repair of the window', () => {
  const source = read('vite.config.ts');
  const helperFrom = source.indexOf('async function nxBubbleHasInlineFrame');
  const helperTo = source.indexOf('/** True when this bubble already shows', helperFrom);
  const helper = source.slice(helperFrom, helperTo);
  assert.match(helper, /wantSlots/);
  assert.match(helper, /wantSlots\.every/);
  assert.match(helper, /inlinePlacementSlotKey/);
  assert.match(helper, /partitionInlineFrameDuplicates/);
  assert.match(helper, /duplicatePlan\?\.duplicates\?\.length/);

  const refreshFrom = source.indexOf('async function refreshSelectedInlineImages(force');
  const refreshTo = source.indexOf('async function openSettingsTab(tab) {', refreshFrom);
  const refresh = source.slice(refreshFrom, refreshTo);
  assert.doesNotMatch(refresh, /nxInlineAlreadyPainted/);
});

test('stable-slot reconciliation never reuses one frame twice', () => {
  const source = read('vite.config.ts');
  const injectFrom = source.indexOf('async function injectChatInlineImages(msgEl, cards, pendingRows, opts) {');
  const from = source.indexOf('const applyShot = async (shot) => {');
  const to = source.indexOf('const tPlace = Date.now()', from);
  const apply = source.slice(from, to);
  const planning = source.slice(injectFrom, from);
  assert.match(planning, /const bySlot = new Map\(\)/);
  assert.match(planning, /if \(bySlot\.has\(slot\)\) continue/);
  assert.doesNotMatch(planning, /const byLine = new Map\(\)/);
  assert.match(apply, /usedNodes\.has\(mark\.node\)/);
  assert.match(apply, /!m\.slot/);
  assert.match(apply, /frameBySlot\.delete\(mark\.slot\)/);
  assert.match(apply, /frameById\.delete\(mark\.id\)/);
});

test('in-place frame retarget updates spinner aspect geometry', () => {
  const source = read('vite.config.ts');
  const from = source.indexOf('const syncFrameMeta = async (node, shot) => {');
  const to = source.indexOf('const prependShot = async', from);
  const sync = source.slice(from, to);
  assert.match(sync, /VC\.inlinePlaceholderSize\(shot\)/);
  assert.match(sync, /aspect-ratio:/);
  assert.match(sync, /spin\.setStyleAttribute/);
  assert.doesNotMatch(sync, /setAttribute\("(?:width|height|src)"/);
});

test('confirmed selected message without linked cards hides stale photos only', () => {
  const source = read('vite.config.ts');
  const syncFrom = source.indexOf('async function nxSyncInlinePhotosOnly()');
  const syncTo = source.indexOf('async function nxSelectedInlineShotCount()', syncFrom);
  const sync = source.slice(syncFrom, syncTo);
  assert.match(sync, /selectedCards/);
  assert.match(sync, /idx === selIdx && !selectedCards\.length/);
  assert.doesNotMatch(sync, /nxClearInlinePhotos/);
  assert.match(sync, /await nxHideInlinePhotos\(els\[idx\], \(\) => !stale\(\)\)/);

  const injectFrom = source.indexOf('async function injectChatInlineImages(msgEl, cards, pendingRows, opts) {');
  const injectTo = source.indexOf('async function refreshSelectedInlineImages(force', injectFrom);
  assert.doesNotMatch(source.slice(injectFrom, injectTo), /nxClearInlinePhotos/);
});

test('ordinary selection changes hide retained photos without clearing their layer HTML', () => {
  const source = read('vite.config.ts');
  const syncFrom = source.indexOf('async function nxSyncInlinePhotosOnly()');
  const syncTo = source.indexOf('async function nxSelectedInlineShotCount()', syncFrom);
  const sync = source.slice(syncFrom, syncTo);
  assert.match(sync, /await nxHideInlinePhotos\(els\[idx\], \(\) => !stale\(\)\)/);
  assert.match(source, /async function nxHideInlinePhotoWrap\(/);
  const hideFrom = source.indexOf('async function nxHideInlinePhotoWrap(');
  const hideTo = source.indexOf('async function nxClearInlinePhotoWrap(', hideFrom);
  assert.doesNotMatch(source.slice(hideFrom, hideTo), /setInnerHTML\(/);
});

test('force tag clear and pending restamp stay scoped to their original message', () => {
  const source = read('vite.config.ts');
  const forceFrom = source.indexOf('const VENDOR_FORCE_REGEN_INLINE_PATCH =');
  const forceTo = source.indexOf('/** Soft-stop mid message reroll loop', forceFrom);
  const force = source.slice(forceFrom, forceTo);
  assert.match(force, /nxInlineStampKey\(l\)/);
  assert.match(force, /const targetStampKey = nxInlineStampKey\(l\)/);
  assert.match(force, /nxRemoveInlineFramesByKey\(t\.hostDoc, ye\(targetStampKey\)\)/);
  assert.ok(
    force.indexOf('const targetStampKey') < force.indexOf('if (e.sessionId) await ce'),
    'force-tag target identity must be captured before the gallery await',
  );
  assert.match(force, /l\?\.hash === m/);
  assert.doesNotMatch(force, /wipeEls\[wipeIdx\]/);
  assert.doesNotMatch(force, /ye\(t\._inlineNeedStampKey\)/);
  assert.doesNotMatch(force, /Number\(t\.selectedMessage\?\.domIndex\)/);

  assert.match(source, /function nxNeedsInlineStamp\(sel\)/);
  const pollFrom = source.indexOf('const VENDOR_INLINE_POLL_REFRESH_PATCH =');
  const pollTo = source.indexOf('/** Job complete', pollFrom);
  const poll = source.slice(pollFrom, pollTo);
  assert.match(poll, /nxNeedsInlineStamp\(t\.selectedMessage\)/);
  assert.match(source, /function nxPendingForInlineSelection\(sel\)/);
  assert.match(source, /injectChatInlineImages\(els\[idx\], cards, idx === selIdx \? nxPendingForInlineSelection\(sel\) : \[\], \{/);
});

test('pending inline rows never cross message or session scope', () => {
  const bundle = read('dist', 'inlaynexus2.0.js');
  const pollFrom = bundle.indexOf('function ua(e, n, o = "") {');
  const pollTo = bundle.indexOf('function Se()', pollFrom);
  const poll = bundle.slice(pollFrom, pollTo);
  assert.ok(pollFrom >= 0 && pollTo > pollFrom, 'job poll body not found');
  assert.ok(
    poll.indexOf('t._inlinePendingSessionId = ""') < poll.indexOf('if (t.uiOpen) {'),
    'terminal pending cleanup must run before the viewer-open early return',
  );
  const from = bundle.indexOf('function nxInlineStampKey(sel) {');
  const to = bundle.indexOf('function nxInlineSubIds(lockKey) {', from);
  assert.ok(from >= 0 && to > from, 'pending-selection helpers not found');
  const t = {
    _inlineNeedStamp: true,
    _inlineNeedStampKey: 'session-a|hash-a|m1',
    _inlinePending: [{ shot_index: 0, line: 2 }],
    _inlinePendingMsgIndex: 3,
    _inlinePendingSessionId: 'session-a',
  };
  const runtime = Function(
    't',
    'ye',
    `${bundle.slice(from, to)}
return { nxPendingForInlineSelection };`,
  )(t, (value) => String(value));

  assert.deepEqual(
    runtime.nxPendingForInlineSelection({
      sessionId: 'session-a',
      hash: 'hash-a',
      messageIndex: 1,
    }),
    [],
    'a stale tag-restamp flag must not pull another message pending rows',
  );
  assert.deepEqual(
    runtime.nxPendingForInlineSelection({
      sessionId: 'session-a',
      hash: 'hash-c',
      messageIndex: 3,
    }),
    t._inlinePending,
  );
  assert.deepEqual(
    runtime.nxPendingForInlineSelection({
      sessionId: 'session-b',
      hash: 'hash-c',
      messageIndex: 3,
    }),
    [],
  );
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
  assert.match(bundle, /markerBlockHtml\(shot, t\.backendSettings\?\.card\?\.inline_chat_scale_pct \?\? 100, lockKey, injectLockKey\)/);
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
  assert.match(bundle, /const injectLockKey = String\(opts\?\.injectLockKey \|\| lockKey\)/);
  assert.match(bundle, /t\._inlineInjectLocks\.get\(injectLockKey\)/);
  assert.match(bundle, /VC\.inlineInjectOwnerKey\(row\?\.msg, idx, sel\.sessionId\)/);
  assert.match(bundle, /injectLockKey: ye\(injectOwner\)/);
  assert.match(bundle, /setMeta\("x-inlay-inline-key", String\(lockKey\)\)/);
});

test('the neighbour window is painted in the same pass, mid-scroll included', () => {
  const source = read('vite.config.ts');
  const start = source.indexOf('async function refreshSelectedInlineImages(force');
  const end = source.indexOf('async function openSettingsTab(tab) {', start);
  const refresh = source.slice(start, end);
  // Deferring it to a later pass left it blank: settle only re-enters when the
  // selected index changes. stale() abandons a pass as soon as a newer one starts.
  assert.doesNotMatch(refresh, /inline\.paint\.defer/);
  assert.ok((refresh.match(/if \(stale\(\)\) return;/g) || []).length >= 2);
});

test('a finished pass hides the attach toast', () => {
  const source = read('vite.config.ts');
  const start = source.indexOf('async function refreshSelectedInlineImages(force');
  const end = source.indexOf('async function openSettingsTab(tab) {', start);
  const refresh = source.slice(start, end);
  assert.match(refresh, /hideAttachToast\(\{ done: 1 \}\)/);
  assert.doesNotMatch(refresh, /const commitPaint = \(\) => \{/);
});

test('inline refresh is a DOM window, not a keep-list keyed on index', () => {
  const source = read('vite.config.ts');
  const start = source.indexOf('async function refreshSelectedInlineImages(force');
  const end = source.indexOf('async function openSettingsTab(tab) {', start);
  const refresh = source.slice(start, end);
  assert.doesNotMatch(refresh, /_inlineKeepIdxs/);
  assert.doesNotMatch(refresh, /_inlineKeepEls = nextKeep/);
  assert.match(refresh, /VC\.inlineDomWindow\(selIdx, els\.length, radius\)/);
  assert.match(source, /setAttribute\("x-inlay-msg-index", String\(msgIdx\)\)/);
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

test('click select does not scroll the chat', () => {
  const source = read('vite.config.ts');
  const patch = source.slice(
    source.indexOf('const VENDOR_ENSURE_IN_VIEW_PATCH'),
    source.indexOf('const VENDOR_INLINE_CALL_NEEDLE'),
  );
  assert.match(patch, /return;/);
  assert.doesNotMatch(patch, /n\.height \* 0\.5 - o \* 0\.45/);
  assert.doesNotMatch(patch, /setScrollTopSafe/);
  const call = source.slice(
    source.indexOf('const VENDOR_INLINE_CALL_PATCH'),
    source.indexOf('const VENDOR_INLINE_SAME_NEEDLE'),
  );
  assert.doesNotMatch(call, /ensureMessageInView/);
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
  assert.doesNotMatch(source, /unwrapGone\(/);
  assert.match(source, /querySelectorAll\("\[x-inlay-msg-actions\]"\)/);
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
  // Each spinner-window bubble carries its own cards. sel.cards is [] on a
  // user turn and must not strip a neighbour char's shots.
  assert.match(source, /injectChatMsgActions\(els\[idx\], cards, idx\)/);
  assert.match(source, /injectChatInlineImages\(els\[idx\], cards, idx === selIdx \? nxPendingForInlineSelection\(sel\) : \[\], \{/);
  assert.match(source, /role: roleAt\(idx\)/);
  assert.match(source, /VC\.roleForInlineBubble\(\{/);
  assert.match(source, /VC\.cardsForInlineBubble\(\{/);
  assert.match(source, /VC\.inlineRoleDisposition\(opts\.role/);
  assert.match(source, /if \(roleDisposition === "hold" && !haveWork\) return/);
  assert.match(source, /getAttribute\("x-inlay-inline-layout"\)/);
  assert.match(source, /layoutVersion: mark\.layoutVersion/);
  assert.match(source, /VC\.INLINE_FRAME_LAYOUT_VERSION/);
  assert.match(source, /VC\.inlineChatOverlayImgStyle/);
  assert.match(source, /id="nx-inline-dom-radius" type="number" min="3" max="20" step="1"/);
  assert.match(source, /inline_chat_dom_radius: Math\.max\(3, Math\.min\(20,/);
  assert.match(source, /inline_chat_dom_radius\) \|\| 4/);
  assert.match(source, /VC\.inlineDomWindow\(selIdx, els\.length, radius\)/);
  {
    const injectFrom = source.indexOf('async function injectChatInlineImages(msgEl, cards, pendingRows, opts) {');
    const injectTo = source.indexOf('async function refreshSelectedInlineImages(force', injectFrom);
    const inject = injectFrom >= 0 && injectTo > injectFrom ? source.slice(injectFrom, injectTo) : '';
    assert.match(source, /querySelectorAll\("\[x-inlay-inline-cell\]"\)/);
    assert.match(source, /querySelectorAll\("\[data-inlay-inline-stack\]"\)/);
    assert.match(source, /VC\.inlineChatOverlayImgStyle\(!0\)/);
    assert.doesNotMatch(inject, /spin\.setStyleAttribute\("display:none"\)/);
    assert.doesNotMatch(inject, /typeof spin\.remove/);
  }
  {
    const refreshFrom = source.indexOf('async function refreshSelectedInlineImages(force');
    const refreshTo = source.indexOf('async function openSettingsTab(tab) {', refreshFrom);
    const refresh = refreshFrom >= 0 && refreshTo > refreshFrom ? source.slice(refreshFrom, refreshTo) : '';
    assert.match(refresh, /VC\.inlineDomWindow\(selIdx, els\.length, radius\)/);
    assert.match(refresh, /VC\.shouldOverlayInlinePhoto\(\{/);
    assert.match(refresh, /wantPhotos: nextPhotoIdx\.has\(idx\)/);
    assert.match(refresh, /evictPhotosIn/);
    assert.match(refresh, /if \(idx === selIdx && sel\)/);
    assert.match(refresh, /row = \{ idx, msg: sel,/);
    assert.doesNotMatch(refresh, /nxInlineAlreadyPainted\(els\[selIdx\]/);
    assert.match(refresh, /onlySel/);
    assert.doesNotMatch(refresh, /data-inlay-inline-shot\],\[data-inlay-inline-pending\],\[x-inlay-msg-actions\]/);
  }
  assert.match(source, /async function nxClearInlinePhotos\(/);
  assert.match(source, /t\._inlineNeedStamp = !0/);
  assert.match(source, /await nxRemoveInlineFramesByKey\(t\.hostDoc, ye\(tagStampKey\)\)/);
  assert.match(source, /await refreshSelectedInlineImages\(!0, \{ onlySel: !0 \}\)/);
  assert.doesNotMatch(source, /refreshSelectedInlineImages\(\!\(c \|\| a\.state === "done" \|\| pendingChanged\)\)/);
  assert.match(source, /async function nxSyncInlinePhotosOnly\(/);
  assert.match(source, /await nxSyncInlinePhotosOnly\(\)/);
  assert.match(source, /else if \(source === "click" \|\| source === "text" \|\| source === "scroll"\)/);
  assert.match(source, /nxPatchInlinePhotoByCardId/);
  assert.match(source, /injectChatMsgActions\(els\[idx\], cards, idx\)/);
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
