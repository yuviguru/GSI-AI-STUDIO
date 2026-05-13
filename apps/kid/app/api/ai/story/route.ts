/**
 * POST /api/ai/story — thin HTTP wrapper around the createStory capability.
 *
 * The orchestration logic (LLM, images, safety, persist) lives in
 * `lib/capabilities/createStory.ts` so the same flow is reused by MCP,
 * WhatsApp, and any future channel.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { storyInputSchema } from '@/lib/validators';
import { checkRateLimit, enforceIpRateLimit } from '@gsi/firebase/sessionService';
import { createStory } from '@/lib/capabilities/createStory';

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    const input = storyInputSchema.parse(await request.json());

    const ipAddress =
      request.headers.get('x-nf-client-connection-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      null;
    await enforceIpRateLimit(ipAddress);
    await checkRateLimit(sessionId);

    const result = await createStory({ sessionId, ...input });

    return apiSuccess({
      story: result.story,
      aiXray: result.aiXray,
      creationId: result.creationId,
      shareUrl: result.shareUrl,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
