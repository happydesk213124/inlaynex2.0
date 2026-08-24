import assert from 'node:assert/strict';
import test from 'node:test';

import { parseJsonBody, parseNaiQuota } from '../.test-build/nai-quota.mjs';
import { firstLastParagraphIndices } from '../.test-build/viewer-core.mjs';

test('parseNaiQuota reads Anlas + Opus from subscription JSON', () => {
  const parsed = parseNaiQuota({
    trainingStepsLeft: { fixedTrainingStepsLeft: 9000, purchasedTrainingSteps: 120 },
    perks: { unlimitedMaxPriority: true, unlimitedImageGeneration: true },
  });
  assert.equal(parsed.fixed, 9000);
  assert.equal(parsed.purchased, 120);
  assert.equal(parsed.total, 9120);
  assert.equal(parsed.opus, true);
  assert.equal(parsed.unlimitedImageGeneration, true);
});

test('parseNaiQuota surfaces V5-like remaining/max as a usage bar', () => {
  const parsed = parseNaiQuota({
    trainingStepsLeft: { fixedTrainingStepsLeft: 10, purchasedTrainingSteps: 0 },
    perks: { unlimitedMaxPriority: true },
    imageGenerationUsage: { remaining: 40, max: 80 },
  });
  assert.ok(parsed.v5_usage);
  assert.equal(parsed.v5_usage.remaining, 40);
  assert.equal(parsed.v5_usage.max, 80);
  assert.equal(parsed.v5_usage.pct, 50);
});

test('parseJsonBody accepts {data} / string / bytes without .json()', () => {
  const obj = { trainingStepsLeft: { fixedTrainingStepsLeft: 3, purchasedTrainingSteps: 1 } };
  assert.deepEqual(parseJsonBody({ data: obj }), obj);
  assert.deepEqual(parseJsonBody(JSON.stringify(obj)), obj);
  assert.deepEqual(parseJsonBody(new TextEncoder().encode(JSON.stringify(obj))), obj);
});

test('firstLastParagraphIndices picks first and last P only', () => {
  assert.deepEqual(firstLastParagraphIndices(['DIV', 'P', 'SPAN', 'P', 'P']), [1, 4]);
  assert.deepEqual(firstLastParagraphIndices(['P']), [0]);
  assert.deepEqual(firstLastParagraphIndices(['DIV', 'SPAN']), []);
});
