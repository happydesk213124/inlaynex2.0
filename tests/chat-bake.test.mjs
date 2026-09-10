import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bakeAssetName,
  bakeTokenForCard,
  messageHasBakeToken,
  proseForHash,
  stripBakeTokenForCard,
  stripBakeTokens,
} from '../.test-build/chat-bake.mjs';
import {
  applyBakeTokensToBody,
  injectInlineImagesIntoHtml,
  insertSnippetAtShotLine,
  stripInlayInlineHtml,
} from '../.test-build/viewer-core.mjs';

test('bake tokens are namespaced and strip leaves user assets', () => {
  const token = bakeTokenForCard('card-1');
  assert.equal(bakeAssetName('card-1'), 'inxbake_card-1.webp');
  assert.equal(token, '{{#asset::inxbake_card-1.webp}}');
  const body = `안녕\n{{#asset::portrait}}\n${token}\n커피`;
  assert.equal(messageHasBakeToken(body), true);
  assert.equal(stripBakeTokens(body).includes('{{#asset::portrait}}'), true);
  assert.equal(messageHasBakeToken(stripBakeTokens(body)), false);
  assert.equal(stripBakeTokenForCard(body, 'card-1').includes(token), false);
  assert.equal(proseForHash(body), proseForHash(stripBakeTokens(body)));
});

test('plain bake insert matches inline line side', () => {
  const plain = '차를 탔다\n커피를 마셨다\n끝';
  const token = bakeTokenForCard('c1');
  const before = insertSnippetAtShotLine(plain, 2, 'before', token);
  assert.match(before, new RegExp(`${token.replace(/[{}]/g, '\\$&')}\\n커피를 마셨다`));
  const after = insertSnippetAtShotLine(plain, 2, 'after', token);
  assert.match(after, /커피를 마셨다\n\{\{#asset::inxbake_c1\.webp\}\}/);
});

test('html bake insert index matches inline inject', () => {
  const src = 'data:image/png;base64,abc';
  const rich = '차를 탔다<br><b>커피를 마셨다</b><br>끝';
  const injected = injectInlineImagesIntoHtml(rich, [
    { line: 2, src, shotIndex: 0, cardId: 'c1' },
  ], { textSide: 'before' });
  const token = bakeTokenForCard('c1');
  const baked = insertSnippetAtShotLine(rich, 2, 'before', token);
  const injAt = injected.indexOf('data-inlay-inline-shot="c1"');
  const wrapStart = injected.lastIndexOf('<div', injAt);
  const bakeAt = baked.indexOf(token);
  assert.ok(injAt > 0 && bakeAt >= 0);
  assert.equal(bakeAt, wrapStart);
  assert.equal(stripInlayInlineHtml(injected).includes('<b>커피를 마셨다</b>'), true);
});

test('applyBakeTokensToBody rewrites from a clean body', () => {
  const plain = '첫째\n둘째\n셋째';
  const once = applyBakeTokensToBody(plain, [
    { line: 1, cardId: 'a' },
    { line: 3, cardId: 'c' },
  ], 'before');
  const again = applyBakeTokensToBody(once, [
    { line: 1, cardId: 'a' },
    { line: 3, cardId: 'c2' },
  ], 'before');
  assert.equal(again.includes('inxbake_a.webp'), true);
  assert.equal(again.includes('inxbake_c2.webp'), true);
  assert.equal(again.includes('inxbake_c.webp'), false);
  assert.equal(proseForHash(once), proseForHash(plain));
  assert.equal(proseForHash(again), proseForHash(plain));
});
