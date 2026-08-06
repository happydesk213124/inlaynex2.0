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
const PLUGIN_VERSION = '2.1.4';

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
              <button class="secondary" data-reset-prompt="\${h(d.key)}">기본값 복원</button>
              <button class="secondary" data-export-prompt="\${h(d.key)}">JSON 내보내기</button>
              <button class="secondary" data-import-prompt="\${h(d.key)}">JSON 불러오기</button>
              <input data-import-prompt-file="\${h(d.key)}" type="file" accept=".json,application/json,text/plain" style="display:none">
            </div>
          </div>\`;
      }).join("");
      u = \`
        <div class="prompt-toolbar">
          <div><strong>프롬프트</strong><div class="muted">작가의 노트만 남기고 나머지를 기본값으로 돌리거나, 전체/개별 JSON으로 백업할 수 있습니다.</div></div>
          <div class="toolbar-actions" style="flex-wrap:wrap;gap:8px">
            <button id="nx-prompts-reset-defaults" class="secondary">기본값 복원 (작가 노트 제외)</button>
            <button id="nx-prompts-export" class="secondary">전체 JSON 내보내기</button>
            <button id="nx-prompts-import" class="secondary">전체 JSON 불러오기</button>
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
  `"nx-natural-base": { title: "자연어 base", body: "NovelAI base에 넣는 자연어 장면을 고릅니다. 안넣기 / 짧게 넣기(머리·나이·성별·행동) / 구도·자세히(구도·표정·옷·조명) / 태그 보완 자연어(태그가 못 담는 문장)." },
  "nx-person-tag-weight": { title: "사람 태그 강조", body: "메인 프롬프트 맨 앞 인원 태그(1girl, 1boy…)에 NovelAI 강조(N::태그::)를 겁니다. 0=감싸지 않음, 1–5=가중치. 큐레이션 leaf의 composition 인원 태그는 넣지 않습니다." },
  "nx-curation-mode": { title: "큐레이팅 모드", body: "사용안함: 지금과 동일. 2단: 그룹 선택 후 하위 옵션으로 씬 태그. 임베딩식: 자유 씬 태그를 카탈로그와 유사도 매칭해 교체(캐릭터 태그는 유지)." },
  "nx-curation-strict-ids": { title: "엄격 ID 모드", body: "2단 모드 전용. 켜면 카메라·상황·자연어·동작/표정을 자유 문장으로 쓰지 않고 카탈로그 ID로만 조립합니다. 캐릭터별 ID(characters[].option_ids)도 추가로 받아 배우 index별로 적용하며, 외형/의상은 절대 덮어쓰지 않습니다." },
  "nx-curation-catalog": { title: "큐레이션 카탈로그", body: "Inlay groups JSON 또는 Asset Maid DEFAULT_PRESET_CATALOG(modifier_library)를 불러올 수 있습니다. 기본은 소형 SFW. 거대 카탈로그는 저장소·임베딩 비용이 큽니다." },
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
  `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:end">
            <label data-nx-help-id="nx-include-max"><span>Include Max (최근 문맥 개수)</span><input id="nx-include-max" type="number" min="0" max="20" value="\${h(i.include_max ?? 0)}"></label>
            <label data-nx-help-id="nx-person-tag-weight"><span>사람 태그 강조 (0–5)</span><input id="nx-person-tag-weight" type="number" min="0" max="5" step="1" value="\${h(i.person_tag_weight ?? 3)}"></label>
            </div>
`;

const VENDOR_PERSON_TAG_WEIGHT_CT_NEEDLE =
  `      include_max: Number(N("nx-include-max") || e.include_max || 0),
`;

const VENDOR_PERSON_TAG_WEIGHT_CT_PATCH =
  `      include_max: Number(N("nx-include-max") || e.include_max || 0),
      person_tag_weight: document.getElementById("nx-person-tag-weight") ? re(N("nx-person-tag-weight"), 0, 5, re(e.person_tag_weight, 0, 5, 3)) : re(e.person_tag_weight, 0, 5, 3),
`;

/** Dashboard: collect NAI metadata tags from matched Risu assets for new_characters. */
const VENDOR_ASSET_NAI_HTML_NEEDLE =
  `<label class="toggle-row" data-nx-help-id="nx-appearance"><input type="checkbox" id="nx-appearance" \${i.char_appearance !== !1 ? "checked" : ""}><span>CharAppearance 누적</span></label>
`;

const VENDOR_ASSET_NAI_HTML_PATCH =
  `<label class="toggle-row" data-nx-help-id="nx-appearance"><input type="checkbox" id="nx-appearance" \${i.char_appearance !== !1 ? "checked" : ""}><span>CharAppearance 누적</span></label>
            <label class="toggle-row" data-nx-help-id="nx-asset-nai-tags"><input type="checkbox" id="nx-asset-nai-tags" \${i.asset_nai_tags ? "checked" : ""}><span>에셋 NAI 태그</span></label>
`;

const VENDOR_ASSET_NAI_SAVE_NEEDLE =
  `      char_appearance: ee("nx-appearance"),
`;

const VENDOR_ASSET_NAI_SAVE_PATCH =
  `      char_appearance: ee("nx-appearance"),
      asset_nai_tags: ee("nx-asset-nai-tags"),
`;

const VENDOR_ASSET_NAI_HELP_NEEDLE =
  `"nx-appearance": { title: "CharAppearance 누적", body: "한 번 잡힌 캐릭터 외형을 다음 생성에도 이어 씁니다. 옷·머리색이 장면마다 크게 바뀌는 걸 줄입니다." },
`;

const VENDOR_ASSET_NAI_HELP_PATCH =
  `"nx-appearance": { title: "CharAppearance 누적", body: "한 번 잡힌 캐릭터 외형을 다음 생성에도 이어 씁니다. 옷·머리색이 장면마다 크게 바뀌는 걸 줄입니다." },
    "nx-asset-nai-tags": { title: "에셋 NAI 태그", body: "새 캐릭터 외형을 잡을 때, 로어 트리거와 이름이 맞는 Risu 에셋 이미지(PNG/WebP)의 NovelAI 메타 태그를 최대 4장까지 읽어 태거에 넣습니다. artist·year·품질 태그는 제외합니다." },
`;

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
      card: "카드 설정",
      characters: "캐릭터",
      prompts: "프롬프트",
      models: "모델 설정",
      curation: "큐레이팅",
      explorer: "이미지 탐색",
      debug: "디버그",
      changelog: "업데이트 내역"
    }, E = [
      "dashboard",
      "card",
      "characters",
      "prompts",
      "models",
      "curation",
      "explorer",
      "debug",
      "changelog"
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
          <div class="muted" style="margin-top:8px">최신 버전이 위에 옵니다.</div>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.1.4</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>진행 토스트: 노드 하나 유지, 내용 바뀌면 표시 · 1초간 변화 없으면 눈에서만 숨김 (SafeDOM, risutts식)</li>
            <li>인덱싱 토스트 바 = 민트, 생성/재생성/리롤 = 보라 단일 바</li>
            <li>재생성·리롤 중에도 토스트가 뷰어 진행과 같이 갱신</li>
            <li>접힘 모드 <code>재생성·태그 플로팅</code>: 태그/재생성 + 프리셋, 길게 누르면 펼침</li>
            <li>누드 단계 0–3 + 성별별 해부 태그 (torn / nude / completely nude)</li>
            <li>말풍선 삽화(beta): 카드당·줄당 중복 삽입 방지</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.1.3</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>말풍선 삽화(beta): line 위치 삽입, 오버레이 OFF여도 클릭 추적</li>
            <li>인라인 이미지 길게 누르기 → 크게보기/재생성</li>
            <li>line 매칭 실패 시 다음 줄 폴백, 같은 카드 재삽입 스킵</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.1.2</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>샷 수 프롬프트 · 채팅 전환 선택 유지 · 모바일 설정 크롬</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.1.1</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>Pass2 포커스 밴드 · cast 페이로드 · 프롬프트/토큰 절감</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.1.0</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>큐레이션 · sticky fit · NAI 사이즈 clamp</li>
          </ul>
        </div>
      \`) : t.uiTab === "debug" && (u = \``;

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
        });
        if (r === "curation") {
          K("/v1/curation/status").then((st) => {
            t.curationStatus = st?.status || st;
            return P();
          }).catch(() => P());
        } else P();`;

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
              else syncProgressToast().catch(() => {
              });
            });
          });`;

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
              <div class="muted">card.json / 로어북 [Positive]·[Negative] 항목을 불러와 바로 씁니다.</div>
            </div>
            <div class="row" style="margin:0;gap:8px;align-items:center;flex-shrink:0">
              <span class="badge \${U.length ? "custom" : "default"}">\${U.length}개</span>
              <button type="button" id="nx-save-card-head">카드 설정 저장</button>
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
    })();`;

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
    const envelope = typeof VC?.stickyThumbBoxFromPct == "function"
      ? VC.stickyThumbBoxFromPct(pct, at, ka)
      : { w: Math.max(0, Math.round(at * pct / 100)), h: Math.max(0, Math.round(ka * pct / 100)), pct };
    // Fit sticky frame to current NAI aspect (portrait/landscape/square) inside the envelope.
    const nai = t.backendSettings?.nai || {};
    const fitted = typeof VC?.fitBoxInside == "function"
      ? VC.fitBoxInside(envelope.w, envelope.h, nai.width, nai.height)
      : { w: envelope.w, h: envelope.h };
    return { w: fitted.w, h: fitted.h, pct: envelope.pct };
  }`;

