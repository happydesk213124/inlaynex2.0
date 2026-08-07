import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyGenderFromTags,
  composeCharacterCaptionTags,
  emphasizePersonTags,
  flagOn,
  jewelryFromAttire,
  normalizeGender,
  normalizePersonTagWeight,
  personCountTagsForShot,
  resolveCharacterGender,
  splitLookTags,
  stripPersonCountTags,
  syncGenderIntoAppearance,
} from "../.test-build/character-tags.mjs";

test("syncGenderIntoAppearance inserts girl unless girl/1girl exact token exists", () => {
  assert.equal(
    syncGenderIntoAppearance("happy, shirts, pretty girl", "girl"),
    "girl, happy, shirts, pretty girl",
  );
  assert.equal(
    syncGenderIntoAppearance("1girl, happy, shirts, pretty girl", "girl"),
    "1girl, happy, shirts, pretty girl",
  );
  assert.equal(
    syncGenderIntoAppearance("girl, long hair", "girl"),
    "girl, long hair",
  );
  assert.equal(syncGenderIntoAppearance("happy", ""), "happy");
  assert.equal(syncGenderIntoAppearance("", "girl"), "girl");
});

test("syncGenderIntoAppearance swaps markers when gender changes", () => {
  assert.equal(
    syncGenderIntoAppearance("girl, happy, shirts", "boy"),
    "boy, happy, shirts",
  );
  assert.equal(
    syncGenderIntoAppearance("1girl, long hair", "boy"),
    "boy, long hair",
  );
  assert.equal(
    syncGenderIntoAppearance("boy, short hair", "other"),
    "other, short hair",
  );
  assert.equal(
    syncGenderIntoAppearance("3::1girl, solo::, smile", "boy"),
    "boy, 3::solo::, smile",
  );
  assert.equal(
    syncGenderIntoAppearance("3::girl::, smile", "girl"),
    "3::girl::, smile",
  );
});

test("classifyGenderFromTags uses exact tokens only", () => {
  assert.equal(classifyGenderFromTags("black hair, girl, long hair"), "f");
  assert.equal(classifyGenderFromTags("black hair, boy"), "m");
  assert.equal(classifyGenderFromTags("girlyboy, long hair"), null);
  assert.equal(classifyGenderFromTags("1girl, long hair"), "f");
  assert.equal(classifyGenderFromTags("1boy, short hair"), "m");
  assert.equal(normalizeGender("female"), "girl");
  assert.equal(normalizeGender("girl"), "girl");
  assert.equal(normalizeGender("other"), "other");
  assert.equal(resolveCharacterGender({ gender: "boy", appearance: "girl" }), "m");
  assert.equal(resolveCharacterGender({ appearance: "woman, red hair" }), "f");
  assert.equal(resolveCharacterGender({ gender: "other", appearance: "girl" }), null);
  // shot.sex is act/caption tags, not an explicit gender override
  assert.equal(resolveCharacterGender({ sex: "girl" }), "f");
  assert.equal(resolveCharacterGender({ sex: "missionary", appearance: "boy, short hair" }), "m");
  assert.equal(resolveCharacterGender({ prompt: "1girl, long hair" }), "f");
});

test("personCountTagsForShot keeps both genders (not just 1boy)", () => {
  const tags = personCountTagsForShot(
    [
      { name: "A", appearance: "long hair, smile" }, // no girl token → unknown → girl
      { name: "B", appearance: "boy, short hair" },
    ],
    null,
    "gender",
  );
  assert.equal(tags, "1girl, 1boy");
  assert.equal(emphasizePersonTags(tags, 2), "2::1girl, 1boy::");
});

test("personCountTagsForShot solo replaces 1girl/1boy when cast is one", () => {
  assert.equal(
    personCountTagsForShot([{ name: "A", appearance: "girl, long hair" }], null, "gender", null, true),
    "solo",
  );
  assert.equal(
    personCountTagsForShot([{ name: "A", appearance: "boy" }], null, "girls", null, true),
    "solo",
  );
  // mode=off still gets solo when toggle on
  assert.equal(
    personCountTagsForShot([{ name: "A", appearance: "girl" }], null, "off", null, true),
    "solo",
  );
  // mode=off + solo off → empty
  assert.equal(
    personCountTagsForShot([{ name: "A", appearance: "girl" }], null, "off", null, false),
    "",
  );
  // two chars: solo toggle does not apply
  assert.equal(
    personCountTagsForShot(
      [
        { name: "A", appearance: "girl" },
        { name: "B", appearance: "boy" },
      ],
      null,
      "gender",
      null,
      true,
    ),
    "1girl, 1boy",
  );
  assert.equal(emphasizePersonTags("solo", 3), "3::solo::");
});

