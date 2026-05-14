import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { getCreation, incrementView, archiveCreation } from '@gsi/firebase/creationService';

/**
 * GET /api/creations/:id — Fetch a single creation
 * Returns public creations to anyone. Private creations require matching session.
 * See: docs/api-contracts.md#creations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const creation = await getCreation(params.id);

    // Private creations are only visible to their owner
    if (!creation.isPublic) {
      const sessionId = request.headers.get('X-Session-Id');
      if (sessionId !== creation.sessionId) {
        throw new AppException('NOT_FOUND', 'Creation not found', 404);
      }
    }

    // Increment view count in the background (fire-and-forget)
    incrementView(params.id).catch(() => {
      // View count increment is non-critical; swallow errors
    });

    // Strip sessionId from public responses to prevent session impersonation
    const sessionId = request.headers.get('X-Session-Id');
    const isOwner = sessionId === creation.sessionId;
    if (!isOwner) {
      const { sessionId: _sid, ...publicCreation } = creation;
      return apiSuccess(publicCreation);
    }

    return apiSuccess(creation);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/creations/:id — Soft-delete (archive) a creation
 * Requires matching session ownership.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    await archiveCreation(params.id, sessionId);

    return apiSuccess(null);
  } catch (error) {
    return handleApiError(error);
  }
}