/** Sticky/viewer thumbs: show full image (contain) for portrait/landscape/square. */
const VENDOR_STICKY_COVER_NEEDLE = 'width:100%;height:100%;object-fit:cover;display:block';
const VENDOR_STICKY_COVER_PATCH = 'width:100%;height:100%;object-fit:contain;display:block;background:transparent';

/** Sticky always-image shell: no opaque letterbox fill (frame already aspect-fitted). */
const VENDOR_STICKY_SHELL_BG_NEEDLE = `"box-shadow:0 4px 14px rgba(0,0,0,.35)",
      "background:#0b0f18"`;
const VENDOR_STICKY_SHELL_BG_PATCH = `"box-shadow:0 4px 14px rgba(0,0,0,.35)",
      "background:transparent"`;

/** Sticky marker create: empty placeholder must stay transparent like composeStickyThumbHtml. */
const VENDOR_STICKY_EMPTY_NEEDLE = '`<div style="width:100%;height:100%;background:#0b0f18"></div>`';
const VENDOR_STICKY_EMPTY_PATCH = '`<div style="width:100%;height:100%;background:transparent"></div>`';

const VENDOR_EXPLORER_CARD_IMG_NEEDLE =
  '.explorer-card img{width:100%;aspect-ratio:3/4;object-fit:cover;display:block;background:#0b0f18;pointer-events:none}';
const VENDOR_EXPLORER_CARD_IMG_PATCH =
  '.explorer-card img{width:100%;aspect-ratio:3/4;object-fit:contain;display:block;background:#0b0f18;pointer-events:none}';

const VENDOR_VIEWER_THUMB_SHELL_NEEDLE =
  '}, thumbShellStyle = (on, split) => `width:64px;height:88px;object-fit:cover;border-radius:8px;cursor:pointer;opacity:${on ? 1 : 0.45};outline:${on ? "3px solid #a78bfa" : "1px solid rgba(255,255,255,.08)"};outline-offset:${on ? "1px" : "0"};background:#111827;flex:0 0 auto;transform:${on ? "scale(1.04)" : "none"};box-shadow:${on ? "0 0 0 1px rgba(124,108,255,.55),0 6px 16px rgba(0,0,0,.45)" : "none"};${split ? "margin-left:4px;" : ""}`, refreshThumbsRect = async () => {';
const VENDOR_VIEWER_THUMB_SHELL_PATCH =
  '}, thumbShellStyle = (on, split) => `width:64px;height:88px;object-fit:contain;border-radius:8px;cursor:pointer;opacity:${on ? 1 : 0.45};outline:${on ? "3px solid #a78bfa" : "1px solid rgba(255,255,255,.08)"};outline-offset:${on ? "1px" : "0"};background:#111827;flex:0 0 auto;transform:${on ? "scale(1.04)" : "none"};box-shadow:${on ? "0 0 0 1px rgba(124,108,255,.55),0 6px 16px rgba(0,0,0,.45)" : "none"};${split ? "margin-left:4px;" : ""}`, refreshThumbsRect = async () => {';


const VENDOR_STICKY_KEEP_NEEDLE = `    const keepHidden = typeof VC?.shouldKeepStickyThumbHidden == "function" ? VC.shouldKeepStickyThumbHidden(!!e._stickyThumbUserHidden, e._stickyThumbHiddenId, activeIdNow) : !!(e._stickyThumbUserHidden && String(e._stickyThumbHiddenId || "") === String(activeIdNow || "") && activeIdNow);
    if (!keepHidden && e._stickyThumbUserHidden) e._stickyThumbUserHidden = !1, e._stickyThumbHiddenId = "";
`;

const VENDOR_STICKY_KEEP_PATCH = ``;

