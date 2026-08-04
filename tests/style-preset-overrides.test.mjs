import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveGenerationCfgParams } from '../.test-build/style-preset-overrides.mjs';

const baseNai = { cfg_scale: 7, cfg_rescale: 0.36 };

test('empty preset keeps NAI CFG defaults', () => {
  assert.deepEqual(resolveGenerationCfgParams(baseNai, null), {
    cfg_scale: 7,
    cfg_rescale: 0.36,
  });
  assert.deepEqual(resolveGenerationCfgParams(baseNai, {}), {
    cfg_scale: 7,
    cfg_rescale: 0.36,
  });
});

test('preset cfg overrides NAI defaults', () => {
  assert.deepEqual(
    resolveGenerationCfgParams(baseNai, {
      cfg_scale: 5.5,
      cfg_rescale: 0.2,
    }),
    { cfg_scale: 5.5, cfg_rescale: 0.2 },
  );
});
