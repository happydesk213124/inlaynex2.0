import assert from 'node:assert/strict';
import test from 'node:test';

import { joinPresetLookPrompt, PRESET_LOOK_TAIL } from '../.test-build/preset-look-prompt.mjs';

test('joinPresetLookPrompt appends 1girl, smile, once', () => {
  assert.equal(joinPresetLookPrompt(''), PRESET_LOOK_TAIL);
  assert.equal(joinPresetLookPrompt('best quality'), `best quality, ${PRESET_LOOK_TAIL}`);
  assert.equal(joinPresetLookPrompt('best quality,'), `best quality, ${PRESET_LOOK_TAIL}`);
  assert.equal(joinPresetLookPrompt('best quality, 1girl, smile, extra'), 'best quality, 1girl, smile, extra,');
  assert.equal(joinPresetLookPrompt('1girl, smile,'), '1girl, smile,');
});
