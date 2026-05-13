import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import { markAllNotificationsRead } from '@gsi/firebase/notificationService';

/** POST /api/notifications/mark-all-read */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    const cleared = await markAllNotificationsRead(auth.userId);
    return apiSuccess({ cleared });
  } catch (error) {
    return handleApiError(error);
  }
}
