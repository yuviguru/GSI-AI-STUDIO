import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { musicInputSchema } from '@/lib/validators';
import { filterInput } from '@/lib/safety/inputFilter';

/**
 * POST /api/ai/music
 * Generate a song/beat using Suno/MusicGen.
 * See: docs/api-contracts.md#post-apiaimusic
 */
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    const body = await request.json();
    const input = musicInputSchema.parse(body);

    if (input.lyricsPrompt) filterInput(input.lyricsPrompt);
    if (input.theme) filterInput(input.theme);

    // TODO: Implement in STUDIO-002
    return apiSuccess({ message: 'Music generation not yet implemented' }, 501);
  } catch (error) {
    return handleApiError(error);
  }
}
