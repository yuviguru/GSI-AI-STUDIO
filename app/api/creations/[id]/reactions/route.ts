/**
 * POST   /api/creations/[id]/reactions { emoji } — add / change reaction
 * DELETE /api/creations/[id]/reactions             — remove
 *
 * Caller must be a kid in the same class as the creation's submission.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import { adminDb } from '@/lib/firebase/admin';
import {
  addReaction,
  isAllowedReaction,
  isKidInClass,
  removeReaction,
} from '@/lib/firebase/classFeedService';

async function resolveActor(
  request: NextRequest,
  creationId: string,
): Promise<{ kidId: string; classId: string }> {
  const auth = await verifyAuth(request);
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

  // Look up the submission for this creation that's been shared in any
  // class the kid belongs to.
  const subSnap = await adminDb
    .collection('submissions')
    .where('creationId', '==', creationId)
    .get();
  const candidates = subSnap.docs
    .map((d) => d.data() as Record<string, unknown>)
    .filter((d) => d.sharedToClassFeed === true && d.status === 'approved');
  if (candidates.length === 0) {
    throw new AppException('FORBIDDEN', 'Creation is not shared in any class feed.', 403);
  }

  const schoolId = (kid.schoolId as string | undefined) ?? '';
  let allowedClassId: string | null = null;
  for (const c of candidates) {
    if (c.schoolId !== schoolId) continue;
    const inClass = await isKidInClass(schoolId, c.classId as string, kidId);
    if (inClass) {
      allowedClassId = c.classId as string;
      break;
    }
  }
  if (!allowedClassId) {
    throw new AppException(
      'FORBIDDEN',
      'You are not in a class where this creation is shared.',
      403,
    );
  }
  return { kidId, classId: allowedClassId };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { kidId } = await resolveActor(request, params.id);
    const body = (await request.json()) as Record<string, unknown>;
    const emoji = body.emoji;
    if (!isAllowedReaction(emoji)) {
      throw new AppException(
        'INVALID_INPUT',
        'emoji must be one of the allowed positive reactions.',
        400,
      );
    }
    await addReaction({ creationId: params.id, kidId, emoji });
    return apiSuccess({ creationId: params.id, emoji, set: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { kidId } = await resolveActor(request, params.id);
    await removeReaction({ creationId: params.id, kidId });
    return apiSuccess({ creationId: params.id, removed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
