import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { pageCreateSchema } from '@/lib/validators';
import { appendPage } from '@gsi/firebase/bookService';

/**
 * POST /api/books/[id]/pages — Append a new page to a book.
 * Server enforces book.pageCount < book.pageLimit transactionally; throws
 * 400 PAGE_LIMIT_REACHED if at cap.
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
    const input = pageCreateSchema.parse(body);

    const result = await appendPage(params.id, input, { sessionId });
    return apiSuccess(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
