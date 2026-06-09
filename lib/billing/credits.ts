/**
 * Credit ledger — append-only `kids/{kidId}/creditLedger/*` subcollection
 * is the source of truth; `kid.creditBalance` (plus the per-pool fields) is
 * a denormalized cache. Every mutation writes the ledger entry and updates
 * the cache inside one Firestore transaction.
 *
 * Two pools per kid: `grant` (monthly cycle, expires) and `topup` (purchased
 * + bonus, never expires). Debits drain grant first.
 */

import {
  FieldValue,
  Timestamp,
  type DocumentReference,
  type Query,
  type Transaction,
} from 'firebase-admin/firestore';
import { adminDb } from '@gsi/firebase';
import type { CreditLedgerEntry, UserPlan } from '@gsi/types';
import { getPlan } from './plans';

const KIDS = 'kids';
const LEDGER = 'creditLedger';

/** Resolve the kid doc ref. Cheap; doesn't hit Firestore. */
function kidDocRef(kidId: string): DocumentReference {
  return adminDb.collection(KIDS).doc(kidId);
}

// ─── Errors ──────────────────────────────────────────────────────────────

export class InsufficientCreditsError extends Error {
  readonly code = 'INSUFFICIENT_CREDITS';
  readonly status = 402;
  constructor(
    readonly required: number,
    readonly available: number,
    readonly feature?: string,
  ) {
    super(`Need ${required} credits, have ${available}.`);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

interface Pools {
  grant: number;
  topup: number;
  total: number;
}

/**
 * Read both credit pools from a kid-doc data blob.
 *
 * Legacy compat: a doc with only `creditBalance` set (pre-two-pool) is
 * treated as all-topup so a renewal doesn't burn the cached balance.
 */
function readPools(data: Record<string, unknown>): Pools {
  const grantRaw = data.creditBalanceGrant;
  const topupRaw = data.creditBalanceTopup;
  if (typeof grantRaw === 'number' || typeof topupRaw === 'number') {
    const grant = (grantRaw as number) ?? 0;
    const topup = (topupRaw as number) ?? 0;
    return { grant, topup, total: grant + topup };
  }
  const total = (data.creditBalance as number) ?? 0;
  return { grant: 0, topup: total, total };
}

function tsToDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  // Duck-type Firestore Timestamp — avoids `instanceof Timestamp` which
  // is fragile when the value comes from a mock or a different SDK version.
  if (typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

/**
 * Write a ledger entry + update the kid-doc pool cache in one tx.
 *
 * The kid-doc write always uses `set(..., { merge: true })` so a brand-new
 * kid (no doc yet) gets created cleanly — never `update()` which throws
 * `not-found`.
 */
function commitLedger(
  tx: Transaction,
  kidRef: DocumentReference,
  pools: Pools,
  entry: Record<string, unknown>,
  extraKidFields: Record<string, unknown> = {},
): string {
  const ledgerRef = kidRef.collection(LEDGER).doc();
  tx.set(
    kidRef,
    {
      creditBalance: pools.grant + pools.topup,
      creditBalanceGrant: pools.grant,
      creditBalanceTopup: pools.topup,
      updatedAt: FieldValue.serverTimestamp(),
      ...extraKidFields,
    },
    { merge: true },
  );
  tx.set(ledgerRef, { ...entry, createdAt: FieldValue.serverTimestamp() });
  return ledgerRef.id;
}

// ─── Reads ───────────────────────────────────────────────────────────────

export interface CreditSnapshot {
  kidId: string;
  plan: UserPlan;
  balance: number;
  balanceGrant: number;
  balanceTopup: number;
  monthlyGrantAmount: number;
  monthlyGrantedAt: Date | null;
  monthlyResetAt: Date | null;
  lastDebitAt: Date | null;
}

export async function getCreditSnapshot(kidId: string): Promise<CreditSnapshot> {
  const snap = await kidDocRef(kidId).get();
  const data = snap.exists ? (snap.data() as Record<string, unknown>) : {};
  const pools = readPools(data);
  return {
    kidId,
    plan: (data.plan as UserPlan) ?? 'free',
    balance: pools.total,
    balanceGrant: pools.grant,
    balanceTopup: pools.topup,
    monthlyGrantAmount: (data.creditsMonthlyGrantAmount as number) ?? 0,
    monthlyGrantedAt: tsToDate(data.creditsMonthlyGrantedAt),
    monthlyResetAt: tsToDate(data.creditsMonthlyResetAt),
    lastDebitAt: tsToDate(data.creditsLastDebitAt),
  };
}

/** Convenience: just the balance. Prefer `getCreditSnapshot` for routes. */
export async function getBalance(kidId: string): Promise<number> {
  return (await getCreditSnapshot(kidId)).balance;
}

/**
 * Idempotent first-time grant: if the kid has never been granted credits
 * (no `creditsMonthlyGrantedAt`), provision them with the default plan's
 * monthly amount. No-op if they've already received a grant.
 *
 * Used by routes that surface the balance (`GET /api/billing/credits`)
 * so a kid created before BILLING-001 still gets seeded automatically.
 * The `POST /api/users/kids` path seeds at creation time for new accounts;
 * this function is the safety net for everyone else.
 */
export async function ensureInitialGrant(
  kidId: string,
  plan?: UserPlan,
): Promise<CreditSnapshot> {
  const snap = await getCreditSnapshot(kidId);
  if (snap.monthlyGrantedAt) return snap;
  await grantMonthlyCredits({ kidId, plan: plan ?? snap.plan ?? 'free' });
  return getCreditSnapshot(kidId);
}

export interface LedgerPage {
  entries: CreditLedgerEntry[];
  /** Pass back as `before` on the next request to fetch older entries. */
  nextCursor: string | null;
}

/**
 * Paginated ledger fetch — newest first. Pass `before` (a previous
 * entry's `createdAt` ISO string) to fetch the next page. Returns a
 * cursor for the page after if more entries exist.
 */
export async function getLedgerPage(
  kidId: string,
  options: { limit?: number; before?: string | null } = {},
): Promise<LedgerPage> {
  const n = Math.max(1, Math.min(100, options.limit ?? 20));

  let q: Query = kidDocRef(kidId).collection(LEDGER).orderBy('createdAt', 'desc');

  if (options.before) {
    const beforeDate = new Date(options.before);
    if (!Number.isNaN(beforeDate.getTime())) {
      q = q.startAfter(Timestamp.fromDate(beforeDate));
    }
  }

  const snap = await q.limit(n + 1).get();
  const docs = snap.docs.slice(0, n);
  const hasMore = snap.docs.length > n;

  const entries = docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      type: d.type,
      amount: d.amount,
      balanceAfter: d.balanceAfter,
      feature: d.feature,
      paymentRef: d.paymentRef,
      paymentProvider: d.paymentProvider,
      expiresAt: tsToDate(d.expiresAt) ?? undefined,
      metadata: d.metadata,
      reversedBy: d.reversedBy,
      createdAt: tsToDate(d.createdAt) ?? new Date(0),
    } satisfies CreditLedgerEntry;
  });

