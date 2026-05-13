/**
 * POST /api/substitutes/find
 *
 * Body: { absentTeacherUid, date (ISO), periodIdxs: number[] }
 * Returns ranked sub candidates per requested period.
 *
 * schoolAdmin only — sub assignment is an operational decision.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import {
  classAtPeriod,
  findFreeTeachersForPeriod,
  weekdayFromDate,
  type SubCandidate,
} from '@gsi/firebase/timetableService';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['schoolAdmin']);
    if (!auth.schoolId) {
      throw new AppException('FORBIDDEN', 'You are not attached to a school.', 403);
    }

    const body = (await request.json()) as Record<string, unknown>;
    const absentTeacherUid =
      typeof body.absentTeacherUid === 'string' ? body.absentTeacherUid : '';
    const dateStr = typeof body.date === 'string' ? body.date : '';
    const periodIdxs = Array.isArray(body.periodIdxs)
      ? (body.periodIdxs.filter((p): p is number => typeof p === 'number') as number[])
      : [];

    if (!absentTeacherUid) {
      throw new AppException('INVALID_INPUT', 'absentTeacherUid is required.', 400);
    }
    if (!dateStr) {
      throw new AppException('INVALID_INPUT', 'date is required.', 400);
    }
    if (periodIdxs.length === 0) {
      throw new AppException('INVALID_INPUT', 'periodIdxs[] is required.', 400);
    }
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      throw new AppException('INVALID_INPUT', 'date is invalid.', 400);
    }
    const weekday = weekdayFromDate(date);
    if (!weekday) {
      throw new AppException('INVALID_INPUT', 'date falls on a non-school day.', 400);
    }

    const perPeriod: Array<{
      periodIdx: number;
      subject?: string;
      classId?: string;
      candidates: SubCandidate[];
    }> = [];

    for (const periodIdx of periodIdxs) {
      const slot = await classAtPeriod(auth.schoolId, absentTeacherUid, weekday, periodIdx);
      const candidates = await findFreeTeachersForPeriod({
        schoolId: auth.schoolId,
        weekday,
        periodIdx,
        absentTeacherUid,
        absentTeacherSubject: slot?.subject,
      });
      perPeriod.push({
        periodIdx,
        subject: slot?.subject,
        classId: slot?.classId,
        candidates: candidates.slice(0, 5),
      });
    }

    return apiSuccess({ weekday, perPeriod });
  } catch (error) {
    return handleApiError(error);
  }
}
