import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { quizInputSchema } from '@/lib/validators';
import { checkRateLimit, enforceIpRateLimit } from '@gsi/firebase/sessionService';
import { createQuiz } from '@/lib/capabilities/createQuiz';
import { enforceBilling } from '@/lib/billing';
import { ipFromRequest } from '@/lib/api/requestUtils';

/** POST /api/ai/quiz — thin HTTP wrapper around the createQuiz capability. */
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) throw new AppException('UNAUTHORIZED', 'Missing session', 401);

    const input = quizInputSchema.parse(await request.json());
    await enforceIpRateLimit(ipFromRequest(request));
    await checkRateLimit(sessionId);
    await enforceBilling(request, { feature: 'quiz.generate' });

    const result = await createQuiz({ sessionId, ...input });
    return apiSuccess({
      quiz: result.quiz,
      aiXray: result.aiXray,
      creationId: result.creationId,
      shareUrl: result.shareUrl,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
