import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const src = (name) => readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "services", name), "utf8");

import { applyCharacterCommandDeltas, formatCommandDeltaLog } from "../.test-build/command-char-edit.mjs";
import {
  authorNoteSystemContent,
  joinSessionAuthorNote,
  parseSessionAuthorNote,
  sessionAuthorNoteSystemContent,
} from "../.test-build/session-note.mjs";

test("applyCharacterCommandDeltas add/remove appearance and costume tags", () => {
  const out = applyCharacterCommandDeltas(
    {
      appearance: "girl, black hair",
      costumes: [{ name: "default", note: "", attire: "school uniform", accessories: "bag" }],
      active_costume: 0,
    },
    {
      appearance: { add: ["mole"], remove: ["black hair"] },
      costumes: [{ name: "default", attire: { add: ["red dress"], remove: ["school uniform"] } }],
    },
  );
  assert.match(out.appearance, /mole/);
  assert.doesNotMatch(out.appearance, /black hair/);
  assert.match(out.costumes[0].attire, /red dress/);
  assert.doesNotMatch(out.costumes[0].attire, /school uniform/);
  assert.equal(out.attire, out.costumes[0].attire);
});

test("applyCharacterCommandDeltas copies base_costume then add/remove", () => {
  const out = applyCharacterCommandDeltas(
    {
      appearance: "girl",
      costumes: [
        { name: "default", note: "daily", attire: "coat, skirt", accessories: "sword" },
      ],
    },
    {
      new_costumes: [
        {
          name: "swimsuit",
          note: "pool",
          base_costume: "default",
          attire: { add: ["bikini"], remove: ["coat", "skirt"] },
        },
      ],
    },
  );
  assert.equal(out.costumes.length, 2);
  const neu = out.costumes.find((c) => c.name === "swimsuit");
  assert.ok(neu);
  assert.equal(neu.note, "pool");
  assert.match(neu.attire, /bikini/);
  assert.doesNotMatch(neu.attire, /coat/);
  assert.match(neu.accessories, /sword/);
});

test("applyCharacterCommandDeltas adds multiple new costumes", () => {
  const out = applyCharacterCommandDeltas(
    { appearance: "boy", costumes: [{ name: "default", note: "", attire: "shirt", accessories: "" }] },
    {
      new_costumes: [
        { name: "armor", attire: { add: "plate armor" } },
        { name: "sleep", attire: { add: "pajamas" } },
      ],
    },
  );
  assert.equal(out.costumes.length, 3);
  assert.ok(out.costumes.some((c) => c.name === "armor"));
  assert.ok(out.costumes.some((c) => c.name === "sleep"));
});

