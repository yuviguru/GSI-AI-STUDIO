import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { pageImageSchema } from '@/lib/validators';
import { filterImagePrompt } from '@/lib/safety/inputFilter';
import { checkRateLimit, trackCreation } from '@/lib/firebase/sessionService';
import { getBook } from '@/lib/firebase/bookService';
import { getImageProvider, type ImageStyle } from '@/lib/ai/imageProvider';
import { dimsForBookAndLayout } from '@/lib/ai/imageDims';

/** Fallback dims for the explicit `aspect` enum — used when no bookId/pageId
 *  is provided to derive proper slot dimensions. */
const ASPECT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  square: { width: 1024, height: 1024 },
  portrait: { width: 768, height: 1024 },
  landscape: { width: 1024, height: 768 },
  cover: { width: 1024, height: 1280 },
};

const STYLE_FALLBACK_MAP: Record<string, ImageStyle> = {
  watercolor: 'watercolor',
  cartoon: 'cartoon',
  sketch: 'cartoon',
  manga: 'comic',
  comic: 'comic',
  pixel: 'pixel-art',
  'pixel-art': 'pixel-art',
};

/**
 * POST /api/ai/page-image — Generate an illustration for a book page or cover.
 * Reuses the existing imageProvider cascade (Pixazo → Replicate → Pollinations
 * → stock photo → SVG fallback).
 *
 * Counts toward the AI generation rate limit.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    const body = await request.json();
    const input = pageImageSchema.parse(body);

    filterImagePrompt(input.prompt);
    await checkRateLimit(sessionId);

    // Prefer slot-aware dims when bookId+pageId are provided so a half-height
    // image slot generates a wide image that fills cleanly without crop. Fall
    // back to the explicit `aspect` enum for cover/loose calls.
    let dims: { width: number; height: number };
    if (input.bookId && input.pageId) {
      const { book, pages } = await getBook(input.bookId, { sessionId });
      const layout = pages.find((p) => p.id === input.pageId)?.layout;
      dims = dimsForBookAndLayout(book.size, layout);
    } else if (input.bookId && !input.pageId) {
      // Cover or non-page gen — book aspect, no layout
      const { book } = await getBook(input.bookId, { sessionId });
      dims = dimsForBookAndLayout(book.size);
    } else {
      const aspect = input.aspect ?? 'square';
      dims = ASPECT_DIMENSIONS[aspect] ?? ASPECT_DIMENSIONS.square!;
    }

    const styleLookup = input.style ? STYLE_FALLBACK_MAP[input.style.toLowerCase()] : undefined;
    const style: ImageStyle = styleLookup ?? 'cartoon';

    const { imageFunction, providerName } = getImageProvider();

    const start = Date.now();
    const imageUrl = await imageFunction({
      prompt: input.prompt,
      style,
      width: dims.width,
      height: dims.height,
    });
    const latencyMs = Date.now() - start;

    if (!imageUrl) {
      throw new AppException(
        'AI_GENERATION_FAILED',
        'Image generation failed — try a different prompt',
        502
      );
    }

    await trackCreation(sessionId);

    return apiSuccess({
      imageUrl,
      model: providerName,
      latencyMs,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
