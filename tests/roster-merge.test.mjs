import test from "node:test";
import assert from "node:assert/strict";

import { foldCharacterUpsert, mergeSessionAndGlobalRoster, normalizeCharacterRecord } from "../.test-build/roster-merge.mjs";

function helpers() {
  const key = (v) => String(v || "").trim().toLowerCase();
  return {
    hasAppearance: (c) => !!String(c?.appearance || "").trim(),
    resolve: (name, list) => (list || []).find((c) => key(c.name) === key(name)) || null,
    aliasKeys: (c) => new Set([key(c?.name)].filter(Boolean)),
    normalizeName: key,
    fullTags: (c) => [c?.appearance, c?.attire, c?.accessories].filter(Boolean).join(", "),
    clean: (v) => String(v || "").trim(),
    globalScope: "__global__",
  };
}

test("attire-only session overlay does not rewrite filled global wear", () => {
  const global = [{
    name: "Alice",
    appearance: "long hair, blue eyes",
    attire: "dress",
    accessories: "",
    scope: "__global__",
  }];
  const session = [{
    name: "Alice",
    appearance: "",
    attire: "school uniform",
    accessories: "ribbon",
  }];
  const merged = mergeSessionAndGlobalRoster(session, global, helpers());
  assert.equal(merged.length, 1);
  assert.equal(merged[0].appearance, "long hair, blue eyes");
  assert.equal(merged[0].attire, "dress");
  assert.equal(merged[0].accessories, "");
  assert.ok(helpers().hasAppearance(merged[0]));
});

test("empty session without global stays incomplete", () => {
  const session = [{ name: "Bob", appearance: "", attire: "" }];
  const merged = mergeSessionAndGlobalRoster(session, [], helpers());
  assert.equal(merged.length, 1);
  assert.equal(merged[0].name, "Bob");
  assert.equal(helpers().hasAppearance(merged[0]), false);
});

test("empty session does not replace a filled global with blank row", () => {
  const global = [{ name: "Char", appearance: "silver hair", attire: "coat", accessories: "" }];
  const session = [{ name: "Char", appearance: "", attire: "hoodie", accessories: "" }];
  const merged = mergeSessionAndGlobalRoster(session, global, helpers());
  assert.equal(merged.length, 1);
  assert.equal(merged[0].appearance, "silver hair");
  assert.equal(merged[0].attire, "coat");
  assert.notEqual(merged[0].appearance, "");
});

test("session wear_state overlays onto filled global look", () => {
  const global = [{ name: "Char", appearance: "silver hair", attire: "coat", accessories: "" }];
  const session = [{ name: "Char", appearance: "", attire: "hoodie", wear_state: "topless" }];
  const merged = mergeSessionAndGlobalRoster(session, global, helpers());
  assert.equal(merged.length, 1);
  assert.equal(merged[0].appearance, "silver hair");
  assert.equal(merged[0].attire, "coat");
  assert.equal(merged[0].wear_state, "topless");
});

test("normalizeCharacterRecord keeps user attire buckets (no save-time split)", () => {
  const rec = normalizeCharacterRecord({
    name: "보민",
    appearance: "black hair, boy",
    attire: "2.1::single bare shoulder::, white shirt",
    accessories: "earrings",
  });
  assert.equal(rec.appearance, "black hair, boy");
  assert.match(rec.attire, /bare shoulder/);
  assert.match(rec.attire, /white shirt/);
  assert.equal(rec.accessories, "earrings");
  assert.equal(rec.appearance.includes("bare shoulder"), false);
});

test("legacy flat tags dump into appearance without splitting", () => {
  const rec = normalizeCharacterRecord({
    name: "Old",
    tags: "black hair, white shirt, sword",
  });
  assert.equal(rec.appearance, "black hair, white shirt, sword");
  assert.equal(rec.attire, "");
  assert.equal(rec.accessories, "");
});

function omittedLooks() {
  return {
    appearance: false,
    attire: false,
    accessories: false,
    original: false,
    surname: false,
    given_name: false,
    surname_variants: false,
    given_name_variants: false,
    costumes: false,
    active_costume: false,
    wear_state: true,
    attire_locked: false,
    accessories_locked: false,
  };
}

test("foldCharacterUpsert keeps appearance when payload omits it", () => {
  const base = normalizeCharacterRecord({
    id: "han",
    name: "Han",
    appearance: "black hair, brown eyes",
    attire: "coat",
  });
  const incoming = normalizeCharacterRecord({
    id: "han",
    name: "Han",
    wear_state: "topless",
  });
  const folded = foldCharacterUpsert(base, incoming, omittedLooks());
  assert.equal(folded.appearance, "black hair, brown eyes");
  assert.equal(folded.attire, "coat");
  assert.equal(folded.wear_state, "topless");
});

test("foldCharacterUpsert still clears appearance when the key is present", () => {
  const base = normalizeCharacterRecord({
    id: "han",
    name: "Han",
    appearance: "black hair",
  });
  const incoming = normalizeCharacterRecord({
    id: "han",
    name: "Han",
    appearance: "",
  });
  const folded = foldCharacterUpsert(base, incoming, { ...omittedLooks(), appearance: true, wear_state: false });
  assert.equal(folded.appearance, "");
});
