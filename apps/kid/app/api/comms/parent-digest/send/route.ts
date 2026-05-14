/**
 * POST /api/comms/parent-digest/send — teacher sends the digest to the
 * kid's parent via their preferred channel. DPDP-gated on
 * `parent_messaging` inside sendMessage().
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import { adminDb } from '@gsi/firebase/admin';
import { generateParentDigest } from '@gsi/ai/parentDigestGenerator';
import { sendMessage } from '@/lib/comms/messagingService';
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

    // DPDP: gate before assembling PII. sendMessage() re-checks at
    // delivery time — belt + braces so assembly is never a back-door.
    await requireConsent(kidId, 'parent_messaging');

    const digest = await generateParentDigest({ kidId, locale, teacherNote });
    const result = await sendMessage({
      parentUid,
      kidId,
      templateId: 'parent_weekly_digest_v1',
      text: digest.text,
    });

    return apiSuccess({ digest, delivery: result });
  } catch (error) {
    return handleApiError(error);
  }
}
