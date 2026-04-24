/**
 * POST /api/hpc — persist a reviewed HPC narrative (teacher approves).
 * GET /api/hpc?classId=&term= — list narratives for a class + term.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import { adminDb } from '@/lib/firebase/admin';
import {
  listHpcNarrativesForClass,
  saveHpcNarrative,
  type HpcStatus,
} from '@/lib/firebase/schoolService';

async function assertKidInSchool(kidId: string, schoolId: string): Promise<void> {
  const kidSnap = await adminDb.collection('kids').doc(kidId).get();
  if (!kidSnap.exists) {
    throw new AppException('NOT_FOUND', 'Student not found.', 404);
  }
  if (kidSnap.data()?.schoolId !== schoolId) {
    throw new AppException('FORBIDDEN', 'Student is not in your school.', 403);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    if (!auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Teacher is not attached to a school.', 403);
    }
    const body = (await request.json()) as Record<string, unknown>;

    const kidId = typeof body.kidId === 'string' ? body.kidId : '';
    const term = typeof body.term === 'string' ? body.term.trim() : '';
    const locale = body.locale === 'hi' ? ('hi' as const) : ('en' as const);
    const cognitive = typeof body.cognitive === 'string' ? body.cognitive : '';
    const affective = typeof body.affective === 'string' ? body.affective : '';
    const psychomotor = typeof body.psychomotor === 'string' ? body.psychomotor : '';
    const nextTermFocus =
      typeof body.nextTermFocus === 'string' ? body.nextTermFocus : undefined;
    const teacherTags = Array.isArray(body.teacherTags)
      ? (body.teacherTags.filter((t): t is string => typeof t === 'string') as string[])
      : [];
    const status: HpcStatus = body.status === 'published' ? 'published' : 'draft';

    if (!kidId || !term || !cognitive || !affective || !psychomotor) {
      throw new AppException(
        'INVALID_INPUT',
        'kidId, term, cognitive, affective, and psychomotor are required.',
        400,
      );
    }

    await assertKidInSchool(kidId, auth.schoolId);

    const doc = await saveHpcNarrative({
      schoolId: auth.schoolId,
      kidId,
      term,
      locale,
      cognitive: cognitive.slice(0, 2000),
      affective: affective.slice(0, 2000),
      psychomotor: psychomotor.slice(0, 2000),
      nextTermFocus: nextTermFocus?.slice(0, 1000),
      teacherTags,
      status,
      actingUid: auth.userId,
    });

    return apiSuccess({ narrative: doc });
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
    const classId = url.searchParams.get('classId');
    const term = url.searchParams.get('term');
    if (!classId || !term) {
      throw new AppException('INVALID_INPUT', 'classId and term are required.', 400);
    }
    const narratives = await listHpcNarrativesForClass(auth.schoolId, classId, term);
    return apiSuccess({ narratives });
  } catch (error) {
    return handleApiError(error);
  }
}
