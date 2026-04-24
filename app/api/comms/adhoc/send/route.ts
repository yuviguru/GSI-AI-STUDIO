/**
 * POST /api/comms/adhoc/send — send a teacher-approved message via the
 * parent's preferred channel. The message text is whatever the teacher
 * pasted in (typically an edited adhoc draft).
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import { adminDb } from '@/lib/firebase/admin';
import { sendMessage } from '@/lib/comms/messagingService';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    if (!auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Teacher is not attached to a school.', 403);
    }
    const body = (await request.json()) as Record<string, unknown>;
    const kidId = typeof body.kidId === 'string' ? body.kidId : '';
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!kidId) {
      throw new AppException('INVALID_INPUT', 'kidId is required.', 400);
    }
    if (!text || text.length > 600) {
      throw new AppException('INVALID_INPUT', 'text must be 1-600 chars.', 400);
    }

    const kidSnap = await adminDb.collection('kids').doc(kidId).get();
    if (!kidSnap.exists) {
      throw new AppException('NOT_FOUND', 'Student not found.', 404);
    }
    const kid = kidSnap.data() as Record<string, unknown>;
    if (kid.schoolId !== auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Student is not in your school.', 403);
    }
    const parentUid = kid.parentId as string | undefined;
    if (!parentUid) {
      throw new AppException(
        'NO_PARENT',
        'No linked parent account for this student.',
        400,
      );
    }

    const result = await sendMessage({
      parentUid,
      kidId,
      templateId: 'parent_adhoc_v1',
      text,
    });

    return apiSuccess({ delivery: result });
  } catch (error) {
    return handleApiError(error);
  }
}
