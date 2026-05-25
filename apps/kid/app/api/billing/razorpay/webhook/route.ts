import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/billing/razorpay';
import { addTopupCredits } from '@/lib/billing';

/**
 * POST /api/billing/razorpay/webhook — Razorpay → server callback.
 *
 * Invariants enforced here (each is a real incident waiting to happen):
 *   1. HMAC verify against the RAW body before any JSON.parse.
 *   2. Idempotent on Razorpay payment ID (via `addTopupCredits`'s
 *      paymentRef dedup).
 *   3. Always 200 on a verified event so Razorpay doesn't retry.
 *      Unverified events get 400 + source-IP log.
 *
 * TODO(BILLING-004): persist failed handler events to a Firestore
 * dead-letter collection so finance can reconcile, instead of relying on
 * console.error alone.
 */

interface WebhookEvent {
  event: string;
  payload: {
    payment?: {
      entity: {
        id: string;
        amount: number;
        currency: string;
        status: string;
        order_id?: string;
        notes?: Record<string, string>;
      };
    };
    refund?: { entity: { id: string; payment_id: string; amount: number; status: string } };
  };
}

export async function POST(request: NextRequest) {
  // ① Read RAW body once — never parse before verification.
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature');

  if (!verifyWebhookSignature(rawBody, signature)) {
    const ip =
      request.headers.get('x-nf-client-connection-ip') ??
      request.headers.get('x-forwarded-for') ??
      'unknown';
    console.error(`[razorpay-webhook] Invalid signature from ${ip}`);
    return NextResponse.json({ received: false, error: 'invalid_signature' }, { status: 400 });
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    return NextResponse.json({ received: false, error: 'invalid_json' }, { status: 400 });
  }

  // Always 200 from here — handlers log on error, never throw at HTTP layer.
  try {
    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event);
        break;
      case 'payment.failed':
        console.warn(`[razorpay-webhook] payment.failed: ${event.payload.payment?.entity.id}`);
        break;
      case 'refund.created':
        // Phase 3.5 — credit reversal flow. For now, log only.
        console.warn(
          `[razorpay-webhook] refund.created: ${event.payload.refund?.entity.id} (not yet auto-reversed)`,
        );
        break;
      // Subscription events etc. — not wired. Default returns 200.
    }
  } catch (err) {
    console.error('[razorpay-webhook] Handler threw:', err);
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentCaptured(event: WebhookEvent): Promise<void> {
  const payment = event.payload.payment?.entity;
  if (!payment) {
    console.error('[razorpay-webhook] payment.captured missing payment payload');
    return;
  }

  const notes = payment.notes ?? {};
  const { kidId, purpose } = notes;
  const credits = Number(notes.credits ?? 0);

  if (!kidId) {
    console.error(
      `[razorpay-webhook] payment.captured ${payment.id} missing kidId in notes — manual reconciliation required.`,
    );
    return;
  }

  if (purpose !== 'topup') {
    console.warn(
      `[razorpay-webhook] payment.captured ${payment.id} has purpose '${purpose}' (not yet implemented)`,
    );
    return;
  }

  if (!Number.isFinite(credits) || credits <= 0) {
    console.error(
      `[razorpay-webhook] payment.captured ${payment.id} has invalid credits: ${notes.credits}`,
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

  console.info(
    result.duplicate
      ? `[razorpay-webhook] duplicate ${payment.id} ignored (balance ${result.balanceAfter})`
      : `[razorpay-webhook] topup OK: kid ${kidId} +${credits} → ${result.balanceAfter} (ref=${payment.id})`,
  );
}
