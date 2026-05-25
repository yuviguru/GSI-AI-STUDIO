import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { musicInputSchema } from '@/lib/validators';
import { checkRateLimit, enforceIpRateLimit } from '@gsi/firebase/sessionService';
import { createMusic } from '@/lib/capabilities/createMusic';
import { enforceBilling } from '@/lib/billing';
import { ipFromRequest } from '@/lib/api/requestUtils';

/** POST /api/ai/music — thin HTTP wrapper around the createMusic capability. */
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) throw new AppException('UNAUTHORIZED', 'Missing session', 401);

    const input = musicInputSchema.parse(await request.json());
    await enforceIpRateLimit(ipFromRequest(request));
    await checkRateLimit(sessionId);
    await enforceBilling(request, { feature: 'music.compose' });

    const result = await createMusic({ sessionId, ...input });
    return apiSuccess({
      music: result.music,
      aiXray: result.aiXray,
      creationId: result.creationId,
      shareUrl: result.shareUrl,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
