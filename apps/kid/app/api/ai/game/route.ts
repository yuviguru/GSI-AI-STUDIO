import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { gameInputSchema } from '@/lib/validators';
import { checkRateLimit, enforceIpRateLimit } from '@gsi/firebase/sessionService';
import { createGame } from '@/lib/capabilities/createGame';
import { enforceBilling } from '@/lib/billing';
import { ipFromRequest } from '@/lib/api/requestUtils';

/** POST /api/ai/game — thin HTTP wrapper around the createGame capability. */
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) throw new AppException('UNAUTHORIZED', 'Missing session', 401);

    const input = gameInputSchema.parse(await request.json());
    await enforceIpRateLimit(ipFromRequest(request));
    await checkRateLimit(sessionId);
    await enforceBilling(request, { feature: 'game.generate' });

    const result = await createGame({ sessionId, ...input });
    return apiSuccess({
      game: result.game,
      aiXray: result.aiXray,
      creationId: result.creationId,
      shareUrl: result.shareUrl,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
