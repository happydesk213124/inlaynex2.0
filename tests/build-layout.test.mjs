/**
 * The build composes three things it does not generate: the frozen vendor UI
 * bundle, the prompt text files, and the 1.x bundle the audit diffs against.
 * If any goes missing the build still succeeds but produces a plugin with no
 * interface, so their presence is asserted separately.
 *
 * Everything about the *composed output* is checked by `tools/audit.mjs`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');
const exists = (...p) => fs.existsSync(path.join(root, ...p));

test('frozen vendor UI bundle is present', () => {
  assert.ok(exists('vendor', 'inlay-nexus-ui.js'), 'missing vendor/inlay-nexus-ui.js');
});

test('every prompt file is listed for embedding', () => {
  const promptsDir = path.join(root, 'prompts');
  assert.ok(fs.existsSync(promptsDir), 'missing prompts/');
  const keys = fs.readdirSync(promptsDir).filter((f) => f.endsWith('.txt')).map((f) => path.basename(f, '.txt'));
  assert.ok(keys.length > 0, 'prompts/ has no .txt files');
  // A prompt the build forgets degrades silently to a one-line stub rather than
  // failing, so catch it here. `tools/audit.mjs` then verifies the text that
  // actually landed in the bundle matches both disk and 1.x.
  const promptKeys = read('vite.config.ts').match(/const PROMPT_KEYS = \[([\s\S]*?)\]/)?.[1] ?? '';
  for (const key of keys) {
    assert.match(promptKeys, new RegExp(`'${key}'`), `prompts/${key}.txt is not in vite.config.ts PROMPT_KEYS`);
  }
});

test('reference copies the audit and parity harness need are present', () => {
  assert.ok(exists('reference', 'old-built-plugin.js'), 'missing reference/old-built-plugin.js');
  assert.ok(exists('reference', 'native-backend.js'), 'missing reference/native-backend.js');
});

test('package version matches the version the backend reports', () => {
  const pkg = JSON.parse(read('package.json'));
  const constants = read('src', 'core', 'constants.ts');
  // The real value is injected at build time from package.json; this only checks
  // the fallback used when the define is absent has not drifted.
  assert.match(constants, /__PLUGIN_VERSION__/);
  assert.match(constants, new RegExp(String(pkg.version).replace(/\./g, '\\.')));
});
