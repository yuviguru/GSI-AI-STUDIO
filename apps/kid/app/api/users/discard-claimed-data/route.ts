import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { adminAuth } from '@gsi/firebase/admin';
import { clearOrphanedClaimSnapshot } from '@gsi/firebase/userService';

/**
 * POST /api/users/discard-claimed-data
 * Permanently delete pending anonymous session data (claimedSessionData)
 * from the user doc. Called when the parent chooses "Start fresh" or
 * "Delete this data" on the session migration prompt.
 *
 * This is a destructive action — points, badges, and creations from the
 * anonymous session are lost. The client should confirm before calling.
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

    return apiSuccess({ message: 'Guest session data discarded.' });
  } catch (error) {
    return handleApiError(error);
  }
}
