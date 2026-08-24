import assert from 'node:assert/strict';
import test from 'node:test';

import {
  characterReferenceCandidates,
  effectiveCharacterReferenceMode,
  pickPresetForFamily,
  resolveShotFamily,
  shouldPrepareSharedVibe,
  taggerShouldUseV5Rules,
} from '../.test-build/nai-routing.mjs';
import {
  naiSamplerForFamily,
  naiStepsForFamily,
  normalizeNaiSampler,
} from '../.test-build/nai-samplers.mjs';
import { shouldUseNaiCoords } from '../.test-build/nai-coords.mjs';
import { allUniqueNaiTokens, tokensForFamily } from '../.test-build/nai-keys.mjs';
import { speechMainTag, speechTagsForShot, stripSpokenBubbleSuppression } from '../.test-build/nai-speech.mjs';

test('NAI5 first off uses selected model for every shot', () => {
  assert.equal(
    resolveShotFamily({ nai5_first: false }, { model: 'nai-diffusion-5-full' }, { complexity: 'simple' }),
    'v5',
  );
  assert.equal(
    resolveShotFamily({ nai5_first: false }, { model: 'nai-diffusion-4-5-full' }, { complexity: 'dynamic' }),
    'v4',
  );
});

test('NAI5 first on routes simple→V4 and dynamic/missing→V5', () => {
  const card = { nai5_first: true };
  const nai = { model: 'nai-diffusion-4-5-full' };
  assert.equal(resolveShotFamily(card, nai, { complexity: 'simple' }), 'v4');
  assert.equal(resolveShotFamily(card, nai, { complexity: 'dynamic' }), 'v5');
  assert.equal(resolveShotFamily(card, nai, {}), 'v5');
});

test('preset pick prefers matching family, else 1st', () => {
  const v5 = { id: 'a', name: '5', positive: 'p', negative: 'n', model_family: 'v5' };
  const v4 = { id: 'b', name: '4', positive: 'p', negative: 'n', model_family: 'v4' };
  const card = { presets: [v5, v4], active_preset_id: 'a', secondary_preset_id: 'b' };
  assert.equal(pickPresetForFamily(card, 'v5')?.id, 'a');
  assert.equal(pickPresetForFamily(card, 'v4')?.id, 'b');
  assert.equal(pickPresetForFamily({ ...card, secondary_preset_id: '' }, 'v4')?.id, 'a');
});

test('tagger V5 rules when first/selected/preset is V5', () => {
  const emptyCard = { nai5_first: false, presets: [], active_preset_id: '', secondary_preset_id: '' };
  assert.equal(taggerShouldUseV5Rules(emptyCard, { model: 'nai-diffusion-4-5-full' }), false);
  assert.equal(taggerShouldUseV5Rules({ ...emptyCard, nai5_first: true }, { model: 'nai-diffusion-4-5-full' }), true);
  assert.equal(taggerShouldUseV5Rules(emptyCard, { model: 'nai-diffusion-5-full' }), true);
});

test('character refs stay off unless vibe/image is explicit on V4.5', () => {
  assert.equal(effectiveCharacterReferenceMode('nai-diffusion-4-5-full', 'off'), 'off');
  assert.equal(effectiveCharacterReferenceMode('nai-diffusion-4-5-full', ''), 'off');
  assert.equal(effectiveCharacterReferenceMode('nai-diffusion-4-5-full', 'image'), 'image');
  assert.equal(effectiveCharacterReferenceMode('nai-diffusion-4-5-full', 'vibe'), 'vibe');
  assert.equal(effectiveCharacterReferenceMode('nai-diffusion-4-5-full', 'unknown'), 'off');
  assert.equal(effectiveCharacterReferenceMode('nai-diffusion-5-full', 'image'), 'off');
  assert.equal(effectiveCharacterReferenceMode('nai-diffusion-4-full', 'image'), 'off');
});

test('character ref candidates keep every valid cast member without a cap', () => {
  const cast = Array.from({ length: 6 }, (_, index) => ({
    id: `char-${index}`,
    scope: `session-${index}`,
  }));
  assert.deepEqual(characterReferenceCandidates([...cast, { id: 'missing-scope' }]), cast);
});

test('character ref candidates deduplicate normalized scope and id', () => {
  const cast = [
    { id: 'hero', scope: '__global__' },
    { id: ' hero ', scope: ' __global__ ' },
    { id: 'hero', scope: 'session-1' },
    { id: 'hero', scope: 'session-1' },
  ];
  assert.deepEqual(characterReferenceCandidates(cast), [
    { id: 'hero', scope: '__global__' },
    { id: 'hero', scope: 'session-1' },
  ]);
});

