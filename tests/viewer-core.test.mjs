import test from "node:test";
import assert from "node:assert/strict";

import {
  activeSegmentIndex,
  clampPinPercent,
  clampReadingPercent,
  createDebouncedSaveQueue,
  createScrollPhaseBus,
  createScrollSettleTracker,
  createSessionChangeGuard,
  evenAnchorPercent,
  findHashRebindCandidates,
  findCardsForMessageIdentity,
  jobMatchesMessageIdentity,
  canRetargetJobSaveHash,
  stickySegChanged,
  galleryFocusMessage,
  galleryForMessage,
  gallerySelectedCount,
  linkCardsForMessage,
  stripInlayInlineHtml,
  splitMessageLines,
  clampShotLine,
  htmlToPlainLn,
  findPlainLineStartOffset,
  injectInlineImagesIntoHtml,
  markerBlockHtml,
  lineTextOccurrence,
  findElementIndexForLine,
  preferNearbyHostIndex,
  findElementIndexForLineWithFallback,
  prefixMatchRatio,
  clickSelectTracksEnabled,
  DOUBLE_SELECT_WINDOW_MS,
  isMessageSelectionGesture,
  normalizeSelectionGesture,
  pickMessageIndexNearPoint,
  pinPercentToPx,
  pinPercentToPxFromBottom,
  pinPxToPercent,
  mergeViewerPaintJob,
  readingPercentInMessage,
  resolveCardAnchorPercent,
  resolveClickSelectionAction,
  resolveStoredPinPercent,
  scaleInlineThumbnail,
  shouldRefreshGallery,
  shouldRewriteStickyThumb,
  claimStickyMarkerByCardId,
  shouldKeepStickyThumbHidden,
  resolveStickyThumbPct,
  stickyThumbBoxFromPct,
  stickySegmentForInlineChat,
  markerAnchorClientPoint,
  nearestSegmentByClientPoint,
  fitBoxInside,
  composeStickyThumbHtml,
  stickyThumbNeedsHtmlPaint,
  stickyThumbSizeForImage,
  stickyThumbStyleWithSize,
  probeDataUrlPixelSize,
  stickyCornerImageBox,
  stickyCornerEdgeBox,
  stickyPinEdgeBox,
  stickyPinOverImage,
  stickyV2AnchorSide,
  stickyV2FreeLayout,
  stickyV2CornerLayout,
  stickyV2ShotCounts,
  composeStickyV2ThumbHtml,
  resolveChatMessageMatch,
  messageCompactKey,
  messageContextTriplet,
  rebindGalleryMessageIndexes,
  messagesTextOverlapScore,
  describeDomApiCompare,
  rawMessageRole,
  hasGenerationInfo,
  roleFromGenerationInfo,
  isCharMessageRole,
  pickInlineKeepDomIndices,
  INLINE_KEEP_MAX_PER_SIDE,
  desiredInlinePlacements,
  desiredInlinePaintKey,
  reconcileInlineShot,
  shouldStripLeftoverInlineId,
  shouldSelectMessageByTextDrag,
  visibleGalleryImageIds,
  nearbyMessageImageIds,
  isNearbyDomIndex,
  nearbyDomIndexWindow,
  resolveIndexProgress,
  composeDualProgressBarsHtml,
  composeProgressToastHtml,
  formatProgressElapsedSec,
  galleryStripSplitAt,
  galleryIndexFromChildIndex,
  thumbIndexAtStripX,
  galleryStripContentWidth,
  clampThumbScrollOffset,
  parseAutotagLookJson,
  stripLbdataBlocks,
  messageBodyCharCount,
  normalizeMatchText,
} from "../.test-build/viewer-core.mjs";

test("LBDATA dump is excluded from body char count and match text", () => {
  const dump = `----\n---\n[LBDATA START]\n<lightboard-kakaochat>lots of wiki</lightboard-kakaochat>\n[LBDATA END]\n`;
  assert.equal(stripLbdataBlocks(dump).replace(/\s+/g, ""), "-------");
  assert.equal(messageBodyCharCount(dump), 7);
  assert.ok(messageBodyCharCount(dump) <= 30);
  const withProse = `정찰 결과를 상부로 보고한다. 하층부에서 이상 개체를 확인했고 추가 대비가 필요하다.\n[LBDATA START]\nx\n[LBDATA END]`;
  assert.ok(messageBodyCharCount(withProse) > 30);
  assert.equal(normalizeMatchText(`[LBDATA START]wikiwiki[LBDATA END]안녕`), "안녕");
});

test("new 100 percent thumbnail equals the legacy 600 percent dimensions", () => {
  assert.deepEqual(scaleInlineThumbnail(100), { width: 528, height: 720, percent: 100 });
  assert.deepEqual(scaleInlineThumbnail(50), { width: 264, height: 360, percent: 50 });
});

test("gallery puts selected-message cards first by y% then newest remaining", () => {
  const cards = [
    { id: "a", content_hash: "h1", message_index: 1, paragraph: 0, shot_index: 0, created_at: 1, y_percent: 80 },
    { id: "b", content_hash: "h2", message_index: 2, paragraph: 0, shot_index: 0, created_at: 3, y_percent: 10 },
    { id: "c", content_hash: "h1", message_index: 1, paragraph: 1, shot_index: 0, created_at: 2, y_percent: 20 },
  ];
  const out = galleryForMessage(cards, { hash: "h1", chatIndex: 1 }, 8);
  assert.deepEqual(out.map((c) => c.id), ["c", "a", "b"]);
});

test("gallery keeps all selected shots even when rest cap is 8", () => {
  const selected = Array.from({ length: 5 }, (_, i) => ({
    id: `s${i}`,
    content_hash: "sel",
    message_index: 5,
    paragraph: i,
    shot_index: 0,
    created_at: i,
    y_percent: 10 + i * 15,
  }));
  const others = Array.from({ length: 12 }, (_, i) => ({
    id: `o${i}`,
    content_hash: `o${i}`,
    message_index: i,
    paragraph: 0,
    shot_index: 0,
    created_at: 100 + i,
  }));
  const out = galleryForMessage([...selected, ...others], { hash: "sel", chatIndex: 5 }, 8);
  assert.equal(out.length, 5 + 8);
  assert.ok(out.slice(0, 5).every((c) => c.content_hash === "sel"));
  assert.deepEqual(out.slice(0, 5).map((c) => c.id), ["s0", "s1", "s2", "s3", "s4"]);
  assert.equal(out[5].id, "o11");
});

test("galleryFocusMessage keeps last imaged when selection has no cards", () => {
  const cards = [{ id: "x", content_hash: "old", message_index: 1, paragraph: 0, created_at: 1 }];
  assert.equal(galleryFocusMessage({ hash: "new", chatIndex: 9, sessionId: "s1" }, { hash: "old", chatIndex: 1, sessionId: "s1" }, cards).hash, "old");
});

test("galleryFocusMessage does not keep last imaged across sessions", () => {
  const cards = [{ id: "x", content_hash: "old", message_index: 1, paragraph: 0, created_at: 1, session_id: "oldS" }];
  const focus = galleryFocusMessage(
    { hash: "new", chatIndex: 0, sessionId: "newS" },
    { hash: "old", chatIndex: 1, sessionId: "oldS" },
    cards,
  );
  assert.equal(focus.hash, "new");
});

test("stripInlayInlineHtml removes marker blocks", () => {
  const html = `hello<div data-inlay-inline-shot="0"><br><img src="data:image/png;base64,xx"><br></div>world`;
  assert.equal(stripInlayInlineHtml(html).replace(/\s/g, ""), "helloworld");
  assert.deepEqual(splitMessageLines("a\n\nb\nc"), ["a", "b", "c"]);
  assert.equal(clampShotLine(9, 3), 3);
  assert.equal(clampShotLine(0, 3), null);
});

