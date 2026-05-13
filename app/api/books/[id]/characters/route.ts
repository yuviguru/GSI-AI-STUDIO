import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { characterCreateSchema } from '@/lib/validators';
import { addCharacter } from '@/lib/firebase/bookService';
import { filterInput } from '@gsi/safety';

/**
 * POST /api/books/[id]/characters — Add a new character to an existing book.
 * Server enforces the 3-character cap. Used when the kid adds a character
 * after the wizard (i.e. inside the editor).
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
    const input = characterCreateSchema.parse(body);

    filterInput(input.name);
    filterInput(input.lookDescription);

    const character = await addCharacter(params.id, input, { sessionId });
    return apiSuccess({ character }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
