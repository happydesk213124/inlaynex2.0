import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  INRAY_DISPLAY_IN,
  INRAY_DISPLAY_MODULE_ID,
  INRAY_DISPLAY_OUT,
  inrayDisplayRegexScript,
} from '../.test-build/inray-display.mjs';

test('display regex rewrites Inray tokens to centered gallery assets', () => {
  const token = '[[@inray::card-1::inxshot_card-1.sroom.webp]]';
  const re = new RegExp(INRAY_DISPLAY_IN, 'g');
  const out = token.replace(re, INRAY_DISPLAY_OUT);
  assert.match(out, /data-inlay-inline-shot="card-1"/);
  assert.match(out, /data-inray-fs="card-1"/);
  assert.match(out, /\{\{#asset::inxshot_card-1\.sroom\.webp\}\}/);
  assert.match(out, /margin:1\.15em auto/);
  assert.equal(inrayDisplayRegexScript().type, 'editdisplay');
  assert.equal(INRAY_DISPLAY_MODULE_ID, 'inlay-inray-display');
});
