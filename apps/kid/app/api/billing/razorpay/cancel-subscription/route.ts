import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import { requireKidOwnership } from '@/lib/api/kidOwnership';
import { adminDb } from '@gsi/firebase/admin';
import { cancelSubscription } from '@/lib/billing/razorpay';

/**
 * POST /api/billing/razorpay/cancel-subscription
 *
 * Cancel a kid's active subscription. Default behavior:
 * `cancel_at_cycle_end` — kid keeps plan benefits until the current
 * paid period ends, then drops back to free.
 *
 * The actual plan downgrade happens when the
 * subscription.cancelled webhook fires (already wired). We mark the
 * planStatus = 'canceled' optimistically here so the UI updates
 * immediately.
 */
const cancelInputSchema = z.object({
  kidId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    const input = cancelInputSchema.parse(await request.json());

    await requireKidOwnership(auth, input.kidId);

    const kidSnap = await adminDb.collection('kids').doc(input.kidId).get();
    const subscriptionId = kidSnap.data()?.razorpaySubscriptionId as string | undefined;
    if (!subscriptionId) {
      throw new AppException('NOT_FOUND', 'No active subscription on this kid.', 404);
    }

    await cancelSubscription(subscriptionId, { cancelAtCycleEnd: true });

    // Optimistic UI update; webhook will arrive shortly and confirm.
    await adminDb.collection('kids').doc(input.kidId).set(
      {
        planStatus: 'canceled',
        updatedAt: new Date(),
      },
      { merge: true },
    );

    return apiSuccess({ subscriptionId, canceledAt: new Date().toISOString() });
  } catch (error) {
    return handleApiError(error);
  }
}
