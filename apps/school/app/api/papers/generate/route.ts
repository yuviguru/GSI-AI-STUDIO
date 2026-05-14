/**
 * POST /api/papers/generate — draft a question paper. Does not persist.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import {
  generateQuestionPaper,
  type PaperBlueprint,
} from '@gsi/ai/questionPaperGenerator';
import {
  checkAndIncrementAiRate,
  logTeacherAiUsage,
} from '@gsi/firebase/teacherAiUsageService';
import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    if (!auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Teacher is not attached to a school.', 403);
    }
    await checkAndIncrementAiRate({
      teacherUid: auth.userId,
      generator: 'questionPaper',
      cap: 10,
    });

    const body = (await request.json()) as Record<string, unknown>;
    const chapterIds = Array.isArray(body.chapterIds)
      ? (body.chapterIds.filter((c): c is string => typeof c === 'string') as string[])
      : [];
    if (chapterIds.length === 0) {
      throw new AppException('INVALID_INPUT', 'chapterIds[] is required.', 400);
    }
    const blueprint = body.blueprint as PaperBlueprint | undefined;
    if (!blueprint || !Array.isArray(blueprint.questionTypes)) {
      throw new AppException('INVALID_INPUT', 'blueprint.questionTypes[] is required.', 400);
    }
    const totalMarks =
      typeof body.totalMarks === 'number' && body.totalMarks > 0 ? body.totalMarks : 80;
    const durationMinutes =
      typeof body.durationMinutes === 'number' && body.durationMinutes > 0
        ? body.durationMinutes
        : 180;
    const locale: Locale = isSupportedLocale(body.locale) ? body.locale : 'en';

    const result = await generateQuestionPaper({
      subject: typeof body.subject === 'string' ? body.subject : '',
      classGrade: typeof body.classGrade === 'string' ? body.classGrade : '',
      chapterIds,
      blueprint,
      totalMarks,
      durationMinutes,
      locale,
    });

    await logTeacherAiUsage({
      teacherUid: auth.userId,
      schoolId: auth.schoolId,
      generator: 'questionPaper',
      locale,
    });

    return apiSuccess({
      draft: result.draft,
      chapters: result.chapters,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
