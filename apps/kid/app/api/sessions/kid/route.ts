import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { adminAuth, adminDb } from '@gsi/firebase/admin';
import { createOrResumeKidSession } from '@gsi/firebase/sessionService';

/** Reject dayKey values more than this many days from today (UTC). Two
 *  days accommodates time-zone edge cases at midnight without letting a
 *  malicious client seed arbitrary future-dated session docs. */
const DAY_KEY_DRIFT_LIMIT = 2;

/** Parse `YYYY-MM-DD` strictly and verify it's within the allowed drift
 *  window from today (UTC). Returns null on any failure. */
function isDayKeyWithinAllowedDrift(dayKey: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return false;
  const parsed = Date.parse(`${dayKey}T00:00:00Z`);
  if (!Number.isFinite(parsed)) return false;
  const todayMs = Date.parse(
    `${new Date().toISOString().slice(0, 10)}T00:00:00Z`,
  );
  const driftDays = Math.abs(parsed - todayMs) / (24 * 60 * 60 * 1000);
  return driftDays <= DAY_KEY_DRIFT_LIMIT;
}

/**
 * POST /api/sessions/kid
 *
 * Create or resume a kid-scoped daily session. The session doc id is
 * deterministic — `kid-{kidId}-{dayKey}` — so calling this twice in the same
 * day for the same kid is idempotent.
 *
 * Request:
 *   { kidId: string, dayKey: 'YYYY-MM-DD' }
 *
 * The client computes `dayKey` in its local timezone (see `localDayKey` in
 * sessionService.ts for the browser-side equivalent). We don't infer it
 * server-side because we don't know the kid's local timezone; the device
 * the kid is using is the authoritative clock.
 *
 * Security: the caller's verified UID must match the kid's parentId. The
 * resulting session is stamped with `parentUid` so downstream writes
 * (points, creations) can be ownership-checked.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      throw new AppException('UNAUTHORIZED', 'Missing auth token', 401);
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const body = await request.json();
    const { kidId, dayKey } = body ?? {};

    if (!kidId || typeof kidId !== 'string') {
      throw new AppException('INVALID_INPUT', 'kidId required', 400);
    }
    if (
      !dayKey ||
      typeof dayKey !== 'string' ||
      !isDayKeyWithinAllowedDrift(dayKey)
    ) {
      throw new AppException(
        'INVALID_INPUT',
        `dayKey required in YYYY-MM-DD format, within ±${DAY_KEY_DRIFT_LIMIT} days of today (UTC)`,
        400,
      );
    }

    // Verify the kid is owned by the caller. Admin SDK bypasses Firestore
    // rules, so this guard is mandatory.
    const kidDoc = await adminDb.collection('kids').doc(kidId).get();
    if (!kidDoc.exists) {
      throw new AppException('KID_NOT_FOUND', 'Kid profile not found', 404);
    }
    const kidData = kidDoc.data() as { parentId?: string };
    if (kidData.parentId !== uid) {
      throw new AppException(
        'FORBIDDEN',
        'You do not own this kid profile',
        403,
      );
    }

    const { sessionId, created } = await createOrResumeKidSession({
      kidId,
      parentUid: uid,
      dayKey,
    });

    return apiSuccess({ sessionId, created, dayKey });
  } catch (error) {
    return handleApiError(error);
  }
}