test("emphasizePersonTags wraps by weight", () => {
  assert.equal(normalizePersonTagWeight(undefined), 3);
  assert.equal(normalizePersonTagWeight(-1), 0);
  assert.equal(normalizePersonTagWeight(9), 5);
  assert.equal(emphasizePersonTags("1girl, 1boy", 0), "1girl, 1boy");
  assert.equal(emphasizePersonTags("1girl, 1boy", 3), "3::1girl, 1boy::");
  assert.equal(emphasizePersonTags("1girl, 1boy", 5), "5::1girl, 1boy::");
  assert.equal(emphasizePersonTags("1boy", 5), "5::1boy::");
  assert.equal(emphasizePersonTags("", 3), "");
});

test("strip leaves only scene tags; main is one wrapped person block", () => {
  const wrapped = emphasizePersonTags("1girl, 1boy", 5);
  assert.equal(wrapped, "5::1girl, 1boy::");
  const body = stripPersonCountTags("1girl, 1boy, from side, indoors");
  assert.equal(body, "from side, indoors");
  const main = `${wrapped}, ${body}`;
  assert.equal(main, "5::1girl, 1boy::, from side, indoors");
});

test("stripPersonCountTags removes plain and weighted person blocks", () => {
  assert.equal(stripPersonCountTags("1girl, 1boy, from side"), "from side");
  assert.equal(stripPersonCountTags("3::1girl, 1boy::, indoors"), "indoors");
  assert.equal(stripPersonCountTags("3::1boy::, bedroom"), "bedroom");
  assert.equal(stripPersonCountTags("3::1girl, solo::, portrait"), "portrait");
  assert.equal(stripPersonCountTags("3::1girl, 1boy::"), "");
  assert.equal(stripPersonCountTags("3::1girl, 1boy::, office"), "office");
});

test("splitLookTags puts jewelry in attire and weapons in accessories", () => {
  const [id, attire, acc] = splitLookTags(
    "black hair, white shirt, earrings, sword, holding sword",
  );
  assert.match(id, /black hair/);
  assert.match(attire, /white shirt/);
  assert.match(attire, /earrings/);
  assert.match(acc, /sword/);
  assert.equal(attire.includes("sword"), false);
  assert.equal(acc.includes("earrings"), false);
});

test("splitLookTags keeps singular bare shoulder in attire", () => {
  const [id, attire] = splitLookTags("black hair, 2.1::single bare shoulder::, white shirt");
  assert.match(id, /black hair/);
  assert.match(attire, /bare shoulder/);
  assert.match(attire, /white shirt/);
  assert.equal(id.includes("bare shoulder"), false);
});

test("flagOn accepts true/on/1", () => {
  assert.equal(flagOn(true), true);
  assert.equal(flagOn("on"), true);
  assert.equal(flagOn("ON"), true);
  assert.equal(flagOn("true"), true);
  assert.equal(flagOn(1), true);
  assert.equal(flagOn("1"), true);
  assert.equal(flagOn(false), false);
  assert.equal(flagOn("off"), false);
  assert.equal(flagOn(""), false);
  assert.equal(flagOn(undefined), false);
});

test("default caption is appearance + attire without weapons", () => {
  const stored = {
    name: "Han",
    appearance: "black hair, short hair, amber eyes, boy",
    attire: "white shirt, black trousers, watch",
    accessories: "sword",
  };
  const prompt = composeCharacterCaptionTags(stored, { action: "standing", expression: "smile" });
  assert.match(prompt, /white shirt/);
  assert.match(prompt, /watch/);
  assert.match(prompt, /black hair/);
  assert.match(prompt, /standing/);
  assert.equal(prompt.includes("sword"), false);
});

test("attire_locked default ignores shot attire override", () => {
  const stored = {
    name: "Han",
    appearance: "black hair, boy",
    attire: "white shirt, earrings",
    accessories: "katana",
  };
  const prompt = composeCharacterCaptionTags(stored, {
    attire: "black nun habit, pink frill skirt",
    nude: "off",
    weapon: "off",
  });
  assert.match(prompt, /white shirt/);
  assert.equal(prompt.includes("nun habit"), false);
});

test("attire_locked false accepts shot attire for caption", () => {
  const stored = {
    name: "Han",
    appearance: "black hair, boy",
    attire: "white shirt, earrings",
    accessories: "katana",
    attire_locked: false,
  };
  const prompt = composeCharacterCaptionTags(stored, {
    attire: "black nun habit, pink frill skirt",
  });
  assert.match(prompt, /nun habit/);
  assert.equal(prompt.includes("white shirt"), false);
});

