/**
 * Build pipeline for Inlay Nexus 2.0.
 *
 * Output layout of `dist/inlaynexus2.0.js`:
 *
 *   1. Risu plugin header  (`//@name` … `//@arg`)  — `//@version` must land in the first 512 bytes
 *   2. Our bundle, wrapped in an IIFE               — declares ZERO top-level names
 *   3. The frozen vendor UI bundle                  — byte-identical apart from asserted patches
 *
 * Step 2 must stay an IIFE: the vendor UI declares the top-level names
 * `style, Zt, on, ta, Kt, Jt, sn, gn` and both halves share one module scope.
 * An IIFE makes collisions structurally impossible.
 *
 * The whole file stays an ES module because the vendor UI ends in a top-level `await`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { encodePromptPack } from './src/config/prompt-codec.ts';

const configRoot = dirname(fileURLToPath(import.meta.url));

const OUT_FILE = 'inlaynexus2.0.js';
const VENDOR_UI = resolve(configRoot, 'vendor/inlay-nexus-ui.js');
const PROMPTS_DIR = resolve(configRoot, 'prompts');

/**
 * Risu resolves plugin storage by `//@name`, so this id is frozen at the 1.x value.
 * Renaming it would orphan every existing user's settings, gallery and roster.
 */
const PLUGIN_ID = 'inlay-nexus-native';
const PLUGIN_VERSION = '2.0.17';

/** The version string the frozen UI bundle hardcodes for its footer. */
const VENDOR_VERSION_NEEDLE = 'He = "1.3.0"';

/**
 * Settings reset already asks via `globalThis.confirm`; prompt restore did not.
 * We cannot edit the frozen vendor file, so the build inserts the same guard
 * at the one call site. Needle must stay unique or the build fails loudly.
 */
const VENDOR_PROMPT_RESET_NEEDLE = `const r = a.getAttribute("data-reset-prompt");
        try {
          await K(\`/v1/prompts/\${encodeURIComponent(r)}/reset\`, {`;

const VENDOR_PROMPT_RESET_PATCH = `const r = a.getAttribute("data-reset-prompt");
        if (!globalThis.confirm?.(\`정말로 "\${r}" 프롬프트를 기본값으로 복원할까요?\`)) return;
        try {
          await K(\`/v1/prompts/\${encodeURIComponent(r)}/reset\`, {`;

/**
 * `card.natural_base` enum: remove dashboard checkbox; place select in card
 * settings 3-col row with person_tag / lore_extra; save via Ct() not Mt().
 */
const VENDOR_NATURAL_BASE_HTML_NEEDLE =
  `<label class="toggle-row" data-nx-help-id="nx-natural-base"><input type="checkbox" id="nx-natural-base" \${i.natural_base !== !1 ? "checked" : ""}><span>자연어 base 태그</span></label>
`;

const VENDOR_NATURAL_BASE_HTML_PATCH = ``;

const VENDOR_NATURAL_BASE_SAVE_NEEDLE = `      natural_base: ee("nx-natural-base"),
`;
const VENDOR_NATURAL_BASE_SAVE_PATCH = ``;

const VENDOR_NATURAL_BASE_CT_NEEDLE =
  `      lore_extra: document.getElementById("nx-lore-extra") ? normalizeLoreExtraMode(N("nx-lore-extra")) : normalizeLoreExtraMode(e.lore_extra),`;

const VENDOR_NATURAL_BASE_CT_PATCH =
  `      lore_extra: document.getElementById("nx-lore-extra") ? normalizeLoreExtraMode(N("nx-lore-extra")) : normalizeLoreExtraMode(e.lore_extra),
      natural_base: document.getElementById("nx-natural-base") ? N("nx-natural-base") || "short" : e.natural_base || "short",`;

const VENDOR_NATURAL_BASE_CARD_NEEDLE =
  `<label class="wide"><span>사람 태그 자동넣기</span><select id="nx-person-tag-mode">
              <option value="gender" \${R === "gender" ? "selected" : ""}>성별 분리 (1girl, 1boy…)</option>
              <option value="girls" \${R === "girls" ? "selected" : ""}>인원수 → girls (4girls)</option>
              <option value="people" \${R === "people" ? "selected" : ""}>인원수 → people (4people)</option>
              <option value="off" \${R === "off" ? "selected" : ""}>안 넣기</option>
            </select></label>
            <label class="wide" data-nx-help-id="nx-lore-extra"><span>lb-xnai.lb.extra</span><select id="nx-lore-extra">
              <option value="tags" \${loreExtraUi === "tags" ? "selected" : ""}>캐릭터 태그만</option>
              <option value="full" \${loreExtraUi === "full" ? "selected" : ""}>전체</option>
              <option value="off" \${loreExtraUi === "off" ? "selected" : ""}>넣지 않음</option>
            </select></label>`;

const VENDOR_NATURAL_BASE_CARD_PATCH =
  `<div class="wide" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;align-items:end">
            <label data-nx-help-id="nx-person-tag-mode"><span>사람 태그 자동넣기</span><select id="nx-person-tag-mode">
              <option value="gender" \${R === "gender" ? "selected" : ""}>성별 분리 (1girl, 1boy…)</option>
              <option value="girls" \${R === "girls" ? "selected" : ""}>인원수 → girls (4girls)</option>
              <option value="people" \${R === "people" ? "selected" : ""}>인원수 → people (4people)</option>
              <option value="off" \${R === "off" ? "selected" : ""}>안 넣기</option>
            </select></label>
            <label data-nx-help-id="nx-lore-extra"><span>lb-xnai.lb.extra</span><select id="nx-lore-extra">
              <option value="tags" \${loreExtraUi === "tags" ? "selected" : ""}>캐릭터 태그만</option>
              <option value="full" \${loreExtraUi === "full" ? "selected" : ""}>전체</option>
              <option value="off" \${loreExtraUi === "off" ? "selected" : ""}>넣지 않음</option>
            </select></label>
            <label data-nx-help-id="nx-natural-base"><span>자연어 base</span><select id="nx-natural-base">
              <option value="off" \${i.natural_base === !1 || i.natural_base === "off" ? "selected" : ""}>안넣기</option>
              <option value="short" \${i.natural_base !== !1 && i.natural_base !== "off" && i.natural_base !== "detailed" && i.natural_base !== "supplement" ? "selected" : ""}>짧게 넣기</option>
              <option value="detailed" \${i.natural_base === "detailed" ? "selected" : ""}>구도·자세히</option>
              <option value="supplement" \${i.natural_base === "supplement" ? "selected" : ""}>태그 보완 자연어</option>
            </select></label>
            </div>`;

const VENDOR_NATURAL_BASE_HELP_NEEDLE =
  `"nx-natural-base": { title: "자연어 base 태그", body: "이미지 요청에 짧은 자연어 장면도 함께 넣습니다. 태그만 쓸 때보다 분위기가 자연스러워질 수 있습니다." }`;

const VENDOR_NATURAL_BASE_HELP_PATCH =
  `"nx-natural-base": { title: "자연어 base", body: "NovelAI base에 넣는 자연어 장면을 고릅니다. 안넣기 / 짧게 넣기(머리·나이·성별·행동) / 구도·자세히(구도·표정·옷·조명) / 태그 보완 자연어(태그가 못 담는 문장)." }`;

/**
 * Global character "use in this chat" toggle: compact control left of 오토태그,
 * not a full-width toggle-row inside the card body.
 */
