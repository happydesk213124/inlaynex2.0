import test from 'node:test';
import assert from 'node:assert/strict';

import {
  filterAssetPromptTags,
  packAssetTagGroups,
  restoreAssetTagWeights,
  splitNaiPromptTokens,
} from '../.test-build/nai-meta-prompt-tags.mjs';
import { assetMatchTriggers, assetNameTokens, scoreAssetName } from '../.test-build/nai-meta-match.mjs';
import { promptFromNaiMetadata } from '../.test-build/nai-meta-from-metadata.mjs';
import { dimsForAspect, normalizeShotAspect } from '../.test-build/nai-meta-aspect.mjs';
import { filterStylePresetPositive, styleFieldsFromNaiMetadata } from '../.test-build/nai-meta-style-preset.mjs';
import {
  extractStealthFromRgba,
  writeStealthAlphaLsb,
} from '../.test-build/nai-meta-stealth.mjs';

const EXAMPLE = [
  '1girl',
  '0.5::artist:opossumachine::',
  '1.2::artist:healthyman::',
  '0.8::artist:yamamoto souichirou::',
  '0.3::artist:tianliang duohe fangdongye::',
  '[[[[[[[artist:jp06]]]]]]]',
  '0.7::artist:ningen mame::',
  '0.6::artist:mochi (circle rin)::',
  '0.5::artist:kuromoto-kun (rina masimaro)::',
  '1.5::artist:shuri 84k::',
  '0.5::artist:mikozin::',
  '0.9::artist:freng::',
  'year 2024',
  'year 2025',
  'cowboy shot',
  'dark green hair',
  'purple eyes',
  'red demon horns',
  'large breasts',
  'witch hat',
  'black dress',
  'fantasy',
  'bags under eyes',
  'black cape',
  'looking at viewer',
  'one eye closed',
  'light smile',
  '{{{hand on own hip, index finger raised}}}',
  'white background',
  '{best quality, amazing quality, very aesthetic, highres, incredibly absurdres}',
  '-1::bad anatomy::',
  'best illustration',
  '-6::artist collaboration::',
].join(', ');

test('filterAssetPromptTags drops artist/year/quality/negatives and strips emphasis', () => {
  const { plains, weightMap } = filterAssetPromptTags(EXAMPLE);
  assert.deepEqual(plains, [
    '1girl',
    'dark green hair',
    'purple eyes',
    'red demon horns',
    'large breasts',
    'witch hat',
    'black dress',
    'fantasy',
    'bags under eyes',
    'black cape',
    'one eye closed',
    'light smile',
    'hand on own hip',
    'index finger raised',
    'white background',
  ]);
  assert.equal(weightMap.get('hand on own hip'), '{{{hand on own hip}}}');
  assert.equal(weightMap.get('index finger raised'), '{{{index finger raised}}}');
  assert.equal(weightMap.get('dark green hair'), 'dark green hair');
});

test('restoreAssetTagWeights reapplies brace emphasis', () => {
  const { weightMap } = filterAssetPromptTags(EXAMPLE);
  const restored = restoreAssetTagWeights(
    'dark green hair, hand on own hip, index finger raised, witch hat',
    weightMap,
  );
  assert.match(restored, /dark green hair/);
  assert.match(restored, /\{\{\{hand on own hip\}\}\}/);
  assert.match(restored, /\{\{\{index finger raised\}\}\}/);
  assert.match(restored, /witch hat/);
});

test('packAssetTagGroups computes common and unique', () => {
  const a = filterAssetPromptTags('blonde hair, blue eyes, school uniform');
  const b = filterAssetPromptTags('blonde hair, blue eyes, hoodie');
  const packed = packAssetTagGroups([
    { name: 'yuki_school', plains: a.plains, weightMap: a.weightMap },
    { name: 'yuki_casual', plains: b.plains, weightMap: b.weightMap },
  ]);
  assert.deepEqual(packed.common, ['blonde hair', 'blue eyes']);
  assert.deepEqual(packed.assets[0].unique, ['school uniform']);
  assert.deepEqual(packed.assets[1].unique, ['hoodie']);
});

test('asset matching ignores short triggers and requires token exactness', () => {
  assert.deepEqual(assetMatchTriggers(['h', 'yu', 'yuki', 'witch']), ['yuki', 'witch']);
  assert.deepEqual(assetNameTokens('Yuki_witch_hat.png'), ['yuki', 'witch', 'hat']);
  assert.equal(scoreAssetName('happy_pose', ['h']), null);
  assert.ok(scoreAssetName('yuki_school', ['yuki']));
  assert.equal(scoreAssetName('witchy', ['witch']), null);
});

