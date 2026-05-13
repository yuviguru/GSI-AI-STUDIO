/**
 * GET  /api/substitutes/timetable — list timetables in the school
 * PUT  /api/substitutes/timetable — upsert a teacher's timetable
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import {
  listTimetablesForSchool,
  saveTeacherTimetable,
} from '@gsi/firebase/timetableService';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['schoolAdmin', 'teacher']);
    if (!auth.schoolId) {
      throw new AppException('FORBIDDEN', 'You are not attached to a school.', 403);
    }
    const all = await listTimetablesForSchool(auth.schoolId);
    return apiSuccess({ timetables: all });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['schoolAdmin']);
    if (!auth.schoolId) {
      throw new AppException('FORBIDDEN', 'You are not attached to a school.', 403);
    }
    const body = (await request.json()) as Record<string, unknown>;
    const teacherUid =
      typeof body.teacherUid === 'string' ? body.teacherUid : '';
    if (!teacherUid) {
      throw new AppException('INVALID_INPUT', 'teacherUid is required.', 400);
    }
    const subjects = Array.isArray(body.subjects)
      ? (body.subjects.filter((s): s is string => typeof s === 'string') as string[])
      : [];
    const seniority =
      typeof body.seniority === 'number' ? body.seniority : 0;
    const periods = (body.periods as Record<string, unknown>) ?? {};

    const tt = await saveTeacherTimetable({
      schoolId: auth.schoolId,
      teacherUid,
      periods: periods as never,
      subjects,
      seniority,
    });
    return apiSuccess({ timetable: tt });
  } catch (error) {
    return handleApiError(error);
  }
}
