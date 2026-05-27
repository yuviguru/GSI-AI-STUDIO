import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/billing/razorpay';
import {
  addTopupCredits,
  grantMonthlyCredits,
  setKidSubscription,
} from '@/lib/billing';
import type { UserPlan } from '@gsi/types';

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
    subscription?: {
      entity: {
        id: string;
        plan_id: string;
        status: string;
        current_start: number | null;
        current_end: number | null;
        notes?: Record<string, string>;
      };
    };
  };
}

const SUB_PLANS_BY_RP_ID = (): Record<string, UserPlan> => ({
  [process.env.RAZORPAY_PLAN_CREATOR_MONTHLY ?? '']: 'creator',
  [process.env.RAZORPAY_PLAN_PRO_MONTHLY ?? '']: 'pro',
});

function planFromRazorpayPlanId(planId: string): UserPlan | null {
  const map = SUB_PLANS_BY_RP_ID();
  return map[planId] ?? null;
}

function secondsToDate(s: number | null | undefined): Date | null {
  if (!s) return null;
  return new Date(s * 1000);
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
        // BILLING-005 (deferred — see stories/backlog/) will auto-reverse.
        // For now: log so finance can reconcile manually.
        console.warn(
          `[razorpay-webhook] refund.created: ${event.payload.refund?.entity.id} (not yet auto-reversed — see BILLING-005)`,
        );
        break;
      case 'subscription.activated':
        await handleSubscriptionActivated(event);
        break;
      case 'subscription.charged':
        await handleSubscriptionCharged(event);
        break;
      case 'subscription.cancelled':
      case 'subscription.completed':
        await handleSubscriptionCancelled(event);
        break;
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

// ─── Subscription handlers (BILLING-001 Phase 5+) ───────────────────────

/**
 * subscription.activated — first successful payment on a new sub.
 *
 * Promote the kid to the paid plan, store the subscription id, and
 * grant the first monthly cycle of credits. grantMonthlyCredits is
 * idempotent enough that a retry would just expire-and-regrant, so
 * Razorpay retries are safe.
 */
async function handleSubscriptionActivated(event: WebhookEvent): Promise<void> {
  const sub = event.payload.subscription?.entity;
  if (!sub) {
    console.error('[razorpay-webhook] subscription.activated missing subscription payload');
    return;
  }
  const kidId = sub.notes?.kidId;
  const plan = planFromRazorpayPlanId(sub.plan_id);

  if (!kidId || !plan) {
    console.error(
      `[razorpay-webhook] subscription.activated ${sub.id} missing kidId or unknown planId ${sub.plan_id}`,
    );
    return;
  }

  await setKidSubscription({
    kidId,
    plan,
    razorpaySubscriptionId: sub.id,
    planStatus: 'active',
    planRenewsAt: secondsToDate(sub.current_end),
  });
  await grantMonthlyCredits({ kidId, plan });

  console.info(`[razorpay-webhook] subscription activated: kid ${kidId} → ${plan} (sub ${sub.id})`);
}

/**
 * subscription.charged — recurring monthly renewal succeeded. Expire
 * the previous grant pool and grant the next month's allotment.
 * Topup credits are untouched.
 */
async function handleSubscriptionCharged(event: WebhookEvent): Promise<void> {
  const sub = event.payload.subscription?.entity;
  if (!sub) return;
  const kidId = sub.notes?.kidId;
  const plan = planFromRazorpayPlanId(sub.plan_id);
  if (!kidId || !plan) {
    console.error(`[razorpay-webhook] subscription.charged ${sub.id} missing kidId or plan`);
    return;
  }

  await setKidSubscription({
    kidId,
    plan,
    razorpaySubscriptionId: sub.id,
    planStatus: 'active',
    planRenewsAt: secondsToDate(sub.current_end),
  });
  await grantMonthlyCredits({ kidId, plan });

  console.info(`[razorpay-webhook] subscription charged: kid ${kidId} → ${plan} (sub ${sub.id})`);
}

/**
 * subscription.cancelled / .completed — kid asked to cancel, or
 * subscription ran out of cycles. Mark planStatus=canceled but keep
 * the plan active until current_end so the kid finishes the period
 * they paid for. A scheduled job (out of scope for v1) flips them
 * back to 'free' when planExpiresAt passes.
 */
async function handleSubscriptionCancelled(event: WebhookEvent): Promise<void> {
  const sub = event.payload.subscription?.entity;
  if (!sub) return;
  const kidId = sub.notes?.kidId;
  const plan = planFromRazorpayPlanId(sub.plan_id);
  if (!kidId || !plan) return;

  await setKidSubscription({
    kidId,
    plan,
    razorpaySubscriptionId: sub.id,
    planStatus: 'canceled',
    planExpiresAt: secondsToDate(sub.current_end),
  });

  console.info(`[razorpay-webhook] subscription cancelled: kid ${kidId} (sub ${sub.id})`);
}
