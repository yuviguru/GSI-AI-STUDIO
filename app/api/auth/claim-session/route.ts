import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { adminAuth } from '@/lib/firebase/admin';
import { claimSession } from '@/lib/firebase/userService';

/**
 * POST /api/auth/claim-session
 * Migrate anonymous session creations and points to an authenticated account.
 * Requires a valid Firebase ID token in the Authorization header.
 *
 * Idempotent: safe to call multiple times for the same session.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify Firebase ID token
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      throw new AppException('UNAUTHORIZED', 'Missing auth token', 401);
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // 2. Parse request body
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId || typeof sessionId !== 'string') {
      throw new AppException('INVALID_INPUT', 'Session ID is required', 400);
    }

    // 3. Claim the session
    const result = await claimSession(uid, sessionId);

    return apiSuccess({
      claimedCreations: result.claimedCreations,
      pointsMigrated: result.pointsMigrated,
      message:
        result.claimedCreations > 0
          ? `${result.claimedCreations} creation(s) saved to your account!`
          : 'Session claimed successfully.',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
