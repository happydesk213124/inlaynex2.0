import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  dropShotAsset,
  putShotAsset,
  readShotAssetBytes,
  shotModuleAvailable,
} from "../.test-build/shot-module.mjs";

const webpBytes = Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
  0x14, 0x00, 0x00, 0x00, 0x2f, 0x00, 0x00, 0x00,
  0x10, 0x07, 0x10, 0x11, 0x11, 0x88, 0x88, 0xfe,
  0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

function createHost({ readback = true } = {}) {
  const stored = new Map();
  const host = {
    saveAssetCalls: 0,
    db: { modules: [], enabledModules: [] },
    async requestPluginPermission() {},
    async getDatabase() {
      return structuredClone(host.db);
    },
    async setDatabase(next) {
      host.db = structuredClone(next);
    },
    async saveAsset(bytes) {
      host.saveAssetCalls += 1;
      const path = `assets/shot-${host.saveAssetCalls}.webp`;
      const u8 = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : Uint8Array.from(bytes);
      stored.set(path, u8);
      return path;
    },
    async readImage(path) {
      if (!readback || !stored.has(path)) throw new Error("missing asset");
      return stored.get(path);
    },
  };
  return host;
}

describe("shot module", { concurrency: 1 }, () => {
test("shot module is unavailable without host asset APIs", () => {
  const prev = globalThis.risuai;
  globalThis.risuai = {};
  try {
    assert.equal(shotModuleAvailable(), false);
  } finally {
    globalThis.risuai = prev;
  }
});

test("putShotAsset writes a gallery module tuple and readback matches", async () => {
  const host = createHost();
  globalThis.risuai = host;

  const saved = await putShotAsset("card-9", webpBytes);

  assert.ok(saved?.path);
  assert.equal(saved.name, "inxshot_card-9.webp");
  assert.equal(host.db.modules[0].id, "inlay-gallery");
  assert.equal(host.db.modules[0].namespace, "inlay.gallery");
  assert.deepEqual(host.db.modules[0].assets[0], [saved.name, saved.path, saved.name]);
  assert.deepEqual(host.db.enabledModules, ["inlay-gallery"]);
  assert.deepEqual(new Uint8Array(await readShotAssetBytes(saved.path)), webpBytes);
});

test("putShotAsset does not write the character-reference module", async () => {
  const host = createHost();
  host.db.modules = [{
    id: "inlay-char-ref",
    name: "Inlay 참고이미지",
    namespace: "inlay.char_ref",
    assets: [["inxref_aa.webp", "assets/ref.webp", "inxref_aa.webp"]],
  }];
  globalThis.risuai = host;

  await putShotAsset("card-9", webpBytes);

  assert.equal(host.db.modules.length, 2);
  assert.equal(host.db.modules[0].id, "inlay-char-ref");
  assert.equal(host.db.modules[0].assets.length, 1);
  assert.equal(host.db.modules[1].id, "inlay-gallery");
});

test("putShotAsset returns null when readback fails", async () => {
  const host = createHost({ readback: false });
  globalThis.risuai = host;

  assert.equal(await putShotAsset("card-9", webpBytes), null);
  assert.equal(host.db.modules.length, 0);
});

test("same card id replaces the module tuple", async () => {
  const host = createHost();
  globalThis.risuai = host;
  const first = await putShotAsset("card-9", webpBytes);
  const secondBytes = Uint8Array.from([...webpBytes.slice(0, -1), 0x01]);
  const second = await putShotAsset("card-9", secondBytes);

  assert.equal(host.db.modules[0].assets.length, 1);
  assert.equal(host.db.modules[0].assets[0][1], second.path);
  assert.notEqual(second.path, first.path);
  assert.deepEqual(new Uint8Array(await readShotAssetBytes(second.path)), secondBytes);
});

test("dropShotAsset removes only that shot tuple", async () => {
  const host = createHost();
  globalThis.risuai = host;
  await putShotAsset("card-9", webpBytes);
  await putShotAsset("card-8", webpBytes);

  assert.equal(await dropShotAsset("card-9"), true);
  assert.equal(host.db.modules[0].assets.length, 1);
  assert.equal(host.db.modules[0].assets[0][0], "inxshot_card-8.webp");
});
});
