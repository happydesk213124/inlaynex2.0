import test from "node:test";
import assert from "node:assert/strict";

import { naiToComfyEmphasis } from "../.test-build/nai-to-comfy.mjs";
import { buildComfyPlaceholderValues } from "../.test-build/comfy-client.mjs";

test("naiToComfyEmphasis maps N::tag:: to (tag:N)", () => {
  assert.equal(naiToComfyEmphasis("2::hard::"), "(hard:2)");
  assert.equal(naiToComfyEmphasis("-1.5::foo::"), "(foo:-1.5)");
});

test("naiToComfyEmphasis maps brace stacks to paren stacks", () => {
  assert.equal(naiToComfyEmphasis("{happy}"), "(happy)");
  assert.equal(naiToComfyEmphasis("{{happy}}"), "((happy))");
});

test("naiToComfyEmphasis keeps A1111-style brackets", () => {
  assert.equal(naiToComfyEmphasis("[sad]"), "[sad]");
  assert.equal(naiToComfyEmphasis("[[sad]]"), "[[sad]]");
});

test("naiToComfyEmphasis expands a weighted group per tag", () => {
  assert.equal(naiToComfyEmphasis("3::1girl, 1boy::"), "(1girl:3), (1boy:3)");
});

test("naiToComfyEmphasis converts weight inside braces from the inside", () => {
  assert.equal(naiToComfyEmphasis("{2::smile::}"), "((smile:2))");
});

test("naiToComfyEmphasis keeps commas between mixed tokens", () => {
  assert.equal(
    naiToComfyEmphasis("1girl, 2::hard::, {{happy}}"),
    "1girl, (hard:2), ((happy))",
  );
});

test("naiToComfyEmphasis leaves empty text alone", () => {
  assert.equal(naiToComfyEmphasis(""), "");
  assert.equal(naiToComfyEmphasis("   "), "   ");
});

test("buildComfyPlaceholderValues converts pos/neg/charN", () => {
  const values = buildComfyPlaceholderValues({
    main: "2::hard::, {{happy}}",
    neg: "{ugly}",
    captions: [{ name: "A", prompt: "3::1girl, 1boy::" }],
    nai: { width: 832, height: 1216, steps: 28, cfg_scale: 7 },
    seed: 1,
  });
  assert.equal(values.pos, "(hard:2), ((happy))");
  assert.equal(values.neg, "(ugly)");
  assert.equal(values.char1, "(1girl:3), (1boy:3)");
  assert.equal(values.char2, "");
  assert.equal(values.ref, "");
});

test("buildComfyPlaceholderValues passes through a ref filename", () => {
  const values = buildComfyPlaceholderValues({
    main: "1girl",
    neg: "",
    captions: [],
    nai: { width: 832, height: 1216 },
    seed: 1,
    ref: "inlay-ref.webp",
  });
  assert.equal(values.ref, "inlay-ref.webp");
  assert.equal(values.pos, "1girl");
});
