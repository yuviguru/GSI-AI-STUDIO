/**
 * GET /api/reports/progress?kidId=&range=month|term|year&locale=en|hi
 *
 * Streams a PDF. Auth:
 *   - parent of the kid, OR
 *   - schoolAdmin of the kid's school, OR
 *   - teacher who actually teaches a class the kid is in.
 *
 * A teacher in the school who does NOT teach the kid's class is
 * explicitly 403'd — progress reports contain per-student performance
 * data and must stay class-scoped.
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import { adminDb } from '@/lib/firebase/admin';
import { getKid } from '@/lib/firebase/kidService';
import { renderProgressReport, type Range } from '@/lib/pdf/progressReport';

function parseRange(raw: string | null): Range {
  if (raw === 'month' || raw === 'year') return raw;
  return 'term';
}

/**
 * Is `teacherUid` the teacher of any class that `kid` belongs to in
 * `schoolId`? Walks the kid's `classIds` (bounded, ~1-8 per kid) and
 * checks the `teacherUid` on each class doc.
 */
async function isTeacherOfAnyKidClass(params: {
  schoolId: string;
  kidClassIds: string[];
  teacherUid: string;
}): Promise<boolean> {
  if (params.kidClassIds.length === 0) return false;
  for (const classId of params.kidClassIds) {
    const snap = await adminDb
      .collection('schools')
      .doc(params.schoolId)
      .collection('classes')
      .doc(classId)
      .get();
    if (snap.exists && snap.data()?.teacherUid === params.teacherUid) {
      return true;
    }
  }
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    const url = new URL(request.url);
    const kidId = url.searchParams.get('kidId');
    if (!kidId) {
      throw new AppException('INVALID_INPUT', 'kidId is required.', 400);
    }
    const kid = await getKid(kidId);
    if (!kid) {
      throw new AppException('NOT_FOUND', 'Student not found.', 404);
    }

    const isParent = kid.parentId === auth.userId;
    const isSchoolAdmin =
      auth.role === 'schoolAdmin' &&
      !!kid.schoolId &&
      kid.schoolId === auth.schoolId;

    let isTeacherOfKid = false;
    if (
      !isParent &&
      !isSchoolAdmin &&
      auth.role === 'teacher' &&
      !!kid.schoolId &&
      kid.schoolId === auth.schoolId
    ) {
      isTeacherOfKid = await isTeacherOfAnyKidClass({
        schoolId: kid.schoolId,
        kidClassIds: kid.classIds ?? [],
        teacherUid: auth.userId,
      });
    }

    if (!isParent && !isSchoolAdmin && !isTeacherOfKid) {
      throw new AppException('FORBIDDEN', 'Not authorised to view this report.', 403);
    }

    const range = parseRange(url.searchParams.get('range'));
    const locale = url.searchParams.get('locale') === 'hi' ? 'hi' : 'en';

    const { pdf, kidName } = await renderProgressReport({
      kidId,
      range,
      locale,
    });
    return new NextResponse(pdf as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="progress-${range}-${kidName.replace(/\s+/g, '_')}.pdf"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