const VENDOR_GLOBAL_TOGGLE_SUMMARY_NEEDLE =
  `<span class="autotag-badge\${l ? " show" : ""}" data-autotag-badge>\${l ? "선택됨 · Ctrl+V" : ""}</span>
            <button type="button" class="secondary\${l ? " armed" : ""}" data-char-autotag title="클릭: 붙여넣기 대상 선택 · 더블클릭: 파일 선택">\${l ? "붙여넣기 대기" : "오토태그"}</button>`;

const VENDOR_GLOBAL_TOGGLE_SUMMARY_PATCH =
  `<span class="autotag-badge\${l ? " show" : ""}" data-autotag-badge>\${l ? "선택됨 · Ctrl+V" : ""}</span>
            \${n === "global" ? \`<label class="char-lock" data-global-toggle-wrap title="이 캐릭터 챗에서 사용" style="display:inline-flex;align-items:center;gap:4px;margin:0;flex-shrink:0;white-space:nowrap;cursor:pointer"><input data-global-toggle="\${c}" type="checkbox" \${p ? "checked" : ""}><span>사용</span></label>\` : ""}
            <button type="button" class="secondary\${l ? " armed" : ""}" data-char-autotag title="클릭: 붙여넣기 대상 선택 · 더블클릭: 파일 선택">\${l ? "붙여넣기 대기" : "오토태그"}</button>`;

const VENDOR_GLOBAL_TOGGLE_BODY_NEEDLE =
  `            \${n === "global" ? \`<label class="toggle-row" data-global-toggle-wrap><input data-global-toggle="\${c}" type="checkbox" \${p ? "checked" : ""}><span>이 캐릭터 챗에서 사용 (ON/OFF)</span></label>\` : ""}
`;

const VENDOR_GLOBAL_TOGGLE_BODY_PATCH = ``;

/**
 * Explorer paints thumbs via sync resolveImageUrl only. Explore lists with
 * cachedOnly, so new cards start with empty src (broken-image icon). Warm fills
 * the cache in the background, but onWarmProgress used to bail while uiOpen —
 * so the grid never reapplied src. Sync cache hits into <img> and warm on folder
 * paint; refresh explorer thumbs from warm progress even when the panel is open.
 */
const VENDOR_EXPLORER_THUMB_PAINT_NEEDLE = `    document.querySelectorAll("[data-explorer-id]").forEach((el) => {
      const id = el.getAttribute("data-explorer-id");
      el.classList.toggle("selected", !!ex.selection?.selected?.has(id));
      el.classList.toggle("focus", ex.selection?.focusId === id);
      const check = el.querySelector(".ex-check");
      check && (check.textContent = ex.selection?.selected?.has(id) ? "✓" : "");
    });
    const r = document.querySelector(".explorer-toolbar .muted");
    r && (r.textContent = \`\${n.length}장\`);
  }
  function ha(e) {`;

const VENDOR_EXPLORER_THUMB_PAINT_PATCH = `    document.querySelectorAll("[data-explorer-id]").forEach((el) => {
      const id = el.getAttribute("data-explorer-id");
      el.classList.toggle("selected", !!ex.selection?.selected?.has(id));
      el.classList.toggle("focus", ex.selection?.focusId === id);
      const check = el.querySelector(".ex-check");
      check && (check.textContent = ex.selection?.selected?.has(id) ? "✓" : "");
      const img = el.querySelector("img");
      if (img && id) {
        try {
          const src = Ie({ id });
          if (typeof src == "string" && /^data:image\\//i.test(src) && img.getAttribute("src") !== src) img.setAttribute("src", src);
        } catch {
        }
      }
    });
    const r = document.querySelector(".explorer-toolbar .muted");
    r && (r.textContent = \`\${n.length}장\`);
  }
  function ha(e) {`;

const VENDOR_EXPLORER_THUMB_WARM_NEEDLE = `    a && a.style.setProperty("--ex-thumb", \`\${thumb}px\`);
    paintExplorerSelectionUi(), tt();
  }
  function downloadBase64Zip(b64, filename) {`;

const VENDOR_EXPLORER_THUMB_WARM_PATCH = `    a && a.style.setProperty("--ex-thumb", \`\${thumb}px\`);
    paintExplorerSelectionUi(), tt();
    try {
      const N = globalThis.__INLAY_NATIVE__;
      const ids = [...new Set((n || []).map((x) => x && x.id).filter(Boolean))];
      if (ids.length) {
        if (typeof N?.pinImageUrls == "function") N.pinImageUrls(ids);
        const done = () => {
          try {
            paintExplorerSelectionUi();
          } catch {
          }
        };
        if (typeof N?.warmImages == "function") N.warmImages(ids).then(done).catch(() => {
        });
        else if (typeof N?.ensureImageUrl == "function") Promise.all(ids.map((id) => N.ensureImageUrl(id).catch(() => ""))).then(done).catch(() => {
        });
      }
    } catch {
    }
  }
  function downloadBase64Zip(b64, filename) {`;

const VENDOR_EXPLORER_WARM_PROGRESS_NEEDLE = `          N.onWarmProgress(() => {
            if (t.uiOpen || t._indexPaintQueued) return;
            t._indexPaintQueued = !0;
            Promise.resolve().then(() => {
              t._indexPaintQueued = !1;
              if (t.galleryUi?.paintStatus) t.galleryUi.paintStatus().catch(() => {
              });
            });
          });`;

const VENDOR_EXPLORER_WARM_PROGRESS_PATCH = `          N.onWarmProgress(() => {
            try {
              if (t.uiOpen && t.uiTab === "explorer") paintExplorerSelectionUi();
            } catch {
            }
            if (t.uiOpen || t._indexPaintQueued) return;
            t._indexPaintQueued = !0;
            Promise.resolve().then(() => {
              t._indexPaintQueued = !1;
              if (t.galleryUi?.paintStatus) t.galleryUi.paintStatus().catch(() => {
              });
            });
          });`;

/**
 * Style presets: CFG scale / CFG rescale / vibe per preset; drop paste textarea;
 * put 카드 설정 저장 left of JSON export/import file buttons.
 */
const VENDOR_PRESET_QT_NEEDLE = `}, mt = ($, L) => \`\${String($ || "preset").toLowerCase().replace(/[^a-z0-9\\uac00-\\ud7a3]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "preset"}_\${L}_\${Math.random().toString(36).slice(2, 7)}\`, Qt = ($, L) => {
  if (!$ || typeof $ != "object") return null;
  const M = $, V = String(M.name || M.comment || M.title || \`프리셋 \${L + 1}\`).trim();
  let Y = String(M.positive || M.pos || "").trim(), q = String(M.negative || M.neg || "").trim();
  if (!Y && !q && typeof M.content == "string") {
    const ne = ht(M.content);
    if (!ne) return null;
    Y = ne.positive, q = ne.negative;
  }
  return !Y && !q ? null : {
    id: String(M.id || mt(V, L)),
    name: V,
    positive: Y,
    negative: q
  };
}, pn = ($) => {`;