test("findElementIndexForLine matches text + occurrence order", () => {
  const lines = ["차를 탔다", "커피를 마셨다", "커피를 마셨다", "끝"];
  assert.deepEqual(lineTextOccurrence(lines, 2), { text: "커피를 마셨다", occurrence: 1 });
  assert.deepEqual(lineTextOccurrence(lines, 3), { text: "커피를 마셨다", occurrence: 2 });
  const els = ["차를 탔다", "커피를 마셨다", "커피를 마셨다", "끝"];
  assert.equal(findElementIndexForLine(els, lines, 2), 1);
  assert.equal(findElementIndexForLine(els, lines, 3), 2);
  // multi-line host: both coffee lines live in one element
  assert.equal(findElementIndexForLine(["차를 탔다", "커피를 마셨다\n커피를 마셨다", "끝"], lines, 3), 1);
  assert.equal(preferNearbyHostIndex(["P", "DIV", "P"], 1), 0);
  assert.equal(preferNearbyHostIndex(["H2", "DIV", "P"], 1), 2);
  assert.equal(preferNearbyHostIndex(["DIV", "H2"], 0), -1);
  assert.equal(preferNearbyHostIndex(["P", "P"], 0), 0);
  // line 2 text missing from hosts → fall forward to line 3
  assert.deepEqual(
    findElementIndexForLineWithFallback(["a", "c"], ["P", "P"], ["a", "b", "c"], 2),
    { elementIndex: 1, usedLine: 3 },
  );
});

test("injectInlineImagesIntoHtml keeps formatting and uses line numbers", () => {
  const src = "data:image/png;base64,abc";
  assert.equal(htmlToPlainLn("a<br><b>b</b><br>c"), "a\nb\nc");
  assert.equal(findPlainLineStartOffset("a\nb\nc", 2), 2);
  const rich = `차를 탔다<br><b>커피를 마셨다</b><br>커피를 마셨다<br>끝`;
  const out = injectInlineImagesIntoHtml(rich, [
    { line: 2, src, shotIndex: 0, cardId: "c1" },
    { line: 3, src, shotIndex: 1, cardId: "c2" },
  ]);
  assert.match(out, /data-inlay-inline-shot="c1"/);
  assert.match(out, /data-inlay-inline-shot="c2"/);
  assert.match(out, /<b>커피를 마셨다<\/b>/);
  assert.match(out, /max-width:min\(78%,100%\)/);
  // first coffee line is bold — marker for line 2 sits before <b>
  assert.match(out, /data-inlay-inline-shot="c1"[^>]*>[\s\S]*?<b>커피를 마셨다<\/b>/);
  // duplicate plain "커피를 마셨다" still gets line-3 marker (not string search of first)
  const stripped = stripInlayInlineHtml(out);
  assert.equal(htmlToPlainLn(stripped), htmlToPlainLn(rich));
});

test("markerBlockHtml ready is image-only", () => {
  const pending = markerBlockHtml({ line: 2, src: "", shotIndex: 0, pending: true, cardId: "pending-0" });
  assert.match(pending, /data-inlay-inline-pending="1"/);
  assert.match(pending, /animateTransform/);
  assert.match(pending, /<br><br>/);
  const ready = markerBlockHtml({
    line: 2,
    src: "data:image/png;base64,abc",
    shotIndex: 0,
    cardId: "c1",
  });
  assert.match(ready, /max-width:min\(78%,100%\)/);
  assert.match(ready, /data-inlay-inline-img="1"/);
  assert.doesNotMatch(ready, /data-inlay-inline-act=/);
  assert.doesNotMatch(ready, /data-inlay-chrome-act=/);
  const scaled = markerBlockHtml({
    line: 2,
    src: "data:image/png;base64,abc",
    shotIndex: 0,
    cardId: "c1",
  }, 50);
  assert.match(scaled, /max-width:min\(39%,100%\)/);
  assert.match(scaled, /max-height:min\(35vh,450px\)/);
});

test("injectInlineImagesIntoHtml hard-dedupes pending circles by line and cardId", () => {
  const html = "<p>첫 줄</p><p>둘째</p>";
  const out = injectInlineImagesIntoHtml(html, [
    { line: 1, pending: true, cardId: "pending-0", shotIndex: 0 },
    { line: 1, pending: true, cardId: "pending-0", shotIndex: 0 },
    { line: 1, pending: true, cardId: "pending-1", shotIndex: 1 },
  ]);
  assert.equal((out.match(/data-inlay-inline-pending/g) || []).length, 1);
  assert.equal((out.match(/data-inlay-inline-shot="pending-0"/g) || []).length, 1);
});

test("pin percent ↔ px truncates decimals and migrates legacy offsets", () => {
  assert.equal(clampPinPercent(12.9), 12);
  assert.equal(pinPercentToPx(0, 1000, 22, 4), 4);
  assert.equal(pinPxToPercent(500, 1000), 50);
  assert.equal(resolveStoredPinPercent({ overlay_x_pct: 10.8 }, "x", 1000), 10);
});

test("pickMessageIndexNearPoint prefers containing rect then closest center", () => {
  const rects = [{ top: 0, bottom: 100 }, { top: 120, bottom: 220 }, { top: 240, bottom: 340 }];
  assert.equal(pickMessageIndexNearPoint(rects, 50), 0);
  assert.equal(pickMessageIndexNearPoint(rects, 150), 1);
});

test("gallery without selection is newest-first capped at 8", () => {
  const cards = Array.from({ length: 10 }, (_, i) => ({ id: `n${i}`, created_at: i, message_index: i }));
  assert.equal(galleryForMessage(cards, null, 8).length, 8);
});

test("selection gesture respects movement; context/longpress ignore left-click track", () => {
  assert.equal(normalizeSelectionGesture("double"), "double");
  assert.equal(normalizeSelectionGesture("context"), "context");
  assert.equal(normalizeSelectionGesture("longpress"), "longpress");
  assert.equal(clickSelectTracksEnabled("single"), true);
  assert.equal(clickSelectTracksEnabled("context"), false);
  assert.equal(isMessageSelectionGesture({ gesture: "single", detail: 1, movement: 0 }), true);
  assert.equal(isMessageSelectionGesture({ gesture: "single", detail: 1, movement: 20 }), false);
  assert.equal(isMessageSelectionGesture({ gesture: "double", detail: 1, movement: 0 }), true);
  assert.equal(isMessageSelectionGesture({ gesture: "context", detail: 1, movement: 0 }), false);
  assert.equal(isMessageSelectionGesture({ gesture: "longpress", detail: 1, movement: 0 }), false);
});

test("click selection action supports provisional then confirm in double mode", () => {
  assert.equal(resolveClickSelectionAction({ gesture: "double", detail: 1, targetDomIndex: 2 }).action, "provisional");
  const t0 = 1_000_000;
  assert.equal(
    resolveClickSelectionAction({
      gesture: "double",
      detail: 1,
      targetDomIndex: 2,
      pendingDomIndex: 2,
      pendingAt: t0,
      now: t0 + 100,
      windowMs: DOUBLE_SELECT_WINDOW_MS,
    }).action,
    "confirm",
  );
  assert.equal(
    resolveClickSelectionAction({
      gesture: "double",
      detail: 1,
      targetDomIndex: 2,
      pendingDomIndex: 2,
      pendingAt: t0,
      now: t0 + DOUBLE_SELECT_WINDOW_MS + 50,
    }).action,
    "provisional",
  );
  assert.equal(
    resolveClickSelectionAction({
      gesture: "double",
      detail: 1,
      targetDomIndex: 3,
      pendingDomIndex: 2,
      pendingAt: t0,
      now: t0 + 100,
    }).action,
    "provisional",
  );
  assert.equal(resolveClickSelectionAction({ gesture: "single", detail: 1 }).action, "confirm");
  assert.equal(resolveClickSelectionAction({ gesture: "context", detail: 1, targetDomIndex: 1 }).action, "ignore");
  assert.equal(resolveClickSelectionAction({ gesture: "longpress", detail: 1, targetDomIndex: 1 }).action, "ignore");
});

test("text drag selects message only after real drag with selection", () => {
  assert.equal(shouldSelectMessageByTextDrag({ enabled: true, movement: 20, hasSelection: true }), true);
  assert.equal(shouldSelectMessageByTextDrag({ enabled: true, movement: 0, hasSelection: true }), false);
});

