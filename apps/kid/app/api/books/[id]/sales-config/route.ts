import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { salesConfigPatchSchema } from '@/lib/validators';
import { updateSalesConfig } from '@gsi/firebase/bookService';

/**
 * PATCH /api/books/[id]/sales-config (BOOK-004 Phase 1)
 *
 * Owner-only. Enables/disables sales on a published book and sets the
 * price in INR. Until BOOK-004 Phase 2 ships, this is informational —
 * the book gets listed in /shop/books but the Buy button stays disabled.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    const input = salesConfigPatchSchema.parse(await request.json());
    const book = await updateSalesConfig(params.id, input, { sessionId });
    return apiSuccess({ book });
  } catch (error) {
    return handleApiError(error);
  }
}
