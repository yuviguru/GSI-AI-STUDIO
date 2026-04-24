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
import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

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
    const subject = typeof body.subject === 'string' ? body.subject : '';
    const locale: Locale = isSupportedLocale(body.locale) ? body.locale : 'en';
    if (!absentTeacherUid || !classId || !subject) {
      throw new AppException(
        'INVALID_INPUT',
        'absentTeacherUid, classId, and subject are required.',
        400,
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
