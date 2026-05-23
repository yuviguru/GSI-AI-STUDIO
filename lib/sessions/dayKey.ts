/**
 * Shared session-day key helpers.
 *
 * Sessions for authenticated kids are grouped by local day (`YYYY-MM-DD`) so
 * downstream features like streaks and daily rate limits fall out for free.
 * Both client (useKidProfile rotation) and server (createOrResumeKidSession)
 * use the same format — the client computes the key from its local clock
 * and passes it to the API. Server validates the shape but trusts the value,
 * since the device is the authoritative clock for the kid's experience.
 *
 * No firebase-admin imports here — safe to import from both `'use client'`
 * code and server routes.
 */

/**
 * Compute the local-day key for a given Date in the caller's local
 * timezone. Defaults to "now."
 *
 * Examples:
 *   localDayKey(new Date(2026, 4, 22, 23, 59))  // "2026-05-22"
 *   localDayKey(new Date(2026, 4, 23, 0, 1))    // "2026-05-23"
 *
 * For traveler-safe daily session bucketing, prefer `dayKeyInTimezone` with
 * the user's stored account timezone. `localDayKey` is the fallback used
 * before sign-up and for legacy users without a stored timezone.
 */
export function localDayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Compute the day key (YYYY-MM-DD) for `date` interpreted in the given IANA
 * timezone. Used for kid session bucketing — we always bucket by the user's
 * *account* timezone, not the device's, so a parent in India who travels to
 * the US doesn't see their kid's streak split across two date keys.
 *
 * Implementation uses `Intl.DateTimeFormat('en-CA', { timeZone })`. en-CA's
 * default short-date format is ISO `YYYY-MM-DD`, which is exactly what we
 * want. Throws (Intl will reject the timezone arg) only for genuinely
 * unparseable IANA strings — caller should fall back to `localDayKey` in
 * that case.
 *
 * Examples (timezone = 'Asia/Kolkata'):
 *   dayKeyInTimezone(new Date('2026-05-22T18:30:00Z'), 'Asia/Kolkata')
 *     → '2026-05-23'    (IST midnight)
 *   dayKeyInTimezone(new Date('2026-05-22T18:29:00Z'), 'Asia/Kolkata')
 *     → '2026-05-22'    (just before IST midnight)
 */
export function dayKeyInTimezone(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Convenience wrapper — returns `dayKeyInTimezone(now, timezone)` when a
 * timezone is provided, otherwise falls back to `localDayKey()`. Silently
 * falls back to local if Intl rejects the timezone string.
 */
export function accountDayKey(timezone: string | undefined | null): string {
  if (!timezone) return localDayKey();
  try {
    return dayKeyInTimezone(new Date(), timezone);
  } catch {
    return localDayKey();
  }
}

/**
 * Deterministic kid-scoped session id. Same kid + same dayKey always
 * produces the same id, so two clients can create-or-resume the kid's
 * daily session without coordinating.
 */
export function kidSessionId(kidId: string, dayKey: string): string {
  return `kid-${kidId}-${dayKey}`;
}
