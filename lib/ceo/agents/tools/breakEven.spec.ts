import { describe, expect, it } from 'vitest';
import { breakEvenTool, computeBreakEven } from './breakEven';

describe('computeBreakEven — happy path', () => {
  it('lemonade stand: ₹10/cup, ₹4 costs, ₹50 fixed → 9 cups/day', () => {
    const r = computeBreakEven({
      price: 10,
      variableCostPerUnit: 4,
      fixedCostPerDay: 50,
      startingCapital: 1000,
    });
    expect(r.breakEvenUnits).toBe(9); // ceil(50 / 6)
    expect(r.contributionMargin).toBe(6);
    expect(r.daysToCapitalBurnout).toBe(20); // floor(1000 / 50)
    expect(r.coversBreakEven).toBe(false); // no forecast provided
  });

  it('coversBreakEven true when forecast ≥ breakEven', () => {
    const r = computeBreakEven({
      price: 10,
      variableCostPerUnit: 4,
      fixedCostPerDay: 50,
      startingCapital: 1000,
      expectedUnitsPerDay: 12,
    });
    expect(r.coversBreakEven).toBe(true);
  });

  it('coversBreakEven false when forecast < breakEven', () => {
    const r = computeBreakEven({
      price: 10,
      variableCostPerUnit: 4,
      fixedCostPerDay: 50,
      startingCapital: 1000,
      expectedUnitsPerDay: 5,
    });
    expect(r.coversBreakEven).toBe(false);
  });
});

describe('computeBreakEven — edge cases', () => {
  it('price < variable cost → break-even unreachable (9999 sentinel)', () => {
    const r = computeBreakEven({
      price: 5,
      variableCostPerUnit: 8,
      fixedCostPerDay: 50,
      startingCapital: 1000,
    });
    expect(r.breakEvenUnits).toBe(9999);
    expect(r.coversBreakEven).toBe(false);
  });

  it('price == variable cost (zero margin) → unreachable', () => {
    const r = computeBreakEven({
      price: 10,
      variableCostPerUnit: 10,
      fixedCostPerDay: 50,
      startingCapital: 1000,
    });
    expect(r.breakEvenUnits).toBe(9999);
  });

  it('zero fixed costs → 0 units to break even', () => {
    const r = computeBreakEven({
      price: 10,
      variableCostPerUnit: 4,
      fixedCostPerDay: 0,
      startingCapital: 1000,
    });
    // ceil(0 / 6) = 0, covers automatically even with 0 forecast
    expect(r.breakEvenUnits).toBe(0);
    expect(r.daysToCapitalBurnout).toBe(9999); // no fixed burn
  });

  it('zero starting capital → 0 days to burnout (no cushion)', () => {
    const r = computeBreakEven({
      price: 10,
      variableCostPerUnit: 4,
      fixedCostPerDay: 50,
      startingCapital: 0,
    });
    expect(r.daysToCapitalBurnout).toBe(0);
  });

  it('rounds contribution margin to 2 decimal places', () => {
    const r = computeBreakEven({
      price: 10.333,
      variableCostPerUnit: 4.111,
      fixedCostPerDay: 50,
      startingCapital: 1000,
    });
    expect(r.contributionMargin).toBe(6.22);
  });
});

describe('computeBreakEven — input validation', () => {
  it('throws on negative price', () => {
    expect(() =>
      computeBreakEven({
        price: -1,
        variableCostPerUnit: 4,
        fixedCostPerDay: 50,
        startingCapital: 1000,
      }),
    ).toThrow(/price must be a non-negative number/);
  });

  it('throws on NaN variable cost', () => {
    expect(() =>
      computeBreakEven({
        price: 10,
        variableCostPerUnit: Number.NaN,
        fixedCostPerDay: 50,
        startingCapital: 1000,
      }),
    ).toThrow(/variableCostPerUnit/);
  });

  it('throws on negative fixedCostPerDay', () => {
    expect(() =>
      computeBreakEven({
        price: 10,
        variableCostPerUnit: 4,
        fixedCostPerDay: -10,
        startingCapital: 1000,
      }),
    ).toThrow(/fixedCostPerDay/);
  });
});

describe('breakEvenTool adapter', () => {
  it('returns zero-cost trace entry with a human-readable summary', async () => {
    const res = await breakEvenTool.run(
      {
        price: 10,
        variableCostPerUnit: 4,
        fixedCostPerDay: 50,
        startingCapital: 1000,
        expectedUnitsPerDay: 12,
      },
      { attempt: 1 },
    );
    expect(res.model).toBe('');
    expect(res.promptTokens).toBe(0);
    expect(res.completionTokens).toBe(0);
    expect(res.outputSummary).toMatch(/break-even/i);
    expect(res.output.coversBreakEven).toBe(true);
  });

  it('adapter id matches the deterministic pricing bucket (₹0)', () => {
    expect(breakEvenTool.id).toBe('deterministic');
  });
});
