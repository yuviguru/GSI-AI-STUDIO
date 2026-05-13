/**
 * COMMS-001: GET /api/comms/parent-inbox
 *
 * Returns the latest messages delivered to the calling parent across
 * channels — read-only feed. Sourced from `commsLog` filtered by recipientUid.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import { adminDb } from '@gsi/firebase/admin';

const COMMS_LOG = 'commsLog';
const MAX = 50;

interface CommsLogRow {
  id: string;
  recipientUid: string;
  kidId: string;
  channel: string;
  templateId: string;
  status: string;
  error: string | null;
  sentAt: { toDate(): Date };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    const snap = await adminDb
      .collection(COMMS_LOG)
      .where('recipientUid', '==', auth.userId)
      .orderBy('sentAt', 'desc')
      .limit(MAX)
      .get();

    const messages = snap.docs.map((d) => {
      const r = d.data() as CommsLogRow;
      return {
        id: r.id,
        kidId: r.kidId,
        channel: r.channel,
        templateId: r.templateId,
        status: r.status,
        error: r.error,
        sentAt: r.sentAt.toDate().toISOString(),
      };
    });

    return apiSuccess({ messages });
  } catch (error) {
    return handleApiError(error);
  }
}
