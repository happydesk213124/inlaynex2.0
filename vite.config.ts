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
import {
  VENDOR_MODELS_LLM_NEEDLE,
  VENDOR_MODELS_LLM_PATCH,
  VENDOR_OE_LLM_NEEDLE,
  VENDOR_OE_LLM_PATCH,
  VENDOR_OE_RETURN_NEEDLE,
  VENDOR_OE_RETURN_PATCH,
  VENDOR_LLM_BIND_NEEDLE,
  VENDOR_LLM_BIND_PATCH,
  VENDOR_LLM_SAVE_TEST_NEEDLE,
  VENDOR_LLM_SAVE_TEST_PATCH,
  VENDOR_IMG_BACKEND_DRAFT_NEEDLE,
  VENDOR_IMG_BACKEND_DRAFT_PATCH,
  VENDOR_BA_QUEUE_NEEDLE,
  VENDOR_BA_QUEUE_PATCH,
} from './tools/vendor-patches/llm-roles.mjs';

const configRoot = dirname(fileURLToPath(import.meta.url));

const OUT_FILE = 'inlaynexus2.0.js';
const VENDOR_UI = resolve(configRoot, 'vendor/inlay-nexus-ui.js');
const PROMPTS_DIR = resolve(configRoot, 'prompts');

/**
 * Risu resolves plugin storage by `//@name`, so this id is frozen at the 1.x value.
 * Renaming it would orphan every existing user's settings, gallery and roster.
 */
const PLUGIN_ID = 'inlay-nexus-native';
const PLUGIN_VERSION = '2.3.12';

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
 * Prompts tab: bulk reset (except author_note), pack JSON import/export,
 * and per-prompt JSON import/export beside save/reset.
 */
const VENDOR_PROMPT_TAB_HTML_NEEDLE = `    } else if (t.uiTab === "prompts") {
      const promptMeta = {
        author_note: {
          title: "작가의 노트 (사용자 프롬프트 지침)",
          hint: "비워두면 무시됩니다. 태깅 LLM 요청 맨 끝에 최우선 지침으로 들어갑니다.",
        },
      };
      u = (t.prompts || []).map((d) => {
        const meta = promptMeta[d.key] || null;
        const title = meta?.title || d.key;
        const hint = meta?.hint ? \`<div class="muted" style="margin:4px 0 8px">\${h(meta.hint)}</div>\` : "";
        return \`
          <div class="card">
            <strong>\${h(title)}</strong>\${d.key !== title ? \`<div class="muted" style="font-size:11px;margin-top:2px">\${h(d.key)}</div>\` : ""}
            \${hint}
            <textarea id="nx-prompt-\${h(d.key)}" placeholder="\${d.key === "author_note" ? "예: 항상 실내 조명, 캐릭터는 교복 유지…" : ""}">\${h(t.promptDrafts[d.key] ?? d.text ?? "")}</textarea>
            <div class="row"><button data-save-prompt="\${h(d.key)}">저장</button><button class="secondary" data-reset-prompt="\${h(d.key)}">기본값 복원</button></div>
          </div>\`;
      }).join("");
    }`;

const VENDOR_PROMPT_TAB_HTML_PATCH = `    } else if (t.uiTab === "prompts") {
      const promptMeta = {
        author_note: {
          title: "작가의 노트 (사용자 프롬프트 지침)",
          hint: "비워두면 무시됩니다. 태깅 LLM 요청 맨 끝에 최우선 지침으로 들어갑니다.",
        },
      };
      const promptCards = (t.prompts || []).map((d) => {
        const meta = promptMeta[d.key] || null;
        const title = meta?.title || d.key;
        const hint = meta?.hint ? \`<div class="muted" style="margin:4px 0 8px">\${h(meta.hint)}</div>\` : "";
        return \`
          <div class="card">
            <strong>\${h(title)}</strong>\${d.key !== title ? \`<div class="muted" style="font-size:11px;margin-top:2px">\${h(d.key)}</div>\` : ""}
            \${hint}
            <textarea id="nx-prompt-\${h(d.key)}" placeholder="\${d.key === "author_note" ? "예: 항상 실내 조명, 캐릭터는 교복 유지…" : ""}">\${h(t.promptDrafts[d.key] ?? d.text ?? "")}</textarea>
            <div class="row" style="flex-wrap:wrap;gap:8px">
              <button data-save-prompt="\${h(d.key)}">저장</button>
              <button class="secondary" data-reset-prompt="\${h(d.key)}">기본값</button>
              <button class="secondary" data-export-prompt="\${h(d.key)}">EXPORT</button>
              <button class="secondary" data-import-prompt="\${h(d.key)}">IMPORT</button>
              <input data-import-prompt-file="\${h(d.key)}" type="file" accept=".json,application/json,text/plain" style="display:none">
            </div>
          </div>\`;
      }).join("");
      u = \`
        <div class="prompt-toolbar">
          <div><strong>프롬프트</strong><div class="muted">작가의 노트만 남기고 나머지를 기본값으로 돌리거나, 전체/개별 JSON으로 백업할 수 있습니다.</div></div>
          <div class="toolbar-actions" style="flex-wrap:wrap;gap:8px">
            <button id="nx-prompts-reset-defaults" class="secondary">기본값</button>
            <button id="nx-prompts-export" class="secondary">EXPORT</button>
            <button id="nx-prompts-import" class="secondary">IMPORT</button>
            <input id="nx-prompts-import-file" type="file" accept=".json,application/json,text/plain" style="display:none">
          </div>
        </div>
        \${promptCards}\`;
    }`;

/** Asserted against raw vendor (no confirm yet). */
const VENDOR_PROMPT_TAB_EVENTS_NEEDLE = `    }), document.querySelectorAll("[data-reset-prompt]").forEach((a) => {
      a.addEventListener("click", async () => {
        const r = a.getAttribute("data-reset-prompt");
        try {
          await K(\`/v1/prompts/\${encodeURIComponent(r)}/reset\`, {
            method: "POST",
            body: {}
          }), t.promptDrafts[r] = "", delete t.promptDrafts[r], t.uiMessage = {
            type: "success",
            text: \`\${r} 복원\`
          }, await Je();
        } catch (i) {
          t.uiMessage = {
            type: "error",
            text: z(i.message || i)
          };
        }
        await P();
      });
    }), document.getElementById("nx-nai-ref-pick")?.addEventListener("click", () => {`;

/** Match target after VENDOR_PROMPT_RESET_PATCH inserts the confirm guard. */
const VENDOR_PROMPT_TAB_EVENTS_AFTER_RESET_NEEDLE = `    }), document.querySelectorAll("[data-reset-prompt]").forEach((a) => {
      a.addEventListener("click", async () => {
        const r = a.getAttribute("data-reset-prompt");
        if (!globalThis.confirm?.(\`정말로 "\${r}" 프롬프트를 기본값으로 복원할까요?\`)) return;
        try {
          await K(\`/v1/prompts/\${encodeURIComponent(r)}/reset\`, {
            method: "POST",
            body: {}
          }), t.promptDrafts[r] = "", delete t.promptDrafts[r], t.uiMessage = {
            type: "success",
            text: \`\${r} 복원\`
          }, await Je();
        } catch (i) {
          t.uiMessage = {
            type: "error",
            text: z(i.message || i)
          };
        }
        await P();
      });
    }), document.getElementById("nx-nai-ref-pick")?.addEventListener("click", () => {`;

const VENDOR_PROMPT_TAB_EVENTS_PATCH = `    }), document.querySelectorAll("[data-reset-prompt]").forEach((a) => {
      a.addEventListener("click", async () => {
        const r = a.getAttribute("data-reset-prompt");
        if (!globalThis.confirm?.(\`정말로 "\${r}" 프롬프트를 기본값으로 복원할까요?\`)) return;
        try {
          await K(\`/v1/prompts/\${encodeURIComponent(r)}/reset\`, {
            method: "POST",
            body: {}
          }), t.promptDrafts[r] = "", delete t.promptDrafts[r], t.uiMessage = {
            type: "success",
            text: \`\${r} 복원\`
          }, await Je();
        } catch (i) {
          t.uiMessage = {
            type: "error",
            text: z(i.message || i)
          };
        }
        await P();
      });
    }), document.querySelectorAll("[data-export-prompt]").forEach((a) => {
      a.addEventListener("click", () => {
        const r = a.getAttribute("data-export-prompt");
        if (!r) return;
        const text = document.getElementById(\`nx-prompt-\${r}\`)?.value ?? t.promptDrafts[r] ?? "";
        const blob = new Blob([JSON.stringify({ key: r, text }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob), link = document.createElement("a");
        link.href = url, link.download = \`inlay-prompt-\${r}-\${new Date().toISOString().slice(0, 10)}.json\`, document.body.appendChild(link), link.click(), link.remove(), setTimeout(() => URL.revokeObjectURL(url), 1e3);
        t.uiMessage = { type: "success", text: \`\${r} JSON 내보내기\` };
        P().catch(() => null);
      });
    }), document.querySelectorAll("[data-import-prompt]").forEach((a) => {
      a.addEventListener("click", () => {
        const r = a.getAttribute("data-import-prompt");
        if (!r) return;
        document.querySelector(\`[data-import-prompt-file="\${CSS.escape(r)}"]\`)?.click();
      });
    }), document.querySelectorAll("[data-import-prompt-file]").forEach((a) => {
      a.addEventListener("change", async (ev) => {
        const r = a.getAttribute("data-import-prompt-file"), file = ev.target?.files?.[0];
        if (!r || !file) return;
        try {
          const parsed = JSON.parse(await file.text());
          let text = "";
          if (parsed && typeof parsed === "object") {
            if (typeof parsed.text === "string") text = parsed.text;
            else if (parsed.prompts && typeof parsed.prompts[r] === "string") text = parsed.prompts[r];
            else if (typeof parsed[r] === "string") text = parsed[r];
            else throw new Error("JSON에 text 필드가 없습니다");
          } else throw new Error("잘못된 JSON");
          const box = document.getElementById(\`nx-prompt-\${r}\`);
          box && (box.value = text), t.promptDrafts[r] = text;
          await K(\`/v1/prompts/\${encodeURIComponent(r)}\`, { method: "PUT", body: { text } });
          t.uiMessage = { type: "success", text: \`\${r} JSON 불러옴\` };
          await Je(), await P();
        } catch (err) {
          t.uiMessage = { type: "error", text: z(err?.message || err) };
          await P();
        } finally {
          a.value = "";
        }
      });
    }), document.getElementById("nx-prompts-reset-defaults")?.addEventListener("click", async () => {
      if (!globalThis.confirm?.("작가의 노트를 제외한 모든 프롬프트를 기본값으로 복원할까요?")) return;
      try {
        await K("/v1/prompts/reset-defaults", { method: "POST", body: { keep_author_note: true } });
        t.promptDrafts = {};
        t.uiMessage = { type: "success", text: "프롬프트 기본값 복원 (작가 노트 유지)" };
        await Je(), await P();
      } catch (err) {
        t.uiMessage = { type: "error", text: z(err?.message || err) };
        await P();
      }
    }), document.getElementById("nx-prompts-export")?.addEventListener("click", async () => {
      try {
        const res = await K("/v1/prompts/export", { method: "GET" });
        const blob = new Blob([JSON.stringify({ version: res?.version, prompts: res?.prompts || {} }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob), link = document.createElement("a");
        link.href = url, link.download = \`inlay-prompts-\${new Date().toISOString().slice(0, 10)}.json\`, document.body.appendChild(link), link.click(), link.remove(), setTimeout(() => URL.revokeObjectURL(url), 1e3);
        t.uiMessage = { type: "success", text: "전체 프롬프트 JSON 내보내기" };
        await P();
      } catch (err) {
        t.uiMessage = { type: "error", text: z(err?.message || err) };
        await P();
      }
    }), document.getElementById("nx-prompts-import")?.addEventListener("click", () => {
      document.getElementById("nx-prompts-import-file")?.click();
    }), document.getElementById("nx-prompts-import-file")?.addEventListener("change", async (ev) => {
      const file = ev.target?.files?.[0];
      if (!file) return;
      try {
        const json = await file.text();
        await K("/v1/prompts/import", { method: "POST", body: { json } });
        t.promptDrafts = {};
        t.uiMessage = { type: "success", text: "전체 프롬프트 JSON 불러옴" };
        await Je(), await P();
      } catch (err) {
        t.uiMessage = { type: "error", text: z(err?.message || err) };
        await P();
      } finally {
        ev.target.value = "";
      }
    }), document.getElementById("nx-nai-ref-pick")?.addEventListener("click", () => {`;



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

/** Removed from original wide rows — re-homed next to Include Max (see PERSON_TAG_WEIGHT). */
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

const VENDOR_NATURAL_BASE_CARD_PATCH = ``;

const VENDOR_NATURAL_BASE_HELP_NEEDLE =
  `"nx-natural-base": { title: "자연어 base 태그", body: "이미지 요청에 짧은 자연어 장면도 함께 넣습니다. 태그만 쓸 때보다 분위기가 자연스러워질 수 있습니다." }`;

const VENDOR_NATURAL_BASE_HELP_PATCH =
  `"nx-natural-base": { title: "자연어 base", body: "NovelAI base에 넣는 자연어 장면을 고릅니다. 안넣기 / 짧게 넣기(머리·나이·성별·행동) / 구도·자세히(구도·표정·옷·조명) / 태그 보완 자연어(태그가 못 담는 문장)." },
  "nx-person-tag-weight": { title: "사람 태그 강조", body: "메인 프롬프트 맨 앞 인원 태그(1girl, 1boy, solo…)에 NovelAI 강조(N::태그::)를 겁니다. 0=감싸지 않음, 1–5=가중치. 큐레이션 leaf의 composition 인원 태그는 넣지 않습니다." },
  "nx-person-tag-solo": { title: "캐릭 1명일 때 solo", body: "샷 캐릭터가 1명이면 1girl/1boy 대신 solo를 맨 앞에 넣습니다. 사람 태그 강조 수치가 그대로 적용됩니다. 사람 태그 자동넣기가 「안 넣기」여도 이 토글이 켜져 있으면 solo만은 넣습니다." },
  "nx-curation-mode": { title: "큐레이팅 모드", body: "사용안함: 지금과 동일. 2단: 그룹 선택 후 하위 옵션으로 씬 태그. 임베딩식: 자유 씬 태그를 카탈로그와 유사도 매칭해 교체(캐릭터 태그는 유지)." },
  "nx-curation-strict-ids": { title: "엄격 ID 모드", body: "2단 모드 전용. 켜면 카메라·상황·자연어·동작/표정을 자유 문장으로 쓰지 않고 카탈로그 ID로만 조립합니다. 캐릭터별 ID(characters[].option_ids)도 추가로 받아 배우 index별로 적용하며, 외형/의상은 절대 덮어쓰지 않습니다." },
  "nx-curation-catalog": { title: "큐레이션 카탈로그", body: "Inlay groups JSON 또는 NovelAI DEFAULT_PRESET_CATALOG(modifier_library)를 불러올 수 있습니다. 기본은 소형 SFW. 거대 카탈로그는 저장소·임베딩 비용이 큽니다." },
  "nx-curation-embed": { title: "임베딩 생성", body: "카탈로그 옵션을 벡터로 만들어 기기에 저장합니다. 임베딩식 모드에서 씬 태그 스냅에 사용. 미생성·실패 시 사용안함과 동일하게 생성됩니다." },
  "nx-curation-embedding-provider": { title: "임베딩 모델", body: "모델 설정 탭과 같은 UX입니다. Provider를 바꾸면 Endpoint·Model 기본값이 따라갑니다. OpenAI / Voyage / OpenRouter / LM Studio / Ollama / Custom. networkFetch로 호출합니다." }`;

/**
 * Card settings: person_tag_weight number next to Include Max.
 * 0 = plain person tags; 1–5 = N::1girl, 1boy::.
 */
const VENDOR_PERSON_TAG_WEIGHT_HTML_NEEDLE =
  `<label><span>Include Max (최근 문맥 개수)</span><input id="nx-include-max" type="number" min="0" max="20" value="\${h(i.include_max ?? 0)}"></label>
`;

const VENDOR_PERSON_TAG_WEIGHT_HTML_PATCH =
  `<label data-nx-help-id="nx-include-max"><span>Include Max (최근 문맥 개수)</span><input id="nx-include-max" type="number" min="0" max="20" value="\${h(i.include_max ?? 0)}"></label>
            <label data-nx-help-id="nx-person-tag-weight"><span>사람 태그 강조 (0–5)</span><input id="nx-person-tag-weight" type="number" min="0" max="5" step="1" value="\${h(i.person_tag_weight ?? 3)}"></label>
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
`;

const VENDOR_PERSON_TAG_WEIGHT_CT_NEEDLE =
  `      include_max: Number(N("nx-include-max") || e.include_max || 0),
`;

const VENDOR_PERSON_TAG_WEIGHT_CT_PATCH =
  `      include_max: Number(N("nx-include-max") || e.include_max || 0),
      person_tag_weight: document.getElementById("nx-person-tag-weight") ? re(N("nx-person-tag-weight"), 0, 5, re(e.person_tag_weight, 0, 5, 3)) : re(e.person_tag_weight, 0, 5, 3),
`;

/**
 * Preprocessing checkbox is unused spaghetti — hide UI, keep card.preprocessing
 * as a silent dummy. Slot becomes person_tag_solo (1 char → solo tag).
 */
const VENDOR_PERSON_TAG_SOLO_HTML_NEEDLE =
  `<label class="check wide"><input id="nx-preprocess" type="checkbox" \${i.preprocessing ? "checked" : ""}> Preprocessing (토큰 추가 소모)</label>
`;
const VENDOR_PERSON_TAG_SOLO_HTML_PATCH =
  `<div class="checks-grid" style="grid-column:1/-1;margin-top:4px">
            <label class="toggle-row" data-nx-help-id="nx-person-tag-solo" style="justify-content:flex-start;white-space:nowrap"><input type="checkbox" id="nx-person-tag-solo" \${i.person_tag_solo ? "checked" : ""} style="flex-shrink:0;margin:0"><span>캐릭 1명일 때 solo 태그</span></label>
            <label class="toggle-row" data-nx-help-id="nx-costume" style="justify-content:flex-start;white-space:nowrap"><input type="checkbox" id="nx-costume" \${i.costume === !0 || i.costume === "true" || i.costume === 1 || i.costume === "1" || i.costume === "on" ? "checked" : ""} style="flex-shrink:0;margin:0"><span>코스튬 (샷에서 복장 고르기)</span></label>
            </div>
`;

const VENDOR_PERSON_TAG_SOLO_CT_NEEDLE =
  `      preprocessing: document.getElementById("nx-preprocess") ? ee("nx-preprocess") : !!e.preprocessing,
`;
const VENDOR_PERSON_TAG_SOLO_CT_PATCH =
  `      preprocessing: !!e.preprocessing,
      person_tag_solo: document.getElementById("nx-person-tag-solo") ? ee("nx-person-tag-solo") : !!e.person_tag_solo,
`;

/** Shot-tag modal: add 안 넣기 + solo-when-one (reads card.person_tag_solo). */
const VENDOR_CARD_TAG_PERSON_SLOTS_NEEDLE =
  `}, personTagsForSlots = (Vt, Xt) => {
      const Yt = (Vt || []).filter((me) => w(me.name || "") || w(me.prompt || "")), Gt = Yt.length;
      if (!Gt || Xt === "off") return "";
      if (Xt === "girls") return formatCountTag(Gt, "1girl", "girls", "6+girls");
      if (Xt === "people") return formatCountTag(Gt, "1person", "people", "6+people");
      let Kt = 0, Qt = 0;
      for (const me of Yt) {
        const nn = w(me.name || "", 200), Le = roster.find((ut) => ut.name.toLowerCase() === nn.toLowerCase()), ut = classifyGender([Le?.appearance, Le?.attire, me.prompt, me.name].filter(Boolean).join(", "));
        ut === "f" ? Kt += 1 : ut === "m" && (Qt += 1);
      }
      return [formatCountTag(Kt, "1girl", "girls", "6+girls"), formatCountTag(Qt, "1boy", "boys", "6+boys")].filter(Boolean).join(", ");
    };`;
const VENDOR_CARD_TAG_PERSON_SLOTS_PATCH =
  `}, personTagsForSlots = (Vt, Xt) => {
      const Yt = (Vt || []).filter((me) => w(me.name || "") || w(me.prompt || "")), Gt = Yt.length;
      if (!Gt) return "";
      // Settings solo toggle: 1 char → solo (even when mode is 안 넣기).
      if (t.backendSettings?.card?.person_tag_solo === !0 && Gt === 1) return "solo";
      if (Xt === "off") return "";
      if (Xt === "girls") return formatCountTag(Gt, "1girl", "girls", "6+girls");
      if (Xt === "people") return formatCountTag(Gt, "1person", "people", "6+people");
      let Kt = 0, Qt = 0;
      for (const me of Yt) {
        const nn = w(me.name || "", 200), Le = roster.find((ut) => ut.name.toLowerCase() === nn.toLowerCase()), ut = classifyGender([Le?.appearance, Le?.attire, me.prompt, me.name].filter(Boolean).join(", "));
        ut === "f" ? Kt += 1 : ut === "m" && (Qt += 1);
      }
      return [formatCountTag(Kt, "1girl", "girls", "6+girls"), formatCountTag(Qt, "1boy", "boys", "6+boys")].filter(Boolean).join(", ");
    };`;

const VENDOR_CARD_TAG_PERSON_INIT_NEEDLE =
  `const root = document.createElement("div"), initMode = settingsMode === "off" ? "gender" : settingsMode, initAuto = settingsMode !== "off";`;
const VENDOR_CARD_TAG_PERSON_INIT_PATCH =
  `const root = document.createElement("div"), initMode = ["gender", "girls", "people", "off"].includes(settingsMode) ? settingsMode : "gender", initAuto = settingsMode !== "off";`;

const VENDOR_CARD_TAG_PERSON_SELECT_NEEDLE =
  `<select data-ct-person-mode style="min-width:150px;\${field}"><option value="gender" \${initMode === "gender" ? "selected" : ""}>성별 1girl/1boy</option><option value="girls" \${initMode === "girls" ? "selected" : ""}>인원 → girls</option><option value="people" \${initMode === "people" ? "selected" : ""}>인원 → people</option></select>`;
const VENDOR_CARD_TAG_PERSON_SELECT_PATCH =
  `<select data-ct-person-mode style="min-width:150px;\${field}"><option value="gender" \${initMode === "gender" ? "selected" : ""}>성별 1girl/1boy</option><option value="girls" \${initMode === "girls" ? "selected" : ""}>인원 → girls</option><option value="people" \${initMode === "people" ? "selected" : ""}>인원 → people</option><option value="off" \${initMode === "off" ? "selected" : ""}>안 넣기</option></select>`;

const VENDOR_CARD_TAG_PERSON_MODE_NEEDLE =
  `}, currentMode = () => {
      const Vt = String(modeEl?.value || "gender");
      return ["gender", "girls", "people"].includes(Vt) ? Vt : "gender";
    }, applyAutoPerson = (Vt = !1) => {`;
const VENDOR_CARD_TAG_PERSON_MODE_PATCH =
  `}, currentMode = () => {
      const Vt = String(modeEl?.value || "gender");
      return ["gender", "girls", "people", "off"].includes(Vt) ? Vt : "gender";
    }, applyAutoPerson = (Vt = !1) => {`;

/** Dashboard: auto_aspect toggle only; asset NAI moved to card options select. */
const VENDOR_ASSET_NAI_HTML_NEEDLE =
  `<label class="toggle-row" data-nx-help-id="nx-appearance"><input type="checkbox" id="nx-appearance" \${i.char_appearance !== !1 ? "checked" : ""}><span>CharAppearance 누적</span></label>
`;

const VENDOR_ASSET_NAI_HTML_PATCH =
  `<label class="toggle-row" data-nx-help-id="nx-appearance"><input type="checkbox" id="nx-appearance" \${i.char_appearance !== !1 ? "checked" : ""}><span>CharAppearance 누적</span></label>
            <label class="toggle-row" data-nx-help-id="nx-auto-aspect"><input type="checkbox" id="nx-auto-aspect" \${i.auto_aspect ? "checked" : ""}><span>자동 비율 조절</span></label>
            <label class="toggle-row" data-nx-help-id="nx-llm-json-retry"><input type="checkbox" id="nx-llm-json-retry" \${i.llm_json_retry ? "checked" : ""}><span>JSON 오류 시 재시도</span></label>
`;

const VENDOR_ASSET_NAI_SAVE_NEEDLE =
  `      char_appearance: ee("nx-appearance"),
`;

const VENDOR_ASSET_NAI_SAVE_PATCH =
  `      char_appearance: ee("nx-appearance"),
      auto_aspect: ee("nx-auto-aspect"),
      llm_json_retry: ee("nx-llm-json-retry"),
`;

/** Card options: asset NAI select after solo+costume checks-grid. */
const VENDOR_ASSET_NAI_CARD_NEEDLE =
  `<div class="checks-grid" style="grid-column:1/-1;margin-top:4px">
            <label class="toggle-row" data-nx-help-id="nx-person-tag-solo" style="justify-content:flex-start;white-space:nowrap"><input type="checkbox" id="nx-person-tag-solo" \${i.person_tag_solo ? "checked" : ""} style="flex-shrink:0;margin:0"><span>캐릭 1명일 때 solo 태그</span></label>
            <label class="toggle-row" data-nx-help-id="nx-costume" style="justify-content:flex-start;white-space:nowrap"><input type="checkbox" id="nx-costume" \${i.costume === !0 || i.costume === "true" || i.costume === 1 || i.costume === "1" || i.costume === "on" ? "checked" : ""} style="flex-shrink:0;margin:0"><span>코스튬 (샷에서 복장 고르기)</span></label>
            </div>`;

const VENDOR_ASSET_NAI_CARD_PATCH =
  `<div class="checks-grid" style="grid-column:1/-1;margin-top:4px">
            <label class="toggle-row" data-nx-help-id="nx-person-tag-solo" style="justify-content:flex-start;white-space:nowrap"><input type="checkbox" id="nx-person-tag-solo" \${i.person_tag_solo ? "checked" : ""} style="flex-shrink:0;margin:0"><span>캐릭 1명일 때 solo 태그</span></label>
            <label class="toggle-row" data-nx-help-id="nx-costume" style="justify-content:flex-start;white-space:nowrap"><input type="checkbox" id="nx-costume" \${i.costume === !0 || i.costume === "true" || i.costume === 1 || i.costume === "1" || i.costume === "on" ? "checked" : ""} style="flex-shrink:0;margin:0"><span>코스튬 (샷에서 복장 고르기)</span></label>
            </div>
            <label class="wide" data-nx-help-id="nx-asset-nai-tags"><span>에셋 NAI 태그</span><select id="nx-asset-nai-tags">
              <option value="off" \${i.asset_nai_tags === !1 || i.asset_nai_tags === "off" || !i.asset_nai_tags ? "selected" : ""}>사용안함</option>
              <option value="inline" \${i.asset_nai_tags === "inline" ? "selected" : ""}>그냥 옛날버전 (통째로 보내기)</option>
              <option value="prepass" \${i.asset_nai_tags === "prepass" ? "selected" : ""}>LLM 따로 호출</option>
              <option value="prepass_vision" \${i.asset_nai_tags === !0 || i.asset_nai_tags === "prepass_vision" ? "selected" : ""}>LLM 따로 호출 + 이미지 파일 보내기</option>
            </select></label>
            <div class="model-form-pair" style="margin-top:4px">
              <label data-nx-help-id="nx-fixed-prompt-prefix"><span>선행 고정 프롬프트</span><textarea id="nx-fixed-prompt-prefix" rows="4" maxlength="8000" placeholder="프리셋·장면 앞에 항상 붙음">\${h(i.fixed_prompt_prefix || "")}</textarea></label>
              <label data-nx-help-id="nx-fixed-prompt-suffix"><span>후행 고정 프롬프트</span><textarea id="nx-fixed-prompt-suffix" rows="4" maxlength="8000" placeholder="품질 태그 앞에 항상 붙음">\${h(i.fixed_prompt_suffix || "")}</textarea></label>
            </div>
            <div class="row" style="grid-column:1/-1;margin-top:4px;gap:8px;flex-wrap:wrap">
              <button type="button" id="nx-fixed-prompt-save">프롬프트 저장</button>
              <button type="button" id="nx-fixed-prompt-export" class="secondary">EXPORT</button>
              <button type="button" id="nx-fixed-prompt-import" class="secondary">IMPORT</button>
              <input id="nx-fixed-prompt-file" type="file" accept=".json,application/json,text/plain" style="display:none">
            </div>`;

const VENDOR_ASSET_NAI_CT_NEEDLE =
  `      natural_base: document.getElementById("nx-natural-base") ? N("nx-natural-base") || "short" : e.natural_base || "short",`;

const VENDOR_ASSET_NAI_CT_PATCH =
  `      natural_base: document.getElementById("nx-natural-base") ? N("nx-natural-base") || "short" : e.natural_base || "short",
      asset_nai_tags: document.getElementById("nx-asset-nai-tags") ? N("nx-asset-nai-tags") || "off" : e.asset_nai_tags || "off",
      costume: document.getElementById("nx-costume") ? !!document.getElementById("nx-costume").checked : !!e.costume,
      fixed_prompt_prefix: document.getElementById("nx-fixed-prompt-prefix") ? String(N("nx-fixed-prompt-prefix") || "").slice(0, 8000) : String(e.fixed_prompt_prefix || "").slice(0, 8000),
      fixed_prompt_suffix: document.getElementById("nx-fixed-prompt-suffix") ? String(N("nx-fixed-prompt-suffix") || "").slice(0, 8000) : String(e.fixed_prompt_suffix || "").slice(0, 8000),`;

const VENDOR_ASSET_NAI_HELP_NEEDLE =
  `"nx-appearance": { title: "CharAppearance 누적", body: "한 번 잡힌 캐릭터 외형을 다음 생성에도 이어 씁니다. 옷·머리색이 장면마다 크게 바뀌는 걸 줄입니다." },
`;

const VENDOR_ASSET_NAI_HELP_PATCH =
  `"nx-appearance": { title: "CharAppearance 누적", body: "한 번 잡힌 캐릭터 외형을 다음 생성에도 이어 씁니다. 옷·머리색이 장면마다 크게 바뀌는 걸 줄입니다." },
    "nx-asset-nai-tags": { title: "에셋 NAI 태그", body: "로어 트리거와 이름이 맞는 Risu 에셋 PNG/WebP의 NovelAI 메타 태그를 어떻게 태거에 넣을지 고릅니다. artist·year·품질·*background·straight-on은 제외.\\n\\n• 사용안함 — 에셋 태그를 쓰지 않습니다.\\n• 그냥 옛날버전 (통째로 보내기) — 로어북·에셋 태그를 메인 태거 한 번에 넣습니다. LLM 1회. 컨텍스트가 길어져 토큰을 많이 씁니다.\\n• LLM 따로 호출 — 에셋 태그로 캐릭터 룩만 먼저 채운 뒤 메인 태거를 돌립니다. LLM 2회.\\n• LLM 따로 호출 + 이미지 파일 보내기 — 룩 LLM에 캐릭터당 대표 이미지 1장(최대 5장)을 함께 보냅니다. 비전 입력만큼 토큰·비용이 큽니다." },
    "nx-costume": { title: "코스튬", body: "켜면 메인 태거가 캐릭터별 코스튬 목록을 보고 샷마다 복장을 고릅니다(이름·번호). 꺼도 에셋으로 캐릭을 만들 때는 복장이 코스튬으로 나뉘어 저장됩니다. 샷에 고른 값이 없으면 항상 index 0(기본)을 씁니다." },
    "nx-auto-aspect": { title: "자동 비율 조절", body: "켜면 샷마다 태거가 portrait/square/landscape를 고르고, 생성 크기를 832×1216 / 1024×1024 / 1216×832로 맞춥니다(NovelAI 기본 사이즈). ComfyUI는 워크플로 Empty Latent 등에 [[width]]/[[height]]를 넣어야 반영됩니다. 끄면 NAI Width/Height 설정을 씁니다." },
    "nx-llm-json-retry": { title: "JSON 오류 시 재시도", body: "메인 태거 응답이 JSON으로 파싱되지 않으면, 오류 내용을 붙여 LLM에 한 번 더 요청합니다. 재시도도 실패하면 작업이 오류로 끝납니다." },
    "nx-fixed-prompt-prefix": { title: "선행 고정 프롬프트", body: "값이 있으면 사람 태그 다음·스타일 프리셋/장면 앞에 항상 붙습니다. 프리셋이 바뀌어도 유지됩니다." },
    "nx-fixed-prompt-suffix": { title: "후행 고정 프롬프트", body: "값이 있으면 장면·큐레이션 뒤·NAI 품질 태그 앞에 항상 붙습니다. JSON으로 내보내/가져오기 할 수 있습니다." },
`;

/** Card options: focus_character select after asset NAI tags. */
const VENDOR_FOCUS_CHAR_CARD_NEEDLE =
  `<label class="wide" data-nx-help-id="nx-asset-nai-tags"><span>에셋 NAI 태그</span><select id="nx-asset-nai-tags">
              <option value="off" \${i.asset_nai_tags === !1 || i.asset_nai_tags === "off" || !i.asset_nai_tags ? "selected" : ""}>사용안함</option>
              <option value="inline" \${i.asset_nai_tags === "inline" ? "selected" : ""}>그냥 옛날버전 (통째로 보내기)</option>
              <option value="prepass" \${i.asset_nai_tags === "prepass" ? "selected" : ""}>LLM 따로 호출</option>
              <option value="prepass_vision" \${i.asset_nai_tags === !0 || i.asset_nai_tags === "prepass_vision" ? "selected" : ""}>LLM 따로 호출 + 이미지 파일 보내기</option>
            </select></label>
            <div class="model-form-pair" style="margin-top:4px">`;

const VENDOR_FOCUS_CHAR_CARD_PATCH =
  `<label class="wide" data-nx-help-id="nx-asset-nai-tags"><span>에셋 NAI 태그</span><select id="nx-asset-nai-tags">
              <option value="off" \${i.asset_nai_tags === !1 || i.asset_nai_tags === "off" || !i.asset_nai_tags ? "selected" : ""}>사용안함</option>
              <option value="inline" \${i.asset_nai_tags === "inline" ? "selected" : ""}>그냥 옛날버전 (통째로 보내기)</option>
              <option value="prepass" \${i.asset_nai_tags === "prepass" ? "selected" : ""}>LLM 따로 호출</option>
              <option value="prepass_vision" \${i.asset_nai_tags === !0 || i.asset_nai_tags === "prepass_vision" ? "selected" : ""}>LLM 따로 호출 + 이미지 파일 보내기</option>
            </select></label>
            <div style="display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.55fr) minmax(0,1fr);gap:8px;margin-top:4px;grid-column:1/-1">
              <label data-nx-help-id="nx-focus-character"><span>중점 캐릭터</span><select id="nx-focus-character">
                <option value="off" \${!i.focus_character || i.focus_character === "off" ? "selected" : ""}>사용안함</option>
                <option value="female" \${i.focus_character === "female" ? "selected" : ""}>여성위주</option>
                <option value="male" \${i.focus_character === "male" ? "selected" : ""}>남성위주</option>
                <option value="auto" \${i.focus_character === "auto" ? "selected" : ""}>LLM이 알아서 고르기</option>
              </select></label>
              <label data-nx-help-id="nx-focus-weight"><span>중점강도 (0–5)</span><input id="nx-focus-weight" type="number" min="0" max="5" step="0.1" value="\${h(i.focus_weight ?? 2)}"></label>
              <label data-nx-help-id="nx-focus-prompt"><span>프롬프트 강도</span><select id="nx-focus-prompt">
                <option value="default" \${!i.focus_prompt || i.focus_prompt === "default" ? "selected" : ""}>기본값</option>
                <option value="strong" \${i.focus_prompt === "strong" ? "selected" : ""}>좀더 강하게 넣기</option>
                <option value="always" \${i.focus_prompt === "always" ? "selected" : ""}>무조건 넣기</option>
                <option value="manual" \${i.focus_prompt === "manual" ? "selected" : ""}>수동으로 넣기</option>
              </select></label>
            </div>
            <div class="model-form-pair" style="margin-top:4px">`;

const VENDOR_FOCUS_CHAR_CT_NEEDLE =
  `      asset_nai_tags: document.getElementById("nx-asset-nai-tags") ? N("nx-asset-nai-tags") || "off" : e.asset_nai_tags || "off",
      costume: document.getElementById("nx-costume") ? !!document.getElementById("nx-costume").checked : !!e.costume,`;

const VENDOR_FOCUS_CHAR_CT_PATCH =
  `      asset_nai_tags: document.getElementById("nx-asset-nai-tags") ? N("nx-asset-nai-tags") || "off" : e.asset_nai_tags || "off",
      focus_character: document.getElementById("nx-focus-character") ? N("nx-focus-character") || "off" : e.focus_character || "off",
      focus_weight: (() => {
        const raw = document.getElementById("nx-focus-weight") ? N("nx-focus-weight") : e.focus_weight;
        const n = Number(raw);
        return Number.isFinite(n) ? Math.max(0, Math.min(5, Math.round(n * 10) / 10)) : 2;
      })(),
      focus_prompt: document.getElementById("nx-focus-prompt") ? N("nx-focus-prompt") || "default" : e.focus_prompt || "default",
      costume: document.getElementById("nx-costume") ? !!document.getElementById("nx-costume").checked : !!e.costume,`;

const VENDOR_FOCUS_CHAR_HELP_NEEDLE =
  `"nx-asset-nai-tags": { title: "에셋 NAI 태그", body: "로어 트리거와 이름이 맞는 Risu 에셋 PNG/WebP의 NovelAI 메타 태그를 어떻게 태거에 넣을지 고릅니다. artist·year·품질·*background·straight-on은 제외.\\n\\n• 사용안함 — 에셋 태그를 쓰지 않습니다.\\n• 그냥 옛날버전 (통째로 보내기) — 로어북·에셋 태그를 메인 태거 한 번에 넣습니다. LLM 1회. 컨텍스트가 길어져 토큰을 많이 씁니다.\\n• LLM 따로 호출 — 에셋 태그로 캐릭터 룩만 먼저 채운 뒤 메인 태거를 돌립니다. LLM 2회.\\n• LLM 따로 호출 + 이미지 파일 보내기 — 룩 LLM에 캐릭터당 대표 이미지 1장(최대 5장)을 함께 보냅니다. 비전 입력만큼 토큰·비용이 큽니다." },
`;

const VENDOR_FOCUS_CHAR_HELP_PATCH =
  `"nx-asset-nai-tags": { title: "에셋 NAI 태그", body: "로어 트리거와 이름이 맞는 Risu 에셋 PNG/WebP의 NovelAI 메타 태그를 어떻게 태거에 넣을지 고릅니다. artist·year·품질·*background·straight-on은 제외.\\n\\n• 사용안함 — 에셋 태그를 쓰지 않습니다.\\n• 그냥 옛날버전 (통째로 보내기) — 로어북·에셋 태그를 메인 태거 한 번에 넣습니다. LLM 1회. 컨텍스트가 길어져 토큰을 많이 씁니다.\\n• LLM 따로 호출 — 에셋 태그로 캐릭터 룩만 먼저 채운 뒤 메인 태거를 돌립니다. LLM 2회.\\n• LLM 따로 호출 + 이미지 파일 보내기 — 룩 LLM에 캐릭터당 대표 이미지 1장(최대 5장)을 함께 보냅니다. 비전 입력만큼 토큰·비용이 큽니다." },
    "nx-focus-character": { title: "중점 캐릭터", body: "켜면 태거가 샷 JSON에 focus(1·char1 또는 [1,2]처럼 여러 명)를 넣을 수 있습니다. 중점이 아닌 캐릭터 캡션에 out of frame을 붙입니다. 여성/남성위주는 선택 힌트(수동 모드에서는 성별 필터)입니다." },
    "nx-focus-weight": { title: "중점강도", body: "중점 외 캐릭터에 붙는 out of frame 강조입니다. 0–5, 소수점 1자리(예: 2.5). 1 초과는 N::out of frame::, 0–1은 강조 없이 out of frame만 넣습니다. 기본 2." },
    "nx-focus-prompt": { title: "프롬프트 강도", body: "중점 focus를 태거에 어떻게 시킬지입니다.\\n\\n• 기본값 — 필요할 때만(애매하면 비움)\\n• 좀더 강하게 넣기 — 쓸 수 있으면 자주 넣도록\\n• 무조건 넣기 — 매 샷 focus 필수\\n• 수동으로 넣기 — LLM에 묻지 않고, 여성/남성위주일 때 반대 성별 캐릭에 out of frame을 코드로 붙입니다(알아서 고르기와는 함께 쓰이지 않음)." },
`;

/** Models → ComfyUI: document [[width]]/[[height]] (auto_aspect / NAI W·H). */
const VENDOR_COMFY_MUTED_NEEDLE =
  `"로컬 ComfyUI API · [[pos]] / [[neg]] / [[char1]]… / [[seed]]"`;

const VENDOR_COMFY_MUTED_PATCH =
  `"로컬 ComfyUI API · [[pos]] / [[neg]] / [[char1]]… / [[width]] / [[height]] / [[seed]]"`;

const VENDOR_COMFY_HELP_NEEDLE =
  `              3) JSON 안에서 긍정 프롬프트를 넣는 칸에 <code>[[pos]]</code>, 부정에 <code>[[neg]]</code>, 캐릭터 태그를 넣고 싶은 칸에 <code>[[char1]]</code> / <code>[[char2]]</code> … 를 적어 둡니다.<br>
              4) 저장 후 생성하면 Inlay가 만든 프롬프트로 그 자리가 치환됩니다.<br><br>
              <strong>시드 (랜덤)</strong> — API Export의 숫자 seed는 요청마다 Inlay가 새 랜덤 시드로 덮어씁니다.<br>
              명시적으로 쓰려면 <code>"seed": "[[seed]]"</code>처럼 <strong>따옴표로 감싸서</strong> 넣으세요. (숫자만 남겨둬도 자동 랜덤)<br><br>`;

const VENDOR_COMFY_HELP_PATCH =
  `              3) JSON 안에서 긍정 프롬프트를 넣는 칸에 <code>[[pos]]</code>, 부정에 <code>[[neg]]</code>, 캐릭터 태그를 넣고 싶은 칸에 <code>[[char1]]</code> / <code>[[char2]]</code> … 를 적어 둡니다.<br>
              4) Empty Latent Image 등 해상도 칸에는 <code>[[width]]</code> / <code>[[height]]</code>를 넣으세요. (자동 비율 조절·NAI Width/Height와 연동)<br>
              5) 저장 후 생성하면 Inlay가 만든 값으로 그 자리가 치환됩니다.<br><br>
              <strong>크기</strong> — <code>"width": "[[width]]"</code>, <code>"height": "[[height]]"</code>처럼 <strong>따옴표로 감싸서</strong> 넣으면 숫자로 치환됩니다. 자동 비율 조절이 켜져 있으면 샷 비율에 맞는 크기, 꺼져 있으면 Models의 NAI Width/Height가 들어갑니다. 같은 방식으로 <code>[[steps]]</code> / <code>[[cfg]]</code>도 쓸 수 있습니다.<br><br>
              <strong>시드 (랜덤)</strong> — API Export의 숫자 seed는 요청마다 Inlay가 새 랜덤 시드로 덮어씁니다.<br>
              명시적으로 쓰려면 <code>"seed": "[[seed]]"</code>처럼 <strong>따옴표로 감싸서</strong> 넣으세요. (숫자만 남겨둬도 자동 랜덤)<br><br>`;

/** Settings nav: add 큐레이팅 tab between models and explorer. */
const VENDOR_CURATION_TABS_NEEDLE = `S = {
      dashboard: "대시보드",
      card: "카드 설정",
      characters: "캐릭터",
      prompts: "프롬프트",
      models: "모델 설정",
      explorer: "이미지 탐색",
      debug: "디버그"
    }, E = [
      "dashboard",
      "card",
      "characters",
      "prompts",
      "models",
      "explorer",
      "debug"
    ]`;

const VENDOR_CURATION_TABS_PATCH = `S = {
      dashboard: "대시보드",
      gen_options: "생성 옵션",
      style_presets: "스타일 프리셋",
      characters: "캐릭터",
      models: "모델 설정",
      explorer: "이미지 탐색",
      curation: "큐레이팅",
      prompts: "프롬프트",
      changelog: "업데이트 내역",
      debug: "디버그"
    }, E = [
      "dashboard",
      "gen_options",
      "style_presets",
      "characters",
      "models",
      "explorer",
      "curation",
      "prompts",
      "changelog",
      "debug"
    ]`;

const VENDOR_CURATION_PANEL_NEEDLE =
  `} else t.uiTab === "explorer" ? u = ma() : t.uiTab === "debug" && (u = \``;

const VENDOR_CURATION_PANEL_PATCH =
  `} else if (t.uiTab === "curation") {
      const EH = globalThis.__INLAY_EMBED__ || {}, cur = t.backendSettings?.curation || {}, emb = cur.embedding || {}, st = t.curationStatus || {}, mode = w(cur.mode) || "off", strictIds = cur.strict_ids === !0, embSt = w(st.embed_status) || "missing", pct = st.embed_progress && st.embed_progress.total ? Math.round(100 * (st.embed_progress.done || 0) / st.embed_progress.total) : 0, embProviderRaw = w(emb.provider) || "openai", embProvider = EH.normalizeEmbeddingProvider?.(embProviderRaw) || embProviderRaw, embProviders = EH.EMBEDDING_PROVIDERS || [{ value: "openai", label: "OpenAI" }, { value: "voyage", label: "Voyage" }, { value: "openrouter", label: "OpenRouter" }, { value: "openai_compat", label: "OpenAI-compat" }, { value: "lmstudio", label: "LM Studio (로컬)" }, { value: "ollama", label: "Ollama (로컬)" }, { value: "custom", label: "Custom endpoint" }], embEpPh = EH.defaultEndpointForEmbedding?.(embProvider) || "https://api.openai.com/v1/embeddings", embModelPh = EH.embeddingModelPlaceholder?.(embProvider) || EH.defaultModelForEmbedding?.(embProvider) || "text-embedding-3-small", embNeedsKey = EH.embeddingProviderNeedsApiKey?.(embProvider) !== !1, embCredOk = !!emb.api_key_configured, embReady = !!(w(emb.model) && (!embNeedsKey || embCredOk));
      u = \`
        <div class="prompt-toolbar">
          <div><strong>큐레이팅</strong><div class="muted">씬 태그 큐레이션. 캐릭터 외형/의상 태그는 모드와 무관하게 LLM이 유지합니다.</div></div>
          <div class="toolbar-actions"><button type="button" id="nx-curation-save">설정 저장</button></div>
        </div>
        <article class="model-card" data-nx-help-id="nx-curation-mode">
          <div class="prompt-title">모드</div>
          <div class="nx-seg" id="nx-curation-mode-bar" style="margin-top:10px">
            <button type="button" data-nx-curation-mode="off" class="\${mode === "off" ? "active" : ""}">사용안함</button>
            <button type="button" data-nx-curation-mode="two_stage" class="\${mode === "two_stage" ? "active" : ""}">2단</button>
            <button type="button" data-nx-curation-mode="embed_snap" class="\${mode === "embed_snap" ? "active" : ""}">임베딩식</button>
          </div>
          <label data-nx-help-id="nx-curation-strict-ids" class="toggle-row" style="margin-top:10px;\${mode === "two_stage" ? "" : "opacity:.5"}"><input type="checkbox" id="nx-curation-strict-ids" \${strictIds ? "checked" : ""} \${mode === "two_stage" ? "" : "disabled"}><span>엄격 ID 모드 (2단 전용) — 씬/동작을 자유 문장 없이 카탈로그 ID로만 조립</span></label>
        </article>
        <article class="model-card" data-nx-help-id="nx-curation-catalog" style="margin-top:12px">
          <div class="prompt-title">카탈로그</div>
          <div class="muted" id="nx-curation-catalog-meta" style="margin-top:8px">\${h(st.catalog_name || "(기본)")} · 그룹 \${st.group_count ?? "-"} · 옵션 \${st.option_count ?? "-"} · sha \${h(st.catalog_sha || "-")}\${st.large_warning ? " · ⚠ 항목 많음" : ""}</div>
          <div class="toolbar-actions" style="margin-top:10px;gap:8px;display:flex;flex-wrap:wrap">
            <label class="secondary" style="cursor:pointer;display:inline-flex;align-items:center;padding:8px 12px;border-radius:10px;border:1px solid var(--border2)"><input type="file" id="nx-curation-catalog-file" accept="application/json,.json" hidden>JSON 불러오기</label>
            <button type="button" class="secondary" id="nx-curation-catalog-reset">기본값 복원</button>
          </div>
        </article>
        <div class="prompt-group-label" style="margin-top:14px">임베딩</div>
        <article class="model-card" data-nx-help-id="nx-curation-embedding-provider">
          <div class="model-head">
            <div><div class="prompt-title">임베딩 모델</div><div class="muted">OpenAI · Voyage · OpenRouter · 로컬 · Custom</div></div>
            <span class="badge \${embReady ? "custom" : "default"}">\${embReady ? "활성" : "비활성"} · \${embNeedsKey ? (embCredOk ? "API key 설정됨" : "API key 없음") : "로컬 (키 선택)"}</span>
          </div>
          <div class="notice info" style="margin:12px 0 0"><strong>팁</strong> Provider를 바꾸면 Endpoint·Model이 기본값으로 바뀝니다. 직접 고친 Endpoint는 유지됩니다.</div>
          <div class="model-form">
            <label><span>Provider</span>
              <select id="nx-curation-emb-provider">
                \${embProviders.map((opt) => \`<option value="\${h(opt.value)}" \${embProvider === opt.value ? "selected" : ""}>\${h(opt.label)}</option>\`).join("")}
              </select>
            </label>
            <label><span>Model</span><input id="nx-curation-emb-model" value="\${h(emb.model || embModelPh)}" placeholder="\${h(embModelPh)}"></label>
            <label class="wide"><span>Endpoint</span><input id="nx-curation-emb-endpoint" type="url" value="\${h(emb.endpoint || embEpPh)}" placeholder="\${h(embEpPh)}"></label>
            <label class="wide"><span>API key <span class="key-status">\${embCredOk ? "설정됨" : "없음"}</span></span><input id="nx-curation-emb-key" type="password" autocomplete="new-password" placeholder="비워 두면 기존 키 유지"></label>
          </div>
          <div class="model-actions"><button type="button" id="nx-curation-emb-test">임베딩 연결 테스트</button>\${(t.modelTestResults || {}).curation_emb ? \`<div id="nx-test-result-curation_emb" class="test-result \${(t.modelTestResults || {}).curation_emb.ok ? "success" : "error"}">\${(t.modelTestResults || {}).curation_emb.ok ? "성공 · " : "실패 · "}\${h((t.modelTestResults || {}).curation_emb.message || "")}</div>\` : \`<div id="nx-test-result-curation_emb" class="test-result">아직 테스트하지 않았습니다.</div>\`}</div>
        </article>
        <article class="model-card" data-nx-help-id="nx-curation-embed" style="margin-top:12px">
          <div class="model-head">
            <div><div class="prompt-title">카탈로그 임베딩 생성</div><div class="muted">선임베딩 → 기기 저장. 생성마다 카탈로그 전체를 다시 보내지 않습니다.</div></div>
            <span class="badge \${embSt === "ready" ? "custom" : "default"}">\${embSt === "ready" ? "준비됨" : embSt === "stale" ? "재생성 필요" : "없음"}</span>
          </div>
          <div class="muted" style="margin-top:8px">\${st.embed_count || 0} vectors · \${h(st.embed_model || "-")}</div>
          <div style="margin-top:10px;height:10px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden"><div id="nx-curation-embed-bar" style="height:100%;width:\${pct}%;background:rgba(124,108,255,.75);transition:width .2s"></div></div>
          <div class="muted" id="nx-curation-embed-msg" style="margin-top:6px">\${h(st.embed_progress?.message || (embSt === "missing" ? "임베딩식 사용 전 생성이 필요합니다." : embSt === "stale" ? "카탈로그/모델이 바뀌었습니다. 다시 생성하세요." : ""))}</div>
          <div class="model-actions" style="margin-top:10px"><button type="button" id="nx-curation-embed-run">임베딩 생성</button></div>
        </article>
      \`;
    } else t.uiTab === "explorer" ? u = ma() : t.uiTab === "changelog" ? (u = \`
        <div class="card">
          <strong>Inlay Nexus 업데이트 내역</strong>
          <div class="muted" style="margin-top:8px">최신 버전이 위에 옵니다. 패치 단위는 시리즈별로 요약했습니다.</div>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.3.12</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>응답 후 자동 생성: afterRequest는 0.5초 뒤 한 번만 (0.3초 3연타 제거)</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.3.11</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>응답 후 자동 생성 2트랙: afterRequest 0.3초 폴링 + 스트리밍 중 말풍선 5초 안정 시 같은 생성</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.3.10</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>응답 후 자동 생성: 0.3초마다 말풍선 글자 확인(최대 3번), 30자 이상이면 생성</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.3.9</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>응답 후 자동 생성: afterRequest(주 채팅 model)만 · 스트리밍 중 스킵 · script 출력은 종료 폴백만</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.3.8</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>말풍선 선택: [data-chat-id] / data-chat-index 기준, 화면 아래(최신)가 DOM#0</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.3.7</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>응답 후 자동 생성: 말풍선 DOM 확정 뒤 1초 대기 후 생성</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.3.6</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>응답 후 자동 생성: afterRequest + chat 출력 + 스트리밍 잠잠(800ms) 폴백 — 최신 캐릭 말풍선 클릭 선택으로 생성</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.3.5</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>Risu 설정 → Inlay 설정 → 닫기 → Risu 닫기 후 플로팅 뷰어 복구 (modal hide 플래그 잔류 수정)</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.3.4</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>응답 후 자동 생성: 주 채팅(model)만 · 0.1초 뒤 클릭과 같은 선택으로 생성(provisional Ka 스킵 제거)</li>
            <li>보조 모델 afterRequest는 선택·생성 안 함</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.3.3</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>이미지 탐색: 선택/폴더 삭제 UI 즉시 반영, 저장소 삭제는 백그라운드</li>
            <li>응답 후 자동 생성: 응답 완료(afterRequest) 시점에만 생성(스트리밍 중 추정 생성 제거)</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.3.2</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>스타일 프리셋 전환: 폼·칩 즉시 반영, 저장은 백그라운드(전체 리렌더 생략)</li>
            <li>프리셋 삭제 후 선택: 맨 앞 대신 이웃(같은 자리→다음, 끝이면 이전)</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.3.1</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>스타일 프리셋 삭제: UI 먼저 반영 후 vibe clear·저장은 백그라운드(모바일 체감 지연 완화)</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.3.0</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>설정/Risu 설정 중 플로팅 뷰어·상시 이미지를 0×0(0%)로 접어 모바일 터치 가로채기 방지 · 위치·크기(geo)는 유지 후 복구</li>
            <li>업데이트 내역 탭: 2.2·2.1 패치를 시리즈 요약으로 정리</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.2</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>설정 크롬: 도움말 오버레이·접기(1px)/펼침(120px) · 모바일 헤더 한 줄 · 저장/EXPORT/IMPORT · 닫기=전체저장 · Risu 플러그인으로 돌아갈 때 뷰어 미복구</li>
            <li>캐릭터 로어북 필터(선택·자동채우기·디버그 프로브) · 누드 시 penis/nipples/pussy는 무기 OFF여도 캡션 포함</li>
            <li>NovelAI 연속 생성: HTTP 끝나자마자 다음 장 · unzip 직후 스피너→이미지 · 저장은 백그라운드</li>
            <li>뷰어: 프리셋/드래그 고스트/리사이즈 손잡이/접힘(아이콘·툴바·재생성·태그 플로팅) · 옵션바 hit · 프리셋 즉시 반영</li>
            <li>진행·인덱싱·선택 토스트 분리·안정화 · 탐색기 폴더 접기·가상 스크롤·선택바</li>
            <li>탭 분리(생성 옵션/스타일 프리셋) · LLM 역할 서브탭 · 큐레이팅 · 참고이미지(vibe/image) · 고정 프롬프트 · lorebook_export</li>
            <li>스티키 v2 · 말풍선 삽화 · 설정 중 뷰어/상시 숨김 · 스크롤·해시 rebind 성능</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.1</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>코스튬 · 에셋 NAI 태그/looks prepass · 탐색기 캐릭터 폴더·가상 스크롤</li>
            <li>말풍선 삽화(beta) · 응답 후 자동 생성 · 진행 토스트 · 재생성·태그 플로팅 접힘</li>
            <li>Comfy [[width]]/[[height]] · 큐레이션 · sticky fit · 중점 캐릭터 · 누드 단계</li>
            <li>solo/코스튬 UI · Firefox 한글 · 샷/캐릭 팝업 시 뷰어 숨김</li>
          </ul>
        </div>
      \`) : t.uiTab === "debug" && (u = \``;

/** Debug tab: 로그 / 태깅 sub-panels for asset-NAI probe. */
const VENDOR_DEBUG_PANEL_NEEDLE = `        <div class="card">
          <strong>런타임 상태</strong>
          <pre id="nx-debug-status" style="margin-top:10px;white-space:pre-wrap;font:12px/1.5 Consolas,monospace;color:#c9d4e6;max-height:360px;overflow:auto;background:rgba(0,0,0,.25);padding:12px;border-radius:12px">\${h(Ve())}</pre>
          <div class="row" style="margin-top:12px">
            <button id="nx-debug-refresh" class="secondary">새로고침</button>
            <button id="nx-debug-clear" class="secondary">로그 비우기</button>
            <button id="nx-debug-copy" class="secondary">로그 복사</button>
            <button id="nx-debug-ping" class="secondary">핑 로그</button>
          </div>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>이벤트 로그 (최신 \${Math.min(120, t.debugLog.length)} / \${t.debugLog.length})</strong>
          <pre id="nx-debug-log" style="margin-top:10px;white-space:pre-wrap;font:11.5px/1.45 Consolas,monospace;color:#b8c4d8;max-height:420px;overflow:auto;background:rgba(0,0,0,.28);padding:12px;border-radius:12px">\${h(Ye(120) || "(아직 로그 없음)")}</pre>
          <div class="notice info" style="margin-top:12px">채팅 화면 좌측 하단 디버그 패널에서도 같은 로그를 볼 수 있습니다. afterRequest → job → gallery → overlay 순서로 찍힙니다.</div>
        </div>`;

const VENDOR_DEBUG_PANEL_PATCH = `        <div class="nx-seg" style="margin-bottom:12px">
          <button type="button" data-nx-debug-panel="log" class="\${(t.debugPanelTab || "log") === "log" ? "active" : ""}">로그</button>
          <button type="button" data-nx-debug-panel="tagging" class="\${(t.debugPanelTab || "log") === "tagging" ? "active" : ""}">태깅</button>
        </div>
        \${(t.debugPanelTab || "log") === "tagging" ? \`
        <div class="card">
          <strong>에셋 NAI 태그 프로브</strong>
          <div class="muted" style="margin-top:8px">선택 메시지로 로어를 잡고, lit된 엔트리의 <b>키 전부</b>로 에셋 이름을 compact-contains 매칭합니다 (트리거당 ≤2 · exact→normal/default/smile→짧은 이름 · common은 트리거별). 결과의 <code>lore_entries_fired</code> / <code>sibling_keys_exported</code> / <code>per_trigger_picks</code>를 복사해서 보내 주세요.</div>
          <div class="row" style="margin-top:12px;gap:8px;flex-wrap:wrap">
            <button type="button" id="nx-debug-asset-tags">현재 선택 DOM → 로어/에셋 체크</button>
            <button type="button" id="nx-debug-asset-tags-copy" class="secondary">리포트 복사</button>
          </div>
          <pre id="nx-debug-asset-tags-out" style="margin-top:12px;white-space:pre-wrap;font:11.5px/1.45 Consolas,monospace;color:#b8c4d8;max-height:560px;overflow:auto;background:rgba(0,0,0,.28);padding:12px;border-radius:12px">\${h(t.debugAssetTagReport || "(아직 실행 안 함 — 채팅에서 메시지를 선택한 뒤 버튼을 누르세요)")}</pre>
        </div>
        \` : \`
        <div class="card">
          <strong>런타임 상태</strong>
          <pre id="nx-debug-status" style="margin-top:10px;white-space:pre-wrap;font:12px/1.5 Consolas,monospace;color:#c9d4e6;max-height:360px;overflow:auto;background:rgba(0,0,0,.25);padding:12px;border-radius:12px">\${h(Ve())}</pre>
          <div class="row" style="margin-top:12px">
            <button id="nx-debug-refresh" class="secondary">새로고침</button>
            <button id="nx-debug-clear" class="secondary">로그 비우기</button>
            <button id="nx-debug-copy" class="secondary">로그 복사</button>
            <button id="nx-debug-ping" class="secondary">핑 로그</button>
          </div>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>이벤트 로그 (최신 \${Math.min(120, t.debugLog.length)} / \${t.debugLog.length})</strong>
          <pre id="nx-debug-log" style="margin-top:10px;white-space:pre-wrap;font:11.5px/1.45 Consolas,monospace;color:#b8c4d8;max-height:420px;overflow:auto;background:rgba(0,0,0,.28);padding:12px;border-radius:12px">\${h(Ye(120) || "(아직 로그 없음)")}</pre>
          <div class="notice info" style="margin-top:12px">채팅 화면 좌측 하단 디버그 패널에서도 같은 로그를 볼 수 있습니다. afterRequest → job → gallery → overlay 순서로 찍힙니다.</div>
        </div>
        \`}`;

const VENDOR_DEBUG_EVENTS_NEEDLE = `document.getElementById("nx-debug-refresh")?.addEventListener("click", async () => {
      await P();
    }), document.getElementById("nx-debug-clear")?.addEventListener("click", async () => {`;

const VENDOR_DEBUG_EVENTS_PATCH = `document.querySelectorAll("[data-nx-debug-panel]").forEach((btn) => btn.addEventListener("click", async () => {
      t.debugPanelTab = btn.getAttribute("data-nx-debug-panel") || "log";
      await P();
    })), document.getElementById("nx-debug-asset-tags")?.addEventListener("click", async () => {
      const btn = document.getElementById("nx-debug-asset-tags");
      if (btn) btn.disabled = !0;
      try {
        const msg = t.selectedMessage;
        const text = w(msg?.text || "", 2e4);
        if (!text) throw new Error("채팅에서 메시지를 먼저 선택하세요 (selectedMessage 없음).");
        const lore = await la();
        const keys = collectTriggeredLoreKeys(lore, text);
        const roster = [...(t.charactersSession || []), ...(t.charactersGlobal || [])].filter(Boolean);
        const scope = t.lastScope || await Z().catch(() => null);
        const cid = String(scope?.characterId || "").trim();
        t.debugAssetTagReport = "실행 중…";
        await P();
        const res = await K("/v1/debug/asset-tags", {
          method: "POST",
          body: {
            message: text,
            lorebook: lore,
            lore_trigger_keys: keys,
            character_id: cid,
            roster,
            selected: {
              hash: msg?.hash || "",
              domIndex: msg?.domIndex,
              chatIndex: msg?.chatIndex,
              role: msg?.role || "",
              preview: w(msg?.preview || text, 120)
            }
          }
        });
        const report = res?.report || res;
        t.debugAssetTagReport = JSON.stringify(report, null, 2);
        y("info", "debug.asset-tags", \`lf=\${report?.lorefilter?.applied ? report?.lorefilter?.out + "/" + report?.lorefilter?.in : report?.lorefilter?.reason || "-"} triggers=\${(report?.asset_match_triggers || []).length} matches=\${(report?.name_matches || []).length} picked=\${report?.ok_picked || 0} siblings=\${(report?.sibling_keys_exported || []).length}\`);
        t.uiMessage = { type: "success", text: "에셋 NAI 태그 프로브 완료 — 리포트 복사해서 보내 주세요" };
      } catch (err) {
        t.debugAssetTagReport = String(err?.message || err);
        t.uiMessage = { type: "error", text: z(err?.message || err) };
        y("error", "debug.asset-tags", err?.message || err);
      } finally {
        if (btn) btn.disabled = !1;
      }
      await P();
    }), document.getElementById("nx-debug-asset-tags-copy")?.addEventListener("click", async () => {
      const text = String(t.debugAssetTagReport || "");
      if (!text || text.startsWith("(아직") || text === "실행 중…") {
        t.uiMessage = { type: "error", text: "먼저 프로브를 실행하세요" };
        await P();
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        t.uiMessage = { type: "success", text: "리포트 복사됨" };
      } catch (err) {
        t.uiMessage = { type: "error", text: "복사 실패: " + z(err?.message || err) };
      }
      await P();
    }), document.getElementById("nx-debug-refresh")?.addEventListener("click", async () => {
      await P();
    }), document.getElementById("nx-debug-clear")?.addEventListener("click", async () => {`;

const VENDOR_CURATION_EVENTS_NEEDLE =
  `document.getElementById("nx-save-models")?.addEventListener("click", async () => {`;


const VENDOR_CURATION_EVENTS_PATCH =
  `document.querySelectorAll("[data-nx-curation-mode]").forEach((btn) => btn.addEventListener("click", async () => {
      const mode = btn.getAttribute("data-nx-curation-mode") || "off";
      try {
        await K("/v1/curation/settings", { method: "POST", body: { mode } });
        if (!t.backendSettings.curation) t.backendSettings.curation = {};
        t.backendSettings.curation.mode = mode;
        await P();
      } catch (err) {
        t.uiMessage = { type: "error", text: String(err?.message || err) };
        await P();
      }
    })), document.getElementById("nx-curation-strict-ids")?.addEventListener("change", async (ev) => {
      const strict_ids = !!ev?.target?.checked;
      try {
        await K("/v1/curation/settings", { method: "POST", body: { strict_ids } });
        if (!t.backendSettings.curation) t.backendSettings.curation = {};
        t.backendSettings.curation.strict_ids = strict_ids;
        await P();
      } catch (err) {
        t.uiMessage = { type: "error", text: String(err?.message || err) };
        await P();
      }
    }), document.getElementById("nx-curation-emb-provider")?.addEventListener("change", (ev) => {
      const EH = globalThis.__INLAY_EMBED__ || {};
      const provider = EH.normalizeEmbeddingProvider?.(ev?.target?.value) || String(ev?.target?.value || "openai");
      const endpointEl = document.getElementById("nx-curation-emb-endpoint");
      const modelEl = document.getElementById("nx-curation-emb-model");
      const nextEndpoint = EH.defaultEndpointForEmbedding?.(provider) || "";
      const nextModel = EH.defaultModelForEmbedding?.(provider) || EH.embeddingModelPlaceholder?.(provider) || "";
      if (endpointEl && (EH.shouldAutoReplaceEmbeddingEndpoint?.(endpointEl.value) !== !1 || !String(endpointEl.value || "").trim())) {
        endpointEl.value = nextEndpoint;
        endpointEl.placeholder = nextEndpoint;
      }
      if (modelEl) {
        if (EH.shouldAutoReplaceEmbeddingModel?.(modelEl.value) !== !1 || !String(modelEl.value || "").trim()) {
          modelEl.value = nextModel;
        }
        modelEl.placeholder = nextModel;
      }
    }), document.getElementById("nx-curation-save")?.addEventListener("click", async () => {
      try {
        const embedding = {
          provider: N("nx-curation-emb-provider") || "openai",
          model: N("nx-curation-emb-model"),
          endpoint: N("nx-curation-emb-endpoint"),
        };
        const key = N("nx-curation-emb-key");
        if (key) embedding.api_key = key;
        await K("/v1/curation/settings", { method: "POST", body: { embedding } });
        const st = await K("/v1/curation/status");
        t.curationStatus = st?.status || st;
        if (t.backendSettings) {
          if (!t.backendSettings.curation) t.backendSettings.curation = {};
          t.backendSettings.curation.embedding = {
            ...(t.backendSettings.curation.embedding || {}),
            provider: embedding.provider,
            model: embedding.model,
            endpoint: embedding.endpoint,
            api_key_configured: !!(key || t.backendSettings.curation.embedding?.api_key_configured),
          };
        }
        t.uiMessage = { type: "success", text: "큐레이팅 설정 저장됨" };
        await P();
      } catch (err) {
        t.uiMessage = { type: "error", text: String(err?.message || err) };
        await P();
      }
    }), document.getElementById("nx-curation-catalog-file")?.addEventListener("change", async (ev) => {
      const file = ev?.target?.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const catalog = JSON.parse(text);
        const res = await K("/v1/curation/catalog", { method: "PUT", body: { catalog } });
        t.curationStatus = res?.status || t.curationStatus;
        t.uiMessage = { type: "success", text: "카탈로그 불러옴 (임베딩은 다시 생성하세요)" };
        await P();
      } catch (err) {
        t.uiMessage = { type: "error", text: String(err?.message || err) };
        await P();
      }
    }), document.getElementById("nx-curation-catalog-reset")?.addEventListener("click", async () => {
      if (!globalThis.confirm?.("카탈로그를 기본값(소형 SFW)으로 복원하고 임베딩을 지울까요?")) return;
      try {
        const res = await K("/v1/curation/catalog/reset", { method: "POST", body: {} });
        t.curationStatus = res?.status || t.curationStatus;
        t.uiMessage = { type: "success", text: "기본 카탈로그로 복원됨" };
        await P();
      } catch (err) {
        t.uiMessage = { type: "error", text: String(err?.message || err) };
        await P();
      }
    }), document.getElementById("nx-curation-emb-test")?.addEventListener("click", async () => {
      const a = document.getElementById("nx-curation-emb-test"), r = document.getElementById("nx-test-result-curation_emb");
      a && (a.disabled = !0), r && (r.className = "test-result pending", r.textContent = "저장 후 테스트 중…");
      try {
        const embedding = {
          provider: N("nx-curation-emb-provider") || "openai",
          model: N("nx-curation-emb-model"),
          endpoint: N("nx-curation-emb-endpoint"),
        };
        const key = N("nx-curation-emb-key");
        if (key) embedding.api_key = key;
        const EH = globalThis.__INLAY_EMBED__ || {};
        const provider = EH.normalizeEmbeddingProvider?.(embedding.provider) || embedding.provider;
        if (!w(embedding.model)) throw new Error("임베딩 Model이 비어 있습니다.");
        if (EH.embeddingProviderNeedsApiKey?.(provider) !== !1) {
          const hasKey = !!(key || t.backendSettings?.curation?.embedding?.api_key_configured);
          if (!hasKey) throw new Error("임베딩 API key가 없습니다. (NovelAI/태깅 LLM 키가 아니라 임베딩용 키)");
        }
        await K("/v1/curation/settings", { method: "POST", body: { embedding } });
        if (t.backendSettings) {
          if (!t.backendSettings.curation) t.backendSettings.curation = {};
          t.backendSettings.curation.embedding = {
            ...(t.backendSettings.curation.embedding || {}),
            provider: embedding.provider,
            model: embedding.model,
            endpoint: embedding.endpoint,
            api_key_configured: !!(key || t.backendSettings.curation.embedding?.api_key_configured),
          };
        }
        const res = await K("/v1/curation/embed/test", { method: "POST", body: {} });
        const ok = !!res?.ok;
        const msg = ok ? \`dims \${res?.dims ?? "?"} · \${res?.model || embedding.model || ""}\` : (res?.message || "연결 실패");
        je("curation_emb", ok, msg);
        t.uiMessage = { type: ok ? "success" : "error", text: ok ? "임베딩 테스트 성공" : \`임베딩 테스트 실패 · \${msg}\` };
      } catch (err) {
        je("curation_emb", !1, err?.message || err);
        t.uiMessage = { type: "error", text: \`임베딩 테스트 실패 · \${err?.message || err}\` };
      } finally {
        a && (a.disabled = !1);
      }
      await P();
    }), document.getElementById("nx-curation-embed-run")?.addEventListener("click", async () => {
      const n = t.curationStatus?.option_count || "?";
      if (!globalThis.confirm?.(\`카탈로그 \${n}개를 임베딩해 저장할까요?\\n기존 벡터는 덮어씁니다.\`)) return;
      const msg = document.getElementById("nx-curation-embed-msg");
      const bar = document.getElementById("nx-curation-embed-bar");
      let poll = 0;
      try {
        if (msg) msg.textContent = "임베딩 시작…";
        poll = globalThis.setInterval(async () => {
          try {
            const st = await K("/v1/curation/status");
            const p = st?.status?.embed_progress || st?.embed_progress;
            if (p && bar) {
              const pct = p.total ? Math.round(100 * (p.done || 0) / p.total) : 0;
              bar.style.width = pct + "%";
              if (msg) msg.textContent = p.message || (p.done + " / " + p.total);
            }
          } catch {
          }
        }, 400);
        const res = await K("/v1/curation/embed", { method: "POST", body: {} });
        globalThis.clearInterval(poll);
        t.curationStatus = res?.status || t.curationStatus;
        t.uiMessage = { type: "success", text: "임베딩 저장 완료" };
        await P();
      } catch (err) {
        globalThis.clearInterval(poll);
        t.uiMessage = { type: "error", text: String(err?.message || err) };
        await P();
      }
    }), document.getElementById("nx-save-models")?.addEventListener("click", async () => {`;

const VENDOR_CURATION_TAB_LOAD_NEEDLE =
  `o.preventDefault(), o.stopPropagation(), t.uiTab = r;
        try {
          window.scrollTo?.(0, 0);
        } catch {
        }
        try {
          document.getElementById("nx-char-edit-modal")?.remove?.();
        } catch {
        }
        t.charEditUi = null, e.querySelectorAll("[data-nx-tab]").forEach((i) => {
          i.classList.toggle("active", i.getAttribute("data-nx-tab") === r);
        }), P();`;

const VENDOR_CURATION_TAB_LOAD_PATCH =
  `o.preventDefault(), o.stopPropagation(), t.uiTab = r;
        try {
          window.scrollTo?.(0, 0);
        } catch {
        }
        try {
          document.getElementById("nx-char-edit-modal")?.remove?.();
        } catch {
        }
        t.charEditUi = null, e.querySelectorAll("[data-nx-tab]").forEach((i) => {
          i.classList.toggle("active", i.getAttribute("data-nx-tab") === r);
        }), P();
        // Paint first with cached curationStatus; refresh meta in background.
        if (r === "curation") {
          K("/v1/curation/status").then((st) => {
            if (t.uiTab !== "curation") return;
            t.curationStatus = st?.status || st;
            P();
          }).catch(() => {});
        }`;

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
          if (typeof src == "string" && /^data:image\\//i.test(src)) {
            if (img.getAttribute("src") !== src) img.setAttribute("src", src);
            img.classList.add("is-ready");
          }
        } catch {
        }
      }
    });
    const r = document.querySelector(".explorer-toolbar .muted");
    r && (r.textContent = \`\${n.length}장\`);
  }
  function ha(e) {`;

/** Old full-folder warm on ha() — disabled; window warm lives in paintExplorerWindow. */
const VENDOR_EXPLORER_THUMB_WARM_NEEDLE = `    a && a.style.setProperty("--ex-thumb", \`\${thumb}px\`);
    paintExplorerSelectionUi(), tt();
  }
  function downloadBase64Zip(b64, filename) {`;

const VENDOR_EXPLORER_THUMB_WARM_PATCH = VENDOR_EXPLORER_THUMB_WARM_NEEDLE;

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
              if (t.uiOpen && t.uiTab === "explorer") {
                if (!t._explorerWarmPaintRaf) {
                  t._explorerWarmPaintRaf = requestAnimationFrame(() => {
                    t._explorerWarmPaintRaf = 0;
                    try {
                      paintExplorerSelectionUi();
                    } catch {
                    }
                  });
                }
              }
            } catch {
            }
            if (t.uiOpen || t._indexPaintQueued) return;
            t._indexPaintQueued = !0;
            Promise.resolve().then(() => {
              t._indexPaintQueued = !1;
              // Job/reroll owns the progress toast — warm ticks must not repaint it (click flicker).
              let jobBusy = !1;
              try {
                jobBusy = !!(t.jobProgress && formatViewerJob(t.jobProgress)?.busy);
              } catch {
                jobBusy = !1;
              }
              if (!jobBusy) {
                syncProgressToast().catch(() => {
                });
              }
              if (t.galleryUi?.paintStatus) t.galleryUi.paintStatus().catch(() => {
              });
            });
          });`;

/** Explorer UX: no auto __all__, character groups, windowed grid + skeletons. */
const VENDOR_EXPLORER_ET_NEEDLE =
  `    let r = t.explorer?.folderKey || "";
    return (r !== "__all__" && (!r || !o.some((i) => i.key === r))) && (r = "__all__"), t.explorer = {
      ...t.explorer,
      folders: o,
      items: a,
      folderKey: r,`;

const VENDOR_EXPLORER_ET_PATCH =
  `    let r = t.explorer?.folderKey || "";
    {
      const EX = exHelpers();
      r = typeof EX.defaultExplorerFolderKey == "function" ? EX.defaultExplorerFolderKey(o, r) : r === "__all__" || o.some((i) => i.key === r) ? r || "__pick__" : "__pick__";
    }
    return t.explorer = {
      ...t.explorer,
      folders: o,
      items: a,
      folderKey: r,`;

const VENDOR_EXPLORER_ZE_NEEDLE =
  `    let a = e.folderKey || "";
    if (a !== "__all__" && (!a || !o.some((f) => f.key === a))) a = o[0]?.key || "__all__";
    const allMode = a === "__all__";
    let r = (e.items || []).filter((i) => allMode || !a || i.folder_key === a);`;

const VENDOR_EXPLORER_ZE_PATCH =
  `    let a = e.folderKey || "";
    a = typeof EX.defaultExplorerFolderKey == "function" ? EX.defaultExplorerFolderKey(o, a) : a === "__all__" || o.some((f) => f.key === a) ? a || "__pick__" : "__pick__";
    const allMode = a === "__all__", pickMode = a === "__pick__";
    const charKey = typeof EX.parseExplorerCharFolderKey == "function" ? EX.parseExplorerCharFolderKey(a) : (typeof a == "string" && a.startsWith("__char__:") ? a.slice(9) : "");
    const charFolderKeys = charKey && typeof EX.explorerFolderKeysForCharacter == "function" ? new Set(EX.explorerFolderKeysForCharacter(o, charKey)) : charKey ? new Set(o.filter((f) => String(f.character_id || f.character_name || "").trim() === charKey).map((f) => f.key)) : null;
    let r = pickMode ? [] : (e.items || []).filter((i) => {
      if (allMode) return !0;
      if (charFolderKeys) return charFolderKeys.has(i.folder_key);
      return !a || i.folder_key === a;
    });`;

const VENDOR_EXPLORER_ENSURE_NEEDLE =
  `    if (t.explorer.mobileSelect == null) t.explorer.mobileSelect = !1;
    return t.explorer;
  }`;

const VENDOR_EXPLORER_ENSURE_PATCH =
  `    if (t.explorer.mobileSelect == null) t.explorer.mobileSelect = !1;
    if (!t.explorer.folderKey) t.explorer.folderKey = "__pick__";
    if (!t.explorer.expandedChars || typeof t.explorer.expandedChars != "object") t.explorer.expandedChars = {};
    if (!t.explorer.folderScroll || typeof t.explorer.folderScroll != "object") t.explorer.folderScroll = {};
    if (t.explorer.foldersCollapsed == null) t.explorer.foldersCollapsed = !1;
    return t.explorer;
  }`;

const VENDOR_EXPLORER_CSS_NEEDLE =
  `.explorer-folders{flex:1;overflow:auto;padding:8px}
.explorer-folder{width:100%;text-align:left;border:0;background:transparent;color:var(--muted);padding:10px 12px;border-radius:10px;cursor:pointer;display:flex;flex-direction:column;gap:3px}
.explorer-folder.active,.explorer-folder:hover{background:var(--accent-soft);color:#e8e4ff}
.explorer-folder strong{font-size:13px;font-weight:700;color:inherit}
.explorer-folder span{font-size:11px;opacity:.8}`;

const VENDOR_EXPLORER_CSS_PATCH =
  `/* Fill remaining viewport under chrome; lists scroll inside; foot stays on-screen. */
body:has(.explorer-shell){overflow:hidden;height:100dvh;max-height:100dvh}
#nx-shell:has(.explorer-shell){height:100dvh;max-height:100dvh;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;padding-bottom:12px}
#nx-shell:has(.explorer-shell) #nx-chrome,#nx-shell:has(.explorer-shell) #nx-notices{flex:0 0 auto}
#nx-shell:has(.explorer-shell) #nx-main{flex:1 1 auto;min-height:0;display:flex;flex-direction:column}
.explorer-shell{flex:1 1 auto;min-height:0;width:100%;display:flex;flex-direction:column;gap:8px;min-width:0;box-sizing:border-box}
.explorer-layout{flex:1 1 auto;min-height:0;overflow:hidden;display:grid;grid-template-columns:260px minmax(0,1fr);gap:14px}
.explorer-folders{flex:1 1 auto;min-height:0;overflow:auto;padding:8px}
.explorer-folder{width:100%;text-align:left;border:0;background:transparent;color:var(--muted);padding:10px 12px;border-radius:10px;cursor:pointer;display:flex;flex-direction:column;gap:3px}
.explorer-folder.active,.explorer-folder:hover{background:var(--accent-soft);color:#e8e4ff}
.explorer-folder strong{font-size:13px;font-weight:700;color:inherit}
.explorer-folder span{font-size:11px;opacity:.8}
.explorer-char{margin:4px 0 2px;border-radius:10px}
.explorer-char-head{width:100%;text-align:left;border:0;background:rgba(255,255,255,.03);color:var(--text);padding:8px 10px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12.5px;font-weight:700}
.explorer-char-head:hover{background:var(--accent-soft)}
.explorer-char-chats{padding:2px 0 4px 8px;display:flex;flex-direction:column;gap:2px}
.explorer-char-chats .explorer-folder{padding:8px 10px}
.explorer-folder.ex-row{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
.explorer-folder.ex-row strong{flex:1;min-width:0;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.explorer-folder.ex-row span{flex:0 0 auto;font-size:11px;opacity:.8;white-space:nowrap}
.explorer-side,.explorer-main{min-height:0;height:100%;max-height:100%;display:flex;flex-direction:column;overflow:hidden}
.explorer-pick-hint{padding:28px 18px;color:var(--muted);font-size:13px;line-height:1.55}
.explorer-card img:not([src]),.explorer-card img[src=""]{background:rgba(255,255,255,.1)}
.explorer-tip{display:none!important}
/* Card grid lives on .explorer-win — never put tall spacers in the same CSS grid as cards (that stretched rows). */
.explorer-win{display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--ex-thumb,148px),1fr));gap:12px;align-items:start;align-content:start;box-sizing:border-box}
.explorer-loading{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:rgba(8,12,20,.55);color:#d7e0ef;font-size:13px;pointer-events:none}
.explorer-loading-spin{width:28px;height:28px;border-radius:999px;border:2px solid rgba(255,255,255,.18);border-top-color:rgba(167,139,250,.95);animation:nxExSpin .7s linear infinite}
@keyframes nxExSpin{to{transform:rotate(360deg)}}
.explorer-foot{flex:0 0 auto;margin:0!important;padding:8px 12px!important;font-size:12px;line-height:1.4}
.explorer-selbar{position:relative;z-index:6;flex-shrink:0;isolation:isolate}
.explorer-main-head{position:relative;z-index:6;flex-shrink:0}
.explorer-card .ex-star{z-index:8!important}
.explorer-card .ex-check{z-index:7}
.explorer-layout.folders-collapsed{grid-template-columns:minmax(0,1fr)!important}
.explorer-layout.folders-collapsed .explorer-side{display:none}
/* Explorer-only: hide global save/export/import + help. Gated on .explorer-shell in the
   DOM — leaving the tab removes the shell and restores chrome (no sticky JS display:none). */
#nx-shell:has(.explorer-shell) .head-help,
#nx-shell:has(.explorer-shell) #nx-save-flash,
#nx-shell:has(.explorer-shell) #nx-save-all,
#nx-shell:has(.explorer-shell) #nx-export-all,
#nx-shell:has(.explorer-shell) #nx-import-all{display:none!important}
/* Other tabs: force chrome controls visible even if a prior inline style tried to hide them. */
#nx-shell:not(:has(.explorer-shell)) .head-help{display:flex!important;visibility:visible!important;opacity:1!important;border-color:rgba(124,108,255,.32);background:rgba(14,18,30,.78);box-shadow:inset 0 0 0 1px rgba(124,108,255,.1)}
#nx-shell:not(:has(.explorer-shell)) #nx-save-all,
#nx-shell:not(:has(.explorer-shell)) #nx-export-all,
#nx-shell:not(:has(.explorer-shell)) #nx-import-all{display:inline-flex!important;visibility:visible!important;opacity:1!important;font-weight:700}
#nx-shell:not(:has(.explorer-shell)) #nx-save-flash{visibility:visible!important;opacity:1!important}
/* Keep side+grid 2-col even at ≤900px; collapse is the only full-width mode. */
@media(max-width:900px){.explorer-layout{grid-template-columns:minmax(120px,38%) minmax(0,1fr);grid-template-rows:none}.explorer-layout.folders-collapsed{grid-template-columns:minmax(0,1fr)!important}}`;

const VENDOR_EXPLORER_GRID_CSS_NEEDLE =
  `.explorer-grid{position:relative;display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--ex-thumb,148px),1fr));gap:12px;padding:14px;max-height:620px;overflow:auto;user-select:none}`;

const VENDOR_EXPLORER_GRID_CSS_PATCH =
  `.explorer-grid{position:relative;display:block;flex:1 1 auto;min-height:0;max-height:none;overflow:auto;user-select:none;padding:14px;box-sizing:border-box}`;

const VENDOR_EXPLORER_SHELL_OPEN_NEEDLE =
  `    return \`
      <div class="explorer-layout">`;

const VENDOR_EXPLORER_SHELL_OPEN_PATCH =
  `    return \`
      <div class="explorer-shell">
      <div class="explorer-layout\${e.foldersCollapsed ? " folders-collapsed" : ""}">`;

const VENDOR_EXPLORER_SHELL_FOOT_NEEDLE =
  `      <div class="notice info" style="margin-top:12px">클릭=선택 · Shift 범위 · Ctrl/⌘ 토글 · 더블클릭=크게보기 · 드래그=박스선택 · Del=삭제 · ZIP에 manifest 포함(불러오기 시 content_hash 재부착).</div>
      <div id="nx-explorer-ctx" class="explorer-ctx">`;

const VENDOR_EXPLORER_SHELL_FOOT_PATCH =
  `      </div>
      <div id="nx-explorer-ctx" class="explorer-ctx">`;

/** One folders collapse toggle before 폴더 ZIP; keeps a reopen control when the side is hidden. */
const VENDOR_EXPLORER_FOLDERS_TOGGLE_NEEDLE =
  `              <button type="button" id="nx-explorer-export-folder" class="secondary" style="min-height:30px;padding:4px 10px">폴더 ZIP</button>`;

const VENDOR_EXPLORER_FOLDERS_TOGGLE_PATCH =
  `              <button type="button" id="nx-explorer-folders-toggle" class="secondary" style="min-height:30px;padding:4px 10px" title="폴더 패널 접기/펼치기">\${e.foldersCollapsed ? "폴더 펼치기" : "폴더 접기"}</button>
              <button type="button" id="nx-explorer-export-folder" class="secondary" style="min-height:30px;padding:4px 10px">폴더 ZIP</button>`;

/** Upstream ≤900px stacks explorer to 1 col — keep head wrap only so our 2-col CSS can win. */
const VENDOR_EXPLORER_MOBILE_1COL_NEEDLE =
  `@media(max-width:900px){.explorer-layout{grid-template-columns:1fr}.head{flex-wrap:wrap;min-height:0;align-items:stretch}.head-help{order:3;flex:1 1 100%;max-width:none;min-width:0;height:72px;min-height:72px;max-height:72px}.head-help-title{flex-basis:96px;width:96px;max-width:96px}}`;

const VENDOR_EXPLORER_MOBILE_1COL_PATCH =
  `@media(max-width:900px){.head{flex-wrap:wrap;min-height:0;align-items:center;justify-content:space-between}.head-brand{flex:0 1 auto;min-width:0}.head-actions{flex:0 1 auto;margin-left:auto}.head-help{order:3;flex:1 1 100%;max-width:none;min-width:0;height:120px;min-height:120px;max-height:120px}}`;

const VENDOR_EXPLORER_FOLDERS_HTML_NEEDLE =
  `    const folderButtons = \`
          <button type="button" class="explorer-folder \${o === "__all__" ? "active" : ""}" data-explorer-folder="__all__">
            <strong>통합 이미지보기</strong>
            <span>모든 캐릭터·채팅 · \${totalCount}장</span>
          </button>\${n.map((r) => \`
          <button type="button" class="explorer-folder \${r.key === o ? "active" : ""}" data-explorer-folder="\${h(r.key)}">
            <strong>\${h(r.character_name || "Unknown")}</strong>
            <span>\${h(r.chat_name || "")} · \${Number(r.count) || 0}장</span>
          </button>\`).join("")}\`;`;

const VENDOR_EXPLORER_FOLDERS_HTML_PATCH =
  `    const expanded = e.expandedChars && typeof e.expandedChars == "object" ? e.expandedChars : {};
    const groups = typeof EX.groupExplorerFolders == "function" ? EX.groupExplorerFolders(n) : (n || []).map((r) => ({ characterKey: r.character_id || r.character_name || r.key, characterName: r.character_name || "Unknown", chats: [r], count: Number(r.count) || 0 }));
    const folderButtons = \`
          <button type="button" class="explorer-folder \${o === "__all__" ? "active" : ""}" data-explorer-folder="__all__">
            <strong>통합 이미지보기</strong>
            <span>모든 캐릭터·채팅 · \${totalCount}장</span>
          </button>\${groups.map((g) => {
            const ck = String(g.characterKey || "");
            const charAllKey = typeof EX.explorerCharFolderKey == "function" ? EX.explorerCharFolderKey(ck) : "__char__:" + ck;
            const hasActive = o === charAllKey || (g.chats || []).some((ch) => ch.key === o);
            const open = expanded[ck] === !0 || hasActive;
            return \`
          <div class="explorer-char" data-explorer-char="\${h(ck)}">
            <button type="button" class="explorer-char-head" data-explorer-char-toggle="\${h(ck)}" aria-expanded="\${open ? "true" : "false"}">
              <span>\${h(g.characterName || "Unknown")} · \${Number(g.count) || 0}장</span>
              <span class="muted" style="font-size:11px">\${open ? "▾" : "▸"} \${(g.chats || []).length}</span>
            </button>
            <div class="explorer-char-chats" style="display:\${open ? "flex" : "none"}">
              <button type="button" class="explorer-folder ex-row \${o === charAllKey ? "active" : ""}" data-explorer-folder="\${h(charAllKey)}">
                <strong>이 캐릭터 전체보기</strong>
                <span>\${Number(g.count) || 0}장</span>
              </button>\${(g.chats || []).map((r) => \`
              <button type="button" class="explorer-folder ex-row \${r.key === o ? "active" : ""}" data-explorer-folder="\${h(r.key)}">
                <strong>\${h(r.chat_name || "chat")}</strong>
                <span>\${Number(r.count) || 0}장</span>
              </button>\`).join("")}</div>
          </div>\`;
          }).join("")}\`;`;

const VENDOR_EXPLORER_GRID_HTML_NEEDLE =
  `          <div class="explorer-grid" style="--ex-thumb:\${thumb}px"><div class="explorer-marquee" id="nx-explorer-marquee"></div>\${et(a)}</div>`;

const VENDOR_EXPLORER_GRID_HTML_PATCH =
  `          <div class="explorer-grid" id="nx-explorer-grid" style="--ex-thumb:\${thumb}px"><div class="explorer-marquee" id="nx-explorer-marquee"></div>\${o === "__pick__" ? '<div class="explorer-pick-hint">왼쪽에서 캐릭터 채팅을 고르거나<br>통합 이미지보기를 눌러 주세요.</div>' : etWindowed(a, 0)}</div>`;

/** Shorter selbar labels so mobile/narrow chrome fits. */
const VENDOR_EXPLORER_SELBAR_LABELS_NEEDLE =
  `            <button type="button" id="nx-explorer-export-sel" class="secondary" style="min-height:28px;padding:4px 10px">선택 ZIP</button>
            <button type="button" id="nx-explorer-save-one" class="secondary" style="min-height:28px;padding:4px 10px">단건 저장</button>
            <button type="button" id="nx-explorer-favonly" class="secondary ex-mobile-select \${e.favOnly ? "active" : ""}" style="min-height:28px;padding:4px 10px" title="별 표시한 이미지만 보기">\${e.favOnly ? "★ 즐겨찾기만" : "☆ 즐겨찾기만"}</button>
            <button type="button" id="nx-explorer-delete-sel" style="min-height:28px;padding:4px 10px">삭제</button>
            <button type="button" id="nx-explorer-clear-sel" class="secondary" style="min-height:28px;padding:4px 10px">선택 해제</button>`;

const VENDOR_EXPLORER_SELBAR_LABELS_PATCH =
  `            <button type="button" id="nx-explorer-export-sel" class="secondary" style="min-height:28px;padding:4px 10px">선택ZIP</button>
            <button type="button" id="nx-explorer-save-one" class="secondary" style="min-height:28px;padding:4px 10px">저장</button>
            <button type="button" id="nx-explorer-favonly" class="secondary ex-mobile-select \${e.favOnly ? "active" : ""}" style="min-height:28px;padding:4px 10px" title="별 표시한 이미지만 보기">\${e.favOnly ? "★" : "☆"}</button>
            <button type="button" id="nx-explorer-delete-sel" style="min-height:28px;padding:4px 10px">삭제</button>
            <button type="button" id="nx-explorer-clear-sel" class="secondary" style="min-height:28px;padding:4px 10px">선택해제</button>`;

const VENDOR_EXPLORER_FAVONLY_PAINT_NEEDLE =
  `favBtn && (favBtn.classList.toggle("active", !!ex.favOnly), favBtn.textContent = ex.favOnly ? "★ 즐겨찾기만" : "☆ 즐겨찾기만");`;

const VENDOR_EXPLORER_FAVONLY_PAINT_PATCH =
  `favBtn && (favBtn.classList.toggle("active", !!ex.favOnly), favBtn.textContent = ex.favOnly ? "★" : "☆");`;

const VENDOR_EXPLORER_ET_FN_NEEDLE =
  `  function et(e) {
    const ex = ensureExplorerState(), sel = ex.selection?.selected || new Set(), fav = new Set(ex.favorites || []), focus = ex.selection?.focusId || "";
    return e.length ? e.map((n) => \`
      <div class="explorer-card \${sel.has(n.id) ? "selected" : ""} \${focus === n.id ? "focus" : ""}" data-explorer-id="\${h(n.id)}" tabindex="0"
        data-tip="\${h(\`\${n.character_name || "?"} / \${n.chat_name || "?"}
메시지 #\${Number(n.message_index) >= 0 ? n.message_index + 1 : "?"} · 샷 \${Number(n.shot_index) + 1}
\${(n.assistant_preview || "").slice(0, 120)}\`)}">
        <div class="ex-check">\${sel.has(n.id) ? "✓" : ""}</div>
        <button type="button" class="ex-star \${fav.has(n.id) ? "is-on" : ""}" data-explorer-star title="즐겨찾기" aria-label="즐겨찾기">\${fav.has(n.id) ? "★" : "☆"}</button>
        <img src="\${h(Ie(n))}" alt="" loading="lazy">
        <div class="cap">msg #\${Number(n.message_index) >= 0 ? n.message_index + 1 : "?"} · shot \${Number(n.shot_index) + 1}<br>\${h((n.assistant_preview || n.main_prompt || "").slice(0, 48))}</div>
      </div>\`).join("") : '<div class="muted" style="padding:18px">이 폴더에 이미지가 없습니다.</div>';
  }`;

const VENDOR_EXPLORER_ET_FN_PATCH =
  `  function etCardHtml(n, sel, fav, focus) {
    const src = Ie(n), ready = typeof src == "string" && /^data:image\\//i.test(src);
    return \`
      <div class="explorer-card \${sel.has(n.id) ? "selected" : ""} \${focus === n.id ? "focus" : ""}" data-explorer-id="\${h(n.id)}" tabindex="0">
        <div class="ex-check">\${sel.has(n.id) ? "✓" : ""}</div>
        <button type="button" class="ex-star \${fav.has(n.id) ? "is-on" : ""}" data-explorer-star title="즐겨찾기" aria-label="즐겨찾기">\${fav.has(n.id) ? "★" : "☆"}</button>
        <img \${ready ? \`src="\${h(src)}" class="is-ready"\` : 'src="" decoding="async"'} alt="" loading="lazy">
        <div class="cap">msg #\${Number(n.message_index) >= 0 ? n.message_index + 1 : "?"} · shot \${Number(n.shot_index) + 1}<br>\${h((n.assistant_preview || n.main_prompt || "").slice(0, 48))}</div>
      </div>\`;
  }
  function et(e) {
    const ex = ensureExplorerState(), sel = ex.selection?.selected || new Set(), fav = new Set(ex.favorites || []), focus = ex.selection?.focusId || "";
    return e.length ? \`<div class="explorer-win">\${e.map((n) => etCardHtml(n, sel, fav, focus)).join("")}</div>\` : '<div class="muted" style="padding:18px">이 폴더에 이미지가 없습니다.</div>';
  }
  function etWindowed(items, scrollTop) {
    const EX = exHelpers(), ex = ensureExplorerState(), sel = ex.selection?.selected || new Set(), fav = new Set(ex.favorites || []), focus = ex.selection?.focusId || "";
    const list = items || [];
    if (!list.length) return '<div class="muted" style="padding:18px">이 폴더에 이미지가 없습니다.</div>';
    const grid = document.getElementById("nx-explorer-grid") || document.querySelector(".explorer-grid");
    const thumb = EX.thumbMinWidth ? EX.thumbMinWidth(ex.thumb || "m") : 148;
    const range = typeof EX.explorerWindowRange == "function" ? EX.explorerWindowRange({
      itemCount: list.length,
      scrollTop: Number(scrollTop) || 0,
      clientHeight: grid?.clientHeight || 620,
      gridWidth: Math.max(1, (grid?.clientWidth || 600) - 28),
      thumbMin: thumb,
      gap: 12,
      overscanRows: EX.EXPLORER_OVERSCAN_ROWS ?? 2
    }) : { start: 0, end: Math.min(list.length, 24), topPad: 0, bottomPad: 0 };
    const slice = list.slice(range.start, range.end);
    t._explorerWindow = { start: range.start, end: range.end, ids: slice.map((x) => x && x.id).filter(Boolean), folderKey: ex.folderKey, scrollTop: Number(scrollTop) || 0 };
    // Padding on the win wrapper — spacers must NOT be CSS-grid siblings of cards (row stretch bug).
    return \`<div class="explorer-win" style="padding-top:\${Math.max(0, range.topPad)}px;padding-bottom:\${Math.max(0, range.bottomPad)}px">\${slice.map((n) => etCardHtml(n, sel, fav, focus)).join("")}</div>\`;
  }
  function syncExplorerMountedIds(ids) {
    const N = globalThis.__INLAY_NATIVE__;
    const list = [...new Set((ids || []).map(String).filter(Boolean))];
    const folderKey = String(t.explorer?.folderKey || "");
    if (t._explorerActiveFolder !== folderKey) {
      for (const id of t._explorerWarmedIds || []) {
        if (typeof N?.dropImageUrl == "function") N.dropImageUrl(id);
      }
      t._explorerWarmedIds = new Set();
      t._explorerActiveFolder = folderKey;
    }
    const prev = t._explorerWarmedIds instanceof Set ? t._explorerWarmedIds : new Set();
    const keep = new Set(list);
    for (const id of prev) {
      if (!keep.has(id) && typeof N?.dropImageUrl == "function") N.dropImageUrl(id);
    }
    t._explorerWarmedIds = keep;
    if (typeof N?.pinImageUrls == "function") N.pinImageUrls(list);
  }
  function warmExplorerVisible(ids, opts) {
    try {
      const N = globalThis.__INLAY_NATIVE__;
      const list = [...new Set((ids || []).map(String).filter(Boolean))];
      const missing = list.filter((id) => {
        try {
          const src = Ie({ id });
          return !(typeof src == "string" && /^data:image\\//i.test(src));
        } catch {
          return !0;
        }
      });
      const done = () => {
        try {
          paintExplorerSelectionUi();
        } catch {
        }
        if (opts?.onDone) opts.onDone();
      };
      if (!missing.length) {
        done();
        return;
      }
      if (typeof N?.warmImages == "function") N.warmImages(missing).then(done).catch(done);
      else if (typeof N?.ensureImageUrl == "function") Promise.all(missing.map((id) => N.ensureImageUrl(id).catch(() => ""))).then(done).catch(done);
      else done();
    } catch {
      if (opts?.onDone) opts.onDone();
    }
  }
  function observeExplorerThumbs(grid) {
    try {
      t._explorerIo?.disconnect?.();
    } catch {
    }
    t._explorerIo = null;
    if (!grid || typeof IntersectionObserver == "undefined") {
      warmExplorerVisible(t._explorerWindow?.ids || []);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      const need = [];
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        const id = en.target?.getAttribute?.("data-explorer-id");
        if (!id) continue;
        const img = en.target.querySelector?.("img");
        if (img?.classList?.contains("is-ready")) continue;
        need.push(id);
      }
      if (need.length) warmExplorerVisible(need);
    }, { root: grid, rootMargin: "120px 0px", threshold: 0.01 });
    t._explorerIo = io;
    grid.querySelectorAll("[data-explorer-id]").forEach((el) => io.observe(el));
  }
  function warmExplorerWindow(ids, opts) {
    syncExplorerMountedIds(ids);
    warmExplorerVisible(ids, opts);
  }
  function setExplorerLoading(grid, on) {
    if (!grid) return;
    let el = grid.querySelector(".explorer-loading");
    if (!on) {
      el?.remove?.();
      return;
    }
    if (!el) {
      el = document.createElement("div");
      el.className = "explorer-loading";
      el.innerHTML = '<div class="explorer-loading-spin" aria-hidden="true"></div><div>로딩 중…</div>';
      grid.appendChild(el);
    }
  }
  function paintExplorerWindow(preserveScroll) {
    const { items: n, folderKey: o } = Ze();
    const a = document.getElementById("nx-explorer-grid") || document.querySelector(".explorer-grid");
    if (!a) return;
    const EX = exHelpers();
    const thumb = EX.thumbMinWidth ? EX.thumbMinWidth(t.explorer?.thumb) : 148;
    a.style.setProperty("--ex-thumb", \`\${thumb}px\`);
    const prevScroll = preserveScroll ? a.scrollTop : (t.explorer?.folderScroll?.[o] || 0);
    if (o === "__pick__") {
      try {
        t._explorerIo?.disconnect?.();
      } catch {
      }
      t._explorerIo = null;
      a.innerHTML = '<div class="explorer-marquee" id="nx-explorer-marquee"></div><div class="explorer-pick-hint">왼쪽에서 캐릭터 채팅을 고르거나<br>통합 이미지보기를 눌러 주세요.</div>';
      paintExplorerSelectionUi();
      return;
    }
    a.innerHTML = \`<div class="explorer-marquee" id="nx-explorer-marquee"></div>\${etWindowed(n, prevScroll)}\`;
    a.scrollTop = prevScroll;
    paintExplorerSelectionUi();
    const ids = t._explorerWindow?.ids || [];
    syncExplorerMountedIds(ids);
    const needLoad = ids.some((id) => {
      try {
        const src = Ie({ id });
        return !(typeof src == "string" && /^data:image\\//i.test(src));
      } catch {
        return !0;
      }
    });
    if (needLoad) setExplorerLoading(a, !0);
    observeExplorerThumbs(a);
    // First paint: warm whatever is already intersecting; clear overlay shortly after.
    warmExplorerVisible(ids.slice(0, Math.min(ids.length, 12)), {
      onDone: () => setExplorerLoading(a, !1)
    });
    tt();
  }
  function bindExplorerCharToggles() {
    const root = document.getElementById("nx-explorer-folders");
    if (!root || root.dataset.nxCharBound) return;
    root.dataset.nxCharBound = "1";
    root.addEventListener("click", (ev) => {
      const btn = ev.target?.closest?.("[data-explorer-char-toggle]");
      if (!btn || !root.contains(btn)) return;
      ev.preventDefault();
      ev.stopPropagation();
      const ck = btn.getAttribute("data-explorer-char-toggle") || "";
      if (!ck) return;
      const ex = ensureExplorerState();
      if (!ex.expandedChars || typeof ex.expandedChars != "object") ex.expandedChars = {};
      const wasOpen = ex.expandedChars[ck] === !0;
      const nowOpen = !wasOpen;
      ex.expandedChars[ck] = nowOpen;
      const wrap = root.querySelector(\`[data-explorer-char="\${CSS.escape(ck)}"]\`);
      const chats = wrap?.querySelector?.(".explorer-char-chats");
      if (chats) chats.style.display = nowOpen ? "flex" : "none";
      btn.setAttribute("aria-expanded", nowOpen ? "true" : "false");
      const mark = btn.querySelector(".muted");
      if (mark) {
        const rest = String(mark.textContent || "").replace(/^[▾▸]\\s*/, "");
        mark.textContent = (nowOpen ? "▾ " : "▸ ") + rest;
      }
    });
  }
  function bindExplorerGridScroll() {
    const grid = document.getElementById("nx-explorer-grid") || document.querySelector(".explorer-grid");
    if (!grid || grid.dataset.nxWinBound) return;
    grid.dataset.nxWinBound = "1";
    let raf = 0;
    grid.addEventListener("scroll", () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!t.uiOpen || t.uiTab !== "explorer") return;
        const { items: n, folderKey: fk } = Ze();
        if (fk === "__pick__") return;
        const ex = ensureExplorerState();
        if (!ex.folderScroll) ex.folderScroll = {};
        const keep = grid.scrollTop || 0;
        ex.folderScroll[fk] = keep;
        const prev = t._explorerWindow || {};
        const html = etWindowed(n, keep);
        const next = t._explorerWindow || {};
        if (prev.folderKey === next.folderKey && prev.start === next.start && prev.end === next.end) return;
        grid.innerHTML = '<div class="explorer-marquee" id="nx-explorer-marquee"></div>' + html;
        grid.scrollTop = keep;
        paintExplorerSelectionUi();
        syncExplorerMountedIds(next.ids || []);
        observeExplorerThumbs(grid);
        tt(); // re-bind click/star on newly mounted window cards
      });
    }, { passive: !0 });
  }`;

/** Replace ha() body: optimistic window paint (no full-folder warm). */
const VENDOR_EXPLORER_HA_NEEDLE =
  `  function ha(e) {
    t.explorer = {
      ...ensureExplorerState(),
      folderKey: e || ""
    };
    const EX = exHelpers();
    t.explorer.selection = EX.clearSelection ? EX.clearSelection(t.explorer.selection) : { selected: new Set(), anchorId: "", focusId: "" };
    const { items: n, folderKey: o } = Ze();
    document.querySelectorAll("[data-explorer-folder]").forEach((i) => {
      i.classList.toggle("active", i.getAttribute("data-explorer-folder") === o);
    });
    const a = document.querySelector(".explorer-grid");
    a && (a.innerHTML = \`<div class="explorer-marquee" id="nx-explorer-marquee"></div>\${et(n)}\`);
    const thumb = EX.thumbMinWidth ? EX.thumbMinWidth(t.explorer.thumb) : 148;
    a && a.style.setProperty("--ex-thumb", \`\${thumb}px\`);
    paintExplorerSelectionUi(), tt();
  }
  function downloadBase64Zip(b64, filename) {`;

const VENDOR_EXPLORER_HA_PATCH =
  `  function ha(e) {
    const prev = ensureExplorerState();
    const grid = document.getElementById("nx-explorer-grid") || document.querySelector(".explorer-grid");
    if (prev.folderKey && grid) {
      if (!prev.folderScroll) prev.folderScroll = {};
      prev.folderScroll[prev.folderKey] = grid.scrollTop || 0;
    }
    t.explorer = {
      ...prev,
      folderKey: e || "__pick__"
    };
    const EX = exHelpers();
    t.explorer.selection = EX.clearSelection ? EX.clearSelection(t.explorer.selection) : { selected: new Set(), anchorId: "", focusId: "" };
    const { folderKey: o } = Ze();
    document.querySelectorAll("[data-explorer-folder]").forEach((i) => {
      i.classList.toggle("active", i.getAttribute("data-explorer-folder") === o);
    });
    paintExplorerWindow(!1);
    tt();
    bindExplorerGridScroll();
  }
  function downloadBase64Zip(b64, filename) {`;

const VENDOR_EXPLORER_TAB_LOAD_NEEDLE =
  `    if (t.uiTab === "explorer" && !t._explorerLoading) {
      const d = !!((t.explorer?.items || []).length || (t.explorer?.folders || []).length);
      t._explorerLoading = !0, Et(!1).then((U) => {
        if (!t.uiOpen || t.uiTab !== "explorer") return;
        const f = !!((U?.items || []).length || (U?.folders || []).length);
        !d && f && P().catch(() => {
        });
      }).catch(() => {
      }).finally(() => {
        t._explorerLoading = !1;
      });
    }`;

const VENDOR_EXPLORER_TAB_LOAD_PATCH =
  `    if (t.uiTab === "explorer" && !t._explorerLoading) {
      const d = !!((t.explorer?.items || []).length || (t.explorer?.folders || []).length);
      t._explorerLoading = !0, Et(!1).then((U) => {
        if (!t.uiOpen || t.uiTab !== "explorer") return;
        const f = !!((U?.items || []).length || (U?.folders || []).length);
        // Remount only empty→data (avoid Et→P→Et loop). Always rebind scroll/toggles.
        const after = () => {
          try {
            bindExplorerGridScroll();
            bindExplorerCharToggles();
          } catch {
          }
        };
        if (!d && f) P().then(after).catch(after);
        else after();
      }).catch(() => {
      }).finally(() => {
        t._explorerLoading = !1;
      });
    }`;

/** Search/sort/thumb/fav must rewindow — raw et() bypassed virtualization and broke the grid. */
const VENDOR_EXPLORER_FILTER_ET_NEEDLE =
  `    }), document.getElementById("nx-explorer-q")?.addEventListener("input", (a) => {
      ensureExplorerState().query = a.target?.value || "";
      clearTimeout(t._explorerQTimer), t._explorerQTimer = setTimeout(() => {
        const { items: r } = Ze(), i = document.querySelector(".explorer-grid");
        i && (i.innerHTML = \`<div class="explorer-marquee" id="nx-explorer-marquee"></div>\${et(r)}\`), paintExplorerSelectionUi(), tt();
      }, 160);
    });
    document.getElementById("nx-explorer-sort")?.addEventListener("change", (a) => {
      ensureExplorerState().sort = a.target?.value || "newest";
      const { items: r } = Ze(), i = document.querySelector(".explorer-grid");
      i && (i.innerHTML = \`<div class="explorer-marquee" id="nx-explorer-marquee"></div>\${et(r)}\`), paintExplorerSelectionUi(), tt();
    });
    document.getElementById("nx-explorer-thumb")?.addEventListener("change", (a) => {
      const EX = exHelpers();
      ensureExplorerState().thumb = a.target?.value || "m";
      const grid = document.querySelector(".explorer-grid");
      grid && grid.style.setProperty("--ex-thumb", \`\${EX.thumbMinWidth ? EX.thumbMinWidth(t.explorer.thumb) : 148}px\`);
    });
    document.getElementById("nx-explorer-favonly")?.addEventListener("click", () => {
      const ex = ensureExplorerState();
      ex.favOnly = !ex.favOnly;
      const { items: r } = Ze(), i = document.querySelector(".explorer-grid");
      i && (i.innerHTML = \`<div class="explorer-marquee" id="nx-explorer-marquee"></div>\${et(r)}\`), paintExplorerSelectionUi(), tt();
      $e(ex.favOnly ? "즐겨찾기만 보기" : "전체 보기");
    });`;

const VENDOR_EXPLORER_FILTER_ET_PATCH =
  `    }), document.getElementById("nx-explorer-q")?.addEventListener("input", (a) => {
      ensureExplorerState().query = a.target?.value || "";
      clearTimeout(t._explorerQTimer), t._explorerQTimer = setTimeout(() => {
        paintExplorerWindow(!0);
        tt();
      }, 160);
    });
    document.getElementById("nx-explorer-sort")?.addEventListener("change", (a) => {
      ensureExplorerState().sort = a.target?.value || "newest";
      paintExplorerWindow(!0);
      tt();
    });
    document.getElementById("nx-explorer-thumb")?.addEventListener("change", (a) => {
      ensureExplorerState().thumb = a.target?.value || "m";
      paintExplorerWindow(!0);
      tt();
    });
    document.getElementById("nx-explorer-favonly")?.addEventListener("click", () => {
      const ex = ensureExplorerState();
      ex.favOnly = !ex.favOnly;
      paintExplorerWindow(!0);
      tt();
      $e(ex.favOnly ? "즐겨찾기만 보기" : "전체 보기");
    });`;

/** Explorer: delete selected / folder — UI first, IDB delete in background. */
const VENDOR_EXPLORER_DELETE_SEL_NEEDLE =
  `  async function explorerDeleteSelected() {
    const ids = [...ensureExplorerState().selection?.selected || []];
    if (!ids.length || !confirm(\`\${ids.length}장을 삭제할까요?\`)) return;
    try {
      await K("/v1/gallery/delete", { method: "POST", body: { card_ids: ids } }), await Et(!0), await P();
    } catch (err) {
      t.uiMessage = { type: "error", text: z(err?.message || err) }, await P();
    }
  }`;
const VENDOR_EXPLORER_DELETE_SEL_PATCH =
  `  async function explorerDeleteSelected() {
    const ids = [...ensureExplorerState().selection?.selected || []];
    if (!ids.length || !confirm(\`\${ids.length}장을 삭제할까요?\`)) return;
    const ex = ensureExplorerState();
    const drop = new Set(ids.map((id) => String(id || "")).filter(Boolean));
    const removedByFolder = new Map();
    ex.items = (ex.items || []).filter((it) => {
      const id = String(it?.id || "");
      if (!drop.has(id)) return !0;
      const fk = String(it?.folder_key || "");
      removedByFolder.set(fk, (removedByFolder.get(fk) || 0) + 1);
      return !1;
    });
    if (Array.isArray(ex.folders)) {
      for (const f of ex.folders) {
        const n = removedByFolder.get(String(f?.key || "")) || 0;
        if (n) f.count = Math.max(0, Number(f.count || 0) - n);
      }
    }
    const EX = exHelpers();
    ex.selection = EX.clearSelection ? EX.clearSelection(ex.selection) : { selected: new Set(), anchorId: "", focusId: "" };
    try {
      if (typeof paintExplorerWindow == "function") paintExplorerWindow(!0);
      else {
        const { items: r } = Ze(), grid = document.getElementById("nx-explorer-grid") || document.querySelector(".explorer-grid");
        grid && (grid.innerHTML = \`<div class="explorer-marquee" id="nx-explorer-marquee"></div>\${typeof etWindowed == "function" ? etWindowed(r, grid.scrollTop || 0) : et(r)}\`);
        paintExplorerSelectionUi(), tt();
      }
    } catch {
    }
    $e(\`\${ids.length}장 삭제 중…\`);
    Promise.resolve().then(async () => {
      try {
        await K("/v1/gallery/delete", { method: "POST", body: { card_ids: ids } });
        ex.loadedAt = 0;
        $e(\`\${ids.length}장 삭제됨\`);
      } catch (err) {
        try {
          await Et(!0);
          if (typeof paintExplorerWindow == "function") paintExplorerWindow(!1);
          else await P();
        } catch {
        }
        t.uiMessage = { type: "error", text: z(err?.message || err) };
        try {
          await P();
        } catch {
        }
      }
    }).catch(() => {});
  }`;

const VENDOR_EXPLORER_DELETE_FOLDER_NEEDLE =
  `    }),     document.getElementById("nx-explorer-delete-folder")?.addEventListener("click", async () => {
      const a = t.explorer?.folderKey || "", r = (t.explorer?.folders || []).find((i) => i.key === a);
      if (!a || a === "__all__") {
        t.uiMessage = {
          type: "error",
          text: a === "__all__" ? "통합 보기에서는 폴더 삭제를 쓸 수 없습니다. 개별 폴더를 고르세요." : "삭제할 폴더가 없습니다"
        }, await P();
        return;
      }
      const i = \`\${r?.character_name || "Unknown"} / \${r?.chat_name || a}\`;
      if (!confirm(\`폴더 "\${i}"의 이미지를 모두 삭제할까요?\`)) return;
      try {
        await K("/v1/gallery/delete", {
          method: "POST",
          body: { folder_key: a }
        }), await Et(!0), await P();
      } catch (s) {
        t.uiMessage = {
          type: "error",
          text: z(s?.message || s)
        }, await P();
      }
    }), document.getElementById("nx-explorer-q")?.addEventListener("input", (a) => {`;
const VENDOR_EXPLORER_DELETE_FOLDER_PATCH =
  `    }),     document.getElementById("nx-explorer-delete-folder")?.addEventListener("click", async () => {
      const a = t.explorer?.folderKey || "", r = (t.explorer?.folders || []).find((i) => i.key === a);
      if (!a || a === "__all__") {
        t.uiMessage = {
          type: "error",
          text: a === "__all__" ? "통합 보기에서는 폴더 삭제를 쓸 수 없습니다. 개별 폴더를 고르세요." : "삭제할 폴더가 없습니다"
        }, await P();
        return;
      }
      const i = \`\${r?.character_name || "Unknown"} / \${r?.chat_name || a}\`;
      if (!confirm(\`폴더 "\${i}"의 이미지를 모두 삭제할까요?\`)) return;
      const ex = ensureExplorerState();
      const removed = (ex.items || []).filter((it) => String(it?.folder_key || "") === a);
      const n = removed.length;
      ex.items = (ex.items || []).filter((it) => String(it?.folder_key || "") !== a);
      ex.folders = (ex.folders || []).filter((f) => String(f?.key || "") !== a);
      ex.folderKey = "__pick__";
      const EX = exHelpers();
      ex.selection = EX.clearSelection ? EX.clearSelection(ex.selection) : { selected: new Set(), anchorId: "", focusId: "" };
      try {
        await P();
      } catch {
      }
      $e(n ? \`폴더 삭제 중… (\${n}장)\` : "폴더 삭제 중…");
      Promise.resolve().then(async () => {
        try {
          await K("/v1/gallery/delete", { method: "POST", body: { folder_key: a } });
          ex.loadedAt = 0;
          $e(n ? \`폴더 삭제됨 (\${n}장)\` : "폴더 삭제됨");
        } catch (s) {
          try {
            await Et(!0);
          } catch {
          }
          t.uiMessage = { type: "error", text: z(s?.message || s) };
          try {
            await P();
          } catch {
          }
        }
      }).catch(() => {});
    }), document.getElementById("nx-explorer-q")?.addEventListener("input", (a) => {`;

const VENDOR_EXPLORER_FOLDER_BIND_NEEDLE =
  `    const o = document.getElementById("nx-explorer-folders");
    if (o && !o.dataset.nxBound) {
      o.dataset.nxBound = "1";
      let a = 0;
      const r = (i) => {
        const s = i.target?.closest?.("[data-explorer-folder]");
        if (!s || !o.contains(s)) return;
        i.preventDefault(), i.stopPropagation();
        const c = Date.now();
        if (c - a < 200) return;
        const l = s.getAttribute("data-explorer-folder") || "";
        if (!l || l === t.explorer?.folderKey) return;
        a = c, ha(l);
      };
      o.addEventListener("pointerdown", r), o.addEventListener("mousedown", r), o.addEventListener("click", (i) => {
        i.target?.closest?.("[data-explorer-folder]") && (i.preventDefault(), i.stopPropagation());
      });
    }`;

const VENDOR_EXPLORER_FOLDER_BIND_PATCH =
  `    bindExplorerCharToggles();
    bindExplorerGridScroll();
    const foldBtn = document.getElementById("nx-explorer-folders-toggle");
    if (foldBtn && !foldBtn.dataset.nxBound) {
      foldBtn.dataset.nxBound = "1";
      foldBtn.addEventListener("click", () => {
        const ex = ensureExplorerState();
        ex.foldersCollapsed = !ex.foldersCollapsed;
        document.querySelector(".explorer-layout")?.classList.toggle("folders-collapsed", !!ex.foldersCollapsed);
        foldBtn.textContent = ex.foldersCollapsed ? "폴더 펼치기" : "폴더 접기";
      });
    }
    const o = document.getElementById("nx-explorer-folders");
    if (o && !o.dataset.nxBound) {
      o.dataset.nxBound = "1";
      let a = 0;
      const r = (i) => {
        const s = i.target?.closest?.("[data-explorer-folder]");
        if (!s || !o.contains(s)) return;
        i.preventDefault(), i.stopPropagation();
        const c = Date.now();
        if (c - a < 200) return;
        const l = s.getAttribute("data-explorer-folder") || "";
        if (!l || l === t.explorer?.folderKey) return;
        a = c, ha(l);
      };
      o.addEventListener("pointerdown", r), o.addEventListener("mousedown", r), o.addEventListener("click", (i) => {
        i.target?.closest?.("[data-explorer-folder]") && (i.preventDefault(), i.stopPropagation());
      });
    }`;

/**
 * Style presets: CFG scale / CFG rescale / vibe per preset; drop paste textarea;
 * put 카드 설정 저장 left of JSON export/import file buttons.
 * Also duplicate 카드 설정 저장 next to the preset-count badge in the card head.
 */
const VENDOR_PRESET_HEAD_SAVE_NEEDLE = `              <div class="prompt-title">스타일 프리셋</div>
              <div class="muted">card.json / 로어북 [Positive]·[Negative] 항목을 불러와 바로 씁니다.</div>
            </div>
            <span class="badge \${U.length ? "custom" : "default"}">\${U.length}개</span>
          </div>
          <div class="preset-chip-row">\${I || '<span class="muted">아직 프리셋이 없습니다. JSON을 불러오세요.</span>'}</div>`;

const VENDOR_PRESET_HEAD_SAVE_PATCH = `              <div class="prompt-title">스타일 프리셋</div>
              <div class="muted">card.json · lorebook_export · [Positive]/[Negative] 로어를 불러와 바로 씁니다.</div>
            </div>
            <div class="row" style="margin:0;gap:8px;align-items:center;flex-shrink:0">
              <span class="badge \${U.length ? "custom" : "default"}">\${U.length}개</span>
              <button type="button" id="nx-preset-from-image-head" class="secondary\${t.presetImageFocus ? " armed" : ""}" data-preset-from-image title="클릭: 붙여넣기 대기 · 더블클릭: 파일 선택">\${t.presetImageFocus ? "붙여넣기 대기" : "이미지 프리셋 로드"}</button>
              <button type="button" id="nx-save-card-head">스타일 프리셋 저장</button>
            </div>
          </div>
          <div class="preset-chip-row">\${I || '<span class="muted">아직 프리셋이 없습니다. JSON을 불러오세요.</span>'}</div>`;

const VENDOR_PRESET_SAVE_EVT_NEEDLE = `    }), document.getElementById("nx-save-card")?.addEventListener("click", async () => {
      try {
        const a = Ct();
        await flushSettingsSave(), await pe({ card: a }), t.uiMessage = {
          type: "success",
          text: \`카드 설정 저장됨 · 프리셋 \${(a.presets || []).length}개 · char≤\${a.character_max}\`
        }, $e("저장됨");
      } catch (a) {
        t.uiMessage = {
          type: "error",
          text: z(a.message || a)
        };
      }
      await P();
    });`;

const VENDOR_PRESET_SAVE_EVT_PATCH = `    }), (() => {
      const saveCard = async () => {
        try {
          const a = Ct();
          await flushSettingsSave(), await pe({ card: a }), t.uiMessage = {
            type: "success",
            text: \`카드 설정 저장됨 · 프리셋 \${(a.presets || []).length}개 · char≤\${a.character_max}\`
          }, $e("저장됨");
        } catch (a) {
          t.uiMessage = {
            type: "error",
            text: z(a.message || a)
          };
        }
        await P();
      };
      document.getElementById("nx-save-card")?.addEventListener("click", saveCard);
      document.getElementById("nx-save-card-head")?.addEventListener("click", saveCard);
      document.getElementById("nx-fixed-prompt-save")?.addEventListener("click", saveCard);
      document.getElementById("nx-fixed-prompt-export")?.addEventListener("click", () => {
        try {
          const a = Ct(), payload = {
            fixed_prompt_prefix: String(a.fixed_prompt_prefix || ""),
            fixed_prompt_suffix: String(a.fixed_prompt_suffix || "")
          }, blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), url = URL.createObjectURL(blob), link = document.createElement("a");
          link.href = url, link.download = \`inlay-fixed-prompts-\${new Date().toISOString().slice(0, 10)}.json\`, document.body.appendChild(link), link.click(), link.remove(), setTimeout(() => URL.revokeObjectURL(url), 1e3);
          t.uiMessage = { type: "success", text: "고정 프롬프트 JSON 내보내기" }, $e("내보냄");
        } catch (err) {
          t.uiMessage = { type: "error", text: z(err?.message || err) };
        }
        P().catch(() => null);
      }), document.getElementById("nx-fixed-prompt-import")?.addEventListener("click", () => document.getElementById("nx-fixed-prompt-file")?.click()), document.getElementById("nx-fixed-prompt-file")?.addEventListener("change", async (ev) => {
        const file = ev.target?.files?.[0];
        ev.target && (ev.target.value = "");
        if (!file) return;
        try {
          const raw = await file.text(), data = JSON.parse(raw), prefix = String(data?.fixed_prompt_prefix ?? data?.prefix ?? ""), suffix = String(data?.fixed_prompt_suffix ?? data?.suffix ?? ""), a = Ct();
          a.fixed_prompt_prefix = prefix, a.fixed_prompt_suffix = suffix;
          const prefixEl = document.getElementById("nx-fixed-prompt-prefix"), suffixEl = document.getElementById("nx-fixed-prompt-suffix");
          prefixEl && (prefixEl.value = prefix), suffixEl && (suffixEl.value = suffix);
          await flushSettingsSave(), await pe({ card: a }), t.uiMessage = { type: "success", text: "고정 프롬프트 JSON 가져옴" }, $e("가져옴");
        } catch (err) {
          t.uiMessage = { type: "error", text: z(err?.message || err) };
        }
        await P();
      });
    })();`;

/** Split former 카드 설정 into 생성 옵션 / 스타일 프리셋 tabs (late: after card HTML patches). */
const VENDOR_CARD_TAB_SPLIT_COND_NEEDLE = `    else if (t.uiTab === "card") {`;
const VENDOR_CARD_TAB_SPLIT_COND_PATCH = `    else if (t.uiTab === "card" || t.uiTab === "gen_options" || t.uiTab === "style_presets") {
      if (t.uiTab === "card") t.uiTab = "gen_options";`;

const VENDOR_CARD_TAB_SPLIT_OPEN_NEEDLE = `      u = \`
        <div class="card model-card">
          <div class="prompt-group-label">생성 옵션</div>`;
const VENDOR_CARD_TAB_SPLIT_OPEN_PATCH = `      u = \`\${t.uiTab === "style_presets" ? "" : \`
        <div class="card model-card">
          <div class="prompt-group-label">생성 옵션</div>`;

const VENDOR_CARD_TAB_SPLIT_MID_NEEDLE = `          <div class="notice info" style="margin-top:12px">캐릭터 수 제한 N이면 LLM 프롬프트에 반영되며, 생성 시에도 char1~char\${h(i.character_max ?? 6)}까지만 들어갑니다.</div>
        </div>
        <div class="card model-card">
          <div class="model-head">`;
const VENDOR_CARD_TAB_SPLIT_MID_PATCH = `          <div class="notice info" style="margin-top:12px">캐릭터 수 제한 N이면 LLM 프롬프트에 반영되며, 생성 시에도 char1~char\${h(i.character_max ?? 6)}까지만 들어갑니다.</div>
          <div class="row" style="margin-top:14px"><button type="button" id="nx-save-gen-options">생성 옵션 저장</button></div>
        </div>\`}\${t.uiTab === "gen_options" ? "" : \`
        <div class="card model-card">
          <div class="model-head">`;

const VENDOR_CARD_TAB_SPLIT_CLOSE_NEEDLE = `            <input id="nx-preset-file-input" type="file" accept=".json,application/json,text/plain" style="display:none">
          </div>
        </div>\`;
    } else if (t.uiTab === "characters") {`;
const VENDOR_CARD_TAB_SPLIT_CLOSE_PATCH = `            <input id="nx-preset-file-input" type="file" accept=".json,application/json,text/plain" style="display:none">
          </div>
        </div>\`}\`;
    } else if (t.uiTab === "characters") {`;

const VENDOR_CT_GATE_NEEDLE = `  function Ct() {
    if (!document.getElementById("nx-mode") && !document.getElementById("nx-char-max")) return null;`;
const VENDOR_CT_GATE_PATCH = `  function Ct() {
    if (!document.getElementById("nx-mode") && !document.getElementById("nx-char-max") && !document.getElementById("nx-custom-pos") && !document.getElementById("nx-preset-select") && !document.getElementById("nx-fixed-prompt-prefix")) return null;`;

const VENDOR_SHOW_CARD_TAB_NEEDLE = `        if (opts?.showCardTab) t.uiTab = "card";`;
const VENDOR_SHOW_CARD_TAB_PATCH = `        if (opts?.showCardTab) t.uiTab = "style_presets";`;

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

const VENDOR_PRESET_PN_NEEDLE = `pn = ($) => {
  const L = String($ || "").trim();
  if (!L) return [];
  if (!L.startsWith("{") && !L.startsWith("[") && /\\[Positive\\]/i.test(L)) {
    const q = ht(L);
    return q ? [{
      id: mt("imported", 0),
      name: "가져온 프리셋",
      positive: q.positive,
      negative: q.negative
    }] : [];
  }
  let M;
  try {
    M = JSON.parse(L);
  } catch {
    return [];
  }
  const V = [], Y = (q) => {
    if (!q) return;
    const ne = \`\${q.name}::\${q.positive.slice(0, 80)}\`;
    V.some((ie) => \`\${ie.name}::\${ie.positive.slice(0, 80)}\` === ne) || V.push(q);
  };
  if (Array.isArray(M))
    return M.forEach((q, ne) => Y(Qt(q, ne))), V;
  if (M && typeof M == "object") {
    const q = M;
    if (Array.isArray(q.presets) && (q.presets.forEach((ie, se) => Y(Qt(ie, se))), V.length))
      return V;
    const ne = (q.data?.character_book || q.character_book || q.data?.characterBook)?.entries;
    Array.isArray(ne) && ne.forEach((ie, se) => {
      if (!ie || typeof ie != "object") return;
      const be = ie, Te = String(be.content || ""), k = ht(Te);
      if (!k) return;
      const t = String(be.comment || be.name || \`프리셋 \${se + 1}\`).trim().replace(/^프리셋\\s*/i, (Ae) => Ae);
      Y({
        id: mt(t, se),
        name: t || \`프리셋 \${se + 1}\`,
        positive: k.positive,
        negative: k.negative
      });
    });
  }
  return V;
}, un = ($, L) => {`;

const VENDOR_PRESET_PN_PATCH = `pn = ($) => {
  const SP = globalThis.__INLAY_STYLE_PRESETS__;
  if (SP && typeof SP.parseStylePresetsFromJson == "function") {
    try {
      const rows = SP.parseStylePresetsFromJson($) || [];
      if (rows.length) return rows.map((row, i) => {
        const name = String(row.name || \`프리셋 \${i + 1}\`);
        return {
          id: String(row.id || mt(name, i)),
          name,
          positive: String(row.positive || ""),
          negative: String(row.negative || ""),
          cfg_scale: row.cfg_scale ?? null,
          cfg_rescale: row.cfg_rescale ?? null
        };
      });
    } catch (err) {
      console.warn("[Inlay Nexus] style preset parse failed", err);
    }
  }
  const L = String($ || "").trim();
  if (!L) return [];
  if (!L.startsWith("{") && !L.startsWith("[") && /\\[Positive\\]/i.test(L)) {
    const q = ht(L);
    return q ? [{
      id: mt("imported", 0),
      name: "가져온 프리셋",
      positive: q.positive,
      negative: q.negative
    }] : [];
  }
  let M;
  try {
    M = JSON.parse(L);
  } catch {
    return [];
  }
  const V = [], Y = (q) => {
    if (!q) return;
    const ne = \`\${q.name}::\${q.positive.slice(0, 80)}\`;
    V.some((ie) => \`\${ie.name}::\${ie.positive.slice(0, 80)}\` === ne) || V.push(q);
  };
  if (Array.isArray(M))
    return M.forEach((q, ne) => Y(Qt(q, ne))), V;
  if (M && typeof M == "object") {
    const q = M;
    if (Array.isArray(q.presets) && (q.presets.forEach((ie, se) => Y(Qt(ie, se))), V.length))
      return V;
    const ne = (q.data?.character_book || q.character_book || q.data?.characterBook)?.entries;
    Array.isArray(ne) && ne.forEach((ie, se) => {
      if (!ie || typeof ie != "object") return;
      const be = ie, Te = String(be.content || ""), k = ht(Te);
      if (!k) return;
      const t = String(be.comment || be.name || \`프리셋 \${se + 1}\`).trim().replace(/^프리셋\\s*/i, (Ae) => Ae);
      Y({
        id: mt(t, se),
        name: t || \`프리셋 \${se + 1}\`,
        positive: k.positive,
        negative: k.negative
      });
    });
  }
  return V;
}, un = ($, L) => {`;

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
            <button type="button" id="nx-preset-from-image" class="secondary\${t.presetImageFocus ? " armed" : ""}" data-preset-from-image title="클릭: 붙여넣기 대기 · 더블클릭: 파일 선택">\${t.presetImageFocus ? "붙여넣기 대기" : "이미지 프리셋 로드"}</button>
            <span class="autotag-badge\${t.presetImageFocus ? " show" : ""}" data-preset-image-badge>\${t.presetImageFocus ? "선택됨 · Ctrl+V" : ""}</span>
            <input id="nx-preset-from-image-file" type="file" accept="image/*" style="display:none">
            <button id="nx-save-card">스타일 프리셋 저장</button>
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
    })).filter((a) => a.name || a.positive || a.negative);
    if (!n.length) throw new Error("내보낼 프리셋이 없습니다.");
    const o = JSON.stringify({
      presets: n,
      active_preset_id: String(e.active_preset_id || n[0].id || "")
    }, null, 2), a = new Blob([o], { type: "application/json" }), r = URL.createObjectURL(a), i = document.createElement("a");
    return i.href = r, i.download = \`inlay-nexus-presets-\${new Date().toISOString().slice(0, 10)}.json\`, document.body.appendChild(i), i.click(), i.remove(), setTimeout(() => URL.revokeObjectURL(r), 1e3), n.length;
  }`;

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
    }).filter((a) => a.name || a.positive || a.negative || a.cfg_scale != null || a.cfg_rescale != null);
    if (!n.length) throw new Error("내보낼 프리셋이 없습니다.");
    const SP = globalThis.__INLAY_STYLE_PRESETS__;
    const payload = SP && typeof SP.toLorebookExport == "function"
      ? SP.toLorebookExport(n)
      : { presets: n, active_preset_id: String(e.active_preset_id || n[0].id || "") };
    const o = JSON.stringify(payload, null, 2), a = new Blob([o], { type: "application/json" }), r = URL.createObjectURL(a), i = document.createElement("a");
    return i.href = r, i.download = \`inlay-nexus-lorebook-presets-\${new Date().toISOString().slice(0, 10)}.json\`, document.body.appendChild(i), i.click(), i.remove(), setTimeout(() => URL.revokeObjectURL(r), 1e3), n.length;
  }`;

const VENDOR_PRESET_ST_ERR_NEEDLE =
  `if (!n.length) throw new Error("프리셋을 찾지 못했습니다. [Positive]/[Negative] 로어북 항목이 있는 card.json인지 확인하세요.");`;
const VENDOR_PRESET_ST_ERR_PATCH =
  `if (!n.length) throw new Error("프리셋을 찾지 못했습니다. card.json / lorebook_export / {presets:[…]} 에 [Positive]·[Negative] 항목이 있는지 확인하세요.");`;

const VENDOR_PRESET_PASTE_DETECT_NEEDLE =
  `if (!(!r || r.length < 40) && !(!/\\[Positive\\]/i.test(r) && !/"character_book"|"presets"/i.test(r)))`;
const VENDOR_PRESET_PASTE_DETECT_PATCH =
  `if (!(!r || r.length < 40) && !(!/\\[Positive\\]/i.test(r) && !/"character_book"|"presets"|"type"\\s*:\\s*"risu"/i.test(r)))`;

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
      const delIdx = a.presets.findIndex((i) => presetIdEq(i.id, delId));
      a.presets = a.presets.filter((i) => !presetIdEq(i.id, delId));
      // Prefer neighbor at same index (next), or previous when deleting the last.
      const next = a.presets.length ? a.presets[Math.min(Math.max(0, delIdx), a.presets.length - 1)] : null;
      const nextId = next?.id || "";
      pinActivePreset(a, nextId);
      a.custom_pos = next?.positive || "", a.custom_neg = next?.negative || "";
      // Optimistic: paint delete first; vibe IDB clear + settings flush run behind.
      queueSettingsSave({ card: { ...a } });
      try { await P(); } catch {}
      Promise.resolve().then(async () => {
        try {
          delId && await K("/v1/nai/vibe/clear", { method: "POST", body: { preset_id: delId } });
        } catch {
        }
      }).catch(() => {});
    }), document.getElementById("nx-preset-export")?.addEventListener("click", async () => {`;

const VENDOR_PRESET_VIBE_EVT_NEEDLE = `    }), document.getElementById("nx-preset-file")?.addEventListener("click", () => {
      document.getElementById("nx-preset-file-input")?.click();
    }), document.getElementById("nx-preset-file-input")?.addEventListener("change", async (a) => {`;

const VENDOR_PRESET_VIBE_EVT_PATCH = `    }), (() => {
      const runPresetFromImage = async (file) => {
        if (!file) return;
        try {
          const res = await K("/v1/presets/from-image", { method: "POST", body: { image_b64: await It(file) } }, 6e4);
          const a = _e();
          Array.isArray(a.presets) || (a.presets = []);
          const id = mt(res?.name || "이미지 프리셋", a.presets.length);
          const positive = String(res?.positive || "");
          const negative = String(res?.negative || "");
          const cfg = res?.cfg_scale == null || res?.cfg_scale === "" ? null : Number(res.cfg_scale);
          const rescale = res?.cfg_rescale == null || res?.cfg_rescale === "" ? null : Number(res.cfg_rescale);
          a.presets.push({
            id,
            name: String(res?.name || \`이미지 프리셋 \${a.presets.length + 1}\`),
            positive,
            negative,
            cfg_scale: Number.isFinite(cfg) ? cfg : null,
            cfg_rescale: Number.isFinite(rescale) ? rescale : null
          });
          pinActivePreset(a, id);
          a.custom_pos = positive;
          a.custom_neg = negative;
          t.presetImageFocus = !1;
          queueSettingsSave({ card: { ...a } });
          $e("이미지 프리셋 추가됨");
          await P();
        } catch (err) {
          t.uiMessage = { type: "error", text: z(err?.message || err) };
          await P();
        }
      };
      const paintPresetImageFocus = () => {
        document.querySelectorAll("[data-preset-from-image]").forEach((b) => {
          b.classList.toggle("armed", !!t.presetImageFocus);
          b.textContent = t.presetImageFocus ? "붙여넣기 대기" : "이미지 프리셋 로드";
        });
        document.querySelectorAll("[data-preset-image-badge]").forEach((badge) => {
          badge.classList.toggle("show", !!t.presetImageFocus);
          badge.textContent = t.presetImageFocus ? "선택됨 · Ctrl+V" : "";
        });
      };
      const fileEl = document.getElementById("nx-preset-from-image-file");
      document.querySelectorAll("[data-preset-from-image]").forEach((btn) => {
        btn.addEventListener("click", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          t.presetImageFocus = !t.presetImageFocus;
          paintPresetImageFocus();
        });
        btn.addEventListener("dblclick", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          t.presetImageFocus = !0;
          paintPresetImageFocus();
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/*";
          input.style.display = "none";
          document.body.appendChild(input);
          input.addEventListener("change", async () => {
            const f = input.files?.[0];
            input.remove();
            await runPresetFromImage(f);
          });
          input.click();
        });
      });
      fileEl?.addEventListener("change", async (ev) => {
        const f = ev.target?.files?.[0];
        ev.target.value = "";
        await runPresetFromImage(f);
      });
      t._presetImagePasteBound || (t._presetImagePasteBound = !0, window.addEventListener("paste", async (ev) => {
        if (!t.presetImageFocus || !t.uiOpen || t.uiTab !== "style_presets" && t.uiTab !== "card") return;
        const item = Array.from(ev.clipboardData?.items || []).find((x) => x.type.startsWith("image/"));
        if (!item) return;
        ev.preventDefault();
        const f = item.getAsFile();
        f && await runPresetFromImage(f);
      }));
    })(), document.getElementById("nx-preset-vibe-pick")?.addEventListener("click", () => {
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
/**
 * Partial sticky card-set swaps must reuse the still-mounted marker for the
 * overlapping id. takePooledMarker only looked at the parked pool, so A,B→A,C
 * created a second A pin and left the old one visible (duplicate sticky pins).
 */
const VENDOR_STICKY_TAKE_NEEDLE = `  function takePooledMarker(card, src) {
    const pool = stickyPool();
    const id = String(card?.id || "");
    if (!pool || !id) return null;
    const m = pool.get(id);
    if (!m?.thumb) return null;
    pool.delete(id);
    m.card = card;
    if (src && (!m._thumbSrc || m._thumbSrc !== src)) {
      m._thumbSrc = src;
      // Keep painted HTML if same bytes already in the node; else force one paint later.
      if (m._paintedSrc && m._paintedSrc !== src) m._paintedSrc = "", m._thumbHtmlId = "";
    }
    return m;
  }`;

const VENDOR_STICKY_TAKE_PATCH = `  function takePooledMarker(card, src) {
    const id = String(card?.id || "");
    if (!id) return null;
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    const active = t.overlayUi?.markers;
    let m = typeof VC?.claimStickyMarkerByCardId == "function"
      ? VC.claimStickyMarkerByCardId(active, id)
      : null;
    if (!m && Array.isArray(active)) {
      const idx = active.findIndex((x) => String(x?.card?.id || "") === id);
      if (idx >= 0 && active[idx]?.thumb) m = active.splice(idx, 1)[0] || null;
    }
    if (!m) {
      const pool = stickyPool();
      if (!pool) return null;
      m = pool.get(id);
      if (!m?.thumb) return null;
      pool.delete(id);
    } else if (!m?.thumb) return null;
    m.card = card;
    if (src && (!m._thumbSrc || m._thumbSrc !== src)) {
      m._thumbSrc = src;
      // Keep painted HTML if same bytes already in the node; else force one paint later.
      if (m._paintedSrc && m._paintedSrc !== src) m._paintedSrc = "", m._thumbHtmlId = "";
    }
    return m;
  }`;

/** Allow 상시 이미지 크기 0% (hide-by-size); vendor clamped min=1. */
const VENDOR_INLINE_PCT_HELP_NEEDLE =
  `"nx-inline-pct": { title: "상시 이미지 크기", body: "상시·모바일 모서리 미리보기 크기입니다. 100%가 기준이고, 200%면 약 두 배로 보입니다." },`;
const VENDOR_INLINE_PCT_HELP_PATCH =
  `"nx-inline-pct": { title: "상시 이미지 크기", body: "상시·모바일 모서리 미리보기 크기입니다. 100%가 기준이고, 200%면 약 두 배로 보입니다. 0%면 상시 이미지를 숨깁니다(오버레이·핀은 유지)." },`;

const VENDOR_INLINE_PCT_HTML_NEEDLE =
  `<input id="nx-inline-pct" type="number" min="1" step="10" value="\${h(i.inline_thumb_pct ?? 100)}">`;
const VENDOR_INLINE_PCT_HTML_PATCH =
  `<input id="nx-inline-pct" type="number" min="0" step="10" value="\${h(i.inline_thumb_pct ?? 100)}">`;

const VENDOR_INLINE_PCT_SAVE_NEEDLE =
  `inline_thumb_pct: Math.max(1, Ne(N("nx-inline-pct"), 100)),`;
const VENDOR_INLINE_PCT_SAVE_PATCH =
  `inline_thumb_pct: Math.max(0, Ne(N("nx-inline-pct"), 100)),`;

const VENDOR_INLINE_PCT_LIVE_NEEDLE =
  `    }), document.getElementById("nx-inline-pct")?.addEventListener("input", () => {
      const a = Math.max(1, Ne(N("nx-inline-pct"), 100));`;
const VENDOR_INLINE_PCT_LIVE_PATCH =
  `    }), document.getElementById("nx-inline-pct")?.addEventListener("input", () => {
      const a = Math.max(0, Ne(N("nx-inline-pct"), 100));`;

/**
 * Sticky activate path (v2 only — pin attaches to original-aspect image):
 * - nxUpdateStickyActiveOnScrollEnd: scroll-end → reading%
 * - nxActivateStickyByCardId: inline long-press start → that shot
 * Legacy mid-scroll flash body is renamed dead; paint goes through nxStickyV2ApplyFromHt.
 */
const VENDOR_STICKY_NX_ACTIVATE_NEEDLE = `  function scheduleStickySync(forceFull = !1) {
    if (forceFull && t.overlayUi) t.overlayUi._stickyWantFull = !0;
    Ce();
  }
  /** Instant within-message image swap: estimate reading% from last pin rect + scrollY delta. */
  function stickyFlashOnScroll() {`;
const VENDOR_STICKY_NX_ACTIVATE_PATCH = `  function scheduleStickySync(forceFull = !1) {
    if (forceFull && t.overlayUi) t.overlayUi._stickyWantFull = !0;
    Ce();
  }
  function nxStickyV2ImgStyle(box, z) {
    return ["position:fixed", \`left:\${box.left}px\`, \`top:\${box.top}px\`, \`width:\${box.w}px\`, \`height:\${box.h}px\`, \`z-index:\${z}\`, "border:none", "outline:none", "overflow:hidden", "pointer-events:auto", "display:block", "background:transparent", "box-shadow:none", "border-radius:0"].join(";");
  }
  function nxStickyV2PinStyle(pin, on, z) {
    // Blank hit target — no fill, no glyph (counts live on badge nodes).
    return ["position:fixed", \`left:\${pin.left}px\`, \`top:\${pin.top}px\`, \`width:\${pin.size}px\`, \`height:\${pin.size}px\`, \`z-index:\${z}\`, "border-radius:0", "display:block", "pointer-events:auto", "user-select:none", "background:transparent", "border:none", "box-shadow:none", "color:transparent", "font-size:0", "line-height:0", "opacity:" + (on ? "1" : "0")].join(";");
  }
  function nxStickyV2BadgeStyle(pin, z) {
    return ["position:fixed", \`left:\${pin.left}px\`, \`top:\${pin.top}px\`, \`min-width:\${pin.size}px\`, \`height:\${pin.size}px\`, "padding:0 6px", \`z-index:\${z}\`, "border-radius:6px", "display:flex", "align-items:center", "justify-content:center", "font-size:11px", "font-weight:700", "line-height:1", "pointer-events:none", "user-select:none", "background:rgba(15,23,42,.75)", "color:#e2e8f0", "border:1px solid rgba(255,255,255,.22)", "box-sizing:border-box"].join(";");
  }
  function nxStickyV2BadgeHideStyle(pinSize, z) {
    return nxStickyV2BadgeStyle({ left: -9999, top: -9999, size: pinSize }, z);
  }
  /** Pick a marker for a badge slot — must exclude active + the other badge slot. */
  function nxStickyV2PickBadgeMarker(e, active, exclude) {
    for (let i = 0; i < e.markers.length; i += 1) {
      const m = e.markers[i];
      if (m && m !== active && m !== exclude) return m;
    }
    return null;
  }
  /** Sticky v2 layout: image at original aspect; pin attaches to image. */
  async function nxStickyV2ApplyFromHt(opts = {}) {
    const e = t.overlayUi;
    if (!e?.markers?.length) return;
    const l = Math.trunc(Number(opts.segment));
    const reading = opts.reading;
    const pinSize = Math.max(12, Number(opts.pinSize) || Pt || 28);
    const showSticky = opts.showSticky !== !1;
    const mobileOn = !!opts.mobileOn;
    const corner = opts.corner || Ea();
    const env = opts.env || La();
    const vp = viewerViewport();
    const vh = Number(opts.vh) || vp.vh;
    const vw = vp.vw;
    if (!Number.isFinite(l) || l < 0 || l >= e.markers.length) return;
    const next = e.markers[l];
    if (!next?.thumb) return;
    if (!next._thumbSrc) {
      try {
        const src = typeof Ie == "function" ? Ie(next.card) : "";
        if (typeof src == "string" && src) next._thumbSrc = src;
      } catch {
      }
    }
    const buried = !!(t.uiOpen || e._stickyEditorOpen || t.cardTagUi || t.charEditUi);
    const zImg = buried ? 1 : 99970, zPin = buried ? 1 : 99972, zBadge = buried ? 1 : 99971;
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    const probed = typeof VC?.probeDataUrlPixelSize == "function" ? VC.probeDataUrlPixelSize(next._thumbSrc) : null;
    const sized = typeof VC?.stickyThumbSizeForImage == "function"
      ? VC.stickyThumbSizeForImage(env.w, env.h, probed?.w, probed?.h, 0, 0, { width: vw, height: vh, pad: 16 })
      : { w: env.w, h: env.h };
    const layout = mobileOn
      ? (typeof VC?.stickyV2CornerLayout == "function" ? VC.stickyV2CornerLayout({ corner, imgW: sized.w, imgH: sized.h, viewportW: vw, viewportH: vh, pad: 12, pinSize, gap: 6 }) : null)
      : (typeof VC?.stickyV2FreeLayout == "function" ? VC.stickyV2FreeLayout({ pinX: resolvePinLeftX(), pinY: resolvePinTopY(pinSize), imgW: sized.w, imgH: sized.h, pinSize, viewportW: vw, viewportH: vh }) : null);
    if (!layout) return;
    const counts = typeof VC?.stickyV2ShotCounts == "function" ? VC.stickyV2ShotCounts(l, e.markers.length) : { above: l, below: Math.max(0, e.markers.length - l - 1) };
    const layoutKey = [l, mobileOn ? 1 : 0, corner, showSticky ? 1 : 0, buried ? 1 : 0, counts.above, counts.below, sized.w, sized.h, layout.image.left, layout.image.top, layout.pin.left, layout.pin.top].join("|");
    if (e._v2LayoutKey === layoutKey && e._flashSeg === l && next._paintedSrc === next._thumbSrc) {
      if (Number.isFinite(Number(reading))) e._lastReading = Number(reading), e._flashReading = Number(reading);
      return;
    }
    const prevSeg = e._flashSeg != null ? e._flashSeg : e.activeSegment;
    const prev = Number.isFinite(Number(prevSeg)) && Number(prevSeg) >= 0 && Number(prevSeg) < e.markers.length ? e.markers[Number(prevSeg)] : null;
    e._flashGen = (e._flashGen || 0) + 1;
    const flashGen = e._flashGen;
    e._flashSeg = l;
    e.activeSegment = l;
    e._v2LayoutKey = layoutKey;
    if (Number.isFinite(Number(reading))) e._lastReading = Number(reading), e._flashReading = Number(reading);
    e._lastThumbPct = null;
    e._stickyThumbShowStyle = nxStickyV2ImgStyle(layout.image, zImg);
    const hideStyle = "position:fixed;display:none;";
    const compose = typeof VC?.composeStickyV2ThumbHtml == "function" ? VC.composeStickyV2ThumbHtml : (src0) => \`<img src="\${src0}" style="width:100%;height:100%;object-fit:fill;display:block" />\`;
    const activeId = String(next.card?.id || "");
    const PIN = " ";
    try {
      // Fast swap: paint+show new, then hide old immediately (no blank gap, no delay).
      if (showSticky && next._thumbSrc && typeof next.thumb.setInnerHTML == "function" && next._paintedSrc !== next._thumbSrc) {
        await next.thumb.setInnerHTML(compose(next._thumbSrc));
        if (flashGen !== e._flashGen) return;
        next._thumbHtmlId = activeId, next._paintedSrc = next._thumbSrc, e._lastStickyThumbHtmlId = activeId;
      }
      if (showSticky && typeof next.thumb.setStyleAttribute == "function") {
        await next.thumb.setStyleAttribute(e._stickyThumbShowStyle);
      } else if (!showSticky && typeof next.thumb.setStyleAttribute == "function") {
        await next.thumb.setStyleAttribute(hideStyle);
      }
      if (prev?.thumb && prev !== next && typeof prev.thumb.setStyleAttribute == "function") {
        await prev.thumb.setStyleAttribute(hideStyle);
      }
      // Pin: blank hit target (no fill / no glyph).
      if (typeof next.el?.setStyleAttribute == "function") {
        await next.el.setStyleAttribute(nxStickyV2PinStyle(layout.pin, !0, zPin));
        if (next._pinHtml !== PIN && typeof next.el.setInnerHTML == "function") await next.el.setInnerHTML(PIN), next._pinHtml = PIN;
      }
      next.active = !0, next.mini = !1, next._v2Parked = !1;
      // Badge markers: two distinct nodes (exclude active + each other) — never share one el.
      let leftMk = e._v2BadgeA, rightMk = e._v2BadgeB;
      if (!leftMk || leftMk === next || leftMk === rightMk || !e.markers.includes(leftMk)) leftMk = nxStickyV2PickBadgeMarker(e, next, rightMk);
      if (!rightMk || rightMk === next || rightMk === leftMk || !e.markers.includes(rightMk)) rightMk = nxStickyV2PickBadgeMarker(e, next, leftMk);
      e._v2BadgeA = leftMk, e._v2BadgeB = rightMk;
      const aboveBox = layout.aboveBadge;
      const belowBox = layout.belowBadge;
      const aboveLabel = counts.above > 0 ? \`▲\${counts.above}\` : "";
      const belowLabel = counts.below > 0 ? \`▼\${counts.below}\` : "";
      // Collapse empty slots so a lone ▲/▼ does not leave a blank pin-sized hole.
      let paintAbove = null, paintBelow = null;
      if (counts.above > 0 && counts.below > 0 && aboveBox && belowBox) {
        paintAbove = aboveBox, paintBelow = belowBox;
      } else if (counts.above > 0 && aboveBox) {
        paintAbove = aboveBox;
      } else if (counts.below > 0 && belowBox) {
        paintBelow = aboveBox || belowBox;
      }
      if (leftMk && typeof leftMk.el?.setStyleAttribute == "function") {
        leftMk.active = !1, leftMk.mini = !0, leftMk._v2Parked = !1;
        if (leftMk.thumb) try {
          await leftMk.thumb.setStyleAttribute(hideStyle);
        } catch {
        }
        if (paintAbove) {
          await leftMk.el.setStyleAttribute(nxStickyV2BadgeStyle(paintAbove, zBadge));
          if (leftMk._pinHtml !== aboveLabel && typeof leftMk.el.setInnerHTML == "function") await leftMk.el.setInnerHTML(aboveLabel), leftMk._pinHtml = aboveLabel;
        } else {
          await leftMk.el.setStyleAttribute(nxStickyV2BadgeHideStyle(pinSize, zBadge));
          if (leftMk._pinHtml !== "" && typeof leftMk.el.setInnerHTML == "function") await leftMk.el.setInnerHTML(""), leftMk._pinHtml = "";
        }
      }
      if (rightMk && typeof rightMk.el?.setStyleAttribute == "function") {
        rightMk.active = !1, rightMk.mini = !0, rightMk._v2Parked = !1;
        if (rightMk.thumb) try {
          await rightMk.thumb.setStyleAttribute(hideStyle);
        } catch {
        }
        if (paintBelow) {
          await rightMk.el.setStyleAttribute(nxStickyV2BadgeStyle(paintBelow, zBadge));
          if (rightMk._pinHtml !== belowLabel && typeof rightMk.el.setInnerHTML == "function") await rightMk.el.setInnerHTML(belowLabel), rightMk._pinHtml = belowLabel;
        } else {
          await rightMk.el.setStyleAttribute(nxStickyV2BadgeHideStyle(pinSize, zBadge));
          if (rightMk._pinHtml !== "" && typeof rightMk.el.setInnerHTML == "function") await rightMk.el.setInnerHTML(""), rightMk._pinHtml = "";
        }
      }
      // Other marker pins: park once (no per-shot rebuild).
      for (let T = 0; T < e.markers.length; T += 1) {
        const v = e.markers[T];
        if (v === next || v === leftMk || v === rightMk) continue;
        v.active = !1, v.mini = !1;
        if (v.thumb) try {
          await v.thumb.setStyleAttribute(hideStyle);
        } catch {
        }
        if (!v._v2Parked && typeof v.el?.setStyleAttribute == "function") {
          await v.el.setStyleAttribute(nxStickyV2PinStyle({ left: -9999, top: -9999, size: pinSize }, !1, zPin));
          v._v2Parked = !0;
        }
      }
    } catch {
    }
    const syncId = activeId;
    if (syncId && syncId !== String(e._syncedViewerCardId || "")) {
      e._syncedViewerCardId = syncId;
      const gui = t.galleryUi;
      if (gui && !t.uiOpen && typeof gui.syncToCardId == "function") gui.syncToCardId(syncId).catch(() => {});
    }
  }
  /** Activate sticky shot by marker index (same card order as gallery / inline). */
  async function nxActivateStickyByIndex(idx, reading) {
    const e = t.overlayUi;
    if (!e?.markers?.length || t.uiOpen) return;
    const l = Math.trunc(Number(idx));
    if (!Number.isFinite(l) || l < 0 || l >= e.markers.length) return;
    e._stickyPointerSeg = l;
    if (Number.isFinite(Number(reading))) e._flashReading = Number(reading);
    e._lastThumbPct = null;
    e._lastStickyThumbHtmlId = null;
    e._v2LayoutKey = null;
    const mobileOn = typeof mobilePinOn == "function" ? mobilePinOn() : !1;
    await nxStickyV2ApplyFromHt({
      segment: l,
      reading,
      pinSize: Pt,
      showSticky: typeof overlayVisualOn == "function" ? overlayVisualOn() : !0,
      mobileOn,
      corner: typeof Ea == "function" ? Ea() : "top-right",
      env: typeof La == "function" ? La() : { w: 528, h: 720, pct: 100 },
      vh: viewerViewport().vh
    });
  }
  async function nxActivateStickyByCardId(cardId) {
    const e = t.overlayUi;
    if (!e?.markers?.length) return;
    const id = String(cardId || "");
    if (!id) return;
    const idx = e.markers.findIndex((m) => String(m?.card?.id || "") === id);
    if (idx < 0) return;
    await nxActivateStickyByIndex(idx);
  }
  /** Unwrap SafeDOM NodeList → plain array (same helper pattern as inline inject). */
  async function nxUnwrapSafeNodes(raw) {
    if (!raw) return [];
    try {
      if (typeof k?.unwarpSafeArray == "function") {
        const u = await k.unwarpSafeArray(raw);
        return Array.isArray(u) ? u : u ? [u] : [];
      }
    } catch {
    }
    return Array.isArray(raw) ? raw : raw && typeof raw.length == "number" ? Array.from(raw) : raw ? [raw] : [];
  }
  /**
   * 말풍선 삽화: cursor → hit-test bubble shot (same scope as long-press), else nearest.
   * Idle / settle only — do not call mid-scroll (that was the lag we cut).
   */
  async function nxActivateStickyNearestToCursor() {
    const e = t.overlayUi;
    if (!e?.markers?.length || t.uiOpen) return;
    if (t.backendSettings?.card?.inline_chat_images !== !0) return;
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    const vp = viewerViewport();
    let px = Number(t._pointerClientX), py = Number(t._pointerClientY);
    // Wheel scroll may leave pointer null — still pick nearest to viewport mid (same idea as main).
    if (!Number.isFinite(px)) px = vp.vw * 0.5;
    if (!Number.isFinite(py)) py = vp.vh * 0.5;
    let rect = e._pinRectCache || null;
    try {
      if (e.pinTarget && typeof e.pinTarget.getBoundingClientRect == "function") {
        const live = await e.pinTarget.getBoundingClientRect();
        if (live) rect = live, e._pinRectCache = live;
      }
    } catch {
    }
    const markerPcts = e.markers.map((T) => Number(T.yPercent) || 0);
    let reading = 50;
    if (rect) {
      reading = typeof VC?.readingPercentInMessage == "function" ? VC.readingPercentInMessage(rect, vp.vh, 0.5) : na(rect, vp.vh, 0.5);
      if (reading == null) reading = typeof VC?.clampReadingPercent == "function" ? VC.clampReadingPercent(rect, vp.vh, 0.5) : cn(rect, vp.vh, 0.5);
    }
    let fallback = typeof VC?.activeSegmentIndex == "function" ? VC.activeSegmentIndex(markerPcts, reading) : dn(markerPcts, reading);
    // Live bubble rects — query pinTarget first, then doc root (long-press path).
    // Cache briefly so idle pointer rAF does not thrash SafeDOM every frame.
    const cacheAt = Number(e._inlineRectsAt) || 0;
    const cacheAge = Date.now() - cacheAt;
    let centers = Array.isArray(e._inlineCentersCache) && e._inlineCentersCache.length === e.markers.length
      ? e._inlineCentersCache.slice()
      : e.markers.map(() => null);
    let rects = Array.isArray(e._inlineRectsCache) && e._inlineRectsCache.length === e.markers.length
      ? e._inlineRectsCache.slice()
      : e.markers.map(() => null);
    const cacheOk = cacheAge >= 0 && cacheAge < 280 && rects.some((r) => r && Number.isFinite(Number(r.top)));
    const collectFrom = async (root) => {
      if (!root || typeof root.querySelectorAll != "function") return;
      const nodes = await nxUnwrapSafeNodes(await root.querySelectorAll("[data-inlay-inline-shot]"));
      for (const node of nodes) {
        if (!node) continue;
        let id = "";
        try {
          if (typeof node.getAttribute == "function") {
            id = String(await node.getAttribute("x-inlay-inline-shot") || "");
            if (!id) id = String(await node.getAttribute("data-inlay-inline-shot") || "");
          }
        } catch {
        }
        if (!id) {
          try {
            const oh = typeof node.getOuterHTML == "function" ? String(await node.getOuterHTML() || "") : "";
            const mm = /(?:data|x)-inlay-inline-shot="([^"]+)"/.exec(oh);
            if (mm) id = mm[1];
          } catch {
          }
        }
        if (!id) continue;
        const idx = e.markers.findIndex((m) => String(m?.card?.id || "") === id);
        if (idx < 0 || rects[idx]) continue;
        try {
          let img = null;
          try {
            if (typeof node.querySelector == "function") img = await node.querySelector("[data-inlay-inline-img],img");
          } catch {
          }
          const target = img && typeof img.getBoundingClientRect == "function" ? img : node;
          const br = typeof target.getBoundingClientRect == "function" ? await target.getBoundingClientRect() : null;
          if (br && Number.isFinite(Number(br.top))) {
            rects[idx] = br;
            centers[idx] = {
              x: (Number(br.left) + Number(br.right)) / 2,
              y: (Number(br.top) + Number(br.bottom)) / 2
            };
          }
        } catch {
        }
      }
    };
    if (!cacheOk) {
      centers = e.markers.map(() => null);
      rects = e.markers.map(() => null);
      try {
        await collectFrom(e.pinTarget);
        // Same root long-press uses — pinTarget alone often misses SafeDOM nesting.
        await collectFrom(e.doc || t.hostDoc);
      } catch {
      }
      e._inlineRectsAt = Date.now();
    }
    e._inlineCentersCache = centers;
    e._inlineRectsCache = rects;
    let want = fallback;
    if (typeof VC?.stickySegmentForInlineChat == "function") {
      want = VC.stickySegmentForInlineChat({
        inlineChatOn: !0,
        pointerX: px,
        pointerY: py,
        messageRect: rect,
        markerPercents: markerPcts,
        markerCenters: centers,
        markerRects: rects,
        fallbackSegment: fallback
      });
    }
    if (want == null || want < 0) return;
    e._stickyNearestIdx = want;
    e._stickyPointerSeg = want;
    await nxActivateStickyByIndex(want, reading);
  }
  /** Scroll-end sticky activate: 말풍선 ON → cursor-nearest; else reading%. Settle only. */
  async function nxUpdateStickyActiveOnScrollEnd() {
    const e = t.overlayUi;
    if (!e?.markers?.length || t.uiOpen) return;
    // Scroll moved the bubbles — force a fresh rect pass.
    e._inlineRectsAt = 0;
    if (t.backendSettings?.card?.inline_chat_images === !0) {
      await nxActivateStickyNearestToCursor();
      return;
    }
    let rect = null;
    try {
      if (e.pinTarget && typeof e.pinTarget.getBoundingClientRect == "function") {
        rect = await e.pinTarget.getBoundingClientRect();
        if (rect) {
          e._pinRectCache = rect;
          try {
            if (typeof captureLiveScrollY == "function") captureLiveScrollY();
          } catch {
          }
          const y = Number(e._liveScrollY);
          e._pinRectAtScrollY = Number.isFinite(y) ? y : typeof window < "u" ? window.scrollY || window.pageYOffset || 0 : 0;
        }
      }
    } catch {
    }
    if (!rect) rect = e._pinRectCache || null;
    if (!rect) {
      scheduleStickySync(!0);
      return;
    }
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    const vh = viewerViewport().vh, band = 0.5;
    let reading = typeof VC?.readingPercentInMessage == "function" ? VC.readingPercentInMessage(rect, vh, band) : na(rect, vh, band);
    if (reading == null) reading = typeof VC?.clampReadingPercent == "function" ? VC.clampReadingPercent(rect, vh, band) : cn(rect, vh, band);
    const markerPcts = e.markers.map((T) => Number(T.yPercent) || 0);
    const want = typeof VC?.activeSegmentIndex == "function" ? VC.activeSegmentIndex(markerPcts, reading) : dn(markerPcts, reading);
    if (want == null || want < 0) return;
    await nxActivateStickyByIndex(want, reading);
  }
  /** Legacy mid-scroll flash retired — sticky v2 paints via nxStickyV2ApplyFromHt. */
  function stickyFlashOnScroll() {
    return;
  }
  function __nxDeadStickyFlashBody() {`;

/**
 * 말풍선 삽화 ON: sticky active shot = nearest to pointer (sticky thumb follows that shot).
 * Applied before sticky size patch so Ht still has `m = La()` on the next line.
 */
/**
 * Mid-scroll flash body is dead (__nxDeadStickyFlashBody). Keep needle→no-op so
 * assertOnce still proves the vendor flash entry existed at patch time.
 */
const VENDOR_STICKY_FLASH_NEAR_NEEDLE = `    const markerPcts = e.markers.map((T) => Number(T.yPercent) || 0);
    const l = typeof VC?.activeSegmentIndex == "function" ? VC.activeSegmentIndex(markerPcts, c) : dn(markerPcts, c);
    if (l < 0) return;`;
const VENDOR_STICKY_FLASH_NEAR_PATCH = `    // Dead legacy flash body — sticky v2 never enters here.
    return;
    const markerPcts = e.markers.map((T) => Number(T.yPercent) || 0);
    const l = typeof VC?.activeSegmentIndex == "function" ? VC.activeSegmentIndex(markerPcts, c) : dn(markerPcts, c);
    if (l < 0) return;`;

const VENDOR_STICKY_HT_NEAR_NEEDLE = `    const markerPcts = e.markers.map((T) => Number(T.yPercent) || 0);
    const l = typeof VC?.activeSegmentIndex == "function" ? VC.activeSegmentIndex(markerPcts, c) : dn(markerPcts, c);
    const p = Nt(), mobileOn = mobilePinOn(), m = La(), cornerNow = Ea();`;
const VENDOR_STICKY_HT_NEAR_PATCH = `    const markerPcts = e.markers.map((T) => Number(T.yPercent) || 0);
    let l = typeof VC?.activeSegmentIndex == "function" ? VC.activeSegmentIndex(markerPcts, c) : dn(markerPcts, c);
    // 말풍선 ON: one-shot lock from settle nearest, else pointer+y% (main math — cheap).
    if (t.backendSettings?.card?.inline_chat_images === !0 && typeof VC?.stickySegmentForInlineChat == "function") {
      if (e._stickyPointerSeg != null && Number.isFinite(Number(e._stickyPointerSeg))) {
        l = Math.trunc(Number(e._stickyPointerSeg));
        e._stickyPointerSeg = null;
      } else {
        l = VC.stickySegmentForInlineChat({
          inlineChatOn: !0,
          pointerX: t._pointerClientX,
          pointerY: t._pointerClientY,
          messageRect: s,
          markerPercents: markerPcts,
          markerCenters: e._inlineCentersCache || null,
          markerRects: e._inlineRectsCache || null,
          fallbackSegment: l
        });
      }
    } else if (e._stickyPointerSeg != null && Number.isFinite(Number(e._stickyPointerSeg))) {
      l = Math.trunc(Number(e._stickyPointerSeg));
      e._stickyPointerSeg = null;
    }
    // Visual on/off for sticky image — Nt() stays true so sync keeps running.
    const p = typeof overlayVisualOn == "function" ? overlayVisualOn() : Nt(), mobileOn = mobilePinOn(), m = La(), cornerNow = Ea();
    // Sticky v2 only — skip legacy frame / mini-arrow layout that follows.
    await nxStickyV2ApplyFromHt({ segment: l, reading: c, pinSize: o, showSticky: p, mobileOn, corner: cornerNow, env: m, vh: r });
    return;`;

/**
 * pointermove hot path (hover preview removed):
 * - store pointer XY
 * - click/longpress gesture movement
 * - 말풍선 삽화: nearest-shot sticky via one-shot _stickyPointerSeg (not every Ht)
 */
const VENDOR_INLINE_PTR_STICKY_NEEDLE = `    }, l = async (f) => {
      if (typeof f?.clientX == "number") t._pointerClientX = f.clientX;
      if (typeof f?.clientY == "number") t._pointerClientY = f.clientY;
      if (t.uiOpen || t._hostChromeBlocked) return;
      if (pointerGesture && typeof f.clientX == "number" && typeof f.clientY == "number") {
        pointerGesture.movement = Math.max(pointerGesture.movement || 0, Math.hypot(f.clientX - pointerGesture.x, f.clientY - pointerGesture.y));
      }
      if (mobilePress && typeof f.clientX == "number" && typeof f.clientY == "number" && Math.hypot(f.clientX - mobilePress.x, f.clientY - mobilePress.y) > 8) cancelMobilePress();
      const x = t.overlayUi?.markers || [];
      if (!x.length || !hoverPreviewOn()) {
        await s();
        return;
      }
      const I = f.clientX, R = f.clientY;
      if (!(typeof I != "number" || typeof R != "number")) {
        for (const g of x.filter((F) => F.active || F.mini)) if (await c(g, I, R)) {
          await i(g.card, I, R);
          return;
        }
        await s();
      }
    }, p = async (f) => {`;
const VENDOR_INLINE_PTR_STICKY_PATCH = `    }, l = async (f) => {
      if (typeof f?.clientX == "number") t._pointerClientX = f.clientX;
      if (typeof f?.clientY == "number") t._pointerClientY = f.clientY;
      // 말풍선 ON: idle pointer → hit-test / nearest sticky (settle path shares the same fn).
      // Skip while scroll settle pending — mid-scroll thrash was the lag we cut.
      if (t.backendSettings?.card?.inline_chat_images === !0 && !t.uiOpen && t.overlayUi?.markers?.length) {
        const scrolling = !!(t._scrollPhaseBus && t._scrollPhaseBus.pendingSettle);
        if (!scrolling && !t._inlineStickyPtrRaf) {
          const kick = () => {
            t._inlineStickyPtrRaf = 0;
            if (typeof nxActivateStickyNearestToCursor == "function") nxActivateStickyNearestToCursor().catch(() => {});
          };
          t._inlineStickyPtrRaf = typeof requestAnimationFrame == "function" ? requestAnimationFrame(kick) : (kick(), 0);
        }
      }
      if (t.uiOpen || t._hostChromeBlocked) return;
      if (pointerGesture && typeof f.clientX == "number" && typeof f.clientY == "number") {
        pointerGesture.movement = Math.max(pointerGesture.movement || 0, Math.hypot(f.clientX - pointerGesture.x, f.clientY - pointerGesture.y));
      }
      if (mobilePress && typeof f.clientX == "number" && typeof f.clientY == "number" && Math.hypot(f.clientX - mobilePress.x, f.clientY - mobilePress.y) > 8) cancelMobilePress();
      // Sticky pin hover preview removed — keep preview layer hidden.
      if (t._hoverPreviewCardId) s().catch(() => {});
    }, p = async (f) => {`;

/** Scroll: active = scrollY + flash only; settle = Ht + message track. */
const VENDOR_SCROLL_PHASE_NEEDLE = `    }, u = () => {
      if (t.uiOpen) return;
      // Capture native scrollY synchronously — SafeDOM rects are too slow for sticky image swaps.
      try {
        if (typeof window < "u" && t.overlayUi) t.overlayUi._liveScrollY = window.scrollY || window.pageYOffset || 0;
      } catch {
      }
      stickyFlashOnScroll();
      // Scroll path: coalesce full sticky correct to 1 rAF; select only after short idle.
      scheduleStickySync(), scheduleScrollTrack();
    }, onScrollEnd = () => {
      if (t.uiOpen) return;
      try {
        if (typeof window < "u" && t.overlayUi) t.overlayUi._liveScrollY = window.scrollY || window.pageYOffset || 0;
      } catch {
      }
      // End of gesture: correct with a real pin rect (not just the estimate).
      scheduleStickySync(!0), settleScrollTrackNow();
    }, onUserScrollStart = u, b = await fe(n, "scroll", u, !0), C = await fe(e, "scroll", u, !0), S = await fe(e, "scrollend", onScrollEnd, !0);
    let E = !1;
    if (typeof window < "u") try {
      window.addEventListener("scroll", u, !0), window.addEventListener("scrollend", onScrollEnd, !0), window.addEventListener("wheel", onUserScrollStart, {
        capture: !0,
        passive: !0
      }), window.addEventListener("resize", u), E = !0;
    } catch {
      try {
        window.addEventListener("scroll", u), window.addEventListener("wheel", onUserScrollStart), window.addEventListener("resize", u), E = !0;
      } catch {
      }
    }`;
const VENDOR_SCROLL_PHASE_PATCH = `    }, captureLiveScrollY = () => {
      try {
        const ov = t.overlayUi;
        if (!ov) return;
        let y = NaN;
        // Chat often scrolls inside a container / host doc — window.scrollY stays 0.
        try {
          const el = ov.chatScrollEl;
          if (el && typeof el.scrollTop == "number" && Number.isFinite(el.scrollTop)) y = el.scrollTop;
        } catch {
        }
        if (!Number.isFinite(y)) try {
          const doc = ov.doc;
          const se = doc && (doc.scrollingElement || doc.documentElement || doc.body);
          if (se && typeof se.scrollTop == "number" && Number.isFinite(se.scrollTop)) y = se.scrollTop;
        } catch {
        }
        if (!Number.isFinite(y)) try {
          const view = ov.doc && ov.doc.defaultView;
          if (view) y = view.scrollY || view.pageYOffset || 0;
        } catch {
        }
        if (!Number.isFinite(y) && typeof window < "u") y = window.scrollY || window.pageYOffset || 0;
        if (Number.isFinite(y)) ov._liveScrollY = y;
      } catch {
      }
    }, snapStickyAfterScroll = () => {
      // Delegate to NEW scroll-end activator (live pin rect + pointer/reading%).
      if (typeof nxUpdateStickyActiveOnScrollEnd == "function") nxUpdateStickyActiveOnScrollEnd().catch(() => {});
    }, ensureScrollPhaseBus = () => {
      if (t._scrollPhaseBus) return t._scrollPhaseBus;
      const VC = globalThis.__INLAY_VIEWER_CORE__;
      const make = VC?.createScrollPhaseBus;
      const settleMs = 160;
      const onActive = () => {
        if (t.uiOpen) return;
        captureLiveScrollY();
        // 말풍선 ON: mid-scroll sticky shot stays put (settle picks nearest — lag cut).
        if (t.backendSettings?.card?.inline_chat_images === !0) {
          if (t.overlayUi) t.overlayUi._inlineRectsAt = 0;
          return;
        }
        scheduleStickySync();
      };
      const onSettle = () => {
        if (t.uiOpen) return;
        captureLiveScrollY();
        settleScrollTrackNow();
        // Always snap sticky after settle (track Da may also snap; duplicate is ok).
        if (t._stickySnapTimer) clearTimeout(t._stickySnapTimer);
        t._stickySnapTimer = setTimeout(() => {
          t._stickySnapTimer = null;
          if (typeof nxUpdateStickyActiveOnScrollEnd == "function") nxUpdateStickyActiveOnScrollEnd().catch(() => {});
        }, 180);
      };
      t._scrollPhaseBus = typeof make == "function"
        ? make({ settleDelayMs: settleMs, onActive, onSettle })
        : {
          onScrollSample() {
            onActive();
            if (t._scrollPhaseTimer) clearTimeout(t._scrollPhaseTimer);
            t._scrollPhaseTimer = setTimeout(() => {
              t._scrollPhaseTimer = null, onSettle();
            }, settleMs);
          },
          onScrollEnd() {
            onActive();
            if (t._scrollPhaseTimer) clearTimeout(t._scrollPhaseTimer);
            t._scrollPhaseTimer = null, onSettle();
          },
          cancel() {
            if (t._scrollPhaseTimer) clearTimeout(t._scrollPhaseTimer);
            t._scrollPhaseTimer = null;
          }
        };
      return t._scrollPhaseBus;
    }, u = () => {
      if (t.uiOpen) return;
      ensureScrollPhaseBus().onScrollSample();
    }, onScrollEnd = () => {
      if (t.uiOpen) return;
      ensureScrollPhaseBus().onScrollEnd();
    }, onUserScrollStart = u, b = await fe(n, "scroll", u, !0), C = await fe(e, "scroll", u, !0), S = await fe(e, "scrollend", onScrollEnd, !0);
    let E = !1;
    if (typeof window < "u") try {
      window.addEventListener("scroll", u, !0), window.addEventListener("scrollend", onScrollEnd, !0), window.addEventListener("resize", onScrollEnd), E = !0;
      // Capture cursor even when pointermove isn't on the overlay doc; also kick idle sticky.
      if (!t._nxPtrCap) {
        t._nxPtrCap = (ev) => {
          if (typeof ev?.clientX == "number") t._pointerClientX = ev.clientX;
          if (typeof ev?.clientY == "number") t._pointerClientY = ev.clientY;
          if (t.backendSettings?.card?.inline_chat_images !== !0 || t.uiOpen || !t.overlayUi?.markers?.length) return;
          const scrolling = !!(t._scrollPhaseBus && t._scrollPhaseBus.pendingSettle);
          if (scrolling || t._inlineStickyPtrRaf) return;
          const kick = () => {
            t._inlineStickyPtrRaf = 0;
            if (typeof nxActivateStickyNearestToCursor == "function") nxActivateStickyNearestToCursor().catch(() => {});
          };
          t._inlineStickyPtrRaf = typeof requestAnimationFrame == "function" ? requestAnimationFrame(kick) : (kick(), 0);
        };
        window.addEventListener("pointermove", t._nxPtrCap, { capture: !0, passive: !0 });
      }
    } catch {
      try {
        window.addEventListener("scroll", u), window.addEventListener("resize", onScrollEnd), E = !0;
      } catch {
      }
    }`;

/** After scroll DOM select finishes, snap sticky to pin reading% / pointer. */
const VENDOR_SCROLL_TRACK_SNAP_NEEDLE = `      // Always re-enter Da — same DOM index can hold new text after a reply finishes.
      await Da(pick, n, { source: "scroll" });
    } finally {
      t._scrollTrackBusy = !1;
    }
  }`;
const VENDOR_SCROLL_TRACK_SNAP_PATCH = `      // Same bubble (not streaming): sticky only — skip Da + inline reinject thrash.
      const samePick = t.selectedMessage && Number(t.selectedMessage.domIndex) === Number(pick);
      if (samePick && !t._scriptStreaming) {
        try {
          if (typeof nxUpdateStickyActiveOnScrollEnd == "function") {
            if (t._stickySnapTimer) clearTimeout(t._stickySnapTimer);
            t._stickySnapTimer = setTimeout(() => {
              t._stickySnapTimer = null, nxUpdateStickyActiveOnScrollEnd().catch(() => {});
            }, 120);
          }
        } catch {
        }
        return;
      }
      // New bubble (or streaming text): full scroll select. Same index can hold new text after reply.
      await Da(pick, n, { source: "scroll" });
      // Scroll select done → NEW sticky activate (live pin % / pointer nearest).
      try {
        if (typeof nxUpdateStickyActiveOnScrollEnd == "function") {
          if (t._stickySnapTimer) clearTimeout(t._stickySnapTimer);
          t._stickySnapTimer = setTimeout(() => {
            t._stickySnapTimer = null, nxUpdateStickyActiveOnScrollEnd().catch(() => {});
          }, 120);
        }
      } catch {
      }
    } finally {
      t._scrollTrackBusy = !1;
    }
  }`;

const VENDOR_SCROLL_TRACK_VH_NEEDLE = `      const o = typeof window < "u" && window.innerHeight || 800;
      const py = Number(t._pointerClientY), px = Number(t._pointerClientX);
      const anchorY = Number.isFinite(py) ? py : o * 0.5;
      const anchorX = Number.isFinite(px) ? px : null;`;
const VENDOR_SCROLL_TRACK_VH_PATCH = `      const o = viewerViewport().vh || (typeof window < "u" && window.innerHeight) || 800;
      const py = Number(t._pointerClientY), px = Number(t._pointerClientX);
      const anchorY = o * 0.5;
      const anchorX = Number.isFinite(px) ? px : null;`;

/** Force-disable sticky pin hover preview (feature removed). */
const VENDOR_HOVER_PREVIEW_OFF_NEEDLE = `  function hoverPreviewOn() {
    return (t.backendSettings?.card || {}).hover_preview !== !1;
  }`;
const VENDOR_HOVER_PREVIEW_OFF_PATCH = `  function hoverPreviewOn() {
    return !1;
  }`;

const VENDOR_HOVER_PREVIEW_TOGGLE_NEEDLE =
  `            <label class="toggle-row" data-nx-help-id="nx-hover-preview"><input type="checkbox" id="nx-hover-preview" \${i.hover_preview !== !1 ? "checked" : ""}><span>스티키 핀 호버 미리보기</span></label>
`;
const VENDOR_HOVER_PREVIEW_TOGGLE_PATCH = ``;

const VENDOR_HOVER_ANCHOR_NEEDLE =
  `            <label data-nx-help-id="nx-hover-anchor"><span>호버 미리보기 기준</span>
              <select id="nx-hover-anchor">
                <option value="screen" \${(i.hover_preview_anchor || "screen") === "screen" ? "selected" : ""}>화면 기준</option>
                <option value="mouse" \${i.hover_preview_anchor === "mouse" ? "selected" : ""}>마우스 기준</option>
              </select>
            </label>
`;
const VENDOR_HOVER_ANCHOR_PATCH = ``;

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
    // Overlay OFF: force 0% always-image (pair with off-screen pin) — do not tear markers down.
    if (typeof overlayVisualOn == "function" ? !overlayVisualOn() : e.overlay_markers === !1) {
      return { w: 0, h: 0, pct: 0 };
    }
    // Explicit 0% must hide — do not treat 0 as "missing" and fall back to thumb_w.
    let n = Number(e.inline_thumb_pct);
    if (!Number.isFinite(n)) {
      const o = Ne(e.inline_thumb_w, at);
      n = Math.round(o / at * 100) || Sa;
    }
    n = Math.max(0, n);
    const ov = t.overlayUi || {};
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    const alwaysOn = typeof overlayVisualOn == "function" ? overlayVisualOn() : Nt();
    const userCollapsed = !!ov._stickyThumbCollapsed;
    // Settings panel (t.uiOpen) same as shot/char edit: collapse always-image to 0%.
    // Risu host settings: same 0% so sticky cannot steal mobile taps over the settings UI.
    const editorOpen = !!ov._stickyEditorOpen || !!t.uiOpen || !!t.cardTagUi || !!t.charEditUi || !!t._viewerHiddenForRisuSettings;
    const pct = typeof VC?.resolveStickyThumbPct == "function"
      ? VC.resolveStickyThumbPct({ settingsPct: n, alwaysOn, userCollapsed, editorOpen })
      : alwaysOn && !userCollapsed && !editorOpen ? Math.max(0, n) : 0;
    // Envelope only — per-image aspect is applied at the sticky layout site.
    return typeof VC?.stickyThumbBoxFromPct == "function"
      ? VC.stickyThumbBoxFromPct(pct, at, ka)
      : { w: Math.max(0, Math.round(at * pct / 100)), h: Math.max(0, Math.round(ka * pct / 100)), pct };
  }`;

/** Sticky/viewer thumbs: show full image (contain) for portrait/landscape/square. */
const VENDOR_STICKY_COVER_NEEDLE = 'width:100%;height:100%;object-fit:cover;display:block';
const VENDOR_STICKY_COVER_PATCH = 'width:100%;height:100%;object-fit:contain;display:block;background:transparent';

/** Sticky always-image shell: no border/shadow letterbox (frame already aspect-fitted). */
const VENDOR_STICKY_SHELL_BG_NEEDLE = `"border:1px solid rgba(255,255,255,.16)",
      "box-shadow:0 4px 14px rgba(0,0,0,.35)",
      "background:#0b0f18"`;
const VENDOR_STICKY_SHELL_BG_PATCH = `"border:none",
      "box-shadow:none",
      "background:transparent"`;

/** Sticky marker create: empty placeholder must stay transparent like composeStickyThumbHtml. */
const VENDOR_STICKY_EMPTY_NEEDLE = '`<div style="width:100%;height:100%;background:#0b0f18"></div>`';
const VENDOR_STICKY_EMPTY_PATCH = '`<div style="width:100%;height:100%;background:transparent"></div>`';

/**
 * Size sticky frame to the active image (data-URL header probe), not global NAI
 * settings — so landscape/portrait/square each get a matching frame, no crop.
 */
const VENDOR_STICKY_SIZE_NEEDLE = `    const p = Nt(), mobileOn = mobilePinOn(), m = La(), cornerNow = Ea();`;
const VENDOR_STICKY_SIZE_PATCH = `    const p = Nt(), mobileOn = mobilePinOn(), cornerNow = Ea();
    const env = La();
    const activeMk = l >= 0 ? e.markers[l] : null;
    const thumbSrcNow = typeof activeMk?._thumbSrc == "string" ? activeMk._thumbSrc : "";
    const probed = typeof VC?.probeDataUrlPixelSize == "function" ? VC.probeDataUrlPixelSize(thumbSrcNow) : null;
    const naiNow = t.backendSettings?.nai || {};
    if (probed?.w && probed?.h && activeMk) activeMk._imgW = probed.w, activeMk._imgH = probed.h;
    const vpFitW = typeof window < "u" && window.innerWidth || 1200, vpFitH = typeof window < "u" && window.innerHeight || 800;
    const sized = typeof VC?.stickyThumbSizeForImage == "function"
      ? VC.stickyThumbSizeForImage(env.w, env.h, activeMk?._imgW, activeMk?._imgH, naiNow.width, naiNow.height, { width: vpFitW, height: vpFitH, pad: 16 })
      : typeof VC?.fitBoxInside == "function"
        ? VC.fitBoxInside(Math.max(env.w, env.h), Math.max(env.w, env.h), activeMk?._imgW || naiNow.width, activeMk?._imgH || naiNow.height)
        : { w: env.w, h: env.h };
    const m = { w: sized.w, h: sized.h, pct: env.pct };`;

const VENDOR_STICKY_SKIP_SIZE_NEEDLE = `e._lastThumbPct === m.pct && e._lastInlineOn === p && e._lastOverlayX === overlayXNow && e._lastOverlayY === overlayYNow && e._lastMobileOn === mobileOn && e._lastCorner === cornerNow && e._lastMobilePinnedId === activeIdNow && e._lastHideThumbOff === hideThumbOffscreen && e._lastStickyUserHidden === keepHidden && e._lastVpW === vpW && e._lastVpH === vpH) return;`;
const VENDOR_STICKY_SKIP_SIZE_PATCH = `e._lastThumbPct === m.pct && e._lastThumbW === m.w && e._lastThumbH === m.h && e._lastInlineOn === p && e._lastOverlayX === overlayXNow && e._lastOverlayY === overlayYNow && e._lastMobileOn === mobileOn && e._lastCorner === cornerNow && e._lastMobilePinnedId === activeIdNow && e._lastHideThumbOff === hideThumbOffscreen && e._lastStickyUserHidden === keepHidden && e._lastVpW === vpW && e._lastVpH === vpH) return;`;

const VENDOR_STICKY_ASSIGN_SIZE_NEEDLE = `e._lastThumbPct = m.pct, e._lastInlineOn = p, e._lastOverlayX = overlayXNow, e._lastOverlayY = overlayYNow, e._lastMobileOn = mobileOn, e._lastCorner = cornerNow, e._lastHideThumbOff = hideThumbOffscreen, e._lastStickyUserHidden = keepHidden, e._lastVpW = vpW, e._lastVpH = vpH;`;
const VENDOR_STICKY_ASSIGN_SIZE_PATCH = `e._lastThumbPct = m.pct, e._lastThumbW = m.w, e._lastThumbH = m.h, e._lastInlineOn = p, e._lastOverlayX = overlayXNow, e._lastOverlayY = overlayYNow, e._lastMobileOn = mobileOn, e._lastCorner = cornerNow, e._lastHideThumbOff = hideThumbOffscreen, e._lastStickyUserHidden = keepHidden, e._lastVpW = vpW, e._lastVpH = vpH;`;

/** Scroll flash: keep frame aspect in sync when the active shot changes before Ht. */
const VENDOR_STICKY_FLASH_SIZE_NEEDLE = `        if (flashGen !== e._flashGen) return;
        await next.thumb.setStyleAttribute(showStyle);`;
const VENDOR_STICKY_FLASH_SIZE_PATCH = `        if (flashGen !== e._flashGen) return;
        {
          const envFlash = La();
          const probedFlash = typeof VC?.probeDataUrlPixelSize == "function" ? VC.probeDataUrlPixelSize(next._thumbSrc) : null;
          const naiFlash = t.backendSettings?.nai || {};
          if (probedFlash?.w && probedFlash?.h) next._imgW = probedFlash.w, next._imgH = probedFlash.h;
          const sizedFlash = typeof VC?.stickyThumbSizeForImage == "function"
            ? VC.stickyThumbSizeForImage(envFlash.w, envFlash.h, next._imgW, next._imgH, naiFlash.width, naiFlash.height, {
              width: typeof window < "u" && window.innerWidth || 1200,
              height: typeof window < "u" && window.innerHeight || 800,
              pad: 16
            })
            : { w: envFlash.w, h: envFlash.h };
          const sizedStyle = typeof VC?.stickyThumbStyleWithSize == "function"
            ? VC.stickyThumbStyleWithSize(showStyle, sizedFlash.w, sizedFlash.h)
            : showStyle;
          await next.thumb.setStyleAttribute(sizedStyle);
        }`;

const VENDOR_EXPLORER_CARD_IMG_NEEDLE =
  '.explorer-card img{width:100%;aspect-ratio:3/4;object-fit:cover;display:block;background:#0b0f18;pointer-events:none}';
/** Fixed 4/5 box + cover — tall images crop inside the card; card height never grows with src. */
const VENDOR_EXPLORER_CARD_IMG_PATCH =
  '.explorer-card img{width:100%;aspect-ratio:4/5;height:auto;object-fit:cover;object-position:center;display:block;background:#0b0f18;pointer-events:none}';

const VENDOR_EXPLORER_CAP_CSS_NEEDLE =
  '.explorer-card .cap{padding:8px 10px;font-size:11px;color:#c4d0e2;line-height:1.35}';
const VENDOR_EXPLORER_CAP_CSS_PATCH =
  '.explorer-card .cap{position:absolute;left:0;right:0;bottom:0;z-index:2;padding:8px 9px 7px;font-size:11px;color:#eef3fb;line-height:1.3;background:linear-gradient(180deg,transparent,rgba(6,10,18,.82) 38%);pointer-events:none;max-height:46%;overflow:hidden}';

/** Hover tip off + long-press state for mobile ctx. */
const VENDOR_EXPLORER_TIP_BIND_NEEDLE =
  `      n.dataset.nxBound = "1";
      n.addEventListener("mouseenter", (a) => {
        e && (e.style.display = "block", e.textContent = n.getAttribute("data-tip") || "", e.style.left = \`\${Math.min(window.innerWidth - 300, a.clientX + 14)}px\`, e.style.top = \`\${Math.min(window.innerHeight - 120, a.clientY + 14)}px\`);
      }), n.addEventListener("mousemove", (a) => {
        !e || e.style.display === "none" || (e.style.left = \`\${Math.min(window.innerWidth - 300, a.clientX + 14)}px\`, e.style.top = \`\${Math.min(window.innerHeight - 120, a.clientY + 14)}px\`);
      }), n.addEventListener("mouseleave", () => {
        e && (e.style.display = "none");
      });
      n.addEventListener("click", (r) => {
        if (r.target?.closest?.("[data-explorer-star]")) return;
        r.preventDefault(), r.stopPropagation();`;
const VENDOR_EXPLORER_TIP_BIND_PATCH =
  `      n.dataset.nxBound = "1";
      let pressTimer = 0, longPressed = !1, pressX = 0, pressY = 0;
      n.addEventListener("click", (r) => {
        if (longPressed) {
          longPressed = !1;
          r.preventDefault(), r.stopPropagation();
          return;
        }
        if (r.target?.closest?.("[data-explorer-star]")) return;
        r.preventDefault(), r.stopPropagation();`;

/** Mobile long-press opens ctx menu (was: mobileSelect + synthetic click). */
const VENDOR_EXPLORER_LONGPRESS_NEEDLE =
  `      let pressTimer = 0;
      n.addEventListener("pointerdown", (r) => {
        if (r.pointerType === "touch") {
          pressTimer = setTimeout(() => {
            ensureExplorerState().mobileSelect = !0;
            n.click();
            paintExplorerSelectionUi();
          }, 480);
        }
      });
      n.addEventListener("pointerup", () => clearTimeout(pressTimer));
      n.addEventListener("pointercancel", () => clearTimeout(pressTimer));`;
const VENDOR_EXPLORER_LONGPRESS_PATCH =
  `      n.addEventListener("pointerdown", (r) => {
        longPressed = !1;
        if (r.pointerType !== "touch") return;
        if (r.target?.closest?.("[data-explorer-star]")) return;
        pressX = r.clientX, pressY = r.clientY;
        clearTimeout(pressTimer);
        pressTimer = setTimeout(() => {
          pressTimer = 0;
          longPressed = !0;
          const id = n.getAttribute("data-explorer-id"), ex = ensureExplorerState();
          if (!ex.selection?.selected?.has(id)) {
            const { items } = Ze(), ids = items.map((x) => x.id);
            ex.selection = EX.applyExplorerClick ? EX.applyExplorerClick(ex.selection, id, { ids, index: ids.indexOf(id) }) : ex.selection;
            paintExplorerSelectionUi();
          }
          showExplorerCtx(pressX, pressY, id);
        }, 480);
      });
      n.addEventListener("pointermove", (r) => {
        if (!pressTimer || r.pointerType !== "touch") return;
        if (Math.abs(r.clientX - pressX) > 10 || Math.abs(r.clientY - pressY) > 10) clearTimeout(pressTimer), pressTimer = 0;
      });
      n.addEventListener("pointerup", () => {
        clearTimeout(pressTimer), pressTimer = 0;
      });
      n.addEventListener("pointercancel", () => {
        clearTimeout(pressTimer), pressTimer = 0;
      });`;

/** Card click stopPropagation ate the doc click that should dismiss the ctx menu. */
const VENDOR_EXPLORER_CTX_DISMISS_NEEDLE =
  `    if (!t._explorerCtxDocBound) {
      t._explorerCtxDocBound = !0;
      document.addEventListener("click", (ev) => {
        if (!ev.target?.closest?.("#nx-explorer-ctx")) hideExplorerCtx();
      });
    }`;
const VENDOR_EXPLORER_CTX_DISMISS_PATCH =
  `    if (!t._explorerCtxDocBound) {
      t._explorerCtxDocBound = !0;
      const dismissCtx = (ev) => {
        if (ev?.target?.closest?.("#nx-explorer-ctx")) return;
        hideExplorerCtx();
      };
      // Capture: card handlers stopPropagation on bubble, so outside-click never reached doc before.
      document.addEventListener("pointerdown", dismissCtx, !0);
      document.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape") hideExplorerCtx();
      });
    }`;

const VENDOR_VIEWER_THUMB_SHELL_NEEDLE =
  '}, thumbShellStyle = (on, split) => `width:64px;height:88px;object-fit:cover;border-radius:8px;cursor:pointer;opacity:${on ? 1 : 0.45};outline:${on ? "3px solid #a78bfa" : "1px solid rgba(255,255,255,.08)"};outline-offset:${on ? "1px" : "0"};background:#111827;flex:0 0 auto;transform:${on ? "scale(1.04)" : "none"};box-shadow:${on ? "0 0 0 1px rgba(124,108,255,.55),0 6px 16px rgba(0,0,0,.45)" : "none"};${split ? "margin-left:4px;" : ""}`, refreshThumbsRect = async () => {';
const VENDOR_VIEWER_THUMB_SHELL_PATCH =
  '}, thumbShellStyle = (on, split) => `width:64px;height:88px;object-fit:contain;border-radius:8px;cursor:grab;opacity:${on ? 1 : 0.45};outline:${on ? "3px solid #a78bfa" : "1px solid rgba(255,255,255,.08)"};outline-offset:${on ? "1px" : "0"};background:#111827;flex:0 0 auto;transform:${on ? "scale(1.04)" : "none"};box-shadow:${on ? "0 0 0 1px rgba(124,108,255,.55),0 6px 16px rgba(0,0,0,.45)" : "none"};-webkit-user-drag:none;user-drag:none;user-select:none;${split ? "margin-left:4px;" : ""}`, refreshThumbsRect = async () => {';


const VENDOR_STICKY_KEEP_NEEDLE = `    const keepHidden = typeof VC?.shouldKeepStickyThumbHidden == "function" ? VC.shouldKeepStickyThumbHidden(!!e._stickyThumbUserHidden, e._stickyThumbHiddenId, activeIdNow) : !!(e._stickyThumbUserHidden && String(e._stickyThumbHiddenId || "") === String(activeIdNow || "") && activeIdNow);
    if (!keepHidden && e._stickyThumbUserHidden) e._stickyThumbUserHidden = !1, e._stickyThumbHiddenId = "";
`;

const VENDOR_STICKY_KEEP_PATCH = ``;

const VENDOR_STICKY_SHOW_NEEDLE = `    const showStickyImg = p && !hideThumbOffscreen && !keepHidden, u = 6, b = 11, C = 4;`;
const VENDOR_STICKY_SHOW_PATCH = `    const showStickyImg = p && m.pct > 0 && !hideThumbOffscreen, u = 6, b = 11, C = 4;`;

/**
 * Mini ▲/▼ were stacked vertically (15px steps), so many shots pushed arrows
 * far from the sticky pin. Lay each group in one horizontal row hugging the pin.
 */
/** Mini ▲/▼: 50% opacity (za default was fully opaque). */
const VENDOR_STICKY_ARROW_OPACITY_NEEDLE = `  function za(e, n, o) {
    return [
      "position:fixed",
      \`left:\${e}px\`,
      \`top:\${n}px\`,
      "z-index:99974",
      \`width:\${o}px\`,
      \`height:\${o}px\`,
      "border-radius:50%",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "font-size:8px",
      "pointer-events:auto",
      "opacity:1",
      "background:rgba(15,23,42,.92)",
      "color:#e2e8f0",
      "border:1px solid rgba(124,108,255,.5)",
      "box-shadow:0 2px 6px rgba(0,0,0,.3)"
    ].join(";");
  }`;
const VENDOR_STICKY_ARROW_OPACITY_PATCH = `  function za(e, n, o) {
    return [
      "position:fixed",
      \`left:\${e}px\`,
      \`top:\${n}px\`,
      "z-index:99974",
      \`width:\${o}px\`,
      \`height:\${o}px\`,
      "border-radius:50%",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "font-size:8px",
      "pointer-events:auto",
      "opacity:.5",
      "background:rgba(15,23,42,.92)",
      "color:#e2e8f0",
      "border:1px solid rgba(124,108,255,.5)",
      "box-shadow:0 2px 6px rgba(0,0,0,.3)"
    ].join(";");
  }`;

const VENDOR_STICKY_ARROW_ROW_NEEDLE = `    for (let T = 0; T < e.markers.length; T += 1) {
      const v = e.markers[T], X = T === l;
      v.active = X, v.mini = !X && l >= 0;
      if (X) continue;
      let te;
      l < 0 ? (te = -9999, v.mini = !1) : T < l ? (te = pinTop - (I - g) * 15, g += 1) : (te = f + F * 15, F += 1);
      try {
        if (te < 0 || l < 0) await v.el.setStyleAttribute(ze(pinLeft, -9999, o, !1));
        else {
          await v.el.setStyleAttribute(za(x, te, b));
          const arrow = T < l ? "▲" : "▼";`;

const VENDOR_STICKY_ARROW_ROW_PATCH = `    const miniStep = b + 2, aboveTop = Math.max(4, pinTop - (b + 3)), belowTop = f, pinCx = pinLeft + o / 2, aboveStart = Math.round(pinCx - (I * miniStep - (I > 0 ? 2 : 0)) / 2), belowStart = Math.round(pinCx - (R * miniStep - (R > 0 ? 2 : 0)) / 2);
    for (let T = 0; T < e.markers.length; T += 1) {
      const v = e.markers[T], X = T === l;
      v.active = X, v.mini = !X && l >= 0;
      if (X) continue;
      let te, tx = x;
      l < 0 ? (te = -9999, v.mini = !1) : T < l ? (te = aboveTop, tx = aboveStart + g * miniStep, g += 1) : (te = belowTop, tx = belowStart + F * miniStep, F += 1);
      tx = Math.max(4, Math.min(tx, vpW - b - 4));
      try {
        if (l < 0) await v.el.setStyleAttribute(ze(pinLeft, -9999, o, !1));
        else {
          // Above ▲ sit over the sticky pin (z 99976 > pin 99974); all minis at 50% opacity.
          await v.el.setStyleAttribute(T < l ? za(tx, te, b).replace("z-index:99974", "z-index:99976") : za(tx, te, b));
          const arrow = T < l ? "▲" : "▼";`;

const VENDOR_STICKY_SKIP_NEEDLE = `e._lastHideThumbOff === hideThumbOffscreen && e._lastStickyUserHidden === keepHidden && e._lastVpW === vpW`;
const VENDOR_STICKY_SKIP_PATCH = `e._lastHideThumbOff === hideThumbOffscreen && e._lastVpW === vpW`;

const VENDOR_STICKY_ASSIGN_NEEDLE = `e._lastHideThumbOff = hideThumbOffscreen, e._lastStickyUserHidden = keepHidden, e._lastVpW = vpW`;
const VENDOR_STICKY_ASSIGN_PATCH = `e._lastHideThumbOff = hideThumbOffscreen, e._lastVpW = vpW`;

const VENDOR_PRESS_FILL_NEEDLE =
  `    }, hidePressFill = async () => {
      try {
        await pressFill.setInnerHTML("");
      } catch {
      }
      try {
        await pressFill.setStyleAttribute("position:fixed;display:none;z-index:99973;pointer-events:none;");
      } catch {
      }
    }, ensurePressFillAnim = async () => {
      if (t._nxPressFillAnim) return;
      try {
        const st = await H(e, "style", {
          text: "@keyframes nxPressFill{from{transform:scaleY(0)}to{transform:scaleY(1)}}"
        });
        await o.appendChild(st), t._nxPressFillAnim = !0;
      } catch {
      }
    }, showPressFill = async (thumb) => {
      if (!thumb) return;
      await ensurePressFillAnim();
      let rect = null;
      try {
        rect = await thumb.getBoundingClientRect();
      } catch {
        rect = null;
      }
      if (!rect) return;
      const L = Math.round(rect.left), T = Math.round(rect.top), W = Math.max(1, Math.round(rect.width || rect.right - rect.left)), Hh = Math.max(1, Math.round(rect.height || rect.bottom - rect.top));
      await pressFill.setStyleAttribute(\`position:fixed;left:\${L}px;top:\${T}px;width:\${W}px;height:\${Hh}px;z-index:99971;pointer-events:none;overflow:hidden;border-radius:8px;display:block;background:transparent\`);
      await pressFill.setInnerHTML(\`<div style="position:absolute;left:0;right:0;bottom:0;height:100%;background:linear-gradient(180deg,rgba(124,108,255,.12),rgba(124,108,255,.42));transform:scaleY(0);transform-origin:bottom center;animation:nxPressFill \${PRESS_MS}ms linear forwards;pointer-events:none"></div>\`);
    }, showFullscreen = async (f) => {`;

const VENDOR_PRESS_FILL_PATCH =
  `    }, hidePressFill = async () => {
      // Don't clear InnerHTML — recreating via SafeDOM every press was a hitch source.
      try {
        await pressFill.setStyleAttribute("position:fixed;display:none;z-index:99973;pointer-events:none;");
      } catch {
      }
    }, ensurePressFillAnim = async () => {
      if (t._nxPressFillAnim) return;
      try {
        const st = await H(e, "style", {
          text: "@keyframes nxPressRing{from{transform:scale(.55);opacity:.35}to{transform:scale(1);opacity:1}}"
        });
        await o.appendChild(st), t._nxPressFillAnim = !0;
      } catch {
      }
    }, showPressFill = async (thumb, px, py) => {
      // Cheap feedback: 36px ring at pointer. The old full-image gradient +
      // getBoundingClientRect through SafeDOM was the long-press hitch.
      void thumb;
      const x0 = Number(px), y0 = Number(py);
      if (!Number.isFinite(x0) || !Number.isFinite(y0)) return;
      await ensurePressFillAnim();
      const S = 36, L = Math.round(x0 - S / 2), T = Math.round(y0 - S / 2);
      try {
        await pressFill.setStyleAttribute(\`position:fixed;left:\${L}px;top:\${T}px;width:\${S}px;height:\${S}px;z-index:99971;pointer-events:none;overflow:visible;border-radius:\${S}px;display:block;background:transparent\`);
        await pressFill.setInnerHTML(\`<div style="width:100%;height:100%;box-sizing:border-box;border-radius:999px;border:2px solid rgba(167,139,250,.95);box-shadow:0 0 0 3px rgba(124,108,255,.22);transform:scale(.55);opacity:.35;animation:nxPressRing \${PRESS_MS}ms linear forwards;pointer-events:none;will-change:transform,opacity"></div>\`);
      } catch {
      }
    }, showFullscreen = async (f) => {`;

const VENDOR_PRESS_FILL_STICKY_CALL_NEEDLE =
  `          showPressFill(g.thumb).catch(() => {
          });`;
const VENDOR_PRESS_FILL_STICKY_CALL_PATCH =
  `          showPressFill(g.thumb, x, I).catch(() => {
          });`;

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
      if (fPress.source === "inline-shot") {
        await hidePressFill();
        return;
      }
      if (fPress.source === "sticky-pin") {
        const ov = t.overlayUi;
        if (ov) ov._stickyThumbCollapsed = !1;
        try {
          await Ht();
        } catch {
        }`;


/** Long-press inline bubble shots → same inspect sheet as sticky thumbs. */
const VENDOR_INLINE_LONGPRESS_NEEDLE =
  `      // Sticky always-image: short-tap hide / long-press fullscreen+sheet.
      if (Nt() && !inspectOpen) {`;
const VENDOR_INLINE_LONGPRESS_PATCH =
  `      // Inline line-shots in the bubble: long-press → sticky inspect (short tap swallowed).
      if (!inspectOpen) {
        try {
          const rawInline = typeof e.querySelectorAll == "function" ? await e.querySelectorAll("[data-inlay-inline-shot]") : null;
          const unwrapInline = rawInline && typeof k.unwarpSafeArray == "function" ? await k.unwarpSafeArray(rawInline) : rawInline;
          const inlineNodes = Array.isArray(unwrapInline) ? unwrapInline : unwrapInline ? [unwrapInline] : [];
          for (const node of inlineNodes) {
            if (!node || !await hitEl(node, x, I)) continue;
            let cardId = "";
            try {
              if (typeof node.getAttribute == "function") cardId = String(await node.getAttribute("x-inlay-inline-shot") || "");
            } catch {
            }
            if (!cardId) {
              try {
                const oh = typeof node.getOuterHTML == "function" ? String(await node.getOuterHTML() || "") : "";
                const mm = /(?:data|x)-inlay-inline-shot="([^"]+)"/.exec(oh);
                if (mm) cardId = mm[1];
              } catch {
              }
            }
            const card = (t.gallery || []).find((c) => String(c?.id || "") === String(cardId || ""));
            if (!card) continue;
            // Long-press start: activate sticky image to this inline shot immediately.
            if (typeof nxActivateStickyByCardId == "function") nxActivateStickyByCardId(card.id).catch(() => {});
            if (mobilePress) {
              cancelMobilePress();
              return;
            }
            const F = {
              x,
              y: I,
              card,
              source: "inline-shot",
              pointerId: f.pointerId,
              long: !1,
              timer: null,
              thumb: node
            };
            showPressFill(node, x, I).catch(() => {
            });
            F.timer = setTimeout(() => {
              if (mobilePress !== F) return;
              F.long = !0;
              showStickyInspect(F.card).catch(() => {
              });
            }, PRESS_MS), mobilePress = F;
            pointerGesture = {
              x,
              y: I,
              movement: 0,
              marker: !0,
              forClick: !1,
              forText: !1
            };
            return;
          }
        } catch {
        }
      }
      // Sticky always-image: short-tap hide / long-press fullscreen+sheet.
      if (Nt() && !inspectOpen) {`;



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
    try { await hideFloatingViewerForModal(); } catch {}
    try { await Ht(); } catch {}`;

/** Shot-tag modal was rebuilding char prompts from live roster + expression/action/sex,
 * which drops generation caption pieces (original, normalized order, curation-only bits
 * already folded into `characters[].prompt`) and diverges from PNG/image metadata. */
const VENDOR_CARD_TAG_ROSTER_REFRESH_NEEDLE = `    // Refresh looks from live roster so base modal shows updated appearance/attire without tab switch.
    for (const slot of slots) {
      const nm = w(slot.name || "", 200);
      if (!nm) continue;
      const match = roster.find((r) => r.name.toLowerCase() === nm.toLowerCase());
      if (!match) continue;
      const looks = match.prompt || [match.appearance, match.attire, match.accessories].filter(Boolean).join(", ");
      if (!looks) continue;
      const raw = slot.raw && typeof slot.raw === "object" ? slot.raw : {};
      const shotBits = [w(raw.expression || "", 400), w(raw.action || "", 400), w(raw.sex || "", 200)].filter(Boolean).join(", ");
      slot.prompt = shotBits ? \`\${looks}, \${shotBits}\` : looks;
    }`;

const VENDOR_CARD_TAG_ROSTER_REFRESH_PATCH = `    // Prefer stored generation prompt (same as image metadata). Rebuild from live
    // roster only when this card has no saved char caption yet.
    for (const slot of slots) {
      if (w(slot.prompt || "", 4e3)) continue;
      const nm = w(slot.name || "", 200);
      if (!nm) continue;
      const match = roster.find((r) => r.name.toLowerCase() === nm.toLowerCase());
      if (!match) continue;
      const looks = match.prompt || [match.appearance, match.attire, match.accessories].filter(Boolean).join(", ");
      if (!looks) continue;
      const raw = slot.raw && typeof slot.raw === "object" ? slot.raw : {};
      const shotBits = [w(raw.expression || "", 400), w(raw.action || "", 400), w(raw.sex || "", 200)].filter(Boolean).join(", ");
      slot.prompt = shotBits ? \`\${looks}, \${shotBits}\` : looks;
    }`;

/**
 * Shot-tag modal's `stripPersonCountTags` split on bare commas, so a NAI
 * weighted group like `5::1girl, 1boy::` broke into `5::1girl` + `1boy::` —
 * neither matches PERSON_COUNT_RE/BARE_PERSON_RE, so both survived and the
 * plain regenerated tags got prepended in front of the untouched fragments.
 * Mirror `splitTagTokens`: split on `N::...::` groups intact, then drop bare
 * person words, whole weighted groups that are only person words, and the
 * broken half-fragments a previous run of the old bug may have left behind.
 */
const VENDOR_CARD_TAG_STRIP_PERSON_NEEDLE = `stripPersonCountTags = (Vt) => String(Vt || "").split(",").map((Xt) => Xt.trim()).filter((Xt) => Xt && !PERSON_COUNT_RE.test(Xt) && !BARE_PERSON_RE.test(Xt)).join(", ")`;

const VENDOR_CARD_TAG_STRIP_PERSON_PATCH = `stripPersonCountTags = (Vt) => {
      const raw = String(Vt || "");
      if (!raw.trim()) return "";
      const isPersonWord = (s) => {
        const w = String(s || "").trim();
        return !!w && (PERSON_COUNT_RE.test(w) || BARE_PERSON_RE.test(w));
      };
      const tokens = [];
      const splitRe = /-?\\d+(?:\\.\\d+)?::(?:(?!::).)*?::|[^,]+/g;
      let mm;
      while ((mm = splitRe.exec(raw)) !== null) {
        const tok = mm[0].trim();
        if (tok) tokens.push(tok);
      }
      const kept = [];
      for (const tok of tokens) {
        if (isPersonWord(tok)) continue;
        const weighted = tok.match(/^-?\\d+(?:\\.\\d+)?::([\\s\\S]*)::$/);
        if (weighted) {
          const inner = weighted[1].split(",").map((s) => s.trim()).filter(Boolean);
          if (inner.length && inner.every(isPersonWord)) continue;
          kept.push(tok);
          continue;
        }
        const openBroken = tok.match(/^-?\\d+(?:\\.\\d+)?::([\\s\\S]*)$/);
        if (openBroken && isPersonWord(openBroken[1])) continue;
        const closeBroken = tok.match(/^([\\s\\S]*)::$/);
        if (closeBroken && isPersonWord(closeBroken[1])) continue;
        kept.push(tok);
      }
      return kept.join(", ");
    }`;

/**
 * `applyAutoPerson` prepended the plain `1girl, 1boy` string straight from
 * `personTagsForSlots` with no emphasis, so every open/save cycle re-wrote
 * the main prompt without the user's NAI weight. Wrap it the same way the
 * backend's `emphasizePersonTags` does, from `card.person_tag_weight`.
 */
const VENDOR_CARD_TAG_APPLY_WEIGHT_NEEDLE = `const Xt = currentMode(), Yt = personTagsForSlots(slots, Xt), Gt = stripPersonCountTags(baseEl.value || ""), Kt = Yt ? Yt + (Gt ? \`, \${Gt}\` : "") : Gt;`;

const VENDOR_CARD_TAG_APPLY_WEIGHT_PATCH = `const Xt = currentMode(), YtPlain = personTagsForSlots(slots, Xt), personWeight = (() => {
        const n = Number(t.backendSettings?.card?.person_tag_weight);
        return Number.isFinite(n) ? Math.max(0, Math.min(5, Math.round(n))) : 3;
      })(), Yt = YtPlain && personWeight > 0 ? \`\${personWeight}::\${YtPlain}::\` : YtPlain, Gt = stripPersonCountTags(baseEl.value || ""), Kt = Yt ? Yt + (Gt ? \`, \${Gt}\` : "") : Gt;`;

/** Shot-tag modal: 시드고정 | seed input next to 인원수 태그 자동. */
const VENDOR_CARD_TAG_SEED_HTML_NEEDLE = `인원수 태그 자동</label><select data-ct-person-mode style="min-width:150px;\${field}">`;
const VENDOR_CARD_TAG_SEED_HTML_PATCH = `인원수 태그 자동</label><label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;color:#d7deea;font-size:11px;font-weight:600;padding:5px 9px;border-radius:999px;border:1px solid rgba(56,189,248,.35);background:rgba(56,189,248,.1)"><input data-ct-seed-lock type="checkbox" checked style="accent-color:#38bdf8">시드고정</label><input data-ct-seed type="number" min="0" step="1" value="\${Number(e.seed) > 0 ? Number(e.seed) : ""}" placeholder="시드" style="width:110px;min-width:90px;\${field}"><select data-ct-person-mode style="min-width:150px;\${field}">`;

/** Shot-tag modal: tiny preview left of 명령 수정, then ✕. */
const VENDOR_CARD_TAG_CMD_BTN_NEEDLE = `'<button type="button" data-ct-x style="cursor:pointer;border:0;background:rgba(255,255,255,.08);color:#e2e8f0;padding:6px 10px;border-radius:8px">✕</button>',`;
const VENDOR_CARD_TAG_CMD_BTN_PATCH = `\`<div style="display:flex;gap:6px;align-items:center;flex-shrink:0"><img data-ct-thumb alt="" src="\${h((()=>{try{const s=Ie(e);if(typeof s==="string"&&s)return s;}catch{}return String(e?.image_url||"");})())}" style="width:36px;height:36px;object-fit:contain;border-radius:8px;background:#0b0f18;border:1px solid rgba(255,255,255,.14);flex:0 0 auto;display:block"><button type="button" data-ct-cmd style="cursor:pointer;border:1px solid rgba(251,191,36,.4);background:rgba(251,191,36,.12);color:#fde68a;padding:6px 10px;border-radius:8px;font:600 11px Segoe UI,sans-serif">명령 수정</button><button type="button" data-ct-x style="cursor:pointer;border:0;background:rgba(255,255,255,.08);color:#e2e8f0;padding:6px 10px;border-radius:8px">✕</button></div>\`,`;

/** Per-char 룩 고정 checkbox + lookLocked on slots. */
const VENDOR_CARD_TAG_LOOK_SLOT_INIT_NEEDLE = `let slots = (Array.isArray(e.characters) ? e.characters : []).slice(0, MAX).map((Vt) => ({
      name: w(Vt?.name || "", 200),
      prompt: w(Vt?.prompt || "", 4e3),
      raw: Vt && typeof Vt == "object" ? {
        ...Vt
      } : {},
      open: !0
    }));`;
const VENDOR_CARD_TAG_LOOK_SLOT_INIT_PATCH = `let slots = (Array.isArray(e.characters) ? e.characters : []).slice(0, MAX).map((Vt) => ({
      name: w(Vt?.name || "", 200),
      prompt: w(Vt?.prompt || "", 4e3),
      raw: Vt && typeof Vt == "object" ? {
        ...Vt
      } : {},
      open: !0,
      lookLocked: !1
    }));`;

const VENDOR_CARD_TAG_LOOK_EMPTY_NEEDLE = `slots.length || (slots = [{
      name: "",
      prompt: "",
      raw: {},
      open: !0
    }]);`;
const VENDOR_CARD_TAG_LOOK_EMPTY_PATCH = `slots.length || (slots = [{
      name: "",
      prompt: "",
      raw: {},
      open: !0,
      lookLocked: !1
    }]);`;

const VENDOR_CARD_TAG_LOOK_PUSH_NEEDLE = `slots.push({
          name: "",
          prompt: "",
          raw: {},
          open: !0
        }), renderSlots(), applyAutoPerson(!0), setStatus(\`char\${slots.length} 추가됨\`));`;
const VENDOR_CARD_TAG_LOOK_PUSH_PATCH = `slots.push({
          name: "",
          prompt: "",
          raw: {},
          open: !0,
          lookLocked: !1
        }), renderSlots(), applyAutoPerson(!0), setStatus(\`char\${slots.length} 추가됨\`));`;

const VENDOR_CARD_TAG_LOOK_SYNC_NEEDLE = `Vt.push({
          name: w(Yt?.value || slots[Xt]?.name || "", 200),
          prompt: w(Gt?.value || slots[Xt]?.prompt || "", 4e3),
          raw: slots[Xt]?.raw && typeof slots[Xt].raw == "object" ? {
            ...slots[Xt].raw
          } : {},
          open: Kt ? !!Kt.open : slots[Xt]?.open !== !1
        });`;
const VENDOR_CARD_TAG_LOOK_SYNC_PATCH = `const lookEl = root.querySelector(\`[data-ct-look-lock="\${Xt}"]\`);
        Vt.push({
          name: w(Yt?.value || slots[Xt]?.name || "", 200),
          prompt: w(Gt?.value || slots[Xt]?.prompt || "", 4e3),
          raw: slots[Xt]?.raw && typeof slots[Xt].raw == "object" ? {
            ...slots[Xt].raw
          } : {},
          open: Kt ? !!Kt.open : slots[Xt]?.open !== !1,
          lookLocked: lookEl ? !!lookEl.checked : !!slots[Xt]?.lookLocked
        });`;

const VENDOR_CARD_TAG_LOOK_HTML_NEEDLE = `<label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>캐릭터 태그 (prompt)</span><textarea data-ct-prompt="\${Xt}" rows="3" style="\${field};resize:vertical;min-height:68px">\${h(Vt.prompt || "")}</textarea></label></div></details>\`).join("")`;
const VENDOR_CARD_TAG_LOOK_HTML_PATCH = `<label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>캐릭터 태그 (prompt)</span><textarea data-ct-prompt="\${Xt}" rows="3" style="\${field};resize:vertical;min-height:68px">\${h(Vt.prompt || "")}</textarea></label><label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;color:#d7deea;font-size:11px;font-weight:600"><input data-ct-look-lock="\${Xt}" type="checkbox" \${Vt.lookLocked ? "checked" : ""} style="accent-color:#fbbf24">룩 고정</label></div></details>\`).join("")`;

/** 저장·리롤 passes fixed seed when 시드고정 is on. */
const VENDOR_CARD_TAG_REROLL_SEED_NEEDLE = `body: {
            mode: "nai",
            overrides: {
              main_prompt: payload.main_prompt,
              negative_prompt: payload.negative_prompt,
              characters: payload.characters
            }
          }`;
const VENDOR_CARD_TAG_REROLL_SEED_PATCH = `body: {
            mode: "nai",
            overrides: (() => {
              const o = {
                main_prompt: payload.main_prompt,
                negative_prompt: payload.negative_prompt,
                characters: payload.characters
              };
              const lock = !!root.querySelector("[data-ct-seed-lock]")?.checked;
              const seed = Number(root.querySelector("[data-ct-seed]")?.value);
              if (lock && Number.isFinite(seed) && seed > 0) o.seed = Math.floor(seed);
              return o;
            })()
          }`;

/**
 * 명령 수정 popup + POST command-rewrite → fill textareas only.
 * Inserted after the ✕ listener in openCardTagEdit.
 */
const VENDOR_CARD_TAG_CMD_EVT_NEEDLE = `root.querySelector("[data-ct-x]")?.addEventListener("click", (Vt) => {
      Vt.preventDefault(), Vt.stopPropagation(), saveOnly().catch(() => {
      });
    }), (() => {
      const backdrop = root.querySelector("[data-ct-backdrop]");`;
const VENDOR_CARD_TAG_CMD_EVT_PATCH = `root.querySelector("[data-ct-x]")?.addEventListener("click", (Vt) => {
      Vt.preventDefault(), Vt.stopPropagation(), saveOnly().catch(() => {
      });
    }), root.querySelector("[data-ct-cmd]")?.addEventListener("click", (Vt) => {
      Vt.preventDefault(), Vt.stopPropagation();
      const cardCfg = t.backendSettings?.card || {};
      const presets = Array.isArray(cardCfg.presets) ? cardCfg.presets : [];
      const activeId = String(cardCfg.active_preset_id || "");
      const optHtml = presets.length
        ? presets.map((p) => {
            const id = String(p?.id || "");
            const label = h(String(p?.name || p?.label || id || "preset").slice(0, 40));
            return \`<option value="\${h(id)}" \${id && id === activeId ? "selected" : ""}>\${label}</option>\`;
          }).join("")
        : '<option value="">(활성 프리셋)</option>';
      let previewSrc = "";
      try {
        const s = Ie(e);
        if (typeof s === "string" && s) previewSrc = s;
      } catch {}
      if (!previewSrc) previewSrc = String(e?.image_url || root.querySelector("[data-ct-thumb]")?.getAttribute("src") || "");
      const previewHtml = previewSrc
        ? \`<img data-ct-cmd-img alt="" src="\${h(previewSrc)}" style="max-width:min(92vw,560px);max-height:min(46vh,440px);width:auto;height:auto;object-fit:contain;border-radius:12px;background:#0b0f18;border:1px solid rgba(255,255,255,.14);box-shadow:0 18px 48px rgba(0,0,0,.55);display:block">\`
        : '<div style="width:min(56vw,220px);aspect-ratio:3/4;border-radius:12px;background:#0b0f18;border:1px dashed rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;color:#64748b;font-size:12px">이미지 없음</div>';
      const pop = document.createElement("div");
      pop.setAttribute("data-ct-cmd-pop", "1");
      // Image centered in the free space; form docked to the bottom (mobile-safe).
      pop.style.cssText = "position:fixed;inset:0;z-index:100010;background:rgba(4,8,16,.78);display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:10px 12px calc(12px + env(safe-area-inset-bottom,0px));box-sizing:border-box;gap:10px;overscroll-behavior:contain";
      pop.innerHTML = \`<div data-ct-cmd-preview style="flex:1 1 auto;min-height:120px;width:100%;display:flex;align-items:center;justify-content:center;padding:4px 0;pointer-events:none">\${previewHtml}</div><div data-ct-cmd-panel style="width:min(440px,100%);flex:0 1 auto;max-height:min(52vh,520px);overflow:auto;-webkit-overflow-scrolling:touch;background:linear-gradient(165deg,#1a1f2e,#0c1018);border:1px solid rgba(251,191,36,.35);border-radius:14px;padding:14px 16px;display:grid;gap:10px;box-shadow:0 24px 64px rgba(0,0,0,.55)"><div style="font-weight:700;font-size:14px;color:#fde68a">명령으로 수정</div><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>지시사항 (비우면 랜덤 재작성)</span><textarea data-ct-cmd-instr rows="3" style="\${field};resize:vertical;min-height:72px;max-height:28vh" placeholder="예: 더 밝은 표정, 카페로 배경 변경"></textarea></label><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>스타일 프리셋</span><select data-ct-cmd-preset style="\${field}">\${optHtml}</select></label><div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"><button type="button" data-ct-cmd-cancel style="cursor:pointer;border:0;background:#334155;color:#fff;padding:8px 12px;border-radius:9px;font:12px Segoe UI,sans-serif">취소</button><button type="button" data-ct-cmd-apply style="cursor:pointer;border:0;background:#f59e0b;color:#111;padding:8px 14px;border-radius:9px;font:600 12px Segoe UI,sans-serif">적용</button></div></div>\`;
      const closePop = () => { try { pop.remove(); } catch {} };
      pop.addEventListener("click", (ev) => { if (ev.target === pop || ev.target?.getAttribute?.("data-ct-cmd-preview") != null) closePop(); });
      pop.querySelector("[data-ct-cmd-cancel]")?.addEventListener("click", (ev) => { ev.preventDefault(); closePop(); });
      pop.querySelector("[data-ct-cmd-panel]")?.addEventListener("click", (ev) => ev.stopPropagation());
      pop.querySelector("[data-ct-cmd-apply]")?.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const applyBtn = pop.querySelector("[data-ct-cmd-apply]");
        try {
          if (applyBtn) applyBtn.disabled = !0;
          setStatus("명령 수정 중…");
          syncFromDom();
          const payload = collectPayload();
          const look_locked = slots.map((s) => !!s.lookLocked);
          const preset_id = String(pop.querySelector("[data-ct-cmd-preset]")?.value || "");
          const instruction = String(pop.querySelector("[data-ct-cmd-instr]")?.value || "");
          const res = await K(\`/v1/cards/\${encodeURIComponent(e.id)}/command-rewrite\`, {
            method: "POST",
            body: {
              instruction,
              preset_id,
              look_locked,
              main_prompt: payload.main_prompt,
              negative_prompt: payload.negative_prompt,
              characters: payload.characters
            }
          }, 12e4);
          if (res?.ok === !1) throw new Error(res?.error?.message || "명령 수정 실패");
          if (baseEl && res?.main_prompt != null) baseEl.value = String(res.main_prompt || "");
          if (negEl && res?.negative_prompt != null) negEl.value = String(res.negative_prompt || "");
          const nextChars = Array.isArray(res?.characters) ? res.characters : [];
          for (let i = 0; i < slots.length; i += 1) {
            const nc = nextChars[i];
            if (!nc) continue;
            if (nc.name != null) slots[i].name = w(nc.name, 200);
            if (nc.prompt != null) slots[i].prompt = w(nc.prompt, 4e3);
            slots[i].raw = { ...(slots[i].raw || {}), action: nc.action || slots[i].raw?.action };
          }
          renderSlots();
          applyAutoPerson(!0);
          closePop();
          setStatus("명령 반영됨 · 저장 또는 저장·리롤하세요");
        } catch (err) {
          setStatus(\`명령 실패: \${z(err?.message || err, 80)}\`);
        } finally {
          if (applyBtn) applyBtn.disabled = !1;
        }
      });
      document.body.appendChild(pop);
      try { pop.querySelector("[data-ct-cmd-instr]")?.focus?.(); } catch {}
    }), (() => {
      const backdrop = root.querySelector("[data-ct-backdrop]");`;

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
    try { await hideFloatingViewerForModal(); } catch {}
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
    // Settings open calls xe()/close helpers while hiding viewer — do not undo that.
    if (t.overlayUi && !t.charEditUi && !t.uiOpen) {
      t.overlayUi._stickyEditorOpen = !1;
      try { await Ht(); } catch {}
    }
    if (!t.charEditUi && !t.uiOpen) try { await restoreFloatingViewerAfterModal(); } catch {}
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

const VENDOR_STICKY_CLOSE_CHAR_PATCH = `    if (t.charEditUi = null, t.autotagFocus?.scope === "modal" && (t.autotagFocus = null), t.charRefFocus?.scope === "modal" && (t.charRefFocus = null), o && !t.uiOpen && typeof k.hideContainer == "function") try {
      await k.hideContainer();
    } catch {
    }
    if (t.galleryUi?.renderCast) try {
      await t.galleryUi.renderCast();
    } catch {
    }
    // At() always calls xe() after hideFloatingViewerForModal — skip restore while settings open.
    if (t.overlayUi && !t.cardTagUi && !t.uiOpen) {
      t.overlayUi._stickyEditorOpen = !1;
      try { await Ht(); } catch {}
    }
    if (!t.cardTagUi && !t.uiOpen) try { await restoreFloatingViewerAfterModal(); } catch {}
  }
  async function Ua(e) {`;

/** Settings open: same sticky 0% + viewer hide as shot/char edit (markers live outside overlay root). */
const VENDOR_SETTINGS_OPEN_STICKY_NEEDLE = `  async function At() {
    t.uiOpen = !0;
    // Re-open settings with whatever the viewer last selected.`;
const VENDOR_SETTINGS_OPEN_STICKY_PATCH = `  async function At() {
    // Flag first so La()/pin park while settings shell paints — do not await Ht here.
    if (t.overlayUi) t.overlayUi._stickyEditorOpen = !0;
    t.uiOpen = !0;
    // Re-open settings with whatever the viewer last selected.`;

/** After xe() cleanup in At(), re-hide viewer+panel (xe used to restore them). */
const VENDOR_SETTINGS_AT_HIDE_PANEL_NEEDLE = `      const hide = "position:fixed;left:0;top:0;width:0;height:0;opacity:0;pointer-events:none;visibility:hidden;";
      for (const ui of [t.galleryUi?.root, t.overlayUi?.root, t.debugUi?.root, t.overlayUi?.pinned, t.overlayUi?.preview, t.overlayUi?.fullscreen]) {
        if (ui && typeof ui.setStyleAttribute == "function") ui.setStyleAttribute(hide).catch(() => {
        });
      }
    } catch {
    }
    armSettingsCloseWatch();
    try {
      await xe();
    } catch {
      t.charEditUi = null;
    }
    try {
      document.body.innerHTML = "";
    } catch {
    }
    t.charEditUi = null;
    try {
      await ia();
    } catch {
    }
    typeof k.showContainer == "function" && await k.showContainer("fullscreen");`;
const VENDOR_SETTINGS_AT_HIDE_PANEL_PATCH = `      const hide = "position:fixed;left:0;top:0;width:0;height:0;opacity:0;pointer-events:none;visibility:hidden;";
      // Panel is position:fixed — must hide it too (root alone does not cover it).
      for (const ui of [t.galleryUi?.root, t.galleryUi?.panel, t.overlayUi?.root, t.debugUi?.root, t.overlayUi?.pinned, t.overlayUi?.preview, t.overlayUi?.fullscreen]) {
        if (ui && typeof ui.setStyleAttribute == "function") ui.setStyleAttribute(hide).catch(() => {
        });
      }
    } catch {
    }
    armSettingsCloseWatch();
    try {
      await xe();
    } catch {
      t.charEditUi = null;
    }
    try {
      document.body.innerHTML = "";
    } catch {
    }
    t.charEditUi = null;
    try {
      await ia();
    } catch {
    }
    typeof k.showContainer == "function" && await k.showContainer("fullscreen");
    // xe() must not restore viewer while settings stay open; hide after shell is visible.
    if (t.overlayUi) t.overlayUi._stickyEditorOpen = !0;
    Promise.resolve().then(() => {
      hideFloatingViewerForModal().catch(() => {});
      Ht().catch(() => {});
    });`;

/** Settings close (nx-close): hide first, flush in background; restore viewer; no duplicate he/Ce after it(). */
const VENDOR_SETTINGS_CLOSE_STICKY_NEEDLE = `    document.getElementById("nx-close")?.addEventListener("click", async () => {
      try {
        await flushSettingsSave();
      } catch {
      }
      t.uiOpen = !1, t._debugTabTimer && (clearInterval(t._debugTabTimer), t._debugTabTimer = null), t._hostReaper && (clearInterval(t._hostReaper), t._hostReaper = null), t._settingsWatch && (clearInterval(t._settingsWatch), t._settingsWatch = null);
      try {
        await blockHostChrome(!1);
      } catch {
      }
      typeof k.hideContainer == "function" && await k.hideContainer(), invalidateOverlayLayoutCache();
      try {
        await it();
        await he();
        Ce();
      } catch {
      }
    }),`;
const VENDOR_SETTINGS_CLOSE_STICKY_PATCH = `    document.getElementById("nx-close")?.addEventListener("click", async () => {
      // Save while DOM is still mounted (same as 저장), then hide + restore viewer.
      try { await xa({ silent: !0 }); } catch (err) {
        y("warn", "settings.close.save", err?.message || err);
      }
      t.uiOpen = !1, t._debugTabTimer && (clearInterval(t._debugTabTimer), t._debugTabTimer = null), t._hostReaper && (clearInterval(t._hostReaper), t._hostReaper = null), t._settingsWatch && (clearInterval(t._settingsWatch), t._settingsWatch = null);
      if (t.overlayUi) t.overlayUi._stickyEditorOpen = !1;
      typeof k.hideContainer == "function" && await k.hideContainer();
      invalidateOverlayLayoutCache();
      Promise.resolve().then(async () => {
        let stayInRisu = !!t._viewerHiddenForRisuSettings;
        if (!stayInRisu) {
          try { stayInRisu = await isRisuSettingsOpen(); } catch { stayInRisu = !1; }
        }
        if (stayInRisu) {
          // Back to Risu settings/plugins — do not bring the floating viewer over that UI.
          // Inlay settings are closed: drop modal hide flag or Risu-close restore stays blocked.
          t._viewerHiddenForModal = !1;
          try { await hideFloatingViewerForRisuSettings(); } catch {}
          try { await blockHostChrome(!1); } catch {}
          try { await hideFloatingViewerForRisuSettings(); } catch {}
          return;
        }
        try {
          typeof nxHostToast == "function" && nxHostToast("뷰어 복구 중…", { ms: 8e3 });
        } catch {
        }
        try { await restoreFloatingViewerAfterModal(); } catch {}
        try { await blockHostChrome(!1); } catch {}
        try { await it(); } catch {}
        try {
          typeof nxHostToast == "function" && await nxHostToast("뷰어 복구됨", { ms: 1500 });
        } catch {
        }
      }).catch((err) => {
        y("warn", "settings.close.restore", err?.message || err);
      });
    }),`;

/** Viewer 상시 chip: flip overlay_markers in memory + layout first, persist after. */
const VENDOR_SANGSI_TOGGLE_NEEDLE = `    }, ae = async () => {
      const A = t.backendSettings?.card || {}, _ = A.overlay_markers === !1;
      await flushSettingsSave(), await pe({ card: {
        ...A,
        overlay_markers: _,
        inline_previews: _
      } }), y("info", "overlay.toggle", String(_)), await he(), await T();
    }, Za = async (A) => {`;
const VENDOR_SANGSI_TOGGLE_PATCH = `    }, ae = async () => {
      const A = t.backendSettings?.card || {}, nextOn = A.overlay_markers === !1;
      t.backendSettings = t.backendSettings || {};
      t.backendSettings.card = {
        ...(t.backendSettings.card || {}),
        ...A,
        overlay_markers: nextOn,
        inline_previews: nextOn
      };
      // Bust sticky v2 cache so ON repaints image (showSticky follows overlayVisualOn).
      if (t.overlayUi) t.overlayUi._v2LayoutKey = null, t.overlayUi._lastThumbPct = null;
      // Sticky layout only — full T() rebuild was the main lag on 상시 toggle.
      try { await he(); } catch {}
      try { await T("chrome"); } catch {}
      y("info", "overlay.toggle", String(nextOn));
      pe({
        card: {
          ...(t.backendSettings?.card || {}),
          overlay_markers: nextOn,
          inline_previews: nextOn
        }
      }).then(() => {
        // PUT echo must not rewind optimistic flags.
        if (t.backendSettings?.card) {
          t.backendSettings.card.overlay_markers = nextOn;
          t.backendSettings.card.inline_previews = nextOn;
        }
      }).catch((err) => {
        y("warn", "overlay.toggle.fail", err?.message || err);
      });
    }, Za = async (A) => {`;

/** Settings shell vanished (host closed UI): same sticky/viewer restore as nx-close. */
const VENDOR_SETTINGS_WATCH_STICKY_NEEDLE = `        t.uiOpen = !1, t._hostReaper && (clearInterval(t._hostReaper), t._hostReaper = null), clearInterval(t._settingsWatch), t._settingsWatch = null;
        flushSettingsSave().catch(() => {
        }), blockHostChrome(!1).catch(() => {
        }), y("info", "settings.closed", "host ui restore");`;
const VENDOR_SETTINGS_WATCH_STICKY_PATCH = `        t.uiOpen = !1, t._hostReaper && (clearInterval(t._hostReaper), t._hostReaper = null), clearInterval(t._settingsWatch), t._settingsWatch = null;
        if (t.overlayUi) t.overlayUi._stickyEditorOpen = !1;
        xa({ silent: !0 }).catch(() => {});
        Promise.resolve().then(async () => {
          let stayInRisu = !!t._viewerHiddenForRisuSettings;
          if (!stayInRisu) {
            try { stayInRisu = await isRisuSettingsOpen(); } catch { stayInRisu = !1; }
          }
          if (stayInRisu) {
            // Inlay settings closed while Risu stays open — clear modal flag so Risu-close can restore.
            t._viewerHiddenForModal = !1;
            try { await hideFloatingViewerForRisuSettings(); } catch {}
            try { await blockHostChrome(!1); } catch {}
            try { await hideFloatingViewerForRisuSettings(); } catch {}
            return;
          }
          try { await restoreFloatingViewerAfterModal(); } catch {}
          try { await blockHostChrome(!1); } catch {}
          try { await it(); } catch {}
        }).catch(() => {});
        y("info", "settings.closed", "host ui restore");`;

const VENDOR_BLOCK_HOST_UNBLOCK_NEEDLE = `      if (t.galleryUi?.applyChrome) await t.galleryUi.applyChrome();
      else if (t.galleryUi?.paintStatus) await t.galleryUi.paintStatus();
      invalidateOverlayLayoutCache();
      await it();
      try {
        await he();
      } catch {
      }
      Ce();
    } catch {
    }
  }`;
const VENDOR_BLOCK_HOST_UNBLOCK_PATCH = `      if (!t._viewerHiddenForRisuSettings && !t._viewerHiddenForModal) {
        if (t.galleryUi?.applyChrome) await t.galleryUi.applyChrome();
        else if (t.galleryUi?.paintStatus) await t.galleryUi.paintStatus();
      }
      // Remount (it/he/Ce) is scheduled by settings close — keep unblock style-only for instant hide.
      invalidateOverlayLayoutCache();
    } catch {
    }
  }`;

/** Char create/edit: gender select + autotag gender (asserted vendor patches). */
const VENDOR_AUTOTAG_LT_NEEDLE = `    return o(\`LLM 태그 완료 · 외형/의상/악세 \${count ? \`\${count}토큰\` : "반영"}\`, "ok"), {
      appearance: appearance || (!attire && !accessories ? text : ""),
      attire,
      accessories,
      text,
      count
    };
  }`;
const VENDOR_AUTOTAG_LT_PATCH = `    const genderRaw = String(a.gender || "").toLowerCase();
    const gender = ["girl", "female", "f", "woman"].includes(genderRaw) ? "girl" : ["boy", "male", "m", "man"].includes(genderRaw) ? "boy" : ["other"].includes(genderRaw) ? "other" : "";
    return o(\`LLM 태그 완료 · 외형/의상/악세 \${count ? \`\${count}토큰\` : "반영"}\${gender ? \` · \${gender}\` : ""}\`, "ok"), {
      appearance: appearance || (!attire && !accessories ? text : ""),
      attire,
      accessories,
      gender,
      text,
      count
    };
  }`;

const VENDOR_CHAR_CREATE_GENDER_HTML_NEEDLE =
  `<div style="display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:8px"><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>이름</span><input data-cc-name value="" style="\${field}"></label><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>원본 태그</span><input data-cc-original placeholder="(원작 캐릭터 태그)" style="\${field}"></label></div>`;
const VENDOR_CHAR_CREATE_GENDER_HTML_PATCH =
  `<div style="display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr) minmax(0,.7fr);gap:8px"><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>이름</span><input data-cc-name value="" style="\${field}"></label><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>원본 태그</span><input data-cc-original placeholder="(원작 캐릭터 태그)" style="\${field}"></label><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>성별</span><select data-cc-gender style="\${field}"><option value="">미정</option><option value="girl">girl</option><option value="boy">boy</option><option value="other">other</option></select></label></div>`;

const VENDOR_CHAR_CREATE_GENDER_REF_NEEDLE =
  `const nameEl = root.querySelector("[data-cc-name]"), originalEl = root.querySelector("[data-cc-original]"), surnameEl = root.querySelector("[data-cc-surname]")`;
const VENDOR_CHAR_CREATE_GENDER_REF_PATCH =
  `const nameEl = root.querySelector("[data-cc-name]"), originalEl = root.querySelector("[data-cc-original]"), genderEl = root.querySelector("[data-cc-gender]"), surnameEl = root.querySelector("[data-cc-surname]")`;

const VENDOR_CHAR_CREATE_GENDER_AUTOTAG_NEEDLE =
  `        appearanceEl && (appearanceEl.value = tags.appearance || "");
        attireEl && (attireEl.value = tags.attire || "");
        accessoriesEl && (accessoriesEl.value = tags.accessories || "");
        setStatus("오토태그 반영됨 · 외형/의상/악세 · 저장하세요"), setAutotagFocus(!0, "완료");`;
const VENDOR_CHAR_CREATE_GENDER_AUTOTAG_PATCH =
  `        appearanceEl && (appearanceEl.value = tags.appearance || "");
        attireEl && (attireEl.value = tags.attire || "");
        accessoriesEl && (accessoriesEl.value = tags.accessories || "");
        genderEl && tags.gender && (genderEl.value = tags.gender);
        {
          const VC = globalThis.__INLAY_VIEWER_CORE__;
          if (appearanceEl && genderEl?.value && typeof VC?.syncGenderIntoAppearance == "function") {
            appearanceEl.value = VC.syncGenderIntoAppearance(appearanceEl.value, genderEl.value);
          }
        }
        setStatus("오토태그 반영됨 · 외형/의상/악세/성별 · 저장하세요"), setAutotagFocus(!0, "완료");`;

const VENDOR_CHAR_CREATE_GENDER_SAVE_NEEDLE =
  `        appearance: w(appearanceEl?.value || "", 4e3),
        attire: w(attireEl?.value || "", 4e3),
        accessories: w(accessoriesEl?.value || "", 4e3),
        attire_locked: !!attireLockedEl?.checked,
        accessories_locked: !!accLockedEl?.checked,
        priority: Number(priorityEl?.value || 0) || 0
      };`;
const VENDOR_CHAR_CREATE_GENDER_SAVE_PATCH =
  `        appearance: w(appearanceEl?.value || "", 4e3),
        attire: w(attireEl?.value || "", 4e3),
        accessories: w(accessoriesEl?.value || "", 4e3),
        gender: ["girl", "boy", "other"].includes(String(genderEl?.value || "")) ? String(genderEl.value) : "",
        attire_locked: attireLockedEl ? !!attireLockedEl.checked : true,
        accessories_locked: accLockedEl ? !!accLockedEl.checked : true,
        priority: Number(priorityEl?.value || 0) || 0
      };`;

const VENDOR_CHAR_EDIT_GENDER_HTML_NEEDLE =
  `<div style="display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:8px"><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>이름</span><input data-ce-name value="\${h(n.name || e.name)}" style="width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:8px 10px;font:13px/1.4 Segoe UI,sans-serif"></label><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>원본 태그</span><input data-ce-original value="\${h(n.original || "")}" placeholder="(원작 캐릭터 태그)" style="width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:8px 10px;font:13px/1.4 Segoe UI,sans-serif"></label></div>`;
const VENDOR_CHAR_EDIT_GENDER_HTML_PATCH =
  `<div style="display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr) minmax(0,.7fr);gap:8px"><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>이름</span><input data-ce-name value="\${h(n.name || e.name)}" style="width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:8px 10px;font:13px/1.4 Segoe UI,sans-serif"></label><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>원본 태그</span><input data-ce-original value="\${h(n.original || "")}" placeholder="(원작 캐릭터 태그)" style="width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:8px 10px;font:13px/1.4 Segoe UI,sans-serif"></label><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>성별</span><select data-ce-gender style="width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:8px 10px;font:13px/1.4 Segoe UI,sans-serif"><option value="" \${!["girl","boy","other","female","male"].includes(String(n.gender||n.sex||""))?"selected":""}>미정</option><option value="girl" \${["girl","female"].includes(String(n.gender||n.sex||""))?"selected":""}>girl</option><option value="boy" \${["boy","male"].includes(String(n.gender||n.sex||""))?"selected":""}>boy</option><option value="other" \${String(n.gender||n.sex||"")==="other"?"selected":""}>other</option></select></label></div>`;

const VENDOR_CHAR_EDIT_GENDER_REF_NEEDLE =
  `const s = i.querySelector("[data-ce-name]"), c = i.querySelector("[data-ce-original]"), surnameEl = i.querySelector("[data-ce-surname]")`;
const VENDOR_CHAR_EDIT_GENDER_REF_PATCH =
  `const s = i.querySelector("[data-ce-name]"), c = i.querySelector("[data-ce-original]"), genderEl = i.querySelector("[data-ce-gender]"), surnameEl = i.querySelector("[data-ce-surname]")`;

const VENDOR_CHAR_EDIT_GENDER_AUTOTAG_NEEDLE =
  `          p && (p.value = x.appearance || "");
          m && (m.value = x.attire || "");
          accEl && (accEl.value = x.accessories || "");
          j(!0, "완료"), b && (b.textContent = "오토태그"), E("오토태그 반영됨 · 외형/의상/악세 · 저장을 누르세요");`;
const VENDOR_CHAR_EDIT_GENDER_AUTOTAG_PATCH =
  `          p && (p.value = x.appearance || "");
          m && (m.value = x.attire || "");
          accEl && (accEl.value = x.accessories || "");
          genderEl && x.gender && (genderEl.value = x.gender);
          {
            const VC = globalThis.__INLAY_VIEWER_CORE__;
            if (p && genderEl?.value && typeof VC?.syncGenderIntoAppearance == "function") {
              p.value = VC.syncGenderIntoAppearance(p.value, genderEl.value);
            }
          }
          j(!0, "완료"), b && (b.textContent = "오토태그"), E("오토태그 반영됨 · 외형/의상/악세/성별 · 저장을 누르세요");`;

const VENDOR_CHAR_EDIT_GENDER_SAVE_NEEDLE =
  `          appearance: F,
          attire: T,
          accessories: Acc,
          attire_locked: !!attireLockedEl?.checked,
          accessories_locked: !!accLockedEl?.checked,
          priority: Number(n.priority || 0)
        };`;
const VENDOR_CHAR_EDIT_GENDER_SAVE_PATCH =
  `          appearance: F,
          attire: T,
          accessories: Acc,
          gender: ["girl", "boy", "other"].includes(String(genderEl?.value || "")) ? String(genderEl.value) : "",
          attire_locked: attireLockedEl ? !!attireLockedEl.checked : true,
          accessories_locked: accLockedEl ? !!accLockedEl.checked : true,
          priority: Number(n.priority || 0),
          active_costume: (() => {
            const sel = i.querySelector("[data-ce-costume]");
            if (!sel || sel.value === "__add__") return 0;
            const opts = [...sel.options].filter((o) => o.value !== "__add__");
            const idx = opts.findIndex((o) => o.value === sel.value);
            return idx >= 0 ? idx : 0;
          })(),
          promote_costume_default: i.dataset.promoteCostumeDefault === "1",
          costume: (() => {
            const sel = i.querySelector("[data-ce-costume]");
            if (!sel || sel.value === "__add__") return 0;
            const opts = [...sel.options].filter((o) => o.value !== "__add__");
            const idx = opts.findIndex((o) => o.value === sel.value);
            return idx >= 0 ? idx : 0;
          })(),
          costumes: (() => {
            const sel = i.querySelector("[data-ce-costume]");
            if (!sel) return Array.isArray(n.costumes) ? n.costumes : undefined;
            const nameNow = String(i.querySelector("[data-ce-costume-name]")?.value || "").trim();
            const noteNow = String(i.querySelector("[data-ce-costume-note]")?.value || "").trim();
            const opts = [...sel.options].filter((o) => o.value !== "__add__");
            let active = opts.findIndex((o) => o.value === sel.value);
            if (active < 0) active = 0;
            return opts.map((o, idx) => ({
              name: (idx === active ? nameNow : "") || o.getAttribute("data-name") || (idx === 0 ? "default" : "costume" + idx),
              note: idx === active ? noteNow : (o.getAttribute("data-note") || ""),
              attire: idx === active ? T : (o.getAttribute("data-attire") || ""),
              accessories: idx === active ? Acc : (o.getAttribute("data-accessories") || "")
            }));
          })()
        };`;

/** Stamp card id onto character save when edit was opened from a viewer card. */
const VENDOR_CHAR_EDIT_STAMP_NEEDLE =
  `            body: {
              session_id: live?.sessionId || rosterSessionId || "",
              scope: x,
              character: edited
            }`;
const VENDOR_CHAR_EDIT_STAMP_PATCH =
  `            body: {
              session_id: live?.sessionId || rosterSessionId || "",
              scope: x,
              character: edited,
              stamp_card_id: e.cardId || "",
              stamp_char_index: Number.isFinite(Number(e.index)) ? Number(e.index) : null
            }`;

const VENDOR_CHAR_EDIT_STAMP_UNIFIED_NEEDLE =
  `            body: withRootSessions({
              session_id: rosterSessionId,
              character_id: w(live?.characterId || rosterMeta.characterId || "", 200),
              character: edited
            }, rosterMeta.unifiedScope)`;
const VENDOR_CHAR_EDIT_STAMP_UNIFIED_PATCH =
  `            body: withRootSessions({
              session_id: rosterSessionId,
              character_id: w(live?.characterId || rosterMeta.characterId || "", 200),
              character: edited,
              stamp_card_id: e.cardId || "",
              stamp_char_index: Number.isFinite(Number(e.index)) ? Number(e.index) : null
            }, rosterMeta.unifiedScope)`;

/** Bind costume select / add / delete / slot-save / default in char edit modal. */
const VENDOR_CHAR_EDIT_COSTUME_BIND_NEEDLE =
  `    i.querySelector("[data-ce-save]")?.addEventListener("click", (f) => {
      f.preventDefault(), f.stopPropagation(), U().catch(() => {
      });
    })`;
const VENDOR_CHAR_EDIT_COSTUME_BIND_PATCH =
  `    (() => {
      const root = i;
      const sel = () => root.querySelector("[data-ce-costume]");
      const realOpts = () => [...(sel()?.options || [])].filter((o) => o.value !== "__add__");
      const reindex = () => {
        realOpts().forEach((o, idx) => {
          const name = o.getAttribute("data-name") || o.textContent || ("costume" + idx);
          const note = o.getAttribute("data-note") || "";
          o.value = String(idx);
          o.textContent = name.replace(/\\[\\d+\\].*$/, "").trim() + "[" + idx + "]" + (note ? " · " + note : "");
        });
      };
      const load = () => {
        const s = sel(), o = s?.options?.[s.selectedIndex];
        if (!o || o.value === "__add__") return;
        const nameEl = root.querySelector("[data-ce-costume-name]"), noteEl = root.querySelector("[data-ce-costume-note]");
        const att = root.querySelector("[data-ce-attire]"), acc = root.querySelector("[data-ce-accessories]");
        if (nameEl) nameEl.value = o.getAttribute("data-name") || "";
        if (noteEl) noteEl.value = o.getAttribute("data-note") || "";
        if (att) att.value = o.getAttribute("data-attire") || "";
        if (acc) acc.value = o.getAttribute("data-accessories") || "";
      };
      const commitSlot = () => {
        const s = sel(), o = s?.options?.[s.selectedIndex];
        if (!o || o.value === "__add__") return false;
        const name = String(root.querySelector("[data-ce-costume-name]")?.value || "").trim() || ("costume" + o.value);
        const note = String(root.querySelector("[data-ce-costume-note]")?.value || "").trim();
        const attire = root.querySelector("[data-ce-attire]")?.value || "";
        const accessories = root.querySelector("[data-ce-accessories]")?.value || "";
        o.setAttribute("data-name", name);
        o.setAttribute("data-note", note);
        o.setAttribute("data-attire", attire);
        o.setAttribute("data-accessories", accessories);
        o.textContent = name + "[" + o.value + "]" + (note ? " · " + note : "");
        return true;
      };
      sel()?.addEventListener("change", () => {
        const s = sel();
        if (!s) return;
        if (s.value === "__add__") {
          const n = realOpts().length;
          const o = document.createElement("option");
          o.value = String(n);
          o.setAttribute("data-name", "costume" + n);
          o.setAttribute("data-note", "");
          o.setAttribute("data-attire", "");
          o.setAttribute("data-accessories", "");
          o.textContent = "costume" + n + "[" + n + "]";
          s.appendChild(o);
          s.value = String(n);
          const att = root.querySelector("[data-ce-attire]"), acc = root.querySelector("[data-ce-accessories]");
          if (att) att.value = "";
          if (acc) acc.value = "";
          const nameEl = root.querySelector("[data-ce-costume-name]"), noteEl = root.querySelector("[data-ce-costume-note]");
          if (nameEl) nameEl.value = "costume" + n;
          if (noteEl) noteEl.value = "";
          return;
        }
        load();
      });
      root.querySelector("[data-ce-costume-slot-save]")?.addEventListener("click", (f) => {
        f.preventDefault();
        if (commitSlot()) E("코스튬 슬롯 저장됨 · 캐릭터 저장을 누르세요");
      });
      root.querySelector("[data-ce-costume-delete]")?.addEventListener("click", (f) => {
        f.preventDefault();
        const s = sel();
        if (!s || s.value === "__add__") return;
        if (realOpts().length <= 1) {
          E("코스튬은 최소 1개 필요합니다");
          return;
        }
        s.options[s.selectedIndex]?.remove();
        reindex();
        s.value = "0";
        load();
        root.dataset.promoteCostumeDefault = "";
      });
      root.querySelector("[data-ce-costume-default]")?.addEventListener("click", (f) => {
        f.preventDefault();
        commitSlot();
        const s = sel(), o = s?.options?.[s.selectedIndex];
        if (!o || o.value === "__add__") return;
        const addOpt = [...s.options].find((x) => x.value === "__add__");
        o.remove();
        if (addOpt) s.insertBefore(o, addOpt.nextSibling);
        else s.insertBefore(o, s.firstChild);
        o.setAttribute("data-name", "default");
        reindex();
        s.value = "0";
        root.dataset.promoteCostumeDefault = "";
        const nameEl = root.querySelector("[data-ce-costume-name]");
        if (nameEl) nameEl.value = "default";
        f.target && (f.target.textContent = "기본값 표시됨");
        load();
      });
    })(), i.querySelector("[data-ce-save]")?.addEventListener("click", (f) => {
      f.preventDefault(), f.stopPropagation(), U().catch(() => {
      });
    })`;

/** Pass card id when opening character edit from viewer / sticky. */
const VENDOR_CHAR_EDIT_CARDID_A_NEEDLE =
  `      if (name) await Ua({
        name,
        prompt: w(raw?.prompt || "", 400),
        roster: Dt(name),
        index: idx
      });`;
const VENDOR_CHAR_EDIT_CARDID_A_PATCH =
  `      if (name) await Ua({
        name,
        prompt: w(raw?.prompt || "", 400),
        roster: Dt(name),
        index: idx,
        cardId: target?.id || ""
      });`;

const VENDOR_CHAR_EDIT_CARDID_B_NEEDLE =
  `          if (name) await Ua({
            name,
            prompt: w(raw?.prompt || "", 400),
            roster: Dt(name),
            index: charI
          });`;
const VENDOR_CHAR_EDIT_CARDID_B_PATCH =
  `          if (name) await Ua({
            name,
            prompt: w(raw?.prompt || "", 400),
            roster: Dt(name),
            index: charI,
            cardId: card?.id || ""
          });`;

const VENDOR_CHAR_EDIT_CARDID_ENTRY_NEEDLE =
  `        entry.roster = Dt(entry.name) || entry.roster;
        await Ua(entry);`;
const VENDOR_CHAR_EDIT_CARDID_ENTRY_PATCH =
  `        entry.roster = Dt(entry.name) || entry.roster;
        entry.cardId = target?.id || entry.cardId || "";
        await Ua(entry);`;

/** Character settings tab: gender select beside priority. */
const VENDOR_CHAR_TAB_GENDER_HTML_NEEDLE =
  `            <label><span>우선순위</span><input data-char-priority type="number" value="\${h(r.priority ?? 0)}"></label>
            <div class="autotag-status muted\${l ? " pending" : ""}" data-autotag-status>`;
const VENDOR_CHAR_TAB_GENDER_HTML_PATCH =
  `            <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;align-items:end"><label><span>우선순위</span><input data-char-priority type="number" value="\${h(r.priority ?? 0)}"></label><label><span>성별</span><select data-char-gender><option value="" \${!["girl","boy","other","female","male"].includes(String(r.gender||r.sex||""))?"selected":""}>미정</option><option value="girl" \${["girl","female"].includes(String(r.gender||r.sex||""))?"selected":""}>girl</option><option value="boy" \${["boy","male"].includes(String(r.gender||r.sex||""))?"selected":""}>boy</option><option value="other" \${String(r.gender||r.sex||"")==="other"?"selected":""}>other</option></select></label></div>
            <div class="wide" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:2px">
              <button type="button" class="secondary" data-char-ref title="클릭: 붙여넣기 대상 · 더블클릭: 파일 (webp 권장, 재인코딩 없음)">참고이미지</button>
              <button type="button" class="secondary" data-char-ref-clear title="참고이미지 제거">제거</button>
              <div data-char-ref-preview style="width:42px;height:42px;border-radius:8px;overflow:hidden;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);flex-shrink:0">\${r.ref_preview_url ? \`<img src="\${h(r.ref_preview_url)}" alt="" style="width:100%;height:100%;object-fit:cover">\` : ""}</div>
              <span class="muted" style="font-size:11px" data-char-ref-status>\${r.ref_configured ? "설정됨" : "없음"}</span>
            </div>
            <div class="autotag-status muted\${l ? " pending" : ""}" data-autotag-status>`;

const VENDOR_CHAR_TAB_GENDER_READ_NEEDLE =
  `        attire_locked: !!n.querySelector("[data-char-attire-locked]")?.checked,
        accessories_locked: !!n.querySelector("[data-char-accessories-locked]")?.checked,
        priority: Number(n.querySelector("[data-char-priority]")?.value || 0)
      };`;
const VENDOR_CHAR_TAB_GENDER_READ_PATCH =
  `        attire_locked: n.querySelector("[data-char-attire-locked]") ? !!n.querySelector("[data-char-attire-locked]")?.checked : true,
        accessories_locked: n.querySelector("[data-char-accessories-locked]") ? !!n.querySelector("[data-char-accessories-locked]")?.checked : true,
        priority: Number(n.querySelector("[data-char-priority]")?.value || 0),
        gender: ["girl", "boy", "other"].includes(String(n.querySelector("[data-char-gender]")?.value || "")) ? String(n.querySelector("[data-char-gender]")?.value || "") : "",
        active_costume: (() => {
          const sel = n.querySelector("[data-char-costume]");
          if (!sel || sel.value === "__add__") return 0;
          const opts = [...sel.options].filter((o) => o.value !== "__add__");
          const idx = opts.findIndex((o) => o.value === sel.value);
          return idx >= 0 ? idx : 0;
        })(),
        promote_costume_default: n.dataset.promoteCostumeDefault === "1",
        costumes: (() => {
          const sel = n.querySelector("[data-char-costume]");
          if (!sel) return undefined;
          const attireNow = n.querySelector("[data-char-attire]")?.value || "";
          const accNow = n.querySelector("[data-char-accessories]")?.value || "";
          const nameNow = String(n.querySelector("[data-char-costume-name]")?.value || "").trim();
          const noteNow = String(n.querySelector("[data-char-costume-note]")?.value || "").trim();
          const opts = [...sel.options].filter((o) => o.value !== "__add__");
          let active = opts.findIndex((o) => o.value === sel.value);
          if (active < 0) active = 0;
          return opts.map((o, i) => ({
            name: (i === active ? nameNow : "") || o.getAttribute("data-name") || (i === 0 ? "default" : "costume" + i),
            note: i === active ? noteNow : (o.getAttribute("data-note") || ""),
            attire: i === active ? attireNow : (o.getAttribute("data-attire") || ""),
            accessories: i === active ? accNow : (o.getAttribute("data-accessories") || "")
          }));
        })()
      };`;

const VENDOR_CHAR_TAB_GENDER_MERGE_NEEDLE =
  `        attire_locked: !!raw.attire_locked,
        accessories_locked: !!raw.accessories_locked,
        priority: Number(raw.priority || 0) || 0
      };`;
const VENDOR_CHAR_TAB_GENDER_MERGE_PATCH =
  `        attire_locked: raw.attire_locked !== false,
        accessories_locked: raw.accessories_locked !== false,
        priority: Number(raw.priority || 0) || 0,
        gender: ["girl", "boy", "other", "female", "male"].includes(String(raw.gender || raw.sex || "").toLowerCase()) ? (["female", "f", "woman"].includes(String(raw.gender || raw.sex || "").toLowerCase()) ? "girl" : ["male", "m", "man"].includes(String(raw.gender || raw.sex || "").toLowerCase()) ? "boy" : String(raw.gender || raw.sex || "").toLowerCase()) : "",
        costumes: Array.isArray(raw.costumes) ? raw.costumes : undefined,
        active_costume: Number(raw.active_costume || 0) || 0
      };`;

/** Wear tabs: clothes+jewelry / weapons-only; keep lock toggles (default ON). Costume bar above. */
const VENDOR_CHAR_TAB_WEAR_HTML_NEEDLE =
  `            <div class="char-wear-grid wide">
              <div class="char-wear-col">
                <div class="char-wear-head"><span>옷 태그</span><label class="char-lock"><input data-char-attire-locked type="checkbox" \${r.attire_locked ? "checked" : ""}><span>고정</span></label></div>
                <textarea data-char-attire rows="2">\${h(r.attire || "")}</textarea>
              </div>
              <div class="char-wear-col">
                <div class="char-wear-head"><span>악세사리·무기·기타</span><label class="char-lock"><input data-char-accessories-locked type="checkbox" \${r.accessories_locked ? "checked" : ""}><span>고정</span></label></div>
                <textarea data-char-accessories rows="2">\${h(r.accessories || "")}</textarea>`;
const VENDOR_CHAR_TAB_WEAR_HTML_PATCH =
  `            <div class="wide" data-nx-costume-bar style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 6px">
              <div style="display:flex;align-items:stretch;min-width:140px;flex:1.2"><input data-char-costume-name placeholder="코스튬 이름" value="\${h((()=>{const L=Array.isArray(r.costumes)&&r.costumes.length?r.costumes:[{name:"default",note:"",attire:r.attire||"",accessories:r.accessories||""}];const i=Math.max(0,Math.min(L.length-1,Number(r.active_costume||0)||0));return(L[i]&&L[i].name)||"default";})())}" style="flex:1;min-width:0;border-top-right-radius:0;border-bottom-right-radius:0;border-right:0"><div style="position:relative;width:36px;flex:0 0 36px"><div aria-hidden="true" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border:1px solid var(--border,rgba(255,255,255,.14));border-left:0;border-radius:0 10px 10px 0;background:#0b0f18;color:#d7deea;font:700 12px/1 Segoe UI,sans-serif;pointer-events:none">▾</div><select data-char-costume title="코스튬 선택" style="position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;color:#e8eef8;background:#0b0f18;font-size:13px;border:0;margin:0;padding:0"><option value="__add__" style="color:#e8eef8;background:#0b0f18">＋ 코스튬 추가</option>\${(Array.isArray(r.costumes)&&r.costumes.length?r.costumes:[{name:"default",note:"",attire:r.attire||"",accessories:r.accessories||""}]).map((c,i)=>\`<option value="\${i}" data-name="\${h(c&&c.name||"")}" data-note="\${h(c&&c.note||"")}" data-attire="\${h(c&&c.attire||"")}" data-accessories="\${h(c&&c.accessories||"")}" style="color:#e8eef8;background:#0b0f18" \${Number(r.active_costume||0)===i?"selected":""}>\${h((c&&c.name)||("costume"+i))}[\${i}]\${c&&c.note?" · "+h(c.note):""}</option>\`).join("")}</select></div></div>
              <input data-char-costume-note placeholder="언제 쓸지 · 예: 수영장 / 천사 상태" value="\${h((()=>{const L=Array.isArray(r.costumes)&&r.costumes.length?r.costumes:[{name:"default",note:""}];const i=Math.max(0,Math.min(L.length-1,Number(r.active_costume||0)||0));return(L[i]&&L[i].note)||"";})())}" style="flex:1.4;min-width:140px">
              <button type="button" class="secondary" data-char-costume-delete style="min-height:34px;padding:6px 10px;flex-shrink:0">삭제</button>
              <button type="button" data-char-costume-slot-save style="min-height:34px;padding:6px 10px;flex-shrink:0;cursor:pointer;border:0;background:rgba(124,108,255,.22);color:#d7deea;border-radius:10px;font:600 12px Segoe UI,sans-serif">저장</button>
              <button type="button" data-char-costume-default style="min-height:34px;padding:6px 10px;flex-shrink:0;cursor:pointer;border:0;background:rgba(124,108,255,.22);color:#d7deea;border-radius:10px;font:600 12px Segoe UI,sans-serif">기본값으로</button>
            </div>
            <div class="char-wear-grid wide">
              <div class="char-wear-col">
                <div class="char-wear-head"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis">옷·악세사리</span><label class="char-lock" style="flex-shrink:0"><span>고정</span><input data-char-attire-locked type="checkbox" \${r.attire_locked !== false ? "checked" : ""}></label></div>
                <textarea data-char-attire rows="2">\${h(r.attire || "")}</textarea>
              </div>
              <div class="char-wear-col">
                <div class="char-wear-head"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis">무기·기타</span><label class="char-lock" style="flex-shrink:0"><span>고정</span><input data-char-accessories-locked type="checkbox" \${r.accessories_locked !== false ? "checked" : ""}></label></div>
                <textarea data-char-accessories rows="2">\${h(r.accessories || "")}</textarea>`;

const VENDOR_CHAR_EDIT_WEAR_ATTIRE_NEEDLE =
  `<span>옷 태그</span><label style="display:inline-flex;align-items:center;gap:4px;margin:0;color:#d7deea;font-size:11px;font-weight:550;cursor:pointer;white-space:nowrap"><input data-ce-attire-locked type="checkbox" \${n.attire_locked ? "checked" : ""} style="width:14px;height:14px;margin:0;accent-color:#7c6cff">고정</label>`;
const VENDOR_CHAR_EDIT_WEAR_ATTIRE_PATCH =
  `<span>옷·악세사리</span><label style="display:inline-flex;align-items:center;gap:4px;margin:0;color:#d7deea;font-size:11px;font-weight:550;cursor:pointer;white-space:nowrap;flex-shrink:0"><span>고정</span><input data-ce-attire-locked type="checkbox" \${n.attire_locked !== false ? "checked" : ""} style="width:14px;height:14px;margin:0;accent-color:#7c6cff;flex-shrink:0"></label>`;

const VENDOR_CHAR_EDIT_WEAR_ACC_NEEDLE =
  `<span>악세사리·무기·기타</span><label style="display:inline-flex;align-items:center;gap:4px;margin:0;color:#d7deea;font-size:11px;font-weight:550;cursor:pointer;white-space:nowrap"><input data-ce-accessories-locked type="checkbox" \${n.accessories_locked ? "checked" : ""} style="width:14px;height:14px;margin:0;accent-color:#7c6cff">고정</label>`;
const VENDOR_CHAR_EDIT_WEAR_ACC_PATCH =
  `<span>무기·기타</span><label style="display:inline-flex;align-items:center;gap:4px;margin:0;color:#d7deea;font-size:11px;font-weight:550;cursor:pointer;white-space:nowrap;flex-shrink:0"><span>고정</span><input data-ce-accessories-locked type="checkbox" \${n.accessories_locked !== false ? "checked" : ""} style="width:14px;height:14px;margin:0;accent-color:#7c6cff;flex-shrink:0"></label>`;

/** Insert costume editor above the edit-modal wear 2-col grid (matches pristine vendor). */
const VENDOR_CHAR_EDIT_COSTUME_NEEDLE =
  `<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px"><div style="display:grid;gap:4px;min-width:0"><div style="display:flex;align-items:center;justify-content:space-between;gap:6px;color:#9aa6b8;font-size:11px;font-weight:600"><span>옷 태그</span>`;
const VENDOR_CHAR_EDIT_COSTUME_PATCH =
  `<div data-nx-costume-bar style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 8px"><div style="display:flex;align-items:stretch;min-width:140px;flex:1.2"><input data-ce-costume-name placeholder="코스튬 이름" value="\${h((()=>{const L=Array.isArray(n.costumes)&&n.costumes.length?n.costumes:[{name:"default",note:"",attire:n.attire||"",accessories:n.accessories||""}];const i=Math.max(0,Math.min(L.length-1,Number(n.active_costume||0)||0));return(L[i]&&L[i].name)||"default";})())}" style="flex:1;min-width:0;width:100%;box-sizing:border-box;border-radius:10px 0 0 10px;border:1px solid rgba(255,255,255,.14);border-right:0;background:#0b0f18;color:#e8eef8;padding:8px 10px;font:13px/1.4 Segoe UI,sans-serif"><div style="position:relative;width:36px;flex:0 0 36px"><div aria-hidden="true" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.14);border-left:0;border-radius:0 10px 10px 0;background:#0b0f18;color:#d7deea;font:700 12px/1 Segoe UI,sans-serif;pointer-events:none">▾</div><select data-ce-costume title="코스튬 선택" style="position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;color:#e8eef8;background:#0b0f18;font-size:13px;border:0;margin:0;padding:0"><option value="__add__" style="color:#e8eef8;background:#0b0f18">＋ 코스튬 추가</option>\${(Array.isArray(n.costumes)&&n.costumes.length?n.costumes:[{name:"default",note:"",attire:n.attire||"",accessories:n.accessories||""}]).map((c,i)=>\`<option value="\${i}" data-name="\${h(c&&c.name||"")}" data-note="\${h(c&&c.note||"")}" data-attire="\${h(c&&c.attire||"")}" data-accessories="\${h(c&&c.accessories||"")}" style="color:#e8eef8;background:#0b0f18" \${Number(n.active_costume||0)===i?"selected":""}>\${h((c&&c.name)||("costume"+i))}[\${i}]\${c&&c.note?" · "+h(c.note):""}</option>\`).join("")}</select></div></div><input data-ce-costume-note placeholder="언제 쓸지 · 예: 수영장 / 천사 상태" value="\${h((()=>{const L=Array.isArray(n.costumes)&&n.costumes.length?n.costumes:[{name:"default",note:""}];const i=Math.max(0,Math.min(L.length-1,Number(n.active_costume||0)||0));return(L[i]&&L[i].note)||"";})())}" style="flex:1.4;min-width:140px;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:8px 10px;font:13px/1.4 Segoe UI,sans-serif"><button type="button" data-ce-costume-delete style="cursor:pointer;border:0;background:rgba(248,113,113,.2);color:#fecaca;padding:8px 10px;border-radius:10px;font:600 12px Segoe UI,sans-serif;white-space:nowrap">삭제</button><button type="button" data-ce-costume-slot-save style="cursor:pointer;border:0;background:rgba(124,108,255,.22);color:#d7deea;padding:8px 10px;border-radius:10px;font:600 12px Segoe UI,sans-serif;white-space:nowrap">저장</button><button type="button" data-ce-costume-default style="cursor:pointer;border:0;background:rgba(124,108,255,.22);color:#d7deea;padding:8px 10px;border-radius:10px;font:600 12px Segoe UI,sans-serif;white-space:nowrap">기본값으로</button></div><div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px"><div style="display:grid;gap:4px;min-width:0"><div style="display:flex;align-items:center;justify-content:space-between;gap:6px;color:#9aa6b8;font-size:11px;font-weight:600;flex-wrap:nowrap"><span>옷 태그</span>`;

const VENDOR_CHAR_EDIT_APPEARANCE_LABEL_NEEDLE = `<span>외형 태그 (girl/boy · 옷·악세사리 제외)</span>`;
const VENDOR_CHAR_EDIT_APPEARANCE_LABEL_PATCH = `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><span>외형 태그 (girl/boy · 옷·무기 제외)</span><button type="button" data-ce-clear-looks title="외형·옷·악세 비우기 (다음 태깅 시 재수집)" style="cursor:pointer;border:0;background:rgba(248,113,113,.2);color:#fecaca;padding:2px 9px;border-radius:8px;font:700 12px Segoe UI,sans-serif;flex-shrink:0">✕</button></div>`;

/** Clear looks (keep identity) — X next to appearance; save so next tag regenerates. */
const VENDOR_CHAR_EDIT_CLEAR_LOOKS_NEEDLE =
  `    }), i.querySelector("[data-ce-x]")?.addEventListener("click", (f) => {
      f.preventDefault(), f.stopPropagation(), U().catch(() => {
      });
    }), (() => {`;
const VENDOR_CHAR_EDIT_CLEAR_LOOKS_PATCH =
  `    }), i.querySelector("[data-ce-x]")?.addEventListener("click", (f) => {
      f.preventDefault(), f.stopPropagation(), U().catch(() => {
      });
    }), i.querySelector("[data-ce-clear-looks]")?.addEventListener("click", async (f) => {
      f.preventDefault(), f.stopPropagation();
      if (!confirm("외형·옷·악세사리를 비울까요?\\n캐릭터는 유지되고, 다음 태깅에서 다시 수집됩니다.")) return;
      if (p) p.value = "";
      if (m) m.value = "";
      if (accEl) accEl.value = "";
      try {
        await U(), E("외형 비움·저장됨 · 다음 태깅 시 재수집");
      } catch {
      }
    }), (() => {`;

/** Character tab: ✕ beside 삭제 — clear looks without removing the row. */
const VENDOR_CHAR_TAB_CLEAR_LOOKS_BTN_NEEDLE =
  `<button type="button" class="secondary" data-char-delete style="min-height:30px;padding:4px 10px;flex-shrink:0">삭제</button>`;
const VENDOR_CHAR_TAB_CLEAR_LOOKS_BTN_PATCH =
  `<button type="button" class="secondary" data-char-clear-looks title="외형·옷·악세 비우기 (다음 태깅 시 재수집)" style="min-height:30px;padding:4px 10px;flex-shrink:0">✕</button>
            <button type="button" class="secondary" data-char-delete style="min-height:30px;padding:4px 10px;flex-shrink:0">삭제</button>`;

/** Job create: apply lorefilter whitelist before ca() / trigger keys. */
const VENDOR_LOREFILTER_BE_NEEDLE =
  `    const loreExtraMode = normalizeLoreExtraMode(a.lore_extra), r = re(a.include_max, 0, 20, 0), i = a.lorebook ? await la() : [], s = a.lorebook ? ca(i, n, 5, loreExtraMode) : [], loreTriggerKeys = a.lorebook ? collectTriggeredLoreKeys(i, n) : [], c = e.character || {};`;
const VENDOR_LOREFILTER_BE_PATCH =
  `    const loreExtraMode = normalizeLoreExtraMode(a.lore_extra), r = re(a.include_max, 0, 20, 0);
    let i = a.lorebook ? await la() : [];
    const c = e.character || {};
    if (a.lorebook && i.length) {
      try {
        const LF = globalThis.__INLAY_LORE_FILTER__, cid = String(e.characterId || c.id || "").trim();
        if (LF && typeof LF.filterLoreEntriesBySelected === "function" && cid) {
          const lfRes = await K("/v1/characters/lorefilter?character_id=" + encodeURIComponent(cid), { method: "GET" }, 12e3).catch(() => null);
          const sel = Array.isArray(lfRes?.selected) ? lfRes.selected : [];
          if (sel.length) i = LF.filterLoreEntriesBySelected(i, sel);
        }
      } catch (lfErr) {
        y("warn", "job.lorefilter", lfErr?.message || lfErr);
      }
    }
    const s = a.lorebook ? ca(i, n, 5, loreExtraMode) : [], loreTriggerKeys = a.lorebook ? collectTriggeredLoreKeys(i, n) : [];`;

/** Characters tab: compact lorefilter picker (mobile-safe). */
const VENDOR_LOREFILTER_TAB_VARS_NEEDLE =
  `I = Number(i.character_max ?? 6) || 6;
      u = \`
        \${sa(m)}
        <div class="notice info">별칭으로 메시지 매칭합니다.`;
const VENDOR_LOREFILTER_TAB_VARS_PATCH =
  `I = Number(i.character_max ?? 6) || 6;
      const _lf = t.lorefilterUi || { selected: [], catalog: [], open: !1, folded: !1 }, _lfSel = new Set(Array.isArray(_lf.selected) ? _lf.selected : []), _lfCat = Array.isArray(_lf.catalog) ? _lf.catalog : [];
      const _lfPicked = _lfCat.filter((row) => _lfSel.has(row.id));
      const _lfTrigPrev = (keys) => {
        const s = (Array.isArray(keys) ? keys : []).join(", ");
        if (!s) return "";
        return s.length <= 14 ? s : s.slice(0, 14) + "...";
      };
      const _lfSelectedHtml = (_lfPicked.length ? _lfPicked : Array.from(_lfSel).map((id) => ({ id, title: id, keys: [] }))).map((row) => {
        const trig = _lfTrigPrev(row.keys);
        return \`<span data-lorefilter-chip="\${h(row.id)}" style="display:inline-flex;align-items:stretch;max-width:100%;border-radius:999px;border:1px solid var(--border2);background:rgba(255,255,255,.04);overflow:hidden"><button type="button" data-lorefilter-peek="\${h(row.id)}" title="\${h(trig || row.title || row.id)}" style="appearance:none;border:0;background:transparent;color:inherit;font-size:12px;padding:6px 10px;min-height:36px;max-width:11rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;cursor:pointer">\${h(row.title || row.id)}</button><button type="button" data-lorefilter-remove="\${h(row.id)}" aria-label="삭제" title="선택에서 제거" style="appearance:none;border:0;border-left:1px solid var(--border2);background:rgba(248,113,113,.12);color:#fecaca;min-width:40px;min-height:36px;font-size:20px;line-height:1;cursor:pointer;flex-shrink:0">×</button></span>\`;
      }).join("") || '<span class="muted" style="font-size:12px">아직 없음 · 자동채우기 또는 추가로 고르세요</span>';
      const _lfAddHtml = _lfCat.filter((row) => !_lfSel.has(row.id)).map((row) => {
        const trig = _lfTrigPrev(row.keys);
        return \`<button type="button" data-lorefilter-add="\${h(row.id)}" style="display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;text-align:left;min-height:40px;padding:8px 10px;margin:0 0 4px;border-radius:10px;border:1px solid var(--border2);background:transparent;color:inherit;font-size:12px;cursor:pointer"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${h(row.title || row.id)}</span><span class="muted" style="flex:0 0 auto;font-size:11px;color:#8995aa;max-width:7.5rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${h(trig)}</span></button>\`;
      }).join("") || '<div class="muted" style="font-size:12px;padding:6px 0">추가할 로어 없음</div>';
      const _lfPeek = t.lorefilterPeek && typeof t.lorefilterPeek === "object" ? t.lorefilterPeek : null;
      const _lfPeekHtml = _lfPeek ? \`
        <div id="nx-lorefilter-peek" style="position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box">
          <div role="dialog" aria-modal="true" style="width:min(520px,100%);max-height:min(80vh,640px);overflow:auto;-webkit-overflow-scrolling:touch;background:#0b0f18;border:1px solid var(--border);border-radius:14px;padding:14px;box-sizing:border-box">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px">
              <strong style="font-size:14px">로어 보기</strong>
              <button type="button" class="secondary" id="nx-lorefilter-peek-close" style="min-height:32px;padding:4px 10px">닫기</button>
            </div>
            <label style="display:grid;gap:4px;margin-bottom:10px"><span class="muted" style="font-size:11px">제목</span><textarea readonly rows="1" style="width:100%;resize:none;font:12px/1.4 Segoe UI,sans-serif;padding:8px 10px;border-radius:10px;border:1px solid var(--border2);background:rgba(0,0,0,.25);color:var(--text)">\${h(_lfPeek.title || "")}</textarea></label>
            <label style="display:grid;gap:4px;margin-bottom:10px"><span class="muted" style="font-size:11px">트리거</span><textarea readonly rows="2" style="width:100%;resize:vertical;min-height:48px;font:12px/1.4 Segoe UI,sans-serif;padding:8px 10px;border-radius:10px;border:1px solid var(--border2);background:rgba(0,0,0,.25);color:var(--text)">\${h(Array.isArray(_lfPeek.keys) ? _lfPeek.keys.join(", ") : String(_lfPeek.keys || ""))}</textarea></label>
            <label style="display:grid;gap:4px;margin-bottom:12px"><span class="muted" style="font-size:11px">내용</span><textarea readonly rows="10" style="width:100%;resize:vertical;min-height:140px;font:12px/1.45 Consolas,Segoe UI,monospace;padding:8px 10px;border-radius:10px;border:1px solid var(--border2);background:rgba(0,0,0,.25);color:var(--text)">\${h(_lfPeek.content || "")}</textarea></label>
            <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end">
              <button type="button" class="secondary" id="nx-lorefilter-peek-remove" data-lorefilter-remove="\${h(_lfPeek.id || "")}" style="min-height:36px;padding:6px 12px;color:#fecaca">선택에서 제거</button>
              <button type="button" class="secondary" id="nx-lorefilter-peek-close2" style="min-height:36px;padding:6px 12px">닫기</button>
            </div>
          </div>
        </div>\` : "";
      const LfHtml = \`
        <details class="card" id="nx-lorefilter" \${_lf.folded ? "" : "open"} style="margin-top:10px;padding:0">
          <summary style="cursor:pointer;list-style:none;padding:10px;display:flex;flex-wrap:wrap;align-items:center;gap:8px">
            <div style="min-width:0;flex:0 1 auto">
              <div class="prompt-title" style="font-size:13px">캐릭터 로어북</div>
              <div class="muted" style="font-size:11px;margin-top:2px;line-height:1.35">\${_lfSel.size}개 선택 · 태거·에셋만</div>
            </div>
            <div id="nx-lorefilter-hover" class="muted" style="flex:1 1 100px;min-width:72px;font-size:11px;color:#8995aa;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.35"></div>
            <div data-lorefilter-actions style="display:flex;flex-wrap:wrap;gap:6px;flex:0 0 auto">
              <button type="button" class="secondary" id="nx-lorefilter-toggle-add" style="min-height:32px;padding:4px 10px">\${_lf.open ? "닫기" : "추가"}</button>
              <button type="button" class="secondary" id="nx-lorefilter-rescan" style="min-height:32px;padding:4px 10px">자동채우기</button>
            </div>
            <span class="muted" style="font-size:11px;flex:0 0 auto">접기/펼치기</span>
          </summary>
          <div style="padding:0 10px 10px">
            <div style="display:flex;flex-wrap:wrap;gap:6px;max-height:9.5rem;overflow:auto;-webkit-overflow-scrolling:touch">\${_lfSelectedHtml}</div>
            <div id="nx-lorefilter-catalog" style="display:\${_lf.open ? "block" : "none"};margin-top:8px;max-height:11rem;overflow:auto;-webkit-overflow-scrolling:touch;padding-right:2px">\${_lfAddHtml}</div>
          </div>
        </details>\${_lfPeekHtml}\`;
      u = \`
        \${sa(m)}
        <div class="notice info">별칭으로 메시지 매칭합니다.`;

const VENDOR_LOREFILTER_TAB_INSERT_NEEDLE =
  `오토태그는 버튼 더블클릭(파일) 또는 클릭 후 Ctrl+V.</div>
        <div class="prompt-group-label">이번 샷 (최근 카드)</div>`;
const VENDOR_LOREFILTER_TAB_INSERT_PATCH =
  `오토태그는 버튼 더블클릭(파일) 또는 클릭 후 Ctrl+V.</div>
        \${LfHtml}
        <div class="prompt-group-label">이번 샷 (최근 카드)</div>`;

const VENDOR_LOREFILTER_TAB_EVT_NEEDLE =
  `    }), document.getElementById("nx-char-add-session")?.addEventListener("click", async () => {`;
const VENDOR_LOREFILTER_TAB_EVT_PATCH =
  `    }), (() => {
      const lfRoot = document.getElementById("nx-lorefilter");
      const lfKeepScroll = () => {
        let p = lfRoot && lfRoot.parentElement;
        while (p && p !== document.body) {
          try {
            const st = getComputedStyle(p);
            if ((st.overflowY === "auto" || st.overflowY === "scroll") && p.scrollHeight > p.clientHeight + 4) {
              return { el: p, y: p.scrollTop };
            }
          } catch {
          }
          p = p.parentElement;
        }
        const el = document.scrollingElement || document.documentElement;
        return { el, y: Number(el && el.scrollTop) || 0 };
      };
      const lfRestoreScroll = (s) => {
        if (!s || !s.el) return;
        const y = s.y;
        const apply = () => {
          try {
            s.el.scrollTop = y;
          } catch {
          }
        };
        apply();
        requestAnimationFrame(apply);
        setTimeout(apply, 0);
      };
      const lfRepaint = async () => {
        const s = lfKeepScroll();
        await P();
        lfRestoreScroll(s);
      };
      const lfRowById = (id) => (Array.isArray(t.lorefilterUi?.catalog) ? t.lorefilterUi.catalog : []).find((r) => r && r.id === id) || { id, title: id, keys: [], content: "" };
      lfRoot?.addEventListener("toggle", () => {
        t.lorefilterUi = { ...(t.lorefilterUi || {}), folded: !lfRoot.open };
      });
      document.querySelectorAll("[data-lorefilter-actions]").forEach((box) => {
        box.addEventListener("click", (ev) => ev.stopPropagation());
      });
      document.getElementById("nx-lorefilter-toggle-add")?.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        t.lorefilterUi = { ...(t.lorefilterUi || {}), open: !(t.lorefilterUi && t.lorefilterUi.open), folded: !1 };
        await lfRepaint();
      });
      document.getElementById("nx-lorefilter-rescan")?.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        try {
          const scope = t.lastScope || await Z().catch(() => null);
          const cid = String(scope?.characterId || "").trim();
          if (!cid) throw new Error("캐릭터를 먼저 선택하세요");
          const lore = await la().catch(() => []);
          const res = await K("/v1/characters/lorefilter", { method: "POST", body: { character_id: cid, rescan: !0, lorebook: lore } }, 12e4);
          const LF = globalThis.__INLAY_LORE_FILTER__;
          const catalog = Array.isArray(res?.catalog) && res.catalog.length ? res.catalog : (LF?.buildLoreCatalog ? LF.buildLoreCatalog(lore) : []);
          t.lorefilterUi = { selected: Array.isArray(res?.selected) ? res.selected : [], catalog, open: !1, folded: !1, character_id: cid };
          t.uiMessage = { type: "success", text: "캐릭터 로어 " + (t.lorefilterUi.selected || []).length + "개 채움" };
          await lfRepaint();
        } catch (err) {
          t.uiMessage = { type: "error", text: z(err?.message || err) };
          await lfRepaint();
        }
      });
      const lfHover = document.getElementById("nx-lorefilter-hover");
      document.querySelectorAll("[data-lorefilter-chip]").forEach((chip) => {
        chip.addEventListener("pointerenter", () => {
          if (!lfHover) return;
          const id = chip.getAttribute("data-lorefilter-chip") || "";
          const row = lfRowById(id);
          const keys = Array.isArray(row.keys) ? row.keys.join(", ") : "";
          lfHover.textContent = keys || String(row.title || id || "");
        });
        chip.addEventListener("pointerleave", () => {
          if (lfHover) lfHover.textContent = "";
        });
      });
      document.querySelectorAll("[data-lorefilter-peek]").forEach((btn) => {
        btn.addEventListener("click", async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const id = btn.getAttribute("data-lorefilter-peek") || "";
          if (!id) return;
          t.lorefilterPeek = lfRowById(id);
          await lfRepaint();
        });
      });
      const lfClosePeek = async (ev) => {
        ev?.preventDefault?.();
        t.lorefilterPeek = null;
        await lfRepaint();
      };
      document.getElementById("nx-lorefilter-peek-close")?.addEventListener("click", lfClosePeek);
      document.getElementById("nx-lorefilter-peek-close2")?.addEventListener("click", lfClosePeek);
      document.getElementById("nx-lorefilter-peek")?.addEventListener("click", (ev) => {
        if (ev.target === ev.currentTarget) lfClosePeek(ev);
      });
      const lfRemoveSelected = async (id) => {
        const scope = t.lastScope || await Z().catch(() => null);
        const cid = String(scope?.characterId || t.lorefilterUi?.character_id || "").trim();
        if (!cid || !id) return;
        const next = (Array.isArray(t.lorefilterUi?.selected) ? t.lorefilterUi.selected : []).filter((x) => x !== id);
        await K("/v1/characters/lorefilter", { method: "POST", body: { character_id: cid, selected: next } }, 15e3);
        t.lorefilterUi = { ...(t.lorefilterUi || {}), selected: next, character_id: cid };
        if (t.lorefilterPeek && t.lorefilterPeek.id === id) t.lorefilterPeek = null;
      };
      document.querySelectorAll("[data-lorefilter-remove]").forEach((btn) => {
        btn.addEventListener("click", async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const id = btn.getAttribute("data-lorefilter-remove") || "";
          try {
            await lfRemoveSelected(id);
            await lfRepaint();
          } catch (err) {
            t.uiMessage = { type: "error", text: z(err?.message || err) };
            await lfRepaint();
          }
        });
      });
      document.querySelectorAll("[data-lorefilter-add]").forEach((btn) => {
        btn.addEventListener("click", async (ev) => {
          ev.preventDefault();
          const id = btn.getAttribute("data-lorefilter-add") || "";
          const scope = t.lastScope || await Z().catch(() => null);
          const cid = String(scope?.characterId || t.lorefilterUi?.character_id || "").trim();
          if (!cid || !id) return;
          const cur = Array.isArray(t.lorefilterUi?.selected) ? t.lorefilterUi.selected : [];
          if (cur.includes(id)) return;
          const next = cur.concat([id]);
          try {
            await K("/v1/characters/lorefilter", { method: "POST", body: { character_id: cid, selected: next } }, 15e3);
            t.lorefilterUi = { ...(t.lorefilterUi || {}), selected: next, character_id: cid };
            await lfRepaint();
          } catch (err) {
            t.uiMessage = { type: "error", text: z(err?.message || err) };
            await lfRepaint();
          }
        });
      });
    })(), document.getElementById("nx-char-add-session")?.addEventListener("click", async () => {`;

const VENDOR_LOREFILTER_TAB_LOAD_NEEDLE =
  `    })), t.uiTab === "characters" && !t._charsBgRefresh) {`;
const VENDOR_LOREFILTER_TAB_LOAD_PATCH =
  `    })), t.uiTab === "characters" && !t._lorefilterLoading && (() => {
      const lfCid = String((t.lastScope && t.lastScope.characterId) || "").trim();
      if (lfCid && t.lorefilterUi?.character_id !== lfCid) {
        t._lorefilterLoading = !0;
        (async () => {
          try {
            const lore = await la().catch(() => []);
            const LF = globalThis.__INLAY_LORE_FILTER__;
            const localCat = LF?.buildLoreCatalog ? LF.buildLoreCatalog(lore) : [];
            let res = await K("/v1/characters/lorefilter?character_id=" + encodeURIComponent(lfCid), { method: "GET" }, 15e3).catch(() => null);
            if (!(Array.isArray(res?.selected) && res.selected.length) && localCat.length) {
              res = await K("/v1/characters/lorefilter", { method: "POST", body: { character_id: lfCid, rescan: !0, lorebook: lore } }, 12e4).catch(() => res);
            }
            if (!t.uiOpen || t.uiTab !== "characters") return;
            t.lorefilterUi = {
              selected: Array.isArray(res?.selected) ? res.selected : [],
              catalog: Array.isArray(res?.catalog) && res.catalog.length ? res.catalog : localCat,
              open: !!(t.lorefilterUi && t.lorefilterUi.open),
              folded: !!(t.lorefilterUi && t.lorefilterUi.folded),
              character_id: lfCid
            };
            await P();
          } catch {
          } finally {
            t._lorefilterLoading = !1;
          }
        })();
      }
      return !0;
    })(), t.uiTab === "characters" && !t._charsBgRefresh) {`;

const VENDOR_CHAR_TAB_CLEAR_LOOKS_EVT_NEEDLE =
  `    }), document.querySelectorAll("[data-char-delete]").forEach((a) => {`;
const VENDOR_CHAR_TAB_CLEAR_LOOKS_EVT_PATCH =
  `    }), document.querySelectorAll("[data-char-clear-looks]").forEach((a) => {
      const r = (i) => {
        i.preventDefault(), i.stopPropagation();
      };
      a.addEventListener("pointerdown", r), a.addEventListener("mousedown", r), a.addEventListener("click", async (i) => {
        r(i);
        const s = a.closest("[data-char-scope]");
        if (!s) return;
        if (!confirm("외형·옷·악세사리를 비울까요?\\n캐릭터는 유지되고, 다음 태깅에서 다시 수집됩니다.")) return;
        const app = s.querySelector("[data-char-appearance]"), att = s.querySelector("[data-char-attire]"), acc = s.querySelector("[data-char-accessories]");
        if (app) app.value = "";
        if (att) att.value = "";
        if (acc) acc.value = "";
        t._charsDirty = !0;
        try {
          t.charactersSession = oe("session"), t.charactersGlobal = oe("global");
        } catch {
        }
        try {
          const scope = await Z().catch(() => null);
          const body = withRootSessions({
            session_id: scope?.sessionId || "",
            character_id: scope?.characterId || "",
            unified_session_id: scope?.unifiedSessionId || ""
          }, scope);
          const c = s.getAttribute("data-char-scope");
          if (c === "session") body.characters = t.charactersSession || [];
          else body.global = t.charactersGlobal || [];
          const res = await K("/v1/characters", {
            method: "POST",
            body
          }, 15e3);
          if (Array.isArray(res?.characters)) t.charactersSession = res.characters;
          if (Array.isArray(res?.global)) t.charactersGlobal = res.global;
          t._charsDirty = !1;
          t.uiMessage = {
            type: "success",
            text: "외형 비움·저장됨 · 다음 태깅 시 재수집"
          };
          await P();
        } catch (err) {
          t.uiMessage = {
            type: "error",
            text: \`비우기 저장 실패: \${z(err?.message || err)}\`
          };
        }
      });
    }), document.querySelectorAll("[data-nx-costume-bar]").forEach((bar) => {
      if (bar.dataset.nxCostumeBound) return;
      bar.dataset.nxCostumeBound = "1";
      const root = bar.closest("[data-char-scope]") || bar;
      const sel = () => root.querySelector("[data-char-costume]");
      const realOpts = () => [...(sel()?.options || [])].filter((o) => o.value !== "__add__");
      const reindex = () => {
        realOpts().forEach((o, idx) => {
          const name = o.getAttribute("data-name") || ("costume" + idx);
          const note = o.getAttribute("data-note") || "";
          o.value = String(idx);
          o.textContent = name + "[" + idx + "]" + (note ? " · " + note : "");
        });
      };
      const load = () => {
        const s = sel(), o = s?.options?.[s.selectedIndex];
        if (!o || o.value === "__add__") return;
        const nameEl = root.querySelector("[data-char-costume-name]"), noteEl = root.querySelector("[data-char-costume-note]");
        const att = root.querySelector("[data-char-attire]"), acc = root.querySelector("[data-char-accessories]");
        if (nameEl) nameEl.value = o.getAttribute("data-name") || "";
        if (noteEl) noteEl.value = o.getAttribute("data-note") || "";
        if (att) att.value = o.getAttribute("data-attire") || "";
        if (acc) acc.value = o.getAttribute("data-accessories") || "";
      };
      const commitSlot = () => {
        const s = sel(), o = s?.options?.[s.selectedIndex];
        if (!o || o.value === "__add__") return false;
        const name = String(root.querySelector("[data-char-costume-name]")?.value || "").trim() || ("costume" + o.value);
        const note = String(root.querySelector("[data-char-costume-note]")?.value || "").trim();
        const attire = root.querySelector("[data-char-attire]")?.value || "";
        const accessories = root.querySelector("[data-char-accessories]")?.value || "";
        o.setAttribute("data-name", name);
        o.setAttribute("data-note", note);
        o.setAttribute("data-attire", attire);
        o.setAttribute("data-accessories", accessories);
        o.textContent = name + "[" + o.value + "]" + (note ? " · " + note : "");
        return true;
      };
      sel()?.addEventListener("change", () => {
        const s = sel();
        if (!s) return;
        if (s.value === "__add__") {
          const n = realOpts().length;
          const o = document.createElement("option");
          o.value = String(n);
          o.setAttribute("data-name", "costume" + n);
          o.setAttribute("data-note", "");
          o.setAttribute("data-attire", "");
          o.setAttribute("data-accessories", "");
          o.textContent = "costume" + n + "[" + n + "]";
          s.appendChild(o);
          s.value = String(n);
          const att = root.querySelector("[data-char-attire]"), acc = root.querySelector("[data-char-accessories]");
          if (att) att.value = "";
          if (acc) acc.value = "";
          const nameEl = root.querySelector("[data-char-costume-name]"), noteEl = root.querySelector("[data-char-costume-note]");
          if (nameEl) nameEl.value = "costume" + n;
          if (noteEl) noteEl.value = "";
          t._charsDirty = !0;
          return;
        }
        load();
      });
      root.querySelector("[data-char-costume-slot-save]")?.addEventListener("click", (ev) => {
        ev.preventDefault(), commitSlot(), t._charsDirty = !0;
      });
      root.querySelector("[data-char-costume-delete]")?.addEventListener("click", (ev) => {
        ev.preventDefault();
        const s = sel();
        if (!s || s.value === "__add__") return;
        if (realOpts().length <= 1) {
          t.uiMessage = { type: "error", text: "코스튬은 최소 1개 필요합니다" };
          return;
        }
        s.options[s.selectedIndex]?.remove();
        reindex();
        s.value = "0";
        load();
        root.dataset.promoteCostumeDefault = "";
        t._charsDirty = !0;
      });
      root.querySelector("[data-char-costume-default]")?.addEventListener("click", (ev) => {
        ev.preventDefault();
        commitSlot();
        const s = sel(), o = s?.options?.[s.selectedIndex];
        if (!o || o.value === "__add__") return;
        const addOpt = [...s.options].find((x) => x.value === "__add__");
        o.remove();
        if (addOpt) s.insertBefore(o, addOpt.nextSibling);
        else s.insertBefore(o, s.firstChild);
        o.setAttribute("data-name", "default");
        reindex();
        s.value = "0";
        root.dataset.promoteCostumeDefault = "";
        const nameEl = root.querySelector("[data-char-costume-name]");
        if (nameEl) nameEl.value = "default";
        ev.target && (ev.target.textContent = "기본값 표시됨");
        load();
        t._charsDirty = !0;
      });
    }), document.querySelectorAll("[data-char-delete]").forEach((a) => {`;

const VENDOR_CHAR_EDIT_LOCK_PRESET_NEEDLE =
  `attireLockedEl && (attireLockedEl.checked = !!I.attire_locked), accLockedEl && (accLockedEl.checked = !!I.accessories_locked)`;
const VENDOR_CHAR_EDIT_LOCK_PRESET_PATCH =
  `attireLockedEl && (attireLockedEl.checked = I.attire_locked !== false), accLockedEl && (accLockedEl.checked = I.accessories_locked !== false), (() => {
      const gRaw = String(I.gender || I.sex || "").toLowerCase();
      const gNorm = gRaw === "female" || gRaw === "girl" ? "girl" : gRaw === "male" || gRaw === "boy" ? "boy" : gRaw === "other" ? "other" : "";
      if (genderEl) genderEl.value = gNorm;
      n.gender = gNorm;
      {
        const VC = globalThis.__INLAY_VIEWER_CORE__;
        if (p && gNorm && typeof VC?.syncGenderIntoAppearance == "function") p.value = VC.syncGenderIntoAppearance(p.value, gNorm);
      }
      const list = Array.isArray(I.costumes) && I.costumes.length ? I.costumes : [{
        name: "default",
        note: "",
        attire: I.attire || "",
        accessories: I.accessories || ""
      }];
      let active = Math.max(0, Math.min(list.length - 1, Number(I.active_costume || 0) || 0));
      n.costumes = list;
      n.active_costume = active;
      const costumeSel = i.querySelector("[data-ce-costume]");
      if (costumeSel) {
        const addOpt = [...costumeSel.options].find((o) => o.value === "__add__");
        [...costumeSel.options].filter((o) => o.value !== "__add__").forEach((o) => o.remove());
        list.forEach((slot, idx) => {
          const o = document.createElement("option");
          const name = String(slot?.name || (idx === 0 ? "default" : "costume" + idx));
          const note = String(slot?.note || "");
          const attire = String(slot?.attire || "");
          const accessories = String(slot?.accessories || "");
          o.value = String(idx);
          o.setAttribute("data-name", name);
          o.setAttribute("data-note", note);
          o.setAttribute("data-attire", attire);
          o.setAttribute("data-accessories", accessories);
          o.textContent = name + "[" + idx + "]" + (note ? " · " + note : "");
          if (addOpt) costumeSel.insertBefore(o, addOpt);
          else costumeSel.appendChild(o);
        });
        costumeSel.value = String(active);
        const activeSlot = list[active] || list[0];
        const nameElC = i.querySelector("[data-ce-costume-name]");
        const noteElC = i.querySelector("[data-ce-costume-note]");
        if (nameElC) nameElC.value = String(activeSlot?.name || "default");
        if (noteElC) noteElC.value = String(activeSlot?.note || "");
        if (m) m.value = w(activeSlot?.attire || I.attire || "", 4e3);
        if (accEl) accEl.value = w(activeSlot?.accessories || I.accessories || "", 4e3);
      }
      i.dataset.promoteCostumeDefault = "";
      const fromId = String(I.id || ""), toId = String(n.id || "");
      if (fromId && toId && fromId !== toId && I.ref_configured) {
        K("/v1/characters/ref", {
          method: "POST",
          body: {
            character_id: toId,
            copy_from: fromId
          }
        }, 15e3).then((res) => {
          const prev = i.querySelector("[data-ce-ref-preview]"), st = i.querySelector("[data-ce-ref-status]");
          if (prev) prev.innerHTML = res?.preview_url ? \`<img src="\${res.preview_url}" alt="" style="width:100%;height:100%;object-fit:cover">\` : "";
          if (st) st.textContent = res?.configured ? "설정됨" : "없음";
          n.ref_preview_url = res?.preview_url || "";
          n.ref_configured = !!res?.configured;
        }).catch(() => {
        });
      }
    })()`;

const VENDOR_CHAR_CREATE_LOCK_PRESET_NEEDLE =
  `attireLockedEl && (attireLockedEl.checked = !!I.attire_locked);
      accLockedEl && (accLockedEl.checked = !!I.accessories_locked);`;
const VENDOR_CHAR_CREATE_LOCK_PRESET_PATCH =
  `attireLockedEl && (attireLockedEl.checked = I.attire_locked !== false);
      accLockedEl && (accLockedEl.checked = I.accessories_locked !== false);
      {
        const gRaw = String(I.gender || I.sex || "").toLowerCase();
        const gNorm = gRaw === "female" || gRaw === "girl" ? "girl" : gRaw === "male" || gRaw === "boy" ? "boy" : gRaw === "other" ? "other" : "";
        if (genderEl) genderEl.value = gNorm;
        const VC = globalThis.__INLAY_VIEWER_CORE__;
        if (appearanceEl && gNorm && typeof VC?.syncGenderIntoAppearance == "function") appearanceEl.value = VC.syncGenderIntoAppearance(appearanceEl.value, gNorm);
      }`;

/** Dashboard: char NAI ref mode + strength/fidelity beside hover corner. */
const VENDOR_CHAR_REF_DASH_HTML_NEEDLE =
  `            <label data-nx-help-id="nx-hover-corner"><span>이미지 모서리</span>
              <select id="nx-hover-corner">
                <option value="top-right" \${i.hover_preview_corner === "top-right" ? "selected" : ""}>우상단</option>
                <option value="bottom-right" \${(i.hover_preview_corner || "bottom-right") === "bottom-right" ? "selected" : ""}>우하단</option>
                <option value="top-left" \${i.hover_preview_corner === "top-left" ? "selected" : ""}>좌상단</option>
                <option value="bottom-left" \${i.hover_preview_corner === "bottom-left" ? "selected" : ""}>좌하단</option>
              </select>
            </label>`;
const VENDOR_CHAR_REF_DASH_HTML_PATCH =
  `            <label data-nx-help-id="nx-hover-corner"><span>이미지 모서리</span>
              <select id="nx-hover-corner">
                <option value="top-right" \${i.hover_preview_corner === "top-right" ? "selected" : ""}>우상단</option>
                <option value="bottom-right" \${(i.hover_preview_corner || "bottom-right") === "bottom-right" ? "selected" : ""}>우하단</option>
                <option value="top-left" \${i.hover_preview_corner === "top-left" ? "selected" : ""}>좌상단</option>
                <option value="bottom-left" \${i.hover_preview_corner === "bottom-left" ? "selected" : ""}>좌하단</option>
              </select>
            </label>
            <label data-nx-help-id="nx-char-ref-mode" class="wide"><span>캐릭터 참고이미지</span>
              <select id="nx-char-ref-mode">
                <option value="off" \${(i.char_ref_mode || "off") === "off" ? "selected" : ""}>끄기</option>
                <option value="vibe" \${i.char_ref_mode === "vibe" ? "selected" : ""}>NAI vibe transfer</option>
                <option value="image" \${i.char_ref_mode === "image" ? "selected" : ""}>NAI image reference (anlas 많이 소모)</option>
              </select>
            </label>
            <label data-nx-help-id="nx-char-ref-strength"><span>참고 Strength</span>
              <input id="nx-char-ref-strength" type="number" min="0.01" max="1" step="0.01" value="\${h(i.char_ref_strength ?? 0.6)}">
            </label>
            <label data-nx-help-id="nx-char-ref-fidelity"><span>참고 Fidelity</span>
              <input id="nx-char-ref-fidelity" type="number" min="0.01" max="1" step="0.01" value="\${h(i.char_ref_fidelity ?? 1)}">
            </label>
            <label data-nx-help-id="nx-char-ref-image-type"><span>참고 Image 종류</span>
              <select id="nx-char-ref-image-type">
                <option value="character" \${i.char_ref_image_type === "character" ? "selected" : ""}>character</option>
                <option value="character&style" \${(i.char_ref_image_type || "character&style") === "character&style" ? "selected" : ""}>character & style</option>
                <option value="style" \${i.char_ref_image_type === "style" ? "selected" : ""}>style</option>
              </select>
            </label>`;

const VENDOR_CHAR_REF_DASH_SAVE_NEEDLE =
  `      hover_preview_corner: Ut(N("nx-hover-corner")),
      viewer_minimize_mode: N("nx-minimize-mode") === "toolbar" ? "toolbar" : "icon"`;
const VENDOR_CHAR_REF_DASH_SAVE_PATCH =
  `      hover_preview_corner: Ut(N("nx-hover-corner")),
      char_ref_mode: (() => {
        const v = String(N("nx-char-ref-mode") || "").toLowerCase();
        if (v === "vibe" || v === "image" || v === "off") return v;
        const b = String(t.backendSettings?.card?.char_ref_mode || "off").toLowerCase();
        return b === "vibe" || b === "image" ? b : "off";
      })(),
      char_ref_strength: Math.max(0.01, Math.min(1, Number(N("nx-char-ref-strength") || t.backendSettings?.card?.char_ref_strength || 0.6) || 0.6)),
      char_ref_fidelity: Math.max(0.01, Math.min(1, Number(N("nx-char-ref-fidelity") || t.backendSettings?.card?.char_ref_fidelity || 1) || 1)),
      char_ref_image_type: (() => {
        const v = N("nx-char-ref-image-type");
        if (v === "character" || v === "style" || v === "character&style") return v;
        const b = String(t.backendSettings?.card?.char_ref_image_type || "character&style");
        return b === "character" || b === "style" || b === "character&style" ? b : "character&style";
      })(),
      viewer_minimize_mode: N("nx-minimize-mode") === "toolbar" ? "toolbar" : "icon"`;

const VENDOR_CHAR_REF_HELP_NEEDLE =
  `    "nx-hover-corner": { title: "이미지 모서리", body: "모바일 모서리 고정이 켜져 있을 때 상시 이미지를 붙일 모서리(우상·우하·좌상·좌하)를 고릅니다. 스티키 핀은 그 이미지 상단 중앙에 따라갑니다." },`;
const VENDOR_CHAR_REF_HELP_PATCH =
  `    "nx-hover-corner": { title: "이미지 모서리", body: "모바일 모서리 고정이 켜져 있을 때 상시 이미지를 붙일 모서리(우상·우하·좌상·좌하)를 고릅니다. 스티키 핀은 그 이미지 상단 중앙에 따라갑니다." },
    "nx-char-ref-mode": { title: "캐릭터 참고이미지", body: "캐릭터 탭/수정에 올린 참고이미지를 샷 생성에 넣습니다. vibe는 Anlas가 적고, image reference는 더 강하지만 Anlas를 많이 씁니다. 끄면 참고이미지를 보관만 합니다." },
    "nx-char-ref-strength": { title: "참고 Strength", body: "캐릭터 참고이미지 영향 강도(0.01~1)." },
    "nx-char-ref-fidelity": { title: "참고 Fidelity", body: "vibe면 information_extracted, image면 Reference Fidelity(0.01~1)." },
    "nx-char-ref-image-type": { title: "참고 Image 종류", body: "image reference 모드일 때만 사용. character / character & style / style." },`;

/** Edit popup: hide regenerate button UI; put 참고이미지 in that slot (handlers kept). */
const VENDOR_CHAR_REF_EDIT_HTML_NEEDLE =
  `      '<button type="button" data-ce-regenerate style="cursor:pointer;border:1px solid rgba(124,108,255,.7);background:rgba(124,108,255,.2);color:#ddd6fe;padding:7px 12px;border-radius:9px;font:700 12px Segoe UI,sans-serif">관련 이미지 재생성</button>',`;
const VENDOR_CHAR_REF_EDIT_HTML_PATCH =
  `      '<button type="button" data-ce-regenerate style="display:none">관련 이미지 재생성</button>',
      '<button type="button" data-ce-ref style="cursor:pointer;border:1px solid rgba(124,108,255,.7);background:rgba(124,108,255,.2);color:#ddd6fe;padding:7px 12px;border-radius:9px;font:700 12px Segoe UI,sans-serif">참고이미지</button>',
      '<button type="button" data-ce-ref-clear style="cursor:pointer;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#d7deea;padding:7px 12px;border-radius:9px;font:700 12px Segoe UI,sans-serif">제거</button>',
      '<div data-ce-ref-preview style="width:42px;height:42px;border-radius:8px;overflow:hidden;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);flex-shrink:0">' + (n.ref_preview_url ? '<img src="' + h(n.ref_preview_url) + '" alt="" style="width:100%;height:100%;object-fit:cover">' : '') + '</div>',
      '<span data-ce-ref-status style="color:#9aa6b8;font-size:11px">' + (n.ref_configured || n.ref_preview_url ? "설정됨" : "없음") + '</span>',`;

/** Character tab: bind 참고이미지 upload / clear / paste (webp as-is). */
const VENDOR_CHAR_REF_TAB_EVT_NEEDLE =
  `      l && await Tt(l, i);
    }));
  }

  async function blockHostChrome(e) {`;
const VENDOR_CHAR_REF_TAB_EVT_PATCH =
  `      l && await Tt(l, i);
    })), document.querySelectorAll("[data-char-ref]").forEach((a) => {
      const stop = (i) => {
        i.preventDefault(), i.stopPropagation();
      };
      const paint = (card, url, ok) => {
        const prev = card.querySelector("[data-char-ref-preview]"), st = card.querySelector("[data-char-ref-status]");
        if (prev) prev.innerHTML = url ? \`<img src="\${url}" alt="" style="width:100%;height:100%;object-fit:cover">\` : "";
        if (st) st.textContent = ok ? "설정됨" : "없음";
      };
      const upload = async (card, file) => {
        const id = card.getAttribute("data-char-id") || "";
        if (!id || !file) return;
        const st = card.querySelector("[data-char-ref-status]");
        if (st) st.textContent = "업로드…";
        try {
          const res = await K("/v1/characters/ref", {
            method: "POST",
            body: {
              character_id: id,
              image_b64: await It(file)
            }
          }, 6e4);
          paint(card, res?.preview_url || "", !!res?.configured);
          for (const list of [t.charactersSession, t.charactersGlobal]) {
            const hit = (list || []).find((c) => String(c.id || "") === id || String(c.name || "") === id);
            if (hit) hit.ref_configured = !!res?.configured, hit.ref_preview_url = res?.preview_url || "";
          }
        } catch {
          if (st) st.textContent = "실패";
        }
      };
      a.addEventListener("pointerdown", stop), a.addEventListener("mousedown", stop), a.addEventListener("click", (i) => {
        stop(i);
        const card = a.closest("[data-char-scope]");
        if (!card) return;
        if (t.charRefFocus && t.charRefFocus.scope === card.getAttribute("data-char-scope") && t.charRefFocus.id === (card.getAttribute("data-char-id") || "")) {
          t.charRefFocus = null, a.classList.remove("armed"), a.textContent = "참고이미지";
          return;
        }
        vt(), t.autotagFocus = null, t.charRefFocus = {
          scope: card.getAttribute("data-char-scope"),
          id: card.getAttribute("data-char-id") || ""
        }, document.querySelectorAll("[data-char-ref].armed").forEach((b) => {
          b.classList.remove("armed"), b.textContent = "참고이미지";
        }), a.classList.add("armed"), a.textContent = "붙여넣기 대기";
      }), a.addEventListener("dblclick", (i) => {
        stop(i);
        const card = a.closest("[data-char-scope]");
        if (!card) return;
        const inp = document.createElement("input");
        inp.type = "file", inp.accept = "image/*,.webp", inp.style.display = "none", document.body.appendChild(inp), inp.addEventListener("change", async () => {
          const f = inp.files?.[0];
          inp.remove(), f && await upload(card, f);
        }), inp.click();
      });
    }), document.querySelectorAll("[data-char-ref-clear]").forEach((a) => {
      const stop = (i) => {
        i.preventDefault(), i.stopPropagation();
      };
      a.addEventListener("pointerdown", stop), a.addEventListener("mousedown", stop), a.addEventListener("click", async (i) => {
        stop(i);
        const card = a.closest("[data-char-scope]");
        if (!card) return;
        const id = card.getAttribute("data-char-id") || "";
        if (!id) return;
        try {
          await K("/v1/characters/ref/clear", {
            method: "POST",
            body: {
              character_id: id
            }
          }, 15e3);
          const prev = card.querySelector("[data-char-ref-preview]"), st = card.querySelector("[data-char-ref-status]");
          if (prev) prev.innerHTML = "";
          if (st) st.textContent = "없음";
          for (const list of [t.charactersSession, t.charactersGlobal]) {
            const hit = (list || []).find((c) => String(c.id || "") === id || String(c.name || "") === id);
            if (hit) hit.ref_configured = !1, hit.ref_preview_url = "";
          }
        } catch {
        }
      });
    }), t._charRefPasteBound || (t._charRefPasteBound = !0, window.addEventListener("paste", async (a) => {
      if (!t.charRefFocus) return;
      const r = Array.from(a.clipboardData?.items || []).find((p) => p.type.startsWith("image/"));
      if (!r) return;
      if (t.charRefFocus.scope === "modal" && t.charRefFocus.id === "char-edit") {
        const run = t.charEditUi?.uploadRef;
        if (typeof run != "function") return;
        a.preventDefault();
        const file = r.getAsFile();
        file && await run(file);
        return;
      }
      if (!t.uiOpen || t.uiTab !== "characters") return;
      a.preventDefault();
      const file = r.getAsFile();
      if (!file) return;
      const s = String(t.charRefFocus.scope || ""), c = String(t.charRefFocus.id || ""), card = Array.from(document.querySelectorAll("[data-char-scope]")).find((p) => p.getAttribute("data-char-scope") === s && p.getAttribute("data-char-id") === c);
      if (!card) return;
      const id = card.getAttribute("data-char-id") || "";
      if (!id) return;
      const st = card.querySelector("[data-char-ref-status]");
      if (st) st.textContent = "업로드…";
      try {
        const res = await K("/v1/characters/ref", {
          method: "POST",
          body: {
            character_id: id,
            image_b64: await It(file)
          }
        }, 6e4);
        const prev = card.querySelector("[data-char-ref-preview]");
        if (prev) prev.innerHTML = res?.preview_url ? \`<img src="\${res.preview_url}" alt="" style="width:100%;height:100%;object-fit:cover">\` : "";
        if (st) st.textContent = res?.configured ? "설정됨" : "없음";
      } catch {
        if (st) st.textContent = "실패";
      }
    }));
  }

  async function blockHostChrome(e) {`;

/** Edit popup: 참고이미지 upload/clear + paste (regen handler stays, button hidden). */
const VENDOR_CHAR_REF_EDIT_EVT_NEEDLE =
  `    })(), i.querySelector("[data-ce-regenerate]")?.addEventListener("click", async (f) => {
      f.preventDefault(), f.stopPropagation();
      const x = t.selectedMessage, I = await Z({ useOverride: !1 }).catch(() => null);
      if (!x) return E("재생성할 메시지를 먼저 선택하세요");
      try {
        const targets = messageCardsByY(x);
        E("관련 이미지 재생성 중…"), await withImageRerollToast(\`관련 이미지 재생성 중… (0/\${targets.length || "?"})\`, async (report) => {
          const result = await rerollMessageImagesLive(x, { scope: I, report });
          if (Array.isArray(result.failed) && result.failed.length) E(\`관련 이미지 재생성 부분 실패 · 성공 \${result.count} / 실패 \${result.failed.length}\`);
          return result;
        }, { shotCount: Math.max(1, targets.length || 1) }), I?.sessionId && await ce(I.sessionId, !0), await he(), t.galleryUi?.renderGal && await t.galleryUi.renderGal(), E("관련 이미지 재생성 완료");
      } catch (R) {
        E(\`재생성 실패: \${z(R?.message || R, 80)}\`);
      }
    }), i.querySelector("[data-ce-card]")?.addEventListener("click", (f) => f.stopPropagation()), i.querySelector("[data-ce-form]")?.addEventListener("submit", (f) => {`;
const VENDOR_CHAR_REF_EDIT_EVT_PATCH =
  `    })(), i.querySelector("[data-ce-regenerate]")?.addEventListener("click", async (f) => {
      f.preventDefault(), f.stopPropagation();
      const x = t.selectedMessage, I = await Z({ useOverride: !1 }).catch(() => null);
      if (!x) return E("재생성할 메시지를 먼저 선택하세요");
      try {
        const targets = messageCardsByY(x);
        E("관련 이미지 재생성 중…"), await withImageRerollToast(\`관련 이미지 재생성 중… (0/\${targets.length || "?"})\`, async (report) => {
          const result = await rerollMessageImagesLive(x, { scope: I, report });
          if (Array.isArray(result.failed) && result.failed.length) E(\`관련 이미지 재생성 부분 실패 · 성공 \${result.count} / 실패 \${result.failed.length}\`);
          return result;
        }, { shotCount: Math.max(1, targets.length || 1) }), I?.sessionId && await ce(I.sessionId, !0), await he(), t.galleryUi?.renderGal && await t.galleryUi.renderGal(), E("관련 이미지 재생성 완료");
      } catch (R) {
        E(\`재생성 실패: \${z(R?.message || R, 80)}\`);
      }
    }), (() => {
      const paintRef = (url, ok) => {
        const prev = i.querySelector("[data-ce-ref-preview]"), st = i.querySelector("[data-ce-ref-status]");
        if (prev) prev.innerHTML = url ? \`<img src="\${url}" alt="" style="width:100%;height:100%;object-fit:cover">\` : "";
        if (st) st.textContent = ok ? "설정됨" : "없음";
        n.ref_preview_url = url || "";
        n.ref_configured = !!ok;
      };
      const uploadRef = async (file) => {
        const id = String(n.id || "");
        if (!id || !file) return E("참고이미지: 캐릭터 id 없음");
        E("참고이미지 업로드…");
        try {
          const res = await K("/v1/characters/ref", {
            method: "POST",
            body: {
              character_id: id,
              image_b64: await It(file)
            }
          }, 6e4);
          paintRef(res?.preview_url || "", !!res?.configured), E(res?.configured ? "참고이미지 설정됨" : "참고이미지 실패");
        } catch (err) {
          E(\`참고이미지 실패: \${z(err?.message || err, 80)}\`);
        }
      };
      i.querySelector("[data-ce-ref]")?.addEventListener("click", (f) => {
        f.preventDefault(), f.stopPropagation();
        const on = t.charRefFocus?.scope === "modal" && t.charRefFocus?.id === "char-edit";
        if (on) {
          t.charRefFocus = null;
          const btn = i.querySelector("[data-ce-ref]");
          if (btn) btn.textContent = "참고이미지";
          return;
        }
        t.autotagFocus = null, t.charRefFocus = {
          scope: "modal",
          id: "char-edit"
        };
        const btn = i.querySelector("[data-ce-ref]");
        if (btn) btn.textContent = "붙여넣기 대기";
      }), i.querySelector("[data-ce-ref]")?.addEventListener("dblclick", (f) => {
        f.preventDefault(), f.stopPropagation();
        const inp = document.createElement("input");
        inp.type = "file", inp.accept = "image/*,.webp", inp.style.display = "none", document.body.appendChild(inp), inp.addEventListener("change", async () => {
          const file = inp.files?.[0];
          inp.remove(), file && await uploadRef(file);
        }), inp.click();
      }), i.querySelector("[data-ce-ref-clear]")?.addEventListener("click", async (f) => {
        f.preventDefault(), f.stopPropagation();
        const id = String(n.id || "");
        if (!id) return;
        try {
          await K("/v1/characters/ref/clear", {
            method: "POST",
            body: {
              character_id: id
            }
          }, 15e3), paintRef("", !1), E("참고이미지 제거됨");
        } catch (err) {
          E(\`제거 실패: \${z(err?.message || err, 80)}\`);
        }
      }), t._ceUploadRef = uploadRef;
    })(), i.querySelector("[data-ce-card]")?.addEventListener("click", (f) => f.stopPropagation()), i.querySelector("[data-ce-form]")?.addEventListener("submit", (f) => {`;

/**
 * Modal Ctrl+V must use window paste (same as the characters tab).
 * Element-level paste only fires when focus is inside the modal; after arming
 * a button, focus often sits on body/Risu chat so Ctrl+V was a no-op.
 */
const VENDOR_AUTOTAG_WINDOW_PASTE_NEEDLE =
  `    }), t._autotagPasteBound || (t._autotagPasteBound = !0, window.addEventListener("paste", async (a) => {
      if (!t.autotagFocus || t.autotagFocus.scope === "modal" || !t.uiOpen || t.uiTab !== "characters") return;
      const r = Array.from(a.clipboardData?.items || []).find((p) => p.type.startsWith("image/"));
      if (!r) return;
      a.preventDefault();
      const i = r.getAsFile();
      if (!i) return;
      const s = String(t.autotagFocus.scope || ""), c = String(t.autotagFocus.id || ""), l = Array.from(document.querySelectorAll("[data-char-scope]")).find((p) => p.getAttribute("data-char-scope") === s && p.getAttribute("data-char-id") === c);
      l && await Tt(l, i);
    }));
  }

  async function blockHostChrome(e) {`;
const VENDOR_AUTOTAG_WINDOW_PASTE_PATCH =
  `    }), t._autotagPasteBound || (t._autotagPasteBound = !0, window.addEventListener("paste", async (a) => {
      if (!t.autotagFocus) return;
      const r = Array.from(a.clipboardData?.items || []).find((p) => p.type.startsWith("image/"));
      if (!r) return;
      if (t.autotagFocus.scope === "modal") {
        const id = String(t.autotagFocus.id || "");
        const run = id === "char-edit" ? t.charEditUi?.runAutotag : id === "char-create" ? t.charCreateUi?.runAutotag : null;
        if (typeof run != "function") return;
        a.preventDefault();
        const file = r.getAsFile();
        file && await run(file);
        return;
      }
      if (!t.uiOpen || t.uiTab !== "characters") return;
      a.preventDefault();
      const i = r.getAsFile();
      if (!i) return;
      const s = String(t.autotagFocus.scope || ""), c = String(t.autotagFocus.id || ""), l = Array.from(document.querySelectorAll("[data-char-scope]")).find((p) => p.getAttribute("data-char-scope") === s && p.getAttribute("data-char-id") === c);
      l && await Tt(l, i);
    }));
  }

  async function blockHostChrome(e) {`;

/** Drop element paste on edit modal; expose runAutotag/uploadRef for window paste. */
const VENDOR_CHAR_EDIT_MODAL_PASTE_NEEDLE =
  `    }), i.addEventListener("paste", async (f) => {
      if (!(t.autotagFocus?.scope === "modal" && t.autotagFocus?.id === "char-edit")) return;
      const x = Array.from(f.clipboardData?.items || []).find((R) => R.type.startsWith("image/"));
      if (!x) return;
      f.preventDefault(), f.stopPropagation();
      const I = x.getAsFile();
      I && await d(I);
    });
    const U = async () => {`;
const VENDOR_CHAR_EDIT_MODAL_PASTE_PATCH =
  `    });
    const U = async () => {`;

const VENDOR_CHAR_EDIT_UI_PASTE_NEEDLE =
  `    }), t.charEditUi = {
      root: i,
      entryName: e.name,
      openedContainer: r,
      roster: n,
      entry: e
    };`;
const VENDOR_CHAR_EDIT_UI_PASTE_PATCH =
  `    }), t.charEditUi = {
      root: i,
      entryName: e.name,
      openedContainer: r,
      roster: n,
      entry: e,
      runAutotag: d,
      uploadRef: typeof t._ceUploadRef == "function" ? t._ceUploadRef : null
    };
    t._ceUploadRef = null;`;

/** Create modal: same window-paste routing as edit. */
const VENDOR_CHAR_CREATE_MODAL_PASTE_NEEDLE =
  `    }), root.addEventListener("paste", async (ev) => {
      if (!(t.autotagFocus?.scope === "modal" && t.autotagFocus?.id === "char-create")) return;
      const item = Array.from(ev.clipboardData?.items || []).find((R) => R.type.startsWith("image/"));
      if (!item) return;
      ev.preventDefault();
      const file = item.getAsFile();
      file && await runAutotag(file);
    });
    const save = async () => {`;
const VENDOR_CHAR_CREATE_MODAL_PASTE_PATCH =
  `    });
    const save = async () => {`;

const VENDOR_CHAR_CREATE_UI_PASTE_NEEDLE =
  `    t.charCreateUi = { root, openedContainer: opened, slotIndex: opts.slotIndex };`;
const VENDOR_CHAR_CREATE_UI_PASTE_PATCH =
  `    t.charCreateUi = { root, openedContainer: opened, slotIndex: opts.slotIndex, runAutotag };`;

const VENDOR_CHAR_CREATE_WEAR_ATTIRE_NEEDLE =
  `<span>옷 태그</span><label style="display:inline-flex;align-items:center;gap:4px;color:#d7deea;font-size:11px;cursor:pointer"><input data-cc-attire-locked type="checkbox" style="width:14px;height:14px;margin:0;accent-color:#7c6cff">고정</label>`;
const VENDOR_CHAR_CREATE_WEAR_ATTIRE_PATCH =
  `<span>옷·악세사리</span><label style="display:inline-flex;align-items:center;gap:4px;color:#d7deea;font-size:11px;cursor:pointer;white-space:nowrap;flex-shrink:0"><span>고정</span><input data-cc-attire-locked type="checkbox" checked style="width:14px;height:14px;margin:0;accent-color:#7c6cff;flex-shrink:0"></label>`;

const VENDOR_CHAR_CREATE_WEAR_ACC_NEEDLE =
  `<span>악세사리·무기·기타</span><label style="display:inline-flex;align-items:center;gap:4px;color:#d7deea;font-size:11px;cursor:pointer"><input data-cc-accessories-locked type="checkbox" style="width:14px;height:14px;margin:0;accent-color:#7c6cff">고정</label>`;
const VENDOR_CHAR_CREATE_WEAR_ACC_PATCH =
  `<span>무기·기타</span><label style="display:inline-flex;align-items:center;gap:4px;color:#d7deea;font-size:11px;cursor:pointer;white-space:nowrap;flex-shrink:0"><span>고정</span><input data-cc-accessories-locked type="checkbox" checked style="width:14px;height:14px;margin:0;accent-color:#7c6cff;flex-shrink:0"></label>`;

/** Tab + create share this label (2 occurrences). */
const VENDOR_APPEARANCE_LABEL_SHARED_NEEDLE = `<span>외형 태그 (옷·악세사리 제외)</span>`;
const VENDOR_APPEARANCE_LABEL_SHARED_PATCH = `<span>외형 태그 (옷·무기 제외)</span>`;

/**
 * Mobile settings chrome: tabs were wrapping Hangul one syllable per line when
 * squeezed, and head-actions (닫기) overflowed past the viewport.
 */
const VENDOR_TAB_NOWRAP_NEEDLE =
  `.tab{min-height:38px;padding:8px 17px;border:0;border-radius:10px;background:transparent;color:var(--muted);box-shadow:none}.tab.active{background:var(--accent-soft);color:#dcd7ff}`;
const VENDOR_TAB_NOWRAP_PATCH =
  `.tab{min-height:38px;padding:8px 17px;border:0;border-radius:10px;background:transparent;color:var(--muted);box-shadow:none;white-space:nowrap;flex:0 0 auto}.tab.active{background:var(--accent-soft);color:#dcd7ff}`;

const VENDOR_TABS_SCROLL_NEEDLE =
  `.tabs{display:flex;gap:7px;margin:20px 0 16px;padding:5px;width:max-content;max-width:100%;overflow:auto;background:rgba(17,23,35,.75);border:1px solid var(--border);border-radius:14px}`;
const VENDOR_TABS_SCROLL_PATCH =
  `.tabs{display:flex;flex-wrap:nowrap;gap:7px;margin:20px 0 16px;padding:5px;width:max-content;max-width:100%;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;background:rgba(17,23,35,.75);border:1px solid var(--border);border-radius:14px}`;

const VENDOR_MOBILE_CHROME_NEEDLE =
  `@media(max-width:700px){.model-form{grid-template-columns:1fr}.model-head{align-items:flex-start;flex-direction:column}.head-actions{flex-wrap:wrap;justify-content:flex-end}}`;
const VENDOR_MOBILE_CHROME_PATCH =
  `@media(max-width:700px){.model-form{grid-template-columns:1fr}.model-head{align-items:flex-start;flex-direction:column}.wrap{padding:12px 10px 40px;max-width:100%}.head{flex-direction:row;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:10px;min-height:0}.head-brand{flex:0 1 auto;min-width:0}.head-actions{display:flex;flex-wrap:nowrap;justify-content:flex-end;align-items:center;flex:0 1 auto;margin-left:auto;gap:4px;width:auto;max-width:none}.head-actions button{display:inline-flex;align-items:center;justify-content:center;text-align:center;flex:0 0 auto;min-width:0;min-height:32px;padding:4px 8px;font-size:11px;letter-spacing:0;line-height:1.2}.head-help{order:3;flex:1 1 100%;width:100%;max-width:none;min-width:0}.tabs{width:100%!important;max-width:100%;box-sizing:border-box}.tab{padding:8px 12px;font-size:13px}}`;

/** Help panel: title as small top-left overlay; body uses full width. */
const VENDOR_HEAD_HELP_LAYOUT_NEEDLE =
  `.head-help{flex:1 1 auto;min-width:320px;max-width:760px;height:72px;min-height:72px;max-height:72px;padding:8px 12px;border-radius:12px;border:1px solid var(--border);background:rgba(7,10,17,.55);display:flex;flex-direction:row;align-items:stretch;gap:10px;overflow:hidden;box-sizing:border-box}
.head-help.is-active{border-color:rgba(124,108,255,.35);background:rgba(124,108,255,.08)}
.head-help-title{flex:0 0 108px;width:108px;max-width:108px;display:flex;align-items:center;padding-right:10px;margin-right:2px;border-right:1px solid var(--border);font-size:10px;font-weight:740;color:var(--accent2);letter-spacing:.01em;line-height:1.25;word-break:keep-all;overflow:hidden}
.head-help-body{flex:1 1 auto;min-width:0;min-height:0;font-size:11px;line-height:1.4;color:var(--muted);overflow-x:hidden;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(163,184,216,.35) transparent}`;
const VENDOR_HEAD_HELP_LAYOUT_PATCH =
  `.head-help{flex:1 1 auto;min-width:320px;max-width:760px;height:120px;min-height:120px;max-height:120px;padding:8px 12px;border-radius:12px;border:1px solid var(--border);background:rgba(7,10,17,.55);display:block;position:relative;overflow:hidden;box-sizing:border-box;cursor:pointer}
.head-help.is-active{border-color:rgba(124,108,255,.35);background:rgba(124,108,255,.08)}
.head-help.is-collapsed{height:1px!important;min-height:1px!important;max-height:1px!important;padding:0!important;border-width:0!important;opacity:.55}
.head-help.is-collapsed .head-help-title,.head-help.is-collapsed .head-help-body{visibility:hidden}
.head.is-help-collapsed{min-height:0}
.head-brand{cursor:pointer}
.head-help-title{position:absolute;top:6px;left:12px;right:12px;z-index:1;width:auto;max-width:none;height:auto;display:block;padding:0;margin:0;border:0;font-size:9px;font-weight:740;color:var(--accent2);letter-spacing:.01em;line-height:1.2;word-break:keep-all;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;pointer-events:none}
.head-help-body{display:block;width:100%;height:100%;min-width:0;min-height:0;padding-top:14px;box-sizing:border-box;font-size:11px;line-height:1.4;color:var(--muted);overflow-x:hidden;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(163,184,216,.35) transparent}`;
/** Click help panel or brand chrome to collapse/expand the help row. */
const VENDOR_HEAD_HELP_TOGGLE_NEEDLE =
  `    }), e.addEventListener("focusin", (a) => o(a.target)), e.addEventListener("focusout", (a) => {
      const r = a.relatedTarget;
      if (r && e.contains(r) && resolveHeadHelpTarget(r)) {
        o(r);
        return;
      }
      n = null, document.querySelectorAll(".is-help-active").forEach((i) => i.classList.remove("is-help-active")), setHeadHelp(null);
    }), setHeadHelp(null);
  }

  function $t(e) {`;
const VENDOR_HEAD_HELP_TOGGLE_PATCH =
  `    }), e.addEventListener("focusin", (a) => o(a.target)), e.addEventListener("focusout", (a) => {
      const r = a.relatedTarget;
      if (r && e.contains(r) && resolveHeadHelpTarget(r)) {
        o(r);
        return;
      }
      n = null, document.querySelectorAll(".is-help-active").forEach((i) => i.classList.remove("is-help-active")), setHeadHelp(null);
    }), setHeadHelp(null);
    const headEl = e.querySelector?.(".head") || document.querySelector("#nx-chrome .head");
    const helpEl = document.getElementById("nx-head-help");
    const brandEl = headEl?.querySelector?.(".head-brand");
    if (t.headHelpCollapsed == null) {
      try {
        t.headHelpCollapsed = sessionStorage.getItem("nx-head-help-collapsed") === "1";
      } catch {
        t.headHelpCollapsed = !1;
      }
    }
    const applyHelpCollapsed = (collapsed) => {
      t.headHelpCollapsed = !!collapsed;
      try {
        sessionStorage.setItem("nx-head-help-collapsed", collapsed ? "1" : "0");
      } catch {
      }
      helpEl && helpEl.classList.toggle("is-collapsed", !!collapsed);
      headEl && headEl.classList.toggle("is-help-collapsed", !!collapsed);
      helpEl && helpEl.setAttribute("aria-expanded", collapsed ? "false" : "true");
      brandEl && (brandEl.title = collapsed ? "도움말 펼치기" : "도움말 접기");
    };
    applyHelpCollapsed(!!t.headHelpCollapsed);
    const toggleHelpCollapsed = (ev) => {
      if (ev?.target?.closest?.(".head-actions")) return;
      applyHelpCollapsed(!t.headHelpCollapsed);
    };
    helpEl && !helpEl.dataset.nxCollapseBound && (helpEl.dataset.nxCollapseBound = "1", helpEl.setAttribute("role", "button"), helpEl.setAttribute("tabindex", "0"), helpEl.setAttribute("title", "클릭하여 도움말 접기/펼치기"), helpEl.addEventListener("click", toggleHelpCollapsed), helpEl.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") ev.preventDefault(), toggleHelpCollapsed(ev);
    }));
    brandEl && !brandEl.dataset.nxCollapseBound && (brandEl.dataset.nxCollapseBound = "1", brandEl.addEventListener("click", toggleHelpCollapsed));
  }

  function $t(e) {`;

/** Chrome action labels + hide run-now / open-viewer (handlers kept). */
const VENDOR_CHROME_ACTIONS_HTML_NEEDLE =
  `                <button type="button" id="nx-save-all" class="secondary">전체 저장</button>
                <button type="button" id="nx-export-all" class="secondary">전체 설정 내보내기</button>
                <button type="button" id="nx-import-all" class="secondary">전체 설정 불러오기</button>`;
const VENDOR_CHROME_ACTIONS_HTML_PATCH =
  `                <button type="button" id="nx-save-all" class="secondary">저장</button>
                <button type="button" id="nx-export-all" class="secondary">EXPORT</button>
                <button type="button" id="nx-import-all" class="secondary">IMPORT</button>`;

const VENDOR_STATUS_GRID_HTML_NEEDLE =
  `          <div class="grid" id="nx-status-grid">
            <div class="card"><strong>백엔드</strong><div class="value" id="nx-health-value">\${l}</div></div>
            <div class="card"><strong>훅</strong><div class="value" id="nx-hook-value" style="font-size:16px">\${t.replacerReady ? "afterRequest 활성" : h(t.replacerError || "비활성")}</div></div>
            <div id="nx-job-card">\${C}</div>
          </div>`;
const VENDOR_STATUS_GRID_HTML_PATCH =
  `          <div class="grid" id="nx-status-grid" style="display:none" aria-hidden="true">
            <div class="card"><strong>백엔드</strong><div class="value" id="nx-health-value">\${l}</div></div>
            <div class="card"><strong>훅</strong><div class="value" id="nx-hook-value" style="font-size:16px">\${t.replacerReady ? "afterRequest 활성" : h(t.replacerError || "비활성")}</div></div>
            <div id="nx-job-card">\${C}</div>
          </div>`;

const VENDOR_STATUS_GRID_SHOW_NEEDLE =
  `        const _sg = document.getElementById("nx-status-grid");
        _sg && (_sg.style.display = t.uiTab === "dashboard" ? "" : "none");`;
const VENDOR_STATUS_GRID_SHOW_PATCH =
  `        const _sg = document.getElementById("nx-status-grid");
        _sg && (_sg.style.display = "none");`;

const VENDOR_DASH_ACTIONS_HTML_NEEDLE =
  `          <div class="row" style="margin-top:12px"><button id="nx-save-dash" data-nx-help-id="nx-save-dash">대시보드 저장</button><button id="nx-run-now" class="secondary" data-nx-help-id="nx-run-now">지금 생성 (수동)</button><button id="nx-open-viewer" class="secondary" data-nx-help-id="nx-open-viewer">뷰어 앞으로</button></div>
          <div class="row" style="margin-top:8px"><button id="nx-reset-windows" class="secondary" type="button" data-nx-help-id="nx-reset-windows">모든 창 위치 초기화</button><button id="nx-reset-settings" class="secondary" type="button" data-nx-help-id="nx-reset-settings">모든 설정 초기화</button></div>`;
const VENDOR_DASH_ACTIONS_HTML_PATCH =
  `          <div class="row" style="margin-top:12px;flex-wrap:wrap;gap:8px"><button id="nx-save-dash" data-nx-help-id="nx-save-dash">대시보드 저장</button><button id="nx-reset-windows" class="secondary" type="button" data-nx-help-id="nx-reset-windows">창위치 초기화</button><button id="nx-reset-settings" class="secondary" type="button" data-nx-help-id="nx-reset-settings">전체 초기화</button></div>`;

const VENDOR_CHAR_TAB_BTNS_NEEDLE =
  `        <div class="row" style="margin-top:10px">
          <button id="nx-char-add-session" class="secondary">\${Nn ? "통합 캐릭터 추가" : "채팅 캐릭터 추가"}</button>
          <button id="nx-save-chars">\${Nn ? "통합 캐릭터 저장" : "채팅 캐릭터 저장"}</button>
          <button id="nx-export-session-chars" class="secondary">JSON 내보내기</button>
          <button id="nx-import-session-chars" class="secondary">JSON 불러오기</button>
          <input id="nx-import-session-chars-file" type="file" accept=".json,application/json,text/plain" style="display:none">
          \${Nn ? '<button id="nx-unify-rebuild" class="secondary">채팅에서 다시 모으기</button>' : ""}
        </div>
        <div class="prompt-group-label" style="margin-top:18px">글로벌 캐릭터</div>
        <div class="notice info" style="margin-bottom:10px">글로벌 캐릭터는 모든 채팅에서 공유됩니다. 특정 챗에서만 끄려면 카드를 펼쳐 「이 캐릭터 챗에서 사용」을 해제하세요. JSON 내보내기/불러오기는 이름·성·별칭·외형 태그를 파일로 옮깁니다.</div>
        <div id="nx-char-global-list">\${x}</div>
        <div class="row" style="margin-top:10px">
          <button id="nx-char-add-global" class="secondary">글로벌 캐릭터 추가</button>
          <button id="nx-save-global-chars">글로벌 저장</button>
          <button id="nx-export-global-chars" class="secondary">JSON 내보내기</button>
          <button id="nx-import-global-chars" class="secondary">JSON 불러오기</button>
          <input id="nx-import-global-chars-file" type="file" accept=".json,application/json,text/plain" style="display:none">
          <button id="nx-refresh-chars" class="secondary">새로고침</button>
        </div>\`;`;
const VENDOR_CHAR_TAB_BTNS_PATCH =
  `        <div class="row" style="margin-top:10px;flex-wrap:wrap;gap:8px">
          <button id="nx-char-add-session" class="secondary">추가</button>
          <button id="nx-save-chars">저장</button>
          <button id="nx-export-session-chars" class="secondary">EXPORT</button>
          <button id="nx-import-session-chars" class="secondary">IMPORT</button>
          <input id="nx-import-session-chars-file" type="file" accept=".json,application/json,text/plain" style="display:none">
          \${Nn ? '<button id="nx-unify-rebuild" class="secondary">다시 모으기</button>' : ""}
        </div>
        <div class="prompt-group-label" style="margin-top:18px">글로벌 캐릭터</div>
        <div class="notice info" style="margin-bottom:10px">글로벌 캐릭터는 모든 채팅에서 공유됩니다. 특정 챗에서만 끄려면 카드를 펼쳐 「이 캐릭터 챗에서 사용」을 해제하세요.</div>
        <div id="nx-char-global-list">\${x}</div>
        <div class="row" style="margin-top:10px;flex-wrap:wrap;gap:8px">
          <button id="nx-char-add-global" class="secondary">추가</button>
          <button id="nx-save-global-chars">저장</button>
          <button id="nx-export-global-chars" class="secondary">EXPORT</button>
          <button id="nx-import-global-chars" class="secondary">IMPORT</button>
          <input id="nx-import-global-chars-file" type="file" accept=".json,application/json,text/plain" style="display:none">
          <button id="nx-refresh-chars" class="secondary">새로고침</button>
        </div>\`;`;

const VENDOR_RESET_HELP_NEEDLE =
  `    "nx-reset-windows": { title: "창 위치 초기화", body: "뷰어·접힘 아이콘·핀이 화면 밖으로 나가 안 보일 때 기본 위치로 되돌립니다." },
    "nx-reset-settings": { title: "모든 설정 초기화", body: "카드·LLM·NAI 등 설정을 기본값으로 되돌립니다. API 키·창 위치·카드 프리셋은 유지됩니다." },`;
const VENDOR_RESET_HELP_PATCH =
  `    "nx-reset-windows": { title: "창위치 초기화", body: "뷰어·접힘 아이콘·핀이 화면 밖으로 나가 안 보일 때 기본 위치로 되돌립니다." },
    "nx-reset-settings": { title: "전체 초기화", body: "카드·LLM·NAI 등 설정을 기본값으로 되돌립니다. API 키·창 위치·카드 프리셋은 유지됩니다." },`;

const VENDOR_UNLOAD_SAVE_NEEDLE =
  `t.timersBySession.forEach((e) => clearTimeout(e)), await flushSettingsSave().catch(() => {
      }), await syncQuickSettingsButton(!1)`;
const VENDOR_UNLOAD_SAVE_PATCH =
  `t.timersBySession.forEach((e) => clearTimeout(e)), await xa({ silent: !0 }).catch(() => {
      }), await syncQuickSettingsButton(!1)`;

/** Full save: tab-agnostic chars/prompts + llm_roles; silent mode for close. */
const VENDOR_XA_FULL_NEEDLE =
  `  async function xa() {
    try {
      await flushSettingsSave();
      const e = {}, n = Mt(), o = Ct();
      if ((n || o) && (e.card = {
        ...t.backendSettings?.card || {},
        ...n || {},
        ...o || {}
      }), document.getElementById("nx-llm-model") || document.getElementById("nx-nai-model")) {
        const a = ba();
        a && (e.llm = a.llm, e.nai = a.nai);
      }
      if (Object.keys(e).length && await pe(e), t.uiTab === "characters" && await K("/v1/characters", {
        method: "POST",
        body: withRootSessions({
          session_id: (await Z()).sessionId,
          character_id: w(t.lastScope?.characterId || "", 200),
          characters: oe("session"),
          global: oe("global")
        }, t.lastScope)
      }).then((res) => {
        if (Array.isArray(res?.characters)) t.charactersSession = res.characters;
        if (Array.isArray(res?.global)) t.charactersGlobal = res.global;
        if (res?.appearance) t.appearance = res.appearance;
        t._charsDirty = !1;
      }), t.uiTab === "prompts") for (const a of t.prompts || []) {
        const r = document.getElementById(\`nx-prompt-\${a.key}\`);
        if (!r) continue;
        const i = r.value || "";
        t.promptDrafts[a.key] = i, await K(\`/v1/prompts/\${encodeURIComponent(a.key)}\`, {
          method: "PUT",
          body: { text: i }
        });
      }
      t.uiMessage = {
        type: "success",
        text: "전체 저장됨"
      }, $e("저장됨");
    } catch (e) {
      $e("저장 실패", !1), t.uiMessage = {
        type: "error",
        text: z(e?.message || e)
      };
    }
    await P();
  }`;
const VENDOR_XA_FULL_PATCH =
  `  async function xa(opts) {
    const silent = !!(opts && opts.silent);
    try {
      await flushSettingsSave();
      const e = {}, n = Mt(), o = Ct();
      if ((n || o) && (e.card = {
        ...t.backendSettings?.card || {},
        ...n || {},
        ...o || {}
      }), document.getElementById("nx-llm-model") || document.getElementById("nx-nai-model") || document.getElementById("nx-llm-provider")) {
        const a = ba();
        a && (e.llm = a.llm, e.llm_roles = a.llm_roles, e.nai = a.nai);
      }
      if (Object.keys(e).length && await pe(e), await flushDirtyCharacters().catch(() => null), t.prompts || t.promptDrafts) {
        for (const a of t.prompts || []) {
          const key = a.key;
          if (!key) continue;
          const r = document.getElementById(\`nx-prompt-\${key}\`);
          const i = r ? r.value || "" : (t.promptDrafts[key] != null ? String(t.promptDrafts[key]) : String(a.text || ""));
          if (r) t.promptDrafts[key] = i;
          await K(\`/v1/prompts/\${encodeURIComponent(key)}\`, {
            method: "PUT",
            body: { text: i }
          });
        }
      }
      if (!silent) {
        t.uiMessage = {
          type: "success",
          text: "저장됨"
        }, $e("저장됨");
      }
    } catch (e) {
      if (!silent) {
        $e("저장 실패", !1), t.uiMessage = {
          type: "error",
          text: z(e?.message || e)
        };
      } else {
        y("warn", "settings.save.silent", e?.message || e);
      }
    }
    if (!silent) await P();
  }`;

/** Firefox: Segoe UI Variable Text + weight 560 → Hangul tofu; prefer fonts with CJK. */
const VENDOR_FF_FONT_BODY_NEEDLE =
  `body{min-height:100vh;margin:0;background:radial-gradient(circle at 12% 0,rgba(124,108,255,.13),transparent 32rem),var(--bg);color:var(--text);font:14px/1.6 "Segoe UI Variable Text",Pretendard,"Noto Sans KR","Segoe UI",system-ui,sans-serif}`;
const VENDOR_FF_FONT_BODY_PATCH =
  `body{min-height:100vh;margin:0;background:radial-gradient(circle at 12% 0,rgba(124,108,255,.13),transparent 32rem),var(--bg);color:var(--text);font:14px/1.6 "Segoe UI","Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",Pretendard,system-ui,sans-serif}`;

const VENDOR_FF_FONT_TOGGLE_NEEDLE =
  `.toggle-row{display:flex;align-items:center;gap:10px;margin-top:10px;flex-wrap:nowrap;line-height:1.4;color:var(--text);font-size:14px;font-weight:560;border-radius:10px;padding:4px 6px;margin-left:-6px;margin-right:-6px;cursor:help;transition:background .12s ease}`;
const VENDOR_FF_FONT_TOGGLE_PATCH =
  `.toggle-row{display:flex;align-items:center;gap:10px;margin-top:10px;flex-wrap:nowrap;line-height:1.4;color:var(--text);font-size:14px;font-weight:600;border-radius:10px;padding:4px 6px;margin-left:-6px;margin-right:-6px;cursor:help;transition:background .12s ease}
.model-form label.toggle-row{flex-direction:row;align-items:center;justify-content:flex-start;gap:10px;text-transform:none;letter-spacing:normal;font-size:14px;font-weight:600;color:var(--text)}
.model-form label.toggle-row span{flex:0 1 auto;min-width:0}
.char-wear-head{flex-wrap:nowrap!important;align-items:center!important}
.char-lock{display:inline-flex!important;flex-direction:row!important;align-items:center!important;flex-shrink:0!important;white-space:nowrap!important;gap:4px!important}
[data-char-costume] option,[data-ce-costume] option{color:#e8eef8!important;background:#0b0f18!important}`;

/** Beta: message-bubble inline illustrations at LLM `line` (click/hash timing only). */
const VENDOR_INLINE_HELP_NEEDLE =
  `    "nx-overlay": { title: "채팅 왼쪽 줄 오버레이", body: "채팅 왼쪽에 핀과 이미지를 함께 둡니다. 스크롤하는 동안에도 지금 읽는 구간의 이미지를 계속 보여 줍니다. 짧게 누르면 이미지를 숨기고, 핀을 누르면 다시 나타납니다. 길게 누르면 크게보기와 태그·재생성·리롤·캐릭터 칩 메뉴가 열립니다." },`;
const VENDOR_INLINE_HELP_PATCH =
  `    "nx-overlay": { title: "채팅 왼쪽 줄 오버레이", body: "채팅 왼쪽 핀·스티키 이미지를 보여 줍니다. 꺼도 내부 동기화는 유지하고, 상시 이미지 0% + 핀을 화면 밖으로 치워 가려 둡니다(꺼서 통째로 뜯으면 렉이 나서). 메시지 클릭·말풍선 삽화는 그대로입니다." },
    "nx-inline-chat": { title: "말풍선 삽화 (beta)", body: "선택 기준에서 근처 char 말풍선(위·아래 각 최대 1, 유저는 건너뜀; 선택이 char면 포함해 최대 3)에만 샷 line 이미지를 끼웁니다. 켜면 스티키 활성 이미지는 마우스에 가장 가까운 샷을 우선합니다. 길게 누르면 크게보기/태그·재생성·리롤 메뉴. 「모든 메시지 이미지 생성」이 켜지면 선택 ±1(역할 무관). 나머지는 지워서 메모리를 막습니다. 배율(%)은 기본 100(말풍선 폭 약 78%·높이 상한 70vh)이며 25–200으로 조절합니다." },
    "nx-inline-chat-scale": { title: "말풍선 삽화 배율 (%)", body: "말풍선 안 삽화 크기입니다. 100%가 기본(폭 약 78%·높이 상한 70vh)이고, 50%면 약 절반, 150%면 더 크게 보입니다. 말풍선 폭을 넘지 않습니다." },
    "nx-progress-toast": { title: "진행 토스트", body: "생성/리롤=보라. 인덱싱(민트)=지금 고른 메시지 이미지 준비만(갤러리 전체 워밍은 표시 안 함). 선택 알림은 별도 토스트." },`;

const VENDOR_INLINE_TOGGLE_NEEDLE =
  `            <label class="toggle-row" data-nx-help-id="nx-overlay"><input type="checkbox" id="nx-overlay" \${i.overlay_markers !== !1 ? "checked" : ""}><span>채팅 왼쪽 줄 오버레이</span></label>`;
const VENDOR_INLINE_TOGGLE_PATCH =
  `            <label class="toggle-row" data-nx-help-id="nx-overlay"><input type="checkbox" id="nx-overlay" \${i.overlay_markers !== !1 ? "checked" : ""}><span>채팅 왼쪽 줄 오버레이</span></label>
            <label class="toggle-row" data-nx-help-id="nx-inline-chat"><input type="checkbox" id="nx-inline-chat" \${i.inline_chat_images ? "checked" : ""}><span>말풍선 삽화 (beta)</span></label>
            <label data-nx-help-id="nx-inline-chat-scale"><span>말풍선 삽화 배율 (%)</span>
              <input id="nx-inline-chat-scale" type="number" min="25" max="200" step="5" value="\${h(i.inline_chat_scale_pct ?? 100)}">
            </label>
            <label class="toggle-row" data-nx-help-id="nx-progress-toast"><input type="checkbox" id="nx-progress-toast" \${i.progress_toast ? "checked" : ""}><span>진행 토스트</span></label>`;

const VENDOR_INLINE_SAVE_NEEDLE =
  `      overlay_markers: ee("nx-overlay"),`;
const VENDOR_INLINE_SAVE_PATCH =
  `      overlay_markers: ee("nx-overlay"),
      inline_chat_images: ee("nx-inline-chat"),
      inline_chat_scale_pct: Math.max(25, Math.min(200, Math.round(Ne(N("nx-inline-chat-scale"), 100)) || 100)),
      progress_toast: ee("nx-progress-toast"),`;

const VENDOR_DE_STRIP_NEEDLE =
  `  async function De(e) {
    try {
      if (typeof e.getInnerHTML == "function") return w(ln(await e.getInnerHTML()), 1e5);
    } catch {
    }`;
const VENDOR_DE_STRIP_PATCH =
  `  async function De(e) {
    try {
      const body = typeof e?.querySelector == "function" ? await e.querySelector(".leading-relaxed") : null;
      const src = body && typeof body.getInnerHTML == "function" ? body : e;
      if (typeof src.getInnerHTML == "function") {
        let html = String(await src.getInnerHTML() || "");
        const VC = globalThis.__INLAY_VIEWER_CORE__;
        if (typeof VC?.stripInlayInlineHtml == "function") html = VC.stripInlayInlineHtml(html);
        return w(ln(html), 1e5);
      }
    } catch {
    }`;

const VENDOR_DT_FN_NEEDLE =
  `  async function dt(e) {
    if (!e) return [];
    for (const n of $a) try {
      const o = await e.querySelectorAll(n), a = typeof k.unwarpSafeArray == "function" ? await k.unwarpSafeArray(o) : [];
      if (a?.length) return a;
    } catch {
    }
    return [];
  }`;
const VENDOR_DT_FN_PATCH =
  `  async function nxChatAttrIndex(el) {
    try {
      if (el && typeof el.getAttribute == "function") {
        const v = Number(await el.getAttribute("data-chat-index"));
        if (Number.isFinite(v) && v >= 0) return v;
      }
    } catch {
    }
    return NaN;
  }
  async function dt(e) {
    if (!e) return [];
    const unwrap = async (sel) => {
      try {
        const o = await e.querySelectorAll(sel);
        const a = typeof k.unwarpSafeArray == "function" ? await k.unwarpSafeArray(o) : [];
        return Array.isArray(a) ? a : [];
      } catch {
        return [];
      }
    };
    let a = await unwrap("[data-chat-id]");
    if (!a.length) a = await unwrap(".risu-chat");
    if (a.length) {
      const paired = [];
      let known = 0;
      for (let i = 0; i < a.length; i++) {
        const idx = await nxChatAttrIndex(a[i]);
        if (Number.isFinite(idx)) known += 1;
        paired.push({ el: a[i], i, idx });
      }
      if (known === paired.length) {
        // Newest / visually lower first: higher data-chat-index → DOM#0.
        paired.sort((x, y) => y.idx - x.idx || x.i - y.i);
        return paired.map((p) => p.el);
      }
      const rects = [];
      for (let i = 0; i < a.length; i++) {
        let top = i;
        try {
          const r = await a[i].getBoundingClientRect();
          if (r && Number.isFinite(Number(r.top))) top = Number(r.top);
        } catch {
        }
        rects.push({ el: a[i], top, i });
      }
      rects.sort((x, y) => y.top - x.top || x.i - y.i);
      return rects.map((p) => p.el);
    }
    for (const n of $a) {
      const b = await unwrap(n);
      if (b.length) return b;
    }
    return [];
  }`;

const VENDOR_DA_QA_NEEDLE =
  `    const i = qa(a, r.messages, e, Array.isArray(n) ? n.length : 0, { prevText, nextText }), l = w(i.role || "");`;
const VENDOR_DA_QA_PATCH =
  `    const nxApi = await nxChatAttrIndex(o);
    const i = qa(a, r.messages, e, Array.isArray(n) ? n.length : 0, { prevText, nextText, chatIndex: nxApi }), l = w(i.role || "");`;

const VENDOR_BIND_QA_NEEDLE =
  `      const c = qa(s, a?.messages || [], i, o.length);`;
const VENDOR_BIND_QA_PATCH =
  `      const nxApi = await nxChatAttrIndex(o[i]);
      const c = qa(s, a?.messages || [], i, o.length, { chatIndex: nxApi });`;

const VENDOR_INLINE_INJECT_FN_NEEDLE =
  `  async function ensureMessageInView(el) {`;
const VENDOR_INLINE_INJECT_FN_PATCH =
  `  async function injectChatInlineImages(msgEl, cards, pendingRows) {
    if (!msgEl || t.backendSettings?.card?.inline_chat_images !== !0) return;
    if (typeof msgEl.querySelectorAll != "function" || typeof msgEl.getInnerHTML != "function") return;
    if (t._inlineInjectBusy) {
      t._inlineInjectQueued = !0;
      return;
    }
    t._inlineInjectBusy = !0;
    t._inlineInjectQueued = !1;
    try {
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    if (typeof VC?.findElementIndexForLineWithFallback != "function" || typeof VC?.markerBlockHtml != "function") return;
    const doc = t.hostDoc;
    if (!doc || typeof doc.createElement != "function") return;
    const list = Array.isArray(cards) ? cards : [];
    // Pending spinners follow auto-gen roles — never on user bubbles when
    // "모든 메시지 이미지 생성" is off (same gate as Ka / select).
    const allowPending = typeof isSelectedCharRole == "function"
      ? isSelectedCharRole(t.selectedMessage?.role)
      : !/^(user|human)$/i.test(String(t.selectedMessage?.role || ""));
    // Only the job's own message may show spinners — never a finished turn.
    const selMsgIdx = Number(t.selectedMessage?.chatIndex ?? -1);
    const pendingMsgIdx = Number(t._inlinePendingMsgIndex ?? -1);
    const pendingForThisMsg = allowPending
      && Number.isFinite(selMsgIdx) && selMsgIdx >= 0
      && selMsgIdx === pendingMsgIdx;
    const pending = pendingForThisMsg
      ? Array.isArray(pendingRows) ? pendingRows : Array.isArray(t._inlinePending) ? t._inlinePending : []
      : [];
    const placements = [];
    const encodeLater = [];
    const seenCard = new Set();
    const seenLine = new Set();
    const seenShot = new Set();
    for (const card of list) {
      const line = Number(card?.line);
      const shotIndex = Number(card?.shot_index);
      const cardId = String(card?.id || "");
      if (cardId && seenCard.has(cardId)) continue;
      // Claim line/shot as soon as a linked card exists so stale pending cannot
      // paint a circle on a turn that already has images (even if bytes are slow).
      if (Number.isFinite(shotIndex) && shotIndex >= 0) seenShot.add(shotIndex);
      if (Number.isFinite(line) && line >= 1) seenLine.add(line);
      if (!Number.isFinite(line) || line < 1) continue;
      // Sync cache only — do not await the whole bubble on the first miss.
      let src = "";
      try {
        const N = globalThis.__INLAY_NATIVE__;
        src = typeof N?.resolveImageUrl == "function" ? String(N.resolveImageUrl(card) || "") : "";
        if (!src || !/^data:image\\//i.test(src)) {
          const fb = typeof Ie == "function" ? Ie(card) : "";
          if (typeof fb == "string" && /^data:image\\//i.test(fb)) src = fb;
        }
      } catch {
      }
      if (!src || !/^data:image\\//i.test(src)) {
        if (cardId) encodeLater.push(card);
        continue;
      }
      if (cardId) seenCard.add(cardId);
      placements.push({
        line,
        src,
        shotIndex: card.shot_index,
        cardId,
        pending: !1
      });
    }
    for (const row of pending) {
      const line = Number(row?.line);
      const shotIndex = Number(row?.shot_index);
      if (!Number.isFinite(line) || line < 1 || seenLine.has(line)) continue;
      if (Number.isFinite(shotIndex) && seenShot.has(shotIndex)) continue;
      const cardId = \`pending-\${Number.isFinite(shotIndex) ? shotIndex : line}\`;
      if (seenCard.has(cardId)) continue;
      seenLine.add(line);
      if (Number.isFinite(shotIndex)) seenShot.add(shotIndex);
      seenCard.add(cardId);
      placements.push({ line, src: "", shotIndex, cardId, pending: !0 });
    }
    const unwrapSafe = async (arr) => {
      if (!arr) return [];
      if (typeof k.unwarpSafeArray == "function") {
        try {
          const u = await k.unwarpSafeArray(arr);
          return Array.isArray(u) ? u : u ? [u] : [];
        } catch {
          return [];
        }
      }
      return Array.isArray(arr) ? arr : [arr];
    };
    try {
      const wantIds = [
        ...placements.map((p) => String(p.cardId || "")),
        ...encodeLater.map((c) => String(c?.id || ""))
      ].filter(Boolean).sort();
      const scaleNow = Math.max(25, Math.min(200, Math.round(Number(t.backendSettings?.card?.inline_chat_scale_pct) || 100)));
      let prev = await unwrapSafe(await msgEl.querySelectorAll("[data-inlay-inline-shot]"));
      if (prev.length === wantIds.length && t._inlinePaintScale === scaleNow) {
        if (!wantIds.length) {
          y("info", "inline.inject.skip", "shots=0 already");
          return;
        }
        let htmlNow = "";
        try {
          htmlNow = String(await msgEl.getInnerHTML() || "");
        } catch {
          htmlNow = "";
        }
        if (wantIds.every((id) => htmlNow.includes(\`data-inlay-inline-shot="\${id}"\`))) {
          y("info", "inline.inject.skip", \`shots=\${wantIds.length} already\`);
          return;
        }
      }
      const removeAllMarkers = async () => {
        for (const sel of ["[data-inlay-inline-shot]", "[data-inlay-inline-pending]"]) {
          let nodes = [];
          try {
            nodes = await unwrapSafe(await msgEl.querySelectorAll(sel));
          } catch {
            nodes = [];
          }
          for (const node of nodes) {
            try {
              if (node && typeof node.remove == "function") await node.remove();
            } catch {
            }
          }
        }
      };
      // Nothing to paint and nothing to encode: strip leftover pending only.
      if (!placements.length && !encodeLater.length) {
        try {
          const pendOnly = await unwrapSafe(await msgEl.querySelectorAll("[data-inlay-inline-pending]"));
          for (const node of pendOnly) {
            try {
              if (node && typeof node.remove == "function") await node.remove();
            } catch {
            }
          }
        } catch {
        }
        y("info", "inline.inject", "shots=0 keep existing");
        return;
      }
      const wipeFirst = placements.length > 0;
      if (wipeFirst) {
        await removeAllMarkers();
        await removeAllMarkers();
        // Nuclear: leftover duplicate circles/images → rewrite bubble HTML without markers.
        try {
          const left = await unwrapSafe(await msgEl.querySelectorAll("[data-inlay-inline-shot]"));
          if (left.length && typeof msgEl.setInnerHTML == "function") {
            let htmlLeft = String(await msgEl.getInnerHTML() || "");
            if (typeof VC.stripInlayInlineHtml == "function") htmlLeft = VC.stripInlayInlineHtml(htmlLeft);
            await msgEl.setInnerHTML(htmlLeft);
          }
        } catch {
        }
      }
      const html = String(await msgEl.getInnerHTML() || "");
      const cleaned = typeof VC.stripInlayInlineHtml == "function" ? VC.stripInlayInlineHtml(html) : html;
      const plain = typeof VC.htmlToPlainLn == "function" ? VC.htmlToPlainLn(cleaned) : cleaned;
      const messageLines = typeof VC.splitMessageLines == "function" ? VC.splitMessageLines(plain) : [];
      if (!messageLines.length) return;
      const hostsRaw = await unwrapSafe(await msgEl.querySelectorAll("p,h1,h2,h3,h4,h5,h6,li,blockquote,div"));
      const hosts = [];
      const hostTags = [];
      for (const el of hostsRaw) {
        if (!el) continue;
        let name = "";
        try {
          name = typeof el.nodeName == "function" ? String(await el.nodeName() || "").toUpperCase() : "";
        } catch {
          name = "";
        }
        if (name === "DIV") {
          let nested = null;
          try {
            nested = typeof el.querySelector == "function"
              ? await el.querySelector("p,h1,h2,h3,h4,h5,h6,li,blockquote")
              : null;
          } catch {
            nested = null;
          }
          if (nested) continue;
        }
        let text = "";
        try {
          if (typeof el.innerText == "function") text = String(await el.innerText() || "");
          else if (typeof el.textContent == "function") text = String(await el.textContent() || "");
        } catch {
          text = "";
        }
        if (!(typeof VC.splitMessageLines == "function" ? VC.splitMessageLines(text) : []).length) continue;
        hosts.push(el);
        hostTags.push(name || "DIV");
      }
      if (!hosts.length) return;
      const hostTexts = [];
      for (const el of hosts) {
        try {
          if (typeof el.innerText == "function") hostTexts.push(String(await el.innerText() || ""));
          else if (typeof el.textContent == "function") hostTexts.push(String(await el.textContent() || ""));
          else hostTexts.push("");
        } catch {
          hostTexts.push("");
        }
      }
      const byLine = new Map();
      for (const p of placements) {
        const line = typeof VC.clampShotLine == "function"
          ? VC.clampShotLine(p.line, messageLines.length)
          : Math.floor(Number(p.line));
        if (!line) continue;
        if (byLine.has(line)) continue;
        byLine.set(line, { ...p, line });
      }
      let placed = 0;
      const placedIds = new Set();
      const placedHosts = new Set();
      const placeShot = async (shot) => {
        const id = String(shot.cardId || "");
        if (id && placedIds.has(id)) return !1;
        if (id) {
          let already = [];
          try {
            already = await unwrapSafe(await msgEl.querySelectorAll(\`[data-inlay-inline-shot="\${id}"]\`));
          } catch {
            already = [];
          }
          if (already.length) {
            placedIds.add(id);
            return !1;
          }
        }
        const line = Number(shot.line);
        if (!line || !Number.isFinite(line)) return !1;
        const hit = VC.findElementIndexForLineWithFallback(hostTexts, hostTags, messageLines, line, ["P"]);
        if (!hit || hit.elementIndex < 0 || hit.elementIndex >= hosts.length) return !1;
        if (placedHosts.has(hit.elementIndex)) return !1;
        const host = hosts[hit.elementIndex];
        if (!host || typeof host.prepend != "function") return !1;
        try {
          const hostMarks = await unwrapSafe(await host.querySelectorAll("[data-inlay-inline-shot]"));
          if (hostMarks.length) {
            placedHosts.add(hit.elementIndex);
            return !1;
          }
        } catch {
        }
        const markerHtml = VC.markerBlockHtml(shot, t.backendSettings?.card?.inline_chat_scale_pct ?? 100);
        if (!markerHtml) return !1;
        try {
          const tmp = await H(doc, "div", { html: markerHtml });
          const kids = await unwrapSafe(typeof tmp?.getChildren == "function" ? await tmp.getChildren() : null);
          const wrap = kids[0];
          if (wrap && typeof host.prepend == "function") {
            await host.prepend(wrap);
            placed += 1;
            placedHosts.add(hit.elementIndex);
            if (id) placedIds.add(id);
            return !0;
          }
        } catch {
        }
        return !1;
      };
      for (const [, shot] of byLine) {
        await placeShot(shot);
      }
      // Progressive: encode cache misses one-by-one; prepend without wiping ready shots.
      for (const card of encodeLater) {
        if (t._inlineInjectQueued) break;
        let src = "";
        try {
          src = await ensureStickyCardImage(card) || "";
        } catch {
        }
        if (!src || !/^data:image\\//i.test(src)) continue;
        const line0 = Number(card?.line);
        const cardId = String(card?.id || "");
        if (!Number.isFinite(line0) || line0 < 1) continue;
        if (cardId && placedIds.has(cardId)) continue;
        const line = typeof VC.clampShotLine == "function"
          ? VC.clampShotLine(line0, messageLines.length)
          : Math.floor(line0);
        if (!line || byLine.has(line)) continue;
        const shot = {
          line,
          src,
          shotIndex: card.shot_index,
          cardId,
          pending: !1
        };
        byLine.set(line, shot);
        await placeShot(shot);
      }
      y("info", "inline.inject", \`shots=\${placements.length}+enc\${encodeLater.length} placed=\${placed} pending=\${placements.filter((p) => p.pending).length}\`);
      t._inlinePaintScale = scaleNow;
    } catch (err) {
      y("warn", "inline.inject.fail", z(err?.message || err, 120));
    }
    } finally {
      t._inlineInjectBusy = !1;
      if (t._inlineInjectQueued) {
        t._inlineInjectQueued = !1;
        refreshSelectedInlineImages().catch(() => {
        });
      }
    }
  }
  async function refreshSelectedInlineImages() {
    if (t.backendSettings?.card?.inline_chat_images !== !0) return;
    const sel = t.selectedMessage;
    if (!sel) return;
    try {
      const doc = await ue().catch(() => t.hostDoc);
      if (!doc) return;
      let fromCache = !!(t._msgElsCache?.doc === doc && Array.isArray(t._msgElsCache.els) && t._msgElsCache.els.length);
      let els = fromCache ? t._msgElsCache.els : null;
      if (!Array.isArray(els) || !els.length) {
        try {
          els = await getCachedMsgEls(doc);
        } catch {
          els = [];
        }
        fromCache = !1;
      }
      if (!Array.isArray(els) || !els.length) return;
      const selIdx = Number(sel.domIndex);
      if (!Number.isFinite(selIdx) || selIdx < 0 || selIdx >= els.length) return;
      const pendingKey = Array.isArray(t._inlinePending)
        ? t._inlinePending.map((p) => String(p?.cardId || p?.id || "")).filter(Boolean).sort().join(",")
        : "";
      let linkedKey = "";
      try {
        linkedKey = linkedCards(sel).map((card) => String(card?.id || "")).filter(Boolean).sort().join("|");
      } catch {
        linkedKey = "";
      }
      // Cheap skip before any SafeDOM De/resolve — same bubble + same linked shots + same pending.
      if (
        fromCache
        && t._inlineKeepDoc === doc
        && Number(t._inlineKeepElsLen) === els.length
        && Number(t._inlineKeepSelIdx) === selIdx
        && String(t._inlineKeepPendingKey || "") === pendingKey
        && String(t._inlineKeepLinkedKey || "") === linkedKey
        && Array.isArray(t._inlineKeepIdxs)
        && t._inlineKeepIdxs.length
      ) {
        y("info", "inline.keep.skip", \`DOM#\${selIdx} cheap keep=\${t._inlineKeepIdxs.join(",")}\`);
        return;
      }
      const VC = globalThis.__INLAY_VIEWER_CORE__;
      const allRoles = !!t.backendSettings?.card?.generate_all_roles;
      const maxPerSide = Number(VC?.INLINE_KEEP_MAX_PER_SIDE) > 0
        ? Number(VC.INLINE_KEEP_MAX_PER_SIDE)
        : 1;
      const scope = await Za().catch(() => null);
      const msgs = scope?.messages || [];
      const roleCache = new Map();
      const msgCache = new Map();
      const resolveAt = async (idx) => {
        if (msgCache.has(idx)) return msgCache.get(idx);
        let row = null;
        try {
          const raw = await De(els[idx]);
          const text = w(raw || "");
          if (text.length >= 4) {
            const hit = typeof qa == "function"
              ? qa(text, msgs, idx, els.length, {})
              : typeof VC?.resolveChatMessageMatch == "function"
                ? VC.resolveChatMessageMatch(text, msgs, idx, els.length)
                : null;
            const role = w(hit?.role || "");
            row = {
              idx,
              msg: {
                domIndex: idx,
                chatIndex: hit?.chatIndex,
                messageIndex: hit?.chatIndex,
                characterId: sel.characterId,
                chatId: sel.chatId,
                sessionId: sel.sessionId,
                role,
                text,
                hash: ye(text)
              }
            };
            roleCache.set(idx, role);
          } else {
            roleCache.set(idx, "");
            row = { idx, msg: null };
          }
        } catch {
          roleCache.set(idx, "");
          row = { idx, msg: null };
        }
        msgCache.set(idx, row);
        return row;
      };
      const isCharAtSync = (idx) => {
        let role = "";
        if (roleCache.has(idx)) role = roleCache.get(idx);
        else if (idx === selIdx && sel.role != null && String(sel.role).length) role = String(sel.role);
        else return !1;
        return typeof VC?.isCharMessageRole == "function"
          ? VC.isCharMessageRole(role)
          : typeof isSelectedCharRole == "function"
            ? isSelectedCharRole(role)
            : /^(char|assistant|bot)$/i.test(String(role || ""));
      };
      // Prefetch roles along walk so pickInlineKeepDomIndices can stay sync.
      if (allRoles) {
        if (selIdx + 1 < els.length) await resolveAt(selIdx + 1);
        if (selIdx - 1 >= 0) await resolveAt(selIdx - 1);
      } else {
        await resolveAt(selIdx);
        let found = 0;
        for (let i = selIdx + 1; i < els.length && found < maxPerSide; i += 1) {
          await resolveAt(i);
          if (isCharAtSync(i)) found += 1;
        }
        found = 0;
        for (let i = selIdx - 1; i >= 0 && found < maxPerSide; i -= 1) {
          await resolveAt(i);
          if (isCharAtSync(i)) found += 1;
        }
      }
      const keepIdxs = typeof VC?.pickInlineKeepDomIndices == "function"
        ? VC.pickInlineKeepDomIndices({
          selIdx,
          length: els.length,
          allRoles,
          isCharAt: isCharAtSync,
          maxPerSide
        })
        : (() => {
          const out = [];
          const add = (i) => {
            if (i >= 0 && i < els.length && !out.includes(i)) out.push(i);
          };
          if (allRoles) {
            add(selIdx);
            if (selIdx + 1 < els.length) add(selIdx + 1);
            if (selIdx - 1 >= 0) add(selIdx - 1);
            return out;
          }
          if (isCharAtSync(selIdx)) add(selIdx);
          let n = 0;
          for (let i = selIdx + 1; i < els.length && n < maxPerSide; i += 1) {
            if (isCharAtSync(i)) {
              add(i);
              n += 1;
            }
          }
          n = 0;
          for (let i = selIdx - 1; i >= 0 && n < maxPerSide; i -= 1) {
            if (isCharAtSync(i)) {
              add(i);
              n += 1;
            }
          }
          return out;
        })();
      const keep = new Set(keepIdxs);
      const neighborMsgs = [];
      for (const idx of keep) {
        if (idx === selIdx) continue;
        const row = msgCache.get(idx) || await resolveAt(idx);
        neighborMsgs.push(row || { idx, msg: null });
      }
      const unwrapSafe = async (arr) => {
        if (!arr) return [];
        if (typeof k.unwarpSafeArray == "function") {
          try {
            const u = await k.unwarpSafeArray(arr);
            return Array.isArray(u) ? u : u ? [u] : [];
          } catch {
            return [];
          }
        }
        return Array.isArray(arr) ? arr : [arr];
      };
      const stripInlineMarkersAt = async (idx) => {
        if (!Number.isFinite(idx) || idx < 0 || idx >= els.length || keep.has(idx)) return;
        const el = els[idx];
        if (!el || typeof el.querySelectorAll != "function") return;
        try {
          let nodes = [];
          try {
            nodes = await unwrapSafe(await el.querySelectorAll("[data-inlay-inline-shot],[data-inlay-inline-pending]"));
          } catch {
            nodes = [];
          }
          if (!nodes.length) return;
          for (const node of nodes) {
            try {
              if (node && typeof node.remove == "function") await node.remove();
            } catch {
            }
          }
          if (typeof el.setInnerHTML == "function" && typeof VC?.stripInlayInlineHtml == "function") {
            let left = [];
            try {
              left = await unwrapSafe(await el.querySelectorAll("[data-inlay-inline-shot]"));
            } catch {
              left = [];
            }
            if (left.length) {
              let html = String(await el.getInnerHTML() || "");
              await el.setInnerHTML(VC.stripInlayInlineHtml(html));
            }
          }
        } catch {
        }
      };
      // Diff strip: only drop markers leaving the keep window (prev − keep).
      // Full non-keep sweep only when the message DOM list remounts/resizes —
      // otherwise every scroll would SafeDOM-scan the whole chat.
      const prevKeep = Array.isArray(t._inlineKeepIdxs) ? t._inlineKeepIdxs : [];
      const nextKeepArr = [...keep].sort((a, b) => a - b);
      const elsRemounted = !fromCache || t._inlineKeepDoc !== doc || Number(t._inlineKeepElsLen) !== els.length;
      const sameKeep = !elsRemounted
        && Number(t._inlineKeepSelIdx) === selIdx
        && prevKeep.length === nextKeepArr.length
        && prevKeep.every((v, i) => Number(v) === Number(nextKeepArr[i]))
        && String(t._inlineKeepPendingKey || "") === pendingKey
        && String(t._inlineKeepLinkedKey || "") === linkedKey;
      if (sameKeep) {
        y("info", "inline.keep.skip", \`DOM#\${selIdx} unchanged keep=\${nextKeepArr.join(",")}\`);
        return;
      }
      if (elsRemounted) {
        for (let i = 0; i < els.length; i += 1) await stripInlineMarkersAt(i);
      } else {
        for (const i of prevKeep) {
          if (!keep.has(Number(i))) await stripInlineMarkersAt(i);
        }
      }
      t._inlineKeepIdxs = nextKeepArr;
      t._inlineKeepDoc = doc;
      t._inlineKeepElsLen = els.length;
      t._inlineKeepSelIdx = selIdx;
      t._inlineKeepPendingKey = pendingKey;
      t._inlineKeepLinkedKey = linkedKey;
      const mode = allRoles ? "±1" : \`char±\${maxPerSide}\`;
      y("info", "inline.keep", \`DOM#\${selIdx}\${mode} keep=\${t._inlineKeepIdxs.join(",")}/\${els.length} strip=\${elsRemounted ? "full" : "diff"}\`);
      const N = globalThis.__INLAY_NATIVE__;
      const selCards = linkedCards(sel);
      const selIds = selCards.map((card) => String(card?.id || "")).filter(Boolean);
      const neighborCardLists = [];
      for (const row of neighborMsgs) {
        if (row?.idx == null || !els[row.idx] || !row.msg) continue;
        if (!keep.has(row.idx)) continue;
        neighborCardLists.push({
          idx: row.idx,
          cards: linkedCards(row.msg)
        });
      }
      const neighborIds = neighborCardLists.flatMap((row) =>
        row.cards.map((card) => String(card?.id || "")).filter(Boolean)
      );
      try {
        if (typeof N?.prioritizeWarmFocus == "function" && selIds.length) N.prioritizeWarmFocus(selIds);
      } catch {
      }
      if (keep.has(selIdx) && els[selIdx]) {
        await injectChatInlineImages(els[selIdx], selCards, t._inlinePending);
      }
      try {
        if (typeof N?.prioritizeWarmFocus == "function" && neighborIds.length) {
          N.prioritizeWarmFocus([...selIds, ...neighborIds]);
        }
      } catch {
      }
      for (const row of neighborCardLists) {
        await injectChatInlineImages(els[row.idx], row.cards, []);
      }
      try {
        if (typeof N?.clearWarmFocus == "function") N.clearWarmFocus();
      } catch {
      }
    } catch (err) {
      y("warn", "inline.refresh.fail", z(err?.message || err, 100));
    }
  }
  async function ensureMessageInView(el) {`;

const VENDOR_INLINE_CALL_NEEDLE =
  `    return await onSelectionChanged("content"), scheduleOverlayPlace(80), t.debugUi?.refreshSoon && t.debugUi.refreshSoon(), (source === "click" || source === "text") && await ensureMessageInView(o), source === "provisional" ? !0 : !isSelectedCharRole(l) ? (y("info", "select.user", "유저 메시지 — 자동 생성 안 함"), !0) : u.length ? (y("info", "select.hasImage", \`cards=\${u.length} · 재생성은 뷰어 버튼\`), !0) : (y("info", "select.noImage", "해시 이미지 없음 → 태그부터 생성"), await Ka(t.selectedMessage.text, t.selectedMessage.hash), !0);
  }`;
const VENDOR_INLINE_CALL_PATCH =
  `    if (source === "click" || source === "text" || source === "scroll") {
      try {
        await refreshSelectedInlineImages();
      } catch {
      }
    }
    if (source === "click" || source === "text") {
      try {
        typeof showSelectionToast == "function" && showSelectionToast(t.selectedMessage).catch(() => {
        });
      } catch {
      }
    }
    return await onSelectionChanged("content"), scheduleOverlayPlace(80), t.debugUi?.refreshSoon && t.debugUi.refreshSoon(), (source === "click" || source === "text") && await ensureMessageInView(o), source === "provisional" ? !0 : !isSelectedCharRole(l) ? (y("info", "select.user", "유저 메시지 — 자동 생성 안 함"), !0) : u.length ? (y("info", "select.hasImage", \`cards=\${u.length} · 재생성은 뷰어 버튼\`), !0) : (y("info", "select.noImage", "해시 이미지 없음 → 태그부터 생성"), await Ka(t.selectedMessage.text, t.selectedMessage.hash), !0);
  }`;

const VENDOR_INLINE_SAME_NEEDLE =
  `      if (linked.length) return !0;
      if (source === "scroll" || source === "provisional") return !0;
      if (source === "text") return !isSelectedCharRole(l) ? !0 : (y("info", "select.same", \`msg#\${i.chatIndex} noImage → retry\`), await Ka(t.selectedMessage.text, t.selectedMessage.hash), !0);
      return !isSelectedCharRole(l) ? !0 : (y("info", "select.same", \`msg#\${i.chatIndex} noImage → retry\`), await Ka(t.selectedMessage.text, t.selectedMessage.hash), !0);
    }`;
const VENDOR_INLINE_SAME_PATCH =
  `      if (source === "click" || source === "text" || source === "scroll") {
        try {
          await refreshSelectedInlineImages();
        } catch {
        }
      }
      // Same message re-click: no selection toast (progress toast untouched).
      if (linked.length) return !0;
      if (source === "scroll" || source === "provisional") return !0;
      if (source === "text") return !isSelectedCharRole(l) ? !0 : (y("info", "select.same", \`msg#\${i.chatIndex} noImage → retry\`), await Ka(t.selectedMessage.text, t.selectedMessage.hash), !0);
      return !isSelectedCharRole(l) ? !0 : (y("info", "select.same", \`msg#\${i.chatIndex} noImage → retry\`), await Ka(t.selectedMessage.text, t.selectedMessage.hash), !0);
    }`;

/** Progressive bubble inline: store pending_inline; force gallery reload on shot_done. */
const VENDOR_INLINE_POLL_NEEDLE =
  `        const i = Number(r.shot_done ?? 0), s = !!(a.state && a.state !== t.lastJobState), c = i !== Number(t._lastShotDone ?? -1);
        const VC = globalThis.__INLAY_VIEWER_CORE__;
        if (s && (t.lastJobState = a.state, y("info", "job.poll", \`\${n.slice(0, 8)}… → \${a.state}\`)), r.message && r.message !== t._lastJobMsg && (t._lastJobMsg = r.message, y("info", "job.progress", r.message)), r.message && r.message !== t._lastJobMsg && (t._lastJobMsg = r.message, y("info", "job.progress", r.message)), (a.state === "generating" || a.state === "done") && (c || s && (a.state === "generating" || a.state === "done"))) {
          t._lastShotDone = i;
          const prevIds = (t.gallery || []).map((card) => String(card?.id || ""));
          try {
            if (await ce(e), t.selectedMessage) {
              const l = linkedCards(t.selectedMessage);`;
const VENDOR_INLINE_POLL_PATCH =
  `        const i = Number(r.shot_done ?? 0), s = !!(a.state && a.state !== t.lastJobState), c = i !== Number(t._lastShotDone ?? -1);
        const VC = globalThis.__INLAY_VIEWER_CORE__;
        if (a.state === "done" || a.state === "cancelled" || a.state === "error") {
          t._inlinePending = null;
          t._inlinePendingMsgIndex = -1;
        } else if (Array.isArray(r.pending_inline)) {
          t._inlinePending = r.pending_inline;
          const pmi = Number(r.pending_message_index ?? r.message_index);
          t._inlinePendingMsgIndex = Number.isFinite(pmi) ? pmi : Number(t.selectedMessage?.chatIndex ?? -1);
        }
        if (s && (t.lastJobState = a.state, y("info", "job.poll", \`\${n.slice(0, 8)}… → \${a.state}\`)), r.message && r.message !== t._lastJobMsg && (t._lastJobMsg = r.message, y("info", "job.progress", r.message)), r.message && r.message !== t._lastJobMsg && (t._lastJobMsg = r.message, y("info", "job.progress", r.message)), (a.state === "generating" || a.state === "done") && (c || s && (a.state === "generating" || a.state === "done"))) {
          t._lastShotDone = i;
          const prevIds = (t.gallery || []).map((card) => String(card?.id || ""));
          try {
            // shot_done: force gallery so new cards appear; skip full Da-relink when already linked.
            if (await ce(e, !!(c || a.state === "done")), t.selectedMessage) {
              let l = linkedCards(t.selectedMessage);
              if (a.state === "done" || !l.length) {
                // Finalize hash / first link → full provisional relink.
                try {
                  await relinkSelectedMessageHash(a.state === "done" ? "job.done" : "job.shot");
                } catch {
                }
                l = linkedCards(t.selectedMessage);
              } else if (c) {
                // Mid-job new shot: sibling rebind only (no Da / no second full paint).
                try {
                  l = await maybeRebindAndLink(t.selectedMessage, t.lastScope) || l;
                } catch {
                }
              }
`;
const VENDOR_INLINE_POLL_REFRESH_NEEDLE =
  `          if (idsChanged) {
            if (c) scheduleOverlayPlace(120);
            await onSelectionChanged("content");
          } else if (t.galleryUi?.paintStatus) await t.galleryUi.paintStatus();
          else await onSelectionChanged("chrome");
        } else if (s || a.state === "generating" || a.state === "tagging" || a.state === "queued") {
          if (t.galleryUi?.paintStatus) await t.galleryUi.paintStatus();
          else await onSelectionChanged("chrome");
        }`;
const VENDOR_INLINE_POLL_REFRESH_PATCH =
  `          if (idsChanged) {
            if (c) scheduleOverlayPlace(120);
            await onSelectionChanged("content");
          } else if (t.galleryUi?.paintStatus) await t.galleryUi.paintStatus();
          else await onSelectionChanged("chrome");
          // Inject only after hash-linked cards change (not bare shot_done).
          if (t.backendSettings?.card?.inline_chat_images === !0) {
            let linkedChanged = !1;
            try {
              const linkedNow = t.selectedMessage ? linkedCards(t.selectedMessage) : [];
              const linkedIds = linkedNow.map((card) => String(card?.id || "")).filter(Boolean).sort().join("|");
              linkedChanged = linkedIds !== String(t._inlineLinkedIds || "");
              if (linkedChanged) t._inlineLinkedIds = linkedIds;
            } catch {
            }
            if (idsChanged || linkedChanged) {
              try {
                await refreshSelectedInlineImages();
              } catch {
              }
            }
          }
        } else if (s || a.state === "generating" || a.state === "tagging" || a.state === "queued") {
          if (t.galleryUi?.paintStatus) await t.galleryUi.paintStatus();
          else await onSelectionChanged("chrome");
          // Pending spinners only — before any card is hash-linked yet.
          if (a.state === "generating" && t.backendSettings?.card?.inline_chat_images === !0 && Array.isArray(t._inlinePending) && t._inlinePending.length) {
            const linkedN = t.selectedMessage ? linkedCards(t.selectedMessage).length : 0;
            if (!linkedN) {
              try {
                await refreshSelectedInlineImages();
              } catch {
              }
            }
          }
        }`;

/**
 * Auto-gen (Ka): while selected bubble text is still streaming/changing, wait
 * until DOM text is quiet for 0.5s, then generate. Resamples DOM on timer fire.
 */
const VENDOR_STREAM_SETTLE_KA_NEEDLE =
  `  async function Ka(e, n) {
    if (!e || e.length < 8 || t.jobsInFlight.has(n) || !(await ve()).enabled) return;
    if (ge(n).length) return;
    try {
      await le();
    } catch {
    }
    const o = t.backendSettings?.card || {};
    if (o.power === !1 || o.execute === "manual") return;
    const a = await Z({ useOverride: !1 }).catch(() => null);
    if (!a || a.charIndex < 0) return;
    const rebound = await maybeRebindAndLink({
      hash: n,
      text: e,
      characterId: t.selectedMessage?.characterId || a.characterId,
      chatId: t.selectedMessage?.chatId || a.chatId,
      sessionId: t.selectedMessage?.sessionId || a.sessionId,
      chatIndex: t.selectedMessage?.chatIndex ?? -1,
      messageIndex: t.selectedMessage?.chatIndex ?? -1,
      role: t.selectedMessage?.role || "char"
    }, a);
    if (rebound.length) return y("info", "overlay.generate.skip", \`rebound hash=\${n.slice(0, 8)} cards=\${rebound.length}\`);
    y("info", "overlay.generate", \`hash=\${n.slice(0, 8)} chars=\${e.length} session=\${(a.sessionId || "").slice(-8)}\`), await Be(a, e, !1);
  }`;
const VENDOR_STREAM_SETTLE_KA_PATCH =
  `  async function Ka(e, n) {
    if (!e || e.length <= 30 || t.jobsInFlight.has(n) || !(await ve()).enabled) return;
    if (ge(n).length) return;
    try {
      await le();
    } catch {
    }
    const o = t.backendSettings?.card || {};
    if (o.power === !1 || o.execute === "manual") return;
    // Streaming lock: selected DOM text still changing → wait 0.5s quiet, then retry.
    const STREAM_SETTLE_MS = 5e2;
    const textNow = String(e || "");
    const lock = t._streamSettle || (t._streamSettle = { hash: "", text: "", changedAt: 0, timer: null, gen: 0 });
    if (lock.hash !== n || lock.text !== textNow) {
      lock.hash = n;
      lock.text = textNow;
      lock.changedAt = Date.now();
      lock.gen = (lock.gen || 0) + 1;
      if (lock.timer) {
        clearTimeout(lock.timer);
        lock.timer = null;
      }
    }
    const quietFor = Date.now() - (lock.changedAt || 0);
    if (quietFor < STREAM_SETTLE_MS) {
      const wait = Math.max(50, STREAM_SETTLE_MS - quietFor);
      if (!lock.timer) {
        const gen = lock.gen;
        lock.timer = setTimeout(() => {
          lock.timer = null;
          if (gen !== lock.gen) return;
          (async () => {
            let fresh = lock.text;
            try {
              const sel = t.selectedMessage;
              if (sel && String(sel.hash || "") === String(n)) {
                const els = t._msgElsCache?.els;
                const el = Number.isFinite(Number(sel.domIndex)) ? els?.[sel.domIndex] : null;
                if (el) {
                  let raw = "";
                  try {
                    if (typeof el.getInnerHTML == "function") {
                      const html = String(await el.getInnerHTML() || "");
                      raw = typeof ln == "function" ? ln(html) : html;
                    } else if (typeof el.innerText == "function") raw = String(await el.innerText() || "");
                    else if (typeof el.textContent == "function") raw = String(await el.textContent() || "");
                  } catch {
                    raw = "";
                  }
                  fresh = w(raw, 1e5) || String(sel.text || "") || fresh;
                } else fresh = String(sel.text || "") || fresh;
              }
            } catch {
            }
            await Ka(fresh, n);
          })().catch(() => {
          });
        }, wait);
      }
      y("info", "overlay.generate.stream_wait", \`hash=\${String(n).slice(0, 8)} quiet=\${Math.round(quietFor)}ms need=\${STREAM_SETTLE_MS}ms chars=\${textNow.length}\`);
      return;
    }
    const a = await Z({ useOverride: !1 }).catch(() => null);
    if (!a || a.charIndex < 0) return;
    const rebound = await maybeRebindAndLink({
      hash: n,
      text: e,
      characterId: t.selectedMessage?.characterId || a.characterId,
      chatId: t.selectedMessage?.chatId || a.chatId,
      sessionId: t.selectedMessage?.sessionId || a.sessionId,
      chatIndex: t.selectedMessage?.chatIndex ?? -1,
      messageIndex: t.selectedMessage?.chatIndex ?? -1,
      role: t.selectedMessage?.role || "char"
    }, a);
    if (rebound.length) return y("info", "overlay.generate.skip", \`rebound hash=\${n.slice(0, 8)} cards=\${rebound.length}\`);
    // Skip duplicate gen: same-turn job still running, or gallery already has that turn's cards.
    const turn = {
      characterId: t.selectedMessage?.characterId || a.characterId || "",
      chatId: t.selectedMessage?.chatId || a.chatId || "",
      sessionId: t.selectedMessage?.sessionId || a.sessionId || "",
      messageIndex: Number(t.selectedMessage?.chatIndex ?? -1),
      role: t.selectedMessage?.role || "char"
    };
    try {
      const busy = await K("/v1/jobs/busy-message", {
        method: "POST",
        body: {
          session_id: turn.sessionId || a.sessionId || "",
          character_id: turn.characterId || "",
          chat_id: turn.chatId || "",
          message_index: turn.messageIndex,
          role: turn.role || "char"
        }
      });
      if (busy?.busy) return y("info", "overlay.generate.skip", \`busy_job=\${String(busy.job_id || "").slice(0, 8)} hash=\${n.slice(0, 8)}\`);
    } catch {
    }
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    const sameTurn = typeof VC?.findCardsForMessageIdentity == "function"
      ? VC.findCardsForMessageIdentity(Array.isArray(t.gallery) ? t.gallery : [], turn)
      : [];
    if (sameTurn.length) return y("info", "overlay.generate.skip", \`same_turn_cards=\${sameTurn.length} hash=\${n.slice(0, 8)}\`);
    y("info", "overlay.generate", \`hash=\${n.slice(0, 8)} chars=\${e.length} session=\${(a.sessionId || "").slice(-8)}\`), await Be(a, e, !1);
  }`;

/**
 * "응답 후 자동 생성": afterRequest when the reply finishes.
 * chat/script output listeners only relink message hashes (no auto-gen).
 */
const VENDOR_AFTER_REPLY_FN_NEEDLE =
  `  async function _t(e, n = "") {
    try {
      const o = await ve();
      if (!o.enabled)
        return y("info", "afterRequest.skip", "plugin disabled"), e;
      const a = w(e, 5e4);
      if (!a || a.length < 8)
        return y("info", "afterRequest.skip", "text too short"), e;
      const r = await Z({ useOverride: !1 });
      if (!r || r.charIndex < 0)
        return y("warn", "afterRequest.skip", "no scope"), e;
      try {
        await le();
      } catch {
      }
      try {
        if (!t.galleryUi?.root || !t.overlayUi?.root) await it();
      } catch {
      }
      const i = t.backendSettings?.card || {};
      if (i.power === !1) return y("info", "afterRequest.skip", "power off"), e;
      if (i.execute === "manual") return y("info", "afterRequest.skip", "execute=manual"), e;
      if (!i.auto_gen_on_reply) return y("info", "afterRequest.skip", "reply-auto-gen-off"), e;
      y("info", "afterRequest.gen", \`chars=\${a.length} session=\${(r.sessionId || "").slice(-8)}\`);
      await Be(r, a, !1);
      return e;
    } catch (o) {
      y("error", "afterRequest.fail", o?.message || o);
    }
    return e;
  }`;
const VENDOR_AFTER_REPLY_FN_PATCH =
  `  async function chatIsStreaming() {
    try {
      const r = await Za();
      const ch = r?.chat;
      return !!(ch && (ch.isStreaming === !0 || ch.is_streaming === !0));
    } catch {
      return !1;
    }
  }
  function stopScriptDomQuietWatcher() {
    if (t._scriptDomQuietTimer) {
      clearInterval(t._scriptDomQuietTimer);
      t._scriptDomQuietTimer = null;
    }
    t._scriptDomSnap = null;
    t._scriptDomSnapReady = !1;
  }
  async function peekNewestBubbleText() {
    try {
      const doc = await ue().catch(() => t.hostDoc);
      if (!doc) return "";
      const els = await getCachedMsgEls(doc);
      if (!els?.length) return "";
      return w(await De(els[0]), 5e4);
    } catch {
      return "";
    }
  }
  function ensureScriptDomQuietWatcher() {
    if (t._scriptDomQuietTimer) return;
    t._scriptDomSnap = null;
    t._scriptDomSnapReady = !1;
    t._scriptDomQuietTimer = setInterval(() => {
      if (!t._scriptStreaming || t._afterGenRunning) {
        stopScriptDomQuietWatcher();
        return;
      }
      (async () => {
        if (!t._scriptStreaming || t._afterGenRunning) return;
        const now = await peekNewestBubbleText();
        if (!t._scriptStreaming || t._afterGenRunning) return;
        if (!t._scriptDomSnapReady) {
          t._scriptDomSnap = now;
          t._scriptDomSnapReady = !0;
          return;
        }
        if (now !== String(t._scriptDomSnap || "")) {
          t._scriptDomSnap = now;
          y("info", "scriptOutput.domQuiet", "DOM changed while streaming — keep watching");
          return;
        }
        if (!now || now.length < 30) return;
        y("info", "scriptOutput.domQuiet5", "DOM stable 5s while streaming → gen");
        t._scriptStreaming = !1;
        stopScriptDomQuietWatcher();
        if (t._scriptQuietTimer) {
          clearTimeout(t._scriptQuietTimer);
          t._scriptQuietTimer = null;
        }
        await runAutoGenFromDom("scriptOutput.domQuiet5");
      })().catch((err) => {
        y("error", "scriptOutput.domQuiet.fail", err?.message || err);
      });
    }, 5e3);
  }
  // Reply auto-gen: click-select newest char bubble so Da runs Ka (not provisional).
  async function runAutoGenFromDom(source) {
    if (t._afterGenRunning) {
      y("info", "afterReply.skip", \`\${source} already running\`);
      return;
    }
    t._afterGenRunning = !0;
    stopScriptDomQuietWatcher();
    t._scriptStreaming = !1;
    if (t._afterGenTimer) {
      clearTimeout(t._afterGenTimer);
      t._afterGenTimer = null;
    }
    t._afterGenGen = (t._afterGenGen || 0) + 1;
    try {
      const card = t.backendSettings?.card || {};
      if (card.power === !1 || !card.auto_gen_on_reply) {
        y("info", "afterReply.skip", "toggled-off");
        return;
      }
      if (card.execute === "manual") {
        y("info", "afterReply.skip", "execute=manual");
        return;
      }
      const o = await ve();
      if (!o.enabled) return y("info", "afterReply.skip", "plugin disabled");
      const waitStream = source !== "scriptOutput.domQuiet5";
      if (waitStream) {
        let waited = 0;
        while (await chatIsStreaming()) {
          if (waited >= 2e4) {
            y("info", "afterReply.skip", \`\${source} still streaming\`);
            return;
          }
          y("info", "afterReply.wait", \`\${source} isStreaming\`);
          await new Promise((res) => setTimeout(res, 4e2));
          waited += 4e2;
        }
      }
      try {
        await le();
      } catch {
      }
      try {
        if (!t.galleryUi?.root || !t.overlayUi?.root) await it();
      } catch {
      }
      const doc = await ue().catch(() => t.hostDoc);
      if (!doc) return y("warn", "afterReply.skip", "no host doc");
      t._msgElsCache = null;
      const els = await getCachedMsgEls(doc);
      if (!els?.length) return y("warn", "afterReply.skip", "no message elements");
      // Newest-first DOM: pick first char bubble (skip user). Da(click) runs Ka when no image.
      const max = Math.min(els.length, 8);
      let picked = -1;
      for (let i = 0; i < max; i++) {
        y("info", "afterReply.select", \`src=\${source} try DOM#\${i}/\${els.length}\`);
        await Da(i, els, { source: "click" });
        if (isSelectedCharRole(t.selectedMessage?.role)) {
          picked = i;
          y("info", "afterReply.select", \`src=\${source} click DOM#\${i} role=\${t.selectedMessage?.role || "-"} hash=\${String(t.selectedMessage?.hash || "").slice(0, 8)}\`);
          break;
        }
      }
      if (picked < 0) y("info", "afterReply.skip", \`\${source} no char bubble near DOM head\`);
    } finally {
      t._afterGenRunning = !1;
    }
  }
  async function scheduleAutoGenOnReply(source, textHint) {
    const hint = w(textHint, 5e4);
    const AFTER_GEN_DELAY_MS = 5e2;
    if (t._afterGenTimer) {
      clearTimeout(t._afterGenTimer);
      t._afterGenTimer = null;
    }
    t._afterGenGen = (t._afterGenGen || 0) + 1;
    const gen = t._afterGenGen;
    stopScriptDomQuietWatcher();
    t._scriptStreaming = !1;
    y("info", "afterReply.schedule", \`src=\${source} delay=\${AFTER_GEN_DELAY_MS}ms hint=\${hint ? hint.length : "?"}\`);
    t._afterGenTimer = setTimeout(() => {
      t._afterGenTimer = null;
      if (gen !== t._afterGenGen) return;
      runAutoGenFromDom(source).catch((err) => {
        y("error", "afterReply.fail", err?.message || err);
      });
    }, AFTER_GEN_DELAY_MS);
  }
  // Streaming finish / chat output / afterRequest → rebind selected msg hash.
  // Independent of auto_gen_on_reply — fixes "must click away and back to see images".
  async function relinkSelectedMessageHash(source) {
    if (t._hashRelinkRunning) {
      t._hashRelinkQueued = source;
      return;
    }
    t._hashRelinkRunning = !0;
    try {
      const o = await ve();
      if (!o.enabled) return;
      if (!t.selectedMessage) return;
      const doc = await ue().catch(() => t.hostDoc);
      if (!doc) return;
      t._msgElsCache = null;
      const els = await getCachedMsgEls(doc);
      if (!els?.length) return;
      // Reply hooks: always newest DOM#0 (do not keep a stale user selection).
      const replySrc = source === "scriptOutput" || source === "chatOutput" || source === "afterRequest";
      let idx = replySrc ? 0 : Number(t.selectedMessage.domIndex);
      if (!Number.isFinite(idx) || idx < 0 || idx >= els.length) idx = 0;
      await Da(idx, els, { source: "provisional" });
      const msg = t.selectedMessage;
      if (!msg?.hash) return;
      const scope = t.lastScope || await Z({ useOverride: !1 }).catch(() => null);
      let linked = [];
      try {
        linked = await maybeRebindAndLink(msg, scope) || [];
      } catch {
        linked = [];
      }
      if (!linked.length) {
        try {
          linked = linkedCards(msg) || [];
        } catch {
          linked = [];
        }
      }
      msg.hasImage = linked.length > 0;
      msg.cardCount = linked.length;
      msg.paragraphsWithImages = [...new Set(linked.map((C) => C.paragraph))].sort((C, S) => Number(C) - Number(S));
      msg.matchMode = linked.length ? "hash" : "none";
      if (!linked.length) {
        y("info", "hashRelink.none", \`src=\${source} hash=\${String(msg.hash || "").slice(0, 8)}\`);
        return;
      }
      t.lastImagedMessage = {
        hash: msg.hash,
        chatIndex: msg.chatIndex,
        messageIndex: msg.messageIndex,
        sessionId: msg.sessionId,
        domIndex: msg.domIndex
      };
      try {
        await ce(msg.sessionId || scope?.sessionId || "");
      } catch {
      }
      scheduleOverlayPlace(80);
      await onSelectionChanged("content");
      try {
        await refreshSelectedInlineImages();
      } catch {
      }
      y("info", "hashRelink.ok", \`src=\${source} cards=\${linked.length} hash=\${String(msg.hash || "").slice(0, 8)}\`);
    } finally {
      t._hashRelinkRunning = !1;
      if (t._hashRelinkQueued) {
        const q = t._hashRelinkQueued;
        t._hashRelinkQueued = null;
        relinkSelectedMessageHash(q).catch((err) => {
          y("error", "hashRelink.fail", err?.message || err);
        });
      }
    }
  }
  async function optimisticStopJobs() {
    // Lag-free: clear UI busy immediately; backend soft-stops without aborting in-flight work.
    t._rerollStopRequested = !0;
    try {
      if (t.pollTimer) clearInterval(t.pollTimer), t.pollTimer = null;
    } catch {
    }
    try {
      t.jobsInFlight && typeof t.jobsInFlight.clear == "function" && t.jobsInFlight.clear();
    } catch {
    }
    t.jobProgress = {
      state: "cancelled",
      progress: Number(t.jobProgress?.progress) || 0,
      message: "사용자 중단",
      jobId: t.jobProgress?.jobId || ""
    };
    try {
      if (t.galleryUi?.paintStatus) await t.galleryUi.paintStatus();
      else await onSelectionChanged("chrome");
    } catch {
    }
    setTimeout(() => {
      t.jobProgress = null;
      Se().catch(() => {
      });
    }, 1200);
    const sid = t.lastScope?.sessionId || t.selectedMessage?.sessionId || "";
    K("/v1/jobs/stop", {
      method: "POST",
      body: {
        session_id: sid
      }
    }, 8e3).then((ret) => {
      y("info", "job.stop", \`n=\${ret?.stopped || 0} reroll=\${ret?.reroll_stop ? 1 : 0} session=\${String(sid).slice(-8)}\`);
    }).catch((err) => {
      y("warn", "job.stop.fail", err?.message || err);
    });
  }
  function scheduleHashRelinkAfterReply(source) {
    const RELINK_MS = 5e2;
    if (t._hashRelinkTimer) {
      clearTimeout(t._hashRelinkTimer);
      t._hashRelinkTimer = null;
    }
    t._hashRelinkGen = (t._hashRelinkGen || 0) + 1;
    const gen = t._hashRelinkGen;
    t._hashRelinkTimer = setTimeout(() => {
      t._hashRelinkTimer = null;
      if (gen !== t._hashRelinkGen) return;
      relinkSelectedMessageHash(source).catch((err) => {
        y("error", "hashRelink.fail", err?.message || err);
      });
    }, RELINK_MS);
  }
  async function onChatOutput(arg) {
    try {
      const o = await ve();
      if (!o.enabled) return;
      const idx = Number(arg?.messageIndex);
      const msgs = arg?.chat?.message;
      const msg = Number.isFinite(idx) && idx >= 0 && Array.isArray(msgs) ? msgs[idx] : null;
      const text = w(msg?.data ?? msg?.content ?? "", 5e4);
      if (text && text.length > 8) scheduleHashRelinkAfterReply("chatOutput");
    } catch (err) {
      y("error", "chatOutput.fail", err?.message || err);
    }
  }
  // Streaming chunks: hash relink only. Quiet end is fallback auto-gen if afterRequest never fires.
  async function onScriptOutput(content) {
    try {
      const o = await ve();
      if (!o.enabled) return content;
      const text = w(content, 5e4);
      if (text && text.length > 8) scheduleHashRelinkAfterReply("scriptOutput");
      const card = t.backendSettings?.card || {};
      if (card.power === !1 || !card.auto_gen_on_reply || card.execute === "manual") return content;
      if (!text || text.length <= 30) return content;
      t._scriptStreaming = !0;
      ensureScriptDomQuietWatcher();
      if (t._scriptQuietTimer) clearTimeout(t._scriptQuietTimer);
      t._scriptQuietTimer = setTimeout(() => {
        t._scriptQuietTimer = null;
        if (t._afterGenRunning || t._afterGenTimer) return;
        scheduleAutoGenOnReply("scriptOutput.quiet", text);
      }, 8e2);
    } catch (err) {
      y("error", "scriptOutput.fail", err?.message || err);
    }
    return content;
  }
  async function _t(e, n = "") {
    try {
      // Primary chat only — ignore auxiliary modelType (settings/workspace/prompts/…).
      const modelType = String(n ?? "").trim().toLowerCase();
      if (modelType && modelType !== "model") {
        return y("info", "afterRequest.skip", \`auxiliary modelType=\${modelType}\`), e;
      }
      const o = await ve();
      if (!o.enabled)
        return y("info", "afterRequest.skip", "plugin disabled"), e;
      const a = w(e, 5e4);
      if (a && a.length > 8) scheduleHashRelinkAfterReply("afterRequest");
      if (!a || a.length <= 30)
        return y("info", "afterRequest.skip", "text too short"), e;
      const i = t.backendSettings?.card || {};
      if (i.power === !1) return y("info", "afterRequest.skip", "power off"), e;
      if (i.execute === "manual") return y("info", "afterRequest.skip", "execute=manual"), e;
      if (!i.auto_gen_on_reply) return y("info", "afterRequest.skip", "reply-auto-gen-off"), e;
      await scheduleAutoGenOnReply("afterRequest", a);
      return e;
    } catch (o) {
      y("error", "afterRequest.fail", o?.message || o);
    }
    return e;
  }`;

const VENDOR_AFTER_REQUEST_HELP_NEEDLE =
  `"nx-auto-gen-reply": { title: "응답 후 자동 생성", body: "AI 답변이 끝나면 메시지를 클릭하지 않아도 이미지를 만듭니다. 이미 이미지가 있으면 건너뜁니다(덮어쓰지 않음). Power OFF이거나 발동이 수동일 때는 동작하지 않습니다." },`;
const VENDOR_AFTER_REQUEST_HELP_PATCH =
  `"nx-auto-gen-reply": { title: "응답 후 자동 생성", body: "트랙1: 주 채팅(model) afterRequest 후 0.5초 뒤 한 번 생성. 트랙2: 스트리밍 중 말풍선 글자가 5초 동안 안 바뀌고 30자 이상이면 같은 생성. 이미 생성 중이면 뒤는 스킵. 보조 모델·유저 말·이미 이미지·Power/수동/토글 OFF는 스킵." },`;

const VENDOR_CHAT_OUTPUT_BOOT_NEEDLE =
  `      if (typeof k.addRisuReplacer != "function") throw new Error("addRisuReplacer unavailable");
      await k.addRisuReplacer("afterRequest", _t), t.replacerReady = !0;`;
const VENDOR_CHAT_OUTPUT_BOOT_PATCH =
  `      t._chatOutputReady = !1;
      t._scriptOutputReady = !1;
      if (typeof k.addRisuChatListener == "function") {
        try {
          await k.addRisuChatListener("output", onChatOutput);
          t._chatOutputReady = !0;
          y("info", "chatOutput.ready", "output listener on");
        } catch (err) {
          y("warn", "chatOutput.init", z(err?.message || err));
        }
      } else {
        y("info", "chatOutput.skip", "addRisuChatListener unavailable");
      }
      if (typeof k.addRisuScriptHandler == "function") {
        try {
          await k.addRisuScriptHandler("output", onScriptOutput);
          t._scriptOutputReady = !0;
          y("info", "scriptOutput.ready", "output listener (hash relink + stream-end + DOM 5s)");
        } catch (err) {
          y("warn", "scriptOutput.init", z(err?.message || err));
        }
      } else {
        y("info", "scriptOutput.skip", "addRisuScriptHandler unavailable");
      }
      if (typeof k.addRisuReplacer != "function") throw new Error("addRisuReplacer unavailable");
      await k.addRisuReplacer("afterRequest", _t), t.replacerReady = !0;`;

const VENDOR_CHAT_OUTPUT_UNLOAD_NEEDLE =
  `await D("removeAfter", () => k.removeRisuReplacer?.("afterRequest", _t), null);`;
const VENDOR_CHAT_OUTPUT_UNLOAD_PATCH =
  `await D("removeScriptOutput", () => t._scriptOutputReady ? k.removeRisuScriptHandler?.("output", onScriptOutput) : null, null), await D("removeChatOutput", () => t._chatOutputReady ? k.removeRisuChatListener?.("output", onChatOutput) : null, null), await D("removeAfter", () => k.removeRisuReplacer?.("afterRequest", _t), null);`;

/**
 * On select/rebind: retarget in-flight job save-hash when finished DOM matches (≥60%).
 * Busy lock key stays on the original streaming hash.
 *
 * Do NOT early-return when some cards are already on the new hash — mid-job
 * siblings still on the streaming hash must be rebound first, then linkedCards
 * (caller paints after that). Returning early left late shots on the old hash
 * until a manual deselect/reselect.
 */
const VENDOR_REBIND_RETARGET_NEEDLE =
  `  async function maybeRebindAndLink(message, scope = null) {
    if (!message?.hash) return linkedCards(message);
    let linked = linkedCards(message);
    if (linked.length) return linked;
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    if (typeof VC?.findHashRebindCandidates != "function" || !message.text) return [];
    const sc = scope || t.lastScope || {};
    const candidates = VC.findHashRebindCandidates(t.gallery || [], {
      newHash: message.hash,
      text: message.text,
      characterId: message.characterId || sc.characterId || "",
      chatId: message.chatId || sc.chatId || "",
      sessionId: message.sessionId || sc.sessionId || "",
      messageIndex: Number(message.chatIndex ?? message.messageIndex ?? -1),
      role: message.role || ""
    });
    if (!candidates.length) return [];
    try {
      const sid = message.sessionId || sc.sessionId || "";
      await K("/v1/gallery/rebind-hash", {
        method: "POST",
        body: {
          session_id: sid,
          card_ids: candidates.map((c) => c.id).filter(Boolean),
          to_hash: message.hash,
          assistant_preview: message.text || ""
        }
      }, 15e3);
      if (sid) await ce(sid, !0);
      y("info", "gallery.rebind", \`n=\${candidates.length} hash=\${String(message.hash).slice(0, 8)} msg#\${message.chatIndex ?? "?"}\`);
    } catch (err) {
      return y("warn", "gallery.rebind.fail", err?.message || err), [];
    }
    return linkedCards(message);
  }`;
const VENDOR_REBIND_RETARGET_PATCH =
  `  async function maybeRebindAndLink(message, scope = null) {
    if (!message?.hash) return linkedCards(message);
    const sc = scope || t.lastScope || {};
    const sid = message.sessionId || sc.sessionId || "";
    try {
      if (sid && message.text) {
        const ret = await K("/v1/jobs/retarget-hash", {
          method: "POST",
          body: {
            session_id: sid,
            character_id: message.characterId || sc.characterId || "",
            chat_id: message.chatId || sc.chatId || "",
            message_index: Number(message.chatIndex ?? message.messageIndex ?? -1),
            role: message.role || "",
            to_hash: message.hash,
            assistant_preview: message.text || ""
          }
        }, 8e3);
        if (ret?.retargeted) {
          y("info", "job.retarget", \`job=\${String(ret.job_id || "").slice(0, 8)} hash=\${String(message.hash).slice(0, 8)} rebound=\${ret.rebound || 0}\`);
          // Retarget may rewrite published card hashes — refresh before sibling scan.
          if (Number(ret.rebound || 0) > 0) {
            try {
              await ce(sid, !0);
            } catch {
            }
          }
        }
      }
    } catch {
    }
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    // Always scan siblings still on the old streaming hash (partial linked is OK).
    if (typeof VC?.findHashRebindCandidates == "function" && message.text) {
      const candidates = VC.findHashRebindCandidates(t.gallery || [], {
        newHash: message.hash,
        text: message.text,
        characterId: message.characterId || sc.characterId || "",
        chatId: message.chatId || sc.chatId || "",
        sessionId: sid,
        messageIndex: Number(message.chatIndex ?? message.messageIndex ?? -1),
        role: message.role || ""
      });
      if (candidates.length) {
        try {
          await K("/v1/gallery/rebind-hash", {
            method: "POST",
            body: {
              session_id: sid,
              card_ids: candidates.map((c) => c.id).filter(Boolean),
              to_hash: message.hash,
              assistant_preview: message.text || ""
            }
          }, 15e3);
          if (sid) await ce(sid, !0);
          y("info", "gallery.rebind", \`n=\${candidates.length} hash=\${String(message.hash).slice(0, 8)} msg#\${message.chatIndex ?? "?"}\`);
        } catch (err) {
          y("warn", "gallery.rebind.fail", err?.message || err);
        }
      }
    }
    // Paint only after sibling hashes are attached (or none were eligible).
    return linkedCards(message);
  }`;

/**
 * Chat switch: scroll/text "same DOM" early-return ignored sessionId, so a new
 * character chat with identical greeting text kept the old gallery until a
 * manual deselect/reselect. Also commit scope faster when live indices change.
 */
const VENDOR_SELECT_SAME_NEEDLE =
  `if ((source === "scroll" || source === "text" || source === "provisional") && t.selectedMessage && Number(t.selectedMessage.domIndex) === Number(e) && t.selectedMessage.selectSource === source && t.selectedMessage.hash === c) return !0;`;
const VENDOR_SELECT_SAME_PATCH =
  `if ((source === "scroll" || source === "text" || source === "provisional") && t.selectedMessage && Number(t.selectedMessage.domIndex) === Number(e) && t.selectedMessage.selectSource === source && t.selectedMessage.hash === c && !t.pendingSessionId && t.selectedMessage.sessionId && t.lastScope?.sessionId && t.selectedMessage.sessionId === t.lastScope.sessionId) return !0;`;

/**
 * Scroll DOM select skipped gallery fetch (`ce`). Empty `t.gallery` → linkedCards=[] →
 * viewer stuck on placeholder; later click on same hash also skipped content paint.
 */
const VENDOR_SCROLL_GALLERY_NEW_NEEDLE = `    if (source !== "scroll") {
      try {
        await ce(r.sessionId, !0);
      } catch {
      }
    }
    u = linkedCards(t.selectedMessage);
    if (!u.length && source !== "scroll") {
      try {
        u = await maybeRebindAndLink(t.selectedMessage, r);
      } catch {
      }
    }
    t.selectedMessage.hasImage = u.length > 0, t.selectedMessage.cardCount = u.length, t.selectedMessage.paragraphsWithImages = [...new Set(u.map((C) => C.paragraph))].sort((C, S) => Number(C) - Number(S)), t.selectedMessage.matchMode = u.length ? "hash" : "none";
    if (u.length) {
      t.lastImagedMessage = {
        hash: t.selectedMessage.hash,
        chatIndex: t.selectedMessage.chatIndex,
        messageIndex: t.selectedMessage.messageIndex,
        sessionId: t.selectedMessage.sessionId,
        domIndex: t.selectedMessage.domIndex
      };
    } else if (source !== "scroll") {
      // No hash cards → do not keep another message's images as this selection.
      t.lastImagedMessage = null;
    }
    if (source === "scroll") {
      // Keep previous sticky markers when the new message has no images (avoids wipe + gallery thrash).
      if (u.length) {
        if (t.overlayUi) {
        t.overlayUi.pinTarget = o, t.overlayUi._pinDomIndex = e;
        try {
          const doc = t.overlayUi.doc || t.hostDoc;
          const els = t._msgElsCache?.doc === doc ? t._msgElsCache.els : null;
          if (doc && els) rememberNearbyMsgDoms(doc, els, e);
        } catch {
        }
      }
        scheduleOverlayPlace(40), await onSelectionChanged("content");
      } else scheduleStickySync(), await onSelectionChanged("chrome");
      return !0;
    }`;

const VENDOR_SCROLL_GALLERY_NEW_PATCH = `    {
      const galleryStale = !Array.isArray(t.gallery) || !t.gallery.length || t._galleryCache?.sessionId !== r.sessionId;
      if (source !== "scroll" || galleryStale) {
        try {
          await ce(r.sessionId, galleryStale || source !== "scroll");
        } catch {
        }
      }
    }
    u = linkedCards(t.selectedMessage);
    if (!u.length) {
      try {
        u = await maybeRebindAndLink(t.selectedMessage, r);
      } catch {
      }
    }
    t.selectedMessage.hasImage = u.length > 0, t.selectedMessage.cardCount = u.length, t.selectedMessage.paragraphsWithImages = [...new Set(u.map((C) => C.paragraph))].sort((C, S) => Number(C) - Number(S)), t.selectedMessage.matchMode = u.length ? "hash" : "none";
    if (u.length) {
      t.lastImagedMessage = {
        hash: t.selectedMessage.hash,
        chatIndex: t.selectedMessage.chatIndex,
        messageIndex: t.selectedMessage.messageIndex,
        sessionId: t.selectedMessage.sessionId,
        domIndex: t.selectedMessage.domIndex
      };
    } else if (source !== "scroll") {
      // No hash cards → do not keep another message's images as this selection.
      t.lastImagedMessage = null;
    }
    if (source === "scroll") {
      if (u.length) {
        if (t.overlayUi) {
        t.overlayUi.pinTarget = o, t.overlayUi._pinDomIndex = e;
        try {
          const doc = t.overlayUi.doc || t.hostDoc;
          const els = t._msgElsCache?.doc === doc ? t._msgElsCache.els : null;
          if (doc && els) rememberNearbyMsgDoms(doc, els, e);
        } catch {
        }
      }
        scheduleOverlayPlace(40), await onSelectionChanged("content");
      } else scheduleStickySync(), await onSelectionChanged("content");
      try {
        await refreshSelectedInlineImages();
      } catch {
      }
      return !0;
    }`;

const VENDOR_SCROLL_GALLERY_SAME_NEEDLE = `      if (source !== "scroll") {
        try {
          await ce(r.sessionId);
        } catch {
        }
      }
      let linked = linkedCards(t.selectedMessage);`;

const VENDOR_SCROLL_GALLERY_SAME_PATCH = `      {
        const galleryStale = !Array.isArray(t.gallery) || !t.gallery.length || t._galleryCache?.sessionId !== r.sessionId;
        if (source !== "scroll" || galleryStale) {
          try {
            await ce(r.sessionId, galleryStale);
          } catch {
          }
        }
      }
      let linked = linkedCards(t.selectedMessage);`;

const VENDOR_SCROLL_GALLERY_SAME_PAINT_NEEDLE = `        } else {
          Ce();
          if (linked.length && !(t.overlayUi?.markers?.length)) scheduleOverlayPlace(80);
        }
      }
      if (linked.length) return !0;
      if (source === "scroll" || source === "provisional") return !0;`;

const VENDOR_SCROLL_GALLERY_SAME_PAINT_PATCH = `        } else {
          Ce();
          if (linked.length && !(t.overlayUi?.markers?.length)) scheduleOverlayPlace(80);
          await onSelectionChanged("content");
        }
      }
      if (linked.length) return !0;
      if (source === "scroll" || source === "provisional") return !0;`;

const VENDOR_SCROLL_GALLERY_SAME_DOM_NEEDLE = `          linked.length ? scheduleOverlayPlace(40) : scheduleStickySync();
          await onSelectionChanged(linked.length ? "content" : "chrome");
        } else {
          Ce(), scheduleOverlayPlace(80), await onSelectionChanged("content");
        }`;

const VENDOR_SCROLL_GALLERY_SAME_DOM_PATCH = `          linked.length ? scheduleOverlayPlace(40) : scheduleStickySync();
          await onSelectionChanged("content");
        } else {
          Ce(), scheduleOverlayPlace(80), await onSelectionChanged("content");
        }`;

const VENDOR_SCOPE_POLL_NEEDLE = `n._scopeTick % 24 === 0 && !(t.jobsInFlight.size`;
// Was patched to %4 (≈1s) — that made idle scope thrash worse. Keep vendor ~6s cadence.
const VENDOR_SCOPE_POLL_PATCH = `n._scopeTick % 24 === 0 && !(t.jobsInFlight.size`;

const VENDOR_SEGMENT_CE_NEEDLE = `        n.markers?.length && Ce();
      }
    }, 250));
  }`;
const VENDOR_SEGMENT_CE_PATCH = `        // Idle: only resync sticky when reading% moved (skip no-op Ce every 250ms).
        if (n.markers?.length) {
          const read = Number(n._lastReading);
          const prev = Number(n._idleCeReading);
          const moved = !Number.isFinite(prev) || !Number.isFinite(read) || Math.abs(read - prev) >= 0.5;
          if (moved) {
            n._idleCeReading = read;
            Ce();
          }
        }
      }
    }, 400));
  }`;

const VENDOR_CE_RAF_NEEDLE = `  function Ce() {
    if (t.uiOpen) return;
    if (!t.overlayUi?.markers?.length) return;
    if (t.overlaySyncing) {
      t.overlaySyncPending = !0;
      return;
    }
    const wantFull = !!t.overlayUi._stickyWantFull;
    t.overlayUi._stickyWantFull = !1;
    t.overlaySyncing = !0, Ht({ light: !wantFull }).catch(() => {
    }).finally(() => {
      t.overlaySyncing = !1, t.overlaySyncPending && (t.overlaySyncPending = !1, Ce());
    });
  }`;
const VENDOR_CE_RAF_PATCH = `  function Ce() {
    if (t.uiOpen) return;
    if (!t.overlayUi?.markers?.length) return;
    // Coalesce bursty scroll/ancestor listeners to one sticky sync per frame.
    if (t._stickyCeRaf) {
      t._stickyCeWanted = !0;
      return;
    }
    t._stickyCeWanted = !0;
    const kick = () => {
      t._stickyCeRaf = 0;
      if (!t._stickyCeWanted) return;
      t._stickyCeWanted = !1;
      if (t.uiOpen || !t.overlayUi?.markers?.length) return;
      if (t.overlaySyncing) {
        t.overlaySyncPending = !0;
        return;
      }
      const wantFull = !!t.overlayUi._stickyWantFull;
      t.overlayUi._stickyWantFull = !1;
      t.overlaySyncing = !0, Ht({ light: !wantFull }).catch(() => {
      }).finally(() => {
        t.overlaySyncing = !1;
        if (t.overlaySyncPending) {
          t.overlaySyncPending = !1;
          Ce();
        } else if (t._stickyCeWanted) Ce();
      });
    };
    t._stickyCeRaf = typeof requestAnimationFrame == "function" ? requestAnimationFrame(kick) : (kick(), 0);
  }`;

const VENDOR_HA_ANCESTOR_NEEDLE = `    for (let i = 0; r && i < 18; i += 1) {`;
const VENDOR_HA_ANCESTOR_PATCH = `    // 18 ancestors × scroll+scrollend was a sticky thrash multiplier; chat rarely needs deeper.
    for (let i = 0; r && i < 8; i += 1) {`;

/** Overlay OFF: keep sticky sync alive; hide via 0% thumb + off-screen pin (no hideStickyMarker thrash). */
const VENDOR_NT_NEEDLE = `  function Nt() {
    // Overlay + always-on image are one setting (overlay_markers).
    return t.backendSettings?.card?.overlay_markers !== !1;
  }
  function mobilePinOn() {
    return !!t.backendSettings?.card?.mobile_toggle_pin;
  }`;
const VENDOR_NT_PATCH = `  function Nt() {
    // Always keep sticky sync / shell path ON. Visual hide is overlayVisualOn() → 0% + off-screen pin.
    return !0;
  }
  function overlayVisualOn() {
    return t.backendSettings?.card?.overlay_markers !== !1;
  }
  function mobilePinOn() {
    return overlayVisualOn() && !!t.backendSettings?.card?.mobile_toggle_pin;
  }`;

const VENDOR_PIN_OFFSCREEN_NEEDLE = `  /** Sticky pin left = viewport-width % from left (host viewport, not plugin iframe). */
  function resolvePinLeftX() {
    const VC = globalThis.__INLAY_VIEWER_CORE__, pinW = Pt, vw = viewerViewport().vw, pct = getPinXPct();
    if (typeof VC?.pinPercentToPx == "function") return VC.pinPercentToPx(pct, vw, pinW, 4);
    return Math.max(4, Math.min(vw - pinW - 4, Math.round(vw * pct / 100)));
  }
  /** Sticky pin top = viewport-height % from bottom (CSS top; host viewport). */
  function resolvePinTopY(pinSize = Pt) {
    const VC = globalThis.__INLAY_VIEWER_CORE__, vh = viewerViewport().vh, pct = getPinYPct();
    if (typeof VC?.pinPercentToPxFromBottom == "function") return VC.pinPercentToPxFromBottom(pct, vh, pinSize, 8);
    const fromBottom = Math.floor(vh * pct / 100);
    return Math.max(8, Math.min(vh - pinSize - 8, vh - fromBottom - pinSize));
  }`;
const VENDOR_PIN_OFFSCREEN_PATCH = `  /** Sticky pin left = viewport-width % from left (host viewport, not plugin iframe). */
  function resolvePinLeftX() {
    // Overlay OFF / settings / shot·char edit: park pin+arrows off-screen (opacity alone still hit-tests).
    const chromeHidden = (typeof overlayVisualOn == "function" ? !overlayVisualOn() : t.backendSettings?.card?.overlay_markers === !1)
      || !!t.uiOpen || !!t.overlayUi?._stickyEditorOpen || !!t.cardTagUi || !!t.charEditUi;
    if (chromeHidden) return -99999;
    const VC = globalThis.__INLAY_VIEWER_CORE__, pinW = Pt, vw = viewerViewport().vw, pct = getPinXPct();
    if (typeof VC?.pinPercentToPx == "function") return VC.pinPercentToPx(pct, vw, pinW, 4);
    return Math.max(4, Math.min(vw - pinW - 4, Math.round(vw * pct / 100)));
  }
  /** Sticky pin top = viewport-height % from bottom (CSS top; host viewport). */
  function resolvePinTopY(pinSize = Pt) {
    const chromeHidden = (typeof overlayVisualOn == "function" ? !overlayVisualOn() : t.backendSettings?.card?.overlay_markers === !1)
      || !!t.uiOpen || !!t.overlayUi?._stickyEditorOpen || !!t.cardTagUi || !!t.charEditUi;
    if (chromeHidden) return -99999;
    const VC = globalThis.__INLAY_VIEWER_CORE__, vh = viewerViewport().vh, pct = getPinYPct();
    if (typeof VC?.pinPercentToPxFromBottom == "function") return VC.pinPercentToPxFromBottom(pct, vh, pinSize, 8);
    const fromBottom = Math.floor(vh * pct / 100);
    return Math.max(8, Math.min(vh - pinSize - 8, vh - fromBottom - pinSize));
  }`;

/** Overlay OFF keeps Ya shell + click tracking; only hide left-line pins/thumbs. */
const VENDOR_OVERLAY_MOUNT_NEEDLE =
  `e.floating_viewer !== !1 ? await lt() : await st(), e.overlay_markers !== !1 ? await Ya() : await Wt(), e.debug_panel ? await Ba() : await ct();
    // Re-apply pin % with host viewport (plugin iframe size is tiny on boot).
    if (e.overlay_markers !== !1) {`;
const VENDOR_OVERLAY_MOUNT_PATCH =
  `e.floating_viewer !== !1 ? await lt() : await st(), await Ya(), e.debug_panel ? await Ba() : await ct();
    // Re-apply pin % with host viewport (plugin iframe size is tiny on boot).
    // Overlay toggle only hides markers — shell + click tracking stay mounted.
    if (!0) {`;

const VENDOR_OVERLAY_WATCH_NEEDLE =
  `const card = t.backendSettings?.card || {}, needViewer = card.floating_viewer !== !1, needOverlay = card.overlay_markers !== !1;`;
const VENDOR_OVERLAY_WATCH_PATCH =
  `const card = t.backendSettings?.card || {}, needViewer = card.floating_viewer !== !1, needOverlay = !0;`;

const VENDOR_OVERLAY_RETRY_NEEDLE =
  `const n = t.backendSettings?.card || {}, o = n.floating_viewer === !1 || !!t.galleryUi?.root, a = n.overlay_markers === !1 || !!t.overlayUi?.root;`;
const VENDOR_OVERLAY_RETRY_PATCH =
  `const n = t.backendSettings?.card || {}, o = n.floating_viewer === !1 || !!t.galleryUi?.root, a = !!t.overlayUi?.root;`;

const VENDOR_OVERLAY_HT_HIDE_NEEDLE = `  async function Ht(opts = {}) {
    const e = t.overlayUi;
    if (!e?.markers?.length) return;
    const light = !!opts.light && !!e.pinTarget && !!e._pinRectCache;`;
// Former early-return hideStickyMarker thrash caused lag — visual hide is 0% + off-screen pin now.
const VENDOR_OVERLAY_HT_HIDE_PATCH = `  async function Ht(opts = {}) {
    const e = t.overlayUi;
    if (!e?.markers?.length) return;
    const light = !!opts.light && !!e.pinTarget && !!e._pinRectCache;`;

const VENDOR_OVERLAY_JA_HIDE_NEEDLE = `  async function Ja() {
    if (t.uiOpen || t._hostChromeBlocked) return;
    const e = t.overlayUi;
    if (!e?.layer) return;
    const n = e.doc || await ue();
    if (!n) return;`;
const VENDOR_OVERLAY_JA_HIDE_PATCH = `  async function Ja() {
    if (t.uiOpen || t._hostChromeBlocked) return;
    const e = t.overlayUi;
    if (!e?.layer) return;
    const n = e.doc || await ue();
    if (!n) return;`;

const VENDOR_OVERLAY_HELP_NEEDLE =
  `"nx-overlay": { title: "채팅 왼쪽 줄 오버레이", body: "채팅 왼쪽에 핀과 이미지를 함께 둡니다. 스크롤하는 동안에도 지금 읽는 구간의 이미지를 계속 보여 줍니다. 짧게 누르면 이미지를 숨기고, 핀을 누르면 다시 나타납니다. 길게 누르면 크게보기와 태그·재생성·리롤·캐릭터 칩 메뉴가 열립니다." },`;
const VENDOR_OVERLAY_HELP_PATCH =
  `"nx-overlay": { title: "채팅 왼쪽 줄 오버레이", body: "채팅 왼쪽 핀·스티키 이미지를 보여 줍니다. 꺼도 내부 동기화는 유지하고, 상시 이미지 0% + 핀을 화면 밖으로 치워 가려 둡니다(꺼서 통째로 뜯으면 렉이 나서). 메시지 클릭·말풍선 삽화는 그대로입니다." },`;

/** Viewer toolbar 상시 chip: reflect overlayVisualOn (Nt always true for sync). */
const VENDOR_TOOLBAR_SANGSI_NEEDLE =
  `\`<span style="cursor:pointer;background:\${Nt() ? "#0f766e" : "#334155"};color:#fff;padding:4px 8px;border-radius:7px;font-size:11px;line-height:1">\${Nt() ? "상시ON" : "상시"}</span>\`,`;
const VENDOR_TOOLBAR_SANGSI_PATCH =
  `\`<span style="cursor:pointer;background:\${(typeof overlayVisualOn == "function" ? overlayVisualOn() : Nt()) ? "#0f766e" : "#334155"};color:#fff;padding:4px 8px;border-radius:7px;font-size:11px;line-height:1">상시</span>\`,`;

const VENDOR_TOOLBAR_SANGSI_REFRESH_NEEDLE =
  `const A = typeof k.unwarpSafeArray == "function" ? await k.unwarpSafeArray(await c.getChildren()) : [], inlineOn = Nt();`;
const VENDOR_TOOLBAR_SANGSI_REFRESH_PATCH =
  `const A = typeof k.unwarpSafeArray == "function" ? await k.unwarpSafeArray(await c.getChildren()) : [], inlineOn = typeof overlayVisualOn == "function" ? overlayVisualOn() : Nt();`;

/** Idle help panel shows release notes (hover still swaps to per-setting tips). */
const VENDOR_HEAD_HELP_DEFAULT_NEEDLE =
  `  const HEAD_HELP_DEFAULT = {
    title: "도움말",
    body: "설정에 마우스를 올리면 설명이 여기에 나타납니다."
  };`;
const VENDOR_HEAD_HELP_DEFAULT_PATCH =
  `  const HEAD_HELP_DEFAULT = {
    title: "2.3.12",
    body: "응답 후 자동 생성은 afterRequest 0.5초 한 번, 스트리밍은 말풍선 5초 안정입니다. 업데이트 내역 탭 참고."
  };`;

/** Message select gesture: options + help + save + reader. */
const VENDOR_SELECT_GESTURE_HELP_NEEDLE =
  `"nx-select-gesture": { title: "메시지 선택 동작", body: "클릭으로 고를 때만 적용됩니다. 한 번: 바로 확정. 두 번: 첫 클릭은 임시, 같은 메시지 두 번째 클릭에 확정. 스크롤·글자 드래그는 이 설정과 무관합니다." },`;
const VENDOR_SELECT_GESTURE_HELP_PATCH =
  `"nx-select-gesture": { title: "메시지 선택 동작", body: "메시지를 고르는 입력 방식입니다. 한 번 클릭 / 두 번 클릭(같은 말풍선 짧게 두 번) / 우클릭 / 길게 누르기. 스크롤·글자 드래그는 이 설정과 무관합니다." },`;

const VENDOR_SELECT_GESTURE_HTML_NEEDLE =
  `<label data-nx-help-id="nx-select-gesture"><span>메시지 선택 동작</span>
              <select id="nx-select-gesture">
                <option value="single" \${(i.message_select_gesture || "single") === "single" ? "selected" : ""}>한 번 클릭</option>
                <option value="double" \${i.message_select_gesture === "double" ? "selected" : ""}>두 번 클릭</option>
              </select>
            </label>`;
const VENDOR_SELECT_GESTURE_HTML_PATCH =
  `<label data-nx-help-id="nx-select-gesture"><span>메시지 선택 동작</span>
              <select id="nx-select-gesture">
                <option value="single" \${(i.message_select_gesture || "single") === "single" ? "selected" : ""}>한 번 클릭</option>
                <option value="double" \${i.message_select_gesture === "double" ? "selected" : ""}>두 번 클릭</option>
                <option value="context" \${i.message_select_gesture === "context" ? "selected" : ""}>우클릭</option>
                <option value="longpress" \${i.message_select_gesture === "longpress" ? "selected" : ""}>길게 누르기</option>
              </select>
            </label>`;

const VENDOR_SELECT_GESTURE_SAVE_NEEDLE =
  `message_select_gesture: N("nx-select-gesture") === "double" ? "double" : "single",`;
const VENDOR_SELECT_GESTURE_SAVE_PATCH =
  `message_select_gesture: (() => { const v = String(N("nx-select-gesture") || "single"); const VC = globalThis.__INLAY_VIEWER_CORE__; return typeof VC?.normalizeSelectionGesture == "function" ? VC.normalizeSelectionGesture(v) : v === "double" || v === "context" || v === "longpress" ? v : "single"; })(),`;

const VENDOR_SELECT_GESTURE_FN_NEEDLE =
  `  function messageSelectGesture() {
    return (t.backendSettings?.card || {}).message_select_gesture === "double" ? "double" : "single";
  }`;
const VENDOR_SELECT_GESTURE_FN_PATCH =
  `  function messageSelectGesture() {
    const raw = (t.backendSettings?.card || {}).message_select_gesture;
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    return typeof VC?.normalizeSelectionGesture == "function" ? VC.normalizeSelectionGesture(raw) : raw === "double" || raw === "context" || raw === "longpress" ? raw : "single";
  }`;

/**
 * Double: hit-test first, then time-window confirm (SafeDOM detail is unreliable).
 * Context/longpress: ignore left-click here.
 */
const VENDOR_SELECT_ONCLICK_NEEDLE =
  `onClick = async (f) => {
      if (t.uiOpen || t._hostChromeBlocked) return;
      const x = f.clientX, I = f.clientY, R = t._lastPointerGesture || pointerGesture;
      t._lastPointerGesture = null, pointerGesture = null;
      if (!R || R.marker || !R.forClick || typeof x != "number" || typeof I != "number") return;
      const g = Math.max(R.movement || 0, Math.hypot(x - R.x, I - R.y));
      if (g > 8 || await excludedMessageTarget(e, x, I)) return;
      const gesture = messageSelectGesture(), detail = Number(f.detail || 1), VC = globalThis.__INLAY_VIEWER_CORE__, resolve = VC?.resolveClickSelectionAction;
      let action = "confirm";
      if (typeof resolve == "function") {
        const decision = resolve({
          gesture,
          detail,
          pendingDomIndex: t._pendingSelectDom,
          targetDomIndex: null
        });
        if (decision.action === "ignore") return;
        action = decision.action;
      } else if (gesture === "double") {
        if (detail === 1) action = "provisional";
        else if (detail !== 2) return;
      } else if (detail !== 1) return;
      const a = await dt(await qe(e));
      if (!a.length) return;
      let r = await Oa(e, x, I, a);
      if (r === -2) return;
      r < 0 && (r = await Ra(x, I, a));
      if (r < 0) return;
      if (action === "provisional") {
        t._pendingSelectDom = r, await Da(r, a, { source: "provisional" });
        return;
      }
      t._pendingSelectDom = null, await Da(r, a, { source: "click" });
    },`;

const VENDOR_SELECT_ONCLICK_PATCH =
  `onClick = async (f) => {
      if (t.uiOpen || t._hostChromeBlocked) return;
      const x = f.clientX, I = f.clientY, R = t._lastPointerGesture || pointerGesture;
      t._lastPointerGesture = null, pointerGesture = null;
      if (!R || R.marker || !R.forClick || typeof x != "number" || typeof I != "number") return;
      const g = Math.max(R.movement || 0, Math.hypot(x - R.x, I - R.y));
      if (g > 8 || await excludedMessageTarget(e, x, I)) return;
      const gesture = messageSelectGesture();
      if (gesture === "context" || gesture === "longpress") return;
      const a = await dt(await qe(e));
      if (!a.length) return;
      let r = await Oa(e, x, I, a);
      if (r === -2) return;
      r < 0 && (r = await Ra(x, I, a));
      if (r < 0) return;
      const VC = globalThis.__INLAY_VIEWER_CORE__, resolve = VC?.resolveClickSelectionAction;
      let action = "confirm";
      if (typeof resolve == "function") {
        const decision = resolve({
          gesture,
          detail: 1,
          pendingDomIndex: t._pendingSelectDom,
          pendingAt: t._pendingSelectAt,
          targetDomIndex: r,
          now: Date.now()
        });
        if (decision.action === "ignore") return;
        action = decision.action;
      } else if (gesture === "double") {
        const now = Date.now(), win = 450;
        const pending = t._pendingSelectDom, at = Number(t._pendingSelectAt || 0);
        action = pending != null && Number(pending) === Number(r) && at && now - at <= win ? "confirm" : "provisional";
      }
      if (action === "provisional") {
        t._pendingSelectDom = r, t._pendingSelectAt = Date.now(), await Da(r, a, { source: "provisional" });
        return;
      }
      t._pendingSelectDom = null, t._pendingSelectAt = 0, await Da(r, a, { source: "click" });
    },
    onContextMenu = async (f) => {
      if (t.uiOpen || t._hostChromeBlocked) return;
      if (messageSelectGesture() !== "context") return;
      try {
        f.preventDefault?.(), f.stopPropagation?.();
      } catch {
      }
      const x = f.clientX, I = f.clientY;
      if (typeof x != "number" || typeof I != "number") return;
      if (await excludedMessageTarget(e, x, I)) return;
      t._pendingSelectDom = null, t._pendingSelectAt = 0;
      await Fa(e, x, I, { source: "click" });
    },`;

const VENDOR_SELECT_FORCLICK_NEEDLE =
  `      if (await excludedMessageTarget(e, x, I)) {
        pointerGesture = null;
        return;
      }
      pointerGesture = {
        x,
        y: I,
        movement: 0,
        marker: !1,
        forClick: clickTrackEnabled(),
        forText: textDragSelectEnabled()
      };
    }, onClick = async (f) => {`;

const VENDOR_SELECT_FORCLICK_PATCH =
  `      if (await excludedMessageTarget(e, x, I)) {
        pointerGesture = null;
        return;
      }
      const selGest = messageSelectGesture();
      if (selGest === "longpress") {
        const F = {
          x,
          y: I,
          source: "msg-select",
          pointerId: f.pointerId,
          long: !1,
          timer: null
        };
        F.timer = setTimeout(() => {
          if (mobilePress !== F) return;
          F.long = !0;
          (async () => {
            if (await excludedMessageTarget(e, F.x, F.y)) return;
            t._pendingSelectDom = null, t._pendingSelectAt = 0;
            await Fa(e, F.x, F.y, { source: "click" });
          })().catch(() => {
          });
        }, 450), mobilePress = F;
        pointerGesture = {
          x,
          y: I,
          movement: 0,
          marker: !1,
          forClick: !1,
          forText: !1
        };
        return;
      }
      pointerGesture = {
        x,
        y: I,
        movement: 0,
        marker: !1,
        forClick: clickTrackEnabled() && (selGest === "single" || selGest === "double"),
        forText: textDragSelectEnabled()
      };
    }, onClick = async (f) => {`;

const VENDOR_SELECT_BIND_NEEDLE =
  `const j = await fe(e, "pointermove", l), d = await fe(e, "pointerdown", p), U = null, clickId = await fe(e, "click", onClick), upId = await fe(e, "pointerup", onPointerUp), cancelId = await fe(e, "pointercancel", onPointerCancel), keyId = await fe(e, "keydown", async (f) => {`;
const VENDOR_SELECT_BIND_PATCH =
  `const j = await fe(e, "pointermove", l), d = await fe(e, "pointerdown", p), U = null, clickId = await fe(e, "click", onClick), ctxId = await fe(e, "contextmenu", onContextMenu), upId = await fe(e, "pointerup", onPointerUp), cancelId = await fe(e, "pointercancel", onPointerCancel), keyId = await fe(e, "keydown", async (f) => {`;

const VENDOR_SELECT_OVERLAY_NEEDLE =
  `      dblId: U,
      clickId,
      upId,`;
const VENDOR_SELECT_OVERLAY_PATCH =
  `      dblId: U,
      clickId,
      ctxId,
      upId,`;

const VENDOR_SELECT_UNBIND_NEEDLE =
  `await de(e.doc, "dblclick", e.dblId), await de(e.doc, "click", e.clickId)), e?.body && await de(e.body, "scroll", e.bodyScrollId)`;
const VENDOR_SELECT_UNBIND_PATCH =
  `await de(e.doc, "dblclick", e.dblId), await de(e.doc, "click", e.clickId), await de(e.doc, "contextmenu", e.ctxId)), e?.body && await de(e.body, "scroll", e.bodyScrollId)`;

/** Top-center progress toast: compact bar; busy stays; selection peek tight; host toast separate. */
const VENDOR_PROGRESS_TOAST_FN_NEEDLE = `  async function dismissProgressToast() {
    t.jobProgress = null;
    try {
      await Se();
    } catch {
    }
  }
  async function Se() {
    try {
      if (t.galleryUi?.paintStatus) await t.galleryUi.paintStatus();
    } catch {
    }
  }`;
const VENDOR_PROGRESS_TOAST_FN_PATCH = `  async function dismissProgressToast() {
    t.jobProgress = null;
    try {
      await Se();
    } catch {
    }
  }
  /** Progress toast root — gated by card.progress_toast. */
  const PROGRESS_TOAST_STYLE_SHOW = "position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:99999;pointer-events:auto;width:min(280px,92vw);display:block;";
  const PROGRESS_TOAST_STYLE_HIDE = "position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:99999;pointer-events:none;width:min(280px,92vw);display:none;";
  const HOST_TOAST_STYLE_SHOW = "position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:100000;pointer-events:none;width:min(280px,92vw);box-sizing:border-box;display:block;background:rgba(37,99,235,.95);color:#fff;padding:8px 14px;border-radius:8px;font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,.4);";
  const HOST_TOAST_STYLE_HIDE = "position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:100000;pointer-events:none;width:min(280px,92vw);display:none;";
  const SELECTION_TOAST_HIDE_MS = 2e3;
  function selectionToastStyle(visible, belowProgress) {
    const top = belowProgress ? 64 : 16;
    const eye = visible ? "block" : "none";
    const pe = visible ? "auto" : "none";
    return \`position:fixed;top:\${top}px;left:50%;transform:translateX(-50%);z-index:100001;pointer-events:\${pe};width:min(280px,92vw);box-sizing:border-box;display:\${eye};\`;
  }
  const PROGRESS_TOAST_HIDE_MS = 2e3;
  async function setProgressToastEye(visible, force) {
    const root = t._progressToastRoot;
    if (!root) return;
    // Never blank the job/reroll bar while a job is live (selection click / stall / timers).
    if (!visible && !force) {
      try {
        if (t.jobProgress && formatViewerJob(t.jobProgress)?.busy) return;
      } catch {
      }
    }
    t._progressToastShown = !!visible;
    try {
      if (typeof root.setStyleAttribute == "function") await root.setStyleAttribute(visible ? PROGRESS_TOAST_STYLE_SHOW : PROGRESS_TOAST_STYLE_HIDE);
    } catch {
    }
  }
  function armProgressToastEyeHide(ms) {
    const hideMs = Math.max(200, Number(ms) || PROGRESS_TOAST_HIDE_MS);
    t._progressToastArmed = !0;
    t._progressToastUntil = Date.now() + hideMs;
    if (t._progressToastHideTimer) clearTimeout(t._progressToastHideTimer);
    t._progressToastHideTimer = setTimeout(() => {
      t._progressToastHideTimer = null;
      t._progressToastArmed = !1;
      t._progressToastUntil = 0;
      setProgressToastEye(!1).catch(() => {
      });
    }, hideMs);
  }
  function clearProgressToastEyeHide() {
    if (t._progressToastHideTimer) {
      clearTimeout(t._progressToastHideTimer);
      t._progressToastHideTimer = null;
    }
    t._progressToastArmed = !1;
    t._progressToastUntil = 0;
  }
  function dismissProgressToastUi() {
    clearProgressToastEyeHide();
    t._progressToastFp = "";
    t._progressToastLastHtml = "";
    setProgressToastEye(!1, !0).catch(() => {
    });
  }
  async function destroyProgressToast() {
    clearProgressToastEyeHide();
    const root = t._progressToastRoot;
    t._progressToastRoot = null;
    t._progressToastShown = !1;
    t._progressToastFp = "";
    t._progressToastLastHtml = "";
    try {
      root && typeof root.remove == "function" && await root.remove();
    } catch {
    }
  }
  async function ensureProgressToastRoot() {
    if (t._progressToastRoot) return t._progressToastRoot;
    const doc = await ue();
    if (!doc || typeof doc.createElement != "function") return null;
    const body = await Ee(doc);
    if (!body) return null;
    const root = await H(doc, "div", {
      style: PROGRESS_TOAST_STYLE_HIDE
    });
    try {
      typeof root.setAttribute == "function" && await root.setAttribute("id", "inlay-nx-progress-toast");
    } catch {
    }
    // SafeDOM SafeElement.addEventListener attaches to the HOST document with
    // no target filter — a bare dismiss here fires on every click in the chat.
    // Only dismiss when the pointer is inside this toast's rect; never touch
    // preventDefault on misses (that would break chat/viewer input).
    const onDismiss = async (ev) => {
      if (!t._progressToastShown) return;
      try {
        if (t.jobProgress && formatViewerJob(t.jobProgress)?.busy) return;
        if (readIndexProgress(t.jobProgress)?.busy) return;
      } catch {
      }
      const x = Number(ev?.clientX), y = Number(ev?.clientY);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      try {
        const G = await root.getBoundingClientRect();
        if (!G || x < G.left || x > G.right || y < G.top || y > G.bottom) return;
      } catch {
        return;
      }
      dismissProgressToastUi();
    };
    try {
      typeof root.addEventListener == "function" && await root.addEventListener("pointerdown", onDismiss);
    } catch {
    }
    await body.appendChild(root);
    t._progressToastRoot = root;
    t._progressToastShown = !1;
    return root;
  }
  async function paintProgressToastHtml(html, opts = {}) {
    if (!html) return;
    const root = await ensureProgressToastRoot();
    if (!root) return;
    try {
      // Skip identical HTML — SafeDOM setInnerHTML flashes empty then content.
      if (html !== t._progressToastLastHtml) {
        if (typeof root.setInnerHTML == "function") await root.setInnerHTML(html);
        t._progressToastLastHtml = html;
      }
    } catch {
      return;
    }
    // Avoid display toggle flicker when already visible (mobile scroll / % ticks).
    if (!t._progressToastShown) await setProgressToastEye(!0);
    if (opts.armHide) armProgressToastEyeHide(opts.armHideMs);
    else clearProgressToastEyeHide();
  }
  /** risutts-style one-shot host toast — independent of progress_toast setting. */
  async function ensureHostToastRoot() {
    if (t._hostToastRoot) return t._hostToastRoot;
    const doc = await ue();
    if (!doc || typeof doc.createElement != "function") return null;
    const body = await Ee(doc);
    if (!body) return null;
    const root = await H(doc, "div", {
      style: HOST_TOAST_STYLE_HIDE
    });
    try {
      typeof root.setAttribute == "function" && await root.setAttribute("id", "inlay-nx-host-toast");
    } catch {
    }
    await body.appendChild(root);
    t._hostToastRoot = root;
    return root;
  }
  async function nxHostToast(text, opts = {}) {
    const msg = String(text || "");
    const root = await ensureHostToastRoot();
    if (!root) return;
    if (t._hostToastTimer) clearTimeout(t._hostToastTimer), t._hostToastTimer = null;
    try {
      if (typeof root.setInnerHTML == "function") await root.setInnerHTML(msg ? h(msg) : "");
      if (typeof root.setStyleAttribute == "function") await root.setStyleAttribute(msg ? HOST_TOAST_STYLE_SHOW : HOST_TOAST_STYLE_HIDE);
    } catch {
      return;
    }
    if (!msg) return;
    const ms = Math.max(600, Number(opts.ms) || 1800);
    t._hostToastTimer = setTimeout(() => {
      t._hostToastTimer = null;
      nxHostToast("").catch(() => {
      });
    }, ms);
  }
  /** Selection toast — own DOM; never shares the progress/reroll slot. */
  async function ensureSelectionToastRoot() {
    if (t._selectionToastRoot) return t._selectionToastRoot;
    const doc = await ue();
    if (!doc || typeof doc.createElement != "function") return null;
    const body = await Ee(doc);
    if (!body) return null;
    const root = await H(doc, "div", {
      style: selectionToastStyle(!1, !1)
    });
    try {
      typeof root.setAttribute == "function" && await root.setAttribute("id", "inlay-nx-selection-toast");
    } catch {
    }
    // Same SafeDOM document-wide listener pitfall as progress toast — hit-test only.
    const onDismiss = async (ev) => {
      if (!t._selectionToastShown) return;
      const x = Number(ev?.clientX), y = Number(ev?.clientY);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      try {
        const G = await root.getBoundingClientRect();
        if (!G || x < G.left || x > G.right || y < G.top || y > G.bottom) return;
      } catch {
        return;
      }
      hideSelectionToast().catch(() => {
      });
    };
    try {
      typeof root.addEventListener == "function" && await root.addEventListener("pointerdown", onDismiss);
    } catch {
    }
    await body.appendChild(root);
    t._selectionToastRoot = root;
    t._selectionToastShown = !1;
    return root;
  }
  async function hideSelectionToast() {
    if (t._selectionToastTimer) clearTimeout(t._selectionToastTimer), t._selectionToastTimer = null;
    const root = t._selectionToastRoot;
    t._selectionToastShown = !1;
    if (!root) return;
    try {
      if (typeof root.setStyleAttribute == "function") await root.setStyleAttribute(selectionToastStyle(!1, !1));
    } catch {
    }
  }
  async function showSelectionToast(msg) {
    const enabled = t.backendSettings?.card?.progress_toast === !0 || t.backendSettings?.card?.progress_toast === 1 || t.backendSettings?.card?.progress_toast === "true";
    if (!enabled || !msg) return;
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    let count = 0;
    try {
      count = typeof linkedCards == "function" ? linkedCards(msg).length : Number(msg.cardCount) || 0;
    } catch {
      count = Number(msg.cardCount) || 0;
    }
    const chatName = String(msg.chatName || t.lastScope?.chatName || "").trim();
    const msgIdx = Number(msg.chatIndex ?? msg.messageIndex);
    const msgPart = Number.isFinite(msgIdx) && msgIdx >= 0 ? \`msg #\${msgIdx + 1}\` : "msg #?";
    const stage = chatName ? \`\${chatName} · \${msgPart}\` : msgPart;
    const preview = String(msg.preview || msg.text || "").replace(/\\s+/g, " ").trim().slice(0, 40);
    const metaParts = [count > 0 ? \`\${count}장\` : "이미지 없음"];
    if (preview) metaParts.push(preview);
    const meta = metaParts.join(" · ");
    const fp = \`sel|\${stage}|\${meta}|\${msg.hash || msg.domIndex || ""}\`;
    if (fp === t._selectionToastFp && t._selectionToastShown) return;
    t._selectionToastFp = fp;
    const html = typeof VC?.composeProgressToastHtml == "function" ? VC.composeProgressToastHtml({
      stage,
      meta,
      pct: 0,
      busy: !0,
      showBar: !1,
      tone: "job",
      escapeHtml: h
    }) : \`<div data-inlay-selection-toast="1" style="box-sizing:border-box;width:min(280px,92vw);padding:6px 10px;border-radius:8px;background:#121820;border:1px solid #2a3344;color:#e8eef8;font-size:11px;cursor:pointer"><div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${h(stage)}</div><div style="color:#8b97ab;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${h(meta)}</div></div>\`;
    const root = await ensureSelectionToastRoot();
    if (!root) return;
    try {
      if (typeof root.setInnerHTML == "function") await root.setInnerHTML(html);
      // Never cover the progress slot — sit below while job/index/progress eye is active.
      let below = !!t._progressToastShown;
      try {
        if (!below && t.jobProgress && formatViewerJob(t.jobProgress)?.busy) below = !0;
        if (!below && readIndexProgress(t.jobProgress)?.busy) below = !0;
      } catch {
      }
      if (typeof root.setStyleAttribute == "function") await root.setStyleAttribute(selectionToastStyle(!0, below));
      t._selectionToastShown = !0;
    } catch {
      return;
    }
    if (t._selectionToastTimer) clearTimeout(t._selectionToastTimer);
    t._selectionToastTimer = setTimeout(() => {
      t._selectionToastTimer = null;
      hideSelectionToast().catch(() => {
      });
    }, SELECTION_TOAST_HIDE_MS);
  }
  async function syncProgressToast() {
    if (t._progressToastSyncing) return;
    t._progressToastSyncing = !0;
    t._progressToastSyncingAt = Date.now();
    try {
      const enabled = t.backendSettings?.card?.progress_toast === !0 || t.backendSettings?.card?.progress_toast === 1 || t.backendSettings?.card?.progress_toast === "true";
      if (!enabled) {
        await destroyProgressToast();
        await hideSelectionToast();
        return;
      }
      const VC = globalThis.__INLAY_VIEWER_CORE__;
      const B = t.jobProgress;
      const info = formatViewerJob(B);
      // Mint toast tracks selection-focus warm only — NOT full gallery warmProgress.
      let indexBusy = !1, indexPct = 0, indexLabel = "인덱싱";
      try {
        const N = globalThis.__INLAY_NATIVE__;
        const focus = typeof N?.warmFocusProgress == "function" ? N.warmFocusProgress() : null;
        if (focus) {
          indexBusy = !!focus.busy;
          indexPct = Math.max(0, Math.min(100, Math.round(Number(focus.pct) || 0)));
          indexLabel = "인덱싱";
        }
      } catch {
      }
      const jobBusy = !!(info && info.busy);
      const state = info?.state || "";
      const isError = state === "error";
      const isTerminal = state === "done" || state === "cancelled" || isError;
      await ensureProgressToastRoot();
      // Warm focus idle: mint toast must drop immediately (do not leave last %).
      if (!indexBusy && !jobBusy) {
        t._progressToastIndexStallPct = null;
        t._progressToastIndexStallAt = 0;
        t._progressToastIndexShownAt = 0;
        if (!isTerminal || !B) {
          if (t._progressToastShown) {
            clearProgressToastEyeHide();
            await setProgressToastEye(!1, !0);
            t._progressToastFp = "";
            t._progressToastLastHtml = "";
          }
          return;
        }
      }
      const indexOnly = !jobBusy && indexBusy;
      // Focus % not advancing → hide mint (encode may be stuck on one id).
      if (indexOnly) {
        if (!t._progressToastIndexShownAt) t._progressToastIndexShownAt = Date.now();
        const rp = indexPct;
        const prevPct = Number(t._progressToastIndexStallPct);
        const prevAt = Number(t._progressToastIndexStallAt) || 0;
        const advanced = Number.isFinite(prevPct) && rp > prevPct;
        if (!prevAt || advanced) {
          t._progressToastIndexStallPct = rp;
          t._progressToastIndexStallAt = Date.now();
        } else if (Date.now() - prevAt >= 2e3) {
          try {
            const N = globalThis.__INLAY_NATIVE__;
            typeof N?.clearWarmFocus == "function" && N.clearWarmFocus();
          } catch {
          }
          clearProgressToastEyeHide();
          await setProgressToastEye(!1, !0);
          t._progressToastFp = "";
          t._progressToastLastHtml = "";
          t._progressToastIndexStallPct = null;
          t._progressToastIndexStallAt = 0;
          t._progressToastIndexShownAt = 0;
          return;
        }
      }
      let stage = jobBusy
        ? info.stage || "작업 중"
        : indexBusy
          ? indexLabel
          : info?.stage || "작업 중";
      let pct = jobBusy ? info.pct : indexBusy ? indexPct : info ? info.pct : 0;
      // Finish frame: show 100% once before auto-hide (do not drop at 99).
      if (!jobBusy && !indexBusy && isTerminal && !isError) pct = Math.max(Number(pct) || 0, 100), stage = info?.stage || "완료";
      const liveBusy = jobBusy || indexBusy;
      const jobKey = String(B?.jobId || B?.kind || (indexBusy ? "index" : "job"));
      if (jobBusy) {
        if (t._progressToastElapsedJob !== jobKey) {
          t._progressToastElapsedJob = jobKey;
          t._progressToastElapsedAt = Date.now();
        }
      } else if (!jobBusy) {
        t._progressToastElapsedJob = "";
        t._progressToastElapsedAt = 0;
      }
      const elapsedMs = jobBusy && t._progressToastElapsedAt ? Date.now() - t._progressToastElapsedAt : 0;
      const elapsedSec = Math.floor(elapsedMs / 1000);
      const elapsedLabel = jobBusy
        ? typeof VC?.formatProgressElapsedSec == "function"
          ? VC.formatProgressElapsedSec(elapsedMs)
          : elapsedSec < 60 ? \`\${elapsedSec}s\` : \`\${Math.floor(elapsedSec / 60)}m \${String(elapsedSec % 60).padStart(2, "0")}s\`
        : "";
      const shot = info?.shot || "";
      const detail = info?.detail ? String(info.detail).slice(0, 100) : "";
      let meta = "";
      if (isError) meta = detail || "실패";
      else if (shot && elapsedLabel) meta = \`\${shot} · \${pct}% · \${elapsedLabel}\`;
      else if (shot) meta = \`\${shot} · \${pct}%\`;
      else if (detail && elapsedLabel) meta = \`\${detail} · \${pct}% · \${elapsedLabel}\`;
      else if (detail) meta = \`\${detail} · \${pct}%\`;
      else if (elapsedLabel) meta = \`\${pct}% · \${elapsedLabel}\`;
      else meta = \`\${pct}%\`;
      const tone = indexOnly ? "index" : "job";
      const fp = \`\${tone}|\${stage}|\${Math.round(Number(pct) || 0)}|\${meta}|\${state}|\${isError ? 1 : 0}|\${liveBusy ? 1 : 0}|\${elapsedSec}\`;
      if (fp === t._progressToastFp) return;
      t._progressToastFp = fp;
      const html = typeof VC?.composeProgressToastHtml == "function" ? VC.composeProgressToastHtml({
        stage,
        meta,
        pct,
        busy: !0,
        error: isError,
        tone,
        escapeHtml: h
      }) : \`<div data-inlay-progress-toast="1" style="padding:6px 10px;border-radius:8px;background:#121820;border:1px solid #2a3344;color:#e8eef8;font-size:11px;cursor:pointer">\${h(stage + " " + meta)}</div>\`;
      // Stay up while busy; auto-hide on terminal job or when index-only ends via idle branch.
      await paintProgressToastHtml(html, { armHide: !liveBusy });
    } finally {
      t._progressToastSyncing = !1;
      t._progressToastSyncingAt = 0;
    }
  }
  if (!t._progressToastWatchdog) {
    t._progressToastWatchdog = setInterval(() => {
      try {
        const on = t.backendSettings?.card?.progress_toast === !0 || t.backendSettings?.card?.progress_toast === 1 || t.backendSettings?.card?.progress_toast === "true";
        if (!on) {
          destroyProgressToast().catch(() => {
          });
          hideSelectionToast().catch(() => {
          });
          return;
        }
        if (t._progressToastSyncing && t._progressToastSyncingAt && Date.now() - t._progressToastSyncingAt > 4e3) {
          t._progressToastSyncing = !1;
          t._progressToastSyncingAt = 0;
        }
        const B = t.jobProgress;
        const info = B ? formatViewerJob(B) : null;
        const jobBusy = !!(info && info.busy);
        let indexBusy = !1;
        try {
          const N = globalThis.__INLAY_NATIVE__;
          const focus = typeof N?.warmFocusProgress == "function" ? N.warmFocusProgress() : null;
          indexBusy = !!focus?.busy;
        } catch {
          indexBusy = !1;
        }
        // Focus warm idle but eye stuck — clear without waiting on hung sync.
        if (t._progressToastShown && !jobBusy && !indexBusy && !(info && (info.state === "done" || info.state === "error" || info.state === "cancelled"))) {
          setProgressToastEye(!1, !0).catch(() => {
          });
          clearProgressToastEyeHide();
          t._progressToastFp = "";
          return;
        }
        if (jobBusy || indexBusy) {
          syncProgressToast().catch(() => {
          });
          return;
        }
        if (t._progressToastShown && t._progressToastUntil && Date.now() > t._progressToastUntil + 200) {
          setProgressToastEye(!1).catch(() => {
          });
          t._progressToastUntil = 0;
          t._progressToastArmed = !1;
        }
      } catch {
      }
    }, 500);
  }
  async function Se() {
    try {
      if (t.galleryUi?.paintStatus) await t.galleryUi.paintStatus();
      await syncProgressToast();
    } catch {
    }
  }`;

/** Sticky/inline long-press inspect sheet: own reroll/regen paths (not gallery rerollImage). */
const VENDOR_INSPECT_REROLL_INLINE_NEEDLE =
  `      if (act === "reroll") {
        await hideInspect();
        try {
          await withImageRerollToast("이미지 리롤 중…", async () => await K(\`/v1/cards/\${encodeURIComponent(card.id)}/reroll\`, {
            method: "POST",
            body: {
              mode: "nai"
            }
          }, 18e4));
          const W = await Z({
            useOverride: !1
          }).catch(() => null);
          W?.sessionId && await ce(W.sessionId);
          try {
            await he();
          } catch {
          }
        } catch (err) {
          y("error", "sticky.reroll.fail", err?.message || err);
        }
        return;
      }`;
const VENDOR_INSPECT_REROLL_INLINE_PATCH =
  `      if (act === "reroll") {
        await hideInspect();
        try {
          await withImageRerollToast("이미지 리롤 중…", async () => await K(\`/v1/cards/\${encodeURIComponent(card.id)}/reroll\`, {
            method: "POST",
            body: {
              mode: "nai"
            }
          }, 18e4));
          const W = await Z({
            useOverride: !1
          }).catch(() => null);
          W?.sessionId && await ce(W.sessionId);
          try {
            await he();
          } catch {
          }
          try {
            await refreshSelectedInlineImages();
          } catch {
          }
        } catch (err) {
          y("error", "sticky.reroll.fail", err?.message || err);
        }
        return;
      }`;

const VENDOR_INSPECT_REGEN_INLINE_NEEDLE =
  `            await withImageRerollToast(\`메시지 이미지 전체 재생성 중… (0/\${targets.length || "?"})\`, async (report) => rerollMessageImagesLive(liveMsg, {
              scope,
              report,
              onShot: async () => {
                if (t.galleryUi?.renderGal) await t.galleryUi.renderGal();
              }
            }), { shotCount: Math.max(1, targets.length || 1) });
            scope?.sessionId && await ce(scope.sessionId, !0);
            try {
              await he();
            } catch {
            }
          } finally {
            if (hash) t.jobsInFlight.delete(hash);
          }
        } catch (err) {
          y("error", "sticky.regen.fail", err?.message || err);
        }
      }`;
const VENDOR_INSPECT_REGEN_INLINE_PATCH =
  `            await withImageRerollToast(\`메시지 이미지 전체 재생성 중… (0/\${targets.length || "?"})\`, async (report) => rerollMessageImagesLive(liveMsg, {
              scope,
              report,
              onShot: async () => {
                if (t.galleryUi?.renderGal) await t.galleryUi.renderGal();
                try {
                  await refreshSelectedInlineImages();
                } catch {
                }
              }
            }), { shotCount: Math.max(1, targets.length || 1) });
            scope?.sessionId && await ce(scope.sessionId, !0);
            try {
              await he();
            } catch {
            }
            try {
              await refreshSelectedInlineImages();
            } catch {
            }
          } finally {
            if (hash) t.jobsInFlight.delete(hash);
          }
        } catch (err) {
          y("error", "sticky.regen.fail", err?.message || err);
        }
      }`;

/** After single-image / all-image reroll, refresh bubble illustrations (gallery alone is not enough). */
const VENDOR_REROLL_IMAGE_INLINE_NEEDLE =
  `        d.index = nn >= 0 ? nn : Math.max(0, Math.min(_, Math.max(0, J.length - 1))), await T(), await C.setTextContent(\`이미지 리롤 완료 · \${String(B?.card?.id || A.id).slice(0, 8)}\`), y("info", "regen.image", \`P\${O} \${String(A.id).slice(0, 8)}→\${String(B?.card?.id || "").slice(0, 8)}\`);`;
const VENDOR_REROLL_IMAGE_INLINE_PATCH =
  `        d.index = nn >= 0 ? nn : Math.max(0, Math.min(_, Math.max(0, J.length - 1))), await T();
        try {
          await refreshSelectedInlineImages();
        } catch {
        }
        await C.setTextContent(\`이미지 리롤 완료 · \${String(B?.card?.id || A.id).slice(0, 8)}\`), y("info", "regen.image", \`P\${O} \${String(A.id).slice(0, 8)}→\${String(B?.card?.id || "").slice(0, 8)}\`);`;

const VENDOR_REROLL_ALL_INLINE_NEEDLE =
  `          onShot: async (i) => {
            d.index = i;
            await T();
            await C.setTextContent(\`\${i + 1}/\${targets0.length} 교체 완료\`);
          }
        }), { shotCount: targets0.length });
        scope?.sessionId && await ce(scope.sessionId, !0);
        try {
          await he();
        } catch {
        }
        const failCount = Array.isArray(B?.failed) ? B.failed.length : 0;
        d.index = 0, await T(), await C.setTextContent(failCount ? \`전체 재생성 부분 실패 · 성공 \${Number(B?.count || 0)} / 실패 \${failCount}\` : \`전체 재생성 완료 · \${Number(B?.count || 0)}장\`), y("info", "regen.all", \`count=\${B?.count || 0} failed=\${failCount} hash=\${String(A.hash || "").slice(0, 8)}\`);`;
const VENDOR_REROLL_ALL_INLINE_PATCH =
  `          onShot: async (i) => {
            d.index = i;
            await T();
            try {
              await refreshSelectedInlineImages();
            } catch {
            }
            await C.setTextContent(\`\${i + 1}/\${targets0.length} 교체 완료\`);
          }
        }), { shotCount: targets0.length });
        scope?.sessionId && await ce(scope.sessionId, !0);
        try {
          await he();
        } catch {
        }
        const failCount = Array.isArray(B?.failed) ? B.failed.length : 0;
        d.index = 0, await T();
        try {
          await refreshSelectedInlineImages();
        } catch {
        }
        await C.setTextContent(failCount ? \`전체 재생성 부분 실패 · 성공 \${Number(B?.count || 0)} / 실패 \${failCount}\` : \`전체 재생성 완료 · \${Number(B?.count || 0)}장\`), y("info", "regen.all", \`count=\${B?.count || 0} failed=\${failCount} hash=\${String(A.hash || "").slice(0, 8)}\`);`;

/** Tag regenerate (force): clear bubble illustrations as soon as cards are unlinked. */
const VENDOR_FORCE_REGEN_INLINE_NEEDLE =
  `      if (t.galleryUi?.renderGal) try {
        await t.galleryUi.renderGal();
      } catch {
      }
    }
    const u = {
      session_id: e.sessionId,`;
const VENDOR_FORCE_REGEN_INLINE_PATCH =
  `      if (t.galleryUi?.renderGal) try {
        await t.galleryUi.renderGal();
      } catch {
      }
      try {
        t._inlineLinkedIds = "";
        t._inlineKeepLinkedKey = "";
        t._inlinePending = null;
        await refreshSelectedInlineImages();
      } catch {
      }
    }
    const u = {
      session_id: e.sessionId,`;

/** Soft-stop mid message reroll loop (현재 장 끝난 뒤 나머지 스킵). */
const VENDOR_REROLL_LIVE_STOP_NEEDLE =
  `  async function rerollMessageImagesLive(msg, opts = {}) {
    const scope = opts.scope || await Z({ useOverride: !1 }).catch(() => null);
    const sessionId = msg?.sessionId || scope?.sessionId || "";
    let targets = messageCardsByY(msg);
    if (!targets.length) throw new Error("재생성할 이미지 없음");
    const total = targets.length;
    const cards = [], replaced = [], failed = [];
    const report = typeof opts.report == "function" ? opts.report : () => {
    };
    const onShot = typeof opts.onShot == "function" ? opts.onShot : null;
    for (let i = 0; i < total; i += 1) {
      // Re-resolve left strip each time — card ids change after each replace.
      if (sessionId) await ce(sessionId, !0);`;
const VENDOR_REROLL_LIVE_STOP_PATCH =
  `  async function rerollMessageImagesLive(msg, opts = {}) {
    const scope = opts.scope || await Z({ useOverride: !1 }).catch(() => null);
    const sessionId = msg?.sessionId || scope?.sessionId || "";
    let targets = messageCardsByY(msg);
    if (!targets.length) throw new Error("재생성할 이미지 없음");
    const total = targets.length;
    const cards = [], replaced = [], failed = [];
    const report = typeof opts.report == "function" ? opts.report : () => {
    };
    const onShot = typeof opts.onShot == "function" ? opts.onShot : null;
    t._rerollStopRequested = !1;
    let stopped = !1;
    for (let i = 0; i < total; i += 1) {
      if (t._rerollStopRequested) {
        stopped = !0;
        y("info", "reroll.stop", \`done=\${cards.length}/\${total}\`);
        break;
      }
      // Re-resolve left strip each time — card ids change after each replace.
      if (sessionId) await ce(sessionId, !0);`;

const VENDOR_REROLL_LIVE_STOP_END_NEEDLE =
  `    if (!cards.length) throw new Error(failed[0]?.error || "전체 재생성 실패");
    return { ok: !0, count: cards.length, replaced, cards, failed };
  }`;
const VENDOR_REROLL_LIVE_STOP_END_PATCH =
  `    if (stopped) {
      y("info", "reroll.stopped", \`count=\${cards.length}/\${total}\`);
      return { ok: cards.length > 0, count: cards.length, replaced, cards, failed, stopped: !0 };
    }
    if (!cards.length) throw new Error(failed[0]?.error || "전체 재생성 실패");
    return { ok: !0, count: cards.length, replaced, cards, failed };
  }`;

const VENDOR_REROLL_TOAST_HEARTBEAT_NEEDLE = `    const a = setInterval(() => {
      if (!t.jobProgress || t.jobProgress.jobId !== "reroll") return;
      const r = Number(t.jobProgress.progress) || 12;
      r < 88 && (t.jobProgress = {
        ...t.jobProgress,
        progress: Math.min(88, r + 4)
      }, Se().catch(() => {
      }));
    }, 900);`;
const VENDOR_REROLL_TOAST_HEARTBEAT_PATCH = `    const a = setInterval(() => {
      if (!t.jobProgress || t.jobProgress.jobId !== "reroll") return;
      const r = Number(t.jobProgress.progress) || 12;
      if (r < 88) t.jobProgress = {
        ...t.jobProgress,
        progress: Math.min(88, r + 4)
      };
      Se().catch(() => {
      });
    }, 700);`;

const VENDOR_PROGRESS_TOAST_PAINT_NEEDLE = `    }, paintStatus = async () => {
      const _ = Array.isArray(d.items) ? d.items : U(), O = t.selectedMessage, B = t.jobProgress, idx = readIndexProgress(B), busy = !!(B || O?.hash && t.jobsInFlight.has(O.hash) || idx.busy), extra = O ? \`\${_.length}장 · DOM#\${O.domIndex}\` : "";
      try {
        if (busy && (B || idx.busy)) await C.setInnerHTML(viewerStatusHtml(B || { state: "running", progress: idx.pct, message: idx.label }, extra));
        else if (O) await C.setInnerHTML(\`<span style="color:#a6b1c2">\${h(\`\${_.length}장 · DOM#\${O.domIndex} · \${O.preview || ""}\`)}</span>\`);
        else await C.setInnerHTML(\`<span style="color:#a6b1c2">메시지를 클릭해서 선택하세요</span>\`);
      } catch {
      }`;
const VENDOR_PROGRESS_TOAST_PAINT_PATCH = `    }, paintStatus = async () => {
      const _ = Array.isArray(d.items) ? d.items : U(), O = t.selectedMessage, B = t.jobProgress, idx = readIndexProgress(B), busy = !!(B || O?.hash && t.jobsInFlight.has(O.hash) || idx.busy), extra = O ? \`\${_.length}장 · DOM#\${O.domIndex}\` : "";
      try {
        if (busy && (B || idx.busy)) await C.setInnerHTML(viewerStatusHtml(B || { state: "running", progress: idx.pct, message: idx.label }, extra));
        else if (O) await C.setInnerHTML(\`<span style="color:#a6b1c2">\${h(\`\${_.length}장 · DOM#\${O.domIndex} · \${O.preview || ""}\`)}</span>\`);
        else await C.setInnerHTML(\`<span style="color:#a6b1c2">메시지를 클릭해서 선택하세요</span>\`);
      } catch {
      }
      // Progress toast syncs from onWarmProgress / job watchdog / Se — not every paintStatus (scroll flicker).`;

const VENDOR_SESSION_PENDING_NEEDLE = `    if (S && S !== b) {
      if (t.pendingSessionId === b) t.pendingSessionCount += 1;
      else t.pendingSessionId = b, t.pendingSessionCount = 1;
      if (t.pendingSessionCount >= 2) return t.pendingSessionId = "", t.pendingSessionCount = 0, t.lastScope = C, await oa(S, b), C;
      return C;
    }`;
const VENDOR_SESSION_PENDING_PATCH = `    if (S && S !== b) {
      if (t.pendingSessionId === b) t.pendingSessionCount += 1;
      else t.pendingSessionId = b, t.pendingSessionCount = 1;
      if (C.liveChar && C.liveChat && t.lastScope && (Number(t.lastScope.charIndex) !== Number(C.charIndex) || Number(t.lastScope.chatIndex) !== Number(C.chatIndex))) t.pendingSessionCount = 2;
      if (t.pendingSessionCount >= 2) return t.pendingSessionId = "", t.pendingSessionCount = 0, t.lastScope = C, await oa(S, b), C;
      return C;
    }`;

/** Hide floating image viewer only while Risu host settings (`.rs-setting-cont`) are open. */
const VENDOR_RISU_SETTINGS_HIDE_VIEWER_NEEDLE =
  `  async function restoreFloatingViewerAfterModal() {
    if (!t._viewerHiddenForModal) return;
    t._viewerHiddenForModal = !1;
    const g = t.galleryUi;
    if (!g) return;
    try {
      if (g.root && typeof g.root.setStyleAttribute == "function") await g.root.setStyleAttribute("position:fixed;left:0;top:0;width:0;height:0;z-index:99990;pointer-events:none;opacity:1;visibility:visible;");
      if (g.geo) g.geo = clampViewerGeo(g.geo, !!g.minimized);
      if (typeof g.applyChrome == "function") await g.applyChrome();
      else if (g.panel) await g.panel.setStyleAttribute(Ft(g.geo || se, !!g.minimized));
    } catch {
    }
  }
  function cornerFixedStyle(extra = []) {`;
const VENDOR_RISU_SETTINGS_HIDE_VIEWER_PATCH =
  `  async function restoreFloatingViewerAfterModal() {
    if (!t._viewerHiddenForModal) return;
    t._viewerHiddenForModal = !1;
    if (t._viewerHiddenForRisuSettings || t.uiOpen || t._hostChromeBlocked) return;
    const g = t.galleryUi;
    if (!g) return;
    try {
      if (g.root && typeof g.root.setStyleAttribute == "function") await g.root.setStyleAttribute("position:fixed;left:0;top:0;width:0;height:0;z-index:99990;pointer-events:none;opacity:1;visibility:visible;");
      if (g.geo) g.geo = clampViewerGeo(g.geo, !!g.minimized);
      if (typeof g.applyChrome == "function") await g.applyChrome();
      else if (g.panel) await g.panel.setStyleAttribute(Ft(g.geo || se, !!g.minimized));
    } catch {
    }
  }
  async function hideFloatingViewerForRisuSettings() {
    if (t._viewerHiddenForRisuSettings) return;
    t._viewerHiddenForRisuSettings = !0;
    if (t.overlayUi) t.overlayUi._lastThumbPct = null;
    const g = t.galleryUi;
    if (g?.drag) g.drag.expandOnTap = !1;
    if (g?._actionsLpTimer) clearTimeout(g._actionsLpTimer), g._actionsLpTimer = null;
    if (!g?.panel) {
      try { await Ht(); } catch {}
      return;
    }
    try {
      if (g.root && typeof g.root.setStyleAttribute == "function") await g.root.setStyleAttribute("position:fixed;left:0;top:0;width:0;height:0;z-index:99990;pointer-events:none;opacity:0;visibility:hidden;");
      await g.panel.setStyleAttribute("position:fixed;left:0;top:0;width:0;height:0;min-width:0;min-height:0;max-width:0;max-height:0;padding:0;margin:0;border:0;opacity:0;pointer-events:none;visibility:hidden;overflow:hidden;z-index:1;resize:none;display:block;");
    } catch {
    }
    try { await Ht(); } catch {}
  }
  async function restoreFloatingViewerAfterRisuSettings() {
    if (!t._viewerHiddenForRisuSettings) return;
    t._viewerHiddenForRisuSettings = !1;
    if (t.overlayUi) t.overlayUi._lastThumbPct = null;
    if (t.uiOpen || t._hostChromeBlocked) {
      try { await Ht(); } catch {}
      return;
    }
    // Stale modal hide (Inlay settings closed while Risu was still open) must not block restore.
    t._viewerHiddenForModal = !1;
    const g = t.galleryUi;
    if (!g) {
      try { await Ht(); } catch {}
      return;
    }
    try {
      if (g.root && typeof g.root.setStyleAttribute == "function") await g.root.setStyleAttribute("position:fixed;left:0;top:0;width:0;height:0;z-index:99990;pointer-events:none;opacity:1;visibility:visible;");
      if (g.geo) g.geo = clampViewerGeo(g.geo, !!g.minimized);
      if (typeof g.applyChrome == "function") await g.applyChrome();
      else if (g.panel) await g.panel.setStyleAttribute(Ft(g.geo || se, !!g.minimized));
    } catch {
    }
    try { await Ht(); } catch {}
    try { await it(); } catch {}
  }
  async function isRisuSettingsOpen() {
    try {
      const doc = await ue().catch(() => null);
      return !!(doc && await D("rsSettingCont", () => doc.querySelector?.(".rs-setting-cont"), null));
    } catch {
      return !1;
    }
  }
  async function syncFloatingViewerForRisuSettings() {
    if (t.unloading || t._hostChromeBlocked) return;
    try {
      const open = await isRisuSettingsOpen();
      if (open) {
        await hideFloatingViewerForRisuSettings();
        return;
      }
      // Plugin fullscreen replaces .rs-setting-cont — keep the hide flag while Inlay settings stay open.
      if (t.uiOpen) return;
      await restoreFloatingViewerAfterRisuSettings();
    } catch {
    }
  }
  function startRisuSettingsViewerWatch() {
    if (t._risuSettingsWatch) return;
    t._risuSettingsWatch = setInterval(() => {
      if (t.unloading) {
        clearInterval(t._risuSettingsWatch), t._risuSettingsWatch = null;
        return;
      }
      syncFloatingViewerForRisuSettings().catch(() => {
      });
    }, 400);
  }
  function cornerFixedStyle(extra = []) {`;

const VENDOR_RISU_SETTINGS_WATCH_ARM_NEEDLE = `    startHostUiWatchdog();`;
const VENDOR_RISU_SETTINGS_WATCH_ARM_PATCH = `    startHostUiWatchdog();
    startRisuSettingsViewerWatch();`;

const VENDOR_RISU_SETTINGS_POINTER_NEEDLE =
  `      if (t.uiOpen || t._hostChromeBlocked || t.charEditUi || t._viewerHiddenForModal) return;`;
const VENDOR_RISU_SETTINGS_POINTER_PATCH =
  `      if (t.uiOpen || t._hostChromeBlocked || t.charEditUi || t._viewerHiddenForModal || t._viewerHiddenForRisuSettings) return;`;

const VENDOR_RISU_SETTINGS_PAINT_NEEDLE =
  `      if (t.galleryUi !== d || t._viewerHiddenForModal) return;`;
const VENDOR_RISU_SETTINGS_PAINT_PATCH =
  `      if (t.galleryUi !== d || t._viewerHiddenForModal || t._viewerHiddenForRisuSettings) return;`;

const VENDOR_RISU_SETTINGS_UNLOAD_NEEDLE =
  `t._hostWatch && clearInterval(t._hostWatch), t._settingsWatch && clearInterval(t._settingsWatch)`;
const VENDOR_RISU_SETTINGS_UNLOAD_PATCH =
  `t._hostWatch && clearInterval(t._hostWatch), t._settingsWatch && clearInterval(t._settingsWatch), t._risuSettingsWatch && clearInterval(t._risuSettingsWatch)`;

/** Third minimize mode: actions floating (tag/regen + preset); long-press expands. */
const VENDOR_ACTIONS_HELP_NEEDLE =
  `"nx-minimize-mode": { title: "접힘 표시 방식", body: "플로팅 아이콘: 접으면 작은 아이콘으로 따로 둔 자리로 갑니다. 상단 툴바 한 줄: 접어도 지금 창 자리 그대로 얇은 바로만 줄어듭니다." },`;
const VENDOR_ACTIONS_HELP_PATCH =
  `"nx-minimize-mode": { title: "접힘 표시 방식", body: "플로팅 아이콘: 작은 🖼️, 클릭하면 펼침. 상단 툴바 한 줄: 창 자리에서 얇은 바. 재생성·태그 플로팅: 큰 세로 버튼(태그/재생성/중단/프리셋), 접기면 여백+펼치기만, 길게 누르면 전체 뷰어." },`;

const VENDOR_ACTIONS_SELECT_NEEDLE =
  `                <option value="icon" \${(i.viewer_minimize_mode || "icon") === "icon" ? "selected" : ""}>플로팅 아이콘</option>
                <option value="toolbar" \${i.viewer_minimize_mode === "toolbar" ? "selected" : ""}>상단 툴바 한 줄</option>`;
const VENDOR_ACTIONS_SELECT_PATCH =
  `                <option value="icon" \${(i.viewer_minimize_mode || "icon") === "icon" ? "selected" : ""}>플로팅 아이콘</option>
                <option value="toolbar" \${i.viewer_minimize_mode === "toolbar" ? "selected" : ""}>상단 툴바 한 줄</option>
                <option value="actions" \${i.viewer_minimize_mode === "actions" ? "selected" : ""}>재생성·태그 플로팅</option>`;

const VENDOR_ACTIONS_SAVE_NEEDLE =
  `      viewer_minimize_mode: N("nx-minimize-mode") === "toolbar" ? "toolbar" : "icon"`;
const VENDOR_ACTIONS_SAVE_PATCH =
  `      viewer_minimize_mode: (() => { const v = N("nx-minimize-mode"); return v === "toolbar" || v === "actions" ? v : "icon"; })()`;

const VENDOR_ACTIONS_MODE_FN_NEEDLE =
  `  function viewerMinimizeMode() {
    return (t.backendSettings?.card?.viewer_minimize_mode) === "toolbar" ? "toolbar" : "icon";
  }`;
const VENDOR_ACTIONS_MODE_FN_PATCH =
  `  function viewerMinimizeMode() {
    const m = String(t.backendSettings?.card?.viewer_minimize_mode || "icon");
    return m === "toolbar" || m === "actions" ? m : "icon";
  }`;

const VENDOR_ACTIONS_CLAMP_NEEDLE =
  `    if (minimized) {
      if (mode === "toolbar") {
        dispW = Math.max(280, Math.min(storeW, vw - margin * 2));
        dispH = 40;
      } else dispW = 48, dispH = 48;
    } else {`;

/** Expanded header drops 태그/재생성 — those live on the image options bar (left). */
const VENDOR_VIEWER_STOP_HDR_NEEDLE =
  `        '<span style="cursor:pointer;background:#7c6cff;color:#fff;padding:4px 8px;border-radius:7px;font-size:11px;line-height:1" title="이 메시지의 모든 샷 재생성">재생성</span>',
        \`<span style="cursor:pointer;background:\${Nt() ? "#0f766e" : "#334155"};color:#fff;padding:4px 8px;border-radius:7px;font-size:11px;line-height:1">\${Nt() ? "상시ON" : "상시"}</span>\`,`;
const VENDOR_VIEWER_STOP_HDR_PATCH =
  `        \`<span style="cursor:pointer;background:\${(typeof overlayVisualOn == "function" ? overlayVisualOn() : Nt()) ? "#0f766e" : "#334155"};color:#fff;padding:10px 9px;border-radius:9px;font-size:13px;line-height:1.2;min-height:40px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center">상시</span>\`,`;

const VENDOR_VIEWER_STOP_CLICK_NEEDLE =
  `                W === 0 ? await selectGalIndex(d.index - 1) : W === 1 ? await selectGalIndex(d.index + 1) : W === 2 ? await te() : W === 3 ? await rerollAllImages() : W === 4 ? await ae() : W === 5 ? (t.backendSettings?.card || {}).show_risu_settings_button !== !1 && await At() : W === 6 && await toggleMinimizeBtn();`;
const VENDOR_VIEWER_STOP_CLICK_PATCH =
  `                W === 0 ? await selectGalIndex(d.index - 1) : W === 1 ? await selectGalIndex(d.index + 1) : W === 2 ? await ae() : W === 3 ? (t.backendSettings?.card || {}).show_risu_settings_button !== !1 && await At() : W === 4 && await toggleMinimizeBtn();`;

const VENDOR_VIEWER_STOP_LABEL_NEEDLE =
  `        // 0◀ 1▶ 2태그 3재생성 4상시 5설정 6접기
        const labels = [
          null,
          null,
          null,
          null,
          inlineOn ? "상시ON" : "상시",
          (t.backendSettings?.card || {}).show_risu_settings_button !== !1 ? "설정" : "",
          d.minimized ? "펼치기" : "접기"
        ], colors = [
          null,
          null,
          null,
          null,
          inlineOn ? "#0f766e" : "#334155",
          "#334155",
          "#1e293b"
        ];
        for (let idx = 4; idx <= 6; idx += 1) {
          const el = A[idx];
          if (!el) continue;
          if (idx === 5 && !labels[idx]) {
            typeof el.setStyleAttribute == "function" && await el.setStyleAttribute("display:none");
            continue;
          }
          typeof el.setInnerHTML == "function" && labels[idx] && await el.setInnerHTML(labels[idx]);
          typeof el.setStyleAttribute == "function" && colors[idx] && await el.setStyleAttribute(\`cursor:pointer;\${idx === 5 ? "display:inline-flex;" : ""}background:\${colors[idx]};color:\${idx === 4 ? "#fff" : "#dbe4f5"};padding:4px 8px;border-radius:7px;font-size:11px;line-height:1;border:1px solid rgba(255,255,255,.12)\`);
        }`;
const VENDOR_VIEWER_STOP_LABEL_PATCH =
  `        // 0◀ 1▶ 2상시 3설정 4접기 (태그/재생성/중단 → 이미지 옵션바; 상시는 색만)
        const labels = [
          null,
          null,
          "상시",
          (t.backendSettings?.card || {}).show_risu_settings_button !== !1 ? "설정" : "",
          d.minimized ? "펼침" : "접기"
        ], colors = [
          null,
          null,
          inlineOn ? "#0f766e" : "#334155",
          "#334155",
          "#1e293b"
        ];
        for (let idx = 2; idx <= 4; idx += 1) {
          const el = A[idx];
          if (!el) continue;
          if (idx === 3 && !labels[idx]) {
            typeof el.setStyleAttribute == "function" && await el.setStyleAttribute("display:none");
            continue;
          }
          typeof el.setInnerHTML == "function" && labels[idx] && await el.setInnerHTML(labels[idx]);
          typeof el.setStyleAttribute == "function" && colors[idx] && await el.setStyleAttribute(\`cursor:pointer;\${idx === 3 ? "display:inline-flex;" : ""}background:\${colors[idx]};color:\${idx === 2 ? "#fff" : "#dbe4f5"};padding:10px 9px;border-radius:9px;font-size:13px;line-height:1.2;min-height:40px;box-sizing:border-box;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.12)\`);
        }`;

const VENDOR_ACTIONS_CLAMP_PATCH =
  `    if (minimized) {
      if (mode === "toolbar") {
        dispW = Math.max(280, Math.min(storeW, vw - margin * 2));
        // Follow measured/wrapped header height (was fixed 40 and clipped 2–3 row chrome).
        const ch = Number(t.galleryUi?.chromeH) || 0;
        const est = dispW < 240 ? 168 : dispW < 400 ? 112 : 56;
        dispH = Math.max(56, Math.min(ch > 0 ? ch : est, vh - margin * 2));
      } else if (mode === "actions") {
        dispW = 160;
        dispH = t.galleryUi?.actionsFolded ? 88 : 328;
      } else dispW = 48, dispH = 48;
    } else {`;

/** Mobile-friendlier viewer header: bigger nav/tag buttons + taller chrome. */
const VENDOR_VIEWER_HDR_TOUCH_NEEDLE =
  `        '<span style="cursor:pointer;background:#475569;color:#fff;padding:4px 8px;border-radius:7px;font-size:11px;line-height:1">◀</span>',
        '<span style="cursor:pointer;background:#475569;color:#fff;padding:4px 8px;border-radius:7px;font-size:11px;line-height:1">▶</span>',
        '<span style="cursor:pointer;background:#0f766e;color:#fff;padding:4px 8px;border-radius:7px;font-size:11px;line-height:1" title="LLM 태그 재생성">태그</span>',`;
const VENDOR_VIEWER_HDR_TOUCH_PATCH =
  `        '<span style="cursor:pointer;background:#475569;color:#fff;padding:10px 12px;border-radius:9px;font-size:13px;line-height:1.2;min-height:40px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center">◀</span>',
        '<span style="cursor:pointer;background:#475569;color:#fff;padding:10px 12px;border-radius:9px;font-size:13px;line-height:1.2;min-height:40px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center">▶</span>',`;

const VENDOR_VIEWER_HDR_TAIL_TOUCH_NEEDLE =
  `        \`<span style="cursor:pointer;display:\${(t.backendSettings?.card || {}).show_risu_settings_button !== !1 ? "inline-flex" : "none"};background:#334155;color:#dbe4f5;padding:4px 8px;border-radius:7px;font-size:11px;line-height:1;border:1px solid rgba(255,255,255,.12)">설정</span>\`,
        \`<span style="cursor:pointer;background:#1e293b;color:#dbe4f5;padding:4px 8px;border-radius:7px;font-size:11px;line-height:1;border:1px solid rgba(255,255,255,.12)">\${minimizedInit ? "펼치기" : "접기"}</span>\``;
const VENDOR_VIEWER_HDR_TAIL_TOUCH_PATCH =
  `        \`<span style="cursor:pointer;display:\${(t.backendSettings?.card || {}).show_risu_settings_button !== !1 ? "inline-flex" : "none"};align-items:center;justify-content:center;background:#334155;color:#dbe4f5;padding:10px 9px;border-radius:9px;font-size:13px;line-height:1.2;min-height:40px;box-sizing:border-box;border:1px solid rgba(255,255,255,.12)">설정</span>\`,
        \`<span style="cursor:pointer;display:inline-flex;align-items:center;justify-content:center;background:#1e293b;color:#dbe4f5;padding:10px 9px;border-radius:9px;font-size:13px;line-height:1.2;min-height:40px;box-sizing:border-box;border:1px solid rgba(255,255,255,.12)">\${minimizedInit ? "펼침" : "접기"}</span>\``;

const VENDOR_VIEWER_HDR_CHROME_TOUCH_NEEDLE =
  `    const r = await H(e, "div", { style: Ft(startGeo, minimizedInit) }), i = await H(e, "div", { style: "height:36px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 10px;background:rgba(255,255,255,.04);border-bottom:1px solid rgba(255,255,255,.06);cursor:move;user-select:none;flex-shrink:0;touch-action:none;" }), s = await H(e, "span", {
      style: "font-weight:600;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:0 1 auto;min-width:0;",
      html: "Inlay Viewer"
    }), viewerPresetLabel = (() => {
      const card = kt(t.backendSettings?.card || {}), presets = Array.isArray(card.presets) ? card.presets : [], activeId = resolveActivePresetId(card), active = presets.find((p) => presetIdEq(p.id, activeId));
      const name = String(active?.name || (presets.length ? "프리셋" : "없음"));
      return \`\${name.length > 12 ? \`\${name.slice(0, 11)}…\` : name} ▾\`;
    })(), viewerPresetBtn = await H(e, "span", {
      // Risu SafeDOM blocks change/input events — use clickable control + pointer hit-test instead of <select>.
      style: "max-width:140px;min-width:88px;flex:0 1 140px;height:26px;border-radius:7px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;font-size:11px;padding:0 8px;cursor:pointer;pointer-events:auto;display:inline-flex;align-items:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;box-sizing:border-box;",
      text: viewerPresetLabel
    }), viewerPresetMenu = await H(e, "div", {
      style: "display:none;position:absolute;top:34px;left:10px;min-width:140px;max-width:220px;max-height:220px;overflow:auto;z-index:5;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;box-shadow:0 10px 28px rgba(0,0,0,.45);pointer-events:auto;",
      html: ""
    }), c = await H(e, "div", {
      style: "display:flex;gap:5px;align-items:center;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;",`;
const VENDOR_VIEWER_HDR_CHROME_TOUCH_PATCH =
  `    const r = await H(e, "div", { style: Ft(startGeo, minimizedInit) }), i = await H(e, "div", { style: "min-height:52px;height:auto;display:flex;align-items:center;justify-content:flex-start;gap:8px;padding:8px 10px;background:rgba(255,255,255,.04);border-bottom:1px solid rgba(255,255,255,.06);cursor:move;user-select:none;flex-shrink:0;touch-action:none;flex-wrap:wrap;" }), s = await H(e, "span", {
      style: "font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:0 1 auto;min-width:0;",
      html: "Inlay Viewer"
    }), viewerPresetLabel = (() => {
      const card = kt(t.backendSettings?.card || {}), presets = Array.isArray(card.presets) ? card.presets : [], activeId = resolveActivePresetId(card), active = presets.find((p) => presetIdEq(p.id, activeId));
      const name = String(active?.name || (presets.length ? "프리셋" : "없음"));
      return \`\${name.length > 18 ? \`\${name.slice(0, 17)}…\` : name} ▾\`;
    })(), viewerPresetBtn = await H(e, "span", {
      // Risu SafeDOM blocks change/input events — use clickable control + pointer hit-test instead of <select>.
      style: "max-width:200px;min-width:72px;flex:0 1 160px;height:40px;border-radius:9px;border:1px solid rgba(255,255,255,.18);background:#0b0f18;color:#e8eef8;font-size:13px;font-weight:600;padding:0 12px;cursor:pointer;pointer-events:auto;display:inline-flex;align-items:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;box-sizing:border-box;",
      text: viewerPresetLabel
    }), viewerPresetMenu = await H(e, "div", {
      style: "display:none;position:absolute;top:52px;left:10px;min-width:200px;max-width:min(92vw,320px);max-height:min(50vh,360px);overflow:auto;z-index:5;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;box-shadow:0 10px 28px rgba(0,0,0,.45);pointer-events:auto;",
      html: ""
    }), c = await H(e, "div", {
      // flex-grow would fill the header and steal drags on empty chrome; shrink/wrap only.
      style: "display:flex;gap:8px;align-items:center;flex:0 1 auto;flex-wrap:wrap;justify-content:flex-end;margin-left:auto;max-width:100%;min-width:0;box-sizing:border-box;",`;

const VENDOR_VIEWER_PRESET_MENU_TOUCH_NEEDLE =
  `      const label = \`\${String(active?.name || (presets.length ? "프리셋" : "없음")).slice(0, 12)}\${String(active?.name || "").length > 12 ? "…" : ""} ▾\`;
      try {
        typeof d.presetSelect.setTextContent == "function" ? await d.presetSelect.setTextContent(label) : await d.presetSelect.setInnerHTML(h(label));
      } catch {
      }
      if (d.presetMenu && typeof d.presetMenu.setInnerHTML == "function") {
        const menuHtml = presets.length ? presets.map((p) => {
          const on = presetIdEq(p.id, activeId);
          return \`<div style="padding:7px 10px;cursor:pointer;font-size:11px;line-height:1.3;color:\${on ? "#e8eef8" : "#a6b1c2"};background:\${on ? "rgba(124,108,255,.22)" : "transparent"};border-bottom:1px solid rgba(255,255,255,.06)">\${h(p.name || p.id)}</div>\`;
        }).join("") : '<div style="padding:8px 10px;font-size:11px;color:#778398">프리셋 없음</div>';
        try {
          await d.presetMenu.setInnerHTML(menuHtml);
        } catch {
        }
      }
      const presetChromeLive = !d.minimized || viewerMinimizeMode() === "toolbar";
      try {
        await d.presetMenu?.setStyleAttribute?.(\`display:\${d.presetMenuOpen && presetChromeLive ? "block" : "none"};position:absolute;top:34px;left:10px;min-width:140px;max-width:220px;max-height:220px;overflow:auto;z-index:20;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;box-shadow:0 10px 28px rgba(0,0,0,.45);pointer-events:auto;\`);
      } catch {
      }`;
const VENDOR_VIEWER_PRESET_MENU_TOUCH_PATCH =
  `      const label = \`\${String(active?.name || (presets.length ? "프리셋" : "없음")).slice(0, 18)}\${String(active?.name || "").length > 18 ? "…" : ""} ▾\`;
      try {
        typeof d.presetSelect.setTextContent == "function" ? await d.presetSelect.setTextContent(label) : await d.presetSelect.setInnerHTML(h(label));
      } catch {
      }
      // Same path as meta chips: SafeDOM createElement + live rect cache (setInnerHTML kids drift).
      d.presetHits = [];
      if (d.presetMenu) {
        try {
          await d.presetMenu.setInnerHTML("");
        } catch {
        }
        if (presets.length) {
          for (const p of presets) {
            const id = String(p.id || "");
            if (!id) continue;
            const on = presetIdEq(p.id, activeId);
            const style = \`padding:14px 14px;cursor:pointer;font-size:14px;line-height:1.35;min-height:44px;box-sizing:border-box;display:flex;align-items:center;color:\${on ? "#e8eef8" : "#a6b1c2"};background:\${on ? "rgba(124,108,255,.22)" : "transparent"};border-bottom:1px solid rgba(255,255,255,.06);pointer-events:auto;\`;
            try {
              const el = await H(e, "div", { text: String(p.name || p.id || ""), style });
              try { await el.setAttribute("data-nx-preset-id", id); } catch {}
              await d.presetMenu.appendChild(el);
              d.presetHits.push({ el, id, hitPadY: 0, hitPadX: 10 });
            } catch {
            }
          }
        } else {
          try {
            const empty = await H(e, "div", { text: "프리셋 없음", style: "padding:14px;font-size:14px;color:#778398;pointer-events:none;" });
            await d.presetMenu.appendChild(empty);
          } catch {
          }
        }
      }
      const presetChromeLive = !d.minimized || viewerMinimizeMode() === "toolbar" || viewerMinimizeMode() === "actions";
      const actionsMin = d.minimized && viewerMinimizeMode() === "actions", folded = !!(actionsMin && d.actionsFolded);
      let menuTopPx = 52;
      try {
        if (!actionsMin && d.header && d.panel) {
          const hr = await d.header.getBoundingClientRect(), pr = await d.panel.getBoundingClientRect();
          if (hr && pr) menuTopPx = Math.max(48, Math.round(hr.bottom - pr.top + 4));
        }
      } catch {
      }
      try {
        await d.presetMenu?.setStyleAttribute?.(\`display:\${d.presetMenuOpen && presetChromeLive && !folded ? "block" : "none"};position:absolute;top:\${actionsMin ? "auto" : menuTopPx + "px"};\${actionsMin ? "bottom:56px;" : ""}left:10px;right:\${actionsMin ? "10px" : "auto"};min-width:\${actionsMin ? "0" : "200px"};max-width:\${actionsMin ? "none" : "min(92vw,320px)"};max-height:min(50vh,360px);overflow:auto;z-index:30;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;box-shadow:0 10px 28px rgba(0,0,0,.45);pointer-events:auto;\`);
      } catch {
      }`;

/** Viewer preset apply: optimistic local pin; save flush/PUT in background when opts.optimistic. */
const VENDOR_APPLY_PRESET_OPT_NEEDLE =
  `    t._presetSwitching = !0;
    try {
      t.backendSettings = t.backendSettings || {}, t.backendSettings.card = card;
      if (t.settingsSavePending?.card) {
        t.settingsSavePending.card.active_preset_id = id, t.settingsSavePending.card.custom_pos = card.custom_pos, t.settingsSavePending.card.custom_neg = card.custom_neg;
        Array.isArray(card.presets) && (t.settingsSavePending.card.presets = card.presets);
      }
      queueSettingsSave({ card: { ...card } }, { force: !0 }), await flushSettingsSave();
      try {
        await pe({
          card: {
            active_preset_id: id,
            custom_pos: card.custom_pos,
            custom_neg: card.custom_neg,
            presets: card.presets
          }
        });
      } catch (err) {
        y("warn", "preset.save.fail", err?.message || err);
      }
      if (t.backendSettings?.card) {
        pinActivePreset(t.backendSettings.card, id), t.backendSettings.card.custom_pos = card.custom_pos, t.backendSettings.card.custom_neg = card.custom_neg;
        Array.isArray(card.presets) && (t.backendSettings.card.presets = card.presets);
      }
      // Always push into card-settings DOM when it exists; re-render if settings open.
      syncCardPresetFormFromSettings();
      if (t.uiOpen && opts?.rerender !== !1) {
        if (opts?.showCardTab) t.uiTab = "card";
        await P();
        syncCardPresetFormFromSettings();
      }
    } finally {
      t._presetSwitching = !1;
    }
    if (t.galleryUi?.syncViewerPresetSelect) try {
      await t.galleryUi.syncViewerPresetSelect();
    } catch {
    }
    return card;
  }`;

const VENDOR_APPLY_PRESET_OPT_PATCH =
  `    t.backendSettings = t.backendSettings || {}, t.backendSettings.card = card;
    if (t.settingsSavePending?.card) {
      t.settingsSavePending.card.active_preset_id = id, t.settingsSavePending.card.custom_pos = card.custom_pos, t.settingsSavePending.card.custom_neg = card.custom_neg;
      Array.isArray(card.presets) && (t.settingsSavePending.card.presets = card.presets);
    }
    if (t.backendSettings?.card) {
      pinActivePreset(t.backendSettings.card, id), t.backendSettings.card.custom_pos = card.custom_pos, t.backendSettings.card.custom_neg = card.custom_neg;
      Array.isArray(card.presets) && (t.backendSettings.card.presets = card.presets);
    }
    syncCardPresetFormFromSettings();
    const persistPreset = async () => {
      queueSettingsSave({ card: { ...card } }, { force: !0 });
      await flushSettingsSave();
      try {
        await pe({
          card: {
            active_preset_id: id,
            custom_pos: card.custom_pos,
            custom_neg: card.custom_neg,
            presets: card.presets
          }
        });
      } catch (err) {
        y("warn", "preset.save.fail", err?.message || err);
      }
      if (t.backendSettings?.card) {
        pinActivePreset(t.backendSettings.card, id), t.backendSettings.card.custom_pos = card.custom_pos, t.backendSettings.card.custom_neg = card.custom_neg;
        Array.isArray(card.presets) && (t.backendSettings.card.presets = card.presets);
      }
      syncCardPresetFormFromSettings();
    };
    if (opts?.optimistic) {
      // Viewer: chrome already updated; do not hold _presetSwitching across network.
      void persistPreset().then(async () => {
        if (t.uiOpen && opts?.rerender !== !1) {
          try {
            if (opts?.showCardTab) t.uiTab = "card";
            await P();
            syncCardPresetFormFromSettings();
          } catch {
          }
        }
      }).catch((err) => y("warn", "preset.save.fail", err?.message || err));
      if (t.galleryUi?.syncViewerPresetSelect) try {
        await t.galleryUi.syncViewerPresetSelect();
      } catch {
      }
      return card;
    }
    t._presetSwitching = !0;
    try {
      await persistPreset();
      if (t.uiOpen && opts?.rerender !== !1) {
        if (opts?.showCardTab) t.uiTab = "card";
        await P();
        syncCardPresetFormFromSettings();
      }
    } finally {
      t._presetSwitching = !1;
    }
    if (t.galleryUi?.syncViewerPresetSelect) try {
      await t.galleryUi.syncViewerPresetSelect();
    } catch {
    }
    return card;
  }`;

/** Settings tab chips/select: optimistic switch (form sync now; save behind; no full P). */
const VENDOR_PRESET_SWITCH_OPT_NEEDLE =
  `    const e = async (a) => {
      if (!a) return;
      await applyActivePreset(a);
    };
    document.getElementById("nx-preset-select")?.addEventListener("change", async (a) => {
      await e(a.target?.value || "");
    }),`;
const VENDOR_PRESET_SWITCH_OPT_PATCH =
  `    const e = async (a) => {
      if (!a) return;
      await applyActivePreset(a, { optimistic: !0, rerender: !1 });
    };
    document.getElementById("nx-preset-select")?.addEventListener("change", async (a) => {
      await e(a.target?.value || "");
    }),`;

const VENDOR_PICK_PRESET_OPT_NEEDLE =
  `        const saved = await applyActivePreset(selected, { showCardTab: !!t.uiOpen });
        const active = saved?.presets?.find((p) => presetIdEq(p.id, selected));
        await syncViewerPresetSelect();
        await C.setTextContent(\`프리셋 적용 · \${active?.name || selected}\`);
        y("info", "viewer.preset", selected);`;

const VENDOR_PICK_PRESET_OPT_PATCH =
  `        const name = card.presets.find((p) => presetIdEq(p.id, selected))?.name || selected;
        try { await syncViewerPresetSelect(); } catch {}
        try { await C.setTextContent(\`프리셋 · \${name}\`); } catch {}
        // Optimistic like overlay toggle: local chrome first, save behind.
        applyActivePreset(selected, { showCardTab: !1, rerender: !1, optimistic: !0 }).then((saved) => {
          const n = saved?.presets?.find((p) => presetIdEq(p.id, selected))?.name || name;
          Promise.resolve(C.setTextContent(\`프리셋 적용 · \${n}\`)).catch(() => {});
          y("info", "viewer.preset", selected);
        }).catch((err) => {
          y("warn", "viewer.preset.fail", err?.message || err);
        });`;

/** Live-rect + hitPad preset item picker (chip-style). */
const VENDOR_PRESET_HIT_HELPER_NEEDLE =
  `    }, pickViewerPreset = async (selected) => {
      if (!selected || t._presetSwitching) return;`;
const VENDOR_PRESET_HIT_HELPER_PATCH =
  `    }, hitPresetItemAt = async (x, y) => {
      // Stacked rows: vertical hitPad overlaps neighbors (upper half of row N stole by row N-1).
      // Strict Y bounds + nearest-center tiebreak. Only pad X for fat fingers.
      const zones = Array.isArray(d.presetHits) ? d.presetHits : [];
      const score = async (el, id) => {
        try {
          const R = await el.getBoundingClientRect();
          if (!R) return null;
          const padX = 10;
          if (x < R.left - padX || x > R.right + padX) return null;
          const h = Math.max(1, R.bottom - R.top), cy = (R.top + R.bottom) / 2;
          if (y >= R.top && y <= R.bottom) return { el, id, dist: Math.abs(y - cy), strict: 1 };
          // Near miss: within 6px of edge only (not half the neighbor).
          if (y >= R.top - 6 && y <= R.bottom + 6) return { el, id, dist: Math.abs(y - cy), strict: 0 };
          return null;
        } catch {
          return null;
        }
      };
      let best = null;
      for (const zone of zones) {
        if (!zone?.el || !zone?.id) continue;
        const hit = await score(zone.el, zone.id);
        if (!hit) continue;
        if (!best || hit.strict > best.strict || hit.strict === best.strict && hit.dist < best.dist) best = hit;
      }
      if (best) return { el: best.el, id: best.id, hitPad: 0 };
      try {
        if (!d.presetMenu) return null;
        const kids = typeof k.unwarpSafeArray == "function" ? await k.unwarpSafeArray(await d.presetMenu.getChildren()) : [];
        for (let W = 0; W < kids.length; W += 1) {
          const id = String(d.viewerPresetIds?.[W] || zones[W]?.id || "");
          if (!id) continue;
          const hit = await score(kids[W], id);
          if (!hit) continue;
          if (!best || hit.strict > best.strict || hit.strict === best.strict && hit.dist < best.dist) best = hit;
        }
      } catch {
      }
      return best ? { el: best.el, id: best.id, hitPad: 0 } : null;
    }, onPresetMenuMove = async (A) => {
      if (!d.presetMenuGesture || d.drag) return;
      const cx = Number(A?.clientX), cy = Number(A?.clientY);
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
      const g = d.presetMenuGesture, dx = cx - g.startX, dy = cy - g.startY;
      if (!g.moved && Math.abs(dx) + Math.abs(dy) > 6) g.moved = !0;
      if (!g.moved) return;
      try { A.preventDefault?.(); } catch {}
      try {
        if (d.presetMenu && typeof setScrollTopSafe == "function") await setScrollTopSafe(d.presetMenu, Math.max(0, g.originScroll - dy));
      } catch {}
    }, endPresetMenuGesture = async () => {
      if (!d.presetMenuGesture) return;
      const { moveId, upId, cancelId, moved, pickX, pickY } = d.presetMenuGesture;
      d.presetMenuGesture = null;
      try { moveId != null && await e.removeEventListener(moveId); } catch {}
      try { upId != null && await e.removeEventListener(upId); } catch {}
      try { cancelId != null && await e.removeEventListener(cancelId); } catch {}
      // Tap = press+release without drag; select at press point (scroll uses move).
      if (!moved) {
        const zone = await hitPresetItemAt(pickX, pickY);
        if (zone?.id) await pickViewerPreset(zone.id);
      }
    }, startPresetMenuGesture = async (A, startX, startY) => {
      if (d.presetMenuGesture) await endPresetMenuGesture();
      let originScroll = 0;
      try {
        if (d.presetMenu && typeof getScrollTopSafe == "function") originScroll = Math.max(0, Number(await getScrollTopSafe(d.presetMenu)) || 0);
      } catch {}
      const moveId = await e.addEventListener("pointermove", onPresetMenuMove), upId = await e.addEventListener("pointerup", endPresetMenuGesture), cancelId = await e.addEventListener("pointercancel", endPresetMenuGesture);
      d.presetMenuGesture = { startX, startY, pickX: startX, pickY: startY, originScroll, moved: !1, moveId, upId, cancelId };
    }, pickViewerPreset = async (selected) => {
      if (!selected || t._presetSwitching) return;`;

/** Expanded viewer: use presetHits instead of index walk. */
const VENDOR_PRESET_EXPANDED_HIT_NEEDLE =
  `        // Preset dropdown (SafeDOM forbids change/input — drive via pointer hit-test).
        if (d.presetMenuOpen && d.presetMenu && await X(d.presetMenu, _, O)) {
          try {
            const kids = typeof k.unwarpSafeArray == "function" ? await k.unwarpSafeArray(await d.presetMenu.getChildren()) : [];
            for (let W = 0; W < kids.length; W += 1) {
              const J = await kids[W].getBoundingClientRect();
              if (_ >= J.left && _ <= J.right && O >= J.top && O <= J.bottom) {
                const id = d.viewerPresetIds?.[W] || "";
                id && await pickViewerPreset(id);
                return;
              }
            }
          } catch {
          }
          return;
        }`;
const VENDOR_PRESET_EXPANDED_HIT_PATCH =
  `        // Preset dropdown: tap-select on pointerup; drag scrolls the menu.
        if (d.presetMenuOpen && d.presetMenu) {
          if (await hitPresetItemAt(_, O) || await X(d.presetMenu, _, O)) {
            await startPresetMenuGesture(A, _, O);
            return;
          }
        }`;

/** Touch resize grip + preset-before-header (menu overlays wrapped chrome; button hits stole taps). */
const VENDOR_VIEWER_PTR_ORDER_NEEDLE =
  `      let G = !1;
      try {
        const B = await r.getBoundingClientRect();
        _ > B.right - 22 && O > B.bottom - 22 && (G = !0);
      } catch {
      }
      if (!G) {
        if (await X(c, _, O)) {
          try {
            const B = typeof k.unwarpSafeArray == "function" ? await k.unwarpSafeArray(await c.getChildren()) : [];
            for (let W = 0; W < B.length; W += 1) {
              const J = await B[W].getBoundingClientRect();
              if (_ >= J.left && _ <= J.right && O >= J.top && O <= J.bottom) {
                W === 0 ? await selectGalIndex(d.index - 1) : W === 1 ? await selectGalIndex(d.index + 1) : W === 2 ? await te() : W === 3 ? await rerollAllImages() : W === 4 ? await ae() : W === 5 ? (t.backendSettings?.card || {}).show_risu_settings_button !== !1 && await At() : W === 6 && await toggleMinimizeBtn();
                return;
              }
            }
          } catch {
          }
          return;
        }
        // Preset dropdown (SafeDOM forbids change/input — drive via pointer hit-test).
        if (d.presetMenuOpen && d.presetMenu && await X(d.presetMenu, _, O)) {
          try {
            const kids = typeof k.unwarpSafeArray == "function" ? await k.unwarpSafeArray(await d.presetMenu.getChildren()) : [];
            for (let W = 0; W < kids.length; W += 1) {
              const J = await kids[W].getBoundingClientRect();
              if (_ >= J.left && _ <= J.right && O >= J.top && O <= J.bottom) {
                const id = d.viewerPresetIds?.[W] || "";
                id && await pickViewerPreset(id);
                return;
              }
            }
          } catch {
          }
          return;
        }`;
const VENDOR_VIEWER_PTR_ORDER_PATCH =
  `      if (d.resize) return;
      if (!d.minimized && d.resizeGrip && await X(d.resizeGrip, _, O)) {
        await startViewerResize(A, _, O);
        return;
      }
      // Preset menu FIRST — absolute menu sits over wrapped header; c-button hit was eating taps.
      // Tap (up without drag) selects; drag scrolls (thumbs-strip pattern).
      if (d.presetMenuOpen && d.presetMenu) {
        if (await hitPresetItemAt(_, O) || await X(d.presetMenu, _, O)) {
          await startPresetMenuGesture(A, _, O);
          return;
        }
      }
      {
        if (await X(c, _, O)) {
          try {
            const B = typeof k.unwarpSafeArray == "function" ? await k.unwarpSafeArray(await c.getChildren()) : [];
            for (let W = 0; W < B.length; W += 1) {
              const J = await B[W].getBoundingClientRect();
              if (_ >= J.left && _ <= J.right && O >= J.top && O <= J.bottom) {
                W === 0 ? await selectGalIndex(d.index - 1) : W === 1 ? await selectGalIndex(d.index + 1) : W === 2 ? await ae() : W === 3 ? (t.backendSettings?.card || {}).show_risu_settings_button !== !1 && await At() : W === 4 && await toggleMinimizeBtn();
                return;
              }
            }
          } catch {
          }
          // Empty space inside button row (flex grow / wrap gaps) — drag, don't swallow.
          await startViewerDrag(A, _, O, !1);
          return;
        }`;

const VENDOR_VIEWER_PRESET_HITS_STATE_NEEDLE =
  `      _metaCardId: "",
      metaHits: []
    };`;
const VENDOR_VIEWER_PRESET_HITS_STATE_PATCH =
  `      _metaCardId: "",
      metaHits: [],
      presetHits: []
    };`;

const VENDOR_VIEWER_IMG_REROLL_TOUCH_NEEDLE =
  `      return \`<div style="position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center">\${spin}<span data-nx-img-reroll="1" style="position:absolute;right:8px;top:8px;z-index:3;cursor:pointer;background:rgba(124,108,255,.92);color:#fff;padding:5px 10px;border-radius:8px;font-size:11px;line-height:1;font-weight:600;border:1px solid rgba(255,255,255,.18);box-shadow:0 2px 10px rgba(0,0,0,.35);user-select:none" title="이 이미지만 리롤">리롤</span><img data-nx-main-img="1" src="\${src}" style="max-width:100%;max-height:100%;object-fit:contain" loading="eager" decoding="async" /></div>\`;`;
const VENDOR_VIEWER_IMG_REROLL_TOUCH_PATCH =
  `      const imgAct = (act, bg, label, title) => \`<span data-nx-img-act="\${act}" style="cursor:pointer;background:\${bg};color:#fff;padding:12px 14px;border-radius:10px;font-size:14px;line-height:1.2;font-weight:700;border:1px solid rgba(255,255,255,.18);box-shadow:0 2px 10px rgba(0,0,0,.35);user-select:none;min-height:44px;box-sizing:border-box;display:inline-flex;align-items:center;opacity:.4" title="\${title}">\${label}</span>\`;
      const leftActs = \`<div data-nx-img-acts="1" style="position:absolute;left:8px;bottom:8px;z-index:3;display:flex;gap:6px;align-items:center;flex-wrap:wrap;max-width:calc(100% - 96px)">\${imgAct("tag", "#0f766e", "태그", "LLM 태그 재생성")}\${imgAct("regen", "#7c6cff", "재생성", "이 메시지의 모든 샷 재생성")}\${imgAct("stop", "#b91c1c", "중단", "남은 생성 중단(진행 중은 끝까지)")}</div>\`;
      const spinBusy = busy ? \`<svg data-nx-busy-spin="1" width="18" height="18" viewBox="0 0 18 18" style="position:absolute;left:8px;top:8px;z-index:3;pointer-events:none" aria-hidden="true"><circle cx="9" cy="9" r="7" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="2"/><circle cx="9" cy="9" r="7" fill="none" stroke="#c4b5fd" stroke-width="2" stroke-linecap="round" stroke-dasharray="11 33"><animateTransform attributeName="transform" type="rotate" from="0 9 9" to="360 9 9" dur="0.7s" repeatCount="indefinite"/></circle></svg>\` : "";
      return \`<div style="position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center">\${spinBusy}\${leftActs}<span data-nx-img-reroll="1" style="position:absolute;right:8px;top:8px;z-index:3;cursor:pointer;background:rgba(124,108,255,.92);color:#fff;padding:12px 14px;border-radius:10px;font-size:14px;line-height:1.2;font-weight:700;border:1px solid rgba(255,255,255,.18);box-shadow:0 2px 10px rgba(0,0,0,.35);user-select:none;min-height:44px;box-sizing:border-box;display:inline-flex;align-items:center;opacity:.4" title="이 이미지만 리롤">리롤</span><img data-nx-main-img="1" src="\${src}" style="max-width:100%;max-height:100%;object-fit:contain" loading="eager" decoding="async" /></div>\`;`;

/** Hit-test image option bar: left 태그/재생성/중단 + right 리롤 (SafeDOM children walk). */
const VENDOR_VIEWER_IMG_ACT_HIT_NEEDLE =
  `        if (await X(S, _, O)) {
          try {
            const B = await S.getBoundingClientRect();
            if (B && _ >= B.right - 78 && _ <= B.right - 4 && O >= B.top + 4 && O <= B.top + 40) {
              await rerollImage();
              return;
            }
          } catch {
          }
        }`;
const VENDOR_VIEWER_IMG_ACT_HIT_PATCH =
  `        if (await X(S, _, O)) {
          try {
            // SafeDOM: innerHTML kids often lack getChildren/getAttribute — hit by geometry vs stage rect.
            const B = await S.getBoundingClientRect();
            if (B) {
              const inYTop = O >= B.top + 4 && O <= B.top + 56;
              const inYBot = O >= B.bottom - 56 && O <= B.bottom - 4;
              if (inYTop && _ >= B.right - 96 && _ <= B.right - 4) {
                await rerollImage();
                return;
              }
              if (inYBot && _ >= B.left + 4 && _ <= B.left + 240) {
                const x = _ - (B.left + 8);
                // Approx widths: 태그~56 + gap6 + 재생성~78 + gap6 + 중단~56
                if (x < 58) { await te(); return; }
                if (x < 142) { await rerollAllImages(); return; }
                if (x < 220) { await optimisticStopJobs(); return; }
              }
            }
          } catch {
          }
        }`;

/** Empty gallery stage still shows 태그/재생성/중단/리롤 (same geometry hit as mainImgHtml). */
const VENDOR_VIEWER_EMPTY_ACTS_NEEDLE =
  `        const Le = busy ? \`<span style="color:#8b97ab;font-size:12px">생성 중… 상태표시줄을 확인하세요</span>\` : \`<span style="color:#778398;font-size:12px">\${O ? "연결된 이미지 없음" : "메시지를 선택하면 여기에 표시됩니다"}</span>\`;`;
const VENDOR_VIEWER_EMPTY_ACTS_PATCH =
  `        const emptyMsg = busy ? "생성 중… 상태표시줄을 확인하세요" : O ? "연결된 이미지 없음" : "메시지를 선택하면 여기에 표시됩니다";
        const emptyColor = busy ? "#8b97ab" : "#778398";
        const imgActEmpty = (act, bg, label, title) => \`<span data-nx-img-act="\${act}" style="cursor:pointer;background:\${bg};color:#fff;padding:12px 14px;border-radius:10px;font-size:14px;line-height:1.2;font-weight:700;border:1px solid rgba(255,255,255,.18);box-shadow:0 2px 10px rgba(0,0,0,.35);user-select:none;min-height:44px;box-sizing:border-box;display:inline-flex;align-items:center;opacity:.4" title="\${title}">\${label}</span>\`;
        const leftActsEmpty = \`<div data-nx-img-acts="1" style="position:absolute;left:8px;bottom:8px;z-index:3;display:flex;gap:6px;align-items:center;flex-wrap:wrap;max-width:calc(100% - 96px)">\${imgActEmpty("tag", "#0f766e", "태그", "LLM 태그 재생성")}\${imgActEmpty("regen", "#7c6cff", "재생성", "이 메시지의 모든 샷 재생성")}\${imgActEmpty("stop", "#b91c1c", "중단", "남은 생성 중단(진행 중은 끝까지)")}</div>\`;
        const Le = \`<div style="position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center">\${leftActsEmpty}<span data-nx-img-reroll="1" style="position:absolute;right:8px;top:8px;z-index:3;cursor:pointer;background:rgba(124,108,255,.92);color:#fff;padding:12px 14px;border-radius:10px;font-size:14px;line-height:1.2;font-weight:700;border:1px solid rgba(255,255,255,.18);box-shadow:0 2px 10px rgba(0,0,0,.35);user-select:none;min-height:44px;box-sizing:border-box;display:inline-flex;align-items:center;opacity:.4" title="이 이미지만 리롤">리롤</span><span style="color:\${emptyColor};font-size:12px;padding:0 12px;text-align:center">\${emptyMsg}</span></div>\`;`;

const VENDOR_ACTIONS_FT_NEEDLE =
  `      minimized && mode === "icon" ? "min-width:48px" : minimized ? "min-width:280px" : "min-width:260px",`;
const VENDOR_ACTIONS_FT_PATCH =
  `      minimized && mode === "icon" ? "min-width:48px" : minimized && mode === "actions" ? "min-width:160px" : minimized ? "min-width:280px" : "min-width:260px",`;

const VENDOR_ACTIONS_OVERFLOW_NEEDLE =
  `    }, f = async () => {
      d.geo = clampViewerGeo(d.geo, d.minimized);
      let panelStyle = Ft(d.geo, d.minimized);
      // Toolbar-minimized keeps the same header controls; dropdown must escape the 40px bar.
      if (d.presetMenuOpen && (!d.minimized || viewerMinimizeMode() === "toolbar")) {
        panelStyle = panelStyle.replace(/overflow:[^;]+/i, "overflow:visible");
      }
      await r.setStyleAttribute(panelStyle);`;
const VENDOR_ACTIONS_OVERFLOW_PATCH =
  `    }, f = async () => {
      // Settings/Risu bury: keep geo, force 0×0 so applyChrome/resize cannot revive a hitbox.
      if (t._viewerHiddenForModal || t._viewerHiddenForRisuSettings || t.uiOpen || t._hostChromeBlocked) {
        try {
          if (d.root && typeof d.root.setStyleAttribute == "function") await d.root.setStyleAttribute("position:fixed;left:0;top:0;width:0;height:0;z-index:99990;pointer-events:none;opacity:0;visibility:hidden;");
          await r.setStyleAttribute("position:fixed;left:0;top:0;width:0;height:0;min-width:0;min-height:0;max-width:0;max-height:0;padding:0;margin:0;border:0;opacity:0;pointer-events:none;visibility:hidden;overflow:hidden;z-index:1;resize:none;display:block;");
        } catch {
        }
        return;
      }
      d.geo = clampViewerGeo(d.geo, d.minimized);
      let panelStyle = Ft(d.geo, d.minimized);
      // Toolbar-minimized keeps the same header controls; dropdown must escape the 40px bar.
      if (d.presetMenuOpen && (!d.minimized || viewerMinimizeMode() === "toolbar" || viewerMinimizeMode() === "actions")) {
        panelStyle = panelStyle.replace(/overflow:[^;]+/i, "overflow:visible");
      }
      await r.setStyleAttribute(panelStyle);`;

const VENDOR_ACTIONS_CHROME_NEEDLE =
  `    }, applyViewerChrome = async () => {
      const mode = viewerMinimizeMode(), toolbarMin = d.minimized && mode === "toolbar", iconMin = d.minimized && mode === "icon";
      try {
        await s.setInnerHTML(iconMin ? "🖼️" : "Inlay Viewer"), await i.setStyleAttribute(\`height:\${iconMin ? 48 : toolbarMin ? 40 : 36}px;display:flex;align-items:center;justify-content:\${iconMin ? "center" : "space-between"};gap:8px;padding:\${iconMin ? "0" : "0 10px"};background:rgba(255,255,255,.04);border-bottom:\${d.minimized && !toolbarMin ? "0" : "1px solid rgba(255,255,255,.06)"};cursor:move;user-select:none;flex-shrink:0;touch-action:none;\`), await viewerPresetBtn.setStyleAttribute(\`max-width:140px;min-width:88px;flex:0 1 140px;height:26px;border-radius:7px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;font-size:11px;padding:0 8px;cursor:pointer;pointer-events:auto;display:\${iconMin ? "none" : "inline-flex"};align-items:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;box-sizing:border-box;\`), await viewerPresetMenu.setStyleAttribute(\`display:\${!iconMin && d.presetMenuOpen ? "block" : "none"};position:absolute;top:34px;left:10px;min-width:140px;max-width:220px;max-height:220px;overflow:auto;z-index:5;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;box-shadow:0 10px 28px rgba(0,0,0,.45);pointer-events:auto;\`), await c.setStyleAttribute(\`display:\${iconMin ? "none" : "flex"};gap:5px;align-items:center;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;\`);
      } catch {
      }`;
const VENDOR_ACTIONS_CHROME_PATCH =
  `    }, applyViewerChrome = async () => {
      if (t._viewerHiddenForModal || t._viewerHiddenForRisuSettings || t.uiOpen || t._hostChromeBlocked) {
        try { await f(); } catch {}
        return;
      }
      const mode = viewerMinimizeMode(), toolbarMin = d.minimized && mode === "toolbar", iconMin = d.minimized && mode === "icon", actionsMin = d.minimized && mode === "actions";
      try {
        if (actionsMin) {
          if (d.actionsFolded == null) d.actionsFolded = !1;
          const folded = !!d.actionsFolded;
          const btn = (act, bg, label) => \`<span data-nx-act="\${act}" style="cursor:pointer;background:\${bg};color:#fff;padding:14px 12px;border-radius:10px;font-size:15px;line-height:1.15;font-weight:700;width:100%;text-align:center;box-sizing:border-box;user-select:none">\${label}</span>\`;
          const pad = '<span data-nx-drag-pad style="display:flex;align-items:center;justify-content:center;width:100%;height:28px;flex:0 0 28px;cursor:move;touch-action:none" title="끌어서 이동"><span style="width:44px;height:4px;border-radius:999px;background:rgba(255,255,255,.38)"></span></span>';
          await s.setInnerHTML(folded ? pad : pad + btn("tag", "#0f766e", "태그") + btn("regen", "#7c6cff", "재생성") + btn("stop", "#b91c1c", "중단")), await i.setStyleAttribute(\`height:\${folded ? 88 : 328}px;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;gap:8px;padding:10px;background:rgba(255,255,255,.04);border-bottom:0;cursor:move;user-select:none;flex-shrink:0;touch-action:none;box-sizing:border-box;\`), await s.setStyleAttribute("display:flex;flex-direction:column;gap:8px;align-items:stretch;width:100%;flex:0 0 auto;"), await viewerPresetBtn.setStyleAttribute(\`max-width:none;min-width:0;width:100%;height:auto;min-height:48px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:#0b0f18;color:#e8eef8;font-size:15px;font-weight:700;padding:14px 12px;cursor:pointer;pointer-events:auto;display:\${folded ? "none" : "inline-flex"};align-items:center;justify-content:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;box-sizing:border-box;\`), await viewerPresetMenu.setStyleAttribute(\`display:\${!folded && d.presetMenuOpen ? "block" : "none"};position:absolute;top:auto;bottom:56px;left:10px;right:10px;min-width:0;max-width:none;max-height:220px;overflow:auto;z-index:20;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;box-shadow:0 10px 28px rgba(0,0,0,.45);pointer-events:auto;\`), await c.setInnerHTML(btn(folded ? "expand" : "fold", "#1e293b", folded ? "펼침" : "접기")), await c.setStyleAttribute("display:flex;flex-direction:column;gap:8px;align-items:stretch;flex-shrink:0;width:100%;");
        } else {
          d.actionsFolded = !1;
          await s.setInnerHTML(iconMin ? "🖼️" : "Inlay Viewer"), await s.setStyleAttribute(iconMin ? "font-weight:600;font-size:22px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:0 1 auto;min-width:0;" : "font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:0 1 auto;min-width:0;"), await i.setStyleAttribute(\`min-height:\${iconMin ? 48 : toolbarMin ? 56 : 52}px;height:\${iconMin ? "48px" : "auto"};display:flex;align-items:center;justify-content:\${iconMin ? "center" : "flex-start"};gap:8px;padding:\${iconMin ? "0" : "8px 10px"};background:rgba(255,255,255,.04);border-bottom:\${d.minimized && !toolbarMin ? "0" : "1px solid rgba(255,255,255,.06)"};cursor:move;user-select:none;flex-shrink:0;touch-action:none;flex-wrap:\${iconMin ? "nowrap" : "wrap"};\`), await viewerPresetBtn.setStyleAttribute(\`max-width:200px;min-width:72px;flex:0 1 160px;height:40px;border-radius:9px;border:1px solid rgba(255,255,255,.18);background:#0b0f18;color:#e8eef8;font-size:13px;font-weight:600;padding:0 12px;cursor:pointer;pointer-events:auto;display:\${iconMin ? "none" : "inline-flex"};align-items:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;box-sizing:border-box;\`), await viewerPresetMenu.setStyleAttribute(\`display:\${!iconMin && d.presetMenuOpen ? "block" : "none"};position:absolute;top:52px;left:10px;min-width:200px;max-width:min(92vw,320px);max-height:min(50vh,360px);overflow:auto;z-index:5;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;box-shadow:0 10px 28px rgba(0,0,0,.45);pointer-events:auto;\`), await c.setInnerHTML([
            '<span style="cursor:pointer;background:#475569;color:#fff;padding:10px 12px;border-radius:9px;font-size:13px;line-height:1.2;min-height:40px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center">◀</span>',
            '<span style="cursor:pointer;background:#475569;color:#fff;padding:10px 12px;border-radius:9px;font-size:13px;line-height:1.2;min-height:40px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center">▶</span>',
            \`<span style="cursor:pointer;background:\${(typeof overlayVisualOn == "function" ? overlayVisualOn() : Nt()) ? "#0f766e" : "#334155"};color:#fff;padding:10px 9px;border-radius:9px;font-size:13px;line-height:1.2;min-height:40px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center">상시</span>\`,
            \`<span style="cursor:pointer;display:\${(t.backendSettings?.card || {}).show_risu_settings_button !== !1 ? "inline-flex" : "none"};align-items:center;justify-content:center;background:#334155;color:#dbe4f5;padding:10px 9px;border-radius:9px;font-size:13px;line-height:1.2;min-height:40px;box-sizing:border-box;border:1px solid rgba(255,255,255,.12)">설정</span>\`,
            \`<span style="cursor:pointer;display:inline-flex;align-items:center;justify-content:center;background:#1e293b;color:#dbe4f5;padding:10px 9px;border-radius:9px;font-size:13px;line-height:1.2;min-height:40px;box-sizing:border-box;border:1px solid rgba(255,255,255,.12)">\${d.minimized ? "펼침" : "접기"}</span>\`
          ].join("")), await c.setStyleAttribute(\`display:\${iconMin ? "none" : "flex"};gap:8px;align-items:center;flex:0 1 auto;flex-wrap:wrap;justify-content:flex-end;margin-left:auto;max-width:100%;min-width:0;box-sizing:border-box;\`);
        }
      } catch {
      }`;

const VENDOR_ACTIONS_SAVE_ICON_GEO_NEEDLE =
  `        if (viewerMinimizeMode() === "icon") {
          d.iconGeo = {
            left,
            top
          }, await saveViewerIconGeo(d.iconGeo);
        } else {`;
const VENDOR_ACTIONS_SAVE_ICON_GEO_PATCH =
  `        if (viewerMinimizeMode() !== "toolbar") {
          d.iconGeo = {
            left,
            top
          }, await saveViewerIconGeo(d.iconGeo);
        } else {`;

const VENDOR_ACTIONS_TOGGLE_SAVE_NEEDLE =
  `        if (mode === "icon") {
          d.iconGeo = {
            left: curLeft,
            top: curTop
          }, await saveViewerIconGeo(d.iconGeo);
        }`;
const VENDOR_ACTIONS_TOGGLE_SAVE_PATCH =
  `        if (mode !== "toolbar") {
          d.iconGeo = {
            left: curLeft,
            top: curTop
          }, await saveViewerIconGeo(d.iconGeo);
        }`;

const VENDOR_ACTIONS_PRESET_LIVE_NEEDLE =
  `      const presetChromeLive = !d.minimized || viewerMinimizeMode() === "toolbar";`;
const VENDOR_ACTIONS_PRESET_LIVE_PATCH =
  `      const presetChromeLive = !d.minimized || viewerMinimizeMode() === "toolbar" || viewerMinimizeMode() === "actions";`;

const VENDOR_PRESET_MENU_HIT_NEEDLE =
  `      // Ignore non-primary buttons (middle-click message jump removed — never reliable on SafeDOM).
      if (Number(A?.button) != null && Number(A.button) !== 0) return;
      const _ = A.clientX, O = A.clientY;
      if (!await X(r, _, O)) return;`;
const VENDOR_PRESET_MENU_HIT_PATCH =
  `      // Left = normal UI; middle (wheel) button = thumb-strip drag scroll on desktop.
      const btn = Number(A?.button);
      const _ = A.clientX, O = A.clientY;
      if (Number.isFinite(btn) && btn !== 0) {
        if (btn === 1 && !t.uiOpen && !t._hostChromeBlocked && !d.minimized && await X(r, _, O) && await X(E, _, O)) {
          try { A.preventDefault?.(); } catch {}
          await startThumbsDrag(A, _, O, { scrollOnly: !0 });
        }
        return;
      }
      // Dropdown uses overflow:visible under a short minimized panel — menu rect can sit outside \`r\`.
      if (!(await X(r, _, O) || d.presetMenuOpen && d.presetMenu && await X(d.presetMenu, _, O))) return;`;

/** Thumb strip: custom transform scroll (SafeDOM scrollLeft/rects drift; mobile drag + wheel). */
const VENDOR_THUMBS_MOUNT_NEEDLE =
  `    // Native overflow-x so browser wheel / middle-drag autoscroll can move the strip.
    // (JS scrollLeft via SafeDOM is unreliable; custom window.wheel was also bound to the wrong window.)
    }), E = await H(e, "div", { style: "display:flex;gap:8px;overflow-x:auto;overflow-y:hidden;padding-bottom:2px;flex-shrink:0;min-height:92px;max-height:92px;align-items:center;width:100%;box-sizing:border-box;" }), j = await H(e, "div", { style: "display:flex;flex-wrap:nowrap;gap:6px;align-items:center;color:#a6b1c2;font-size:11px;flex:0 0 auto;min-height:34px;height:34px;max-height:34px;overflow:hidden;cursor:pointer;pointer-events:auto;box-sizing:border-box;" });
    await b.appendChild(S), await b.appendChild(C), await b.appendChild(E), await b.appendChild(j), await r.appendChild(i), await r.appendChild(viewerPresetMenu), await r.appendChild(p), await r.appendChild(b), await a.appendChild(r);`;
const VENDOR_THUMBS_MOUNT_PATCH =
  `    // Custom transform scroll — we own the offset (native scrollLeft is untrustworthy in SafeDOM).
    }), E = await H(e, "div", { style: "overflow:hidden;position:relative;padding-bottom:2px;flex-shrink:0;min-height:92px;max-height:92px;width:100%;box-sizing:border-box;touch-action:none;cursor:grab;" }), thumbsTrack = await H(e, "div", { style: "display:flex;gap:8px;align-items:center;width:max-content;max-width:none;transform:translate3d(0,0,0);will-change:transform;touch-action:none;" }), j = await H(e, "div", { style: "display:flex;flex-wrap:nowrap;gap:8px;align-items:center;color:#a6b1c2;font-size:13px;flex:0 0 auto;min-height:56px;height:56px;max-height:56px;overflow-x:auto;overflow-y:hidden;cursor:pointer;pointer-events:auto;box-sizing:border-box;padding:4px 0;" }), resizeGrip = await H(e, "div", {
      // Big touch target — CSS resize:both corner is unusable on mobile.
      style: "position:absolute;right:0;bottom:0;width:56px;height:56px;z-index:50;cursor:nwse-resize;touch-action:none;pointer-events:auto;display:flex;align-items:flex-end;justify-content:flex-end;padding:10px;box-sizing:border-box;background:linear-gradient(135deg,transparent 52%,rgba(148,163,184,.35) 52%)",
      html: ""
    });
    await b.appendChild(S), await b.appendChild(C), await E.appendChild(thumbsTrack), await b.appendChild(E), await b.appendChild(j), await r.appendChild(i), await r.appendChild(viewerPresetMenu), await r.appendChild(p), await r.appendChild(b), await r.appendChild(resizeGrip), await a.appendChild(r);`;

/** Taller header + chip row: keep image stage from eating the meta chips. */
const VENDOR_VIEWER_STAGE_RESERVE_NEEDLE =
  `  function imageStageStyle(geo = {}) {
    const panelH = Math.max(280, Number(geo.h) || 560);
    // header + gaps + status + thumbs + chip row + padding. Prompt block removed — image can grow with panel.
    const reserved = 36 + 14 + 22 + 96 + 40 + 16;`;
const VENDOR_VIEWER_STAGE_RESERVE_PATCH =
  `  function imageStageStyle(geo = {}) {
    const panelH = Math.max(280, Number(geo.h) || 560);
    // Live header height (wraps to 2–3 rows when narrow) + gaps + status + thumbs + chips + padding.
    const headerH = Math.max(52, Number(t.galleryUi?.chromeH) || 56);
    const reserved = headerH + 14 + 28 + 96 + 64 + 16;`;

/** Larger resize corner + always re-apply panel style after CSS resize (min-width can be ignored live). */
const VENDOR_VIEWER_RESIZE_HIT_NEEDLE =
  `        if (B && typeof _ == "number" && typeof O == "number") nearResize = _ >= B.right - 28 && O >= B.bottom - 28;
      } catch {
        return;
      }
      if (!nearResize) return;
      const G = {
        w: d.geo.w,
        h: d.geo.h
      };
      await v({
        syncSize: !0
      }), (Math.abs(G.w - d.geo.w) > 1 || Math.abs(G.h - d.geo.h) > 1) && (await qt(d.geo), await f());`;
const VENDOR_VIEWER_RESIZE_HIT_PATCH =
  `        if (B && typeof _ == "number" && typeof O == "number") nearResize = _ >= B.right - 48 && O >= B.bottom - 48;
      } catch {
        return;
      }
      if (!nearResize) return;
      const G = {
        w: d.geo.w,
        h: d.geo.h
      };
      // Always re-clamp + Ft after CSS resize: browsers may shrink below min-width and clip 접기.
      await v({
        syncSize: !0
      });
      if (Math.abs(G.w - d.geo.w) > 1 || Math.abs(G.h - d.geo.h) > 1) await qt(d.geo);
      typeof d.applyChrome == "function" ? await d.applyChrome() : await f();`;

const VENDOR_VIEWER_META_CHIP_TOUCH_NEEDLE =
  `      const chipStyle = (on, accent) => \`cursor:pointer;pointer-events:auto;display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;font-size:11px;line-height:1.2;white-space:nowrap;border:1px solid \${accent || (on ? "rgba(255,255,255,.14)" : "rgba(248,113,113,.45)")};background:\${accent ? "rgba(124,108,255,.18)" : on ? "rgba(255,255,255,.06)" : "rgba(248,113,113,.12)"};color:\${on ? "#e8eef8" : "#fecaca"};opacity:\${on ? 1 : 0.72}\`, Yt = Array.isArray(Q.characters) ? Q.characters : [], cast = R(Q);`;
const VENDOR_VIEWER_META_CHIP_TOUCH_PATCH =
  `      const chipStyle = (on, accent) => \`cursor:pointer;pointer-events:auto;display:inline-flex;align-items:center;padding:10px 14px;border-radius:999px;font-size:13px;line-height:1.2;min-height:44px;box-sizing:border-box;white-space:nowrap;border:1px solid \${accent || (on ? "rgba(255,255,255,.14)" : "rgba(248,113,113,.45)")};background:\${accent ? "rgba(124,108,255,.18)" : on ? "rgba(255,255,255,.06)" : "rgba(248,113,113,.12)"};color:\${on ? "#e8eef8" : "#fecaca"};opacity:\${on ? 1 : 0.72}\`, Yt = Array.isArray(Q.characters) ? Q.characters : [], cast = R(Q);`;

const VENDOR_VIEWER_META_Y_CHIP_TOUCH_NEEDLE =
  `          await addChip(\`\${Math.round(Math.max(0, Math.min(100, yNum)))}%\`, "y", "padding:4px 8px;border-radius:999px;font-size:11px;line-height:1.2;border:1px solid rgba(255,255,255,.12);background:rgba(15,23,42,.72);color:#94a3b8;font-variant-numeric:tabular-nums;font-weight:700;white-space:nowrap;pointer-events:none");`;
const VENDOR_VIEWER_META_Y_CHIP_TOUCH_PATCH =
  `          await addChip(\`\${Math.round(Math.max(0, Math.min(100, yNum)))}%\`, "y", "padding:10px 14px;border-radius:999px;font-size:13px;line-height:1.2;min-height:44px;box-sizing:border-box;display:inline-flex;align-items:center;border:1px solid rgba(255,255,255,.12);background:rgba(15,23,42,.72);color:#94a3b8;font-variant-numeric:tabular-nums;font-weight:700;white-space:nowrap;pointer-events:none");`;

const VENDOR_THUMBS_STATE_NEEDLE =
  `      preview: S,
      thumbs: E,
      meta: j,`;
const VENDOR_THUMBS_STATE_PATCH =
  `      preview: S,
      thumbs: E,
      thumbsTrack,
      resizeGrip,
      meta: j,`;

const VENDOR_THUMBS_HELPERS_NEEDLE =
  `refreshThumbsRect = async () => {
      try {
        d._thumbsRect = await E.getBoundingClientRect(), d._thumbsRectAt = Date.now();
      } catch {
        d._thumbsRect = null;
      }
    }, paintThumbsChrome = async (items, idx) => {`;
const VENDOR_THUMBS_HELPERS_PATCH =
  `refreshThumbsRect = async () => {
      try {
        d._thumbsRect = await E.getBoundingClientRect(), d._thumbsRectAt = Date.now();
      } catch {
        d._thumbsRect = null;
      }
    }, thumbsPaintEl = () => d.thumbsTrack || E, thumbsMaxOffset = () => {
      const items = Array.isArray(d.items) && d.items.length ? d.items : U(), VC = globalThis.__INLAY_VIEWER_CORE__;
      const contentW = typeof VC?.galleryStripContentWidth == "function" ? VC.galleryStripContentWidth({ count: items.length, selectedCount: d.selectedCount || selectedCountOf(items) || 0 }) : 0;
      return Math.max(0, contentW - Math.max(1, Number(d._thumbsRect?.width) || 1));
    }, applyThumbsOffset = async () => {
      const el = thumbsPaintEl(), x = Math.max(0, Number(d._thumbsScrollLeft) || 0);
      d._thumbsScrollLeft = x;
      try {
        el && typeof el.setStyleAttribute == "function" && await el.setStyleAttribute(\`display:flex;gap:8px;align-items:center;width:max-content;max-width:none;transform:translate3d(\${-x}px,0,0);will-change:transform;touch-action:none;\`);
      } catch {
      }
    }, setThumbsOffset = async (next, opts = {}) => {
      if (opts.refresh) await refreshThumbsRect();
      d._thumbsScrollLeft = Math.max(0, Math.min(thumbsMaxOffset(), Number(next) || 0));
      await applyThumbsOffset();
      return d._thumbsScrollLeft;
    }, paintThumbsChrome = async (items, idx) => {`;

const VENDOR_THUMB_HIT_NEEDLE =
  `    }, hitThumbAt = async (x, y) => {
      // Geometry hit-test — SafeDOM getBoundingClientRect on setInnerHTML <img> drifts past \`|\`.
      const items = Array.isArray(d.items) && d.items.length ? d.items : U();
      if (!items.length) return -1;
      try {
        await refreshThumbsRect();
        const strip = d._thumbsRect;
        if (!strip || x < strip.left || x > strip.right || y < strip.top || y > strip.bottom) return -1;
        const VC = globalThis.__INLAY_VIEWER_CORE__;
        const scrollLeft = await getScrollLeftSafe(E);
        const localX = x - strip.left + scrollLeft;
        if (typeof VC?.thumbIndexAtStripX == "function") {
          return VC.thumbIndexAtStripX(localX, {
            count: items.length,
            selectedCount: d.selectedCount || selectedCountOf(items) || 0
          });
        }
      } catch {
      }
      return -1;
    }, T = async (mode = "full") => {`;
const VENDOR_THUMB_HIT_PATCH =
  `    }, hitThumbAt = async (x, y) => {
      // Same owned offset as transform scroll — never read SafeDOM scrollLeft.
      const items = Array.isArray(d.items) && d.items.length ? d.items : U();
      if (!items.length) return -1;
      try {
        await refreshThumbsRect();
        const strip = d._thumbsRect;
        if (!strip || x < strip.left || x > strip.right || y < strip.top || y > strip.bottom) return -1;
        const VC = globalThis.__INLAY_VIEWER_CORE__;
        const scrollLeft = Math.max(0, Number(d._thumbsScrollLeft) || 0);
        const localX = x - strip.left + scrollLeft;
        if (typeof VC?.thumbIndexAtStripX == "function") {
          return VC.thumbIndexAtStripX(localX, {
            count: items.length,
            selectedCount: d.selectedCount || selectedCountOf(items) || 0
          });
        }
      } catch {
      }
      return -1;
    }, T = async (mode = "full") => {`;

const VENDOR_THUMB_SCROLL_INIT_NEEDLE =
  `    d._thumbsRect = null;
    d._thumbsRectAt = 0;
    d._thumbWheelTargets = [];`;
const VENDOR_THUMB_SCROLL_INIT_PATCH =
  `    d._thumbsRect = null;
    d._thumbsRectAt = 0;
    d._thumbsScrollLeft = 0;
    d.thumbsDrag = null;
    d._thumbWheelTargets = [];`;

const VENDOR_THUMB_SCROLL_WHEEL_NEEDLE =
  `    d._thumbWheel = (ev) => {
      if (t.uiOpen || t._hostChromeBlocked || d.minimized || d.drag) return;
      const x = ev?.clientX, y = ev?.clientY;
      if (typeof x != "number" || typeof y != "number") return;
      const dx = Number(ev.deltaX) || 0, dy = Number(ev.deltaY) || 0, delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      if (!delta) return;
      const rect = d._thumbsRect;
      // Fast sync reject when we have a fresh rect; otherwise refresh async and nudge.
      if (rect && (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom)) return;
      (async () => {
        await refreshThumbsRect();
        const live = d._thumbsRect;
        if (!live || x < live.left || x > live.right || y < live.top || y > live.bottom) return;
        const before = await getScrollLeftSafe(E);
        const ok = await setScrollLeftSafe(E, before + delta);
        const after = await getScrollLeftSafe(E);
        if (ok && Math.abs(after - before) >= 0.5) {
          try {
            ev.preventDefault?.(), ev.stopPropagation?.();
          } catch {
          }
          return;
        }
        // Native overflow may still handle the event if we did not cancel it.
        // If scroll is stuck at an edge, step the selected thumbnail.
        if (Math.abs(after - before) < 0.5) await selectGalIndex(d.index + (delta > 0 ? 1 : -1));
      })().catch(() => {
      });
    };`;
const VENDOR_THUMB_SCROLL_WHEEL_PATCH =
  `    d._thumbWheel = (ev) => {
      if (t.uiOpen || t._hostChromeBlocked || d.minimized || d.drag || d.thumbsDrag) return;
      const x = ev?.clientX, y = ev?.clientY;
      if (typeof x != "number" || typeof y != "number") return;
      const dx = Number(ev.deltaX) || 0, dy = Number(ev.deltaY) || 0, delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      if (!delta) return;
      const rect = d._thumbsRect;
      // Sync reject + preventDefault BEFORE await — otherwise viewer body native-scrolls first.
      if (rect && (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom)) return;
      try {
        ev.preventDefault?.(), ev.stopPropagation?.();
      } catch {
      }
      (async () => {
        await refreshThumbsRect();
        const live = d._thumbsRect;
        if (!live || x < live.left || x > live.right || y < live.top || y > live.bottom) return;
        const before = Math.max(0, Number(d._thumbsScrollLeft) || 0);
        const next = await setThumbsOffset(before + delta, { refresh: !1 });
        if (Math.abs(next - before) < 0.5) await selectGalIndex(d.index + (delta > 0 ? 1 : -1));
      })().catch(() => {
      });
    };`;

/** Viewer body must not native-scroll — steals wheel/touch from the transform thumb strip. */
const VENDOR_VIEWER_BODY_OVERFLOW_NEEDLE =
  `const b = await H(e, "div", { style: \`flex:1;min-height:0;overflow:auto;padding:8px 10px;display:\${minimizedInit ? "none" : "flex"};flex-direction:column;gap:6px;\` })`;
const VENDOR_VIEWER_BODY_OVERFLOW_PATCH =
  `const b = await H(e, "div", { style: \`flex:1;min-height:0;overflow:hidden;padding:8px 10px;display:\${minimizedInit ? "none" : "flex"};flex-direction:column;gap:6px;\` })`;

const VENDOR_VIEWER_BODY_OVERFLOW_CHROME_NEEDLE =
  `await b.setStyleAttribute(\`flex:1;min-height:0;overflow:auto;padding:8px 10px;display:\${d.minimized ? "none" : "flex"};flex-direction:column;gap:6px;\`);`;
const VENDOR_VIEWER_BODY_OVERFLOW_CHROME_PATCH =
  `await b.setStyleAttribute(\`flex:1;min-height:0;overflow:hidden;padding:8px 10px;display:\${d.minimized ? "none" : "flex"};flex-direction:column;gap:6px;\`);
      try {
        d.resizeGrip && await d.resizeGrip.setStyleAttribute(\`position:absolute;right:0;bottom:0;width:56px;height:56px;z-index:50;cursor:nwse-resize;touch-action:none;pointer-events:auto;display:\${d.minimized ? "none" : "flex"};align-items:flex-end;justify-content:flex-end;padding:10px;box-sizing:border-box;background:linear-gradient(135deg,transparent 52%,rgba(148,163,184,.35) 52%)\`);
      } catch {
      }`;

/** After chrome layout: measure wrapped header and size toolbar/panel to match. */
const VENDOR_CHROME_HEIGHT_MEASURE_NEEDLE =
  `      try {
        await p.setStyleAttribute("display:none;");
      } catch {
      }
      await f();
    }, x = async () => {
      if (d.minimized) {
        const left = Math.round(d.geo.left), top = Math.round(d.geo.top);`;
const VENDOR_CHROME_HEIGHT_MEASURE_PATCH =
  `      try {
        await p.setStyleAttribute("display:none;");
      } catch {
      }
      // Header height:auto + wrap — measure real chrome so toolbar/stage reserve aren't stuck at 1-line.
      try {
        const hr = await i.getBoundingClientRect();
        if (hr && hr.height > 0) d.chromeH = Math.max(iconMin ? 48 : 56, Math.ceil(hr.height));
        else if (!(d.chromeH > 0)) d.chromeH = iconMin ? 48 : 56;
      } catch {
        if (!(d.chromeH > 0)) d.chromeH = iconMin ? 48 : 56;
      }
      await f();
      if (toolbarMin) {
        try {
          const hr2 = await i.getBoundingClientRect(), pr2 = await r.getBoundingClientRect();
          if (hr2 && pr2 && Math.abs(hr2.height - pr2.height) > 2) {
            d.chromeH = Math.max(56, Math.ceil(hr2.height));
            await f();
          }
        } catch {
        }
      }
    }, x = async () => {
      if (d.minimized) {
        const left = Math.round(d.geo.left), top = Math.round(d.geo.top);`;

const VENDOR_THUMB_SCROLL_RESET_CHROME_NEEDLE =
  `        thumbBits.push(\`<img data-gal-idx="\${ut}" src="\${src}" style="\${thumbShellStyle(on, split)}" loading="lazy" decoding="async" />\`);
      }
      await E.setInnerHTML(thumbBits.join(""));
      await refreshThumbsRect();
    }, paintThumbsQuick = async (idx) => {`;
const VENDOR_THUMB_SCROLL_RESET_CHROME_PATCH =
  `        thumbBits.push(\`<img data-gal-idx="\${ut}" draggable="false" src="\${src}" style="\${thumbShellStyle(on, split)}" loading="lazy" decoding="async" />\`);
      }
      const keepOff = Math.max(0, Number(d._thumbsScrollLeft) || 0);
      await thumbsPaintEl().setInnerHTML(thumbBits.join(""));
      await refreshThumbsRect();
      await setThumbsOffset(keepOff);
    }, paintThumbsQuick = async (idx) => {`;

const VENDOR_THUMB_SCROLL_RESET_STRIP_NEEDLE =
  `        thumbBits.push(\`<img data-gal-idx="\${ut}" src="\${src || THUMB_PLACEHOLDER}" style="\${shell}" loading="lazy" decoding="async" />\`);
      }
      await E.setInnerHTML(thumbBits.join(""));
      await refreshThumbsRect();
    }, hitThumbAt = async (x, y) => {`;
const VENDOR_THUMB_SCROLL_RESET_STRIP_PATCH =
  `        thumbBits.push(\`<img data-gal-idx="\${ut}" draggable="false" src="\${src || THUMB_PLACEHOLDER}" style="\${shell}" loading="lazy" decoding="async" />\`);
      }
      const keepOff = Math.max(0, Number(d._thumbsScrollLeft) || 0);
      await thumbsPaintEl().setInnerHTML(thumbBits.join(""));
      await refreshThumbsRect();
      await setThumbsOffset(keepOff);
    }, hitThumbAt = async (x, y) => {`;

const VENDOR_THUMBS_KIDS_NEEDLE =
  `await k.unwarpSafeArray(await E.getChildren())`;
const VENDOR_THUMBS_KIDS_PATCH =
  `await k.unwarpSafeArray(await thumbsPaintEl().getChildren())`;

const VENDOR_THUMBS_CLEAR_NEEDLE =
  `await S.setInnerHTML(Le), await E.setInnerHTML(""), d.metaHits = [], d._metaCardId = "", await j.setInnerHTML(""), await paintStatus(), await g();`;
const VENDOR_THUMBS_CLEAR_PATCH =
  `await S.setInnerHTML(Le), await thumbsPaintEl().setInnerHTML(""), d._thumbsScrollLeft = 0, await applyThumbsOffset(), d.metaHits = [], d._metaCardId = "", await j.setInnerHTML(""), await paintStatus(), await g();`;

const VENDOR_THUMBS_POINTER_NEEDLE =
  `        {
          const galIdx = await hitThumbAt(_, O);
          if (galIdx >= 0) {
            await selectGalIndex(galIdx);
            return;
          }
        }`;
const VENDOR_THUMBS_POINTER_PATCH =
  `        if (await X(E, _, O)) {
          try { A.preventDefault?.(); } catch {}
          await startThumbsDrag(A, _, O);
          return;
        }`;

const VENDOR_THUMBS_DRAG_NEEDLE =
  `    }, startViewerDrag = async (A, _, O, expandOnTap) => {
      if (!expandOnTap) await v();
      const B = await e.addEventListener("pointermove", Za), W = await e.addEventListener("pointerup", en), cancelId = await e.addEventListener("pointercancel", onViewerDragCancel);
      d.drag = {
        startCX: _,
        startCY: O,
        originX: d.geo.left,
        originY: d.geo.top,
        moved: !1,
        expandOnTap: !!expandOnTap,
        moveId: B,
        upId: W,
        cancelId,
        lastApply: 0
      };
    }, tn = async (A) => {`;
const VENDOR_THUMBS_DRAG_PATCH =
  `    }, onThumbsDragMove = async (A) => {
      if (!d.thumbsDrag || d.drag) return;
      const cx = Number(A?.clientX), cy = Number(A?.clientY);
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
      const dx = cx - d.thumbsDrag.startX, dy = cy - d.thumbsDrag.startY;
      // Middle-button / intentional strip drag: move immediately. Left-tap keeps a small slop for click-select.
      const slop = d.thumbsDrag.scrollOnly ? 1 : 6;
      if (!d.thumbsDrag.moved && Math.abs(dx) + Math.abs(dy) > slop) d.thumbsDrag.moved = !0;
      if (!d.thumbsDrag.moved) return;
      try {
        A.preventDefault?.();
      } catch {
      }
      await setThumbsOffset(d.thumbsDrag.origin - dx);
    }, endThumbsDrag = async () => {
      if (!d.thumbsDrag) return;
      const { moveId, upId, cancelId, moved, pickX, pickY, scrollOnly } = d.thumbsDrag;
      d.thumbsDrag = null;
      try {
        moveId != null && await e.removeEventListener(moveId);
      } catch {
      }
      try {
        upId != null && await e.removeEventListener(upId);
      } catch {
      }
      try {
        cancelId != null && await e.removeEventListener(cancelId);
      } catch {
      }
      if (!moved && !scrollOnly) {
        const galIdx = await hitThumbAt(pickX, pickY);
        if (galIdx >= 0) await selectGalIndex(galIdx);
      }
    }, startThumbsDrag = async (A, startX, startY, opts = {}) => {
      if (d.thumbsDrag) await endThumbsDrag();
      try {
        A.preventDefault?.();
      } catch {
      }
      const moveId = await e.addEventListener("pointermove", onThumbsDragMove), upId = await e.addEventListener("pointerup", endThumbsDrag), cancelId = await e.addEventListener("pointercancel", endThumbsDrag);
      d.thumbsDrag = {
        startX,
        startY,
        origin: Math.max(0, Number(d._thumbsScrollLeft) || 0),
        moved: !1,
        scrollOnly: !!opts.scrollOnly || Number(A?.button) === 1,
        pickX: startX,
        pickY: startY,
        moveId,
        upId,
        cancelId
      };
    }, startViewerDrag = async (A, _, O, expandOnTap) => {
      // Capture live CSS-resized size before f() reapplies Ft — otherwise move resets the panel.
      await v(d.minimized ? {} : { syncSize: !0 });
      const B = await e.addEventListener("pointermove", Za), W = await e.addEventListener("pointerup", en), cancelId = await e.addEventListener("pointercancel", onViewerDragCancel);
      d.drag = {
        startCX: _,
        startCY: O,
        originX: d.geo.left,
        originY: d.geo.top,
        moved: !1,
        expandOnTap: !!expandOnTap,
        moveId: B,
        upId: W,
        cancelId,
        lastApply: 0
      };
    }, onViewerResizeMove = async (A) => {
      if (!d.resize || d.drag) return;
      const cx = Number(A?.clientX), cy = Number(A?.clientY);
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
      const dw = cx - d.resize.startCX, dh = cy - d.resize.startCY;
      if (!d.resize.moved && Math.abs(dw) + Math.abs(dh) > 2) d.resize.moved = !0;
      try {
        A.preventDefault?.();
      } catch {
      }
      d.geo.w = Math.max(260, d.resize.originW + dw);
      d.geo.h = Math.max(280, d.resize.originH + dh);
      d.expandedH = d.geo.h;
      d.geo = clampViewerGeo(d.geo, !1);
      const now = Date.now();
      if (now - (d.resize.lastApply || 0) < 16) return;
      d.resize.lastApply = now;
      await f();
    }, endViewerResize = async () => {
      if (!d.resize) return;
      const { moveId, upId, cancelId } = d.resize;
      d.resize = null;
      try {
        moveId != null && await e.removeEventListener(moveId);
      } catch {
      }
      try {
        upId != null && await e.removeEventListener(upId);
      } catch {
      }
      try {
        cancelId != null && await e.removeEventListener(cancelId);
      } catch {
      }
      await v({ syncSize: !0 });
      try {
        await qt(d.geo);
      } catch {
      }
      typeof d.applyChrome == "function" ? await d.applyChrome() : await f();
    }, startViewerResize = async (A, _, O) => {
      if (d.minimized || d.drag || d.resize) return;
      await v({ syncSize: !0 });
      try {
        A.preventDefault?.();
      } catch {
      }
      const moveId = await e.addEventListener("pointermove", onViewerResizeMove), upId = await e.addEventListener("pointerup", endViewerResize), cancelId = await e.addEventListener("pointercancel", endViewerResize);
      d.resize = {
        startCX: _,
        startCY: O,
        originW: Math.max(260, Number(d.geo.w) || 260),
        originH: Math.max(280, Number(d.geo.h) || 280),
        moved: !1,
        moveId,
        upId,
        cancelId,
        lastApply: 0
      };
    }, tn = async (A) => {`;

const VENDOR_ACTIONS_POINTER_NEEDLE =
  `      // Icon minimize is its own chrome (tap/drag to move/expand).
      // Toolbar minimize is the SAME header — just hide the body — so keep normal button/preset hit-tests.
      if (d.minimized && viewerMinimizeMode() === "icon") {
        await startViewerDrag(A, _, O, !0);
        return;
      }`;
const VENDOR_ACTIONS_POINTER_PATCH =
  `      // Icon minimize is its own chrome (tap/drag to move/expand).
      // Actions minimize: short-tap buttons; long-press expands; drag moves.
      // Toolbar minimize is the SAME header — just hide the body — so keep normal button/preset hit-tests.
      if (d.minimized && viewerMinimizeMode() === "icon") {
        await startViewerDrag(A, _, O, !0);
        return;
      }
      if (d.minimized && viewerMinimizeMode() === "actions") {
        if (d.actionsFolded == null) d.actionsFolded = !1;
        if (!d.actionsFolded && d.presetMenuOpen && d.presetMenu) {
          if (await hitPresetItemAt(_, O) || await X(d.presetMenu, _, O)) {
            await startPresetMenuGesture(A, _, O);
            return;
          }
        }
        if (!d.actionsFolded && d.presetSelect && await X(d.presetSelect, _, O)) {
          d.presetMenuOpen = !d.presetMenuOpen;
          await syncViewerPresetSelect();
          return;
        }
        if (await X(c, _, O)) {
          d.actionsFolded = !d.actionsFolded;
          d.presetMenuOpen = !1;
          try {
            await syncViewerPresetSelect();
          } catch {
          }
          d.geo = clampViewerGeo(d.geo, !0);
          await applyViewerChrome();
          return;
        }
        if (!d.actionsFolded && await X(s, _, O)) {
          try {
            const kids = typeof k.unwarpSafeArray == "function" ? await k.unwarpSafeArray(await s.getChildren()) : [];
            // Layout: [0]=drag pad, [1]=tag, [2]=regen, [3]=stop
            for (let W = 1; W < kids.length; W += 1) {
              const J = await kids[W].getBoundingClientRect();
              if (_ >= J.left && _ <= J.right && O >= J.top && O <= J.bottom) {
                W === 1 ? await te() : W === 2 ? await rerollAllImages() : W === 3 && await optimisticStopJobs();
                return;
              }
            }
          } catch {
          }
        }
        if (d.presetMenuOpen) {
          d.presetMenuOpen = !1;
          try {
            await syncViewerPresetSelect();
          } catch {
          }
        }
        await startViewerDrag(A, _, O, !1);
        if (d._actionsLpTimer) clearTimeout(d._actionsLpTimer);
        d._actionsLpTimer = setTimeout(() => {
          d._actionsLpTimer = null;
          if (!d.drag || d.drag.moved || !d.minimized || viewerMinimizeMode() !== "actions") return;
          endViewerDrag({ cancelled: !0 }).then(() => toggleMinimizeBtn()).catch(() => {
          });
        }, 450);
        return;
      }`;

const VENDOR_ACTIONS_DRAG_CLEAR_NEEDLE =
  `    }, Za = async (A) => {
      if (!d.drag) return;
      const cx = Number(A?.clientX), cy = Number(A?.clientY);
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
      const _ = cx - d.drag.startCX, O = cy - d.drag.startCY;
      !d.drag.moved && Math.abs(_) + Math.abs(O) > 4 && (d.drag.moved = !0);
      if (d.drag.moved) try {
        A.preventDefault?.();
      } catch {
      }
      d.geo.left = d.drag.originX + _, d.geo.top = d.drag.originY + O, d.geo = clampViewerGeo(d.geo, d.minimized);
      const G = Date.now();
      if (G - (d.drag.lastApply || 0) < 16) return;
      d.drag.lastApply = G, await f();
    }, endViewerDrag = async (opts = {}) => {
      if (!d.drag) return;
      const { moveId: A, upId: _, cancelId: cancelId, moved: moved, expandOnTap: expandOnTap } = d.drag;
      d.drag = null;`;
const VENDOR_ACTIONS_DRAG_CLEAR_PATCH =
  `    }, Za = async (A) => {
      if (!d.drag || d.resize) return;
      const cx = Number(A?.clientX), cy = Number(A?.clientY);
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
      const _ = cx - d.drag.startCX, O = cy - d.drag.startCY;
      if (!d.drag.moved && Math.abs(_) + Math.abs(O) > 4) {
        d.drag.moved = !0;
        if (d._actionsLpTimer) clearTimeout(d._actionsLpTimer), d._actionsLpTimer = null;
        // 유체이탈: keep heavy panel faded in place; only a light ghost tracks the pointer.
        try {
          const faded = Ft(d.geo, d.minimized);
          await r.setStyleAttribute(/opacity:/i.test(faded) ? faded.replace(/opacity:[^;]+/i, "opacity:0.3") : faded + ";opacity:0.3");
        } catch {
        }
        try {
          if (!d.dragGhost) {
            const gw = Math.max(48, Number(d.geo.dispW || d.geo.w) || 260), gh = Math.max(48, Number(d.geo.dispH || d.geo.h) || (d.minimized ? 56 : 280));
            d.dragGhost = await H(e, "div", {
              style: \`position:fixed;left:\${d.geo.left}px;top:\${d.geo.top}px;width:\${gw}px;height:\${gh}px;z-index:99995;pointer-events:none;box-sizing:border-box;border:2px solid rgba(167,139,250,.9);border-radius:16px;background:rgba(15,23,42,.4);box-shadow:0 16px 48px rgba(0,0,0,.5)\`
            });
            await a.appendChild(d.dragGhost);
          }
        } catch {
        }
      }
      if (!d.drag.moved) return;
      try {
        A.preventDefault?.();
      } catch {
      }
      const probe = clampViewerGeo({
        ...d.geo,
        left: d.drag.originX + _,
        top: d.drag.originY + O
      }, d.minimized);
      d.drag.ghostLeft = probe.left, d.drag.ghostTop = probe.top;
      const G = Date.now();
      if (G - (d.drag.lastApply || 0) < 100) return;
      d.drag.lastApply = G;
      if (d.dragGhost) {
        try {
          await d.dragGhost.setStyleAttribute(\`position:fixed;left:\${probe.left}px;top:\${probe.top}px;width:\${probe.dispW}px;height:\${probe.dispH}px;z-index:99995;pointer-events:none;box-sizing:border-box;border:2px solid rgba(167,139,250,.9);border-radius:16px;background:rgba(15,23,42,.4);box-shadow:0 16px 48px rgba(0,0,0,.5)\`);
        } catch {
        }
      }
    }, endViewerDrag = async (opts = {}) => {
      if (!d.drag) return;
      if (d._actionsLpTimer) clearTimeout(d._actionsLpTimer), d._actionsLpTimer = null;
      const { moveId: A, upId: _, cancelId: cancelId, moved: moved, expandOnTap: expandOnTap } = d.drag;
      const ghostLeft = d.drag.ghostLeft, ghostTop = d.drag.ghostTop;
      d.drag = null;`;


const VENDOR_ACTIONS_END_CLEAR_NEEDLE =
  `      try {
        A != null && await e.removeEventListener(A);
      } catch {
      }
      try {
        _ != null && await e.removeEventListener(_);
      } catch {
      }
      try {
        cancelId != null && await e.removeEventListener(cancelId);
      } catch {
      }
      if (opts.cancelled) {
        if (moved) await x();
        await refreshThumbsRect();
        return;
      }
      if (!moved && expandOnTap && d.minimized) {
        await toggleMinimizeBtn();
        await refreshThumbsRect();
        return;
      }
      await x();
      await refreshThumbsRect();
    }, en = async () => {`;
const VENDOR_ACTIONS_END_CLEAR_PATCH =
  `      const ghostEl = d.dragGhost;
      d.dragGhost = null;
      const cleanupDragChrome = async () => {
        try { A != null && await e.removeEventListener(A); } catch {}
        try { _ != null && await e.removeEventListener(_); } catch {}
        try { cancelId != null && await e.removeEventListener(cancelId); } catch {}
        if (ghostEl) {
          try { await a.removeChild(ghostEl); } catch { try { ghostEl.remove?.(); } catch {} }
        }
      };
      if (opts.cancelled) {
        try { if (ghostEl) await ghostEl.setStyleAttribute("display:none;pointer-events:none;opacity:0"); } catch {}
        try { await f(); } catch {}
        void cleanupDragChrome();
        void refreshThumbsRect().catch(() => {});
        return;
      }
      if (!moved && expandOnTap && d.minimized) {
        void cleanupDragChrome();
        if (t.uiOpen || t._hostChromeBlocked || t._viewerHiddenForModal || t._viewerHiddenForRisuSettings) {
          void refreshThumbsRect().catch(() => {});
          return;
        }
        try {
          const doc = await ue().catch(() => null);
          const el = doc ? await D("rsSettingCont", () => doc.querySelector?.(".rs-setting-cont"), null) : null;
          if (el) {
            try { await hideFloatingViewerForRisuSettings(); } catch {}
            void refreshThumbsRect().catch(() => {});
            return;
          }
        } catch {}
        await toggleMinimizeBtn();
        void refreshThumbsRect().catch(() => {});
        return;
      }
      if (moved && Number.isFinite(ghostLeft) && Number.isFinite(ghostTop)) {
        d.geo.left = ghostLeft, d.geo.top = ghostTop, d.geo = clampViewerGeo(d.geo, d.minimized);
        // Optimistic: paint first, persist/listeners behind (was: removeListener×3 → qt → f).
        try { if (ghostEl) await ghostEl.setStyleAttribute("display:none;pointer-events:none;opacity:0"); } catch {}
        try { await f(); } catch {}
        void (async () => {
          await cleanupDragChrome();
          try {
            const left = Math.round(d.geo.left), top = Math.round(d.geo.top);
            if (!d.minimized) {
              d.expandedGeo = { left, top, w: d.geo.w, h: d.geo.h };
              await qt(d.expandedGeo);
            } else if (viewerMinimizeMode() !== "toolbar") {
              d.iconGeo = { left, top };
              await saveViewerIconGeo(d.iconGeo);
            } else {
              d.expandedGeo = {
                ...(d.expandedGeo || { w: d.geo.w, h: d.geo.h }),
                left,
                top
              };
              await qt(d.expandedGeo);
            }
          } catch {}
          try { await refreshThumbsRect(); } catch {}
        })();
        return;
      }
      void cleanupDragChrome();
      void refreshThumbsRect().catch(() => {});
    }, en = async () => {`;

/** Icon tap-expand must not fire after settings/modal already opened (same gesture pointerup). */
const VENDOR_ICON_EXPAND_GUARD_NEEDLE =
  `      if (!moved && expandOnTap && d.minimized) {
        await toggleMinimizeBtn();
        await refreshThumbsRect();
        return;
      }`;
const VENDOR_ICON_EXPAND_GUARD_PATCH =
  `      if (!moved && expandOnTap && d.minimized) {
        if (t.uiOpen || t._hostChromeBlocked || t._viewerHiddenForModal || t._viewerHiddenForRisuSettings) {
          await refreshThumbsRect();
          return;
        }
        try {
          const doc = await ue().catch(() => null);
          const el = doc ? await D("rsSettingCont", () => doc.querySelector?.(".rs-setting-cont"), null) : null;
          if (el) {
            try { await hideFloatingViewerForRisuSettings(); } catch {}
            await refreshThumbsRect();
            return;
          }
        } catch {
        }
        await toggleMinimizeBtn();
        await refreshThumbsRect();
        return;
      }`;

/** Settings/modal hide: cancel pending icon expandOnTap so pointerup cannot re-show the viewer. */
const VENDOR_HIDE_MODAL_CANCEL_EXPAND_NEEDLE =
  `  async function hideFloatingViewerForModal() {
    t._viewerHiddenForModal = !0;
    const g = t.galleryUi;
    if (!g?.panel) return;
    try {
      if (g.root && typeof g.root.setStyleAttribute == "function") await g.root.setStyleAttribute("position:fixed;left:0;top:0;width:0;height:0;z-index:99990;pointer-events:none;opacity:0;visibility:hidden;");
      await g.panel.setStyleAttribute("position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;visibility:hidden;z-index:1;");
    } catch {
    }
  }`;
const VENDOR_HIDE_MODAL_CANCEL_EXPAND_PATCH =
  `  async function hideFloatingViewerForModal() {
    t._viewerHiddenForModal = !0;
    const g = t.galleryUi;
    if (g?.drag) g.drag.expandOnTap = !1;
    if (g?._actionsLpTimer) clearTimeout(g._actionsLpTimer), g._actionsLpTimer = null;
    if (!g?.panel) return;
    try {
      // True 0×0 (not 1px): kills mobile hitboxes; geo stays so restore can applyChrome.
      if (g.root && typeof g.root.setStyleAttribute == "function") await g.root.setStyleAttribute("position:fixed;left:0;top:0;width:0;height:0;z-index:99990;pointer-events:none;opacity:0;visibility:hidden;");
      await g.panel.setStyleAttribute("position:fixed;left:0;top:0;width:0;height:0;min-width:0;min-height:0;max-width:0;max-height:0;padding:0;margin:0;border:0;opacity:0;pointer-events:none;visibility:hidden;overflow:hidden;z-index:1;resize:none;display:block;");
    } catch {
    }
  }`;

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
  'curation_refine', 'curation_embed_hint', 'asset_tags_inject', 'char_looks',
  'command_reroll', 'lorefilter_scan',
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
  {
    let coverCount = 0;
    let at = raw.indexOf(VENDOR_STICKY_COVER_NEEDLE);
    while (at !== -1) {
      coverCount += 1;
      at = raw.indexOf(VENDOR_STICKY_COVER_NEEDLE, at + VENDOR_STICKY_COVER_NEEDLE.length);
    }
    if (coverCount !== 4) {
      throw new Error(`[build] expected 4× sticky/viewer object-fit:cover fill, found ${coverCount}`);
    }
  }
  {
    let shellBgCount = 0;
    let at = raw.indexOf(VENDOR_STICKY_SHELL_BG_NEEDLE);
    while (at !== -1) {
      shellBgCount += 1;
      at = raw.indexOf(VENDOR_STICKY_SHELL_BG_NEEDLE, at + VENDOR_STICKY_SHELL_BG_NEEDLE.length);
    }
    if (shellBgCount !== 2) {
      throw new Error(`[build] expected 2× sticky shell border+shadow+#0b0f18, found ${shellBgCount}`);
    }
  }
  assertOnce(raw, VENDOR_STICKY_EMPTY_NEEDLE, 'sticky empty placeholder');
  assertOnce(raw, VENDOR_EXPLORER_CARD_IMG_NEEDLE, 'explorer card img contain');
  assertOnce(raw, VENDOR_EXPLORER_CAP_CSS_NEEDLE, 'explorer cap overlay');
  assertOnce(raw, VENDOR_EXPLORER_TIP_BIND_NEEDLE, 'explorer tip bind off');
  assertOnce(raw, VENDOR_EXPLORER_LONGPRESS_NEEDLE, 'explorer longpress ctx');
  assertOnce(raw, VENDOR_EXPLORER_CTX_DISMISS_NEEDLE, 'explorer ctx dismiss');
  assertOnce(raw, VENDOR_VIEWER_THUMB_SHELL_NEEDLE, 'viewer thumb shell contain');
  assertOnce(raw, VENDOR_PROMPT_RESET_NEEDLE, 'prompt-reset confirm insertion point');
  assertOnce(raw, VENDOR_PROMPT_TAB_HTML_NEEDLE, 'prompts tab HTML');
  assertOnce(raw, VENDOR_PROMPT_TAB_EVENTS_NEEDLE, 'prompts tab events');
  assertOnce(raw, VENDOR_NATURAL_BASE_HTML_NEEDLE, 'natural_base checkbox');
  assertOnce(raw, VENDOR_NATURAL_BASE_SAVE_NEEDLE, 'natural_base save ee()');
  assertOnce(raw, VENDOR_NATURAL_BASE_CT_NEEDLE, 'natural_base Ct() insert');
  assertOnce(raw, VENDOR_NATURAL_BASE_CARD_NEEDLE, 'natural_base card 3-col');
  assertOnce(raw, VENDOR_NATURAL_BASE_HELP_NEEDLE, 'natural_base help entry');
  assertOnce(raw, VENDOR_PERSON_TAG_WEIGHT_HTML_NEEDLE, 'person_tag_weight HTML');
  assertOnce(raw, VENDOR_PERSON_TAG_WEIGHT_CT_NEEDLE, 'person_tag_weight Ct()');
  assertOnce(raw, VENDOR_PERSON_TAG_SOLO_HTML_NEEDLE, 'person_tag_solo HTML');
  assertOnce(raw, VENDOR_PERSON_TAG_SOLO_CT_NEEDLE, 'person_tag_solo Ct()');
  assertOnce(raw, VENDOR_CARD_TAG_PERSON_SLOTS_NEEDLE, 'card tag personTagsForSlots solo');
  assertOnce(raw, VENDOR_CARD_TAG_PERSON_INIT_NEEDLE, 'card tag person initMode');
  assertOnce(raw, VENDOR_CARD_TAG_PERSON_SELECT_NEEDLE, 'card tag person select off');
  assertOnce(raw, VENDOR_CARD_TAG_PERSON_MODE_NEEDLE, 'card tag currentMode off');
  assertOnce(raw, VENDOR_ASSET_NAI_HTML_NEEDLE, 'asset_nai_tags HTML');
  assertOnce(raw, VENDOR_ASSET_NAI_SAVE_NEEDLE, 'asset_nai_tags save');
  assertOnce(raw, VENDOR_ASSET_NAI_HELP_NEEDLE, 'asset_nai_tags help');
  // Card select + Ct() needles exist only after natural_base patches; checked in applyVendorPatches.
  assertOnce(raw, VENDOR_COMFY_MUTED_NEEDLE, 'comfy muted placeholders');
  assertOnce(raw, VENDOR_COMFY_HELP_NEEDLE, 'comfy help width/height');
  assertOnce(raw, VENDOR_CURATION_TABS_NEEDLE, 'curation tabs S/E');
  assertOnce(raw, VENDOR_CURATION_PANEL_NEEDLE, 'curation panel insert');
  assertOnce(raw, VENDOR_DEBUG_PANEL_NEEDLE, 'debug panel 로그/태깅');
  assertOnce(raw, VENDOR_DEBUG_EVENTS_NEEDLE, 'debug panel events');
  assertOnce(raw, VENDOR_CURATION_EVENTS_NEEDLE, 'curation events insert');
  assertOnce(raw, VENDOR_CURATION_TAB_LOAD_NEEDLE, 'curation tab load');
  assertOnce(raw, VENDOR_GLOBAL_TOGGLE_SUMMARY_NEEDLE, 'global toggle summary');
  assertOnce(raw, VENDOR_GLOBAL_TOGGLE_BODY_NEEDLE, 'global toggle body row');
  assertOnce(raw, VENDOR_EXPLORER_ET_NEEDLE, 'explorer Et no auto all');
  assertOnce(raw, VENDOR_EXPLORER_ZE_NEEDLE, 'explorer Ze pick mode');
  assertOnce(raw, VENDOR_EXPLORER_ENSURE_NEEDLE, 'explorer ensure expanded');
  assertOnce(raw, VENDOR_EXPLORER_CSS_NEEDLE, 'explorer folders css');
  assertOnce(raw, VENDOR_EXPLORER_GRID_CSS_NEEDLE, 'explorer grid css viewport');
  assertOnce(raw, VENDOR_EXPLORER_SHELL_OPEN_NEEDLE, 'explorer shell open');
  assertOnce(raw, VENDOR_EXPLORER_SHELL_FOOT_NEEDLE, 'explorer shell foot');
  assertOnce(raw, VENDOR_EXPLORER_FOLDERS_TOGGLE_NEEDLE, 'explorer folders toggle');
  assertOnce(raw, VENDOR_EXPLORER_MOBILE_1COL_NEEDLE, 'explorer mobile 1col override');
  assertOnce(raw, VENDOR_EXPLORER_FOLDERS_HTML_NEEDLE, 'explorer folders html');
  assertOnce(raw, VENDOR_EXPLORER_GRID_HTML_NEEDLE, 'explorer grid html');
  assertOnce(raw, VENDOR_EXPLORER_SELBAR_LABELS_NEEDLE, 'explorer selbar short labels');
  assertOnce(raw, VENDOR_EXPLORER_FAVONLY_PAINT_NEEDLE, 'explorer favonly paint star-only');
  assertOnce(raw, VENDOR_EXPLORER_ET_FN_NEEDLE, 'explorer et windowed');
  assertOnce(raw, VENDOR_EXPLORER_HA_NEEDLE, 'explorer ha window paint');
  assertOnce(raw, VENDOR_EXPLORER_TAB_LOAD_NEEDLE, 'explorer tab load optimistic');
  assertOnce(raw, VENDOR_EXPLORER_DELETE_SEL_NEEDLE, 'explorer delete selected optimistic');
  assertOnce(raw, VENDOR_EXPLORER_DELETE_FOLDER_NEEDLE, 'explorer delete folder optimistic');
  assertOnce(raw, VENDOR_EXPLORER_FOLDER_BIND_NEEDLE, 'explorer folder bind');
  assertOnce(raw, VENDOR_EXPLORER_FILTER_ET_NEEDLE, 'explorer filter rewindow');
  assertOnce(raw, VENDOR_EXPLORER_THUMB_PAINT_NEEDLE, 'explorer thumb paint');
  assertOnce(raw, VENDOR_EXPLORER_THUMB_WARM_NEEDLE, 'explorer thumb warm');
  assertOnce(raw, VENDOR_EXPLORER_WARM_PROGRESS_NEEDLE, 'explorer warm progress');
  assertOnce(raw, VENDOR_PRESET_QT_NEEDLE, 'preset Qt()');
  assertOnce(raw, VENDOR_PRESET_PN_NEEDLE, 'preset pn() lorebook_export');
  assertOnce(raw, VENDOR_PRESET_UN_NEEDLE, 'preset un() merge');
  assertOnce(raw, VENDOR_PRESET_HTML_NEEDLE, 'preset HTML cfg/vibe');
  assertOnce(raw, VENDOR_PRESET_HEAD_SAVE_NEEDLE, 'preset head save button');
  assertOnce(raw, VENDOR_PRESET_SAVE_EVT_NEEDLE, 'preset save card events');
  assertOnce(raw, VENDOR_PRESET_READ_NEEDLE, 'preset _e() read');
  assertOnce(raw, VENDOR_PRESET_FA_NEEDLE, 'preset fa() write');
  assertOnce(raw, VENDOR_PRESET_SYNC_NEEDLE, 'preset form sync');
  assertOnce(raw, VENDOR_PRESET_EXPORT_NEEDLE, 'preset JSON export');
  assertOnce(raw, VENDOR_PRESET_ST_ERR_NEEDLE, 'preset St() error text');
  assertOnce(raw, VENDOR_PRESET_PASTE_DETECT_NEEDLE, 'preset paste detect');
  assertOnce(raw, VENDOR_PRESET_NEW_NEEDLE, 'preset new');
  assertOnce(raw, VENDOR_PRESET_DUP_NEEDLE, 'preset dup');
  assertOnce(raw, VENDOR_PRESET_DEL_NEEDLE, 'preset del clear vibe');
  assertOnce(raw, VENDOR_PRESET_VIBE_EVT_NEEDLE, 'preset vibe upload events');
  assertOnce(raw, VENDOR_CARD_TAB_SPLIT_COND_NEEDLE, 'card tab split cond');
  assertOnce(raw, VENDOR_CARD_TAB_SPLIT_OPEN_NEEDLE, 'card tab split open');
  assertOnce(raw, VENDOR_CARD_TAB_SPLIT_MID_NEEDLE, 'card tab split mid');
  // CLOSE needle matches post-PRESET_HTML shape — asserted in applyVendorPatches.
  assertOnce(raw, VENDOR_CT_GATE_NEEDLE, 'Ct() gate for preset-only tab');
  assertOnce(raw, VENDOR_SHOW_CARD_TAB_NEEDLE, 'showCardTab → style_presets');
  assertOnce(raw, VENDOR_MODELS_LLM_NEEDLE, 'models LLM role subtabs HTML');
  assertOnce(raw, VENDOR_OE_LLM_NEEDLE, 'Oe() llm roles read');
  assertOnce(raw, VENDOR_OE_RETURN_NEEDLE, 'Oe() return llm_roles');
  assertOnce(raw, VENDOR_LLM_BIND_NEEDLE, 'models LLM role bind events');
  assertOnce(raw, VENDOR_LLM_SAVE_TEST_NEEDLE, 'models LLM save/test events');
  assertOnce(raw, VENDOR_IMG_BACKEND_DRAFT_NEEDLE, 'img backend draft llm_roles');
  assertOnce(raw, VENDOR_BA_QUEUE_NEEDLE, 'ba() queue llm_roles');
  for (const [needle, label] of [
    [VENDOR_STICKY_TAKE_NEEDLE, 'sticky takePooledMarker'],
    [VENDOR_NT_NEEDLE, 'overlay Nt always-on sync'],
    [VENDOR_PIN_OFFSCREEN_NEEDLE, 'overlay pin offscreen when hidden'],
    [VENDOR_STICKY_LA_NEEDLE, 'sticky La()'],
    [VENDOR_STICKY_FLASH_NEAR_NEEDLE, 'sticky flash nearest pointer'],
    [VENDOR_STICKY_HT_NEAR_NEEDLE, 'sticky Ht nearest pointer'],
    [VENDOR_STICKY_NX_ACTIVATE_NEEDLE, 'nx sticky activate helpers'],
    [VENDOR_INLINE_PTR_STICKY_NEEDLE, 'inline pointer sticky sync'],
    [VENDOR_SCROLL_PHASE_NEEDLE, 'scroll phase bus'],
    [VENDOR_SCROLL_TRACK_SNAP_NEEDLE, 'scroll track sticky snap'],
    [VENDOR_SCROLL_TRACK_VH_NEEDLE, 'scroll track viewport mid'],
    [VENDOR_HOVER_PREVIEW_OFF_NEEDLE, 'hover preview force off'],
    [VENDOR_HOVER_PREVIEW_TOGGLE_NEEDLE, 'hover preview toggle remove'],
    [VENDOR_HOVER_ANCHOR_NEEDLE, 'hover preview anchor remove'],
    [VENDOR_INLINE_PCT_HELP_NEEDLE, 'inline pct help 0%'],
    [VENDOR_INLINE_PCT_HTML_NEEDLE, 'inline pct html min 0'],
    [VENDOR_INLINE_PCT_SAVE_NEEDLE, 'inline pct save min 0'],
    [VENDOR_INLINE_PCT_LIVE_NEEDLE, 'inline pct live min 0'],
    [VENDOR_STICKY_CLICK_NEEDLE, 'sticky click hide/revive'],
    [VENDOR_STICKY_PRESS_NEEDLE, 'sticky press skip'],
    [VENDOR_PRESS_FILL_NEEDLE, 'press fill lightweight ring'],
    [VENDOR_PRESS_FILL_STICKY_CALL_NEEDLE, 'press fill sticky call xy'],
    [VENDOR_INLINE_LONGPRESS_NEEDLE, 'inline shot long-press'],
    [VENDOR_STICKY_REVIVE_NEEDLE, 'sticky pin revive'],
    [VENDOR_STICKY_INIT_NEEDLE, 'sticky init flags'],
    [VENDOR_STICKY_RESET_NEEDLE, 'sticky reset flags'],
    [VENDOR_STICKY_OPEN_CARD_NEEDLE, 'sticky open card edit'],
    [VENDOR_STICKY_OPEN_CHAR_NEEDLE, 'sticky open char edit'],
    [VENDOR_STICKY_CLOSE_CARD_NEEDLE, 'sticky close card edit'],
    [VENDOR_STICKY_CLOSE_CHAR_NEEDLE, 'sticky close char edit'],
    [VENDOR_SETTINGS_OPEN_STICKY_NEEDLE, 'settings open sticky hide'],
    [VENDOR_SETTINGS_AT_HIDE_PANEL_NEEDLE, 'settings At hide panel + rehide'],
    [VENDOR_SETTINGS_CLOSE_STICKY_NEEDLE, 'settings close sticky restore'],
    [VENDOR_BLOCK_HOST_UNBLOCK_NEEDLE, 'blockHostChrome unblock style-only'],
    [VENDOR_SANGSI_TOGGLE_NEEDLE, 'viewer 상시 optimistic toggle'],
    [VENDOR_SETTINGS_WATCH_STICKY_NEEDLE, 'settings watch sticky restore'],
    [VENDOR_OVERLAY_MOUNT_NEEDLE, 'overlay keep Ya shell'],
    [VENDOR_OVERLAY_WATCH_NEEDLE, 'overlay watchdog always shell'],
    [VENDOR_OVERLAY_RETRY_NEEDLE, 'overlay retry always shell'],
    [VENDOR_OVERLAY_HT_HIDE_NEEDLE, 'overlay Ht hide when off'],
    [VENDOR_OVERLAY_JA_HIDE_NEEDLE, 'overlay Ja hide when off'],
    [VENDOR_OVERLAY_HELP_NEEDLE, 'overlay help click keeps'],
    [VENDOR_TOOLBAR_SANGSI_NEEDLE, 'toolbar 상시 visual on'],
    [VENDOR_TOOLBAR_SANGSI_REFRESH_NEEDLE, 'toolbar 상시 refresh visual'],
    [VENDOR_HEAD_HELP_DEFAULT_NEEDLE, 'head help default changelog'],
    [VENDOR_CARD_TAG_ROSTER_REFRESH_NEEDLE, 'card tag keep stored prompt'],
    [VENDOR_CARD_TAG_STRIP_PERSON_NEEDLE, 'card tag strip person NAI-safe split'],
    [VENDOR_CARD_TAG_APPLY_WEIGHT_NEEDLE, 'card tag apply auto person weight'],
    [VENDOR_CARD_TAG_SEED_HTML_NEEDLE, 'card tag seed lock html'],
    [VENDOR_CARD_TAG_CMD_BTN_NEEDLE, 'card tag command btn'],
    [VENDOR_CARD_TAG_LOOK_SLOT_INIT_NEEDLE, 'card tag lookLocked init'],
    [VENDOR_CARD_TAG_LOOK_EMPTY_NEEDLE, 'card tag lookLocked empty'],
    [VENDOR_CARD_TAG_LOOK_PUSH_NEEDLE, 'card tag lookLocked push'],
    [VENDOR_CARD_TAG_LOOK_SYNC_NEEDLE, 'card tag lookLocked sync'],
    [VENDOR_CARD_TAG_LOOK_HTML_NEEDLE, 'card tag look lock html'],
    [VENDOR_CARD_TAG_REROLL_SEED_NEEDLE, 'card tag reroll seed'],
    [VENDOR_CARD_TAG_CMD_EVT_NEEDLE, 'card tag command events'],
    [VENDOR_CARD_TAG_PERSON_SLOTS_NEEDLE, 'card tag personTagsForSlots solo'],
    [VENDOR_CARD_TAG_PERSON_INIT_NEEDLE, 'card tag person initMode'],
    [VENDOR_CARD_TAG_PERSON_SELECT_NEEDLE, 'card tag person select off'],
    [VENDOR_CARD_TAG_PERSON_MODE_NEEDLE, 'card tag currentMode off'],
    [VENDOR_PERSON_TAG_SOLO_HTML_NEEDLE, 'person_tag_solo HTML'],
    [VENDOR_PERSON_TAG_SOLO_CT_NEEDLE, 'person_tag_solo Ct()'],
    [VENDOR_AUTOTAG_LT_NEEDLE, 'autotag Lt gender'],
    [VENDOR_CHAR_CREATE_GENDER_HTML_NEEDLE, 'char create gender html'],
    [VENDOR_CHAR_CREATE_GENDER_REF_NEEDLE, 'char create gender ref'],
    [VENDOR_CHAR_CREATE_GENDER_AUTOTAG_NEEDLE, 'char create gender autotag'],
    [VENDOR_CHAR_CREATE_GENDER_SAVE_NEEDLE, 'char create gender save'],
    [VENDOR_CHAR_EDIT_GENDER_HTML_NEEDLE, 'char edit gender html'],
    [VENDOR_CHAR_EDIT_GENDER_REF_NEEDLE, 'char edit gender ref'],
    [VENDOR_CHAR_EDIT_GENDER_AUTOTAG_NEEDLE, 'char edit gender autotag'],
    [VENDOR_CHAR_EDIT_GENDER_SAVE_NEEDLE, 'char edit gender save'],
    [VENDOR_CHAR_TAB_GENDER_HTML_NEEDLE, 'char tab gender html'],
    [VENDOR_CHAR_TAB_GENDER_READ_NEEDLE, 'char tab gender read'],
    [VENDOR_CHAR_TAB_GENDER_MERGE_NEEDLE, 'char tab gender merge'],
    [VENDOR_CHAR_TAB_WEAR_HTML_NEEDLE, 'char tab wear labels'],
    [VENDOR_CHAR_EDIT_COSTUME_NEEDLE, 'char edit costume bar'],
    [VENDOR_CHAR_EDIT_WEAR_ATTIRE_NEEDLE, 'char edit wear attire'],
    [VENDOR_CHAR_EDIT_WEAR_ACC_NEEDLE, 'char edit wear accessories'],
    [VENDOR_CHAR_EDIT_STAMP_NEEDLE, 'char edit stamp card'],
    [VENDOR_CHAR_EDIT_STAMP_UNIFIED_NEEDLE, 'char edit stamp unified'],
    [VENDOR_CHAR_EDIT_COSTUME_BIND_NEEDLE, 'char edit costume bind'],
    [VENDOR_CHAR_EDIT_CARDID_A_NEEDLE, 'char edit cardId viewer'],
    [VENDOR_CHAR_EDIT_CARDID_B_NEEDLE, 'char edit cardId sticky'],
    [VENDOR_CHAR_EDIT_CARDID_ENTRY_NEEDLE, 'char edit cardId entry'],
    [VENDOR_CHAR_EDIT_APPEARANCE_LABEL_NEEDLE, 'char edit appearance label'],
    [VENDOR_CHAR_EDIT_CLEAR_LOOKS_NEEDLE, 'char edit clear looks'],
    [VENDOR_CHAR_TAB_CLEAR_LOOKS_BTN_NEEDLE, 'char tab clear looks btn'],
    [VENDOR_CHAR_TAB_CLEAR_LOOKS_EVT_NEEDLE, 'char tab clear looks evt'],
    [VENDOR_LOREFILTER_BE_NEEDLE, 'lorefilter job Be'],
    [VENDOR_LOREFILTER_TAB_VARS_NEEDLE, 'lorefilter tab vars'],
    [VENDOR_LOREFILTER_TAB_INSERT_NEEDLE, 'lorefilter tab insert'],
    [VENDOR_LOREFILTER_TAB_EVT_NEEDLE, 'lorefilter tab evt'],
    [VENDOR_LOREFILTER_TAB_LOAD_NEEDLE, 'lorefilter tab load'],
    [VENDOR_CHAR_EDIT_LOCK_PRESET_NEEDLE, 'char edit lock preset'],
    [VENDOR_CHAR_CREATE_LOCK_PRESET_NEEDLE, 'char create lock preset'],
    [VENDOR_CHAR_REF_DASH_HTML_NEEDLE, 'char ref dash html'],
    [VENDOR_CHAR_REF_DASH_SAVE_NEEDLE, 'char ref dash save'],
    [VENDOR_CHAR_REF_HELP_NEEDLE, 'char ref help'],
    [VENDOR_CHAR_REF_EDIT_HTML_NEEDLE, 'char ref edit html'],
    [VENDOR_CHAR_REF_TAB_EVT_NEEDLE, 'char ref tab events'],
    [VENDOR_CHAR_REF_EDIT_EVT_NEEDLE, 'char ref edit events'],
    [VENDOR_AUTOTAG_WINDOW_PASTE_NEEDLE, 'autotag window paste modal'],
    [VENDOR_CHAR_EDIT_MODAL_PASTE_NEEDLE, 'char edit drop element paste'],
    [VENDOR_CHAR_EDIT_UI_PASTE_NEEDLE, 'char edit ui paste hooks'],
    [VENDOR_CHAR_CREATE_MODAL_PASTE_NEEDLE, 'char create drop element paste'],
    [VENDOR_CHAR_CREATE_UI_PASTE_NEEDLE, 'char create ui paste hooks'],
    [VENDOR_CHAR_CREATE_WEAR_ATTIRE_NEEDLE, 'char create wear attire'],
    [VENDOR_CHAR_CREATE_WEAR_ACC_NEEDLE, 'char create wear accessories'],
    [VENDOR_TAB_NOWRAP_NEEDLE, 'settings tab nowrap'],
    [VENDOR_TABS_SCROLL_NEEDLE, 'settings tabs scroll'],
    [VENDOR_MOBILE_CHROME_NEEDLE, 'mobile settings chrome'],
    [VENDOR_HEAD_HELP_LAYOUT_NEEDLE, 'head help layout overlay'],
    [VENDOR_HEAD_HELP_TOGGLE_NEEDLE, 'head help collapse toggle'],
    [VENDOR_CHROME_ACTIONS_HTML_NEEDLE, 'chrome save export import labels'],
    [VENDOR_STATUS_GRID_HTML_NEEDLE, 'status grid hide html'],
    [VENDOR_STATUS_GRID_SHOW_NEEDLE, 'status grid keep hidden'],
    [VENDOR_DASH_ACTIONS_HTML_NEEDLE, 'dashboard action buttons'],
    [VENDOR_CHAR_TAB_BTNS_NEEDLE, 'character tab button labels'],
    [VENDOR_RESET_HELP_NEEDLE, 'reset help titles'],
    [VENDOR_XA_FULL_NEEDLE, 'xa full silent save'],
    [VENDOR_UNLOAD_SAVE_NEEDLE, 'unload xa silent save'],
    [VENDOR_FF_FONT_BODY_NEEDLE, 'firefox font body'],
    [VENDOR_FF_FONT_TOGGLE_NEEDLE, 'firefox font toggle-row'],
    [VENDOR_INLINE_HELP_NEEDLE, 'inline chat help'],
    [VENDOR_INLINE_TOGGLE_NEEDLE, 'inline chat toggle'],
    [VENDOR_INLINE_SAVE_NEEDLE, 'inline chat save'],
    [VENDOR_PROGRESS_TOAST_FN_NEEDLE, 'progress toast sync fn'],
    [VENDOR_PROGRESS_TOAST_PAINT_NEEDLE, 'progress toast paintStatus'],
    [VENDOR_INSPECT_REROLL_INLINE_NEEDLE, 'inspect sheet reroll inline'],
    [VENDOR_INSPECT_REGEN_INLINE_NEEDLE, 'inspect sheet regen inline'],
    [VENDOR_REROLL_TOAST_HEARTBEAT_NEEDLE, 'reroll toast heartbeat'],
    [VENDOR_REROLL_LIVE_STOP_NEEDLE, 'reroll live soft-stop'],
    [VENDOR_REROLL_LIVE_STOP_END_NEEDLE, 'reroll live soft-stop end'],
    [VENDOR_REROLL_IMAGE_INLINE_NEEDLE, 'reroll image inline refresh'],
    [VENDOR_REROLL_ALL_INLINE_NEEDLE, 'reroll all inline refresh'],
    [VENDOR_FORCE_REGEN_INLINE_NEEDLE, 'force regen inline clear'],
    [VENDOR_DE_STRIP_NEEDLE, 'De strip inline markers'],
    [VENDOR_DT_FN_NEEDLE, 'risu-chat data-chat-id list'],
    [VENDOR_DA_QA_NEEDLE, 'Da qa data-chat-index'],
    [VENDOR_BIND_QA_NEEDLE, 'bindCard qa data-chat-index'],
    [VENDOR_INLINE_INJECT_FN_NEEDLE, 'inline inject fn'],
    [VENDOR_INLINE_CALL_NEEDLE, 'inline inject call'],
    [VENDOR_INLINE_SAME_NEEDLE, 'inline inject same-select'],
    [VENDOR_INLINE_POLL_NEEDLE, 'inline poll pending'],
    [VENDOR_INLINE_POLL_REFRESH_NEEDLE, 'inline poll refresh'],
    [VENDOR_STREAM_SETTLE_KA_NEEDLE, 'stream settle Ka 0.5s'],
    [VENDOR_SELECT_GESTURE_HELP_NEEDLE, 'select gesture help'],
    [VENDOR_SELECT_GESTURE_HTML_NEEDLE, 'select gesture html'],
    [VENDOR_SELECT_GESTURE_SAVE_NEEDLE, 'select gesture save'],
    [VENDOR_SELECT_GESTURE_FN_NEEDLE, 'select gesture fn'],
    [VENDOR_SELECT_FORCLICK_NEEDLE, 'select gesture forClick/longpress'],
    [VENDOR_SELECT_ONCLICK_NEEDLE, 'select gesture onClick/context'],
    [VENDOR_SELECT_BIND_NEEDLE, 'select gesture bind contextmenu'],
    [VENDOR_SELECT_OVERLAY_NEEDLE, 'select gesture overlay ctxId'],
    [VENDOR_SELECT_UNBIND_NEEDLE, 'select gesture unbind contextmenu'],
    [VENDOR_AFTER_REPLY_FN_NEEDLE, 'afterReply chatOutput+_t'],
    [VENDOR_AFTER_REQUEST_HELP_NEEDLE, 'afterRequest help chatOutput'],
    [VENDOR_CHAT_OUTPUT_BOOT_NEEDLE, 'chatOutput boot register'],
    [VENDOR_CHAT_OUTPUT_UNLOAD_NEEDLE, 'chatOutput unload remove'],
    [VENDOR_REBIND_RETARGET_NEEDLE, 'job save-hash retarget on select'],
    [VENDOR_SELECT_SAME_NEEDLE, 'select same-session early-return'],
    [VENDOR_SCROLL_GALLERY_NEW_NEEDLE, 'scroll select gallery load'],
    [VENDOR_SCROLL_GALLERY_SAME_NEEDLE, 'scroll same gallery load'],
    [VENDOR_SCROLL_GALLERY_SAME_PAINT_NEEDLE, 'scroll same content paint'],
    [VENDOR_SCROLL_GALLERY_SAME_DOM_NEEDLE, 'scroll same dom content paint'],
    [VENDOR_SCOPE_POLL_NEEDLE, 'scope poll cadence'],
    [VENDOR_SEGMENT_CE_NEEDLE, 'idle segment Ce skip'],
    [VENDOR_CE_RAF_NEEDLE, 'sticky Ce rAF coalesce'],
    [VENDOR_HA_ANCESTOR_NEEDLE, 'sticky scroll ancestor cap'],
    [VENDOR_SESSION_PENDING_NEEDLE, 'session pending commit'],
    [VENDOR_ACTIONS_HELP_NEEDLE, 'actions minimize help'],
    [VENDOR_ACTIONS_SELECT_NEEDLE, 'actions minimize select'],
    [VENDOR_ACTIONS_SAVE_NEEDLE, 'actions minimize save'],
    [VENDOR_ACTIONS_MODE_FN_NEEDLE, 'actions minimize mode fn'],
    [VENDOR_ACTIONS_CLAMP_NEEDLE, 'actions minimize clamp'],
    [VENDOR_VIEWER_HDR_TOUCH_NEEDLE, 'viewer header touch btns'],
    [VENDOR_VIEWER_HDR_TAIL_TOUCH_NEEDLE, 'viewer header tail touch'],
    [VENDOR_VIEWER_HDR_CHROME_TOUCH_NEEDLE, 'viewer header chrome touch'],
    [VENDOR_VIEWER_PRESET_MENU_TOUCH_NEEDLE, 'viewer preset menu touch'],
    [VENDOR_PRESET_HIT_HELPER_NEEDLE, 'preset hitPresetItemAt helper'],
    [VENDOR_APPLY_PRESET_OPT_NEEDLE, 'applyActivePreset optimistic'],
    [VENDOR_PRESET_SWITCH_OPT_NEEDLE, 'settings preset switch optimistic'],
    [VENDOR_PICK_PRESET_OPT_NEEDLE, 'pickViewerPreset optimistic'],
    [VENDOR_PRESET_EXPANDED_HIT_NEEDLE, 'preset expanded hit cache'],
    [VENDOR_VIEWER_PTR_ORDER_NEEDLE, 'viewer ptr resize+preset order'],
    [VENDOR_VIEWER_PRESET_HITS_STATE_NEEDLE, 'viewer presetHits state'],
    [VENDOR_VIEWER_IMG_REROLL_TOUCH_NEEDLE, 'viewer img reroll touch'],
    [VENDOR_VIEWER_IMG_ACT_HIT_NEEDLE, 'viewer img act hit'],
    [VENDOR_VIEWER_EMPTY_ACTS_NEEDLE, 'viewer empty stage acts'],
    [VENDOR_VIEWER_STOP_HDR_NEEDLE, 'viewer stop header btn'],
    [VENDOR_VIEWER_STOP_CLICK_NEEDLE, 'viewer stop click'],
    [VENDOR_VIEWER_STOP_LABEL_NEEDLE, 'viewer stop label sync'],
    [VENDOR_ACTIONS_FT_NEEDLE, 'actions minimize Ft'],
    [VENDOR_ACTIONS_OVERFLOW_NEEDLE, 'actions minimize overflow'],
    [VENDOR_ACTIONS_CHROME_NEEDLE, 'actions minimize chrome'],
    [VENDOR_ACTIONS_SAVE_ICON_GEO_NEEDLE, 'actions minimize save icon geo'],
    [VENDOR_ACTIONS_TOGGLE_SAVE_NEEDLE, 'actions minimize toggle save'],
    [VENDOR_ACTIONS_PRESET_LIVE_NEEDLE, 'actions minimize preset live'],
    [VENDOR_RISU_SETTINGS_HIDE_VIEWER_NEEDLE, 'risu settings hide viewer'],
    [VENDOR_RISU_SETTINGS_WATCH_ARM_NEEDLE, 'risu settings watch arm'],
    [VENDOR_RISU_SETTINGS_POINTER_NEEDLE, 'risu settings pointer guard'],
    [VENDOR_RISU_SETTINGS_PAINT_NEEDLE, 'risu settings paint guard'],
    [VENDOR_RISU_SETTINGS_UNLOAD_NEEDLE, 'risu settings unload clear'],
    [VENDOR_PRESET_MENU_HIT_NEEDLE, 'preset menu hit outside panel'],
    [VENDOR_THUMBS_MOUNT_NEEDLE, 'thumbs transform mount'],
    [VENDOR_VIEWER_STAGE_RESERVE_NEEDLE, 'viewer stage reserved height'],
    [VENDOR_VIEWER_RESIZE_HIT_NEEDLE, 'viewer resize hit zone'],
    [VENDOR_VIEWER_META_CHIP_TOUCH_NEEDLE, 'viewer meta chip touch'],
    [VENDOR_VIEWER_META_Y_CHIP_TOUCH_NEEDLE, 'viewer meta y chip touch'],
    [VENDOR_THUMBS_STATE_NEEDLE, 'thumbs transform state'],
    [VENDOR_THUMBS_HELPERS_NEEDLE, 'thumbs transform helpers'],
    [VENDOR_THUMB_HIT_NEEDLE, 'thumb hit owned offset'],
    [VENDOR_THUMB_SCROLL_INIT_NEEDLE, 'thumb offset init'],
    [VENDOR_THUMB_SCROLL_WHEEL_NEEDLE, 'thumb transform wheel'],
    [VENDOR_VIEWER_BODY_OVERFLOW_NEEDLE, 'viewer body overflow hidden'],
    [VENDOR_VIEWER_BODY_OVERFLOW_CHROME_NEEDLE, 'viewer body chrome overflow hidden'],
    [VENDOR_CHROME_HEIGHT_MEASURE_NEEDLE, 'viewer chrome height measure'],
    [VENDOR_THUMB_SCROLL_RESET_CHROME_NEEDLE, 'thumb paint chrome track'],
    [VENDOR_THUMB_SCROLL_RESET_STRIP_NEEDLE, 'thumb paint strip track'],
    [VENDOR_THUMBS_CLEAR_NEEDLE, 'thumbs clear track'],
    [VENDOR_THUMBS_POINTER_NEEDLE, 'thumbs pointer drag start'],
    [VENDOR_THUMBS_DRAG_NEEDLE, 'thumbs drag handlers'],
    [VENDOR_ACTIONS_POINTER_NEEDLE, 'actions minimize pointer'],
    [VENDOR_ACTIONS_DRAG_CLEAR_NEEDLE, 'actions minimize drag clear'],
    [VENDOR_ACTIONS_END_CLEAR_NEEDLE, 'actions minimize end clear'],
    [VENDOR_ICON_EXPAND_GUARD_NEEDLE, 'icon expand settings guard'],
    [VENDOR_HIDE_MODAL_CANCEL_EXPAND_NEEDLE, 'hide modal cancel expand'],
  ] as const) {
    assertOnce(raw, needle, label);
  }
  {
    let count = 0;
    let at = raw.indexOf(VENDOR_APPEARANCE_LABEL_SHARED_NEEDLE);
    while (at !== -1) {
      count += 1;
      at = raw.indexOf(VENDOR_APPEARANCE_LABEL_SHARED_NEEDLE, at + VENDOR_APPEARANCE_LABEL_SHARED_NEEDLE.length);
    }
    if (count !== 2) {
      throw new Error(`[build] expected 2× appearance label shared, found ${count}`);
    }
  }
  return (() => {
    let out = raw
      .replace(VENDOR_VERSION_NEEDLE, `He = "${PLUGIN_VERSION}"`)
      .replace(VENDOR_PROMPT_RESET_NEEDLE, VENDOR_PROMPT_RESET_PATCH)
      .replace(VENDOR_PROMPT_TAB_HTML_NEEDLE, VENDOR_PROMPT_TAB_HTML_PATCH)
      .replace(VENDOR_PROMPT_TAB_EVENTS_AFTER_RESET_NEEDLE, VENDOR_PROMPT_TAB_EVENTS_PATCH)
      .replace(VENDOR_NATURAL_BASE_HTML_NEEDLE, VENDOR_NATURAL_BASE_HTML_PATCH)
      .replace(VENDOR_NATURAL_BASE_SAVE_NEEDLE, VENDOR_NATURAL_BASE_SAVE_PATCH)
      .replace(VENDOR_NATURAL_BASE_CT_NEEDLE, VENDOR_NATURAL_BASE_CT_PATCH)
      .replace(VENDOR_NATURAL_BASE_CARD_NEEDLE, VENDOR_NATURAL_BASE_CARD_PATCH)
      .replace(VENDOR_NATURAL_BASE_HELP_NEEDLE, VENDOR_NATURAL_BASE_HELP_PATCH)
      .replace(VENDOR_PERSON_TAG_WEIGHT_HTML_NEEDLE, VENDOR_PERSON_TAG_WEIGHT_HTML_PATCH)
      .replace(VENDOR_PERSON_TAG_WEIGHT_CT_NEEDLE, VENDOR_PERSON_TAG_WEIGHT_CT_PATCH)
      .replace(VENDOR_PERSON_TAG_SOLO_HTML_NEEDLE, VENDOR_PERSON_TAG_SOLO_HTML_PATCH)
      .replace(VENDOR_PERSON_TAG_SOLO_CT_NEEDLE, VENDOR_PERSON_TAG_SOLO_CT_PATCH)
      .replace(VENDOR_ASSET_NAI_HTML_NEEDLE, VENDOR_ASSET_NAI_HTML_PATCH)
      .replace(VENDOR_ASSET_NAI_SAVE_NEEDLE, VENDOR_ASSET_NAI_SAVE_PATCH);
    assertOnce(out, VENDOR_ASSET_NAI_CARD_NEEDLE, 'asset_nai_tags card select (after natural_base)');
    assertOnce(out, VENDOR_ASSET_NAI_CT_NEEDLE, 'asset_nai_tags Ct() (after natural_base)');
    out = out
      .replace(VENDOR_ASSET_NAI_CARD_NEEDLE, VENDOR_ASSET_NAI_CARD_PATCH)
      .replace(VENDOR_ASSET_NAI_CT_NEEDLE, VENDOR_ASSET_NAI_CT_PATCH)
      .replace(VENDOR_ASSET_NAI_HELP_NEEDLE, VENDOR_ASSET_NAI_HELP_PATCH);
    assertOnce(out, VENDOR_FOCUS_CHAR_CARD_NEEDLE, 'focus_character card select (after asset_nai)');
    assertOnce(out, VENDOR_FOCUS_CHAR_CT_NEEDLE, 'focus_character Ct() (after asset_nai)');
    assertOnce(out, VENDOR_FOCUS_CHAR_HELP_NEEDLE, 'focus_character help (after asset_nai)');
    out = out
      .replace(VENDOR_FOCUS_CHAR_CARD_NEEDLE, VENDOR_FOCUS_CHAR_CARD_PATCH)
      .replace(VENDOR_FOCUS_CHAR_CT_NEEDLE, VENDOR_FOCUS_CHAR_CT_PATCH)
      .replace(VENDOR_FOCUS_CHAR_HELP_NEEDLE, VENDOR_FOCUS_CHAR_HELP_PATCH)
      .replace(VENDOR_COMFY_MUTED_NEEDLE, VENDOR_COMFY_MUTED_PATCH)
      .replace(VENDOR_COMFY_HELP_NEEDLE, VENDOR_COMFY_HELP_PATCH)
      .replace(VENDOR_CURATION_TABS_NEEDLE, VENDOR_CURATION_TABS_PATCH)
      .replace(VENDOR_CURATION_PANEL_NEEDLE, VENDOR_CURATION_PANEL_PATCH)
      .replace(VENDOR_DEBUG_PANEL_NEEDLE, VENDOR_DEBUG_PANEL_PATCH)
      .replace(VENDOR_DEBUG_EVENTS_NEEDLE, VENDOR_DEBUG_EVENTS_PATCH)
      .replace(VENDOR_CURATION_EVENTS_NEEDLE, VENDOR_CURATION_EVENTS_PATCH)
      .replace(VENDOR_CURATION_TAB_LOAD_NEEDLE, VENDOR_CURATION_TAB_LOAD_PATCH)
      .replace(VENDOR_GLOBAL_TOGGLE_SUMMARY_NEEDLE, VENDOR_GLOBAL_TOGGLE_SUMMARY_PATCH)
      .replace(VENDOR_GLOBAL_TOGGLE_BODY_NEEDLE, VENDOR_GLOBAL_TOGGLE_BODY_PATCH)
      .replace(VENDOR_EXPLORER_THUMB_PAINT_NEEDLE, VENDOR_EXPLORER_THUMB_PAINT_PATCH)
      .replace(VENDOR_EXPLORER_HA_NEEDLE, VENDOR_EXPLORER_HA_PATCH)
      .replace(VENDOR_EXPLORER_THUMB_WARM_NEEDLE, VENDOR_EXPLORER_THUMB_WARM_PATCH)
      .replace(VENDOR_EXPLORER_WARM_PROGRESS_NEEDLE, VENDOR_EXPLORER_WARM_PROGRESS_PATCH)
      .replace(VENDOR_EXPLORER_ET_NEEDLE, VENDOR_EXPLORER_ET_PATCH)
      .replace(VENDOR_EXPLORER_ZE_NEEDLE, VENDOR_EXPLORER_ZE_PATCH)
      .replace(VENDOR_EXPLORER_ENSURE_NEEDLE, VENDOR_EXPLORER_ENSURE_PATCH)
      .replace(VENDOR_EXPLORER_CSS_NEEDLE, VENDOR_EXPLORER_CSS_PATCH)
      .replace(VENDOR_EXPLORER_GRID_CSS_NEEDLE, VENDOR_EXPLORER_GRID_CSS_PATCH)
    .replace(VENDOR_EXPLORER_SHELL_OPEN_NEEDLE, VENDOR_EXPLORER_SHELL_OPEN_PATCH)
    .replace(VENDOR_EXPLORER_SHELL_FOOT_NEEDLE, VENDOR_EXPLORER_SHELL_FOOT_PATCH)
    .replace(VENDOR_EXPLORER_FOLDERS_TOGGLE_NEEDLE, VENDOR_EXPLORER_FOLDERS_TOGGLE_PATCH)
    .replace(VENDOR_EXPLORER_MOBILE_1COL_NEEDLE, VENDOR_EXPLORER_MOBILE_1COL_PATCH)
    .replace(VENDOR_EXPLORER_FOLDERS_HTML_NEEDLE, VENDOR_EXPLORER_FOLDERS_HTML_PATCH)
    .replace(VENDOR_EXPLORER_GRID_HTML_NEEDLE, VENDOR_EXPLORER_GRID_HTML_PATCH)
    .replace(VENDOR_EXPLORER_SELBAR_LABELS_NEEDLE, VENDOR_EXPLORER_SELBAR_LABELS_PATCH)
    .replace(VENDOR_EXPLORER_FAVONLY_PAINT_NEEDLE, VENDOR_EXPLORER_FAVONLY_PAINT_PATCH)
    .replace(VENDOR_EXPLORER_ET_FN_NEEDLE, VENDOR_EXPLORER_ET_FN_PATCH)
    .replace(VENDOR_EXPLORER_TAB_LOAD_NEEDLE, VENDOR_EXPLORER_TAB_LOAD_PATCH)
    .replace(VENDOR_EXPLORER_DELETE_SEL_NEEDLE, VENDOR_EXPLORER_DELETE_SEL_PATCH)
    .replace(VENDOR_EXPLORER_DELETE_FOLDER_NEEDLE, VENDOR_EXPLORER_DELETE_FOLDER_PATCH)
    .replace(VENDOR_EXPLORER_FOLDER_BIND_NEEDLE, VENDOR_EXPLORER_FOLDER_BIND_PATCH)
    .replace(VENDOR_EXPLORER_FILTER_ET_NEEDLE, VENDOR_EXPLORER_FILTER_ET_PATCH)
    .replace(VENDOR_PRESET_QT_NEEDLE, VENDOR_PRESET_QT_PATCH)
    .replace(VENDOR_PRESET_PN_NEEDLE, VENDOR_PRESET_PN_PATCH)
    .replace(VENDOR_PRESET_UN_NEEDLE, VENDOR_PRESET_UN_PATCH)
    .replace(VENDOR_PRESET_HTML_NEEDLE, VENDOR_PRESET_HTML_PATCH)
    .replace(VENDOR_PRESET_HEAD_SAVE_NEEDLE, VENDOR_PRESET_HEAD_SAVE_PATCH)
    .replace(VENDOR_PRESET_SAVE_EVT_NEEDLE, VENDOR_PRESET_SAVE_EVT_PATCH)
    .replace(VENDOR_PRESET_READ_NEEDLE, VENDOR_PRESET_READ_PATCH)
    .replace(VENDOR_PRESET_FA_NEEDLE, VENDOR_PRESET_FA_PATCH)
    .replace(VENDOR_PRESET_SYNC_NEEDLE, VENDOR_PRESET_SYNC_PATCH)
    .replace(VENDOR_PRESET_EXPORT_NEEDLE, VENDOR_PRESET_EXPORT_PATCH)
    .replace(VENDOR_PRESET_ST_ERR_NEEDLE, VENDOR_PRESET_ST_ERR_PATCH)
    .replace(VENDOR_PRESET_PASTE_DETECT_NEEDLE, VENDOR_PRESET_PASTE_DETECT_PATCH)
    .replace(VENDOR_PRESET_NEW_NEEDLE, VENDOR_PRESET_NEW_PATCH)
    .replace(VENDOR_PRESET_DUP_NEEDLE, VENDOR_PRESET_DUP_PATCH)
    .replace(VENDOR_PRESET_DEL_NEEDLE, VENDOR_PRESET_DEL_PATCH)
    .replace(VENDOR_PRESET_VIBE_EVT_NEEDLE, VENDOR_PRESET_VIBE_EVT_PATCH)
    .replace(VENDOR_CARD_TAB_SPLIT_COND_NEEDLE, VENDOR_CARD_TAB_SPLIT_COND_PATCH)
    .replace(VENDOR_CARD_TAB_SPLIT_OPEN_NEEDLE, VENDOR_CARD_TAB_SPLIT_OPEN_PATCH)
    .replace(VENDOR_CARD_TAB_SPLIT_MID_NEEDLE, VENDOR_CARD_TAB_SPLIT_MID_PATCH);
    assertOnce(out, VENDOR_CARD_TAB_SPLIT_CLOSE_NEEDLE, 'card tab split close (after preset HTML)');
    out = out
    .replace(VENDOR_CARD_TAB_SPLIT_CLOSE_NEEDLE, VENDOR_CARD_TAB_SPLIT_CLOSE_PATCH)
    .replace(VENDOR_CT_GATE_NEEDLE, VENDOR_CT_GATE_PATCH)
    .replace(VENDOR_APPLY_PRESET_OPT_NEEDLE, VENDOR_APPLY_PRESET_OPT_PATCH)
    .replace(VENDOR_PRESET_SWITCH_OPT_NEEDLE, VENDOR_PRESET_SWITCH_OPT_PATCH)
    .replace(VENDOR_SHOW_CARD_TAB_NEEDLE, VENDOR_SHOW_CARD_TAB_PATCH)
    .replace(VENDOR_MODELS_LLM_NEEDLE, VENDOR_MODELS_LLM_PATCH)
    .replace(VENDOR_OE_LLM_NEEDLE, VENDOR_OE_LLM_PATCH)
    .replace(VENDOR_OE_RETURN_NEEDLE, VENDOR_OE_RETURN_PATCH)
    .replace(VENDOR_LLM_BIND_NEEDLE, VENDOR_LLM_BIND_PATCH)
    .replace(VENDOR_LLM_SAVE_TEST_NEEDLE, VENDOR_LLM_SAVE_TEST_PATCH)
    .replace(VENDOR_IMG_BACKEND_DRAFT_NEEDLE, VENDOR_IMG_BACKEND_DRAFT_PATCH)
    .replace(VENDOR_BA_QUEUE_NEEDLE, VENDOR_BA_QUEUE_PATCH)
    .replace(VENDOR_STICKY_TAKE_NEEDLE, VENDOR_STICKY_TAKE_PATCH)
    .replace(VENDOR_NT_NEEDLE, VENDOR_NT_PATCH)
    .replace(VENDOR_PIN_OFFSCREEN_NEEDLE, VENDOR_PIN_OFFSCREEN_PATCH)
    .replace(VENDOR_STICKY_LA_NEEDLE, VENDOR_STICKY_LA_PATCH)
    .replace(VENDOR_STICKY_FLASH_NEAR_NEEDLE, VENDOR_STICKY_FLASH_NEAR_PATCH)
    .replace(VENDOR_STICKY_HT_NEAR_NEEDLE, VENDOR_STICKY_HT_NEAR_PATCH)
    .replace(VENDOR_STICKY_NX_ACTIVATE_NEEDLE, VENDOR_STICKY_NX_ACTIVATE_PATCH)
    .replace(VENDOR_INLINE_PTR_STICKY_NEEDLE, VENDOR_INLINE_PTR_STICKY_PATCH)
    .replace(VENDOR_SCROLL_PHASE_NEEDLE, VENDOR_SCROLL_PHASE_PATCH)
    .replace(VENDOR_SCROLL_TRACK_SNAP_NEEDLE, VENDOR_SCROLL_TRACK_SNAP_PATCH)
    .replace(VENDOR_SCROLL_TRACK_VH_NEEDLE, VENDOR_SCROLL_TRACK_VH_PATCH)
    .replace(VENDOR_HOVER_PREVIEW_OFF_NEEDLE, VENDOR_HOVER_PREVIEW_OFF_PATCH)
    .replace(VENDOR_HOVER_PREVIEW_TOGGLE_NEEDLE, VENDOR_HOVER_PREVIEW_TOGGLE_PATCH)
    .replace(VENDOR_HOVER_ANCHOR_NEEDLE, VENDOR_HOVER_ANCHOR_PATCH)
    .replace(VENDOR_INLINE_PCT_HELP_NEEDLE, VENDOR_INLINE_PCT_HELP_PATCH)
    .replace(VENDOR_INLINE_PCT_HTML_NEEDLE, VENDOR_INLINE_PCT_HTML_PATCH)
    .replace(VENDOR_INLINE_PCT_SAVE_NEEDLE, VENDOR_INLINE_PCT_SAVE_PATCH)
    .replace(VENDOR_INLINE_PCT_LIVE_NEEDLE, VENDOR_INLINE_PCT_LIVE_PATCH)
    .replace(VENDOR_STICKY_CLICK_NEEDLE, VENDOR_STICKY_CLICK_PATCH)
    .replace(VENDOR_PRESS_FILL_NEEDLE, VENDOR_PRESS_FILL_PATCH)
    .replace(VENDOR_PRESS_FILL_STICKY_CALL_NEEDLE, VENDOR_PRESS_FILL_STICKY_CALL_PATCH)
    .replace(VENDOR_STICKY_PRESS_NEEDLE, VENDOR_STICKY_PRESS_PATCH)
    .replace(VENDOR_INLINE_LONGPRESS_NEEDLE, VENDOR_INLINE_LONGPRESS_PATCH)
    .replace(VENDOR_STICKY_REVIVE_NEEDLE, VENDOR_STICKY_REVIVE_PATCH)
    .replace(VENDOR_STICKY_INIT_NEEDLE, VENDOR_STICKY_INIT_PATCH)
    .replace(VENDOR_STICKY_RESET_NEEDLE, VENDOR_STICKY_RESET_PATCH)
    .replace(VENDOR_STICKY_CLOSE_CHAR_NEEDLE, VENDOR_STICKY_CLOSE_CHAR_PATCH)
    .replace(VENDOR_STICKY_OPEN_CHAR_NEEDLE, VENDOR_STICKY_OPEN_CHAR_PATCH)
    .replace(VENDOR_STICKY_CLOSE_CARD_NEEDLE, VENDOR_STICKY_CLOSE_CARD_PATCH)
    .replace(VENDOR_STICKY_OPEN_CARD_NEEDLE, VENDOR_STICKY_OPEN_CARD_PATCH)
    .replace(VENDOR_SETTINGS_OPEN_STICKY_NEEDLE, VENDOR_SETTINGS_OPEN_STICKY_PATCH)
    .replace(VENDOR_SETTINGS_AT_HIDE_PANEL_NEEDLE, VENDOR_SETTINGS_AT_HIDE_PANEL_PATCH)
    .replace(VENDOR_SETTINGS_CLOSE_STICKY_NEEDLE, VENDOR_SETTINGS_CLOSE_STICKY_PATCH)
    .replace(VENDOR_BLOCK_HOST_UNBLOCK_NEEDLE, VENDOR_BLOCK_HOST_UNBLOCK_PATCH)
    .replace(VENDOR_SANGSI_TOGGLE_NEEDLE, VENDOR_SANGSI_TOGGLE_PATCH)
    .replace(VENDOR_SETTINGS_WATCH_STICKY_NEEDLE, VENDOR_SETTINGS_WATCH_STICKY_PATCH)
    .replace(VENDOR_CARD_TAG_ROSTER_REFRESH_NEEDLE, VENDOR_CARD_TAG_ROSTER_REFRESH_PATCH)
    .replace(VENDOR_CARD_TAG_STRIP_PERSON_NEEDLE, VENDOR_CARD_TAG_STRIP_PERSON_PATCH)
    .replace(VENDOR_CARD_TAG_APPLY_WEIGHT_NEEDLE, VENDOR_CARD_TAG_APPLY_WEIGHT_PATCH)
    .replace(VENDOR_CARD_TAG_SEED_HTML_NEEDLE, VENDOR_CARD_TAG_SEED_HTML_PATCH)
    .replace(VENDOR_CARD_TAG_CMD_BTN_NEEDLE, VENDOR_CARD_TAG_CMD_BTN_PATCH)
    .replace(VENDOR_CARD_TAG_LOOK_SLOT_INIT_NEEDLE, VENDOR_CARD_TAG_LOOK_SLOT_INIT_PATCH)
    .replace(VENDOR_CARD_TAG_LOOK_EMPTY_NEEDLE, VENDOR_CARD_TAG_LOOK_EMPTY_PATCH)
    .replace(VENDOR_CARD_TAG_LOOK_PUSH_NEEDLE, VENDOR_CARD_TAG_LOOK_PUSH_PATCH)
    .replace(VENDOR_CARD_TAG_LOOK_SYNC_NEEDLE, VENDOR_CARD_TAG_LOOK_SYNC_PATCH)
    .replace(VENDOR_CARD_TAG_LOOK_HTML_NEEDLE, VENDOR_CARD_TAG_LOOK_HTML_PATCH)
    .replace(VENDOR_CARD_TAG_REROLL_SEED_NEEDLE, VENDOR_CARD_TAG_REROLL_SEED_PATCH)
    .replace(VENDOR_CARD_TAG_CMD_EVT_NEEDLE, VENDOR_CARD_TAG_CMD_EVT_PATCH)
    .replace(VENDOR_CARD_TAG_PERSON_SLOTS_NEEDLE, VENDOR_CARD_TAG_PERSON_SLOTS_PATCH)
    .replace(VENDOR_CARD_TAG_PERSON_INIT_NEEDLE, VENDOR_CARD_TAG_PERSON_INIT_PATCH)
    .replace(VENDOR_CARD_TAG_PERSON_SELECT_NEEDLE, VENDOR_CARD_TAG_PERSON_SELECT_PATCH)
    .replace(VENDOR_CARD_TAG_PERSON_MODE_NEEDLE, VENDOR_CARD_TAG_PERSON_MODE_PATCH)
    .replace(VENDOR_AUTOTAG_LT_NEEDLE, VENDOR_AUTOTAG_LT_PATCH)
    .replace(VENDOR_CHAR_CREATE_GENDER_HTML_NEEDLE, VENDOR_CHAR_CREATE_GENDER_HTML_PATCH)
    .replace(VENDOR_CHAR_CREATE_GENDER_REF_NEEDLE, VENDOR_CHAR_CREATE_GENDER_REF_PATCH)
    .replace(VENDOR_CHAR_CREATE_GENDER_AUTOTAG_NEEDLE, VENDOR_CHAR_CREATE_GENDER_AUTOTAG_PATCH)
    .replace(VENDOR_CHAR_CREATE_GENDER_SAVE_NEEDLE, VENDOR_CHAR_CREATE_GENDER_SAVE_PATCH)
    .replace(VENDOR_CHAR_EDIT_GENDER_HTML_NEEDLE, VENDOR_CHAR_EDIT_GENDER_HTML_PATCH)
    .replace(VENDOR_CHAR_EDIT_GENDER_REF_NEEDLE, VENDOR_CHAR_EDIT_GENDER_REF_PATCH)
    .replace(VENDOR_CHAR_EDIT_GENDER_AUTOTAG_NEEDLE, VENDOR_CHAR_EDIT_GENDER_AUTOTAG_PATCH)
    .replace(VENDOR_CHAR_EDIT_GENDER_SAVE_NEEDLE, VENDOR_CHAR_EDIT_GENDER_SAVE_PATCH)
    .replace(VENDOR_CHAR_TAB_GENDER_HTML_NEEDLE, VENDOR_CHAR_TAB_GENDER_HTML_PATCH)
    .replace(VENDOR_CHAR_TAB_GENDER_READ_NEEDLE, VENDOR_CHAR_TAB_GENDER_READ_PATCH)
    .replace(VENDOR_CHAR_TAB_GENDER_MERGE_NEEDLE, VENDOR_CHAR_TAB_GENDER_MERGE_PATCH)
    .replace(VENDOR_CHAR_TAB_WEAR_HTML_NEEDLE, VENDOR_CHAR_TAB_WEAR_HTML_PATCH)
    .replace(VENDOR_CHAR_EDIT_COSTUME_NEEDLE, VENDOR_CHAR_EDIT_COSTUME_PATCH)
    .replace(VENDOR_CHAR_EDIT_COSTUME_BIND_NEEDLE, VENDOR_CHAR_EDIT_COSTUME_BIND_PATCH)
    .replace(VENDOR_CHAR_EDIT_WEAR_ATTIRE_NEEDLE, VENDOR_CHAR_EDIT_WEAR_ATTIRE_PATCH)
    .replace(VENDOR_CHAR_EDIT_WEAR_ACC_NEEDLE, VENDOR_CHAR_EDIT_WEAR_ACC_PATCH)
    .replace(VENDOR_CHAR_EDIT_APPEARANCE_LABEL_NEEDLE, VENDOR_CHAR_EDIT_APPEARANCE_LABEL_PATCH)
    .replace(VENDOR_CHAR_EDIT_CLEAR_LOOKS_NEEDLE, VENDOR_CHAR_EDIT_CLEAR_LOOKS_PATCH)
    .replace(VENDOR_CHAR_TAB_CLEAR_LOOKS_BTN_NEEDLE, VENDOR_CHAR_TAB_CLEAR_LOOKS_BTN_PATCH)
    .replace(VENDOR_CHAR_TAB_CLEAR_LOOKS_EVT_NEEDLE, VENDOR_CHAR_TAB_CLEAR_LOOKS_EVT_PATCH)
    .replace(VENDOR_LOREFILTER_BE_NEEDLE, VENDOR_LOREFILTER_BE_PATCH)
    .replace(VENDOR_LOREFILTER_TAB_VARS_NEEDLE, VENDOR_LOREFILTER_TAB_VARS_PATCH)
    .replace(VENDOR_LOREFILTER_TAB_INSERT_NEEDLE, VENDOR_LOREFILTER_TAB_INSERT_PATCH)
    .replace(VENDOR_LOREFILTER_TAB_EVT_NEEDLE, VENDOR_LOREFILTER_TAB_EVT_PATCH)
    .replace(VENDOR_LOREFILTER_TAB_LOAD_NEEDLE, VENDOR_LOREFILTER_TAB_LOAD_PATCH)
    .replace(VENDOR_CHAR_EDIT_LOCK_PRESET_NEEDLE, VENDOR_CHAR_EDIT_LOCK_PRESET_PATCH)
    .replace(VENDOR_CHAR_CREATE_LOCK_PRESET_NEEDLE, VENDOR_CHAR_CREATE_LOCK_PRESET_PATCH)
    .replace(VENDOR_CHAR_REF_DASH_HTML_NEEDLE, VENDOR_CHAR_REF_DASH_HTML_PATCH)
    .replace(VENDOR_CHAR_REF_DASH_SAVE_NEEDLE, VENDOR_CHAR_REF_DASH_SAVE_PATCH)
    .replace(VENDOR_CHAR_REF_HELP_NEEDLE, VENDOR_CHAR_REF_HELP_PATCH)
    .replace(VENDOR_CHAR_REF_EDIT_HTML_NEEDLE, VENDOR_CHAR_REF_EDIT_HTML_PATCH)
    .replace(VENDOR_AUTOTAG_WINDOW_PASTE_NEEDLE, VENDOR_AUTOTAG_WINDOW_PASTE_PATCH)
    .replace(VENDOR_CHAR_REF_TAB_EVT_NEEDLE, VENDOR_CHAR_REF_TAB_EVT_PATCH)
    .replace(VENDOR_CHAR_REF_EDIT_EVT_NEEDLE, VENDOR_CHAR_REF_EDIT_EVT_PATCH)
    .replace(VENDOR_CHAR_EDIT_MODAL_PASTE_NEEDLE, VENDOR_CHAR_EDIT_MODAL_PASTE_PATCH)
    .replace(VENDOR_CHAR_EDIT_UI_PASTE_NEEDLE, VENDOR_CHAR_EDIT_UI_PASTE_PATCH)
    .replace(VENDOR_CHAR_CREATE_MODAL_PASTE_NEEDLE, VENDOR_CHAR_CREATE_MODAL_PASTE_PATCH)
    .replace(VENDOR_CHAR_CREATE_UI_PASTE_NEEDLE, VENDOR_CHAR_CREATE_UI_PASTE_PATCH)
    .replace(VENDOR_CHAR_CREATE_WEAR_ATTIRE_NEEDLE, VENDOR_CHAR_CREATE_WEAR_ATTIRE_PATCH)
    .replace(VENDOR_CHAR_CREATE_WEAR_ACC_NEEDLE, VENDOR_CHAR_CREATE_WEAR_ACC_PATCH)
    .replace(VENDOR_TAB_NOWRAP_NEEDLE, VENDOR_TAB_NOWRAP_PATCH)
    .replace(VENDOR_TABS_SCROLL_NEEDLE, VENDOR_TABS_SCROLL_PATCH)
    .replace(VENDOR_MOBILE_CHROME_NEEDLE, VENDOR_MOBILE_CHROME_PATCH)
    .replace(VENDOR_HEAD_HELP_LAYOUT_NEEDLE, VENDOR_HEAD_HELP_LAYOUT_PATCH)
    .replace(VENDOR_HEAD_HELP_TOGGLE_NEEDLE, VENDOR_HEAD_HELP_TOGGLE_PATCH)
    .replace(VENDOR_CHROME_ACTIONS_HTML_NEEDLE, VENDOR_CHROME_ACTIONS_HTML_PATCH)
    .replace(VENDOR_STATUS_GRID_HTML_NEEDLE, VENDOR_STATUS_GRID_HTML_PATCH)
    .replace(VENDOR_STATUS_GRID_SHOW_NEEDLE, VENDOR_STATUS_GRID_SHOW_PATCH)
    .replace(VENDOR_DASH_ACTIONS_HTML_NEEDLE, VENDOR_DASH_ACTIONS_HTML_PATCH)
    .replace(VENDOR_CHAR_TAB_BTNS_NEEDLE, VENDOR_CHAR_TAB_BTNS_PATCH)
    .replace(VENDOR_RESET_HELP_NEEDLE, VENDOR_RESET_HELP_PATCH)
    .replace(VENDOR_XA_FULL_NEEDLE, VENDOR_XA_FULL_PATCH)
    .replace(VENDOR_UNLOAD_SAVE_NEEDLE, VENDOR_UNLOAD_SAVE_PATCH)
    .replace(VENDOR_FF_FONT_BODY_NEEDLE, VENDOR_FF_FONT_BODY_PATCH)
    .replace(VENDOR_FF_FONT_TOGGLE_NEEDLE, VENDOR_FF_FONT_TOGGLE_PATCH)
    .replace(VENDOR_INLINE_HELP_NEEDLE, VENDOR_INLINE_HELP_PATCH)
    .replace(VENDOR_INLINE_TOGGLE_NEEDLE, VENDOR_INLINE_TOGGLE_PATCH)
    .replace(VENDOR_INLINE_SAVE_NEEDLE, VENDOR_INLINE_SAVE_PATCH)
    .replace(VENDOR_PROGRESS_TOAST_FN_NEEDLE, VENDOR_PROGRESS_TOAST_FN_PATCH)
    .replace(VENDOR_PROGRESS_TOAST_PAINT_NEEDLE, VENDOR_PROGRESS_TOAST_PAINT_PATCH)
    .replace(VENDOR_INSPECT_REROLL_INLINE_NEEDLE, VENDOR_INSPECT_REROLL_INLINE_PATCH)
    .replace(VENDOR_INSPECT_REGEN_INLINE_NEEDLE, VENDOR_INSPECT_REGEN_INLINE_PATCH)
    .replace(VENDOR_REROLL_TOAST_HEARTBEAT_NEEDLE, VENDOR_REROLL_TOAST_HEARTBEAT_PATCH)
    .replace(VENDOR_REROLL_LIVE_STOP_NEEDLE, VENDOR_REROLL_LIVE_STOP_PATCH)
    .replace(VENDOR_REROLL_LIVE_STOP_END_NEEDLE, VENDOR_REROLL_LIVE_STOP_END_PATCH)
    .replace(VENDOR_REROLL_IMAGE_INLINE_NEEDLE, VENDOR_REROLL_IMAGE_INLINE_PATCH)
    .replace(VENDOR_REROLL_ALL_INLINE_NEEDLE, VENDOR_REROLL_ALL_INLINE_PATCH)
    .replace(VENDOR_FORCE_REGEN_INLINE_NEEDLE, VENDOR_FORCE_REGEN_INLINE_PATCH)
    .replace(VENDOR_DE_STRIP_NEEDLE, VENDOR_DE_STRIP_PATCH)
    .replace(VENDOR_DT_FN_NEEDLE, VENDOR_DT_FN_PATCH)
    .replace(VENDOR_DA_QA_NEEDLE, VENDOR_DA_QA_PATCH)
    .replace(VENDOR_BIND_QA_NEEDLE, VENDOR_BIND_QA_PATCH)
    .replace(VENDOR_INLINE_INJECT_FN_NEEDLE, VENDOR_INLINE_INJECT_FN_PATCH)
    .replace(VENDOR_INLINE_CALL_NEEDLE, VENDOR_INLINE_CALL_PATCH)
    .replace(VENDOR_INLINE_SAME_NEEDLE, VENDOR_INLINE_SAME_PATCH)
    .replace(VENDOR_INLINE_POLL_NEEDLE, VENDOR_INLINE_POLL_PATCH)
    .replace(VENDOR_INLINE_POLL_REFRESH_NEEDLE, VENDOR_INLINE_POLL_REFRESH_PATCH)
    .replace(VENDOR_STREAM_SETTLE_KA_NEEDLE, VENDOR_STREAM_SETTLE_KA_PATCH)
    .replace(VENDOR_SELECT_GESTURE_HELP_NEEDLE, VENDOR_SELECT_GESTURE_HELP_PATCH)
    .replace(VENDOR_SELECT_GESTURE_HTML_NEEDLE, VENDOR_SELECT_GESTURE_HTML_PATCH)
    .replace(VENDOR_SELECT_GESTURE_SAVE_NEEDLE, VENDOR_SELECT_GESTURE_SAVE_PATCH)
    .replace(VENDOR_SELECT_GESTURE_FN_NEEDLE, VENDOR_SELECT_GESTURE_FN_PATCH)
    .replace(VENDOR_SELECT_FORCLICK_NEEDLE, VENDOR_SELECT_FORCLICK_PATCH)
    .replace(VENDOR_SELECT_ONCLICK_NEEDLE, VENDOR_SELECT_ONCLICK_PATCH)
    .replace(VENDOR_SELECT_BIND_NEEDLE, VENDOR_SELECT_BIND_PATCH)
    .replace(VENDOR_SELECT_OVERLAY_NEEDLE, VENDOR_SELECT_OVERLAY_PATCH)
    .replace(VENDOR_SELECT_UNBIND_NEEDLE, VENDOR_SELECT_UNBIND_PATCH)
    .replace(VENDOR_AFTER_REPLY_FN_NEEDLE, VENDOR_AFTER_REPLY_FN_PATCH)
    .replace(VENDOR_AFTER_REQUEST_HELP_NEEDLE, VENDOR_AFTER_REQUEST_HELP_PATCH)
    .replace(VENDOR_CHAT_OUTPUT_BOOT_NEEDLE, VENDOR_CHAT_OUTPUT_BOOT_PATCH)
    .replace(VENDOR_CHAT_OUTPUT_UNLOAD_NEEDLE, VENDOR_CHAT_OUTPUT_UNLOAD_PATCH)
    .replace(VENDOR_REBIND_RETARGET_NEEDLE, VENDOR_REBIND_RETARGET_PATCH)
    .replace(VENDOR_SELECT_SAME_NEEDLE, VENDOR_SELECT_SAME_PATCH)
    .replace(VENDOR_SCROLL_GALLERY_NEW_NEEDLE, VENDOR_SCROLL_GALLERY_NEW_PATCH)
    .replace(VENDOR_SCROLL_GALLERY_SAME_NEEDLE, VENDOR_SCROLL_GALLERY_SAME_PATCH)
    .replace(VENDOR_SCROLL_GALLERY_SAME_PAINT_NEEDLE, VENDOR_SCROLL_GALLERY_SAME_PAINT_PATCH)
    .replace(VENDOR_SCROLL_GALLERY_SAME_DOM_NEEDLE, VENDOR_SCROLL_GALLERY_SAME_DOM_PATCH)
    .replace(VENDOR_SCOPE_POLL_NEEDLE, VENDOR_SCOPE_POLL_PATCH)
    .replace(VENDOR_SEGMENT_CE_NEEDLE, VENDOR_SEGMENT_CE_PATCH)
    .replace(VENDOR_CE_RAF_NEEDLE, VENDOR_CE_RAF_PATCH)
    .replace(VENDOR_HA_ANCESTOR_NEEDLE, VENDOR_HA_ANCESTOR_PATCH)
    .replace(VENDOR_SESSION_PENDING_NEEDLE, VENDOR_SESSION_PENDING_PATCH)
    .replace(VENDOR_ACTIONS_HELP_NEEDLE, VENDOR_ACTIONS_HELP_PATCH)
    .replace(VENDOR_ACTIONS_SELECT_NEEDLE, VENDOR_ACTIONS_SELECT_PATCH)
    .replace(VENDOR_ACTIONS_SAVE_NEEDLE, VENDOR_ACTIONS_SAVE_PATCH)
    .replace(VENDOR_ACTIONS_MODE_FN_NEEDLE, VENDOR_ACTIONS_MODE_FN_PATCH)
    .replace(VENDOR_ACTIONS_CLAMP_NEEDLE, VENDOR_ACTIONS_CLAMP_PATCH)
    .replace(VENDOR_VIEWER_HDR_TOUCH_NEEDLE, VENDOR_VIEWER_HDR_TOUCH_PATCH)
    .replace(VENDOR_VIEWER_HDR_TAIL_TOUCH_NEEDLE, VENDOR_VIEWER_HDR_TAIL_TOUCH_PATCH)
    .replace(VENDOR_VIEWER_HDR_CHROME_TOUCH_NEEDLE, VENDOR_VIEWER_HDR_CHROME_TOUCH_PATCH)
    .replace(VENDOR_VIEWER_PRESET_MENU_TOUCH_NEEDLE, VENDOR_VIEWER_PRESET_MENU_TOUCH_PATCH)
    .replace(VENDOR_VIEWER_PTR_ORDER_NEEDLE, VENDOR_VIEWER_PTR_ORDER_PATCH)
    .replace(VENDOR_PRESET_HIT_HELPER_NEEDLE, VENDOR_PRESET_HIT_HELPER_PATCH)
    .replace(VENDOR_PICK_PRESET_OPT_NEEDLE, VENDOR_PICK_PRESET_OPT_PATCH)
    .replace(VENDOR_PRESET_EXPANDED_HIT_NEEDLE, VENDOR_PRESET_EXPANDED_HIT_PATCH)
    .replace(VENDOR_VIEWER_PRESET_HITS_STATE_NEEDLE, VENDOR_VIEWER_PRESET_HITS_STATE_PATCH)
    .replace(VENDOR_VIEWER_IMG_REROLL_TOUCH_NEEDLE, VENDOR_VIEWER_IMG_REROLL_TOUCH_PATCH)
    .replace(VENDOR_VIEWER_IMG_ACT_HIT_NEEDLE, VENDOR_VIEWER_IMG_ACT_HIT_PATCH)
    .replace(VENDOR_VIEWER_EMPTY_ACTS_NEEDLE, VENDOR_VIEWER_EMPTY_ACTS_PATCH)
    .replace(VENDOR_VIEWER_STOP_HDR_NEEDLE, VENDOR_VIEWER_STOP_HDR_PATCH)
    .replace(VENDOR_VIEWER_STOP_CLICK_NEEDLE, VENDOR_VIEWER_STOP_CLICK_PATCH)
    .replace(VENDOR_VIEWER_STOP_LABEL_NEEDLE, VENDOR_VIEWER_STOP_LABEL_PATCH)
    .replace(VENDOR_ACTIONS_FT_NEEDLE, VENDOR_ACTIONS_FT_PATCH)
    .replace(VENDOR_ACTIONS_OVERFLOW_NEEDLE, VENDOR_ACTIONS_OVERFLOW_PATCH)
    .replace(VENDOR_ACTIONS_CHROME_NEEDLE, VENDOR_ACTIONS_CHROME_PATCH)
    .replace(VENDOR_ACTIONS_SAVE_ICON_GEO_NEEDLE, VENDOR_ACTIONS_SAVE_ICON_GEO_PATCH)
    .replace(VENDOR_ACTIONS_TOGGLE_SAVE_NEEDLE, VENDOR_ACTIONS_TOGGLE_SAVE_PATCH)
    .replace(VENDOR_ACTIONS_PRESET_LIVE_NEEDLE, VENDOR_ACTIONS_PRESET_LIVE_PATCH)
    .replace(VENDOR_RISU_SETTINGS_HIDE_VIEWER_NEEDLE, VENDOR_RISU_SETTINGS_HIDE_VIEWER_PATCH)
    .replace(VENDOR_RISU_SETTINGS_WATCH_ARM_NEEDLE, VENDOR_RISU_SETTINGS_WATCH_ARM_PATCH)
    .replace(VENDOR_RISU_SETTINGS_POINTER_NEEDLE, VENDOR_RISU_SETTINGS_POINTER_PATCH)
    .replace(VENDOR_RISU_SETTINGS_PAINT_NEEDLE, VENDOR_RISU_SETTINGS_PAINT_PATCH)
    .replace(VENDOR_RISU_SETTINGS_UNLOAD_NEEDLE, VENDOR_RISU_SETTINGS_UNLOAD_PATCH)
    .replace(VENDOR_PRESET_MENU_HIT_NEEDLE, VENDOR_PRESET_MENU_HIT_PATCH)
    .replace(VENDOR_THUMBS_MOUNT_NEEDLE, VENDOR_THUMBS_MOUNT_PATCH)
    .replace(VENDOR_VIEWER_STAGE_RESERVE_NEEDLE, VENDOR_VIEWER_STAGE_RESERVE_PATCH)
    .replace(VENDOR_VIEWER_RESIZE_HIT_NEEDLE, VENDOR_VIEWER_RESIZE_HIT_PATCH)
    .replace(VENDOR_VIEWER_META_CHIP_TOUCH_NEEDLE, VENDOR_VIEWER_META_CHIP_TOUCH_PATCH)
    .replace(VENDOR_VIEWER_META_Y_CHIP_TOUCH_NEEDLE, VENDOR_VIEWER_META_Y_CHIP_TOUCH_PATCH)
    .replace(VENDOR_THUMBS_STATE_NEEDLE, VENDOR_THUMBS_STATE_PATCH)
    .replace(VENDOR_THUMBS_HELPERS_NEEDLE, VENDOR_THUMBS_HELPERS_PATCH)
    .replace(VENDOR_THUMB_HIT_NEEDLE, VENDOR_THUMB_HIT_PATCH)
    .replace(VENDOR_THUMB_SCROLL_INIT_NEEDLE, VENDOR_THUMB_SCROLL_INIT_PATCH)
    .replace(VENDOR_THUMB_SCROLL_WHEEL_NEEDLE, VENDOR_THUMB_SCROLL_WHEEL_PATCH)
    .replace(VENDOR_VIEWER_BODY_OVERFLOW_NEEDLE, VENDOR_VIEWER_BODY_OVERFLOW_PATCH)
    .replace(VENDOR_VIEWER_BODY_OVERFLOW_CHROME_NEEDLE, VENDOR_VIEWER_BODY_OVERFLOW_CHROME_PATCH)
    .replace(VENDOR_CHROME_HEIGHT_MEASURE_NEEDLE, VENDOR_CHROME_HEIGHT_MEASURE_PATCH)
    .replace(VENDOR_THUMB_SCROLL_RESET_CHROME_NEEDLE, VENDOR_THUMB_SCROLL_RESET_CHROME_PATCH)
    .replace(VENDOR_THUMB_SCROLL_RESET_STRIP_NEEDLE, VENDOR_THUMB_SCROLL_RESET_STRIP_PATCH)
    .replaceAll(VENDOR_THUMBS_KIDS_NEEDLE, VENDOR_THUMBS_KIDS_PATCH)
    .replace(VENDOR_THUMBS_CLEAR_NEEDLE, VENDOR_THUMBS_CLEAR_PATCH)
    .replace(VENDOR_THUMBS_POINTER_NEEDLE, VENDOR_THUMBS_POINTER_PATCH)
    .replace(VENDOR_THUMBS_DRAG_NEEDLE, VENDOR_THUMBS_DRAG_PATCH)
    .replace(VENDOR_ACTIONS_POINTER_NEEDLE, VENDOR_ACTIONS_POINTER_PATCH)
    .replace(VENDOR_ACTIONS_DRAG_CLEAR_NEEDLE, VENDOR_ACTIONS_DRAG_CLEAR_PATCH)
    .replace(VENDOR_ACTIONS_END_CLEAR_NEEDLE, VENDOR_ACTIONS_END_CLEAR_PATCH)
    .replace(VENDOR_ICON_EXPAND_GUARD_NEEDLE, VENDOR_ICON_EXPAND_GUARD_PATCH)
    .replace(VENDOR_HIDE_MODAL_CANCEL_EXPAND_NEEDLE, VENDOR_HIDE_MODAL_CANCEL_EXPAND_PATCH)
    .replace(VENDOR_OVERLAY_MOUNT_NEEDLE, VENDOR_OVERLAY_MOUNT_PATCH)
    .replace(VENDOR_OVERLAY_WATCH_NEEDLE, VENDOR_OVERLAY_WATCH_PATCH)
    .replace(VENDOR_OVERLAY_RETRY_NEEDLE, VENDOR_OVERLAY_RETRY_PATCH)
    .replace(VENDOR_OVERLAY_HT_HIDE_NEEDLE, VENDOR_OVERLAY_HT_HIDE_PATCH)
    .replace(VENDOR_OVERLAY_JA_HIDE_NEEDLE, VENDOR_OVERLAY_JA_HIDE_PATCH)
    .replace(VENDOR_OVERLAY_HELP_NEEDLE, VENDOR_OVERLAY_HELP_PATCH)
    .replace(VENDOR_TOOLBAR_SANGSI_NEEDLE, VENDOR_TOOLBAR_SANGSI_PATCH)
    .replace(VENDOR_TOOLBAR_SANGSI_REFRESH_NEEDLE, VENDOR_TOOLBAR_SANGSI_REFRESH_PATCH)
    .replace(VENDOR_HEAD_HELP_DEFAULT_NEEDLE, VENDOR_HEAD_HELP_DEFAULT_PATCH)
    .replace(VENDOR_EXPLORER_CARD_IMG_NEEDLE, VENDOR_EXPLORER_CARD_IMG_PATCH)
    .replace(VENDOR_EXPLORER_CAP_CSS_NEEDLE, VENDOR_EXPLORER_CAP_CSS_PATCH)
    .replace(VENDOR_EXPLORER_TIP_BIND_NEEDLE, VENDOR_EXPLORER_TIP_BIND_PATCH)
    .replace(VENDOR_EXPLORER_LONGPRESS_NEEDLE, VENDOR_EXPLORER_LONGPRESS_PATCH)
    .replace(VENDOR_EXPLORER_CTX_DISMISS_NEEDLE, VENDOR_EXPLORER_CTX_DISMISS_PATCH)
    .replace(VENDOR_VIEWER_THUMB_SHELL_NEEDLE, VENDOR_VIEWER_THUMB_SHELL_PATCH)
    .replaceAll(VENDOR_STICKY_COVER_NEEDLE, VENDOR_STICKY_COVER_PATCH)
    .replaceAll(VENDOR_STICKY_SHELL_BG_NEEDLE, VENDOR_STICKY_SHELL_BG_PATCH)
    .replace(VENDOR_STICKY_EMPTY_NEEDLE, VENDOR_STICKY_EMPTY_PATCH)
    .replaceAll(VENDOR_APPEARANCE_LABEL_SHARED_NEEDLE, VENDOR_APPEARANCE_LABEL_SHARED_PATCH);
    // Prove sticky scroll/pointer patches actually landed (needle-only assert is not enough).
    assertOnce(out, 'ensureScrollPhaseBus = () =>', 'scroll phase bus landed');
    assertOnce(out, 'async function nxUpdateStickyActiveOnScrollEnd', 'nx scroll-end sticky activate landed');
    assertOnce(out, 'async function nxActivateStickyByCardId', 'nx sticky by cardId landed');
    assertOnce(out, 'async function nxHostToast', 'nxHostToast landed');
    assertOnce(out, 'async function showSelectionToast', 'selection toast landed');
    assertOnce(out, 'async function nxStickyV2ApplyFromHt', 'sticky v2 apply landed');
    assertOnce(out, 'function __nxDeadStickyFlashBody()', 'legacy flash body retired');
    assertOnce(out, 'Sticky v2 only — skip legacy frame', 'Ht early-return to v2 landed');
    assertOnce(out, 'const anchorY = o * 0.5;', 'scroll track viewport mid landed');
    assertOnce(out, 'Sticky pin hover preview removed', 'inline ptr hover preview removed');
    assertOnce(out, 'function hoverPreviewOn() {\n    return !1;\n  }', 'hover preview force off landed');
    if (!out.includes('nxUpdateStickyActiveOnScrollEnd().catch')) {
      throw new Error('[build] scroll-end missing nxUpdateStickyActiveOnScrollEnd call');
    }
    if (!out.includes('nxActivateStickyByCardId(card.id)')) {
      throw new Error('[build] inline longpress missing nxActivateStickyByCardId');
    }
    if (out.includes('scheduleStickySync(), scheduleScrollTrack()')) {
      throw new Error('[build] scroll phase patch missing — thrash path still present');
    }
    if (out.includes('sticky_layout_v2')) {
      throw new Error('[build] sticky_layout_v2 toggle must be removed (v2 is always-on)');
    }
    if (out.includes('nx-sticky-v2')) {
      throw new Error('[build] nx-sticky-v2 UI toggle must be removed');
    }
    if (out.includes('stickyFlashOnScroll();\n            } catch {\n            }\n            scheduleStickySync();')) {
      throw new Error('[build] pointer sticky still calls dead stickyFlashOnScroll every rAF');
    }
    if (!out.includes('nxActivateStickyNearestToCursor')) {
      throw new Error('[build] missing nxActivateStickyNearestToCursor (live bubble nearest)');
    }
    if (!out.includes('ensureScriptDomQuietWatcher') || !out.includes('scriptOutput.domQuiet5')) {
      throw new Error('[build] missing streaming DOM 5s watcher track');
    }
    if (out.includes('scriptOutput.miss5') || out.includes('_scriptMissTimer')) {
      throw new Error('[build] legacy 1s×5 DOM miss path must be removed');
    }
    if (!out.includes('auxiliary modelType=') || !out.includes('click DOM#')) {
      throw new Error('[build] missing modelType gate or click-select auto-gen path');
    }
    if (out.includes('scheduleAutoGenOnReply("chatOutput"')) {
      throw new Error('[build] chatOutput must not schedule auto-gen');
    }
    if (!out.includes('scriptOutput.quiet') || !out.includes('still streaming')) {
      throw new Error('[build] missing stream-end script fallback or isStreaming wait');
    }
    if (!out.includes('afterReply.schedule') || !out.includes('delay=${AFTER_GEN_DELAY_MS}ms')) {
      throw new Error('[build] missing single 0.5s afterRequest auto-gen delay');
    }
    if (out.includes('afterReply.poll') || out.includes('POLL_MAX')) {
      throw new Error('[build] 0.3s×3 poll must stay removed');
    }
    if (!out.includes('scheduleAutoGenOnReply("afterRequest"')) {
      throw new Error('[build] missing afterRequest auto-gen schedule');
    }
    if (!out.includes('nxChatAttrIndex') || !out.includes('[data-chat-id]')) {
      throw new Error('[build] missing risu-chat data-chat-id message list');
    }
    if (!out.includes('nxActivateStickyNearestToCursor().catch')) {
      throw new Error('[build] pointer path must call nxActivateStickyNearestToCursor');
    }
    return out;
  })();
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
