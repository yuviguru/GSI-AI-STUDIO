/**
 * POST /api/substitutes/instructions
 *
 * Body: { absentTeacherUid, classId, subject, locale? }
 * Returns Claude-drafted instructions for a single period.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import { generateSubInstructions } from '@/lib/ai/subInstructionsGenerator';
import {
  checkAndIncrementAiRate,
  logTeacherAiUsage,
} from '@/lib/firebase/teacherAiUsageService';
import { getSchool } from '@/lib/firebase/schoolService';
import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

const SUBJECT_MAX_LEN = 80;

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['schoolAdmin']);
    if (!auth.schoolId) {
      throw new AppException('FORBIDDEN', 'You are not attached to a school.', 403);
    }
    await checkAndIncrementAiRate({
      teacherUid: auth.userId,
      generator: 'subInstructions',
      cap: 30,
    });

    const body = (await request.json()) as Record<string, unknown>;
    const absentTeacherUid =
      typeof body.absentTeacherUid === 'string' ? body.absentTeacherUid : '';
    const classId = typeof body.classId === 'string' ? body.classId : '';
    const rawSubject = typeof body.subject === 'string' ? body.subject : '';
    const locale: Locale = isSupportedLocale(body.locale) ? body.locale : 'en';
    if (!absentTeacherUid || !classId || !rawSubject) {
      throw new AppException(
        'INVALID_INPUT',
        'absentTeacherUid, classId, and subject are required.',
        400,
      );
    }
    const subject = rawSubject.trim().slice(0, SUBJECT_MAX_LEN);
    if (!subject) {
      throw new AppException('INVALID_INPUT', 'subject is empty.', 400);
    }

    // Verify the "absent teacher" actually belongs to this admin's school
    // — otherwise a school A admin could enumerate / trigger Claude runs
    // against teachers at school B.
    const school = await getSchool(auth.schoolId);
    if (!school) {
      throw new AppException('NOT_FOUND', 'School not found.', 404);
    }
    if (!school.teacherIds.includes(absentTeacherUid)) {
      throw new AppException(
        'FORBIDDEN',
        'That teacher is not in your school.',
        403,
      );
    }

    const draft = await generateSubInstructions({
      schoolId: auth.schoolId,
      absentTeacherUid,
      classId,
      subject,
      locale,
    });

    await logTeacherAiUsage({
      teacherUid: auth.userId,
      schoolId: auth.schoolId,
      generator: 'subInstructions',
      locale,
    });

    return apiSuccess({ draft });
  } catch (error) {
    return handleApiError(error);
  }
}
