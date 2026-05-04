import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { publishBook } from '@/lib/firebase/bookService';

const publishInputSchema = z.object({
  isPublic: z.boolean().default(false),
});

/**
 * POST /api/books/[id]/publish — Move book to `published`.
 * Validates pageCount >= 1, mints unique shareUrl slug, sets publishedAt.
 * PDF is generated separately via /api/books/[id]/export-pdf.
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

    const body = await request.json().catch(() => ({}));
    const input = publishInputSchema.parse(body);

    const book = await publishBook(params.id, { sessionId }, { isPublic: input.isPublic });
    return apiSuccess({
      book,
      shareUrl: book.shareUrl,
      pdfUrl: book.pdfUrl,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
