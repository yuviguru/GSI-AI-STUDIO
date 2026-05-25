import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/billing/razorpay';
import { addTopupCredits } from '@/lib/billing';

/**
 * POST /api/billing/razorpay/webhook
 *
 * Razorpay → server callback. Receives `payment.captured`,
 * `payment.failed`, `refund.created`, and (eventually)
 * `subscription.*` events.
 *
 * Hard rules enforced here (every one a real-incident scenario):
 *
 *   1. **Verify the HMAC signature** against the RAW body before any
 *      JSON parse. A re-serialized JSON has different bytes and the
 *      HMAC will mismatch. Verification failure = 400, source IP
 *      logged. We DO NOT 200-OK an unverified webhook — Razorpay's
 *      retry behavior is for delivery failures, not silently
 *      accepting forgeries.
 *
 *   2. **Idempotent on Razorpay payment ID** (passed to
 *      `addTopupCredits` as `paymentRef`). A duplicate delivery from
 *      Razorpay's retry queue is a no-op, NOT a double-credit. The
 *      idempotency check lives inside `credits.ts` so it's a single
 *      source of truth for both webhooks and admin tools.
 *
 *   3. **Always 200 on verified events** even when business logic
 *      decides to skip (duplicate, no-op event type, missing notes
 *      field). Razorpay treats non-2xx as failure and retries — which
 *      we don't want once we've recorded the event. Failures are
 *      surfaced via console.error / Sentry, not the HTTP layer.
 *
 *   4. **Read raw body via `request.text()`** before any other I/O.
 *      Calling `request.json()` and then trying to re-stringify breaks
 *      the HMAC (key order isn't preserved).
 */

interface RazorpayWebhookEvent {
  event: string;
  payload: {
    payment?: {
      entity: {
        id: string;
        amount: number; // paise
        currency: string;
        status: string;
        order_id?: string;
        notes?: Record<string, string>;
      };
    };
    refund?: {
      entity: {
        id: string;
        payment_id: string;
        amount: number;
        status: string;
      };
    };
  };
}

export async function POST(request: NextRequest) {
  // ① Read the RAW body once — never parse before verification.
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature');

  if (!verifyWebhookSignature(rawBody, signature)) {
    const ip =
      request.headers.get('x-nf-client-connection-ip') ??
      request.headers.get('x-forwarded-for') ??
      'unknown';
    console.error(`[razorpay-webhook] Invalid signature from ${ip}`);
    return NextResponse.json(
      { received: false, error: 'invalid_signature' },
      { status: 400 },
    );
  }

  // ② Now safe to parse.
  let event: RazorpayWebhookEvent;
  try {
    event = JSON.parse(rawBody) as RazorpayWebhookEvent;
  } catch {
    return NextResponse.json(
      { received: false, error: 'invalid_json' },
      { status: 400 },
    );
  }

  // Dispatch. We always 200 from here on — handlers log on error.
  try {
    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event);
        break;
      case 'payment.failed':
        // Logged but no balance impact — we haven't credited yet, so
        // there's nothing to reverse. The kid's order remains pending
        // in Razorpay; they can retry checkout.
        console.warn(
          `[razorpay-webhook] payment.failed: ${event.payload.payment?.entity.id}`,
        );
        break;
      case 'refund.created':
        // Phase 3.5 — credit reversal flow. For now, log so finance can
        // reconcile manually.
        console.warn(
          `[razorpay-webhook] refund.created: ${event.payload.refund?.entity.id} (not yet auto-reversed)`,
        );
        break;
      default:
        // Subscription events, mandate events, etc. — not yet wired.
        // Returning 200 prevents Razorpay from retrying.
        break;
    }
  } catch (err) {
    // Don't 500 — Razorpay would retry, possibly multiplying side
    // effects. Surface to monitoring instead and acknowledge.
    console.error('[razorpay-webhook] Handler threw:', err);
  }

  return NextResponse.json({ received: true });
}

/**
 * Credit the kid's wallet when a topup payment is captured. Idempotent
 * via `paymentRef` (Razorpay payment ID) — duplicate webhook deliveries
 * are no-ops, not double-credits. See `credits.ts:addTopupCredits` for
 * the transactional implementation.
 */
async function handlePaymentCaptured(event: RazorpayWebhookEvent): Promise<void> {
  const payment = event.payload.payment?.entity;
  if (!payment) {
    console.error('[razorpay-webhook] payment.captured missing payment payload');
    return;
  }

  const notes = payment.notes ?? {};
  const kidId = notes.kidId;
  const purpose = notes.purpose;
  const credits = Number(notes.credits ?? 0);

  if (!kidId) {
    console.error(
      `[razorpay-webhook] payment.captured ${payment.id} missing kidId in notes — cannot credit. Will need manual reconciliation.`,
    );
    return;
  }

  if (purpose === 'topup') {
    if (!Number.isFinite(credits) || credits <= 0) {
      console.error(
        `[razorpay-webhook] payment.captured ${payment.id} has invalid credits in notes: ${notes.credits}`,
      );
      return;
    }

    const result = await addTopupCredits({
      kidId,
      amount: credits,
      paymentRef: payment.id,
      paymentProvider: 'razorpay',
      metadata: {
        orderId: payment.order_id,
        amountPaise: payment.amount,
        currency: payment.currency,
        topupSku: notes.topupSku,
      },
    });

    if (result.duplicate) {
      // Idempotency caught a retry — fine, just log for visibility.
      console.info(
        `[razorpay-webhook] payment.captured ${payment.id} for kid ${kidId} was a duplicate (idempotent no-op). Balance still ${result.balanceAfter}.`,
      );
    } else {
      console.info(
        `[razorpay-webhook] topup OK: kid ${kidId} +${credits} credits → balance ${result.balanceAfter} (paymentRef=${payment.id})`,
      );
    }
    return;
  }

  // Other purposes (plan_upgrade) will hit here once subscription flows
  // ship. For now, log so we don't silently drop a successful payment.
  console.warn(
    `[razorpay-webhook] payment.captured ${payment.id} has purpose '${purpose}' which is not yet implemented. Manual reconciliation required.`,
  );
}
