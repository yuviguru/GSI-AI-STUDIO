import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { sceneImageSchema } from '@/lib/validators';
import { filterImagePrompt } from '@gsi/safety';
import { checkRateLimit, trackCreation } from '@gsi/firebase/sessionService';
import { getBook } from '@gsi/firebase/bookService';
import { getImageProvider, type ImageStyle } from '@gsi/ai/imageProvider';
import { dimsForBookAndLayout } from '@gsi/ai/imageDims';
import type { BookCharacter } from '@gsi/types';

const STYLE_HINT_MAP: Record<string, ImageStyle> = {
  watercolor: 'watercolor',
  cartoon: 'cartoon',
  sketch: 'cartoon',
  manga: 'comic',
  comic: 'comic',
  pixel: 'pixel-art',
  'pixel-art': 'pixel-art',
};

/**
 * POST /api/ai/scene-image — Generate a per-page scene image with character
 * consistency.
 *
 * Combines the verbatim look descriptions of the selected characters with
 * the kid's short action description, then renders via the image cascade.
 * The character look strings are reused across every scene the character
 * appears in, which is the standard reference-sheet trick used by Leonardo,
 * MidJourney, and serious storybook generators.
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
    const input = sceneImageSchema.parse(body);

    // Load the book to resolve character IDs and pull style + size context.
    // Pages are loaded too so we can derive the actual slot aspect from the
    // page's layout (image_top vs full_bleed vs split etc.) — this prevents
    // characters being cropped when a square book has a half-height slot.
    const { book, pages } = await getBook(input.bookId, { sessionId });

    const selectedCharacters: BookCharacter[] = input.characterIds
      .map((id) => book.characters.find((c) => c.id === id))
      .filter((c): c is BookCharacter => c !== undefined);

    const fullPrompt = buildScenePrompt({
      characters: selectedCharacters,
      action: input.action,
      styleHint: input.styleHint,
    });

    filterImagePrompt(fullPrompt);
    await checkRateLimit(sessionId);

    // Per-page slot aspect when pageId is provided; book aspect (cover) otherwise
    const pageLayout = input.pageId
      ? pages.find((p) => p.id === input.pageId)?.layout
      : undefined;
    const dims = dimsForBookAndLayout(book.size, pageLayout);

    const styleKey = (input.styleHint ?? '').toLowerCase();
    const style: ImageStyle = STYLE_HINT_MAP[styleKey] ?? 'cartoon';

    const { imageFunction, providerName } = getImageProvider();

    const start = Date.now();
    const imageUrl = await imageFunction({
      prompt: fullPrompt,
      style,
      width: dims.width,
      height: dims.height,
    });
    const latencyMs = Date.now() - start;

    if (!imageUrl) {
      throw new AppException(
        'AI_GENERATION_FAILED',
        'Could not draw this scene — try a different action',
        502
      );
    }

    await trackCreation(sessionId);

    return apiSuccess({
      imageUrl,
      prompt: fullPrompt,
      model: providerName,
      latencyMs,
      charactersUsed: selectedCharacters.map((c) => ({ id: c.id, name: c.name })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Assemble the full image prompt — character anchors verbatim, then scene
 *  action, then style. */
function buildScenePrompt(args: {
  characters: BookCharacter[];
  action: string;
  styleHint?: string;
}): string {
  const style = args.styleHint ?? 'soft watercolor children\'s book illustration';
  const parts: string[] = ['Children\'s book scene illustration.'];

  if (args.characters.length > 0) {
    const charSpec = args.characters
      .map((c) => `${c.name} — ${c.lookDescription}`)
      .join('. ');
    parts.push(`Characters: ${charSpec}.`);
  }

  parts.push(`Scene: ${args.action}.`);
  parts.push(`Style: ${style}.`);
  parts.push('Same characters as their reference portraits — keep faces, hair, and outfits identical. No text in image.');

  return parts.join(' ');
}
