/**
 * Default tool registry — the set of real adapters the production
 * executor uses. Tests construct their own stubbed registries (see
 * `executor.spec.ts`) so this file is the only "wiring" point.
 *
 * Adapters that aren't yet built (transformers_js, brave_search,
 * pollinations) are bound to placeholder adapters that throw with a
 * clear message. They'll be swapped in by the stories that need them.
 */

import type { ToolAdapter } from './tools/types';
import type { ToolRegistry } from './executor';
import { claudeHaikuTool, claudeSonnetTool } from './tools/claude';
import { groqLlamaTool } from './tools/groq';
import { fluxSchnellTool } from './tools/fluxSchnell';
import { breakEvenTool } from './tools/breakEven';

function notYetWired<I, O>(id: ToolAdapter<I, O>['id'], label: string): ToolAdapter<I, O> {
  return {
    id,
    label,
    async run() {
      throw new Error(
        `Tool adapter '${id}' is not yet wired up. Add the adapter + register it in lib/ceo/agents/toolRegistry.ts.`,
      );
    },
  };
}

export const DEFAULT_TOOL_REGISTRY: ToolRegistry = {
  claude_haiku: claudeHaikuTool as unknown as ToolAdapter<unknown, unknown>,
  claude_sonnet: claudeSonnetTool as unknown as ToolAdapter<unknown, unknown>,
  groq_llama: groqLlamaTool as unknown as ToolAdapter<unknown, unknown>,
  flux_schnell: fluxSchnellTool as unknown as ToolAdapter<unknown, unknown>,
  pollinations: notYetWired('pollinations', 'Pollinations (fallback)'),
  transformers_js: notYetWired('transformers_js', 'Transformers.js (in-browser)'),
  brave_search: notYetWired('brave_search', 'Brave Search'),
  deterministic: breakEvenTool as unknown as ToolAdapter<unknown, unknown>,
};
