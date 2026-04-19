import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { botLinkCreateSchema } from '@/lib/validators';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { verifyAuth } from '@/lib/auth-utils';
import { createBotLinkCode } from '@/lib/firebase/botLinkService';

const BOT_LINK_CODES_COLLECTION = 'botLinkCodes';
const MINTS_PER_HOUR_LIMIT = 5;
const HOUR_MS = 60 * 60 * 1000;

/**
 * POST /api/bot/link/create
 * Mint a single-use `botLinkCodes` token for auth binding a Telegram chat
 * to the caller's GSI web session (and optionally their Firebase Phone Auth
 * user + active kid profile).
 *
 * Anonymous callers get a session-scoped link; authenticated callers who
 * supply an `Authorization: Bearer ...` header additionally bind the token
 * to their `userId` (and `kidId`, if an `X-Active-Kid-Id` header is sent
 * and verified).
 */
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    const body = await request.json();
    const { botHandle } = botLinkCreateSchema.parse(body);

    // Phase-2 optional auth: only call verifyAuth when an Authorization
    // header is present, so anonymous callers aren't forced through the
    // auth pipeline.  The header-present branch still propagates auth
    // errors (invalid/expired tokens) — a caller who supplies a Bearer
    // token is declaring intent to authenticate.
    let userId: string | null = null;
    let kidId: string | null = null;
    const hasAuthHeader = !!request.headers.get('Authorization');
    if (hasAuthHeader) {
      const auth = await verifyAuth(request);
      userId = auth.userId;

      // Bind to the caller's active kid profile when supplied, but only
      // after verifying ownership (Admin SDK bypasses Firestore rules).
      const rawKidId = request.headers.get('X-Active-Kid-Id');
      if (rawKidId) {
        const kidDoc = await adminDb.collection('kids').doc(rawKidId).get();
        if (!kidDoc.exists || kidDoc.data()?.parentId !== auth.userId) {
          throw new AppException(
            'FORBIDDEN',
            'Kid profile not found or not owned by caller',
            403,
          );
        }
        kidId = rawKidId;
      }
    }

    await checkMintRateLimit(sessionId);

    const link = await createBotLinkCode({
      gsiSessionId: sessionId,
      userId,
      kidId,
      botHandle,
    });

    // Telegram deep links always live on https://t.me/<botHandle>; this is
    // Telegram's canonical host, not our app domain.
    const deepLink = `https://t.me/${botHandle}?start=link_${link.token}`;

    const expiresAtIso =
      typeof link.expiresAt === 'object' &&
      link.expiresAt !== null &&
      'toDate' in link.expiresAt
        ? (link.expiresAt as Timestamp).toDate().toISOString()
        : new Date(link.expiresAt as unknown as string).toISOString();

    return apiSuccess(
      {
        token: link.token,
        deepLink,
        code: link.code,
        expiresAt: expiresAtIso,
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/** Per-session mint rate limit: max 5 active tokens per rolling hour.
 *  Relies on the botLinkCodes gsiSessionId+createdAt index. */
async function checkMintRateLimit(sessionId: string): Promise<void> {
  const cutoff = Timestamp.fromMillis(Date.now() - HOUR_MS);
  const snapshot = await adminDb
    .collection(BOT_LINK_CODES_COLLECTION)
    .where('gsiSessionId', '==', sessionId)
    .where('createdAt', '>', cutoff)
    .count()
    .get();

  if (snapshot.data().count >= MINTS_PER_HOUR_LIMIT) {
    throw new AppException(
      'RATE_LIMITED',
      `You can create up to ${MINTS_PER_HOUR_LIMIT} bot link codes per hour. Try again soon!`,
      429,
    );
  }
}