test("scroll settle tracker fires after idle and on settleNow", async () => {
  let n = 0;
  const t = createScrollSettleTracker({ delayMs: 20, onSettle: () => { n += 1; } });
  t.bump();
  t.bump();
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(n, 1);
  t.settleNow();
  assert.equal(n, 2);
  t.cancel();
});

test("scroll phase bus: active every sample, settle once after idle", async () => {
  let active = 0;
  let settle = 0;
  const bus = createScrollPhaseBus({
    settleDelayMs: 20,
    onActive: () => { active += 1; },
    onSettle: () => { settle += 1; },
  });
  bus.onScrollSample();
  bus.onScrollSample();
  assert.equal(active, 2);
  assert.equal(settle, 0);
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(settle, 1);
  bus.onScrollEnd();
  assert.equal(active, 3);
  assert.equal(settle, 2);
  bus.cancel();
});

test("stickySegChanged only when index changes", () => {
  assert.equal(stickySegChanged(0, 0), false);
  assert.equal(stickySegChanged(0, 1), true);
  assert.equal(stickySegChanged(null, 0), true);
  assert.equal(stickySegChanged(1, Number.NaN), false);
});

test("session guard confirms a real change only after two consistent observations", () => {
  const g = createSessionChangeGuard("a");
  assert.equal(g.observe("a"), false);
  assert.equal(g.observe("b"), false);
  assert.equal(g.observe("b"), true);
});

test("debounced save queue coalesces updates and never overlaps writes", async () => {
  const writes = [];
  let active = 0;
  let maxActive = 0;
  const q = createDebouncedSaveQueue(async (patch) => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    writes.push(patch);
    await new Promise((r) => setTimeout(r, 5));
    active -= 1;
  }, 15);
  q.enqueue({ a: 1 });
  q.enqueue({ b: 2 });
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0], { a: 1, b: 2 });
  assert.equal(maxActive, 1);
});

test("shouldRefreshGallery detects id list or order changes", () => {
  assert.equal(shouldRefreshGallery(["a", "b"], ["a", "b"]), false);
  assert.equal(shouldRefreshGallery(["a", "b"], ["b", "a"]), true);
});

test("shouldRewriteStickyThumb only when active card id changes", () => {
  assert.equal(shouldRewriteStickyThumb("a", "a"), false);
  assert.equal(shouldRewriteStickyThumb("a", "b"), true);
});

test("shouldKeepStickyThumbHidden only for the same card the user hid", () => {
  assert.equal(shouldKeepStickyThumbHidden(true, "a", "a"), true);
  assert.equal(shouldKeepStickyThumbHidden(true, "a", "b"), false);
});

test("claimStickyMarkerByCardId splices the active pin so partial swaps cannot orphan a duplicate", () => {
  const a = { card: { id: "a" }, thumb: {} };
  const b = { card: { id: "b" }, thumb: {} };
  const active = [a, b];
  assert.equal(claimStickyMarkerByCardId(active, "a"), a);
  assert.deepEqual(active, [b]);
  assert.equal(claimStickyMarkerByCardId(active, "a"), null);
  assert.equal(claimStickyMarkerByCardId(active, "b"), b);
  assert.deepEqual(active, []);
  assert.equal(claimStickyMarkerByCardId([{ card: { id: "x" } }], "x"), null);
});

test("resolveStickyThumbPct is 0 when collapsed, overlay off, or editor open", () => {
  assert.equal(resolveStickyThumbPct({ settingsPct: 120, alwaysOn: true, userCollapsed: false, editorOpen: false }), 120);
  assert.equal(resolveStickyThumbPct({ settingsPct: 120, alwaysOn: false, userCollapsed: false, editorOpen: false }), 0);
  assert.equal(resolveStickyThumbPct({ settingsPct: 120, alwaysOn: true, userCollapsed: true, editorOpen: false }), 0);
  assert.equal(resolveStickyThumbPct({ settingsPct: 120, alwaysOn: true, userCollapsed: false, editorOpen: true }), 0);
  assert.equal(resolveStickyThumbPct({ settingsPct: 0, alwaysOn: true, userCollapsed: false, editorOpen: false }), 0);
});

test("stickyThumbBoxFromPct allows 0 size for hide-by-pct", () => {
  assert.deepEqual(stickyThumbBoxFromPct(0, 200, 160), { pct: 0, w: 0, h: 0 });
  assert.deepEqual(stickyThumbBoxFromPct(100, 200, 160), { pct: 100, w: 200, h: 160 });
  assert.deepEqual(stickyThumbBoxFromPct(50, 200, 160), { pct: 50, w: 100, h: 80 });
});

test("fitBoxInside preserves landscape/square/portrait inside envelope", () => {
  // landscape 1216x832 in 528x720 envelope
  assert.deepEqual(fitBoxInside(528, 720, 1216, 832), { w: 528, h: 361 });
  // square
  assert.deepEqual(fitBoxInside(528, 720, 1024, 1024), { w: 528, h: 528 });
  // portrait (fits height-limited)
  assert.deepEqual(fitBoxInside(528, 720, 832, 1216), { w: 493, h: 720 });
  // unknown dims → envelope
  assert.deepEqual(fitBoxInside(528, 720, 0, 0), { w: 528, h: 720 });
});

test("composeStickyThumbHtml uses contain (full image, no crop)", () => {
  const html = composeStickyThumbHtml("new", "old");
  assert.match(html, /new/);
  assert.match(html, /object-fit:contain/);
  assert.match(html, /background:transparent/);
  assert.doesNotMatch(html, /background:#0b0f18/);
  assert.equal((html.match(/<img/g) || []).length, 1);
});

test("composeStickyThumbHtml empty placeholder is transparent", () => {
  const html = composeStickyThumbHtml("", "");
  assert.match(html, /background:transparent/);
  assert.doesNotMatch(html, /background:#0b0f18/);
});

test("sticky v2 free layout: past midline uses left-center, before uses right-center", () => {
  assert.equal(stickyV2AnchorSide(100, 400), "right");
  assert.equal(stickyV2AnchorSide(200, 400), "left");
  const leftHalf = stickyV2FreeLayout({
    pinX: 80, pinY: 200, imgW: 120, imgH: 180, pinSize: 28, viewportW: 400, viewportH: 800,
  });
  assert.equal(leftHalf.side, "right");
  assert.equal(leftHalf.image.left, 80 - 120);
  assert.equal(leftHalf.image.top, 200 - 90);
  // ▲▼ meet at attachment Y with no blank pin gap.
  assert.equal(leftHalf.aboveBadge.top + leftHalf.aboveBadge.size, leftHalf.belowBadge.top);
  assert.equal(leftHalf.aboveBadge.top + leftHalf.aboveBadge.size, 200);
  const rightHalf = stickyV2FreeLayout({
    pinX: 300, pinY: 200, imgW: 120, imgH: 180, pinSize: 28, viewportW: 400, viewportH: 800,
  });
  assert.equal(rightHalf.side, "left");
  assert.equal(rightHalf.image.left, 300);
});

test("sticky v2 corner layout stacks ▲▼ flush at viewport top-center", () => {
  const top = stickyV2CornerLayout({
    corner: "top-right", imgW: 100, imgH: 150, viewportW: 400, viewportH: 800, pad: 12, pinSize: 28, gap: 6,
  });
  assert.equal(top.aboveBadge.left, Math.round(400 / 2 - 14));
  assert.equal(top.aboveBadge.top, 12);
  assert.equal(top.belowBadge.top, 12 + 28);
  assert.equal(top.aboveBadge.top + top.aboveBadge.size, top.belowBadge.top);
  assert.equal(top.leftBadge, null);
  assert.equal(top.rightBadge, null);
  assert.ok(top.image.left > 200);
  const bot = stickyV2CornerLayout({
    corner: "bottom-left", imgW: 100, imgH: 150, viewportW: 400, viewportH: 800, pad: 12, pinSize: 28, gap: 6,
  });
  assert.equal(bot.aboveBadge.left, top.aboveBadge.left);
  assert.equal(bot.aboveBadge.top, top.aboveBadge.top);
  assert.equal(bot.belowBadge.top, top.belowBadge.top);
  assert.equal(bot.image.left, 12);
  assert.ok(bot.image.top > 400);
});

test("sticky v2 shot counts and pure-image html", () => {
  assert.deepEqual(stickyV2ShotCounts(2, 5), { above: 2, below: 2 });
  assert.deepEqual(stickyV2ShotCounts(0, 3), { above: 0, below: 2 });
  const html = composeStickyV2ThumbHtml("data:image/png;base64,xx");
  assert.match(html, /object-fit:fill/);
  assert.doesNotMatch(html, /object-fit:contain/);
});

test("stickyThumbNeedsHtmlPaint skips when already painted", () => {
  assert.equal(stickyThumbNeedsHtmlPaint("x", "x", "a", "a"), false);
  assert.equal(stickyThumbNeedsHtmlPaint("x", "y", "a", "a"), true);
  assert.equal(stickyThumbNeedsHtmlPaint("x", "x", "a", "b"), true);
});

test("stickyThumbSizeForImage uses max-edge budget so landscape is not crushed", () => {
  // Portrait envelope 300×440 → square budget 440
  // landscape 1216×832 → 440×301 (not 300×205)
  assert.deepEqual(stickyThumbSizeForImage(300, 440, 1216, 832), { w: 440, h: 301 });
  // portrait 832×1216 → 301×440
  assert.deepEqual(stickyThumbSizeForImage(300, 440, 832, 1216), { w: 301, h: 440 });
  // missing image → fallback dims
  assert.deepEqual(stickyThumbSizeForImage(300, 440, 0, 0, 1024, 1024), { w: 440, h: 440 });
  // viewport clamp (narrow phone)
  assert.deepEqual(
    stickyThumbSizeForImage(300, 440, 1216, 832, 0, 0, { width: 360, height: 800, pad: 16 }),
    { w: 328, h: 224 },
  );
});

test("stickyThumbStyleWithSize rewrites width/height only", () => {
  const s = stickyThumbStyleWithSize("position:fixed;right:16px;bottom:16px;width:200px;height:300px", 180, 120);
  assert.match(s, /width:180px/);
  assert.match(s, /height:120px/);
  assert.match(s, /right:16px/);
});

test("probeDataUrlPixelSize reads PNG IHDR", () => {
  // Minimal PNG header bytes: sig + IHDR len/type + 10x20 + rest padded
  const ihdr = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x0a, 0x00, 0x00, 0x00, 0x14,
  ]);
  let b64 = Buffer.from(ihdr).toString("base64");
  const url = `data:image/png;base64,${b64}`;
  assert.deepEqual(probeDataUrlPixelSize(url), { w: 10, h: 20 });
});

