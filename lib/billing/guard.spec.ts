import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Mocks set up BEFORE importing the SUT ─────────────────────────────────
//
// The guard composes shouldBypass + debitCredits. Mocking them lets us
// exercise the orchestration logic without spinning up Firestore.

const mockShouldBypass = vi.fn();
vi.mock('./bypass', () => ({
  shouldBypass: (kidId?: string) => mockShouldBypass(kidId),
}));

const mockDebitCredits = vi.fn();
vi.mock('./credits', async () => {
  const actual = await vi.importActual<typeof import('./credits')>('./credits');
  return {
    ...actual,
    debitCredits: (input: Parameters<typeof actual.debitCredits>[0]) => mockDebitCredits(input),
  };
});

// ── Now import the SUT — mocks above are wired in ────────────────────────

import { assertEntitled, PlanError, InsufficientCreditsError, planErrorDetails, insufficientCreditsDetails } from './guard';

describe('lib/billing/guard.assertEntitled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShouldBypass.mockReturnValue(false);
    mockDebitCredits.mockResolvedValue({ balanceAfter: 100, entryId: 'ledger_xyz' });
  });

  describe('bypass path', () => {
    it('short-circuits when shouldBypass returns true', async () => {
      mockShouldBypass.mockReturnValue(true);

      const result = await assertEntitled(
        { kidId: 'kid_1', plan: 'free' },
        { feature: 'image.sdxl' },
      );

      expect(result.bypassed).toBe(true);
      expect(result.charged).toBe(0);
      expect(mockDebitCredits).not.toHaveBeenCalled();
    });

    it('treats admin plan as bypass', async () => {
      const result = await assertEntitled(
        { kidId: 'kid_admin', plan: 'admin' },
        { feature: 'image.sdxl' },
      );

      expect(result.bypassed).toBe(true);
      expect(mockDebitCredits).not.toHaveBeenCalled();
    });
  });

  describe('capability gates', () => {
    it('throws PlanError when free user requests a pro capability', async () => {
      // canExportPdf is pro+ only per ENTITLEMENTS
      await expect(
        assertEntitled({ kidId: 'kid_1', plan: 'free' }, { capability: 'canExportPdf' }),
      ).rejects.toBeInstanceOf(PlanError);
    });

    it('does not call debitCredits when the capability check fails', async () => {
      try {
        await assertEntitled(
          { kidId: 'kid_1', plan: 'free' },
          { feature: 'image.sdxl', capability: 'canExportPdf' },
        );
      } catch {
        /* expected */
      }
      expect(mockDebitCredits).not.toHaveBeenCalled();
    });

    it('passes when plan has the capability', async () => {
      const result = await assertEntitled(
        { kidId: 'kid_pro', plan: 'pro' },
        { capability: 'canExportPdf' },
      );
      expect(result.bypassed).toBe(false);
    });
  });

  describe('credit debit', () => {
    it('debits the configured cost for a feature', async () => {
      const result = await assertEntitled(
        { kidId: 'kid_1', plan: 'creator' },
        { feature: 'image.sdxl' },
      );

      expect(mockDebitCredits).toHaveBeenCalledTimes(1);
      const args = mockDebitCredits.mock.calls[0]?.[0];
      expect(args.kidId).toBe('kid_1');
      expect(args.amount).toBe(25); // CREDIT_COSTS['image.sdxl']
      expect(args.feature).toBe('image.sdxl');
      expect(result.charged).toBe(25);
      expect(result.balanceAfter).toBe(100);
    });

    it('skips debit for zero-cost features', async () => {
      const result = await assertEntitled(
        { kidId: 'kid_1', plan: 'creator' },
        { feature: 'unknown.feature' },
      );

      expect(mockDebitCredits).not.toHaveBeenCalled();
      expect(result.charged).toBe(0);
    });

    it('skips debit when there is no kidId (anonymous caller)', async () => {
      const result = await assertEntitled(
        { plan: 'free' },
        { feature: 'image.sdxl' },
      );

      expect(mockDebitCredits).not.toHaveBeenCalled();
      expect(result.charged).toBe(0);
    });

    it('propagates InsufficientCreditsError thrown by debitCredits', async () => {
      mockDebitCredits.mockRejectedValue(
        new InsufficientCreditsError({ required: 25, available: 5, feature: 'image.sdxl' }),
      );

      await expect(
        assertEntitled({ kidId: 'kid_1', plan: 'free' }, { feature: 'image.sdxl' }),
      ).rejects.toBeInstanceOf(InsufficientCreditsError);
    });
  });

  describe('analytics metadata', () => {
    it('passes plan + role + caller metadata to the debit entry', async () => {
      await assertEntitled(
        { kidId: 'kid_1', plan: 'creator', role: 'parent' },
        { feature: 'image.sdxl', metadata: { sessionId: 'sess_42' } },
      );

      const args = mockDebitCredits.mock.calls[0]?.[0];
      expect(args.metadata).toMatchObject({
        plan: 'creator',
        role: 'parent',
        sessionId: 'sess_42',
      });
    });
  });
});

describe('planErrorDetails / insufficientCreditsDetails — API response helpers', () => {
  it('planErrorDetails suggests the lowest plan with the capability', () => {
    const err = new PlanError({ currentPlan: 'free', capability: 'canExportPdf' });
    const details = planErrorDetails(err);

    expect(details.currentPlan).toBe('free');
    expect(details.requiredPlan).toBe('pro');
    expect(details.upgradeUrl).toContain('to=pro');
  });

  it('insufficientCreditsDetails rounds up to the next bundle size', () => {
    const err = new InsufficientCreditsError({ required: 25, available: 5, feature: 'image.sdxl' });
    const details = insufficientCreditsDetails(err);

    // shortfall = 20, smallest bundle covering it = 100
    expect(details.topupUrl).toContain('suggested=100');
    expect(details.required).toBe(25);
    expect(details.available).toBe(5);
  });

  it('insufficientCreditsDetails clamps to the largest bundle if shortfall is huge', () => {
    const err = new InsufficientCreditsError({ required: 99_999, available: 0 });
    const details = insufficientCreditsDetails(err);
    expect(details.topupUrl).toContain('suggested=2000');
  });
});
