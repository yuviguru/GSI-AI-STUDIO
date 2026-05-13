/**
 * POST /api/comms/parent-digest/preview — teacher previews a digest.
 * Does not persist or send.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import { adminDb } from '@/lib/firebase/admin';
import { generateParentDigest } from '@/lib/ai/parentDigestGenerator';
import { requireConsent } from '@gsi/dpdp';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    if (!auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Teacher is not attached to a school.', 403);
    }
    const body = (await request.json()) as Record<string, unknown>;
    const kidId = typeof body.kidId === 'string' ? body.kidId : '';
    const teacherNote =
      typeof body.teacherNote === 'string' ? body.teacherNote.slice(0, 200) : undefined;
    const locale = body.locale === 'hi' ? ('hi' as const) : ('en' as const);
    if (!kidId) {
      throw new AppException('INVALID_INPUT', 'kidId is required.', 400);
    }

    const kidSnap = await adminDb.collection('kids').doc(kidId).get();
    if (!kidSnap.exists) {
      throw new AppException('NOT_FOUND', 'Student not found.', 404);
    }
    if (kidSnap.data()?.schoolId !== auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Student is not in your school.', 403);
    }

    // DPDP: the preview response contains the student's assembled PII
    // (creations summary, concepts, upcoming assignments). Gate on the
    // same consent scope as delivery so previewing a digest is never a
    // back-door around consent.
    await requireConsent(kidId, 'parent_messaging');

    const digest = await generateParentDigest({ kidId, locale, teacherNote });
    return apiSuccess({ digest });
  } catch (error) {
    return handleApiError(error);
  }
}
