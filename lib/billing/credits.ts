/**
 * Credit ledger — read/write the source-of-truth subcollection plus the
 * `kid.creditBalance` denormalized cache, atomically.
 *
 * Invariants enforced here:
 *   1. Every balance mutation writes both the kid doc field AND a ledger
 *      entry in the SAME Firestore transaction. The cache never drifts
 *      mid-write.
 *   2. Ledger entries are append-only. No `update` or `delete` is exported
 *      from this module — corrections are new entries (`refund`, `bonus`,
 *      `expire`).
 *   3. Debits re-read the balance inside the transaction (TOCTOU defense).
 *   4. Topups are idempotent on `paymentRef` — a duplicate Razorpay webhook
 *      delivery is a no-op, not a double-credit.
 *
 * Read patterns:
 *   `getBalance(kidId)` reads the cache directly (1 doc, ~10ms).
 *   `getRecentLedger(kidId, n)` reads the subcollection (1 query, ~30ms).
 *
 * Write patterns: ALL via transaction. No fire-and-forget writes.
 */

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@gsi/firebase';
import type { CreditLedgerEntry, UserPlan } from '@gsi/types';
import { getPlan } from './plans';

const KIDS_COLLECTION = 'kids';
const LEDGER_SUBCOLLECTION = 'creditLedger';

/** ── Error types ───────────────────────────────────────────────────────── */

export class InsufficientCreditsError extends Error {
  readonly code = 'INSUFFICIENT_CREDITS';
  readonly status = 402;
  readonly required: number;
  readonly available: number;
  readonly feature?: string;
  constructor(args: { required: number; available: number; feature?: string }) {
    super(`Need ${args.required} credits, have ${args.available}.`);
    this.required = args.required;
    this.available = args.available;
    this.feature = args.feature;
  }
}

/** ── Balance reads ─────────────────────────────────────────────────────── */

export interface CreditSnapshot {
  kidId: string;
  plan: UserPlan;
  balance: number;
  /**
   * The grant + topup split that backs `balance`. Topup credits never
   * expire; the grant pool is zeroed at each monthly cycle (see
   * `grantMonthlyCredits`). Debits draw from grant first so paid topups
   * are spent last.
   */
  balanceGrant: number;
  balanceTopup: number;
  monthlyGrantAmount: number;
  monthlyGrantedAt: Date | null;
  monthlyResetAt: Date | null;
  lastDebitAt: Date | null;
}

function tsToDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

/**
 * Extract the per-pool credit balances from a kid-doc data blob.
 *
 * Backwards-compatible default for legacy docs (pre-two-pool migration):
 * a doc that has `creditBalance` set but no per-pool fields is treated as
 * **all topup** — never-expiring. This is the kid-friendly default: a
 * legacy balance was already in their wallet, so we don't want a renewal
 * to suddenly expire it. New writes always populate both pools.
 */
function readPools(data: Record<string, unknown>): { grant: number; topup: number; total: number } {
  const grantRaw = data.creditBalanceGrant;
  const topupRaw = data.creditBalanceTopup;
  const totalRaw = (data.creditBalance as number) ?? 0;

  if (typeof grantRaw === 'number' || typeof topupRaw === 'number') {
    const grant = (grantRaw as number) ?? 0;
    const topup = (topupRaw as number) ?? 0;
    return { grant, topup, total: grant + topup };
  }

  // Legacy doc: only `creditBalance` is set. Treat as all-topup so a
  // subsequent expiry doesn't zero credits the kid never bought but had
  // sitting in the cache from before the migration.
  return { grant: 0, topup: totalRaw, total: totalRaw };
}

/**
 * Read the current credit balance + plan + monthly cycle metadata. Returns
 * a zero-balance snapshot for kids that don't have a billing record yet
 * (don't throw — callers want a default they can render).
 */
export async function getCreditSnapshot(kidId: string): Promise<CreditSnapshot> {
  const kidRef = adminDb.collection(KIDS_COLLECTION).doc(kidId);
  const snap = await kidRef.get();
  const data = snap.exists ? (snap.data() as Record<string, unknown>) : {};

  const plan = (data.plan as UserPlan) ?? 'free';
  const pools = readPools(data);
  return {
    kidId,
    plan,
    balance: pools.total,
    balanceGrant: pools.grant,
    balanceTopup: pools.topup,
    monthlyGrantAmount: (data.creditsMonthlyGrantAmount as number) ?? 0,
    monthlyGrantedAt: tsToDate(data.creditsMonthlyGrantedAt),
    monthlyResetAt: tsToDate(data.creditsMonthlyResetAt),
    lastDebitAt: tsToDate(data.creditsLastDebitAt),
  };
}

