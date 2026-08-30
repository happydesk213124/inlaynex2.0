import test from "node:test";
import assert from "node:assert/strict";

import {
  applyComicKindGuard,
  clampComicByRatio,
  clampComicPages,
  comicCapFromRatio,
  comicLineRange,
  comicGenOn,
  normalizeShotKind,
} from "../.test-build/comic-kind.mjs";
import { pickNextReadyShot } from "../.test-build/comic-schedule.mjs";
import { comicPairsUsable, resolveComicUseCoords } from "../.test-build/comic-coords.mjs";
import { formatComicNowWearingBlock, resolveComicSlotCostume } from "../.test-build/comic-costume.mjs";
import { assignComicPagesToShots, parseComicPages } from "../.test-build/comic-page.mjs";
import { stripComicKomaFromUc, stripComicPageStyleTags, stripComicStyleWords } from "../.test-build/comic-tags.mjs";
import { comicSpeechCaption, composeComicSlotCaption } from "../.test-build/comic-caption.mjs";
import { resolveComicNaiParams } from "../.test-build/comic-params.mjs";
import { COMIC_FULL_MESSAGE_REF, comicProseBlockForLlm } from "../.test-build/comic-llm-prose.mjs";

test("normalizeShotKind maps comic aliases", () => {
  assert.equal(normalizeShotKind("comic"), "comic");
  assert.equal(normalizeShotKind("illustration"), "illustration");
  assert.equal(normalizeShotKind(""), "illustration");
});

test("comicGenOn is off unless on", () => {
  assert.equal(comicGenOn({}), false);
  assert.equal(comicGenOn({ comic_gen: "off" }), false);
  assert.equal(comicGenOn({ comic_gen: "on" }), true);
});

test("comic LLM prose is the page range plus a compressed full-message reference", () => {
  const css = ".chattext .x-risu-ngs-card{position:relative;display:flex;padding:8px}";
  const msg = ["one", "two", "three", css, "five"].join("\n");
  const block = comicProseBlockForLlm(msg, 3, 5);
  assert.match(block, /^L3\|three\nL4\|maybeCSSCode<< /);
  assert.match(block, /\nL5\|five\n\n/);
  assert.ok(block.includes(COMIC_FULL_MESSAGE_REF));
  assert.match(block, /L1\|one/);
  assert.match(block, /L4\|maybeCSSCode<< /);
  assert.ok(!block.includes("padding:8px}"));
});

test("comic LLM prose skips a duplicate full copy when the range is the whole message", () => {
  const block = comicProseBlockForLlm("a\nb\nc", 1, 3);
  assert.equal(block, "L1|a\nL2|b\nL3|c");
  assert.ok(!block.includes(COMIC_FULL_MESSAGE_REF));
});

test("comicLineRange clamps and never uses a neighbor", () => {
  assert.deepEqual(comicLineRange(7, 12, 20), [7, 12]);
  assert.deepEqual(comicLineRange(12, 7, 20), [12, 12]);
  assert.deepEqual(comicLineRange(1, 99, 10), [1, 10]);
  assert.deepEqual(comicLineRange(null, null, 8), [1, 1]);
});

test("clampComicPages keeps first N comics and turns extras into illustration", () => {
  const shots = [
    { kind: "illustration" },
    { kind: "comic" },
    { kind: "comic" },
    { kind: "illustration" },
    { kind: "comic", comic_line_end: 9 },
  ];
  const out = clampComicPages(shots, 2);
  assert.equal(out.filter((s) => s.kind === "comic").length, 2);
  assert.equal(out.length, 5);
  assert.equal(out[out.length - 1].kind, "illustration");
  assert.equal(out[out.length - 1].comic_line_end, undefined);
});

