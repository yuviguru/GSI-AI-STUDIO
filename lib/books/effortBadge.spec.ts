import { describe, it, expect } from 'vitest';
import { computeEffortBadge, getEffortBadgeMeta } from './effortBadge';
import type { BookAuthorship } from '@gsi/types';

const now = new Date('2026-05-27T00:00:00Z');

function makeAuthorship(over: Partial<BookAuthorship>): BookAuthorship {
  return {
    initialSource: 'wizard_blank',
    aiCharTotal: 0,
    kidCharTotal: 0,
    aiImagePageCount: 0,
    kidImagePageCount: 0,
    updatedAt: now,
    ...over,
  };
}

describe('computeEffortBadge', () => {
  it('empty book → pure_imagination (kid earns the benefit of doubt)', () => {
    const b = computeEffortBadge(makeAuthorship({}), now);
    expect(b.key).toBe('pure_imagination');
    expect(b.aiPercentage).toBe(0);
  });

  it('100% kid text + kid images → pure_imagination', () => {
    const b = computeEffortBadge(
      makeAuthorship({
        kidCharTotal: 500,
        kidImagePageCount: 5,
      }),
      now,
    );
    expect(b.key).toBe('pure_imagination');
    expect(b.aiPercentage).toBe(0);
  });

  it('100% AI text + AI images → ai_generated', () => {
    const b = computeEffortBadge(
      makeAuthorship({
        aiCharTotal: 500,
        aiImagePageCount: 5,
      }),
      now,
    );
    expect(b.key).toBe('ai_generated');
    expect(b.aiPercentage).toBe(100);
  });

  it('50/50 text + 50/50 images → co_author (right at the boundary)', () => {
    // 50% text * 0.7 + 50% images * 0.3 = 50%
    const b = computeEffortBadge(
      makeAuthorship({
        aiCharTotal: 250,
        kidCharTotal: 250,
        aiImagePageCount: 2,
        kidImagePageCount: 2,
      }),
      now,
    );
    // 50% is the upper-exclusive bound of co_author → tips into ai_sidekick
    expect(b.key).toBe('ai_sidekick');
    expect(b.aiPercentage).toBe(50);
  });

  it('30% AI text dominates over 100% AI images via weighting', () => {
    // 30% * 0.7 + 100% * 0.3 = 0.21 + 0.30 = 0.51
    const b = computeEffortBadge(
      makeAuthorship({
        aiCharTotal: 30,
        kidCharTotal: 70,
        aiImagePageCount: 5,
        kidImagePageCount: 0,
      }),
      now,
    );
    expect(b.aiPercentage).toBeCloseTo(51, 0);
    expect(b.key).toBe('ai_sidekick');
  });

  it('mostly-kid text (5% AI) → pure_imagination', () => {
    // 5% * 0.7 + 0% (no images) = 5% — wait, with no images we collapse
    // weights, so it's just textPct = 5%. Still under 10%.
    const b = computeEffortBadge(
      makeAuthorship({
        aiCharTotal: 5,
        kidCharTotal: 95,
      }),
      now,
    );
    expect(b.key).toBe('pure_imagination');
    expect(b.aiPercentage).toBeLessThan(10);
  });

  it('wordless image-only book — collapses to image-only weighting', () => {
    // No text, 4 AI images out of 5 = 80% → ai_sidekick
    const b = computeEffortBadge(
      makeAuthorship({
        aiImagePageCount: 4,
        kidImagePageCount: 1,
      }),
      now,
    );
    expect(b.key).toBe('ai_sidekick');
    expect(b.aiPercentage).toBe(80);
  });

  it('text-only book — collapses to text-only weighting', () => {
    // No images, 95% AI text — should land in ai_generated
    const b = computeEffortBadge(
      makeAuthorship({
        aiCharTotal: 950,
        kidCharTotal: 50,
      }),
      now,
    );
    expect(b.key).toBe('ai_generated');
    expect(b.aiPercentage).toBe(95);
  });

  it('freezes a breakdown snapshot from the authorship', () => {
    const b = computeEffortBadge(
      makeAuthorship({
        aiCharTotal: 100,
        kidCharTotal: 50,
        aiImagePageCount: 3,
        kidImagePageCount: 1,
      }),
      now,
    );
    expect(b.breakdown).toEqual({
      aiCharTotal: 100,
      kidCharTotal: 50,
      aiImagePageCount: 3,
      kidImagePageCount: 1,
    });
    expect(b.awardedAt).toBe(now);
  });

  it('aiPercentage is rounded to 1 decimal place', () => {
    // 7 / 9 = 0.7777... → 77.8 (1 decimal)
    const b = computeEffortBadge(
      makeAuthorship({
        aiCharTotal: 7,
        kidCharTotal: 2,
      }),
      now,
    );
    expect(b.aiPercentage).toBe(77.8);
  });
});

describe('getEffortBadgeMeta', () => {
  it('returns the matching meta for each badge key', () => {
    expect(getEffortBadgeMeta('pure_imagination').emoji).toBe('🧠');
    expect(getEffortBadgeMeta('co_author').emoji).toBe('🤝');
    expect(getEffortBadgeMeta('ai_sidekick').emoji).toBe('✨');
    expect(getEffortBadgeMeta('ai_generated').emoji).toBe('🤖');
  });
});
