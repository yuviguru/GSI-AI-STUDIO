import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { bookCreateSchema } from '@/lib/validators';
import { createBook, listBooks } from '@/lib/firebase/bookService';
import type { BookStatus } from '@/types/book.types';

/**
 * POST /api/books — Create a new book from the wizard.
 * Fields type/bucket/format/size are LOCKED at creation. Book CRUD does NOT
 * count toward the creation rate limit (book authoring isn't AI generation).
 * See: docs/api-contracts.md#book-studio-endpoints
 */
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    const body = await request.json();
    const input = bookCreateSchema.parse(body);

    const book = await createBook(input, { sessionId });

    return apiSuccess({ book }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/books — List the current session's books, newest-edited first.
 * Query params: status (optional), limit (default 20, max 50), cursor (ISO timestamp).
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const status: BookStatus | undefined =
      statusParam === 'draft' || statusParam === 'complete' || statusParam === 'published'
        ? statusParam
        : undefined;

    const limitRaw = searchParams.get('limit');
    const parsedLimit = limitRaw ? parseInt(limitRaw, 10) : NaN;
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined;

    const cursor = searchParams.get('cursor') ?? undefined;

    const result = await listBooks({ sessionId }, { status, limit, cursor });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
