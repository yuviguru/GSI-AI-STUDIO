import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { characterPortraitSchema } from '@/lib/validators';
import { filterImagePrompt } from '@/lib/safety/inputFilter';
import { checkRateLimit, trackCreation } from '@/lib/firebase/sessionService';
import { getImageProvider } from '@/lib/ai/imageProvider';

/**
 * POST /api/ai/character-portrait — Generate an anchor portrait for a character.
 *
 * Used by the wizard's "Who's in your book?" step before the book exists.
 * Returns an image URL the client stores in wizard state and persists on book
 * creation. The portrait is the anchor — every per-page scene image prepends
 * this character's lookDescription verbatim, locking face/clothing across
 * pages.
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
    const input = characterPortraitSchema.parse(body);

    const fullPrompt = buildPortraitPrompt(input.lookDescription, input.styleHint);
    filterImagePrompt(fullPrompt);
    await checkRateLimit(sessionId);

    const { imageFunction, providerName } = getImageProvider();

    const start = Date.now();
    const imageUrl = await imageFunction({
      prompt: fullPrompt,
      style: 'cartoon',
      width: 768,
      height: 768,
    });
    const latencyMs = Date.now() - start;

    if (!imageUrl) {
      throw new AppException(
        'AI_GENERATION_FAILED',
        'Could not draw the character — try a different description',
        502
      );
    }

    await trackCreation(sessionId);

    return apiSuccess({
      imageUrl,
      prompt: fullPrompt,
      model: providerName,
      latencyMs,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Build a portrait prompt with character-reference sheet semantics —
 *  front-facing, plain background, focus on the character. */
function buildPortraitPrompt(lookDescription: string, styleHint?: string): string {
  const style = styleHint ?? 'soft watercolor children\'s book illustration';
  return [
    `Character portrait reference sheet: ${lookDescription}.`,
    'Front-facing pose, plain pastel background, full visible features,',
    'consistent proportions and outfit details.',
    `Style: ${style}. No text or watermarks.`,
  ].join(' ');
}
