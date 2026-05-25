import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { comicInputSchema } from '@/lib/validators';
import { checkRateLimit, enforceIpRateLimit } from '@gsi/firebase/sessionService';
import { createComic } from '@/lib/capabilities/createComic';
import { enforceBilling } from '@/lib/billing';
import { ipFromRequest } from '@/lib/api/requestUtils';

/** POST /api/ai/comic — thin HTTP wrapper around the createComic capability. */
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) throw new AppException('UNAUTHORIZED', 'Missing session', 401);

    const input = comicInputSchema.parse(await request.json());
    await enforceIpRateLimit(ipFromRequest(request));
    await checkRateLimit(sessionId);
    await enforceBilling(request, { feature: 'comic.generate' });

    const result = await createComic({ sessionId, ...input });
    return apiSuccess({
      comic: result.comic,
      aiXray: result.aiXray,
      creationId: result.creationId,
      shareUrl: result.shareUrl,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
