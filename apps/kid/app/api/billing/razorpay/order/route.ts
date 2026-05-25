import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import { adminDb } from '@gsi/firebase/admin';
import {
  createOrder,
  getRazorpayPublicKey,
  getTopup,
} from '@/lib/billing/razorpay';

/**
 * POST /api/billing/razorpay/order
 *
 * Create a Razorpay order so the client-side checkout sheet can open.
 *
 * Two purposes for now (matches docs/api-contracts.md):
 *   - `topup` — buy a one-shot bundle of AI Coins, identified by `topupSku`.
 *     Plan-upgrade (subscriptions) is out of scope for this PR; the route
 *     accepts the param shape but throws NOT_IMPLEMENTED on plan_upgrade
 *     so the API contract stays stable while the subscription flow is
 *     built in a follow-up.
 *
 * The returned payload is the minimum the Razorpay JS SDK needs to open
 * the checkout sheet — orderId + amount + currency + publishable key.
 */

const orderInputSchema = z.object({
  kidId: z.string().min(1, 'kidId is required'),
  purpose: z.enum(['topup', 'plan_upgrade', 'plan_renew']),
  topupSku: z.string().optional(),
  targetPlan: z.enum(['creator', 'pro']).optional(),
  billingCycle: z.enum(['monthly', 'annual']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    const input = orderInputSchema.parse(await request.json());

    // Ownership check — the parent must own this kid before they can
    // top up its wallet. Admins can top up any kid (for support).
    if (auth.plan !== 'admin' && auth.role !== 'schoolAdmin') {
      const kidSnap = await adminDb.collection('kids').doc(input.kidId).get();
      if (!kidSnap.exists) {
        throw new AppException('NOT_FOUND', 'Kid profile not found', 404);
      }
      if (kidSnap.data()?.parentId !== auth.userId) {
        throw new AppException(
          'FORBIDDEN',
          'You can only top up your own kid\'s wallet',
          403,
        );
      }
    }

    if (input.purpose !== 'topup') {
      // Subscription/plan-change flow is a separate work item — we'd need
      // Razorpay Plans + Subscriptions, recurring mandates, prorations.
      // For now, route returns a clear "coming soon" so the API contract
      // stays consistent and the UI can show a placeholder.
      throw new AppException(
        'NOT_IMPLEMENTED',
        'Plan upgrades via Razorpay subscriptions are not yet wired. Use topup for now.',
        501,
      );
    }

    const topup = getTopup(input.topupSku);
    if (!topup) {
      throw new AppException(
        'INVALID_INPUT',
        `Unknown topupSku: ${input.topupSku ?? '(missing)'}`,
        400,
      );
    }

    // The receipt and notes are read back by the webhook handler to
    // identify what to credit. Keep notes lean — Razorpay caps at 15
    // keys, 256 bytes each.
    const order = await createOrder({
      amountInr: topup.priceInr,
      receipt: `gsi_${input.kidId.slice(0, 8)}_${topup.sku}_${Date.now()}`,
      notes: {
        kidId: input.kidId,
        purpose: input.purpose,
        topupSku: topup.sku,
        credits: String(topup.credits),
        // userId lets the webhook double-check ownership, defense-in-depth.
        userId: auth.userId,
      },
    });

    return apiSuccess({
      orderId: order.id,
      amount: order.amount, // paise
      currency: order.currency,
      razorpayKeyId: getRazorpayPublicKey(),
      purpose: input.purpose,
      displayLines: [
        {
          label: topup.displayName,
          amount: `₹${topup.priceInr}`,
        },
      ],
    });
  } catch (error) {
    return handleApiError(error);
  }
}
