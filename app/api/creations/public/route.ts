import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { listPublicCreations, getTopCreators } from '@/lib/firebase/creationService';
import type { CreationType } from '@/types/creation.types';

export const dynamic = 'force-dynamic';

const VALID_SORT = ['trending', 'newest'] as const;
type SortOption = (typeof VALID_SORT)[number];

/**
 * GET /api/creations/public — List public creations (no auth required)
 * Query params: type, sort (trending|newest), cursor, limit
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as CreationType | null;
    const sortRaw = searchParams.get('sort') ?? 'newest';
    const cursor = searchParams.get('cursor');
    const limitRaw = searchParams.get('limit');
    const leaderboard = searchParams.get('leaderboard');

    // Return top creators if leaderboard param is set
    if (leaderboard === 'true') {
      const creators = await getTopCreators(5);
      return apiSuccess({ creators });
    }

    // Validate sort param
    if (!VALID_SORT.includes(sortRaw as SortOption)) {
      throw new AppException('INVALID_INPUT', 'Sort must be "trending" or "newest"', 400);
    }

    const parsedLimit = limitRaw ? parseInt(limitRaw, 10) : NaN;
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined;

    const result = await listPublicCreations({
      type: type ?? undefined,
      sort: sortRaw as SortOption,
      cursor: cursor ?? undefined,
      limit,
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
