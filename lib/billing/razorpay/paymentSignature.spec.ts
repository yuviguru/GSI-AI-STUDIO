import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyPaymentSignature } from './paymentSignature';

/**
 * The payment-signature check is the authoritative confirmation path
 * for client-side payment success. A wrong implementation here either
 * lets attackers mint topups (false positive) or loses real payments
 * to legitimate users (false negative). Pin down the algorithm tight.
 */
describe('verifyPaymentSignature', () => {
  const SECRET = 'rzp_test_secret_xxx';
  const ORDER = 'order_xxx';
  const PAYMENT = 'pay_yyy';

  function sign(secret: string, payload: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts the correct HMAC over "orderId|paymentId"', () => {
    const sig = sign(SECRET, `${ORDER}|${PAYMENT}`);
    expect(verifyPaymentSignature(ORDER, PAYMENT, sig, SECRET)).toBe(true);
  });

  it('rejects when payload bytes differ (e.g. orderId swapped)', () => {
    const sig = sign(SECRET, `${ORDER}|${PAYMENT}`);
    expect(verifyPaymentSignature('order_DIFFERENT', PAYMENT, sig, SECRET)).toBe(false);
  });

  it('rejects when secret differs', () => {
    const sig = sign('different_secret', `${ORDER}|${PAYMENT}`);
    expect(verifyPaymentSignature(ORDER, PAYMENT, sig, SECRET)).toBe(false);
  });

  it('rejects empty / missing signature', () => {
    expect(verifyPaymentSignature(ORDER, PAYMENT, null, SECRET)).toBe(false);
    expect(verifyPaymentSignature(ORDER, PAYMENT, undefined, SECRET)).toBe(false);
    expect(verifyPaymentSignature(ORDER, PAYMENT, '', SECRET)).toBe(false);
  });

  it('rejects empty orderId or paymentId (degenerate payloads)', () => {
    const validSig = sign(SECRET, `|`);
    expect(verifyPaymentSignature('', '', validSig, SECRET)).toBe(false);
  });

  it('rejects length-mismatched signatures (short-circuit before timingSafeEqual)', () => {
    expect(verifyPaymentSignature(ORDER, PAYMENT, 'shorter', SECRET)).toBe(false);
  });

  it('refuses to verify when KEY_SECRET is unset — logs but never throws', () => {
    const sig = sign(SECRET, `${ORDER}|${PAYMENT}`);
    expect(verifyPaymentSignature(ORDER, PAYMENT, sig, undefined)).toBe(false);
    expect(verifyPaymentSignature(ORDER, PAYMENT, sig, '')).toBe(false);
  });

  it('falls back to RAZORPAY_KEY_SECRET env when secret arg omitted', () => {
    vi.stubEnv('RAZORPAY_KEY_SECRET', SECRET);
    const sig = sign(SECRET, `${ORDER}|${PAYMENT}`);
    expect(verifyPaymentSignature(ORDER, PAYMENT, sig)).toBe(true);
    vi.unstubAllEnvs();
  });

  it('is distinct from the webhook HMAC — a webhook signature DOES NOT verify here', () => {
    // The webhook hashes the whole body; this verifier hashes only
    // "orderId|paymentId". Confusing the two is a known integration
    // bug — pin down that they cannot accidentally cross-verify.
    const webhookBody = '{"event":"payment.captured"}';
    const webhookSig = sign(SECRET, webhookBody);
    expect(verifyPaymentSignature(ORDER, PAYMENT, webhookSig, SECRET)).toBe(false);
  });
});
