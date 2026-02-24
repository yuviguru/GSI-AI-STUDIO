import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';

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

    // TODO: Implement in INFRA-001
    // - Check Firestore for existing session
    // - If expired or missing, create new session doc
    // - Return remaining creation count + cooldown

    return apiSuccess({
      sessionId,
      creationsRemaining: 5,
      cooldownSeconds: 0,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
