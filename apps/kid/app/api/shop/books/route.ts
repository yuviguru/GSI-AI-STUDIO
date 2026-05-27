import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError } from '@/lib/api-utils';
import { listShopBooks } from '@gsi/firebase/bookService';

/**
 * GET /api/shop/books (BOOK-004 Phase 1)
 *
 * Public list of for-sale books. Filters server-side by status=published,
 * isPublic=true, sales.enabled=true. Ordered by sales.listedAt desc.
 *
 * Note: requires the composite index added in firestore.indexes.json.
 * Cursor is the previous page's last `listedAt` ISO string.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const cursor = url.searchParams.get('cursor') ?? undefined;
    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
    const result = await listShopBooks({
      limit: Number.isFinite(limit) ? limit : undefined,
      cursor,
    });
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
