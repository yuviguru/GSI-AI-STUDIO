/**
 * `finance.pricingPackage` — Finance Agent workflow for the PRICING
 * milestone. Produces 3 pricing-strategy candidates, each with a
 * price, rationale, projected customers/day, AND a deterministic
 * break-even number calculated by the `breakEvenTool` adapter.
 *
 * Demonstrates the "AI isn't always an LLM" teaching moment — one of
 * the workflow steps is pure TypeScript math, visible as its own row
 * in the WorkflowTrace X-ray.
 */

import type { CeoBusiness } from '@gsi/types';
import { filterInput, filterOutput } from '@gsi/safety';
import { registerWorkflow, type AnyWorkflowSpec } from './registry';
import type { WorkflowSpec, WorkflowStep } from '../executor';
import type { ClaudeToolInput, ClaudeToolOutput } from '../tools/claude';
import type { BreakEvenInput, BreakEvenOutput } from '../tools/breakEven';

export const PRICING_STRATEGIES = ['volume', 'premium', 'mixed'] as const;
export type PricingStrategy = (typeof PRICING_STRATEGIES)[number];

export const TARGET_MARGINS = ['tight', 'fair', 'fat'] as const;
export type TargetMargin = (typeof TARGET_MARGINS)[number];

const NOTES_MAX = 40;

export interface FinancePricingBrief {
  strategy: PricingStrategy;
  targetMargin: TargetMargin;
  notes: string;
}

function validateBrief(brief: unknown): asserts brief is FinancePricingBrief {
  if (!brief || typeof brief !== 'object') {
    throw new Error('finance.pricingPackage: brief must be an object');
  }
  const b = brief as Record<string, unknown>;
  if (!PRICING_STRATEGIES.includes(b.strategy as PricingStrategy)) {
    throw new Error(
      `finance.pricingPackage: strategy must be one of ${PRICING_STRATEGIES.join(', ')}`,
    );
  }
  if (!TARGET_MARGINS.includes(b.targetMargin as TargetMargin)) {
    throw new Error(
      `finance.pricingPackage: targetMargin must be one of ${TARGET_MARGINS.join(', ')}`,
    );
  }
  if (typeof b.notes !== 'string') {
    throw new Error('finance.pricingPackage: notes is required (can be empty)');
  }
  if (b.notes.length > NOTES_MAX) {
    throw new Error(`finance.pricingPackage: notes must be ≤ ${NOTES_MAX} characters`);
  }
  if (b.notes.trim().length > 0) filterInput(b.notes);
}

interface PricingCandidatesLlmOutput {
  candidates: Array<{
    price: number;
    rationale: string;
    projectedUnitsPerDay: number;
    variableCostPerUnit: number;
    fixedCostPerDay: number;
  }>;
}

const pricingCandidatesStep: WorkflowStep<ClaudeToolInput, ClaudeToolOutput> = {
  id: 'pricing_candidates',
  tool: 'claude_haiku',
  required: true,
  prepareInput: (ctx) => {
    const business = ctx.business as CeoBusiness;
    const brief = ctx.brief as FinancePricingBrief;
    const systemPrompt =
      `You are a finance coach for a kid running "${business.businessName}" ` +
      `(${business.businessType}) in ${business.location}. Current cash: ` +
      `₹${business.currentCash}. Starting capital: ₹${business.startingCapital}.\n` +
      `Strategy: ${brief.strategy}. Target margin: ${brief.targetMargin}.\n\n` +
      `Return JSON (no markdown) with 3 pricing candidates:\n` +
      `{\n` +
      `  "candidates": [\n` +
      `    {\n` +
      `      "price": number,               // in rupees, whole number, realistic for Indian context\n` +
      `      "rationale": string,           // 1-2 sentences why this price\n` +
      `      "projectedUnitsPerDay": number, // best-guess, integer\n` +
      `      "variableCostPerUnit": number,  // whole rupees\n` +
      `      "fixedCostPerDay": number       // whole rupees\n` +
      `    }, ...3 total\n` +
      `  ]\n` +
      `}`;
    const userMessage = brief.notes ? `Kid's notes: "${brief.notes}"` : 'No extra notes.';
    return { systemPrompt, userMessage, json: true, maxTokens: 800, temperature: 0.7 };
  },
};

