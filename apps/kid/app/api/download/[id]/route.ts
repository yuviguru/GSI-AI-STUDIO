import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { incrementDownload } from '@gsi/firebase/creationService';

/**
 * POST /api/download/[id]
 * Track a download event for a creation (fire-and-forget from client).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) throw new AppException('INVALID_INPUT', 'Creation ID required', 400);

    await incrementDownload(id);

    return apiSuccess({ tracked: true });
  } catch (error) {
    return handleApiError(error);
  }
}
