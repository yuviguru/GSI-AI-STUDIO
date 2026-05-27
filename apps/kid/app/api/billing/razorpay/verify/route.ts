import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import { requireKidOwnership } from '@/lib/api/kidOwnership';
import { verifyPaymentSignature, fetchOrder } from '@/lib/billing/razorpay';
import { addTopupCredits } from '@/lib/billing';

/**
 * POST /api/billing/razorpay/verify
 *
 * The client-side payment confirmation path. After Razorpay's checkout
 * sheet captures payment successfully, the JS SDK returns three values
 * which the client posts here:
 *
 *   - razorpayPaymentId
 *   - razorpayOrderId   (matches the order we created server-side)
 *   - razorpaySignature (HMAC-SHA256 of "orderId|paymentId" by KEY_SECRET)
 *
 * We:
 *   1. Verify the signature against KEY_SECRET (timing-safe).
 *   2. Fetch the order back from Razorpay — its `notes` are the trusted
 *      source for kidId + credits + topupSku (we set them during
 *      createOrder; the client never gets to override).
 *   3. Confirm the caller owns that kid (defense-in-depth — they already
 *      had to own it to create the order, but env env env).
 *   4. Call addTopupCredits — idempotent on paymentId via the existing
 *      paymentRef dedup, so a webhook arriving later is a safe no-op.
 *
 * Why this exists alongside the webhook: webhooks can't reach localhost
 * during development, and even in prod they're delayed/retried. The
 * client callback is the authoritative real-time path; the webhook is
 * the backup for cases where the client navigates away mid-flow.
 */

const verifyInputSchema = z.object({
  razorpayPaymentId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    const input = verifyInputSchema.parse(await request.json());

    // ① HMAC verify before any Razorpay API calls (cheap, fails fast).
    if (!verifyPaymentSignature(input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature)) {
      throw new AppException(
        'INVALID_SIGNATURE',
        'Payment signature did not verify. Refusing to credit.',
        400,
      );
    }

    // ② Fetch the order so we can trust its notes — the kidId + credits
    // count we set during create. Never trust the client to tell us how
    // much to credit after the fact.
    const order = await fetchOrder(input.razorpayOrderId);
    const notes = order.notes ?? {};
    const kidId = notes.kidId;
    const creditsRaw = Number(notes.credits ?? 0);

    if (!kidId || !Number.isFinite(creditsRaw) || creditsRaw <= 0) {
      throw new AppException(
        'INVALID_ORDER',
        'Order is missing kidId or credits in notes. Cannot reconcile.',
        400,
      );
    }

    // ③ Caller must still own the kid. (createOrder already enforced
    // this; admins may have created on behalf of a kid they don't own.)
    await requireKidOwnership(auth, kidId);

    // ④ Atomic credit. Idempotent on paymentId — re-submitting (or the
    // webhook firing later) is a no-op.
    const result = await addTopupCredits({
      kidId,
      amount: creditsRaw,
      paymentRef: input.razorpayPaymentId,
      paymentProvider: 'razorpay',
      metadata: {
        orderId: input.razorpayOrderId,
        amountPaise: order.amount,
        currency: order.currency,
        topupSku: notes.topupSku,
        verifiedVia: 'client_signature',
      },
    });

    return apiSuccess({
      kidId,
      creditsAdded: creditsRaw,
      creditBalance: result.balanceAfter,
      duplicate: result.duplicate,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
