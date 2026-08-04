/**
 * The UI-contract globals.
 *
 * The frozen UI bundle reads four namespace objects off `globalThis` and probes
 * them method-by-method (`typeof VC?.rawMessageRole === 'function'`), so a name
 * that goes missing degrades silently instead of throwing — which is why
 * `tools/audit.mjs` diffs these against the 1.x bundle's own exports on every
 * build.
 *
 * Each namespace is spread from its module, so the module's export list *is* the
 * contract. Do not hand-maintain a list of names here.
 *
 * 1.x published ten such globals; six of those existed only so its separately
 * concatenated source files could find each other at runtime. Those are real
 * imports now, so only the four the UI actually reads remain.
 */

import * as explorerSelection from '../ui-contract/explorer-selection';
import * as loreExtra from '../domain/lore/extra';
import * as llmProviders from '../providers/llm/providers';
import * as viewerCore from '../ui-contract/viewer-core';

export function installUiContractGlobals(): void {
  Reflect.set(globalThis, '__INLAY_VIEWER_CORE__', { ...viewerCore });
  Reflect.set(globalThis, '__INLAY_LLM__', { ...llmProviders });
  Reflect.set(globalThis, '__INLAY_LORE_EXTRA__', { ...loreExtra });
  Reflect.set(globalThis, '__INLAY_EXPLORER__', { ...explorerSelection });
}
