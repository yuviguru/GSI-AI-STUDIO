import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { getCreation, incrementView } from '@/lib/firebase/creationService';

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

    return apiSuccess(creation);
  } catch (error) {
    return handleApiError(error);
  }
}
