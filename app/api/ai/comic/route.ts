/**
 * POST /api/ai/comic — thin HTTP wrapper around the createComic capability.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { comicInputSchema } from '@/lib/validators';
import { checkRateLimit, enforceIpRateLimit } from '@/lib/firebase/sessionService';
import { createComic } from '@/lib/capabilities/createComic';

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    const input = comicInputSchema.parse(await request.json());

    const ipAddress =
      request.headers.get('x-nf-client-connection-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      null;
    await enforceIpRateLimit(ipAddress);
    await checkRateLimit(sessionId);

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
