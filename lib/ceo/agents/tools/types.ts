/**
 * Uniform tool-adapter contract for the Kid CEO agent executor.
 *
 * Every tool (Claude, Groq, Flux, Brave, Transformers.js, breakEven, …)
 * implements the same shape so the executor can treat them as a
 * homogeneous pipeline. Adapters are thin wrappers — the heavy lifting
 * lives in `lib/ai/*Client.ts` and friends.
 */

import type { CeoAgentTool } from '@/lib/ceo/agents/pricing';

export interface ToolRunResult<TOutput = unknown> {
  /** Structured output the step contributes to the workflow. */
  output: TOutput;
  /** Short kid-readable summary (≤120 chars) for the WorkflowTrace card. */
  outputSummary: string;
  /** Model identifier as reported by the provider. Empty for deterministic
   *  tools. */
  model: string;
  /** Tokens billed by the provider for this call. 0 for non-LLM tools. */
  promptTokens: number;
  completionTokens: number;
}

export interface ToolRunContext {
  /** The executor increments this for each retry attempt within a step;
   *  adapters may use it to tweak backoff / temperature. */
  attempt: number;
}

export interface ToolAdapter<TInput, TOutput> {
  /** Stable identifier. Matches the keys of `TOOL_COST_INR` in
   *  `lib/ceo/agents/pricing.ts`. */
  readonly id: CeoAgentTool;
  /** How many tool-call units this run represents (e.g. Flux × 3 images
   *  returns unitCount = 3 so the trace cost matches). Defaults to 1 in
   *  the executor when omitted. */
  readonly unitCount?: number;
  /** Short kid-readable label shown in the trace ("Flux Schnell",
   *  "Claude Haiku", "Break-even calculator"). */
  readonly label: string;

  run(input: TInput, ctx: ToolRunContext): Promise<ToolRunResult<TOutput>>;
}
