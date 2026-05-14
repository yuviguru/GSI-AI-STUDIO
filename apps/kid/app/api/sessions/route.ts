import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { getOrCreateSession } from '@gsi/firebase/sessionService';

/**
 * POST /api/sessions
 * Create or refresh an anonymous session. Returns remaining creation count.
 * See: docs/api-contracts.md#post-apisessions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionId = body.sessionId;

    if (!sessionId || typeof sessionId !== 'string') {
      throw new AppException('INVALID_INPUT', 'Session ID required', 400);
    }

    const fingerprint = typeof body.fingerprint === 'string' ? body.fingerprint : undefined;

    const result = await getOrCreateSession(sessionId, fingerprint);

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
