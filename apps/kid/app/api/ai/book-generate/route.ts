import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { aiBookGenerateSchema } from '@/lib/validators';
import { filterInput, filterOutput, filterImagePrompt } from '@gsi/safety';
import { checkRateLimit, enforceIpRateLimit, trackCreation } from '@gsi/firebase/sessionService';
import { createGeneratedBook } from '@gsi/firebase/bookService';
import { generateWithClaude } from '@gsi/ai/claudeClient';
import { getImageProvider, type ImageStyle } from '@gsi/ai/imageProvider';
import { dimsForBookAndLayout } from '@gsi/ai/imageDims';
import { BOOK_FONTS, getBookTypeCard } from '@/lib/templates/bookTemplates';
import { enforceBilling } from '@/lib/billing';
import { ipFromRequest } from '@/lib/api/requestUtils';
import {
  BOOK_GENERATE_SYSTEM_PROMPT,
  buildBookGenerateUserMessage,
} from '@gsi/ai/prompts/bookGeneratePrompt';

/** Parse Claude's JSON response defensively. Strips any accidental
 *  markdown fences and validates the shape minimally. */
function parseBookDraft(raw: string): {
  title: string;
  coverPrompt: string;
  pages: Array<{ plainText: string; imagePrompt: string }>;
} {
  let cleaned = raw.trim();
  // Strip ```json … ``` fences if Claude wrapped them
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new AppException(
      'AI_GENERATION_FAILED',
      'AI returned an unparseable draft — try again',
      502,
    );
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new AppException('AI_GENERATION_FAILED', 'AI returned an unexpected shape', 502);
  }
  const obj = parsed as Record<string, unknown>;
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

    // Charge LLM cost up front so a high-volume abuser can't blow budget
    // before bailing on the image render.
    await enforceBilling(request, { feature: 'book.aiGenerate' });

    // Resolve the bucket + default font for the requested book type.
    const typeCard = getBookTypeCard(input.type);
    if (!typeCard) {
      throw new AppException('INVALID_INPUT', `Unknown book type: ${input.type}`, 400);
    }
    const defaultFont = BOOK_FONTS[0]!;

    // Call Claude with strict JSON system prompt
    const rawDraft = await generateWithClaude({
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
    const draft = parseBookDraft(rawDraft);

    // Apply output safety to text and image prompts
    const safeDraft = {
      title: filterOutput(draft.title),
      coverPrompt: filterImagePrompt(draft.coverPrompt),
      pages: draft.pages.map((p) => ({
        plainText: filterOutput(p.plainText),
        imagePrompt: filterImagePrompt(p.imagePrompt),
      })),
    };

    // Per-page image generation in parallel. We bill per successful image
    // so failed/timed-out pages don't drain credits — kid can regenerate
    // them later via the existing /api/ai/page-image flow.
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

    // Bill per successful image (skipped pages don't count)
    if (successfulImages > 0) {
      for (let i = 0; i < successfulImages; i++) {
        await enforceBilling(request, { feature: 'image.flux' });
      }
    }

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
