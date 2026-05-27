import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import { requireKidOwnership } from '@/lib/api/kidOwnership';
import {
  createSubscription,
  getRazorpayPublicKey,
  isSubscribablePlan,
} from '@/lib/billing/razorpay';

/**
 * POST /api/billing/razorpay/subscribe
 *
 * Create a Razorpay Subscription. Returns the subscription_id the
 * client-side checkout.js needs (alongside the publishable key). The
 * actual plan + credit changes happen later when the
 * subscription.activated / subscription.charged webhook fires.
 *
 * Body:
 *   { kidId: string, plan: 'creator' | 'pro' }
 *
 * Response:
 *   { subscriptionId, razorpayKeyId, plan, shortUrl }
 *
 * Cancellation flow lives in `./cancel-subscription`. Plan upgrades
 * (e.g. Creator → Pro mid-cycle) are not supported in v1 — cancel
 * existing first, then subscribe to the new plan.
 */
const subscribeInputSchema = z.object({
  kidId: z.string().min(1),
  plan: z.enum(['creator', 'pro']),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    const input = subscribeInputSchema.parse(await request.json());

    if (!isSubscribablePlan(input.plan)) {
      throw new AppException('INVALID_INPUT', `Plan '${input.plan}' is not subscribable`, 400);
    }

    await requireKidOwnership(auth, input.kidId);

    // Notes are echoed back on every webhook delivery — the routing key
    // between Razorpay's event and our kid wallet.
    const sub = await createSubscription({
      plan: input.plan,
      notes: {
        kidId: input.kidId,
        userId: auth.userId,
        plan: input.plan,
      },
    });

    return apiSuccess({
      subscriptionId: sub.id,
      razorpayKeyId: getRazorpayPublicKey(),
      plan: input.plan,
      planId: sub.planId,
      // Razorpay-hosted hosted-checkout link, in case the client prefers
      // a redirect over the embedded sheet (mobile webview fallback).
      shortUrl: sub.shortUrl ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
