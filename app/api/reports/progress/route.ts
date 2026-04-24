/**
 * GET /api/reports/progress?kidId=&range=month|term|year&locale=en|hi
 *
 * Streams a PDF. Auth: parent of the kid OR teacher of any class the
 * kid is in OR schoolAdmin of the kid's school.
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import { getKid } from '@/lib/firebase/kidService';
import { renderProgressReport, type Range } from '@/lib/pdf/progressReport';

function parseRange(raw: string | null): Range {
  if (raw === 'month' || raw === 'year') return raw;
  return 'term';
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
      auth.role === 'schoolAdmin' && kid.schoolId === auth.schoolId;
    const isTeacherOfSchool =
      auth.role === 'teacher' && kid.schoolId === auth.schoolId;
    if (!isParent && !isSchoolAdmin && !isTeacherOfSchool) {
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
