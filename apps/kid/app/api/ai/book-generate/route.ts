import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { aiBookGenerateSchema } from '@/lib/validators';
import { filterInput, filterOutput, filterImagePrompt } from '@gsi/safety';
import { checkRateLimit, enforceIpRateLimit, trackCreation } from '@gsi/firebase/sessionService';
import { createGeneratedBook } from '@gsi/firebase/bookService';
import { llmRouter } from '@gsi/ai/router';
import { getImageProvider, type ImageStyle } from '@gsi/ai/imageProvider';
import { dimsForBookAndLayout } from '@gsi/ai/imageDims';
import { BOOK_FONTS, getBookTypeCard } from '@/lib/templates/bookTemplates';
import { enforceBilling } from '@/lib/billing';
import { ipFromRequest } from '@/lib/api/requestUtils';
import {
  BOOK_GENERATE_SYSTEM_PROMPT,
  buildBookGenerateUserMessage,
} from '@gsi/ai/prompts/bookGeneratePrompt';

/** Shape Claude/Groq must return. Validated defensively after the router
 *  parses the JSON — provider drift on optional fields shouldn't 500. */
interface BookDraftResponse {
  title: string;
  coverPrompt: string;
  pages: Array<{ plainText: string; imagePrompt: string }>;
}

/** Validate the parsed shape. Router already JSON-parsed; we only check
 *  the structural fields we depend on. Throws AppException on any miss. */
function validateBookDraft(raw: unknown): BookDraftResponse {
  if (!raw || typeof raw !== 'object') {
    throw new AppException('AI_GENERATION_FAILED', 'AI returned an unexpected shape', 502);
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.title !== 'string' || typeof obj.coverPrompt !== 'string') {
    throw new AppException('AI_GENERATION_FAILED', 'AI draft missing title/cover', 502);
  }
  if (!Array.isArray(obj.pages) || obj.pages.length === 0) {
    throw new AppException('AI_GENERATION_FAILED', 'AI draft has no pages', 502);
  }
  const pages = obj.pages
    .filter((p): p is Record<string, unknown> => p !== null && typeof p === 'object')
    .map((p) => ({
      plainText: typeof p.plainText === 'string' ? p.plainText : '',
      imagePrompt: typeof p.imagePrompt === 'string' ? p.imagePrompt : '',
    }))
    .filter((p) => p.plainText.length > 0);
  if (pages.length === 0) {
    throw new AppException('AI_GENERATION_FAILED', 'AI draft pages were all empty', 502);
  }
  return { title: obj.title, coverPrompt: obj.coverPrompt, pages };
}

/**
 * POST /api/ai/book-generate (BOOK-002)
 *
 * Drafts a complete kid's book in one call: topic + age + style → title,
 * cover prompt, N pages of {text, image}. The book is persisted with
 * every page stamped `authorship.source = 'ai_generated'` so future kid
 * edits decay the AI share honestly toward their effort badge (BOOK-003).
 *
 * Cost: `book.aiGenerate` (flat LLM) + N × `image.flux` (per-page image).
 * Charged separately so a 5-page book = 10 + 5×5 = 35 credits at defaults.
 *
 * Returns `{ bookId, pagesGenerated, creditsCharged }`. Client redirects
 * to `/create/book/[bookId]`.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) throw new AppException('UNAUTHORIZED', 'Missing session', 401);

    const input = aiBookGenerateSchema.parse(await request.json());

    // Safety: topic is kid-supplied freeform text
    filterInput(input.topic);

    await enforceIpRateLimit(ipFromRequest(request));
    await checkRateLimit(sessionId);

    // Resolve the bucket + default font for the requested book type.
    const typeCard = getBookTypeCard(input.type);
    if (!typeCard) {
      throw new AppException('INVALID_INPUT', `Unknown book type: ${input.type}`, 400);
    }
    const defaultFont = BOOK_FONTS[0]!;

    // BOOK-002 billing — preflight the FULL budget upfront so partial
    // success can't leave the kid out of pocket without a book.
    // Original P1 bug (Codex review): we billed images AFTER they rendered,
    // so a kid with enough for LLM + 1 image but not 2 spent 15 credits
    // and got no book back. Fixed by debiting everything first; if the
    // wallet can't cover the whole job we fail before any provider call.
    //
    // Image failures after this point don't refund — the provider still
    // charged us per attempt and the kid can regenerate failed pages
    // later via /api/ai/page-image without re-paying for the LLM draft.
    await enforceBilling(request, { feature: 'book.aiGenerate' });
    for (let i = 0; i < input.pageCount; i++) {
      await enforceBilling(request, { feature: 'image.flux' });
    }

    // Generate the draft via the LLM router — auto-picks Claude / Groq /
    // … and falls through to the next provider on auth or transport errors.
    // This is why story / quiz / etc. survive an Anthropic outage; book-
    // generate previously bypassed the router and inherited the risk.
    const parsed = await llmRouter.generateJson<unknown>({
      systemPrompt: BOOK_GENERATE_SYSTEM_PROMPT,
      userMessage: buildBookGenerateUserMessage({
        topic: input.topic,
        age: input.age,
        style: input.style,
        pageCount: input.pageCount,
        titleHint: input.title,
      }),
      maxTokens: 4096,
      temperature: 0.85,
    });
    const draft = validateBookDraft(parsed);

    // Apply output safety to text and image prompts
    const safeDraft = {
      title: filterOutput(draft.title),
      coverPrompt: filterImagePrompt(draft.coverPrompt),
      pages: draft.pages.map((p) => ({
        plainText: filterOutput(p.plainText),
        imagePrompt: filterImagePrompt(p.imagePrompt),
      })),
    };

    // Per-page image generation in parallel. Already billed upfront per
    // the preflight above — kid can regenerate failed pages later via
    // /api/ai/page-image (which has its own debit) without re-paying for
    // the LLM draft.
    const { imageFunction } = getImageProvider();
    const style: ImageStyle = 'cartoon';
    const dims = dimsForBookAndLayout(input.size); // book-size aware; layout-agnostic for the bulk pass
    const imageResults = await Promise.allSettled(
      safeDraft.pages.map((p) =>
        imageFunction({
          prompt: p.imagePrompt,
          style,
          width: dims.width,
          height: dims.height,
        }),
      ),
    );

    let successfulImages = 0;
    const pagesWithImages = safeDraft.pages.map((p, i) => {
      const result = imageResults[i];
      const url = result && result.status === 'fulfilled' && typeof result.value === 'string'
        ? result.value
        : null;
      if (url) successfulImages++;
      return { ...p, imageUrl: url };
    });

    // Persist atomically
    const book = await createGeneratedBook(
      {
        setup: {
          title: safeDraft.title,
          author: input.author ?? 'Anonymous Author',
          type: input.type,
          bucket: typeCard.bucket,
          format: input.format,
          size: input.size,
          pageLimit: input.pageCount,
          typography: {
            titleFont: defaultFont.name,
            bodyFont: defaultFont.name,
            baseFontSize: 16,
          },
          themeColor: typeCard.suggestedThemeColor,
        },
        draft: {
          title: safeDraft.title,
          coverPrompt: safeDraft.coverPrompt,
          pages: pagesWithImages,
        },
      },
      { sessionId },
    );

    await trackCreation(sessionId);

    return apiSuccess({
      bookId: book.id,
      redirectUrl: `/create/book/${book.id}`,
      pagesGenerated: pagesWithImages.length,
      pagesWithImages: successfulImages,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
