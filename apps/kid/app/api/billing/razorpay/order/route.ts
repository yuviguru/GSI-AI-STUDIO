import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import { requireKidOwnership } from '@/lib/api/kidOwnership';
import { createOrder, getRazorpayPublicKey, getTopup } from '@/lib/billing/razorpay';

/**
 * POST /api/billing/razorpay/order — create a Razorpay order so the
 * client-side checkout sheet can open. Currently only `purpose: 'topup'`
 * is wired; subscription flows return 501.
 */
const orderInputSchema = z.object({
  kidId: z.string().min(1),
  purpose: z.enum(['topup', 'plan_upgrade', 'plan_renew']),
  topupSku: z.string().optional(),
  targetPlan: z.enum(['creator', 'pro']).optional(),
  billingCycle: z.enum(['monthly', 'annual']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    const input = orderInputSchema.parse(await request.json());

    await requireKidOwnership(auth, input.kidId);

    if (input.purpose !== 'topup') {
      throw new AppException(
        'NOT_IMPLEMENTED',
        'Plan upgrades via Razorpay subscriptions are not yet wired. Use topup for now.',
        501,
      );
    }

    const topup = getTopup(input.topupSku);
    if (!topup) {
      throw new AppException('INVALID_INPUT', `Unknown topupSku: ${input.topupSku ?? '(missing)'}`, 400);
    }

    // Notes are read back by the webhook handler. Razorpay caps notes at
    // 15 keys × 256 bytes each — keep lean.
    const order = await createOrder({
      amountInr: topup.priceInr,
      receipt: `gsi_${input.kidId.slice(0, 8)}_${topup.sku}_${Date.now()}`,
      notes: {
        kidId: input.kidId,
        purpose: input.purpose,
        topupSku: topup.sku,
        credits: String(topup.credits),
        userId: auth.userId, // defense-in-depth ownership check at webhook time
      },
    });

    return apiSuccess({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      razorpayKeyId: getRazorpayPublicKey(),
      purpose: input.purpose,
      displayLines: [{ label: topup.displayName, amount: `₹${topup.priceInr}` }],
    });
  } catch (error) {
    return handleApiError(error);
  }
}