const VENDOR_PRESET_QT_PATCH = `}, mt = ($, L) => \`\${String($ || "preset").toLowerCase().replace(/[^a-z0-9\\uac00-\\ud7a3]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "preset"}_\${L}_\${Math.random().toString(36).slice(2, 7)}\`, Qt = ($, L) => {
  if (!$ || typeof $ != "object") return null;
  const M = $, V = String(M.name || M.comment || M.title || \`프리셋 \${L + 1}\`).trim();
  let Y = String(M.positive || M.pos || "").trim(), q = String(M.negative || M.neg || "").trim();
  if (!Y && !q && typeof M.content == "string") {
    const ne = ht(M.content);
    if (!ne) return null;
    Y = ne.positive, q = ne.negative;
  }
  let cfgScale = null, cfgRescale = null;
  if (M.cfg_scale != null && M.cfg_scale !== "") {
    const nCfg = Number(M.cfg_scale);
    Number.isFinite(nCfg) && (cfgScale = nCfg);
  }
  if (M.cfg_rescale != null && M.cfg_rescale !== "") {
    const nRs = Number(M.cfg_rescale);
    Number.isFinite(nRs) && (cfgRescale = nRs);
  }
  return !Y && !q && cfgScale == null && cfgRescale == null ? null : {
    id: String(M.id || mt(V, L)),
    name: V,
    positive: Y,
    negative: q,
    cfg_scale: cfgScale,
    cfg_rescale: cfgRescale
  };
}, pn = ($) => {`;

const VENDOR_PRESET_UN_NEEDLE = `    Y >= 0 ? M[Y] = {
      ...M[Y],
      positive: V.positive,
      negative: V.negative
    } : M.push(V);`;

const VENDOR_PRESET_UN_PATCH = `    Y >= 0 ? M[Y] = {
      ...M[Y],
      positive: V.positive,
      negative: V.negative,
      cfg_scale: V.cfg_scale,
      cfg_rescale: V.cfg_rescale
    } : M.push(V);`;

const VENDOR_PRESET_HTML_NEEDLE = `            <label class="wide"><span>프리셋 이름</span><input id="nx-preset-name" value="\${h(f?.name || "")}" \${f ? "" : "disabled"}></label>
            <label class="wide"><span>Positive</span><textarea id="nx-custom-pos" \${f ? "" : "disabled"}>\${h(f?.positive || "")}</textarea></label>
            <label class="wide"><span>Negative</span><textarea id="nx-custom-neg" \${f ? "" : "disabled"}>\${h(f?.negative || "")}</textarea></label>
          </div>
          <div class="section-split"></div>
          <div class="prompt-group-label">프리셋 가져오기 / 내보내기</div>
          <div class="row" style="margin-top:8px">
            <button type="button" id="nx-preset-export" class="secondary">JSON 내보내기</button>
            <button type="button" id="nx-preset-file" class="secondary">JSON 파일 열기</button>
            <button type="button" id="nx-preset-import">붙여넣기 가져오기</button>
            <input id="nx-preset-file-input" type="file" accept=".json,application/json,text/plain" style="display:none">
          </div>
          <label class="wide" style="display:flex;flex-direction:column;gap:6px;margin-top:12px;color:#bbc6d8;font-size:11px;font-weight:680;text-transform:uppercase;letter-spacing:.055em">
            <span>card.json 또는 프리셋 JSON 붙여넣기</span>
            <textarea id="nx-preset-import-text" class="import-box" placeholder='Risu card.json 전체, 또는 {"presets":[...]} 형식'></textarea>
          </label>
          <div class="row" style="margin-top:14px">
            <button id="nx-save-card">카드 설정 저장</button>
          </div>
        </div>\`;`;

const VENDOR_PRESET_HTML_PATCH = `            <label class="wide"><span>프리셋 이름</span><input id="nx-preset-name" value="\${h(f?.name || "")}" \${f ? "" : "disabled"}></label>
            <label class="wide"><span>Positive</span><textarea id="nx-custom-pos" \${f ? "" : "disabled"}>\${h(f?.positive || "")}</textarea></label>
            <label class="wide"><span>Negative</span><textarea id="nx-custom-neg" \${f ? "" : "disabled"}>\${h(f?.negative || "")}</textarea></label>
            <label><span>CFG scale</span><input id="nx-preset-cfg" type="number" step="0.1" placeholder="NAI 기본" value="\${h(f?.cfg_scale ?? "")}" \${f ? "" : "disabled"}></label>
            <label><span>CFG rescale</span><input id="nx-preset-rescale" type="number" step="0.01" placeholder="NAI 기본" value="\${h(f?.cfg_rescale ?? "")}" \${f ? "" : "disabled"}></label>
            <label class="wide"><span>Vibe Transfer</span>
              <div class="row" style="margin:0">
                <button type="button" id="nx-preset-vibe-pick" class="secondary" \${f ? "" : "disabled"}>이미지 불러오기</button>
                <button type="button" id="nx-preset-vibe-clear" class="secondary" \${f ? "" : "disabled"}>제거</button>
                <span id="nx-preset-vibe-status" class="muted">\${f?.vibe_configured ? "설정됨 · 이 프리셋 사용" : "없음 · NAI 모델설정 사용"}</span>
              </div>
              <input id="nx-preset-vibe-file" type="file" accept="image/*" style="display:none">
            </label>
            <div class="ref-preview wide" id="nx-preset-vibe-preview">\${f?.vibe_configured && f?.vibe_preview_url ? \`<img src="\${h(f.vibe_preview_url)}" alt="vibe">\` : '<span class="muted">없음 · 생성 시 NAI 모델설정 vibe 사용</span>'}</div>
          </div>
          <div class="row" style="margin-top:14px">
            <button id="nx-save-card">카드 설정 저장</button>
            <button type="button" id="nx-preset-export" class="secondary">JSON 내보내기</button>
            <button type="button" id="nx-preset-file" class="secondary">JSON 파일 열기</button>
            <input id="nx-preset-file-input" type="file" accept=".json,application/json,text/plain" style="display:none">
          </div>
        </div>\`;`;

const VENDOR_PRESET_READ_NEEDLE = `    const nameEl = typeof document < "u" ? document.getElementById("nx-preset-name") : null, posEl = typeof document < "u" ? document.getElementById("nx-custom-pos") : null, negEl = typeof document < "u" ? document.getElementById("nx-custom-neg") : null;
    if (!nameEl && !posEl && !negEl) return e;
    return nameEl && (n.name = nameEl.value || ""), posEl && (n.positive = posEl.value || "", e.custom_pos = n.positive), negEl && (n.negative = negEl.value || "", e.custom_neg = n.negative), e;
  }
  function fa(e) {`;

const VENDOR_PRESET_READ_PATCH = `    const nameEl = typeof document < "u" ? document.getElementById("nx-preset-name") : null, posEl = typeof document < "u" ? document.getElementById("nx-custom-pos") : null, negEl = typeof document < "u" ? document.getElementById("nx-custom-neg") : null, cfgEl = typeof document < "u" ? document.getElementById("nx-preset-cfg") : null, rescaleEl = typeof document < "u" ? document.getElementById("nx-preset-rescale") : null;
    if (!nameEl && !posEl && !negEl && !cfgEl && !rescaleEl) return e;
    nameEl && (n.name = nameEl.value || "");
    posEl && (n.positive = posEl.value || "", e.custom_pos = n.positive);
    negEl && (n.negative = negEl.value || "", e.custom_neg = n.negative);
    if (cfgEl) {
      const v = String(cfgEl.value || "").trim();
      n.cfg_scale = v === "" ? null : Number(v);
      if (n.cfg_scale != null && !Number.isFinite(n.cfg_scale)) n.cfg_scale = null;
    }
    if (rescaleEl) {
      const v = String(rescaleEl.value || "").trim();
      n.cfg_rescale = v === "" ? null : Number(v);
      if (n.cfg_rescale != null && !Number.isFinite(n.cfg_rescale)) n.cfg_rescale = null;
    }
    return e;
  }
  function fa(e) {`;

