import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import { addBonusCredits } from '@/lib/billing';

/**
 * POST /api/billing/admin/grant — admin-only manual credit grant.
 *
 * Writes a `bonus` ledger entry. Restricted to `admin` plan or
 * `schoolAdmin` role — parents are deliberately excluded (otherwise
 * self-grant attack).
 */
const grantInputSchema = z.object({
  kidId: z.string().min(1),
  amount: z.number().int().positive().max(10_000),
  note: z.string().min(1).max(280),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);

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
