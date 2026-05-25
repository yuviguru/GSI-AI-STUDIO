import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import { addBonusCredits } from '@/lib/billing';

/**
 * POST /api/billing/admin/grant
 *
 * Admin-only: manually grant credits to a kid. Used for:
 *   - Support gestures (kid hit a bug, lost their gen → restore credits)
 *   - Beta-tester gifts
 *   - Promotional handouts (school visit, hackathon prize)
 *
 * Writes a `bonus` ledger entry (NOT `topup` — topups are reserved for
 * Razorpay-backed purchases). Refunds for actual Razorpay charges
 * should go through the refund flow once it's wired (Phase 3.5), which
 * coordinates with Razorpay so the kid gets both the money back and
 * the credit deduction in lockstep.
 */

const grantInputSchema = z.object({
  kidId: z.string().min(1),
  amount: z.number().int().positive().max(10_000),
  note: z.string().min(1).max(280),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);

    // Admin gate: only `admin` plan users (internal team) OR
    // `schoolAdmin` role (school accounts that need to top up student
    // wallets during compliance/training). We deliberately do NOT let
    // `parent` role hit this — a parent could otherwise self-issue
    // unlimited credits to their own kid.
    if (auth.plan !== 'admin' && auth.role !== 'schoolAdmin') {
      throw new AppException(
        'FORBIDDEN',
        'Admin grant is restricted to admin or schoolAdmin accounts',
        403,
      );
    }

    const input = grantInputSchema.parse(await request.json());

    const result = await addBonusCredits({
      kidId: input.kidId,
      amount: input.amount,
      note: input.note,
      actorId: auth.userId,
    });

    return apiSuccess({
      kidId: input.kidId,
      creditBalance: result.balanceAfter,
      granted: input.amount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
