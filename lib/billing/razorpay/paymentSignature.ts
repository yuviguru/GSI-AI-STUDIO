/**
 * Razorpay payment-signature verification (client callback path).
 *
 * After a successful payment, Razorpay's JS SDK invokes the `handler`
 * callback with three values:
 *
 *   - razorpay_payment_id  (pay_xxx)
 *   - razorpay_order_id    (order_xxx — the order we created server-side)
 *   - razorpay_signature   (HMAC-SHA256 of "order_id|payment_id" keyed by KEY_SECRET)
 *
 * The client POSTs all three to our verify endpoint; we recompute the
 * HMAC and credit the wallet only on a match. This is the
 * authoritative client-side confirmation path (the webhook is the
 * backup for cases where the client navigates away mid-flow).
 *
 * Distinct from webhookSignature.ts:
 *   - webhook signature  = HMAC of the entire raw request body
 *   - payment signature  = HMAC of `${order_id}|${payment_id}` only
 *
 * Both use HMAC-SHA256 but different inputs and different secrets:
 *   - webhook uses RAZORPAY_WEBHOOK_SECRET (set in dashboard per-webhook)
 *   - payment uses RAZORPAY_KEY_SECRET (the account-level secret)
 *
 * Mixing the two has been a real-world Razorpay integration bug; the
 * two are intentionally kept in separate modules with distinct
 * function names so a future reader can't conflate them.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verify a Razorpay payment signature returned by the JS checkout
 * handler. Never throws on bad input — returns false. Callers treat
 * false as a hard reject (HTTP 400) and refuse to credit the wallet.
 *
 * @param orderId    Razorpay order id (the one we created server-side).
 * @param paymentId  Razorpay payment id from the success callback.
 * @param signature  razorpay_signature from the success callback.
 * @param secret     Defaults to RAZORPAY_KEY_SECRET — DO NOT pass the
 *                   webhook secret here.
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string | null | undefined,
  secret: string | undefined = process.env.RAZORPAY_KEY_SECRET,
): boolean {
  if (!secret) {
    console.error('[razorpay-payment] RAZORPAY_KEY_SECRET is not set. Refusing to verify.');
    return false;
  }
  if (!orderId || !paymentId || !signature) return false;

  const expected = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(signature, 'utf8');
  if (expectedBuf.length !== actualBuf.length) return false;

  return timingSafeEqual(expectedBuf, actualBuf);
}
