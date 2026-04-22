/**
 * Kid CEO Daily Rhythm — IST-anchored cadence helpers.
 *
 * Phase 3 replaces the pace-driven rolling interval (18h / 34h / 48h for
 * 15 / 30 / 45 paces) with a single fixed IST delivery hour (default
 * 18:30). These pure functions do the IST math without pulling in a
 * date library — IST is a fixed UTC+5:30 offset with no DST, so plain
 * `Date` + millisecond arithmetic is enough and testable.
 *
 * All functions in this module are pure, deterministic, and safe to
 * call from both server (Node) and client contexts. No Firestore,
 * no env reads — the delivery hour is passed in by the caller.
 */

/** Fixed offset from UTC to IST (Asia/Kolkata) in minutes. IST has no
 *  DST, so this is constant year-round. */
export const IST_OFFSET_MINUTES = 5 * 60 + 30;

/** Default milestone delivery hour + minute in IST. 18:30 = 6:30 PM,
 *  locked as D1 in `stories/phase-3/KIDCEO-PHASE-3-DECISIONS.md`. */
export const DEFAULT_MILESTONE_HOUR_IST = 18;
export const DEFAULT_MILESTONE_MINUTE_IST = 30;

/** Tolerance window (ms) around the scheduled tick during which the
 *  cron considers a business "due". The Netlify scheduler runs every
 *  2h, so a 2h tolerance guarantees we catch the target hour even if
 *  the previous tick was skipped for some reason. */
export const DELIVERY_TOLERANCE_MS = 2 * 60 * 60 * 1000;

/**
 * Convert a UTC Date to an IST Date (wall-clock arithmetic only — this
 * returns a Date whose UTC millis represent the IST wall-clock, which
 * is handy for extracting IST-local fields like "what IST day is this?"
 * without pulling in a TZ library.
 *
 * NOTE: The returned Date is NOT a genuine Asia/Kolkata-zoned instant.
 * Only use it to read `getUTC*` fields as IST fields. If you need a
 * real timestamp to compare against `Date.now()`, call `istToUtcMs`.
 */
export function utcToIst(utcDate: Date): Date {
  return new Date(utcDate.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
}

/** Inverse of `utcToIst` — convert an IST wall-clock Date (built via
 *  `new Date(Date.UTC(...))` pretending it's IST) back to real UTC
 *  millis. */
export function istToUtcMs(istWallClockDate: Date): number {
  return istWallClockDate.getTime() - IST_OFFSET_MINUTES * 60 * 1000;
}

/**
 * Return `YYYY-MM-DD` for the IST day of the given UTC Date.
 *
 * Used by:
 *   - Regular-event cap counter (`business.lastRegularEventDayUtc` —
 *     name kept for backwards-compat; stores IST day per D2).
 *   - Cron's "already delivered today?" gate.
 */
export function istDayKey(utcDate: Date): string {
  const ist = utcToIst(utcDate);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const d = String(ist.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * True when two UTC Dates fall on the same IST calendar day.
 *
 * The cron uses this to decide: "did we already deliver a milestone
 * to this business today?" — `isSameIstDay(now, business.lastMilestoneDeliveredAt)`.
 */
export function isSameIstDay(a: Date, b: Date): boolean {
  return istDayKey(a) === istDayKey(b);
}

/**
 * Given a UTC `now`, return the next UTC Date at which the IST wall
 * clock hits `hourIst:minuteIst`. If `now`'s IST wall clock is already
 * past today's target, returns tomorrow's target. Always strictly `>
 * now` (never returns `now` itself).
 *
 * Example: given `now` = 2026-04-22 17:00 IST, `hourIst` = 18, `minuteIst` = 30
 *          → returns a Date equal to 2026-04-22 18:30 IST (= 13:00 UTC).
 *
 * Example: given `now` = 2026-04-22 19:00 IST, `hourIst` = 18, `minuteIst` = 30
 *          → returns 2026-04-23 18:30 IST.
 */
export function nextMilestoneAtIst(
  now: Date,
  hourIst: number = DEFAULT_MILESTONE_HOUR_IST,
  minuteIst: number = DEFAULT_MILESTONE_MINUTE_IST,
): Date {
  if (!Number.isInteger(hourIst) || hourIst < 0 || hourIst > 23) {
    throw new Error(`nextMilestoneAtIst: invalid hourIst ${hourIst}`);
  }
  if (!Number.isInteger(minuteIst) || minuteIst < 0 || minuteIst > 59) {
    throw new Error(`nextMilestoneAtIst: invalid minuteIst ${minuteIst}`);
  }

  const nowIstWall = utcToIst(now);
  const y = nowIstWall.getUTCFullYear();
  const m = nowIstWall.getUTCMonth();
  const d = nowIstWall.getUTCDate();

  // Build today's IST target as a wall-clock Date (UTC fields = IST fields).
  const todayIstTargetWall = new Date(Date.UTC(y, m, d, hourIst, minuteIst, 0, 0));
  const todayTargetUtcMs = istToUtcMs(todayIstTargetWall);

  if (todayTargetUtcMs > now.getTime()) {
    return new Date(todayTargetUtcMs);
  }

  // Already past today's target — roll to tomorrow.
  const tomorrowIstTargetWall = new Date(
    Date.UTC(y, m, d + 1, hourIst, minuteIst, 0, 0),
  );
  return new Date(istToUtcMs(tomorrowIstTargetWall));
}

/**
 * True when `now` is inside the "delivery window" for a scheduled
 * milestone — i.e. `scheduledAt <= now <= scheduledAt + TOLERANCE`.
 *
 * The cron fires every 2h, so a 2h tolerance means we'll fire a
 * milestone within at most 2h of the intended IST time. A delivery
 * that slips past the window waits for the NEXT day's tick (no
 * late-night surprise pings to kids).
 */
export function isWithinDeliveryWindow(
  now: Date,
  scheduledAt: Date,
  toleranceMs: number = DELIVERY_TOLERANCE_MS,
): boolean {
  const diff = now.getTime() - scheduledAt.getTime();
  return diff >= 0 && diff <= toleranceMs;
}

/**
 * Returns true when `scheduledAt` is in the past but still the same
 * IST calendar day as `now`. Used by the cron to short-circuit on
 * businesses that genuinely missed their window today — skip them
 * until the next day's scheduled tick.
 */
export function isPastTodayButSameIstDay(now: Date, scheduledAt: Date): boolean {
  return scheduledAt.getTime() < now.getTime() && isSameIstDay(now, scheduledAt);
}
