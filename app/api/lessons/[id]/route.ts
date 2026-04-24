/**
 * GET / PATCH /api/lessons/[id] — fetch / edit a saved lesson plan.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import {
  getLessonPlan,
  updateLessonPlan,
} from '@/lib/firebase/lessonPlanService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    const plan = await getLessonPlan(params.id);
    if (!plan) {
      throw new AppException('NOT_FOUND', 'Lesson plan not found.', 404);
    }
    if (
      plan.schoolId !== auth.schoolId ||
      (auth.role === 'teacher' && plan.teacherUid !== auth.userId)
    ) {
      throw new AppException('FORBIDDEN', 'Not your lesson plan.', 403);
    }
    return apiSuccess({ plan });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    const body = (await request.json()) as Record<string, unknown>;
    const plan = await updateLessonPlan(params.id, auth.userId, body as never);
    return apiSuccess({ plan });
  } catch (error) {
    return handleApiError(error);
  }
}
