/**
 * Anonymous device-bound credits.
 *
 * Anonymous callers don't have a `kid` doc, so the per-kid wallet
 * (`kids/{kidId}/creditLedger`) doesn't apply. Without any cap they
 * could create indefinitely until they sign up.
 *
 * Instead, we key a small trial wallet to the device's hashed IP:
 *
 *   deviceCredits/{ipHash}
 *     - balance: number          (atomic debit guarded by a transaction)
 *     - createdAt: Timestamp
 *     - lastDebitAt: Timestamp | null
 *     - lifetimeDebits: number   (telemetry — how many anon creations this device made)
 *
 * Survives localStorage clears (server-side, not bound to session id).
 *
 * Limitations we accept for v1:
 *   - Mobile IPs change (NAT, network handoff) → some leakage. A
 *     determined attacker can hop networks. Acceptable for an MVP cap.
 *   - Families on the same router share the trial bucket. Once any of
 *     them signs in, they get their own kid wallet and stop sharing.
 *   - We don't combine with browser fingerprint — could be added if abuse
 *     becomes a real signal.
 *
 * Initial grant: `DEVICE_CREDITS_INITIAL_BALANCE` env (default 10 — ~2
 * stories, ~5 quizzes). Enough for a kid to feel the product before
 * sign-up; small enough that someone who finishes is genuinely curious.
 */

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@gsi/firebase';
import { InsufficientCreditsError } from './credits';

const DEVICE_CREDITS_COLLECTION = 'deviceCredits';

function getInitialBalance(): number {
  const raw = process.env.DEVICE_CREDITS_INITIAL_BALANCE;
  if (!raw) return 10;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 10;
}

export interface DeviceCreditSnapshot {
  ipHash: string;
  balance: number;
  initialBalance: number;
  lifetimeDebits: number;
  createdAt: Date | null;
  lastDebitAt: Date | null;
}

function tsToDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

/** Read a device's trial balance. Returns the default initial balance for
 *  unseen IPs without creating a doc — the doc materializes on first debit. */
export async function getDeviceCreditSnapshot(ipHash: string): Promise<DeviceCreditSnapshot> {
  const snap = await adminDb.collection(DEVICE_CREDITS_COLLECTION).doc(ipHash).get();
  const initial = getInitialBalance();
  if (!snap.exists) {
    return {
      ipHash,
      balance: initial,
      initialBalance: initial,
      lifetimeDebits: 0,
      createdAt: null,
      lastDebitAt: null,
    };
  }
  const d = snap.data() as Record<string, unknown>;
  return {
    ipHash,
    balance: (d.balance as number) ?? initial,
    initialBalance: (d.initialBalance as number) ?? initial,
    lifetimeDebits: (d.lifetimeDebits as number) ?? 0,
    createdAt: tsToDate(d.createdAt),
    lastDebitAt: tsToDate(d.lastDebitAt),
  };
}

interface DeviceDebitInput {
  ipHash: string;
  amount: number;
  feature: string;
}

/**
 * Atomically debit anonymous trial credits. Mints the device doc on
 * first debit at the configured initial balance, then deducts.
 *
 * Throws `InsufficientCreditsError` so callers can render the same
 * "out of credits → sign up to get more" UI as the per-kid path.
 */
export async function debitDeviceCredits(
  input: DeviceDebitInput,
): Promise<{ balanceAfter: number }> {
  if (input.amount < 0) throw new Error('debitDeviceCredits expects a non-negative amount');
  if (input.amount === 0) {
    const snap = await getDeviceCreditSnapshot(input.ipHash);
    return { balanceAfter: snap.balance };
  }

  const ref = adminDb.collection(DEVICE_CREDITS_COLLECTION).doc(input.ipHash);
  const initial = getInitialBalance();

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const exists = snap.exists;
    const data = exists ? (snap.data() as Record<string, unknown>) : {};
    const balance = exists ? ((data.balance as number) ?? initial) : initial;
    const lifetime = exists ? ((data.lifetimeDebits as number) ?? 0) : 0;

    if (balance < input.amount) {
      throw new InsufficientCreditsError(input.amount, balance, input.feature);
    }

    const balanceAfter = balance - input.amount;

    tx.set(
      ref,
      {
        balance: balanceAfter,
        initialBalance: (data.initialBalance as number) ?? initial,
        lifetimeDebits: lifetime + input.amount,
        lastDebitAt: FieldValue.serverTimestamp(),
        ...(exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      },
      { merge: true },
    );

    return { balanceAfter };
  });
}

/**
 * Admin override: reset a device's trial wallet (e.g. for support after
 * a refund or to clear false positives). Sets the balance back to the
 * configured initial value.
 */
export async function resetDeviceCredits(ipHash: string): Promise<void> {
  const initial = getInitialBalance();
  await adminDb.collection(DEVICE_CREDITS_COLLECTION).doc(ipHash).set(
    {
      balance: initial,
      initialBalance: initial,
      lifetimeDebits: 0,
      lastDebitAt: FieldValue.delete(),
      resetAt: Timestamp.now(),
    },
    { merge: true },
  );
}
