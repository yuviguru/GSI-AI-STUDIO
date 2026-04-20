import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { listBusinessesForSession } from '@/lib/firebase/ceoService';

/**
 * GET /api/ceo/businesses
 *
 * List every Kid CEO business for the current session — active + completed —
 * newest first. Used by the /ceo landing page to show all the kid's running
 * sims so they can pick one to continue. Single-business reads go through
 * `GET /api/ceo/business?businessId=...` instead.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    const businesses = await listBusinessesForSession(sessionId, 20);
    return apiSuccess({ businesses });
  } catch (error) {
    return handleApiError(error);
  }
}
