/**
 * WhatsApp per-phone rate limiter.
 *
 * Mirrors the IP rate limiter in `lib/firebase/sessionService.ts`:
 *   - Daily cap (default 25/day per phone)
 *   - Cooldown (default 10s between messages)
 *
 * State lives in the `whatsappRateLimits` collection (admin-only via Firestore
 * rules). Phone numbers are hashed before use so we never index PII.
 */

import { backend } from '@/lib/backend';
import { hashPhoneNumber } from './phoneHash';

const COLLECTION = 'whatsappRateLimits';
const DAILY_CAP = Number(process.env.WHATSAPP_DAILY_CAP ?? 25);
const COOLDOWN_SEC = Number(process.env.WHATSAPP_COOLDOWN_SEC ?? 10);

/** Server-side kill switch for testing — same env-var convention as sessionService. */
const RATE_LIMIT_DISABLED = process.env.RATE_LIMIT_DISABLED === 'true';

interface RateLimitDoc {
  /** Hashed phone — never the raw number. */
  phoneHash: string;
  /** ISO `YYYY-MM-DD` of the day this counter belongs to (UTC). */
  dayKey: string;
  count: number;
  /** ISO timestamp of last message (cooldown enforcement). */
  lastMessageAt: string;
}

export class WhatsAppRateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfterSec: number,
  ) {
    super(message);
    this.name = 'WhatsAppRateLimitError';
  }
}

/**
 * Check both daily cap and cooldown. Throws WhatsAppRateLimitError when
 * blocked. Increments the counter on success — caller does NOT need to
 * call a separate "track" method.
 */
export async function enforceWhatsAppRateLimit(rawPhone: string): Promise<void> {
  if (RATE_LIMIT_DISABLED) return;

  const phoneHash = hashPhoneNumber(rawPhone);
  const dayKey = todayUtc();
  const docId = `${phoneHash}_${dayKey}`;

  const existing = await backend.data.get<RateLimitDoc>(COLLECTION, docId);
  const now = Date.now();

  if (existing) {
    // Cooldown.
    const lastMs = Date.parse(existing.lastMessageAt);
    const sinceLastSec = (now - lastMs) / 1000;
    if (sinceLastSec < COOLDOWN_SEC) {
      throw new WhatsAppRateLimitError(
        `Please wait ${Math.ceil(COOLDOWN_SEC - sinceLastSec)}s between messages.`,
        Math.ceil(COOLDOWN_SEC - sinceLastSec),
      );
    }
    // Daily cap.
    if (existing.count >= DAILY_CAP) {
      const tomorrowMs = startOfNextUtcDay(now);
      throw new WhatsAppRateLimitError(
        `Daily limit reached (${DAILY_CAP} messages). Resets at midnight UTC.`,
        Math.ceil((tomorrowMs - now) / 1000),
      );
    }
    // Increment via atomic op.
    await backend.data.update<RateLimitDoc>(COLLECTION, docId, {
      lastMessageAt: new Date(now).toISOString(),
    });
    await backend.data.increment(COLLECTION, docId, 'count', 1);
    return;
  }

  // First message of the day for this phone.
  await backend.data.create<RateLimitDoc>(COLLECTION, docId, {
    phoneHash,
    dayKey,
    count: 1,
    lastMessageAt: new Date(now).toISOString(),
  });
}

function todayUtc(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function startOfNextUtcDay(nowMs: number): number {
  const d = new Date(nowMs);
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime();
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
