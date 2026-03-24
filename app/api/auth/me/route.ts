import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { adminAuth } from '@/lib/firebase/admin';
import { getUser } from '@/lib/firebase/userService';

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

    return apiSuccess({
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      plan: user.plan,
      kidIds: user.kidIds,
      schoolId: user.schoolId,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
