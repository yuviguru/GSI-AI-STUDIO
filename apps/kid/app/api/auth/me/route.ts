import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { adminAuth } from '@gsi/firebase/admin';
import { getUser } from '@gsi/firebase/userService';

/**
 * GET /api/auth/me
 * Get the current authenticated user's profile.
 * Returns 404 if user hasn't registered yet (just has Firebase Auth but no Firestore doc).
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      throw new AppException('UNAUTHORIZED', 'Missing auth token', 401);
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const user = await getUser(decoded.uid);

    if (!user) {
      throw new AppException('USER_NOT_FOUND', 'User profile not found', 404);
    }

    // Build a lightweight summary of pending claimed session data so the
    // client can show the "Who was creating?" assignment UI.
    const claimedSessionSummary = user.claimedSessionData
      ? {
          aiPoints: user.claimedSessionData.aiPoints ?? 0,
          badgeCount: (user.claimedSessionData.badges ?? []).length,
          conceptCount: (user.claimedSessionData.conceptsLearned ?? []).length,
          creationTypes: Object.keys(user.claimedSessionData.creationsByType ?? {}),
          totalCreationCount: Object.values(user.claimedSessionData.creationsByType ?? {}).reduce((a, b) => a + b, 0),
          onboarding: user.claimedSessionData.onboarding
            ? {
                name: user.claimedSessionData.onboarding.name,
                avatarUrl: user.claimedSessionData.onboarding.avatarUrl,
                mascotId: user.claimedSessionData.onboarding.mascotId,
              }
            : undefined,
        }
      : undefined;

    return apiSuccess({
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      plan: user.plan,
      kidIds: user.kidIds,
      schoolId: user.schoolId,
      ...(claimedSessionSummary ? { claimedSessionSummary } : {}),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
