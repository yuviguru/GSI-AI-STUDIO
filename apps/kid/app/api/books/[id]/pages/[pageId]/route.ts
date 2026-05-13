import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { pagePatchSchema } from '@/lib/validators';
import { updatePage, deletePage } from '@gsi/firebase/bookService';
import { filterInput, filterImagePrompt } from '@gsi/safety';

interface RouteParams {
  params: { id: string; pageId: string };
}

/**
 * PATCH /api/books/[id]/pages/[pageId] — Update a single page.
 * Safety-filters plainText (filterInput) and imagePrompt (filterImagePrompt)
 * before persistence. Auto-derives plainText from richText if missing.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    const body = await request.json();
    const patch = pagePatchSchema.parse(body);

    // Safety-filter user text content
    if (patch.plainText && patch.plainText.trim().length > 0) {
      filterInput(patch.plainText);
    }
    if (patch.imagePrompt && patch.imagePrompt.trim().length > 0) {
      filterImagePrompt(patch.imagePrompt);
    }

    const page = await updatePage(params.id, params.pageId, patch, { sessionId });
    return apiSuccess({ page });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/books/[id]/pages/[pageId] — Remove a page.
 * Server transactionally renumbers remaining pages.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    await deletePage(params.id, params.pageId, { sessionId });
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
