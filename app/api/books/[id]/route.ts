import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { bookPatchSchema } from '@/lib/validators';
import { getBook, updateBook, deleteBook } from '@/lib/firebase/bookService';

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/books/[id] — Fetch a book + all pages.
 * Returns 404 if not found OR not owned by current session (no existence leak).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    const result = await getBook(params.id, { sessionId });
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/books/[id] — Update book metadata.
 * Locked fields (size, format, bucket, dimensions, pageLimit) are rejected
 * with 400 LOCKED_FIELD by both Zod (.strict()) and the service layer.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    const body = await request.json();
    const patch = bookPatchSchema.parse(body);

    const book = await updateBook(params.id, patch, { sessionId });
    return apiSuccess({ book });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/books/[id] — Delete book and all pages (cascading).
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    await deleteBook(params.id, { sessionId });
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
