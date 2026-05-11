/**
 * COMMS-002: persisted PTM notes — list (GET) and create (POST).
 *
 * Auth: teacher or schoolAdmin attached to a school. Notes are scoped to the
 * teacher's schoolId.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import {
  createPtmNote,
  listPtmNotesForClass,
  listPtmNotesForKid,
} from '@/lib/firebase/ptmNotesService';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    if (!auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Teacher is not attached to a school.', 403);
    }
    const url = new URL(request.url);
    const classId = url.searchParams.get('classId');
    const kidId = url.searchParams.get('kidId');

    if (kidId) {
      const notes = await listPtmNotesForKid(auth.schoolId, kidId);
      return apiSuccess({ notes });
    }
    if (classId) {
      const notes = await listPtmNotesForClass(auth.schoolId, classId);
      return apiSuccess({ notes });
    }
    throw new AppException('INVALID_INPUT', 'classId or kidId required.', 400);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    if (!auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Teacher is not attached to a school.', 403);
    }

    const body = (await request.json()) as Record<string, unknown>;
    const classId = typeof body.classId === 'string' ? body.classId : '';
    const kidId = typeof body.kidId === 'string' ? body.kidId : '';
    const term = typeof body.term === 'string' ? body.term.trim() : '';
    const noteBody = typeof body.body === 'string' ? body.body : '';

    if (!classId || !kidId || !term || !noteBody) {
      throw new AppException(
        'INVALID_INPUT',
        'classId, kidId, term and body are required.',
        400,
      );
    }

    const note = await createPtmNote({
      schoolId: auth.schoolId,
      classId,
      kidId,
      authorUid: auth.userId,
      term,
      body: noteBody,
    });
    return apiSuccess({ note }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
