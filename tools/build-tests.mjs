/**
 * Compiles the pure-logic modules to ESM so `tests/*.test.mjs` can import them.
 *
 * The unit tests are plain `.mjs` run by `node --test`, and the source is
 * TypeScript with extensionless imports that Node cannot resolve on its own.
 * Rather than teach Node to load TS, each module gets bundled to a
 * self-contained ESM file under `.test-build/`.
 *
 * The names on the left are the 1.x module names the tests were written
 * against, so the ported tests read the same as the originals even though the
 * code moved.
 */

import { build } from 'esbuild';
import { rm, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outdir = path.join(root, '.test-build');

/** 1.x module name → where that logic lives in 2.0. */
const MODULES = {
  'viewer-core': 'src/ui-contract/viewer-core.ts',
  'explorer-selection': 'src/ui-contract/explorer-selection.ts',
  'gallery-zip': 'src/ui-contract/gallery-zip.ts',
  'roster-merge': 'src/domain/character/roster.ts',
  'character-identity': 'src/domain/character/identity.ts',
  'lore-extra': 'src/domain/lore/extra.ts',
  'lore-assemble': 'src/domain/lore/assemble.ts',
  'lore-lorefilter': 'src/domain/lore/lorefilter.ts',
  'llm-providers': 'src/providers/llm/providers.ts',
  'llm-roles': 'src/domain/llm/roles.ts',
  'settings-schema': 'src/config/schema.ts',
  'reroll-setup': 'src/domain/prompt/reroll-setup.ts',
  'command-rewrite': 'src/domain/prompt/command-rewrite.ts',
  'nai-to-comfy': 'src/domain/prompt/nai-to-comfy.ts',
  'comfy-client': 'src/providers/comfy/client.ts',
  'stream-keywords': 'src/domain/prompt/stream-keywords.ts',
  'character-tags': 'src/domain/character/tags.ts',
  'character-focus': 'src/domain/character/focus.ts',
  'character-costume': 'src/domain/character/costume.ts',
  'nai-meta-prompt-tags': 'src/domain/nai-meta/prompt-tags.ts',
  'nai-meta-match': 'src/domain/nai-meta/match.ts',
  'nai-meta-from-metadata': 'src/domain/nai-meta/from-metadata.ts',
  'nai-meta-aspect': 'src/domain/nai-meta/aspect.ts',
  'nai-meta-style-preset': 'src/domain/nai-meta/style-preset.ts',
  'nai-meta-stealth': 'src/domain/nai-meta/stealth.ts',
  'nai-meta-png-rgba': 'src/domain/nai-meta/png-rgba.ts',
  'nai-meta-risu-asset-list': 'src/domain/nai-meta/risu-asset-list.ts',
  'text-util': 'src/core/util/text.ts',
  'blob-url-cache': 'src/storage/blob-url-cache.ts',
  'prompt-codec': 'src/config/prompt-codec.ts',
  'style-preset-overrides': 'src/domain/style-preset-overrides.ts',
  'style-preset-io': 'src/domain/style-presets/io.ts',
  'composition-leaves': 'src/domain/composition/leaves.ts',
  'curation-catalog': 'src/domain/curation/catalog.ts',
  'curation-presets': 'src/domain/curation/presets.ts',
  'curation-match': 'src/domain/curation/match.ts',
  'curation-focus': 'src/domain/curation/focus.ts',
  'embedding-client': 'src/providers/embedding/client.ts',
  'shot-line': 'src/domain/tagging/shot-line.ts',
};

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });

await Promise.all(
  Object.entries(MODULES).map(([name, entry]) =>
    build({
      absWorkingDir: root,
      entryPoints: [entry],
      outfile: path.join(outdir, `${name}.mjs`),
      bundle: true,
      format: 'esm',
      platform: 'neutral',
      target: 'es2022',
      // Keep names so assertions on `fn.name` and error messages stay readable.
      keepNames: true,
      logLevel: 'warning',
    }),
  ),
);

console.log(`[build-tests] ${Object.keys(MODULES).length} modules -> .test-build/`);
