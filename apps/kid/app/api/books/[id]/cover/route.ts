import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { coverPatchSchema } from '@/lib/validators';
import { updateCover } from '@gsi/firebase/bookService';
import { filterInput, filterImagePrompt } from '@gsi/safety';

/**
 * POST /api/books/[id]/cover — Update cover composition (partial merge).
 * Triggers regeneration of coverThumbnail (caller does the actual image gen
 * separately via /api/ai/page-image).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    const body = await request.json();
    const patch = coverPatchSchema.parse(body);

    // Safety-filter cover text fields
    if (patch.title) filterInput(patch.title);
    if (patch.subtitle) filterInput(patch.subtitle);
    if (patch.imagePrompt) filterImagePrompt(patch.imagePrompt);

    const book = await updateCover(params.id, patch, { sessionId });
    return apiSuccess({ book });
  } catch (error) {
    return handleApiError(error);
  }
}