/** Convenience: just the balance number. */
export async function getBalance(kidId: string): Promise<number> {
  const snap = await getCreditSnapshot(kidId);
  return snap.balance;
}

/** Recent ledger entries for transaction history UI. Default 20, capped at 100. */
export async function getRecentLedger(kidId: string, limit = 20): Promise<CreditLedgerEntry[]> {
  const n = Math.max(1, Math.min(100, limit));
  const query = await adminDb
    .collection(KIDS_COLLECTION)
    .doc(kidId)
    .collection(LEDGER_SUBCOLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(n)
    .get();

  return query.docs.map((doc) => {
    const d = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      type: d.type as CreditLedgerEntry['type'],
      amount: d.amount as number,
      balanceAfter: d.balanceAfter as number,
      feature: d.feature as string | undefined,
      paymentRef: d.paymentRef as string | undefined,
      paymentProvider: d.paymentProvider as CreditLedgerEntry['paymentProvider'],
      expiresAt: tsToDate(d.expiresAt) ?? undefined,
      metadata: d.metadata as Record<string, unknown> | undefined,
      reversedBy: d.reversedBy as string | undefined,
      createdAt: tsToDate(d.createdAt) ?? new Date(0),
    };
  });
}

/** ── Writes ────────────────────────────────────────────────────────────── */

interface DebitInput {
  kidId: string;
  amount: number; // POSITIVE — we record it as negative on the ledger
  feature: string;
  metadata?: Record<string, unknown>;
}

interface DebitResult {
  balanceAfter: number;
  entryId: string;
}

/**
 * Atomically debit `amount` credits from the kid, writing a `debit` ledger
 * entry in the same transaction. Throws `InsufficientCreditsError` if the
 * balance is too low — the model is never invoked when this throws.
 *
 * Note: `amount` is passed as a positive number, but stored as negative on
 * the ledger entry's `amount` field (sign convention: ledger amounts are
 * the delta to balance).
 */
