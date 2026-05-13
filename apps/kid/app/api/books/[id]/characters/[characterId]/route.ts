import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { characterPatchSchema } from '@/lib/validators';
import { updateCharacter, removeCharacter } from '@gsi/firebase/bookService';
import { filterInput } from '@gsi/safety';

interface RouteParams {
  params: { id: string; characterId: string };
}

/**
 * PATCH /api/books/[id]/characters/[characterId] — Update a character's name,
 * look description, or anchor image URL (e.g. after regenerating).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    const body = await request.json();
    const patch = characterPatchSchema.parse(body);

    if (patch.name) filterInput(patch.name);
    if (patch.lookDescription) filterInput(patch.lookDescription);

    const character = await updateCharacter(params.id, params.characterId, patch, {
      sessionId,
    });
    return apiSuccess({ character });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/books/[id]/characters/[characterId] — Remove a character.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    await removeCharacter(params.id, params.characterId, { sessionId });
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