  const last = entries[entries.length - 1];
  return {
    entries,
    nextCursor: hasMore && last ? last.createdAt.toISOString() : null,
  };
}

/** Backwards-compatible single-page fetch. Prefer `getLedgerPage` for new code. */
export async function getRecentLedger(kidId: string, limit = 20): Promise<CreditLedgerEntry[]> {
  const page = await getLedgerPage(kidId, { limit });
  return page.entries;
}

interface SetKidSubscriptionInput {
  kidId: string;
  plan: UserPlan;
  razorpaySubscriptionId: string;
  planStatus: 'active' | 'canceled' | 'past_due' | 'trialing';
  /** When the current paid period ends (sub.current_end in seconds, ISO, or Date). */
  planRenewsAt?: Date | null;
  planExpiresAt?: Date | null;
}

/**
 * Write subscription state onto the kid doc. Used by the webhook handler
 * when subscription.activated / subscription.cancelled / subscription.charged
 * fires. Idempotent — repeated calls with the same payload are a no-op.
 *
 * Does NOT touch the credit pools. Pair with `grantMonthlyCredits` on
 * activation/charge if a fresh grant should land alongside.
 */
export async function setKidSubscription(input: SetKidSubscriptionInput): Promise<void> {
  const update: Record<string, unknown> = {
    plan: input.plan,
    razorpaySubscriptionId: input.razorpaySubscriptionId,
    planStatus: input.planStatus,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (input.planRenewsAt) update.planRenewsAt = Timestamp.fromDate(input.planRenewsAt);
  if (input.planExpiresAt) update.planExpiresAt = Timestamp.fromDate(input.planExpiresAt);
  await kidDocRef(input.kidId).set(update, { merge: true });
}

// ─── Writes ──────────────────────────────────────────────────────────────

interface DebitInput {
  kidId: string;
  amount: number; // positive — recorded as negative on the ledger
  feature: string;
  metadata?: Record<string, unknown>;
}

/**
 * Debit credits atomically. Drains the grant pool first so paid topups
 * survive monthly expiry. Throws `InsufficientCreditsError` if total
 * balance is too low — the model is never invoked when this throws.
 */
export async function debitCredits(input: DebitInput): Promise<{ balanceAfter: number; entryId: string }> {
  if (input.amount < 0) throw new Error('debitCredits expects a non-negative amount');
  if (input.amount === 0) return { balanceAfter: await getBalance(input.kidId), entryId: '' };

  const kidRef = kidDocRef(input.kidId);
  return adminDb.runTransaction(async (tx) => {
    const kidDoc = await tx.get(kidRef);
    const pools = readPools(kidDoc.exists ? (kidDoc.data() as Record<string, unknown>) : {});

    if (pools.total < input.amount) {
      throw new InsufficientCreditsError(input.amount, pools.total, input.feature);
    }

    const fromGrant = Math.min(pools.grant, input.amount);
    const fromTopup = input.amount - fromGrant;
    const next: Pools = {
      grant: pools.grant - fromGrant,
      topup: pools.topup - fromTopup,
      total: pools.total - input.amount,
    };

    const entryId = commitLedger(
      tx,
      kidRef,
      next,
      {
        type: 'debit',
        amount: -input.amount,
        balanceAfter: next.total,
        feature: input.feature,
        metadata: { ...(input.metadata ?? {}), fromGrant, fromTopup },
      },
      { creditsLastDebitAt: FieldValue.serverTimestamp() },
    );
    return { balanceAfter: next.total, entryId };
  });
}

interface RefundInput {
  kidId: string;
  amount: number; // positive — credited back to the topup pool
  feature: string;
  reason: string;
}

/**
 * Refund credits — e.g. a background book generation that produced nothing.
 * Credits land in the topup pool so they never expire (the kid lost them to a
 * failure they didn't cause). No-op for amount <= 0.
 */
export async function refundCredits(input: RefundInput): Promise<{ balanceAfter: number }> {
  if (input.amount <= 0) return { balanceAfter: await getBalance(input.kidId) };

  const kidRef = kidDocRef(input.kidId);
  return adminDb.runTransaction(async (tx) => {
    const kidDoc = await tx.get(kidRef);
    const pools = readPools(kidDoc.exists ? (kidDoc.data() as Record<string, unknown>) : {});
    const next: Pools = {
      grant: pools.grant,
      topup: pools.topup + input.amount,
      total: pools.total + input.amount,
    };
    commitLedger(tx, kidRef, next, {
      type: 'bonus',
      amount: input.amount,
      balanceAfter: next.total,
      feature: input.feature,
      metadata: { refund: true, reason: input.reason },
    });
    return { balanceAfter: next.total };
  });
}

interface GrantInput {
  kidId: string;
  plan: UserPlan;
  /** Override `PLANS[plan].creditsPerMonth` for promos. */
  amount?: number;
  /** Days until next expiry. Default 30. */
  cycleDays?: number;
}

/**
 * Award the monthly grant for `plan`. Zeroes the grant pool first (writing
 * an `expire` ledger entry for any remainder) — the topup pool is never
 * touched. Admin plan short-circuits to an unlimited sentinel.
 *
 * Not idempotent — callers schedule via `creditsMonthlyResetAt`, not by
 * calling this on every login.
 */
export async function grantMonthlyCredits(input: GrantInput): Promise<{ balanceAfter: number }> {
  const grantSize = input.amount ?? getPlan(input.plan).creditsPerMonth;

  // Admin / unlimited tier — park sentinel in topup pool so direct-debit
  // calls (bypassing the assertEntitled short-circuit) remain safe.
  if (!Number.isFinite(grantSize)) {
    await kidDocRef(input.kidId).set(
      {
        plan: input.plan,
        creditBalance: Number.MAX_SAFE_INTEGER,
        creditBalanceGrant: 0,
        creditBalanceTopup: Number.MAX_SAFE_INTEGER,
        creditsMonthlyGrantAmount: Number.MAX_SAFE_INTEGER,
        creditsMonthlyGrantedAt: FieldValue.serverTimestamp(),
        creditsMonthlyResetAt: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return { balanceAfter: Number.MAX_SAFE_INTEGER };
  }

  const nextReset = new Date(Date.now() + (input.cycleDays ?? 30) * 24 * 60 * 60 * 1000);
  const kidRef = kidDocRef(input.kidId);

  return adminDb.runTransaction(async (tx) => {
    const kidDoc = await tx.get(kidRef);
    const data = kidDoc.exists ? (kidDoc.data() as Record<string, unknown>) : {};
    const pools = readPools(data);

    // Expire whatever's left in the grant pool. Topup pool stays put.
    if (pools.grant > 0) {
      commitLedger(
        tx,
        kidRef,
        { grant: 0, topup: pools.topup, total: pools.topup },
        {
          type: 'expire',
          amount: -pools.grant,
          balanceAfter: pools.topup,
          metadata: {
            plan: input.plan,
            previousGrant: (data.creditsMonthlyGrantAmount as number) ?? 0,
          },
        },
      );
    }

    // Grant fresh into the grant pool.
    const next: Pools = { grant: grantSize, topup: pools.topup, total: grantSize + pools.topup };
    commitLedger(
      tx,
      kidRef,
      next,
      {
        type: 'grant',
        amount: grantSize,
        balanceAfter: next.total,
        expiresAt: Timestamp.fromDate(nextReset),
        metadata: { plan: input.plan },
      },
      {
        plan: input.plan,
        creditsMonthlyGrantAmount: grantSize,
        creditsMonthlyGrantedAt: FieldValue.serverTimestamp(),
        creditsMonthlyResetAt: Timestamp.fromDate(nextReset),
      },
    );

    return { balanceAfter: next.total };
  });
}

interface TopupInput {
  kidId: string;
  amount: number;
  paymentRef: string;
  paymentProvider?: 'razorpay' | 'stripe' | 'manual';
  metadata?: Record<string, unknown>;
}

/**
 * Add purchased credits to the topup pool. **Idempotent on `paymentRef`** —
 * Razorpay retries get a no-op response instead of double-credits. The
 * dedup query runs inside the transaction; no pre-tx check (which would
 * be a TOCTOU window).
 */
export async function addTopupCredits(
  input: TopupInput,
): Promise<{ balanceAfter: number; duplicate: boolean }> {
  if (input.amount <= 0) throw new Error('addTopupCredits expects a positive amount');

  const kidRef = kidDocRef(input.kidId);
  const ledgerCol = kidRef.collection(LEDGER);

  return adminDb.runTransaction(async (tx) => {
    const dup = await tx.get(ledgerCol.where('paymentRef', '==', input.paymentRef).limit(1));
    if (!dup.empty) {
      const kidDoc = await tx.get(kidRef);
      const balance = (kidDoc.data()?.creditBalance as number) ?? 0;
      return { balanceAfter: balance, duplicate: true };
    }

    const kidDoc = await tx.get(kidRef);
    const pools = readPools(kidDoc.exists ? (kidDoc.data() as Record<string, unknown>) : {});
    const next: Pools = {
      grant: pools.grant,
      topup: pools.topup + input.amount,
      total: pools.total + input.amount,
    };

    commitLedger(tx, kidRef, next, {
      type: 'topup',
      amount: input.amount,
      balanceAfter: next.total,
      paymentRef: input.paymentRef,
      paymentProvider: input.paymentProvider ?? 'razorpay',
      metadata: input.metadata ?? null,
    });
    return { balanceAfter: next.total, duplicate: false };
  });
}

interface BonusInput {
  kidId: string;
  amount: number;
  note: string;
  actorId: string;
}

/**
 * Admin-issued credit grant (support gestures, beta gifts). Lands in the
 * topup pool — admin gifts shouldn't expire.
 */
export async function addBonusCredits(input: BonusInput): Promise<{ balanceAfter: number }> {
  if (input.amount <= 0) throw new Error('addBonusCredits expects a positive amount');

  const kidRef = kidDocRef(input.kidId);
  return adminDb.runTransaction(async (tx) => {
    const kidDoc = await tx.get(kidRef);
    const pools = readPools(kidDoc.exists ? (kidDoc.data() as Record<string, unknown>) : {});
    const next: Pools = {
      grant: pools.grant,
      topup: pools.topup + input.amount,
      total: pools.total + input.amount,
    };

    commitLedger(tx, kidRef, next, {
      type: 'bonus',
      amount: input.amount,
      balanceAfter: next.total,
      paymentProvider: 'manual',
      metadata: { note: input.note, actorId: input.actorId },
    });
    return { balanceAfter: next.total };
  });
}