export async function debitCredits(input: DebitInput): Promise<DebitResult> {
  if (input.amount < 0) {
    throw new Error('debitCredits expects a non-negative amount');
  }
  if (input.amount === 0) {
    // Cost-zero feature (e.g. a free X-Ray pass) — nothing to do, but we
    // still need a sane return so callers don't branch.
    const balance = await getBalance(input.kidId);
    return { balanceAfter: balance, entryId: '' };
  }

  const kidRef = adminDb.collection(KIDS_COLLECTION).doc(input.kidId);
  const ledgerRef = kidRef.collection(LEDGER_SUBCOLLECTION).doc();

  return adminDb.runTransaction(async (tx) => {
    const kidDoc = await tx.get(kidRef);
    const data = kidDoc.exists ? (kidDoc.data() as Record<string, unknown>) : {};
    const pools = readPools(data);

    if (pools.total < input.amount) {
      throw new InsufficientCreditsError({
        required: input.amount,
        available: pools.total,
        feature: input.feature,
      });
    }

    // Drain grant first — paid topups are spent last so the monthly
    // cycle expiry never burns purchased credits.
    const fromGrant = Math.min(pools.grant, input.amount);
    const fromTopup = input.amount - fromGrant;
    const newGrant = pools.grant - fromGrant;
    const newTopup = pools.topup - fromTopup;
    const balanceAfter = newGrant + newTopup;

    // `set` with merge (not `update`) so a brand-new kid doc — created
    // implicitly by an admin grant or a bypass-debug debit — also works.
    tx.set(
      kidRef,
      {
        creditBalance: balanceAfter,
        creditBalanceGrant: newGrant,
        creditBalanceTopup: newTopup,
        creditsLastDebitAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    tx.set(ledgerRef, {
      type: 'debit',
      amount: -input.amount,
      balanceAfter,
      feature: input.feature,
      metadata: {
        ...(input.metadata ?? {}),
        fromGrant,
        fromTopup,
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    return { balanceAfter, entryId: ledgerRef.id };
  });
}

interface GrantInput {
  kidId: string;
  plan: UserPlan;
  /** Override `PLANS[plan].creditsPerMonth` for promos. Optional. */
  amount?: number;
  /** Days until expiration. Default 30. */
  cycleDays?: number;
}

/**
 * Award the monthly grant for `plan`. If the kid had a previous grant with
 * unspent credits, those expire in this same transaction (one `expire`
 * entry + one `grant` entry). **Topup credits are preserved** — only the
 * `creditBalanceGrant` pool is zeroed, never `creditBalanceTopup`.
 *
 * `amount = Infinity` (admin plan) short-circuits: the kid is marked
 * unlimited and no ledger entry is written.
 *
 * Idempotency: callers should check `getCreditSnapshot().monthlyResetAt`
 * before calling and skip if not yet due. This function will happily grant
 * again if called twice — which is what you want for the manual admin
 * "force-renew" path, but not for the cron job.
 */
export async function grantMonthlyCredits(input: GrantInput): Promise<{ balanceAfter: number }> {
  const plan = getPlan(input.plan);
  const grantSize = input.amount ?? plan.creditsPerMonth;

  // Admin / unlimited tier — no metering. Set a sentinel and bail.
  //
  // Uses `set(..., { merge: true })` instead of `update(...)` because the
  // latter throws `not-found` on a kid doc that doesn't exist yet. The
  // first-ever admin grant on a brand-new kid would otherwise fail.
  if (!Number.isFinite(grantSize)) {
    const kidRef = adminDb.collection(KIDS_COLLECTION).doc(input.kidId);
    await kidRef.set(
      {
        plan: input.plan,
        // Park the unlimited sentinel in the topup pool so it never expires.
        // Direct debit calls (bypassing the assertEntitled short-circuit)
        // remain safe with massive headroom.
        creditBalance: Number.MAX_SAFE_INTEGER,
        creditBalanceGrant: 0,
        creditBalanceTopup: Number.MAX_SAFE_INTEGER,
        creditsMonthlyGrantAmount: Number.MAX_SAFE_INTEGER,
        creditsMonthlyGrantedAt: FieldValue.serverTimestamp(),
        // No reset — admin doesn't expire.
        creditsMonthlyResetAt: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return { balanceAfter: Number.MAX_SAFE_INTEGER };
  }

  const cycleDays = input.cycleDays ?? 30;
  const nextReset = new Date(Date.now() + cycleDays * 24 * 60 * 60 * 1000);

  const kidRef = adminDb.collection(KIDS_COLLECTION).doc(input.kidId);
  const expireRef = kidRef.collection(LEDGER_SUBCOLLECTION).doc();
  const grantRef = kidRef.collection(LEDGER_SUBCOLLECTION).doc();

  return adminDb.runTransaction(async (tx) => {
    const kidDoc = await tx.get(kidRef);
    const data = kidDoc.exists ? (kidDoc.data() as Record<string, unknown>) : {};
    const pools = readPools(data);

    // Step 1: zero the grant pool. Whatever was left there is the
    // expiring amount. The topup pool is untouched — paid credits never
    // expire (this is the invariant Codex flagged in the original
    // single-pool design).
    const expireAmount = pools.grant;
    const balanceAfterExpire = pools.topup;

    if (expireAmount > 0) {
      tx.set(expireRef, {
        type: 'expire',
        amount: -expireAmount,
        balanceAfter: balanceAfterExpire,
        metadata: {
          plan: input.plan,
          previousGrant: (data.creditsMonthlyGrantAmount as number) ?? 0,
        },
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    // Step 2: write the new grant into the grant pool.
    const newGrant = grantSize;
    const newTopup = pools.topup;
    const balanceAfter = newGrant + newTopup;

    tx.set(grantRef, {
      type: 'grant',
      amount: grantSize,
      balanceAfter,
      expiresAt: Timestamp.fromDate(nextReset),
      metadata: { plan: input.plan },
      createdAt: FieldValue.serverTimestamp(),
    });

    tx.set(
      kidRef,
      {
        plan: input.plan,
        creditBalance: balanceAfter,
        creditBalanceGrant: newGrant,
        creditBalanceTopup: newTopup,
        creditsMonthlyGrantAmount: grantSize,
        creditsMonthlyGrantedAt: FieldValue.serverTimestamp(),
        creditsMonthlyResetAt: Timestamp.fromDate(nextReset),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { balanceAfter };
  });
}

interface TopupInput {
  kidId: string;
  amount: number;
  paymentRef: string; // Razorpay payment ID, or admin op ID for `bonus`
  paymentProvider?: 'razorpay' | 'stripe' | 'manual';
  metadata?: Record<string, unknown>;
}

/**
 * Add purchased credits to a kid (Razorpay webhook handler path).
 *
 * **Idempotent on `paymentRef`** — a duplicate webhook delivery is a no-op
 * that returns the current balance, NOT a double-credit. This is the
 * primary defense against Razorpay's retry behavior.
 */
export async function addTopupCredits(
  input: TopupInput,
): Promise<{ balanceAfter: number; duplicate: boolean }> {
  if (input.amount <= 0) {
    throw new Error('addTopupCredits expects a positive amount');
  }

  const kidRef = adminDb.collection(KIDS_COLLECTION).doc(input.kidId);
  const ledgerRef = kidRef.collection(LEDGER_SUBCOLLECTION);

  // Idempotency check before the tx — cheap, and if it duplicates a write
  // we still catch it inside the tx via a paymentRef query.
  const dupQuery = await ledgerRef.where('paymentRef', '==', input.paymentRef).limit(1).get();
  if (!dupQuery.empty) {
    const snap = await kidRef.get();
    const balance = (snap.data()?.creditBalance as number) ?? 0;
    return { balanceAfter: balance, duplicate: true };
  }

  const topupRef = ledgerRef.doc();

  return adminDb.runTransaction(async (tx) => {
    // Re-check inside tx — defends against racing webhook retries.
    const dupSnap = await tx.get(ledgerRef.where('paymentRef', '==', input.paymentRef).limit(1));
    if (!dupSnap.empty) {
      const kidDoc = await tx.get(kidRef);
      const balance = (kidDoc.data()?.creditBalance as number) ?? 0;
      return { balanceAfter: balance, duplicate: true };
    }

    const kidDoc = await tx.get(kidRef);
    const data = kidDoc.exists ? (kidDoc.data() as Record<string, unknown>) : {};
    const pools = readPools(data);

    // Topups land in the never-expiring pool.
    const newTopup = pools.topup + input.amount;
    const balanceAfter = pools.grant + newTopup;

    tx.set(topupRef, {
      type: 'topup',
      amount: input.amount,
      balanceAfter,
      paymentRef: input.paymentRef,
      paymentProvider: input.paymentProvider ?? 'razorpay',
      metadata: input.metadata ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(
      kidRef,
      {
        creditBalance: balanceAfter,
        creditBalanceGrant: pools.grant,
        creditBalanceTopup: newTopup,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { balanceAfter, duplicate: false };
  });
}

interface BonusInput {
  kidId: string;
  amount: number;
  note: string;
  actorId: string; // admin uid who issued the bonus
}

/**
 * Admin-issued credit grant. Use for support gestures, beta access, or
 * manual reimbursements (not Razorpay-backed — for those, write a `refund`
 * via the webhook handler).
 *
 * Bonus credits land in the **topup pool** (never expire) — admin gifts
 * shouldn't disappear at the next monthly cycle. Same semantics as a
 * paid topup, just without a `paymentRef`.
 */
export async function addBonusCredits(input: BonusInput): Promise<{ balanceAfter: number }> {
  if (input.amount <= 0) {
    throw new Error('addBonusCredits expects a positive amount');
  }

  const kidRef = adminDb.collection(KIDS_COLLECTION).doc(input.kidId);
  const bonusRef = kidRef.collection(LEDGER_SUBCOLLECTION).doc();

  return adminDb.runTransaction(async (tx) => {
    const kidDoc = await tx.get(kidRef);
    const data = kidDoc.exists ? (kidDoc.data() as Record<string, unknown>) : {};
    const pools = readPools(data);
    const newTopup = pools.topup + input.amount;
    const balanceAfter = pools.grant + newTopup;

    tx.set(bonusRef, {
      type: 'bonus',
      amount: input.amount,
      balanceAfter,
      paymentProvider: 'manual',
      metadata: { note: input.note, actorId: input.actorId },
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(
      kidRef,
      {
        creditBalance: balanceAfter,
        creditBalanceGrant: pools.grant,
        creditBalanceTopup: newTopup,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { balanceAfter };
  });
}
