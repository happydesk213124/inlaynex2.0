import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isComicNaiScene,
  modelFromNaiSource,
  sceneFromNaiMetadata,
  t2iRequestFromScene,
} from '../.test-build/nai-meta-replay.mjs';

describe('sceneFromNaiMetadata', () => {
  it('splits v4 base from char captions', () => {
    const scene = sceneFromNaiMetadata({
      Comment: {
        prompt: 'should-not-win-when-v4-present',
        uc: 'lowres',
        width: 1024,
        height: 1024,
        steps: 24,
        scale: 6.5,
        cfg_rescale: 0.2,
        sampler: 'k_euler',
        noise_schedule: 'exponential',
        v4_prompt: {
          caption: {
            base_caption: 'cafe, night',
            char_captions: [
              { char_caption: 'red hair girl standing', centers: [{ x: 0.2, y: 0.5 }] },
              { char_caption: 'blue hair boy sitting', centers: [{ x: 0.8, y: 0.5 }] },
            ],
          },
        },
        v4_negative_prompt: {
          caption: {
            base_caption: 'lowres',
            char_captions: [{ char_caption: 'bad hands' }, { char_caption: '' }],
          },
        },
      },
      Source: 'NAI Diffusion V4.5 Full',
    });
    assert.equal(scene.main, 'cafe, night');
    assert.equal(scene.negative, 'lowres');
    assert.equal(scene.characters.length, 2);
    assert.equal(scene.characters[0].prompt, 'red hair girl standing');
    assert.equal(scene.characters[0].uc, 'bad hands');
    assert.equal(scene.characters[0].center_x, 0.2);
    assert.equal(scene.model, 'nai-diffusion-4-5-full');
    assert.equal(isComicNaiScene(scene), false);
    const req = t2iRequestFromScene(scene, 42);
    assert.equal(req.seed, 42);
    assert.equal(req.prompt, 'cafe, night');
    assert.equal(req.use_coords, true);
  });

  it('detects comic koma in base', () => {
    assert.equal(isComicNaiScene({ main: '2::2koma::, left to right' }), true);
    assert.equal(isComicNaiScene({ main: '3koma comic page' }), true);
    assert.equal(isComicNaiScene({ main: 'cafe, night' }), false);
  });
});

describe('modelFromNaiSource', () => {
  it('maps common Source labels', () => {
    assert.equal(modelFromNaiSource('NAI Diffusion V5 Full'), 'nai-diffusion-5-full');
    assert.equal(modelFromNaiSource('Stable Diffusion XL 9B - NAI Diffusion V4.5 Full'), 'nai-diffusion-4-5-full');
    assert.equal(modelFromNaiSource(''), '');
  });
});
