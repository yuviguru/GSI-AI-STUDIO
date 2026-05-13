import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import { assignClaimedDataToKid } from '@gsi/firebase/userService';

/**
 * POST /api/users/assign-claimed-data
 *
 * Assign pending claimedSessionData (from an anonymous session) to a specific
 * kid profile. Called from the "Who was creating?" UI when a returning user
 * with existing kids signs in after an anonymous session.
 *
 * Body: { kidId: string }
 *
 * The kid must belong to the authenticated parent. Points/badges/concepts are
 * merged additively onto the kid. Avatar/mascot are adopted only if the kid
 * doesn't already have one.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);

    const body = await request.json();
    const { kidId } = body;

    if (!kidId || typeof kidId !== 'string') {
      throw new AppException(
        'INVALID_INPUT',
        'kidId is required',
        400,
      );
    }

    const result = await assignClaimedDataToKid(auth.userId, kidId);

    return apiSuccess({
      ...result,
      message: 'Session data assigned to kid profile',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
