import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { quizInputSchema } from '@/lib/validators';
import { filterInput } from '@/lib/safety/inputFilter';

/**
 * POST /api/ai/quiz
 * Generate a quiz/game using Claude.
 * See: docs/api-contracts.md#post-apiaiquiz
 */
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    const body = await request.json();
    const input = quizInputSchema.parse(body);

    filterInput(input.topic);

    // TODO: Implement in STUDIO-003
    return apiSuccess({ message: 'Quiz generation not yet implemented' }, 501);
  } catch (error) {
    return handleApiError(error);
  }
}