test('shared vibe suppression depends on actual collected director refs', () => {
  assert.equal(shouldPrepareSharedVibe(0), true);
  assert.equal(shouldPrepareSharedVibe(1), false);
  assert.equal(shouldPrepareSharedVibe(7), false);
});

test('coords require toggle + 2+ complete pairs', () => {
  assert.equal(shouldUseNaiCoords(true, [{ x: 0.2, y: 0.5 }]), false);
  assert.equal(shouldUseNaiCoords(true, [{ x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }]), true);
  assert.equal(shouldUseNaiCoords(true, [{ x: 0.2, y: 0.5 }, null]), false);
  assert.equal(shouldUseNaiCoords(false, [{ x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }]), false);
});

test('coords drop when any two characters share a pair', () => {
  assert.equal(shouldUseNaiCoords(true, [{ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }]), false);
  assert.equal(shouldUseNaiCoords(true, [
    { x: 0.3, y: 0.5 },
    { x: 0.3, y: 0.5 },
    { x: 0.3, y: 0.5 },
  ]), false);
  assert.equal(shouldUseNaiCoords(true, [{ x: 0.5, y: 0.5 }, { x: 0.50, y: 0.5 }]), false);
  assert.equal(shouldUseNaiCoords(true, [
    { x: 0.2, y: 0.5 },
    { x: 0.2, y: 0.5 },
    { x: 0.8, y: 0.5 },
  ]), false);
  assert.equal(shouldUseNaiCoords(true, [{ x: 0.2, y: 0.5 }, { x: 0.2, y: 0.8 }]), true);
});

test('NAI4 and NAI5 keep their own sampler and steps', () => {
  const nai = {
    sampler: 'k_euler',
    steps: 20,
    sampler_v5: 'k_dpmpp_2m_sde',
    steps_v5: 28,
    sampler_v4: 'k_euler_ancestral',
    steps_v4: 23,
  };
  assert.equal(naiSamplerForFamily(nai, 'v5'), 'k_dpmpp_2m_sde');
  assert.equal(naiStepsForFamily(nai, 'v5'), 28);
  assert.equal(naiSamplerForFamily(nai, 'v4'), 'k_euler_ancestral');
  assert.equal(naiStepsForFamily(nai, 'v4'), 23);
});

test('family sampler falls back to shared nai.sampler and drops unknown ids', () => {
  assert.equal(normalizeNaiSampler('k_dpmpp_2s_ancestral'), 'k_dpmpp_2s_ancestral');
  assert.equal(normalizeNaiSampler('ddim_v3'), 'k_euler_ancestral');
  assert.equal(naiSamplerForFamily({ sampler: 'k_dpmpp_sde' }, 'v5'), 'k_dpmpp_sde');
  assert.equal(naiStepsForFamily({ steps: 18 }, 'v4'), 18);
});

test('legacy api_key fills both families when lists are empty', () => {
  const nai = { api_key: 'pst-legacy', api_keys_v5: [], api_keys_v4: [] };
  assert.deepEqual(tokensForFamily(nai, 'v5'), ['pst-legacy']);
  assert.deepEqual(allUniqueNaiTokens({ ...nai, api_keys_v5: ['pst-a', 'pst-a'] }), ['pst-a', 'pst-legacy']);
});

test('speech tag is one chunk; suppression groups are stripped', () => {
  assert.equal(
    speechMainTag({ hair_color: 'red hair', gender: 'girl', original: 'makima' }, '안돼!!'),
    "red hair girl's makima's speechbubble, koreantext:안돼!!",
  );
  const stripped = stripSpokenBubbleSuppression(
    'artist:foo, -3::spoken bubble, text, cross-section::, year 2025',
  );
  assert.match(stripped, /cross-section/);
  assert.doesNotMatch(stripped, /spoken bubble/);
});

test('shot-level speech fills when character speech is empty', () => {
  const roster = (name) => (
    name === '세나'
      ? { hair_color: 'brown hair', gender: 'girl' }
      : { hair_color: 'black hair', gender: 'boy' }
  );
  assert.equal(
    speechTagsForShot(
      { speech: { speaker: '세나', text: '안돼!!' } },
      [{ name: '세나' }, { name: '한진우' }],
      roster,
    ),
    "brown hair girl's speechbubble, koreantext:안돼!!",
  );
});
