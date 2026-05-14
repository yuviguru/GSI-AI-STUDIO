import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError } from '@/lib/api-utils';
import { incrementDownload } from '@gsi/firebase/creationService';

/**
 * POST /api/creations/:id/download — Track a download event
 * Fire-and-forget from the client — increments downloadCount.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await incrementDownload(params.id);
    return apiSuccess(null);
  } catch (error) {
    return handleApiError(error);
  }
}
