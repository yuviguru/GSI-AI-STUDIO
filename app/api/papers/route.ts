/**
 * POST /api/papers — persist a finalized / draft paper.
 * GET  /api/papers — list current teacher's papers.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import {
  createQuestionPaper,
  listQuestionPapersForTeacher,
  type QuestionPaperStatus,
} from '@/lib/firebase/questionPaperService';
import { getChapter } from '@/lib/curriculum/ncertIndex';
import {
  isSupportedLocale,
  type Locale,
} from '@/lib/i18n/locales';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    if (!auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Teacher is not attached to a school.', 403);
    }
    const body = (await request.json()) as Record<string, unknown>;
    const chapterIds = Array.isArray(body.chapterIds)
      ? (body.chapterIds.filter((c): c is string => typeof c === 'string') as string[])
      : [];
    if (chapterIds.length === 0) {
      throw new AppException('INVALID_INPUT', 'chapterIds[] is required.', 400);
    }
    const draft = body.draft as never;
    if (!draft) {
      throw new AppException('INVALID_INPUT', 'draft is required.', 400);
    }
    const blueprint = body.blueprint as never;
    if (!blueprint) {
      throw new AppException('INVALID_INPUT', 'blueprint is required.', 400);
    }

    const firstChapter = getChapter(chapterIds[0]!);
    if (!firstChapter) {
      throw new AppException('NOT_FOUND', 'First chapter not in NCERT index.', 404);
    }

    const totalMarks =
      typeof body.totalMarks === 'number' && body.totalMarks > 0 ? body.totalMarks : 80;
    const durationMinutes =
      typeof body.durationMinutes === 'number' && body.durationMinutes > 0
        ? body.durationMinutes
        : 180;
    const locale: Locale = isSupportedLocale(body.locale) ? body.locale : 'en';
    const status: QuestionPaperStatus =
      body.status === 'finalized' ? 'finalized' : 'draft';

    const doc = await createQuestionPaper({
      teacherUid: auth.userId,
      schoolId: auth.schoolId,
      subject: firstChapter.subject,
      classGrade: firstChapter.class,
      chapterIds,
      blueprint,
      totalMarks,
      durationMinutes,
      locale,
      draft,
      status,
    });
    return apiSuccess({ paper: doc }, 201);
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
    const papers = await listQuestionPapersForTeacher(auth.userId, {
      subject,
      classGrade,
    });
    return apiSuccess({ papers });
  } catch (error) {
    return handleApiError(error);
  }
}