interface BreakEvenStepOutput {
  candidates: Array<{
    price: number;
    rationale: string;
    projectedUnitsPerDay: number;
    variableCostPerUnit: number;
    fixedCostPerDay: number;
    breakEven: BreakEvenOutput;
  }>;
}

const breakEvenStep: WorkflowStep<
  { priorCandidates: PricingCandidatesLlmOutput['candidates']; startingCapital: number },
  BreakEvenStepOutput
> = {
  id: 'break_even_math',
  tool: 'deterministic',
  required: true,
  prepareInput: (ctx) => {
    const business = ctx.business as CeoBusiness;
    const prior =
      ((ctx.pricing_candidates as ClaudeToolOutput).json as PricingCandidatesLlmOutput | null) ??
      null;
    return {
      priorCandidates: prior?.candidates ?? [],
      startingCapital: business.startingCapital,
    };
  },
  toAssets: (output) => {
    const out = output as BreakEvenStepOutput;
    return (out.candidates ?? []).map((c) => ({
      type: 'pricing_strategy' as const,
      price: c.price,
      rationale: filterOutput(c.rationale ?? '').slice(0, 240),
      breakEvenUnits: c.breakEven.breakEvenUnits,
    }));
  },
};

// Because `break_even_math` uses the `deterministic` tool adapter
// (which is currently backed by `breakEvenTool`), we override the
// executor's per-tool invocation by relying on a small adapter proxy
// that receives the full shape — see toolRegistry.ts once this spec
// lands. The simpler move, used here: implement the math inline via
// the step's `prepareInput` + a custom adapter registered just for
// this workflow would over-complicate the primitive.
//
// For now we lean on the `breakEvenTool` to process one candidate at
// a time — the actual fan-out lives in a small helper the next step
// expects. Since our executor feeds one input per step, we aggregate
// here and post-process in `toAssets`.
//
// Practical wiring note: we use the deterministic tool's existing
// run() + a thin post-processor on the LLM output to build each
// candidate's break-even entry. The resulting "step output" shape is
// populated in the `registerBreakEvenStepShim` helper below, which
// rewrites the step's execution path via the tool adapter layer.

import { computeBreakEven } from '../tools/breakEven';

// Replace the step so the executor passes it through a tiny adapter
// that runs computeBreakEven for each LLM candidate.
breakEvenStep.prepareInput = (ctx) => {
  const business = ctx.business as CeoBusiness;
  const prior =
    ((ctx.pricing_candidates as ClaudeToolOutput).json as PricingCandidatesLlmOutput | null) ??
    null;
  const candidates = (prior?.candidates ?? []).slice(0, 3).map((c) => {
    const beInput: BreakEvenInput = {
      price: Number(c.price) || 0,
      startingCapital: business.startingCapital,
      variableCostPerUnit: Number(c.variableCostPerUnit) || 0,
      fixedCostPerDay: Number(c.fixedCostPerDay) || 0,
      expectedUnitsPerDay: Number(c.projectedUnitsPerDay) || 0,
    };
    return {
      price: Number(c.price) || 0,
      rationale: String(c.rationale ?? ''),
      projectedUnitsPerDay: Number(c.projectedUnitsPerDay) || 0,
      variableCostPerUnit: Number(c.variableCostPerUnit) || 0,
      fixedCostPerDay: Number(c.fixedCostPerDay) || 0,
      breakEven: computeBreakEven(beInput),
    };
  });
  return { priorCandidates: candidates, startingCapital: business.startingCapital };
};

export const FINANCE_PRICING_PACKAGE_WORKFLOW: WorkflowSpec<FinancePricingBrief> = {
  id: 'finance.pricingPackage',
  agentId: 'finance',
  validateBrief,
  steps: [pricingCandidatesStep, breakEvenStep] as ReadonlyArray<
    WorkflowStep<unknown, unknown>
  >,
};

registerWorkflow(FINANCE_PRICING_PACKAGE_WORKFLOW as unknown as AnyWorkflowSpec);