const VENDOR_PRESET_FA_NEEDLE = `    const nameEl = typeof document < "u" ? document.getElementById("nx-preset-name") : null, posEl = typeof document < "u" ? document.getElementById("nx-custom-pos") : null, negEl = typeof document < "u" ? document.getElementById("nx-custom-neg") : null;
    if (owner && (nameEl || posEl || negEl)) {
      nameEl && (owner.name = nameEl.value || "");
      posEl && (owner.positive = posEl.value || "", n.custom_pos = owner.positive);
      negEl && (owner.negative = negEl.value || "", n.custom_neg = owner.negative);
    }`;

const VENDOR_PRESET_FA_PATCH = `    const nameEl = typeof document < "u" ? document.getElementById("nx-preset-name") : null, posEl = typeof document < "u" ? document.getElementById("nx-custom-pos") : null, negEl = typeof document < "u" ? document.getElementById("nx-custom-neg") : null, cfgEl = typeof document < "u" ? document.getElementById("nx-preset-cfg") : null, rescaleEl = typeof document < "u" ? document.getElementById("nx-preset-rescale") : null;
    if (owner && (nameEl || posEl || negEl || cfgEl || rescaleEl)) {
      nameEl && (owner.name = nameEl.value || "");
      posEl && (owner.positive = posEl.value || "", n.custom_pos = owner.positive);
      negEl && (owner.negative = negEl.value || "", n.custom_neg = owner.negative);
      if (cfgEl) {
        const v = String(cfgEl.value || "").trim();
        owner.cfg_scale = v === "" ? null : Number(v);
        if (owner.cfg_scale != null && !Number.isFinite(owner.cfg_scale)) owner.cfg_scale = null;
      }
      if (rescaleEl) {
        const v = String(rescaleEl.value || "").trim();
        owner.cfg_rescale = v === "" ? null : Number(v);
        if (owner.cfg_rescale != null && !Number.isFinite(owner.cfg_rescale)) owner.cfg_rescale = null;
      }
    }`;

const VENDOR_PRESET_SYNC_NEEDLE = `    const name = document.getElementById("nx-preset-name"), pos = document.getElementById("nx-custom-pos"), neg = document.getElementById("nx-custom-neg");
    if (name) name.value = active.name || "";
    if (pos) pos.value = active.positive || "";
    if (neg) neg.value = active.negative || "";
  }
  async function Je() {`;

const VENDOR_PRESET_SYNC_PATCH = `    const name = document.getElementById("nx-preset-name"), pos = document.getElementById("nx-custom-pos"), neg = document.getElementById("nx-custom-neg"), cfg = document.getElementById("nx-preset-cfg"), rescale = document.getElementById("nx-preset-rescale");
    if (name) name.value = active.name || "";
    if (pos) pos.value = active.positive || "";
    if (neg) neg.value = active.negative || "";
    if (cfg) cfg.value = active.cfg_scale == null || active.cfg_scale === "" ? "" : String(active.cfg_scale);
    if (rescale) rescale.value = active.cfg_rescale == null || active.cfg_rescale === "" ? "" : String(active.cfg_rescale);
    const st = document.getElementById("nx-preset-vibe-status"), prev = document.getElementById("nx-preset-vibe-preview");
    st && (st.textContent = active.vibe_configured ? "설정됨 · 이 프리셋 사용" : "없음 · NAI 모델설정 사용");
    prev && (prev.innerHTML = active.vibe_configured && active.vibe_preview_url ? \`<img src="\${h(active.vibe_preview_url)}" alt="vibe">\` : '<span class="muted">없음 · 생성 시 NAI 모델설정 vibe 사용</span>');
  }
  async function Je() {`;

const VENDOR_PRESET_EXPORT_NEEDLE = `  function exportPresetsJson() {
    const e = _e(), n = (e.presets || []).map((a) => ({
      id: String(a.id || ""),
      name: String(a.name || ""),
      positive: String(a.positive || ""),
      negative: String(a.negative || "")
    })).filter((a) => a.name || a.positive || a.negative);`;

const VENDOR_PRESET_EXPORT_PATCH = `  function exportPresetsJson() {
    const e = _e(), n = (e.presets || []).map((a) => {
      const cfg = a.cfg_scale == null || a.cfg_scale === "" ? null : Number(a.cfg_scale), rescale = a.cfg_rescale == null || a.cfg_rescale === "" ? null : Number(a.cfg_rescale);
      return {
        id: String(a.id || ""),
        name: String(a.name || ""),
        positive: String(a.positive || ""),
        negative: String(a.negative || ""),
        cfg_scale: cfg != null && Number.isFinite(cfg) ? cfg : null,
        cfg_rescale: rescale != null && Number.isFinite(rescale) ? rescale : null
      };
    }).filter((a) => a.name || a.positive || a.negative || a.cfg_scale != null || a.cfg_rescale != null);`;

const VENDOR_PRESET_NEW_NEEDLE = `      a.presets.push({
        id: r,
        name: \`새 프리셋 \${a.presets.length + 1}\`,
        positive: "",
        negative: ""
      }), pinActivePreset(a, r), a.custom_pos = "", a.custom_neg = "", queueSettingsSave({ card: { ...a } }), await P();`;

const VENDOR_PRESET_NEW_PATCH = `      a.presets.push({
        id: r,
        name: \`새 프리셋 \${a.presets.length + 1}\`,
        positive: "",
        negative: "",
        cfg_scale: null,
        cfg_rescale: null
      }), pinActivePreset(a, r), a.custom_pos = "", a.custom_neg = "", queueSettingsSave({ card: { ...a } }), await P();`;

const VENDOR_PRESET_DUP_NEEDLE = `      a.presets.push({
        id: i,
        name: \`\${r.name} 복사\`,
        positive: r.positive || "",
        negative: r.negative || ""
      }), pinActivePreset(a, i), a.custom_pos = r.positive || "", a.custom_neg = r.negative || "", queueSettingsSave({ card: { ...a } }), await P();`;

const VENDOR_PRESET_DUP_PATCH = `      a.presets.push({
        id: i,
        name: \`\${r.name} 복사\`,
        positive: r.positive || "",
        negative: r.negative || "",
        cfg_scale: r.cfg_scale ?? null,
        cfg_rescale: r.cfg_rescale ?? null
      }), pinActivePreset(a, i), a.custom_pos = r.positive || "", a.custom_neg = r.negative || "";
      try {
        await K("/v1/nai/vibe", { method: "POST", body: { preset_id: i, copy_from: r.id } }, 6e4);
      } catch {
      }
      queueSettingsSave({ card: { ...a } }), await P();`;

const VENDOR_PRESET_DEL_NEEDLE = `    }), document.getElementById("nx-preset-del")?.addEventListener("click", async () => {
      const a = _e();
      if (!a.presets.length) return;
      a.presets = a.presets.filter((i) => !presetIdEq(i.id, a.active_preset_id));
      const nextId = a.presets[0]?.id || "";
      pinActivePreset(a, nextId);
      const r = a.presets[0];
      a.custom_pos = r?.positive || "", a.custom_neg = r?.negative || "", queueSettingsSave({ card: { ...a } }), await P();
    }), document.getElementById("nx-preset-export")?.addEventListener("click", async () => {`;

