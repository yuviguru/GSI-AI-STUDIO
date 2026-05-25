import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { getBook } from '@gsi/firebase/bookService';
import { generateBookPdf } from '@/lib/export/pdfGenerator';
import { enforceBilling } from '@/lib/billing';

/**
 * POST /api/books/[id]/export-pdf — Generate a PDF for a book.
 *
 * PDF export is gated by the `canExportPdf` capability (Pro+). No credit
 * cost — pure feature gate. Free/Creator users get 403 FORBIDDEN_BY_PLAN
 * with an upgrade CTA.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) throw new AppException('UNAUTHORIZED', 'Missing session', 401);

    await enforceBilling(request, { capability: 'canExportPdf' });

    const { book, pages } = await getBook(params.id, { sessionId });
    const blob = await generateBookPdf(book, pages);
    const arrayBuffer = await blob.arrayBuffer();
    const pdfDataUrl = `data:application/pdf;base64,${Buffer.from(arrayBuffer).toString('base64')}`;

    return apiSuccess({
      pdfUrl: pdfDataUrl,
      sizeBytes: arrayBuffer.byteLength,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
