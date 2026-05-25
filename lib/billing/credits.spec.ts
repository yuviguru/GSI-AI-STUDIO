import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Firestore admin mock ───────────────────────────────────────────────
//
// `runTransaction` runs the callback synchronously against an in-memory
// transaction object. `tx.get(ref)` returns whatever was last `set` on
// that doc — letting tests stage a starting balance and observe writes.

const docStore = new Map<string, Record<string, unknown>>();
const ledgerStore = new Map<string, Record<string, unknown>[]>();

function makeDocRef(path: string) {
  return {
    id: path.split('/').pop() ?? 'doc',
    get: vi.fn(async () => ({
      exists: docStore.has(path),
      data: () => docStore.get(path) ?? {},
    })),
    set: vi.fn(async (data: Record<string, unknown>) => {
      docStore.set(path, { ...(docStore.get(path) ?? {}), ...data });
    }),
    update: vi.fn(async (data: Record<string, unknown>) => {
      docStore.set(path, { ...(docStore.get(path) ?? {}), ...data });
    }),
    collection: (sub: string) => makeCollectionRef(`${path}/${sub}`),
  };
}

let ledgerCounter = 0;

function makeCollectionRef(path: string) {
  return {
    doc: (id?: string) => {
      const docId = id ?? `entry_${++ledgerCounter}`;
      return makeDocRef(`${path}/${docId}`);
    },
    where: (field: string, _op: string, value: unknown) => ({
      limit: (_n: number) => ({
        get: vi.fn(async () => {
          const entries = ledgerStore.get(path) ?? [];
          const matches = entries.filter((e) => e[field] === value);
          return { empty: matches.length === 0, docs: matches };
        }),
      }),
    }),
    orderBy: () => ({
      limit: () => ({
        get: vi.fn(async () => {
          const entries = ledgerStore.get(path) ?? [];
          return {
            docs: entries.map((e, i) => ({
              id: `entry_${i}`,
              data: () => e,
            })),
          };
        }),
      }),
    }),
  };
}

const mockTxOps = {
  get: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
};

function makeTx(path: string) {
  return {
    get: async (refOrQuery: unknown) => {
      // Handle both doc refs and query refs (paymentRef dedup check)
      if (refOrQuery && typeof refOrQuery === 'object' && 'get' in (refOrQuery as object)) {
        return (refOrQuery as { get: () => Promise<unknown> }).get();
      }
      return {
        exists: docStore.has(path),
        data: () => docStore.get(path) ?? {},
      };
    },
    set: (ref: ReturnType<typeof makeDocRef>, data: Record<string, unknown>) => {
      mockTxOps.set(ref, data);
      if (typeof ref === 'object' && 'id' in ref) {
        // Crude path detection — works for `kids/{id}` and ledger subcoll
        // because the only refs the tests create live in this module.
        const id = (ref as { id: string }).id;
        if (id.startsWith('entry_')) {
          const ledgerPath = path + '/creditLedger';
          const existing = ledgerStore.get(ledgerPath) ?? [];
          ledgerStore.set(ledgerPath, [...existing, data]);
        } else {
          docStore.set(path, { ...(docStore.get(path) ?? {}), ...data });
        }
      }
    },
    update: (ref: ReturnType<typeof makeDocRef>, data: Record<string, unknown>) => {
      mockTxOps.update(ref, data);
      docStore.set(path, { ...(docStore.get(path) ?? {}), ...data });
    },
  };
}

let txKidPath = 'kids/kid_test';

vi.mock('@gsi/firebase', () => ({
  adminDb: {
    collection: (_col: string) => ({
      doc: (id: string) => {
        txKidPath = `kids/${id}`;
        return makeDocRef(txKidPath);
      },
    }),
    runTransaction: async (cb: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => {
      return cb(makeTx(txKidPath));
    },
  },
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => new Date(),
    delete: () => null,
  },
  Timestamp: {
    fromDate: (d: Date) => ({ toDate: () => d }),
    now: () => ({ toDate: () => new Date() }),
  },
}));

// ── SUT ────────────────────────────────────────────────────────────────

