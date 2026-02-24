import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError } from '@/lib/api-utils';
import { getCreation, incrementView } from '@/lib/firebase/creationService';

/**
 * GET /api/creations/:id — Fetch a single creation
 * Public endpoint: increments view count on each fetch.
 * See: docs/api-contracts.md#creations
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const creation = await getCreation(params.id);

    // Increment view count in the background (fire-and-forget)
    incrementView(params.id).catch(() => {
      // View count increment is non-critical; swallow errors
    });

    return apiSuccess(creation);
  } catch (error) {
    return handleApiError(error);
  }
}
