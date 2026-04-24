/**
 * Break-even calculator — pure TypeScript, NOT an LLM.
 *
 * Picked as the "AI isn't always an LLM" teaching moment per
 * KIDCEO-AGENT-003-OPS-FINANCE story. The Finance Agent composes this
 * adapter into its pricing workflow alongside Claude calls; the kid
 * sees it in the WorkflowTrace panel next to the LLM steps, same UI
 * treatment, ₹0 cost — reinforcing that agents chain different
 * kinds of tools.
 */

import type { ToolAdapter, ToolRunResult } from './types';

export interface BreakEvenInput {
  /** Price per unit in ₹. */
  price: number;
  /** Starting capital in ₹ — used to check how many days until you'd
   *  burn through it if you never hit break-even. */
  startingCapital: number;
  /** Variable cost per unit sold (ingredients, packaging, …). */
  variableCostPerUnit: number;
  /** Fixed daily costs (rent share, salaries, etc.). */
  fixedCostPerDay: number;
  /** Expected units sold per day (best-guess, shown in the trace). */
  expectedUnitsPerDay?: number;
}

export interface BreakEvenOutput {
  /** Units you need to sell to cover today's fixed costs. */
  breakEvenUnits: number;
  /** Rupees of contribution margin per unit (price − variable cost). */
  contributionMargin: number;
  /** Days before the starting capital is exhausted IF the business
   *  never sells a single unit. Integer floor for kid-readability. */
  daysToCapitalBurnout: number;
  /** Whether `expectedUnitsPerDay` clears break-even. */
  coversBreakEven: boolean;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function computeBreakEven(input: BreakEvenInput): BreakEvenOutput {
  const { price, variableCostPerUnit, fixedCostPerDay, startingCapital, expectedUnitsPerDay } =
    input;

  if (!Number.isFinite(price) || price < 0) {
    throw new Error(`computeBreakEven: price must be a non-negative number (got ${price})`);
  }
  if (!Number.isFinite(variableCostPerUnit) || variableCostPerUnit < 0) {
    throw new Error(
      `computeBreakEven: variableCostPerUnit must be non-negative (got ${variableCostPerUnit})`,
    );
  }
  if (!Number.isFinite(fixedCostPerDay) || fixedCostPerDay < 0) {
    throw new Error(
      `computeBreakEven: fixedCostPerDay must be non-negative (got ${fixedCostPerDay})`,
    );
  }
  if (!Number.isFinite(startingCapital) || startingCapital < 0) {
    throw new Error(
      `computeBreakEven: startingCapital must be non-negative (got ${startingCapital})`,
    );
  }

  const contributionMargin = price - variableCostPerUnit;

  // When the unit economics are upside-down we can't break even at any
  // volume — signal with a sentinel instead of Infinity/NaN to keep the
  // UI safe. Kid-readable: "you'd need more than 9999 units/day".
  const UNREACHABLE = 9999;

  const breakEvenUnits =
    contributionMargin <= 0
      ? UNREACHABLE
      : Math.ceil(fixedCostPerDay / contributionMargin);

  const daysToCapitalBurnout =
    fixedCostPerDay <= 0
      ? UNREACHABLE
      : Math.max(0, Math.floor(startingCapital / fixedCostPerDay));

  const coversBreakEven =
    typeof expectedUnitsPerDay === 'number' &&
    expectedUnitsPerDay >= breakEvenUnits &&
    breakEvenUnits < UNREACHABLE;

  return {
    breakEvenUnits: clamp(breakEvenUnits, 0, UNREACHABLE),
    contributionMargin: Math.round(contributionMargin * 100) / 100,
    daysToCapitalBurnout: clamp(daysToCapitalBurnout, 0, UNREACHABLE),
    coversBreakEven,
  };
}

export const breakEvenTool: ToolAdapter<BreakEvenInput, BreakEvenOutput> = {
  id: 'deterministic',
  label: 'Break-even calculator',
  async run(input): Promise<ToolRunResult<BreakEvenOutput>> {
    const output = computeBreakEven(input);
    const summary = output.coversBreakEven
      ? `Break-even at ${output.breakEvenUnits} units/day — covered by forecast.`
      : `Break-even at ${output.breakEvenUnits} units/day — not yet covered.`;
    return {
      output,
      outputSummary: summary,
      model: '',
      promptTokens: 0,
      completionTokens: 0,
    };
  },
};

/**
 * Generic pass-through adapter for workflow steps that compute their
 * result entirely inside `prepareInput` and just need a ₹0-cost trace
 * row. The adapter simply echoes the input as output + summarises it
 * for the X-ray panel. Registered under `deterministic` alongside
 * `breakEvenTool` — the executor picks one based on workflow wiring.
 */
export const deterministicPassthroughTool: ToolAdapter<unknown, unknown> = {
  id: 'deterministic',
  label: 'Deterministic math',
  async run(input): Promise<ToolRunResult<unknown>> {
    let summary: string;
    try {
      const s = JSON.stringify(input);
      summary = s.length > 120 ? `${s.slice(0, 117)}…` : s;
    } catch {
      summary = '[deterministic result]';
    }
    return {
      output: input,
      outputSummary: summary,
      model: '',
      promptTokens: 0,
      completionTokens: 0,
    };
  },
};