const VENDOR_PRESET_DEL_PATCH = `    }), document.getElementById("nx-preset-del")?.addEventListener("click", async () => {
      const a = _e();
      if (!a.presets.length) return;
      const delId = a.active_preset_id;
      a.presets = a.presets.filter((i) => !presetIdEq(i.id, a.active_preset_id));
      const nextId = a.presets[0]?.id || "";
      pinActivePreset(a, nextId);
      const r = a.presets[0];
      a.custom_pos = r?.positive || "", a.custom_neg = r?.negative || "";
      try {
        delId && await K("/v1/nai/vibe/clear", { method: "POST", body: { preset_id: delId } });
      } catch {
      }
      queueSettingsSave({ card: { ...a } }), await P();
    }), document.getElementById("nx-preset-export")?.addEventListener("click", async () => {`;

const VENDOR_PRESET_VIBE_EVT_NEEDLE = `    }), document.getElementById("nx-preset-file")?.addEventListener("click", () => {
      document.getElementById("nx-preset-file-input")?.click();
    }), document.getElementById("nx-preset-file-input")?.addEventListener("change", async (a) => {`;

const VENDOR_PRESET_VIBE_EVT_PATCH = `    }), document.getElementById("nx-preset-vibe-pick")?.addEventListener("click", () => {
      document.getElementById("nx-preset-vibe-file")?.click();
    }), document.getElementById("nx-preset-vibe-file")?.addEventListener("change", async (a) => {
      const r = a.target?.files?.[0], pid = String(t.backendSettings?.card?.active_preset_id || "");
      if (r && pid) {
        try {
          const res = await K("/v1/nai/vibe", {
            method: "POST",
            body: {
              preset_id: pid,
              image_b64: await It(r),
              information_extracted: Number(N("nx-nai-vibe-ie") || 1),
              strength: Number(N("nx-nai-vibe-strength") || 0.6)
            }
          }, 12e4);
          const s = document.getElementById("nx-preset-vibe-status");
          s && (s.textContent = "설정됨 · 이 프리셋 사용");
          const c = document.getElementById("nx-preset-vibe-preview");
          const url = res?.preview_url || "";
          c && (c.innerHTML = url ? \`<img src="\${h(url)}" alt="vibe">\` : '<span class="muted">설정됨</span>');
          const card = t.backendSettings?.card, pr = (card?.presets || []).find((p) => presetIdEq(p.id, pid));
          pr && (pr.vibe_configured = !0, pr.vibe_preview_url = url);
          $e("프리셋 Vibe 저장");
        } catch (i) {
          t.uiMessage = {
            type: "error",
            text: z(i?.message || i)
          }, await P();
        }
        a.target.value = "";
      }
    }), document.getElementById("nx-preset-vibe-clear")?.addEventListener("click", async () => {
      const pid = String(t.backendSettings?.card?.active_preset_id || "");
      if (!pid) return;
      try {
        await K("/v1/nai/vibe/clear", { method: "POST", body: { preset_id: pid } });
        const s = document.getElementById("nx-preset-vibe-status");
        s && (s.textContent = "없음 · NAI 모델설정 사용");
        const c = document.getElementById("nx-preset-vibe-preview");
        c && (c.innerHTML = '<span class="muted">없음 · 생성 시 NAI 모델설정 vibe 사용</span>');
        const card = t.backendSettings?.card, pr = (card?.presets || []).find((p) => presetIdEq(p.id, pid));
        pr && (pr.vibe_configured = !1, delete pr.vibe_preview_url);
        $e("프리셋 Vibe 제거");
      } catch (i) {
        t.uiMessage = {
          type: "error",
          text: z(i?.message || i)
        }, await P();
      }
    }), document.getElementById("nx-preset-file")?.addEventListener("click", () => {
      document.getElementById("nx-preset-file-input")?.click();
    }), document.getElementById("nx-preset-file-input")?.addEventListener("change", async (a) => {`;

/**
 * Sticky always-image hide = effective size 0% (not display:none / card-id).
 * Click collapse, 상시 off, and shot/char editors all go through La().
 */
const VENDOR_STICKY_LA_NEEDLE = `  function La() {
    const e = t.backendSettings?.card || {};
    let n = Ne(e.inline_thumb_pct, 0);
    if (!n) {
      const o = Ne(e.inline_thumb_w, at);
      n = Math.round(o / at * 100) || Sa;
    }
    return n = Math.max(1, n), {
      w: Math.max(1, Math.round(at * n / 100)),
      h: Math.max(1, Math.round(ka * n / 100)),
      pct: n
    };
  }`;

const VENDOR_STICKY_LA_PATCH = `  function La() {
    const e = t.backendSettings?.card || {};
    let n = Ne(e.inline_thumb_pct, 0);
    if (!n) {
      const o = Ne(e.inline_thumb_w, at);
      n = Math.round(o / at * 100) || Sa;
    }
    const ov = t.overlayUi || {};
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    const alwaysOn = Nt();
    const userCollapsed = !!ov._stickyThumbCollapsed;
    const editorOpen = !!ov._stickyEditorOpen || !!t.cardTagUi || !!t.charEditUi;
    const pct = typeof VC?.resolveStickyThumbPct == "function"
      ? VC.resolveStickyThumbPct({ settingsPct: n, alwaysOn, userCollapsed, editorOpen })
      : alwaysOn && !userCollapsed && !editorOpen ? Math.max(0, n) : 0;
    if (typeof VC?.stickyThumbBoxFromPct == "function") return VC.stickyThumbBoxFromPct(pct, at, ka);
    return {
      w: Math.max(0, Math.round(at * pct / 100)),
      h: Math.max(0, Math.round(ka * pct / 100)),
      pct
    };
  }`;

const VENDOR_STICKY_KEEP_NEEDLE = `    const keepHidden = typeof VC?.shouldKeepStickyThumbHidden == "function" ? VC.shouldKeepStickyThumbHidden(!!e._stickyThumbUserHidden, e._stickyThumbHiddenId, activeIdNow) : !!(e._stickyThumbUserHidden && String(e._stickyThumbHiddenId || "") === String(activeIdNow || "") && activeIdNow);
    if (!keepHidden && e._stickyThumbUserHidden) e._stickyThumbUserHidden = !1, e._stickyThumbHiddenId = "";
`;

const VENDOR_STICKY_KEEP_PATCH = ``;

const VENDOR_STICKY_SHOW_NEEDLE = `    const showStickyImg = p && !hideThumbOffscreen && !keepHidden, u = 6, b = 11, C = 4;`;
const VENDOR_STICKY_SHOW_PATCH = `    const showStickyImg = m.pct > 0 && !hideThumbOffscreen, u = 6, b = 11, C = 4;`;

const VENDOR_STICKY_SKIP_NEEDLE = `e._lastHideThumbOff === hideThumbOffscreen && e._lastStickyUserHidden === keepHidden && e._lastVpW === vpW`;
const VENDOR_STICKY_SKIP_PATCH = `e._lastHideThumbOff === hideThumbOffscreen && e._lastVpW === vpW`;

const VENDOR_STICKY_ASSIGN_NEEDLE = `e._lastHideThumbOff = hideThumbOffscreen, e._lastStickyUserHidden = keepHidden, e._lastVpW = vpW`;
const VENDOR_STICKY_ASSIGN_PATCH = `e._lastHideThumbOff = hideThumbOffscreen, e._lastVpW = vpW`;