import {
  getBalance,
  debitCredits,
  grantMonthlyCredits,
  addTopupCredits,
  addBonusCredits,
  InsufficientCreditsError,
} from './credits';

describe('lib/billing/credits', () => {
  beforeEach(() => {
    docStore.clear();
    ledgerStore.clear();
    ledgerCounter = 0;
    vi.clearAllMocks();
  });

  describe('getBalance()', () => {
    it('returns 0 for a kid with no billing record yet', async () => {
      expect(await getBalance('new_kid')).toBe(0);
    });

    it('returns the cached balance from the kid doc', async () => {
      docStore.set('kids/kid_a', { creditBalance: 250 });
      expect(await getBalance('kid_a')).toBe(250);
    });
  });

  describe('debitCredits()', () => {
    it('debits the requested amount and writes a debit ledger entry', async () => {
      docStore.set('kids/kid_a', { creditBalance: 100 });

      const result = await debitCredits({ kidId: 'kid_a', amount: 25, feature: 'image.sdxl' });

      expect(result.balanceAfter).toBe(75);
      expect(docStore.get('kids/kid_a')?.creditBalance).toBe(75);
      const ledger = ledgerStore.get('kids/kid_a/creditLedger') ?? [];
      expect(ledger).toHaveLength(1);
      expect(ledger[0]?.type).toBe('debit');
      expect(ledger[0]?.amount).toBe(-25);
      expect(ledger[0]?.balanceAfter).toBe(75);
      expect(ledger[0]?.feature).toBe('image.sdxl');
    });

    it('throws InsufficientCreditsError when balance is too low', async () => {
      docStore.set('kids/kid_a', { creditBalance: 10 });

      await expect(
        debitCredits({ kidId: 'kid_a', amount: 25, feature: 'image.sdxl' }),
      ).rejects.toBeInstanceOf(InsufficientCreditsError);

      // Critically — the balance must NOT have changed
      expect(docStore.get('kids/kid_a')?.creditBalance).toBe(10);
      // And no ledger entry was written
      expect(ledgerStore.get('kids/kid_a/creditLedger')).toBeUndefined();
    });

    it('throws on negative amount (caller bug guard)', async () => {
      await expect(
        debitCredits({ kidId: 'kid_a', amount: -5, feature: 'image.sdxl' }),
      ).rejects.toThrow(/non-negative/);
    });

    it('is a no-op for zero-cost calls (no ledger spam)', async () => {
      docStore.set('kids/kid_a', { creditBalance: 100 });

      const result = await debitCredits({ kidId: 'kid_a', amount: 0, feature: 'free.thing' });

      expect(result.balanceAfter).toBe(100);
      expect(result.entryId).toBe('');
      expect(ledgerStore.get('kids/kid_a/creditLedger')).toBeUndefined();
    });

    it('drains the grant pool before touching topup (Codex P1)', async () => {
      // Mixed pools: grant 50 + topup 50 = 100. Debit 75 should fully
      // empty the grant pool and take only 25 from topup. The remaining
      // 25 topup is then safe from the next monthly expiry.
      docStore.set('kids/kid_a', {
        creditBalance: 100,
        creditBalanceGrant: 50,
        creditBalanceTopup: 50,
      });

      const result = await debitCredits({
        kidId: 'kid_a',
        amount: 75,
        feature: 'image.sdxl',
      });

      expect(result.balanceAfter).toBe(25);
      const doc = docStore.get('kids/kid_a');
      expect(doc?.creditBalanceGrant).toBe(0);
      expect(doc?.creditBalanceTopup).toBe(25);

      const ledger = ledgerStore.get('kids/kid_a/creditLedger') ?? [];
      const meta = ledger[0]?.metadata as Record<string, unknown>;
      expect(meta.fromGrant).toBe(50);
      expect(meta.fromTopup).toBe(25);
    });

    it('debits draw entirely from topup when grant pool is empty', async () => {
      docStore.set('kids/kid_a', {
        creditBalance: 80,
        creditBalanceGrant: 0,
        creditBalanceTopup: 80,
      });

      const result = await debitCredits({ kidId: 'kid_a', amount: 25, feature: 'image.flux' });

      expect(result.balanceAfter).toBe(55);
      expect(docStore.get('kids/kid_a')?.creditBalanceTopup).toBe(55);
    });
  });

  describe('grantMonthlyCredits()', () => {
    it('grants the configured monthly amount to a brand-new kid', async () => {
      const result = await grantMonthlyCredits({ kidId: 'kid_new', plan: 'creator' });

      expect(result.balanceAfter).toBe(500); // PLANS.creator.creditsPerMonth
      expect(docStore.get('kids/kid_new')?.creditBalance).toBe(500);
      expect(docStore.get('kids/kid_new')?.plan).toBe('creator');

      const ledger = ledgerStore.get('kids/kid_new/creditLedger') ?? [];
      // New kid = no prior grant to expire, so only 1 entry (the grant)
      expect(ledger).toHaveLength(1);
      expect(ledger[0]?.type).toBe('grant');
      expect(ledger[0]?.amount).toBe(500);
    });

    it('expires the previous grant remainder before granting new credits', async () => {
      // Existing state: 300 credits left in the grant pool, 0 topup.
      // Renewal expires those 300, then grants 500 fresh.
      docStore.set('kids/kid_a', {
        creditBalance: 300,
        creditBalanceGrant: 300,
        creditBalanceTopup: 0,
        creditsMonthlyGrantAmount: 500,
        plan: 'creator',
      });

      const result = await grantMonthlyCredits({ kidId: 'kid_a', plan: 'creator' });

      expect(result.balanceAfter).toBe(500); // 0 (expired) + 500 (granted)
      const ledger = ledgerStore.get('kids/kid_a/creditLedger') ?? [];
      expect(ledger).toHaveLength(2);
      expect(ledger[0]?.type).toBe('expire');
      expect(ledger[0]?.amount).toBe(-300);
      expect(ledger[1]?.type).toBe('grant');
      expect(ledger[1]?.amount).toBe(500);
    });

    it('preserves paid topups when expiring monthly remainder (Codex P1)', async () => {
      // Bug scenario from PR #65 review: kid has grant 500 + topup 500 = 1000,
      // spends 700 (drains grant entirely + 200 of topup). Balance: 0 grant +
      // 300 topup. Renewal must NOT touch the 300 topup remainder.
      docStore.set('kids/kid_a', {
        creditBalance: 300,
        creditBalanceGrant: 0,
        creditBalanceTopup: 300,
        creditsMonthlyGrantAmount: 500,
        plan: 'creator',
      });

      const result = await grantMonthlyCredits({ kidId: 'kid_a', plan: 'creator' });

      // 0 (expired, grant pool was empty) + 500 (new grant) + 300 (topup
      // intact) = 800. The OLD single-pool code would have produced 500
      // here — burning the 300 of paid credits.
      expect(result.balanceAfter).toBe(800);
      expect(docStore.get('kids/kid_a')?.creditBalanceGrant).toBe(500);
      expect(docStore.get('kids/kid_a')?.creditBalanceTopup).toBe(300);

      const ledger = ledgerStore.get('kids/kid_a/creditLedger') ?? [];
      // Grant pool was 0, so no expire entry — only the new grant.
      expect(ledger).toHaveLength(1);
      expect(ledger[0]?.type).toBe('grant');
    });

    it('handles mixed remainder: grant 300 + topup 500 → renewal preserves both', async () => {
      docStore.set('kids/kid_a', {
        creditBalance: 800,
        creditBalanceGrant: 300,
        creditBalanceTopup: 500,
        creditsMonthlyGrantAmount: 500,
        plan: 'creator',
      });

      const result = await grantMonthlyCredits({ kidId: 'kid_a', plan: 'creator' });

      // 300 grant pool expires → topup 500 preserved → grant 500 fresh.
      // Final: 500 grant + 500 topup = 1000.
      expect(result.balanceAfter).toBe(1000);
      expect(docStore.get('kids/kid_a')?.creditBalanceTopup).toBe(500);

      const ledger = ledgerStore.get('kids/kid_a/creditLedger') ?? [];
      expect(ledger).toHaveLength(2);
      expect(ledger[0]?.type).toBe('expire');
      expect(ledger[0]?.amount).toBe(-300);
      expect(ledger[1]?.type).toBe('grant');
    });

    it('admin plan short-circuits — no ledger, unlimited cache value', async () => {
      const result = await grantMonthlyCredits({ kidId: 'kid_admin', plan: 'admin' });

      expect(result.balanceAfter).toBe(Number.MAX_SAFE_INTEGER);
      expect(ledgerStore.get('kids/kid_admin/creditLedger')).toBeUndefined();
    });

    it('admin plan grant succeeds on brand-new kid doc (Codex P2)', async () => {
      // Codex flagged: the admin branch used `update()` which throws
      // `not-found` when the kid doc doesn't exist yet. Switching to
      // `set(..., {merge: true})` is the fix — and this test pins it down.
      docStore.clear(); // ensure kid doc doesn't exist

      const result = await grantMonthlyCredits({ kidId: 'kid_brand_new', plan: 'admin' });

      expect(result.balanceAfter).toBe(Number.MAX_SAFE_INTEGER);
      // Verify the doc actually got written (set+merge created it).
      const doc = docStore.get('kids/kid_brand_new');
      expect(doc).toBeDefined();
      expect(doc?.plan).toBe('admin');
      expect(doc?.creditBalanceTopup).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe('addTopupCredits()', () => {
    it('adds purchased credits and writes a topup entry', async () => {
      docStore.set('kids/kid_a', { creditBalance: 50 });

      const result = await addTopupCredits({
        kidId: 'kid_a',
        amount: 500,
        paymentRef: 'pay_abc',
      });

      expect(result.duplicate).toBe(false);
      expect(result.balanceAfter).toBe(550);

      const ledger = ledgerStore.get('kids/kid_a/creditLedger') ?? [];
      expect(ledger).toHaveLength(1);
      expect(ledger[0]?.type).toBe('topup');
      expect(ledger[0]?.paymentRef).toBe('pay_abc');
      expect(ledger[0]?.paymentProvider).toBe('razorpay');
    });

    it('is idempotent on paymentRef — duplicate webhook is a no-op', async () => {
      docStore.set('kids/kid_a', { creditBalance: 50 });

      const first = await addTopupCredits({
        kidId: 'kid_a',
        amount: 500,
        paymentRef: 'pay_abc',
      });
      const second = await addTopupCredits({
        kidId: 'kid_a',
        amount: 500,
        paymentRef: 'pay_abc',
      });

      expect(first.duplicate).toBe(false);
      expect(second.duplicate).toBe(true);
      // Critical: balance does NOT double
      expect(second.balanceAfter).toBe(550);
      expect(docStore.get('kids/kid_a')?.creditBalance).toBe(550);
    });

    it('throws on non-positive amount', async () => {
      await expect(addTopupCredits({ kidId: 'kid_a', amount: 0, paymentRef: 'p' })).rejects.toThrow();
      await expect(addTopupCredits({ kidId: 'kid_a', amount: -10, paymentRef: 'p' })).rejects.toThrow();
    });
  });

  describe('addBonusCredits()', () => {
    it('adds admin-issued credits with a bonus ledger entry', async () => {
      docStore.set('kids/kid_a', { creditBalance: 0 });

      const result = await addBonusCredits({
        kidId: 'kid_a',
        amount: 100,
        note: 'beta tester gift',
        actorId: 'admin_yuvi',
      });

      expect(result.balanceAfter).toBe(100);
      const ledger = ledgerStore.get('kids/kid_a/creditLedger') ?? [];
      expect(ledger[0]?.type).toBe('bonus');
      expect(ledger[0]?.paymentProvider).toBe('manual');
      expect((ledger[0]?.metadata as Record<string, unknown>).note).toBe('beta tester gift');
      expect((ledger[0]?.metadata as Record<string, unknown>).actorId).toBe('admin_yuvi');
    });
  });
});