test("authorNoteSystemContent omits empty and labels the lane", () => {
  assert.equal(authorNoteSystemContent("Global Author's Note", "  "), "");
  const msg = authorNoteSystemContent("Global Author's Note", "keep uniforms");
  assert.match(msg, /Global Author's Note/);
  assert.match(msg, /keep uniforms/);
});

test("sessionAuthorNoteSystemContent labels 이세션 명령어 and wins over global", () => {
  const msg = sessionAuthorNoteSystemContent("only this chat");
  assert.match(msg, /이세션 명령어/);
  assert.match(msg, /only this chat/);
  assert.match(msg, /MUST take precedence/);
  assert.equal(sessionAuthorNoteSystemContent("  "), "");
});

test("parseSessionAuthorNote migrates a string to prefix", () => {
  assert.deepEqual(parseSessionAuthorNote("legacy note"), {
    prefix: "legacy note",
    suffix: "",
    preset_id: "",
    location: "",
  });
  assert.equal(joinSessionAuthorNote("pre", "post"), "pre\npost");
});

test("session note is wired into main tagger, looks, and comic LLM", () => {
  assert.match(src("tagger.ts"), /sessionAuthorNoteLlmContent/);
  assert.match(src("tagger.ts"), /getPrompt\('author_note'\)/);
  assert.match(src("tagger.ts"), /getPrompt\('asset_author_note'\)/);
  assert.match(src("tagger.ts"), /getPrompt\('global_author_note'\)/);
  assert.match(src("comic.ts"), /sessionAuthorNoteLlmContent/);
  assert.match(src("comic.ts"), /getPrompt\('global_author_note'\)/);
  assert.doesNotMatch(src("comic.ts"), /getPrompt\('author_note'\)/);
  assert.match(src("jobs.ts"), /sessionId,/);
});

test("sessionAuthorNoteSystemContent splits 선행 and 후행", () => {
  const msg = sessionAuthorNoteSystemContent({ prefix: "before tags", suffix: "after tags" });
  assert.match(msg, /## 선행/);
  assert.match(msg, /before tags/);
  assert.match(msg, /## 후행/);
  assert.match(msg, /after tags/);
});

test("applyCharacterCommandDeltas removes named costumes but keeps one", () => {
  const two = applyCharacterCommandDeltas(
    {
      costumes: [
        { name: "default", note: "", attire: "coat", accessories: "" },
        { name: "swimsuit", note: "", attire: "bikini", accessories: "" },
      ],
      active_costume: 1,
    },
    { remove_costumes: ["swimsuit"] },
  );
  assert.equal(two.costumes.length, 1);
  assert.equal(two.costumes[0].name, "default");
  assert.equal(two.active_costume, 0);
  assert.equal(two.attire, "coat");

  const last = applyCharacterCommandDeltas(
    { costumes: [{ name: "default", note: "", attire: "coat", accessories: "" }] },
    { remove_costumes: [{ name: "default" }] },
  );
  assert.equal(last.costumes.length, 1);
  assert.equal(last.costumes[0].name, "default");
});

test("applyCharacterCommandDeltas overwrites name/id/original/gender only when LLM sends them", () => {
  const rec = {
    id: "keep-id",
    name: "Keep Name",
    original: "Keep Original",
    gender: "girl",
    appearance: "girl",
    costumes: [{ name: "default", note: "", attire: "", accessories: "" }],
  };
  const omitted = applyCharacterCommandDeltas(rec, { appearance: { add: ["mole"] } });
  assert.equal(omitted.id, "keep-id");
  assert.equal(omitted.name, "Keep Name");
  assert.equal(omitted.original, "Keep Original");
  assert.equal(omitted.gender, "girl");

  const overwritten = applyCharacterCommandDeltas(rec, {
    name: "New Name",
    id: "new-id",
    original: "New Original",
    gender: "boy",
  });
  assert.equal(overwritten.id, "new-id");
  assert.equal(overwritten.name, "New Name");
  assert.equal(overwritten.original, "New Original");
  assert.equal(overwritten.gender, "boy");
});

test("formatCommandDeltaLog lists appearance and costume add/remove", () => {
  const log = formatCommandDeltaLog({
    appearance: { add: ["mole"], remove: ["black hair"] },
    costumes: [{ name: "default", attire: { add: ["red dress"], remove: ["school uniform"] } }],
    new_costumes: [{ name: "swimsuit", base_costume: "default", attire: { add: ["bikini"] } }],
    remove_costumes: ["school"],
  });
  assert.match(log, /외형 {2}\+ mole/);
  assert.match(log, /외형 {2}− black hair/);
  assert.match(log, /코스튬 default · 옷 {2}\+ red dress/);
  assert.match(log, /코스튬 default · 옷 {2}− school uniform/);
  assert.match(log, /새 코스튬 {2}swimsuit/);
  assert.match(log, /bikini/);
  assert.match(log, /코스튬 삭제 {2}school/);
  assert.match(
    formatCommandDeltaLog({ name: "A", id: "b", original: "C", gender: "여자" }),
    /이름\s+→ A[\s\S]*id\s+→ b[\s\S]*original\s+→ C[\s\S]*성별\s+→ girl/,
  );
  assert.equal(formatCommandDeltaLog({}), "");
});
