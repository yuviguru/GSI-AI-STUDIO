/**
 * POST /api/lessons/generate — draft a lesson plan. Does not persist.
 *
 * Teacher / schoolAdmin gated. Rate-limited per teacher. No DPDP gate
 * needed — lesson plans don't process kid data.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import { generateLessonPlan } from '@gsi/ai/lessonPlanGenerator';
import {
  checkAndIncrementAiRate,
  logTeacherAiUsage,
} from '@gsi/firebase/teacherAiUsageService';
import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

const VALID_STUDIOS = new Set(['story', 'music', 'quiz', 'game', 'comic']);

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    if (!auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Teacher is not attached to a school.', 403);
    }

    await checkAndIncrementAiRate({
      teacherUid: auth.userId,
      generator: 'lessonPlan',
      cap: 30,
    });

    const body = (await request.json()) as Record<string, unknown>;
    const chapterId = typeof body.chapterId === 'string' ? body.chapterId : '';
    if (!chapterId) {
      throw new AppException('INVALID_INPUT', 'chapterId is required.', 400);
    }
    const durationMinutes =
      typeof body.durationMinutes === 'number' && body.durationMinutes > 0
        ? body.durationMinutes
        : 40;
    const locale: Locale = isSupportedLocale(body.locale) ? body.locale : 'en';
    const studioPreference =
      typeof body.studioPreference === 'string' && VALID_STUDIOS.has(body.studioPreference)
        ? (body.studioPreference as 'story' | 'music' | 'quiz' | 'game' | 'comic')
        : undefined;

    const result = await generateLessonPlan({
      chapterId,
      durationMinutes,
      locale,
      studioPreference,
    });

    await logTeacherAiUsage({
      teacherUid: auth.userId,
      schoolId: auth.schoolId,
      generator: 'lessonPlan',
      locale,
    });

    return apiSuccess({
      draft: result.draft,
      chapter: result.chapter,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