test("probeDataUrlPixelSize ignores huge payload tail (header-only parse)", () => {
  const ihdr = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x0a, 0x00, 0x00, 0x00, 0x14,
  ]);
  const b64 = Buffer.from(ihdr).toString("base64") + "A".repeat(2_000_000);
  const url = `data:image/png;base64,${b64}`;
  const t0 = Date.now();
  assert.deepEqual(probeDataUrlPixelSize(url), { w: 10, h: 20 });
  assert.ok(Date.now() - t0 < 200, "header probe must not scan multi-MB payload");
});

test("stickyCornerImageBox places image in viewport corners with pad", () => {
  const box = stickyCornerImageBox("bottom-right", { w: 200, h: 160 }, { width: 1000, height: 800 }, 8);
  assert.ok(box.left > 0);
});

test("stickyCornerEdgeBox anchors with right/bottom so resize does not need left recompute", () => {
  const box = stickyCornerEdgeBox("bottom-right", { w: 200, h: 160 }, 8);
  assert.equal(box.right, 8);
  assert.equal(box.bottom, 8);
});

test("stickyPinEdgeBox keeps pin on corner image via matching edge insets", () => {
  const pin = stickyPinEdgeBox("bottom-right", { w: 200, h: 160 }, 28, 6, 8);
  assert.ok(pin.size === 28);
});

test("stickyPinOverImage centers pin on image top edge", () => {
  assert.deepEqual(stickyPinOverImage({ left: 100, top: 50, w: 200, h: 160 }, 28, 6), { left: 186, top: 44 });
});

test("resolveChatMessageMatch: data-chat-index maps API row even if DOM count differs", () => {
  const messages = [
    { index: 0, role: "user", text: "유저첫말입니다아아아아" },
    { index: 1, role: "char", text: "캐릭터중간응답본문입니다" },
    { index: 2, role: "char", text: "사원증의 이름을 확인하는 순간, 손끝에 와닿는 감촉이" },
  ];
  const hit = resolveChatMessageMatch("아무글자", messages, 0, 1, { chatIndex: 2 });
  assert.equal(hit.chatIndex, 2);
  assert.equal(hit.role, "char");
  assert.equal(hit.matchMethod, "attr");
});

test("resolveChatMessageMatch: DOM#0 newest maps to last API message (reverse only)", () => {
  const messages = [
    { index: 0, role: "user", text: "유저첫말입니다아아아아" },
    { index: 1, role: "char", text: "캐릭터중간응답본문입니다" },
    { index: 2, role: "char", text: "사원증의 이름을 확인하는 순간, 손끝에 와닿는 감촉이" },
  ];
  const hit = resolveChatMessageMatch("아무글자", messages, 0, 3);
  assert.equal(hit.chatIndex, 2);
  assert.equal(hit.role, "char");
  assert.equal(hit.matchMethod, "reverse");
});

test("resolveChatMessageMatch reverse ignores text content", () => {
  const messages = [
    { index: 0, role: "char", text: "첫 인사입니다. 세이칸에 오신 것을 환영합니다." },
    { index: 1, role: "user", text: "태양\n어서오세요 라고합니다" },
    { index: 2, role: "char", text: "볼륨 1: 세이칸의 첫 손님\n챕터 2: 낯선 문턱\n유리문이 닫히며… 태양: 어서 오세요." },
  ];
  // Even if DOM text looks like msg#2, DOM#1 must map to API#1 by reverse only.
  const hit = resolveChatMessageMatch(messages[2].text, messages, 1, 3);
  assert.equal(hit.chatIndex, 1);
  assert.equal(hit.role, "user");
  assert.equal(hit.matchMethod, "reverse");
});

test("resolveChatMessageMatch reverse maps DOM order newest-first", () => {
  const messages = [
    { index: 0, role: "char", text: "안녕하세요여긴첫번째" },
    { index: 1, role: "user", text: "하이라고합니다유저" },
    { index: 2, role: "char", text: "반가워요여긴최신캐릭터" },
  ];
  assert.equal(resolveChatMessageMatch("관련없는짧은", messages, 0, 3).chatIndex, 2);
  assert.equal(resolveChatMessageMatch("관련없는짧은", messages, 1, 3).chatIndex, 1);
  assert.equal(resolveChatMessageMatch("관련없는짧은", messages, 2, 3).chatIndex, 0);
  assert.equal(resolveChatMessageMatch(messages[1].text, messages, 1, 3).role, "user");
  assert.equal(resolveChatMessageMatch(messages[1].text, messages, 1, 3).matchMethod, "reverse");
});

test("resolveChatMessageMatch out-of-range DOM clamps by reverse", () => {
  const messages = [
    { index: 0, role: "user", text: "짧은유저말입니다요" },
    { index: 1, role: "char", text: "긴캐릭터응답본문입니다요" },
  ];
  // reverseIdx = 2-1-9 = -8 → clamp to 0
  const hit = resolveChatMessageMatch("긴캐릭터응답본문입니다요", messages, 9, 2);
  assert.equal(hit.matchMethod, "reverse");
  assert.equal(hit.chatIndex, 0);
  assert.equal(hit.role, "user");
});

test("AOS case: DOM#1 (char bubble under newest user) maps to API char by reverse", () => {
  const option = "😀1. 가게 안을 한 번 더 정리하고, 오후 손님을 기다리며 휴식";
  const charBody = "마사지실을 나서며 유카코는 한 번 몸을 크게 젖혔다. 네, 오늘은 상체 코스라 4천엔입니다.";
  const messages = [
    { index: 5, role: "user", text: "이전유저입력입니다요" },
    { index: 6, role: "char", text: charBody },
    { index: 7, role: "user", text: option },
  ];
  // Newest DOM#0 = user option → API#7; DOM#1 = char bubble → API#6
  assert.equal(resolveChatMessageMatch(option, messages, 0, 3).chatIndex, 7);
  assert.equal(resolveChatMessageMatch(option, messages, 0, 3).role, "user");
  const charHit = resolveChatMessageMatch(`헤더\n${charBody}\n${option}`, messages, 1, 3);
  assert.equal(charHit.chatIndex, 6);
  assert.equal(charHit.role, "char");
  assert.equal(charHit.matchMethod, "reverse");
});

