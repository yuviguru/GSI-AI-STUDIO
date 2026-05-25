/**
 * Razorpay webhook signature verification.
 *
 * Razorpay sends an `X-Razorpay-Signature` header on every webhook
 * delivery: an HMAC-SHA256 of the raw request body, keyed by the
 * webhook secret you set in the Razorpay dashboard. The verification
 * rule is documented at
 * https://razorpay.com/docs/webhooks/validate-test/.
 *
 * Three things this module enforces (each a real-world incident waiting
 * to happen if skipped):
 *
 *   1. Timing-safe compare via `crypto.timingSafeEqual`. A `===` compare
 *      leaks one byte at a time through response timing, letting an
 *      attacker reconstruct the signature in microseconds.
 *
 *   2. Verify against the RAW body — `req.text()` BEFORE any
 *      `JSON.parse`. Re-serializing parsed JSON reorders keys and the
 *      HMAC fails. Razorpay sends the body as it computed the HMAC; we
 *      must hash exactly what they hashed.
 *
 *   3. The webhook secret is `RAZORPAY_WEBHOOK_SECRET` — a separate
 *      secret from `RAZORPAY_KEY_SECRET`. Mixing them up is a common
 *      bug. See ./client.ts.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verify a Razorpay webhook signature.
 *
 * @param rawBody     The exact bytes of the request body. Must be read
 *                    via `request.text()` (Next.js) or equivalent before
 *                    any parsing.
 * @param signature   Value of the `X-Razorpay-Signature` header.
 * @param secret      The webhook-specific secret from the Razorpay
 *                    dashboard. Defaults to `RAZORPAY_WEBHOOK_SECRET`.
 * @returns true on match, false on mismatch / malformed header.
 *
 * Never throws on bad input — returns false. Callers should treat false
 * as a hard reject (HTTP 400) and log the source IP for audit.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string | undefined = process.env.RAZORPAY_WEBHOOK_SECRET,
): boolean {
  if (!secret) {
    // Logged at startup separately — never silently accept when the
    // secret is missing. Returning false makes the route reject the
    // webhook (which Razorpay retries, surfacing the misconfiguration).
    console.error(
      '[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET is not set. Refusing to verify.',
    );
    return false;
  }
  if (!signature) return false;

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

  // timingSafeEqual requires equal-length buffers.
  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(signature, 'utf8');
  if (expectedBuf.length !== actualBuf.length) return false;

  return timingSafeEqual(expectedBuf, actualBuf);
}
