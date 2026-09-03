import assert from 'node:assert/strict';
import test from 'node:test';

import { joinCharacterPreviewPrompt, joinPresetLookPrompt, PRESET_LOOK_TAIL } from '../.test-build/preset-look-prompt.mjs';

test('joinCharacterPreviewPrompt does not append 1girl, smile', () => {
  assert.equal(joinCharacterPreviewPrompt('best quality, long hair'), 'best quality, long hair');
  assert.equal(joinCharacterPreviewPrompt('best quality,'), 'best quality,');
  assert.doesNotMatch(joinCharacterPreviewPrompt('best quality'), /1girl,\s*smile/);
  assert.doesNotMatch(joinCharacterPreviewPrompt(''), /1girl|smile/);
});

test('joinPresetLookPrompt appends 1girl, smile, once', () => {
  assert.equal(joinPresetLookPrompt(''), PRESET_LOOK_TAIL);
  assert.equal(joinPresetLookPrompt('best quality'), `best quality, ${PRESET_LOOK_TAIL}`);
  assert.equal(joinPresetLookPrompt('best quality,'), `best quality, ${PRESET_LOOK_TAIL}`);
  assert.equal(joinPresetLookPrompt('best quality, 1girl, smile, extra'), 'best quality, 1girl, smile, extra,');
  assert.equal(joinPresetLookPrompt('1girl, smile,'), '1girl, smile,');
});
