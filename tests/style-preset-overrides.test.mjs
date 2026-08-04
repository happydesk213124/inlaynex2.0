import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveGenerationNaiParams } from '../.test-build/style-preset-overrides.mjs';

const baseNai = { cfg_scale: 7, cfg_rescale: 0.36, vibe_transfer: 'none' };

test('empty preset keeps NAI model-settings defaults', () => {
  assert.deepEqual(resolveGenerationNaiParams(baseNai, null), {
    cfg_scale: 7,
    cfg_rescale: 0.36,
    vibe_transfer: 'none',
  });
  assert.deepEqual(resolveGenerationNaiParams(baseNai, { vibe_transfer: '' }), {
    cfg_scale: 7,
    cfg_rescale: 0.36,
    vibe_transfer: 'none',
  });
});

test('preset cfg and vibe override NAI defaults', () => {
  assert.deepEqual(
    resolveGenerationNaiParams(baseNai, {
      cfg_scale: 5.5,
      cfg_rescale: 0.2,
      vibe_transfer: 'file',
    }),
    { cfg_scale: 5.5, cfg_rescale: 0.2, vibe_transfer: 'file' },
  );
});

test('preset can force vibe off while NAI default is file', () => {
  assert.deepEqual(
    resolveGenerationNaiParams({ ...baseNai, vibe_transfer: 'file' }, { vibe_transfer: 'none' }),
    { cfg_scale: 7, cfg_rescale: 0.36, vibe_transfer: 'none' },
  );
});