test("weapon=on appends accessories", () => {
  const stored = {
    name: "Han",
    appearance: "black hair, boy",
    attire: "white shirt, earrings",
    accessories: "katana",
  };
  const prompt = composeCharacterCaptionTags(stored, { weapon: "on" });
  assert.match(prompt, /white shirt/);
  assert.match(prompt, /earrings/);
  assert.match(prompt, /katana/);
});

test("accessories_locked ignores shot accessories when weapon on", () => {
  const stored = {
    name: "Han",
    appearance: "black hair, boy",
    attire: "white shirt",
    accessories: "katana",
  };
  const prompt = composeCharacterCaptionTags(stored, {
    weapon: "on",
    accessories: "rifle",
  });
  assert.match(prompt, /katana/);
  assert.equal(prompt.includes("rifle"), false);
});

test("accessories_locked false accepts shot accessories when weapon on", () => {
  const stored = {
    name: "Han",
    appearance: "black hair, boy",
    attire: "white shirt",
    accessories: "katana",
    accessories_locked: false,
  };
  const prompt = composeCharacterCaptionTags(stored, {
    weapon: "on",
    accessories: "rifle",
  });
  assert.match(prompt, /rifle/);
  assert.equal(prompt.includes("katana"), false);
});

test("nude levels keep attire and append gendered anatomy tags", () => {
  const male = {
    name: "Han",
    appearance: "black hair, boy",
    attire: "white shirt, black trousers, earrings, necklace",
    accessories: "sword",
  };
  const tornM = composeCharacterCaptionTags(male, { nude: "torn" });
  assert.match(tornM, /white shirt/);
  assert.match(tornM, /2::torn clothes::/);
  assert.match(tornM, /penis/);
  assert.equal(tornM.includes("nipples"), false);

  const nudeM = composeCharacterCaptionTags(male, { nude: 2 });
  assert.match(nudeM, /2\.5::nude::/);
  assert.match(nudeM, /penis/);

  const fullM = composeCharacterCaptionTags(male, { nude: "on" });
  assert.match(fullM, /white shirt/);
  assert.match(fullM, /earrings/);
  assert.match(fullM, /2\.5::completely nude::/);
  assert.match(fullM, /penis/);
  assert.equal(fullM.includes("sword"), false);

  const female = {
    name: "Aya",
    appearance: "blonde hair, girl",
    attire: "dress, earrings",
    accessories: "bag",
  };
  const tornF = composeCharacterCaptionTags(female, { nude: "torn" });
  assert.match(tornF, /dress/);
  assert.match(tornF, /2::torn clothes::/);
  assert.match(tornF, /nipples/);
  assert.match(tornF, /pussy/);
  assert.equal(tornF.includes("penis"), false);

  const fullF = composeCharacterCaptionTags(female, { nude: "completely" });
  assert.match(fullF, /2::completely nude::/);
  assert.match(fullF, /nipples/);
  assert.match(fullF, /pussy/);

  const unknown = {
    name: "X",
    appearance: "silver hair",
    attire: "cloak",
    gender: "other",
  };
  const unk = composeCharacterCaptionTags(unknown, { nude: 2 });
  assert.match(unk, /cloak/);
  assert.match(unk, /2\.5::nude::/);
  assert.equal(unk.includes("penis"), false);
  assert.equal(unk.includes("nipples"), false);
});

test("nude+weapon keeps clothes and weapons", () => {
  const stored = {
    name: "Han",
    appearance: "black hair, boy",
    attire: "coat, earrings",
    accessories: "rifle",
  };
  const prompt = composeCharacterCaptionTags(stored, { nude: "completely", weapon: 1 });
  assert.match(prompt, /2\.5::completely nude::/);
  assert.match(prompt, /penis/);
  assert.match(prompt, /coat/);
  assert.match(prompt, /earrings/);
  assert.match(prompt, /rifle/);
});

test("shot attire overrides base for caption only when unlocked", () => {
  const stored = {
    name: "Han",
    appearance: "black hair, short hair, amber eyes, boy",
    attire: "white shirt, black trousers, watch",
    accessories: "bag",
    attire_locked: false,
    accessories_locked: false,
  };
  const prompt = composeCharacterCaptionTags(stored, {
    attire: "school uniform, necktie, earrings",
    weapon: "on",
    accessories: "bag",
    action: "walking",
  });
  assert.match(prompt, /school uniform/);
  assert.match(prompt, /bag/);
  assert.equal(prompt.includes("white shirt"), false);
  assert.match(prompt, /black hair/);
  // Roster base must stay unchanged — unlock is caption-only.
  assert.equal(stored.attire, "white shirt, black trousers, watch");
  assert.equal(stored.accessories, "bag");
});