const VENDOR_STICKY_SHOW_NEEDLE = `    const showStickyImg = p && !hideThumbOffscreen && !keepHidden, u = 6, b = 11, C = 4;`;
const VENDOR_STICKY_SHOW_PATCH = `    const showStickyImg = p && m.pct > 0 && !hideThumbOffscreen, u = 6, b = 11, C = 4;`;

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
            showPressFill(node).catch(() => {
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
          priority: Number(n.priority || 0)
        };`;

/** Character settings tab: gender select beside priority. */
const VENDOR_CHAR_TAB_GENDER_HTML_NEEDLE =
  `            <label><span>우선순위</span><input data-char-priority type="number" value="\${h(r.priority ?? 0)}"></label>
            <div class="autotag-status muted\${l ? " pending" : ""}" data-autotag-status>`;
const VENDOR_CHAR_TAB_GENDER_HTML_PATCH =
  `            <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;align-items:end"><label><span>우선순위</span><input data-char-priority type="number" value="\${h(r.priority ?? 0)}"></label><label><span>성별</span><select data-char-gender><option value="" \${!["girl","boy","other","female","male"].includes(String(r.gender||r.sex||""))?"selected":""}>미정</option><option value="girl" \${["girl","female"].includes(String(r.gender||r.sex||""))?"selected":""}>girl</option><option value="boy" \${["boy","male"].includes(String(r.gender||r.sex||""))?"selected":""}>boy</option><option value="other" \${String(r.gender||r.sex||"")==="other"?"selected":""}>other</option></select></label></div>
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
        gender: ["girl", "boy", "other"].includes(String(n.querySelector("[data-char-gender]")?.value || "")) ? String(n.querySelector("[data-char-gender]")?.value || "") : ""
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
        gender: ["girl", "boy", "other", "female", "male"].includes(String(raw.gender || raw.sex || "").toLowerCase()) ? (["female", "f", "woman"].includes(String(raw.gender || raw.sex || "").toLowerCase()) ? "girl" : ["male", "m", "man"].includes(String(raw.gender || raw.sex || "").toLowerCase()) ? "boy" : String(raw.gender || raw.sex || "").toLowerCase()) : ""
      };`;

/** Wear tabs: clothes+jewelry / weapons-only; keep lock toggles (default ON). */
const VENDOR_CHAR_TAB_WEAR_HTML_NEEDLE =
  `                <div class="char-wear-head"><span>옷 태그</span><label class="char-lock"><input data-char-attire-locked type="checkbox" \${r.attire_locked ? "checked" : ""}><span>고정</span></label></div>
                <textarea data-char-attire rows="2">\${h(r.attire || "")}</textarea>
              </div>
              <div class="char-wear-col">
                <div class="char-wear-head"><span>악세사리·무기·기타</span><label class="char-lock"><input data-char-accessories-locked type="checkbox" \${r.accessories_locked ? "checked" : ""}><span>고정</span></label></div>
                <textarea data-char-accessories rows="2">\${h(r.accessories || "")}</textarea>`;
const VENDOR_CHAR_TAB_WEAR_HTML_PATCH =
  `                <div class="char-wear-head"><span>옷·악세사리</span><label class="char-lock"><input data-char-attire-locked type="checkbox" \${r.attire_locked !== false ? "checked" : ""}><span>고정</span></label></div>
                <textarea data-char-attire rows="2">\${h(r.attire || "")}</textarea>
              </div>
              <div class="char-wear-col">
                <div class="char-wear-head"><span>무기·기타</span><label class="char-lock"><input data-char-accessories-locked type="checkbox" \${r.accessories_locked !== false ? "checked" : ""}><span>고정</span></label></div>
                <textarea data-char-accessories rows="2">\${h(r.accessories || "")}</textarea>`;

const VENDOR_CHAR_EDIT_WEAR_ATTIRE_NEEDLE =
  `<span>옷 태그</span><label style="display:inline-flex;align-items:center;gap:4px;margin:0;color:#d7deea;font-size:11px;font-weight:550;cursor:pointer;white-space:nowrap"><input data-ce-attire-locked type="checkbox" \${n.attire_locked ? "checked" : ""} style="width:14px;height:14px;margin:0;accent-color:#7c6cff">고정</label>`;
const VENDOR_CHAR_EDIT_WEAR_ATTIRE_PATCH =
  `<span>옷·악세사리</span><label style="display:inline-flex;align-items:center;gap:4px;margin:0;color:#d7deea;font-size:11px;font-weight:550;cursor:pointer;white-space:nowrap"><input data-ce-attire-locked type="checkbox" \${n.attire_locked !== false ? "checked" : ""} style="width:14px;height:14px;margin:0;accent-color:#7c6cff">고정</label>`;

const VENDOR_CHAR_EDIT_WEAR_ACC_NEEDLE =
  `<span>악세사리·무기·기타</span><label style="display:inline-flex;align-items:center;gap:4px;margin:0;color:#d7deea;font-size:11px;font-weight:550;cursor:pointer;white-space:nowrap"><input data-ce-accessories-locked type="checkbox" \${n.accessories_locked ? "checked" : ""} style="width:14px;height:14px;margin:0;accent-color:#7c6cff">고정</label>`;
const VENDOR_CHAR_EDIT_WEAR_ACC_PATCH =
  `<span>무기·기타</span><label style="display:inline-flex;align-items:center;gap:4px;margin:0;color:#d7deea;font-size:11px;font-weight:550;cursor:pointer;white-space:nowrap"><input data-ce-accessories-locked type="checkbox" \${n.accessories_locked !== false ? "checked" : ""} style="width:14px;height:14px;margin:0;accent-color:#7c6cff">고정</label>`;

const VENDOR_CHAR_EDIT_APPEARANCE_LABEL_NEEDLE = `<span>외형 태그 (girl/boy · 옷·악세사리 제외)</span>`;
const VENDOR_CHAR_EDIT_APPEARANCE_LABEL_PATCH = `<span>외형 태그 (girl/boy · 옷·무기 제외)</span>`;

const VENDOR_CHAR_EDIT_LOCK_PRESET_NEEDLE =
  `attireLockedEl && (attireLockedEl.checked = !!I.attire_locked), accLockedEl && (accLockedEl.checked = !!I.accessories_locked)`;
const VENDOR_CHAR_EDIT_LOCK_PRESET_PATCH =
  `attireLockedEl && (attireLockedEl.checked = I.attire_locked !== false), accLockedEl && (accLockedEl.checked = I.accessories_locked !== false)`;

const VENDOR_CHAR_CREATE_LOCK_PRESET_NEEDLE =
  `attireLockedEl && (attireLockedEl.checked = !!I.attire_locked);
      accLockedEl && (accLockedEl.checked = !!I.accessories_locked);`;
const VENDOR_CHAR_CREATE_LOCK_PRESET_PATCH =
  `attireLockedEl && (attireLockedEl.checked = I.attire_locked !== false);
      accLockedEl && (accLockedEl.checked = I.accessories_locked !== false);`;

const VENDOR_CHAR_CREATE_WEAR_ATTIRE_NEEDLE =
  `<span>옷 태그</span><label style="display:inline-flex;align-items:center;gap:4px;color:#d7deea;font-size:11px;cursor:pointer"><input data-cc-attire-locked type="checkbox" style="width:14px;height:14px;margin:0;accent-color:#7c6cff">고정</label>`;
const VENDOR_CHAR_CREATE_WEAR_ATTIRE_PATCH =
  `<span>옷·악세사리</span><label style="display:inline-flex;align-items:center;gap:4px;color:#d7deea;font-size:11px;cursor:pointer"><input data-cc-attire-locked type="checkbox" checked style="width:14px;height:14px;margin:0;accent-color:#7c6cff">고정</label>`;

const VENDOR_CHAR_CREATE_WEAR_ACC_NEEDLE =
  `<span>악세사리·무기·기타</span><label style="display:inline-flex;align-items:center;gap:4px;color:#d7deea;font-size:11px;cursor:pointer"><input data-cc-accessories-locked type="checkbox" style="width:14px;height:14px;margin:0;accent-color:#7c6cff">고정</label>`;
const VENDOR_CHAR_CREATE_WEAR_ACC_PATCH =
  `<span>무기·기타</span><label style="display:inline-flex;align-items:center;gap:4px;color:#d7deea;font-size:11px;cursor:pointer"><input data-cc-accessories-locked type="checkbox" checked style="width:14px;height:14px;margin:0;accent-color:#7c6cff">고정</label>`;

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
  `@media(max-width:700px){.model-form{grid-template-columns:1fr}.model-head{align-items:flex-start;flex-direction:column}.wrap{padding:12px 10px 40px;overflow-x:hidden}.head{flex-direction:column;align-items:stretch;gap:8px;padding:10px}.head-actions{display:flex;flex-wrap:wrap;justify-content:stretch;align-items:stretch;width:100%;max-width:100%;flex-shrink:1;gap:6px}.head-actions button{flex:1 1 calc(50% - 6px);min-width:0;max-width:100%}.head-actions #nx-close{flex:1 1 100%;order:99}.tabs{width:100%!important;max-width:100%;box-sizing:border-box}.tab{padding:8px 12px;font-size:13px}}`;

/** Beta: message-bubble inline illustrations at LLM `line` (click/hash timing only). */
const VENDOR_INLINE_HELP_NEEDLE =
  `    "nx-overlay": { title: "채팅 왼쪽 줄 오버레이", body: "채팅 왼쪽에 핀과 이미지를 함께 둡니다. 스크롤하는 동안에도 지금 읽는 구간의 이미지를 계속 보여 줍니다. 짧게 누르면 이미지를 숨기고, 핀을 누르면 다시 나타납니다. 길게 누르면 크게보기와 태그·재생성·리롤·캐릭터 칩 메뉴가 열립니다." },`;
const VENDOR_INLINE_HELP_PATCH =
  `    "nx-overlay": { title: "채팅 왼쪽 줄 오버레이", body: "채팅 왼쪽에 핀과 이미지를 함께 둡니다. 스크롤하는 동안에도 지금 읽는 구간의 이미지를 계속 보여 줍니다. 짧게 누르면 이미지를 숨기고, 핀을 누르면 다시 나타납니다. 길게 누르면 크게보기와 태그·재생성·리롤·캐릭터 칩 메뉴가 열립니다." },
    "nx-inline-chat": { title: "말풍선 삽화 (beta)", body: "메시지 클릭·해시 연결 시, 샷의 line 위치에 말풍선 본문에 이미지를 끼워 넣습니다. 오버레이와 별개입니다. Risu가 말풍선을 다시 그리면 사라질 수 있어 다시 클릭해야 합니다." },
    "nx-progress-toast": { title: "진행 토스트", body: "토스트 노드는 항상 두고, 진행·작업명이 바뀌면 보이게 / 1초간 내용 변화 없으면 눈에서만 숨깁니다. 인덱싱=민트, 그 외=보라. 클릭하면 당장 숨깁니다." },`;

const VENDOR_INLINE_TOGGLE_NEEDLE =
  `            <label class="toggle-row" data-nx-help-id="nx-overlay"><input type="checkbox" id="nx-overlay" \${i.overlay_markers !== !1 ? "checked" : ""}><span>채팅 왼쪽 줄 오버레이</span></label>`;
const VENDOR_INLINE_TOGGLE_PATCH =
  `            <label class="toggle-row" data-nx-help-id="nx-overlay"><input type="checkbox" id="nx-overlay" \${i.overlay_markers !== !1 ? "checked" : ""}><span>채팅 왼쪽 줄 오버레이</span></label>
            <label class="toggle-row" data-nx-help-id="nx-inline-chat"><input type="checkbox" id="nx-inline-chat" \${i.inline_chat_images ? "checked" : ""}><span>말풍선 삽화 (beta)</span></label>
            <label class="toggle-row" data-nx-help-id="nx-progress-toast"><input type="checkbox" id="nx-progress-toast" \${i.progress_toast ? "checked" : ""}><span>진행 토스트</span></label>`;

const VENDOR_INLINE_SAVE_NEEDLE =
  `      overlay_markers: ee("nx-overlay"),`;
const VENDOR_INLINE_SAVE_PATCH =
  `      overlay_markers: ee("nx-overlay"),
      inline_chat_images: ee("nx-inline-chat"),
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
      if (typeof e.getInnerHTML == "function") {
        let html = String(await e.getInnerHTML() || "");
        const VC = globalThis.__INLAY_VIEWER_CORE__;
        if (typeof VC?.stripInlayInlineHtml == "function") html = VC.stripInlayInlineHtml(html);
        return w(ln(html), 1e5);
      }
    } catch {
    }`;

const VENDOR_INLINE_INJECT_FN_NEEDLE =
  `  async function ensureMessageInView(el) {`;
const VENDOR_INLINE_INJECT_FN_PATCH =
  `  async function injectChatInlineImages(msgEl, cards) {
    if (!msgEl || t.backendSettings?.card?.inline_chat_images !== !0) return;
    if (typeof msgEl.querySelectorAll != "function" || typeof msgEl.getInnerHTML != "function") return;
    if (t._inlineInjectBusy) return;
    t._inlineInjectBusy = !0;
    try {
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    if (typeof VC?.findElementIndexForLineWithFallback != "function" || typeof VC?.markerBlockHtml != "function") return;
    const doc = t.hostDoc;
    if (!doc || typeof doc.createElement != "function") return;
    const list = Array.isArray(cards) ? cards : [];
    const placements = [];
    const seenCard = new Set();
    for (const card of list) {
      const line = Number(card?.line);
      if (!Number.isFinite(line) || line < 1) continue;
      const cardId = String(card?.id || "");
      if (cardId && seenCard.has(cardId)) continue;
      let src = "";
      try {
        src = await ensureStickyCardImage(card) || "";
      } catch {
      }
      if (!src || !/^data:image\\//i.test(src)) continue;
      // Hard cap: one marker per card id — kills triple-same-card inject bugs.
      if (cardId) seenCard.add(cardId);
      placements.push({ line, src, shotIndex: card.shot_index, cardId });
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
      const wantIds = placements.map((p) => String(p.cardId || "")).filter(Boolean).sort();
      let prev = await unwrapSafe(await msgEl.querySelectorAll("[data-inlay-inline-shot]"));
      // Skip only when marker count and card-id set both match (add/remove/replace → update).
      if (prev.length === wantIds.length) {
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
          y("info", "inline.inject.skip", \`shots=\${placements.length} already\`);
          return;
        }
      }
      // Drop prior markers without rewriting the bubble (also clears zombie triples).
      for (const node of prev) {
        try {
          if (node && typeof node.remove == "function") await node.remove();
        } catch {
        }
      }
      // Second pass — SafeDOM sometimes leaves siblings behind.
      prev = await unwrapSafe(await msgEl.querySelectorAll("[data-inlay-inline-shot]"));
      for (const node of prev) {
        try {
          if (node && typeof node.remove == "function") await node.remove();
        } catch {
        }
      }
      if (!placements.length) {
        y("info", "inline.inject", "shots=0 cleared");
        return;
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
        // Hard: at most one image per line.
        if (byLine.has(line)) continue;
        byLine.set(line, { ...p, line });
      }
      let placed = 0;
      const placedIds = new Set();
      for (const [line, shot] of byLine) {
        const id = String(shot.cardId || "");
        if (id && placedIds.has(id)) continue;
        const hit = VC.findElementIndexForLineWithFallback(hostTexts, hostTags, messageLines, line, ["P"]);
        if (!hit || hit.elementIndex < 0 || hit.elementIndex >= hosts.length) continue;
        const host = hosts[hit.elementIndex];
        if (!host || typeof host.prepend != "function") continue;
        const markerHtml = VC.markerBlockHtml(shot);
        if (!markerHtml) continue;
        try {
          const tmp = await H(doc, "div", { html: markerHtml });
          const kids = await unwrapSafe(typeof tmp?.getChildren == "function" ? await tmp.getChildren() : null);
          const wrap = kids[0];
          if (wrap && typeof host.prepend == "function") {
            await host.prepend(wrap);
            placed += 1;
            if (id) placedIds.add(id);
          }
        } catch {
        }
      }
      y("info", "inline.inject", \`shots=\${placements.length} placed=\${placed}\`);
    } catch (err) {
      y("warn", "inline.inject.fail", z(err?.message || err, 120));
    }
    } finally {
      t._inlineInjectBusy = !1;
    }
  }
  async function ensureMessageInView(el) {`;

const VENDOR_INLINE_CALL_NEEDLE =
  `    return await onSelectionChanged("content"), scheduleOverlayPlace(80), t.debugUi?.refreshSoon && t.debugUi.refreshSoon(), (source === "click" || source === "text") && await ensureMessageInView(o), source === "provisional" ? !0 : !isSelectedCharRole(l) ? (y("info", "select.user", "유저 메시지 — 자동 생성 안 함"), !0) : u.length ? (y("info", "select.hasImage", \`cards=\${u.length} · 재생성은 뷰어 버튼\`), !0) : (y("info", "select.noImage", "해시 이미지 없음 → 태그부터 생성"), await Ka(t.selectedMessage.text, t.selectedMessage.hash), !0);
  }`;
const VENDOR_INLINE_CALL_PATCH =
  `    if (source === "click" || source === "text") {
      try {
        await injectChatInlineImages(o, u);
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
  `      if (source === "click" || source === "text") {
        try {
          await injectChatInlineImages(o, linked);
        } catch {
        }
      }
      if (linked.length) return !0;
      if (source === "scroll" || source === "provisional") return !0;
      if (source === "text") return !isSelectedCharRole(l) ? !0 : (y("info", "select.same", \`msg#\${i.chatIndex} noImage → retry\`), await Ka(t.selectedMessage.text, t.selectedMessage.hash), !0);
      return !isSelectedCharRole(l) ? !0 : (y("info", "select.same", \`msg#\${i.chatIndex} noImage → retry\`), await Ka(t.selectedMessage.text, t.selectedMessage.hash), !0);
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

const VENDOR_SCOPE_POLL_NEEDLE = `n._scopeTick % 24 === 0 && !(t.jobsInFlight.size`;
const VENDOR_SCOPE_POLL_PATCH = `n._scopeTick % 4 === 0 && !(t.jobsInFlight.size`;

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
const VENDOR_OVERLAY_HT_HIDE_PATCH = `  async function Ht(opts = {}) {
    const e = t.overlayUi;
    if (!e?.markers?.length) return;
    // Overlay toggle OFF: keep shell/click, park pins+thumbs off-screen.
    if (!Nt()) {
      for (const m of e.markers) hideStickyMarker(m);
      return;
    }
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
    if (!Nt()) {
      if (e.markers?.length) for (const m of e.markers) hideStickyMarker(m);
      return;
    }
    const n = e.doc || await ue();
    if (!n) return;`;

const VENDOR_OVERLAY_HELP_NEEDLE =
  `"nx-overlay": { title: "채팅 왼쪽 줄 오버레이", body: "채팅 왼쪽에 핀과 이미지를 함께 둡니다. 스크롤하는 동안에도 지금 읽는 구간의 이미지를 계속 보여 줍니다. 짧게 누르면 이미지를 숨기고, 핀을 누르면 다시 나타납니다. 길게 누르면 크게보기와 태그·재생성·리롤·캐릭터 칩 메뉴가 열립니다." },`;
const VENDOR_OVERLAY_HELP_PATCH =
  `"nx-overlay": { title: "채팅 왼쪽 줄 오버레이", body: "채팅 왼쪽 핀·스티키 이미지를 보여 줍니다. 꺼도 메시지 클릭 선택·말풍선 삽화는 유지됩니다. 켠 동안 스크롤하면 읽는 구간 이미지가 따라갑니다." },`;

/** Idle help panel shows release notes (hover still swaps to per-setting tips). */
const VENDOR_HEAD_HELP_DEFAULT_NEEDLE =
  `  const HEAD_HELP_DEFAULT = {
    title: "도움말",
    body: "설정에 마우스를 올리면 설명이 여기에 나타납니다."
  };`;
const VENDOR_HEAD_HELP_DEFAULT_PATCH =
  `  const HEAD_HELP_DEFAULT = {
    title: "2.1.4",
    body: "진행 토스트(단일 바·1초 무변화 시 눈숨김), 누드 0–3/성별 태그, 재생성·태그 플로팅 접힘, 말풍선 삽화 중복 방지. 업데이트 내역 탭에서 변경점을 볼 수 있습니다."
  };`;

/** Top-center progress toast: one bar; show on change; hide 1s after last change. */
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
  /** risutts-style: one SafeDOM toast; eye-hide via display none/block; never recreate while enabled. */
  const PROGRESS_TOAST_STYLE_SHOW = "position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:99999;pointer-events:auto;max-width:min(420px,92vw);display:block;";
  const PROGRESS_TOAST_STYLE_HIDE = "position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:99999;pointer-events:none;max-width:min(420px,92vw);display:none;";
  async function setProgressToastEye(visible) {
    const root = t._progressToastRoot;
    if (!root) return;
    t._progressToastShown = !!visible;
    try {
      if (typeof root.setStyleAttribute == "function") await root.setStyleAttribute(visible ? PROGRESS_TOAST_STYLE_SHOW : PROGRESS_TOAST_STYLE_HIDE);
    } catch {
    }
  }
  function armProgressToastEyeHide() {
    t._progressToastArmed = !0;
    t._progressToastUntil = Date.now() + 1e3;
    if (t._progressToastHideTimer) clearTimeout(t._progressToastHideTimer);
    t._progressToastHideTimer = setTimeout(() => {
      t._progressToastHideTimer = null;
      t._progressToastArmed = !1;
      t._progressToastUntil = 0;
      setProgressToastEye(!1).catch(() => {
      });
    }, 1e3);
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
    setProgressToastEye(!1).catch(() => {
    });
  }
  async function destroyProgressToast() {
    clearProgressToastEyeHide();
    const root = t._progressToastRoot;
    t._progressToastRoot = null;
    t._progressToastShown = !1;
    t._progressToastFp = "";
    try {
      root && typeof root.remove == "function" && await root.remove();
    } catch {
    }
  }
  async function ensureProgressToastRoot() {
    // Do NOT probe isConnected — SafeDOM lies and caused infinite create + zombies.
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
    try {
      typeof root.setAttribute == "function" && await root.setAttribute("data-inlay-progress-toast-root", "1");
    } catch {
    }
    const onDismiss = (ev) => {
      try {
        ev && ev.preventDefault && ev.preventDefault();
        ev && ev.stopPropagation && ev.stopPropagation();
      } catch {
      }
      dismissProgressToastUi();
    };
    for (const evName of ["pointerdown", "click", "touchstart"]) {
      try {
        typeof root.addEventListener == "function" && root.addEventListener(evName, onDismiss);
      } catch {
      }
    }
    await body.appendChild(root);
    t._progressToastRoot = root;
    t._progressToastShown = !1;
    return root;
  }
  async function syncProgressToast() {
    if (t._progressToastSyncing) return;
    t._progressToastSyncing = !0;
    try {
      const enabled = t.backendSettings?.card?.progress_toast === !0 || t.backendSettings?.card?.progress_toast === 1 || t.backendSettings?.card?.progress_toast === "true";
      if (!enabled) {
        await destroyProgressToast();
        return;
      }
      const B = t.jobProgress;
      const info = formatViewerJob(B);
      const idx = readIndexProgress(B);
      const jobBusy = !!(info && info.busy);
      const indexBusy = !!idx.busy;
      const state = info?.state || "";
      const isError = state === "error";
      const isTerminal = state === "done" || state === "cancelled" || isError;
      const liveBusy = jobBusy || indexBusy;
      const hasPayload = liveBusy || isTerminal && !!B;
      await ensureProgressToastRoot();
      if (!hasPayload) return;
      const indexOnly = !jobBusy && indexBusy;
      const stage = jobBusy
        ? info.stage || "작업 중"
        : indexBusy
          ? idx.label || "인덱싱"
          : info?.stage || "작업 중";
      const pct = jobBusy ? info.pct : indexBusy ? idx.pct : info ? info.pct : 0;
      const shot = info?.shot || "";
      const detail = info?.detail ? String(info.detail).slice(0, 80) : "";
      const meta = shot
        ? \`\${shot} · \${pct}%\`
        : detail
          ? \`\${detail} · \${pct}%\`
          : \`\${pct}%\`;
      const tone = indexOnly ? "index" : "job";
      const fp = \`\${stage}|\${pct}|\${meta}|\${state}|\${tone}|\${isError ? 1 : 0}\`;
      if (fp === t._progressToastFp) return;
      t._progressToastFp = fp;
      const VC = globalThis.__INLAY_VIEWER_CORE__;
      const html = typeof VC?.composeProgressToastHtml == "function" ? VC.composeProgressToastHtml({
        stage,
        meta,
        pct,
        busy: !0,
        error: isError,
        tone,
        escapeHtml: h
      }) : \`<div data-inlay-progress-toast="1" style="padding:10px 14px;border-radius:8px;background:#121820;border:1px solid #2a3344;color:#e8eef8;font-size:12px;cursor:pointer">\${h(stage + " " + meta)}</div>\`;
      if (!html) return;
      const root = await ensureProgressToastRoot();
      if (!root) return;
      try {
        if (typeof root.setInnerHTML == "function") await root.setInnerHTML(html);
      } catch {
        return;
      }
      await setProgressToastEye(!0);
      armProgressToastEyeHide();
    } finally {
      t._progressToastSyncing = !1;
    }
  }
  if (!t._progressToastWatchdog) {
    t._progressToastWatchdog = setInterval(() => {
      try {
        const on = t.backendSettings?.card?.progress_toast === !0 || t.backendSettings?.card?.progress_toast === 1 || t.backendSettings?.card?.progress_toast === "true";
        if (!on) {
          destroyProgressToast().catch(() => {
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
      else await syncProgressToast();
    } catch {
    }
  }`;

/** Reroll fake-progress: always call Se (even at 88% cap) so toast heartbeats keep it visible. */
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
      try {
        await syncProgressToast();
      } catch {
      }`;

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

/** Third minimize mode: actions floating (tag/regen + preset); long-press expands. */
const VENDOR_ACTIONS_HELP_NEEDLE =
  `"nx-minimize-mode": { title: "접힘 표시 방식", body: "플로팅 아이콘: 접으면 작은 아이콘으로 따로 둔 자리로 갑니다. 상단 툴바 한 줄: 접어도 지금 창 자리 그대로 얇은 바로만 줄어듭니다." },`;
const VENDOR_ACTIONS_HELP_PATCH =
  `"nx-minimize-mode": { title: "접힘 표시 방식", body: "플로팅 아이콘: 작은 🖼️, 클릭하면 펼침. 상단 툴바 한 줄: 창 자리에서 얇은 바. 재생성·태그 플로팅: 접으면 태그/재생성 + 프리셋 미니 패널, 길게 누르면 전체 뷰어 펼침." },`;

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
const VENDOR_ACTIONS_CLAMP_PATCH =
  `    if (minimized) {
      if (mode === "toolbar") {
        dispW = Math.max(280, Math.min(storeW, vw - margin * 2));
        dispH = 40;
      } else if (mode === "actions") {
        dispW = 168;
        dispH = 76;
      } else dispW = 48, dispH = 48;
    } else {`;

const VENDOR_ACTIONS_FT_NEEDLE =
  `      minimized && mode === "icon" ? "min-width:48px" : minimized ? "min-width:280px" : "min-width:260px",`;
const VENDOR_ACTIONS_FT_PATCH =
  `      minimized && mode === "icon" ? "min-width:48px" : minimized && mode === "actions" ? "min-width:168px" : minimized ? "min-width:280px" : "min-width:260px",`;

const VENDOR_ACTIONS_OVERFLOW_NEEDLE =
  `      if (d.presetMenuOpen && (!d.minimized || viewerMinimizeMode() === "toolbar")) {`;
const VENDOR_ACTIONS_OVERFLOW_PATCH =
  `      if (d.presetMenuOpen && (!d.minimized || viewerMinimizeMode() === "toolbar" || viewerMinimizeMode() === "actions")) {`;

const VENDOR_ACTIONS_CHROME_NEEDLE =
  `    }, applyViewerChrome = async () => {
      const mode = viewerMinimizeMode(), toolbarMin = d.minimized && mode === "toolbar", iconMin = d.minimized && mode === "icon";
      try {
        await s.setInnerHTML(iconMin ? "🖼️" : "Inlay Viewer"), await i.setStyleAttribute(\`height:\${iconMin ? 48 : toolbarMin ? 40 : 36}px;display:flex;align-items:center;justify-content:\${iconMin ? "center" : "space-between"};gap:8px;padding:\${iconMin ? "0" : "0 10px"};background:rgba(255,255,255,.04);border-bottom:\${d.minimized && !toolbarMin ? "0" : "1px solid rgba(255,255,255,.06)"};cursor:move;user-select:none;flex-shrink:0;touch-action:none;\`), await viewerPresetBtn.setStyleAttribute(\`max-width:140px;min-width:88px;flex:0 1 140px;height:26px;border-radius:7px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;font-size:11px;padding:0 8px;cursor:pointer;pointer-events:auto;display:\${iconMin ? "none" : "inline-flex"};align-items:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;box-sizing:border-box;\`), await viewerPresetMenu.setStyleAttribute(\`display:\${!iconMin && d.presetMenuOpen ? "block" : "none"};position:absolute;top:34px;left:10px;min-width:140px;max-width:220px;max-height:220px;overflow:auto;z-index:5;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;box-shadow:0 10px 28px rgba(0,0,0,.45);pointer-events:auto;\`), await c.setStyleAttribute(\`display:\${iconMin ? "none" : "flex"};gap:5px;align-items:center;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;\`);
      } catch {
      }`;
const VENDOR_ACTIONS_CHROME_PATCH =
  `    }, applyViewerChrome = async () => {
      const mode = viewerMinimizeMode(), toolbarMin = d.minimized && mode === "toolbar", iconMin = d.minimized && mode === "icon", actionsMin = d.minimized && mode === "actions";
      try {
        if (actionsMin) {
          await s.setInnerHTML('<span data-nx-act="tag" style="cursor:pointer;background:#0f766e;color:#fff;padding:5px 10px;border-radius:7px;font-size:11px;line-height:1;font-weight:600;flex:1;text-align:center">태그</span><span data-nx-act="regen" style="cursor:pointer;background:#7c6cff;color:#fff;padding:5px 10px;border-radius:7px;font-size:11px;line-height:1;font-weight:600;flex:1;text-align:center">재생성</span>'), await i.setStyleAttribute("height:76px;display:flex;flex-direction:column;align-items:stretch;justify-content:center;gap:6px;padding:8px;background:rgba(255,255,255,.04);border-bottom:0;cursor:move;user-select:none;flex-shrink:0;touch-action:none;"), await s.setStyleAttribute("display:flex;gap:6px;align-items:center;width:100%;flex:0 0 auto;"), await viewerPresetBtn.setStyleAttribute("max-width:none;min-width:0;flex:0 0 auto;width:100%;height:26px;border-radius:7px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;font-size:11px;padding:0 8px;cursor:pointer;pointer-events:auto;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;box-sizing:border-box;"), await viewerPresetMenu.setStyleAttribute(\`display:\${d.presetMenuOpen ? "block" : "none"};position:absolute;top:72px;left:8px;right:8px;min-width:0;max-width:none;max-height:220px;overflow:auto;z-index:20;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;box-shadow:0 10px 28px rgba(0,0,0,.45);pointer-events:auto;\`), await c.setStyleAttribute("display:none;");
        } else {
          await s.setInnerHTML(iconMin ? "🖼️" : "Inlay Viewer"), await s.setStyleAttribute(iconMin ? "font-weight:600;font-size:22px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:0 1 auto;min-width:0;" : "font-weight:600;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:0 1 auto;min-width:0;"), await i.setStyleAttribute(\`height:\${iconMin ? 48 : toolbarMin ? 40 : 36}px;display:flex;align-items:center;justify-content:\${iconMin ? "center" : "space-between"};gap:8px;padding:\${iconMin ? "0" : "0 10px"};background:rgba(255,255,255,.04);border-bottom:\${d.minimized && !toolbarMin ? "0" : "1px solid rgba(255,255,255,.06)"};cursor:move;user-select:none;flex-shrink:0;touch-action:none;\`), await viewerPresetBtn.setStyleAttribute(\`max-width:140px;min-width:88px;flex:0 1 140px;height:26px;border-radius:7px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;font-size:11px;padding:0 8px;cursor:pointer;pointer-events:auto;display:\${iconMin ? "none" : "inline-flex"};align-items:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;box-sizing:border-box;\`), await viewerPresetMenu.setStyleAttribute(\`display:\${!iconMin && d.presetMenuOpen ? "block" : "none"};position:absolute;top:34px;left:10px;min-width:140px;max-width:220px;max-height:220px;overflow:auto;z-index:5;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;box-shadow:0 10px 28px rgba(0,0,0,.45);pointer-events:auto;\`), await c.setStyleAttribute(\`display:\${iconMin ? "none" : "flex"};gap:5px;align-items:center;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;\`);
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
        }
        if (d.presetSelect && await X(d.presetSelect, _, O)) {
          d.presetMenuOpen = !d.presetMenuOpen;
          await syncViewerPresetSelect();
          return;
        }
        if (await X(s, _, O)) {
          try {
            const kids = typeof k.unwarpSafeArray == "function" ? await k.unwarpSafeArray(await s.getChildren()) : [];
            for (let W = 0; W < kids.length; W += 1) {
              const J = await kids[W].getBoundingClientRect();
              if (_ >= J.left && _ <= J.right && O >= J.top && O <= J.bottom) {
                W === 0 ? await te() : W === 1 && await rerollAllImages();
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
      !d.drag.moved && Math.abs(_) + Math.abs(O) > 4 && (d.drag.moved = !0);`;
const VENDOR_ACTIONS_DRAG_CLEAR_PATCH =
  `    }, Za = async (A) => {
      if (!d.drag) return;
      const cx = Number(A?.clientX), cy = Number(A?.clientY);
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
      const _ = cx - d.drag.startCX, O = cy - d.drag.startCY;
      if (!d.drag.moved && Math.abs(_) + Math.abs(O) > 4) {
        d.drag.moved = !0;
        if (d._actionsLpTimer) clearTimeout(d._actionsLpTimer), d._actionsLpTimer = null;
      }`;

const VENDOR_ACTIONS_END_CLEAR_NEEDLE =
  `    }, endViewerDrag = async (opts = {}) => {
      if (!d.drag) return;
      const { moveId: A, upId: _, cancelId: cancelId, moved: moved, expandOnTap: expandOnTap } = d.drag;
      d.drag = null;`;
const VENDOR_ACTIONS_END_CLEAR_PATCH =
  `    }, endViewerDrag = async (opts = {}) => {
      if (!d.drag) return;
      if (d._actionsLpTimer) clearTimeout(d._actionsLpTimer), d._actionsLpTimer = null;
      const { moveId: A, upId: _, cancelId: cancelId, moved: moved, expandOnTap: expandOnTap } = d.drag;
      d.drag = null;`;

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
  'curation_refine', 'curation_embed_hint', 'asset_tags_inject',
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
      throw new Error(`[build] expected 2× sticky shell background:#0b0f18, found ${shellBgCount}`);
    }
  }
  assertOnce(raw, VENDOR_STICKY_EMPTY_NEEDLE, 'sticky empty placeholder');
  assertOnce(raw, VENDOR_EXPLORER_CARD_IMG_NEEDLE, 'explorer card img contain');
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
  assertOnce(raw, VENDOR_ASSET_NAI_HTML_NEEDLE, 'asset_nai_tags HTML');
  assertOnce(raw, VENDOR_ASSET_NAI_SAVE_NEEDLE, 'asset_nai_tags save');
  assertOnce(raw, VENDOR_ASSET_NAI_HELP_NEEDLE, 'asset_nai_tags help');
  assertOnce(raw, VENDOR_CURATION_TABS_NEEDLE, 'curation tabs S/E');
  assertOnce(raw, VENDOR_CURATION_PANEL_NEEDLE, 'curation panel insert');
  assertOnce(raw, VENDOR_CURATION_EVENTS_NEEDLE, 'curation events insert');
  assertOnce(raw, VENDOR_CURATION_TAB_LOAD_NEEDLE, 'curation tab load');
  assertOnce(raw, VENDOR_GLOBAL_TOGGLE_SUMMARY_NEEDLE, 'global toggle summary');
  assertOnce(raw, VENDOR_GLOBAL_TOGGLE_BODY_NEEDLE, 'global toggle body row');
  assertOnce(raw, VENDOR_EXPLORER_THUMB_PAINT_NEEDLE, 'explorer thumb paint');
  assertOnce(raw, VENDOR_EXPLORER_THUMB_WARM_NEEDLE, 'explorer thumb warm');
  assertOnce(raw, VENDOR_EXPLORER_WARM_PROGRESS_NEEDLE, 'explorer warm progress');
  assertOnce(raw, VENDOR_PRESET_QT_NEEDLE, 'preset Qt()');
  assertOnce(raw, VENDOR_PRESET_UN_NEEDLE, 'preset un() merge');
  assertOnce(raw, VENDOR_PRESET_HTML_NEEDLE, 'preset HTML cfg/vibe');
  assertOnce(raw, VENDOR_PRESET_HEAD_SAVE_NEEDLE, 'preset head save button');
  assertOnce(raw, VENDOR_PRESET_SAVE_EVT_NEEDLE, 'preset save card events');
  assertOnce(raw, VENDOR_PRESET_READ_NEEDLE, 'preset _e() read');
  assertOnce(raw, VENDOR_PRESET_FA_NEEDLE, 'preset fa() write');
  assertOnce(raw, VENDOR_PRESET_SYNC_NEEDLE, 'preset form sync');
  assertOnce(raw, VENDOR_PRESET_EXPORT_NEEDLE, 'preset JSON export');
  assertOnce(raw, VENDOR_PRESET_NEW_NEEDLE, 'preset new');
  assertOnce(raw, VENDOR_PRESET_DUP_NEEDLE, 'preset dup');
  assertOnce(raw, VENDOR_PRESET_DEL_NEEDLE, 'preset del clear vibe');
  assertOnce(raw, VENDOR_PRESET_VIBE_EVT_NEEDLE, 'preset vibe upload events');
  for (const [needle, label] of [
    [VENDOR_STICKY_TAKE_NEEDLE, 'sticky takePooledMarker'],
    [VENDOR_STICKY_LA_NEEDLE, 'sticky La()'],
    [VENDOR_STICKY_KEEP_NEEDLE, 'sticky keepHidden'],
    [VENDOR_STICKY_SHOW_NEEDLE, 'sticky showStickyImg'],
    [VENDOR_STICKY_SKIP_NEEDLE, 'sticky skip keepHidden'],
    [VENDOR_STICKY_ASSIGN_NEEDLE, 'sticky assign keepHidden'],
    [VENDOR_STICKY_CLICK_NEEDLE, 'sticky click hide/revive'],
    [VENDOR_STICKY_PRESS_NEEDLE, 'sticky press skip'],
    [VENDOR_INLINE_LONGPRESS_NEEDLE, 'inline shot long-press'],
    [VENDOR_STICKY_REVIVE_NEEDLE, 'sticky pin revive'],
    [VENDOR_STICKY_INIT_NEEDLE, 'sticky init flags'],
    [VENDOR_STICKY_RESET_NEEDLE, 'sticky reset flags'],
    [VENDOR_STICKY_OPEN_CARD_NEEDLE, 'sticky open card edit'],
    [VENDOR_STICKY_OPEN_CHAR_NEEDLE, 'sticky open char edit'],
    [VENDOR_STICKY_CLOSE_CARD_NEEDLE, 'sticky close card edit'],
    [VENDOR_STICKY_CLOSE_CHAR_NEEDLE, 'sticky close char edit'],
    [VENDOR_OVERLAY_MOUNT_NEEDLE, 'overlay keep Ya shell'],
    [VENDOR_OVERLAY_WATCH_NEEDLE, 'overlay watchdog always shell'],
    [VENDOR_OVERLAY_RETRY_NEEDLE, 'overlay retry always shell'],
    [VENDOR_OVERLAY_HT_HIDE_NEEDLE, 'overlay Ht hide when off'],
    [VENDOR_OVERLAY_JA_HIDE_NEEDLE, 'overlay Ja hide when off'],
    [VENDOR_OVERLAY_HELP_NEEDLE, 'overlay help click keeps'],
    [VENDOR_HEAD_HELP_DEFAULT_NEEDLE, 'head help default changelog'],
    [VENDOR_CARD_TAG_ROSTER_REFRESH_NEEDLE, 'card tag keep stored prompt'],
    [VENDOR_CARD_TAG_STRIP_PERSON_NEEDLE, 'card tag strip person NAI-safe split'],
    [VENDOR_CARD_TAG_APPLY_WEIGHT_NEEDLE, 'card tag apply auto person weight'],
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
    [VENDOR_CHAR_EDIT_WEAR_ATTIRE_NEEDLE, 'char edit wear attire'],
    [VENDOR_CHAR_EDIT_WEAR_ACC_NEEDLE, 'char edit wear accessories'],
    [VENDOR_CHAR_EDIT_APPEARANCE_LABEL_NEEDLE, 'char edit appearance label'],
    [VENDOR_CHAR_EDIT_LOCK_PRESET_NEEDLE, 'char edit lock preset'],
    [VENDOR_CHAR_CREATE_LOCK_PRESET_NEEDLE, 'char create lock preset'],
    [VENDOR_CHAR_CREATE_WEAR_ATTIRE_NEEDLE, 'char create wear attire'],
    [VENDOR_CHAR_CREATE_WEAR_ACC_NEEDLE, 'char create wear accessories'],
    [VENDOR_TAB_NOWRAP_NEEDLE, 'settings tab nowrap'],
    [VENDOR_TABS_SCROLL_NEEDLE, 'settings tabs scroll'],
    [VENDOR_MOBILE_CHROME_NEEDLE, 'mobile settings chrome'],
    [VENDOR_INLINE_HELP_NEEDLE, 'inline chat help'],
    [VENDOR_INLINE_TOGGLE_NEEDLE, 'inline chat toggle'],
    [VENDOR_INLINE_SAVE_NEEDLE, 'inline chat save'],
    [VENDOR_PROGRESS_TOAST_FN_NEEDLE, 'progress toast sync fn'],
    [VENDOR_PROGRESS_TOAST_PAINT_NEEDLE, 'progress toast paintStatus'],
    [VENDOR_REROLL_TOAST_HEARTBEAT_NEEDLE, 'reroll toast heartbeat'],
    [VENDOR_DE_STRIP_NEEDLE, 'De strip inline markers'],
    [VENDOR_INLINE_INJECT_FN_NEEDLE, 'inline inject fn'],
    [VENDOR_INLINE_CALL_NEEDLE, 'inline inject call'],
    [VENDOR_INLINE_SAME_NEEDLE, 'inline inject same-select'],
    [VENDOR_SELECT_SAME_NEEDLE, 'select same-session early-return'],
    [VENDOR_SCOPE_POLL_NEEDLE, 'scope poll cadence'],
    [VENDOR_SESSION_PENDING_NEEDLE, 'session pending commit'],
    [VENDOR_ACTIONS_HELP_NEEDLE, 'actions minimize help'],
    [VENDOR_ACTIONS_SELECT_NEEDLE, 'actions minimize select'],
    [VENDOR_ACTIONS_SAVE_NEEDLE, 'actions minimize save'],
    [VENDOR_ACTIONS_MODE_FN_NEEDLE, 'actions minimize mode fn'],
    [VENDOR_ACTIONS_CLAMP_NEEDLE, 'actions minimize clamp'],
    [VENDOR_ACTIONS_FT_NEEDLE, 'actions minimize Ft'],
    [VENDOR_ACTIONS_OVERFLOW_NEEDLE, 'actions minimize overflow'],
    [VENDOR_ACTIONS_CHROME_NEEDLE, 'actions minimize chrome'],
    [VENDOR_ACTIONS_SAVE_ICON_GEO_NEEDLE, 'actions minimize save icon geo'],
    [VENDOR_ACTIONS_TOGGLE_SAVE_NEEDLE, 'actions minimize toggle save'],
    [VENDOR_ACTIONS_PRESET_LIVE_NEEDLE, 'actions minimize preset live'],
    [VENDOR_ACTIONS_POINTER_NEEDLE, 'actions minimize pointer'],
    [VENDOR_ACTIONS_DRAG_CLEAR_NEEDLE, 'actions minimize drag clear'],
    [VENDOR_ACTIONS_END_CLEAR_NEEDLE, 'actions minimize end clear'],
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
  return raw
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
    .replace(VENDOR_ASSET_NAI_HTML_NEEDLE, VENDOR_ASSET_NAI_HTML_PATCH)
    .replace(VENDOR_ASSET_NAI_SAVE_NEEDLE, VENDOR_ASSET_NAI_SAVE_PATCH)
    .replace(VENDOR_ASSET_NAI_HELP_NEEDLE, VENDOR_ASSET_NAI_HELP_PATCH)
    .replace(VENDOR_CURATION_TABS_NEEDLE, VENDOR_CURATION_TABS_PATCH)
    .replace(VENDOR_CURATION_PANEL_NEEDLE, VENDOR_CURATION_PANEL_PATCH)
    .replace(VENDOR_CURATION_EVENTS_NEEDLE, VENDOR_CURATION_EVENTS_PATCH)
    .replace(VENDOR_CURATION_TAB_LOAD_NEEDLE, VENDOR_CURATION_TAB_LOAD_PATCH)
    .replace(VENDOR_GLOBAL_TOGGLE_SUMMARY_NEEDLE, VENDOR_GLOBAL_TOGGLE_SUMMARY_PATCH)
    .replace(VENDOR_GLOBAL_TOGGLE_BODY_NEEDLE, VENDOR_GLOBAL_TOGGLE_BODY_PATCH)
    .replace(VENDOR_EXPLORER_THUMB_PAINT_NEEDLE, VENDOR_EXPLORER_THUMB_PAINT_PATCH)
    .replace(VENDOR_EXPLORER_THUMB_WARM_NEEDLE, VENDOR_EXPLORER_THUMB_WARM_PATCH)
    .replace(VENDOR_EXPLORER_WARM_PROGRESS_NEEDLE, VENDOR_EXPLORER_WARM_PROGRESS_PATCH)
    .replace(VENDOR_PRESET_QT_NEEDLE, VENDOR_PRESET_QT_PATCH)
    .replace(VENDOR_PRESET_UN_NEEDLE, VENDOR_PRESET_UN_PATCH)
    .replace(VENDOR_PRESET_HTML_NEEDLE, VENDOR_PRESET_HTML_PATCH)
    .replace(VENDOR_PRESET_HEAD_SAVE_NEEDLE, VENDOR_PRESET_HEAD_SAVE_PATCH)
    .replace(VENDOR_PRESET_SAVE_EVT_NEEDLE, VENDOR_PRESET_SAVE_EVT_PATCH)
    .replace(VENDOR_PRESET_READ_NEEDLE, VENDOR_PRESET_READ_PATCH)
    .replace(VENDOR_PRESET_FA_NEEDLE, VENDOR_PRESET_FA_PATCH)
    .replace(VENDOR_PRESET_SYNC_NEEDLE, VENDOR_PRESET_SYNC_PATCH)
    .replace(VENDOR_PRESET_EXPORT_NEEDLE, VENDOR_PRESET_EXPORT_PATCH)
    .replace(VENDOR_PRESET_NEW_NEEDLE, VENDOR_PRESET_NEW_PATCH)
    .replace(VENDOR_PRESET_DUP_NEEDLE, VENDOR_PRESET_DUP_PATCH)
    .replace(VENDOR_PRESET_DEL_NEEDLE, VENDOR_PRESET_DEL_PATCH)
    .replace(VENDOR_PRESET_VIBE_EVT_NEEDLE, VENDOR_PRESET_VIBE_EVT_PATCH)
    .replace(VENDOR_STICKY_TAKE_NEEDLE, VENDOR_STICKY_TAKE_PATCH)
    .replace(VENDOR_STICKY_LA_NEEDLE, VENDOR_STICKY_LA_PATCH)
    .replace(VENDOR_STICKY_KEEP_NEEDLE, VENDOR_STICKY_KEEP_PATCH)
    .replace(VENDOR_STICKY_SHOW_NEEDLE, VENDOR_STICKY_SHOW_PATCH)
    .replace(VENDOR_STICKY_SKIP_NEEDLE, VENDOR_STICKY_SKIP_PATCH)
    .replace(VENDOR_STICKY_ASSIGN_NEEDLE, VENDOR_STICKY_ASSIGN_PATCH)
    .replace(VENDOR_STICKY_CLICK_NEEDLE, VENDOR_STICKY_CLICK_PATCH)
    .replace(VENDOR_STICKY_PRESS_NEEDLE, VENDOR_STICKY_PRESS_PATCH)
    .replace(VENDOR_INLINE_LONGPRESS_NEEDLE, VENDOR_INLINE_LONGPRESS_PATCH)
    .replace(VENDOR_STICKY_REVIVE_NEEDLE, VENDOR_STICKY_REVIVE_PATCH)
    .replace(VENDOR_STICKY_INIT_NEEDLE, VENDOR_STICKY_INIT_PATCH)
    .replace(VENDOR_STICKY_RESET_NEEDLE, VENDOR_STICKY_RESET_PATCH)
    .replace(VENDOR_STICKY_CLOSE_CHAR_NEEDLE, VENDOR_STICKY_CLOSE_CHAR_PATCH)
    .replace(VENDOR_STICKY_OPEN_CHAR_NEEDLE, VENDOR_STICKY_OPEN_CHAR_PATCH)
    .replace(VENDOR_STICKY_CLOSE_CARD_NEEDLE, VENDOR_STICKY_CLOSE_CARD_PATCH)
    .replace(VENDOR_STICKY_OPEN_CARD_NEEDLE, VENDOR_STICKY_OPEN_CARD_PATCH)
    .replace(VENDOR_CARD_TAG_ROSTER_REFRESH_NEEDLE, VENDOR_CARD_TAG_ROSTER_REFRESH_PATCH)
    .replace(VENDOR_CARD_TAG_STRIP_PERSON_NEEDLE, VENDOR_CARD_TAG_STRIP_PERSON_PATCH)
    .replace(VENDOR_CARD_TAG_APPLY_WEIGHT_NEEDLE, VENDOR_CARD_TAG_APPLY_WEIGHT_PATCH)
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
    .replace(VENDOR_CHAR_EDIT_WEAR_ATTIRE_NEEDLE, VENDOR_CHAR_EDIT_WEAR_ATTIRE_PATCH)
    .replace(VENDOR_CHAR_EDIT_WEAR_ACC_NEEDLE, VENDOR_CHAR_EDIT_WEAR_ACC_PATCH)
    .replace(VENDOR_CHAR_EDIT_APPEARANCE_LABEL_NEEDLE, VENDOR_CHAR_EDIT_APPEARANCE_LABEL_PATCH)
    .replace(VENDOR_CHAR_EDIT_LOCK_PRESET_NEEDLE, VENDOR_CHAR_EDIT_LOCK_PRESET_PATCH)
    .replace(VENDOR_CHAR_CREATE_LOCK_PRESET_NEEDLE, VENDOR_CHAR_CREATE_LOCK_PRESET_PATCH)
    .replace(VENDOR_CHAR_CREATE_WEAR_ATTIRE_NEEDLE, VENDOR_CHAR_CREATE_WEAR_ATTIRE_PATCH)
    .replace(VENDOR_CHAR_CREATE_WEAR_ACC_NEEDLE, VENDOR_CHAR_CREATE_WEAR_ACC_PATCH)
    .replace(VENDOR_TAB_NOWRAP_NEEDLE, VENDOR_TAB_NOWRAP_PATCH)
    .replace(VENDOR_TABS_SCROLL_NEEDLE, VENDOR_TABS_SCROLL_PATCH)
    .replace(VENDOR_MOBILE_CHROME_NEEDLE, VENDOR_MOBILE_CHROME_PATCH)
    .replace(VENDOR_INLINE_HELP_NEEDLE, VENDOR_INLINE_HELP_PATCH)
    .replace(VENDOR_INLINE_TOGGLE_NEEDLE, VENDOR_INLINE_TOGGLE_PATCH)
    .replace(VENDOR_INLINE_SAVE_NEEDLE, VENDOR_INLINE_SAVE_PATCH)
    .replace(VENDOR_PROGRESS_TOAST_FN_NEEDLE, VENDOR_PROGRESS_TOAST_FN_PATCH)
    .replace(VENDOR_PROGRESS_TOAST_PAINT_NEEDLE, VENDOR_PROGRESS_TOAST_PAINT_PATCH)
    .replace(VENDOR_REROLL_TOAST_HEARTBEAT_NEEDLE, VENDOR_REROLL_TOAST_HEARTBEAT_PATCH)
    .replace(VENDOR_DE_STRIP_NEEDLE, VENDOR_DE_STRIP_PATCH)
    .replace(VENDOR_INLINE_INJECT_FN_NEEDLE, VENDOR_INLINE_INJECT_FN_PATCH)
    .replace(VENDOR_INLINE_CALL_NEEDLE, VENDOR_INLINE_CALL_PATCH)
    .replace(VENDOR_INLINE_SAME_NEEDLE, VENDOR_INLINE_SAME_PATCH)
    .replace(VENDOR_SELECT_SAME_NEEDLE, VENDOR_SELECT_SAME_PATCH)
    .replace(VENDOR_SCOPE_POLL_NEEDLE, VENDOR_SCOPE_POLL_PATCH)
    .replace(VENDOR_SESSION_PENDING_NEEDLE, VENDOR_SESSION_PENDING_PATCH)
    .replace(VENDOR_ACTIONS_HELP_NEEDLE, VENDOR_ACTIONS_HELP_PATCH)
    .replace(VENDOR_ACTIONS_SELECT_NEEDLE, VENDOR_ACTIONS_SELECT_PATCH)
    .replace(VENDOR_ACTIONS_SAVE_NEEDLE, VENDOR_ACTIONS_SAVE_PATCH)
    .replace(VENDOR_ACTIONS_MODE_FN_NEEDLE, VENDOR_ACTIONS_MODE_FN_PATCH)
    .replace(VENDOR_ACTIONS_CLAMP_NEEDLE, VENDOR_ACTIONS_CLAMP_PATCH)
    .replace(VENDOR_ACTIONS_FT_NEEDLE, VENDOR_ACTIONS_FT_PATCH)
    .replace(VENDOR_ACTIONS_OVERFLOW_NEEDLE, VENDOR_ACTIONS_OVERFLOW_PATCH)
    .replace(VENDOR_ACTIONS_CHROME_NEEDLE, VENDOR_ACTIONS_CHROME_PATCH)
    .replace(VENDOR_ACTIONS_SAVE_ICON_GEO_NEEDLE, VENDOR_ACTIONS_SAVE_ICON_GEO_PATCH)
    .replace(VENDOR_ACTIONS_TOGGLE_SAVE_NEEDLE, VENDOR_ACTIONS_TOGGLE_SAVE_PATCH)
    .replace(VENDOR_ACTIONS_PRESET_LIVE_NEEDLE, VENDOR_ACTIONS_PRESET_LIVE_PATCH)
    .replace(VENDOR_ACTIONS_POINTER_NEEDLE, VENDOR_ACTIONS_POINTER_PATCH)
    .replace(VENDOR_ACTIONS_DRAG_CLEAR_NEEDLE, VENDOR_ACTIONS_DRAG_CLEAR_PATCH)
    .replace(VENDOR_ACTIONS_END_CLEAR_NEEDLE, VENDOR_ACTIONS_END_CLEAR_PATCH)
    .replace(VENDOR_OVERLAY_MOUNT_NEEDLE, VENDOR_OVERLAY_MOUNT_PATCH)
    .replace(VENDOR_OVERLAY_WATCH_NEEDLE, VENDOR_OVERLAY_WATCH_PATCH)
    .replace(VENDOR_OVERLAY_RETRY_NEEDLE, VENDOR_OVERLAY_RETRY_PATCH)
    .replace(VENDOR_OVERLAY_HT_HIDE_NEEDLE, VENDOR_OVERLAY_HT_HIDE_PATCH)
    .replace(VENDOR_OVERLAY_JA_HIDE_NEEDLE, VENDOR_OVERLAY_JA_HIDE_PATCH)
    .replace(VENDOR_OVERLAY_HELP_NEEDLE, VENDOR_OVERLAY_HELP_PATCH)
    .replace(VENDOR_HEAD_HELP_DEFAULT_NEEDLE, VENDOR_HEAD_HELP_DEFAULT_PATCH)
    .replace(VENDOR_EXPLORER_CARD_IMG_NEEDLE, VENDOR_EXPLORER_CARD_IMG_PATCH)
    .replace(VENDOR_VIEWER_THUMB_SHELL_NEEDLE, VENDOR_VIEWER_THUMB_SHELL_PATCH)
    .replaceAll(VENDOR_STICKY_COVER_NEEDLE, VENDOR_STICKY_COVER_PATCH)
    .replaceAll(VENDOR_STICKY_SHELL_BG_NEEDLE, VENDOR_STICKY_SHELL_BG_PATCH)
    .replace(VENDOR_STICKY_EMPTY_NEEDLE, VENDOR_STICKY_EMPTY_PATCH)
    .replaceAll(VENDOR_APPEARANCE_LABEL_SHARED_NEEDLE, VENDOR_APPEARANCE_LABEL_SHARED_PATCH);
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
