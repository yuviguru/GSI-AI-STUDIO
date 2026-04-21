import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import { adminDb } from '@/lib/firebase/admin';
import { joinClassByCode } from '@/lib/firebase/schoolService';

/**
 * POST /api/classes/join
 * An authenticated parent enrols one of their kids into a class using the
 * teacher-issued invite code. Idempotent — re-joining is a no-op.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    const body = await request.json();

    const rawCode: unknown = body?.inviteCode;
    const rawKidId: unknown = body?.kidId;

    if (typeof rawCode !== 'string' || rawCode.trim().length < 4) {
      throw new AppException(
        'INVALID_INPUT',
        'Invite code is required.',
        400,
      );
    }
    if (typeof rawKidId !== 'string' || rawKidId.trim().length < 1) {
      throw new AppException('INVALID_INPUT', 'kidId is required.', 400);
    }

    const inviteCode = rawCode.trim().toUpperCase();
    const kidId = rawKidId.trim();

    // Verify the kid belongs to the authenticated parent.
    const kidDoc = await adminDb.collection('kids').doc(kidId).get();
    if (!kidDoc.exists) {
      throw new AppException('KID_NOT_FOUND', 'Kid profile not found.', 404);
    }
    if (kidDoc.data()?.parentId !== auth.userId) {
      throw new AppException(
        'FORBIDDEN',
        'That kid profile does not belong to you.',
        403,
      );
    }

    const cls = await joinClassByCode(inviteCode, kidId);
    return apiSuccess({ class: cls });
  } catch (error) {
    return handleApiError(error);
  }
}
