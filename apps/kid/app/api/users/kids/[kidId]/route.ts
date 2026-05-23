import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import { updateKid, getKid } from '@gsi/firebase/kidService';
import { isPersistableAvatarUrl } from '@/lib/images/avatarUrl';

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
    const { name, avatar, mascotId, avatarUrl, age, grade, board } = body;

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

    // Validate mascotId — must be from the known roster (matches POST endpoint).
    if (mascotId !== undefined) {
      const { MASCOTS } = await import('@/lib/mascots/roster');
      const validIds = MASCOTS.map((m) => m.id);
      if (typeof mascotId !== 'string' || !validIds.includes(mascotId)) {
        throw new AppException('INVALID_INPUT', 'Unknown mascot', 400);
      }
    }

    // Validate avatarUrl against the same allowlist used by POST + claim-session.
    if (avatarUrl !== undefined && avatarUrl !== null) {
      if (!isPersistableAvatarUrl(avatarUrl)) {
        throw new AppException(
          'INVALID_INPUT',
          'Avatar URL must come from a trusted host (Firebase Storage, Pollinations, or stock CDN)',
          400,
        );
      }
    }

    const updated = await updateKid(auth.userId, kidId, {
      name: name?.trim(),
      avatar,
      mascotId,
      avatarUrl,
      age,
      grade,
      board,
    });

    return apiSuccess({
      id: updated.id,
      name: updated.name,
      avatar: updated.avatar,
      mascotId: updated.mascotId,
      avatarUrl: updated.avatarUrl,
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
      // Mascot + AI-generated avatar URL — mirror the LIST endpoint's
      // shape so single-kid fetches expose the same identity fields.
      mascotId: kid.mascotId,
      avatarUrl: kid.avatarUrl,
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
