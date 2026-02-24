import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { storyInputSchema } from '@/lib/validators';
import { filterInput } from '@/lib/safety/inputFilter';

/**
 * POST /api/ai/story
 * Generate an illustrated story using Claude (text) + Replicate (images).
 * See: docs/api-contracts.md#post-apiaistory
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validate session
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    // 2. Parse and validate input
    const body = await request.json();
    const input = storyInputSchema.parse(body);

    // 3. Safety filter
    filterInput(input.premise);

    // 4. TODO: Implement in STUDIO-001
    // - Check rate limit (session → Firestore)
    // - Generate story text via Claude
    // - Generate illustrations via Replicate
    // - Build AI X-Ray metadata
    // - Save creation to Firestore
    // - Return story + aiXray

    return apiSuccess({ message: 'Story generation not yet implemented' }, 501);
  } catch (error) {
    return handleApiError(error);
  }
}
