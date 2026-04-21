/** Per-chat and per-kid rate limiter for homework forwards.
 *
 *  5 forwards / hour / chat — the abuse guard that applies to every chat
 *  (including anonymous ones that haven't linked to a kid yet).
 *  5 forwards / hour / kid — added once identity is bound, so two siblings
 *  sharing a parent's phone don't throttle each other.
 *
 *  Uses a sliding-window count stored in Firestore. Transactional to avoid
 *  a race where two concurrent forwards both see "4 in the window" and
 *  both bump to 5.
 *
 *  @see /docs/security.md "Bot input rate limiting"
 */

import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { AppException } from '@/lib/api-utils';

const COLLECTION = 'homeworkRateLimits';
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const CAP = 5;

interface WindowDoc {
  /** Millisecond timestamps of recent forwards within the window. */
  timestamps: number[];
  expiresAt: Timestamp;
}

/** Increment the rate-limit counter for a chat and (optionally) kid. Throws
 *  `RATE_LIMITED` when either scope is over cap. Called before starting
 *  the expensive parse pipeline so a throttled kid gets a friendly message
 *  instead of a silent OCR/LLM bill. */
export async function checkAndIncrementForwardRate(params: {
  chatId: string;
  kidId?: string | null;
  nowMs?: number;
}): Promise<void> {
  const now = params.nowMs ?? Date.now();
  const chatKey = `chat_${params.chatId}`;
  await incrementWindow(chatKey, now, 'chat');

  if (params.kidId) {
    const kidKey = `kid_${params.kidId}`;
    try {
      await incrementWindow(kidKey, now, 'kid');
    } catch (err) {
      // The chat counter already ticked up; the kid counter failing to
      // tick up is acceptable — it just means the next call might throttle
      // at a slightly different boundary. Re-throw only when it's the cap
      // that was hit, which the caller needs to surface to the kid.
      if (err instanceof AppException && err.code === 'RATE_LIMITED') throw err;
      console.warn('[homeworkRateLimit] kid counter tick failed:', err);
    }
  }
}

async function incrementWindow(
  key: string,
  nowMs: number,
  scope: 'chat' | 'kid',
): Promise<void> {
  const ref = adminDb.collection(COLLECTION).doc(key);
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const existing =
      snap.exists && snap.data() ? (snap.data() as WindowDoc) : null;

    // Drop timestamps older than the window — that's the "sliding" part.
    const recent = (existing?.timestamps ?? []).filter(
      (ts) => nowMs - ts < WINDOW_MS,
    );

    if (recent.length >= CAP) {
      // `recent` has at least CAP entries here, so index 0 is guaranteed
      // defined — the non-null assertion keeps the TypeScript
      // `noUncheckedIndexedAccess` checker happy.
      const oldest = recent[0]!;
      const retryInMinutes = Math.max(
        1,
        Math.ceil((WINDOW_MS - (nowMs - oldest)) / (60 * 1000)),
      );
      throw new AppException(
        'RATE_LIMITED',
        scope === 'chat'
          ? `You've forwarded a lot of homework just now — try again in about ${retryInMinutes} minutes!`
          : `That's a lot of homework already this hour — try again in about ${retryInMinutes} minutes!`,
        429,
      );
    }

    recent.push(nowMs);
    tx.set(ref, {
      timestamps: recent,
      expiresAt: Timestamp.fromMillis(nowMs + WINDOW_MS * 2),
    } satisfies WindowDoc);
  });
}
