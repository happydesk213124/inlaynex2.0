import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getCharRefAssetBytes,
  putCharRefAsset,
} from '../.test-build/char-ref-module.mjs';

const webpBytes = Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
  0x14, 0x00, 0x00, 0x00, 0x2f, 0x00, 0x00, 0x00,
  0x10, 0x07, 0x10, 0x11, 0x11, 0x88, 0x88, 0xfe,
  0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);
const secondWebpBytes = Uint8Array.from([...webpBytes.slice(0, -1), 0x01]);

function createHost({ readback = true } = {}) {
  const stored = new Map();
  const host = {
    savedPath: '',
    saveAssetArgumentCounts: [],
    saveAssetCalls: 0,
    setDatabaseCalls: [],
    db: {
      modules: [{
        id: 'inlay-char-ref',
        name: 'Inlay 참고이미지',
        namespace: 'inlay.char_ref',
        hideIcon: true,
        lorebook: [],
        assets: [],
      }],
      enabledModules: [],
    },
    async requestPluginPermission() {},
    async getDatabase() {
      return structuredClone(host.db);
    },
    async setDatabase(next) {
      host.setDatabaseCalls.push(structuredClone(next));
      host.db = structuredClone(next);
    },
    async saveAsset(bytes) {
      host.saveAssetArgumentCounts.push(arguments.length);
      host.saveAssetCalls += 1;
      host.savedPath = `assets/risu-generated-${host.saveAssetCalls}.webp`;
      stored.set(host.savedPath, Uint8Array.from(bytes));
      return host.savedPath;
    },
    async readImage(path) {
      if (!readback || !stored.has(path)) throw new Error('missing asset');
      return Uint8Array.from(stored.get(path));
    },
  };
  return host;
}

test('char ref module records the exact Risu v3 returned path', async () => {
  const host = createHost();
  globalThis.risuai = host;

  const saved = await putCharRefAsset(webpBytes);

  assert.deepEqual(host.saveAssetArgumentCounts, [1]);
  assert.equal(saved.path, host.savedPath);
  assert.deepEqual(host.db.modules[0].assets[0], [
    `inxref_${saved.hash}.webp`,
    host.savedPath,
    `inxref_${saved.hash}.webp`,
  ]);
  assert.deepEqual(new Uint8Array(await getCharRefAssetBytes(saved.hash)), webpBytes);
});

test('char ref module re-enables an existing asset without saving it again', async () => {
  const host = createHost();
  globalThis.risuai = host;
  const first = await putCharRefAsset(webpBytes);
  const saveCalls = host.saveAssetCalls;
  host.db.enabledModules = [];
  host.setDatabaseCalls = [];

  const existing = await putCharRefAsset(webpBytes);

  assert.equal(existing.path, first.path);
  assert.equal(host.saveAssetCalls, saveCalls);
  assert.deepEqual(host.db.enabledModules, ['inlay-char-ref']);
  assert.equal(host.setDatabaseCalls.length, 1);
});

test('char ref module rejects failed readback before publishing metadata', async () => {
  const host = createHost({ readback: false });
  globalThis.risuai = host;

  await assert.rejects(
    () => putCharRefAsset(webpBytes),
    /저장한 참고 이미지를 다시 읽지 못했습니다/,
  );
  assert.equal(host.db.modules[0].assets.length, 0);
});

test('char ref module reload resolves bytes from the database asset tuple', async () => {
  const host = createHost();
  globalThis.risuai = host;
  const saved = await putCharRefAsset(webpBytes);

  const reloaded = await import(`../.test-build/char-ref-module.mjs?reload=${Date.now()}`);
  assert.deepEqual(new Uint8Array(await reloaded.getCharRefAssetBytes(saved.hash)), webpBytes);
});

test('char ref module replaces a stale same-hash tuple after successful re-upload', async () => {
  const host = createHost();
  globalThis.risuai = host;
  const first = await putCharRefAsset(webpBytes);
  const name = `inxref_${first.hash}.webp`;
  host.db.modules[0].assets = [[name, 'assets/dead.webp', name]];

  const replaced = await putCharRefAsset(webpBytes);

  assert.notEqual(replaced.path, 'assets/dead.webp');
  assert.deepEqual(host.db.modules[0].assets, [[name, replaced.path, name]]);
  assert.deepEqual(new Uint8Array(await getCharRefAssetBytes(first.hash)), webpBytes);
});

test('char ref module preserves complete tuple filenames across a second write', async () => {
  const host = createHost();
  globalThis.risuai = host;
  const first = await putCharRefAsset(webpBytes);
  const second = await putCharRefAsset(secondWebpBytes);

  assert.equal(host.db.modules[0].assets.length, 2);
  assert.deepEqual(
    host.db.modules[0].assets.map(([name, , fileName]) => fileName),
    [`inxref_${first.hash}.webp`, `inxref_${second.hash}.webp`],
  );
});

test('char ref module logs bounded diagnostics when module asset read throws', async () => {
  const host = createHost({ readback: false });
  const hash = 'd'.repeat(64);
  const name = `inxref_${hash}.webp`;
  host.db.modules[0].assets = [[name, `assets/${'x'.repeat(900)}.webp`, name]];
  globalThis.risuai = host;
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args);
  try {
    assert.equal(await getCharRefAssetBytes(hash), null);
  } finally {
    console.warn = originalWarn;
  }

  const [line, detail] = warnings.find(([text]) => String(text).includes('char_ref.module.read.fail')) || [];
  assert.match(String(line), /missing asset/);
  assert.ok(String(detail?.path || '').length <= 220);
  assert.match(String(detail?.path), /^assets\//);
});
