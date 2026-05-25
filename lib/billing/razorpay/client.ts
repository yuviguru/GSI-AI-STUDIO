/**
 * Razorpay client wrapper.
 *
 * Why a thin wrapper around the official SDK:
 * - Test seam — every call here is mockable in spec files without
 *   reaching the network.
 * - Env-driven config — production keys live in Netlify env vars;
 *   dev uses `rzp_test_*` keys.
 * - Lazy init — the Razorpay SDK reads env vars at construction. We
 *   defer instantiation until first use so module load doesn't crash
 *   when env is missing (e.g. CI without RAZORPAY_KEY_ID).
 *
 * Razorpay docs: https://razorpay.com/docs/api/
 *
 * Env vars expected:
 *   RAZORPAY_KEY_ID         — public key id (rzp_test_xxx or rzp_live_xxx)
 *   RAZORPAY_KEY_SECRET     — server-side secret. Never log; never ship to client.
 *   RAZORPAY_WEBHOOK_SECRET — separate secret for webhook signature verification
 *                             (see ./webhookSignature.ts).
 *
 * The webhook secret is set per-webhook in the Razorpay dashboard — it
 * is NOT the same as RAZORPAY_KEY_SECRET. Treating them as one was a
 * common bug in past integrations.
 */

import Razorpay from 'razorpay';

let cachedClient: Razorpay | null = null;

/**
 * Returns a singleton Razorpay client. Reads env vars on first call.
 * Throws a clear error if either RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET
 * is missing — better to fail fast at the first request than to ship
 * unsigned orders.
 */
export function getRazorpayClient(): Razorpay {
  if (cachedClient) return cachedClient;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in env. ' +
        'For local dev, use the rzp_test_* keys from the Razorpay dashboard.',
    );
  }

  cachedClient = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return cachedClient;
}

/**
 * Get the public key ID that the client-side checkout sheet needs.
 * Safe to expose to the browser — that's its purpose. Throws if unset
 * so we never hand the client an undefined key.
 */
export function getRazorpayPublicKey(): string {
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) {
    throw new Error(
      'RAZORPAY_KEY_ID is not set. The checkout sheet cannot open without a publishable key.',
    );
  }
  return keyId;
}

/**
 * Test-only: reset the cached client so spec files can re-stub env vars
 * between tests. NOT for production code.
 */
export function __resetRazorpayClientForTests(): void {
  cachedClient = null;
}

/** Args for `createOrder`. */
export interface CreateOrderInput {
  /** Amount in INR (rupees). We convert to paise (×100) internally. */
  amountInr: number;
  /** Short receipt label visible in the Razorpay dashboard. */
  receipt: string;
  /**
   * Free-form metadata stored on the order. The webhook reads this back
   * to know what the kid was buying. Razorpay caps notes to 15 keys,
   * 256 bytes each — keep it lean.
   */
  notes: Record<string, string>;
}

export interface RazorpayOrder {
  id: string;
  amount: number; // paise
  currency: string;
  receipt?: string;
  status: string;
  notes?: Record<string, string>;
}

/**
 * Create a Razorpay order. The order ID is what the client-side
 * checkout sheet consumes — without an order, the checkout can't open.
 *
 * Always uses INR. Add currency support in a future iteration if we
 * onboard non-Indian customers.
 */
export async function createOrder(input: CreateOrderInput): Promise<RazorpayOrder> {
  if (input.amountInr <= 0) {
    throw new Error('Order amount must be positive');
  }
  const client = getRazorpayClient();
  const created = await client.orders.create({
    amount: Math.round(input.amountInr * 100), // paise
    currency: 'INR',
    receipt: input.receipt,
    notes: input.notes,
    // payment_capture default is 1 (auto-capture) which is what we want —
    // no manual reconciliation needed.
  });
  return {
    id: created.id,
    amount: typeof created.amount === 'number' ? created.amount : Number(created.amount),
    currency: created.currency,
    receipt: created.receipt ?? undefined,
    status: created.status,
    notes: (created.notes as Record<string, string>) ?? undefined,
  };
}
