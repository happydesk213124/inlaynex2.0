import test from "node:test";
import assert from "node:assert/strict";

import {
  applyFocusOutOfFrame,
  FOCUS_OUT_OF_FRAME_TAG,
  parseFocusIndexes,
  parseFocusToken,
} from "../.test-build/character-focus.mjs";

test("parseFocusToken accepts 1-based numbers and charN", () => {
  assert.equal(parseFocusToken(1, 3), 0);
  assert.equal(parseFocusToken("2", 3), 1);
  assert.equal(parseFocusToken("char3", 3), 2);
  assert.equal(parseFocusToken("CHAR1", 3), 0);
  assert.equal(parseFocusToken(0, 3), null);
  assert.equal(parseFocusToken(4, 3), null);
  assert.equal(parseFocusToken("", 3), null);
  assert.equal(parseFocusToken("alice", 3), null);
});

test("parseFocusIndexes accepts single, list, and comma strings", () => {
  assert.deepEqual(parseFocusIndexes(1, 4), [0]);
  assert.deepEqual(parseFocusIndexes("char2", 4), [1]);
  assert.deepEqual(parseFocusIndexes([1, 2], 4), [0, 1]);
  assert.deepEqual(parseFocusIndexes("1,2", 4), [0, 1]);
  assert.deepEqual(parseFocusIndexes(["char1", "char3"], 4), [0, 2]);
  assert.deepEqual(parseFocusIndexes("1, 99, char2", 4), [0, 1]);
  assert.deepEqual(parseFocusIndexes("", 4), []);
  assert.deepEqual(parseFocusIndexes(null, 4), []);
  assert.deepEqual(parseFocusIndexes([1, 1, 2], 4), [0, 1]);
});

test("applyFocusOutOfFrame tags non-focus captions only", () => {
  const caps = [
    { prompt: "red hair", uc: "" },
    { prompt: "blue hair", uc: "" },
    { prompt: "green hair", uc: "" },
  ];
  const out = applyFocusOutOfFrame(caps, [0]);
  assert.equal(out[0].prompt, "red hair");
  assert.match(out[1].prompt, /blue hair/);
  assert.match(out[1].prompt, /out of frame/);
  assert.match(out[2].prompt, /out of frame/);

  const duo = applyFocusOutOfFrame(caps, [0, 1]);
  assert.equal(duo[0].prompt, "red hair");
  assert.equal(duo[1].prompt, "blue hair");
  assert.match(duo[2].prompt, /out of frame/);

  assert.deepEqual(applyFocusOutOfFrame(caps, []), caps);
  const already = applyFocusOutOfFrame(
    [{ prompt: `x, ${FOCUS_OUT_OF_FRAME_TAG}`, uc: "" }],
    [9],
  );
  assert.equal(already[0].prompt.split("out of frame").length - 1, 1);
});
