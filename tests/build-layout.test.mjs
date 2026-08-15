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
  assert.ok(exists('reference', 'native-backend.js'), 'missing reference/native-backend.js');
  // old-built-plugin.js embeds the plaintext prompt pack, so it is gitignored and
  // kept only on machines that run parity/audit against 1.x.
  if (!exists('reference', 'old-built-plugin.js')) {
    console.log('[build-layout] note: reference/old-built-plugin.js absent (local-only for parity)');
  }
});

test('package version matches the version the backend reports', () => {
  const pkg = JSON.parse(read('package.json'));
  const constants = read('src', 'core', 'constants.ts');
  // The real value is injected at build time from package.json; this only checks
  // the fallback used when the define is absent has not drifted.
  assert.match(constants, /__PLUGIN_VERSION__/);
  assert.match(constants, new RegExp(String(pkg.version).replace(/\./g, '\\.')));
});

test('character reads never write stale roster rows back', () => {
  const source = read('src', 'services', 'characters.ts');
  const start = source.indexOf('export async function listCharacters');
  const end = source.indexOf('// ── per-character global toggles', start);
  assert.ok(start >= 0 && end > start, 'listCharacters section not found');
  assert.doesNotMatch(source.slice(start, end), /\bidbPut\s*\(/);
});

test('manual character save and read never rewrite the appearance bucket', () => {
  const source = read('src', 'services', 'characters.ts');
  const readStart = source.indexOf('export async function listCharacters');
  const readEnd = source.indexOf('// ── per-character global toggles', readStart);
  const writeStart = source.indexOf('export async function upsertCharacter');
  const writeEnd = source.indexOf('async function clearSessionWearOverlaysFor', writeStart);
  assert.ok(readStart >= 0 && readEnd > readStart, 'listCharacters section not found');
  assert.ok(writeStart >= 0 && writeEnd > writeStart, 'upsertCharacter section not found');
  assert.doesNotMatch(source.slice(readStart, readEnd), /syncGenderIntoAppearance/);
  assert.doesNotMatch(source.slice(writeStart, writeEnd), /syncGenderIntoAppearance/);
});

test('wear-state persistence does not resend roster look fields', () => {
  const source = read('src', 'services', 'characters.ts');
  const start = source.indexOf('export async function persistChatWearStates');
  const end = source.indexOf('// ── one-time migrations', start);
  assert.ok(start >= 0 && end > start, 'persistChatWearStates section not found');
  const body = source.slice(start, end);
  assert.doesNotMatch(body, /appearance:\s*rec\.appearance/);
  assert.doesNotMatch(body, /attire:\s*rec\.attire/);
  assert.doesNotMatch(body, /accessories:\s*rec\.accessories/);
});

test('character-list save cannot silently succeed without a session id', () => {
  const source = read('src', 'api', 'router.ts');
  const start = source.indexOf('async function updateCharacters');
  const end = source.indexOf('// ── dispatch', start);
  assert.ok(start >= 0 && end > start, 'updateCharacters section not found');
  assert.match(source.slice(start, end), /'characters'\s+in\s+body\s*&&\s*!sessionId/);
  assert.match(source.slice(start, end), /makeFetchError\(400/);
});
