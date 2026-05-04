import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { pageReorderSchema } from '@/lib/validators';
import { reorderPages } from '@/lib/firebase/bookService';

/**
 * POST /api/books/[id]/pages/reorder — Atomically reorder pages.
 * Server runs the renumber inside a Firestore transaction.
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
    const input = pageReorderSchema.parse(body);

    await reorderPages(params.id, input, { sessionId });
    return apiSuccess({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
