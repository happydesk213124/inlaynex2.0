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
import { encodePromptPack } from './src/config/prompt-codec';

const configRoot = dirname(fileURLToPath(import.meta.url));

const OUT_FILE = 'inlaynexus2.0.js';
const VENDOR_UI = resolve(configRoot, 'vendor/inlay-nexus-ui.js');
const PROMPTS_DIR = resolve(configRoot, 'prompts');

/**
 * Risu resolves plugin storage by `//@name`, so this id is frozen at the 1.x value.
 * Renaming it would orphan every existing user's settings, gallery and roster.
 */
const PLUGIN_ID = 'inlay-nexus-native';
const PLUGIN_VERSION = '2.0.9';

/** The version string the frozen UI bundle hardcodes for its footer. */
const VENDOR_VERSION_NEEDLE = 'He = "1.3.0"';

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

  // Sole cosmetic patch: the footer version label.
  assertOnce(raw, VENDOR_VERSION_NEEDLE, VENDOR_VERSION_NEEDLE);
  return raw.replace(VENDOR_VERSION_NEEDLE, `He = "${PLUGIN_VERSION}"`);
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
