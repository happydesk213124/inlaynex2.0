import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  compositionCatalogSystemMessage,
  compositionCurationOn,
  listCompositionLeaves,
  resolveCompositionForShot,
} from '../.test-build/composition-leaves.mjs';

describe('composition leaves', () => {
  it('lists curated leaves', () => {
    const leaves = listCompositionLeaves();
    assert.ok(leaves.length >= 3);
    assert.ok(leaves.some((l) => l.id === 'facing_each_other'));
  });

  it('compositionCurationOn accepts truthy forms', () => {
    assert.equal(compositionCurationOn({ composition_curation: true }), true);
    assert.equal(compositionCurationOn({ composition_curation: 'true' }), true);
    assert.equal(compositionCurationOn({ composition_curation: false }), false);
    assert.equal(compositionCurationOn({}), false);
  });

  it('resolveCompositionForShot copies global + actor tags from leaf', () => {
    const resolved = resolveCompositionForShot({
      composition_id: 'facing_each_other',
      composition_variant: 'from_side',
      composition_modifiers: ['hug'],
      characters: [{ name: 'A' }, { name: 'B' }],
    });
    assert.ok(resolved);
    assert.equal(resolved.leafId, 'facing_each_other');
    assert.equal(resolved.variantId, 'from_side');
    assert.ok(resolved.global.includes('from side'));
    assert.ok(resolved.actorTags[0].includes('facing another'));
    assert.ok(resolved.actorTags[0].includes('hug'));
    assert.ok(resolved.actorTags[1].includes('hug'));
  });

  it('drops unknown modifiers and unknown leaf returns null', () => {
    assert.equal(resolveCompositionForShot({ composition_id: 'nope' }), null);
    const resolved = resolveCompositionForShot({
      composition_id: '1girl_solo_portrait',
      composition_modifiers: ['smile', 'not_a_real_mod'],
      characters: [{ name: 'A' }],
    });
    assert.deepEqual(resolved?.modifierIds, ['smile']);
  });

  it('catalog system message lists leaf ids', () => {
    const text = compositionCatalogSystemMessage();
    assert.match(text, /Composition curation ON/);
    assert.match(text, /facing_each_other/);
    assert.match(text, /natural/);
  });
});