test("selection role uses message.role, not generationInfo presence", () => {
  assert.equal(hasGenerationInfo({ generationInfo: { model: "gpt" } }), true);
  assert.equal(roleFromGenerationInfo({ role: "char" }), "user"); // geninfo hint only
  assert.equal(isCharMessageRole({ role: "char" }), true);
  assert.equal(isCharMessageRole({ role: "char", generationInfo: null }), true);
  assert.equal(isCharMessageRole({ role: "user", generationInfo: { model: "x" } }), false);
  assert.equal(isCharMessageRole("assistant"), true);
  const hit = resolveChatMessageMatch("오프닝문구입니다아", [{ index: 0, role: "char", text: "오프닝문구입니다아" }], 0, 1);
  assert.equal(hit.role, "char");
  assert.equal(hit.matchMethod, "reverse");
});

test("pickInlineKeepDomIndices allRoles keeps selected ±1", () => {
  const roles = ["user", "char", "user", "char", "user"];
  const isCharAt = (i) => isCharMessageRole(roles[i]);
  assert.deepEqual(
    pickInlineKeepDomIndices({ selIdx: 2, length: 5, allRoles: true, isCharAt }).sort((a, b) => a - b),
    [1, 2, 3],
  );
  assert.equal(INLINE_KEEP_MAX_PER_SIDE, 1);
});

test("pickInlineKeepDomIndices skips users and keeps 1 char each side", () => {
  // DOM newest-first: idx0 below … idx8 above. Selected user at 4.
  // Roles: C U C U [U] U C U C → nearest char below=2, above=6
  const roles = ["char", "user", "char", "user", "user", "user", "char", "user", "char"];
  const isCharAt = (i) => isCharMessageRole(roles[i]);
  assert.deepEqual(
    pickInlineKeepDomIndices({ selIdx: 4, length: 9, allRoles: false, isCharAt }).sort((a, b) => a - b),
    [2, 6],
  );
});

test("pickInlineKeepDomIndices skips lightboard-only bodies like users", () => {
  const roles = ["char", "char", "char", "user", "char", "user", "char", "char", "char"];
  const skip = new Set([2, 6]);
  const isCharAt = (i) => isCharMessageRole(roles[i]);
  const isSkipBodyAt = (i) => skip.has(i);
  assert.deepEqual(
    pickInlineKeepDomIndices({ selIdx: 4, length: 9, allRoles: false, isCharAt, isSkipBodyAt }).sort((a, b) => a - b),
    [1, 4, 7],
  );
});

test("pickInlineKeepDomIndices keeps selected char plus 1 each side (max 3)", () => {
  // C U C U [C] U C U C — selected char at 4 → sel + 1 above + 1 below
  const roles = ["char", "user", "char", "user", "char", "user", "char", "user", "char"];
  const isCharAt = (i) => isCharMessageRole(roles[i]);
  assert.deepEqual(
    pickInlineKeepDomIndices({ selIdx: 4, length: 9, allRoles: false, isCharAt }).sort((a, b) => a - b),
    [2, 4, 6],
  );
});

test("desiredInlinePlacements claims ready cards before pending on the same line", () => {
  const src = (card) => String(card.id === "c1" ? "data:image/png;base64,xx" : "");
  const got = desiredInlinePlacements(
    [{ id: "c1", line: 2, shot_index: 0 }],
    [{ line: 2, shot_index: 0 }, { line: 5, shot_index: 1 }],
    src,
  );
  assert.deepEqual(
    got.placements.map((p) => ({ line: p.line, cardId: p.cardId, pending: !!p.pending })),
    [
      { line: 2, cardId: "c1", pending: false },
      { line: 5, cardId: "pending-1", pending: true },
    ],
  );
  assert.equal(got.encodeLater.length, 0);
});

test("desiredInlinePlacements holds a linked card without bytes so pending cannot cover it", () => {
  const got = desiredInlinePlacements(
    [{ id: "c2", line: 3, shot_index: 1 }],
    [{ line: 3, shot_index: 1 }, { line: 4, shot_index: 2 }],
    () => "",
  );
  assert.deepEqual(got.encodeLater.map((c) => c.id), ["c2"]);
  assert.deepEqual(
    got.placements.map((p) => ({ line: p.line, cardId: p.cardId, pending: !!p.pending })),
    [{ line: 4, cardId: "pending-2", pending: true }],
  );
});

test("desiredInlinePaintKey changes when pending becomes a card", () => {
  const pending = desiredInlinePaintKey([{ line: 1, src: "", cardId: "pending-0", pending: true }]);
  const ready = desiredInlinePaintKey([{ line: 1, src: "data:image/png;base64,xx", cardId: "c9", pending: false }]);
  assert.notEqual(pending, ready);
});

test("reconcileInlineShot pending replaces an old card marker", () => {
  const pending = { line: 1, src: "", cardId: "pending-0", pending: true };
  assert.deepEqual(reconcileInlineShot(pending, { cardId: "old-card", pending: false }), {
    op: "swap",
    placement: pending,
  });
});

test("reconcileInlineShot ready card replaces a spinner", () => {
  const ready = { line: 1, src: "data:image/png;base64,xx", cardId: "c3", pending: false };
  assert.deepEqual(reconcileInlineShot(ready, { cardId: "pending-0", pending: true }), {
    op: "swap",
    placement: ready,
  });
});

test("reconcileInlineShot same ready id stays put", () => {
  const ready = { line: 1, src: "data:image/png;base64,xx", cardId: "c3", pending: false };
  assert.equal(reconcileInlineShot(ready, { cardId: "c3", pending: false }).op, "keep");
});

test("reconcileInlineShot strips a live marker when nothing is desired", () => {
  assert.deepEqual(reconcileInlineShot(null, { cardId: "old-card" }), { op: "strip" });
});

test("reconcileInlineShot prepends when the host is empty", () => {
  const pending = { line: 2, src: "", cardId: "pending-1", pending: true };
  assert.deepEqual(reconcileInlineShot(pending, null), { op: "prepend", placement: pending });
});

test("reconcileInlineShot swaps an unread live marker instead of stacking a second shot", () => {
  const pending = { line: 1, src: "", cardId: "pending-0", pending: true };
  assert.deepEqual(reconcileInlineShot(pending, { cardId: "", pending: false }), {
    op: "swap",
    placement: pending,
  });
});

test("reconcileInlineShot holds a linked card that still has no bytes", () => {
  const hold = { line: 3, src: "", cardId: "c2", pending: false };
  assert.equal(reconcileInlineShot(hold, { cardId: "pending-1", pending: true }).op, "keep");
});

test("leftover strip ignores unread ids so a just-placed shot is not deleted", () => {
  assert.equal(shouldStripLeftoverInlineId("", ["c3"]), false);
  assert.equal(shouldStripLeftoverInlineId("c3", ["c3"]), false);
  assert.equal(shouldStripLeftoverInlineId("old-card", ["c3", "pending-0"]), true);
});

test("leftover strip can drop unread markers while pending spinners are the desired set", () => {
  assert.equal(shouldStripLeftoverInlineId("", ["pending-0"], true), true);
  assert.equal(shouldStripLeftoverInlineId("pending-0", ["pending-0"], true), false);
  assert.equal(shouldStripLeftoverInlineId("old-card", ["pending-0"], true), true);
});

test("rawMessageRole reads API fields like Archive (never invents from body)", () => {
  assert.equal(rawMessageRole({ role: "user" }), "user");
  assert.equal(rawMessageRole({ role: "char" }), "char");
  assert.equal(rawMessageRole({ role: "assistant" }), "char");
  assert.equal(rawMessageRole({ type: "bot" }), "char");
  assert.equal(rawMessageRole({ isUser: true, role: "char" }), "user");
  assert.equal(rawMessageRole({ isChar: true }), "char");
  assert.equal(rawMessageRole({ role: "system" }), "system");
  assert.equal(rawMessageRole({ text: "태양" }), "");
});

