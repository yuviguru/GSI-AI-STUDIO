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
import { enforceBilling } from '@/lib/billing';
import { ipFromRequest } from '@/lib/api/requestUtils';

/** POST /api/ai/story — thin HTTP wrapper around the createStory capability. */
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) throw new AppException('UNAUTHORIZED', 'Missing session', 401);

    const input = storyInputSchema.parse(await request.json());
    await enforceIpRateLimit(ipFromRequest(request));
    await checkRateLimit(sessionId);
    await enforceBilling(request, { feature: 'story.generate' });

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
