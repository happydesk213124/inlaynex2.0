import test from "node:test";
import assert from "node:assert/strict";

import { composeCharacterCaptionTags } from "../.test-build/character-tags.mjs";

test("filled character uses base attire when shot has none", () => {
  const stored = {
    name: "Han",
    appearance: "black hair, short hair, amber eyes, boy",
    attire: "white shirt, black trousers",
    accessories: "watch",
  };
  const prompt = composeCharacterCaptionTags(stored, { action: "standing", expression: "smile" });
  assert.match(prompt, /white shirt/);
  assert.match(prompt, /watch/);
  assert.match(prompt, /black hair/);
  assert.match(prompt, /standing/);
});

test("filled character shot attire replaces base wear for that caption only", () => {
  const stored = {
    name: "Han",
    appearance: "black hair, short hair, amber eyes, boy",
    attire: "white shirt, black trousers",
    accessories: "watch",
  };
  const prompt = composeCharacterCaptionTags(stored, {
    attire: "school uniform, necktie",
    accessories: "bag",
    action: "walking",
  });
  assert.match(prompt, /school uniform/);
  assert.match(prompt, /bag/);
  assert.equal(prompt.includes("white shirt"), false);
  assert.equal(prompt.includes("watch"), false);
  assert.match(prompt, /black hair/);
});
