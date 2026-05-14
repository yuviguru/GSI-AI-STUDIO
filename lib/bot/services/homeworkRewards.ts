/** Homework → rewards integration. Maps a completed `HomeworkSession` to
 *  AI Points + badges + streak updates via the existing session rewards
 *  pipeline (`updateSessionPoints`).
 *
 *  Per the plan file: points are scaled by the session score, with revealed
 *  questions weighted at 0.3× so revealing the answer still earns *some*
 *  credit (participation) without letting a kid farm full points by giving
 *  up on every question. The Homework Hero badge family and streak badges
 *  are evaluated automatically inside `updateSessionPoints` via
 *  `checkBadgeUnlocks` — nothing extra to do here.
 *
 *  @see /lib/badges.ts for the badge catalog.
 *  @see /lib/firebase/sessionService.ts for updateSessionPoints. */

import type { HomeworkSession } from '@/lib/bot/types';
import {
  updateSessionPoints,
  type SessionPointsData,
} from '@gsi/firebase/sessionService';

/** Base points for finishing a session, before score scaling. */
const BASE_POINTS = 20;
/** Bonus per correct-and-unrevealed question, scaled by question count. */
const PER_QUESTION_BONUS = 2;
/** Reveal weighting — a revealed-then-correct answer contributes 0.3× of
 *  its base bonus. Keeps participation rewarded without making "reveal
 *  everything" the point-optimal strategy. */
const REVEAL_WEIGHT = 0.3;

export interface HomeworkRewardResult {
  pointsAwarded: number;
  newBadges: string[];
  pointsData: SessionPointsData;
}

/** Compute AI Points for a finished homework session. Exported for unit
 *  testing — the award path runs through `updateSessionPoints` to stay
 *  atomic with the badge evaluation. */
export function computePointsForSession(session: HomeworkSession): number {
  const total = session.totalQuestions;
  if (total === 0) return BASE_POINTS;

  let bonus = 0;
  for (const ans of session.progress.answers) {
    if (!ans.correct) continue;
    bonus += ans.revealed
      ? PER_QUESTION_BONUS * REVEAL_WEIGHT
      : PER_QUESTION_BONUS;
  }
  // Scale base points by mastery score (0-100) so finishing with 50%
  // mastery earns half base, plus the per-question bonuses.
  const masteryScaled = Math.round((BASE_POINTS * session.score) / 100);
  return Math.max(BASE_POINTS, masteryScaled) + Math.round(bonus);
}

/** ISO `YYYY-MM-DD` for "today" in Asia/Kolkata (IST). Streak day-
 *  boundaries follow the kid's local day, not UTC, so a session finished
 *  at 11 pm IST and one at 1 am IST the next day are correctly two days. */
export function todayIsoKolkata(nowMs: number = Date.now()): string {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  return new Date(nowMs + istOffsetMs).toISOString().slice(0, 10);
}

/** Apply homework-completion rewards. Called from the homework module
 *  when a session's currentIndex reaches totalQuestions. Idempotent on
 *  same-day streak increments — calling twice in the same IST day awards
 *  points twice (so a kid finishing two homeworks in a day gets both
 *  rewards) but the streak counter is bumped only once. */
export async function applyHomeworkReward(params: {
  gsiSessionId: string;
  kidId?: string | null;
  session: HomeworkSession;
  now?: number;
}): Promise<HomeworkRewardResult> {
  const points = computePointsForSession(params.session);
  const today = todayIsoKolkata(params.now);

  const { data, newBadges } = await updateSessionPoints(
    params.gsiSessionId,
    { action: 'complete_homework', points, todayDate: today },
    params.kidId ?? undefined,
  );

  return { pointsAwarded: points, newBadges, pointsData: data };
}