test("clampComicByRatio uses percent of the shot list", () => {
  assert.equal(comicCapFromRatio(4, 50), 2);
  assert.equal(comicCapFromRatio(1, 0), 0);
  const shots = [
    { kind: "comic" },
    { kind: "comic" },
    { kind: "comic" },
    { kind: "illustration" },
  ];
  const out = clampComicByRatio(shots, 50);
  assert.equal(out.filter((s) => s.kind === "comic").length, 2);
  assert.equal(out.length, 4);
});

test("applyComicKindGuard drops kind when tab is off", () => {
  const shots = [{ kind: "comic", comic_line_end: 9, line: 3 }];
  applyComicKindGuard(shots, false);
  assert.equal(shots[0].kind, undefined);
  assert.equal(shots[0].comic_line_end, undefined);
});

test("pickNextReadyShot takes the smallest ready index", () => {
  const order = [0, 1, 2, 3, 4, 5, 6];
  const done = new Set();
  const inflight = new Set();
  const ready = new Set([0, 1, 3, 4, 6]);
  assert.equal(pickNextReadyShot({ order, done, inflight, ready }), 0);
  done.add(0);
  done.add(1);
  inflight.add(3);
  assert.equal(pickNextReadyShot({ order, done, inflight, ready }), 4);
  done.add(4);
  ready.add(2);
  ready.add(5);
  inflight.delete(3);
  assert.equal(pickNextReadyShot({ order, done, inflight, ready }), 2);
});

test("resolveComicUseCoords falls back when a pair is missing", () => {
  const ok = [{ x: 0.3, y: 0.2 }, { x: 0.7, y: 0.2 }];
  assert.equal(resolveComicUseCoords("position", "", ok), true);
  assert.equal(resolveComicUseCoords("position", "", [ok[0], null]), false);
  assert.equal(resolveComicUseCoords("ai_choice", "position", ok), false);
  assert.equal(resolveComicUseCoords("llm", "ai_choice", ok), false);
  assert.equal(resolveComicUseCoords("llm", "position", ok), true);
  assert.equal(resolveComicUseCoords("llm", "", ok), false);
  assert.equal(resolveComicUseCoords("position", "", [{ x: 0.5, y: 0.5 }]), true);
  assert.equal(comicPairsUsable([{ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }]), false);
});

test("resolveComicSlotCostume expands a name and keeps raw tags", () => {
  const stored = {
    costumes: [
      { name: "default", attire: "shirt", accessories: "" },
      { name: "maid", attire: "navy dress, white apron", accessories: "hair ribbon" },
    ],
    active_costume: 0,
  };
  const named = resolveComicSlotCostume(stored, "maid");
  assert.equal(named.mode, "named");
  assert.match(named.attire, /navy dress/);
  const raw = resolveComicSlotCostume(stored, "wet shirt, torn skirt");
  assert.equal(raw.mode, "raw");
  assert.equal(raw.attire, "wet shirt, torn skirt");
  const empty = resolveComicSlotCostume(stored, "");
  assert.equal(empty.mode, "fallback");
  assert.equal(empty.attire, "shirt");
});

test("formatComicNowWearingBlock tells the LLM the live costume and accessory on/off", () => {
  const on = formatComicNowWearingBlock({
    costumeName: "maid",
    wearState: "clothed",
    accessories: "hair ribbon, holster",
  });
  assert.match(on, /now_wearing: maid/);
  assert.match(on, /wear_state: clothed/);
  assert.match(on, /accessories: on \(hair ribbon, holster\)/);
  const off = formatComicNowWearingBlock({ wearState: "nude" });
  assert.match(off, /now_wearing: default/);
  assert.match(off, /wear_state: nude/);
  assert.match(off, /accessories: off/);
});