test("visibleGalleryImageIds returns nearby unique ids", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
  assert.deepEqual(visibleGalleryImageIds(items, 0, 1, 3), ["a", "b", "c"]);
  assert.deepEqual(visibleGalleryImageIds(items, 2, 1, 3), ["b", "c", "d"]);
  assert.deepEqual(visibleGalleryImageIds(items, 1, 0, 1), ["b"]);
});

test("visibleGalleryImageIds caps eager loads at maxCount 8", () => {
  const items = Array.from({ length: 12 }, (_, i) => ({ id: `i${i}` }));
  assert.equal(visibleGalleryImageIds(items, 5, 10, 8).length, 8);
});

test("visibleGalleryImageIds pins current-message prefix when focus is on the right strip", () => {
  const items = Array.from({ length: 11 }, (_, i) => ({ id: `i${i}` }));
  // 3 current + 8 others; focus on last other — left 3 must still warm.
  const ids = visibleGalleryImageIds(items, 10, 1, 11, 3);
  assert.ok(ids.includes("i0"));
  assert.ok(ids.includes("i1"));
  assert.ok(ids.includes("i2"));
  assert.equal(ids.length, 11);
});

test("nearbyMessageImageIds warms focus message ±1 by message_index", () => {
  const cards = [
    { id: "a", session_id: "s", message_index: 0 },
    { id: "b", session_id: "s", message_index: 1 },
    { id: "c", session_id: "s", message_index: 2 },
    { id: "d", session_id: "s", message_index: 3 },
    { id: "x", session_id: "other", message_index: 1 },
  ];
  const ids = nearbyMessageImageIds(cards, { messageIndex: 1, sessionId: "s" }, 1, ["b"]);
  assert.deepEqual(ids.sort(), ["a", "b", "c"]);
});

test("nearbyMessageImageIds default radius is ±2", () => {
  const cards = [
    { id: "a", session_id: "s", message_index: 0 },
    { id: "b", session_id: "s", message_index: 1 },
    { id: "c", session_id: "s", message_index: 2 },
    { id: "d", session_id: "s", message_index: 3 },
    { id: "e", session_id: "s", message_index: 4 },
  ];
  const ids = nearbyMessageImageIds(cards, { messageIndex: 2, sessionId: "s" });
  assert.deepEqual(ids.sort(), ["a", "b", "c", "d", "e"]);
});

test("isNearbyDomIndex and nearbyDomIndexWindow cover ±2", () => {
  assert.equal(isNearbyDomIndex(5, 7, 2), true);
  assert.equal(isNearbyDomIndex(5, 8, 2), false);
  assert.deepEqual(nearbyDomIndexWindow(5, 10, 2), { lo: 3, hi: 7, center: 5 });
  assert.deepEqual(nearbyDomIndexWindow(0, 3, 2), { lo: 0, hi: 2, center: 0 });
});

test("resolveIndexProgress prefers warm indexing then tagging", () => {
  assert.equal(resolveIndexProgress({ warmBusy: true, warmPct: 40 }).label, "인덱싱");
  assert.equal(resolveIndexProgress({ warmBusy: true, warmPct: 40 }).pct, 40);
  assert.equal(resolveIndexProgress({ jobState: "tagging", jobPct: 55 }).pct, 55);
  assert.equal(resolveIndexProgress({ jobState: "generating", jobPct: 80 }).busy, false);
});

