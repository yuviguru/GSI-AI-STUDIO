import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { adminAuth } from '@gsi/firebase/admin';
import { clearOrphanedClaimSnapshot } from '@gsi/firebase/userService';

/**
 * POST /api/auth/signout-cleanup
 * Clears server-side orphaned claimedSessionData on sign-out so the snapshot
 * doesn't linger across sign-in cycles. Best-effort — non-blocking on the
 * client. Safe no-op if the user has already created a kid.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      throw new AppException('UNAUTHORIZED', 'Missing auth token', 401);
    }

    const decoded = await adminAuth.verifyIdToken(token);
    await clearOrphanedClaimSnapshot(decoded.uid);

    return apiSuccess({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
