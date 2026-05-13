import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import {
  getUnreadCount,
  listNotifications,
} from '@gsi/firebase/notificationService';

/** GET /api/notifications — list current user's recent notifications. */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    const [notifications, unreadCount] = await Promise.all([
      listNotifications(auth.userId, 20),
      getUnreadCount(auth.userId),
    ]);
    return apiSuccess({ notifications, unreadCount });
  } catch (error) {
    return handleApiError(error);
  }
}