test('promptFromNaiMetadata merges base and char captions', () => {
  const prompt = promptFromNaiMetadata({
    Comment: JSON.stringify({
      prompt: 'solo',
      v4_prompt: {
        caption: {
          base_caption: 'white background',
          char_captions: [
            { char_caption: 'dark green hair, purple eyes' },
            { char_caption: 'witch hat' },
          ],
        },
      },
    }),
  });
  assert.match(prompt, /solo/);
  assert.match(prompt, /white background/);
  assert.match(prompt, /dark green hair/);
  assert.match(prompt, /witch hat/);
});

test('splitNaiPromptTokens keeps brace groups', () => {
  const tokens = splitNaiPromptTokens('a, {{{hand on own hip, index finger raised}}}, b');
  assert.ok(tokens.some((t) => t.includes('hand on own hip')));
});

test('normalizeShotAspect and dimsForAspect', () => {
  assert.equal(normalizeShotAspect('portrait'), 'portrait');
  assert.equal(normalizeShotAspect('1:1'), 'square');
  assert.equal(normalizeShotAspect('landscape'), 'landscape');
  assert.deepEqual(dimsForAspect('square', { width: 832, height: 1216 }, true), {
    width: 1024,
    height: 1024,
    aspect: 'square',
  });
  assert.deepEqual(dimsForAspect('landscape', { width: 832, height: 1216 }, true), {
    width: 1216,
    height: 832,
    aspect: 'landscape',
  });
  assert.equal(dimsForAspect('portrait', { width: 900, height: 900 }, false).aspect, 'settings');
});

test('filterStylePresetPositive keeps artist and quality with emphasis', () => {
  const pos = filterStylePresetPositive(EXAMPLE);
  assert.match(pos, /artist:opossumachine/);
  assert.match(pos, /artist:jp06/);
  assert.match(pos, /best quality/);
  assert.match(pos, /amazing quality/);
  assert.match(pos, /-1::bad anatomy::/);
  assert.match(pos, /best illustration/);
  assert.match(pos, /-6::artist collaboration::/);
  assert.equal(pos.includes('dark green hair'), false);
  assert.equal(pos.includes('witch hat'), false);
  assert.equal(pos.includes('1girl'), false);
});

test('styleFieldsFromNaiMetadata reads neg and cfg', () => {
  const fields = styleFieldsFromNaiMetadata(
    {
      Comment: JSON.stringify({
        prompt: '0.5::artist:freng::, best quality, dark green hair',
        uc: 'lowres, bad hands',
        scale: 5.5,
        cfg_rescale: 0.2,
      }),
    },
    '0.5::artist:freng::, best quality, dark green hair',
  );
  assert.match(fields.positive, /artist:freng/);
  assert.match(fields.positive, /best quality/);
  assert.equal(fields.positive.includes('dark green hair'), false);
  assert.equal(fields.negative, 'lowres, bad hands');
  assert.equal(fields.cfg_scale, 5.5);
  assert.equal(fields.cfg_rescale, 0.2);
});

test('extractStealthFromRgba reads column-major alpha LSBs (NovelAI order)', async () => {
  const width = 64;
  const height = 64;
  const rgba = new Uint8Array(width * height * 4);
  // Opaque white base.
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = 255;
    rgba[i + 1] = 255;
    rgba[i + 2] = 255;
    rgba[i + 3] = 255;
  }
  const json = JSON.stringify({ prompt: 'stealth ok, dark green hair', Comment: '{"prompt":"nested"}' });
  const jsonBytes = new TextEncoder().encode(json);
  const magic = new TextEncoder().encode('stealth_pnginfo');
  const len = jsonBytes.length * 8;
  const header = new Uint8Array(4);
  header[0] = (len >>> 24) & 0xff;
  header[1] = (len >>> 16) & 0xff;
  header[2] = (len >>> 8) & 0xff;
  header[3] = len & 0xff;
  const payload = new Uint8Array(magic.length + 4 + jsonBytes.length);
  payload.set(magic, 0);
  payload.set(header, magic.length);
  payload.set(jsonBytes, magic.length + 4);
  writeStealthAlphaLsb(rgba, width, height, payload);

  const meta = await extractStealthFromRgba(rgba, width, height);
  assert.ok(meta && typeof meta === 'object');
  assert.match(String(meta.prompt || ''), /stealth ok/);
});
