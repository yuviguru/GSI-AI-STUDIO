import { Timestamp } from 'firebase-admin/firestore';
import crypto from 'crypto';
import { adminDb } from './admin';
import { AppException } from '@/lib/api-utils';
import { timestampToMillis } from '@/lib/utils/timestamps';
import type { BotHandle, BotLinkCode } from '@/types';

const BOT_LINK_CODES_COLLECTION = 'botLinkCodes';
const LINK_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_MINT_ATTEMPTS = 3;

export interface CreateBotLinkParams {
  gsiSessionId: string;
  userId?: string | null;
  kidId?: string | null;
  botHandle: BotHandle;
  /** Optional: pre-bind this token to a specific ceoBusiness. The bot will
   *  resume THAT business after /start redeems the link. Null for a plain
   *  landing-page "Connect Telegram" that just binds the chat. */
  businessId?: string | null;
}

/**
 * Mint a new single-use link token.
 *
 * The token is 32 hex chars (128 bits of entropy via `crypto.randomBytes(16)`)
 * and also serves as the Firestore document id.  A separate 6-digit numeric
 * `code` is generated for the `/link <code>` fallback flow (kids who cannot
 * tap the deep link can type the code into the bot manually).
 *
 * Collisions at 128 bits are effectively impossible, but we retry up to 3
 * times defensively before giving up.  The 10-minute TTL is enforced at read
 * time via `expiresAt`; Firestore's TTL cleaner handles eventual deletion.
 */
export async function createBotLinkCode(
  params: CreateBotLinkParams,
): Promise<BotLinkCode> {
  const collection = adminDb.collection(BOT_LINK_CODES_COLLECTION);

  for (let attempt = 0; attempt < MAX_MINT_ATTEMPTS; attempt++) {
    const token = crypto.randomBytes(16).toString('hex');
    const code = crypto.randomInt(100000, 1000000).toString();
    const nowMs = Date.now();
    const doc: BotLinkCode = {
      token,
      gsiSessionId: params.gsiSessionId,
      userId: params.userId ?? null,
      kidId: params.kidId ?? null,
      botHandle: params.botHandle,
      code,
      businessId: params.businessId ?? null,
      used: false,
      usedByChatId: null,
      expiresAt: Timestamp.fromMillis(nowMs + LINK_TTL_MS),
      createdAt: Timestamp.fromMillis(nowMs),
    };

    const ref = collection.doc(token);
    try {
      // `create` fails if the doc already exists — detects collisions without
      // silently overwriting.  At 128 bits of entropy this is paranoia.
      await ref.create(doc);
      return doc;
    } catch (err) {
      // Only retry on collision; other errors bubble up immediately.
      const code = (err as { code?: number | string }).code;
      if (code === 6 /* ALREADY_EXISTS */ || code === 'already-exists') {
        continue;
      }
      throw err;
    }
  }

  throw new AppException(
    'LINK_MINT_FAILED',
    'Could not generate a unique link token. Please try again.',
    500,
  );
}

/**
 * Redeem a link token (deep-link flow — `/start link_<token>`).
 *
 * Atomically validates and marks the token as used within a transaction so
 * two concurrent redemptions cannot both succeed.
 *
 * @throws AppException LINK_NOT_FOUND when the token doesn't exist
 * @throws AppException LINK_EXPIRED when `expiresAt < now`
 * @throws AppException LINK_USED when `used === true`
 * @throws AppException LINK_WRONG_BOT when the token was minted for a different bot
 */
export async function redeemBotLinkToken(params: {
  token: string;
  chatId: string;
  botHandle: BotHandle;
}): Promise<BotLinkCode> {
  const ref = adminDb.collection(BOT_LINK_CODES_COLLECTION).doc(params.token);

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new AppException('LINK_NOT_FOUND', 'Link token not found', 404);
    }

    const data = snap.data() as BotLinkCode;
    assertRedeemable(data, params.botHandle);

    tx.update(ref, { used: true, usedByChatId: params.chatId });
    return { ...data, used: true, usedByChatId: params.chatId };
  });
}

/**
 * Redeem a 6-digit fallback code (`/link <code>` flow).
 *
 * Scans `botLinkCodes` for a non-used, non-expired doc matching the code AND
 * the target bot handle, then atomically flips `used` within a transaction.
 *
 * At any instant the live pool of unexpired codes for a single bot is small
 * (10-minute window, low mint rate), so a 6-digit space is ample — but a
 * narrow collision window is still possible. The transaction re-reads the
 * matched doc to guarantee single-spend.
 *
 * @throws AppException LINK_NOT_FOUND when no matching active code exists
 * @throws AppException LINK_EXPIRED when the matched doc expired between
 *                                    scan and transaction
 * @throws AppException LINK_USED when the matched doc was consumed concurrently
 */
export async function redeemBotLinkCode(params: {
  code: string;
  chatId: string;
  botHandle: BotHandle;
}): Promise<BotLinkCode> {
  const now = Timestamp.now();
  const snapshot = await adminDb
    .collection(BOT_LINK_CODES_COLLECTION)
    .where('code', '==', params.code)
    .where('botHandle', '==', params.botHandle)
    .where('used', '==', false)
    .where('expiresAt', '>', now)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new AppException(
      'LINK_NOT_FOUND',
      'Code not found, expired, or already used',
      404,
    );
  }

  const matchedRef = snapshot.docs[0]!.ref;

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(matchedRef);
    if (!snap.exists) {
      throw new AppException('LINK_NOT_FOUND', 'Code not found', 404);
    }

    const data = snap.data() as BotLinkCode;
    assertRedeemable(data, params.botHandle);

    tx.update(matchedRef, { used: true, usedByChatId: params.chatId });
    return { ...data, used: true, usedByChatId: params.chatId };
  });
}

// ─── Internal helpers ──────────────────────────────────────────────────────

function assertRedeemable(data: BotLinkCode, expectedBot: BotHandle): void {
  if (data.used) {
    throw new AppException('LINK_USED', 'This link has already been used', 400);
  }

  // `expiresAt` can come back as a firebase-admin Timestamp OR a plain
  // `{seconds, nanoseconds}` POJO depending on how the Netlify function
  // bundle resolves the SDK. `timestampToMillis` handles both so the
  // expiry check never silently passes on a NaN compare.
  const expiresMs = timestampToMillis(data.expiresAt);
  if (!Number.isFinite(expiresMs) || expiresMs === 0 || Date.now() > expiresMs) {
    throw new AppException('LINK_EXPIRED', 'This link has expired', 400);
  }

  if (data.botHandle !== expectedBot) {
    throw new AppException(
      'LINK_WRONG_BOT',
      `This link is for @${data.botHandle}, not @${expectedBot}`,
      400,
    );
  }
}
