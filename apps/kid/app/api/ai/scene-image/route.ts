import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { sceneImageSchema } from '@/lib/validators';
import { filterImagePrompt } from '@gsi/safety';
import { checkRateLimit, trackCreation } from '@gsi/firebase/sessionService';
import { getBook } from '@gsi/firebase/bookService';
import { getImageProvider, type ImageStyle } from '@gsi/ai/imageProvider';
import { dimsForBookAndLayout } from '@gsi/ai/imageDims';
import {
  resolveComposition,
  imageCarriesOverlay,
  OVERLAY_SAFE_ZONE_HINT,
} from '@/lib/books/pageComposition';
import {
  renderEmotionDirection,
  sceneMoodFromEmotions,
} from '@gsi/ai/prompts/emotionDirection';
import type { BookCharacter } from '@gsi/types';
import { enforceBilling } from '@/lib/billing';

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

    // A cover (no pageId) always overlays its title; a full-bleed page overlays
    // its caption. In those cases ask the model to leave a calm band so the
    // overlaid text stays legible (the safe-zone composition pro covers use).
    const pageLayout = input.pageId
      ? pages.find((p) => p.id === input.pageId)?.layout
      : undefined;
    const reserveTextBand = pageLayout
      ? imageCarriesOverlay(resolveComposition(pageLayout, book.size).mode)
      : !input.pageId; // cover

    const emotionMap = new Map<string, string>(
      (input.emotions ?? []).map((e) => [e.characterId, e.emotion]),
    );

    const fullPrompt = buildScenePrompt({
      characters: selectedCharacters,
      emotions: emotionMap,
      action: input.action,
      styleHint: input.styleHint,
      reserveTextBand,
    });

    filterImagePrompt(fullPrompt);
    await checkRateLimit(sessionId);
    // Flat `image.flux` for now — switch to `image.sdxl` when the provider
    // router becomes plan-aware (charging SDXL while Flux runs would
    // mislead kids).
    await enforceBilling(request, { feature: 'image.flux' });

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
 *  action, then style. When `reserveTextBand` is set (covers + full-bleed
 *  pages), ask the model to keep a calm band for an overlaid title/caption. */
function buildScenePrompt(args: {
  characters: BookCharacter[];
  /** characterId → emotion preset key (BOOK-012). */
  emotions: Map<string, string>;
  action: string;
  styleHint?: string;
  reserveTextBand?: boolean;
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

  // Explicit per-character facial direction — counter-biases the default smile
  // so a fierce / sad / scared character renders with the right expression.
  const emoDirs = args.characters
    .map((c) => renderEmotionDirection(c.name, args.emotions.get(c.id)))
    .filter(Boolean);
  if (emoDirs.length > 0) parts.push(`${emoDirs.join('. ')}.`);

  parts.push(`Style: ${style}.`);
  parts.push('Same characters as their reference portraits — keep faces, hair, and outfits identical. No text in image.');

  // Mood-aware lighting: a tense/dark scene shouldn't get the default bright
  // children's palette that fights the emotion.
  const mood = sceneMoodFromEmotions([...args.emotions.values()]);
  if (mood === 'dark') {
    parts.push('Mood: dramatic, moody lighting with deep shadows and a tense atmosphere.');
  } else if (mood === 'bright') {
    parts.push('Mood: warm, bright, cheerful lighting.');
  }

  if (args.reserveTextBand) parts.push(OVERLAY_SAFE_ZONE_HINT);

  return parts.join(' ');
}
