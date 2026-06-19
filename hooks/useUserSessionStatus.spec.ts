import { describe, it, expect } from 'vitest';
import type { ClaimedSessionSummary } from './useAuth';
import { claimedSummaryIsKeepable } from './useUserSessionStatus';

function summary(overrides: Partial<ClaimedSessionSummary> = {}): ClaimedSessionSummary {
  return {
    aiPoints: 0,
    badgeCount: 0,
    conceptCount: 0,
    creationTypes: [],
    totalCreationCount: 0,
    ...overrides,
  };
}

describe('claimedSummaryIsKeepable', () => {
  it('is false for no summary', () => {
    expect(claimedSummaryIsKeepable(undefined)).toBe(false);
  });

  // The AUTH-002 bug: a contentless claim (the "Account full" dead-end).
  it('is false for an all-zero summary with no onboarding', () => {
    expect(claimedSummaryIsKeepable(summary())).toBe(false);
  });

  it('is false for avatar/mascot-only with NO name (the exact dead-end case)', () => {
    expect(
      claimedSummaryIsKeepable(
        summary({ onboarding: { avatarUrl: 'https://x/a.png', mascotId: 'koko' } }),
      ),
    ).toBe(false);
  });

  it('is true when onboarding has a name', () => {
    expect(claimedSummaryIsKeepable(summary({ onboarding: { name: 'Joy' } }))).toBe(true);
  });

  it('is true when there are points', () => {
    expect(claimedSummaryIsKeepable(summary({ aiPoints: 30 }))).toBe(true);
  });

  it('is true when there are badges', () => {
    expect(claimedSummaryIsKeepable(summary({ badgeCount: 1 }))).toBe(true);
  });

  it('is true when there are creations', () => {
    expect(
      claimedSummaryIsKeepable(summary({ totalCreationCount: 2, creationTypes: ['story', 'book'] })),
    ).toBe(true);
  });

  // Codex review #74: concepts count server-side (hasMeaningfulData) and are
  // merged by assignPendingClaimedDataToKid — a concept-only session must NOT
  // be auto-discarded as contentless.
  it('is true when there are learned concepts only', () => {
    expect(claimedSummaryIsKeepable(summary({ conceptCount: 3 }))).toBe(true);
  });
});
