import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { adminAuth } from '@gsi/firebase/admin';
import {
  archiveClaimedSession,
  clearOrphanedClaimSnapshot,
} from '@gsi/firebase/userService';

/**
 * POST /api/users/discard-claimed-data
 *
 * Soft-archive pending anonymous session data for the signed-in user.
 *
 * Two modes:
 *   - With `sessionId` in body → archive that specific session doc, archive
 *     its creations (status='archived'), and clear the user-doc holding field.
 *     This is the path the new sign-in migration prompt uses.
 *   - Without `sessionId` → just clear the user-doc holding field. Legacy
 *     callers (and the sign-out cleanup hook) use this shape.
 *
 * Archived data lives in Firestore for the retention window so a future cron
 * job can hard-delete it — that gives accidental discards a recovery window.
 * The "discard" action is reversible by an operator until cron sweeps.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      throw new AppException('UNAUTHORIZED', 'Missing auth token', 401);
    }

    const decoded = await adminAuth.verifyIdToken(token);

    // Body is optional — older callers POST with no body to clear just the
    // user-doc snapshot. Newer flows include the sessionId to also archive
    // the session and its orphan creations.
    //
    // Format check defends two things at once:
    //   (a) length cap so attackers can't probe Firestore error paths with
    //       1KB strings, and
    //   (b) charset match against the actual session-id shapes we mint —
    //       anonymous UUIDs and `kid-{kidId}-{dayKey}` patterns are both
    //       within [A-Za-z0-9_-]. A garbage value would otherwise fall
    //       through to clearOrphanedClaimSnapshot and silently wipe the
    //       user's pending migration data.
    let sessionId: string | undefined;
    try {
      const body = await request.json();
      const raw = body?.sessionId;
      if (
        typeof raw === 'string' &&
        raw.length > 0 &&
        raw.length <= 128 &&
        /^[A-Za-z0-9_-]+$/.test(raw)
      ) {
        sessionId = raw;
      } else if (raw !== undefined) {
        throw new AppException(
          'INVALID_INPUT',
          'sessionId must be 1-128 chars of [A-Za-z0-9_-]',
          400,
        );
      }
    } catch (err) {
      // Re-throw our own validation error; swallow JSON-parse failures
      // (empty body is the legacy contract).
      if (err instanceof AppException) throw err;
    }

    if (sessionId) {
      const result = await archiveClaimedSession(decoded.uid, sessionId);
      return apiSuccess({
        message: 'Guest session archived.',
        archivedCreations: result.archivedCreations,
      });
    }

    await clearOrphanedClaimSnapshot(decoded.uid);
    return apiSuccess({ message: 'Guest session data discarded.' });
  } catch (error) {
    return handleApiError(error);
  }
}
