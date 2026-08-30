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
const PLUGIN_VERSION = '2.5.4';

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
        asset_author_note: {
          title: "에셋태그 작가의 노트",
          hint: "비워두면 무시됩니다. 에셋태그(외형 수집) LLM 요청 맨 끝에 최우선 지침으로 들어갑니다.",
        },
      };
      const promptCards = (t.prompts || []).map((d) => {
        const meta = promptMeta[d.key] || null;
        const title = meta?.title || d.key;
        const hint = meta?.hint ? \`<div class="muted" style="margin:4px 0 8px">\${h(meta.hint)}</div>\` : "";
        const notePh = d.key === "author_note" || d.key === "asset_author_note";
        return \`
          <div class="card">
            <strong>\${h(title)}</strong>\${d.key !== title ? \`<div class="muted" style="font-size:11px;margin-top:2px">\${h(d.key)}</div>\` : ""}
            \${hint}
            <textarea id="nx-prompt-\${h(d.key)}" placeholder="\${notePh ? "예: 항상 실내 조명, 캐릭터는 교복 유지…" : ""}">\${h(t.promptDrafts[d.key] ?? d.text ?? "")}</textarea>
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
          <div><strong>프롬프트</strong><div class="muted">작가의 노트·에셋태그 작가의 노트만 남기고 나머지를 기본값으로 돌리거나, 전체/개별 JSON으로 백업할 수 있습니다.</div></div>
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
      if (!globalThis.confirm?.("작가의 노트와 에셋태그 작가의 노트를 제외한 모든 프롬프트를 기본값으로 복원할까요?")) return;
      try {
        await K("/v1/prompts/reset-defaults", { method: "POST", body: { keep_author_note: true } });
        t.promptDrafts = {};
        t.uiMessage = { type: "success", text: "프롬프트 기본값 복원 (작가 노트·에셋태그 노트 유지)" };
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
      natural_base: document.getElementById("nx-natural-base") ? N("nx-natural-base") || "short" : e.natural_base || "short",
      v5_natural_lang: document.getElementById("nx-v5-natural-lang") ? (N("nx-v5-natural-lang") === "ja" ? "ja" : "en") : (e.v5_natural_lang === "ja" ? "ja" : "en"),
      nai_use_coords: document.getElementById("nx-nai-coords") ? ee("nx-nai-coords") : e.nai_use_coords !== !1,
      nai5_first: document.getElementById("nx-nai5-first") ? ee("nx-nai5-first") : !!e.nai5_first,
      nai5_only: document.getElementById("nx-nai5-only") ? ee("nx-nai5-only") : !!e.nai5_only,
      comic_gen: document.getElementById("nx-comic-gen") ? (N("nx-comic-gen") === "on" ? "on" : "off") : (e.comic_gen === "on" || e.comic_gen === !0 ? "on" : "off"),
      comic_llm_batch: document.getElementById("nx-comic-llm-batch") ? (N("nx-comic-llm-batch") === "per_shot" ? "per_shot" : "once") : (e.comic_llm_batch === "per_shot" ? "per_shot" : "once"),
      comic_schedule: document.getElementById("nx-comic-schedule") ? (N("nx-comic-schedule") === "wait_taggers" ? "wait_taggers" : "overlap") : (e.comic_schedule === "wait_taggers" ? "wait_taggers" : "overlap"),
      comic_max_pages: e.comic_max_pages ?? 2,
      comic_gen_ratio: document.getElementById("nx-comic-gen-ratio") ? (() => { const r = N("nx-comic-gen-ratio"); if (r === "" || r == null) return 50; const n = Number(r); return Number.isFinite(n) ? n : 50; })() : (e.comic_gen_ratio ?? 50),
      comic_coords: document.getElementById("nx-comic-coords") ? (N("nx-comic-coords") || "llm") : (e.comic_coords || "llm"),
      comic_steps: document.getElementById("nx-comic-steps") ? N("nx-comic-steps") : (e.comic_steps ?? ""),
      comic_sampler: document.getElementById("nx-comic-sampler") ? N("nx-comic-sampler") : (e.comic_sampler || ""),
      comic_cfg_scale: document.getElementById("nx-comic-cfg") ? N("nx-comic-cfg") : (e.comic_cfg_scale ?? ""),
      comic_cfg_rescale: document.getElementById("nx-comic-cfg-rescale") ? N("nx-comic-cfg-rescale") : (e.comic_cfg_rescale ?? ""),
      comic_prompt: String(e.comic_prompt || ""),
      comic_uc: String(e.comic_uc || ""),
      comic_prompt_prefix: document.getElementById("nx-comic-prompt-prefix") ? String(N("nx-comic-prompt-prefix") || "").slice(0, 8000) : String(e.comic_prompt_prefix || ""),
      comic_prompt_suffix: document.getElementById("nx-comic-prompt-suffix") ? String(N("nx-comic-prompt-suffix") || "").slice(0, 8000) : String(e.comic_prompt_suffix || ""),
      comic_author_note: document.getElementById("nx-comic-author-note") ? String(N("nx-comic-author-note") || "").slice(0, 8000) : String(e.comic_author_note || ""),`;

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
  "nx-no-humans": { title: "캐릭 없을 때 no humans", body: "샷에 캐릭터가 한 명도 없으면 NAI 프롬프트 맨 끝에 no humans를 붙입니다. 사람 태그 자동넣기 「안 넣기」와는 무관합니다." },
  "nx-curation-mode": { title: "큐레이팅 모드", body: "지금은 사용안함만 쓸 수 있습니다. 2단·임베딩식은 점검 중이라 비활성화되어 있고, 예전 저장값도 업데이트 후 사용안함으로 돌아갑니다." },
  "nx-curation-strict-ids": { title: "엄격 ID 모드", body: "2단 모드 전용. 켜면 카메라·상황·자연어·동작/표정을 자유 문장으로 쓰지 않고 카탈로그 ID로만 조립합니다. 캐릭터별 ID(characters[].option_ids)도 추가로 받아 배우 index별로 적용하며, 외형/의상은 절대 덮어쓰지 않습니다." },
  "nx-curation-catalog": { title: "큐레이션 카탈로그", body: "Inlay groups JSON 또는 NovelAI DEFAULT_PRESET_CATALOG(modifier_library)를 불러올 수 있습니다. 기본은 소형 SFW. 거대 카탈로그는 저장소·임베딩 비용이 큽니다." },
  "nx-curation-embed": { title: "임베딩 생성", body: "카탈로그 옵션을 벡터로 만들어 기기에 저장합니다. 임베딩식 모드에서 씬 태그 스냅에 사용. 미생성·실패 시 사용안함과 동일하게 생성됩니다." },
  "nx-curation-embedding-provider": { title: "임베딩 모델", body: "모델 설정 탭과 같은 UX입니다. Provider를 바꾸면 Endpoint·Model 기본값이 따라갑니다. OpenAI / Voyage / OpenRouter / LM Studio / Ollama / Custom. networkFetch로 호출합니다." },
  "nx-v5-natural-lang": { title: "V5 자연어 태그", body: "V5로 뽑는 샷에만 씁니다. 언어만 고릅니다(English / 日本語). V4 샷은 왼쪽 자연어 base를 따릅니다." },
  "nx-nai-coords": { title: "NAI 위치 좌표 사용하기", body: "캐릭터가 2명 이상이고 전원에 0~1 좌표가 있을 때만 NovelAI에 좌표를 보냅니다. 한 명이라도 빠지면 켜지 않습니다. 혼자면 쓰지 않습니다." },
  "nx-nai5-first": { title: "LLM한테 NAI V4, V5 선택권주기", body: "켜면 샷마다 simple은 V4, dynamic은 V5로 나눕니다. LLM이 복잡도를 고른 대로 모델이 갈립니다. 꺼 두면 모델 탭에서 고른 모델로 전 샷을 뽑습니다." },
  "nx-nai5-only": { title: "무조건 NAI V5한테만 요청하기", body: "켜면 모든 샷을 V5로만 뽑습니다. 모델 탭에서 V4를 고르거나 왼쪽 선택권을 켜도 V5가 이깁니다." },
  "nx-comic-gen": { title: "만화 생성", body: "켜면 태거가 연속 대사·액션을 만화 페이지로 고를 수 있습니다. 끄면 지금과 같습니다." },
  "nx-comic-batch": { title: "만화 LLM", body: "메시지 1회는 그 메시지의 만화 페이지를 한 JSON으로 받습니다. 샷마다는 페이지마다 따로 부릅니다." },
  "nx-comic-schedule": { title: "생성 순서", body: "겹쳐 생성은 삽화를 먼저 보내고 만화 LLM은 옆에서 돌립니다. 태거 전부 완료 후는 만화 태그가 끝난 뒤 번호 순으로만 보냅니다." },
  "nx-comic-ratio": { title: "만화 생성 비율", body: "이번 메시지에서 만화로 고를 수 있는 샷 비율입니다. 0이면 만화를 고르지 않습니다. 남는 만화 후보는 삽화가 됩니다." },
  "nx-comic-coords": { title: "위치", body: "LLM이 알아서: 페이지마다 position 또는 AI choice. Position: 좌표 필수, 하나라도 없으면 AI choice. AI choice: 좌표를 보내지 않습니다." },
  "nx-comic-steps": { title: "Steps", body: "비우면 모델 탭 V5 steps를 씁니다. 만화만 이 값을 씁니다." },
  "nx-comic-sampler": { title: "샘플러", body: "비우면 모델 탭 V5 샘플러를 씁니다." },
  "nx-comic-cfg": { title: "가이던스", body: "비우면 기존 CFG를 씁니다." },
  "nx-comic-rescale": { title: "리스케일", body: "비우면 기존 rescale을 씁니다." },
  "nx-comic-prompt-prefix": { title: "선행 프롬프트", body: "값이 있으면 사람 태그 다음·스타일/칸 레이아웃 앞에 붙습니다." },
  "nx-comic-prompt-suffix": { title: "후행 프롬프트", body: "값이 있으면 레이아웃 뒤·품질 태그 앞에 붙습니다." },
  "nx-comic-note": { title: "작가의 프롬프트", body: "만화 LLM에게 주는 톤·세계관입니다. 아티스트 스택을 적지 마세요." }`;

/** One 2×3 grid for the six gen-option toggles (coords / V4·V5 / V5-only / solo / costume / no humans). */
const GEN_OPTION_TOGGLES_HTML =
  `<div class="checks-grid nx-gen-toggles" style="grid-column:1/-1;margin-top:8px;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px 16px">
            <label class="toggle-row" data-nx-help-id="nx-nai-coords"><input type="checkbox" id="nx-nai-coords" \${i.nai_use_coords !== !1 ? "checked" : ""}><span>NAI 위치 좌표 사용하기</span></label>
            <label class="toggle-row" data-nx-help-id="nx-nai5-first"><input type="checkbox" id="nx-nai5-first" \${i.nai5_first ? "checked" : ""}><span>LLM한테 NAI V4, V5 선택권주기</span></label>
            <label class="toggle-row" data-nx-help-id="nx-nai5-only"><input type="checkbox" id="nx-nai5-only" \${i.nai5_only ? "checked" : ""}><span>무조건 NAI V5한테만 요청하기</span></label>
            <label class="toggle-row" data-nx-help-id="nx-person-tag-solo"><input type="checkbox" id="nx-person-tag-solo" \${i.person_tag_solo ? "checked" : ""}><span>캐릭 1명일 때 solo 태그</span></label>
            <label class="toggle-row" data-nx-help-id="nx-costume"><input type="checkbox" id="nx-costume" \${i.costume === !0 || i.costume === "true" || i.costume === 1 || i.costume === "1" || i.costume === "on" ? "checked" : ""}><span>코스튬 (샷에서 복장 고르기)</span></label>
            <label class="toggle-row" data-nx-help-id="nx-no-humans"><input type="checkbox" id="nx-no-humans" \${i.no_humans_when_no_char ? "checked" : ""}><span>캐릭 없을 때 no humans</span></label>
            </div>`;

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
            <label data-nx-help-id="nx-v5-natural-lang"><span>V5 자연어 태그</span><select id="nx-v5-natural-lang">
              <option value="en" \${i.v5_natural_lang === "ja" ? "" : "selected"}>English</option>
              <option value="ja" \${i.v5_natural_lang === "ja" ? "selected" : ""}>日本語</option>
            </select></label>
            ${GEN_OPTION_TOGGLES_HTML}
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
const VENDOR_PERSON_TAG_SOLO_HTML_PATCH = ``;

const VENDOR_PERSON_TAG_SOLO_CT_NEEDLE =
  `      preprocessing: document.getElementById("nx-preprocess") ? ee("nx-preprocess") : !!e.preprocessing,
`;
const VENDOR_PERSON_TAG_SOLO_CT_PATCH =
  `      preprocessing: !!e.preprocessing,
      person_tag_solo: document.getElementById("nx-person-tag-solo") ? ee("nx-person-tag-solo") : !!e.person_tag_solo,
      no_humans_when_no_char: document.getElementById("nx-no-humans") ? ee("nx-no-humans") : !!e.no_humans_when_no_char,
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
          </div>
          <div class="model-form" style="margin-top:14px">
`;

const VENDOR_ASSET_NAI_HTML_PATCH =
  `<label class="toggle-row" data-nx-help-id="nx-appearance"><input type="checkbox" id="nx-appearance" \${i.char_appearance !== !1 ? "checked" : ""}><span>CharAppearance 누적</span></label>
            <label class="toggle-row" data-nx-help-id="nx-auto-aspect"><input type="checkbox" id="nx-auto-aspect" \${i.auto_aspect ? "checked" : ""}><span>자동 비율 조절</span></label>
            <label class="toggle-row" data-nx-help-id="nx-llm-json-retry"><input type="checkbox" id="nx-llm-json-retry" \${i.llm_json_retry ? "checked" : ""}><span>JSON 오류 시 재시도</span></label>
          </div>
          <label class="toggle-row" data-nx-help-id="nx-stream-keywords" style="margin-top:12px;grid-column:1/-1"><input type="checkbox" id="nx-stream-keywords-on" \${i.stream_keywords_enabled ? "checked" : ""}><span>스트리밍 키워드</span></label>
          <label data-nx-help-id="nx-stream-keywords" style="display:block;margin-top:6px;grid-column:1/-1">
            <span style="display:block;margin-bottom:6px">쉼표, 3글자+, 비면 꺼짐</span>
            <textarea id="nx-stream-keywords" rows="2" style="width:100%;min-height:52px" placeholder="future plan, RP-Guide">\${h(i.stream_keywords || "")}</textarea>
          </label>
          <div class="model-form" style="margin-top:14px">
`;

const VENDOR_ASSET_NAI_SAVE_NEEDLE =
  `      char_appearance: ee("nx-appearance"),
`;

const VENDOR_ASSET_NAI_SAVE_PATCH =
  `      char_appearance: ee("nx-appearance"),
      auto_aspect: ee("nx-auto-aspect"),
      llm_json_retry: ee("nx-llm-json-retry"),
      stream_keywords_enabled: ee("nx-stream-keywords-on"),
      stream_keywords: w(N("nx-stream-keywords") || "", 4000),
`;

/** Card options: asset NAI select after solo+costume checks-grid. */
const VENDOR_ASSET_NAI_CARD_NEEDLE = GEN_OPTION_TOGGLES_HTML;

const VENDOR_ASSET_NAI_CARD_PATCH =
  `${GEN_OPTION_TOGGLES_HTML}
            <label class="wide" data-nx-help-id="nx-asset-nai-tags"><span>에셋 NAI 태그</span><select id="nx-asset-nai-tags">
              <option value="off" \${i.asset_nai_tags === !1 || i.asset_nai_tags === "off" || !i.asset_nai_tags ? "selected" : ""}>사용안함</option>
              <option value="inline" \${i.asset_nai_tags === "inline" ? "selected" : ""}>그냥 옛날버전 (통째로 보내기)</option>
              <option value="prepass" \${i.asset_nai_tags === "prepass" || i.asset_nai_tags === !0 || i.asset_nai_tags === "prepass_vision" ? "selected" : ""}>LLM 따로 호출</option>
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
    "nx-asset-nai-tags": { title: "에셋 NAI 태그", body: "로어 트리거와 이름이 맞는 Risu 에셋 PNG/WebP의 NovelAI 메타 태그를 어떻게 태거에 넣을지 고릅니다. artist·year·품질·*background·straight-on은 제외.\\n\\n• 사용안함 — 에셋 태그를 쓰지 않습니다.\\n• 그냥 옛날버전 (통째로 보내기) — 로어북·에셋 태그를 메인 태거 한 번에 넣습니다. LLM 1회. 컨텍스트가 길어져 토큰을 많이 씁니다.\\n• LLM 따로 호출 — 메타가 있으면 그 태그로 룩을 먼저 채웁니다. 메타가 없으면 이미지를 오토태그 LLM에 보내고, 로어북은 참고로만 줍니다. 그다음 메인 태거." },
    "nx-costume": { title: "코스튬", body: "켜면 메인 태거가 캐릭터별 코스튬 목록을 보고 샷마다 복장을 고릅니다(이름·번호). 꺼도 에셋으로 캐릭을 만들 때는 복장이 코스튬으로 나뉘어 저장됩니다. 샷에 고른 값이 없으면 이전 샷 옷, 없으면 로스터 현재 코스튬을 씁니다." },
    "nx-auto-aspect": { title: "자동 비율 조절", body: "켜면 샷마다 태거가 portrait/square/landscape를 고르고, 생성 크기를 832×1216 / 1024×1024 / 1216×832로 맞춥니다(NovelAI 기본 사이즈). ComfyUI는 워크플로 Empty Latent 등에 [[width]]/[[height]]를 넣어야 반영됩니다. 참조 그림은 LoadImage에 [[ref]]. 끄면 NAI Width/Height 설정을 씁니다." },
    "nx-llm-json-retry": { title: "JSON 오류 시 재시도", body: "메인 태거 응답이 JSON으로 파싱되지 않으면, 오류 내용을 붙여 LLM에 한 번 더 요청합니다. 재시도도 실패하면 작업이 오류로 끝납니다." },
    "nx-stream-keywords": { title: "스트리밍 키워드", body: "토글과 Power가 켜져 있고, 칸에 3글자 이상 단어가 있을 때 AI 답이 나오는 동안 그 단어가 들어가면(대소문자 무시, 부분 일치) 최신 말풍선으로 한 번 생성합니다. 쉼표로 여러 개. 비우거나 토글 OFF면 꺼짐. 「응답 후 자동 생성」·발동과 별개입니다. 이미 생성 중이면 안 돕니다." },
    "nx-fixed-prompt-prefix": { title: "선행 고정 프롬프트", body: "값이 있으면 사람 태그 다음·스타일 프리셋/장면 앞에 항상 붙습니다. 프리셋이 바뀌어도 유지됩니다." },
    "nx-fixed-prompt-suffix": { title: "후행 고정 프롬프트", body: "값이 있으면 장면·큐레이션 뒤·NAI 품질 태그 앞에 항상 붙습니다. JSON으로 내보내/가져오기 할 수 있습니다." },
`;

/** Card options: focus_character select after asset NAI tags. */
const VENDOR_FOCUS_CHAR_CARD_NEEDLE =
  `<label class="wide" data-nx-help-id="nx-asset-nai-tags"><span>에셋 NAI 태그</span><select id="nx-asset-nai-tags">
              <option value="off" \${i.asset_nai_tags === !1 || i.asset_nai_tags === "off" || !i.asset_nai_tags ? "selected" : ""}>사용안함</option>
              <option value="inline" \${i.asset_nai_tags === "inline" ? "selected" : ""}>그냥 옛날버전 (통째로 보내기)</option>
              <option value="prepass" \${i.asset_nai_tags === "prepass" || i.asset_nai_tags === !0 || i.asset_nai_tags === "prepass_vision" ? "selected" : ""}>LLM 따로 호출</option>
            </select></label>
            <div class="model-form-pair" style="margin-top:4px">`;

const VENDOR_FOCUS_CHAR_CARD_PATCH =
  `<label class="wide" data-nx-help-id="nx-asset-nai-tags"><span>에셋 NAI 태그</span><select id="nx-asset-nai-tags">
              <option value="off" \${i.asset_nai_tags === !1 || i.asset_nai_tags === "off" || !i.asset_nai_tags ? "selected" : ""}>사용안함</option>
              <option value="inline" \${i.asset_nai_tags === "inline" ? "selected" : ""}>그냥 옛날버전 (통째로 보내기)</option>
              <option value="prepass" \${i.asset_nai_tags === "prepass" || i.asset_nai_tags === !0 || i.asset_nai_tags === "prepass_vision" ? "selected" : ""}>LLM 따로 호출</option>
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
  `"nx-asset-nai-tags": { title: "에셋 NAI 태그", body: "로어 트리거와 이름이 맞는 Risu 에셋 PNG/WebP의 NovelAI 메타 태그를 어떻게 태거에 넣을지 고릅니다. artist·year·품질·*background·straight-on은 제외.\\n\\n• 사용안함 — 에셋 태그를 쓰지 않습니다.\\n• 그냥 옛날버전 (통째로 보내기) — 로어북·에셋 태그를 메인 태거 한 번에 넣습니다. LLM 1회. 컨텍스트가 길어져 토큰을 많이 씁니다.\\n• LLM 따로 호출 — 메타가 있으면 그 태그로 룩을 먼저 채웁니다. 메타가 없으면 이미지를 오토태그 LLM에 보내고, 로어북은 참고로만 줍니다. 그다음 메인 태거." },
`;

const VENDOR_FOCUS_CHAR_HELP_PATCH =
  `"nx-asset-nai-tags": { title: "에셋 NAI 태그", body: "로어 트리거와 이름이 맞는 Risu 에셋 PNG/WebP의 NovelAI 메타 태그를 어떻게 태거에 넣을지 고릅니다. artist·year·품질·*background·straight-on은 제외.\\n\\n• 사용안함 — 에셋 태그를 쓰지 않습니다.\\n• 그냥 옛날버전 (통째로 보내기) — 로어북·에셋 태그를 메인 태거 한 번에 넣습니다. LLM 1회. 컨텍스트가 길어져 토큰을 많이 씁니다.\\n• LLM 따로 호출 — 메타가 있으면 그 태그로 룩을 먼저 채웁니다. 메타가 없으면 이미지를 오토태그 LLM에 보내고, 로어북은 참고로만 줍니다. 그다음 메인 태거." },
    "nx-focus-character": { title: "중점 캐릭터", body: "켜면 태거가 샷 JSON에 focus(1·char1 또는 [1,2]처럼 여러 명)를 넣을 수 있습니다. 중점이 아닌 캐릭터 캡션에 out of frame을 붙입니다. 여성/남성위주는 선택 힌트(수동 모드에서는 성별 필터)입니다." },
    "nx-focus-weight": { title: "중점강도", body: "중점 외 캐릭터에 붙는 out of frame 강조입니다. 0–5, 소수점 1자리(예: 2.5). 1 초과는 N::out of frame::, 0–1은 강조 없이 out of frame만 넣습니다. 기본 2." },
    "nx-focus-prompt": { title: "프롬프트 강도", body: "중점 focus를 태거에 어떻게 시킬지입니다.\\n\\n• 기본값 — 필요할 때만(애매하면 비움)\\n• 좀더 강하게 넣기 — 쓸 수 있으면 자주 넣도록\\n• 무조건 넣기 — 매 샷 focus 필수\\n• 수동으로 넣기 — LLM에 묻지 않고, 여성/남성위주일 때 반대 성별 캐릭에 out of frame을 코드로 붙입니다(알아서 고르기와는 함께 쓰이지 않음)." },
`;

/** Models → ComfyUI: document [[width]]/[[height]] (auto_aspect / NAI W·H). */
const VENDOR_COMFY_MUTED_NEEDLE =
  `"로컬 ComfyUI API · [[pos]] / [[neg]] / [[char1]]… / [[seed]]"`;

const VENDOR_COMFY_MUTED_PATCH =
  `"로컬 ComfyUI API · [[pos]] / [[neg]] / [[char1]]… / [[width]] / [[height]] / [[seed]] / [[ref]]"`;

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
              <strong>참조 이미지</strong> — LoadImage 노드의 image 칸에 <code>"[[ref]]"</code>를 넣으면, Models에 올린 참조 그림을 Comfy에 업로드한 뒤 파일 이름이 들어갑니다. 참조가 없으면 빈 칸. 노드 자체를 빼려면 <code>[[#ref]]</code>…<code>[[/ref]]</code>.<br><br>
              <strong>강조</strong> — Inlay가 만든 <code>2::hard::</code> / <code>{{happy}}</code>는 Comfy로 보낼 때 <code>(hard:2)</code> / <code>((happy))</code>로 바꿉니다.<br><br>
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
      comic_gen: "만화 생성",
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
      "comic_gen",
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
            <button type="button" data-nx-curation-mode="off" class="active">사용안함</button>
            <button type="button" data-nx-curation-mode="two_stage" disabled title="점검 중" style="opacity:.45;cursor:not-allowed">2단</button>
            <button type="button" data-nx-curation-mode="embed_snap" disabled title="점검 중" style="opacity:.45;cursor:not-allowed">임베딩식</button>
          </div>
          <div class="muted" style="margin-top:8px">2단·임베딩식은 점검 중이라 지금은 고를 수 없습니다. 예전 설정은 업데이트 후 사용안함으로 돌아갑니다.</div>
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
          <div class="muted" style="margin-top:8px">최신 버전이 위에 옵니다. 2.3은 구간으로 묶었습니다.</div>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.5.4</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>기본 태거가 샷마다 세로·정사각·가로를 정합니다. 값이 없으면 세로입니다</li>
            <li>코믹 태거는 그 비율을 그대로 씁니다. 코믹이 다른 값을 내도 기본 태거가 이깁니다</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.5.3</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>채팅 안 이미지: 잘리던 예약 프레임을 없앴습니다. 비율에 맞는 가벼운 SVG를 먼저 두고, 그림이 오면 그 src만 바꿉니다</li>
            <li>스피너가 탐색할 말풍선 숫자를 대시보드에서 3–20으로 정할 수 있습니다</li>
            <li>유저 말풍선에 근처 캐릭터 그림이 붙던 문제를 고쳤습니다</li>
            <li>같은 말풍선을 다시 눌러도 그림이 깜빡이지 않습니다</li>
            <li>샷 태그 창을 닫을 때 회색 화면이 남던 문제를 고쳤습니다</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.5.2</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>채팅 안 이미지가 훨씬 빨리 붙습니다. 말풍선 하나를 그릴 때 하던 조회를 크게 줄였습니다</li>
            <li>글이 그대로인 말풍선은 자리 계산을 다시 하지 않고 기억해 둔 것을 씁니다. 스크롤하거나 답장이 끝난 뒤 다시 그릴 때가 특히 빨라집니다</li>
            <li>보고 있는 말풍선의 이미지가 탐색기·뷰어 썸네일보다 먼저 만들어집니다. 2.5.1에서 이 우선순위가 듣지 않았습니다</li>
            <li>스크롤을 멈춘 자리에서 위아래 말풍선 이미지가 안 채워지던 문제를 고쳤습니다</li>
            <li>이미지 탐색 썸네일이 비어 있는 시간이 줄어듭니다</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.5.1</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>채팅 안 이미지: 자리를 한 번에 다 잡고, 그림은 준비되는 것부터 그 칸에만 들어옵니다. 챗을 바꾼 뒤 여러 번 눌러야 나오던 문제가 사라집니다</li>
            <li>새 메시지가 와도 옆 말풍선이 다시 그려지지 않습니다. 깜빡임이 줄어듭니다</li>
            <li>첫 로딩에서 말풍선 이미지가 뷰어 띠·마커보다 먼저 붙습니다</li>
            <li>챗을 바꿀 때 갤러리를 두 번 받던 것을 한 번으로 줄였습니다</li>
            <li>말풍선 한 개를 그릴 때 하던 중복 DOM 조회를 걷어냈습니다</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.5.0</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>대시보드에 2.4 데이터 이전 버튼. 옛 이미지를 Risu 모듈로 옮기고 원본을 지웁니다 (되돌리기 불가)</li>
            <li>이전을 끝내면 켤 때마다 하던 전체 점검이 사라집니다. 갤러리가 클수록 부팅이 빨라집니다</li>
            <li>새로 만든 갤러리 샷도 Risu 모듈에 저장합니다. Risu 세이브파일이 가벼워집니다</li>
            <li>채팅 안 이미지: 자리를 먼저 스피너로 잡고 준비된 것부터 차례대로 붙습니다</li>
            <li>이미지를 못 받은 스피너는 다시 시도합니다</li>
            <li>크게보기: 이미지를 세 번 톡톡톡, 길게 누르기는 라벨과 함께</li>
            <li>리롤은 이미지 파일에 적힌 태그를 그대로 다시 씁니다. 카드에 메인·네거티브를 베끼지 않습니다</li>
            <li>강제 재태그가 채팅 전체를 한 번에 정리하고 남은 조각을 치웁니다</li>
            <li>작업 기록은 최신 3개, 카드 본문 사본은 최신 20장만 보관합니다</li>
            <li>만화 생성: 페이지 수 대신 비율(%), 작가의 프롬프트·선행·후행</li>
            <li>만화 생성 탭: V5 칸 페이지, 별도 steps/샘플러/가이던스</li>
            <li>만화 작가의 프롬프트가 NAI 메인 프롬프트에 섞이지 않습니다</li>
            <li>통합 챗: 외형이 비어 있는 카드는 우선순위가 높아도 후순위입니다</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.4.20</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>대사 삽입: 말한 캐릭터의 캡션 끝에 붙습니다</li>
            <li>여러 명이 말하면 각자 자기 대사만 가집니다</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.4.19</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>캐릭터 전환 후 클릭 없이 이미지와 메시지 버튼이 붙습니다</li>
            <li>전환 감지: 화면을 건드리는 순간 즉시, 선택 지연도 단축</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.4.18</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>선택권 리롤: 처음 샷의 complexity를 따라 V4/V5를 유지</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.4.17</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>NAI5 대사삽입: 메인 맨 끝에 korean text: 형식으로 붙임</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.4.16</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>리롤·재생성이 프롬프트를 만든 모델로 보냅니다 (V5 프롬프트가 V4.5로 가던 문제)</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.4.15</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>메시지 재생성: 한 장 끝날 때마다 채팅 안 이미지도 바로 교체</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.4.14</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>lb-xnai.lb.extra 섹션: # 개수·공백 없이 줄 앞 제목이면 인식</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.4.13</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>가져오기/페소 팝업을 화면 중앙에 고정</li>
            <li>동시 요청 옆 lb-xnai.lb.extra 토글: 로어 본문 채우기에만 작가의 노트처럼 넣음</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.4.12</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>참고이미지 모듈이 채팅 카드의 이름·아이콘을 숨기던 문제 수정</li>
            <li>이미 숨겨진 상태도 채팅 카드 복구를 누르면 되돌아옵니다</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.4.11</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>채팅 카드 복구: 카드를 한 박자 쉬고 다시 붙여 헤더가 실제로 다시 그려짐</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.4.10</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>메시지 안 생성 버튼: 사용안함 / 편의성(오류율 있음 · 2.4.7) / 호환성(2.4.9)</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.4.9</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>채팅 카드 복구: 이름·대표이미지 HTML을 다시 그림. 이미지 파일은 건드리지 않음</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.4.8</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>메시지 안 칩·샷은 본문 문단에만 붙임. 같은 카드의 이름·대표이미지는 건드리지 않음</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.4.7</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>생성 UC 프리셋을 쓰지 않음. 남은 human_focus 태그가 더 이상 붙지 않음</li>
            <li>캐릭터 이름·우선이 적은 값 그대로 저장됨</li>
            <li>모델 탭: LLM이 비어 있어도 NAI4/5 키는 저장</li>
            <li>NAI4/5 샘플러·스텝이 저장됨</li>
            <li>메시지 상단 칩을 본문 부모에 붙여 커스텀 카드가 커지지 않음</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.4.6</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>할당량: Anlas 아래 V5 막대, 같은 키는 V5/V4 한 장</li>
            <li>머리·눈 칸의 색만 있으면 blue hair / white eyes로 채우고, 외형에 있으면 샷 태그에 중복하지 않음</li>
            <li>이미지 프리셋 파일 열기에서도 네거티브를 채움</li>
            <li>생성 옵션에 V5 전용 토글, 여섯 토글을 한 그리드로 정리</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.4.5</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>메시지 캐릭터 칩이 태거와 같은 로스터·별칭 매칭으로 예상 목록을 띄움</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.4.4</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>새 옷: 캐릭터와 코스튬을 짝으로 받으면 옷장에 넣고 그 샷에 바로 입힘</li>
            <li>참고이미지: 로어북 가져오기·LLM 에셋 룩·hydrate에서 빈 슬롯만 모듈에 시드</li>
            <li>메시지 안 칩은 말풍선마다 상단·하단 하나씩만 유지</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.4.3</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>캐릭터 참고이미지 기본값이 안함. 끄면 참고이미지를 보내지 않음</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.4.2</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>캐릭터 참고이미지를 모듈에 저장하고, V4.5에서 vibe/image일 때만 첨부(안함=미전송)</li>
            <li>메시지 칩으로 그 말풍선에 나온 캐릭터만 골라 편집</li>
            <li>편집 헤더는 슬롯 번호가 있을 때만 charN 표시</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.4.1</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>응답 후 자동 생성·스트리밍 키워드는 발동이 수동이어도 동작</li>
            <li>캐릭터 참고이미지가 그 캐릭터 채팅 스코프에 맞게 보이고 저장됨</li>
            <li>메시지 안 칩: 태그·재생성·중단·캐릭터 이름 (char1 아님)</li>
            <li>디버그 할당량 탭, 메시지 안 재생성·char 칩</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.4.0</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>캐릭터 룩 칸 통일(머리색·스타일·눈·키·나이·현재 코스튬). 코스튬은 이전 샷을 이어감</li>
            <li>에셋에 NAI 메타가 없으면 오토태그+로어북 참고</li>
            <li>모델 탭 NAI5/NAI4, 키 여러 개, LLM V4/V5 선택권(생성 옵션)·할당량 폴백·대사삽입</li>
            <li>프리셋 1·2순위, steps/스케줄, 키 동시 생성, V5 자연어, 위치 좌표</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.3.90 ~ 2.3.101</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>말풍선 삽화: 있는 그림 유지·스피너→착착·태그 재생 겹침 수정. 말풍선이 다시 그려져도 캐시로 붙임</li>
            <li>재생성·태그 플로팅은 접으면 흐려짐. ComfyUI 강조·[[ref]] 업로드</li>
            <li>명령 수정은 넣을/뺄 태그만. V5 모델명, 갤러리 2000장, 응답 후 자동생성은 발동과 별개</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.3.67 ~ 2.3.79</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>페소/가져오기: 검색·배치 룩·메타 있으면 이미지 생략. 없으면 최우선 1장 비전 후 로어 본문</li>
            <li>에셋 픽·NAI stealth/메타 읽기, artist 필터, 참조 이미지는 이름 맞는 최우선 에셋</li>
            <li>태거 지침을 앞에 모아 프롬프트 캐시. 기본값으로 초기화하면 그 정리분이 들어감</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.3.60 ~ 2.3.66</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>스트리밍 키워드 자동생성 · 캐릭 없을 때 no humans · 쌍둥이 해시 시 말풍선 강제 삽입 · 캐릭 팝업 붙여넣기</li>
            <li>에셋: 파일명 앞 단어=로어 키, 트리거당 4장, 읽기 상한 32, 원본태그는 메타 정체성 우선</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.3.50 ~ 2.3.59</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>샷/캐릭 팝업 체감 · 빈 샷으로 룩을 지우지 않음 · 설정은 계정 세이브, 그림은 이 기기</li>
            <li>캐릭 저장 분리 · 통합챗 · 외형 ✕는 외형만 · 승자만 보기 · 외형 없는 캐릭 재수집 · 에셋 작가의 노트</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.3.20 ~ 2.3.29</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>스크롤 선택 시 삽화 갱신 · 재마운트 감소 · 빠진 삽화 마커 재부착 · 옷 상태(wear_state)를 채팅에서 이어 감</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.3.10 ~ 2.3.19</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>응답 후 자동 생성: afterRequest 폴링·한 번만 생성 · 스트리밍 스냅샷(150→500자) · LBDATA는 글자 수에서 제외</li>
            <li>인라인 말풍선 재주입 · ±1에서 짧은 라이트보드 건너뛰기</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>2.3.1 ~ 2.3.9</strong>
          <ul style="margin:10px 0 0;padding-left:18px;line-height:1.55;color:#c9d4e6;font-size:13px">
            <li>프리셋·탐색 UI를 먼저 그리고 저장은 뒤에서 · 응답 완료(afterRequest) 때만 자동 생성</li>
            <li>주 채팅만 · 말풍선 DOM#0 · 설정 닫은 뒤 플로팅 뷰어 복구</li>
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
          <button type="button" data-nx-debug-panel="quota" class="\${(t.debugPanelTab || "log") === "quota" ? "active" : ""}">할당량</button>
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
        \` : (t.debugPanelTab || "log") === "quota" ? \`
        <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap">
          <div>
            <div style="font-weight:800;font-size:16px;letter-spacing:-.02em">NovelAI 할당량</div>
            <div class="muted" style="margin-top:4px;font-size:12px">구독 Anlas · Opus · V5 할당량</div>
          </div>
          <button type="button" id="nx-nai-quota-refresh" class="secondary" style="min-height:34px">새로고침</button>
        </div>
        <div id="nx-nai-quota-root">\${t.debugQuotaHtml || \`<div class="card" style="padding:28px 18px;text-align:center;color:#9aa6b8">키마다 남은 Anlas를 불러옵니다…</div>\`}</div>
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

const VENDOR_DEBUG_EVENTS_PATCH = `(() => {
      const esc = (v) => h(String(v ?? ""));
      const paintQuota = (res) => {
        const box = document.getElementById("nx-nai-quota-root");
        const keys = Array.isArray(res?.keys) ? res.keys : [];
        const html = !keys.length
          ? \`<div class="card" style="padding:28px 18px;text-align:center;color:#9aa6b8">등록된 NovelAI 키가 없습니다. 모델 탭에서 V5/V4 키를 넣으세요.</div>\`
          : \`<div style="display:grid;gap:12px">\${keys.map((k) => {
            const fam = String(k.family || "").toUpperCase() || "NAI";
            const v5 = fam.includes("V5");
            const accent = v5 ? "#a78bfa" : "#5eead4";
            const bg = v5 ? "linear-gradient(165deg,#1c1730,#10141e)" : "linear-gradient(165deg,#12221f,#10141e)";
            if (!k.ok) {
              return \`<article style="border-radius:16px;border:1px solid rgba(248,113,113,.35);background:rgba(127,29,29,.18);padding:16px 16px 14px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span style="font:700 12px Segoe UI,sans-serif;color:#fecaca">\${esc(fam)} · …\${esc(k.suffix || "")}</span><span style="font-size:11px;color:#fca5a5">실패</span></div><div style="margin-top:8px;font-size:12px;color:#fecaca;line-height:1.45">\${esc(k.error || "조회 실패")}</div></article>\`;
            }
            const usage = k.v5_usage && Number.isFinite(Number(k.v5_usage.pct)) ? k.v5_usage : null;
            const extra = k.extra && typeof k.extra === "object" ? Object.entries(k.extra).filter(([n]) => !String(n).toLowerCase().endsWith("usage.percent")).slice(0, 8) : [];
            const pct = usage ? Number(usage.pct) || 0 : 0;
            const fill = Math.max(0, Math.min(100, pct));
            const bar = usage ? \`<div style="margin-top:10px"><div style="display:flex;justify-content:space-between;gap:8px;font-size:11px;color:#c4b5fd;margin-bottom:6px"><span>V5 할당량</span><span>\${esc(usage.label || (pct + "%"))}</span></div><div style="height:8px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden"><div style="height:100%;width:\${fill}%;background:linear-gradient(90deg,#7c6cff,#c4b5fd);border-radius:999px"></div></div></div>\` : "";
            const chips = extra.length ? \`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px">\${extra.map(([n, v]) => \`<span style="font-size:10px;color:#9aa6b8;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:999px;padding:3px 8px">\${esc(n.split(".").slice(-2).join("."))} \${esc(v)}</span>\`).join("")}</div>\` : "";
            return \`<article style="border-radius:16px;border:1px solid rgba(255,255,255,.1);background:\${bg};padding:16px 16px 14px;box-shadow:0 12px 32px rgba(0,0,0,.28)"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><div style="display:flex;gap:8px;align-items:center"><span style="display:inline-flex;align-items:center;justify-content:center;min-width:42px;height:22px;padding:0 8px;border-radius:999px;background:\${accent};color:#0b0f18;font:800 11px/1 Segoe UI,sans-serif">\${esc(fam)}</span><span style="color:#9aa6b8;font-size:12px">…\${esc(k.suffix || "")}</span></div>\${k.opus ? \`<span style="font:700 10px Segoe UI,sans-serif;color:#fde68a;background:rgba(251,191,36,.12);border:1px solid rgba(251,191,36,.35);border-radius:999px;padding:3px 8px">Opus</span>\` : ""}</div><div style="margin-top:14px;display:flex;align-items:baseline;gap:8px"><span style="font:800 28px/1.05 Segoe UI,sans-serif;letter-spacing:-.03em;color:#e8eef8">\${esc(k.total ?? 0)}</span><span style="font-size:12px;color:#9aa6b8">Anlas</span></div>\${bar}<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:14px"><div style="padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.04)"><div style="font-size:10px;color:#778398">고정</div><div style="margin-top:2px;font-weight:700">\${esc(k.fixed ?? 0)}</div></div><div style="padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.04)"><div style="font-size:10px;color:#778398">구매</div><div style="margin-top:2px;font-weight:700">\${esc(k.purchased ?? 0)}</div></div><div style="padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.04)"><div style="font-size:10px;color:#778398">합계</div><div style="margin-top:2px;font-weight:700">\${esc(k.total ?? 0)}</div></div></div>\${chips}</article>\`;
          }).join("")}</div>\`;
        t.debugQuotaHtml = html;
        if (box) box.innerHTML = html;
      };
      const loadQuota = async (force) => {
        const box = document.getElementById("nx-nai-quota-root");
        if (!box) return;
        if (!force && t.debugQuotaHtml && !t._quotaStale) {
          box.innerHTML = t.debugQuotaHtml;
          return;
        }
        box.innerHTML = \`<div class="card" style="padding:28px 18px;text-align:center;color:#9aa6b8">조회 중…</div>\`;
        try {
          const res = await K("/v1/nai/quota", { method: "GET" }, 3e4);
          t._quotaStale = !1;
          paintQuota(res);
        } catch (err) {
          const msg = String(err?.message || err);
          t.debugQuotaHtml = \`<div class="card" style="padding:18px;border:1px solid rgba(248,113,113,.35);color:#fecaca">\${esc(msg)}</div>\`;
          box.innerHTML = t.debugQuotaHtml;
        }
      };
      document.getElementById("nx-nai-quota-refresh")?.addEventListener("click", () => loadQuota(!0));
      if ((t.debugPanelTab || "log") === "quota") loadQuota(!1);
    })(), document.querySelectorAll("[data-nx-debug-panel]").forEach((btn) => btn.addEventListener("click", async () => {
      t.debugPanelTab = btn.getAttribute("data-nx-debug-panel") || "log";
      if (t.debugPanelTab === "quota") t._quotaStale = !0;
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

const VENDOR_NAI_MODEL_KEY_NEEDLE =
  `            <label><span>Model</span><input id="nx-nai-model" value="\${h(s.model || "nai-diffusion-4-5-full")}"></label>
            <label class="wide"><span>Novel AI 요청 URL</span><input id="nx-nai-url" type="url" value="\${h(s.request_url || "https://image.novelai.net/ai/generate-image")}"></label>
            <label class="wide"><span>API key <span class="key-status">\${s.api_key_configured ? "설정됨" : "없음"}</span></span><input id="nx-nai-key" type="password" autocomplete="new-password" placeholder="비워 두면 기존 키 유지"></label>`;

const VENDOR_NAI_MODEL_KEY_PATCH =
  `            <input type="hidden" id="nx-nai-model" value="\${h(s.model || "nai-diffusion-4-5-full")}">
            <div class="nx-seg" id="nx-nai-family-bar" style="margin-bottom:8px">
              <button type="button" data-nai-family="v5" class="\${String(s.model || "").includes("nai-diffusion-5") ? "active" : ""}">NAI5</button>
              <button type="button" data-nai-family="v4" class="\${String(s.model || "").includes("nai-diffusion-5") ? "" : "active"}">NAI4</button>
            </div>
            <label class="wide" data-nx-nai-pane="v5" style="\${String(s.model || "").includes("nai-diffusion-5") ? "" : "display:none"}"><span>NAI5 모델</span>
              <select id="nx-nai-model-v5">
                <option value="nai-diffusion-5-full" \${String(s.model || "") === "nai-diffusion-5-curated" ? "" : "selected"}>nai-diffusion-5-full</option>
                <option value="nai-diffusion-5-curated" \${String(s.model || "") === "nai-diffusion-5-curated" ? "selected" : ""}>nai-diffusion-5-curated</option>
              </select>
            </label>
            <label class="wide" data-nx-nai-pane="v4" style="\${String(s.model || "").includes("nai-diffusion-5") ? "display:none" : ""}"><span>NAI4 모델</span>
              <select id="nx-nai-model-v4">
                <option value="nai-diffusion-4-5-full" \${String(s.model || "").includes("4-5-curated") || String(s.model || "").includes("nai-diffusion-4-full") ? "" : "selected"}>nai-diffusion-4-5-full</option>
                <option value="nai-diffusion-4-5-curated" \${String(s.model || "").includes("4-5-curated") ? "selected" : ""}>nai-diffusion-4-5-curated</option>
                <option value="nai-diffusion-4-full" \${String(s.model || "") === "nai-diffusion-4-full" ? "selected" : ""}>nai-diffusion-4-full</option>
              </select>
            </label>
            <label class="wide"><span>Novel AI 요청 URL</span><input id="nx-nai-url" type="url" value="\${h(s.request_url || "https://image.novelai.net/ai/generate-image")}"></label>
            <label class="wide" data-nx-nai-pane="v5" style="\${String(s.model || "").includes("nai-diffusion-5") ? "" : "display:none"}"><span>NAI5 API 키 <span class="key-status">\${(s.api_keys_v5_configured || (s.api_key_configured && String(s.model || "").includes("nai-diffusion-5"))) ? (s.api_keys_v5_configured || 1) + "개 설정됨" : "없음"}\${(s.api_keys_v5_suffixes || []).length ? " · …" + (s.api_keys_v5_suffixes || []).join(" · …") : ""}</span></span>
              <textarea id="nx-nai-keys-v5" rows="3" placeholder="한 줄에 키 하나. 비우면 기존 유지"></textarea>
              <label class="check wide"><input id="nx-nai-keys-v5-clear" type="checkbox"> 이 탭 키 모두 지우기</label>
            </label>
            <label class="wide" data-nx-nai-pane="v4" style="\${String(s.model || "").includes("nai-diffusion-5") ? "display:none" : ""}"><span>NAI4 API 키 <span class="key-status">\${(s.api_keys_v4_configured || (s.api_key_configured && !String(s.model || "").includes("nai-diffusion-5"))) ? (s.api_keys_v4_configured || 1) + "개 설정됨" : "없음"}\${(s.api_keys_v4_suffixes || []).length ? " · …" + (s.api_keys_v4_suffixes || []).join(" · …") : ""}</span></span>
              <textarea id="nx-nai-keys-v4" rows="3" placeholder="한 줄에 키 하나. 비우면 기존 유지"></textarea>
              <label class="check wide"><input id="nx-nai-keys-v4-clear" type="checkbox"> 이 탭 키 모두 지우기</label>
            </label>
            <input id="nx-nai-key" type="password" autocomplete="new-password" style="display:none">`;

/** After VENDOR_OE_RETURN adds llm_roles — assert on patched vendor, not raw. */
const VENDOR_NAI_OE_KEYS_NEEDLE =
  `    const a = hasEl("nx-nai-key") ? N("nx-nai-key") : "";
    return a && (o.api_key = a), {
      llm: e,
      llm_roles,
      nai: o
    };`;

const VENDOR_NAI_OE_KEYS_PATCH =
  `    const a = hasEl("nx-nai-key") ? N("nx-nai-key") : "";
    const fam = document.querySelector("#nx-nai-family-bar [data-nai-family].active")?.getAttribute("data-nai-family") || (String(o.model || "").includes("nai-diffusion-5") ? "v5" : "v4");
    const mv5 = hasEl("nx-nai-model-v5") ? N("nx-nai-model-v5") : "";
    const mv4 = hasEl("nx-nai-model-v4") ? N("nx-nai-model-v4") : "";
    o.model = fam === "v5" ? (mv5 || "nai-diffusion-5-full") : (mv4 || "nai-diffusion-4-5-full");
    const hid = document.getElementById("nx-nai-model");
    if (hid) hid.value = o.model;
    const sv5 = hasEl("nx-nai-sampler-v5") ? N("nx-nai-sampler-v5") : "";
    const sv4 = hasEl("nx-nai-sampler-v4") ? N("nx-nai-sampler-v4") : "";
    const st5 = hasEl("nx-nai-steps-v5") ? Number(N("nx-nai-steps-v5") || 28) : NaN;
    const st4 = hasEl("nx-nai-steps-v4") ? Number(N("nx-nai-steps-v4") || 28) : NaN;
    if (sv5) o.sampler_v5 = sv5;
    if (sv4) o.sampler_v4 = sv4;
    if (Number.isFinite(st5)) o.steps_v5 = st5;
    if (Number.isFinite(st4)) o.steps_v4 = st4;
    o.sampler = fam === "v5" ? (sv5 || o.sampler) : (sv4 || o.sampler);
    o.steps = fam === "v5" ? (Number.isFinite(st5) ? st5 : o.steps) : (Number.isFinite(st4) ? st4 : o.steps);
    const hidSamp = document.getElementById("nx-nai-sampler");
    const hidSteps = document.getElementById("nx-nai-steps");
    if (hidSamp && o.sampler) hidSamp.value = o.sampler;
    if (hidSteps && o.steps != null) hidSteps.value = String(o.steps);
    const lines = (id) => String(N(id) || "").split(/\\r?\\n/).map((x) => x.trim()).filter(Boolean);
    const k5 = lines("nx-nai-keys-v5");
    const k4 = lines("nx-nai-keys-v4");
    if (k5.length) o.api_keys_v5 = k5;
    if (k4.length) o.api_keys_v4 = k4;
    if (ee("nx-nai-keys-v5-clear")) o.clearApiKeysV5 = !0;
    if (ee("nx-nai-keys-v4-clear")) o.clearApiKeysV4 = !0;
    return a && (o.api_key = a), {
      llm: e,
      llm_roles,
      nai: o
    };`;

const VENDOR_NAI_TEST_NEEDLE =
  `    }), document.getElementById("nx-test-nai")?.addEventListener("click", async () => {
      const a = document.getElementById("nx-test-nai"), r = document.getElementById("nx-test-result-nai");
      a && (a.disabled = !0), r && (r.className = "test-result pending", r.textContent = "저장 후 테스트 중…");
      try {
        const { llm: i, nai: s } = Oe();
        const backend = s.backend || t.backendSettings?.nai?.backend || "nai";
        if (backend === "comfy") {
          if (!w(s.comfy_workflow_json) && !w(t.backendSettings?.nai?.comfy_workflow_json)) throw new Error("ComfyUI 워크플로 JSON이 없습니다.");
        } else if (!s.api_key && !t.backendSettings?.nai?.api_key_configured) {
          throw new Error("Novel AI API key가 없습니다.");
        }
        await flushSettingsSave(), await pe({
          llm: i,
          nai: s
        });
        const c = await K("/v1/nai/test", {
          method: "POST",
          body: {}
        });`;

const VENDOR_NAI_TEST_PATCH =
  `    }), document.getElementById("nx-test-nai")?.addEventListener("click", async () => {
      const a = document.getElementById("nx-test-nai"), r = document.getElementById("nx-test-result-nai");
      a && (a.disabled = !0), r && (r.className = "test-result pending", r.textContent = "저장 후 테스트 중…");
      try {
        const draft = Oe(), s = draft.nai, n = t.backendSettings?.nai || {};
        const backend = s.backend || n.backend || "nai";
        const hasDraftKeys = !!(w(s.api_key) || (s.api_keys_v5 && s.api_keys_v5.length) || (s.api_keys_v4 && s.api_keys_v4.length));
        const hasStoredKeys = !!(n.api_key_configured || n.api_keys_v5_configured || n.api_keys_v4_configured);
        if (backend === "comfy") {
          if (!w(s.comfy_workflow_json) && !w(n.comfy_workflow_json)) throw new Error("ComfyUI 워크플로 JSON이 없습니다.");
        } else if (!hasDraftKeys && !hasStoredKeys) {
          throw new Error("Novel AI API key가 없습니다.");
        }
        await flushSettingsSave(), await pe({ nai: s });
        const c = await K("/v1/nai/test", {
          method: "POST",
          body: { nai: s }
        });`;

const VENDOR_NAI_SAMPLER_NEEDLE =
  `            <label><span>Sampler</span>
              <select id="nx-nai-sampler">
                \${[
        ["k_euler_ancestral", "Euler Ancestral"],
        ["k_euler", "Euler"],
        ["k_dpmpp_2m", "DPM++ 2M"],
        ["k_dpmpp_2s_ancestral", "DPM++ 2S Ancestral"],
        ["k_dpmpp_sde", "DPM++ SDE"],
        ["ddim_v3", "DDIM"]
      ].map(([x, I]) => \`<option value="\${x}" \${(s.sampler || "k_euler_ancestral") === x ? "selected" : ""}>\${I}</option>\`).join("")}
              </select>
            </label>
            <label><span>Noise Schedule</span>
              <select id="nx-nai-sched">
                \${[
        "karras",
        "native",
        "exponential",
        "polyexponential"
      ].map((x) => \`<option value="\${x}" \${(s.scheduler || "karras") === x ? "selected" : ""}>\${x}</option>\`).join("")}
              </select>
            </label>
            <label><span>Steps</span><input id="nx-nai-steps" type="number" min="1" max="150" value="\${h(s.steps ?? 28)}"></label>`;

const VENDOR_NAI_SAMPLER_PATCH =
  `            <label data-nx-nai-pane="v5" style="\${String(s.model || "").includes("nai-diffusion-5") ? "" : "display:none"}"><span>샘플러</span>
              <select id="nx-nai-sampler-v5">
                \${[
        ["k_euler_ancestral", "Euler Ancestral"],
        ["k_euler", "Euler"],
        ["k_dpmpp_2s_ancestral", "DPM++ 2S Ancestral"],
        ["k_dpmpp_2m_sde", "DPM++ 2M SDE"],
        ["k_dpmpp_2m", "DPM++ 2M"],
        ["k_dpmpp_sde", "DPM++ SDE"]
      ].map(([x, I]) => \`<option value="\${x}" \${(s.sampler_v5 || s.sampler || "k_euler_ancestral") === x ? "selected" : ""}>\${I}</option>\`).join("")}
              </select>
            </label>
            <label data-nx-nai-pane="v5" style="\${String(s.model || "").includes("nai-diffusion-5") ? "" : "display:none"}"><span>Steps</span><input id="nx-nai-steps-v5" type="number" min="1" max="28" value="\${h(s.steps_v5 ?? s.steps ?? 28)}"></label>
            <label data-nx-nai-pane="v4" style="\${String(s.model || "").includes("nai-diffusion-5") ? "display:none" : ""}"><span>샘플러</span>
              <select id="nx-nai-sampler-v4">
                \${[
        ["k_euler_ancestral", "Euler Ancestral"],
        ["k_euler", "Euler"],
        ["k_dpmpp_2s_ancestral", "DPM++ 2S Ancestral"],
        ["k_dpmpp_2m_sde", "DPM++ 2M SDE"],
        ["k_dpmpp_2m", "DPM++ 2M"],
        ["k_dpmpp_sde", "DPM++ SDE"]
      ].map(([x, I]) => \`<option value="\${x}" \${(s.sampler_v4 || s.sampler || "k_euler_ancestral") === x ? "selected" : ""}>\${I}</option>\`).join("")}
              </select>
            </label>
            <label data-nx-nai-pane="v4" style="\${String(s.model || "").includes("nai-diffusion-5") ? "display:none" : ""}"><span>Steps</span><input id="nx-nai-steps-v4" type="number" min="1" max="28" value="\${h(s.steps_v4 ?? s.steps ?? 28)}"></label>
            <input type="hidden" id="nx-nai-sampler" value="\${h((String(s.model || "").includes("nai-diffusion-5") ? s.sampler_v5 || s.sampler : s.sampler_v4 || s.sampler) || "k_euler_ancestral")}">
            <input type="hidden" id="nx-nai-steps" value="\${h((String(s.model || "").includes("nai-diffusion-5") ? s.steps_v5 ?? s.steps : s.steps_v4 ?? s.steps) ?? 28)}">
            <label><span>Noise Schedule</span>
              <select id="nx-nai-sched">
                \${[
        "karras",
        "native",
        "exponential",
        "polyexponential"
      ].map((x) => \`<option value="\${x}" \${(s.scheduler || "karras") === x ? "selected" : ""}>\${x}</option>\`).join("")}
              </select>
            </label>`;

const VENDOR_PRESET_SECOND_NEEDLE =
  `            <button type="button" id="nx-preset-new" class="secondary">새 프리셋</button>`;
const VENDOR_PRESET_SECOND_PATCH =
  `            <button type="button" id="nx-preset-second" class="secondary\${f && presetIdEq(f.id, d.secondary_preset_id) ? " armed" : ""}" style="\${f && presetIdEq(f.id, d.secondary_preset_id) ? "background:#1f6b3a;border-color:#3d9b5c;color:#e8ffe8" : ""}">2순위로 사용하기</button>
            <button type="button" id="nx-preset-new" class="secondary">새 프리셋</button>`;

const VENDOR_PRESET_SECOND_EVT_NEEDLE =
  `    })(), document.getElementById("nx-preset-new")?.addEventListener("click", async () => {`;
const VENDOR_PRESET_SECOND_EVT_PATCH =
  `    })(), document.getElementById("nx-preset-second")?.addEventListener("click", async () => {
      const a = _e();
      const id = String(a.active_preset_id || "");
      if (!id) return;
      a.secondary_preset_id = presetIdEq(id, a.secondary_preset_id) ? "" : id;
      queueSettingsSave({ card: { ...a } }), await P();
    }), document.getElementById("nx-preset-new")?.addEventListener("click", async () => {`;

const VENDOR_PRESET_CHIP_NEEDLE =
  `I = U.map((g) => \`<button type="button" class="preset-chip \${f && presetIdEq(g.id, f.id) ? "active" : ""}" data-preset-select="\${h(g.id)}" draggable="true">\${h(g.name)}</button>\`).join("")`;
const VENDOR_PRESET_CHIP_PATCH =
  `I = U.map((g) => \`<button type="button" class="preset-chip \${f && presetIdEq(g.id, f.id) ? "active" : ""}\${presetIdEq(g.id, d.secondary_preset_id) ? " second" : ""}" data-preset-select="\${h(g.id)}" draggable="true">\${h(g.name)}</button>\`).join("")`;

const VENDOR_PRESET_CHIP_CSS_NEEDLE =
  `.preset-chip.active{background:var(--accent-soft);border-color:rgba(124,108,255,.45);color:#e4e0ff}`;
const VENDOR_PRESET_CHIP_CSS_PATCH =
  `.preset-chip.active{background:var(--accent-soft);border-color:rgba(124,108,255,.45);color:#e4e0ff}
.preset-chip.second{background:rgba(46,160,90,.18);border-color:rgba(46,160,90,.55);color:#c8f0d4}`;

const VENDOR_PRESET_HELP_MUTED_NEEDLE =
  `              <div class="muted">card.json / 로어북 [Positive]·[Negative] 항목을 불러와 바로 씁니다.</div>`;
const VENDOR_PRESET_HELP_MUTED_PATCH =
  `              <div class="muted">보라=1순위(지금 선택). 초록=2순위. 1순위는 NAI5, 2순위는 NAI4 프리셋을 권장합니다.</div>`;

const VENDOR_DEBUG_QUOTA_NEEDLE =
  `          <div class="row" style="margin-top:12px">
            <button id="nx-debug-refresh" class="secondary">새로고침</button>`;
const VENDOR_DEBUG_QUOTA_PATCH =
  `          <div id="nx-nai-quota" class="muted" style="margin-top:10px;white-space:pre-wrap;font:12px/1.5 Consolas,monospace">할당량: 새로고침하면 키마다 남은 Anlas를 불러옵니다.</div>
          <div class="row" style="margin-top:12px">
            <button id="nx-debug-refresh" class="secondary">새로고침</button>
            <button id="nx-nai-quota-refresh" class="secondary">할당량 새로고침</button>`;

const VENDOR_DEBUG_QUOTA_EVT_NEEDLE =
  `document.getElementById("nx-debug-refresh")?.addEventListener("click", async () => {
      await P();
    }), document.getElementById("nx-debug-clear")?.addEventListener("click", async () => {`;
const VENDOR_DEBUG_QUOTA_EVT_PATCH =
  `document.getElementById("nx-nai-quota-refresh")?.addEventListener("click", async () => {
      const box = document.getElementById("nx-nai-quota");
      if (box) box.textContent = "조회 중…";
      try {
        const res = await K("/v1/nai/quota", { method: "GET" }, 3e4);
        const keys = res?.keys || [];
        box && (box.textContent = keys.length
          ? keys.map((k) => \`\${k.family.toUpperCase()} …\${k.suffix}  \${k.ok ? \`고정 \${k.fixed} · 구매 \${k.purchased} · 합계 \${k.total}\${k.opus ? " · Opus" : ""}\` : (k.error || "실패")}\`).join("\\n")
          : "등록된 키가 없습니다.");
      } catch (err) {
        box && (box.textContent = String(err?.message || err));
      }
    }), document.getElementById("nx-debug-refresh")?.addEventListener("click", async () => {
      await P();
    }), document.getElementById("nx-debug-clear")?.addEventListener("click", async () => {`;

const VENDOR_CURATION_EVENTS_NEEDLE =
  `document.getElementById("nx-save-models")?.addEventListener("click", async () => {`;


const VENDOR_CURATION_EVENTS_PATCH =
  `document.querySelectorAll("[data-nai-family]").forEach((btn) => btn.addEventListener("click", () => {
      document.querySelectorAll("[data-nai-family]").forEach((b) => b.classList.toggle("active", b === btn));
      const fam = btn.getAttribute("data-nai-family") || "v4";
      document.querySelectorAll("[data-nx-nai-pane]").forEach((el) => {
        el.style.display = el.getAttribute("data-nx-nai-pane") === fam ? "" : "none";
      });
      const hid = document.getElementById("nx-nai-model");
      const sel = document.getElementById(fam === "v5" ? "nx-nai-model-v5" : "nx-nai-model-v4");
      if (hid && sel) hid.value = sel.value;
      const hidSamp = document.getElementById("nx-nai-sampler");
      const hidSteps = document.getElementById("nx-nai-steps");
      const samp = document.getElementById(fam === "v5" ? "nx-nai-sampler-v5" : "nx-nai-sampler-v4");
      const stepsEl = document.getElementById(fam === "v5" ? "nx-nai-steps-v5" : "nx-nai-steps-v4");
      if (hidSamp && samp) hidSamp.value = samp.value;
      if (hidSteps && stepsEl) hidSteps.value = stepsEl.value;
    })), document.querySelectorAll("[data-nx-curation-mode]").forEach((btn) => btn.addEventListener("click", async () => {
      const mode = btn.getAttribute("data-nx-curation-mode") || "off";
      if (mode !== "off") return;
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
          const N = globalThis.__INLAY_NATIVE__;
          const src = (typeof N?.resolveExplorerThumbUrl == "function" ? N.resolveExplorerThumbUrl(id) : "") || Ie({ id });
          const VC = globalThis.__INLAY_VIEWER_CORE__;
          const ready = typeof VC?.isReadyImageSrc == "function" ? VC.isReadyImageSrc(src) : typeof src == "string" && (/^data:image\\//i.test(src) || /^blob:/i.test(src));
          if (ready) {
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
            <button type="button" id="nx-explorer-select-all" class="secondary" style="min-height:28px;padding:4px 10px">전체선택</button>
            <button type="button" id="nx-explorer-clear-sel" class="secondary" style="min-height:28px;padding:4px 10px">선택해제</button>`;

const VENDOR_EXPLORER_LIMIT_NEEDLE =
  `    const n = await K("/v1/gallery/explore?limit=500", { method: "GET" }, 2e4), o = n?.folders || [], a = n?.items || [];`;
const VENDOR_EXPLORER_LIMIT_PATCH =
  `    const n = await K("/v1/gallery/explore?limit=0", { method: "GET" }, 6e4), o = n?.folders || [], a = n?.items || [];`;

const VENDOR_EXPLORER_SELECT_ALL_NEEDLE =
  `    document.getElementById("nx-explorer-delete-sel")?.addEventListener("click", () => explorerDeleteSelected());
    document.getElementById("nx-explorer-clear-sel")?.addEventListener("click", () => {`;
const VENDOR_EXPLORER_SELECT_ALL_PATCH =
  `    document.getElementById("nx-explorer-delete-sel")?.addEventListener("click", () => explorerDeleteSelected());
    document.getElementById("nx-explorer-select-all")?.addEventListener("click", () => {
      const EX = exHelpers();
      const ids = (typeof Ze == "function" ? Ze().items : ensureExplorerState().items) || [];
      const list = ids.map((x) => x && x.id).filter(Boolean);
      ensureExplorerState().selection = EX.selectAll ? EX.selectAll(t.explorer.selection, list) : { selected: new Set(list), anchorId: list[0] || "", focusId: list[0] || "" };
      paintExplorerSelectionUi();
    });
    document.getElementById("nx-explorer-clear-sel")?.addEventListener("click", () => {`;

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
        if (typeof N?.dropExplorerThumbUrl == "function") N.dropExplorerThumbUrl(id);
      }
      t._explorerWarmedIds = new Set();
      t._explorerActiveFolder = folderKey;
    }
    const prev = t._explorerWarmedIds instanceof Set ? t._explorerWarmedIds : new Set();
    const keep = new Set(list);
    for (const id of prev) {
      if (!keep.has(id) && typeof N?.dropExplorerThumbUrl == "function") N.dropExplorerThumbUrl(id);
    }
    t._explorerWarmedIds = keep;
    if (typeof N?.pinExplorerThumbs == "function") N.pinExplorerThumbs(list);
    else if (typeof N?.retainExplorerThumbs == "function") N.retainExplorerThumbs(list);
  }
  function warmExplorerVisible(ids, opts) {
    try {
      const N = globalThis.__INLAY_NATIVE__;
      const list = [...new Set((ids || []).map(String).filter(Boolean))];
      const missing = list.filter((id) => {
        try {
          const src = (typeof N?.resolveExplorerThumbUrl == "function" ? N.resolveExplorerThumbUrl(id) : "") || Ie({ id });
          const VC = globalThis.__INLAY_VIEWER_CORE__;
          return !(typeof VC?.isReadyImageSrc == "function" ? VC.isReadyImageSrc(src) : typeof src == "string" && (/^data:image\\//i.test(src) || /^blob:/i.test(src)));
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
      if (typeof N?.warmExplorerThumbs == "function") N.warmExplorerThumbs(missing).then(done).catch(done);
      else if (typeof N?.ensureExplorerThumbUrl == "function") Promise.all(missing.map((id) => N.ensureExplorerThumbUrl(id).catch(() => ""))).then(done).catch(done);
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
        const VC = globalThis.__INLAY_VIEWER_CORE__;
        return !(typeof VC?.isReadyImageSrc == "function" ? VC.isReadyImageSrc(src) : typeof src == "string" && (/^data:image\\//i.test(src) || /^blob:/i.test(src)));
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
      document.getElementById("nx-save-gen-options")?.addEventListener("click", saveCard);
      document.getElementById("nx-save-comic")?.addEventListener("click", saveCard);
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
    } else if (t.uiTab === "comic_gen") {
      const i = t.backendSettings?.card || {};
      const comicOn = i.comic_gen === "on" || i.comic_gen === !0;
      const comicBatch = i.comic_llm_batch === "per_shot" ? "per_shot" : "once";
      const comicSched = i.comic_schedule === "wait_taggers" ? "wait_taggers" : "overlap";
      const comicCoords = i.comic_coords === "ai_choice" || i.comic_coords === "position" ? i.comic_coords : "llm";
      const comicSampler = String(i.comic_sampler || "");
      u = \`
        <div class="card model-card">
          <div class="prompt-group-label">만화 생성</div>
          <div class="muted" style="margin-top:8px">꺼 두면 지금과 같습니다. 켜면 태거가 연속 대사를 만화 페이지로 고를 수 있습니다.</div>
          <div class="model-form" style="margin-top:12px">
            <label data-nx-help-id="nx-comic-gen"><span>만화 생성</span>
              <select id="nx-comic-gen">
                <option value="off" \${!comicOn ? "selected" : ""}>끄기</option>
                <option value="on" \${comicOn ? "selected" : ""}>켜기</option>
              </select>
            </label>
            <label data-nx-help-id="nx-comic-batch"><span>만화 LLM</span>
              <select id="nx-comic-llm-batch">
                <option value="once" \${comicBatch === "once" ? "selected" : ""}>메시지 1회</option>
                <option value="per_shot" \${comicBatch === "per_shot" ? "selected" : ""}>샷마다</option>
              </select>
            </label>
            <label data-nx-help-id="nx-comic-schedule"><span>생성 순서</span>
              <select id="nx-comic-schedule">
                <option value="overlap" \${comicSched === "overlap" ? "selected" : ""}>겹쳐 생성</option>
                <option value="wait_taggers" \${comicSched === "wait_taggers" ? "selected" : ""}>태거 전부 완료 후</option>
              </select>
            </label>
            <label data-nx-help-id="nx-comic-ratio"><span>만화 생성 비율 (%)</span><input id="nx-comic-gen-ratio" type="number" min="0" max="100" step="1" value="\${h(i.comic_gen_ratio ?? 50)}"></label>
            <label data-nx-help-id="nx-comic-coords"><span>위치</span>
              <select id="nx-comic-coords">
                <option value="llm" \${comicCoords === "llm" ? "selected" : ""}>LLM이 알아서</option>
                <option value="position" \${comicCoords === "position" ? "selected" : ""}>Position</option>
                <option value="ai_choice" \${comicCoords === "ai_choice" ? "selected" : ""}>AI choice</option>
              </select>
            </label>
            <label data-nx-help-id="nx-comic-steps"><span>Steps</span><input id="nx-comic-steps" type="number" min="1" max="150" placeholder="기존" value="\${h(i.comic_steps ?? "")}"></label>
            <label data-nx-help-id="nx-comic-sampler"><span>샘플러</span>
              <select id="nx-comic-sampler">
                <option value="" \${!comicSampler ? "selected" : ""}>기존</option>
                <option value="k_euler_ancestral" \${comicSampler === "k_euler_ancestral" ? "selected" : ""}>Euler Ancestral</option>
                <option value="k_euler" \${comicSampler === "k_euler" ? "selected" : ""}>Euler</option>
                <option value="k_dpmpp_2s_ancestral" \${comicSampler === "k_dpmpp_2s_ancestral" ? "selected" : ""}>DPM++ 2S Ancestral</option>
                <option value="k_dpmpp_2m_sde" \${comicSampler === "k_dpmpp_2m_sde" ? "selected" : ""}>DPM++ 2M SDE</option>
                <option value="k_dpmpp_2m" \${comicSampler === "k_dpmpp_2m" ? "selected" : ""}>DPM++ 2M</option>
                <option value="k_dpmpp_sde" \${comicSampler === "k_dpmpp_sde" ? "selected" : ""}>DPM++ SDE</option>
              </select>
            </label>
            <label data-nx-help-id="nx-comic-cfg"><span>가이던스</span><input id="nx-comic-cfg" type="number" step="0.1" placeholder="기존" value="\${h(i.comic_cfg_scale ?? "")}"></label>
            <label data-nx-help-id="nx-comic-rescale"><span>리스케일</span><input id="nx-comic-cfg-rescale" type="number" step="0.01" placeholder="기존" value="\${h(i.comic_cfg_rescale ?? "")}"></label>
            <div style="display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr);gap:8px;margin-top:4px;grid-column:1/-1">
              <label data-nx-help-id="nx-comic-note"><span>작가의 프롬프트</span><textarea id="nx-comic-author-note" rows="4" maxlength="8000" placeholder="톤·세계관. 아티스트 스택 아님">\${h(i.comic_author_note || "")}</textarea></label>
              <label data-nx-help-id="nx-comic-prompt-prefix"><span>선행 프롬프트</span><textarea id="nx-comic-prompt-prefix" rows="4" maxlength="8000" placeholder="사람 태그 다음·스타일 앞">\${h(i.comic_prompt_prefix || "")}</textarea></label>
              <label data-nx-help-id="nx-comic-prompt-suffix"><span>후행 프롬프트</span><textarea id="nx-comic-prompt-suffix" rows="4" maxlength="8000" placeholder="레이아웃 뒤·품질 태그 앞">\${h(i.comic_prompt_suffix || "")}</textarea></label>
            </div>
          </div>
          <div class="row" style="margin-top:14px"><button type="button" id="nx-save-comic">만화 설정 저장</button></div>
        </div>\`;
    } else if (t.uiTab === "characters") {`;

const VENDOR_CT_GATE_NEEDLE = `  function Ct() {
    if (!document.getElementById("nx-mode") && !document.getElementById("nx-char-max")) return null;`;
const VENDOR_CT_GATE_PATCH = `  function Ct() {
    if (!document.getElementById("nx-mode") && !document.getElementById("nx-char-max") && !document.getElementById("nx-custom-pos") && !document.getElementById("nx-preset-select") && !document.getElementById("nx-fixed-prompt-prefix") && !document.getElementById("nx-comic-gen")) return null;`;

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
            <label><span>Steps</span><input id="nx-preset-steps" type="number" min="1" max="28" placeholder="NAI 기본" value="\${h(f?.steps ?? "")}" \${f ? "" : "disabled"}></label>
            <label><span>샘플러</span>
              <select id="nx-preset-sampler" \${f ? "" : "disabled"}>
                <option value="" \${!f?.sampler ? "selected" : ""}>NAI 기본</option>
                \${[["k_euler_ancestral","Euler Ancestral"],["k_euler","Euler"],["k_dpmpp_2s_ancestral","DPM++ 2S Ancestral"],["k_dpmpp_2m_sde","DPM++ 2M SDE"],["k_dpmpp_2m","DPM++ 2M"],["k_dpmpp_sde","DPM++ SDE"]].map((x) => \`<option value="\${x[0]}" \${f?.sampler === x[0] ? "selected" : ""}>\${x[1]}</option>\`).join("")}
              </select>
            </label>
            <label><span>스케줄</span>
              <select id="nx-preset-sched" \${f ? "" : "disabled"}>
                <option value="" \${!f?.scheduler ? "selected" : ""}>NAI 기본</option>
                \${["karras","native","exponential","polyexponential"].map((x) => \`<option value="\${x}" \${f?.scheduler === x ? "selected" : ""}>\${x}</option>\`).join("")}
              </select>
            </label>
            <label data-nx-help-id="nx-preset-family"><span>이 프리셋 모델</span>
              <select id="nx-preset-family" \${f ? "" : "disabled"}>
                <option value="v4" \${f?.model_family === "v5" ? "" : "selected"}>NAI4 / 4.5</option>
                <option value="v5" \${f?.model_family === "v5" ? "selected" : ""}>NAI5</option>
              </select>
            </label>
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

const VENDOR_PRESET_READ_PATCH = `    const nameEl = typeof document < "u" ? document.getElementById("nx-preset-name") : null, posEl = typeof document < "u" ? document.getElementById("nx-custom-pos") : null, negEl = typeof document < "u" ? document.getElementById("nx-custom-neg") : null, cfgEl = typeof document < "u" ? document.getElementById("nx-preset-cfg") : null, rescaleEl = typeof document < "u" ? document.getElementById("nx-preset-rescale") : null, stepsEl = typeof document < "u" ? document.getElementById("nx-preset-steps") : null, sampEl = typeof document < "u" ? document.getElementById("nx-preset-sampler") : null, schedEl = typeof document < "u" ? document.getElementById("nx-preset-sched") : null, famEl = typeof document < "u" ? document.getElementById("nx-preset-family") : null;
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
    if (stepsEl) {
      const v = String(stepsEl.value || "").trim();
      n.steps = v === "" ? null : Number(v);
      if (n.steps != null && !Number.isFinite(n.steps)) n.steps = null;
    }
    if (sampEl) n.sampler = String(sampEl.value || "").trim() || null;
    if (schedEl) n.scheduler = String(schedEl.value || "").trim() || null;
    if (famEl) n.model_family = famEl.value === "v5" ? "v5" : "v4";
    return e;
  }
  function fa(e) {`;

const VENDOR_PRESET_FA_NEEDLE = `    const nameEl = typeof document < "u" ? document.getElementById("nx-preset-name") : null, posEl = typeof document < "u" ? document.getElementById("nx-custom-pos") : null, negEl = typeof document < "u" ? document.getElementById("nx-custom-neg") : null;
    if (owner && (nameEl || posEl || negEl)) {
      nameEl && (owner.name = nameEl.value || "");
      posEl && (owner.positive = posEl.value || "", n.custom_pos = owner.positive);
      negEl && (owner.negative = negEl.value || "", n.custom_neg = owner.negative);
    }`;

const VENDOR_PRESET_FA_PATCH = `    const nameEl = typeof document < "u" ? document.getElementById("nx-preset-name") : null, posEl = typeof document < "u" ? document.getElementById("nx-custom-pos") : null, negEl = typeof document < "u" ? document.getElementById("nx-custom-neg") : null, cfgEl = typeof document < "u" ? document.getElementById("nx-preset-cfg") : null, rescaleEl = typeof document < "u" ? document.getElementById("nx-preset-rescale") : null, stepsEl = typeof document < "u" ? document.getElementById("nx-preset-steps") : null, sampEl = typeof document < "u" ? document.getElementById("nx-preset-sampler") : null, schedEl = typeof document < "u" ? document.getElementById("nx-preset-sched") : null, famEl = typeof document < "u" ? document.getElementById("nx-preset-family") : null;
    if (owner && (nameEl || posEl || negEl || cfgEl || rescaleEl || stepsEl || sampEl || schedEl || famEl)) {
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
      if (stepsEl) {
        const v = String(stepsEl.value || "").trim();
        owner.steps = v === "" ? null : Number(v);
        if (owner.steps != null && !Number.isFinite(owner.steps)) owner.steps = null;
      }
      if (sampEl) owner.sampler = String(sampEl.value || "").trim() || null;
      if (schedEl) owner.scheduler = String(schedEl.value || "").trim() || null;
      if (famEl) owner.model_family = famEl.value === "v5" ? "v5" : "v4";
    }`;

const VENDOR_PRESET_SYNC_NEEDLE = `    const name = document.getElementById("nx-preset-name"), pos = document.getElementById("nx-custom-pos"), neg = document.getElementById("nx-custom-neg");
    if (name) name.value = active.name || "";
    if (pos) pos.value = active.positive || "";
    if (neg) neg.value = active.negative || "";
  }
  async function Je() {`;

const VENDOR_PRESET_SYNC_PATCH = `    const name = document.getElementById("nx-preset-name"), pos = document.getElementById("nx-custom-pos"), neg = document.getElementById("nx-custom-neg"), cfg = document.getElementById("nx-preset-cfg"), rescale = document.getElementById("nx-preset-rescale"), steps = document.getElementById("nx-preset-steps"), samp = document.getElementById("nx-preset-sampler"), sched = document.getElementById("nx-preset-sched"), fam = document.getElementById("nx-preset-family");
    if (name) name.value = active.name || "";
    if (pos) pos.value = active.positive || "";
    if (neg) neg.value = active.negative || "";
    if (cfg) cfg.value = active.cfg_scale == null || active.cfg_scale === "" ? "" : String(active.cfg_scale);
    if (rescale) rescale.value = active.cfg_rescale == null || active.cfg_rescale === "" ? "" : String(active.cfg_rescale);
    if (steps) steps.value = active.steps == null || active.steps === "" ? "" : String(active.steps);
    if (samp) samp.value = active.sampler || "";
    if (sched) sched.value = active.scheduler || "";
    if (fam) fam.value = active.model_family === "v5" ? "v5" : "v4";
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
        cfg_rescale: null,
        steps: null,
        sampler: null,
        scheduler: null,
        model_family: "v4"
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
        cfg_rescale: r.cfg_rescale ?? null,
        steps: r.steps ?? null,
        sampler: r.sampler ?? null,
        scheduler: r.scheduler ?? null,
        model_family: r.model_family === "v5" ? "v5" : "v4"
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
    // Tight hit over both ▲/▼ chips.
    const pw = Math.max(1, Math.round(Number(pin.w || pin.size) || 0));
    const ph = Math.max(1, Math.round(Number(pin.h || pin.size) || 0));
    return ["position:fixed", \`left:\${pin.left}px\`, \`top:\${pin.top}px\`, \`width:\${pw}px\`, \`height:\${ph}px\`, \`z-index:\${z}\`, "border-radius:0", "display:block", "pointer-events:auto", "user-select:none", "background:transparent", "border:none", "box-shadow:none", "color:transparent", "font-size:0", "line-height:0", "opacity:" + (on ? "1" : "0")].join(";");
  }
  function nxStickyV2BadgeStyle(pin, z) {
    return ["position:fixed", \`left:\${pin.left}px\`, \`top:\${pin.top}px\`, \`min-width:\${pin.size}px\`, \`height:\${pin.size}px\`, "padding:0 4px", \`z-index:\${z}\`, "border-radius:6px", "display:flex", "align-items:center", "justify-content:center", "font-size:11px", "font-weight:700", "line-height:1", "pointer-events:auto", "user-select:none", "opacity:.45", "background:rgba(15,23,42,.2)", "color:rgba(226,232,240,.7)", "border:1px solid rgba(255,255,255,.1)", "box-sizing:border-box"].join(";");
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
        try {
          const img = typeof next.thumb.querySelector == "function" ? await next.thumb.querySelector("img") : null;
          if (img && typeof img.setAttribute == "function") await img.setAttribute("src", next._thumbSrc);
        } catch {
        }
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
      const nodes = await nxUnwrapSafeNodes(await root.querySelectorAll("[x-inlay-inline-shot],[data-inlay-inline-shot]"));
      for (const node of nodes) {
        if (!node) continue;
        const id = await nxReadInlineShotId(node);
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
      nxScopeCheckSoon();
      if (pointerGesture && typeof f.clientX == "number" && typeof f.clientY == "number") {
        pointerGesture.movement = Math.max(pointerGesture.movement || 0, Math.hypot(f.clientX - pointerGesture.x, f.clientY - pointerGesture.y));
      }
      if (mobilePress && typeof f.clientX == "number" && typeof f.clientY == "number") {
        const VC = globalThis.__INLAY_VIEWER_CORE__;
        const cancelMove = typeof VC?.imagePressMoveCancels == "function"
          ? VC.imagePressMoveCancels({
            pressPointerId: mobilePress.pointerId,
            eventPointerId: f.pointerId,
            mode: t.backendSettings?.card?.image_press_inspect,
            pressCount: typeof VC.imagePressDownCount == "function"
              ? VC.imagePressDownCount(t._imagePressDowns, Date.now())
              : 0,
            fromX: mobilePress.x,
            fromY: mobilePress.y,
            toX: f.clientX,
            toY: f.clientY,
            slopPx: 8
          })
          : (f.pointerId == null || mobilePress.pointerId == null || f.pointerId === mobilePress.pointerId)
            && Math.hypot(f.clientX - mobilePress.x, f.clientY - mobilePress.y) > 8;
        if (cancelMove) cancelMobilePress();
      }
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
      nxScopeCheckSoon();
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
          // Window capture sees the pointer after a roster click too, which is the
          // one gesture the chat-scoped handler never gets on a character switch.
          nxScopeCheckSoon();
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
        if (ov) ov._stickyThumbCollapsed = !0;
        try {
          await Ht();
        } catch {
        }
        y("info", "sticky.thumb.hide", String(fPress.card?.id || "").slice(0, 8));
        return;
      }
      if (fPress.source === "inline-shot") {
        await hidePressFill();
        return;
      }
      if (fPress.source === "sticky-pin") {
        await hidePressFill();
        if (fPress.openedInspect) return;
        const ov = t.overlayUi;
        if (ov && ov._stickyThumbCollapsed) {
          ov._stickyThumbCollapsed = !1;
          try {
            await Ht();
          } catch {
          }
        }`;


/** Long-press inline bubble shots → same inspect sheet as sticky thumbs. */
const VENDOR_INLINE_LONGPRESS_NEEDLE =
  `      // Sticky always-image: short-tap hide / long-press fullscreen+sheet.
      if (Nt() && !inspectOpen) {`;
const VENDOR_INLINE_LONGPRESS_PATCH =
  `      // Inspect press mode: off / one-finger / two-finger / both.
      // Count pointerdowns that landed on a shot — never pointerIds. The host
      // forwards a plain object, so pointerId can be absent or repeated and two
      // fingers deduped into one entry, which is why two-finger never armed.
      const nxImagePressMode = () => {
        const VC = globalThis.__INLAY_VIEWER_CORE__;
        const raw = t.backendSettings?.card?.image_press_inspect;
        return typeof VC?.normalizeImagePressInspect == "function" ? VC.normalizeImagePressInspect(raw) : "hold";
      };
      const nxPressCount = () => {
        const VC = globalThis.__INLAY_VIEWER_CORE__;
        if (typeof VC?.imagePressDownCount == "function") return VC.imagePressDownCount(t._imagePressDowns, Date.now());
        return Array.isArray(t._imagePressDowns) ? t._imagePressDowns.length : 0;
      };
      const nxNotePressDown = () => {
        const VC = globalThis.__INLAY_VIEWER_CORE__;
        t._imagePressDowns = typeof VC?.noteImagePressDown == "function"
          ? VC.noteImagePressDown(t._imagePressDowns, Date.now())
          : [...(Array.isArray(t._imagePressDowns) ? t._imagePressDowns : []), Date.now()];
      };
      const nxHoldOk = () => {
        const VC = globalThis.__INLAY_VIEWER_CORE__;
        const mode = nxImagePressMode();
        return typeof VC?.imagePressAllowsHold == "function" ? VC.imagePressAllowsHold(mode) : mode === "hold" || mode === "both";
      };
      const nxTapNeed = () => {
        const VC = globalThis.__INLAY_VIEWER_CORE__;
        const mode = nxImagePressMode();
        if (typeof VC?.imagePressTapNeed == "function") return VC.imagePressTapNeed(mode);
        if (mode === "three") return 3;
        if (mode === "two" || mode === "both") return 2;
        return 0;
      };
      const nxInspectAllowed = () => {
        if (!nxHoldOk()) return !1;
        const VC = globalThis.__INLAY_VIEWER_CORE__;
        const mode = nxImagePressMode();
        const n = nxPressCount();
        return typeof VC?.shouldStartImagePressInspect == "function"
          ? VC.shouldStartImagePressInspect({ mode, pointerCount: n })
          : n >= 1;
      };
      const nxFireTap = (card) => {
        const need = nxTapNeed();
        if (!need || !card) return !1;
        const VC = globalThis.__INLAY_VIEWER_CORE__;
        const now = Date.now();
        const prev = t._imageTap;
        const next = typeof VC?.imagePressTapHits == "function"
          ? VC.imagePressTapHits({
            prevAt: prev?.at,
            prevX: prev?.x,
            prevY: prev?.y,
            prevCardId: prev?.cardId,
            prevCount: prev?.count,
            now,
            x,
            y: I,
            cardId: card.id,
            need
          })
          : (() => {
            const linked = !!(prev && String(prev.cardId || "") === String(card.id || "") && now - Number(prev.at) <= 450
              && Math.hypot(x - Number(prev.x), I - Number(prev.y)) <= 28);
            const count = linked ? Math.max(1, Math.floor(Number(prev?.count) || 0) + 1) : 1;
            return { hit: count >= need, count };
          })();
        t._imageTap = { at: now, x, y: I, cardId: String(card.id || ""), count: next.count };
        if (!next.hit) return !1;
        t._imageTap = null;
        if (typeof f.preventDefault == "function") f.preventDefault();
        cancelMobilePress();
        showStickyInspect(card).catch(() => {});
        pointerGesture = { x, y: I, movement: 0, marker: !0, forClick: !1, forText: !1 };
        return !0;
      };
      const nxArmInspect = (F) => {
        if (!F || F.timer || F.long || !nxInspectAllowed()) return;
        F.timer = setTimeout(() => {
          if (mobilePress !== F || !nxInspectAllowed()) return;
          F.long = !0;
          showStickyInspect(F.card).catch(() => {
          });
        }, PRESS_MS);
      };
      // Msg chips: same coord hit-test as inline shots (node click never reaches us).
      if (!inspectOpen && nxMsgAct() !== "off" && typeof hitMsgChipAt == "function") {
        try {
          const chip = await hitMsgChipAt(e, x, I);
          if (chip) {
            t._msgChipPress = { kind: chip.kind, index: chip.index, x, y: I };
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
      // Inline line-shots in the bubble: long-press → sticky inspect (short tap swallowed).
      if (!inspectOpen) {
        try {
          const rawInline = typeof e.querySelectorAll == "function" ? await e.querySelectorAll("[x-inlay-inline-shot],[data-inlay-inline-shot]") : null;
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
            if (nxFireTap(card)) return;
            nxNotePressDown();
            // Long-press start: activate sticky image to this inline shot immediately.
            if (typeof nxActivateStickyByCardId == "function") nxActivateStickyByCardId(card.id).catch(() => {});
            if (mobilePress && (mobilePress.source === "inline-shot" || mobilePress.source === "sticky-thumb")) {
              if (typeof f.preventDefault == "function") f.preventDefault();
              if (nxInspectAllowed()) showPressFill(node, x, I).catch(() => {});
              nxArmInspect(mobilePress);
              pointerGesture = { x, y: I, movement: 0, marker: !0, forClick: !1, forText: !1 };
              return;
            }
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
            if (nxInspectAllowed()) showPressFill(node, x, I).catch(() => {});
            nxArmInspect(F);
            mobilePress = F;
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
      // Sticky always-image: pin/chips expand or inspect; the image only folds.
      if (Nt() && !inspectOpen) {
        const stickyPins = t.overlayUi?.markers || [];
        const activePin = stickyPins.find((m) => m?.active) || null;
        for (const g of stickyPins) {
          if (!g?.el || !g.active && !g.mini) continue;
          if (typeof hitEl != "function" || !await hitEl(g.el, x, I)) continue;
          const card = activePin?.card || g.card;
          const now = Date.now();
          const prev = t._stickyPinTap;
          const dbl = !!(prev && now - Number(prev.at || 0) < 550);
          if (dbl && card && typeof showStickyInspect == "function") {
            t._stickyPinTap = null;
            if (mobilePress) cancelMobilePress();
            showStickyInspect(card).catch(() => {});
            mobilePress = {
              x, y: I, card, source: "sticky-pin", pointerId: f.pointerId,
              long: !1, timer: null, openedInspect: !0
            };
            pointerGesture = { x, y: I, movement: 0, marker: !0, forClick: !1, forText: !1 };
            return;
          }
          t._stickyPinTap = { at: now };
          if (mobilePress) {
            cancelMobilePress();
            return;
          }
          mobilePress = {
            x,
            y: I,
            card,
            source: "sticky-pin",
            pointerId: f.pointerId,
            long: !1,
            timer: null
          };
          pointerGesture = { x, y: I, movement: 0, marker: !0, forClick: !1, forText: !1 };
          return;
        }

`;

const VENDOR_STICKY_INSPECT_PRESS_NEEDLE =
  `          if (!g?.active || !g.thumb || t.overlayUi?._stickyThumbCollapsed) continue;
          if (!await hitEl(g.thumb, x, I)) continue;
          if (mobilePress) {
            cancelMobilePress();
            return;
          }
          const F = {
            x,
            y: I,
            card: g.card,
            source: "sticky-thumb",
            pointerId: f.pointerId,
            long: !1,
            timer: null,
            thumb: g.thumb
          };
          showPressFill(g.thumb, x, I).catch(() => {
          });
          F.timer = setTimeout(() => {
            if (mobilePress !== F) return;
            F.long = !0;
            showStickyInspect(F.card).catch(() => {
            });
          }, PRESS_MS), mobilePress = F;
          return;`;
const VENDOR_STICKY_INSPECT_PRESS_PATCH =
  `          if (!g?.active || !g.thumb || t.overlayUi?._stickyThumbCollapsed) continue;
          if (!await hitEl(g.thumb, x, I)) continue;
          // Image surface: one tap folds to 0. Hold / double / triple never inspect here.
          if (mobilePress) {
            cancelMobilePress();
            return;
          }
          const F = {
            x,
            y: I,
            card: g.card,
            source: "sticky-thumb",
            pointerId: f.pointerId,
            long: !1,
            timer: null,
            thumb: g.thumb
          };
          mobilePress = F;
          pointerGesture = { x, y: I, movement: 0, marker: !0, forClick: !1, forText: !1 };
          return;`;

const VENDOR_MSG_CHIP_UP_NEEDLE =
  `    }, onPointerUp = async (f) => {
      if (t.uiOpen || t._hostChromeBlocked) {
        cancelMobilePress(), pinClick = null, pointerGesture = null, pendingSheetHit = null;
        return;
      }`;
const VENDOR_MSG_CHIP_UP_PATCH =
  `    }, onPointerUp = async (f) => {
      if (t.uiOpen || t._hostChromeBlocked) {
        cancelMobilePress(), pinClick = null, pointerGesture = null, pendingSheetHit = null, t._msgChipPress = null;
        return;
      }
      const chipPress = t._msgChipPress;
      t._msgChipPress = null;
      const xUp = typeof f?.clientX == "number" ? f.clientX : chipPress?.x;
      const yUp = typeof f?.clientY == "number" ? f.clientY : chipPress?.y;
      let chip = chipPress;
      if ((!chip || !chip.kind) && typeof xUp == "number" && typeof yUp == "number" && typeof hitMsgChipAt == "function") {
        try { chip = await hitMsgChipAt(e, xUp, yUp); } catch { chip = chipPress; }
      }
      if (chip && chip.kind && typeof runMsgChipAction == "function") {
        const moved = chipPress ? Math.hypot((Number(xUp) || 0) - chipPress.x, (Number(yUp) || 0) - chipPress.y) : 0;
        const gestMove = Number(pointerGesture?.movement || 0);
        if (Math.max(moved, gestMove) <= 8) {
          cancelMobilePress();
          pointerGesture = null;
          t._lastPointerGesture = null;
          try {
            await runMsgChipAction(chip.kind, chip.index);
          } catch (err) {
            y("error", "msg.chip.dispatch.fail", err?.message || err);
          }
          return;
        }
      }`;

const VENDOR_CANCEL_PRESS_IDS_NEEDLE =
  `    }, cancelMobilePress = () => {
      mobilePress?.timer && clearTimeout(mobilePress.timer), mobilePress = null;`;
const VENDOR_CANCEL_PRESS_IDS_PATCH =
  `    }, cancelMobilePress = () => {
      mobilePress?.timer && clearTimeout(mobilePress.timer), mobilePress = null;
      t._imagePressDowns = null;`;

const VENDOR_SECOND_PTR_CANCEL_NEEDLE =
  `      if (mobilePress && f.pointerId != null && mobilePress.pointerId != null && f.pointerId !== mobilePress.pointerId) {
        cancelMobilePress();
        return;
      }`;
const VENDOR_SECOND_PTR_CANCEL_PATCH =
  `      if (mobilePress && f.pointerId != null && mobilePress.pointerId != null && f.pointerId !== mobilePress.pointerId) {
        const VC = globalThis.__INLAY_VIEWER_CORE__;
        const keep = typeof VC?.imagePressAllowsSecondPointer == "function"
          ? VC.imagePressAllowsSecondPointer(t.backendSettings?.card?.image_press_inspect)
          : !1;
        if (!keep) {
          cancelMobilePress();
          return;
        }
      }`;

const VENDOR_PRESS_PTR_UP_NEEDLE =
  `      const fPress = mobilePress;
      if (!fPress) return;
      fPress.timer && clearTimeout(fPress.timer), mobilePress = null;`;
const VENDOR_PRESS_PTR_UP_PATCH =
  `      const fPress = mobilePress;
      if (!fPress) return;
      const VCUp = globalThis.__INLAY_VIEWER_CORE__;
      // One finger up drops one live press slot, so a two-finger hold stops
      // qualifying the moment either finger leaves the image.
      if (typeof VCUp?.noteImagePressUp == "function") t._imagePressDowns = VCUp.noteImagePressUp(t._imagePressDowns);
      else if (Array.isArray(t._imagePressDowns)) t._imagePressDowns = t._imagePressDowns.slice(1);
      if (typeof VCUp?.imagePressOtherPointerUp == "function"
        ? VCUp.imagePressOtherPointerUp({ pressPointerId: fPress.pointerId, eventPointerId: f.pointerId })
        : f.pointerId != null && fPress.pointerId != null && f.pointerId !== fPress.pointerId) {
        return;
      }
      fPress.timer && clearTimeout(fPress.timer), mobilePress = null;`;

const VENDOR_PRESS_PTR_CANCEL_NEEDLE =
  `    }, onPointerCancel = () => {
      cancelMobilePress(), pointerGesture = null, pinClick = null, pendingSheetHit = null;
    }`;
const VENDOR_PRESS_PTR_CANCEL_PATCH =
  `    }, onPointerCancel = (f) => {
      const VC = globalThis.__INLAY_VIEWER_CORE__;
      if (typeof VC?.imagePressIgnorePointerCancel == "function"
        ? VC.imagePressIgnorePointerCancel(t.backendSettings?.card?.image_press_inspect, mobilePress?.source)
        : !1) {
        // Pinch/zoom cancels the first finger mid-hold. Keep the slot: no
        // pointerup follows a cancel, so the press window prunes it instead.
        return;
      }
      cancelMobilePress(), pointerGesture = null, pinClick = null, pendingSheetHit = null;
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
    await closeCardTagEdit(), await xe();
    try {
      await ensureViewerRosterLoaded();
    } catch {
    }`;

const VENDOR_STICKY_OPEN_CARD_PATCH = `  async function openCardTagEdit(e) {
    if (!e?.id) return;
    if (typeof globalThis.__INLAY_NATIVE__?.openTagStudio == "function") {
      if (typeof document > "u" || !document.body) {
        y("error", "card.tags.open", "plugin document unavailable");
        return;
      }
      t._editOpenGen = (t._editOpenGen || 0) + 1;
      const studioGen = t._editOpenGen;
      await closeCharacterCreateModal().catch(() => null);
      await closeCardTagEdit();
      if (t.overlayUi) t.overlayUi._stickyEditorOpen = !0;
      const openedShell = !t.uiOpen;
      if (openedShell && typeof k.showContainer == "function") {
        await k.showContainer("fullscreen");
        document.body.style.cssText = "margin:0;min-height:100vh;background:transparent;font:13px/1.45 Segoe UI,sans-serif;color:#e2e8f0;";
      }
      t.cardTagUi = { openedContainer: openedShell, _studio: !0 };
      await hideFloatingViewerForModal();
      try {
        await globalThis.__INLAY_NATIVE__.openTagStudio(e);
      } finally {
        if (studioGen === t._editOpenGen) await closeCardTagEdit();
      }
      return;
    }
    if (typeof document > "u" || !document.body) {
      y("error", "card.tags.open", "plugin document unavailable");
      return;
    }
    t._editOpenGen = (t._editOpenGen || 0) + 1;
    const openGen = t._editOpenGen;
    await closeCharacterCreateModal().catch(() => null);
    await closeCardTagEdit();
    void xe();
    if (t.overlayUi) t.overlayUi._stickyEditorOpen = !0;
    const openedShell = !t.uiOpen;
    if (openedShell && typeof k.showContainer == "function") {
      await k.showContainer("fullscreen");
      document.body.style.cssText = "margin:0;min-height:100vh;background:transparent;font:13px/1.45 Segoe UI,sans-serif;color:#e2e8f0;";
    }
    try { document.getElementById("nx-card-tag-modal")?.remove?.(); } catch {}
    const veil = document.createElement("div");
    veil.id = "nx-card-tag-modal";
    veil.setAttribute("data-ct-root", "1");
    veil.innerHTML = '<div data-ct-backdrop style="position:fixed;inset:0;z-index:100000;background:rgba(4,8,16,.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;"><div data-ct-card style="width:min(620px,100%);max-height:min(90vh,860px);display:flex;flex-direction:column;overflow:hidden;background:linear-gradient(165deg,#1a1f2e,#0c1018);border:1px solid rgba(151,139,255,.4);border-radius:16px;box-shadow:0 28px 80px rgba(0,0,0,.55);"><div style="flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08)"><div><div style="font-weight:700;font-size:15px">샷 태그 수정</div><div style="margin-top:3px;color:#9aa6b8;font-size:11px">불러오는 중…</div></div><button type="button" data-ct-x style="cursor:pointer;border:0;background:rgba(255,255,255,.08);color:#e2e8f0;padding:6px 10px;border-radius:8px">✕</button></div><div style="flex:1;min-height:140px;display:flex;align-items:center;justify-content:center;padding:28px 16px;color:#9aa6b8;font-size:13px">불러오는 중…</div><div style="flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;border-top:1px solid rgba(255,255,255,.08);background:rgba(8,12,20,.96)"><span style="color:#9aa6b8;font-size:11px">불러오는 중…</span><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end"><button type="button" data-ct-cancel style="cursor:pointer;border:0;background:#334155;color:#fff;padding:8px 12px;border-radius:9px;font:12px Segoe UI,sans-serif">취소</button><button type="button" disabled style="cursor:default;opacity:.45;border:0;background:#7c6cff;color:#fff;padding:8px 14px;border-radius:9px;font:600 12px Segoe UI,sans-serif">저장·리롤</button></div></div></div></div>';
    document.body.appendChild(veil);
    t.cardTagUi = { root: veil, openedContainer: openedShell, _stub: !0 };
    const dismissCardStub = () => {
      if (openGen !== t._editOpenGen) return;
      t._editOpenGen = (t._editOpenGen || 0) + 1;
      closeCardTagEdit().catch(() => {});
    };
    veil.querySelector("[data-ct-x]")?.addEventListener("click", (ev) => { ev.preventDefault(); ev.stopPropagation(); dismissCardStub(); });
    veil.querySelector("[data-ct-cancel]")?.addEventListener("click", (ev) => { ev.preventDefault(); dismissCardStub(); });
    veil.querySelector("[data-ct-backdrop]")?.addEventListener("click", (ev) => { if (ev.target === ev.currentTarget) dismissCardStub(); });
    await hideFloatingViewerForModal();
    if (typeof requestAnimationFrame == "function") await new Promise((res) => requestAnimationFrame(res));
    if (openGen !== t._editOpenGen) return;
    try { await le(); } catch {}
    try {
      const nai = await K("/v1/cards/" + e.id + "/nai-prompt");
      if (nai && nai.ok) {
        if (typeof nai.main_prompt == "string") e.main_prompt = nai.main_prompt;
        if (typeof nai.negative_prompt == "string") e.negative_prompt = nai.negative_prompt;
        if (Array.isArray(nai.characters) && nai.characters.length) e.characters = nai.characters;
      }
    } catch {}
    if (!t._viewerRoster) void ensureViewerRosterLoaded().catch(() => null);`;

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
    await closeCardTagEdit(), await xe(), await closeCharacterCreateModal().catch(() => null);
    const rosterResolved = await ensureViewerRosterLoaded().catch(() => null);`;

const VENDOR_STICKY_OPEN_CHAR_PATCH = `  async function Ua(e) {
    const pickerHandoff = t._msgCharPickerHandoff === !0;
    t._msgCharPickerHandoff = !1;
    if (!e?.name) return;
    if (typeof document > "u" || !document.body) {
      y("error", "char.edit.open", "plugin document unavailable");
      return;
    }
    t._editOpenGen = (t._editOpenGen || 0) + 1;
    const openGen = t._editOpenGen;
    await closeCardTagEdit(), await closeCharacterCreateModal().catch(() => null);
    if (!pickerHandoff) void xe();
    if (t.overlayUi) t.overlayUi._stickyEditorOpen = !0;
    const openedShell = !t.uiOpen;
    if (openedShell && typeof k.showContainer == "function") {
      await k.showContainer("fullscreen");
      document.body.style.cssText = "margin:0;min-height:100vh;background:transparent;font:13px/1.45 Segoe UI,sans-serif;color:#e2e8f0;";
    }
    try { document.getElementById("nx-char-edit-modal")?.remove?.(); } catch {}
    const veil = document.createElement("div");
    veil.id = "nx-char-edit-modal";
    veil.setAttribute("data-ce-root", "1");
    veil.innerHTML = '<div data-ce-backdrop style="position:fixed;inset:0;z-index:100000;background:rgba(4,8,16,.72);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;"><div data-ce-card style="width:min(720px,100%);max-height:min(94vh,920px);background:linear-gradient(165deg,#1a1f2e,#0c1018);border:1px solid rgba(151,139,255,.4);border-radius:16px;box-shadow:0 28px 80px rgba(0,0,0,.55);display:flex;flex-direction:column;overflow:hidden;"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0"><div><div style="font-weight:700;font-size:15px">캐릭터 태그 수정</div><div style="margin-top:3px;color:#9aa6b8;font-size:11px">불러오는 중…</div></div><button type="button" data-ce-x style="cursor:pointer;border:0;background:rgba(255,255,255,.08);color:#e2e8f0;padding:6px 10px;border-radius:8px">✕</button></div><div style="padding:28px 16px;flex:1;min-height:140px;display:flex;align-items:center;justify-content:center;color:#9aa6b8;font-size:13px">불러오는 중…</div><div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;border-top:1px solid rgba(255,255,255,.08);flex-shrink:0;background:rgba(8,12,20,.92)"><span style="color:#9aa6b8;font-size:11px">불러오는 중…</span><div style="display:flex;gap:8px"><button type="button" data-ce-cancel style="cursor:pointer;border:0;background:#334155;color:#fff;padding:8px 12px;border-radius:9px;font:12px Segoe UI,sans-serif">취소</button><button type="button" disabled style="cursor:default;opacity:.45;border:0;background:#7c6cff;color:#fff;padding:8px 14px;border-radius:9px;font:600 12px Segoe UI,sans-serif">저장</button></div></div></div></div>';
    document.body.appendChild(veil);
    t.charEditUi = { root: veil, openedContainer: openedShell, _stub: !0, _openGen: openGen };
    const dismissCharStub = () => {
      if (openGen !== t._editOpenGen) return;
      t._editOpenGen = (t._editOpenGen || 0) + 1;
      xe().catch(() => {});
    };
    veil.querySelector("[data-ce-x]")?.addEventListener("click", (ev) => { ev.preventDefault(); ev.stopPropagation(); dismissCharStub(); });
    veil.querySelector("[data-ce-cancel]")?.addEventListener("click", (ev) => { ev.preventDefault(); dismissCharStub(); });
    veil.querySelector("[data-ce-backdrop]")?.addEventListener("click", (ev) => { if (ev.target === ev.currentTarget) dismissCharStub(); });
    await hideFloatingViewerForModal();
    if (typeof requestAnimationFrame == "function") await new Promise((res) => requestAnimationFrame(res));
    if (openGen !== t._editOpenGen) return;
    try { await le(); } catch {}
    try {
      const hid = String(e.id || "").trim();
      if (hid) {
        const res = await K("/v1/characters/ref/hydrate", { method: "POST", body: { character_id: hid, scope: String(e.scope || ""), session_id: String(t.lastScope?.sessionId || "") } }, 3e4);
        const hit = [...(res?.session || []), ...(res?.global || [])].find((c) => String(c.id || "") === hid);
        if (hit) e.ref_configured = !!hit.configured, e.ref_preview_url = hit.preview_url || "", e.ref_hash = hit.hash || "";
      }
    } catch {}
    const rosterResolved = t._viewerRoster || null;
    if (!rosterResolved) void ensureViewerRosterLoaded().catch(() => null);`;

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
    if (t._closingCardTag) return;
    t._closingCardTag = !0;
    try {
    const e = t.cardTagUi, n = e?.root || (typeof document < "u" ? document.getElementById("nx-card-tag-modal") : null);
    try {
      n?.remove?.();
    } catch {
    }
    try {
      document.getElementById("nx-tag-studio")?.remove?.();
    } catch {
    }
    if (e?._studio && typeof globalThis.__INLAY_NATIVE__?.closeTagStudio == "function") {
      globalThis.__INLAY_NATIVE__.closeTagStudio();
    }
    const o = !!e?.openedContainer;
    t.cardTagUi = null;
    if (t.overlayUi && !t.charEditUi && !t.uiOpen) t.overlayUi._stickyEditorOpen = !1;
    if (o && !t.uiOpen && typeof k.hideContainer == "function") void k.hideContainer();
    if (!t.charEditUi && !t.uiOpen) {
      void restoreFloatingViewerAfterModal();
      void Ht();
    }
    } finally {
      t._closingCardTag = !1;
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

const VENDOR_STICKY_CLOSE_CHAR_PATCH = `    t.charEditUi = null, t.autotagFocus?.scope === "modal" && (t.autotagFocus = null), t.charRefFocus?.scope === "modal" && (t.charRefFocus = null);
    if (o && !t.uiOpen && typeof k.hideContainer == "function") void k.hideContainer();
    if (t.overlayUi && !t.cardTagUi && !t.uiOpen) t.overlayUi._stickyEditorOpen = !1;
    if (!t.cardTagUi && !t.uiOpen) {
      void restoreFloatingViewerAfterModal();
      void Ht();
    }
  }
  async function Ua(e) {`;

const VENDOR_SHOT_SKIP_SHOW_NEEDLE =
  `    opened && typeof k.showContainer == "function" && (await k.showContainer("fullscreen"), document.body.style.cssText = "margin:0;min-height:100vh;background:transparent;font:13px/1.45 Segoe UI,sans-serif;color:#e2e8f0;");
    const root = document.createElement("div"), initMode = settingsMode === "off" ? "gender" : settingsMode, initAuto = settingsMode !== "off";`;
const VENDOR_SHOT_SKIP_SHOW_PATCH =
  `    const root = document.createElement("div"), initMode = settingsMode === "off" ? "gender" : settingsMode, initAuto = settingsMode !== "off";`;

const VENDOR_CHAR_SKIP_SHOW_NEEDLE =
  `    r && typeof k.showContainer == "function" && (await k.showContainer("fullscreen"), document.body.style.cssText = "margin:0;min-height:100vh;background:transparent;font:13px/1.45 Segoe UI,sans-serif;color:#e2e8f0;");
    const i = document.createElement("div");`;
const VENDOR_CHAR_SKIP_SHOW_PATCH =
  `    const i = document.createElement("div");`;

const VENDOR_SHOT_SWAP_VEIL_NEEDLE =
  `    ].join(""), document.body.appendChild(root);
    const baseEl = root.querySelector("[data-ct-base]"), negEl = root.querySelector("[data-ct-neg]")`;
const VENDOR_SHOT_SWAP_VEIL_PATCH =
  `    ].join("");
    try { t.cardTagUi?._stub && t.cardTagUi.root?.remove?.(); } catch {}
    document.body.appendChild(root);
    const baseEl = root.querySelector("[data-ct-base]"), negEl = root.querySelector("[data-ct-neg]")`;

const VENDOR_CHAR_SWAP_VEIL_NEEDLE =
  `    ].join(""), document.body.appendChild(i);
    const s = i.querySelector("[data-ce-name]")`;
const VENDOR_CHAR_SWAP_VEIL_PATCH =
  `    ].join("");
    try { t.charEditUi?._stub && t.charEditUi.root?.remove?.(); } catch {}
    document.body.appendChild(i);
    const s = i.querySelector("[data-ce-name]")`;

const VENDOR_CHIP_SKIP_ROSTER_NEEDLE =
  `      await ensureViewerRosterLoaded().catch(() => null);
      const idx = Number.isFinite(Number(charI)) ? Number(charI) : Number(String(kind).replace(/^char/i, "")) - 1;`;
const VENDOR_CHIP_SKIP_ROSTER_PATCH =
  `      void ensureViewerRosterLoaded().catch(() => null);
      const idx = Number.isFinite(Number(charI)) ? Number(charI) : Number(String(kind).replace(/^char/i, "")) - 1;`;

const VENDOR_SAVE_ONLY_BG_NEEDLE =
  `    }, saveOnly = async () => {
      const payload = collectPayload(), cardId = e.id, keepPara = paraKeep, keepShot = shotKeep;
      try {
        setStatus("저장 중…"), await K(\`/v1/cards/\${encodeURIComponent(cardId)}/tags\`, {
          method: "POST",
          body: payload
        }, 15e3), y("info", "card.tags.save", \`\${String(cardId).slice(0, 8)} chars=\${payload.characters.length} only\`), await closeCardTagEdit(), await refreshGalleryAfterTagSave(cardId, keepPara, keepShot, cardId), t.galleryUi?.status?.setTextContent && await t.galleryUi.status.setTextContent(\`태그 저장됨 · \${String(cardId).slice(0, 8)}\`);
      } catch (Yt) {
        y("error", "card.tags.save.fail", Yt?.message || Yt);
        try {
          t.cardTagUi?.root && setStatus(\`실패: \${z(Yt?.message || Yt, 80)}\`);
        } catch {
        }
      }
    }, save = async () => {`;
const VENDOR_SAVE_ONLY_BG_PATCH =
  `    }, saveOnly = async () => {
      const payload = collectPayload(), cardId = e.id, keepPara = paraKeep, keepShot = shotKeep;
      void closeCardTagEdit();
      void (async () => {
        try {
          await K(\`/v1/cards/\${encodeURIComponent(cardId)}/tags\`, { method: "POST", body: payload }, 15e3);
          y("info", "card.tags.save", \`\${String(cardId).slice(0, 8)} chars=\${payload.characters.length} only\`);
          await refreshGalleryAfterTagSave(cardId, keepPara, keepShot, cardId);
          t.galleryUi?.status?.setTextContent && await t.galleryUi.status.setTextContent(\`태그 저장됨 · \${String(cardId).slice(0, 8)}\`);
        } catch (Yt) {
          y("error", "card.tags.save.fail", Yt?.message || Yt);
          try { t.galleryUi?.status?.setTextContent && await t.galleryUi.status.setTextContent(\`태그 저장 실패: \${z(Yt?.message || Yt, 80)}\`); } catch {}
        }
      })();
    }, save = async () => {`;

const VENDOR_SAVE_REROLL_BG_NEEDLE =
  `        setStatus("저장 중…"), await K(\`/v1/cards/\${encodeURIComponent(cardId)}/tags\`, {
          method: "POST",
          body: payload
        }, 15e3), y("info", "card.tags.save", \`\${String(cardId).slice(0, 8)} chars=\${payload.characters.length} autoPerson=\${!!autoEl?.checked}\`), await closeCardTagEdit();
        const Yt = await withImageRerollToast("태그 저장 후 리롤 중…", async () => await K(\`/v1/cards/\${encodeURIComponent(cardId)}/reroll\`, {`;
const VENDOR_SAVE_REROLL_BG_PATCH =
  `        void closeCardTagEdit();
        await K(\`/v1/cards/\${encodeURIComponent(cardId)}/tags\`, {
          method: "POST",
          body: payload
        }, 15e3), y("info", "card.tags.save", \`\${String(cardId).slice(0, 8)} chars=\${payload.characters.length} autoPerson=\${!!autoEl?.checked}\`);
        const Yt = await withImageRerollToast("태그 저장 후 리롤 중…", async () => await K(\`/v1/cards/\${encodeURIComponent(cardId)}/reroll\`, {`;

const VENDOR_SAVE_REROLL_INLINE_NEEDLE =
  `        await refreshGalleryAfterTagSave(cardId, keepPara, keepShot, Gt), t.galleryUi?.status?.setTextContent && await t.galleryUi.status.setTextContent(\`저장·리롤 완료 · \${String(Gt || cardId).slice(0, 8)}\`), y("info", "card.tags.reroll", \`\${String(cardId).slice(0, 8)}→\${String(Gt).slice(0, 8)}\`);`;
const VENDOR_SAVE_REROLL_INLINE_PATCH =
  `        await refreshGalleryAfterTagSave(cardId, keepPara, keepShot, Gt), await nxPatchInlinePhotoByCardId(Gt || cardId, nxCardDisplaySrc((t.gallery || []).find((c) => String(c?.id || "") === String(Gt || cardId)) || { id: Gt || cardId }), cardId), t.galleryUi?.status?.setTextContent && await t.galleryUi.status.setTextContent(\`저장·리롤 완료 · \${String(Gt || cardId).slice(0, 8)}\`), y("info", "card.tags.reroll", \`\${String(cardId).slice(0, 8)}→\${String(Gt).slice(0, 8)}\`);`;

/**
 * Session gallery: newest window plus the hashes we are about to paint.
 *
 * This used to ask for 2000 — the session ceiling — because a plain 120 cut the
 * hash links on old messages and their shots stopped attaching. The window is
 * back because the request now names the hashes it needs and the cache merges
 * instead of replacing, so an old shot survives outside the window.
 */
const VENDOR_GALLERY_CE_LIMIT_NEEDLE =
  `      o = await K(\`/v1/gallery?session_id=\${encodeURIComponent(n)}&limit=120\`, { method: "GET" });`;
const VENDOR_GALLERY_CE_LIMIT_PATCH =
  `      const askHashes = nxCeWantHashes();
      const hashQ = askHashes.length ? \`&hashes=\${encodeURIComponent(askHashes.join(","))}\` : "";
      o = await K(\`/v1/gallery?session_id=\${encodeURIComponent(n)}&limit=\${NX_GALLERY_WINDOW}\${hashQ}\`, { method: "GET" });
      o.__askedHashes = askHashes;`;

const VENDOR_GALLERY_CE_MERGE_NEEDLE =
  `    t.gallery = nextItems;
    t._galleryCache = { sessionId: n, at: Date.now() };`;
const VENDOR_GALLERY_CE_MERGE_PATCH =
  `    {
      const VCm = globalThis.__INLAY_VIEWER_CORE__;
      // A forced reload means cards may have appeared; retry remembered misses.
      if (force) t._galleryHashMiss = null;
      const samePrev = t._galleryCache?.sessionId === n ? prevGallery : [];
      const merged = typeof VCm?.mergeSessionGallery == "function"
        ? VCm.mergeSessionGallery({
          prev: samePrev,
          next: nextItems,
          total: o?.total,
          windowOldestAt: o?.window_oldest_at,
          askedHashes: o?.__askedHashes || [],
          cap: 2000
        })
        : { cards: nextItems, kept: 0, dropped: 0, replaced: !0 };
      t.gallery = merged.cards;
      if (!merged.replaced) {
        y("info", "gallery.window", \`win=\${nextItems.length}/\${Number(o?.total || 0)} keep=\${merged.kept} drop=\${merged.dropped}\`);
      }
    }
    t._galleryCache = { sessionId: n, at: Date.now() };`;

/**
 * ce() used to warm the viewer strip (up to 8 data URLs) on every gallery
 * reload — even when the floating viewer was off, and ahead of inline paint.
 * The mounted viewer warms its own strip; inline / overlay encode what they
 * paint. Leave ce() as list-only so those surfaces own the encode slots.
 */
const VENDOR_GALLERY_CE_WARM_NEEDLE =
  `      const focus = typeof VC?.galleryFocusMessage == "function" ? VC.galleryFocusMessage(t.selectedMessage, t.lastImagedMessage, t.gallery) : t.selectedMessage;
      const ordered = typeof VC?.galleryForMessage == "function" ? VC.galleryForMessage(t.gallery, focus, 8) : (t.gallery || []).slice(0, 8);
      const idx = Number(t.galleryUi?.index) || 0;
      const ids = VC?.visibleGalleryImageIds ? VC.visibleGalleryImageIds(ordered, idx, 1, Math.max(8, ordered.length || 0)) : ordered.map((c) => c?.id).filter(Boolean);
      if (typeof N?.warmImages == "function") N.warmImages(ids).catch(() => {
      });`;
const VENDOR_GALLERY_CE_WARM_PATCH =
  `      // List only — viewer / inline / overlay warm the shots they actually paint.`;

const VENDOR_CHAR_SAVE_BG_NEEDLE =
  `        if (t.charactersSession = v?.characters || t.charactersSession, t.charactersGlobal = v?.global || t.charactersGlobal, t.appearance = v?.appearance || t.appearance, y("info", "char.edit.save", \`\${I} → \${rosterMeta?.rosterUnified ? "roots" : x === "__global__" ? "global" : "session"} app=\${F.length} attire=\${T.length} acc=\${Acc.length}\`), t.galleryUi?.status?.setTextContent) try {
          await t.galleryUi.status.setTextContent(\`캐릭터 저장됨 · \${I}\`);
        } catch {
        }
        await xe();`;
const VENDOR_CHAR_SAVE_BG_PATCH =
  `        if (t.charactersSession = v?.characters || t.charactersSession, t.charactersGlobal = v?.global || t.charactersGlobal, t.appearance = v?.appearance || t.appearance, y("info", "char.edit.save", \`\${I} → \${rosterMeta?.rosterUnified ? "roots" : x === "__global__" ? "global" : "session"} app=\${F.length} attire=\${T.length} acc=\${Acc.length}\`), t.galleryUi?.status?.setTextContent) try {
          await t.galleryUi.status.setTextContent(\`캐릭터 저장됨 · \${I}\`);
        } catch {
        }`;
const VENDOR_CHAR_SAVE_CLOSE_FIRST_NEEDLE =
  `          priority: Number(n.priority || 0)
        };
        let v;
        if (x === "__global__") {`;
const VENDOR_CHAR_SAVE_CLOSE_FIRST_PATCH =
  `          priority: Number(n.priority || 0)
        };
        void xe();
        let v;
        if (x === "__global__") {`;

/** Settings open: same sticky 0% + viewer hide as shot/char edit (markers live outside overlay root). */
const VENDOR_SETTINGS_OPEN_STICKY_NEEDLE = `  async function At() {
    t.uiOpen = !0;
    // Re-open settings with whatever the viewer last selected.`;
const VENDOR_SETTINGS_OPEN_STICKY_PATCH = `  async function At() {
    // Flag first so La()/pin park while settings shell paints — do not await Ht here.
    if (t.overlayUi) t.overlayUi._stickyEditorOpen = !0;
    t._inspectGen = (t._inspectGen || 0) + 1;
    if (typeof t.hideStickyInspect == "function") t.hideStickyInspect().catch(() => {});
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
      for (const ui of [t.galleryUi?.root, t.galleryUi?.panel, t.overlayUi?.root, t.debugUi?.root, t.overlayUi?.pinned, t.overlayUi?.preview, t.overlayUi?.fullscreen, t.overlayUi?.actionMenu]) {
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
      if (typeof t.hideStickyInspect == "function") t.hideStickyInspect().catch(() => {});
    });`;

/** Expose inspect close on t so At() can force-dismiss the enlarge sheet. */
const VENDOR_HIDE_INSPECT_BIND_NEEDLE = `    }, hideInspect = async () => {
      inspectOpen = !1, pendingSheetHit = null, await hideActionMenu(), await hideFullscreen();
    }, hidePressFill = async () => {`;
const VENDOR_HIDE_INSPECT_BIND_PATCH = `    }, hideInspect = async () => {
      t._inspectGen = (t._inspectGen || 0) + 1;
      inspectOpen = !1, pendingSheetHit = null, await hideActionMenu(), await hideFullscreen();
    };
    t.hideStickyInspect = hideInspect;
    const hidePressFill = async () => {`;

/** In-flight enlarge sheet must not finish after settings already opened. */
const VENDOR_SHOW_INSPECT_ABORT_NEEDLE = `    }, showStickyInspect = async (f) => {
      if (!f) return;
      await hidePressFill();
      actionCard = f, inspectOpen = !0, pendingSheetHit = null, inspectGuardUntil = Date.now() + 400, inspectZones = [], inspectSheetEl = null;
      await showFullscreen(f);
      try {
        await actionMenu.setInnerHTML("");
      } catch {
      }`;
const VENDOR_SHOW_INSPECT_ABORT_PATCH = `    }, showStickyInspect = async (f) => {
      if (!f || t.uiOpen) return;
      const inspectGen = (t._inspectGen = (t._inspectGen || 0) + 1);
      await hidePressFill();
      if (t._inspectGen !== inspectGen || t.uiOpen) return hideInspect();
      actionCard = f, inspectOpen = !0, pendingSheetHit = null, inspectGuardUntil = Date.now() + 400, inspectZones = [], inspectSheetEl = null;
      await showFullscreen(f);
      if (t._inspectGen !== inspectGen || t.uiOpen) return hideInspect();
      try {
        await actionMenu.setInnerHTML("");
      } catch {
      }`;

const VENDOR_SHOW_INSPECT_COMMIT_NEEDLE = `      inspectSheetEl = sheet;
      await actionMenu.setStyleAttribute("position:fixed;inset:0;display:flex;z-index:100002;pointer-events:auto;background:transparent;align-items:flex-end;justify-content:center;padding:max(12px,env(safe-area-inset-bottom)) 12px 18px;box-sizing:border-box;");
    }, findActHit = async (x, I) => {`;
const VENDOR_SHOW_INSPECT_COMMIT_PATCH = `      inspectSheetEl = sheet;
      if (t._inspectGen !== inspectGen || t.uiOpen) return hideInspect();
      await actionMenu.setStyleAttribute("position:fixed;inset:0;display:flex;z-index:100002;pointer-events:auto;background:transparent;align-items:flex-end;justify-content:center;padding:max(12px,env(safe-area-inset-bottom)) 12px 18px;box-sizing:border-box;");
      if (t._inspectGen !== inspectGen || t.uiOpen) return hideInspect();
    }, findActHit = async (x, I) => {`;

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
        try { await refreshSelectedInlineImages(!0); } catch {}
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
      hair_color: w(a.hair_color || "", 120),
      hair_style: w(a.hair_style || "", 400),
      eye_color: w(a.eye_color || "", 120),
      height: w(a.height || "", 80),
      age: a.age,
      penis_size: w(a.penis_size || "", 40),
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

const VENDOR_CHAR_EDIT_HEADER_NEEDLE =
  `      \`<div><div style="font-weight:700;font-size:15px">캐릭터 태그 수정</div><div style="margin-top:3px;color:#9aa6b8;font-size:11px">char\${e.index + 1} · \${h(n.name || e.name)} · \${a}</div></div>\`,`;
const VENDOR_CHAR_EDIT_HEADER_PATCH =
  `      \`<div><div style="font-weight:700;font-size:15px">캐릭터 태그 수정</div><div style="margin-top:3px;color:#9aa6b8;font-size:11px">\${Number.isFinite(e.index) ? \`char\${e.index + 1} · \` : ""}\${h(n.name || e.name)} · \${h(a)}</div></div>\`,`;

const VENDOR_CHAR_EDIT_GENDER_HTML_NEEDLE =
  `<div style="display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:8px"><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>이름</span><input data-ce-name value="\${h(n.name || e.name)}" style="width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:8px 10px;font:13px/1.4 Segoe UI,sans-serif"></label><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>원본 태그</span><input data-ce-original value="\${h(n.original || "")}" placeholder="(원작 캐릭터 태그)" style="width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:8px 10px;font:13px/1.4 Segoe UI,sans-serif"></label></div>`;
const VENDOR_CHAR_EDIT_GENDER_HTML_PATCH =
  `<div style="display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr) minmax(0,.7fr);gap:8px"><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>이름</span><input data-ce-name value="\${h(n.name || e.name)}" style="width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:8px 10px;font:13px/1.4 Segoe UI,sans-serif"></label><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>원본</span><input data-ce-original value="\${h(n.original || "")}" placeholder="(원작 캐릭터 태그)" style="width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:8px 10px;font:13px/1.4 Segoe UI,sans-serif"></label><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>성별</span><select data-ce-gender style="width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:8px 10px;font:13px/1.4 Segoe UI,sans-serif"><option value="" \${!["girl","boy","other","female","male"].includes(String(n.gender||n.sex||""))?"selected":""}>미정</option><option value="girl" \${["girl","female"].includes(String(n.gender||n.sex||""))?"selected":""}>girl</option><option value="boy" \${["boy","male"].includes(String(n.gender||n.sex||""))?"selected":""}>boy</option><option value="other" \${String(n.gender||n.sex||"")==="other"?"selected":""}>other</option></select></label></div>
<div class="char-looks-row" style="margin-top:8px;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px"><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>머리</span><input data-ce-hair-color value="\${h(n.hair_color||"")}" placeholder="black hair" style="width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:7px 8px;font:13px/1.4 Segoe UI,sans-serif"></label><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>스타일</span><input data-ce-hair-style value="\${h(n.hair_style||"")}" placeholder="short hair, bangs…" style="width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:7px 8px;font:13px/1.4 Segoe UI,sans-serif"></label><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>눈</span><input data-ce-eye-color value="\${h(n.eye_color||"")}" placeholder="amber eyes" style="width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:7px 8px;font:13px/1.4 Segoe UI,sans-serif"></label><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>키</span><input data-ce-height value="\${h(n.height||"")}" placeholder="170" style="width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:7px 8px;font:13px/1.4 Segoe UI,sans-serif"></label><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>나이</span><input data-ce-age type="number" min="1" max="120" value="\${h(n.age??"")}" placeholder="24" style="width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:7px 8px;font:13px/1.4 Segoe UI,sans-serif"></label><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>자지</span><select data-ce-penis-size style="width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:7px 8px;font:13px/1.4 Segoe UI,sans-serif"><option value="" \${!n.penis_size?"selected":""}>없음</option><option value="small penis" \${n.penis_size==="small penis"?"selected":""}>small penis</option><option value="penis" \${n.penis_size==="penis"?"selected":""}>penis</option><option value="huge penis" \${n.penis_size==="huge penis"?"selected":""}>huge penis</option><option value="gigantic penis" \${n.penis_size==="gigantic penis"?"selected":""}>gigantic penis</option></select></label></div>`;

const VENDOR_CHAR_EDIT_GENDER_REF_NEEDLE =
  `const s = i.querySelector("[data-ce-name]"), c = i.querySelector("[data-ce-original]"), surnameEl = i.querySelector("[data-ce-surname]")`;
const VENDOR_CHAR_EDIT_GENDER_REF_PATCH =
  `const s = i.querySelector("[data-ce-name]"), c = i.querySelector("[data-ce-original]"), genderEl = i.querySelector("[data-ce-gender]"), hairColorEl = i.querySelector("[data-ce-hair-color]"), hairStyleEl = i.querySelector("[data-ce-hair-style]"), eyeColorEl = i.querySelector("[data-ce-eye-color]"), heightEl = i.querySelector("[data-ce-height]"), ageEl = i.querySelector("[data-ce-age]"), penisEl = i.querySelector("[data-ce-penis-size]"), surnameEl = i.querySelector("[data-ce-surname]")`;

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
          hairColorEl && (hairColorEl.value = x.hair_color || "");
          hairStyleEl && (hairStyleEl.value = x.hair_style || "");
          eyeColorEl && (eyeColorEl.value = x.eye_color || "");
          heightEl && (heightEl.value = x.height || "");
          if (ageEl) ageEl.value = x.age != null && x.age !== "" ? String(x.age) : "";
          if (penisEl) penisEl.value = x.penis_size || "";
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
          hair_color: w(hairColorEl?.value || "", 120),
          hair_style: w(hairStyleEl?.value || "", 400),
          eye_color: w(eyeColorEl?.value || "", 120),
          height: w(heightEl?.value || "", 80),
          age: ageEl?.value === "" || ageEl?.value == null ? "" : Number(ageEl.value),
          penis_size: ["small penis", "penis", "huge penis", "gigantic penis"].includes(String(penisEl?.value || "")) ? String(penisEl.value) : "",
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

/** Persist the roster row scope on the card so ref upload/list use the same key. */
const VENDOR_CHAR_REF_SCOPE_ATTR_NEEDLE =
  `data-char-scope="\${h(n)}" data-char-id="\${c}"`;
const VENDOR_CHAR_REF_SCOPE_ATTR_PATCH =
  `data-char-scope="\${h(n)}" data-char-id="\${c}" data-char-ref-scope="\${h(r.scope || (n === "global" ? "__global__" : ""))}"`;

/** Character settings tab: name / original / gender / priority on one row. */
const VENDOR_CHAR_TAB_IDENTITY_HTML_NEEDLE =
  `            <label><span>이름</span><input data-char-name value="\${h(r.name || "")}"></label>
            <label><span>원본 태그</span><input data-char-original value="\${h(r.original || "")}" placeholder="(원작 캐릭터 태그)"></label>`;
const VENDOR_CHAR_TAB_IDENTITY_HTML_PATCH =
  `            <div class="wide char-meta-row"><label><span>이름</span><input data-char-name value="\${h(r.name || "")}"></label><label><span>원본</span><input data-char-original value="\${h(r.original || "")}" placeholder="(원작 캐릭터 태그)"></label><label><span>성별</span><select data-char-gender><option value="" \${!["girl","boy","other","female","male"].includes(String(r.gender||r.sex||""))?"selected":""}>미정</option><option value="girl" \${["girl","female"].includes(String(r.gender||r.sex||""))?"selected":""}>girl</option><option value="boy" \${["boy","male"].includes(String(r.gender||r.sex||""))?"selected":""}>boy</option><option value="other" \${String(r.gender||r.sex||"")==="other"?"selected":""}>other</option></select></label><label><span>우선</span><input data-char-priority type="number" value="\${h(r.priority ?? 0)}"></label></div>`;

/** Character settings tab: ref row after wear (priority/gender moved to identity row). */
const VENDOR_CHAR_TAB_GENDER_HTML_NEEDLE =
  `            <label><span>우선순위</span><input data-char-priority type="number" value="\${h(r.priority ?? 0)}"></label>
            <div class="autotag-status muted\${l ? " pending" : ""}" data-autotag-status>`;
const VENDOR_CHAR_TAB_GENDER_HTML_PATCH =
  `            <div class="wide" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:2px">
              <button type="button" class="secondary" data-char-ref title="클릭: 붙여넣기 대상 · 더블클릭: 파일 (너비 400, webp 80%)">참고이미지</button>
              <button type="button" class="secondary" data-char-ref-clear title="참고이미지 제거">제거</button>
              <button type="button" class="secondary" data-char-ref-refresh title="모듈에서 다시 읽기">새로고침</button>
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
        hair_color: w(n.querySelector("[data-char-hair-color]")?.value || "", 120),
        hair_style: w(n.querySelector("[data-char-hair-style]")?.value || "", 400),
        eye_color: w(n.querySelector("[data-char-eye-color]")?.value || "", 120),
        height: w(n.querySelector("[data-char-height]")?.value || "", 80),
        age: n.querySelector("[data-char-age]")?.value === "" || n.querySelector("[data-char-age]")?.value == null ? "" : Number(n.querySelector("[data-char-age]")?.value),
        penis_size: ["small penis", "penis", "huge penis", "gigantic penis"].includes(String(n.querySelector("[data-char-penis-size]")?.value || "")) ? String(n.querySelector("[data-char-penis-size]")?.value || "") : "",
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
        hair_color: String(raw.hair_color || "").trim(),
        hair_style: String(raw.hair_style || "").trim(),
        eye_color: String(raw.eye_color || "").trim(),
        height: String(raw.height || "").trim(),
        age: raw.age === "" || raw.age == null ? "" : Number(raw.age),
        penis_size: ["small penis", "penis", "huge penis", "gigantic penis"].includes(String(raw.penis_size || "")) ? String(raw.penis_size) : "",
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
  `            <div class="wide" data-nx-costume-bar style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:0 0 6px">
              <div style="display:flex;align-items:stretch;min-width:110px;flex:1.2"><input data-char-costume-name placeholder="코스튬 이름" value="\${h((()=>{const L=Array.isArray(r.costumes)&&r.costumes.length?r.costumes:[{name:"default",note:"",attire:r.attire||"",accessories:r.accessories||""}];const i=Math.max(0,Math.min(L.length-1,Number(r.active_costume||0)||0));return(L[i]&&L[i].name)||"default";})())}" style="flex:1;min-width:0;border-top-right-radius:0;border-bottom-right-radius:0;border-right:0"><div style="position:relative;width:36px;flex:0 0 36px"><div aria-hidden="true" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border:1px solid var(--border,rgba(255,255,255,.14));border-left:0;border-radius:0 10px 10px 0;background:#0b0f18;color:#d7deea;font:700 12px/1 Segoe UI,sans-serif;pointer-events:none">▾</div><select data-char-costume title="코스튬 선택" style="position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;color:#e8eef8;background:#0b0f18;font-size:13px;border:0;margin:0;padding:0"><option value="__add__" style="color:#e8eef8;background:#0b0f18">＋ 코스튬 추가</option>\${(Array.isArray(r.costumes)&&r.costumes.length?r.costumes:[{name:"default",note:"",attire:r.attire||"",accessories:r.accessories||""}]).map((c,i)=>\`<option value="\${i}" data-name="\${h(c&&c.name||"")}" data-note="\${h(c&&c.note||"")}" data-attire="\${h(c&&c.attire||"")}" data-accessories="\${h(c&&c.accessories||"")}" style="color:#e8eef8;background:#0b0f18" \${Number(r.active_costume||0)===i?"selected":""}>\${h((c&&c.name)||("costume"+i))}[\${i}]\${c&&c.note?" · "+h(c.note):""}</option>\`).join("")}</select></div></div>
              <input data-char-costume-note placeholder="언제 쓸지 · 예: 수영장 / 천사 상태" value="\${h((()=>{const L=Array.isArray(r.costumes)&&r.costumes.length?r.costumes:[{name:"default",note:""}];const i=Math.max(0,Math.min(L.length-1,Number(r.active_costume||0)||0));return(L[i]&&L[i].note)||"";})())}" style="flex:1.4;min-width:110px">
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

/** Settings character cards: same look slots as the shot-edit modal. */
const VENDOR_CHAR_TAB_LOOKS_HTML_NEEDLE =
  `            <label class="wide"><span>외형 태그 (옷·악세사리 제외)</span><textarea data-char-appearance rows="3">\${h(r.appearance || "")}</textarea></label>`;
const VENDOR_CHAR_TAB_LOOKS_HTML_PATCH =
  `            <label class="wide"><span>외형 태그 (옷·악세사리 제외)</span><textarea data-char-appearance rows="2">\${h(r.appearance || "")}</textarea></label>
            <div class="wide char-looks-row">
              <label><span>머리</span><input data-char-hair-color value="\${h(r.hair_color||"")}" placeholder="black hair"></label>
              <label><span>스타일</span><input data-char-hair-style value="\${h(r.hair_style||"")}" placeholder="short hair, bangs…"></label>
              <label><span>눈</span><input data-char-eye-color value="\${h(r.eye_color||"")}" placeholder="amber eyes"></label>
              <label><span>키</span><input data-char-height value="\${h(r.height||"")}" placeholder="170"></label>
              <label><span>나이</span><input data-char-age type="number" min="1" max="120" value="\${h(r.age??"")}" placeholder="24"></label>
              <label><span>자지</span><select data-char-penis-size><option value="" \${!r.penis_size?"selected":""}>없음</option><option value="small penis" \${r.penis_size==="small penis"?"selected":""}>small penis</option><option value="penis" \${r.penis_size==="penis"?"selected":""}>penis</option><option value="huge penis" \${r.penis_size==="huge penis"?"selected":""}>huge penis</option><option value="gigantic penis" \${r.penis_size==="gigantic penis"?"selected":""}>gigantic penis</option></select></label>
            </div>`;

const VENDOR_CHAR_TAB_AUTOTAG_APPLY_NEEDLE =
  `      if (appEl) appEl.value = s.appearance || "";
      if (attEl) attEl.value = s.attire || "";
      if (accEl) accEl.value = s.accessories || "";`;
const VENDOR_CHAR_TAB_AUTOTAG_APPLY_PATCH =
  `      if (appEl) appEl.value = s.appearance || "";
      if (attEl) attEl.value = s.attire || "";
      if (accEl) accEl.value = s.accessories || "";
      const genderEl = e.querySelector("[data-char-gender]");
      const hairColorEl = e.querySelector("[data-char-hair-color]");
      const hairStyleEl = e.querySelector("[data-char-hair-style]");
      const eyeColorEl = e.querySelector("[data-char-eye-color]");
      const heightEl = e.querySelector("[data-char-height]");
      const ageEl = e.querySelector("[data-char-age]");
      const penisEl = e.querySelector("[data-char-penis-size]");
      genderEl && s.gender && (genderEl.value = s.gender);
      if (hairColorEl) hairColorEl.value = s.hair_color || "";
      if (hairStyleEl) hairStyleEl.value = s.hair_style || "";
      if (eyeColorEl) eyeColorEl.value = s.eye_color || "";
      if (heightEl) heightEl.value = s.height || "";
      if (ageEl) ageEl.value = s.age != null && s.age !== "" ? String(s.age) : "";
      if (penisEl) penisEl.value = s.penis_size || "";`;

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
const VENDOR_CHAR_EDIT_APPEARANCE_LABEL_PATCH = `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><span>외형 태그 (girl/boy · 옷·무기 제외)</span><button type="button" data-ce-clear-looks title="외형 칸 비우기" style="cursor:pointer;border:0;background:rgba(248,113,113,.2);color:#fecaca;padding:2px 9px;border-radius:8px;font:700 12px Segoe UI,sans-serif;flex-shrink:0">✕</button></div>`;

const VENDOR_CHAR_EDIT_APPEARANCE_SIZE_NEEDLE =
  `textarea data-ce-appearance rows="5" style="width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:9px 11px;font:13px/1.45 Segoe UI,sans-serif;resize:vertical;min-height:110px"`;
const VENDOR_CHAR_EDIT_APPEARANCE_SIZE_PATCH =
  `textarea data-ce-appearance rows="3" style="width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:9px 11px;font:13px/1.45 Segoe UI,sans-serif;resize:vertical;min-height:72px"`;

/** Clear looks — wipe appearance textarea only. */
const VENDOR_CHAR_EDIT_CLEAR_LOOKS_NEEDLE =
  `    }), i.querySelector("[data-ce-x]")?.addEventListener("click", (f) => {
      f.preventDefault(), f.stopPropagation(), U().catch(() => {
      });
    }), (() => {`;
const VENDOR_CHAR_EDIT_CLEAR_LOOKS_PATCH =
  `    }), i.querySelector("[data-ce-x]")?.addEventListener("click", (f) => {
      f.preventDefault(), f.stopPropagation(), U().catch(() => {
      });
    }), i.querySelector("[data-ce-clear-looks]")?.addEventListener("click", (f) => {
      f.preventDefault(), f.stopPropagation();
      if (!confirm("외형 칸을 비울까요?")) return;
      if (p) p.value = "";
      if (hairColorEl) hairColorEl.value = "";
      if (hairStyleEl) hairStyleEl.value = "";
      if (eyeColorEl) eyeColorEl.value = "";
      if (heightEl) heightEl.value = "";
      if (ageEl) ageEl.value = "";
      if (penisEl) penisEl.value = "";
    }), (() => {`;

/** Character tab: ✕ beside 삭제 — clear looks without removing the row. */
const VENDOR_CHAR_TAB_CLEAR_LOOKS_BTN_NEEDLE =
  `<button type="button" class="secondary" data-char-delete style="min-height:30px;padding:4px 10px;flex-shrink:0">삭제</button>`;
const VENDOR_CHAR_TAB_CLEAR_LOOKS_BTN_PATCH =
  `<button type="button" class="secondary" data-char-clear-looks title="외형 칸 비우기" style="min-height:30px;padding:4px 10px;flex-shrink:0">✕</button>
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
    })(), document.getElementById("nx-char-add-session")?.addEventListener("click", async () => {
      try {
        const sc = await Z();
        if (sc.unified) await ensureUnifiedRoster(sc), await P();
      } catch {
      }`;

const VENDOR_LOREFILTER_TAB_LOAD_NEEDLE =
  `    })), t.uiTab === "characters" && !t._charsBgRefresh) {`;
const VENDOR_LOREFILTER_TAB_LOAD_PATCH =
  `    })), t.uiTab === "characters" && !t._charRefHydrating && (() => {
      const sid = String(t.lastScope?.sessionId || "");
      if (t._charRefHydratedFor !== sid) {
        t._charRefHydratedFor = sid;
        t._charRefHydrating = !0;
        (async () => {
          try {
            const res = await K("/v1/characters/ref/hydrate", { method: "POST", body: { session_id: sid } }, 6e4);
            if (!t.uiOpen || t.uiTab !== "characters") return;
            const apply = (list, rows) => {
              if (!Array.isArray(list) || !Array.isArray(rows)) return;
              const by = new Map(rows.map((r) => [String(r.id || ""), r]));
              for (const c of list) {
                const hit = by.get(String(c.id || ""));
                if (!hit) continue;
                c.ref_configured = !!hit.configured;
                c.ref_preview_url = hit.preview_url || "";
                c.ref_hash = hit.hash || "";
              }
            };
            apply(t.charactersSession, res?.session);
            apply(t.charactersGlobal, res?.global);
            await P();
          } catch {
            t._charRefHydratedFor = "";
          } finally {
            t._charRefHydrating = !1;
          }
        })();
      }
      return !0;
    })(), t.uiTab === "characters" && !t._lorefilterLoading && (() => {
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
      a.addEventListener("pointerdown", r), a.addEventListener("mousedown", r), a.addEventListener("click", (i) => {
        r(i);
        if (!confirm("외형 칸을 비울까요?")) return;
        const s = a.closest("[data-char-scope]");
        const app = s?.querySelector("[data-char-appearance]");
        if (app) app.value = "";
        for (const q of ["[data-char-hair-color]", "[data-char-hair-style]", "[data-char-eye-color]", "[data-char-height]", "[data-char-age]", "[data-char-penis-size]"]) {
          const el = s?.querySelector(q);
          if (el) el.value = "";
        }
        t._charsDirty = !0;
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
        const sid = String(t.lastScope?.sessionId || "");
        const asRefScope = (raw) => {
          const v = String(raw || "").trim();
          if (v === "global" || v === "__global__") return "__global__";
          if (v === "session") return sid;
          return v || sid;
        };
        K("/v1/characters/ref", {
          method: "POST",
          body: {
            character_id: toId,
            scope: asRefScope(n.scope),
            session_id: sid,
            copy_from: fromId,
            copy_from_scope: asRefScope(I.scope)
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

const VENDOR_CHAR_REF_MODE_OFF_LABEL_NEEDLE =
  `<option value="off" \${(i.char_ref_mode || "off") === "off" ? "selected" : ""}>끄기</option>`;
const VENDOR_CHAR_REF_MODE_OFF_LABEL_PATCH =
  `<option value="off" \${(i.char_ref_mode || "off") === "off" ? "selected" : ""}>안함</option>`;

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
    "nx-char-ref-mode": { title: "캐릭터 참고이미지", body: "안함은 참고이미지를 보내지 않습니다. V4.5에서만 vibe 또는 image를 고르면 첨부됩니다. V5와 그 외 모델에는 보내지 않습니다." },
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
      '<button type="button" data-ce-ref-refresh style="cursor:pointer;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#d7deea;padding:7px 12px;border-radius:9px;font:700 12px Segoe UI,sans-serif">새로고침</button>',
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
    })), (() => {
      const sid = () => String(t.lastScope?.sessionId || "");
      const asRefScope = (cardOrRaw) => {
        const stored = cardOrRaw && cardOrRaw.getAttribute
          ? String(cardOrRaw.getAttribute("data-char-ref-scope") || "").trim()
          : "";
        if (stored === "global" || stored === "__global__") return "__global__";
        if (stored && stored !== "session") return stored;
        const v = String(
          cardOrRaw && cardOrRaw.getAttribute
            ? (cardOrRaw.getAttribute("data-char-scope") || "")
            : (cardOrRaw || "")
        ).trim();
        if (v === "global" || v === "__global__") return "__global__";
        if (v === "session") return sid();
        return v || sid();
      };
      const refLists = (uiScope) => uiScope === "global" ? [t.charactersGlobal] : uiScope === "session" ? [t.charactersSession] : [t.charactersSession, t.charactersGlobal];
      document.querySelectorAll("[data-char-ref]").forEach((a) => {
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
              scope: asRefScope(card),
              session_id: sid(),
              image_b64: await It(file)
            }
          }, 6e4);
          paint(card, res?.preview_url || "", !!res?.configured);
          for (const list of refLists(card.getAttribute("data-char-scope"))) {
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
              character_id: id,
              scope: asRefScope(card),
              session_id: sid()
            }
          }, 15e3);
          const prev = card.querySelector("[data-char-ref-preview]"), st = card.querySelector("[data-char-ref-status]");
          if (prev) prev.innerHTML = "";
          if (st) st.textContent = "없음";
          for (const list of refLists(card.getAttribute("data-char-scope"))) {
            const hit = (list || []).find((c) => String(c.id || "") === id || String(c.name || "") === id);
            if (hit) hit.ref_configured = !1, hit.ref_preview_url = "";
          }
        } catch {
        }
      });
    }), document.querySelectorAll("[data-char-ref-refresh]").forEach((a) => {
      const stop = (i) => {
        i.preventDefault(), i.stopPropagation();
      };
      a.addEventListener("pointerdown", stop), a.addEventListener("mousedown", stop), a.addEventListener("click", async (i) => {
        stop(i);
        const card = a.closest("[data-char-scope]");
        if (!card) return;
        const id = card.getAttribute("data-char-id") || "";
        if (!id) return;
        const st = card.querySelector("[data-char-ref-status]");
        if (st) st.textContent = "읽는 중…";
        try {
          const res = await K("/v1/characters/ref/hydrate", {
            method: "POST",
            body: {
              character_id: id,
              scope: asRefScope(card),
              session_id: sid()
            }
          }, 3e4);
          const row = [...(res?.session || []), ...(res?.global || [])].find((c) => String(c.id || "") === id);
          const url = row?.preview_url || "";
          const ok = !!(row?.configured && url);
          paint(card, url, ok);
          for (const list of refLists(card.getAttribute("data-char-scope"))) {
            const hit = (list || []).find((c) => String(c.id || "") === id || String(c.name || "") === id);
            if (hit) hit.ref_configured = !!row?.configured, hit.ref_preview_url = url;
          }
        } catch {
          if (st) st.textContent = "실패";
        }
      });
    }), t._charRefPasteBound || (t._charRefPasteBound = !0, window.addEventListener("paste", async (a) => {
      if (!t.charRefFocus) return;
      const r = Array.from(a.clipboardData?.items || []).find((p) => p.type.startsWith("image/"));
      if (!r) return;
      if (t.charRefFocus.scope === "modal" && t.charRefFocus.id === "char-edit") {
        const ae = document.activeElement, tag = String(ae?.tagName || "").toLowerCase();
        if (tag === "textarea" || tag === "input" || ae?.isContentEditable) return;
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
            scope: asRefScope(card),
            session_id: sid(),
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
    })();
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
        const sid = String(t.lastScope?.sessionId || "");
        const recScope = String(n.scope || "").trim();
        const scope = recScope === "global" || recScope === "__global__" ? "__global__" : recScope === "session" ? sid : (recScope || sid);
        E("참고이미지 업로드…");
        try {
          const res = await K("/v1/characters/ref", {
            method: "POST",
            body: {
              character_id: id,
              scope,
              session_id: sid,
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
        try { i.setAttribute("tabindex", "-1"); i.focus?.(); } catch {}
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
          const sid = String(t.lastScope?.sessionId || "");
          const recScope = String(n.scope || "").trim();
          const scope = recScope === "global" || recScope === "__global__" ? "__global__" : recScope === "session" ? sid : (recScope || sid);
          await K("/v1/characters/ref/clear", {
            method: "POST",
            body: {
              character_id: id,
              scope,
              session_id: sid
            }
          }, 15e3), paintRef("", !1), E("참고이미지 제거됨");
        } catch (err) {
          E(\`제거 실패: \${z(err?.message || err, 80)}\`);
        }
      }), i.querySelector("[data-ce-ref-refresh]")?.addEventListener("click", async (f) => {
        f.preventDefault(), f.stopPropagation();
        const id = String(n.id || "");
        if (!id) return;
        try {
          const sid = String(t.lastScope?.sessionId || "");
          const recScope = String(n.scope || "").trim();
          const scope = recScope === "global" || recScope === "__global__" ? "__global__" : recScope === "session" ? sid : (recScope || sid);
          E("참고이미지 새로고침…");
          const res = await K("/v1/characters/ref/hydrate", {
            method: "POST",
            body: { character_id: id, scope, session_id: sid }
          }, 3e4);
          const row = [...(res?.session || []), ...(res?.global || [])].find((c) => String(c.id || "") === id);
          paintRef(row?.preview_url || "", !!row?.configured);
          E(row?.configured ? "참고이미지 연결됨" : "참고이미지 없음");
        } catch (err) {
          E(\`새로고침 실패: \${z(err?.message || err, 80)}\`);
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
        const ae = document.activeElement, tag = String(ae?.tagName || "").toLowerCase();
        if (tag === "textarea" || tag === "input" || ae?.isContentEditable) return;
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
  `    }), i.addEventListener("paste", async (f) => {
      const ae = f.target || document.activeElement, tag = String(ae?.tagName || "").toLowerCase();
      if (tag === "textarea" || tag === "input" || ae?.isContentEditable) return;
      const x = Array.from(f.clipboardData?.items || []).find((R) => R.type.startsWith("image/"));
      if (!x) return;
      const I = x.getAsFile();
      if (!I) return;
      if (t.charRefFocus?.scope === "modal" && t.charRefFocus?.id === "char-edit") {
        const run = t.charEditUi?.uploadRef;
        if (typeof run != "function") return;
        f.preventDefault(), f.stopPropagation();
        await run(I);
        return;
      }
      if (!(t.autotagFocus?.scope === "modal" && t.autotagFocus?.id === "char-edit")) return;
      f.preventDefault(), f.stopPropagation();
      await d(I);
    });
    const U = async () => {`;

const VENDOR_CHAR_EDIT_UI_PASTE_NEEDLE =
  `    }), t.charEditUi = {
      root: i,
      entryName: e.name,
      openedContainer: r,
      roster: n,
      entry: e
    };
    try {
      s?.focus?.();
    } catch {
    }`;
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
    t._ceUploadRef = null;
    try {
      i.setAttribute("tabindex", "-1");
      const grab = () => { try { (p || s || i).focus?.(); } catch {} };
      grab();
      if (typeof requestAnimationFrame == "function") requestAnimationFrame(() => { grab(); setTimeout(grab, 80); });
      else setTimeout(grab, 80);
    } catch {}
    if (!t._modalHostPasteBound) {
      t._modalHostPasteBound = !0;
      try {
        const host = window.parent && window.parent !== window ? window.parent : null;
        host && host.addEventListener("paste", async (ev) => {
          if (!t.charEditUi?.root?.isConnected && !t.charCreateUi?.root?.isConnected) return;
          const focus = t.charRefFocus?.scope === "modal" ? t.charRefFocus : t.autotagFocus?.scope === "modal" ? t.autotagFocus : null;
          if (!focus) return;
          const item = Array.from(ev.clipboardData?.items || []).find((R) => R.type.startsWith("image/"));
          if (!item) return;
          const file = item.getAsFile();
          if (!file) return;
          ev.preventDefault();
          try { ev.stopPropagation(); } catch {}
          const id = String(focus.id || "");
          if (t.charRefFocus?.scope === "modal" && t.charRefFocus?.id === id) {
            const run = id === "char-edit" ? t.charEditUi?.uploadRef : null;
            if (typeof run == "function") await run(file);
            return;
          }
          const run = id === "char-edit" ? t.charEditUi?.runAutotag : id === "char-create" ? t.charCreateUi?.runAutotag : null;
          if (typeof run == "function") await run(file);
        }, !0);
      } catch {}
    }`;

/** Create modal: same window-paste routing as edit. */
const VENDOR_CHAR_EDIT_AUTOTAG_ARM_NEEDLE =
  `    }), b?.addEventListener("click", (f) => {
      f.preventDefault(), f.stopPropagation();
      const x = t.autotagFocus?.scope === "modal" && t.autotagFocus?.id === "char-edit";
      j(!x);
    }),`;
const VENDOR_CHAR_EDIT_AUTOTAG_ARM_PATCH =
  `    }), b?.addEventListener("click", (f) => {
      f.preventDefault(), f.stopPropagation();
      const x = t.autotagFocus?.scope === "modal" && t.autotagFocus?.id === "char-edit";
      j(!x);
      try { i.setAttribute("tabindex", "-1"); if (!x) i.focus?.(); } catch {}
    }),`;

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
  `          <div class="row" style="margin-top:12px;flex-wrap:wrap;gap:8px"><button id="nx-save-dash" data-nx-help-id="nx-save-dash">대시보드 저장</button><button id="nx-reset-windows" class="secondary" type="button" data-nx-help-id="nx-reset-windows">창위치 초기화</button><button id="nx-reset-settings" class="secondary" type="button" data-nx-help-id="nx-reset-settings">전체 초기화</button><button id="nx-reset-char-refs" class="secondary" type="button" data-nx-help-id="nx-reset-char-refs">레퍼런스 이미지 초기화</button><button id="nx-migrate-legacy" class="secondary" type="button" data-nx-help-id="nx-migrate-legacy">2.4 데이터 이전<span id="nx-migrate-dot" style="display:none;margin-left:6px;color:#fbbf24">●</span></button></div>`;

const VENDOR_CHAR_IMPORT_EVT_NEEDLE =
  `    }), document.getElementById("nx-char-add-global")?.addEventListener("click", async () => {`;
const VENDOR_CHAR_IMPORT_EVT_PATCH =
  `    }), (async () => {
      const openCharImport = async (kind) => {
        const scope = await Z().catch(() => ({}));
        const cid = String(scope.characterId || t.lastScope?.characterId || "").trim();
        const qk = kind === "persona"
          ? "/v1/characters/import-picker?kind=persona"
          : "/v1/characters/import-picker?kind=session&character_id=" + encodeURIComponent(cid);
        let data = { items: [], lore_empty: !1 };
        try {
          data = await K(qk, { method: "GET" }, 15e3) || data;
        } catch (err) {
          t.uiMessage = { type: "error", text: z(err?.message || err) };
          await P();
          return;
        }
        const items = Array.isArray(data.items) ? data.items : [];
        document.getElementById("nx-char-import-modal")?.remove?.();
        const veil = document.createElement("div");
        veil.id = "nx-char-import-modal";
        veil.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:12px";
        const loreEmpty = data.lore_empty && kind !== "persona";
        const rows = items.map((it) => {
          const id = String(it.id || "");
          const nm = h(it.name || id);
          const bd = h(it.badge || "");
          const pv = h(it.preview || "");
          return \`<label data-imp-row style="display:flex;gap:8px;align-items:flex-start;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08);cursor:pointer"><input type="checkbox" data-imp-pick data-kind="\${h(it.kind)}" data-id="\${h(id)}"><span style="flex:1;min-width:0"><strong>\${nm}</strong> <span class="muted">\${bd}</span><div class="muted" style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">\${pv}</div></span></label>\`;
        }).join("") || '<div class="muted">항목 없음</div>';
        veil.innerHTML = \`<div style="background:#1b2330;border-radius:14px;width:min(560px,100%);height:min(86vh,720px);display:flex;flex-direction:column;padding:14px;box-sizing:border-box">
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><strong>\${kind==="persona"?"페소에서 (글로벌)":"가져오기"}</strong>
            <button type="button" class="secondary" data-imp-all>전체선택</button>
            <button type="button" class="secondary" data-imp-none>전체해제</button>
            <button type="button" class="secondary" data-imp-close style="margin-left:auto">닫기</button></div>
          \${loreEmpty ? '<div class="notice info" style="margin-top:8px">캐릭터 로어북이 비어 있습니다. 탭에서 자동채우기를 먼저 하세요.</div>' : ""}
          <div style="position:relative;margin-top:10px">
            <input type="text" data-imp-q placeholder="제목, 키, 내용" autocomplete="off" style="width:100%;box-sizing:border-box;padding:8px 36px 8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:#121821;color:#e8eef7">
            <button type="button" data-imp-q-clear aria-label="검색 지우기" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);display:none;width:28px;height:28px;border:0;border-radius:8px;background:transparent;color:#c9d4e6;cursor:pointer;font-size:18px;line-height:1">×</button>
          </div>
          <div data-imp-list style="overflow:auto;flex:1;margin-top:10px">\${rows}<div data-imp-empty class="muted" style="display:none;padding:12px 0">검색 결과 없음</div></div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px">
            <label class="toggle-row" style="margin:0"><input type="checkbox" data-imp-parallel><span>동시 요청</span></label>
            <label class="toggle-row" style="margin:0"><input type="checkbox" data-imp-xnai><span>lb-xnai.lb.extra</span></label>
            <button type="button" data-imp-fill>채우기</button>
          </div></div>\`;
        (t.uiRoot || document.body).appendChild(veil);
        const boxes = () => [...veil.querySelectorAll("[data-imp-pick]")];
        const visibleBoxes = () => boxes().filter((b) => {
          const row = b.closest("[data-imp-row]");
          return row && row.style.display !== "none";
        });
        const hay = items.map((it) => [it.name, it.badge, it.preview, Array.isArray(it.keys) ? it.keys.join(" ") : (it.keys || ""), it.text || ""].join(" ").toLowerCase());
        const inp = veil.querySelector("[data-imp-q]");
        const clr = veil.querySelector("[data-imp-q-clear]");
        const emptyEl = veil.querySelector("[data-imp-empty]");
        const applyQ = () => {
          const raw = String(inp?.value || "").trim().toLowerCase();
          const toks = raw.split(/\\s+/).filter(Boolean);
          if (clr) clr.style.display = raw ? "" : "none";
          let shown = 0;
          veil.querySelectorAll("[data-imp-row]").forEach((el, i) => {
            const ok = !toks.length || toks.every((w) => (hay[i] || "").includes(w));
            el.style.display = ok ? "" : "none";
            if (ok) shown += 1;
          });
          if (emptyEl) emptyEl.style.display = items.length && !shown ? "" : "none";
        };
        inp?.addEventListener("input", applyQ);
        clr?.addEventListener("click", () => { if (inp) inp.value = ""; applyQ(); inp?.focus?.(); });
        veil.querySelector("[data-imp-close]")?.addEventListener("click", () => veil.remove());
        veil.addEventListener("click", (e) => { if (e.target === veil) veil.remove(); });
        veil.querySelector("[data-imp-all]")?.addEventListener("click", () => visibleBoxes().forEach((b) => b.checked = !0));
        veil.querySelector("[data-imp-none]")?.addEventListener("click", () => visibleBoxes().forEach((b) => b.checked = !1));
        veil.querySelector("[data-imp-fill]")?.addEventListener("click", async () => {
          const picks = boxes().filter((b) => b.checked).map((b) => ({ kind: b.getAttribute("data-kind"), id: b.getAttribute("data-id") }));
          if (!picks.length) return;
          const btn = veil.querySelector("[data-imp-fill]");
          const par = !!veil.querySelector("[data-imp-parallel]")?.checked;
          const xnai = !!veil.querySelector("[data-imp-xnai]")?.checked;
          if (btn) { btn.disabled = !0; btn.textContent = "채우는 중…"; }
          try {
            const res = await K("/v1/characters/import-fill", { method: "POST", body: {
              scope: kind === "persona" ? "__global__" : (scope.sessionId || ""),
              session_id: scope.sessionId || "",
              character_id: cid,
              global: kind === "persona",
              parallel: par,
              xnai,
              picks
            } }, 16e4);
            const msg = [res?.filled != null ? (res.filled + " 채움") : "", (res?.failed||[]).length ? (res.failed.length + " 실패") : "", res?.message || ""].filter(Boolean).join(" · ");
            t.uiMessage = { type: (res?.failed||[]).length ? "error" : "success", text: msg || "완료" };
            veil.remove();
            await ce(scope.sessionId || "", !0);
            await P();
          } catch (err) {
            t.uiMessage = { type: "error", text: z(err?.message || err) };
            if (btn) { btn.disabled = !1; btn.textContent = "채우기"; }
            await P();
          }
        });
      };
      document.getElementById("nx-char-import-session")?.addEventListener("click", async (ev) => {
        ev.preventDefault();
        await openCharImport("session");
      });
      document.getElementById("nx-char-import-global")?.addEventListener("click", async (ev) => {
        ev.preventDefault();
        await openCharImport("persona");
      });
    })(), document.getElementById("nx-char-add-global")?.addEventListener("click", async () => {`;

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
          <button id="nx-char-import-session" class="secondary">가져오기</button>
          <button id="nx-save-chars">저장</button>
          <button id="nx-export-session-chars" class="secondary">EXPORT</button>
          <button id="nx-import-session-chars" class="secondary">IMPORT</button>
          <input id="nx-import-session-chars-file" type="file" accept=".json,application/json,text/plain" style="display:none">
          \${Nn ? '<button id="nx-unify-rebuild" class="secondary">다시 모으기</button>' : ""}
          <label class="toggle-row" style="margin:0;white-space:nowrap"><input type="checkbox" id="nx-unified-winners" \${t.backendSettings?.card?.unified_winners_only ? "checked" : ""}><span>승자만 보기</span></label>
        </div>
        <div class="prompt-group-label" style="margin-top:18px">글로벌 캐릭터</div>
        <div class="notice info" style="margin-bottom:10px">글로벌 캐릭터는 모든 채팅에서 공유됩니다. 특정 챗에서만 끄려면 카드를 펼쳐 「이 캐릭터 챗에서 사용」을 해제하세요.</div>
        <div id="nx-char-global-list">\${x}</div>
        <div class="row" style="margin-top:10px;flex-wrap:wrap;gap:8px">
          <button id="nx-char-add-global" class="secondary">추가</button>
          <button id="nx-char-import-global" class="secondary">페소에서</button>
          <button id="nx-save-global-chars">저장</button>
          <button id="nx-export-global-chars" class="secondary">EXPORT</button>
          <button id="nx-import-global-chars" class="secondary">IMPORT</button>
          <input id="nx-import-global-chars-file" type="file" accept=".json,application/json,text/plain" style="display:none">
          <button id="nx-refresh-chars" class="secondary">새로고침</button>
        </div>\`;`;

const VENDOR_UNIFIED_SCOPE_CE_NEEDLE =
  `      i.unified && await ensureUnifiedRoster(i), await ce(i.sessionId, !0), t.gallerySessionId = i.sessionId || "";`;
const VENDOR_UNIFIED_SCOPE_CE_PATCH =
  `      i.unified && await ensureUnifiedRoster(i), await ce(i.sessionId, !0), i.unified && await ensureUnifiedRoster(i), t.gallerySessionId = i.sessionId || "";`;

const VENDOR_UNIFIED_REFRESH_CE_NEEDLE =
  `      a.unified && await ensureUnifiedRoster(a), await ce(a.sessionId), await P();`;
const VENDOR_UNIFIED_REFRESH_CE_PATCH =
  `      a.unified && await ensureUnifiedRoster(a), await ce(a.sessionId), a.unified && await ensureUnifiedRoster(a), await P();`;

const VENDOR_UNIFIED_REBUILD_CE_NEEDLE =
  `        await ensureUnifiedRoster(a), await ce(a.sessionId), t.uiMessage = {
          type: "success",
          text: "통합 챗 캐릭터를 다시 모았습니다"
        }, await P();`;
const VENDOR_UNIFIED_REBUILD_CE_PATCH =
  `        await ensureUnifiedRoster(a), await ce(a.sessionId), await ensureUnifiedRoster(a), t.uiMessage = {
          type: "success",
          text: "통합 챗 캐릭터를 다시 모았습니다"
        }, await P();`;

const VENDOR_UNIFIED_SAVE_REBUILD_NEEDLE =
  `        t.charactersSession = i?.characters || r, t.appearance = i?.appearance || {}, t._charsDirty = !1, t.uiMessage = {
          type: "success",
          text: a.unified ? "채팅 캐릭터 저장됨 · 원본 채팅에 반영" : "채팅 캐릭터 저장됨"
        };`;
const VENDOR_UNIFIED_SAVE_REBUILD_PATCH =
  `        t.charactersSession = i?.characters || r, t.appearance = i?.appearance || {}, t._charsDirty = !1, t.uiMessage = {
          type: "success",
          text: a.unified ? "채팅 캐릭터 저장됨 · 원본 채팅에 반영" : "채팅 캐릭터 저장됨"
        };
        a.unified && await ensureUnifiedRoster(a);`;

const VENDOR_UNIFIED_WINNERS_EVT_NEEDLE =
  `    }), document.getElementById("nx-unify-rebuild")?.addEventListener("click", async () => {`;
const VENDOR_UNIFIED_WINNERS_EVT_PATCH =
  `    }), document.getElementById("nx-unified-winners")?.addEventListener("change", async () => {
      const on = ee("nx-unified-winners");
      try {
        t.backendSettings && (t.backendSettings.card = {
          ...t.backendSettings.card,
          unified_winners_only: on
        });
        await pe({ card: { unified_winners_only: on } });
        const a = await Z();
        a.unified && await ensureUnifiedRoster(a);
      } catch {
      }
      await P();
    }), document.getElementById("nx-unify-rebuild")?.addEventListener("click", async () => {`;

const VENDOR_RESET_HELP_NEEDLE =
  `    "nx-reset-windows": { title: "창 위치 초기화", body: "뷰어·접힘 아이콘·핀이 화면 밖으로 나가 안 보일 때 기본 위치로 되돌립니다." },
    "nx-reset-settings": { title: "모든 설정 초기화", body: "카드·LLM·NAI 등 설정을 기본값으로 되돌립니다. API 키·창 위치·카드 프리셋은 유지됩니다." },`;
const VENDOR_RESET_HELP_PATCH =
  `    "nx-reset-windows": { title: "창위치 초기화", body: "뷰어·접힘 아이콘·핀이 화면 밖으로 나가 안 보일 때 기본 위치로 되돌립니다." },
    "nx-reset-settings": { title: "전체 초기화", body: "카드·LLM·NAI 등 설정을 기본값으로 되돌립니다. API 키·창 위치·카드 프리셋은 유지됩니다." },
    "nx-reset-char-refs": { title: "레퍼런스 이미지 초기화", body: "모든 캐릭터 참고이미지 해시를 지우고, 기기 IDB와 Inlay 모듈 에셋을 삭제합니다. 설정은 유지됩니다." },
    "nx-migrate-legacy": { title: "2.4 데이터 이전", body: "2.4까지 쓰던 이미지 저장 방식을 2.5 방식으로 옮깁니다. 켤 때마다 하던 전체 점검이 사라져 부팅이 빨라지고, Risu 세이브파일도 가벼워집니다. 옮긴 뒤 옛 원본은 지워지므로 2.4로는 되돌릴 수 없습니다. 남은 장수가 있으면 버튼에 점이 붙습니다." },`;

const VENDOR_RESET_CHAR_REF_EVT_NEEDLE =
  `    }), document.getElementById("nx-reset-settings")?.addEventListener("click", async () => {
      if (!globalThis.confirm?.("정말로 모든 설정을 기본값으로 초기화할까요?`;
const VENDOR_RESET_CHAR_REF_EVT_PATCH =
  `    }), document.getElementById("nx-reset-char-refs")?.addEventListener("click", async () => {
      if (!globalThis.confirm?.("모든 레퍼런스 이미지를 삭제할까요?\\n\\n캐릭터 해시, 기기 저장, Inlay 모듈 에셋이 지워집니다. 설정은 유지됩니다.")) return;
      try {
        const a = await K("/v1/characters/ref/reset", { method: "POST", body: {} }, 6e4);
        t._charRefHydratedFor = "";
        for (const list of [t.charactersSession, t.charactersGlobal]) {
          for (const c of list || []) c.ref_configured = !1, c.ref_preview_url = "", c.ref_hash = "";
        }
        t.uiMessage = { type: "success", text: "레퍼런스 이미지를 모두 지웠습니다" };
        $e("레퍼런스 초기화");
      } catch (a) {
        t.uiMessage = { type: "error", text: z(a?.message || a) };
      }
      await P();
    }), (() => {
      const btn = document.getElementById("nx-migrate-legacy");
      if (!btn) return;
      const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
      const setDot = (n) => {
        const dot = document.getElementById("nx-migrate-dot");
        dot && (dot.style.display = n > 0 ? "" : "none", dot.title = n > 0 ? n + "장 남음" : "");
      };
      const PHASES = { idle: "대기", images: "이미지 이전", cleanup: "정리", purge: "옛 데이터 삭제", done: "완료", cancelled: "중단됨", error: "오류" };
      const render = (st, note) => {
        const box = document.getElementById("nx-migrate-body");
        if (!box) return;
        const total = Number(st?.total || 0), done = Number(st?.done || 0), failed = Number(st?.failed || 0);
        const pct = total > 0 ? Math.round(100 * done / total) : st?.running ? 6 : 100;
        const mb = (Number(st?.freed_bytes || 0) / 1048576).toFixed(1);
        const bar = globalThis.__INLAY_VIEWER_CORE__?.composeSingleProgressBarHtml?.({
          pct, busy: st?.running, error: st?.phase === "error", tone: "index",
        }) || "";
        box.innerHTML = '<div style="font-weight:700">' + esc(PHASES[String(st?.phase || "idle")] || st?.phase) + "</div>"
          + '<div class="muted" style="font-size:12px;margin:4px 0">' + done + " / " + total + " 장"
          + (failed ? " · 실패 " + failed : "") + " · 확보 " + mb + " MB</div>"
          + '<div style="margin:8px 0">' + bar + "</div>"
          + (st?.error ? '<div style="color:#f87171;font-size:12px">' + esc(st.error) + "</div>" : "")
          + (note ? '<div class="muted" style="font-size:12px">' + esc(note) + "</div>" : "");
      };
      K("/v1/storage/migrate/status", { method: "GET" }, 15e3)
        .then((r) => setDot(Number(r?.pending_images || 0)))
        .catch(() => {});
      btn.addEventListener("click", async () => {
        if (!globalThis.confirm?.("2.4 데이터를 2.5 형식으로 옮길까요?\\n\\n옛 이미지 원본은 옮긴 뒤 삭제됩니다. 2.4로는 되돌릴 수 없습니다.")) return;
        document.getElementById("nx-migrate-modal")?.remove?.();
        const veil = document.createElement("div");
        veil.id = "nx-migrate-modal";
        veil.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:12px";
        veil.innerHTML = '<div style="background:#1b2330;border-radius:14px;width:min(420px,100%);padding:16px;box-sizing:border-box">'
          + '<div style="display:flex;gap:8px;align-items:center"><strong>2.4 데이터 이전</strong>'
          + '<button type="button" class="secondary" data-mig-cancel style="margin-left:auto">중단</button>'
          + '<button type="button" class="secondary" data-mig-close>닫기</button></div>'
          + '<div id="nx-migrate-body" style="margin-top:12px"><div class="muted">준비 중…</div></div></div>';
        document.body.appendChild(veil);
        veil.querySelector("[data-mig-close]")?.addEventListener("click", () => veil.remove());
        veil.querySelector("[data-mig-cancel]")?.addEventListener("click", () => {
          K("/v1/storage/migrate/cancel", { method: "POST", body: {} }, 15e3).catch(() => {});
        });
        let st = null;
        try {
          st = (await K("/v1/storage/migrate", { method: "POST", body: {} }, 6e4))?.status || null;
          render(st, "");
          // Closing the modal only stops the polling; the run itself continues,
          // which is why cancel is a separate button.
          while (st?.running && document.getElementById("nx-migrate-modal")) {
            await new Promise((r) => setTimeout(r, 400));
            const info = await K("/v1/storage/migrate/status", { method: "GET" }, 15e3);
            st = info?.status || st;
            setDot(Number(info?.pending_images || 0));
            render(st, "");
          }
          render(st, st?.failed ? "실패한 장은 옛 저장소에 그대로 있습니다. 다시 눌러 이어서 할 수 있습니다." : "");
          t.uiMessage = st?.phase === "error"
            ? { type: "error", text: z(st?.error || "데이터 이전 실패") }
            : { type: "success", text: st?.phase === "done" ? "데이터 이전 완료" : "데이터 이전 " + (PHASES[String(st?.phase || "")] || "") };
        } catch (a) {
          t.uiMessage = { type: "error", text: z(a?.message || a) };
        }
        await P();
      });
    })(), document.getElementById("nx-reset-settings")?.addEventListener("click", async () => {
      if (!globalThis.confirm?.("정말로 모든 설정을 기본값으로 초기화할까요?`;

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
.char-meta-row{display:grid;grid-template-columns:1.3fr 1.2fr .7fr .55fr;gap:8px;align-items:end}
.char-looks-row{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px}
.char-meta-row input,.char-meta-row select,.char-looks-row input,.char-looks-row select{min-height:34px}
@media(max-width:700px){.char-meta-row{grid-template-columns:1fr 1fr}.char-looks-row{grid-template-columns:repeat(3,minmax(0,1fr))}}
[data-char-costume] option,[data-ce-costume] option{color:#e8eef8!important;background:#0b0f18!important}`;

/** Beta: message-bubble inline illustrations at LLM `line` (click/hash timing only). */
const VENDOR_INLINE_HELP_NEEDLE =
  `    "nx-overlay": { title: "채팅 왼쪽 줄 오버레이", body: "채팅 왼쪽에 핀과 이미지를 함께 둡니다. 스크롤하는 동안에도 지금 읽는 구간의 이미지를 계속 보여 줍니다. 짧게 누르면 이미지를 숨기고, 핀을 누르면 다시 나타납니다. 길게 누르면 크게보기와 태그·재생성·리롤·캐릭터 칩 메뉴가 열립니다." },`;
const VENDOR_INLINE_HELP_PATCH =
  `    "nx-overlay": { title: "채팅 왼쪽 줄 오버레이", body: "채팅 왼쪽 핀·스티키 이미지를 보여 줍니다. 꺼도 내부 동기화는 유지하고, 상시 이미지 0% + 핀을 화면 밖으로 치워 가려 둡니다(꺼서 통째로 뜯으면 렉이 나서). 메시지 클릭·말풍선 삽화는 그대로입니다." },
    "nx-inline-chat": { title: "이미지 채팅에", body: "선택 기준에서 설정한 탐색 숫자만큼 위·아래의 char 말풍선을 유지합니다. 유저·라이트보드(본문 30자 이하)는 건너뜁니다. 켜면 스티키 활성 이미지는 마우스에 가장 가까운 샷을 우선합니다. 길게 누르면 크게보기/태그·재생성·리롤 메뉴. 「모든 메시지 이미지 생성」이 켜지면 선택 옆도 역할 무관하되 라이트보드는 건너뜁니다. 나머지는 지워서 메모리를 막습니다. 배율(%)은 기본 100(말풍선 폭 약 78%·높이 상한 70vh)이며 25–200으로 조절합니다." },
    "nx-inline-msg-actions": { title: "메시지 안에 생성 버튼", body: "사용안함 / 편의성(오류율 있음 · 2.4.7, 칩을 본문 위에 붙임) / 호환성(2.4.9, 본문 문단에만 붙임). 헤더가 비면 채팅 카드 복구를 쓰세요. 태그=LLM 태그 재생성, 재생성=첫 생성 또는 전체 리롤, 중단=남은 생성 멈추기, 캐릭터=메시지에서 트리거된 캐릭터 태그 수정, 프리셋=설정 스타일 프리셋 탭." },
    "nx-inline-chat-scale": { title: "이미지 채팅 배율 (%)", body: "말풍선 안 삽화 크기입니다. 100%가 기본(폭 약 78%·높이 상한 70vh)이고, 50%면 약 절반, 150%면 더 크게 보입니다. 말풍선 폭을 넘지 않습니다." },
    "nx-inline-dom-radius": { title: "스피너 DOM 탐색 숫자", body: "선택한 메시지 기준으로 위·아래에서 유지할 적격 말풍선 수입니다. 기본 4, 범위 3–20입니다. 유저와 본문 30자 이하 메시지는 건너뜁니다." },
    "nx-progress-toast": { title: "진행 토스트", body: "생성/리롤=보라. 인덱싱(민트)=지금 고른 메시지 이미지 준비만(갤러리 전체 워밍은 표시 안 함). 선택 알림은 별도 토스트. 칩·샷을 꽂기 직전에는 조각 불러오는 중 스피너가 같은 자리에 뜹니다." },
    "nx-toast-anchor": { title: "토스트 위치", body: "진행·선택·알림·조각 로딩 토스트가 붙는 화면 모서리입니다. 기본은 중상단입니다." },
    "nx-image-press": { title: "이미지 크게보기", body: "인라인·스티키 샷을 크게 봅니다. 사용안함 / 더블 탭(이미지 위 빠른 두 번) / 트리플 탭(빠른 세 번) / 꾸욱 누르기 / 꾸욱 누르기 + 더블탭. 탐색기·메시지 선택 길게 누르기는 그대로입니다." },
    "nx-nai4-fallback": { title: "할당량 끝나면 NAI4 폴백", body: "V5 샷이 할당량(402)으로 실패하면 그 샷만 V4.5와 NAI4 프리셋으로 다시 뽑습니다. V5 자연어·대사는 빼입니다." },
    "nx-nai5-speech": { title: "NAI5 대사삽입", body: "V5 샷에서 말한 캐릭터의 캡션 끝에 말풍선을 넣습니다. 여러 명이 말하면 각자 자기 대사만 가집니다. 프리셋의 spoken bubble 억제는 그 샷에서 빼입니다." },`;

const VENDOR_INLINE_TOGGLE_NEEDLE =
  `            <label class="toggle-row" data-nx-help-id="nx-overlay"><input type="checkbox" id="nx-overlay" \${i.overlay_markers !== !1 ? "checked" : ""}><span>채팅 왼쪽 줄 오버레이</span></label>`;
const VENDOR_INLINE_TOGGLE_PATCH =
  `            <label class="toggle-row" data-nx-help-id="nx-overlay"><input type="checkbox" id="nx-overlay" \${i.overlay_markers !== !1 ? "checked" : ""}><span>채팅 왼쪽 줄 오버레이</span></label>
            <label class="toggle-row" data-nx-help-id="nx-inline-chat"><input type="checkbox" id="nx-inline-chat" \${i.inline_chat_images ? "checked" : ""}><span>이미지 채팅에</span></label>
            <label data-nx-help-id="nx-inline-msg-actions"><span>메시지 안에 생성 버튼</span>
              <select id="nx-inline-msg-actions">
                <option value="off" \${(i.inline_msg_actions || "off") === "off" ? "selected" : ""}>사용안함</option>
                <option value="legacy" \${i.inline_msg_actions === "legacy" ? "selected" : ""}>편의성 (오류율 있음 · 2.4.7)</option>
                <option value="compat" \${i.inline_msg_actions === "compat" ? "selected" : ""}>호환성 (2.4.9)</option>
              </select>
            </label>
            <label data-nx-help-id="nx-inline-chat-scale"><span>이미지 채팅 배율 (%)</span>
              <input id="nx-inline-chat-scale" type="number" min="25" max="200" step="5" value="\${h(i.inline_chat_scale_pct ?? 100)}">
            </label>
            <label data-nx-help-id="nx-inline-dom-radius"><span>스피너 DOM 탐색 숫자</span>
              <input id="nx-inline-dom-radius" type="number" min="3" max="20" step="1" value="\${h(i.inline_chat_dom_radius ?? 4)}">
            </label>
            <label class="toggle-row" data-nx-help-id="nx-progress-toast"><input type="checkbox" id="nx-progress-toast" \${i.progress_toast ? "checked" : ""}><span>진행 토스트</span></label>
            <label data-nx-help-id="nx-toast-anchor"><span>토스트 위치</span>
              <select id="nx-toast-anchor">
                <option value="tl" \${(i.toast_anchor || "tc") === "tl" ? "selected" : ""}>좌상단</option>
                <option value="bl" \${i.toast_anchor === "bl" ? "selected" : ""}>좌하단</option>
                <option value="tr" \${i.toast_anchor === "tr" ? "selected" : ""}>우상단</option>
                <option value="br" \${i.toast_anchor === "br" ? "selected" : ""}>우하단</option>
                <option value="tc" \${!i.toast_anchor || i.toast_anchor === "tc" ? "selected" : ""}>중상단</option>
              </select>
            </label>
            <label data-nx-help-id="nx-image-press"><span>이미지 크게보기</span>
              <select id="nx-image-press">
                <option value="off" \${i.image_press_inspect === "off" ? "selected" : ""}>사용안함</option>
                <option value="two" \${i.image_press_inspect === "two" ? "selected" : ""}>더블 탭</option>
                <option value="three" \${i.image_press_inspect === "three" ? "selected" : ""}>트리플 탭</option>
                <option value="hold" \${!i.image_press_inspect || i.image_press_inspect === "hold" ? "selected" : ""}>꾸욱 누르기</option>
                <option value="both" \${i.image_press_inspect === "both" ? "selected" : ""}>꾸욱 누르기 + 더블탭</option>
              </select>
            </label>
            <label class="toggle-row" data-nx-help-id="nx-nai4-fallback"><input type="checkbox" id="nx-nai4-fallback" \${i.nai4_fallback ? "checked" : ""}><span>할당량 끝나면 NAI4 폴백</span></label>
            <label class="toggle-row" data-nx-help-id="nx-nai5-speech"><input type="checkbox" id="nx-nai5-speech" \${i.nai5_speech ? "checked" : ""}><span>NAI5 대사삽입</span></label>`;

const VENDOR_INLINE_SAVE_NEEDLE =
  `      overlay_markers: ee("nx-overlay"),`;
const VENDOR_INLINE_SAVE_PATCH =
  `      overlay_markers: ee("nx-overlay"),
      inline_chat_images: ee("nx-inline-chat"),
      inline_msg_actions: (typeof globalThis.__INLAY_VIEWER_CORE__?.normalizeInlineMsgActions == "function" ? globalThis.__INLAY_VIEWER_CORE__.normalizeInlineMsgActions(N("nx-inline-msg-actions")) : String(N("nx-inline-msg-actions") || "off")),
      inline_chat_scale_pct: Math.max(25, Math.min(200, Math.round(Ne(N("nx-inline-chat-scale"), 100)) || 100)),
      inline_chat_dom_radius: Math.max(3, Math.min(20, Math.round(Ne(N("nx-inline-dom-radius"), 4)) || 4)),
      progress_toast: ee("nx-progress-toast"),
      toast_anchor: (typeof globalThis.__INLAY_VIEWER_CORE__?.normalizeToastAnchor == "function" ? globalThis.__INLAY_VIEWER_CORE__.normalizeToastAnchor(N("nx-toast-anchor")) : String(N("nx-toast-anchor") || "tc")),
      image_press_inspect: (typeof globalThis.__INLAY_VIEWER_CORE__?.normalizeImagePressInspect == "function" ? globalThis.__INLAY_VIEWER_CORE__.normalizeImagePressInspect(N("nx-image-press")) : String(N("nx-image-press") || "hold")),
      nai4_fallback: ee("nx-nai4-fallback"),
      nai5_speech: ee("nx-nai5-speech"),`;

const VENDOR_DE_STRIP_NEEDLE =
  `  async function De(e) {
    try {
      if (typeof e.getInnerHTML == "function") return w(ln(await e.getInnerHTML()), 1e5);
    } catch {
    }`;
const VENDOR_DE_STRIP_PATCH =
  `  async function De(e) {
    try {
      const hit = t._deTextCache;
      if (hit && hit.el === e && Date.now() - hit.at < 120) return hit.text;
      const body = typeof e?.querySelector == "function" ? await e.querySelector(".leading-relaxed") : null;
      const src = body && typeof body.getInnerHTML == "function" ? body : e;
      if (typeof src.getInnerHTML == "function") {
        let html = String(await src.getInnerHTML() || "");
        const VC = globalThis.__INLAY_VIEWER_CORE__;
        if (typeof VC?.stripInlayInlineHtml == "function") html = VC.stripInlayInlineHtml(html);
        const text = w(ln(html), 1e5);
        t._deTextCache = { el: e, at: Date.now(), text };
        return text;
      }
    } catch {
    }`;

const VENDOR_IE_FN_NEEDLE =
  `  function Ie(e) {
    try {
      const N = globalThis.__INLAY_NATIVE__;
      const u = N?.resolveImageUrl?.(e) || e?.image_url;
      // DOMPurify keeps data:image, strips blob:. Never use blob: or localhost backend.
      if (typeof u == "string" && /^data:image\\//i.test(u)) return u;
    } catch {
    }
    return "";
  }
  /** Warm a card to a DOMPurify-safe data:image URL (Risu strips blob:/http). */
  async function ensureStickyCardImage(card) {
    if (!card?.id) return "";
    try {
      const N = globalThis.__INLAY_NATIVE__;
      let src = typeof N?.resolveImageUrl == "function" ? N.resolveImageUrl(card) || "" : "";
      if ((!src || !/^data:image\\//i.test(src)) && typeof N?.ensureImageUrl == "function") {
        src = await N.ensureImageUrl(card.id) || "";
        if (src) card.image_url = src;
      }
      if (typeof src == "string" && /^data:image\\//i.test(src)) return src;
    } catch {
    }
    try {
      const fallback = Ie(card);
      if (typeof fallback == "string" && /^data:image\\//i.test(fallback)) return fallback;
    } catch {
    }
    return "";
  }`;

const VENDOR_IE_FN_PATCH =
  `  function nxReadyImg(src) {
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    if (typeof VC?.isReadyImageSrc == "function") return VC.isReadyImageSrc(src);
    return typeof src == "string" && (/^data:image\\//i.test(src) || /^blob:/i.test(src));
  }
  function Ie(e) {
    try {
      const N = globalThis.__INLAY_NATIVE__;
      const u = N?.resolveImageUrl?.(e) || e?.image_url;
      // blob: is set via setAttribute after insert — SafeDOM strips it from setInnerHTML.
      if (nxReadyImg(u)) return typeof u == "string" ? u : "";
    } catch {
    }
    return "";
  }
  /** Warm a card to a display URL. blob: is applied with setAttribute, not innerHTML. */
  async function ensureStickyCardImage(card) {
    if (!card?.id) return "";
    try {
      const N = globalThis.__INLAY_NATIVE__;
      let src = typeof N?.resolveImageUrl == "function" ? N.resolveImageUrl(card) || "" : "";
      if (!nxReadyImg(src) && typeof N?.ensureImageUrl == "function") {
        src = await N.ensureImageUrl(card.id) || "";
        if (src) card.image_url = src;
      }
      if (nxReadyImg(src)) return src;
    } catch {
    }
    try {
      const fallback = Ie(card);
      if (nxReadyImg(fallback)) return fallback;
    } catch {
    }
    return "";
  }`;

const VENDOR_IE_READY_FB_NEEDLE = `typeof fb == "string" && /^data:image\\//i.test(fb)`;
const VENDOR_IE_READY_FB_PATCH = `nxReadyImg(fb)`;
const VENDOR_IE_READY_FRESH_NEEDLE = `typeof fresh == "string" && /^data:image\\//i.test(fresh)`;
const VENDOR_IE_READY_FRESH_PATCH = `nxReadyImg(fresh)`;

const VENDOR_STICKY_POOL_IMG_NEEDLE =
  `        const X = await H(n, "div", {
          style: "position:fixed;display:none;z-index:99970;",
          html: \`<img src="\${src}" style="width:100%;height:100%;object-fit:cover;display:block" />\`
        });
        await e.layer.appendChild(X);`;
const VENDOR_STICKY_POOL_IMG_PATCH =
  `        const X = await H(n, "div", {
          style: "position:fixed;display:none;z-index:99970;",
          html: \`<img src="" style="width:100%;height:100%;object-fit:cover;display:block" />\`
        });
        try {
          const img = typeof X.querySelector == "function" ? await X.querySelector("img") : null;
          if (img && typeof img.setAttribute == "function") await img.setAttribute("src", src);
        } catch {
        }
        await e.layer.appendChild(X);`;

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
  }
  async function nxWaitNewestDom(doc, maxMs) {
    // Character switch: Risu remounts the chat after we notice the session.
    // A fixed 250 ms is early on a phone and late on localhost. Ask for the
    // newest bubble until it exists, then stop — do not watch the whole tree.
    const cap = Number(maxMs) > 0 ? Number(maxMs) : 2000;
    const t0 = Date.now();
    while (Date.now() - t0 <= cap) {
      let root = doc;
      try {
        if (typeof qe == "function") root = await qe(doc) || doc;
      } catch {
        root = doc;
      }
      const newest = typeof dtNewest == "function" ? await dtNewest(root) : [];
      if (Array.isArray(newest) && newest.length) return newest;
      await new Promise((r) => setTimeout(r, 50));
    }
    return [];
  }
  async function dtNewest(e) {
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
    if (a.length) return [a[a.length - 1]];
    for (const n of $a) {
      const b = await unwrap(n);
      if (b.length) return [b[b.length - 1]];
    }
    return [];
  }`;

const VENDOR_DA_QA_NEEDLE =
  `    const i = qa(a, r.messages, e, Array.isArray(n) ? n.length : 0, { prevText, nextText }), l = w(i.role || "");`;
const VENDOR_DA_QA_PATCH =
  `    const nxApi = await nxChatAttrIndex(o);
    const i = qa(a, r.messages, e, Array.isArray(n) ? n.length : 0, { prevText, nextText, chatIndex: nxApi }), l = w(i.role || "");`;

const VENDOR_DA_SAME_CLICK_NEEDLE =
  `    const s = w(a), c = ye(s);
    if ((source === "scroll" || source === "text" || source === "provisional") && t.selectedMessage && Number(t.selectedMessage.domIndex) === Number(e) && t.selectedMessage.selectSource === source && t.selectedMessage.hash === c) return !0;`;
const VENDOR_DA_SAME_CLICK_PATCH =
  `    const s = w(a), c = ye(s);
    // A re-click on an intact selected bubble is a true no-op: no gallery read,
    // no sticky repaint, and most importantly no inline DOM or src write.
    if (source === "click" && t.selectedMessage && Number(t.selectedMessage.domIndex) === Number(e) && t.selectedMessage.hash === c && !t.pendingSessionId && t.selectedMessage.sessionId && t.selectedMessage.sessionId === t.lastScope?.sessionId && await nxBubbleHasInlineFrame(o, linkedCards(t.selectedMessage), nxPendingForInlineSelection(t.selectedMessage))) return !0;
    if ((source === "scroll" || source === "text" || source === "provisional") && t.selectedMessage && Number(t.selectedMessage.domIndex) === Number(e) && t.selectedMessage.selectSource === source && t.selectedMessage.hash === c) return !0;`;

const VENDOR_BIND_QA_NEEDLE =
  `      const c = qa(s, a?.messages || [], i, o.length);`;
const VENDOR_BIND_QA_PATCH =
  `      const nxApi = await nxChatAttrIndex(o[i]);
      const c = qa(s, a?.messages || [], i, o.length, { chatIndex: nxApi });`;

const VENDOR_INLINE_INJECT_FN_NEEDLE =
  `  async function ensureMessageInView(el) {`;
const VENDOR_INLINE_INJECT_FN_PATCH =
  `  function nxMsgAct() {
    const raw = t.backendSettings?.card?.inline_msg_actions;
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    if (typeof VC?.normalizeInlineMsgActions == "function") return VC.normalizeInlineMsgActions(raw);
    if (raw === "legacy") return "legacy";
    if (raw === true || raw === "compat" || raw === "true" || raw === 1) return "compat";
    return "off";
  }
  async function nxReadInlineShotId(node) {
    let id = "";
    try {
      if (node && typeof node.getAttribute == "function") {
        id = String(await node.getAttribute("x-inlay-inline-shot") || "");
      }
    } catch {
    }
    if (id) return id;
    try {
      const oh = typeof node?.getOuterHTML == "function" ? String(await node.getOuterHTML() || "") : "";
      const mm = /(?:data|x)-inlay-inline-shot="([^"]+)"/.exec(oh);
      if (mm) return mm[1];
    } catch {
    }
    return "";
  }
  async function nxQueryInlineFrames(root, unwrapSafe) {
    const unwrap = unwrapSafe || nxUnwrapSafeNodes;
    if (!root || typeof root.querySelectorAll != "function") return [];
    try {
      return await unwrap(await root.querySelectorAll("[x-inlay-inline-shot],[data-inlay-inline-shot]"));
    } catch {
      return [];
    }
  }
  async function nxAbandonInlineFrame(wrap) {
    if (!wrap) return;
    try {
      await nxDropInlineSubsForWrap(wrap);
    } catch {
    }
    try {
      if (typeof wrap.remove == "function") {
        await wrap.remove();
        return;
      }
    } catch {
    }
    try {
      if (typeof wrap.setAttribute == "function") await wrap.setAttribute("x-inlay-inline-duplicate", "1");
      const VC = globalThis.__INLAY_VIEWER_CORE__;
      if (typeof wrap.setStyleAttribute == "function" && typeof VC?.inlineChatFrameStyle == "function") {
        await wrap.setStyleAttribute(VC.inlineChatFrameStyle(!1));
      }
    } catch {
    }
  }
  /** Batched read of every inline marker in a bubble using SafeDOM-readable x-* metadata. */
  async function nxProbeInlineShots(msgEl, unwrapSafe) {
    const nodes = await nxQueryInlineFrames(msgEl, unwrapSafe);
    return Promise.all(nodes.map(async (node) => {
      let id = "";
      let slot = "";
      let layoutVersion = "";
      let ready = !1;
      let duplicate = !1;
      let owner = "";
      try {
        if (node && typeof node.getAttribute == "function") {
          const vals = await Promise.all([
            node.getAttribute("x-inlay-inline-shot"),
            node.getAttribute("x-inlay-inline-slot"),
            node.getAttribute("x-inlay-inline-layout"),
            node.getAttribute("x-inlay-inline-active"),
            node.getAttribute("x-inlay-inline-duplicate"),
            node.getAttribute("x-inlay-inline-owner")
          ]);
          id = String(vals[0] || "");
          slot = String(vals[1] || "");
          layoutVersion = String(vals[2] || "");
          const activeKey = String(vals[3] || "");
          duplicate = String(vals[4] || "") === "1";
          owner = String(vals[5] || "");
          const photos = await unwrapSafe(await node.querySelectorAll("[x-inlay-inline-cell],img[x-inlay-inline-layer]"));
          for (const photo of photos) {
            if (!photo || typeof photo.getAttribute != "function") continue;
            const [layer, live] = await Promise.all([
              photo.getAttribute("x-inlay-inline-layer"),
              photo.getAttribute("x-inlay-inline-live")
            ]);
            if (String(live || "") === "1" && (!activeKey || String(layer || "") === activeKey)) {
              ready = !0;
              break;
            }
          }
        }
        if (!id || !slot || !layoutVersion || !owner) {
          const oh = typeof node?.getOuterHTML == "function" ? String(await node.getOuterHTML() || "") : "";
          if (!id) {
            const mm = /(?:data|x)-inlay-inline-shot="([^"]+)"/.exec(oh);
            if (mm) id = mm[1];
          }
          if (!slot) {
            const mm = /(?:data|x)-inlay-inline-slot="([^"]+)"/.exec(oh);
            if (mm) slot = mm[1];
          }
          if (!layoutVersion) {
            const mm = /(?:data|x)-inlay-inline-layout="([^"]+)"/.exec(oh);
            if (mm) layoutVersion = mm[1];
          }
          if (!owner) {
            const mm = /x-inlay-inline-owner="([^"]+)"/.exec(oh);
            if (mm) owner = mm[1];
          }
          if (!duplicate) duplicate = /x-inlay-inline-duplicate="1"/.test(oh);
        }
      } catch {
      }
      return { node, id, slot, ready, layoutVersion, duplicate, owner };
    }));
  }
  async function nxRepairDuplicateInlineFrames(rows, placements, VC) {
    const list = Array.isArray(rows) ? rows : [];
    if (!Array.isArray(placements) || !placements.length) return list;
    if (!list.length || typeof VC?.partitionInlineFrameDuplicates != "function") return list;
    const plan = VC.partitionInlineFrameDuplicates(list, placements);
    const keep = new Set(Array.isArray(plan?.keep) ? plan.keep : []);
    for (const index of Array.isArray(plan?.duplicates) ? plan.duplicates : []) {
      const node = list[index]?.node;
      if (!node) continue;
      try {
        await nxDropInlineSubsForWrap(node);
        if (typeof node.remove == "function") {
          await node.remove();
          continue;
        }
      } catch {
      }
      try {
        if (typeof node.setAttribute == "function") await node.setAttribute("x-inlay-inline-duplicate", "1");
        if (typeof node.setStyleAttribute == "function" && typeof VC.inlineChatFrameStyle == "function") {
          await node.setStyleAttribute(VC.inlineChatFrameStyle(!1));
        }
      } catch {
      }
    }
    for (const index of keep) {
      const row = list[index];
      const node = row?.node;
      if (!node || !row.duplicate) continue;
      try {
        if (typeof node.setStyleAttribute == "function" && typeof VC.inlineChatFrameStyle == "function") {
          await node.setStyleAttribute(VC.inlineChatFrameStyle(!0));
        }
        if (typeof node.setAttribute == "function") await node.setAttribute("x-inlay-inline-duplicate", "0");
      } catch {
      }
    }
    return [...keep].sort((a, b) => a - b).map((index) => list[index]).filter(Boolean);
  }
  async function nxBubbleHasInlineFrame(msgEl, cards, pendingRows) {
    if (!msgEl) return !1;
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    const wanted = [
      ...(Array.isArray(cards) ? cards : []),
      ...(Array.isArray(pendingRows) ? pendingRows : [])
    ];
    const wantBySlot = new Map();
    for (const row of wanted) {
      const slot = (() => {
      if (typeof VC?.inlinePlacementSlotKey == "function") return String(VC.inlinePlacementSlotKey(row) || "");
      const shot = Number(row?.shot_index ?? row?.shotIndex);
      return Number.isFinite(shot) && shot >= 0 ? \`s\${Math.floor(shot)}\` : \`l\${Math.max(0, Math.floor(Number(row?.line) || 0))}\`;
      })();
      if (slot && slot !== "l0" && !wantBySlot.has(slot)) {
        wantBySlot.set(slot, String(row?.id || ""));
      }
    }
    const wantSlots = [...wantBySlot.keys()];
    if (!wantSlots.length) return !1;
    const probe = (await nxProbeInlineShots(msgEl, nxUnwrapSafeNodes)).filter((row) => !row.duplicate);
    const desiredFrames = [...wantBySlot.entries()].map(([slot, id]) => ({
      cardId: id,
      shotIndex: slot.startsWith("s") ? Number(slot.slice(1)) : void 0,
      line: slot.startsWith("l") ? Number(slot.slice(1)) : 1,
      src: ""
    }));
    const duplicatePlan = typeof VC?.partitionInlineFrameDuplicates == "function"
      ? VC.partitionInlineFrameDuplicates(probe, desiredFrames)
      : null;
    if (duplicatePlan?.duplicates?.length) return !1;
    const liveSlots = new Set(probe.map((row) => row.slot).filter(Boolean));
    const liveIds = new Set(probe.map((row) => row.id).filter(Boolean));
    return wantSlots.every((slot) => liveSlots.has(slot)
      || !!wantBySlot.get(slot) && liveIds.has(wantBySlot.get(slot)));
  }
  async function nxPredecodeInlineSrc(src) {
    if (!nxReadyImg(src)) return !1;
    if (typeof Image != "function") return !1;
    return await new Promise((resolve) => {
      const probe = new Image();
      let settled = !1;
      const finish = (ok) => {
        if (settled) return;
        settled = !0;
        clearTimeout(timer);
        resolve(!!ok);
      };
      const timer = setTimeout(() => finish(!1), 4000);
      probe.onerror = () => finish(!1);
      probe.onload = async () => {
        try {
          if (typeof probe.decode == "function") await probe.decode();
          finish(Number(probe.naturalWidth) > 0);
        } catch {
          finish(!1);
        }
      };
      try {
        probe.decoding = "async";
        probe.src = src;
      } catch {
        finish(!1);
      }
    });
  }
  async function nxWaitInlineCommit() {
    await new Promise((resolve) => {
      let settled = !1;
      const finish = () => {
        if (settled) return;
        settled = !0;
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(finish, 80);
      if (typeof requestAnimationFrame == "function") {
        requestAnimationFrame(() => requestAnimationFrame(finish));
      }
    });
  }
  async function nxEnsureInlinePhotoLayers(wrap, unwrapSafe, doc, VC) {
    let cells = [];
    try {
      cells = await unwrapSafe(await wrap.querySelectorAll("[x-inlay-inline-cell]"));
    } catch {
      cells = [];
    }
    const stacks = await unwrapSafe(await wrap.querySelectorAll("[data-inlay-inline-stack]"));
    const stack = stacks[0] || wrap;
    while (cells.length < 2) {
      const layer = cells.length ? "b" : "a";
      const style = typeof VC?.inlineChatOverlayImgStyle == "function" ? VC.inlineChatOverlayImgStyle(!1) : "";
      const cell = await H(doc, "span", { style });
      if (!cell || typeof cell.setAttribute != "function" || typeof stack.appendChild != "function") break;
      await cell.setAttribute("x-inlay-inline-cell", "1");
      await cell.setAttribute("x-inlay-inline-layer", layer);
      await cell.setAttribute("x-inlay-inline-live", "0");
      await cell.setAttribute("x-inlay-inline-src-key", "");
      await stack.appendChild(cell);
      cells.push(cell);
    }
    for (let i = 0; i < cells.length; i += 1) {
      try {
        if (typeof cells[i]?.setAttribute == "function") {
          const wantLayer = i ? "b" : "a";
          const haveLayer = typeof cells[i].getAttribute == "function"
            ? String(await cells[i].getAttribute("x-inlay-inline-layer") || "")
            : "";
          if (haveLayer !== wantLayer) await cells[i].setAttribute("x-inlay-inline-layer", wantLayer);
        }
      } catch {
      }
    }
    return cells.slice(0, 2);
  }
  function nxBeginInlineOwnerEpoch(ownerKey) {
    const key = String(ownerKey || "");
    if (!(t._inlineOwnerEpoch instanceof Map)) t._inlineOwnerEpoch = new Map();
    const epoch = (Number(t._inlineOwnerEpochSeq) || 0) + 1;
    t._inlineOwnerEpochSeq = epoch;
    if (key) t._inlineOwnerEpoch.set(key, epoch);
    return { key, epoch };
  }
  function nxCurrentInlineOwnerEpoch(ownerKey) {
    const key = String(ownerKey || "");
    const epoch = t._inlineOwnerEpoch instanceof Map ? Number(t._inlineOwnerEpoch.get(key)) : 0;
    return key && epoch > 0 ? { key, epoch } : null;
  }
  function nxInlineOwnerEpochCurrent(claim) {
    if (!claim?.key) return !0;
    return t._inlineOwnerEpoch instanceof Map
      && t._inlineOwnerEpoch.get(claim.key) === claim.epoch;
  }
  async function nxRunInlineOwnerMutation(ownerClaim, work) {
    if (typeof work != "function") return !1;
    if (!(t._inlineOwnerLocks instanceof Map)) t._inlineOwnerLocks = new Map();
    const key = String(ownerClaim?.key || "");
    const locks = t._inlineOwnerLocks;
    const prior = key ? locks.get(key) || Promise.resolve() : Promise.resolve();
    const queued = Promise.resolve(prior).catch(() => {}).then(async () => {
      const isCurrent = () => nxInlineOwnerEpochCurrent(ownerClaim);
      if (!isCurrent()) return !1;
      return await work(isCurrent);
    });
    if (key) locks.set(key, queued);
    try {
      return await queued;
    } finally {
      if (key && locks.get(key) === queued) locks.delete(key);
    }
  }
  async function nxInlinePhotoSemanticCurrent(wrap, semantic) {
    const ownerClaim = semantic?.ownerClaim;
    if (!nxInlineOwnerEpochCurrent(ownerClaim)) return !1;
    const expectedId = String(semantic?.expectedId || "");
    if (!expectedId && !ownerClaim?.key) return !0;
    try {
      if (!wrap || typeof wrap.getAttribute != "function") return !1;
      const vals = await Promise.all([
        wrap.getAttribute("x-inlay-inline-shot"),
        wrap.getAttribute("x-inlay-inline-owner")
      ]);
      if (!nxInlineOwnerEpochCurrent(ownerClaim)) return !1;
      const liveId = String(vals[0] || "");
      const liveOwner = String(vals[1] || "");
      if (expectedId && liveId !== expectedId) return !1;
      if (ownerClaim?.key && liveOwner && liveOwner !== ownerClaim.key) return !1;
      return !0;
    } catch {
      return !1;
    }
  }
  async function nxInlinePhotoFrameKey(wrap, ownerKeyHint) {
    if (!wrap || typeof wrap.getAttribute != "function") return wrap;
    try {
      const vals = await Promise.all([
        wrap.getAttribute("x-inlay-inline-key"),
        wrap.getAttribute("x-inlay-inline-slot"),
        wrap.getAttribute("x-inlay-inline-shot"),
        wrap.getAttribute("x-inlay-inline-owner")
      ]);
      const key = String(vals[0] || "");
      const slot = String(vals[1] || "");
      const id = String(vals[2] || "");
      const owner = String(ownerKeyHint || vals[3] || "");
      if (owner && slot) return \`\${owner}|\${slot}\`;
      if (key && slot) return \`\${key}|\${slot}\`;
      if (key && id) return \`\${key}|i:\${id}\`;
    } catch {
    }
    return wrap;
  }
  async function nxClaimInlinePhotoRequest(wrap, ownerKeyHint) {
    if (!(t._inlinePhotoReq instanceof Map)) t._inlinePhotoReq = new Map();
    if (!(t._inlinePhotoPendingClaims instanceof Set)) t._inlinePhotoPendingClaims = new Set();
    if (!(t._inlinePhotoLatestOrder instanceof Map)) t._inlinePhotoLatestOrder = new Map();
    const requests = t._inlinePhotoReq;
    const pendingClaims = t._inlinePhotoPendingClaims;
    const latestOrders = t._inlinePhotoLatestOrder;
    const order = (Number(t._inlinePhotoReqOrder) || 0) + 1;
    t._inlinePhotoReqOrder = order;
    const token = { order };
    pendingClaims.add(token);
    let frameKey = wrap;
    try {
      frameKey = await nxInlinePhotoFrameKey(wrap, ownerKeyHint);
      const newest = Math.max(
        Number(latestOrders.get(frameKey)) || 0,
        Number(requests.get(frameKey)?.order) || 0
      );
      if (order > newest) latestOrders.set(frameKey, order);
      if (t._inlinePhotoReq === requests && order > newest) requests.set(frameKey, token);
    } finally {
      pendingClaims.delete(token);
      if (!pendingClaims.size) latestOrders.clear();
    }
    return { frameKey, token };
  }
  function nxInlinePhotoRequestCurrent(frameKey, token) {
    return t._inlinePhotoReq instanceof Map && t._inlinePhotoReq.get(frameKey) === token;
  }
  function nxReleaseInlinePhotoRequest(frameKey, token) {
    if (t._inlinePhotoReq instanceof Map && t._inlinePhotoReq.get(frameKey) === token) {
      t._inlinePhotoReq.delete(frameKey);
    }
  }
  async function nxRunInlinePhotoMutation(frameKey, token, work) {
    if (!(t._inlinePhotoLocks instanceof Map)) t._inlinePhotoLocks = new Map();
    const prior = t._inlinePhotoLocks.get(frameKey) || Promise.resolve();
    const queued = Promise.resolve(prior).catch(() => {}).then(async () => {
      if (!nxInlinePhotoRequestCurrent(frameKey, token)) return !1;
      return await work(() => nxInlinePhotoRequestCurrent(frameKey, token));
    });
    t._inlinePhotoLocks.set(frameKey, queued);
    try {
      return await queued;
    } finally {
      if (t._inlinePhotoLocks.get(frameKey) === queued) t._inlinePhotoLocks.delete(frameKey);
      nxReleaseInlinePhotoRequest(frameKey, token);
    }
  }
  function nxInlinePhotoSrcKey(src) {
    const text = String(src || "");
    if (!text) return "";
    const span = 4096;
    const mid = Math.max(span, Math.floor(text.length / 2) - Math.floor(span / 2));
    const sample = text.length <= span * 3
      ? text
      : text.slice(0, span) + text.slice(mid, mid + span) + text.slice(-span);
    return \`\${text.length.toString(36)}-\${ye(sample)}\`;
  }
  function nxInlinePhotoHtml(src, VC) {
    const style = typeof VC?.inlineChatOverlayPhotoStyle == "function"
      ? VC.inlineChatOverlayPhotoStyle()
      : "width:100%;height:100%;object-fit:contain;border-radius:8px;display:block;pointer-events:auto";
    return '<img data-inlay-inline-photo="1" src="' + h(String(src || "")) + '" alt="" style="' + style + '" loading="eager" decoding="async">';
  }
  async function nxReadInlinePhotoRows(wrap, cells) {
    let activeKey = "";
    try {
      activeKey = typeof wrap.getAttribute == "function"
        ? String(await wrap.getAttribute("x-inlay-inline-active") || "")
        : "";
    } catch {
      activeKey = "";
    }
    const rows = [];
    for (let i = 0; i < cells.length; i += 1) {
      const cell = cells[i];
      let layer = i ? "b" : "a";
      let live = "";
      let srcKey = "";
      try {
        if (typeof cell?.getAttribute == "function") {
          const vals = await Promise.all([
            cell.getAttribute("x-inlay-inline-layer"),
            cell.getAttribute("x-inlay-inline-live"),
            cell.getAttribute("x-inlay-inline-src-key")
          ]);
          layer = String(vals[0] || layer);
          live = String(vals[1] || "");
          srcKey = String(vals[2] || "");
        }
      } catch {
      }
      rows.push({ cell, layer, live, srcKey });
    }
    return { activeKey, rows };
  }
  async function nxHideLegacyInlinePhotos(wrap, unwrapSafe, VC) {
    let legacy = [];
    try {
      legacy = await unwrapSafe(await wrap.querySelectorAll("img[x-inlay-inline-layer]"));
    } catch {
      legacy = [];
    }
    for (const img of legacy) {
      try {
        if (typeof img?.setStyleAttribute == "function" && typeof VC?.inlineChatOverlayImgStyle == "function") {
          await img.setStyleAttribute(VC.inlineChatOverlayImgStyle(!1));
        }
        if (typeof img?.setAttribute == "function") await img.setAttribute("x-inlay-inline-live", "0");
      } catch {
      }
    }
  }
  async function nxHideInlinePhotoWrap(wrap, unwrapSafe, doc, VC) {
    if (!wrap) return !1;
    const claim = await nxClaimInlinePhotoRequest(wrap);
    return await nxRunInlinePhotoMutation(claim.frameKey, claim.token, async (isCurrent) => {
      const cells = await nxEnsureInlinePhotoLayers(wrap, unwrapSafe, doc, VC);
      for (const cell of cells) {
        if (!isCurrent()) return !1;
        if (typeof cell?.setStyleAttribute == "function" && typeof VC?.inlineChatOverlayImgStyle == "function") {
          await cell.setStyleAttribute(VC.inlineChatOverlayImgStyle(!1));
        }
      }
      if (!isCurrent()) return !1;
      await nxHideLegacyInlinePhotos(wrap, unwrapSafe, VC);
      return !0;
    });
  }
  async function nxShowInlinePhotoWrap(wrap, unwrapSafe, doc, VC, semantic) {
    if (!wrap) return !1;
    if (!(await nxInlinePhotoSemanticCurrent(wrap, semantic))) return !1;
    const claim = await nxClaimInlinePhotoRequest(wrap, semantic?.ownerClaim?.key);
    if (!(await nxInlinePhotoSemanticCurrent(wrap, semantic))) {
      nxReleaseInlinePhotoRequest(claim.frameKey, claim.token);
      return !1;
    }
    return await nxRunInlinePhotoMutation(claim.frameKey, claim.token, async (isCurrent) => {
      const valid = async () => isCurrent() && await nxInlinePhotoSemanticCurrent(wrap, semantic);
      const cells = await nxEnsureInlinePhotoLayers(wrap, unwrapSafe, doc, VC);
      const state = await nxReadInlinePhotoRows(wrap, cells);
      const active = state.rows.find((row) => row.layer === state.activeKey && row.live === "1");
      if (!active?.cell || !(await valid())) return !1;
      const rollback = async () => {
        if (typeof active.cell?.setStyleAttribute == "function" && typeof VC?.inlineChatOverlayImgStyle == "function") {
          await active.cell.setStyleAttribute(VC.inlineChatOverlayImgStyle(!1));
        }
      };
      for (const row of state.rows) {
        if (!(await valid())) {
          await rollback();
          return !1;
        }
        if (typeof row.cell?.setStyleAttribute == "function" && typeof VC?.inlineChatOverlayImgStyle == "function") {
          await row.cell.setStyleAttribute(VC.inlineChatOverlayImgStyle(row.cell === active.cell));
        }
        if (!(await valid())) {
          await rollback();
          return !1;
        }
      }
      await nxHideLegacyInlinePhotos(wrap, unwrapSafe, VC);
      if (!(await valid())) {
        await rollback();
        return !1;
      }
      return !0;
    });
  }
  async function nxClearInlinePhotoWrap(wrap, unwrapSafe, doc, VC) {
    if (!wrap) return;
    const claim = await nxClaimInlinePhotoRequest(wrap);
    await nxRunInlinePhotoMutation(claim.frameKey, claim.token, async (isCurrent) => {
      const cells = await nxEnsureInlinePhotoLayers(wrap, unwrapSafe, doc, VC);
      for (const cell of cells) {
        if (!isCurrent()) return !1;
        try {
          if (typeof cell.setStyleAttribute == "function" && typeof VC?.inlineChatOverlayImgStyle == "function") {
            await cell.setStyleAttribute(VC.inlineChatOverlayImgStyle(!1));
          }
          if (!isCurrent()) return !1;
          if (typeof cell.setAttribute == "function") {
            await cell.setAttribute("x-inlay-inline-live", "0");
            await cell.setAttribute("x-inlay-inline-src-key", "");
          }
          if (typeof cell.setInnerHTML == "function") await cell.setInnerHTML("");
        } catch {
        }
      }
      if (!isCurrent()) return !1;
      await nxHideLegacyInlinePhotos(wrap, unwrapSafe, VC);
      try {
        if (typeof wrap.setAttribute == "function") await wrap.setAttribute("x-inlay-inline-active", "");
      } catch {
      }
      return !0;
    });
  }
  async function nxSwapInlinePhoto(wrap, src, unwrapSafe, doc, VC, semantic) {
    if (!wrap || !src || !nxReadyImg(src)) return !1;
    if (!(await nxInlinePhotoSemanticCurrent(wrap, semantic))) return !1;
    const claim = await nxClaimInlinePhotoRequest(wrap, semantic?.ownerClaim?.key);
    if (!(await nxInlinePhotoSemanticCurrent(wrap, semantic))) {
      nxReleaseInlinePhotoRequest(claim.frameKey, claim.token);
      return !1;
    }
    const srcKey = nxInlinePhotoSrcKey(src);
    let mounted = [];
    try {
      mounted = await unwrapSafe(await wrap.querySelectorAll("[x-inlay-inline-cell]"));
    } catch {
      mounted = [];
    }
    const mountedState = await nxReadInlinePhotoRows(wrap, mounted);
    const same = mountedState.rows.find((row) => row.srcKey === srcKey && row.live === "1");
    if (same) {
      return await nxRunInlinePhotoMutation(claim.frameKey, claim.token, async (isCurrent) => {
        const valid = async () => isCurrent() && await nxInlinePhotoSemanticCurrent(wrap, semantic);
        const rollback = async () => {
          if (typeof same.cell?.setStyleAttribute == "function" && typeof VC?.inlineChatOverlayImgStyle == "function") {
            await same.cell.setStyleAttribute(VC.inlineChatOverlayImgStyle(!1));
          }
        };
        for (const row of mountedState.rows) {
          if (!(await valid())) {
            await rollback();
            return !1;
          }
          if (typeof row.cell?.setStyleAttribute == "function" && typeof VC?.inlineChatOverlayImgStyle == "function") {
            await row.cell.setStyleAttribute(VC.inlineChatOverlayImgStyle(row.cell === same.cell));
          }
          if (!(await valid())) {
            await rollback();
            return !1;
          }
        }
        if (typeof wrap.setAttribute == "function") await wrap.setAttribute("x-inlay-inline-active", same.layer);
        if (!(await valid())) {
          await rollback();
          return !1;
        }
        await nxHideLegacyInlinePhotos(wrap, unwrapSafe, VC);
        if (!(await valid())) {
          await rollback();
          return !1;
        }
        return !0;
      });
    }
    if (!(await nxPredecodeInlineSrc(src))) {
      nxReleaseInlinePhotoRequest(claim.frameKey, claim.token);
      return !1;
    }
    if (!nxInlinePhotoRequestCurrent(claim.frameKey, claim.token)
      || !(await nxInlinePhotoSemanticCurrent(wrap, semantic))) {
      nxReleaseInlinePhotoRequest(claim.frameKey, claim.token);
      return !1;
    }
    return await nxRunInlinePhotoMutation(claim.frameKey, claim.token, async (isCurrent) => {
      const valid = async () => isCurrent() && await nxInlinePhotoSemanticCurrent(wrap, semantic);
      const cells = await nxEnsureInlinePhotoLayers(wrap, unwrapSafe, doc, VC);
      if (!cells.length || !(await valid())) return !1;
      const state = await nxReadInlinePhotoRows(wrap, cells);
      if (!(await valid())) return !1;
      const already = state.rows.find((row) => row.srcKey === srcKey && row.live === "1");
      if (already) {
        const rollback = async () => {
          if (typeof already.cell?.setStyleAttribute == "function" && typeof VC?.inlineChatOverlayImgStyle == "function") {
            await already.cell.setStyleAttribute(VC.inlineChatOverlayImgStyle(!1));
          }
        };
        if (typeof wrap.setAttribute == "function") await wrap.setAttribute("x-inlay-inline-active", already.layer);
        if (!(await valid())) {
          await rollback();
          return !1;
        }
        for (const row of state.rows) {
          if (!(await valid())) {
            await rollback();
            return !1;
          }
          if (typeof row.cell?.setStyleAttribute == "function" && typeof VC?.inlineChatOverlayImgStyle == "function") {
            await row.cell.setStyleAttribute(VC.inlineChatOverlayImgStyle(row.cell === already.cell));
          }
          if (!(await valid())) {
            await rollback();
            return !1;
          }
        }
        return !0;
      }
      const active = state.rows.find((row) => row.layer === state.activeKey && row.live === "1")
        || state.rows.find((row) => row.live === "1")
        || null;
      const target = state.rows.find((row) => !active || row.layer !== active.layer) || state.rows[0];
      if (!target?.cell || typeof target.cell.setInnerHTML != "function") return !1;
      try {
        if (typeof target.cell.setStyleAttribute == "function" && typeof VC?.inlineChatOverlayImgStyle == "function") {
          await target.cell.setStyleAttribute(VC.inlineChatOverlayImgStyle(!1));
        }
        if (!(await valid())) return !1;
        await target.cell.setInnerHTML(nxInlinePhotoHtml(src, VC));
        if (!(await valid())) return !1;
        await target.cell.setAttribute("x-inlay-inline-src-key", srcKey);
        if (!(await valid())) return !1;
        await nxWaitInlineCommit();
        if (!(await valid())) return !1;
        await target.cell.setAttribute("x-inlay-inline-live", "1");
        if (!(await valid())) return !1;
        if (typeof target.cell.setStyleAttribute == "function" && typeof VC?.inlineChatOverlayImgStyle == "function") {
          await target.cell.setStyleAttribute(VC.inlineChatOverlayImgStyle(!0));
        }
        if (!(await valid())) {
          if (typeof target.cell.setStyleAttribute == "function" && typeof VC?.inlineChatOverlayImgStyle == "function") {
            await target.cell.setStyleAttribute(VC.inlineChatOverlayImgStyle(!1));
          }
          return !1;
        }
        if (typeof wrap.setAttribute == "function") await wrap.setAttribute("x-inlay-inline-active", target.layer);
        for (const row of state.rows) {
          if (!(await valid())) return !1;
          if (row.cell === target.cell) continue;
          if (typeof row.cell?.setStyleAttribute == "function" && typeof VC?.inlineChatOverlayImgStyle == "function") {
            await row.cell.setStyleAttribute(VC.inlineChatOverlayImgStyle(!1));
          }
        }
        await nxHideLegacyInlinePhotos(wrap, unwrapSafe, VC);
        return await valid();
      } catch {
        return !1;
      }
    });
  }
  /** Selection-window parking: hide photos but retain decoded children for an instant return. */
  async function nxHideInlinePhotos(msgEl, isCurrent = () => !0) {
    if (!msgEl || typeof msgEl.querySelectorAll != "function") return;
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    const wraps = await nxQueryInlineFrames(msgEl, nxUnwrapSafeNodes);
    for (const wrap of wraps) {
      if (!isCurrent()) return;
      await nxHideInlinePhotoWrap(wrap, nxUnwrapSafeNodes, t.hostDoc, VC);
    }
  }
  /** Explicit tag clear: drop photo children; keep both permanent cells and the spinner. */
  async function nxClearInlinePhotos(msgEl, isCurrent = () => !0) {
    if (!msgEl || typeof msgEl.querySelectorAll != "function") return;
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    const wraps = await nxQueryInlineFrames(msgEl, nxUnwrapSafeNodes);
    for (const wrap of wraps) {
      if (!isCurrent()) return;
      await nxDropInlineSubsForWrap(wrap);
      await nxClearInlinePhotoWrap(wrap, nxUnwrapSafeNodes, t.hostDoc, VC);
    }
  }
  async function nxClearInlinePhotosByKey(root, key, isCurrent = () => !0) {
    const k0 = String(key || "");
    if (!root || typeof root.querySelectorAll != "function" || !/^[A-Za-z0-9_-]+$/.test(k0)) return;
    let wraps = [];
    try {
      wraps = await nxUnwrapSafeNodes(await root.querySelectorAll(\`[x-inlay-inline-key="\${k0}"],[data-inlay-inline-key="\${k0}"]\`));
    } catch {
      wraps = [];
    }
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    for (const wrap of wraps) {
      if (!isCurrent()) return;
      await nxDropInlineSubsForWrap(wrap);
      await nxClearInlinePhotoWrap(wrap, nxUnwrapSafeNodes, t.hostDoc, VC);
    }
  }
  async function nxRemoveInlineFrames(msgEl, isCurrent = () => !0) {
    const wraps = await nxQueryInlineFrames(msgEl, nxUnwrapSafeNodes);
    for (const wrap of wraps) {
      if (!isCurrent()) return;
      await nxAbandonInlineFrame(wrap);
    }
  }
  async function nxRemoveInlineFramesByKey(root, key, isCurrent = () => !0) {
    const k0 = String(key || "");
    if (!root || typeof root.querySelectorAll != "function" || !/^[A-Za-z0-9_-]+$/.test(k0)) return;
    let wraps = [];
    try {
      wraps = await nxUnwrapSafeNodes(await root.querySelectorAll(\`[x-inlay-inline-key="\${k0}"],[data-inlay-inline-key="\${k0}"]\`));
    } catch {
      wraps = [];
    }
    for (const wrap of wraps) {
      if (!isCurrent()) return;
      await nxAbandonInlineFrame(wrap);
    }
  }
  async function nxRestoreInlinePhotos(msgEl, isCurrent = () => !0) {
    if (!msgEl) return;
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    const rows = await nxProbeInlineShots(msgEl, nxUnwrapSafeNodes);
    for (const row of rows) {
      if (!isCurrent()) return;
      const id = String(row.id || "");
      if (!id || id.startsWith("pending-")) continue;
      const ownerClaim = nxCurrentInlineOwnerEpoch(row.owner)
        || (row.owner ? nxBeginInlineOwnerEpoch(row.owner) : null);
      const semantic = { ownerClaim, expectedId: id };
      if (row.ready && await nxShowInlinePhotoWrap(row.node, nxUnwrapSafeNodes, t.hostDoc, VC, semantic)) continue;
      const card = (t.gallery || []).find((c) => String(c?.id || "") === id) || { id };
      const src = nxCardDisplaySrc(card);
      if (nxReadyImg(src)) {
        await nxSwapInlinePhoto(row.node, src, nxUnwrapSafeNodes, t.hostDoc, VC, semantic);
      }
    }
  }
  /** Selection hop: photos on/off only. Never tears a spinner. */
  async function nxSyncInlinePhotosOnly() {
    if (t.backendSettings?.card?.inline_chat_images !== !0) return;
    const sel = t.selectedMessage;
    if (!sel) return;
    const selSession = String(sel.sessionId || "");
    const selHash = String(sel.hash || "");
    const selDom = Number(sel.domIndex);
    const gen = (Number(t._inlinePhotoSyncGen) || 0) + 1;
    t._inlinePhotoSyncGen = gen;
    t._inlinePassGen = (Number(t._inlinePassGen) || 0) + 1;
    const stale = () => Number(t._inlinePhotoSyncGen) !== gen
      || t.selectedMessage !== sel
      || String(t.selectedMessage?.sessionId || "") !== selSession
      || String(t.selectedMessage?.hash || "") !== selHash
      || Number(t.selectedMessage?.domIndex) !== selDom;
    let els = [];
    try {
      els = await getCachedMsgEls(t.hostDoc);
    } catch {
      els = [];
    }
    if (stale()) return;
    const selIdx = selDom;
    if (!Number.isFinite(selIdx) || selIdx < 0 || !els[selIdx]) return;
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    const photoIdxs = typeof VC?.inlineDomWindow == "function"
      ? VC.inlineDomWindow(selIdx, els.length, 1)
      : [selIdx];
    const selectedCards = linkedCards(sel) || [];
    const selectedConfirmedEmpty = !selectedCards.length
      && String(t._galleryCache?.sessionId || "") === String(sel.sessionId || "");
    const nextPhotoEls = [];
    for (const idx of photoIdxs) {
      const role = idx === selIdx ? String(sel.role || "") : "";
      const want = typeof VC?.shouldOverlayInlinePhoto == "function"
        ? VC.shouldOverlayInlinePhoto({ idx, selIdx, length: els.length, role })
        : idx === selIdx && role !== "user";
      if (!want) {
        await nxHideInlinePhotos(els[idx], () => !stale());
        if (stale()) return;
        continue;
      }
      if (idx === selIdx && !selectedCards.length && selectedConfirmedEmpty) {
        await nxHideInlinePhotos(els[idx], () => !stale());
        if (stale()) return;
        continue;
      }
      nextPhotoEls.push({ idx, el: els[idx] });
      await nxRestoreInlinePhotos(els[idx], () => !stale());
      if (stale()) return;
    }
    for (const prev of Array.isArray(t._inlinePhotoEls) ? t._inlinePhotoEls : []) {
      if (nextPhotoEls.some((row) => Number(row.idx) === Number(prev?.idx) && row.el === prev.el)) continue;
      await nxHideInlinePhotos(prev.el, () => !stale());
      if (stale()) return;
    }
    const selEl = els[selIdx];
    const selKey = nxInlineStampKey(sel);
    for (const card of selectedCards) {
      const src = nxCardDisplaySrc(card);
      if (nxReadyImg(src)) await nxPatchInlinePhotoByCardId(card?.id || "", src, "", selEl, selKey ? ye(selKey) : "");
      if (stale()) return;
    }
    t._inlinePhotoEls = nextPhotoEls;
  }
  async function nxSelectedInlineShotCount() {
    const sel = t.selectedMessage;
    if (!sel) return 0;
    let els = [];
    try {
      els = await getCachedMsgEls(t.hostDoc);
    } catch {
      els = [];
    }
    const idx = Number(sel.domIndex);
    const el = Number.isFinite(idx) && els[idx] ? els[idx] : null;
    if (!el) return 0;
    const probe = await nxProbeInlineShots(el, nxUnwrapSafeNodes);
    return probe.length;
  }
  function nxInlineStampKey(sel) {
    const sessionId = String(sel?.sessionId || "");
    const hash = String(sel?.hash || "");
    const rawIndex = Number(sel?.messageIndex ?? sel?.chatIndex);
    const messageIndex = Number.isInteger(rawIndex) && rawIndex >= 0 ? rawIndex : null;
    const rawDom = Number(sel?.domIndex);
    const domIndex = Number.isInteger(rawDom) && rawDom >= 0 ? rawDom : null;
    const identity = messageIndex != null ? \`m\${messageIndex}\` : domIndex != null ? \`d\${domIndex}\` : "";
    return sessionId && hash && identity ? \`\${sessionId}|\${hash}|\${identity}\` : "";
  }
  function nxInlineRootKeyForCard(card) {
    const stamp = nxInlineStampKey({
      sessionId: card?.session_id ?? card?.sessionId,
      hash: card?.content_hash ?? card?.hash,
      messageIndex: card?.message_index ?? card?.messageIndex
    });
    return stamp ? ye(stamp) : "";
  }
  function nxNeedsInlineStamp(sel) {
    if (!t._inlineNeedStamp) return !1;
    const want = String(t._inlineNeedStampKey || "");
    const live = nxInlineStampKey(sel);
    return !want || !!live && live === want;
  }
  function nxFinishInlineStamp(sel) {
    if (!nxNeedsInlineStamp(sel)) return;
    t._inlineNeedStamp = !1;
    t._inlineNeedStampKey = "";
  }
  function nxPendingForInlineSelection(sel) {
    const pending = Array.isArray(t._inlinePending) ? t._inlinePending : [];
    if (!pending.length) return [];
    const pendingIdx = Number(t._inlinePendingMsgIndex);
    const selectedIdx = Number(sel?.messageIndex ?? sel?.chatIndex);
    const pendingSession = String(t._inlinePendingSessionId || "");
    const selectedSession = String(sel?.sessionId || "");
    return pendingSession && pendingSession === selectedSession
      && Number.isInteger(pendingIdx) && pendingIdx >= 0 && pendingIdx === selectedIdx
      ? pending
      : [];
  }
  function nxPendingMatchesInlineSelection(sel) {
    return nxPendingForInlineSelection(sel).length > 0;
  }
  /** Ids this bubble is still waiting on. Empty when nothing is watching it. */
  function nxInlineSubIds(lockKey) {
    const row = t._inlineSubs instanceof Map ? t._inlineSubs.get(String(lockKey)) : null;
    return row?.ids instanceof Set ? row.ids : new Set();
  }
  /** Drops a bubble's watcher. Every repaint must call this before it re-registers. */
  function nxDropInlineSubs(lockKey) {
    if (!(t._inlineSubs instanceof Map)) return;
    const key = String(lockKey);
    const row = t._inlineSubs.get(key);
    if (!row) return;
    t._inlineSubs.delete(key);
    try {
      if (typeof row.stop == "function") row.stop();
    } catch {
    }
  }
  function nxDropAllInlineSubs() {
    if (!(t._inlineSubs instanceof Map)) return;
    const rows = [...t._inlineSubs.values()];
    t._inlineSubs.clear();
    for (const row of rows) {
      try {
        if (typeof row?.stop == "function") row.stop();
      } catch {
      }
    }
  }
  function nxDropInlineSubsForOwner(ownerClaim) {
    if (!(t._inlineSubs instanceof Map) || !ownerClaim?.key) return;
    for (const [key, row] of [...t._inlineSubs.entries()]) {
      if (row?.ownerKey === ownerClaim.key && row?.ownerEpoch !== ownerClaim.epoch) {
        nxDropInlineSubs(key);
      }
    }
  }
  async function nxDropInlineSubsForWrap(wrap) {
    if (!(t._inlineSubs instanceof Map) || !wrap) return;
    try {
      const key = typeof wrap.getAttribute == "function"
        ? String(await wrap.getAttribute("x-inlay-inline-key") || "")
        : "";
      if (key) {
        nxDropInlineSubs(key);
        return;
      }
    } catch {
    }
    for (const [key, row] of [...t._inlineSubs.entries()]) {
      const owns = row?.nodes instanceof Map && [...row.nodes.values()].some((node) => node === wrap);
      if (owns) nxDropInlineSubs(key);
    }
  }
  /**
   * Waits for the bytes of every card that had none, and fills that one cell.
   *
   * This replaces the bake loop that used to run inside the paint: waiting there
   * made the pass as slow as the slowest encode, and anything that missed became
   * debt for a retry pass to pick up. Here the paint is already finished and the
   * cells arrive independently.
   */
  function nxWatchInlineShots(lockKey, cards, shotNodes, patchShotSrc, ownerClaim) {
    const N = globalThis.__INLAY_NATIVE__;
    const key = String(lockKey);
    if (ownerClaim?.key && !nxInlineOwnerEpochCurrent(ownerClaim)) return;
    const ids = [];
    for (const card of Array.isArray(cards) ? cards : []) {
      const id = String(card?.id || "");
      if (id && shotNodes.has(id) && !ids.includes(id)) ids.push(id);
    }
    if (!ids.length || typeof N?.subscribeImageUrl != "function") {
      nxDropInlineSubs(key);
      return;
    }
    const current = t._inlineSubs instanceof Map ? t._inlineSubs.get(key) : null;
    if (current?.allIds instanceof Set
      && current.allIds.size === ids.length
      && current.ownerKey === String(ownerClaim?.key || "")
      && current.ownerEpoch === Number(ownerClaim?.epoch || 0)
      && ids.every((id) => current.allIds.has(id) && current.nodes?.get(id) === shotNodes.get(id))) return;
    nxDropInlineSubs(lockKey);
    if (!(t._inlineSubs instanceof Map)) t._inlineSubs = new Map();
    const left = new Set(ids);
    const row = {
      ids: left,
      allIds: new Set(ids),
      nodes: new Map(shotNodes),
      ownerKey: String(ownerClaim?.key || ""),
      ownerEpoch: Number(ownerClaim?.epoch || 0),
      stop: () => {}
    };
    t._inlineSubs.set(key, row);
    row.stop = N.subscribeImageUrl(ids, (id, url) => {
      if (t._inlineSubs?.get(key) !== row) return;
      const wrap = row.nodes.get(id);
      if (!wrap) return;
      Promise.resolve().then(async () => {
        const liveId = typeof wrap.getAttribute == "function"
          ? String(await wrap.getAttribute("x-inlay-inline-shot") || "")
          : "";
        if (t._inlineSubs?.get(key) !== row) return !1;
        if (liveId !== String(id)) return !1;
        return await patchShotSrc(wrap, url, id);
      }).then((ok) => {
        if (!ok) return;
        left.delete(id);
        if (!left.size) nxDropInlineSubs(lockKey);
      }).catch(() => {
      });
    });
    // A subscriber alone never triggers an encode — it only listens. Kick the
    // ones that are not cached yet, respecting the selection's warm priority.
    try {
      if (typeof N?.warmImages == "function") N.warmImages(ids).catch(() => {});
    } catch {
    }
  }
  /**
   * One host scan per bubble, shared by the chip bars and the inline shots.
   *
   * SafeDOM charges an IPC round-trip per call, and the two consumers used to
   * walk the same \`p,h1..h6,li,blockquote,div\` list separately — four sequential
   * reads each, plus a third pass for the paragraph text. All of it is
   * independent per element, so it batches.
   *
   * The cache is scoped to one pass generation: reusing a scan across passes
   * would hand out element handles for a bubble Risu already rebuilt.
   */
  async function nxScanBubbleHosts(msgEl) {
    const gen = Number(t._inlinePassGen) || 0;
    const mode = nxMsgAct();
    const hit = t._inlineHostScan;
    if (hit && hit.el === msgEl && hit.gen === gen && hit.mode === mode) return hit;
    // Only legacy mounts on the DIV that wraps the content, so only legacy needs
    // DIVs in the list. Every other mode drops them a few lines below in
    // isMessageBodyHostTag — and a bubble carries far more DIV chrome than
    // paragraphs, so asking for them spent four round-trips each to build an
    // answer that was thrown away. This is most of the cost of a bubble paint.
    const legacy = mode === "legacy";
    const hostSel = legacy
      ? "p,h1,h2,h3,h4,h5,h6,li,blockquote,div"
      : "p,h1,h2,h3,h4,h5,h6,li,blockquote";
    const VC = globalThis.__INLAY_VIEWER_CORE__;
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
    let hostsRaw = [];
    try {
      hostsRaw = await unwrapSafe(await msgEl.querySelectorAll(hostSel));
    } catch {
      hostsRaw = [];
    }
    const probed = await Promise.all(hostsRaw.map(async (el) => {
      if (!el) return null;
      let name = "";
      try {
        name = typeof el.nodeName == "function" ? String(await el.nodeName() || "").toUpperCase() : "";
      } catch {
        name = "";
      }
      let nested = null;
      if (legacy && name === "DIV") {
        try {
          nested = typeof el.querySelector == "function"
            ? await el.querySelector("p,h1,h2,h3,h4,h5,h6,li,blockquote")
            : null;
        } catch {
          nested = null;
        }
      }
      let isActionBar = !1;
      let isInlineShot = !1;
      let text = "";
      try {
        const jobs = [];
        jobs.push(typeof el.getAttribute == "function" ? el.getAttribute("x-inlay-msg-actions") : "");
        jobs.push(typeof el.getAttribute == "function" ? el.getAttribute("x-inlay-inline-shot") : "");
        jobs.push(typeof el.innerText == "function"
          ? el.innerText()
          : typeof el.textContent == "function" ? el.textContent() : "");
        const [bar, shot, txt] = await Promise.all(jobs);
        isActionBar = String(bar || "") !== "";
        isInlineShot = String(shot || "") !== "";
        text = String(txt || "");
      } catch {
      }
      return { el, name: name || "DIV", nested: !!nested, isActionBar, isInlineShot, text };
    }));
    const rows = [];
    for (const row of probed) {
      if (!row) continue;
      if (row.name === "DIV" && row.nested) continue;
      const skipPaint = typeof VC?.isInlayPaintHost == "function"
        ? VC.isInlayPaintHost({ isActionBar: row.isActionBar, isInlineShot: row.isInlineShot })
        : (row.isActionBar || row.isInlineShot);
      if (skipPaint) continue;
      const bodyHost = typeof VC?.isMessageBodyHostTag == "function"
        ? VC.isMessageBodyHostTag(row.name)
        : /^(P|H[1-6]|LI|BLOCKQUOTE)$/.test(row.name);
      if (mode !== "legacy" && !bodyHost) continue;
      rows.push(row);
    }
    const scan = { el: msgEl, gen, mode, rows, raw: hostsRaw.length };
    t._inlineHostScan = scan;
    return scan;
  }
  /**
   * Paragraph scans keyed by the bubble's content hash.
   *
   * The scan and the line matching depend only on the bubble's text, so a repaint
   * of an unchanged bubble was recomputing an identical answer at a round-trip
   * per paragraph — on every scroll hop, every \`force\` repaint after a reply, and
   * every return to a bubble already on screen.
   *
   * Deliberately small: an entry holds live element handles, and keeping handles
   * for bubbles that scrolled away is how a cache becomes a leak.
   */
  function nxPlaceCacheGet(key, msgEl) {
    if (!(t._inlinePlaceCache instanceof Map)) return null;
    const k = String(key || "");
    const row = t._inlinePlaceCache.get(k);
    if (!row) return null;
    // Same text in two bubbles hashes the same, so the handle has to match too.
    if (row.el !== msgEl || row.mode !== nxMsgAct()) {
      t._inlinePlaceCache.delete(k);
      return null;
    }
    return row;
  }
  function nxPlaceCacheSet(key, msgEl, row) {
    if (!(t._inlinePlaceCache instanceof Map)) t._inlinePlaceCache = new Map();
    const k = String(key || "");
    if (!k) return;
    t._inlinePlaceCache.delete(k);
    t._inlinePlaceCache.set(k, { ...row, el: msgEl, mode: nxMsgAct() });
    while (t._inlinePlaceCache.size > 12) {
      t._inlinePlaceCache.delete(t._inlinePlaceCache.keys().next().value);
    }
  }
  /**
   * One round-trip: is a marker stamped with this bubble hash still mounted?
   *
   * A yes means Risu did not rebuild the bubble (our nodes would be gone) and the
   * text is unchanged (a different text hashes to a different key), which is
   * exactly the condition under which the cached handles are still live.
   */
  async function nxBubbleKeyIntact(msgEl, key) {
    const k = String(key || "");
    // The key reaches a selector, so only accept the hash shape it should have.
    if (!k || !/^[A-Za-z0-9_-]+$/.test(k) || typeof msgEl?.querySelector != "function") return !1;
    try {
      return !!(await msgEl.querySelector(\`[data-inlay-inline-key="\${k}"]\`));
    } catch {
      return !1;
    }
  }
  async function injectChatInlineImages(msgEl, cards, pendingRows, opts) {
    if (!msgEl || t.backendSettings?.card?.inline_chat_images !== !0) return;
    if (typeof msgEl.querySelectorAll != "function" || typeof msgEl.getInnerHTML != "function") return;
    // Per bubble, not global. The lock only exists so two passes cannot
    // double-prepend into the same bubble; a global one made the bubble the user
    // is looking at queue behind its own neighbours during a scroll. A second
    // caller waits for the in-flight paint instead of dropping its request,
    // otherwise the newer selection would silently lose its turn.
    const lockKey = String(opts?.lockKey || \`dom\${opts?.domIndex ?? "?"}\`);
    const injectLockKey = String(opts?.injectLockKey || lockKey);
    if (!(t._inlineInjectLocks instanceof Map)) t._inlineInjectLocks = new Map();
    if (!(t._inlineInjectTicket instanceof Map)) t._inlineInjectTicket = new Map();
    const held = t._inlineInjectLocks.get(injectLockKey);
    const ticket = (Number(t._inlineInjectTicket.get(injectLockKey)) || 0) + 1;
    t._inlineInjectTicket.set(injectLockKey, ticket);
    let release = () => {};
    const mine = new Promise((r) => {
      release = r;
    });
    t._inlineInjectLocks.set(injectLockKey, held ? held.then(() => mine, () => mine) : mine);
    if (held) {
      try {
        await held;
      } catch {
      }
    }
    if (t._inlineInjectTicket.get(injectLockKey) !== ticket) {
      release();
      return;
    }
    try {
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    if (typeof VC?.findElementIndexForLineWithFallback != "function" || typeof VC?.markerBlockHtml != "function") return;
    const doc = t.hostDoc;
    if (!doc || typeof doc.createElement != "function") return;
    const hasRole = !!opts && Object.prototype.hasOwnProperty.call(opts, "role");
    const roleDisposition = !hasRole
      ? "allow"
      : typeof VC.inlineRoleDisposition == "function"
        ? VC.inlineRoleDisposition(opts.role, !!t.backendSettings?.card?.generate_all_roles)
        : String(opts.role || "")
          ? (typeof VC.allowInlineImagesOnRole == "function" && VC.allowInlineImagesOnRole(opts.role, !!t.backendSettings?.card?.generate_all_roles) ? "allow" : "deny")
          : "hold";
    // Hold must not block a first stamp. It only means "don't tear mounted
    // frames as if this were a user turn" when we still have nothing to place.
    const denyRole = roleDisposition === "deny";
    const haveWork = (Array.isArray(cards) && cards.length) || (Array.isArray(pendingRows) && pendingRows.length);
    if (roleDisposition === "hold" && !haveWork) return;
    if (!haveWork && !opts?.confirmedEmpty && !denyRole && opts?.wantPhotos !== !1) return;
    const ownerClaim = nxBeginInlineOwnerEpoch(injectLockKey);
    nxDropInlineSubsForOwner(ownerClaim);
    const list = denyRole ? [] : (Array.isArray(cards) ? cards : []);
    // Caller already scoped pending to this bubble (selected ± window). A
    // chatIndex mismatch used to drop tag-gen spinners while chips still painted.
    const pending = denyRole
      ? []
      : Array.isArray(pendingRows) && pendingRows.length
        ? pendingRows
        : [];
    const resolveSrc = (card) => {
      try {
        const N = globalThis.__INLAY_NATIVE__;
        let src = typeof N?.resolveImageUrl == "function" ? String(N.resolveImageUrl(card) || "") : "";
        if (!nxReadyImg(src)) {
          const fb = typeof Ie == "function" ? Ie(card) : "";
          if (nxReadyImg(fb)) src = fb;
        }
        return src;
      } catch {
        return "";
      }
    };
    const planned = typeof VC.desiredInlinePlacements == "function"
      ? VC.desiredInlinePlacements(list, pending, resolveSrc)
      : { placements: [], encodeLater: [] };
    const placements = Array.isArray(planned.placements) ? planned.placements : [];
    const encodeLater = Array.isArray(planned.encodeLater) ? planned.encodeLater : [];
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
      const wantPhotos = opts?.wantPhotos !== !1;
      // One batched probe answers everything the skip gate needs: how many
      // markers exist, which ids they carry, and which of them actually show a
      // display URL. Sequential per-wrapper reads were two IPC hops per shot.
      let prevProbe = await nxProbeInlineShots(msgEl, unwrapSafe);
      prevProbe = await nxRepairDuplicateInlineFrames(prevProbe, placements, VC);
      if (!wantPhotos) await nxHideInlinePhotos(msgEl);
      const prev = prevProbe.map((row) => row.node);
      const readyImgs = prevProbe.filter((row) => row.ready).length;
      // A marker with no bytes is still finished work when a live watcher owns
      // that id — it fills in place the moment the encode lands.
      const watching = nxInlineSubIds(lockKey);
      const awaiting = prevProbe.filter((row) => !row.ready && row.id && watching.has(row.id)).length;
      const liveUniqueCount = new Set(prevProbe.map((row) => row.id).filter(Boolean)).size;
      const frameVersion = String(VC.INLINE_FRAME_LAYOUT_VERSION || "");
      const layoutMatches = !!frameVersion && prevProbe.every((row) => row.layoutVersion === frameVersion);
      const skipOk = typeof VC.canSkipInlineInject == "function"
        ? VC.canSkipInlineInject({
          scaleMatches: t._inlinePaintScale === scaleNow && layoutMatches,
          liveShotCount: prev.length,
          liveUniqueCount,
          wantIdCount: wantIds.length,
          readyImgCount: wantPhotos ? readyImgs : wantIds.length,
          awaitingCount: wantPhotos ? awaiting : 0
        })
        : prev.length === wantIds.length && liveUniqueCount === prev.length && t._inlinePaintScale === scaleNow && layoutMatches && (wantPhotos ? readyImgs + awaiting >= wantIds.length : !0);
      const liveIds = new Set(prevProbe.map((row) => row.id).filter(Boolean));
      const markersReady = prev.length === wantIds.length && liveUniqueCount === prev.length && t._inlinePaintScale === scaleNow && layoutMatches && wantIds.every((id) => liveIds.has(id));
      const patchShotSrc = async (wrap, src, expectedId) => {
        return await nxSwapInlinePhoto(wrap, src, unwrapSafe, doc, VC, {
          ownerClaim,
          expectedId: String(expectedId || "")
        });
      };
      if (skipOk || markersReady) {
        if (!nxInlineOwnerEpochCurrent(ownerClaim)) return;
        if (!wantIds.length) {
          y("info", "inline.inject.skip", "shots=0 already");
          return;
        }
        const shotNodes = new Map();
        const shotRows = new Map();
        for (const row of prevProbe) {
          if (row.id && row.node) {
            shotNodes.set(row.id, row.node);
            shotRows.set(row.id, row);
          }
        }
        if (wantPhotos) {
          for (const p of placements) {
            const id = String(p.cardId || "");
            const wrap = shotNodes.get(id);
            if (!wrap) continue;
            if (shotRows.get(id)?.ready) {
              await nxShowInlinePhotoWrap(wrap, unwrapSafe, doc, VC, { ownerClaim, expectedId: id });
            }
            else if (p.src && nxReadyImg(p.src)) await patchShotSrc(wrap, p.src, id);
          }
          if (nxInlineOwnerEpochCurrent(ownerClaim)) {
            nxWatchInlineShots(lockKey, encodeLater, shotNodes, patchShotSrc, ownerClaim);
          }
        }
        y("info", "inline.inject.skip", \`shots=\${wantIds.length} already ready=\${readyImgs} wait=\${awaiting}\`);
        return;
      }
      // Empty desired never means "delete layout". A gallery miss is temporary;
      // confirmed empty and denied/offscreen roles only park retained photo bytes.
      if (!placements.length && !encodeLater.length) {
        if (opts?.confirmedEmpty || denyRole || !wantPhotos) await nxHideInlinePhotos(msgEl);
        y("info", "inline.inject.hold", \`shots=0 live=\${prev.length}\`);
        return;
      }
      // Every stage below is a SafeDOM round-trip, and the host scan asks per
      // paragraph. Timing each stage separately is the only way to tell a slow
      // scan apart from a slow data-URL insert — they look identical from here.
      const tStart = Date.now();
      let hosts = [];
      let hostTags = [];
      let hostTexts = [];
      let messageLines = [];
      let msHtml = 0;
      let msScan = 0;
      let rawCount = 0;
      let cacheHit = !1;
      const cached = nxPlaceCacheGet(lockKey, msgEl);
      if (cached && await nxBubbleKeyIntact(msgEl, lockKey)) {
        hosts = cached.hosts;
        hostTags = cached.hostTags;
        hostTexts = cached.hostTexts;
        messageLines = cached.messageLines;
        rawCount = Number(cached.rawCount) || 0;
        cacheHit = !0;
        msHtml = Date.now() - tStart;
      }
      if (!cacheHit) {
        const html = String(await msgEl.getInnerHTML() || "");
        msHtml = Date.now() - tStart;
        const cleaned = typeof VC.stripInlayInlineHtml == "function" ? VC.stripInlayInlineHtml(html) : html;
        const plain = typeof VC.htmlToPlainLn == "function" ? VC.htmlToPlainLn(cleaned) : cleaned;
        messageLines = typeof VC.splitMessageLines == "function" ? VC.splitMessageLines(plain) : [];
        if (!messageLines.length) return;
        const tScan = Date.now();
        // Shared with injectChatMsgActions, which normally ran moments earlier on
        // this same bubble. The text came back with the scan, so no second read.
        const scan = await nxScanBubbleHosts(msgEl);
        for (const row of scan.rows) {
          if (!(typeof VC.splitMessageLines == "function" ? VC.splitMessageLines(row.text) : []).length) continue;
          hosts.push(row.el);
          hostTags.push(row.name || "DIV");
          hostTexts.push(row.text);
        }
        if (!hosts.length) return;
        rawCount = scan.raw;
        msScan = Date.now() - tScan;
        nxPlaceCacheSet(lockKey, msgEl, { hosts, hostTags, hostTexts, messageLines, rawCount });
      }
      const bySlot = new Map();
      for (const p of placements) {
        const line = typeof VC.clampShotLine == "function"
          ? VC.clampShotLine(p.line, messageLines.length)
          : Math.floor(Number(p.line));
        if (!line) continue;
        const planned = { ...p, line };
        const slot = typeof VC.inlinePlacementSlotKey == "function"
          ? VC.inlinePlacementSlotKey(planned)
          : \`l\${line}\`;
        if (bySlot.has(slot)) continue;
        bySlot.set(slot, planned);
      }
      let placed = 0;
      const placedIds = new Set();
      const usedNodes = new Set();
      // Mutable card ids point at permanent slot nodes. Reroll changes the id,
      // not the slot, so the wrapper never needs to be replaced.
      const shotNodes = new Map();
      const frameBySlot = new Map();
      const frameById = new Map();
      for (const row of prevProbe) {
        const mark = {
          node: row.node,
          id: row.id,
          slot: row.slot,
          pending: !row.ready,
          ready: row.ready,
          layoutVersion: row.layoutVersion
        };
        if (mark.slot && !frameBySlot.has(mark.slot)) frameBySlot.set(mark.slot, mark);
        if (mark.id && !frameById.has(mark.id)) frameById.set(mark.id, mark);
      }
      // Host marker lists, read once per host instead of once per shot. Kept in
      // sync as this pass prepends, since mounted frames are never removed.
      const hostMarks = new Map();
      const marksFor = async (idx, host) => {
        if (hostMarks.has(idx)) return hostMarks.get(idx);
        const info = (await nxProbeInlineShots(host, unwrapSafe)).map((row) => ({
          node: row.node,
          id: row.id,
          slot: row.slot,
          pending: !row.ready,
          ready: row.ready,
          layoutVersion: row.layoutVersion
        }));
        hostMarks.set(idx, info);
        return info;
      };
      const syncFrameMeta = async (node, shot) => {
        if (!node) return !1;
        const id = String(shot.cardId || "");
        const slot = typeof VC.inlinePlacementSlotKey == "function"
          ? VC.inlinePlacementSlotKey(shot)
          : \`s\${Number(shot.shotIndex) || 0}\`;
        return await nxRunInlineOwnerMutation(ownerClaim, async (isCurrent) => {
          try {
            const setMeta = async (name, value) => {
              if (!isCurrent() || typeof node.setAttribute != "function") return !1;
              await node.setAttribute(name, value);
              return isCurrent();
            };
            if (id && !(await setMeta("x-inlay-inline-shot", id))) return !1;
            if (!(await setMeta("x-inlay-inline-slot", slot))) return !1;
            if (!(await setMeta("x-inlay-inline-layout", String(VC.INLINE_FRAME_LAYOUT_VERSION || "")))) return !1;
            if (!(await setMeta("x-inlay-inline-pending", shot.pending ? "1" : "0"))) return !1;
            if (!(await setMeta("x-inlay-inline-key", String(lockKey)))) return !1;
            if (!(await setMeta("x-inlay-inline-owner", String(injectLockKey)))) return !1;
            if (!isCurrent()) return !1;
            const spins = await unwrapSafe(await node.querySelectorAll("[data-inlay-inline-spin]"));
            if (!isCurrent()) return !1;
            const spin = spins[0];
            if (spin) {
              const size = typeof VC.inlinePlaceholderSize == "function" ? VC.inlinePlaceholderSize(shot) : null;
              if (typeof spin.setStyleAttribute == "function" && typeof VC.inlineChatSpinnerImgStyle == "function") {
                const geometry = size?.width && size?.height
                  ? \`;width:\${Number(size.width)}px;aspect-ratio:\${Number(size.width)}/\${Number(size.height)}\`
                  : "";
                await spin.setStyleAttribute(VC.inlineChatSpinnerImgStyle(scaleNow) + geometry);
                if (!isCurrent()) return !1;
              }
            }
            await nxEnsureInlinePhotoLayers(node, unwrapSafe, doc, VC);
            return isCurrent();
          } catch {
            return !1;
          }
        });
      };
      const prependShot = async (host, hostIdx, shot) => {
        // The hash goes onto the marker so the next paint can prove this bubble
        // is untouched with one query instead of rescanning every paragraph.
        const markerHtml = VC.markerBlockHtml(shot, t.backendSettings?.card?.inline_chat_scale_pct ?? 100, lockKey, injectLockKey);
        if (!markerHtml || !host || typeof host.prepend != "function") return !1;
        try {
          const tmp = await H(doc, "div", { html: markerHtml });
          const kids = await unwrapSafe(typeof tmp?.getChildren == "function" ? await tmp.getChildren() : null);
          const wrap = kids[0];
          if (wrap) {
            const mounted = await nxRunInlineOwnerMutation(ownerClaim, async (isCurrent) => {
              if (!isCurrent()) return !1;
              await host.prepend(wrap);
              return isCurrent();
            });
            if (!mounted) return !1;
            if (!await syncFrameMeta(wrap, shot)) {
              await nxAbandonInlineFrame(wrap);
              return !1;
            }
            let liveId = "";
            try {
              if (typeof wrap.getAttribute == "function") liveId = String(await wrap.getAttribute("x-inlay-inline-shot") || "");
            } catch {
            }
            if (!liveId) {
              await nxAbandonInlineFrame(wrap);
              return !1;
            }
            const id = String(shot.cardId || "");
            const slot = typeof VC.inlinePlacementSlotKey == "function"
              ? VC.inlinePlacementSlotKey(shot)
              : \`s\${Number(shot.shotIndex) || 0}\`;
            if (id) shotNodes.set(id, wrap);
            const marks = hostMarks.get(hostIdx);
            const mark = { node: wrap, id, slot, pending: !nxReadyImg(shot.src), ready: nxReadyImg(shot.src), layoutVersion: String(VC.INLINE_FRAME_LAYOUT_VERSION || "") };
            if (Array.isArray(marks)) marks.unshift(mark);
            if (slot) frameBySlot.set(slot, mark);
            if (id) frameById.set(id, mark);
            if (wantPhotos && shot.src && !shot.pending) await patchShotSrc(wrap, shot.src, id);
            return !0;
          }
        } catch {
        }
        return !1;
      };
      const applyShot = async (shot) => {
        if (!nxInlineOwnerEpochCurrent(ownerClaim)) return !1;
        const id = String(shot.cardId || "");
        if (id && placedIds.has(id) && (shot.pending || !nxReadyImg(shot.src))) return !1;
        const slot = typeof VC.inlinePlacementSlotKey == "function"
          ? VC.inlinePlacementSlotKey(shot)
          : \`s\${Number(shot.shotIndex) || 0}\`;
        const line = Number(shot.line);
        if (!line || !Number.isFinite(line)) return !1;
        const hit = VC.findElementIndexForLineWithFallback(hostTexts, hostTags, messageLines, line, ["P"]);
        if (!hit || hit.elementIndex < 0 || hit.elementIndex >= hosts.length) return !1;
        const host = hosts[hit.elementIndex];
        if (!host) return !1;
        const marks = await marksFor(hit.elementIndex, host);
        if (!nxInlineOwnerEpochCurrent(ownerClaim)) return !1;
        let mark = slot ? frameBySlot.get(slot) : null;
        if (mark?.node && usedNodes.has(mark.node)) mark = null;
        if (!mark && id) mark = frameById.get(id);
        if (mark?.node && usedNodes.has(mark.node)) mark = null;
        if (!mark) mark = marks.find((m) => m.node && !m.slot && !usedNodes.has(m.node));
        const node = mark?.node || null;
        const live = mark ? { cardId: mark.id, pending: mark.pending, layoutVersion: mark.layoutVersion } : null;
        const action = typeof VC.reconcileInlineShot == "function"
          ? VC.reconcileInlineShot(shot, live)
          : live ? { op: "fill", placement: shot } : { op: "prepend", placement: shot };
        if (node && action.op !== "prepend") {
          if (!nxInlineOwnerEpochCurrent(ownerClaim)) return !1;
          if (mark?.id && mark.id !== id) await nxDropInlineSubsForWrap(node);
          if (!nxInlineOwnerEpochCurrent(ownerClaim)) return !1;
          if (!(await syncFrameMeta(node, shot))) return !1;
          if (!nxInlineOwnerEpochCurrent(ownerClaim)) return !1;
          if (wantPhotos && shot.src && !shot.pending && node) {
            const shown = mark?.ready && mark.id === id
              ? await nxShowInlinePhotoWrap(node, unwrapSafe, doc, VC, { ownerClaim, expectedId: id })
              : await patchShotSrc(node, shot.src, id);
            if (shown && mark) mark.pending = !1, mark.ready = !0;
          }
          if (mark?.slot && mark.slot !== slot && frameBySlot.get(mark.slot) === mark) frameBySlot.delete(mark.slot);
          if (mark?.id && mark.id !== id) frameById.delete(mark.id);
          if (mark) mark.id = id, mark.slot = slot, mark.pending = !!shot.pending && !nxReadyImg(shot.src);
          if (slot) frameBySlot.set(slot, mark);
          if (id) frameById.set(id, mark);
          if (id && node) shotNodes.set(id, node);
          usedNodes.add(node);
          if (id) placedIds.add(id);
          return action.op === "fill";
        }
        const did = await prependShot(host, hit.elementIndex, action.placement || shot);
        if (did) {
          placed += 1;
          if (id) placedIds.add(id);
        }
        return did;
      };
      const tPlace = Date.now();
      for (const [, shot] of bySlot) {
        await applyShot(shot);
      }
      const msPlace = Date.now() - tPlace;
      const tWatch = Date.now();
      // Every linked card now owns a marker, so the paint is finished. The bytes
      // are separate: each missing id fills the hidden permanent cell and then
      // opacity-swaps it. No retry pass and no structural message repaint.
      if (wantPhotos && nxInlineOwnerEpochCurrent(ownerClaim)) {
        nxWatchInlineShots(lockKey, encodeLater, shotNodes, patchShotSrc, ownerClaim);
      }
      const msWatch = Date.now() - tWatch;
      const msLeft = 0;
      y("info", "inline.inject", \`shots=\${placements.length}+enc\${encodeLater.length} placed=\${placed} watch=\${nxInlineSubIds(lockKey).size} pending=\${placements.filter((p) => p.pending).length}\`);
      y("info", "inline.inject.ms", \`total=\${Date.now() - tStart} html=\${msHtml} scan=\${cacheHit ? "cached" : msScan}(hosts=\${hosts.length}/\${rawCount}) place=\${msPlace} watch=\${msWatch} left=\${msLeft}\`);
      t._inlinePaintScale = scaleNow;
    } catch (err) {
      // A throw leaves the bubble half-painted; drop any watcher it registered so
      // the next pass rebuilds from a known state instead of double-filling.
      nxDropInlineSubs(lockKey);
      y("warn", "inline.inject.fail", z(err?.message || err, 120));
    }
    } finally {
      release();
      if (t._inlineInjectTicket.get(injectLockKey) === ticket) t._inlineInjectLocks.delete(injectLockKey);
    }
  }
  // No attach retry ladder. A pass used to re-run itself up to five times
  // because it could finish with chips and no image; now the markers land in one
  // shot and each image arrives on its own subscription, so there is nothing to
  // retry. The one remaining wait is nxWaitNewestDom, and it is an await in the
  // sequence rather than a driver.
  // Session listing window. Wide enough for the viewer strip (8) plus the inline
  // window and normal browsing; older cards arrive by hash, not by raising this.
  const NX_GALLERY_WINDOW = 120;
  /** Hashes the next paint needs, cheap and synchronous — ce() is a hot path. */
  function nxCeWantHashes() {
    const out = [];
    const add = (h) => {
      const s = String(h || "").trim();
      if (s && !out.includes(s)) out.push(s);
    };
    add(t.selectedMessage?.hash);
    add(t.lastImagedMessage?.hash);
    for (const h of Array.isArray(t._inlineKeepHashes) ? t._inlineKeepHashes : []) add(h);
    return out.slice(0, 12);
  }
  /**
   * Pulls one message's cards in when they sit outside the loaded window.
   * A hash that comes back empty is remembered so a message with no shots does
   * not re-ask on every paint.
   */
  async function nxEnsureCardsForHash(hash) {
    const h = String(hash || "").trim();
    if (!h) return !1;
    if (!(t._galleryHashMiss instanceof Set)) t._galleryHashMiss = new Set();
    if (t._galleryHashMiss.has(h)) return !1;
    if ((t.gallery || []).some((card) => String(card?.content_hash || "") === h)) return !0;
    const sid = t.lastScope?.sessionId || t.selectedMessage?.sessionId || "";
    if (!sid) return !1;
    let res = null;
    try {
      res = await K(\`/v1/gallery?session_id=\${encodeURIComponent(sid)}&limit=0&hashes=\${encodeURIComponent(h)}\`, { method: "GET" }, 8e3);
    } catch {
      return !1;
    }
    const rows = Array.isArray(res?.items) ? res.items : [];
    if (!rows.length) {
      t._galleryHashMiss.add(h);
      return !1;
    }
    const VCm = globalThis.__INLAY_VIEWER_CORE__;
    if (typeof VCm?.mergeSessionGallery == "function") {
      t.gallery = VCm.mergeSessionGallery({
        prev: t.gallery,
        next: rows,
        total: nxResTotal(res),
        windowOldestAt: null,
        askedHashes: [h],
        cap: 2000
      }).cards;
    } else {
      t.gallery = [...(t.gallery || []), ...rows];
    }
    y("info", "gallery.hash.fetch", \`\${h.slice(0, 8)} rows=\${rows.length}\`);
    return !0;
  }
  function nxResTotal(res) {
    const n = Number(res?.total);
    return Number.isFinite(n) ? n : 0;
  }
  function nxCardDisplaySrc(card) {
    try {
      const N = globalThis.__INLAY_NATIVE__;
      let src = typeof N?.resolveImageUrl == "function" ? String(N.resolveImageUrl(card || {}) || "") : "";
      if (!nxReadyImg(src) && typeof Ie == "function") {
        const fb = Ie(card);
        if (nxReadyImg(fb)) src = fb;
      }
      return src;
    } catch {
      return "";
    }
  }
  async function nxPatchInlinePhotoByCardId(cardId, src, prevId, rootEl, rootKey) {
    const id = String(cardId || "");
    const prev = String(prevId || "");
    const lookIds = [];
    if (prev && prev !== id) lookIds.push(prev);
    if (id) lookIds.push(id);
    if (!lookIds.length) return !1;
    let displaySrc = String(src || "");
    const N = globalThis.__INLAY_NATIVE__;
    if (!nxReadyImg(displaySrc) && id && typeof N?.ensureImageUrl == "function") {
      try {
        displaySrc = String(await N.ensureImageUrl(id) || "");
      } catch {
        displaySrc = "";
      }
    }
    if (!nxReadyImg(displaySrc)) return !1;
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    const card = (t.gallery || []).find((row) => {
      const rowId = String(row?.id || "");
      return rowId === id || !!prev && rowId === prev;
    }) || null;
    const slot = typeof VC?.inlinePlacementSlotKey == "function"
      ? String(VC.inlinePlacementSlotKey(card) || "")
      : "";
    let key = String(rootKey || nxInlineRootKeyForCard(card) || "");
    if (!/^[A-Za-z0-9_-]+$/.test(key) && t.selectedMessage) {
      const stamp = nxInlineStampKey(t.selectedMessage);
      if (stamp) key = ye(stamp);
    }
    const safeKey = /^[A-Za-z0-9_-]+$/.test(key) ? key : "";
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
    const roots = [t.hostDoc, rootEl].filter((root, at, all) => root && all.indexOf(root) === at);
    let exactHits = [];
    for (const look of lookIds) {
      if (!/^[A-Za-z0-9_-]+$/.test(look)) continue;
      const selector = '[x-inlay-inline-key="' + safeKey + '"][x-inlay-inline-shot="' + look + '"],'
        + '[data-inlay-inline-key="' + safeKey + '"][data-inlay-inline-shot="' + look + '"]';
      for (const root of roots) {
        if (typeof root.querySelectorAll != "function") continue;
        try {
          const wraps = await unwrapSafe(await root.querySelectorAll(selector));
          for (const wrap of wraps) {
            if (wrap && !exactHits.some((hit) => hit.wrap === wrap)) exactHits.push({ wrap, look });
          }
        } catch {
        }
      }
      if (exactHits.length) break;
    }
    if (!exactHits.length) {
      for (const look of lookIds) {
        if (!/^[A-Za-z0-9_-]+$/.test(look)) continue;
        const idSel = '[x-inlay-inline-shot="' + look + '"],[data-inlay-inline-shot="' + look + '"]';
        for (const root of roots) {
          if (typeof root.querySelectorAll != "function") continue;
          try {
            const wraps = await unwrapSafe(await root.querySelectorAll(idSel));
            for (const wrap of wraps) {
              if (wrap && !exactHits.some((hit) => hit.wrap === wrap)) exactHits.push({ wrap, look });
            }
          } catch {
          }
        }
        if (exactHits.length) break;
      }
    }
    let slotHit = null;
    if (!exactHits.length && safeKey && slot && /^[sl]\\d+$/.test(slot)) {
      for (const root of roots) {
        if (typeof root.querySelector != "function") continue;
        try {
          slotHit = await root.querySelector(
            '[x-inlay-inline-key="' + safeKey + '"][x-inlay-inline-slot="' + slot + '"],'
            + '[data-inlay-inline-key="' + safeKey + '"][data-inlay-inline-slot="' + slot + '"]'
          );
          if (slotHit) break;
        } catch {
          slotHit = null;
        }
      }
    }
    const hits = exactHits.length ? exactHits : slotHit ? [{ wrap: slotHit, look: slot }] : [];
    let patched = !1;
    for (const hit of hits) {
      const wrap = hit.wrap;
      try {
        let ownerKey = "";
        if (typeof wrap.getAttribute == "function") {
          ownerKey = String(await wrap.getAttribute("x-inlay-inline-owner") || "");
        }
        if (!ownerKey && typeof VC?.inlineInjectOwnerKey == "function") {
          ownerKey = ye(VC.inlineInjectOwnerKey(card, -1, card?.session_id ?? card?.sessionId));
        }
        const ownerClaim = nxBeginInlineOwnerEpoch(ownerKey);
        await nxDropInlineSubsForWrap(wrap);
        const stamped = await nxRunInlineOwnerMutation(ownerClaim, async (isCurrent) => {
          const setMeta = async (name, value) => {
            if (!isCurrent() || typeof wrap.setAttribute != "function") return !1;
            await wrap.setAttribute(name, value);
            return isCurrent();
          };
          if (id && hit.look !== id) {
            if (!(await setMeta("x-inlay-inline-shot", id))) return !1;
            if (!(await setMeta("x-inlay-inline-pending", "0"))) return !1;
            if (slot && !(await setMeta("x-inlay-inline-slot", slot))) return !1;
            if (!(await setMeta("x-inlay-inline-layout", String(VC?.INLINE_FRAME_LAYOUT_VERSION || "")))) return !1;
          }
          if (safeKey && !(await setMeta("x-inlay-inline-key", safeKey))) return !1;
          if (ownerKey && !(await setMeta("x-inlay-inline-owner", ownerKey))) return !1;
          return isCurrent();
        });
        if (!stamped) continue;
        if (await nxSwapInlinePhoto(wrap, displaySrc, unwrapSafe, t.hostDoc, VC, {
          ownerClaim,
          expectedId: id
        })) patched = !0;
      } catch {
      }
    }
    return patched;
  }
  async function refreshSelectedInlineImages(force, opts) {
    if (t.backendSettings?.card?.inline_chat_images !== !0 && nxMsgAct() === "off") {
      hideAttachToast().catch(() => {});
      return;
    }
    const onlySel = !!(opts && opts.onlySel);
    const sel = t.selectedMessage;
    if (!sel) return;
    t._inlinePhotoSyncGen = (Number(t._inlinePhotoSyncGen) || 0) + 1;
    const gen = (Number(t._inlinePassGen) || 0) + 1;
    t._inlinePassGen = gen;
    const stale = () => Number(t._inlinePassGen) !== gen;
    const nxRebind = async (msg, fallback) => {
      try {
        if (await nxEnsureCardsForHash(msg?.hash)) {
          const hit = linkedCards(msg);
          if (hit.length) return hit;
        }
      } catch {
      }
      return await maybeRebindAndLink(msg) || fallback;
    };
    try {
      const doc = await ue().catch(() => t.hostDoc);
      if (!doc) return;
      if (force) t._msgElsCache = null;
      let els = [];
      try {
        els = await getCachedMsgEls(doc);
      } catch {
        els = [];
      }
      if (!Array.isArray(els) || !els.length) return;
      const selIdx = Number(sel.domIndex);
      if (!Number.isFinite(selIdx) || selIdx < 0 || selIdx >= els.length) return;
      const VC = globalThis.__INLAY_VIEWER_CORE__;
      const radius = typeof VC?.clampInlineDomRadius == "function"
        ? VC.clampInlineDomRadius(t.backendSettings?.card?.inline_chat_dom_radius)
        : Math.max(3, Math.min(20, Math.round(Number(t.backendSettings?.card?.inline_chat_dom_radius) || 4)));
      const spinnerIdxs = onlySel
        ? [selIdx]
        : typeof VC?.inlineDomWindow == "function"
          ? VC.inlineDomWindow(selIdx, els.length, radius)
          : [];
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
          // Da already bound this bubble. Re-matching it through qa was how a
          // refresh/re-enter dropped the cards the chips were already using.
          if (idx === selIdx && sel) {
            row = { idx, msg: sel, text: text.length >= 4 ? text : w(sel.text || "") || text };
          } else if (text.length >= 4) {
            const hit = typeof qa == "function"
              ? qa(text, msgs, idx, els.length, {})
              : null;
            row = { idx, msg: hit || { text, hash: "", role: "", chatIndex: idx }, text };
          }
        } catch {
          row = idx === selIdx && sel ? { idx, msg: sel, text: w(sel.text || "") } : null;
        }
        msgCache.set(idx, row);
        return row;
      };
      const roleAt = (idx) => {
        if (roleCache.has(idx)) return roleCache.get(idx);
        const row = msgCache.get(idx);
        const role = typeof VC?.roleForInlineBubble == "function"
          ? VC.roleForInlineBubble({
            idx,
            selIdx,
            selRole: sel.role,
            selHash: sel.hash,
            liveHash: row?.msg?.hash,
            matchedRole: row?.msg?.role,
            domText: row?.text,
            matchedText: row?.msg?.text
          })
          : String(row?.msg?.role || (idx === selIdx ? sel.role : "") || "");
        roleCache.set(idx, role);
        return role;
      };
      const isSkipBodyAt = (idx) => {
        const row = msgCache.get(idx);
        return typeof VC?.isInlineSkipBody == "function" ? VC.isInlineSkipBody(row?.text) : !1;
      };
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
      const evictPhotosIn = async (el) => {
        await nxHideInlinePhotos(el);
      };
      const nextPhotoEls = [];
      for (const idx of spinnerIdxs) {
        if (stale()) return;
        await resolveAt(idx);
        if (isSkipBodyAt(idx)) continue;
        const role = roleAt(idx);
        const wantPhoto = typeof VC?.shouldOverlayInlinePhoto == "function"
          ? VC.shouldOverlayInlinePhoto({ idx, selIdx, length: els.length, role })
          : !1;
        if (wantPhoto) nextPhotoEls.push({ idx, el: els[idx] });
      }
      const nextPhotoIdx = new Set(nextPhotoEls.map((row) => row.idx));
      if (!onlySel) {
        for (const prev of Array.isArray(t._inlinePhotoEls) ? t._inlinePhotoEls : []) {
          if (nextPhotoIdx.has(Number(prev?.idx)) && prev.el === els[prev.idx]) continue;
          await evictPhotosIn(prev.el);
        }
        for (const idx of spinnerIdxs) {
          if (!nextPhotoIdx.has(idx)) await evictPhotosIn(els[idx]);
        }
      }
      for (const idx of spinnerIdxs) {
        if (stale()) return;
        const row = msgCache.get(idx) || await resolveAt(idx);
        if (isSkipBodyAt(idx)) continue;
        let cards = [];
        try {
          if (row?.msg) {
            cards = linkedCards(row.msg) || [];
            if (!cards.length) cards = await nxRebind(row.msg, []);
            if (typeof VC?.cardsForInlineBubble == "function") {
              cards = VC.cardsForInlineBubble({
                cards,
                role: roleAt(idx),
                allRoles: !1,
                selHash: sel.hash,
                liveHash: row.msg.hash,
                isSelectionSlot: idx === selIdx
              });
            }
          }
        } catch {
          cards = [];
        }
        const frameKey = nxInlineStampKey(row?.msg)
          || (idx === selIdx ? nxInlineStampKey(sel) : "")
          || \`\${String(row?.msg?.sessionId || sel.sessionId || "")}|\${String(row?.msg?.hash || sel.hash || "unknown")}|d\${idx}\`;
        const lockKey = ye(frameKey);
        const injectOwner = typeof VC?.inlineInjectOwnerKey == "function"
          ? VC.inlineInjectOwnerKey(row?.msg, idx, sel.sessionId)
          : \`\${String(row?.msg?.sessionId || sel.sessionId || "unknown")}|\${Number.isInteger(Number(row?.msg?.messageIndex ?? row?.msg?.chatIndex)) ? \`m\${Number(row?.msg?.messageIndex ?? row?.msg?.chatIndex)}\` : \`d\${idx}\`}\`;
        await injectChatMsgActions(els[idx], cards, idx);
        if (t.backendSettings?.card?.inline_chat_images === !0) {
          await injectChatInlineImages(els[idx], cards, idx === selIdx ? nxPendingForInlineSelection(sel) : [], {
            lockKey,
            injectLockKey: ye(injectOwner),
            role: roleAt(idx),
            allRoles: !1,
            wantPhotos: nextPhotoIdx.has(idx),
            confirmedEmpty: !cards.length && String(t._galleryCache?.sessionId || "") === String(row?.msg?.sessionId || sel.sessionId || "")
          });
        }
      }
      if (onlySel) {
        const rest = (Array.isArray(t._inlinePhotoEls) ? t._inlinePhotoEls : []).filter((row) => Number(row?.idx) !== selIdx);
        t._inlinePhotoEls = [...rest, ...nextPhotoEls];
      } else {
        t._inlinePhotoEls = nextPhotoEls;
      }
      hideAttachToast({ done: 1 }).catch(() => {});
    } catch (err) {
      y("warn", "inline.refresh.fail", z(err?.message || err, 100));
    }
  }
  async function openSettingsTab(tab) {
    const next = String(tab || "");
    if (next !== "characters" && next !== "style_presets") return;
    t.uiTab = next;
    if (typeof At != "function") return;
    await At();
  }
  async function openMsgCharPicker(message) {
    if (typeof document > "u" || !document.body) throw new Error("plugin document unavailable");
    if (t.msgCharPickerUi?.close) await t.msgCharPickerUi.close();
    const text = String(message?.text || "");
    const scope = await Z({ useOverride: !1 }).catch(() => t.lastScope || null);
    const res = await K("/v1/characters/triggered", {
      method: "POST",
      body: {
        message: text,
        session_id: scope?.sessionId || "",
        character_id: scope?.characterId || "",
        unified_session_id: scope?.unifiedSessionId || \`risu_\${ye(\`\${scope?.characterId || ""}|__unified__\`)}\`,
        source_session_ids: typeof rootChatSessionIds == "function" ? rootChatSessionIds(scope) : []
      }
    }, 2e4);
    void ensureViewerRosterLoaded().catch(() => null);
    const withScope = (character) => {
      const scopeId = character.scope || scope?.sessionId || "session";
      const rosterRow = { ...character, scope: scopeId };
      return { ...rosterRow, roster: rosterRow };
    };
    const matched = (Array.isArray(res?.characters) ? res.characters : [])
      .filter((character) => character?.name)
      .map(withScope);
    y("info", "msg.char_picker", \`dom=\${text.length} hit=\${matched.length}\`);
    if (!matched.length) {
      if (typeof nxHostToast == "function") await nxHostToast("이 메시지에서 트리거된 캐릭터가 없습니다.", { ms: 1800 });
      return;
    }
    const seenNames = new Set();
    const duplicateNames = new Set();
    for (const character of matched) {
      const name = String(character.name);
      if (seenNames.has(name)) duplicateNames.add(name);
      else seenNames.add(name);
    }
    const canOwnContainer = !t.uiOpen && !t.charEditUi && !t.cardTagUi && !t.charCreateUi;
    const openedContainer = canOwnContainer;
    if (typeof k.showContainer != "function") throw new Error("fullscreen container unavailable");
    await k.showContainer("fullscreen");
    document.body.style.cssText = "margin:0;min-height:100vh;background:transparent;font:13px/1.45 Segoe UI,sans-serif;color:#e2e8f0;";
    await hideFloatingViewerForModal();
    const root = document.createElement("div");
    root.id = "nx-msg-char-picker";
    root.setAttribute("data-mcp-root", "1");
    root.innerHTML = '<div data-mcp-backdrop style="position:fixed;inset:0;z-index:100000;background:rgba(4,8,16,.72);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box"><div data-mcp-card style="width:min(440px,100%);max-height:min(86vh,720px);background:linear-gradient(165deg,#1a1f2e,#0c1018);border:1px solid rgba(151,139,255,.4);border-radius:16px;box-shadow:0 28px 80px rgba(0,0,0,.55);display:flex;flex-direction:column;overflow:hidden"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08)"><div><div style="font-weight:700;font-size:15px;color:#e8eef8">트리거된 캐릭터</div><div style="margin-top:3px;color:#9aa6b8;font-size:11px">태그를 수정할 캐릭터를 선택하세요</div></div><button type="button" data-mcp-x style="cursor:pointer;border:0;background:rgba(255,255,255,.08);color:#e2e8f0;padding:6px 10px;border-radius:8px">✕</button></div><div data-mcp-list style="padding:12px;display:grid;gap:8px;overflow:auto"></div></div></div>';
    const backdrop = root.querySelector("[data-mcp-backdrop]");
    const list = root.querySelector("[data-mcp-list]");
    let closed = !1;
    const closePicker = async (opts = {}) => {
      if (closed) return;
      closed = !0;
      document.removeEventListener("keydown", onKeyDown);
      root?.remove?.();
      if (t.msgCharPickerUi?.root === root) t.msgCharPickerUi = null;
      if (opts.handoff) return;
      await restoreFloatingViewerAfterModal();
      if (openedContainer && !t.uiOpen && !t.charEditUi && !t.cardTagUi && typeof k.hideContainer == "function") {
        await k.hideContainer();
      }
      if (typeof Ht == "function") await Ht();
    };
    const cleanupFailedCharHandoff = async (failedGen) => {
      t._msgCharPickerHandoff = !1;
      const ownsFailedOpen = Number(t._editOpenGen || 0) === failedGen;
      if (!ownsFailedOpen) return;
      const failedUi = t.charEditUi;
      const ownedContainer = openedContainer || !!failedUi?.openedContainer;
      if (ownsFailedOpen && typeof xe == "function") {
        try {
          await xe();
        } catch {
        }
      }
      const remaining = t.charEditUi || (failedUi?._stub ? failedUi : null);
      if (remaining?._stub && Number(remaining._openGen || failedGen) === failedGen) {
        try {
          remaining.root?.remove?.();
        } catch {
        }
        if (t.charEditUi === remaining) t.charEditUi = null;
      }
      if (t.autotagFocus?.scope === "modal") t.autotagFocus = null;
      if (t.charRefFocus?.scope === "modal") t.charRefFocus = null;
      if (t.overlayUi && !t.cardTagUi && !t.uiOpen) t.overlayUi._stickyEditorOpen = !1;
      await restoreFloatingViewerAfterModal();
      if (ownedContainer && !t.uiOpen && !t.cardTagUi && !t.charEditUi && typeof k.hideContainer == "function") {
        await k.hideContainer();
      }
      if (typeof Ht == "function") await Ht();
    };
    const onKeyDown = (ev) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        void closePicker();
      }
    };
    for (const picked of matched) {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("data-mcp-character", String(picked.id || picked.name));
      button.style.cssText = "cursor:pointer;width:100%;border:1px solid rgba(151,139,255,.3);background:rgba(124,108,255,.12);color:#e8eef8;padding:11px 12px;border-radius:11px;text-align:left;font:700 13px/1.35 Segoe UI,sans-serif";
      const scopeLabel = picked.scope === "__global__" ? "글로벌" : "채팅";
      button.textContent = duplicateNames.has(String(picked.name))
        ? String(picked.name) + " · " + scopeLabel
        : String(picked.name);
      button.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        await closePicker({ handoff: !0 });
        const failedGen = Number(t._editOpenGen || 0) + 1;
        t._msgCharPickerHandoff = !0;
        try {
          await Ua(picked);
          if (!t.charEditUi) await cleanupFailedCharHandoff(failedGen);
        } catch (err) {
          await cleanupFailedCharHandoff(failedGen);
          y("error", "msg.char_picker.select.fail", err?.message || err);
        } finally {
          t._msgCharPickerHandoff = !1;
        }
      });
      list?.appendChild(button);
    }
    backdrop?.addEventListener("click", (ev) => {
      if (ev.target === backdrop) void closePicker();
    });
    root.querySelector("[data-mcp-x]")?.addEventListener("click", () => void closePicker());
    document.addEventListener("keydown", onKeyDown);
    document.body.appendChild(root);
    t.msgCharPickerUi = { root, close: closePicker, openedContainer };
  }
  async function clearMsgActionBars(doc) {
    if (!doc || typeof doc.querySelectorAll != "function") return;
    let bars = [];
    try {
      const raw = await doc.querySelectorAll("[x-inlay-msg-actions]");
      if (typeof k.unwarpSafeArray == "function") {
        const unwrapped = await k.unwarpSafeArray(raw);
        bars = Array.isArray(unwrapped) ? unwrapped : unwrapped ? [unwrapped] : [];
      } else {
        bars = Array.isArray(raw) ? raw : raw ? [raw] : [];
      }
    } catch {
      bars = [];
    }
    for (const bar of bars) {
      try {
        if (bar && typeof bar.remove == "function") await bar.remove();
      } catch {
      }
    }
  }
  async function msgChipHit(node) {
    let cur = node;
    let kind = "";
    let index = -1;
    for (let d = 0; cur && d < 10; d += 1) {
      try {
        if (typeof cur.getAttribute == "function") {
          if (!kind) kind = String(await cur.getAttribute("x-inlay-msg-chip") || "");
          const rawIndex = String(await cur.getAttribute("x-inlay-msg-index") || "");
          if (rawIndex !== "") {
            const parsed = Number(rawIndex);
            if (Number.isInteger(parsed) && parsed >= 0) index = parsed;
          }
          if (kind && index >= 0) return { kind, index };
        }
      } catch {
      }
      try {
        cur = typeof cur.getParent == "function" ? await cur.getParent() : (cur.parentElement || cur.parentNode || null);
      } catch {
        cur = null;
      }
    }
    return kind ? { kind, index } : null;
  }
  async function runMsgChipAction(kind, msgIndex) {
    const kind0 = String(kind || "");
    if (!kind0) return;
    let els = [];
    try {
      els = await getCachedMsgEls(t.hostDoc);
    } catch {
      els = [];
    }
    let idx = Number(msgIndex);
    if (!Number.isInteger(idx) || idx < 0 || idx >= els.length) {
      const hint = Number(t.selectedMessage?.domIndex);
      if (Number.isFinite(hint) && hint >= 0) idx = hint;
    }
    if (idx >= 0 && Array.isArray(els) && els[idx]) {
      try {
        await Da(idx, els, { source: "provisional" });
      } catch {
      }
    }
    y("info", "msg.chip.dispatch", \`\${kind0} · DOM#\${idx}\`);
    const A = t.selectedMessage;
    if (kind0 === "stop") {
      try { await optimisticStopJobs(); y("info", "job.stop", "msg-actions"); } catch (err) { y("error", "job.stop.fail", err?.message || err); }
      return;
    }
    if (kind0 === "tag") {
      if (!A?.text) return;
      try {
        const tagStampKey = nxInlineStampKey(A);
        t._inlineNeedStamp = !0;
        t._inlineNeedStampKey = tagStampKey;
        if (tagStampKey) await nxRemoveInlineFramesByKey(t.hostDoc, ye(tagStampKey));
        else if (els[idx]) await nxRemoveInlineFrames(els[idx]);
        await Be(await Z({ useOverride: !1 }), A.text, !0);
        y("info", "regen.tag", "msg-actions");
      } catch (err) { y("error", "regen.tag.fail", err?.message || err); }
      return;
    }
    if (kind0 === "regen") {
      if (!A?.text) return;
      const live = linkedCards(A);
      try {
        if (live.length && typeof rerollMessageImagesLive == "function") {
          const onChipShot = async (_i, result) => {
            try {
              const card = result?.card;
              const replaced = result?.replaced;
              const rootKey = nxInlineStampKey(A);
              await nxPatchInlinePhotoByCardId(card?.id || "", nxCardDisplaySrc(card), replaced?.id || replaced || "", els[idx] || null, rootKey ? ye(rootKey) : "");
            } catch {
            }
          };
          if (typeof withImageRerollToast == "function") await withImageRerollToast("메시지 이미지 전체 재생성 중…", async (report) => rerollMessageImagesLive(A, { report, onShot: onChipShot }));
          else await rerollMessageImagesLive(A, { onShot: onChipShot });
          y("info", "regen.all", "msg-actions");
        } else {
          await Be(await Z({ useOverride: !1 }), A.text, !1);
          y("info", "overlay.generate", "msg-actions");
        }
      } catch (err) { y("error", "msg.gen.fail", err?.message || err); }
      return;
    }
    if (kind0 === "char") {
      try {
        await openMsgCharPicker(A);
      } catch (err) {
        y("error", "msg.char_picker.fail", err?.message || err);
      }
      return;
    }
    if (kind0 === "preset") {
      try { await openSettingsTab("style_presets"); y("info", "settings.tab", "style_presets"); } catch (err) { y("error", "settings.tab.fail", err?.message || err); }
    }
  }
  async function hitMsgChipAt(doc, x, y) {
    if (!doc || nxMsgAct() === "off") return null;
    if (typeof x != "number" || typeof y != "number") return null;
    const collect = async (root) => {
      if (!root || typeof root.querySelectorAll != "function") return [];
      try {
        const raw = await root.querySelectorAll("[x-inlay-msg-chip]");
        if (typeof k.unwarpSafeArray == "function") {
          const u = await k.unwarpSafeArray(raw);
          return Array.isArray(u) ? u : u ? [u] : [];
        }
        return Array.isArray(raw) ? raw : [];
      } catch {
        return [];
      }
    };
    let nodes = await collect(doc);
    if (!nodes.length) {
      try {
        const els = await getCachedMsgEls(doc);
        for (const el of els || []) {
          const extra = await collect(el);
          if (extra.length) nodes = nodes.concat(extra);
        }
      } catch {
      }
    }
    for (const node of nodes) {
      if (!node) continue;
      try {
        if (typeof hitEl == "function" && !await hitEl(node, x, y)) continue;
      } catch {
        continue;
      }
      const hit = await msgChipHit(node);
      if (hit?.kind && hit.index >= 0) return hit;
    }
    return null;
  }
  async function injectChatMsgActions(msgEl, cards, msgIndex) {
    if (!msgEl || typeof msgEl.querySelectorAll != "function") return;
    const on = nxMsgAct() !== "off";
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
    const readBars = async () => {
      try {
        return await unwrapSafe(await msgEl.querySelectorAll("[x-inlay-msg-actions]"));
      } catch {
        return [];
      }
    };
    const removeNode = async (bar) => {
      try {
        if (bar && typeof bar.remove == "function") await bar.remove();
      } catch {
      }
    };
    const removeBars = async (bars) => {
      for (const bar of bars || []) await removeNode(bar);
    };
    if (!on) {
      await removeBars(await readBars());
      return;
    }
    const doc = t.hostDoc;
    if (!doc || typeof H != "function") return;
    const wantSig = "tag|regen|stop|char|preset";
    const msgIdx = Number.isInteger(Number(msgIndex)) && Number(msgIndex) >= 0 ? Number(msgIndex) : -1;
    // The host scan below costs ~4 bridge round-trips per paragraph and it runs
    // before we ever learn the bars are already right. Two bars carrying the
    // wanted signature, both ends and this slot can only be a finished paint.
    const earlyBars = await readBars();
    if (earlyBars.length === 2) {
      const probed = await Promise.all(earlyBars.map(async (bar) => {
        try {
          if (typeof bar?.getAttribute != "function") return null;
          const [sig, end, at] = await Promise.all([
            bar.getAttribute("x-inlay-msg-sig"),
            bar.getAttribute("x-inlay-msg-end"),
            bar.getAttribute("x-inlay-msg-index")
          ]);
          return { bar, sig: String(sig || ""), end: String(end || ""), at: String(at || "") };
        } catch {
          return null;
        }
      }));
      const ends = new Set();
      let intact = probed.every((row) => row && row.sig === wantSig);
      if (intact) for (const row of probed) if (row.end) ends.add(row.end);
      if (intact && ends.has("top") && ends.has("bot")) {
        // The slot may have shifted under an unchanged bubble — the chat is
        // newest-first, so one new message renumbers everything. That is a one
        // attribute write, not a reason to tear the bars down and flash.
        const shifted = probed.filter((row) => row.at !== String(msgIdx));
        for (const row of shifted) {
          try {
            if (typeof row.bar.setAttribute == "function") await row.bar.setAttribute("x-inlay-msg-index", String(msgIdx));
          } catch {
          }
        }
        y("info", "msgact.skip", \`bars=2 already DOM#\${msgIdx}\${shifted.length ? " reindexed" : ""}\`);
        return;
      }
    }
    const scan = await nxScanBubbleHosts(msgEl);
    const hosts = scan.rows.map((row) => row.el);
    if (!hosts.length) {
      await removeBars(await readBars());
      return;
    }
    const targets = hosts.length === 1 ? [hosts[0]] : [hosts[0], hosts[hosts.length - 1]];
    const wantBottom = targets.length > 1;
    const pruneBars = async () => {
      const bars = await readBars();
      const ends = [];
      for (const bar of bars) {
        let end = "";
        try {
          end = typeof bar.getAttribute == "function" ? String(await bar.getAttribute("x-inlay-msg-end") || "") : "";
        } catch {
          end = "";
        }
        ends.push(end);
      }
      const VC = globalThis.__INLAY_VIEWER_CORE__;
      const keepIdx = typeof VC?.keepMsgActionBarIndexes == "function"
        ? VC.keepMsgActionBarIndexes(ends, wantBottom)
        : (() => {
          const out = [];
          const seenEnds = new Set();
          const want = wantBottom ? ["top", "bot"] : ["top"];
          for (let i = 0; i < ends.length; i += 1) {
            const end = ends[i] === "bot" ? "bot" : ends[i] === "top" ? "top" : "";
            if (!end || !want.includes(end) || seenEnds.has(end)) continue;
            seenEnds.add(end);
            out.push(i);
          }
          if (out.length < want.length) {
            for (let i = 0; i < ends.length && out.length < want.length; i += 1) {
              if (!out.includes(i)) out.push(i);
            }
          }
          return out;
        })();
      const keep = new Set((Array.isArray(keepIdx) ? keepIdx : []).map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 0));
      const kept = [];
      for (let i = 0; i < bars.length; i += 1) {
        if (keep.has(i)) kept.push(bars[i]);
        else await removeNode(bars[i]);
      }
      return kept;
    };
    let existing = await pruneBars();
    let knownDifferent = !1;
    const haveEnds = new Set();
    for (const bar of existing) {
      let sig = "";
      let end = "";
      try {
        sig = typeof bar.getAttribute == "function" ? String(await bar.getAttribute("x-inlay-msg-sig") || "") : "";
        end = typeof bar.getAttribute == "function" ? String(await bar.getAttribute("x-inlay-msg-end") || "") : "";
      } catch {
        sig = "";
        end = "";
      }
      if (sig && sig !== wantSig) {
        knownDifferent = !0;
        break;
      }
      if (end) haveEnds.add(end);
    }
    const wantCount = wantBottom ? 2 : 1;
    const haveAll = wantBottom ? haveEnds.has("top") && haveEnds.has("bot") : (haveEnds.has("top") || existing.length === 1);
    if (existing.length === wantCount && !knownDifferent && haveAll) return;
    await removeBars(existing);
    const chipCss = (kind) => kind === "char" || kind === "preset"
      ? "cursor:pointer;border:1px solid rgba(196,181,253,.45);background:rgba(124,108,255,.16);color:#e8eef8;padding:7px 14px;border-radius:10px;font:700 14px Segoe UI,sans-serif;pointer-events:auto;user-select:none;line-height:1.2"
      : kind === "tag"
      ? "cursor:pointer;border:0;background:#0f766e;color:#fff;padding:7px 14px;border-radius:10px;font:700 14px Segoe UI,sans-serif;pointer-events:auto;user-select:none;line-height:1.2"
      : kind === "stop"
      ? "cursor:pointer;border:0;background:#b91c1c;color:#fff;padding:7px 14px;border-radius:10px;font:700 14px Segoe UI,sans-serif;pointer-events:auto;user-select:none;line-height:1.2"
      : "cursor:pointer;border:0;background:#7c6cff;color:#fff;padding:7px 14px;border-radius:10px;font:700 14px Segoe UI,sans-serif;pointer-events:auto;user-select:none;line-height:1.2";
    const chipKinds = ["tag", "regen", "stop", "char", "preset"];
    const chipLabels = { tag: "태그", regen: "재생성", stop: "중단", char: "캐릭터", preset: "프리셋" };
    const chipsHtml = chipKinds.map((kind) =>
      '<span style="' + chipCss(kind) + '">' + chipLabels[kind] + "</span>"
    ).join("");
    const barHtml = '<div contenteditable="false" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:flex-start;margin:10px 0;text-align:left;pointer-events:auto;line-height:1.2">' + chipsHtml + "</div>";
    const prependBar = async (host, end) => {
      if (!host) return null;
      const VCMount = globalThis.__INLAY_VIEWER_CORE__;
      const kind = typeof VCMount?.msgActionMountKind == "function"
        ? VCMount.msgActionMountKind(end, nxMsgAct())
        : (nxMsgAct() === "legacy" && end === "top" ? "parent" : "host");
      let mount = host;
      if (kind === "parent") {
        try {
          const parent = typeof host.getParent == "function" ? await host.getParent() : (host.parentElement || host.parentNode || null);
          const okParent = typeof VCMount?.canMountMsgActionOnParent == "function"
            ? VCMount.canMountMsgActionOnParent(parent, msgEl, nxMsgAct())
            : (nxMsgAct() === "legacy" && parent != null && parent !== msgEl);
          if (okParent && parent && typeof parent.prepend == "function") mount = parent;
        } catch {
        }
      }
      if (!mount || typeof mount.prepend != "function") return null;
      try {
        const tmp = await H(doc, "div", { html: barHtml });
        const kids = await unwrapSafe(typeof tmp?.getChildren == "function" ? await tmp.getChildren() : null);
        const wrap = kids[0];
        if (!wrap) return null;
        await wrap.setAttribute("x-inlay-msg-actions", "1");
        await wrap.setAttribute("x-inlay-msg-sig", wantSig);
        await wrap.setAttribute("x-inlay-msg-end", end);
        await wrap.setAttribute("x-inlay-msg-index", String(msgIdx));
        await wrap.setAttribute("x-inlay-ignore", "true");
        const chipNodes = await unwrapSafe(typeof wrap.getChildren == "function" ? await wrap.getChildren() : null);
        if (chipNodes.length !== chipKinds.length) return null;
        for (let i = 0; i < chipKinds.length; i += 1) {
          await chipNodes[i].setAttribute("x-inlay-msg-chip", chipKinds[i]);
        }
        if (mount === host) await host.prepend(wrap);
        else await mount.prepend(wrap);
        return wrap;
      } catch {
      }
      return null;
    };
    const seen = new Set();
    const ends = wantBottom ? ["top", "bot"] : ["top"];
    for (let i = 0; i < targets.length; i += 1) {
      const host = targets[i];
      if (!host || seen.has(host)) continue;
      seen.add(host);
      await prependBar(host, ends[i] || "top");
    }
    await pruneBars();
  }
  async function ensureMessageInView(el) {`;

const VENDOR_ENSURE_IN_VIEW_NEEDLE =
  `      const o = typeof window < "u" && window.innerHeight || 800;
      if (n.top >= 72 && n.bottom <= o - 48) return;
      const a = await findScrollParent(el), r = n.top + n.height * 0.5 - o * 0.45;
      if (a) {
        const i = await getScrollTopSafe(a);
        if (await setScrollTopSafe(a, i + r)) return;
      }
      typeof window < "u" && window.scrollBy?.({ top: r, behavior: "auto" });`;
const VENDOR_ENSURE_IN_VIEW_PATCH =
  `      return;`;

const VENDOR_INLINE_CALL_NEEDLE =
  `    return await onSelectionChanged("content"), scheduleOverlayPlace(80), t.debugUi?.refreshSoon && t.debugUi.refreshSoon(), (source === "click" || source === "text") && await ensureMessageInView(o), source === "provisional" ? !0 : !isSelectedCharRole(l) ? (y("info", "select.user", "유저 메시지 — 자동 생성 안 함"), !0) : u.length ? (y("info", "select.hasImage", \`cards=\${u.length} · 재생성은 뷰어 버튼\`), !0) : (y("info", "select.noImage", "해시 이미지 없음 → 태그부터 생성"), await Ka(t.selectedMessage.text, t.selectedMessage.hash), !0);
  }`;
const VENDOR_INLINE_CALL_PATCH =
  `    if (source === "provisional" && opts.auto) {
      try {
        await refreshSelectedInlineImages();
      } catch {
      }
    } else if (source === "click" || source === "text" || source === "scroll") {
      try {
        if (await nxBubbleHasInlineFrame(o, linkedCards(t.selectedMessage), nxPendingForInlineSelection(t.selectedMessage))) await nxSyncInlinePhotosOnly();
        else await refreshSelectedInlineImages();
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
    return await onSelectionChanged("content"), scheduleOverlayPlace(80), t.debugUi?.refreshSoon && t.debugUi.refreshSoon(), source === "provisional" ? !0 : !isSelectedCharRole(l) ? (y("info", "select.user", "유저 메시지 — 자동 생성 안 함"), !0) : u.length ? (y("info", "select.hasImage", \`cards=\${u.length} · 재생성은 뷰어 버튼\`), !0) : (y("info", "select.noImage", "해시 이미지 없음 → 태그부터 생성"), await Ka(t.selectedMessage.text, t.selectedMessage.hash), !0);
  }`;

const VENDOR_INLINE_SAME_NEEDLE =
  `      if (linked.length) return !0;
      if (source === "scroll" || source === "provisional") return !0;
      if (source === "text") return !isSelectedCharRole(l) ? !0 : (y("info", "select.same", \`msg#\${i.chatIndex} noImage → retry\`), await Ka(t.selectedMessage.text, t.selectedMessage.hash), !0);
      return !isSelectedCharRole(l) ? !0 : (y("info", "select.same", \`msg#\${i.chatIndex} noImage → retry\`), await Ka(t.selectedMessage.text, t.selectedMessage.hash), !0);
    }`;
const VENDOR_INLINE_SAME_PATCH =
  `      if (source === "provisional" && opts.auto) {
        try {
          await refreshSelectedInlineImages();
        } catch {
        }
      } else if ((source === "click" || source === "text" || source === "scroll") && !(await nxBubbleHasInlineFrame(o, linkedCards(t.selectedMessage), nxPendingForInlineSelection(t.selectedMessage)))) {
        try {
          await refreshSelectedInlineImages();
        } catch {
        }
      }
      // Same message re-click: do not touch inline markers or photos.
      if (linked.length) return !0;
      if (source === "scroll" || source === "provisional") return !0;
      if (source === "text") return !isSelectedCharRole(l) ? !0 : (y("info", "select.same", \`msg#\${i.chatIndex} noImage → retry\`), await Ka(t.selectedMessage.text, t.selectedMessage.hash), !0);
      return !isSelectedCharRole(l) ? !0 : (y("info", "select.same", \`msg#\${i.chatIndex} noImage → retry\`), await Ka(t.selectedMessage.text, t.selectedMessage.hash), !0);
    }`;

/** Pending ownership must update even while the settings/viewer shell is open. */
const VENDOR_INLINE_PENDING_UI_NEEDLE =
  `        }, await Se();
        if (t.uiOpen) {`;
const VENDOR_INLINE_PENDING_UI_PATCH =
  `        }, await Se();
        if (a.state === "done" || a.state === "cancelled" || a.state === "error") {
          t._inlinePending = null;
          t._inlinePendingMsgIndex = -1;
          t._inlinePendingSessionId = "";
        } else if (Array.isArray(r.pending_inline)) {
          t._inlinePending = r.pending_inline;
          const rawPmi = r.pending_message_index ?? r.message_index;
          const pmi = Number(rawPmi);
          t._inlinePendingMsgIndex = rawPmi != null && Number.isInteger(pmi) && pmi >= 0 ? pmi : -1;
          t._inlinePendingSessionId = String(e || "");
        }
        if (t.uiOpen) {`;

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
        if (s && (t.lastJobState = a.state, y("info", "job.poll", \`\${n.slice(0, 8)}… → \${a.state}\`)), r.message && r.message !== t._lastJobMsg && (t._lastJobMsg = r.message, y("info", "job.progress", r.message)), r.message && r.message !== t._lastJobMsg && (t._lastJobMsg = r.message, y("info", "job.progress", r.message)), (a.state === "generating" || a.state === "done") && (c || s && (a.state === "generating" || a.state === "done"))) {
          t._lastShotDone = i;
          const prevIds = (t.gallery || []).map((card) => String(card?.id || ""));
          try {
            // shot_done: force gallery so new cards appear; skip full Da-relink when already linked.
            if (await ce(e, !!(c || a.state === "done")), t.selectedMessage) {
              let l = linkedCards(t.selectedMessage);
              const pendingBusy = Array.isArray(t._inlinePending) && t._inlinePending.length;
              if (a.state === "done" || (!l.length && !pendingBusy)) {
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
          // shot_done / leftover pending: paint even when linked ids did not change.
          if (t.backendSettings?.card?.inline_chat_images === !0) {
            let linkedChanged = !1;
            try {
              const linkedNow = t.selectedMessage ? linkedCards(t.selectedMessage) : [];
              const linkedIds = linkedNow.map((card) => String(card?.id || "")).filter(Boolean).sort().join("|");
              linkedChanged = linkedIds !== String(t._inlineLinkedIds || "");
              if (linkedChanged) t._inlineLinkedIds = linkedIds;
            } catch {
            }
            const pendingKeyNow = typeof VC.pendingInlineKey == "function"
              ? VC.pendingInlineKey(t._inlinePending)
              : Array.isArray(t._inlinePending)
                ? t._inlinePending.map((p) => \`\${Number(p?.shot_index)}:\${Number(p?.line)}\`).sort().join("|")
                : "";
            const pendingChanged = pendingKeyNow !== String(t._inlineKeepPendingKey || "");
            if (idsChanged || linkedChanged || c || pendingChanged || a.state === "done") {
              try {
                const linkedNow = t.selectedMessage ? linkedCards(t.selectedMessage) : [];
                const shotCount = await nxSelectedInlineShotCount();
                const needsStamp = nxNeedsInlineStamp(t.selectedMessage);
                const pendingMatches = nxPendingMatchesInlineSelection(t.selectedMessage);
                if (needsStamp || !shotCount && pendingMatches) {
                  await refreshSelectedInlineImages(!0, { onlySel: !0 });
                  nxFinishInlineStamp(t.selectedMessage);
                } else {
                  const rootKey = nxInlineStampKey(t.selectedMessage);
                  for (const card of linkedNow) {
                    await nxPatchInlinePhotoByCardId(card?.id || "", nxCardDisplaySrc(card), "", null, rootKey ? ye(rootKey) : "");
                  }
                }
              } catch {
              }
            }
          }
        } else if (s || a.state === "generating" || a.state === "tagging" || a.state === "queued") {
          if (t.galleryUi?.paintStatus) await t.galleryUi.paintStatus();
          else await onSelectionChanged("chrome");
          const pendingKeyNow = typeof VC.pendingInlineKey == "function"
            ? VC.pendingInlineKey(t._inlinePending)
            : "";
          if (pendingKeyNow && pendingKeyNow !== String(t._inlineKeepPendingKey || "") && t.backendSettings?.card?.inline_chat_images === !0) {
            try {
              const needsStamp = nxNeedsInlineStamp(t.selectedMessage);
              const pendingMatches = nxPendingMatchesInlineSelection(t.selectedMessage);
              if (needsStamp || !(await nxSelectedInlineShotCount()) && pendingMatches) {
                await refreshSelectedInlineImages(!0, { onlySel: !0 });
                nxFinishInlineStamp(t.selectedMessage);
              }
            } catch {
            }
          }
        }`;

/** Job complete: remount viewer only if gallery/overlay roots were torn down. */
const VENDOR_JOB_DONE_IT_NEEDLE =
  `          }, a.state === "cancelled" ? 600 : 1800), y("info", "gallery.refresh", \`\${(t.gallery || []).length} cards\`), await it();`;
const VENDOR_JOB_DONE_IT_PATCH =
  `          }, a.state === "cancelled" ? 600 : 1800), y("info", "gallery.refresh", \`\${(t.gallery || []).length} cards\`);
          try {
            if (!t.galleryUi?.root || !t.overlayUi?.root) await it();
          } catch {
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
    const VC0 = globalThis.__INLAY_VIEWER_CORE__;
    const bodyN = typeof VC0?.messageBodyCharCount == "function" ? VC0.messageBodyCharCount(e) : String(e || "").length;
    if (!e || bodyN <= 30 || t.jobsInFlight.has(n) || !(await ve()).enabled) {
      t._afterGenAllowManual = !1;
      return;
    }
    if (ge(n).length) {
      t._afterGenAllowManual = !1;
      return;
    }
    try {
      await le();
    } catch {
    }
    const o = t.backendSettings?.card || {};
    if (o.power === !1) {
      t._afterGenAllowManual = !1;
      return;
    }
    // User click respects 발동=수동. Reply / stream-keyword keep _afterGenAllowManual.
    if (o.execute === "manual" && !t._afterGenAllowManual && !t._afterGenRunning) return;
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
    if (!a || a.charIndex < 0) {
      t._afterGenAllowManual = !1;
      return;
    }
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
    if (rebound.length) {
      t._afterGenAllowManual = !1;
      return y("info", "overlay.generate.skip", \`rebound hash=\${n.slice(0, 8)} cards=\${rebound.length}\`);
    }
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
      if (busy?.busy) {
        t._afterGenAllowManual = !1;
        return y("info", "overlay.generate.skip", \`busy_job=\${String(busy.job_id || "").slice(0, 8)} hash=\${n.slice(0, 8)}\`);
      }
    } catch {
    }
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    const sameTurn = typeof VC?.findCardsForMessageIdentity == "function"
      ? VC.findCardsForMessageIdentity(Array.isArray(t.gallery) ? t.gallery : [], turn)
      : [];
    if (sameTurn.length) {
      t._afterGenAllowManual = !1;
      return y("info", "overlay.generate.skip", \`same_turn_cards=\${sameTurn.length} hash=\${n.slice(0, 8)}\`);
    }
    t._afterGenAllowManual = !1;
    y("info", "overlay.generate", \`hash=\${n.slice(0, 8)} chars=\${bodyN} session=\${(a.sessionId || "").slice(-8)}\`), await Be(a, e, !1);
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
  function messageBodyChars(s) {
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    return typeof VC?.messageBodyCharCount == "function" ? VC.messageBodyCharCount(s) : String(s || "").length;
  }
  function stopScriptDomQuietWatcher() {
    if (t._scriptDomQuietTimer) {
      clearInterval(t._scriptDomQuietTimer);
      t._scriptDomQuietTimer = null;
    }
    if (t._streamCheckTimer) {
      clearTimeout(t._streamCheckTimer);
      t._streamCheckTimer = null;
    }
    const timers = t._streamCheckTimerBy || {};
    for (const k of Object.keys(timers)) {
      if (timers[k]) clearTimeout(timers[k]);
    }
    t._streamCheckTimerBy = {};
    t._scriptDomSnapBy = {};
    t._scriptDomSnap = null;
    t._scriptDomSnapReady = !1;
    t._streamLastArmLen = 0;
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
  function armStreamStableCheck(why) {
    const key = why === "tick4s" ? "tick4s" : "chars500";
    t._streamCheckTimerBy = t._streamCheckTimerBy || {};
    if (t._streamCheckTimerBy[key] || t._afterGenRunning || t._afterGenTimer) return;
    y("info", "scriptOutput.arm", \`why=\${why} key=\${key} delay=500ms\`);
    t._streamCheckTimerBy[key] = setTimeout(() => {
      t._streamCheckTimerBy[key] = null;
      if (!t._scriptStreaming || t._afterGenRunning || t._afterGenTimer) return;
      peekNewestBubbleText().then((now) => {
        if (!t._scriptStreaming || t._afterGenRunning || t._afterGenTimer) return;
        const snaps = t._scriptDomSnapBy || (t._scriptDomSnapBy = {});
        const prev = String(snaps[key] || "");
        const grew = now.length - prev.length;
        y("info", "scriptOutput.snap", \`why=\${why} key=\${key} prev=\${prev.length} now=\${now.length} grew=\${grew}\`);
        snaps[key] = now;
        if (!prev || now.length < 500 || grew >= 3) return;
        if (messageBodyChars(now) <= 30) return y("info", "scriptOutput.skip", "body too short after lbdata strip");
        y("info", "scriptOutput.domQuiet5", \`\${key} DOM grew <3 after 0.5s → gen\`);
        t._scriptStreaming = !1;
        stopScriptDomQuietWatcher();
        scheduleAutoGenOnReply("scriptOutput.domQuiet5", now);
      }).catch((err) => {
        y("error", "scriptOutput.domQuiet.fail", err?.message || err);
      });
    }, 5e2);
  }
  function ensureScriptDomQuietWatcher() {
    if (t._scriptDomQuietTimer) return;
    t._scriptDomQuietTimer = setInterval(() => {
      if (!t._scriptStreaming || t._afterGenRunning) {
        stopScriptDomQuietWatcher();
        return;
      }
      armStreamStableCheck("tick4s");
    }, 4e3);
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
      if (card.power === !1) {
        t._afterGenAllowManual = !1;
        y("info", "afterReply.skip", "toggled-off");
        return;
      }
      if (source !== "streamKeywords" && !card.auto_gen_on_reply) {
        t._afterGenAllowManual = !1;
        y("info", "afterReply.skip", "toggled-off");
        return;
      }
      if (source === "streamKeywords" && !card.stream_keywords_enabled) {
        t._afterGenAllowManual = !1;
        y("info", "afterReply.skip", "stream-keywords-off");
        return;
      }
      const o = await ve();
      if (!o.enabled) {
        t._afterGenAllowManual = !1;
        return y("info", "afterReply.skip", "plugin disabled");
      }
      const waitStream = source !== "scriptOutput.domQuiet5" && source !== "streamKeywords";
      if (waitStream) {
        let waited = 0;
        while (await chatIsStreaming()) {
          if (waited >= 2e4) {
            t._afterGenAllowManual = !1;
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
      if (!doc) {
        t._afterGenAllowManual = !1;
        return y("warn", "afterReply.skip", "no host doc");
      }
      t._msgElsCache = null;
      const els = await getCachedMsgEls(doc);
      if (!els?.length) {
        t._afterGenAllowManual = !1;
        return y("warn", "afterReply.skip", "no message elements");
      }
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
      if (picked < 0) {
        t._afterGenAllowManual = !1;
        y("info", "afterReply.skip", \`\${source} no char bubble near DOM head\`);
      }
    } finally {
      t._afterGenRunning = !1;
    }
  }
  async function scheduleAutoGenOnReply(source, textHint) {
    const hint = w(textHint, 5e4);
    if (hint && messageBodyChars(hint) <= 30) {
      y("info", "afterReply.skip", \`\${source} text too short\`);
      return;
    }
    t._afterGenAllowManual = !0;
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
      const replySrc = source === "scriptOutput" || source === "chatOutput" || source === "afterRequest";
      const replyDone = source === "afterRequest" || source === "chatOutput";
      if (!t.selectedMessage && !replySrc) return;
      const doc = await ue().catch(() => t.hostDoc);
      if (!doc) return;
      // Same doc + same bubble count: keep 450ms attendance list (text may grow).
      const els = await getCachedMsgEls(doc);
      if (!els?.length) return;
      // Reply hooks: always newest DOM#0 (do not keep a stale user selection).
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
      const injectInline = async (force) => {
        if (t.backendSettings?.card?.inline_chat_images !== !0) return;
        try {
          await refreshSelectedInlineImages(force);
        } catch {
        }
      };
      if (!linked.length) {
        y("info", "hashRelink.none", \`src=\${source} hash=\${String(msg.hash || "").slice(0, 8)}\`);
        if (replyDone) await injectInline(!0);
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
      // Risu remounts the streaming bubble each chunk — re-attach cached shots.
      await injectInline(!0);
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
    if (typeof schedulePointerSelect == "function") schedulePointerSelect("reply");
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
  function stopStreamKeywordTick() {
    if (t._streamKwTimer) {
      clearInterval(t._streamKwTimer);
      t._streamKwTimer = null;
    }
  }
  function parsedStreamKeywords(card) {
    const SK = globalThis.__INLAY_STREAM_KW__;
    return typeof SK?.parseStreamKeywords == "function" ? SK.parseStreamKeywords(card?.stream_keywords) : [];
  }
  function tickStreamKeywords() {
    const card = t.backendSettings?.card || {};
    const keys = parsedStreamKeywords(card);
    if (!keys.length) {
      stopStreamKeywordTick();
      return;
    }
    if (!card.stream_keywords_enabled) {
      stopStreamKeywordTick();
      return;
    }
    if (t._streamKwFired || t._afterGenRunning || t._afterGenTimer) return;
    if (card.power === !1) return;
    const SK = globalThis.__INLAY_STREAM_KW__;
    const hay = String(t._scriptStreamText || "");
    if (typeof SK?.haystackHasStreamKeyword == "function" && SK.haystackHasStreamKeyword(hay, keys)) {
      t._streamKwFired = !0;
      y("info", "scriptOutput.keyword", "hit → gen");
      scheduleAutoGenOnReply("streamKeywords", hay);
    }
  }
  function ensureStreamKeywordTick() {
    if (t._streamKwTimer) return;
    t._streamKwTimer = setInterval(tickStreamKeywords, 1e3);
  }
  // Streaming chunks: hash relink; 500 chars or every 4s → 0.5s later compare DOM#0 growth.
  async function onScriptOutput(content) {
    try {
      const o = await ve();
      if (!o.enabled) return content;
      const text = w(content, 5e4);
      if (text && text.length > 8) scheduleHashRelinkAfterReply("scriptOutput");
      const prevLen = Number(t._scriptStreamPrevLen) || 0;
      if (text.length < prevLen) t._streamKwFired = !1;
      t._scriptStreamPrevLen = text.length;
      t._scriptStreamText = text;
      const card = t.backendSettings?.card || {};
      if (card.stream_keywords_enabled && parsedStreamKeywords(card).length) ensureStreamKeywordTick();
      else stopStreamKeywordTick();
      if (card.power === !1 || !card.auto_gen_on_reply) return content;
      if (!text || text.length <= 8) return content;
      t._scriptStreaming = !0;
      ensureScriptDomQuietWatcher();
      const lastArm = Number(t._streamLastArmLen) || 0;
      if (text.length - lastArm >= 500) {
        t._streamLastArmLen = text.length;
        armStreamStableCheck("chars500");
      }
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
      const kwAlready = !!t._streamKwFired;
      t._scriptStreamText = a || t._scriptStreamText;
      tickStreamKeywords();
      const kwNow = !!t._streamKwFired;
      stopStreamKeywordTick();
      t._streamKwFired = !1;
      t._scriptStreamPrevLen = 0;
      if (!a || messageBodyChars(a) <= 30)
        return y("info", "afterRequest.skip", "text too short"), e;
      const i = t.backendSettings?.card || {};
      if (i.power === !1) return y("info", "afterRequest.skip", "power off"), e;
      if ((kwAlready || kwNow) && (t._afterGenTimer || t._afterGenRunning)) return y("info", "afterRequest.skip", "stream-keyword already armed"), e;
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
  `"nx-auto-gen-reply": { title: "응답 후 자동 생성", body: "트랙1: 주 채팅(model) afterRequest 후 0.5초 뒤 한 번 생성. 트랙2: 500자마다 / 4초마다 각각 따로 DOM#0을 찍어, 같은 쪽 이전이랑 3글자 미만이면 생성. 500자와 4초는 서로 비교하지 않습니다. [LBDATA START]~END 는 글자 수에서 제외하고, 나머지가 30자 이하면 클릭해도 생성하지 않습니다. 이미 생성 중이면 뒤는 스킵. 보조 모델·유저 말·이미 이미지·Power/토글 OFF는 스킵. 발동 수동/자동과 무관." },`;

const VENDOR_EXECUTE_HELP_NEEDLE =
  `"nx-execute": { title: "발동", body: "자동: 메시지를 골랐는데 이미지가 없으면 바로 생성합니다. 수동: 이미지가 없어도 「지금 생성」을 눌러야만 만듭니다. 응답 후 자동 생성 토글은 별도이며, 발동이 수동일 때는 응답 후 생성도 막힙니다." },`;
const VENDOR_EXECUTE_HELP_PATCH =
  `"nx-execute": { title: "발동", body: "자동: 메시지를 골랐는데 이미지가 없으면 바로 생성합니다. 수동: 이미지가 없어도 「지금 생성」을 눌러야만 만듭니다. 응답 후 자동 생성·스트리밍 키워드는 이 칸과 별개입니다." },`;

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
          y("info", "scriptOutput.ready", "output listener (hash relink + 500c/4s snap)");
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
      // Not force on the non-scroll path either. A chat switch already had oa()
      // force-fetch the session, so forcing here was a second /v1/gallery round
      // trip awaited before the first paint — for cards we already had.
      const galleryStale = !Array.isArray(t.gallery) || !t.gallery.length || t._galleryCache?.sessionId !== r.sessionId;
      if (source !== "scroll" || galleryStale) {
        try {
          await ce(r.sessionId, galleryStale);
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
        if (await nxBubbleHasInlineFrame(o, linkedCards(t.selectedMessage), nxPendingForInlineSelection(t.selectedMessage))) await nxSyncInlinePhotosOnly();
        else await refreshSelectedInlineImages();
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

/**
 * Boot mounted the window shell behind two things it does not need: a third
 * `GET /v1/settings` and the whole session gallery.
 *
 * Three calls fetched settings before anything could appear — `Qa` on entry,
 * `retryHostUi` again, then `it()` a third time. `le()` now stamps when it
 * answered so `it()` can reuse a fetch from milliseconds ago, and `retryHostUi`
 * drops its own call since `it()` still fetches when the value is stale.
 *
 * `ce()` is worse: it is a `limit=2000` listing plus a characters fetch, and it
 * was awaited *before* `lt()`/`Ya()` appended their shells, so the viewer and the
 * sticky overlay stayed absent for the whole round trip. Nothing below the mount
 * line reads `t.gallery`, so it fires after the mounts and repaints when it
 * lands.
 */
const VENDOR_BOOT_SETTINGS_STAMP_NEEDLE = `    const e = await K("/v1/settings", { method: "GET" });`;
const VENDOR_BOOT_SETTINGS_STAMP_PATCH = `    const e = await K("/v1/settings", { method: "GET" });
    // When this answered, so a boot re-entry can skip a redundant round trip.
    t._nxSettingsAt = Date.now();`;

const VENDOR_BOOT_RETRY_SETTINGS_NEEDLE = `        t.hostDoc = null, await le(), await it();`;
const VENDOR_BOOT_RETRY_SETTINGS_PATCH = `        // it() fetches settings itself when they are stale; this second GET only
        // delayed the first mount.
        t.hostDoc = null, await it();`;

/** Written against the post-`VENDOR_OVERLAY_MOUNT` text, so it is applied after it. */
const VENDOR_BOOT_MOUNT_FIRST_NEEDLE = `    try {
      await le();
    } catch {
    }
    const e = t.backendSettings?.card || {}, n = await Z().catch(() => null);
    if (n?.sessionId) try {
      await ce(n.sessionId);
    } catch {
    }
    e.floating_viewer !== !1 ? await lt() : await st(), await Ya(), e.debug_panel ? await Ba() : await ct();`;
const VENDOR_BOOT_MOUNT_FIRST_PATCH = `    if (!t.backendSettings || Date.now() - Number(t._nxSettingsAt || 0) > 1e3) try {
      await le();
    } catch {
    }
    const e = t.backendSettings?.card || {}, n = await Z().catch(() => null);
    e.floating_viewer !== !1 ? await lt() : await st(), await Ya(), e.debug_panel ? await Ba() : await ct();
    // Gallery + characters after the shells exist. Neither mount reads t.gallery,
    // and ce() does not paint on its own, so repaint once it resolves.
    if (n?.sessionId) ce(n.sessionId).then(async () => {
      // Bubbles before chrome. The first attach ran with an empty ledger and had
      // nothing to link, so this is the pass that actually shows the images — and
      // it is what the user is looking at. The gallery strip and the overlay used
      // to go first, which put two encodes ahead of the bubble in the queue.
      try {
        await refreshSelectedInlineImages();
      } catch {
      }
      try {
        t.galleryUi?.renderGal && await t.galleryUi.renderGal();
        invalidateOverlayLayoutCache(), await he(), Ce();
      } catch {
      }
    }).catch(() => {
    });`;

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
    title: "2.5.4",
    body: "기본 태거가 샷 비율을 정하고, 없으면 세로입니다. 코믹도 그 값을 그대로 씁니다. 업데이트 내역 탭 참고."
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
      t._lastUserSelectAt = Date.now();
      if (t._pointerSelectTimer) clearTimeout(t._pointerSelectTimer), t._pointerSelectTimer = null;
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
  `const j = await fe(e, "pointermove", l), d = await fe(e, "pointerdown", p), U = null, clickId = await fe(e, "click", onClick), upId = await fe(e, "pointerup", onPointerUp), cancelId = await fe(e, "pointercancel", onPointerCancel), keyId = await fe(e, "keydown", async (f) => {
      if (f.key === "Escape" || f.code === "Escape") await hideInspect();
    });`;
const VENDOR_SELECT_BIND_PATCH =
  `await clearMsgActionBars(e);
    const j = await fe(e, "pointermove", l), d = await fe(e, "pointerdown", p), U = null, clickId = await fe(e, "click", onClick), ctxId = await fe(e, "contextmenu", onContextMenu), upId = await fe(e, "pointerup", onPointerUp), cancelId = await fe(e, "pointercancel", onPointerCancel), keyId = await fe(e, "keydown", async (f) => {
      if (f.key === "Escape" || f.code === "Escape") await hideInspect();
    });
    schedulePointerSelect("bind", 0);`;

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
  function nxToastAnchor() {
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    const raw = t.backendSettings?.card?.toast_anchor;
    return typeof VC?.normalizeToastAnchor == "function" ? VC.normalizeToastAnchor(raw) : "tc";
  }
  function nxToastPos(opts) {
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    const vis = opts?.visible !== !1;
    const pe = opts?.pointerEvents !== !1;
    const shift = Number(opts?.shiftPx) || 0;
    const z = Number(opts?.zIndex) || 99999;
    if (typeof VC?.toastAnchorStyle == "function") {
      return VC.toastAnchorStyle(nxToastAnchor(), { visible: vis, pointerEvents: pe, shiftPx: shift, zIndex: z, insetPx: 16 });
    }
    const eye = vis ? "block" : "none";
    const pointer = pe ? "auto" : "none";
    return \`position:fixed;top:\${16 + shift}px;left:50%;transform:translateX(-50%);z-index:\${z};pointer-events:\${pointer};width:min(280px,92vw);box-sizing:border-box;display:\${eye};\`;
  }
  const HOST_TOAST_CHROME = "background:rgba(37,99,235,.42);color:#fff;padding:8px 14px;border-radius:8px;font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,.18);";
  function progressToastStyle(visible) {
    return nxToastPos({ visible: !!visible, pointerEvents: !!visible, zIndex: 99999 });
  }
  function hostToastStyle(visible) {
    return nxToastPos({ visible: !!visible, pointerEvents: !1, zIndex: 1e5 }) + (visible ? HOST_TOAST_CHROME : "");
  }
  const SELECTION_TOAST_HIDE_MS = 2e3;
  function selectionToastStyle(visible, belowProgress) {
    return nxToastPos({ visible: !!visible, pointerEvents: !!visible, shiftPx: belowProgress ? 48 : 0, zIndex: 100001 });
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
      if (typeof root.setStyleAttribute == "function") await root.setStyleAttribute(progressToastStyle(visible));
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
      style: progressToastStyle(!1)
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
      style: hostToastStyle(!1)
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
      if (typeof root.setStyleAttribute == "function") await root.setStyleAttribute(hostToastStyle(!!msg));
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
  function attachToastStyle(visible) {
    return nxToastPos({ visible: !!visible, pointerEvents: !1, zIndex: 99998 });
  }
  function nxAttachSessionKey() {
    return String(t.lastScope?.sessionId || t.selectedMessage?.sessionId || "");
  }
  function nxAttachToastClearTimer() {
    if (t._attachToastTimer) {
      clearTimeout(t._attachToastTimer);
      t._attachToastTimer = null;
    }
  }
  async function hideAttachToast(opts) {
    const done = !!(opts && opts.done);
    t._attachToastWanted = 0;
    nxAttachToastClearTimer();
    if (done) t._attachToastDoneSession = nxAttachSessionKey();
    const root = t._attachToastRoot;
    t._attachToastShown = !1;
    if (!root) return;
    try {
      if (typeof root.setStyleAttribute == "function") await root.setStyleAttribute(attachToastStyle(!1));
    } catch {
    }
  }
  async function showAttachToast() {
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    const sid = nxAttachSessionKey();
    const allow = typeof VC?.shouldShowSessionAttachToast == "function"
      ? VC.shouldShowSessionAttachToast({
        sessionId: sid,
        doneSessionId: t._attachToastDoneSession,
        alreadyWanted: t._attachToastWanted
      })
      : (t._attachToastWanted || t._attachToastDoneSession == null || String(t._attachToastDoneSession) !== sid);
    if (!allow) return;
    t._attachToastWanted = 1;
    const maxMs = Number(VC?.ATTACH_TOAST_MAX_MS) > 0 ? Number(VC.ATTACH_TOAST_MAX_MS) : 1e4;
    if (!t._attachToastTimer) {
      t._attachToastTimer = setTimeout(() => {
        t._attachToastTimer = null;
        hideAttachToast({ done: 1 }).catch(() => {});
      }, maxMs);
    }
    if (t._attachToastShown) return;
    const doc = await ue().catch(() => t.hostDoc);
    if (!t._attachToastWanted) return;
    if (!doc || typeof doc.createElement != "function") return;
    const body = await Ee(doc);
    if (!body || !t._attachToastWanted) return;
    let root = t._attachToastRoot;
    if (!root) {
      root = await H(doc, "div", { style: attachToastStyle(!1) });
      try {
        typeof root.setAttribute == "function" && await root.setAttribute("id", "inlay-nx-attach-toast");
      } catch {
      }
      await body.appendChild(root);
      t._attachToastRoot = root;
    }
    const html = typeof VC?.composeAttachToastHtml == "function"
      ? VC.composeAttachToastHtml(h)
      : \`<div data-inlay-attach-toast="1">인레이 넥서스 조각 불러오는중..</div>\`;
    try {
      if (!t._attachToastWanted) return;
      if (typeof root.setInnerHTML == "function") await root.setInnerHTML(html);
      if (!t._attachToastWanted) return;
      if (typeof root.setStyleAttribute == "function") await root.setStyleAttribute(attachToastStyle(!0));
      if (t._attachToastWanted) t._attachToastShown = !0;
    } catch {
    }
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
    }) : \`<div data-inlay-selection-toast="1" style="box-sizing:border-box;width:min(280px,92vw);padding:6px 10px;border-radius:8px;background:rgba(18,24,32,.42);border:1px solid rgba(42,51,68,.5);color:#e8eef8;font-size:11px;cursor:pointer"><div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${h(stage)}</div><div style="color:#8b97ab;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${h(meta)}</div></div>\`;
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
      }) : \`<div data-inlay-progress-toast="1" style="padding:6px 10px;border-radius:8px;background:rgba(18,24,32,.42);border:1px solid rgba(42,51,68,.5);color:#e8eef8;font-size:11px;cursor:pointer">\${h(stage + " " + meta)}</div>\`;
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
      const B = t.jobProgress;
      const O = t.selectedMessage;
      const fp = [B?.state, B?.progress, B?.message, B?.jobId, O?.hash, O?.domIndex, (t.gallery || []).length, t.jobsInFlight?.size || 0, t._progressToastShown ? 1 : 0].join("|");
      if (fp === t._seFp && t.galleryUi?.root) return;
      t._seFp = fp;
      if (t.galleryUi?.paintStatus) await t.galleryUi.paintStatus();
      await syncProgressToast();
    } catch {
    }
  }`;

/** Sticky inspect char chip: same as viewer runMetaChip — open Ua immediately, roster behind. */
const VENDOR_INSPECT_CHAR_OPEN_NEEDLE =
  `      if (act === "char") {
        await hideInspect();
        try {
          await ensureViewerRosterLoaded().catch(() => null);
          const raw = Array.isArray(card.characters) ? card.characters[charI] : null, name = w(raw?.name || "", 200);`;
const VENDOR_INSPECT_CHAR_OPEN_PATCH =
  `      if (act === "char") {
        await hideInspect();
        try {
          void ensureViewerRosterLoaded().catch(() => null);
          const raw = Array.isArray(card.characters) ? card.characters[charI] : null, name = w(raw?.name || "", 200);`;

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
          let rolled = null;
          await withImageRerollToast("이미지 리롤 중…", async () => {
            rolled = await K(\`/v1/cards/\${encodeURIComponent(card.id)}/reroll\`, {
              method: "POST",
              body: {
                mode: "nai"
              }
            }, 18e4);
            return rolled;
          });
          const W = await Z({
            useOverride: !1
          }).catch(() => null);
          W?.sessionId && await ce(W.sessionId);
          try {
            await he();
          } catch {
          }
          try {
            await nxPatchInlinePhotoByCardId(rolled?.card?.id || card.id, nxCardDisplaySrc(rolled?.card || card), card.id, t.hostDoc, nxInlineRootKeyForCard(rolled?.card || card));
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
              onShot: async (_i, result) => {
                if (t.galleryUi?.renderGal) await t.galleryUi.renderGal();
                try {
                  const card = result?.card;
                  const replaced = result?.replaced;
                  await nxPatchInlinePhotoByCardId(card?.id || "", nxCardDisplaySrc(card), replaced?.id || replaced || "", t.hostDoc, nxInlineRootKeyForCard(card));
                } catch {
                }
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

/** After single-image / all-image reroll, refresh bubble illustrations (gallery alone is not enough). */
const VENDOR_REROLL_IMAGE_INLINE_NEEDLE =
  `        d.index = nn >= 0 ? nn : Math.max(0, Math.min(_, Math.max(0, J.length - 1))), await T(), await C.setTextContent(\`이미지 리롤 완료 · \${String(B?.card?.id || A.id).slice(0, 8)}\`), y("info", "regen.image", \`P\${O} \${String(A.id).slice(0, 8)}→\${String(B?.card?.id || "").slice(0, 8)}\`);`;
const VENDOR_REROLL_IMAGE_INLINE_PATCH =
  `        d.index = nn >= 0 ? nn : Math.max(0, Math.min(_, Math.max(0, J.length - 1))), await T();
        try {
          await nxPatchInlinePhotoByCardId(B?.card?.id || A.id, nxCardDisplaySrc(B?.card || A), A.id, t.hostDoc, nxInlineRootKeyForCard(B?.card || A));
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
  `          onShot: async (i, result) => {
            d.index = i;
            await T();
            try {
              const card = result?.card;
              const replaced = result?.replaced;
              await nxPatchInlinePhotoByCardId(card?.id || "", nxCardDisplaySrc(card), replaced?.id || replaced || "", t.hostDoc, nxInlineRootKeyForCard(card));
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
        await C.setTextContent(failCount ? \`전체 재생성 부분 실패 · 성공 \${Number(B?.count || 0)} / 실패 \${failCount}\` : \`전체 재생성 완료 · \${Number(B?.count || 0)}장\`), y("info", "regen.all", \`count=\${B?.count || 0} failed=\${failCount} hash=\${String(A.hash || "").slice(0, 8)}\`);`;

/** Tag regenerate (force): do not reuse the 2.2s gallery cache after unlink. */
const VENDOR_FORCE_REGEN_GALLERY_NEEDLE =
  `    if (o) {
      await pa(e.sessionId, m, p);
      try {
        await ce(e.sessionId);
      } catch {
      }`;
const VENDOR_FORCE_REGEN_GALLERY_PATCH =
  `    if (o) {
      await pa(e.sessionId, m, p);
      try {
        t._galleryCache = null;
        await ce(e.sessionId, !0);
      } catch {
      }`;

/** Tag regenerate (force): drop spinner frames on the selected bubble; restamp after LLM. */
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
        const targetStampKey = nxInlineStampKey(l)
          || nxInlineStampKey({ sessionId: e.sessionId, hash: m, messageIndex: p, chatIndex: p });
        t._galleryCache = null;
        t._inlinePending = null;
        t._inlinePendingMsgIndex = -1;
        t._inlinePendingSessionId = "";
        t._inlineNeedStamp = !0;
        t._inlineNeedStampKey = targetStampKey;
        if (e.sessionId) await ce(e.sessionId, !0);
        const sameTarget = l?.hash === m && String(l?.sessionId || "") === String(e.sessionId || "")
          && String(t.lastScope?.sessionId || "") === String(e.sessionId || "");
        if (sameTarget && targetStampKey) await nxRemoveInlineFramesByKey(t.hostDoc, ye(targetStampKey));
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
      const statusKey = busy && (B || idx.busy)
        ? \`b|\${String(B?.state || "")}|\${Number(B?.progress) || idx.pct}|\${String(B?.message || idx.label || "")}|\${extra}\`
        : O ? \`o|\${_.length}|\${O.domIndex}|\${O.preview || ""}\` : "none";
      if (t._paintStatusRoot === C && t._paintStatusKey === statusKey) return;
      t._paintStatusRoot = C;
      t._paintStatusKey = statusKey;
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
      if (t.pendingSessionCount >= 2) return t.pendingSessionId = "", t.pendingSessionCount = 0, t.lastScope = C, await oa(S, b), typeof schedulePointerSelect == "function" && schedulePointerSelect("session"), C;
      return C;
    }`;

const VENDOR_SCOPE_BOOT_SELECT_NEEDLE =
  `    return t.pendingSessionId = "", t.pendingSessionCount = 0, t.lastScope = C, C;
  }`;
const VENDOR_SCOPE_BOOT_SELECT_PATCH =
  `    if (!t._pointerSelectBooted) {
      t._pointerSelectBooted = 1;
      if (typeof schedulePointerSelect == "function") schedulePointerSelect("boot");
    }
    return t.pendingSessionId = "", t.pendingSessionCount = 0, t.lastScope = C, C;
  }`;

const VENDOR_POINTER_SELECT_NEEDLE =
  `  async function Fa(e, n, o, opts = {}) {
    const a = await dt(await qe(e));
    if (!a.length)
      return y("warn", "select.fail", "no message elements"), !1;
    let r = await Oa(e, n, o, a);
    return r === -2 ? !1 : (r < 0 && (r = await Ra(n, o, a)), r < 0 ? (y("info", "select.miss", \`x=\${Math.round(n)} y=\${Math.round(o)} msgs=\${a.length}\`), !1) : Da(r, a, {
      source: opts.source || "click"
    }));
  }`;
const VENDOR_POINTER_SELECT_PATCH =
  `  async function Fa(e, n, o, opts = {}) {
    const a = await dt(await qe(e));
    if (!a.length)
      return y("warn", "select.fail", "no message elements"), !1;
    let r = await Oa(e, n, o, a);
    return r === -2 ? !1 : (r < 0 && (r = await Ra(n, o, a)), r < 0 ? (y("info", "select.miss", \`x=\${Math.round(n)} y=\${Math.round(o)} msgs=\${a.length}\`), !1) : Da(r, a, {
      source: opts.source || "click"
    }));
  }
  /**
   * Session switch lands on the next user input instead of waiting out the 6s idle
   * scope poll. Two host index reads, throttled, and never while idle — the idle
   * cadence is what thrashed when the poll itself was sped up.
   */
  function nxScopeCheckSoon() {
    if (t.uiOpen || t._hostChromeBlocked || t.unloading) return;
    if (t.jobsInFlight.size) return;
    if (t.jobProgress && formatViewerJob(t.jobProgress)?.busy) return;
    const now = Date.now();
    if (t._scopeCheckAt && now - t._scopeCheckAt < 700) return;
    t._scopeCheckAt = now;
    Z().catch(() => {});
  }
  function schedulePointerSelect(reason, delayMs = 1e3) {
    if (String(reason || "") === "bind" && Math.max(0, Number(delayMs) || 0) === 0) {
      if (t._pointerSelectBindTimer) clearTimeout(t._pointerSelectBindTimer);
      const queueFallback = () => {
        if (t._pointerSelectBindTimer) return;
        t._pointerSelectBindTimer = setTimeout(() => {
          t._pointerSelectBindTimer = null;
          runPointerSelect("bind-retry").catch(() => {});
        }, 1e3);
      };
      t._pointerSelectBindTimer = setTimeout(() => {
        t._pointerSelectBindTimer = null;
        runPointerSelect("bind").then((selected) => {
          if (!selected) queueFallback();
        }).catch(queueFallback);
      }, 0);
      return;
    }
    const why0 = String(reason || "");
    if ((why0 === "boot" || why0 === "session" || why0 === "reply") && typeof showAttachToast == "function") {
      showAttachToast().catch(() => {});
    }
    if (t._pointerSelectTimer) clearTimeout(t._pointerSelectTimer);
    t._pointerSelectReason = String(reason || "");
    // A switch only needs the new chat DOM to exist, so start immediately and let
    // runPointerSelect await it. There is no retry ladder: the wait lives in
    // nxWaitNewestDom, and once the bubble is found the paint cannot come back
    // half-done — markers land in one pass and images arrive by subscription.
    const rawWait = Math.max(0, Number(delayMs) || 0);
    const fresh = rawWait === 1e3
      && (t._pointerSelectReason === "session" || t._pointerSelectReason === "boot" || t._pointerSelectReason === "reply");
    t._pointerSelectTimer = setTimeout(() => {
      t._pointerSelectTimer = null;
      runPointerSelect(t._pointerSelectReason).catch(() => {
      });
    }, fresh ? 0 : rawWait);
  }
  async function runPointerSelect(reason) {
    if (t.uiOpen || t._hostChromeBlocked) return !1;
    if (t._lastUserSelectAt && Date.now() - t._lastUserSelectAt < 1500) return !1;
    const doc = t.overlayUi?.doc || t.hostDoc || await ue().catch(() => null);
    if (!doc) return !1;
    t._msgElsCache = null;
    const why = String(reason || "");
    const fast = why === "boot" || why === "session" || why === "reply";
    if (fast) {
      const newest = typeof nxWaitNewestDom == "function"
        ? await nxWaitNewestDom(doc, 2000)
        : typeof dtNewest == "function" ? await dtNewest(doc) : [];
      if (!newest.length) return !1;
      y("info", "select.pointer", \`reason=\${why} newest wait\`);
      // Head first: this chat's DOM#0, then neighbours. Previous keep/paint
      // fingerprints belong to the last session and would strip or skip wrong.
      t._inlineHeadFirst = 1;
      t._inlineKeepEls = [];
      t._inlineKeepHashList = [];
      t._inlinePaintedKeys = {};
      t._inlinePaintedCounts = {};
      // Cached paragraph handles point at the outgoing chat's DOM.
      t._inlinePlaceCache = null;
      nxDropAllInlineSubs();
      t._inlinePhotoReq = new Map();
      t._inlinePhotoLocks = new Map();
      t._inlinePhotoPendingClaims = new Set();
      t._inlinePhotoLatestOrder = new Map();
      t._inlineOwnerEpoch = new Map();
      t._inlineOwnerLocks = new Map();
      t._inlinePhotoSyncGen = (Number(t._inlinePhotoSyncGen) || 0) + 1;
      await Da(0, newest, { source: "provisional", auto: 1 });
      return !0;
    }
    const vh = typeof window < "u" && window.innerHeight || 800;
    const vw = typeof window < "u" && window.innerWidth || 800;
    let px = Number(t._pointerClientX), py = Number(t._pointerClientY);
    if (!Number.isFinite(px)) px = vw * 0.5;
    if (!Number.isFinite(py)) py = vh * 0.5;
    const els = await getCachedMsgEls(doc);
    if (!els.length) return !1;
    let pick = typeof pickMsgIndexNearPointer == "function" ? await pickMsgIndexNearPointer(els, py, px, vh) : -1;
    if (!(pick >= 0)) pick = await Oa(doc, px, py, els);
    if (!(pick >= 0)) pick = await Ra(px, py, els);
    if (!(pick >= 0)) return !1;
    y("info", "select.pointer", \`reason=\${reason || ""} DOM#\${pick} x=\${Math.round(px)} y=\${Math.round(py)}\`);
    // Auto-select paints inline shots + chips; a click is no longer required after a switch.
    await Da(pick, els, { source: "provisional", auto: 1 });
    return !0;
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
    if (t.overlayUi) t.overlayUi._lastThumbPct = null, t.overlayUi._v2LayoutKey = null;
    try { await Ht(); } catch {}
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
  `"nx-minimize-mode": { title: "접힘 표시 방식", body: "플로팅 아이콘: 작은 🖼️, 클릭하면 펼침. 상단 툴바 한 줄: 창 자리에서 얇은 바. 재생성·태그 플로팅: 큰 세로 버튼(태그/재생성/중단/프리셋), 접으면 흐려지고 가만히 있으면 더 흐려짐. 한 번 더 접으면 여백+펼치기만. 길게 누르면 전체 뷰어." },`;

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
  `    }, actionsFadeOpacity = () => {
      if (!d.minimized || viewerMinimizeMode() !== "actions") return 1;
      if (d._actionsHot) return 0.85;
      if (d.actionsFolded) return 0.2;
      return d._actionsIdle ? 0.18 : 0.3;
    }, clearActionsIdleTimer = () => {
      if (d._actionsIdleTimer) clearTimeout(d._actionsIdleTimer), d._actionsIdleTimer = null;
    }, armActionsIdle = () => {
      clearActionsIdleTimer();
      if (!d.minimized || viewerMinimizeMode() !== "actions") {
        d._actionsIdle = !1, d._actionsHot = !1;
        return;
      }
      d._actionsIdleTimer = setTimeout(() => {
        d._actionsIdleTimer = null;
        if (!d.minimized || viewerMinimizeMode() !== "actions") return;
        d._actionsHot = !1, d._actionsIdle = !0;
        f().catch(() => {
        });
      }, 4000);
    }, nudgeActionsFade = (armAfter) => {
      if (!d.minimized || viewerMinimizeMode() !== "actions") return;
      d._actionsHot = !0, d._actionsIdle = !1;
      if (armAfter) armActionsIdle();
      else clearActionsIdleTimer();
      f().catch(() => {
      });
    }, onActionsFadeMove = async (A) => {
      if (!d.minimized || viewerMinimizeMode() !== "actions" || d.drag) return;
      const now = Date.now();
      if (now - (d._actionsFadeLast || 0) < 80) return;
      d._actionsFadeLast = now;
      const x = Number(A?.clientX), y = Number(A?.clientY);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      let over = !1;
      try {
        over = await X(r, x, y);
      } catch {
      }
      if (over) {
        if (!d._actionsHot || d._actionsIdle) nudgeActionsFade(!1);
        else clearActionsIdleTimer();
      } else if (d._actionsHot) {
        d._actionsHot = !1;
        armActionsIdle();
        f().catch(() => {
        });
      }
    }, f = async () => {
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
      if (d.drag && d.drag.moved) {
        /* drag ghost owns opacity */
      } else if (d.minimized && viewerMinimizeMode() === "actions") {
        const op = actionsFadeOpacity();
        panelStyle = /opacity:/i.test(panelStyle) ? panelStyle.replace(/opacity:[^;]+/i, "opacity:" + op) : panelStyle + ";opacity:" + op;
        if (!/transition:/i.test(panelStyle)) panelStyle += ";transition:opacity .8s ease";
      } else {
        d._actionsIdle = !1, d._actionsHot = !1, clearActionsIdleTimer();
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
          if (!d._actionsFadeMoveOn) {
            d._actionsFadeMoveOn = !0;
            try {
              await e.addEventListener("pointermove", onActionsFadeMove);
            } catch {
            }
          }
          if (!d._actionsHot) armActionsIdle();
          const folded = !!d.actionsFolded;
          const btn = (act, bg, label) => \`<span data-nx-act="\${act}" style="cursor:pointer;background:\${bg};color:#fff;padding:14px 12px;border-radius:10px;font-size:15px;line-height:1.15;font-weight:700;width:100%;text-align:center;box-sizing:border-box;user-select:none">\${label}</span>\`;
          const pad = '<span data-nx-drag-pad style="display:flex;align-items:center;justify-content:center;width:100%;height:28px;flex:0 0 28px;cursor:move;touch-action:none" title="끌어서 이동"><span style="width:44px;height:4px;border-radius:999px;background:rgba(255,255,255,.38)"></span></span>';
          await s.setInnerHTML(folded ? pad : pad + btn("tag", "#0f766e", "태그") + btn("regen", "#7c6cff", "재생성") + btn("stop", "#b91c1c", "중단")), await i.setStyleAttribute(\`height:\${folded ? 88 : 328}px;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;gap:8px;padding:10px;background:rgba(255,255,255,.04);border-bottom:0;cursor:move;user-select:none;flex-shrink:0;touch-action:none;box-sizing:border-box;\`), await s.setStyleAttribute("display:flex;flex-direction:column;gap:8px;align-items:stretch;width:100%;flex:0 0 auto;"), await viewerPresetBtn.setStyleAttribute(\`max-width:none;min-width:0;width:100%;height:auto;min-height:48px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:#0b0f18;color:#e8eef8;font-size:15px;font-weight:700;padding:14px 12px;cursor:pointer;pointer-events:auto;display:\${folded ? "none" : "inline-flex"};align-items:center;justify-content:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;box-sizing:border-box;\`), await viewerPresetMenu.setStyleAttribute(\`display:\${!folded && d.presetMenuOpen ? "block" : "none"};position:absolute;top:auto;bottom:56px;left:10px;right:10px;min-width:0;max-width:none;max-height:220px;overflow:auto;z-index:20;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;box-shadow:0 10px 28px rgba(0,0,0,.45);pointer-events:auto;\`), await c.setInnerHTML(btn(folded ? "expand" : "fold", "#1e293b", folded ? "펼침" : "접기")), await c.setStyleAttribute("display:flex;flex-direction:column;gap:8px;align-items:stretch;flex-shrink:0;width:100%;");
          await f();
        } else {
          d.actionsFolded = !1;
          d._actionsIdle = !1, d._actionsHot = !1, clearActionsIdleTimer();
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

const VENDOR_META_SKIP_ROSTER_NEEDLE =
  `      try {
        if (!(t._viewerRoster?.rosterSessionId) || t.backendSettings?.card?.unified_chat_priority) await ensureViewerRosterLoaded();
      } catch {
      }
`;
const VENDOR_META_SKIP_ROSTER_PATCH = ``;

const VENDOR_VIEWER_META_CHIP_TOUCH_NEEDLE =
  `      const chipStyle = (on, accent) => \`cursor:pointer;pointer-events:auto;display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;font-size:11px;line-height:1.2;white-space:nowrap;border:1px solid \${accent || (on ? "rgba(255,255,255,.14)" : "rgba(248,113,113,.45)")};background:\${accent ? "rgba(124,108,255,.18)" : on ? "rgba(255,255,255,.06)" : "rgba(248,113,113,.12)"};color:\${on ? "#e8eef8" : "#fecaca"};opacity:\${on ? 1 : 0.72}\`, Yt = Array.isArray(Q.characters) ? Q.characters : [], cast = R(Q);`;
const VENDOR_VIEWER_META_CHIP_TOUCH_PATCH =
  `      const chipStyle = (on, accent) => \`cursor:pointer;pointer-events:auto;display:inline-flex;align-items:center;padding:10px 14px;border-radius:999px;font-size:13px;line-height:1.2;min-height:44px;box-sizing:border-box;white-space:nowrap;border:1px solid \${accent || (on ? "rgba(255,255,255,.14)" : "rgba(248,113,113,.45)")};background:\${accent ? "rgba(124,108,255,.18)" : on ? "rgba(255,255,255,.06)" : "rgba(248,113,113,.12)"};color:\${on ? "#e8eef8" : "#fecaca"};opacity:\${on ? 1 : 0.72}\`, Yt = Array.isArray(Q.characters) ? Q.characters : [], cast = R(Q);`;

const VENDOR_VIEWER_META_Y_CHIP_TOUCH_NEEDLE =
  `          await addChip(\`\${Math.round(Math.max(0, Math.min(100, yNum)))}%\`, "y", "padding:4px 8px;border-radius:999px;font-size:11px;line-height:1.2;border:1px solid rgba(255,255,255,.12);background:rgba(15,23,42,.72);color:#94a3b8;font-variant-numeric:tabular-nums;font-weight:700;white-space:nowrap;pointer-events:none");`;
const VENDOR_VIEWER_META_Y_CHIP_TOUCH_PATCH =
  `          await addChip(\`\${Math.round(Math.max(0, Math.min(100, yNum)))}%\`, "y", "padding:10px 14px;border-radius:999px;font-size:13px;line-height:1.2;min-height:44px;box-sizing:border-box;display:inline-flex;align-items:center;border:1px solid rgba(255,255,255,.12);background:rgba(15,23,42,.72);color:#94a3b8;font-variant-numeric:tabular-nums;font-weight:700;white-space:nowrap;pointer-events:none");`;

const VENDOR_VIEWER_BASE_CHIP_NEEDLE =
  `      await addChip("base", "base", chipStyle(!0, "rgba(124,108,255,.45)"));`;
const VENDOR_VIEWER_BASE_CHIP_PATCH =
  `      await addChip("수정", "base", chipStyle(!0, "rgba(124,108,255,.45)"));`;

const VENDOR_INSPECT_BASE_CHIP_NEEDLE =
  '      await addInspectBtn(chipRow, "base", "base", `${chipStyle};background:rgba(124,108,255,.22);color:#ddd6fe;border:1px solid rgba(124,108,255,.45)`);';
const VENDOR_INSPECT_BASE_CHIP_PATCH =
  '      await addInspectBtn(chipRow, "수정", "base", `${chipStyle};background:rgba(124,108,255,.22);color:#ddd6fe;border:1px solid rgba(124,108,255,.45)`);';

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
    d._galBusy = !1;
    d._galWant = 0;
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

const VENDOR_STRIP_WARM_CAP_NEEDLE =
  `VC.visibleGalleryImageIds(items, idx, 1, Math.max(8, (items || []).length || 0))`;
const VENDOR_STRIP_WARM_CAP_PATCH =
  `VC.visibleGalleryImageIds(items, idx, 1, 12)`;
const VENDOR_STRIP_WARM_CAP_LIST_NEEDLE =
  `VC.visibleGalleryImageIds(list, idx, 1, Math.max(8, list.length || 0))`;
const VENDOR_STRIP_WARM_CAP_LIST_PATCH =
  `VC.visibleGalleryImageIds(list, idx, 1, 12)`;

const VENDOR_SELECT_COALESCE_NEEDLE =
  `    }, selectGalIndex = async (idx) => {
      const items = Array.isArray(d.items) && d.items.length ? d.items : U();
      if (!items.length) {
        await T();
        return;
      }
      d.index = Math.max(0, Math.min(Number.isFinite(Number(idx)) ? Number(idx) : 0, items.length - 1));
      d.selectedCount = selectedCountOf(items);
      const card = items[d.index];
      // Trick: move outline/opacity on existing thumbs first (no strip rebuild), then swap main.
      paintThumbsQuick(d.index).catch(() => {
      });
      await paintMainNow(card);
      d._metaGen = (d._metaGen || 0) + 1;
      const gen = d._metaGen;
      warmVisibleImages(items, d.index);
      d._softTimer && clearTimeout(d._softTimer);
      d._softTimer = setTimeout(() => {
        if (gen !== d._metaGen || t.uiOpen) return;
        softAfterSelect(gen).catch(() => {
        });
      }, 90);
    }, syncToCardId = async (cardId) => {`;
const VENDOR_SELECT_COALESCE_PATCH =
  `    }, selectGalIndex = async (idx) => {
      d._galWant = Math.max(0, Number.isFinite(Number(idx)) ? Number(idx) : 0);
      if (d._galBusy) return;
      d._galBusy = !0;
      try {
        for (;;) {
          const want = d._galWant;
          const items = Array.isArray(d.items) && d.items.length ? d.items : U();
          if (!items.length) {
            await T();
            return;
          }
          d.index = Math.max(0, Math.min(want, items.length - 1));
          d.selectedCount = selectedCountOf(items);
          if (want !== d._galWant) continue;
          const card = items[d.index];
          paintThumbsQuick(d.index).catch(() => {
          });
          await paintMainNow(card);
          if (want !== d._galWant) continue;
          d._metaGen = (d._metaGen || 0) + 1;
          const gen = d._metaGen;
          warmVisibleImages(items, d.index);
          d._softTimer && clearTimeout(d._softTimer);
          d._softTimer = setTimeout(() => {
            if (gen !== d._metaGen || t.uiOpen) return;
            softAfterSelect(gen).catch(() => {
            });
          }, 90);
          break;
        }
      } finally {
        d._galBusy = !1;
        if (d._galWant !== d.index) void selectGalIndex(d._galWant);
      }
    }, syncToCardId = async (cardId) => {`;

const VENDOR_SOFT_SKIP_FILL_NEEDLE =
  `      try {
        await fillThumbSrcs(items, d.index);
        if (gen !== (d._metaGen || 0)) return;
        await paintThumbsQuick(d.index);
      } catch {
        if (gen !== (d._metaGen || 0)) return;
        await paintThumbsStrip(items, d.index);
      }
      if (gen !== (d._metaGen || 0)) return;`;
const VENDOR_SOFT_SKIP_FILL_PATCH =
  `      if (gen !== (d._metaGen || 0)) return;`;

/**
 * The thumb strip painted only after encoding up to 12 originals, one at a time.
 *
 * Every caller of `paintThumbsStrip` already runs `warmVisibleImages` for the
 * same window, so the strip was waiting on work that was in flight anyway — and
 * waiting is all it accomplished: the paint uses `Ie()`, a cache lookup, and the
 * cache is what the warm wave fills.
 *
 * `fillThumbSrcs` was supposed to be the cheap follow-up, filling `src` on the
 * existing nodes. It cannot: SafeElement rejects every attribute without an `x-`
 * prefix, so both its `getAttribute("data-gal-idx")` and its `setAttribute("src")`
 * threw into a bare `catch`. `setInnerHTML` is the only paint SafeDOM honours, so
 * the warm wave now ends in a real repaint and the pretend path is deleted rather
 * than left looking functional.
 *
 * Written against the post-chain text, so applied after it.
 */
const VENDOR_THUMBS_DEAD_FILL_NEEDLE = `fillThumbSrcs = async (items, idx) => {
      try {
        const list = items || [];
        const kids = typeof k.unwarpSafeArray == "function" ? await k.unwarpSafeArray(await thumbsPaintEl().getChildren()) : [];
        if (!kids?.length) return;
        const VC = globalThis.__INLAY_VIEWER_CORE__;
        const warmIds = new Set(VC?.visibleGalleryImageIds ? VC.visibleGalleryImageIds(list, idx, 1, 12) : list.slice(Math.max(0, idx - 3), idx + 5).map((c) => String(c?.id || "")).filter(Boolean));
        for (const id of warmIds) {
          const card = list.find((c) => String(c?.id || "") === id);
          if (card) await ensureCardImage(card);
        }
        for (const el of kids) {
          if (!el || typeof el.getAttribute != "function") continue;
          let galIdx = null;
          try {
            const split = await el.getAttribute("data-nx-split");
            if (split != null && split !== "") continue;
            const raw = await el.getAttribute("data-gal-idx");
            if (raw != null && raw !== "") galIdx = Number(raw);
          } catch {
            continue;
          }
          if (!Number.isFinite(galIdx)) continue;
          const card = list[galIdx], id = String(card?.id || "");
          if (!warmIds.has(id)) continue;
          const src = Ie(card);
          if (!src || typeof el.setAttribute != "function") continue;
          try {
            await el.setAttribute("src", src);
          } catch {
          }
        }
      } catch {
      }
    }, `;
const VENDOR_THUMBS_DEAD_FILL_PATCH = '';

const VENDOR_THUMBS_STRIP_NONBLOCK_NEEDLE = `      const warmIds = new Set(VC?.visibleGalleryImageIds ? VC.visibleGalleryImageIds(list, idx, 1, 12) : list.slice(Math.max(0, idx - 3), idx + 5).map((c) => String(c?.id || "")).filter(Boolean));
      for (const id of warmIds) {
        const card = list.find((c) => String(c?.id || "") === id);
        if (card) await ensureCardImage(card);
      }
      const thumbBits = [];`;
const VENDOR_THUMBS_STRIP_NONBLOCK_PATCH = `      const warmIds = new Set(VC?.visibleGalleryImageIds ? VC.visibleGalleryImageIds(list, idx, 1, 12) : list.slice(Math.max(0, idx - 3), idx + 5).map((c) => String(c?.id || "")).filter(Boolean));
      // Cache hits only. Callers already started warmVisibleImages for this same
      // window and it repaints when the wave lands, so awaiting the encodes here
      // delayed the strip without changing what it could draw.
      const thumbBits = [];`;

const VENDOR_THUMBS_WARM_REPAINT_NEEDLE = `        const done = () => {
          if (gen !== (d._metaGen || 0) || t.uiOpen || d.minimized) return;
          // Fill srcs in place — avoid full strip rebuild (separator flicker).
          fillThumbSrcs(items, d.index).catch(() => {
          });
        };`;
const VENDOR_THUMBS_WARM_REPAINT_PATCH = `        const done = () => {
          if (gen !== (d._metaGen || 0) || t.uiOpen || d.minimized) return;
          // Full rebuild, not an in-place src fill: SafeElement refuses any
          // attribute without an \`x-\` prefix, so the fill never landed. The gen
          // check above keeps this to one repaint per selection.
          paintThumbsStrip(items, d.index).catch(() => {
          });
        };`;

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
        if (galIdx >= 0) void selectGalIndex(galIdx);
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
        nudgeActionsFade(!0);
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
          await f();
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
    if (t.overlayUi) t.overlayUi._lastThumbPct = null, t.overlayUi._v2LayoutKey = null;
    try { await Ht(); } catch {}
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
  'author_note', 'asset_author_note', 'tagger', 'format', 'appearance_inject', 'lore_inject',
  'char_inject', 'preprocess', 'prefill', 'preset_1', 'autotag',
  'curation_refine', 'curation_embed_hint', 'asset_tags_inject', 'char_looks',
  'command_reroll', 'lorefilter_scan', 'comic',
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
  assertOnce(raw, VENDOR_CHAR_EDIT_HEADER_NEEDLE, 'char edit header finite index');
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
  assertOnce(raw, VENDOR_EXPLORER_LIMIT_NEEDLE, 'explorer explore limit 500');
  assertOnce(raw, VENDOR_EXPLORER_SELECT_ALL_NEEDLE, 'explorer select-all bind');
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
  assertOnce(raw, VENDOR_NAI_MODEL_KEY_NEEDLE, 'nai model+key tabs');
  assertOnce(raw, VENDOR_NAI_TEST_NEEDLE, 'nai test save-then-probe');
  assertOnce(raw, VENDOR_NAI_SAMPLER_NEEDLE, 'nai sampler per family');
  assertOnce(raw, VENDOR_PRESET_SECOND_NEEDLE, 'preset 2nd button');
  assertOnce(raw, VENDOR_PRESET_SECOND_EVT_NEEDLE, 'preset 2nd click');
  assertOnce(raw, VENDOR_PRESET_CHIP_NEEDLE, 'preset chip second class');
  assertOnce(raw, VENDOR_PRESET_CHIP_CSS_NEEDLE, 'preset chip second css');
  assertOnce(raw, VENDOR_PRESET_HELP_MUTED_NEEDLE, 'preset 1st/2nd help');
  assertOnce(raw, VENDOR_DEBUG_QUOTA_NEEDLE, 'debug quota html');
  assertOnce(raw, VENDOR_DEBUG_QUOTA_EVT_NEEDLE, 'debug quota events');
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
    [VENDOR_CANCEL_PRESS_IDS_NEEDLE, 'cancel press clears image press ids'],
    [VENDOR_SECOND_PTR_CANCEL_NEEDLE, 'second pointer used to cancel press'],
    [VENDOR_PRESS_PTR_UP_NEEDLE, 'pointerup tears down mobilePress'],
    [VENDOR_PRESS_PTR_CANCEL_NEEDLE, 'pointercancel tears down mobilePress'],
    [VENDOR_PRESS_FILL_STICKY_CALL_NEEDLE, 'press fill sticky call xy'],
    [VENDOR_INLINE_LONGPRESS_NEEDLE, 'inline shot long-press'],
    [VENDOR_MSG_CHIP_UP_NEEDLE, 'msg chip pointerup'],
    [VENDOR_STICKY_REVIVE_NEEDLE, 'sticky pin revive'],
    [VENDOR_STICKY_INIT_NEEDLE, 'sticky init flags'],
    [VENDOR_STICKY_RESET_NEEDLE, 'sticky reset flags'],
    [VENDOR_STICKY_OPEN_CARD_NEEDLE, 'sticky open card edit'],
    [VENDOR_STICKY_OPEN_CHAR_NEEDLE, 'sticky open char edit'],
    [VENDOR_STICKY_CLOSE_CARD_NEEDLE, 'sticky close card edit'],
    [VENDOR_STICKY_CLOSE_CHAR_NEEDLE, 'sticky close char edit'],
    [VENDOR_SHOT_SKIP_SHOW_NEEDLE, 'shot modal skip second showContainer'],
    [VENDOR_CHAR_SKIP_SHOW_NEEDLE, 'char modal skip second showContainer'],
    [VENDOR_SHOT_SWAP_VEIL_NEEDLE, 'shot modal swap veil'],
    [VENDOR_CHAR_SWAP_VEIL_NEEDLE, 'char modal swap veil'],
    [VENDOR_CHIP_SKIP_ROSTER_NEEDLE, 'chip click skip roster await'],
    [VENDOR_SAVE_ONLY_BG_NEEDLE, 'shot saveOnly background'],
    [VENDOR_SAVE_REROLL_BG_NEEDLE, 'shot save reroll close first'],
    [VENDOR_SAVE_REROLL_INLINE_NEEDLE, 'shot save reroll refresh inline'],
    [VENDOR_GALLERY_CE_LIMIT_NEEDLE, 'session gallery ce limit'],
    [VENDOR_GALLERY_CE_MERGE_NEEDLE, 'session gallery ce cache write'],
    [VENDOR_GALLERY_CE_WARM_NEEDLE, 'session gallery ce skip speculative strip warm'],
    [VENDOR_CHAR_SAVE_BG_NEEDLE, 'char save skip close after POST'],
    [VENDOR_CHAR_SAVE_CLOSE_FIRST_NEEDLE, 'char save close before POST'],
    [VENDOR_SETTINGS_OPEN_STICKY_NEEDLE, 'settings open sticky hide'],
    [VENDOR_SETTINGS_AT_HIDE_PANEL_NEEDLE, 'settings At hide panel + rehide'],
    [VENDOR_HIDE_INSPECT_BIND_NEEDLE, 'hideInspect bind on t'],
    [VENDOR_SHOW_INSPECT_ABORT_NEEDLE, 'showStickyInspect abort start'],
    [VENDOR_SHOW_INSPECT_COMMIT_NEEDLE, 'showStickyInspect abort commit'],
    [VENDOR_SETTINGS_CLOSE_STICKY_NEEDLE, 'settings close sticky restore'],
    [VENDOR_BLOCK_HOST_UNBLOCK_NEEDLE, 'blockHostChrome unblock style-only'],
    [VENDOR_SANGSI_TOGGLE_NEEDLE, 'viewer 상시 optimistic toggle'],
    [VENDOR_SETTINGS_WATCH_STICKY_NEEDLE, 'settings watch sticky restore'],
    [VENDOR_BOOT_SETTINGS_STAMP_NEEDLE, 'boot settings fetch stamp'],
    [VENDOR_BOOT_RETRY_SETTINGS_NEEDLE, 'boot retry drops its settings GET'],
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
    [VENDOR_CHAR_TAB_IDENTITY_HTML_NEEDLE, 'char tab identity row'],
    [VENDOR_CHAR_TAB_GENDER_HTML_NEEDLE, 'char tab gender html'],
    [VENDOR_CHAR_TAB_GENDER_READ_NEEDLE, 'char tab gender read'],
    [VENDOR_CHAR_TAB_GENDER_MERGE_NEEDLE, 'char tab gender merge'],
    [VENDOR_CHAR_TAB_WEAR_HTML_NEEDLE, 'char tab wear labels'],
    [VENDOR_CHAR_TAB_LOOKS_HTML_NEEDLE, 'char tab look slots'],
    [VENDOR_CHAR_TAB_AUTOTAG_APPLY_NEEDLE, 'char tab autotag look apply'],
    [VENDOR_CHAR_EDIT_APPEARANCE_SIZE_NEEDLE, 'char edit appearance size'],
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
    [VENDOR_CHAR_REF_SCOPE_ATTR_NEEDLE, 'char ref roster scope attr'],
    [VENDOR_CHAR_REF_TAB_EVT_NEEDLE, 'char ref tab events'],
    [VENDOR_CHAR_REF_EDIT_EVT_NEEDLE, 'char ref edit events'],
    [VENDOR_AUTOTAG_WINDOW_PASTE_NEEDLE, 'autotag window paste modal'],
    [VENDOR_CHAR_EDIT_MODAL_PASTE_NEEDLE, 'char edit modal paste keep'],
    [VENDOR_CHAR_EDIT_UI_PASTE_NEEDLE, 'char edit ui paste hooks'],
    [VENDOR_CHAR_EDIT_AUTOTAG_ARM_NEEDLE, 'char edit autotag arm focus'],
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
    [VENDOR_CHAR_IMPORT_EVT_NEEDLE, 'character import picker modal'],
    [VENDOR_UNIFIED_SCOPE_CE_NEEDLE, 'unified scope reload after gallery'],
    [VENDOR_UNIFIED_REFRESH_CE_NEEDLE, 'unified refresh reload after gallery'],
    [VENDOR_UNIFIED_REBUILD_CE_NEEDLE, 'unified rebuild reload after gallery'],
    [VENDOR_UNIFIED_SAVE_REBUILD_NEEDLE, 'unified save then remesh'],
    [VENDOR_UNIFIED_WINNERS_EVT_NEEDLE, 'unified winners toggle'],
    [VENDOR_RESET_HELP_NEEDLE, 'reset help titles'],
    [VENDOR_RESET_CHAR_REF_EVT_NEEDLE, 'reset char ref button'],
    [VENDOR_XA_FULL_NEEDLE, 'xa full silent save'],
    [VENDOR_UNLOAD_SAVE_NEEDLE, 'unload xa silent save'],
    [VENDOR_FF_FONT_BODY_NEEDLE, 'firefox font body'],
    [VENDOR_FF_FONT_TOGGLE_NEEDLE, 'firefox font toggle-row'],
    [VENDOR_INLINE_HELP_NEEDLE, 'inline chat help'],
    [VENDOR_INLINE_TOGGLE_NEEDLE, 'inline chat toggle'],
    [VENDOR_INLINE_SAVE_NEEDLE, 'inline chat save'],
    [VENDOR_PROGRESS_TOAST_FN_NEEDLE, 'progress toast sync fn'],
    [VENDOR_PROGRESS_TOAST_PAINT_NEEDLE, 'progress toast paintStatus'],
    [VENDOR_INSPECT_CHAR_OPEN_NEEDLE, 'inspect sheet char open like viewer'],
    [VENDOR_INSPECT_REROLL_INLINE_NEEDLE, 'inspect sheet reroll inline'],
    [VENDOR_INSPECT_REGEN_INLINE_NEEDLE, 'inspect sheet regen inline'],
    [VENDOR_REROLL_TOAST_HEARTBEAT_NEEDLE, 'reroll toast heartbeat'],
    [VENDOR_REROLL_LIVE_STOP_NEEDLE, 'reroll live soft-stop'],
    [VENDOR_REROLL_LIVE_STOP_END_NEEDLE, 'reroll live soft-stop end'],
    [VENDOR_REROLL_IMAGE_INLINE_NEEDLE, 'reroll image inline refresh'],
    [VENDOR_REROLL_ALL_INLINE_NEEDLE, 'reroll all inline refresh'],
    [VENDOR_FORCE_REGEN_GALLERY_NEEDLE, 'force regen gallery reload'],
    [VENDOR_FORCE_REGEN_INLINE_NEEDLE, 'force regen inline clear'],
    [VENDOR_DE_STRIP_NEEDLE, 'De strip inline markers'],
    [VENDOR_IE_FN_NEEDLE, 'Ie/ensureSticky accept blob display urls'],
    [VENDOR_STICKY_POOL_IMG_NEEDLE, 'sticky pool img setAttribute'],
    [VENDOR_DT_FN_NEEDLE, 'risu-chat data-chat-id list'],
    [VENDOR_DA_SAME_CLICK_NEEDLE, 'same click inline no-op'],
    [VENDOR_DA_QA_NEEDLE, 'Da qa data-chat-index'],
    [VENDOR_BIND_QA_NEEDLE, 'bindCard qa data-chat-index'],
    [VENDOR_INLINE_INJECT_FN_NEEDLE, 'inline inject fn'],
    [VENDOR_INLINE_CALL_NEEDLE, 'inline inject call'],
    [VENDOR_INLINE_SAME_NEEDLE, 'inline inject same-select'],
    [VENDOR_INLINE_PENDING_UI_NEEDLE, 'inline pending before ui-open return'],
    [VENDOR_INLINE_POLL_NEEDLE, 'inline poll pending'],
    [VENDOR_INLINE_POLL_REFRESH_NEEDLE, 'inline poll refresh'],
    [VENDOR_JOB_DONE_IT_NEEDLE, 'job done skip remount if roots'],
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
    [VENDOR_EXECUTE_HELP_NEEDLE, 'execute help decouple reply/stream'],
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
    [VENDOR_SCOPE_BOOT_SELECT_NEEDLE, 'boot pointer select'],
    [VENDOR_POINTER_SELECT_NEEDLE, 'pointer select after session/reply'],
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
    [VENDOR_META_SKIP_ROSTER_NEEDLE, 'viewer chips skip roster await'],
    [VENDOR_VIEWER_META_CHIP_TOUCH_NEEDLE, 'viewer meta chip touch'],
    [VENDOR_VIEWER_META_Y_CHIP_TOUCH_NEEDLE, 'viewer meta y chip touch'],
    [VENDOR_VIEWER_BASE_CHIP_NEEDLE, 'viewer base chip 수정'],
    [VENDOR_INSPECT_BASE_CHIP_NEEDLE, 'inspect base chip 수정'],
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
    [VENDOR_STRIP_WARM_CAP_NEEDLE, 'viewer strip warm cap items'],
    [VENDOR_SELECT_COALESCE_NEEDLE, 'viewer select coalesce last index'],
    [VENDOR_SOFT_SKIP_FILL_NEEDLE, 'viewer softAfterSelect skip fill await'],
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
  {
    let count = 0;
    let at = raw.indexOf(VENDOR_STRIP_WARM_CAP_LIST_NEEDLE);
    while (at !== -1) {
      count += 1;
      at = raw.indexOf(VENDOR_STRIP_WARM_CAP_LIST_NEEDLE, at + VENDOR_STRIP_WARM_CAP_LIST_NEEDLE.length);
    }
    if (count !== 2) {
      throw new Error(`[build] expected 2× viewer strip warm list cap, found ${count}`);
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
    .replace(VENDOR_EXPLORER_LIMIT_NEEDLE, VENDOR_EXPLORER_LIMIT_PATCH)
    .replace(VENDOR_EXPLORER_SELECT_ALL_NEEDLE, VENDOR_EXPLORER_SELECT_ALL_PATCH)
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
    .replace(VENDOR_CANCEL_PRESS_IDS_NEEDLE, VENDOR_CANCEL_PRESS_IDS_PATCH)
    .replace(VENDOR_SECOND_PTR_CANCEL_NEEDLE, VENDOR_SECOND_PTR_CANCEL_PATCH)
    .replace(VENDOR_PRESS_PTR_UP_NEEDLE, VENDOR_PRESS_PTR_UP_PATCH)
    .replace(VENDOR_PRESS_PTR_CANCEL_NEEDLE, VENDOR_PRESS_PTR_CANCEL_PATCH)
    .replace(VENDOR_PRESS_FILL_STICKY_CALL_NEEDLE, VENDOR_PRESS_FILL_STICKY_CALL_PATCH)
    .replace(VENDOR_STICKY_PRESS_NEEDLE, VENDOR_STICKY_PRESS_PATCH)
    .replace(VENDOR_INLINE_LONGPRESS_NEEDLE, VENDOR_INLINE_LONGPRESS_PATCH);
    assertOnce(out, VENDOR_STICKY_INSPECT_PRESS_NEEDLE, 'sticky inspect press after collapsed rename');
    out = out.replace(VENDOR_STICKY_INSPECT_PRESS_NEEDLE, VENDOR_STICKY_INSPECT_PRESS_PATCH)
    .replace(VENDOR_MSG_CHIP_UP_NEEDLE, VENDOR_MSG_CHIP_UP_PATCH)
    .replace(VENDOR_STICKY_REVIVE_NEEDLE, VENDOR_STICKY_REVIVE_PATCH)
    .replace(VENDOR_STICKY_INIT_NEEDLE, VENDOR_STICKY_INIT_PATCH)
    .replace(VENDOR_STICKY_RESET_NEEDLE, VENDOR_STICKY_RESET_PATCH)
    .replace(VENDOR_STICKY_CLOSE_CHAR_NEEDLE, VENDOR_STICKY_CLOSE_CHAR_PATCH)
    .replace(VENDOR_STICKY_OPEN_CHAR_NEEDLE, VENDOR_STICKY_OPEN_CHAR_PATCH)
    .replace(VENDOR_STICKY_CLOSE_CARD_NEEDLE, VENDOR_STICKY_CLOSE_CARD_PATCH)
    .replace(VENDOR_STICKY_OPEN_CARD_NEEDLE, VENDOR_STICKY_OPEN_CARD_PATCH)
    .replace(VENDOR_SHOT_SKIP_SHOW_NEEDLE, VENDOR_SHOT_SKIP_SHOW_PATCH)
    .replace(VENDOR_CHAR_SKIP_SHOW_NEEDLE, VENDOR_CHAR_SKIP_SHOW_PATCH)
    .replace(VENDOR_SHOT_SWAP_VEIL_NEEDLE, VENDOR_SHOT_SWAP_VEIL_PATCH)
    .replace(VENDOR_CHAR_SWAP_VEIL_NEEDLE, VENDOR_CHAR_SWAP_VEIL_PATCH)
    .replace(VENDOR_CHIP_SKIP_ROSTER_NEEDLE, VENDOR_CHIP_SKIP_ROSTER_PATCH)
    .replace(VENDOR_SAVE_ONLY_BG_NEEDLE, VENDOR_SAVE_ONLY_BG_PATCH)
    .replace(VENDOR_SAVE_REROLL_BG_NEEDLE, VENDOR_SAVE_REROLL_BG_PATCH)
    .replace(VENDOR_SAVE_REROLL_INLINE_NEEDLE, VENDOR_SAVE_REROLL_INLINE_PATCH)
    .replace(VENDOR_GALLERY_CE_LIMIT_NEEDLE, VENDOR_GALLERY_CE_LIMIT_PATCH)
    .replace(VENDOR_GALLERY_CE_MERGE_NEEDLE, VENDOR_GALLERY_CE_MERGE_PATCH)
    .replace(VENDOR_GALLERY_CE_WARM_NEEDLE, VENDOR_GALLERY_CE_WARM_PATCH)
    .replace(VENDOR_CHAR_SAVE_BG_NEEDLE, VENDOR_CHAR_SAVE_BG_PATCH)
    .replace(VENDOR_CHAR_SAVE_CLOSE_FIRST_NEEDLE, VENDOR_CHAR_SAVE_CLOSE_FIRST_PATCH)
    .replace(VENDOR_SETTINGS_OPEN_STICKY_NEEDLE, VENDOR_SETTINGS_OPEN_STICKY_PATCH)
    .replace(VENDOR_SETTINGS_AT_HIDE_PANEL_NEEDLE, VENDOR_SETTINGS_AT_HIDE_PANEL_PATCH)
    .replace(VENDOR_HIDE_INSPECT_BIND_NEEDLE, VENDOR_HIDE_INSPECT_BIND_PATCH)
    .replace(VENDOR_SHOW_INSPECT_ABORT_NEEDLE, VENDOR_SHOW_INSPECT_ABORT_PATCH)
    .replace(VENDOR_SHOW_INSPECT_COMMIT_NEEDLE, VENDOR_SHOW_INSPECT_COMMIT_PATCH)
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
    .replace(VENDOR_CHAR_EDIT_HEADER_NEEDLE, VENDOR_CHAR_EDIT_HEADER_PATCH)
    .replace(VENDOR_CHAR_EDIT_GENDER_HTML_NEEDLE, VENDOR_CHAR_EDIT_GENDER_HTML_PATCH)
    .replace(VENDOR_CHAR_EDIT_GENDER_REF_NEEDLE, VENDOR_CHAR_EDIT_GENDER_REF_PATCH)
    .replace(VENDOR_CHAR_EDIT_GENDER_AUTOTAG_NEEDLE, VENDOR_CHAR_EDIT_GENDER_AUTOTAG_PATCH)
    .replace(VENDOR_CHAR_EDIT_GENDER_SAVE_NEEDLE, VENDOR_CHAR_EDIT_GENDER_SAVE_PATCH)
    .replace(VENDOR_CHAR_TAB_IDENTITY_HTML_NEEDLE, VENDOR_CHAR_TAB_IDENTITY_HTML_PATCH)
    .replace(VENDOR_CHAR_TAB_GENDER_HTML_NEEDLE, VENDOR_CHAR_TAB_GENDER_HTML_PATCH)
    .replace(VENDOR_CHAR_TAB_GENDER_READ_NEEDLE, VENDOR_CHAR_TAB_GENDER_READ_PATCH)
    .replace(VENDOR_CHAR_TAB_GENDER_MERGE_NEEDLE, VENDOR_CHAR_TAB_GENDER_MERGE_PATCH)
    .replace(VENDOR_CHAR_TAB_WEAR_HTML_NEEDLE, VENDOR_CHAR_TAB_WEAR_HTML_PATCH)
    .replace(VENDOR_CHAR_TAB_LOOKS_HTML_NEEDLE, VENDOR_CHAR_TAB_LOOKS_HTML_PATCH)
    .replace(VENDOR_CHAR_TAB_AUTOTAG_APPLY_NEEDLE, VENDOR_CHAR_TAB_AUTOTAG_APPLY_PATCH)
    .replace(VENDOR_CHAR_EDIT_COSTUME_NEEDLE, VENDOR_CHAR_EDIT_COSTUME_PATCH)
    .replace(VENDOR_CHAR_EDIT_COSTUME_BIND_NEEDLE, VENDOR_CHAR_EDIT_COSTUME_BIND_PATCH)
    .replace(VENDOR_CHAR_EDIT_WEAR_ATTIRE_NEEDLE, VENDOR_CHAR_EDIT_WEAR_ATTIRE_PATCH)
    .replace(VENDOR_CHAR_EDIT_WEAR_ACC_NEEDLE, VENDOR_CHAR_EDIT_WEAR_ACC_PATCH)
    .replace(VENDOR_CHAR_EDIT_APPEARANCE_LABEL_NEEDLE, VENDOR_CHAR_EDIT_APPEARANCE_LABEL_PATCH)
    .replace(VENDOR_CHAR_EDIT_APPEARANCE_SIZE_NEEDLE, VENDOR_CHAR_EDIT_APPEARANCE_SIZE_PATCH)
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
    .replace(VENDOR_CHAR_REF_SCOPE_ATTR_NEEDLE, VENDOR_CHAR_REF_SCOPE_ATTR_PATCH)
    .replace(VENDOR_CHAR_REF_EDIT_HTML_NEEDLE, VENDOR_CHAR_REF_EDIT_HTML_PATCH)
    .replace(VENDOR_AUTOTAG_WINDOW_PASTE_NEEDLE, VENDOR_AUTOTAG_WINDOW_PASTE_PATCH)
    .replace(VENDOR_CHAR_REF_TAB_EVT_NEEDLE, VENDOR_CHAR_REF_TAB_EVT_PATCH)
    .replace(VENDOR_CHAR_REF_EDIT_EVT_NEEDLE, VENDOR_CHAR_REF_EDIT_EVT_PATCH)
    .replace(VENDOR_CHAR_EDIT_MODAL_PASTE_NEEDLE, VENDOR_CHAR_EDIT_MODAL_PASTE_PATCH)
    .replace(VENDOR_CHAR_EDIT_UI_PASTE_NEEDLE, VENDOR_CHAR_EDIT_UI_PASTE_PATCH)
    .replace(VENDOR_CHAR_EDIT_AUTOTAG_ARM_NEEDLE, VENDOR_CHAR_EDIT_AUTOTAG_ARM_PATCH)
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
    .replace(VENDOR_CHAR_IMPORT_EVT_NEEDLE, VENDOR_CHAR_IMPORT_EVT_PATCH)
    .replace(VENDOR_UNIFIED_SCOPE_CE_NEEDLE, VENDOR_UNIFIED_SCOPE_CE_PATCH)
    .replace(VENDOR_UNIFIED_REFRESH_CE_NEEDLE, VENDOR_UNIFIED_REFRESH_CE_PATCH)
    .replace(VENDOR_UNIFIED_REBUILD_CE_NEEDLE, VENDOR_UNIFIED_REBUILD_CE_PATCH)
    .replace(VENDOR_UNIFIED_SAVE_REBUILD_NEEDLE, VENDOR_UNIFIED_SAVE_REBUILD_PATCH)
    .replace(VENDOR_UNIFIED_WINNERS_EVT_NEEDLE, VENDOR_UNIFIED_WINNERS_EVT_PATCH)
    .replace(VENDOR_RESET_HELP_NEEDLE, VENDOR_RESET_HELP_PATCH)
    .replace(VENDOR_RESET_CHAR_REF_EVT_NEEDLE, VENDOR_RESET_CHAR_REF_EVT_PATCH)
    .replace(VENDOR_XA_FULL_NEEDLE, VENDOR_XA_FULL_PATCH)
    .replace(VENDOR_UNLOAD_SAVE_NEEDLE, VENDOR_UNLOAD_SAVE_PATCH)
    .replace(VENDOR_FF_FONT_BODY_NEEDLE, VENDOR_FF_FONT_BODY_PATCH)
    .replace(VENDOR_FF_FONT_TOGGLE_NEEDLE, VENDOR_FF_FONT_TOGGLE_PATCH)
    .replace(VENDOR_INLINE_HELP_NEEDLE, VENDOR_INLINE_HELP_PATCH)
    .replace(VENDOR_INLINE_TOGGLE_NEEDLE, VENDOR_INLINE_TOGGLE_PATCH)
    .replace(VENDOR_INLINE_SAVE_NEEDLE, VENDOR_INLINE_SAVE_PATCH)
    .replace(VENDOR_PROGRESS_TOAST_FN_NEEDLE, VENDOR_PROGRESS_TOAST_FN_PATCH)
    .replace(VENDOR_PROGRESS_TOAST_PAINT_NEEDLE, VENDOR_PROGRESS_TOAST_PAINT_PATCH)
    .replace(VENDOR_INSPECT_CHAR_OPEN_NEEDLE, VENDOR_INSPECT_CHAR_OPEN_PATCH)
    .replace(VENDOR_INSPECT_REROLL_INLINE_NEEDLE, VENDOR_INSPECT_REROLL_INLINE_PATCH)
    .replace(VENDOR_INSPECT_REGEN_INLINE_NEEDLE, VENDOR_INSPECT_REGEN_INLINE_PATCH)
    .replace(VENDOR_REROLL_TOAST_HEARTBEAT_NEEDLE, VENDOR_REROLL_TOAST_HEARTBEAT_PATCH)
    .replace(VENDOR_REROLL_LIVE_STOP_NEEDLE, VENDOR_REROLL_LIVE_STOP_PATCH)
    .replace(VENDOR_REROLL_LIVE_STOP_END_NEEDLE, VENDOR_REROLL_LIVE_STOP_END_PATCH)
    .replace(VENDOR_REROLL_IMAGE_INLINE_NEEDLE, VENDOR_REROLL_IMAGE_INLINE_PATCH)
    .replace(VENDOR_REROLL_ALL_INLINE_NEEDLE, VENDOR_REROLL_ALL_INLINE_PATCH)
    .replace(VENDOR_FORCE_REGEN_GALLERY_NEEDLE, VENDOR_FORCE_REGEN_GALLERY_PATCH)
    .replace(VENDOR_FORCE_REGEN_INLINE_NEEDLE, VENDOR_FORCE_REGEN_INLINE_PATCH)
    .replace(VENDOR_DE_STRIP_NEEDLE, VENDOR_DE_STRIP_PATCH)
    .replace(VENDOR_IE_FN_NEEDLE, VENDOR_IE_FN_PATCH)
    .replaceAll(VENDOR_IE_READY_FB_NEEDLE, VENDOR_IE_READY_FB_PATCH)
    .replaceAll(VENDOR_IE_READY_FRESH_NEEDLE, VENDOR_IE_READY_FRESH_PATCH)
    .replace(VENDOR_STICKY_POOL_IMG_NEEDLE, VENDOR_STICKY_POOL_IMG_PATCH)
    .replace(VENDOR_DT_FN_NEEDLE, VENDOR_DT_FN_PATCH)
    .replace(VENDOR_DA_SAME_CLICK_NEEDLE, VENDOR_DA_SAME_CLICK_PATCH)
    .replace(VENDOR_DA_QA_NEEDLE, VENDOR_DA_QA_PATCH)
    .replace(VENDOR_BIND_QA_NEEDLE, VENDOR_BIND_QA_PATCH)
    .replace(VENDOR_INLINE_INJECT_FN_NEEDLE, VENDOR_INLINE_INJECT_FN_PATCH)
    .replace(VENDOR_ENSURE_IN_VIEW_NEEDLE, VENDOR_ENSURE_IN_VIEW_PATCH)
    .replace(VENDOR_INLINE_CALL_NEEDLE, VENDOR_INLINE_CALL_PATCH)
    .replace(VENDOR_INLINE_SAME_NEEDLE, VENDOR_INLINE_SAME_PATCH)
    .replace(VENDOR_INLINE_PENDING_UI_NEEDLE, VENDOR_INLINE_PENDING_UI_PATCH)
    .replace(VENDOR_INLINE_POLL_NEEDLE, VENDOR_INLINE_POLL_PATCH)
    .replace(VENDOR_INLINE_POLL_REFRESH_NEEDLE, VENDOR_INLINE_POLL_REFRESH_PATCH)
    .replace(VENDOR_JOB_DONE_IT_NEEDLE, VENDOR_JOB_DONE_IT_PATCH)
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
    .replace(VENDOR_EXECUTE_HELP_NEEDLE, VENDOR_EXECUTE_HELP_PATCH)
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
    .replace(VENDOR_SCOPE_BOOT_SELECT_NEEDLE, VENDOR_SCOPE_BOOT_SELECT_PATCH)
    .replace(VENDOR_POINTER_SELECT_NEEDLE, VENDOR_POINTER_SELECT_PATCH)
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
    .replace(VENDOR_META_SKIP_ROSTER_NEEDLE, VENDOR_META_SKIP_ROSTER_PATCH)
    .replace(VENDOR_VIEWER_META_CHIP_TOUCH_NEEDLE, VENDOR_VIEWER_META_CHIP_TOUCH_PATCH)
    .replace(VENDOR_VIEWER_META_Y_CHIP_TOUCH_NEEDLE, VENDOR_VIEWER_META_Y_CHIP_TOUCH_PATCH)
    .replace(VENDOR_VIEWER_BASE_CHIP_NEEDLE, VENDOR_VIEWER_BASE_CHIP_PATCH)
    .replace(VENDOR_INSPECT_BASE_CHIP_NEEDLE, VENDOR_INSPECT_BASE_CHIP_PATCH)
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
    .replace(VENDOR_STRIP_WARM_CAP_NEEDLE, VENDOR_STRIP_WARM_CAP_PATCH)
    .replaceAll(VENDOR_STRIP_WARM_CAP_LIST_NEEDLE, VENDOR_STRIP_WARM_CAP_LIST_PATCH)
    .replace(VENDOR_SELECT_COALESCE_NEEDLE, VENDOR_SELECT_COALESCE_PATCH)
    .replace(VENDOR_SOFT_SKIP_FILL_NEEDLE, VENDOR_SOFT_SKIP_FILL_PATCH)
    .replaceAll(VENDOR_THUMBS_KIDS_NEEDLE, VENDOR_THUMBS_KIDS_PATCH)
    .replace(VENDOR_THUMBS_CLEAR_NEEDLE, VENDOR_THUMBS_CLEAR_PATCH)
    .replace(VENDOR_THUMBS_POINTER_NEEDLE, VENDOR_THUMBS_POINTER_PATCH)
    .replace(VENDOR_THUMBS_DRAG_NEEDLE, VENDOR_THUMBS_DRAG_PATCH)
    .replace(VENDOR_ACTIONS_POINTER_NEEDLE, VENDOR_ACTIONS_POINTER_PATCH)
    .replace(VENDOR_ACTIONS_DRAG_CLEAR_NEEDLE, VENDOR_ACTIONS_DRAG_CLEAR_PATCH)
    .replace(VENDOR_ACTIONS_END_CLEAR_NEEDLE, VENDOR_ACTIONS_END_CLEAR_PATCH)
    .replace(VENDOR_ICON_EXPAND_GUARD_NEEDLE, VENDOR_ICON_EXPAND_GUARD_PATCH)
    .replace(VENDOR_HIDE_MODAL_CANCEL_EXPAND_NEEDLE, VENDOR_HIDE_MODAL_CANCEL_EXPAND_PATCH)
    .replace(VENDOR_BOOT_SETTINGS_STAMP_NEEDLE, VENDOR_BOOT_SETTINGS_STAMP_PATCH)
    .replace(VENDOR_BOOT_RETRY_SETTINGS_NEEDLE, VENDOR_BOOT_RETRY_SETTINGS_PATCH)
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
    .replaceAll(VENDOR_APPEARANCE_LABEL_SHARED_NEEDLE, VENDOR_APPEARANCE_LABEL_SHARED_PATCH)
    .replace(VENDOR_NAI_SAMPLER_NEEDLE, VENDOR_NAI_SAMPLER_PATCH);
    assertOnce(out, VENDOR_CHAR_REF_MODE_OFF_LABEL_NEEDLE, 'char ref automatic mode label');
    out = out.replace(VENDOR_CHAR_REF_MODE_OFF_LABEL_NEEDLE, VENDOR_CHAR_REF_MODE_OFF_LABEL_PATCH);
    assertOnce(out, VENDOR_BOOT_MOUNT_FIRST_NEEDLE, 'boot mount before gallery (after overlay mount)');
    out = out.replace(VENDOR_BOOT_MOUNT_FIRST_NEEDLE, VENDOR_BOOT_MOUNT_FIRST_PATCH);
    // Delete the dead fill first: its body carries the same warm loop the strip
    // needle matches, so removing it is what makes that needle unambiguous.
    assertOnce(out, VENDOR_THUMBS_DEAD_FILL_NEEDLE, 'dead fillThumbSrcs (after soft-skip)');
    out = out.replace(VENDOR_THUMBS_DEAD_FILL_NEEDLE, VENDOR_THUMBS_DEAD_FILL_PATCH);
    assertOnce(out, VENDOR_THUMBS_STRIP_NONBLOCK_NEEDLE, 'thumb strip warm await');
    out = out.replace(VENDOR_THUMBS_STRIP_NONBLOCK_NEEDLE, VENDOR_THUMBS_STRIP_NONBLOCK_PATCH);
    assertOnce(out, VENDOR_THUMBS_WARM_REPAINT_NEEDLE, 'warm wave repaints the strip');
    out = out.replace(VENDOR_THUMBS_WARM_REPAINT_NEEDLE, VENDOR_THUMBS_WARM_REPAINT_PATCH);
    if (out.includes('fillThumbSrcs')) {
      throw new Error('[build] fillThumbSrcs survived — a dead setAttribute("src") fill is still shipping');
    }
    // The one-shot self-only attach is what made shots/chips wait for a click.
    if (out.includes('_inlineSelfOnly')) {
      throw new Error('[build] _inlineSelfOnly survived — automatic selection would attach once and give up');
    }
    // The retry ladder is gone: markers land in one pass and each image arrives
    // on its own subscription, so a pass can no longer finish "half attached".
    // Anything below reappearing means the ladder crept back in.
    for (const dead of [
      'nxScheduleAttachRetry',
      'nxResetAttachRetry',
      'nxAttachWaits',
      'NX_ATTACH_BACKOFF',
      'NX_SESSION_ATTACH_BACKOFF',
      'inlineAttachSucceeded',
      'nxReadyInlineImgCount',
      '_inlineAttachOk',
      '_inlineEncodeLeft',
      'trackInlineEncodeAttempt',
      '_inlineNoRebind',
      '_pointerSelectRetried',
      '_pointerSelectBootTries',
      '_inlineInjectBusy',
      '_inlineInjectQueued',
      '_inlineKeepIdxs',
    ]) {
      if (out.includes(dead)) {
        throw new Error(`[build] ${dead} survived — the inline retry ladder is back`);
      }
    }
    assertOnce(out, 'subscribeImageUrl != "function"', 'inline fill must go through the subscription channel');
    {
      // A retry must never fan out POST /v1/jobs/retarget-hash per neighbour.
      const from = out.indexOf('async function refreshSelectedInlineImages(force');
      const to = out.indexOf('async function openSettingsTab(tab) {', from);
      if (from < 0 || to < 0) throw new Error('[build] cannot slice refreshSelectedInlineImages');
      const body = out.slice(from, to);
      if (body.includes('maybeRebindAndLink(') && !body.includes('return await maybeRebindAndLink(msg) || fallback;')) {
        throw new Error('[build] refreshSelectedInlineImages calls maybeRebindAndLink outside the nxRebind gate');
      }
      if ((body.match(/maybeRebindAndLink\(/g) || []).length !== 1) {
        throw new Error('[build] refreshSelectedInlineImages must reach maybeRebindAndLink only through nxRebind');
      }
      if (!body.includes('VC.shouldOverlayInlinePhoto({') || !body.includes('VC.inlineDomWindow(selIdx, els.length, radius)')) {
        throw new Error('[build] inline refresh must stamp ±radius and overlay ±1 char only');
      }
      if (!body.includes('wantPhotos: nextPhotoIdx.has(idx)') || !body.includes('evictPhotosIn')) {
        throw new Error('[build] photos outside ±1 must be evicted without tearing spinners');
      }
      if (!body.includes('if (idx === selIdx && sel)') || !body.includes('row = { idx, msg: sel,')) {
        throw new Error('[build] selected bubble must reuse Da cards, not qa-miss empty hash');
      }
      if (body.includes('nxInlineAlreadyPainted(els[selIdx]')) {
        throw new Error('[build] one painted bubble must not abort missing-neighbour repair');
      }
      if (!body.includes('confirmedEmpty: !cards.length')) {
        throw new Error('[build] confirmed empty selections must clear photos without removing frames');
      }
      if (!body.includes('const onlySel = !!(opts && opts.onlySel)') || !body.includes('? [selIdx]')) {
        throw new Error('[build] tag restamp must stay on the selected bubble');
      }
    }
    // Prove sticky scroll/pointer patches actually landed (needle-only assert is not enough).
    assertOnce(out, 'ensureScrollPhaseBus = () =>', 'scroll phase bus landed');
    assertOnce(out, 'async function nxUpdateStickyActiveOnScrollEnd', 'nx scroll-end sticky activate landed');
    assertOnce(out, 'async function nxActivateStickyByCardId', 'nx sticky by cardId landed');
    assertOnce(out, 'const pw = Math.max(1, Math.round(Number(pin.w || pin.size) || 0));', 'sticky expand hit uses cluster width');
    assertOnce(out, '"opacity:.45", "background:rgba(15,23,42,.2)"', 'sticky count badges stay translucent over the image');
    assertOnce(out, 'if (dbl && card && typeof showStickyInspect == "function") {', 'count-chip double-click opens inspect');
    assertOnce(out, 't.hideStickyInspect = hideInspect;', 'inspect close is exposed for settings');
    assertOnce(out, 'char-looks-row" style="margin-top:8px;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px"', 'char edit looks row is one line without settings CSS');
    assertOnce(out, '캐릭터 태그 수정</div><div style="margin-top:3px;color:#9aa6b8;font-size:11px">불러오는 중…', 'char edit stub uses real modal chrome');
    assertOnce(out, '샷 태그 수정</div><div style="margin-top:3px;color:#9aa6b8;font-size:11px">불러오는 중…', 'shot tag stub uses real modal chrome');
    assertOnce(out, 't.cardTagUi = { openedContainer: openedShell, _studio: !0 }', 'studio reuses the old shot-tag container');
    assertOnce(out, 'await globalThis.__INLAY_NATIVE__.openTagStudio(e);', 'studio overlay waits for close then hideContainer');
    assertOnce(out, 't._closingCardTag = !0;', 'card-tag close is re-entry safe');
    assertOnce(out, 'const dismissCharStub = () => {', 'char edit stub can close while loading');
    assertOnce(out, 'if (!f || t.uiOpen) return;', 'inspect refuses to open while settings are up');
    assertOnce(out, 't.overlayUi?.actionMenu]) {', 'settings hide also covers inspect actionMenu');
    assertOnce(out, 'openedInspect: !0', 'count-chip inspect fires on the second pointerdown');
    assertOnce(out, 'if (ov && ov._stickyThumbCollapsed) {', 'count-chip single tap only expands when folded');
    assertOnce(out, 'const stickyPins = t.overlayUi?.markers || [];', 'count-chip / pin hit is tested before the sticky image');
    assertOnce(out, '/v1/gallery/explore?limit=0', 'explorer listing is uncapped');
    assertOnce(out, 'id="nx-explorer-select-all"', 'explorer select-all button landed');
    assertOnce(out, 'N.warmExplorerThumbs(missing)', 'explorer warms object-URL thumbs');
    if (out.includes('/v1/gallery/explore?limit=500')) {
      throw new Error('[build] explorer still requests a 500-card listing cap');
    }
    if (out.includes('N.warmImages(missing)')) {
      throw new Error('[build] explorer still encodes data URLs for thumbs');
    }
    if (out.includes('if (nxFireTap(g.card)) return;')) {
      throw new Error('[build] sticky image must not fire tap-inspect');
    }
    assertOnce(out, 'async function nxHostToast', 'nxHostToast landed');
    assertOnce(out, 'async function showSelectionToast', 'selection toast landed');
    assertOnce(out, 'async function showAttachToast()', 'attach spinner toast landed');
    assertOnce(out, 'function nxToastAnchor()', 'toast anchor helper landed');
    assertOnce(out, 'const nxImagePressMode = () => {', 'image press mode helper landed');
    assertOnce(out, 'VC.imagePressAllowsSecondPointer(t.backendSettings?.card?.image_press_inspect)', 'second pointer keep helper landed');
    assertOnce(out, 'VC.imagePressIgnorePointerCancel(t.backendSettings?.card?.image_press_inspect, mobilePress?.source)', 'pinch cancel ignore landed');
    if (out.includes('f.pointerId !== mobilePress.pointerId) {\n        cancelMobilePress();')) {
      throw new Error('[build] second pointer still cancels image press before hit-test');
    }
    // Counting fingers by pointerId is what silently broke two-finger press: the
    // forwarded event repeats or omits the id, so two touches deduped into one.
    if (out.includes('_imagePressIds')) {
      throw new Error('[build] image press still counts pointerIds — two fingers can dedupe into one');
    }
    if ((out.match(/nxNotePressDown\(\);/g) || []).length !== 1) {
      throw new Error('[build] only inline-shot records a press down — sticky image does not inspect');
    }
    assertOnce(out, 'VCUp.noteImagePressUp(t._imagePressDowns)', 'pointerup releases one press slot');
    assertOnce(out, 'select id="nx-toast-anchor"', 'toast position select landed');
    assertOnce(out, 'select id="nx-image-press"', 'image press select landed');
    assertOnce(out, '>더블 탭</option>', 'double-tap press option landed');
    assertOnce(out, '>트리플 탭</option>', 'triple-tap press option landed');
    assertOnce(out, '>꾸욱 누르기 + 더블탭</option>', 'hold plus double-tap option landed');
    if (out.includes('>둘 다 사용</option>')) {
      throw new Error('[build] both-option label must name hold + double-tap');
    }
    assertOnce(out, 'VC.imagePressTapHits({', 'image tap-streak helper landed');
    assertOnce(out, 'const nxFireTap = (card) => {', 'tap-streak helper defined');
    if ((out.match(/nxFireTap\(/g) || []).length !== 1) {
      throw new Error('[build] tap-streak inspect is inline-shot only — not the sticky image');
    }
    if (out.includes('두손으로 꾸욱')) {
      throw new Error('[build] two-finger press label must not remain');
    }
    if (out.includes('PROGRESS_TOAST_STYLE_SHOW')) {
      throw new Error('[build] toast still uses hardcoded top-center style constants');
    }
    if (!out.includes('showAttachToast().catch') || !out.includes('hideAttachToast({ done: 1 })')) {
      throw new Error('[build] attach toast must show on first attach and hide only when done');
    }
    if (out.includes('Spinner now — Za/ce/rebind are the wait')) {
      throw new Error('[build] Da must not raise the attach toast before the already-painted skip');
    }
    assertOnce(out, 'VC.shouldShowSessionAttachToast({', 'attach toast is once per session');
    assertOnce(out, 'Number(VC.ATTACH_TOAST_MAX_MS)', 'attach toast 10s cap landed');
    {
      const from = out.indexOf('function schedulePointerSelect(');
      const to = out.indexOf('async function runPointerSelect(');
      if (from < 0 || to < 0 || to < from) throw new Error('[build] cannot slice schedulePointerSelect');
      const sched = out.slice(from, to);
      if (!sched.includes('why0 === "boot" || why0 === "session" || why0 === "reply"')) {
        throw new Error('[build] attach toast must rise on boot/session/reply, not every pointer');
      }
      if (sched.includes('runPointerSelect("bind")') && sched.indexOf('showAttachToast') < sched.indexOf('runPointerSelect("bind")') && sched.indexOf('why0 === "boot"') < 0) {
        throw new Error('[build] bind pointer must not raise the attach toast');
      }
    }
    assertOnce(out, 'async function nxWaitNewestDom(', 'session attach waits for the newest bubble');
    assertOnce(out, 't._inlineHeadFirst = 1;', 'session attach paints the newest bubble first');
    {
      const from = out.indexOf('async function refreshSelectedInlineImages(force');
      const to = out.indexOf('async function openSettingsTab(tab) {', from);
      const body = from >= 0 && to > from ? out.slice(from, to) : '';
      if (!body.includes('await injectChatInlineImages(els[idx], cards, idx === selIdx ? nxPendingForInlineSelection(sel) : []')) {
        throw new Error('[build] inline refresh must inject per spinner-window index');
      }
    }
    {
      const from = out.indexOf('async function refreshSelectedInlineImages(force');
      const to = out.indexOf('async function openSettingsTab(tab) {', from);
      const body = from >= 0 && to > from ? out.slice(from, to) : '';
      const failAt = body.lastIndexOf('inline.refresh.fail');
      const failHide = failAt >= 0 ? body.slice(Math.max(0, failAt - 80), failAt).includes('hideAttachToast') : !1;
      if (failHide) throw new Error('[build] attach toast must stay up when the first paint throws');
    }
    {
      const from = out.indexOf('async function showAttachToast()');
      const to = out.indexOf('async function ensureSelectionToastRoot()');
      if (from < 0 || to < 0 || to < from) throw new Error('[build] cannot slice showAttachToast');
      const body = out.slice(from, to);
      if (body.includes('readIndexProgress') || body.includes('formatViewerJob')) {
        throw new Error('[build] attach toast must not hide behind job/index busy');
      }
    }
    assertOnce(out, '/v1/cards/" + e.id + "/nai-prompt', 'card tag nai-prompt fill landed');
    assertOnce(out, 'await addChip("수정", "base"', 'viewer base chip 수정 landed');
    assertOnce(out, 'await addInspectBtn(chipRow, "수정", "base"', 'inspect base chip 수정 landed');
    assertOnce(out, 'async function nxStickyV2ApplyFromHt', 'sticky v2 apply landed');
    assertOnce(out, 'function nxReadyImg(src)', 'nxReadyImg display-url helper landed');
    if (out.includes('typeof fb == "string" && /^data:image')) {
      throw new Error('[build] leftover data:image gate on fb — blob thumbs would stay empty');
    }
    if (out.includes('typeof fresh == "string" && /^data:image')) {
      throw new Error('[build] leftover data:image gate on fresh — blob thumbs would stay empty');
    }
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
    if (!out.includes('ensureScriptDomQuietWatcher') || !out.includes('scriptOutput.domQuiet5') || !out.includes('scriptOutput.snap')) {
      throw new Error('[build] missing streaming 500c/4s DOM snap track');
    }
    if (!out.includes('_scriptDomSnapBy') || !out.includes('key=${key}')) {
      throw new Error('[build] 500c and 4s snaps must be stored separately');
    }
    if (out.includes('shots=0 stripped')) {
      throw new Error('[build] empty desired must not strip permanent inline frames');
    }
    if (out.includes('const wipeFirst = placements.length > 0')) {
      throw new Error('[build] live inject must not wipe existing shots');
    }
    if (!out.includes('await syncFrameMeta(node, shot)') || !out.includes('setMeta("x-inlay-inline-shot", id)')) {
      throw new Error('[build] spinner-to-image fill must retarget the mounted frame');
    }
    if (!out.includes('reconcileInlineShot') || !out.includes('desiredInlinePlacements')) {
      throw new Error('[build] live inject must reconcile desired vs live markers');
    }
    if (!out.includes('id="nx-inline-msg-actions"') || !out.includes('편의성 (오류율 있음 · 2.4.7)') || !out.includes('호환성 (2.4.9)')) {
      throw new Error('[build] inline msg-actions must be a 3-way select');
    }
    if (out.includes('<input type="checkbox" id="nx-inline-msg-actions"')) {
      throw new Error('[build] inline msg-actions must not be a checkbox');
    }
    if (!out.includes('t._galleryCache = null') || !out.includes('await ce(e.sessionId, !0)')) {
      throw new Error('[build] force retag must reload gallery after unlink');
    }
    if (!out.includes('nx-nai-sampler-v5') || !out.includes('nx-nai-sampler-v4') || !out.includes('nx-nai-steps-v5')) {
      throw new Error('[build] NAI4/NAI5 must have separate sampler and steps');
    }
    if (out.includes('["ddim_v3", "DDIM"]')) {
      throw new Error('[build] NAI sampler list must be the recommended six only');
    }
    if (!out.includes('k_dpmpp_2m_sde') || !out.includes('샘플러')) {
      throw new Error('[build] NAI sampler label and DPM++ 2M SDE are missing');
    }
    if (!out.includes('nx-preset-sampler')) {
      throw new Error('[build] style presets must have a sampler field');
    }
    if (out.includes('if (placedHosts.has(hit.elementIndex)) return !1')) {
      throw new Error('[build] retag must place more than one shot on the same host');
    }
    if (!out.includes('pendingBusy') || !out.includes('pendingInlineKey')) {
      throw new Error('[build] missing pending retag guards (no rebind / shot:line pending key)');
    }
    if (out.includes('pendingLeft || a.state === "done"')) {
      throw new Error('[build] poll must not force-refresh on every pending tick');
    }
    if (out.includes('inlineGoneFromSel') || out.includes('inline.keep.skip') || out.includes('stripInlineMarkersIn')) {
      throw new Error('[build] the keep-window driver must stay gone');
    }
    assertOnce(out, 'VC.inlineDomWindow(selIdx, els.length, radius)', 'spinner stamp is selected ± dashboard radius');
    if ((out.match(/VC.shouldOverlayInlinePhoto\(\{/g) || []).length !== 2) {
      throw new Error('[build] photos overlay selected ±1 char only');
    }
    assertOnce(out, 'y("info", "inline.inject.hold",', 'empty-desired hold must keep live shots');
    assertOnce(out, 'VC.inlineRoleDisposition(opts.role,', 'inline role gate must distinguish unresolved from user');
    assertOnce(out, 'if (roleDisposition === "hold" && !haveWork) return;', 'unresolved role must still stamp when cards or pending exist');
    assertOnce(out, 'VC.roleForInlineBubble({', 'inline role must not trust drifted sel.role');
    assertOnce(out, 'cards = VC.cardsForInlineBubble({', 'user bubbles must drop char cards');
    assertOnce(out, 't._inlinePendingMsgIndex = -1;\n        t._inlinePendingSessionId = "";\n        t._inlineNeedStamp = !0;', 'force tag clears photos and flags a one-bubble restamp');
    {
      const from = out.indexOf('async function injectChatInlineImages(msgEl, cards, pendingRows, opts) {');
      const to = out.indexOf('async function refreshSelectedInlineImages(force', from);
      const body = from >= 0 && to > from ? out.slice(from, to) : '';
      if (!body) throw new Error('[build] injectChatInlineImages body not found');
      // Placing a marker must never be conditional on the bytes existing — that
      // is what made a chat hop paint chips only and wait for a retry.
      if (!body.includes('if (skipOk || markersReady)')) {
        throw new Error('[build] matching markers must skip rebuild and fill photos in place');
      }
      if (!body.includes('await host.prepend(wrap)') || !body.includes('await syncFrameMeta(wrap, shot)')) {
        throw new Error('[build] prependShot must restamp identity after mount');
      }
      if (body.indexOf('await host.prepend(wrap)') > body.indexOf('await syncFrameMeta(wrap, shot)')) {
        throw new Error('[build] prependShot must stamp after the wrapper is in the bubble');
      }
      for (const forbidden of ['removeAllMarkers', 'removeNode', 'action.op === "strip"', 'action.op === "swap"', '.remove()']) {
        if (body.includes(forbidden)) throw new Error(`[build] permanent inline frame uses destructive path: ${forbidden}`);
      }
      const placeWatch = body.lastIndexOf('if (wantPhotos && nxInlineOwnerEpochCurrent(ownerClaim))');
      if (placeWatch < 0 || placeWatch < body.indexOf('const tPlace')) {
        throw new Error('[build] the place path must register the subscription after markers exist');
      }
      if (!body.includes('nxWatchInlineShots(lockKey, encodeLater, shotNodes, patchShotSrc, ownerClaim)')) {
        throw new Error('[build] cards without bytes must be filled by subscription, not a bake loop');
      }
      if (body.includes('ensureStickyCardImage')) {
        throw new Error('[build] the inject pass must not await encodes — that was the bake loop');
      }
      if (!body.includes('VC.canSkipInlineInject({')) {
        throw new Error('[build] inject skip must go through canSkipInlineInject');
      }
      if (!body.includes('awaitingCount: wantPhotos ? awaiting')) {
        throw new Error('[build] inject skip must count cells a live subscription owns');
      }
      if (!out.includes('querySelectorAll("[x-inlay-inline-cell]")') || body.includes('spin.setStyleAttribute("display:none")')) {
        throw new Error('[build] ready image must overlay the spinner, not hide or replace it');
      }
      if (!out.includes('x-inlay-inline-layer') || !out.includes('x-inlay-inline-active')) {
        throw new Error('[build] inline photo must use permanent double buffers');
      }
      {
        const safeFrom = out.indexOf('async function nxProbeInlineShots(msgEl, unwrapSafe) {');
        const safeTo = out.indexOf('async function refreshSelectedInlineImages(force', safeFrom);
        const safeBody = safeFrom >= 0 && safeTo > safeFrom ? out.slice(safeFrom, safeTo) : '';
        for (const forbidden of [
          'getAttribute("data-inlay-',
          'getAttribute("src")',
          'setAttribute("data-inlay-',
          'setAttribute("src"',
          'setAttribute("width"',
          'setAttribute("height"'
        ]) {
          if (safeBody.includes(forbidden)) throw new Error(`[build] inline SafeDOM uses forbidden attribute mutation: ${forbidden}`);
        }
        if (!safeBody.includes('setInnerHTML(nxInlinePhotoHtml(src, VC))')) {
          throw new Error('[build] inline SafeDOM must fill hidden cells through setInnerHTML');
        }
      }
      // A bubble repainted without dropping its watcher would keep filling nodes
      // that are no longer mounted, and the watcher would never be released.
      if (!body.includes('nxDropInlineSubs(lockKey)')) {
        throw new Error('[build] a failed inject must release the bubble subscription');
      }
      // Global would put the bubble under the cursor behind its own neighbours.
      if (!body.includes('const injectLockKey = String(opts?.injectLockKey || lockKey)')
        || !body.includes('t._inlineInjectLocks.get(injectLockKey)')) {
        throw new Error('[build] the inject lock must be per bubble');
      }
      if (!body.includes('t._inlineInjectTicket.set(injectLockKey, ticket)')) {
        throw new Error('[build] a newer inject must supersede waiters on the same bubble');
      }
      if (!out.includes('VC.inlineInjectOwnerKey(row?.msg, idx, sel.sessionId)')
        || !out.includes('injectLockKey: ye(injectOwner)')) {
        throw new Error('[build] inject lock identity must survive message hash changes');
      }
      if (!body.includes('liveUniqueCount')) {
        throw new Error('[build] inject skip must refuse duplicate wrappers');
      }
      // The scan and the line matching depend only on the bubble text, which
      // lockKey hashes. Recomputing them per repaint was a round-trip per
      // paragraph on every scroll hop and every post-reply force repaint.
      if (!body.includes('const cached = nxPlaceCacheGet(lockKey, msgEl);')
        || !body.includes('await nxBubbleKeyIntact(msgEl, lockKey)')) {
        throw new Error('[build] an unchanged bubble must reuse its cached paragraph scan');
      }
      if (!body.includes('nxPlaceCacheSet(lockKey, msgEl, { hosts, hostTags, hostTexts, messageLines, rawCount })')) {
        throw new Error('[build] a fresh scan must be cached for the next repaint');
      }
      // Without the stamp the validation query can never match, so the cache
      // would be written and never read — a silent no-op.
      if (!body.includes('VC.markerBlockHtml(shot, t.backendSettings?.card?.inline_chat_scale_pct ?? 100, lockKey, injectLockKey)')) {
        throw new Error('[build] markers must carry the bubble hash the cache validates against');
      }
      // Reading the cache without proving the nodes survived would prepend into
      // handles for a bubble Risu already rebuilt — images placed nowhere.
      if (body.indexOf('await nxBubbleKeyIntact(msgEl, lockKey)') > body.indexOf('cacheHit = !0')) {
        throw new Error('[build] the cached scan must be validated before it is used');
      }
    }
    assertOnce(out, 'async function nxBubbleKeyIntact(msgEl, key) {', 'the one round-trip cache probe landed');
    // The tie between this selector and INLAY_INLINE_KEY_ATTR cannot be checked
    // here — the marker HTML comes from our own bundle, not the vendor output
    // `out` holds. tests/build-layout.test.mjs checks it against the composed file.
    if (!out.includes('/^[A-Za-z0-9_-]+$/.test(k)')) {
      throw new Error('[build] the bubble hash reaches a selector and must be shape-checked');
    }
    assertOnce(out, 't._inlinePlaceCache = null;', 'a chat switch must drop paragraph handles for the old DOM');
    assertOnce(out, 'ids.every((id) => current.allIds.has(id) && current.nodes?.get(id) === shotNodes.get(id))) return;', 'reuse watcher only for the same live frame nodes');
    {
      const from = out.indexOf('async function refreshSelectedInlineImages(force');
      const to = out.indexOf('async function openSettingsTab(tab) {', from);
      const body = from >= 0 && to > from ? out.slice(from, to) : '';
      if ((body.match(/if \(stale\(\)\) return;/g) || []).length < 2) {
        throw new Error('[build] a superseded pass must stop between spinner-window bubbles');
      }
      if (!body.includes('hideAttachToast({ done: 1 })')) {
        throw new Error('[build] a finished pass must hide the attach toast');
      }
    }
    if (out.includes('t._scrollPhaseBus.pendingSettle') && out.includes('inline.paint.defer')) {
      throw new Error('[build] neighbours must not be deferred to a settle pass that never runs');
    }
    {
      // One scan, two consumers. Two separate walks were ~4 IPC round-trips per
      // paragraph each, on the same element list, moments apart.
      const scans = (out.match(/querySelectorAll\(hostSel\)/g) || []).length;
      if (scans !== 1) {
        throw new Error(`[build] the bubble host scan must exist once, found ${scans}`);
      }
      // Only legacy mounts on DIVs. Everywhere else they are dropped by
      // isMessageBodyHostTag a few lines later, after paying four round-trips
      // each — and a bubble holds far more DIV chrome than paragraphs.
      if (!out.includes('const legacy = mode === "legacy";')
        || !out.includes('? "p,h1,h2,h3,h4,h5,h6,li,blockquote,div"\n      : "p,h1,h2,h3,h4,h5,h6,li,blockquote";')) {
        throw new Error('[build] the host scan must only ask for DIVs in legacy mode');
      }
      if (!out.includes('if (legacy && name === "DIV") {')) {
        throw new Error('[build] the nested-host probe must be legacy-only');
      }
      const from = out.indexOf('async function injectChatMsgActions(msgEl, cards, msgIndex) {');
      const early = out.indexOf('const earlyBars = await readBars();', from);
      const scan = out.indexOf('const scan = await nxScanBubbleHosts(msgEl);', from);
      if (from < 0 || early < 0 || scan < 0 || early > scan) {
        throw new Error('[build] chip bar early-exit must run before the shared host scan');
      }
      // A slot shift under an unchanged bubble is one attribute write. Tearing
      // the bars down instead is a visible flash on every new message.
      if (!out.includes('setAttribute("x-inlay-msg-index", String(msgIdx))')) {
        throw new Error('[build] a shifted chip bar must be reindexed in place');
      }
    }
    if (!out.includes('evictPhotosIn') || !out.includes('refreshSelectedInlineImages(!0)')) {
      throw new Error('[build] missing photo evict / inline refresh');
    }
    if (!out.includes('async function nxRemoveInlineFramesByKey(') || !out.includes('t._inlineNeedStamp = !0')) {
      throw new Error('[build] tag button must remove frames and flag a one-bubble restamp');
    }
    if (out.includes('refreshSelectedInlineImages(!!(c || a.state === "done" || pendingChanged))')) {
      throw new Error('[build] shot_done must not rebuild the message');
    }
    if (!out.includes('await refreshSelectedInlineImages(!0, { onlySel: !0 })')) {
      throw new Error('[build] first pending after tag must restamp the selected bubble only');
    }
    if (!out.includes('prependBar') || out.includes('insertAdjacentHTML("afterbegin", barHtml)')) {
      throw new Error('[build] msg-action chips must H+prepend onto hosts like inline shots');
    }
    if (out.includes('await msgEl.prepend(wrap)')) {
      throw new Error('[build] msg-action chips must not prepend onto the bubble root');
    }
    if (!out.includes('isInlayPaintHost') || !out.includes('canMountMsgActionOnParent') || !out.includes('msgActionMountKind') || !out.includes('isMessageBodyHostTag')) {
      throw new Error('[build] msg-action chips must stay on body hosts and skip card chrome');
    }
    if (!out.includes('nxPatchInlinePhotoByCardId') || !out.includes('shouldOverlayInlinePhoto')) {
      throw new Error('[build] missing card-id photo patch / ±1 char overlay');
    }
    if (out.includes('[data-inlay-inline-shot=""')) {
      throw new Error('[build] card-id selector quotes were eaten by the enclosing template');
    }
    if (out.includes('refreshSelectedInlineImages(source === "scroll")')) {
      throw new Error('[build] scroll inline must not force-refresh (cheap keep skip)');
    }
    if (out.includes('n.top + n.height * 0.5 - o * 0.45')) {
      throw new Error('[build] click select must not yank the bubble to 45%');
    }
    if (out.includes('(source === "click" || source === "text") && await ensureMessageInView(o)')) {
      throw new Error('[build] click select must not call ensureMessageInView');
    }
    if ((out.match(/source === "provisional" && opts\.auto/g) || []).length !== 2) {
      throw new Error('[build] both inline paint gates must open for auto provisional select');
    }
    if (!out.includes('else if (source === "click" || source === "text" || source === "scroll")')) {
      throw new Error('[build] click must not share the first-stamp refresh gate');
    }
    if (!out.includes('await nxSyncInlinePhotosOnly()') || !out.includes('async function nxSyncInlinePhotosOnly()')) {
      throw new Error('[build] an intact new selection must only toggle photos');
    }
    if (!out.includes('source === "click" && t.selectedMessage && Number(t.selectedMessage.domIndex) === Number(e)')
      || !out.includes('await nxBubbleHasInlineFrame(o, linkedCards(t.selectedMessage), nxPendingForInlineSelection(t.selectedMessage))) return !0;')) {
      throw new Error('[build] an intact same-message click must return before selection work');
    }
    if (!out.includes('x-inlay-inline-slot') || !out.includes('VC.inlinePlacementSlotKey(shot)')) {
      throw new Error('[build] reroll must reuse a stable shot-slot frame');
    }
    if (!out.includes('await nxPredecodeInlineSrc(src)') || !out.includes('x-inlay-inline-layer') || !out.includes('x-inlay-inline-active')) {
      throw new Error('[build] photo replacement must decode into a hidden permanent buffer');
    }
    if (!out.includes('await Da(pick, els, { source: "provisional", auto: 1 })')) {
      throw new Error('[build] runPointerSelect must mark its provisional select as auto');
    }
    if (out.includes('await Da(pick, els, { source: "provisional" })')) {
      throw new Error('[build] runPointerSelect must not select without the auto flag');
    }
    if (!out.includes('function nxScopeCheckSoon()') || !out.includes('now - t._scopeCheckAt < 700')) {
      throw new Error('[build] missing throttled scope recheck for session switches');
    }
    if ((out.match(/nxScopeCheckSoon\(\);/g) || []).length !== 3) {
      throw new Error('[build] scope recheck must ride the existing pointermove/capture/scroll handlers');
    }
    // The wait is the sequence, not a retry driver: await the newest bubble once
    // and paint. There is no second attempt because the paint cannot half-fail.
    if (!out.includes('nxWaitNewestDom(doc, 2000)')) {
      throw new Error('[build] session pointer select must await the newest bubble');
    }
    if (out.includes('schedulePointerSelect("session", 7e2)') || out.includes('schedulePointerSelect("boot", 200)')) {
      throw new Error('[build] pointer select must not reschedule itself');
    }
    if (!out.includes('_paintStatusKey') || !out.includes('_seFp') || !out.includes('_deTextCache')) {
      throw new Error('[build] missing same-feel skip caches (status/Se/De)');
    }
    if (!out.includes('await refreshGalleryAfterTagSave(cardId, keepPara, keepShot, Gt), await nxPatchInlinePhotoByCardId(')) {
      throw new Error('[build] tag save-reroll must patch the overlay photo after gallery');
    }
    if (out.includes('rerollMessageImagesLive(A, { report })')) {
      throw new Error('[build] chip regen must refresh inline images per shot');
    }
    if (!out.includes('rerollMessageImagesLive(A, { report, onShot: onChipShot })') || !out.includes('y("info", "regen.all", "msg-actions")')) {
      throw new Error('[build] chip regen must pass onChipShot into live reroll');
    }
    // The window is only safe because the request names the hashes it needs and
    // the cache merges. Losing either turns a narrow window into "old shots
    // stop attaching" — the bug that forced limit=2000 in the first place.
    if (!out.includes('&limit=${NX_GALLERY_WINDOW}${hashQ}')) {
      throw new Error('[build] session gallery ce() must request the window plus its hashes');
    }
    if (!out.includes('const NX_GALLERY_WINDOW = 120;')) {
      throw new Error('[build] NX_GALLERY_WINDOW missing — ce() would request an undefined limit');
    }
    if (!out.includes('VCm.mergeSessionGallery({')) {
      throw new Error('[build] ce() must merge the window into t.gallery, not replace it');
    }
    if (out.includes('t.gallery = nextItems;')) {
      throw new Error('[build] ce() still replaces t.gallery — cards outside the window would be dropped');
    }
    if (!out.includes('List only — viewer / inline / overlay warm the shots they actually paint.')) {
      throw new Error('[build] ce() must skip the speculative 8-image warm');
    }
    if (out.includes('VC.galleryForMessage(t.gallery, focus, 8)')) {
      throw new Error('[build] ce() still warms the viewer strip — that raced inline and ran with the viewer off');
    }
    if (!out.includes('async function nxEnsureCardsForHash(hash)')) {
      throw new Error('[build] hash-miss fetch missing — a shot below the window edge could never attach');
    }
    if (out.includes('&limit=2000')) {
      throw new Error('[build] session gallery ce() must not ask for the session ceiling');
    }
    if (out.includes('&limit=120')) {
      throw new Error('[build] session gallery ce() must not hardcode a bare limit=120');
    }
    if (out.includes('afterRequest.skip", "execute=manual"') || out.includes('afterReply.skip", "execute=manual"')) {
      throw new Error('[build] after-reply/stream-keyword must not skip on execute=manual');
    }
    if (!out.includes('_afterGenAllowManual') || !out.includes('execute === "manual" && !t._afterGenAllowManual')) {
      throw new Error('[build] Ka must allow reply/stream-keyword gen when execute=manual');
    }
    if (!out.includes('nx-stream-keywords-on') || !out.includes('stream_keywords_enabled')) {
      throw new Error('[build] missing stream-keyword toggle');
    }
    if (!out.includes('gallery.refresh') || !out.includes('if (!t.galleryUi?.root || !t.overlayUi?.root) await it();')) {
      throw new Error('[build] job done must skip it() when viewer roots exist');
    }
    if (!out.includes('await injectInline(!0)') || !out.includes('Risu remounts the streaming bubble')) {
      throw new Error('[build] missing forced inline re-attach after hash relink (incl. mid-stream)');
    }
    if (!out.includes('isSkipBodyAt') || !out.includes('isInlineSkipBody')) {
      throw new Error('[build] inline keep must skip LBDATA-short bodies');
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
    if (!out.includes('still streaming')) {
      throw new Error('[build] missing isStreaming wait on afterRequest path');
    }
    if (!out.includes('afterReply.schedule') || !out.includes('delay=${AFTER_GEN_DELAY_MS}ms')) {
      throw new Error('[build] missing single 0.5s afterRequest auto-gen delay');
    }
    if (out.includes('afterReply.poll') || out.includes('POLL_MAX')) {
      throw new Error('[build] 0.3s×3 poll must stay removed');
    }
    if (!out.includes('messageBodyCharCount') || !out.includes('body too short after lbdata strip')) {
      throw new Error('[build] missing LBDATA-stripped body char gate');
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
    // llm_roles return is already patched; family collect must land on that shape.
    assertOnce(out, VENDOR_NAI_OE_KEYS_NEEDLE, 'Oe() nai extra keys (after llm_roles return)');
    out = out
      .replace(VENDOR_NAI_MODEL_KEY_NEEDLE, VENDOR_NAI_MODEL_KEY_PATCH)
      .replace(VENDOR_NAI_OE_KEYS_NEEDLE, VENDOR_NAI_OE_KEYS_PATCH)
      .replace(VENDOR_NAI_TEST_NEEDLE, VENDOR_NAI_TEST_PATCH)
      .replace(VENDOR_NAI_SAMPLER_NEEDLE, VENDOR_NAI_SAMPLER_PATCH)
      .replace(VENDOR_PRESET_SECOND_NEEDLE, VENDOR_PRESET_SECOND_PATCH)
      .replace(VENDOR_PRESET_SECOND_EVT_NEEDLE, VENDOR_PRESET_SECOND_EVT_PATCH)
      .replace(VENDOR_PRESET_CHIP_NEEDLE, VENDOR_PRESET_CHIP_PATCH)
      .replace(VENDOR_PRESET_CHIP_CSS_NEEDLE, VENDOR_PRESET_CHIP_CSS_PATCH)
      .replace(VENDOR_PRESET_HELP_MUTED_NEEDLE, VENDOR_PRESET_HELP_MUTED_PATCH)
      ;
    if (!out.includes('N("nx-nai-steps-v5")') || !out.includes('N("nx-nai-steps-v4")')) {
      throw new Error('[build] Oe() must collect per-family NAI steps');
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