test("composeDualProgressBarsHtml stacks purple then mint rails", () => {
  const html = composeDualProgressBarsHtml({ jobPct: 50, indexPct: 25, jobBusy: true, indexBusy: true });
  assert.match(html, /#7c6cff/);
  assert.match(html, /#2dd4bf/);
  assert.match(html, /width:50%/);
  assert.match(html, /width:25%/);
  assert.match(html, /flex-direction:column/);
});

test("composeProgressToastHtml shows stage and a single rail when busy", () => {
  assert.equal(composeProgressToastHtml({}), "");
  const html = composeProgressToastHtml({
    stage: "장면 태깅",
    meta: "2/4 · 30% · 18s",
    pct: 30,
    busy: true,
  });
  assert.match(html, /data-inlay-progress-toast/);
  assert.match(html, /장면 태깅/);
  assert.match(html, /2\/4 · 30% · 18s/);
  assert.match(html, /#7c6cff/);
  assert.match(html, /width:30%/);
  assert.match(html, /flex-direction:column/);
  assert.match(html, /text-overflow:ellipsis/);
  assert.match(html, /height:3px/);
  assert.match(html, /padding:6px 10px/);
  assert.match(html, /width:min\(280px/);
  assert.doesNotMatch(html, /#2dd4bf/);
});

test("composeProgressToastHtml uses mint rail for indexing tone", () => {
  const html = composeProgressToastHtml({
    stage: "인덱싱",
    meta: "45%",
    pct: 45,
    busy: true,
    tone: "index",
  });
  assert.match(html, /#2dd4bf/);
  assert.match(html, /#5eead4/);
  assert.doesNotMatch(html, /#7c6cff/);
});

test("composeProgressToastHtml can omit the bar for idle selection peeks", () => {
  const html = composeProgressToastHtml({
    stage: "채팅A · 캐릭B",
    meta: "3장 · 오늘 카페에서",
    busy: true,
    showBar: false,
  });
  assert.match(html, /채팅A · 캐릭B/);
  assert.match(html, /3장 · 오늘 카페에서/);
  assert.match(html, /width:min\(280px/);
  assert.doesNotMatch(html, /height:3px/);
  assert.doesNotMatch(html, /#7c6cff/);
});

test("formatProgressElapsedSec formats seconds and minutes", () => {
  assert.equal(formatProgressElapsedSec(0), "0s");
  assert.equal(formatProgressElapsedSec(18_000), "18s");
  assert.equal(formatProgressElapsedSec(65_000), "1m 05s");
});

test("mergeViewerPaintJob keeps the fuller pending mode", () => {
  assert.equal(mergeViewerPaintJob("chrome", "content"), "content");
  assert.equal(mergeViewerPaintJob("content", "chrome"), "content");
});

test("evenAnchorPercent uses equal band starts (0..100 split by count)", () => {
  assert.equal(evenAnchorPercent(0, 3), 0);
  assert.ok(Math.abs(evenAnchorPercent(1, 3) - 100 / 3) < 1e-9);
  assert.ok(Math.abs(evenAnchorPercent(2, 3) - 200 / 3) < 1e-9);
});

test("resolveCardAnchorPercent prefers y_percent unless forceEven", () => {
  assert.equal(resolveCardAnchorPercent({ y_percent: 40 }, 0, 2, { forceEven: false }), 40);
  assert.equal(resolveCardAnchorPercent({ y_percent: 40 }, 1, 2, { forceEven: true }), 50);
});

test("equal band starts map sticky segments to 0-25 / 25-50 / …", () => {
  assert.equal(activeSegmentIndex([0, 25, 50, 75], 10), 0);
  assert.equal(activeSegmentIndex([0, 25, 50, 75], 30), 1);
});

test("stickySegmentForInlineChat prefers shot nearest the pointer", () => {
  const rect = { top: 0, bottom: 100, height: 100, left: 0, right: 200, width: 200 };
  // Mid-message pointer is closer to 75% than 0%/25%/50%.
  assert.equal(stickySegmentForInlineChat({
    inlineChatOn: true,
    pointerX: 100,
    pointerY: 70,
    messageRect: rect,
    markerPercents: [0, 25, 50, 75],
    fallbackSegment: 0,
  }), 3);
  // Off → keep reading-band fallback.
  assert.equal(stickySegmentForInlineChat({
    inlineChatOn: false,
    pointerX: 100,
    pointerY: 70,
    messageRect: rect,
    markerPercents: [0, 25, 50, 75],
    fallbackSegment: 1,
  }), 1);
  // Live DOM center wins over y% projection.
  assert.equal(stickySegmentForInlineChat({
    inlineChatOn: true,
    pointerX: 10,
    pointerY: 12,
    messageRect: rect,
    markerPercents: [0, 90],
    markerCenters: [{ x: 10, y: 10 }, null],
    fallbackSegment: -1,
  }), 0);
  // Pointer inside a live rect wins even when nearer another center.
  assert.equal(stickySegmentForInlineChat({
    inlineChatOn: true,
    pointerX: 55,
    pointerY: 55,
    messageRect: rect,
    markerPercents: [0, 90],
    markerCenters: [{ x: 10, y: 10 }, { x: 90, y: 90 }],
    markerRects: [
      { left: 0, right: 20, top: 0, bottom: 20 },
      { left: 50, right: 80, top: 50, bottom: 80 },
    ],
    fallbackSegment: -1,
  }), 1);
  assert.deepEqual(markerAnchorClientPoint(rect, 50), { x: 100, y: 50 });
  assert.equal(nearestSegmentByClientPoint([{ x: 0, y: 0 }, { x: 100, y: 100 }], 90, 90), 1);
});

test("reading percent and segment index follow 20/40/80 bands", () => {
  // Mid-viewport line on bottom edge still counts as inside → 60%.
  assert.equal(readingPercentInMessage({ top: -10, bottom: 50, height: 100 }, 100, 0.5), 60);
  assert.equal(clampReadingPercent({ top: 80, bottom: 120, height: 40 }, 100, 0.5), 0);
  // Sole marker ≤20% is remapped to 1% → reading 10 already activates segment 0.
  assert.equal(activeSegmentIndex([20, 40, 80], 10), 0);
  assert.equal(activeSegmentIndex([20, 40, 80], 25), 0);
  assert.equal(activeSegmentIndex([40, 80], 10), -1);
});

test("gallerySelectedCount counts unique selected cards", () => {
  const cards = [
    { id: "a", content_hash: "h", message_index: 1 },
    { id: "b", content_hash: "h", message_index: 1 },
  ];
  assert.equal(gallerySelectedCount(cards, { hash: "h", chatIndex: 1 }), 2);
});

test("normalizeMatchText is stable across repeated calls (cache)", () => {
  const s = "Hello, 월드!! [LBDATA START]x[LBDATA END] 123";
  assert.equal(normalizeMatchText(s), normalizeMatchText(s));
  assert.equal(normalizeMatchText(s), "hello월드123");
});

test("prefixMatchRatio links streaming 70% preview to 100% final text", () => {
  const base = "나는천재입니다진짜천재라고요이문장은충분히길어야합니다추가텍스트";
  const partial = base.slice(0, Math.floor(base.length * 0.7));
  const full = base + "그리고완성되었습니다";
  assert.ok(prefixMatchRatio(full, partial) >= 0.6);
  assert.ok(prefixMatchRatio(partial, full) >= 0.6);
  assert.ok(prefixMatchRatio("완전히다른내용입니다완전히다른내용입니다완전히", partial) < 0.6);
});

test("prefixMatchRatio tolerates a few opening-character edits", () => {
  const body = "나는천재입니다진짜천재라고요이문장은충분히길어야합니다추가텍스트그리고더길게";
  const a = `가${body}`;
  const b = `나${body}`;
  assert.ok(prefixMatchRatio(a, b) >= 0.6);
  assert.ok(prefixMatchRatio(a, `완전히다른이야기완전다른이야기완전다른이야기`) < 0.6);
});

test("linkCardsForMessage is exact hash only", () => {
  const partial = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789가나다라마바사아자차카타파하";
  const full = partial + "EXTRA_TAIL_TEXT_HERE";
  const cards = [
    { id: "old", content_hash: "h-old", assistant_preview: partial, paragraph: 0, shot_index: 0, created_at: 1 },
    { id: "new", content_hash: "h-new", assistant_preview: full, paragraph: 0, shot_index: 0, created_at: 2 },
  ];
  assert.deepEqual(linkCardsForMessage(cards, { hash: "h-new", text: full }).map((c) => c.id), ["new"]);
  assert.deepEqual(linkCardsForMessage(cards, { hash: "h-missing", text: full }), []);
});

test("findCardsForMessageIdentity matches turn without hash/Dice", () => {
  const base = {
    id: "c1",
    content_hash: "h-stream",
    character_id: "charA",
    chat_id: "chatA",
    session_id: "sessA",
    message_index: 36,
    message_role: "char",
    paragraph: 0,
    shot_index: 0,
    created_at: 1,
  };
  const identity = {
    characterId: "charA",
    chatId: "chatA",
    sessionId: "sessA",
    messageIndex: 36,
    role: "assistant",
  };
  assert.deepEqual(findCardsForMessageIdentity([base], identity).map((c) => c.id), ["c1"]);
  assert.deepEqual(findCardsForMessageIdentity([{ ...base, content_hash: "h-final" }], identity).map((c) => c.id), ["c1"]);
  assert.deepEqual(findCardsForMessageIdentity([{ ...base, character_id: "other" }], identity), []);
  assert.deepEqual(findCardsForMessageIdentity([{ ...base, message_index: 35 }], identity), []);
  assert.deepEqual(findCardsForMessageIdentity([{ ...base, message_role: "" }], identity), []);
});

test("jobMatchesMessageIdentity ignores hash and Dice", () => {
  const meta = {
    saveContentHash: "h-stream",
    sourcePreview: "anything",
    sessionId: "sessA",
    characterId: "charA",
    chatId: "chatA",
    messageIndex: 36,
    messageRole: "char",
  };
  const identity = {
    sessionId: "sessA",
    characterId: "charA",
    chatId: "chatA",
    messageIndex: 36,
    role: "assistant",
  };
  assert.equal(jobMatchesMessageIdentity(meta, identity), true);
  assert.equal(jobMatchesMessageIdentity({ ...meta, messageIndex: 35 }, identity), false);
  assert.equal(jobMatchesMessageIdentity({ ...meta, cancelRequested: true }, identity), false);
});

test("findHashRebindCandidates requires same character/chat/msg/role and Dice>=60%", () => {
  const body = "나는천재입니다진짜천재라고요이문장은충분히길어야합니다추가텍스트그리고더길게완성본";
  const preview = body.slice(0, Math.floor(body.length * 0.75));
  const base = {
    id: "c1",
    content_hash: "h-stream",
    assistant_preview: preview,
    character_id: "charA",
    chat_id: "chatA",
    session_id: "sessA",
    message_index: 36,
    message_role: "char",
    paragraph: 0,
    shot_index: 0,
    created_at: 1,
  };
  const identity = {
    newHash: "h-final",
    text: body,
    characterId: "charA",
    chatId: "chatA",
    sessionId: "sessA",
    messageIndex: 36,
    role: "assistant",
  };
  assert.deepEqual(findHashRebindCandidates([base], identity).map((c) => c.id), ["c1"]);
  assert.deepEqual(findHashRebindCandidates([{ ...base, character_id: "other" }], identity), []);
  assert.deepEqual(findHashRebindCandidates([{ ...base, chat_id: "other" }], identity), []);
  assert.deepEqual(findHashRebindCandidates([{ ...base, message_index: 35 }], identity), []);
  assert.deepEqual(findHashRebindCandidates([{ ...base, message_role: "user" }], identity), []);
  assert.deepEqual(findHashRebindCandidates([{ ...base, message_role: "" }], identity), []);
  assert.deepEqual(findHashRebindCandidates([{ ...base, content_hash: "h-final" }], identity), []);
  // Mid-job: some shots already rebound to h-final — remaining old-hash siblings stay eligible.
  assert.deepEqual(
    findHashRebindCandidates(
      [
        { ...base, id: "done", content_hash: "h-final", shot_index: 0 },
        { ...base, id: "late", content_hash: "h-stream", shot_index: 1, created_at: 2 },
      ],
      identity,
    ).map((c) => c.id),
    ["late"],
  );
});

test("canRetargetJobSaveHash requires identity + Dice>=60% and skips already-retargeted", () => {
  const body = "나는천재입니다진짜천재라고요이문장은충분히길어야합니다추가텍스트그리고더길게완성본";
  const preview = body.slice(0, Math.floor(body.length * 0.75));
  const meta = {
    saveContentHash: "h-stream",
    sourcePreview: preview,
    sessionId: "sessA",
    characterId: "charA",
    chatId: "chatA",
    messageIndex: 36,
    messageRole: "char",
  };
  const identity = {
    toHash: "h-final",
    text: body,
    sessionId: "sessA",
    characterId: "charA",
    chatId: "chatA",
    messageIndex: 36,
    role: "assistant",
  };
  assert.equal(canRetargetJobSaveHash(meta, identity), true);
  assert.equal(canRetargetJobSaveHash({ ...meta, saveContentHash: "h-final" }, identity), false);
  assert.equal(canRetargetJobSaveHash({ ...meta, characterId: "other" }, identity), false);
  assert.equal(canRetargetJobSaveHash({ ...meta, messageIndex: 35 }, identity), false);
  assert.equal(canRetargetJobSaveHash({ ...meta, messageRole: "user" }, identity), false);
  assert.equal(
    canRetargetJobSaveHash(meta, { ...identity, text: "완전히다른이야기완전다른이야기완전다른이야기완전다른" }),
    false,
  );
});

test("gallery match ignores stale message_index without content_hash", () => {
  const cards = [
    { id: "a", content_hash: "old-hash", message_index: 3, paragraph: 0, created_at: 1 },
  ];
  // After delete, chatIndex 3 is a different turn — must not attach via index alone.
  assert.equal(gallerySelectedCount(cards, { hash: "new-hash", chatIndex: 3 }), 0);
  assert.equal(galleryForMessage(cards, { hash: "new-hash", chatIndex: 3 }, 8)[0]?.id, "a");
  assert.notEqual(galleryForMessage(cards, { hash: "new-hash", chatIndex: 3 }, 8)[0]?.content_hash, "new-hash");
  assert.equal(gallerySelectedCount(cards, { hash: "old-hash", chatIndex: 99 }), 1);
});

test("short user word still maps by reverse DOM index only", () => {
  const messages = [
    { index: 0, role: "user", text: "안녕" },
    { index: 1, role: "char", text: "문을 열고 들어왔다." },
    { index: 2, role: "user", text: "커피" },
    { index: 3, role: "char", text: "잔을 테이블에 놓았다." },
  ];
  // DOM#1 (newest-first) → API#2
  const hit = resolveChatMessageMatch("커피", messages, 1, 4);
  assert.equal(hit.chatIndex, 2);
  assert.equal(hit.role, "user");
  assert.equal(hit.matchMethod, "reverse");
});

test("messageContextTriplet helper still builds neighbor fingerprint", () => {
  const messages = [
    { index: 0, role: "char", text: "문을 열고 들어왔다." },
    { index: 1, role: "user", text: "네" },
    { index: 2, role: "char", text: "잔을 테이블에 놓았다." },
    { index: 3, role: "user", text: "네" },
    { index: 4, role: "char", text: "고개를 살짝 끄덕였다." },
  ];
  assert.equal(messageContextTriplet(messages, 3).includes("네"), true);
  assert.equal(messageCompactKey(" 커피 "), "커피");
  // Matching itself is reverse-only: DOM#1 → API#3
  const hit = resolveChatMessageMatch("네", messages, 1, 5);
  assert.equal(hit.chatIndex, 3);
  assert.equal(hit.matchMethod, "reverse");
});

test("describeDomApiCompare explains short API inside long DOM", () => {
  const api = "문을 열고 들어왔다.";
  const dom = `캐릭터이름 2026-01-01 ${api} 그리고 더 긴 문단이 이어집니다`;
  const cmp = describeDomApiCompare(dom, api);
  assert.equal(cmp.overlap, true);
  assert.equal(cmp.apiInDom, true);
  assert.ok(cmp.domChars > cmp.apiChars);
});

test("rebindGalleryMessageIndexes shifts after middle delete", () => {
  const hashOf = (text) => `h:${String(text).replace(/\s+/g, "")}`;
  const before = [
    { index: 0, role: "user", text: "안녕" },
    { index: 1, role: "char", text: "문을 열고 들어왔다." },
    { index: 2, role: "user", text: "커피" },
    { index: 3, role: "char", text: "잔을 테이블에 놓았다." },
    { index: 4, role: "user", text: "고마워" },
    { index: 5, role: "char", text: "고개를 살짝 끄덕였다." },
  ];
  const cards = [
    { id: "cup", content_hash: hashOf("잔을 테이블에 놓았다."), message_index: 3 },
    { id: "nod", content_hash: hashOf("고개를 살짝 끄덕였다."), message_index: 5 },
  ];
  const after = before.filter((_, i) => i !== 2); // delete 커피
  const remapped = after.map((m, i) => ({ ...m, index: i }));
  const { cards: out, changed } = rebindGalleryMessageIndexes(cards, remapped, hashOf);
  assert.ok(changed >= 2);
  assert.equal(out.find((c) => c.id === "cup").message_index, 2);
  assert.equal(out.find((c) => c.id === "nod").message_index, 4);
});

test("pinPercentToPxFromBottom stays in range", () => {
  assert.ok(pinPercentToPxFromBottom(0, 800, 22, 8) >= 0);
});

test("galleryStripSplitAt only when both sides have images", () => {
  assert.equal(galleryStripSplitAt(0, 5), 0);
  assert.equal(galleryStripSplitAt(5, 5), 0);
  assert.equal(galleryStripSplitAt(3, 8), 3);
});

test("galleryIndexFromChildIndex skips the `|` separator child", () => {
  // children: [img0, img1, img2, |, img3, img4] with selectedCount=3
  assert.equal(galleryIndexFromChildIndex(0, 3, 5), 0);
  assert.equal(galleryIndexFromChildIndex(2, 3, 5), 2);
  assert.equal(galleryIndexFromChildIndex(3, 3, 5), -1);
  assert.equal(galleryIndexFromChildIndex(4, 3, 5), 3);
  assert.equal(galleryIndexFromChildIndex(5, 3, 5), 4);
});

test("thumbIndexAtStripX accounts for `|` width so post-split hits are not shifted", () => {
  const opts = { count: 5, selectedCount: 2, thumbWidth: 64, gap: 8, splitWidth: 16, splitExtraMargin: 4 };
  // left side: 0 @0–64, 1 @72–136, then | @144–160, gap, then thumb2 with +4 margin
  assert.equal(thumbIndexAtStripX(30, opts), 0);
  assert.equal(thumbIndexAtStripX(100, opts), 1);
  assert.equal(thumbIndexAtStripX(150, opts), -1); // on `|`
  // first right-side thumb starts at 160+8+4 = 172
  assert.equal(thumbIndexAtStripX(172, opts), 2);
  assert.equal(thumbIndexAtStripX(200, opts), 2);
  assert.equal(thumbIndexAtStripX(244, opts), 3); // 172+64+8 = 244
});

test("galleryStripContentWidth includes separator and clamps scroll offset", () => {
  // 5 thumbs + `|` + post-split margin: 5*64 + 5*8 gap among 6 children + 16 + 4
  assert.equal(galleryStripContentWidth({ count: 5, selectedCount: 2 }), 5 * 64 + 5 * 8 + 16 + 4);
  assert.equal(clampThumbScrollOffset(999, 400, 200), 200);
  assert.equal(clampThumbScrollOffset(-10, 400, 200), 0);
  assert.equal(clampThumbScrollOffset(50, 100, 200), 0);
});

test("parseAutotagLookJson reads fenced JSON look fields", () => {
  const out = parseAutotagLookJson('```json\n{"gender":"girl","appearance":"1girl, blue eyes","attire":"school uniform","accessories":"airpods in one ear"}\n```');
  assert.equal(out.appearance, "1girl, blue eyes");
  assert.equal(out.attire, "school uniform");
  assert.equal(out.accessories, "airpods in one ear");
  assert.equal(out.gender, "girl");
  assert.match(out.text, /airpods/);
});

test("parseAutotagLookJson falls back flat tags to appearance", () => {
  const out = parseAutotagLookJson("1girl, long hair, hoodie");
  assert.equal(out.appearance, "1girl, long hair, hoodie");
  assert.equal(out.attire, "");
  assert.equal(out.accessories, "");
});