test("parseComicPages + assign fills unmatched comics in order", () => {
  const pages = parseComicPages({
    pages: [
      {
        koma: 4,
        aspect: "portrait",
        coords: "position",
        layout: "the first row is one full-width cut of a hallway",
        slots: [{ name: "테아", action: "blush", costume: "maid", text: "안녕", center_x: 0.5, center_y: 0.2 }],
      },
    ],
  });
  assert.equal(pages.length, 1);
  const shots = [
    { kind: "illustration", characters: [] },
    { kind: "comic", characters: [{ name: "x" }] },
  ];
  const assigned = assignComicPagesToShots(shots, pages);
  assert.ok(assigned.has(1));
  assert.equal(shots[1].characters[0].name, "테아");
  assert.equal(shots[1].comic_page.koma, 4);
});

test("assignComicPagesToShots keeps the first tagger aspect over the comic page", () => {
  const pages = parseComicPages({
    pages: [{
      koma: 2,
      aspect: "landscape",
      layout: "the first row is a wide hall",
      slots: [{ name: "테아", action: "stand", costume: "maid" }],
    }],
  });
  const shots = [
    { kind: "comic", aspect: "portrait", characters: [] },
  ];
  assignComicPagesToShots(shots, pages);
  assert.equal(shots[0].aspect, "portrait");
  assert.equal(shots[0].comic_page.aspect, "portrait");
});

test("assignComicPagesToShots fills a missing first-tagger aspect as portrait", () => {
  const pages = parseComicPages({
    pages: [{
      koma: 2,
      aspect: "landscape",
      layout: "the first row is a wide hall",
      slots: [{ name: "테아", action: "stand", costume: "maid" }],
    }],
  });
  const shots = [{ kind: "comic", characters: [] }];
  assignComicPagesToShots(shots, pages);
  assert.equal(shots[0].aspect, "portrait");
});

test("strip comic/manga from positive and 4koma from UC", () => {
  assert.equal(stripComicPageStyleTags("comic, manga, 3::5koma::, best quality"), "3::5koma::, best quality");
  assert.equal(stripComicKomaFromUc("lowres, 4koma, 2koma, blurry"), "lowres, blurry");
  assert.equal(stripComicStyleWords("comic hallway, manga tone hatching"), "hallway, tone");
});

test("comicSpeechCaption builds a bubble tag", () => {
  assert.equal(
    comicSpeechCaption("speech", "하아..."),
    "speechbubble, korean text:하아...",
  );
  assert.equal(
    comicSpeechCaption("thought", "안돼, 가지마"),
    "thought bubble, korean text:안돼, 가지마",
  );
});

test("composeComicSlotCaption keeps looks, costume, action, and korean text", () => {
  const caption = composeComicSlotCaption(
    {
      name: "히나",
      appearance: "blonde hair, blue eyes",
      costumes: [{ name: "maid", attire: "navy dress, white apron", accessories: "hair ribbon" }],
      active_costume: 0,
    },
    {
      name: "히나",
      action: "walking, blush",
      costume: "maid",
      bubble: "speech",
      speech: "아.... 힘들다...",
    },
  );
  assert.match(caption, /blonde hair/);
  assert.match(caption, /navy dress/);
  assert.match(caption, /walking/);
  assert.match(caption, /speechbubble, korean text:아\.\.\.\. 힘들다\.\.\./);
});

test("resolveComicNaiParams uses empty overrides as existing V5 values", () => {
  const nai = { steps_v5: 28, sampler_v5: "k_euler_ancestral", cfg_scale: 5, cfg_rescale: 0 };
  const empty = resolveComicNaiParams({ comic_steps: "", comic_sampler: "", comic_cfg_scale: "", comic_cfg_rescale: "" }, nai, null);
  assert.equal(empty.steps, 28);
  assert.equal(empty.sampler, "k_euler_ancestral");
  assert.equal(empty.cfg_scale, 5);
  const over = resolveComicNaiParams({ comic_steps: 40, comic_sampler: "k_euler", comic_cfg_scale: 6.5, comic_cfg_rescale: 0.2 }, nai, null);
  assert.equal(over.steps, 40);
  assert.equal(over.sampler, "k_euler");
  assert.equal(over.cfg_scale, 6.5);
  assert.equal(over.cfg_rescale, 0.2);
});
