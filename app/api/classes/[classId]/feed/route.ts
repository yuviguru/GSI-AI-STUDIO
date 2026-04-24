/**
 * GET /api/classes/[classId]/feed?cursor=
 *
 * Returns the class feed of teacher-approved + explicitly-shared
 * creations. Caller must be a kid in the class (X-Active-Kid-Id) OR a
 * teacher / schoolAdmin in the school.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import { adminDb } from '@/lib/firebase/admin';
import { isKidInClass, listClassFeed } from '@/lib/firebase/classFeedService';

async function resolveScope(
  request: NextRequest,
  classId: string,
): Promise<{ schoolId: string; viewerKidId?: string }> {
  const auth = await verifyAuth(request);

  // Teacher / schoolAdmin: scope by their school, but re-verify the class
  // actually belongs to that school. Defence-in-depth: the downstream
  // `listClassFeed` already filters by `schoolId`, but explicit checks
  // turn silent empty results into explicit 403 / 404 responses.
  if (auth.role === 'teacher' || auth.role === 'schoolAdmin') {
    if (!auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Not attached to a school.', 403);
    }
    const classSnap = await adminDb
      .collection('schools')
      .doc(auth.schoolId)
      .collection('classes')
      .doc(classId)
      .get();
    if (!classSnap.exists) {
      throw new AppException('NOT_FOUND', 'Class not found in your school.', 404);
    }
    return { schoolId: auth.schoolId };
  }

  // Parent: requires an X-Active-Kid-Id header for a kid in this class.
  const kidId = request.headers.get('X-Active-Kid-Id');
  if (!kidId) {
    throw new AppException('KID_REQUIRED', 'X-Active-Kid-Id header is required.', 400);
  }
  const kidSnap = await adminDb.collection('kids').doc(kidId).get();
  if (!kidSnap.exists) {
    throw new AppException('NOT_FOUND', 'Kid not found.', 404);
  }
  const kid = kidSnap.data() as Record<string, unknown>;
  if (kid.parentId !== auth.userId) {
    throw new AppException('FORBIDDEN', 'That kid is not yours.', 403);
  }
  const schoolId = (kid.schoolId as string | undefined) ?? '';
  if (!schoolId) {
    throw new AppException('FORBIDDEN', 'Kid is not in any school.', 403);
  }
  const inClass = await isKidInClass(schoolId, classId, kidId);
  if (!inClass) {
    throw new AppException('FORBIDDEN', 'Kid is not in this class.', 403);
  }
  return { schoolId, viewerKidId: kidId };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { classId: string } },
) {
  try {
    const { schoolId, viewerKidId } = await resolveScope(request, params.classId);
    const cursorRaw = new URL(request.url).searchParams.get('cursor');
    const cursor = cursorRaw ? Number(cursorRaw) : undefined;

    const result = await listClassFeed({
      schoolId,
      classId: params.classId,
      viewerKidId,
      cursor: Number.isFinite(cursor) ? cursor : undefined,
    });
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
