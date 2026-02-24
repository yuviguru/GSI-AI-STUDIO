import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { saveCreationSchema } from '@/lib/validators';

/**
 * POST /api/creations — Save a new creation
 * GET /api/creations — List creations (by session or user)
 * See: docs/api-contracts.md#creations
 */
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    const body = await request.json();
    const input = saveCreationSchema.parse(body);

    // TODO: Implement in INFRA-002
    // - Save to Firestore creations collection
    // - Generate share URL
    // - Update session creation count

    return apiSuccess({ id: 'placeholder', ...input }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const cursor = searchParams.get('cursor');

    // TODO: Implement in INFRA-002
    // - Query Firestore by sessionId (Phase 1) or userId (Phase 2)
    // - Filter by type if provided
    // - Paginate with cursor

    return apiSuccess({ items: [], nextCursor: null, hasMore: false });
  } catch (error) {
    return handleApiError(error);
  }
}
