import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import { markNotificationRead } from '@gsi/firebase/notificationService';

/** PATCH /api/notifications/[id] — mark a notification read. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await verifyAuth(request);
    await markNotificationRead(auth.userId, params.id);
    return apiSuccess({ id: params.id, read: true });
  } catch (error) {
    return handleApiError(error);
  }
}
