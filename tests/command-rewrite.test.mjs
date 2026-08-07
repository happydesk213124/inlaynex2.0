import test from "node:test";
import assert from "node:assert/strict";

import {
  mergeCommandRewriteCharacters,
  mergeCommandRewriteMain,
  mergeLookLockedCaption,
  resolveGenerationSeed,
} from "../.test-build/command-rewrite.mjs";

test("resolveGenerationSeed prefers plan seed then nai then 0", () => {
  assert.equal(resolveGenerationSeed(12345, 9), 12345);
  assert.equal(resolveGenerationSeed(0, 99), 99);
  assert.equal(resolveGenerationSeed(undefined, 0), 0);
  assert.equal(resolveGenerationSeed(-1, 7), 7);
  assert.equal(resolveGenerationSeed("42.9", 1), 42);
});

test("mergeLookLockedCaption keeps look and appends action when locked", () => {
  assert.equal(
    mergeLookLockedCaption("boy, black hair", "girl, blonde", "smirk, waving", true),
    "boy, black hair, smirk, waving",
  );
  assert.equal(
    mergeLookLockedCaption("boy, black hair", "boy, silver hair, standing", "waving", false),
    "boy, silver hair, standing, waving",
  );
});

test("mergeCommandRewriteCharacters respects look_locked flags", () => {
  const out = mergeCommandRewriteCharacters(
    [
      { name: "A", prompt: "boy, black hair", action: "standing", uc: "" },
      { name: "B", prompt: "girl, red hair", action: "sitting", uc: "lowres" },
    ],
    [
      { index: 0, prompt: "CHANGED", action: "waving", uc: "" },
      { index: 1, prompt: "girl, blue hair, jumping", action: "jumping", uc: "blur" },
    ],
    [true, false],
  );
  assert.equal(out[0].prompt, "boy, black hair, waving");
  assert.equal(out[1].prompt, "girl, blue hair, jumping");
  assert.equal(out[1].uc, "blur");
});

test("mergeCommandRewriteMain uses style+setup or replaces recovered scene", () => {
  assert.equal(
    mergeCommandRewriteMain({
      currentMain: "1boy, style tags, old scene, masterpiece",
      setup: "new scene",
      stylePositive: "artist style",
    }),
    "artist style, new scene",
  );
  assert.equal(
    mergeCommandRewriteMain({
      currentMain: "keep me",
      mainPrompt: "explicit main",
      setup: "ignored",
    }),
    "explicit main",
  );
});
