import test from "node:test";
import assert from "node:assert/strict";

import {
  SHOT_ASSET_PREFIX,
  SHOT_MODULE_ID,
  SHOT_MODULE_NS,
  idFromShotAssetName,
  isShotAssetName,
  normalizeAssetPath,
  parseShotModuleAssets,
  sanitizeShotId,
  shotAssetName,
} from "../.test-build/shot-assets.mjs";

test("shot asset names stay in a gallery-only prefix", () => {
  assert.equal(SHOT_MODULE_ID, "inlay-gallery");
  assert.equal(SHOT_MODULE_NS, "inlay.gallery");
  assert.equal(shotAssetName("card-1", "webp"), `${SHOT_ASSET_PREFIX}card-1.webp`);
  assert.equal(isShotAssetName("inxshot_card-1.webp"), true);
  assert.equal(isShotAssetName("inxref_deadbeef.webp"), false);
  assert.equal(idFromShotAssetName("inxshot_card-1.webp"), "card-1");
  assert.equal(sanitizeShotId("a/b c"), "a_b_c");
  assert.equal(normalizeAssetPath("assets\\x.webp"), "assets/x.webp");
});

test("parseShotModuleAssets accepts tuples and named objects", () => {
  const rows = parseShotModuleAssets([
    ["inxshot_a.webp", "assets/1.webp", "inxshot_a.webp"],
    { name: "inxshot_b.webp", path: "assets/2.webp" },
  ]);
  assert.deepEqual(rows.map((r) => r[1]), ["assets/1.webp", "assets/2.webp"]);
});
