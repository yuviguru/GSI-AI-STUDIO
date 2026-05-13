/**
 * POST /api/lessons — persist a lesson plan (teacher edits then saves).
 * GET  /api/lessons — list current teacher's plans.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import {
  createLessonPlan,
  listLessonPlansForTeacher,
} from '@gsi/firebase/lessonPlanService';
import { getChapter } from '@/lib/curriculum/ncertIndex';
import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    if (!auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Teacher is not attached to a school.', 403);
    }

    const body = (await request.json()) as Record<string, unknown>;
    const chapterId = typeof body.chapterId === 'string' ? body.chapterId : '';
    const draft = body.draft as Record<string, unknown> | undefined;
    if (!chapterId || !draft) {
      throw new AppException('INVALID_INPUT', 'chapterId and draft are required.', 400);
    }
    const chapter = getChapter(chapterId);
    if (!chapter) {
      throw new AppException('NOT_FOUND', 'Chapter not in NCERT index.', 404);
    }
    const durationMinutes =
      typeof body.durationMinutes === 'number' && body.durationMinutes > 0
        ? body.durationMinutes
        : 40;
    const locale: Locale = isSupportedLocale(body.locale) ? body.locale : 'en';

    const doc = await createLessonPlan({
      teacherUid: auth.userId,
      schoolId: auth.schoolId,
      subject: chapter.subject,
      classGrade: chapter.class,
      chapterId,
      chapterName: chapter.chapterName,
      durationMinutes,
      locale,
      studioPreference: (draft.mainActivity as { linkedStudio?: string } | undefined)
        ?.linkedStudio as
        | 'story'
        | 'music'
        | 'quiz'
        | 'game'
        | 'comic'
        | undefined,
      draft: draft as never,
    });
    return apiSuccess({ plan: doc }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    if (!auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Teacher is not attached to a school.', 403);
    }
    const url = new URL(request.url);
    const subject = url.searchParams.get('subject') ?? undefined;
    const classGrade = url.searchParams.get('classGrade') ?? undefined;
    const plans = await listLessonPlansForTeacher(auth.userId, { subject, classGrade });
    return apiSuccess({ plans });
  } catch (error) {
    return handleApiError(error);
  }
}
