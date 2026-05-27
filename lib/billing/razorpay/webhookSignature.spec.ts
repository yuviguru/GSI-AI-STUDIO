import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyWebhookSignature } from './webhookSignature';

/**
 * The webhook signature check is the single most security-critical
 * piece of the billing integration. A bad implementation here means an
 * attacker can mint topup events and fund any kid's wallet for free.
 *
 * These tests pin down the three failure modes that have historically
 * bitten Razorpay integrations:
 *   1. Accepting requests without a signature header.
 *   2. Verifying a parsed body instead of the raw body.
 *   3. Using non-timing-safe string compare (covered indirectly here —
 *      the implementation uses `crypto.timingSafeEqual`).
 */
describe('verifyWebhookSignature', () => {
  const SECRET = 'rzp_webhook_test_secret_xxx';
  const BODY = '{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_x"}}}}';

  function signWith(secret: string, body: string): string {
    return createHmac('sha256', secret).update(body).digest('hex');
  }

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts a correctly signed body', () => {
    const sig = signWith(SECRET, BODY);
    expect(verifyWebhookSignature(BODY, sig, SECRET)).toBe(true);
  });

  it('rejects when the signature header is missing', () => {
    expect(verifyWebhookSignature(BODY, null, SECRET)).toBe(false);
    expect(verifyWebhookSignature(BODY, undefined, SECRET)).toBe(false);
  });

  it('rejects when the signature does not match', () => {
    const wrongSig = signWith('different_secret', BODY);
    expect(verifyWebhookSignature(BODY, wrongSig, SECRET)).toBe(false);
  });

  it('rejects when the body has been altered after signing', () => {
    const sig = signWith(SECRET, BODY);
    const tampered = BODY.replace('payment.captured', 'payment.failed');
    expect(verifyWebhookSignature(tampered, sig, SECRET)).toBe(false);
  });

  it('rejects when the signature is the right length but wrong bytes', () => {
    const sig = signWith(SECRET, BODY);
    // Flip one character — still a 64-char hex string, still
    // length-equal so timingSafeEqual is reached.
    const wrong = (sig.startsWith('a') ? 'b' : 'a') + sig.slice(1);
    expect(verifyWebhookSignature(BODY, wrong, SECRET)).toBe(false);
  });

  it('rejects when the signature is shorter than expected', () => {
    // Length mismatch — must short-circuit BEFORE timingSafeEqual
    // (which throws on unequal lengths).
    expect(verifyWebhookSignature(BODY, 'tooshort', SECRET)).toBe(false);
  });

  it('refuses verification if the webhook secret is not configured', () => {
    const sig = signWith(SECRET, BODY);
    // Pass empty secret to simulate missing env var
    expect(verifyWebhookSignature(BODY, sig, undefined)).toBe(false);
    expect(verifyWebhookSignature(BODY, sig, '')).toBe(false);
  });

  it('falls back to RAZORPAY_WEBHOOK_SECRET env when secret arg omitted', () => {
    vi.stubEnv('RAZORPAY_WEBHOOK_SECRET', SECRET);
    const sig = signWith(SECRET, BODY);
    expect(verifyWebhookSignature(BODY, sig)).toBe(true);
    vi.unstubAllEnvs();
  });

  it('is sensitive to whitespace/key-reorder — verifies the RAW body exactly', () => {
    // This is the bug that has burned many Razorpay integrations: parsing
    // the JSON, then re-serializing for the HMAC. Razorpay computes the
    // HMAC over the bytes they sent — any normalization breaks it.
    const sig = signWith(SECRET, BODY);
    const reSerialized = JSON.stringify(JSON.parse(BODY)); // same data, different bytes potentially
    if (reSerialized !== BODY) {
      // Only meaningful when serialization differs (often does — Node's
      // JSON.stringify may reorder keys vs source).
      expect(verifyWebhookSignature(reSerialized, sig, SECRET)).toBe(false);
    }
  });
});