const VENDOR_STICKY_CLICK_NEEDLE = `      if (fPress.source === "sticky-thumb") {
        await hidePressFill();
        const ov = t.overlayUi;
        if (ov) ov._stickyThumbUserHidden = !0, ov._stickyThumbHiddenId = fPress.card?.id || "", ov._lastStickyUserHidden = null;
        try {
          await Ht();
        } catch {
        }
        y("info", "sticky.thumb.hide", String(fPress.card?.id || "").slice(0, 8));
        return;
      }
      if (fPress.source === "sticky-pin") {
        const ov = t.overlayUi;
        if (ov) ov._stickyThumbUserHidden = !1, ov._stickyThumbHiddenId = "", ov._lastStickyUserHidden = null;
        try {
          await Ht();
        } catch {
        }`;

const VENDOR_STICKY_CLICK_PATCH = `      if (fPress.source === "sticky-thumb") {
        await hidePressFill();
        const ov = t.overlayUi;
        if (ov) ov._stickyThumbCollapsed = !ov._stickyThumbCollapsed;
        try {
          await Ht();
        } catch {
        }
        y("info", ov?._stickyThumbCollapsed ? "sticky.thumb.hide" : "sticky.thumb.show", String(fPress.card?.id || "").slice(0, 8));
        return;
      }
      if (fPress.source === "sticky-pin") {
        const ov = t.overlayUi;
        if (ov) ov._stickyThumbCollapsed = !1;
        try {
          await Ht();
        } catch {
        }`;

const VENDOR_STICKY_PRESS_NEEDLE = `if (!g?.active || !g.thumb || t.overlayUi?._stickyThumbUserHidden) continue;`;
const VENDOR_STICKY_PRESS_PATCH = `if (!g?.active || !g.thumb || t.overlayUi?._stickyThumbCollapsed) continue;`;

const VENDOR_STICKY_REVIVE_NEEDLE = `if (Nt() && t.overlayUi?._stickyThumbUserHidden) {`;
const VENDOR_STICKY_REVIVE_PATCH = `if (Nt() && t.overlayUi?._stickyThumbCollapsed) {`;

const VENDOR_STICKY_INIT_NEEDLE = `      _stickyThumbUserHidden: !1,
      _stickyThumbHiddenId: "",
      _lastStickyUserHidden: null,`;
const VENDOR_STICKY_INIT_PATCH = `      _stickyThumbCollapsed: !1,
      _stickyEditorOpen: !1,`;

const VENDOR_STICKY_RESET_NEEDLE = `e._lastStickyThumbHtmlId = null, e._stickyThumbUserHidden = !1, e._stickyThumbHiddenId = "", e._lastStickyUserHidden = null);`;
const VENDOR_STICKY_RESET_PATCH = `e._lastStickyThumbHtmlId = null, e._stickyThumbCollapsed = !1, e._stickyEditorOpen = !1);`;

const VENDOR_STICKY_OPEN_CARD_NEEDLE = `  async function openCardTagEdit(e) {
    if (!e?.id) return;
    if (typeof document > "u" || !document.body) {
      y("error", "card.tags.open", "plugin document unavailable");
      return;
    }
    await closeCharacterCreateModal().catch(() => null);
    await closeCardTagEdit(), await xe();`;

const VENDOR_STICKY_OPEN_CARD_PATCH = `  async function openCardTagEdit(e) {
    if (!e?.id) return;
    if (typeof document > "u" || !document.body) {
      y("error", "card.tags.open", "plugin document unavailable");
      return;
    }
    await closeCharacterCreateModal().catch(() => null);
    await closeCardTagEdit(), await xe();
    if (t.overlayUi) t.overlayUi._stickyEditorOpen = !0;
    try { await Ht(); } catch {}`;

const VENDOR_STICKY_OPEN_CHAR_NEEDLE = `  async function Ua(e) {
    if (!e?.name) return;
    if (typeof document > "u" || !document.body) {
      y("error", "char.edit.open", "plugin document unavailable");
      return;
    }
    await closeCardTagEdit(), await xe(), await closeCharacterCreateModal().catch(() => null);`;

const VENDOR_STICKY_OPEN_CHAR_PATCH = `  async function Ua(e) {
    if (!e?.name) return;
    if (typeof document > "u" || !document.body) {
      y("error", "char.edit.open", "plugin document unavailable");
      return;
    }
    await closeCardTagEdit(), await xe(), await closeCharacterCreateModal().catch(() => null);
    if (t.overlayUi) t.overlayUi._stickyEditorOpen = !0;
    try { await Ht(); } catch {}`;

const VENDOR_STICKY_CLOSE_CARD_NEEDLE = `  async function closeCardTagEdit() {
    const e = t.cardTagUi, n = e?.root || (typeof document < "u" ? document.getElementById("nx-card-tag-modal") : null);
    try {
      n?.remove?.();
    } catch {
    }
    const o = !!e?.openedContainer;
    if (t.cardTagUi = null, o && !t.uiOpen && typeof k.hideContainer == "function") try {
      await k.hideContainer();
    } catch {
    }
  }`;

const VENDOR_STICKY_CLOSE_CARD_PATCH = `  async function closeCardTagEdit() {
    const e = t.cardTagUi, n = e?.root || (typeof document < "u" ? document.getElementById("nx-card-tag-modal") : null);
    try {
      n?.remove?.();
    } catch {
    }
    const o = !!e?.openedContainer;
    if (t.cardTagUi = null, o && !t.uiOpen && typeof k.hideContainer == "function") try {
      await k.hideContainer();
    } catch {
    }
    if (t.overlayUi && !t.charEditUi) {
      t.overlayUi._stickyEditorOpen = !1;
      try { await Ht(); } catch {}
    }
  }`;

const VENDOR_STICKY_CLOSE_CHAR_NEEDLE = `    if (t.charEditUi = null, t.autotagFocus?.scope === "modal" && (t.autotagFocus = null), o && !t.uiOpen && typeof k.hideContainer == "function") try {
      await k.hideContainer();
    } catch {
    }
    // Viewer stays visible during overlays — no restoreFloatingViewerAfterModal.
    if (t.galleryUi?.renderCast) try {
      await t.galleryUi.renderCast();
    } catch {
    }
  }
  async function Ua(e) {`;

const VENDOR_STICKY_CLOSE_CHAR_PATCH = `    if (t.charEditUi = null, t.autotagFocus?.scope === "modal" && (t.autotagFocus = null), o && !t.uiOpen && typeof k.hideContainer == "function") try {
      await k.hideContainer();
    } catch {
    }
    // Viewer stays visible during overlays — no restoreFloatingViewerAfterModal.
    if (t.galleryUi?.renderCast) try {
      await t.galleryUi.renderCast();
    } catch {
    }
    if (t.overlayUi && !t.cardTagUi) {
      t.overlayUi._stickyEditorOpen = !1;
      try { await Ht(); } catch {}
    }
  }
  async function Ua(e) {`;

const PLUGIN_HEADER = `//@name ${PLUGIN_ID}
//@display-name Inlay Nexus ${PLUGIN_VERSION}
//@api 3.0
//@version ${PLUGIN_VERSION}
//@update-url https://raw.githubusercontent.com/happydesk213124/inlaynex2.0/main/dist/inlaynexus2.0.js
//@link https://github.com/happydesk213124/inlaynex2.0 GitHub
//@description Inlay Nexus LLM tagging + NovelAI overlay
//@arg inlay_enabled string true|false; blank uses true
//@arg inlay_capture_delay_ms string Quiet time before assistant capture; blank uses 1400
//@arg inlay_debug string true|false; blank uses false
`;

