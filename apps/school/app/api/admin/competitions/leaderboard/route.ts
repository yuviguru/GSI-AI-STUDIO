import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import { buildInterSchoolLeaderboard } from '@gsi/firebase/analyticsService';

/**
 * GET /api/admin/competitions/leaderboard
 * Anonymous (school-name-visible) inter-school ranking. Top 20.
 */
export async function GET(request: NextRequest) {
  try {
    // Any teacher or schoolAdmin can peek at the leaderboard — it's already
    // school-level aggregate data.
    await requireRole(request, ['teacher', 'schoolAdmin']);
    const url = new URL(request.url);
    const board = url.searchParams.get('board') ?? undefined;
    const state = url.searchParams.get('state') ?? undefined;
    const rankings = await buildInterSchoolLeaderboard({ board, state });
    return apiSuccess({ rankings });
  } catch (error) {
    return handleApiError(error);
  }
}
