import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import { requireKidOwnership } from '@/lib/api/kidOwnership';
import { getCreditSnapshot, getRecentLedger } from '@/lib/billing';

/** GET /api/billing/credits?kidId=… — balance + plan + recent ledger. */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    const kidId = new URL(request.url).searchParams.get('kidId');
    if (!kidId) throw new AppException('INVALID_INPUT', 'kidId query param is required', 400);

    await requireKidOwnership(auth, kidId);

    const [snapshot, ledger] = await Promise.all([
      getCreditSnapshot(kidId),
      getRecentLedger(kidId, 20),
    ]);

    return apiSuccess({
      kidId: snapshot.kidId,
      plan: snapshot.plan,
      creditBalance: snapshot.balance,
      creditsMonthlyGrantAmount: snapshot.monthlyGrantAmount,
      creditsMonthlyGrantedAt: snapshot.monthlyGrantedAt?.toISOString() ?? null,
      creditsMonthlyResetAt: snapshot.monthlyResetAt?.toISOString() ?? null,
      creditsLastDebitAt: snapshot.lastDebitAt?.toISOString() ?? null,
      recentLedger: ledger.map((e) => ({
        ...e,
        expiresAt: e.expiresAt?.toISOString() ?? null,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
