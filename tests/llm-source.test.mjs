import test from 'node:test';
import assert from 'node:assert/strict';

import { llmIsRisuSource, normalizeLlmSource, risuModeForSource } from '../.test-build/llm-transform.mjs';

test('normalizeLlmSource maps split Risu aux modes', () => {
  assert.equal(normalizeLlmSource('main'), 'main');
  assert.equal(normalizeLlmSource('aux'), 'aux');
  assert.equal(normalizeLlmSource('memory'), 'memory');
  assert.equal(normalizeLlmSource('translate'), 'translate');
  assert.equal(normalizeLlmSource('emotion'), 'emotion');
  assert.equal(normalizeLlmSource('other'), 'other');
  assert.equal(normalizeLlmSource('otherAx'), 'other');
  assert.equal(normalizeLlmSource('custom'), 'custom');
});

test('risuModeForSource matches ModelModeExtended', () => {
  assert.equal(risuModeForSource('main'), 'model');
  assert.equal(risuModeForSource('aux'), 'otherAx');
  assert.equal(risuModeForSource('other'), 'otherAx');
  assert.equal(risuModeForSource('memory'), 'memory');
  assert.equal(risuModeForSource('translate'), 'translate');
  assert.equal(risuModeForSource('emotion'), 'emotion');
});

test('llmIsRisuSource is true for every Risu lane', () => {
  assert.equal(llmIsRisuSource('main'), true);
  assert.equal(llmIsRisuSource('aux'), true);
  assert.equal(llmIsRisuSource('memory'), true);
  assert.equal(llmIsRisuSource('custom'), false);
});
