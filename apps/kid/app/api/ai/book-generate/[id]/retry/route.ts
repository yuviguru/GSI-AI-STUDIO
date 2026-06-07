import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { aiBookGenerateSchema } from '@/lib/validators';
import { checkRateLimit, enforceIpRateLimit } from '@gsi/firebase/sessionService';
import { getBookGenerationInput, resetBookForRetry } from '@gsi/firebase/bookService';
import { enforceBilling } from '@/lib/billing';
import { ipFromRequest } from '@/lib/api/requestUtils';
import { enqueueBookGenerationJob } from '@/lib/books/enqueueBookGenerationJob';

export const maxDuration = 15;

/** kidId from `kid-<kidId>-<YYYY-MM-DD>`; null for anonymous sessions. */
function kidIdFromSession(sessionId: string): string | null {
  return sessionId.startsWith('kid-') ? (sessionId.split('-')[1] ?? null) : null;
}

/**
 * POST /api/ai/book-generate/[id]/retry (BOOK-008)
 *
 * Re-run a FAILED book using its stored generate input — the kid re-enters
 * nothing. Re-bills (the original debit was refunded when it failed), resets the
 * book to `pending`, and re-enqueues the background job.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) throw new AppException('UNAUTHORIZED', 'Missing session', 401);

    await enforceIpRateLimit(ipFromRequest(request));
    await checkRateLimit(sessionId);

    const kidId = kidIdFromSession(sessionId);
    const bookId = params.id;
    const scope = { sessionId, kidId };

    const { input: raw, status } = await getBookGenerationInput(bookId, scope);
    if (status !== 'failed') {
      throw new AppException('INVALID_INPUT', 'This book can only be retried after it failed.', 400);
    }
    if (!raw) {
      throw new AppException('INVALID_INPUT', 'No saved settings to retry — start a new book.', 400);
    }
    const input = aiBookGenerateSchema.parse(raw);

    // Re-bill — the failed run already refunded the original debit.
    const isPremium = input.quality === 'premium';
    const perImageFeature = isPremium ? 'image.nanoBanana' : 'image.qwenEdit';
    let billedCredits = 0;
    const debit = async (feature: string) => {
      const r = await enforceBilling(request, { feature });
      billedCredits += r.charged;
    };
    await debit('book.aiGenerate');
    await debit('image.flux');
    for (let i = 0; i < input.pageCount + 1; i++) await debit(perImageFeature);

    await resetBookForRetry(bookId, scope);
    await enqueueBookGenerationJob({ bookId, input, scope, billedCredits });

    return apiSuccess({ bookId, status: 'generating' });
  } catch (error) {
    return handleApiError(error);
  }
}
