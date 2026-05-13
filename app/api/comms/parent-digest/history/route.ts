/**
 * COMMS-001: GET /api/comms/parent-digest/history
 *
 * Returns the most recent parent_weekly_digest_v1 sends from the school's
 * commsLog. Used by the school admin digests page to show what's been sent
 * recently.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import { adminDb } from '@gsi/firebase/admin';

const COMMS_LOG = 'commsLog';
const TEMPLATE_ID = 'parent_weekly_digest_v1';
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
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    if (!auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Teacher is not attached to a school.', 403);
    }

    // Pull the latest digest sends, then filter to kids in this school.
    // commsLog is keyed by parentUid + kidId; we cross-reference kidId to schoolId.
    const snap = await adminDb
      .collection(COMMS_LOG)
      .where('templateId', '==', TEMPLATE_ID)
      .orderBy('sentAt', 'desc')
      .limit(MAX * 2)
      .get();

    const rows = snap.docs.map((d) => d.data() as CommsLogRow);
    const kidIds = Array.from(new Set(rows.map((r) => r.kidId)));

    // Bulk-resolve kid -> schoolId. Firestore "in" caps at 30 per query;
    // chunk if needed.
    const schoolByKid = new Map<string, string | undefined>();
    for (let i = 0; i < kidIds.length; i += 30) {
      const slice = kidIds.slice(i, i + 30);
      if (slice.length === 0) continue;
      const kidSnap = await adminDb
        .collection('kids')
        .where('__name__', 'in', slice)
        .get();
      for (const k of kidSnap.docs) {
        schoolByKid.set(k.id, (k.data() as Record<string, unknown>).schoolId as string | undefined);
      }
    }

    const filtered = rows
      .filter((r) => schoolByKid.get(r.kidId) === auth.schoolId)
      .slice(0, MAX)
      .map((r) => ({
        id: r.id,
        kidId: r.kidId,
        channel: r.channel,
        status: r.status,
        error: r.error,
        sentAt: r.sentAt.toDate().toISOString(),
      }));

    return apiSuccess({ history: filtered });
  } catch (error) {
    return handleApiError(error);
  }
}