/**
 * Every prompt the backend can ask for, in the order 1.x emitted them.
 *
 * The list is explicit rather than a directory scan so that a prompt file being
 * deleted or renamed fails the build. The compiled-in values in
 * `src/config/prompt-fallbacks.json` are one-line stubs, so a prompt missing
 * here does not throw at runtime — it quietly sends a useless request to the
 * LLM, which is far harder to notice than a broken build.
 */
const PROMPT_KEYS = [
  'author_note', 'tagger', 'format', 'appearance_inject', 'lore_inject',
  'char_inject', 'preprocess', 'prefill', 'preset_1', 'autotag',
] as const;

/**
 * Reads the prompt pack and embeds it opaquely as `__INLAY_NATIVE_PROMPTS__`.
 *
 * `author_note.txt` is legitimately empty, so an empty file is fine but a
 * missing one is not. Plaintext is XOR+base64 encoded so the public raw URL
 * does not expose the prompt text as readable JSON; runtime decode is in
 * `src/config/prompt-codec.ts`. Audit still compares the decoded pack to disk.
 */
const loadPrompts = (): string => {
  const pack: Record<string, string> = {};
  for (const key of PROMPT_KEYS) {
    const file = join(PROMPTS_DIR, `${key}.txt`);
    if (!existsSync(file)) throw new Error(`[build] missing prompts/${key}.txt`);
    // Verbatim, including the CRLF that four of these files carry. Line endings
    // do not reach the LLM — `cleanText` normalises them — but audit diffs the
    // decoded pack against these files byte-for-byte.
    pack[key] = readFileSync(file, 'utf8');
  }
  const encoded = encodePromptPack(pack);
  return `/* Embedded Inlay Nexus prompt pack (opaque) */\nglobalThis.__INLAY_NATIVE_PROMPTS__ = ${JSON.stringify(encoded)};\n`;
};

const assertOnce = (source: string, needle: string, label: string): void => {
  let count = 0;
  let at = source.indexOf(needle);
  while (at !== -1) {
    count += 1;
    at = source.indexOf(needle, at + needle.length);
  }
  if (count !== 1) {
    throw new Error(`[build] expected exactly 1 occurrence of ${label}, found ${count}`);
  }
};

const loadVendorUi = (): string => {
  const raw = readFileSync(VENDOR_UI, 'utf8').replace(/\r\n/g, '\n');

  // The UI must already be the native-bridge build; we never re-patch it here.
  for (const needle of [
    `var Zt = "${PLUGIN_ID}"`,
    'Inlay Nexus backend unavailable',
    'globalThis.__INLAY_NATIVE__',
  ]) {
    if (!raw.includes(needle)) {
      throw new Error(`[build] vendor UI is not the native-bridge build (missing: ${needle})`);
    }
  }

  // Asserted patches only — never hand-edit vendor/inlay-nexus-ui.js.
  assertOnce(raw, VENDOR_VERSION_NEEDLE, VENDOR_VERSION_NEEDLE);
  assertOnce(raw, VENDOR_PROMPT_RESET_NEEDLE, 'prompt-reset confirm insertion point');
  assertOnce(raw, VENDOR_NATURAL_BASE_HTML_NEEDLE, 'natural_base checkbox');
  assertOnce(raw, VENDOR_NATURAL_BASE_SAVE_NEEDLE, 'natural_base save ee()');
  assertOnce(raw, VENDOR_NATURAL_BASE_CT_NEEDLE, 'natural_base Ct() insert');
  assertOnce(raw, VENDOR_NATURAL_BASE_CARD_NEEDLE, 'natural_base card 3-col');
  assertOnce(raw, VENDOR_NATURAL_BASE_HELP_NEEDLE, 'natural_base help entry');
  assertOnce(raw, VENDOR_GLOBAL_TOGGLE_SUMMARY_NEEDLE, 'global toggle summary');
  assertOnce(raw, VENDOR_GLOBAL_TOGGLE_BODY_NEEDLE, 'global toggle body row');
  assertOnce(raw, VENDOR_EXPLORER_THUMB_PAINT_NEEDLE, 'explorer thumb paint');
  assertOnce(raw, VENDOR_EXPLORER_THUMB_WARM_NEEDLE, 'explorer thumb warm');
  assertOnce(raw, VENDOR_EXPLORER_WARM_PROGRESS_NEEDLE, 'explorer warm progress');
  assertOnce(raw, VENDOR_PRESET_QT_NEEDLE, 'preset Qt()');
  assertOnce(raw, VENDOR_PRESET_UN_NEEDLE, 'preset un() merge');
  assertOnce(raw, VENDOR_PRESET_HTML_NEEDLE, 'preset HTML cfg/vibe');
  assertOnce(raw, VENDOR_PRESET_READ_NEEDLE, 'preset _e() read');
  assertOnce(raw, VENDOR_PRESET_FA_NEEDLE, 'preset fa() write');
  assertOnce(raw, VENDOR_PRESET_SYNC_NEEDLE, 'preset form sync');
  assertOnce(raw, VENDOR_PRESET_EXPORT_NEEDLE, 'preset JSON export');
  assertOnce(raw, VENDOR_PRESET_NEW_NEEDLE, 'preset new');
  assertOnce(raw, VENDOR_PRESET_DUP_NEEDLE, 'preset dup');
  assertOnce(raw, VENDOR_PRESET_DEL_NEEDLE, 'preset del clear vibe');
  assertOnce(raw, VENDOR_PRESET_VIBE_EVT_NEEDLE, 'preset vibe upload events');
  for (const [needle, label] of [
    [VENDOR_STICKY_LA_NEEDLE, 'sticky La()'],
    [VENDOR_STICKY_KEEP_NEEDLE, 'sticky keepHidden'],
    [VENDOR_STICKY_SHOW_NEEDLE, 'sticky showStickyImg'],
    [VENDOR_STICKY_SKIP_NEEDLE, 'sticky skip keepHidden'],
    [VENDOR_STICKY_ASSIGN_NEEDLE, 'sticky assign keepHidden'],
    [VENDOR_STICKY_CLICK_NEEDLE, 'sticky click hide/revive'],
    [VENDOR_STICKY_PRESS_NEEDLE, 'sticky press skip'],
    [VENDOR_STICKY_REVIVE_NEEDLE, 'sticky pin revive'],
    [VENDOR_STICKY_INIT_NEEDLE, 'sticky init flags'],
    [VENDOR_STICKY_RESET_NEEDLE, 'sticky reset flags'],
    [VENDOR_STICKY_OPEN_CARD_NEEDLE, 'sticky open card edit'],
    [VENDOR_STICKY_OPEN_CHAR_NEEDLE, 'sticky open char edit'],
    [VENDOR_STICKY_CLOSE_CARD_NEEDLE, 'sticky close card edit'],
    [VENDOR_STICKY_CLOSE_CHAR_NEEDLE, 'sticky close char edit'],
  ] as const) {
    assertOnce(raw, needle, label);
  }
  return raw
    .replace(VENDOR_VERSION_NEEDLE, `He = "${PLUGIN_VERSION}"`)
    .replace(VENDOR_PROMPT_RESET_NEEDLE, VENDOR_PROMPT_RESET_PATCH)
    .replace(VENDOR_NATURAL_BASE_HTML_NEEDLE, VENDOR_NATURAL_BASE_HTML_PATCH)
    .replace(VENDOR_NATURAL_BASE_SAVE_NEEDLE, VENDOR_NATURAL_BASE_SAVE_PATCH)
    .replace(VENDOR_NATURAL_BASE_CT_NEEDLE, VENDOR_NATURAL_BASE_CT_PATCH)
    .replace(VENDOR_NATURAL_BASE_CARD_NEEDLE, VENDOR_NATURAL_BASE_CARD_PATCH)
    .replace(VENDOR_NATURAL_BASE_HELP_NEEDLE, VENDOR_NATURAL_BASE_HELP_PATCH)
    .replace(VENDOR_GLOBAL_TOGGLE_SUMMARY_NEEDLE, VENDOR_GLOBAL_TOGGLE_SUMMARY_PATCH)
    .replace(VENDOR_GLOBAL_TOGGLE_BODY_NEEDLE, VENDOR_GLOBAL_TOGGLE_BODY_PATCH)
    .replace(VENDOR_EXPLORER_THUMB_PAINT_NEEDLE, VENDOR_EXPLORER_THUMB_PAINT_PATCH)
    .replace(VENDOR_EXPLORER_THUMB_WARM_NEEDLE, VENDOR_EXPLORER_THUMB_WARM_PATCH)
    .replace(VENDOR_EXPLORER_WARM_PROGRESS_NEEDLE, VENDOR_EXPLORER_WARM_PROGRESS_PATCH)
    .replace(VENDOR_PRESET_QT_NEEDLE, VENDOR_PRESET_QT_PATCH)
    .replace(VENDOR_PRESET_UN_NEEDLE, VENDOR_PRESET_UN_PATCH)
    .replace(VENDOR_PRESET_HTML_NEEDLE, VENDOR_PRESET_HTML_PATCH)
    .replace(VENDOR_PRESET_READ_NEEDLE, VENDOR_PRESET_READ_PATCH)
    .replace(VENDOR_PRESET_FA_NEEDLE, VENDOR_PRESET_FA_PATCH)
    .replace(VENDOR_PRESET_SYNC_NEEDLE, VENDOR_PRESET_SYNC_PATCH)
    .replace(VENDOR_PRESET_EXPORT_NEEDLE, VENDOR_PRESET_EXPORT_PATCH)
    .replace(VENDOR_PRESET_NEW_NEEDLE, VENDOR_PRESET_NEW_PATCH)
    .replace(VENDOR_PRESET_DUP_NEEDLE, VENDOR_PRESET_DUP_PATCH)
    .replace(VENDOR_PRESET_DEL_NEEDLE, VENDOR_PRESET_DEL_PATCH)
    .replace(VENDOR_PRESET_VIBE_EVT_NEEDLE, VENDOR_PRESET_VIBE_EVT_PATCH)
    .replace(VENDOR_STICKY_LA_NEEDLE, VENDOR_STICKY_LA_PATCH)
    .replace(VENDOR_STICKY_KEEP_NEEDLE, VENDOR_STICKY_KEEP_PATCH)
    .replace(VENDOR_STICKY_SHOW_NEEDLE, VENDOR_STICKY_SHOW_PATCH)
    .replace(VENDOR_STICKY_SKIP_NEEDLE, VENDOR_STICKY_SKIP_PATCH)
    .replace(VENDOR_STICKY_ASSIGN_NEEDLE, VENDOR_STICKY_ASSIGN_PATCH)
    .replace(VENDOR_STICKY_CLICK_NEEDLE, VENDOR_STICKY_CLICK_PATCH)
    .replace(VENDOR_STICKY_PRESS_NEEDLE, VENDOR_STICKY_PRESS_PATCH)
    .replace(VENDOR_STICKY_REVIVE_NEEDLE, VENDOR_STICKY_REVIVE_PATCH)
    .replace(VENDOR_STICKY_INIT_NEEDLE, VENDOR_STICKY_INIT_PATCH)
    .replace(VENDOR_STICKY_RESET_NEEDLE, VENDOR_STICKY_RESET_PATCH)
    .replace(VENDOR_STICKY_CLOSE_CHAR_NEEDLE, VENDOR_STICKY_CLOSE_CHAR_PATCH)
    .replace(VENDOR_STICKY_OPEN_CHAR_NEEDLE, VENDOR_STICKY_OPEN_CHAR_PATCH)
    .replace(VENDOR_STICKY_CLOSE_CARD_NEEDLE, VENDOR_STICKY_CLOSE_CARD_PATCH)
    .replace(VENDOR_STICKY_OPEN_CARD_NEEDLE, VENDOR_STICKY_OPEN_CARD_PATCH);
};

