import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import { updateKid, getKid } from '@gsi/firebase/kidService';

/**
 * PATCH /api/users/kids/[kidId]
 * Update a kid profile (name, avatar, age, grade, board).
 * Verifies the authenticated parent owns this kid.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { kidId: string } }
) {
  try {
    const auth = await verifyAuth(request);
    const { kidId } = params;

    if (!kidId) {
      throw new AppException('INVALID_INPUT', 'Kid ID is required', 400);
    }

    const body = await request.json();
    const { name, avatar, age, grade, board } = body;

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 30) {
        throw new AppException('INVALID_INPUT', 'Name must be 1-30 characters', 400);
      }
    }

    // Validate age if provided
    if (age !== undefined && (typeof age !== 'number' || age < 8 || age > 17)) {
      throw new AppException('INVALID_INPUT', 'Age must be between 8 and 17', 400);
    }

    const updated = await updateKid(auth.userId, kidId, {
      name: name?.trim(),
      avatar,
      age,
      grade,
      board,
    });

    return apiSuccess({
      id: updated.id,
      name: updated.name,
      avatar: updated.avatar,
      age: updated.age,
      grade: updated.grade,
      board: updated.board,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/users/kids/[kidId]
 * Get a specific kid profile.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { kidId: string } }
) {
  try {
    const auth = await verifyAuth(request);
    const { kidId } = params;

    const kid = await getKid(kidId);
    if (!kid) {
      throw new AppException('KID_NOT_FOUND', 'Kid profile not found', 404);
    }

    // Verify parent owns this kid
    if (kid.parentId !== auth.userId) {
      throw new AppException('FORBIDDEN', 'You do not have permission to view this profile', 403);
    }

    return apiSuccess({
      id: kid.id,
      name: kid.name,
      avatar: kid.avatar,
      age: kid.age,
      grade: kid.grade,
      board: kid.board,
      aiPoints: kid.aiPoints,
      badges: kid.badges,
      totalCreations: kid.totalCreations,
      streak: kid.streak,
      conceptsLearned: kid.conceptsLearned,
      creationsByType: kid.creationsByType,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
