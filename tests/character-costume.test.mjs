import test from "node:test";
import assert from "node:assert/strict";

import {
  ensureCostumes,
  formatCostumeCatalog,
  mergeCostumeLists,
  promoteCostumeToDefault,
  resolveCostumeIndex,
  resolveCostumeWear,
  syncActiveCostumeFromWear,
} from "../.test-build/character-costume.mjs";

import { composeCharacterCaptionTags } from "../.test-build/character-tags.mjs";

test("ensureCostumes seeds default from attire", () => {
  const { costumes, active_costume } = ensureCostumes({
    attire: "school uniform",
    accessories: "holding bag",
  });
  assert.equal(active_costume, 0);
  assert.equal(costumes.length, 1);
  assert.equal(costumes[0].name, "default");
  assert.equal(costumes[0].attire, "school uniform");
  assert.equal(costumes[0].accessories, "holding bag");
});

test("resolveCostumeIndex accepts name, index, name[index]", () => {
  const list = [
    { name: "default", attire: "a", accessories: "" },
    { name: "swimsuit", note: "beach", attire: "bikini", accessories: "" },
    { name: "bunnycostume", attire: "bunny", accessories: "" },
  ];
  assert.equal(resolveCostumeIndex(list, 1), 1);
  assert.equal(resolveCostumeIndex(list, "2"), 2);
  assert.equal(resolveCostumeIndex(list, "swimsuit"), 1);
  assert.equal(resolveCostumeIndex(list, "swimsuit[1]"), 1);
  assert.equal(resolveCostumeIndex(list, "missing"), -1);
  assert.equal(resolveCostumeIndex(list, ""), -1);
});

test("resolveCostumeWear falls back to index 0", () => {
  const stored = {
    attire: "ignored mirror",
    costumes: [
      { name: "default", attire: "casual clothes", accessories: "bag" },
      { name: "swimsuit", attire: "bikini", accessories: "" },
    ],
  };
  assert.equal(resolveCostumeWear(stored, null).attire, "casual clothes");
  assert.equal(resolveCostumeWear(stored, "nope").attire, "casual clothes");
  assert.equal(resolveCostumeWear(stored, "swimsuit").attire, "bikini");
  assert.equal(resolveCostumeWear(stored, 1).index, 1);
});

test("promoteCostumeToDefault moves current wear to index 0", () => {
  const before = [
    { name: "default", attire: "old default", accessories: "" },
    { name: "swimsuit", attire: "bikini", accessories: "" },
  ];
  const after = promoteCostumeToDefault(before, {
    attire: "new school",
    accessories: "bag",
  });
  assert.equal(after[0].name, "default");
  assert.equal(after[0].attire, "new school");
  assert.equal(after[1].attire, "old default");
  assert.equal(after[2].name, "swimsuit");
});

test("mergeCostumeLists protects default when asked", () => {
  const existing = [
    { name: "default", attire: "base", accessories: "staff" },
  ];
  const merged = mergeCostumeLists(
    existing,
    [{ name: "default", attire: "should not win", accessories: "" }, { name: "swimsuit", attire: "bikini", accessories: "" }],
    { protectDefault: true },
  );
  assert.equal(merged[0].attire, "base");
  assert.equal(merged.length, 2);
  assert.equal(merged[1].name, "swimsuit");
});

test("syncActiveCostumeFromWear updates only active slot", () => {
  const list = [
    { name: "default", attire: "a", accessories: "" },
    { name: "swim", attire: "old", accessories: "" },
  ];
  const next = syncActiveCostumeFromWear(list, 1, { attire: "new bikini", accessories: "towel" });
  assert.equal(next[0].attire, "a");
  assert.equal(next[1].attire, "new bikini");
  assert.equal(next[1].accessories, "towel");
});

test("formatCostumeCatalog is compact for LLM", () => {
  const text = formatCostumeCatalog([
    { name: "default", note: "angel state", attire: "wings", accessories: "" },
    { name: "casual", attire: "hoodie", accessories: "" },
  ]);
  assert.match(text, /default\[0\] angel state/);
  assert.match(text, /casual\[1\]/);
});

test("composeCharacterCaptionTags uses shot.costume over attire mirror", () => {
  const stored = {
    appearance: "girl, black hair",
    attire: "should not appear",
    accessories: "",
    attire_locked: true,
    costumes: [
      { name: "default", attire: "casual clothes", accessories: "" },
      { name: "swimsuit", attire: "bikini, barefoot", accessories: "" },
    ],
  };
  const withPick = composeCharacterCaptionTags(stored, {
    costume: "swimsuit",
    expression: "smile",
  });
  assert.match(withPick, /bikini/);
  assert.doesNotMatch(withPick, /should not appear/);
  assert.doesNotMatch(withPick, /casual clothes/);

  const fallback = composeCharacterCaptionTags(stored, { expression: "smile" });
  assert.match(fallback, /casual clothes/);
  assert.doesNotMatch(fallback, /bikini/);
});
