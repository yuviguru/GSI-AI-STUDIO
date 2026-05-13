/**
 * COMMS-002: persisted PTM notes — list (GET) and create (POST).
 *
 * Auth: teacher or schoolAdmin attached to a school. Notes are scoped to the
 * teacher's schoolId.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import { adminDb } from '@gsi/firebase/admin';
import { getClass } from '@gsi/firebase/schoolService';
import type { AuthContext } from '@gsi/types';
import {
  createPtmNote,
  listPtmNotesForClass,
  listPtmNotesForKid,
} from '@gsi/firebase/ptmNotesService';

/**
 * Verify that the calling teacher actually owns this class. School admins
 * can read/write any class in their school; teachers can only touch their
 * own classes. Mirrors the protection the class-detail API enforces.
 */
async function assertClassAccess(auth: AuthContext, schoolId: string, classId: string) {
  if (auth.role === 'schoolAdmin') return;
  const cls = await getClass(schoolId, classId);
  if (!cls) {
    throw new AppException('NOT_FOUND', 'Class not found.', 404);
  }
  if (cls.teacherUid !== auth.userId) {
    throw new AppException(
      'FORBIDDEN',
      'Teachers can only access PTM notes for their own classes.',
      403,
    );
  }
}

/**
 * Same protection but anchored on a kid id — resolves the kid's class(es)
 * and confirms the caller (teacher) owns at least one of them.
 */
async function assertKidAccess(auth: AuthContext, schoolId: string, kidId: string) {
  if (auth.role === 'schoolAdmin') return;
  const kidSnap = await adminDb.collection('kids').doc(kidId).get();
  if (!kidSnap.exists) {
    throw new AppException('NOT_FOUND', 'Student not found.', 404);
  }
  const kid = kidSnap.data() as Record<string, unknown>;
  if (kid.schoolId !== schoolId) {
    throw new AppException('FORBIDDEN', 'Student is not in your school.', 403);
  }
  const classIds = Array.isArray(kid.classIds) ? (kid.classIds as string[]) : [];
  for (const cid of classIds) {
    const cls = await getClass(schoolId, cid);
    if (cls?.teacherUid === auth.userId) return;
  }
  throw new AppException(
    'FORBIDDEN',
    "Teachers can only access PTM notes for their own classes' students.",
    403,
  );
}

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
      await assertKidAccess(auth, auth.schoolId, kidId);
      const notes = await listPtmNotesForKid(auth.schoolId, kidId);
      return apiSuccess({ notes });
    }
    if (classId) {
      await assertClassAccess(auth, auth.schoolId, classId);
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

    await assertClassAccess(auth, auth.schoolId, classId);

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
