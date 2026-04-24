/**
 * Kid CEO agent pricing — Phase 3 decision A2.
 *
 * Every agent workflow run costs in-sim ₹. The cost is per-tool-step,
 * summed, then multiplied by a run-escalation factor so re-rolls get
 * more expensive (kid learns that LLM calls aren't free).
 *
 * The pricing table here is the SINGLE SOURCE OF TRUTH for both display
 * (the WorkflowTrace X-ray shows `costInr` per step) and cash deduction
 * (api/ceo/agents/run debits `business.currentCash`). Tool adapters
 * import `TOOL_COST_INR` rather than hardcoding numbers.
 */

export type CeoAgentTool =
  | 'claude_haiku'
  | 'claude_sonnet'
  | 'groq_llama'
  | 'flux_schnell'
  | 'pollinations'
  | 'transformers_js'
  | 'brave_search'
  | 'deterministic';

/**
 * Cost per single tool invocation in in-sim ₹. Calibrated to roughly
 * track real USD → INR provider cost at 100× markup (so a real $0.003
 * Flux call = ~₹30 market / ₹8 sim, comfortably tunable).
 *
 * `deterministic` covers pure-TS tools like `breakEven` — explicitly
 * ₹0 to teach "AI isn't always an LLM; sometimes it's a calculator".
 * `transformers_js` also ₹0 because it runs on the kid's device.
 */
export const TOOL_COST_INR: Record<CeoAgentTool, number> = {
  claude_haiku: 5,
  claude_sonnet: 8,
  groq_llama: 2,
  flux_schnell: 8, // per image
  pollinations: 3, // per image, cheaper fallback
  transformers_js: 0,
  brave_search: 3,
  deterministic: 0,
};

/** Bounded escalation per re-roll in the same "attempt session". Curve
 *  locked by decision A2 in `stories/phase-3/KIDCEO-PHASE-3-DECISIONS.md`. */
export const RUN_MULTIPLIER_SEQUENCE = [1.0, 1.5, 2.0, 2.5] as const;

/** Escalation cap — any run beyond the sequence length uses the final
 *  value (decision A2: cap at 2.5×). */
export const RUN_MULTIPLIER_CAP = RUN_MULTIPLIER_SEQUENCE[RUN_MULTIPLIER_SEQUENCE.length - 1];

/**
 * Multiplier for a 1-indexed run number.
 * - Run 1 → 1.0× (first attempt)
 * - Run 2 → 1.5× (first re-roll)
 * - Run 3 → 2.0×
 * - Run 4+ → 2.5× (cap)
 *
 * @throws if `runIndex` is not a positive integer.
 */
export function runMultiplier(runIndex: number): number {
  if (!Number.isInteger(runIndex) || runIndex < 1) {
    throw new Error(`runMultiplier: runIndex must be a positive integer (got ${runIndex})`);
  }
  const idx = Math.min(runIndex, RUN_MULTIPLIER_SEQUENCE.length) - 1;
  return RUN_MULTIPLIER_SEQUENCE[idx]!;
}

/** One declared step inside a WorkflowSpec. Executor resolves `tool` via
 *  the tool registry; `unitCount` scales cost for multi-image steps
 *  (e.g. BRAND logo_candidates calls Flux 3 times → unitCount = 3). */
export interface WorkflowStepCostInput {
  tool: CeoAgentTool;
  /** How many tool calls this step performs. Defaults to 1. */
  unitCount?: number;
}

/** Sum the step costs in a workflow at multiplier 1.0. Pure — does NOT
 *  apply run escalation; caller layers that on. */
export function baseWorkflowCostInr(steps: ReadonlyArray<WorkflowStepCostInput>): number {
  let total = 0;
  for (const step of steps) {
    const units = step.unitCount ?? 1;
    if (!Number.isInteger(units) || units < 0) {
      throw new Error(
        `baseWorkflowCostInr: unitCount must be a non-negative integer (got ${units})`,
      );
    }
    total += TOOL_COST_INR[step.tool] * units;
  }
  return total;
}

/**
 * Total cost for a single run of a workflow — base × run multiplier,
 * rounded to the nearest rupee (no fractional paise in the sim).
 *
 * Kids see this number in the WorkflowTrace panel *before* a re-roll
 * fires, so they can decide if the iteration is worth it.
 */
export function workflowRunCostInr(
  steps: ReadonlyArray<WorkflowStepCostInput>,
  runIndex: number,
): number {
  const base = baseWorkflowCostInr(steps);
  const multiplier = runMultiplier(runIndex);
  return Math.round(base * multiplier);
}

/** Cost of a single step at multiplier 1 — used by tool adapters to
 *  populate `CeoWorkflowStepTrace.costInr`. */
export function stepCostInr(tool: CeoAgentTool, unitCount: number = 1): number {
  if (!Number.isInteger(unitCount) || unitCount < 0) {
    throw new Error(`stepCostInr: unitCount must be a non-negative integer (got ${unitCount})`);
  }
  return TOOL_COST_INR[tool] * unitCount;
}
