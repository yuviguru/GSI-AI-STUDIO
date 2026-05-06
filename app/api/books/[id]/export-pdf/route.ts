import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { getBook } from '@/lib/firebase/bookService';
import { generateBookPdf } from '@/lib/export/pdfGenerator';

/**
 * POST /api/books/[id]/export-pdf — Generate a PDF for a book.
 * Renders at the book's locked dimensions. Returns a base64 data URL the
 * client can pipe into a download link. Not cached to Firestore (data URLs
 * exceed the 1MB doc limit); caching to Firebase Storage is a v1.1 enhancement.
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

    const { book, pages } = await getBook(params.id, { sessionId });

    const blob = await generateBookPdf(book, pages);
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const pdfDataUrl = `data:application/pdf;base64,${base64}`;

    return apiSuccess({
      pdfUrl: pdfDataUrl,
      sizeBytes: arrayBuffer.byteLength,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
