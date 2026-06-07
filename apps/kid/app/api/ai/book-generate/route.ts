import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { aiBookGenerateSchema } from '@/lib/validators';
import { filterInput } from '@gsi/safety';
import { checkRateLimit, enforceIpRateLimit, trackCreation } from '@gsi/firebase/sessionService';
import { createPendingGeneratedBook } from '@gsi/firebase/bookService';
import { BOOK_FONTS, getBookTypeCard } from '@/lib/templates/bookTemplates';
import { enforceBilling } from '@/lib/billing';
import { refundCredits } from '@/lib/billing/credits';
import { ipFromRequest } from '@/lib/api/requestUtils';
import { enqueueBookGenerationJob } from '@/lib/books/enqueueBookGenerationJob';

/** This route is now FAST — it bills, writes a pending shell, and enqueues the
 *  background job. The heavy LLM + image pipeline runs in
 *  `lib/books/generateBookJob` (Netlify background function in prod, inline in
 *  dev), so we no longer fight the 26s synchronous limit. */
export const maxDuration = 15;

/** Extract kidId from the session id (`kid-<kidId>-<YYYY-MM-DD>`); null for
 *  anonymous sessions (which have no credit ledger to refund). */
function kidIdFromSession(sessionId: string): string | null {
  return sessionId.startsWith('kid-') ? (sessionId.split('-')[1] ?? null) : null;
}

/**
 * POST /api/ai/book-generate (BOOK-002 / async BOOK-008)
 *
 * Bills the full budget upfront, creates a `pending` book shell so the home
 * tile appears instantly, and enqueues the background generation job. Returns
 * `{ bookId, status: 'generating' }` immediately — the client bounces to the
 * books home and watches the tile fill in.
 *
 * Cost: `book.aiGenerate` + `image.flux` (anchor) + (N + 1) × `image.<model>`
 * (pages + cover, at the chosen quality tier). Debited here; refunded by the
 * job if the draft never lands (hard failure).
 */
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) throw new AppException('UNAUTHORIZED', 'Missing session', 401);

    const input = aiBookGenerateSchema.parse(await request.json());
    filterInput(input.topic); // kid-supplied freeform text

    await enforceIpRateLimit(ipFromRequest(request));
    await checkRateLimit(sessionId);

    const typeCard = getBookTypeCard(input.type);
    if (!typeCard) {
      throw new AppException('INVALID_INPUT', `Unknown book type: ${input.type}`, 400);
    }
    const defaultFont = BOOK_FONTS[0]!;
    const kidId = kidIdFromSession(sessionId);

    // Billing tier (BOOK-008). Standard = Qwen-Image-Edit; Premium = Nano Banana
    // / gpt-image. Both edit a one-time Flux anchor portrait onto every page.
    const isPremium = input.quality === 'premium';
    const perImageFeature = isPremium ? 'image.nanoBanana' : 'image.qwenEdit';

    // Debit the FULL budget upfront so a kid can't start an unfunded job. The
    // background job refunds on a hard failure (no draft produced).
    let billedCredits = 0;
    const debit = async (feature: string) => {
      const r = await enforceBilling(request, { feature });
      billedCredits += r.charged;
    };
    await debit('book.aiGenerate');
    await debit('image.flux'); // hero anchor portrait
    for (let i = 0; i < input.pageCount + 1; i++) await debit(perImageFeature); // pages + cover

    const setup = {
      title: input.title ?? 'My Book',
      author: input.author ?? 'Anonymous Author',
      type: input.type,
      bucket: typeCard.bucket,
      format: input.format,
      size: input.size,
      pageLimit: input.pageCount,
      typography: { titleFont: defaultFont.name, bodyFont: defaultFont.name, baseFontSize: 16 },
      themeColor: typeCard.suggestedThemeColor,
    };

    // Create the pending shell + enqueue. If either fails AFTER the debit, refund
    // so the kid isn't charged for a book that never started.
    let bookId: string;
    try {
      const shell = await createPendingGeneratedBook(
        setup,
        input.pageCount,
        { sessionId, kidId },
        input as Record<string, unknown>, // stored for retry
      );
      bookId = shell.id;
      await enqueueBookGenerationJob({
        bookId,
        input,
        scope: { sessionId, kidId },
        billedCredits,
      });
    } catch (err) {
      if (kidId) {
        await refundCredits({
          kidId,
          amount: billedCredits,
          feature: 'book.aiGenerate',
          reason: 'enqueue_failed',
        }).catch(() => {});
      }
      throw err;
    }

    await trackCreation(sessionId);

    return apiSuccess({
      bookId,
      redirectUrl: '/create/book',
      status: 'generating',
      quality: input.quality,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
