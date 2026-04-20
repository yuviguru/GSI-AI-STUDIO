import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { botLinkCreateSchema } from '@/lib/validators';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { requireAuthWithKid } from '@/lib/auth-utils';
import { createBotLinkCode } from '@/lib/firebase/botLinkService';

const BOT_LINK_CODES_COLLECTION = 'botLinkCodes';
const MINTS_PER_HOUR_LIMIT = 5;
const HOUR_MS = 60 * 60 * 1000;

/**
 * POST /api/bot/link/create
 *
 * Mint a single-use `botLinkCodes` token that binds a Telegram chat to the
 * caller's authenticated user + active kid profile. The bot consumes the
 * token via `/start link_<token>` or `/link <code>`.
 *
 * Kid CEO is authenticated-only: requires a Firebase ID token
 * (`Authorization: Bearer`) + an active kid (`X-Active-Kid-Id` header).
 * Anonymous bot-linking is no longer supported — the bot refuses to work
 * on unlinked chats, so there is no unauth'd fallback path.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, kidId } = await requireAuthWithKid(request);

    const body = await request.json();
    const { botHandle, businessId } = botLinkCreateSchema.parse(body);

    // If a businessId was passed, verify it belongs to this kid before we
    // bake it into the link token — otherwise a malicious caller could mint
    // a token that jumps someone else's business after redemption.
    if (businessId) {
      const biz = await adminDb.collection('ceoBusiness').doc(businessId).get();
      if (!biz.exists) {
        throw new AppException('NOT_FOUND', 'Business not found', 404);
      }
      if (biz.data()?.kidId !== kidId) {
        throw new AppException(
          'FORBIDDEN',
          'That business belongs to a different kid',
          403,
        );
      }
    }

    // The `gsiSessionId` stored on the token is still used for routing AI
    // Points writes on the session-level counter. It's derived from the
    // userId so bot and web both resolve to the same counter.
    const gsiSessionId = `user_${userId}`;

    await checkMintRateLimit(gsiSessionId);

    const link = await createBotLinkCode({
      gsiSessionId,
      userId,
      kidId,
      botHandle,
      businessId: businessId ?? null,
    });

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

/** Per-user mint rate limit: max 5 active tokens per rolling hour.
 *  Relies on the botLinkCodes gsiSessionId+createdAt index. */
async function checkMintRateLimit(gsiSessionId: string): Promise<void> {
  const cutoff = Timestamp.fromMillis(Date.now() - HOUR_MS);
  const snapshot = await adminDb
    .collection(BOT_LINK_CODES_COLLECTION)
    .where('gsiSessionId', '==', gsiSessionId)
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
