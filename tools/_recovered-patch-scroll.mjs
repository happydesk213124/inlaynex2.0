import { readFileSync, writeFileSync } from 'node:fs';

const p = new URL('../vite.config.ts', import.meta.url);
let s = readFileSync(p, 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';

const from = [
  '              const cur = ov._flashSeg != null ? ov._flashSeg : ov.activeSegment;',
  '              if (want != null && want === cur) return;',
  '              stickyFlashOnScroll();',
  '              scheduleStickySync();',
].join(nl);
const to = [
  '              const cur = ov._flashSeg != null ? ov._flashSeg : ov.activeSegment;',
  '              const changed = typeof VC?.stickySegChanged == "function" ? VC.stickySegChanged(cur, want) : want != null && want !== cur;',
  '              if (!changed) return;',
  '              stickyFlashOnScroll();',
].join(nl);

if (!s.includes(from)) {
  console.error('ptr block missing');
  process.exit(1);
}
s = s.replace(from, to);
console.log('ptr ok');

const scrollNeedle = [
  '    }, u = () => {',
  '      if (t.uiOpen) return;',
  '      // Capture native scrollY synchronously — SafeDOM rects are too slow for sticky image swaps.',
  '      try {',
  '        if (typeof window < "u" && t.overlayUi) t.overlayUi._liveScrollY = window.scrollY || window.pageYOffset || 0;',
  '      } catch {',
  '      }',
  '      stickyFlashOnScroll();',
  '      // Scroll path: coalesce full sticky correct to 1 rAF; select only after short idle.',
  '      scheduleStickySync(), scheduleScrollTrack();',
  '    }, onScrollEnd = () => {',
  '      if (t.uiOpen) return;',
  '      try {',
  '        if (typeof window < "u" && t.overlayUi) t.overlayUi._liveScrollY = window.scrollY || window.pageYOffset || 0;',
  '      } catch {',
  '      }',
  '      // End of gesture: correct with a real pin rect (not just the estimate).',
  '      scheduleStickySync(!0), settleScrollTrackNow();',
  '    }, onUserScrollStart = u, b = await fe(n, "scroll", u, !0), C = await fe(e, "scroll", u, !0), S = await fe(e, "scrollend", onScrollEnd, !0);',
  '    let E = !1;',
  '    if (typeof window < "u") try {',
  '      window.addEventListener("scroll", u, !0), window.addEventListener("scrollend", onScrollEnd, !0), window.addEventListener("wheel", onUserScrollStart, {',
  '        capture: !0,',
  '        passive: !0',
  '      }), window.addEventListener("resize", u), E = !0;',
  '    } catch {',
  '      try {',
  '        window.addEventListener("scroll", u), window.addEventListener("wheel", onUserScrollStart), window.addEventListener("resize", u), E = !0;',
  '      } catch {',
  '      }',
  '    }',
].join('\n');

const scrollPatch = [
  '    }, captureLiveScrollY = () => {',
  '      try {',
  '        if (typeof window < "u" && t.overlayUi) t.overlayUi._liveScrollY = window.scrollY || window.pageYOffset || 0;',
  '      } catch {',
  '      }',
  '    }, ensureScrollPhaseBus = () => {',
  '      if (t._scrollPhaseBus) return t._scrollPhaseBus;',
  '      const VC = globalThis.__INLAY_VIEWER_CORE__;',
  '      const make = VC?.createScrollPhaseBus;',
  '      const settleMs = 160;',
  '      const onActive = () => {',
  '        if (t.uiOpen) return;',
  '        captureLiveScrollY();',
  '        stickyFlashOnScroll();',
  '      };',
  '      const onSettle = () => {',
  '        if (t.uiOpen) return;',
  '        captureLiveScrollY();',
  '        scheduleStickySync(!0);',
  '        settleScrollTrackNow();',
  '      };',
  '      t._scrollPhaseBus = typeof make == "function"',
  '        ? make({ settleDelayMs: settleMs, onActive, onSettle })',
  '        : {',
  '          onScrollSample() {',
  '            onActive();',
  '            if (t._scrollPhaseTimer) clearTimeout(t._scrollPhaseTimer);',
  '            t._scrollPhaseTimer = setTimeout(() => {',
  '              t._scrollPhaseTimer = null, onSettle();',
  '            }, settleMs);',
  '          },',
  '          onScrollEnd() {',
  '            onActive();',
  '            if (t._scrollPhaseTimer) clearTimeout(t._scrollPhaseTimer);',
  '            t._scrollPhaseTimer = null, onSettle();',
  '          },',
  '          cancel() {',
  '            if (t._scrollPhaseTimer) clearTimeout(t._scrollPhaseTimer);',
  '            t._scrollPhaseTimer = null;',
  '          }',
  '        };',
  '      return t._scrollPhaseBus;',
  '    }, u = () => {',
  '      if (t.uiOpen) return;',
  '      ensureScrollPhaseBus().onScrollSample();',
  '    }, onScrollEnd = () => {',
  '      if (t.uiOpen) return;',
  '      ensureScrollPhaseBus().onScrollEnd();',
  '    }, onUserScrollStart = u, b = await fe(n, "scroll", u, !0), C = await fe(e, "scroll", u, !0), S = await fe(e, "scrollend", onScrollEnd, !0);',
  '    let E = !1;',
  '    if (typeof window < "u") try {',
  '      window.addEventListener("scroll", u, !0), window.addEventListener("scrollend", onScrollEnd, !0), window.addEventListener("resize", onScrollEnd), E = !0;',
  '    } catch {',
  '      try {',
  '        window.addEventListener("scroll", u), window.addEventListener("resize", onScrollEnd), E = !0;',
  '      } catch {',
  '      }',
  '    }',
].join('\n');

const vhNeedle = [
  '      const o = typeof window < "u" && window.innerHeight || 800;',
  '      const py = Number(t._pointerClientY), px = Number(t._pointerClientX);',
  '      const anchorY = Number.isFinite(py) ? py : o * 0.5;',
  '      const anchorX = Number.isFinite(px) ? px : null;',
].join('\n');
const vhPatch = [
  '      const o = viewerViewport().vh || (typeof window < "u" && window.innerHeight) || 800;',
  '      const py = Number(t._pointerClientY), px = Number(t._pointerClientX);',
  '      const anchorY = o * 0.5;',
  '      const anchorX = Number.isFinite(px) ? px : null;',
].join('\n');

function asTpl(raw) {
  // vite needles are template literals; escape backticks and ${
  return '`' + raw.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`';
}

if (!s.includes('VENDOR_SCROLL_PHASE_NEEDLE')) {
  const insertAt = s.indexOf('/** Force-disable sticky pin hover preview');
  if (insertAt < 0) throw new Error('hover marker missing');
  const block = [
    '/** Scroll: active = scrollY + flash only; settle = Ht + message track. */',
    `const VENDOR_SCROLL_PHASE_NEEDLE = ${asTpl(scrollNeedle)};`,
    `const VENDOR_SCROLL_PHASE_PATCH = ${asTpl(scrollPatch)};`,
    '',
    `const VENDOR_SCROLL_TRACK_VH_NEEDLE = ${asTpl(vhNeedle)};`,
    `const VENDOR_SCROLL_TRACK_VH_PATCH = ${asTpl(vhPatch)};`,
    '',
    '',
  ].join(nl);
  s = s.slice(0, insertAt) + block + s.slice(insertAt);
  console.log('inserted consts');
}

if (!s.includes("[VENDOR_SCROLL_PHASE_NEEDLE, 'scroll phase bus']")) {
  s = s.replace(
    "[VENDOR_INLINE_PTR_STICKY_NEEDLE, 'inline pointer sticky sync'],",
    "[VENDOR_INLINE_PTR_STICKY_NEEDLE, 'inline pointer sticky sync']," + nl +
      "    [VENDOR_SCROLL_PHASE_NEEDLE, 'scroll phase bus']," + nl +
      "    [VENDOR_SCROLL_TRACK_VH_NEEDLE, 'scroll track viewport mid'],",
  );
  s = s.replace(
    '.replace(VENDOR_INLINE_PTR_STICKY_NEEDLE, VENDOR_INLINE_PTR_STICKY_PATCH)',
    '.replace(VENDOR_INLINE_PTR_STICKY_NEEDLE, VENDOR_INLINE_PTR_STICKY_PATCH)' + nl +
      '    .replace(VENDOR_SCROLL_PHASE_NEEDLE, VENDOR_SCROLL_PHASE_PATCH)' + nl +
      '    .replace(VENDOR_SCROLL_TRACK_VH_NEEDLE, VENDOR_SCROLL_TRACK_VH_PATCH)',
  );
  console.log('wired');
}

writeFileSync(p, s);
console.log('done');
