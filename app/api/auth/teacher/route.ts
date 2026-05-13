import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth, requireRole } from '@/lib/auth-utils';
import {
  findSchoolByCode,
  createSchool,
  attachTeacherToSchool,
  promoteUserToTeacher,
  setSchoolAdmin,
} from '@/lib/firebase/schoolService';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import type { Board } from '@gsi/types';

const VALID_BOARDS: Board[] = ['cbse', 'icse', 'state'];

/**
 * POST /api/auth/teacher
 * Upgrade the authenticated user to a `teacher` role and attach them to a
 * school. The first teacher for a given schoolCode bootstraps the school
 * and becomes its adminUid (`schoolAdmin`). Subsequent teachers join the
 * existing school as plain `teacher`.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    const body = await request.json();

    const rawCode: unknown = body?.schoolCode;
    if (typeof rawCode !== 'string' || rawCode.trim().length < 3) {
      throw new AppException(
        'INVALID_INPUT',
        'School code is required (at least 3 characters).',
        400,
      );
    }
    const schoolCode = rawCode.trim().toUpperCase();

    const name: string | undefined =
      typeof body?.name === 'string' && body.name.trim().length > 0
        ? body.name.trim().slice(0, 80)
        : undefined;

    let school = await findSchoolByCode(schoolCode);
    let isAdmin = false;

    // Guard against silently transferring an already-registered teacher to a
    // different school. Transfers require explicit admin intervention so a
    // malicious or mistyped schoolCode can't detach a teacher from their
    // existing students.
    if (
      (auth.role === 'teacher' || auth.role === 'schoolAdmin') &&
      auth.schoolId &&
      school &&
      auth.schoolId !== school.id
    ) {
      throw new AppException(
        'ALREADY_TEACHER_ELSEWHERE',
        'You are already registered as a teacher at another school. Contact support to transfer.',
        409,
      );
    }
    if (
      (auth.role === 'teacher' || auth.role === 'schoolAdmin') &&
      auth.schoolId &&
      !school
    ) {
      throw new AppException(
        'ALREADY_TEACHER_ELSEWHERE',
        'You are already registered at another school — you cannot bootstrap a new one from this account.',
        409,
      );
    }

    if (!school) {
      // First teacher bootstraps the school. Require school metadata.
      const meta = body?.school;
      if (
        !meta ||
        typeof meta.name !== 'string' ||
        typeof meta.city !== 'string' ||
        typeof meta.state !== 'string' ||
        !VALID_BOARDS.includes(meta.board)
      ) {
        throw new AppException(
          'INVALID_INPUT',
          'School not found — include { school: { name, city, state, board } } to register a new school.',
          400,
        );
      }
      school = await createSchool({
        name: meta.name.trim().slice(0, 120),
        city: meta.city.trim().slice(0, 80),
        state: meta.state.trim().slice(0, 80),
        board: meta.board,
        schoolCode,
        adminUid: auth.userId,
      });
      await setSchoolAdmin(auth.userId, school.id);
      isAdmin = true;
    } else {
      await attachTeacherToSchool(school.id, auth.userId);
      await promoteUserToTeacher(auth.userId, school.id);
    }

    if (name) {
      await adminDb.collection('users').doc(auth.userId).update({
        name,
        updatedAt: Timestamp.now(),
      });
    }

    return apiSuccess(
      {
        schoolId: school.id,
        schoolName: school.name,
        role: isAdmin ? 'schoolAdmin' : 'teacher',
        isAdmin,
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/auth/teacher
 * Check if the authenticated user has teacher or schoolAdmin role.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    return apiSuccess({ role: auth.role, schoolId: auth.schoolId });
  } catch (error) {
    return handleApiError(error);
  }
}
