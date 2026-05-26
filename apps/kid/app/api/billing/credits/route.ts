import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import { requireKidOwnership } from '@/lib/api/kidOwnership';
import { ensureInitialGrant, getLedgerPage } from '@/lib/billing';

/**
 * GET /api/billing/credits?kidId=…&before=…&limit=…
 *
 * Balance + plan + a paginated ledger window.
 *
 *   kidId   required
 *   before  optional cursor — ISO `createdAt` of the last entry on the
 *           previous page; server returns entries strictly older.
 *   limit   1..100, default 20.
 *
 * Response includes `nextCursor` (null when the kid's ledger is fully
 * walked) so the page can render "Load more" without re-counting.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    const url = new URL(request.url);
    const kidId = url.searchParams.get('kidId');
    if (!kidId) throw new AppException('INVALID_INPUT', 'kidId query param is required', 400);

    const before = url.searchParams.get('before');
    const limitRaw = url.searchParams.get('limit');
    const limit = limitRaw ? Math.max(1, Math.min(100, Number(limitRaw))) : 20;

    await requireKidOwnership(auth, kidId);

    // Seeds the kid's wallet on first read — no-op once granted.
    // Only fire on the first page (when no cursor is supplied) so
    // "Load more" calls don't redundantly re-fetch the kid doc.
    const snapshotPromise = before
      ? ensureInitialGrant(kidId).catch(() => null) // fall back silently
      : ensureInitialGrant(kidId);

    const [snapshot, page] = await Promise.all([
      snapshotPromise,
      getLedgerPage(kidId, { limit, before }),
    ]);

    return apiSuccess({
      kidId: snapshot?.kidId ?? kidId,
      plan: snapshot?.plan ?? null,
      creditBalance: snapshot?.balance ?? 0,
      creditsMonthlyGrantAmount: snapshot?.monthlyGrantAmount ?? 0,
      creditsMonthlyGrantedAt: snapshot?.monthlyGrantedAt?.toISOString() ?? null,
      creditsMonthlyResetAt: snapshot?.monthlyResetAt?.toISOString() ?? null,
      creditsLastDebitAt: snapshot?.lastDebitAt?.toISOString() ?? null,
      recentLedger: page.entries.map((e) => ({
        ...e,
        expiresAt: e.expiresAt?.toISOString() ?? null,
        createdAt: e.createdAt.toISOString(),
      })),
      nextCursor: page.nextCursor,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
