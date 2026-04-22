import { describe, expect, it } from 'vitest';
import {
  RUN_MULTIPLIER_CAP,
  RUN_MULTIPLIER_SEQUENCE,
  TOOL_COST_INR,
  baseWorkflowCostInr,
  runMultiplier,
  stepCostInr,
  workflowRunCostInr,
} from './pricing';

describe('pricing — TOOL_COST_INR', () => {
  it('Transformers.js is free (in-browser runs on kid device)', () => {
    expect(TOOL_COST_INR.transformers_js).toBe(0);
  });

  it('deterministic tools are free (break-even math is just arithmetic)', () => {
    expect(TOOL_COST_INR.deterministic).toBe(0);
  });

  it('Flux Schnell costs ₹8 per image', () => {
    expect(TOOL_COST_INR.flux_schnell).toBe(8);
  });

  it('Claude Haiku cheaper than Claude Sonnet', () => {
    expect(TOOL_COST_INR.claude_haiku).toBeLessThan(TOOL_COST_INR.claude_sonnet);
  });
});

describe('pricing — runMultiplier', () => {
  it('run 1 → 1.0x (first attempt)', () => {
    expect(runMultiplier(1)).toBe(1.0);
  });

  it('run 2 → 1.5x (first re-roll)', () => {
    expect(runMultiplier(2)).toBe(1.5);
  });

  it('run 3 → 2.0x', () => {
    expect(runMultiplier(3)).toBe(2.0);
  });

  it('run 4 → 2.5x (cap)', () => {
    expect(runMultiplier(4)).toBe(2.5);
  });

  it('run 10 caps at 2.5x', () => {
    expect(runMultiplier(10)).toBe(2.5);
  });

  it('cap equals sequence tail', () => {
    expect(RUN_MULTIPLIER_CAP).toBe(RUN_MULTIPLIER_SEQUENCE[RUN_MULTIPLIER_SEQUENCE.length - 1]);
  });

  it('throws on zero', () => {
    expect(() => runMultiplier(0)).toThrow(/positive integer/);
  });

  it('throws on negative', () => {
    expect(() => runMultiplier(-1)).toThrow(/positive integer/);
  });

  it('throws on fractional', () => {
    expect(() => runMultiplier(1.5)).toThrow(/positive integer/);
  });
});

describe('pricing — baseWorkflowCostInr', () => {
  it('BRAND package: Claude + 3×Flux + Claude = ₹34', () => {
    const cost = baseWorkflowCostInr([
      { tool: 'claude_haiku' },
      { tool: 'flux_schnell', unitCount: 3 },
      { tool: 'claude_haiku' },
    ]);
    expect(cost).toBe(34);
  });

  it('text-only workflow (Claude Haiku) = ₹5', () => {
    expect(baseWorkflowCostInr([{ tool: 'claude_haiku' }])).toBe(5);
  });

  it('Transformers.js-only workflow = ₹0 (teaching moment)', () => {
    expect(baseWorkflowCostInr([{ tool: 'transformers_js' }])).toBe(0);
  });

  it('empty workflow = ₹0', () => {
    expect(baseWorkflowCostInr([])).toBe(0);
  });

  it('unitCount defaults to 1', () => {
    expect(baseWorkflowCostInr([{ tool: 'flux_schnell' }])).toBe(TOOL_COST_INR.flux_schnell);
  });

  it('throws on negative unitCount', () => {
    expect(() => baseWorkflowCostInr([{ tool: 'flux_schnell', unitCount: -1 }])).toThrow(
      /non-negative/,
    );
  });

  it('throws on fractional unitCount', () => {
    expect(() => baseWorkflowCostInr([{ tool: 'flux_schnell', unitCount: 1.5 }])).toThrow(
      /non-negative/,
    );
  });
});

describe('pricing — workflowRunCostInr (base × multiplier)', () => {
  const brandSteps = [
    { tool: 'claude_haiku' as const },
    { tool: 'flux_schnell' as const, unitCount: 3 },
    { tool: 'claude_haiku' as const },
  ];

  it('BRAND run 1 = ₹34 (1.0×)', () => {
    expect(workflowRunCostInr(brandSteps, 1)).toBe(34);
  });

  it('BRAND run 2 = ₹51 (1.5× → rounded)', () => {
    expect(workflowRunCostInr(brandSteps, 2)).toBe(51);
  });

  it('BRAND run 3 = ₹68 (2.0×)', () => {
    expect(workflowRunCostInr(brandSteps, 3)).toBe(68);
  });

  it('BRAND run 4 = ₹85 (2.5× cap)', () => {
    expect(workflowRunCostInr(brandSteps, 4)).toBe(85);
  });

  it('BRAND run 100 = same as run 4 (cap)', () => {
    expect(workflowRunCostInr(brandSteps, 100)).toBe(85);
  });

  it('zero-cost workflow stays zero across all runs', () => {
    const tsOnly = [{ tool: 'transformers_js' as const }];
    for (let i = 1; i <= 10; i += 1) {
      expect(workflowRunCostInr(tsOnly, i)).toBe(0);
    }
  });

  it('rounds to nearest integer rupee (no fractional paise)', () => {
    // Claude Haiku (₹5) × 1.5 = 7.5 → 8 (half-up per Math.round)
    expect(workflowRunCostInr([{ tool: 'claude_haiku' }], 2)).toBe(8);
  });
});

describe('pricing — stepCostInr', () => {
  it('single Claude call = ₹5', () => {
    expect(stepCostInr('claude_haiku')).toBe(5);
  });

  it('3× Flux = ₹24', () => {
    expect(stepCostInr('flux_schnell', 3)).toBe(24);
  });

  it('0 units = ₹0 (degenerate but valid)', () => {
    expect(stepCostInr('flux_schnell', 0)).toBe(0);
  });

  it('throws on negative unit count', () => {
    expect(() => stepCostInr('flux_schnell', -1)).toThrow(/non-negative/);
  });
});