/** Wraps the emitted chunk in an IIFE, prepends the header, appends the frozen UI. */
const composePluginBundle = (): Plugin => ({
  name: 'inlay-nexus-compose',
  enforce: 'post',
  generateBundle(_options, bundle) {
    // We ship no CSS of our own: the scaffold's CSS runtime would emit a
    // top-level `const style`, which the vendor UI already declares.
    for (const [fileName, output] of Object.entries(bundle)) {
      if (output.type === 'asset' && fileName.endsWith('.css')) delete bundle[fileName];
    }

    const chunks = Object.values(bundle).filter((o) => o.type === 'chunk');
    if (chunks.length !== 1) {
      throw new Error(`[build] expected a single chunk, got ${chunks.length}`);
    }
    const chunk = chunks[0];
    if (chunk?.type !== 'chunk') throw new Error('[build] chunk missing');

    if (/^\s*(import|export)[\s{*]/m.test(chunk.code)) {
      throw new Error('[build] bundle leaked import/export — IIFE format expected');
    }
    if (/^\s*await\s/m.test(chunk.code)) {
      throw new Error('[build] bundle uses top-level await — it cannot be IIFE-wrapped');
    }

    const body = chunk.code.trim();
    const wrapped = body.startsWith('(function') || body.startsWith('(()=>') || body.startsWith('(() =>')
      ? body
      : `(function(){\n${body}\n})();`;

    // The prompt pack goes ahead of the backend so it is in place before the UI
    // can trigger the first generation, matching the 1.x output layout.
    const composed = `${PLUGIN_HEADER}\n${loadPrompts()}\n${wrapped}\n${loadVendorUi()}`;

    const versionAt = composed.indexOf('//@version');
    if (versionAt < 0 || versionAt >= 512) {
      throw new Error(`[build] //@version must sit inside the first 512 bytes (found at ${versionAt})`);
    }

    chunk.code = composed;
    chunk.fileName = OUT_FILE;
  },
});

/** `--mode development` emits a readable bundle for debugging inside Risu. */
export default defineConfig(({ mode }) => ({
  define: {
    __PLUGIN_ID__: JSON.stringify(PLUGIN_ID),
    __PLUGIN_VERSION__: JSON.stringify(PLUGIN_VERSION),
  },
  build: {
    lib: {
      entry: resolve(configRoot, 'src/main.ts'),
      name: 'InlayNexus',
      fileName: () => OUT_FILE,
      formats: ['iife'],
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    cssCodeSplit: false,
    minify: mode === 'development' ? false : 'esbuild',
    target: 'es2022',
    rolldownOptions: {
      output: { codeSplitting: false },
    },
  },
  plugins: [composePluginBundle()],
}));
