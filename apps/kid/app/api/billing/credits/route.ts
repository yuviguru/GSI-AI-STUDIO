import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import { adminDb } from '@gsi/firebase/admin';
import { getCreditSnapshot, getRecentLedger } from '@/lib/billing';

/**
 * GET /api/billing/credits?kidId=<kidId>
 *
 * Read a kid's credit balance, plan, and recent ledger entries.
 *
 * Auth: requires an authenticated parent who owns the kid, OR an admin
 * (`role: schoolAdmin`). Anonymous flows have no credit wallet — they get
 * a 401 to prompt sign-in.
 *
 * Response shape mirrors `docs/api-contracts.md#get-apibillingcredits`.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);

    const url = new URL(request.url);
    const kidId = url.searchParams.get('kidId');
    if (!kidId) {
      throw new AppException('INVALID_INPUT', 'kidId query param is required', 400);
    }

    // Ownership check — parent can read their own kid's wallet; admin can
    // read anyone's. School admin checks are deferred to Phase 2b (need to
    // verify the kid is in their school).
    if (auth.role !== 'schoolAdmin' && auth.plan !== 'admin') {
      const kidSnap = await adminDb.collection('kids').doc(kidId).get();
      if (!kidSnap.exists) {
        throw new AppException('NOT_FOUND', 'Kid profile not found', 404);
      }
      const kidParentId = kidSnap.data()?.parentId as string | undefined;
      if (kidParentId !== auth.userId) {
        throw new AppException(
          'FORBIDDEN',
          'You can only read credit balances for your own kids',
          403,
        );
      }
    }

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
      recentLedger: ledger.map((entry) => ({
        id: entry.id,
        type: entry.type,
        amount: entry.amount,
        balanceAfter: entry.balanceAfter,
        feature: entry.feature,
        paymentRef: entry.paymentRef,
        paymentProvider: entry.paymentProvider,
        expiresAt: entry.expiresAt?.toISOString() ?? null,
        createdAt: entry.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
