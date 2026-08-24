import test from "node:test";
import assert from "node:assert/strict";

import {
  formatAgeCaption,
  formatHeightCaption,
  normalizePenisSize,
  parseAgeYears,
  parseHeight,
} from "../.test-build/character-looks.mjs";

import { migrateCharacter } from "../.test-build/character-identity.mjs";

import { composeCharacterCaptionTags } from "../.test-build/character-tags.mjs";

test("age is integer years only", () => {
  assert.equal(parseAgeYears(24), 24);
  assert.equal(parseAgeYears("17세"), 17);
  assert.equal(parseAgeYears("teen"), null);
  assert.equal(formatAgeCaption(24), "24 years old");
});

test("height prefers cm and infers tall/petite", () => {
  assert.deepEqual(parseHeight("170"), { cm: 170, cue: "" });
  assert.equal(formatHeightCaption("170", "girl"), "170cm, tall");
  assert.equal(formatHeightCaption("180", "boy"), "180cm, tall");
  assert.equal(formatHeightCaption("148", "girl"), "148cm, petite");
  assert.equal(formatHeightCaption("165", "girl"), "165cm");
  assert.equal(formatHeightCaption("tall"), "tall");
});

test("penis size is four tags only", () => {
  assert.equal(normalizePenisSize("huge penis"), "huge penis");
  assert.equal(normalizePenisSize("대물"), "huge penis");
  assert.equal(normalizePenisSize("horse cock"), "");
});

test("migrateCharacter does not invent 이/아/야 aliases", () => {
  const rec = migrateCharacter({
    name: "보민",
    given_name: "보민",
    given_name_variants: ["bomin"],
    aliases: ["보민이"],
  });
  assert.deepEqual(rec.aliases, ["보민이"]);
  assert.equal(rec.aliases.includes("보민아"), false);
});

test("caption joins look slots and sized penis only when bottomless+", () => {
  const stored = {
    name: "한진우",
    appearance: "boy, lean muscular",
    hair_color: "black hair",
    hair_style: "short hair, messy hair",
    eye_color: "amber eyes",
    height: "180",
    age: 24,
    gender: "boy",
    penis_size: "huge penis",
    attire: "white shirt",
    costumes: [{ name: "default", attire: "white shirt", accessories: "" }],
  };
  const clothed = composeCharacterCaptionTags(stored, {
    pose: "sitting",
    gaze: "looking at viewer",
    eye_expression: "half-closed eyes",
    wear_state: "clothed",
  });
  assert.match(clothed, /black hair/);
  assert.match(clothed, /180cm, tall/);
  assert.match(clothed, /24 years old/);
  assert.match(clothed, /half-closed eyes/);
  assert.match(clothed, /looking at viewer/);
  assert.equal(clothed.includes("huge penis"), false);
  assert.equal(clothed.includes("penis"), false);

  const fromAction = composeCharacterCaptionTags(stored, {
    action: "looking at viewer, sitting, half-closed eyes",
    wear_state: "clothed",
  });
  assert.match(fromAction, /looking at viewer/);
  assert.match(fromAction, /sitting/);
  assert.match(fromAction, /half-closed eyes/);

  const nude = composeCharacterCaptionTags(stored, { wear_state: "bottomless" });
  assert.match(nude, /huge penis/);
  assert.equal((nude.match(/\bpenis\b/g) || []).length, 1);
});
