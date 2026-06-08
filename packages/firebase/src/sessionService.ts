import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './admin';
import { AppException } from '@/lib/api-utils';
import { checkBadgeUnlocks, type HomeworkStatsSnapshot } from '@/lib/badges';
import { kidSessionId } from '@/lib/sessions/dayKey';

// Re-export shared helpers so existing import sites continue to work via
// '@/lib/firebase/sessionService' while client code can also import from
// '@/lib/sessions/dayKey' directly without pulling in firebase-admin.
export { localDayKey, kidSessionId } from '@/lib/sessions/dayKey';

const SESSIONS_COLLECTION = 'sessions';
const IP_RATE_LIMITS_COLLECTION = 'ipRateLimits';
// Bumped from 10 → 25 to support Book Studio's per-page AI calls (grammar
// + scene image regen + character anchors + cover image easily reach 15+
// AI calls for a 5-page book with retries).
const MAX_CREATIONS_PER_DAY = 25;
const MAX_CREATIONS_PER_IP_PER_DAY = 50;
// Dropped from 120s → 10s so kids can re-roll image generation without a
// 2-minute wall after each click. Daily cap still bounds abuse.
const COOLDOWN_SECONDS = 10;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Server-side kill switch for rate limiting. Set RATE_LIMIT_DISABLED=true
 *  in `.env.local` for testing — bypasses cooldown, daily cap, and IP cap.
 *  When true, buildSessionResult returns 999 remaining + 0 cooldown so the
 *  client UI shows "999 drawings left today" — the obvious testing-mode
 *  tell. NEVER enable in production. */
const RATE_LIMIT_DISABLED = process.env.RATE_LIMIT_DISABLED === 'true';
const UNLIMITED_REMAINING = 999;

/**
 * Session lifecycle taxonomy:
 *   - 'anonymous' → the device's pre-sign-in bucket. One per device. The only
 *     kind eligible for claim/migration. Once claimed (claimedBy set) or
 *     archived (archivedAt set), it can never re-enter the migration funnel.
 *   - 'kid' → an authenticated kid's daily session, scoped by (kidId, dayKey).
 *     Never migratable. Created via createOrResumeKidSession and rotated at
 *     local-day boundaries.
 *
 * Missing `type` on legacy docs is treated as 'anonymous' for back-compat.
 */
export type SessionType = 'anonymous' | 'kid';

interface SessionDoc {
  id: string;
  type?: SessionType;
  /** For type === 'kid': the kid this session belongs to. */
  kidId?: string;
  /** For type === 'kid': the parent uid that owns the kid (security guard). */
  parentUid?: string;
  /** For type === 'kid': local date in YYYY-MM-DD for daily session grouping. */
  dayKey?: string;
  fingerprint: string | null;
  creationCount: number;
  lastCreationAt: Timestamp | null;
  ipHash: string | null;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  // Migration lifecycle (anonymous sessions only)
  /** Set when claim-session succeeds. Session can never be re-claimed. */
  claimedAt?: Timestamp;
  /** UID of the user that claimed this session. */
  claimedBy?: string;
  /** Soft-archive marker. Cron sweeps archived docs after retention window. */
  archivedAt?: Timestamp;
  /** UID of the user who archived this session (audit trail). */
  archivedBy?: string;
  /** Kid sessions only — set when the session is rotated away (kid switch,
   *  day rollover, sign-out). Subsequent writes should target a new session. */
  endedAt?: Timestamp;
  // Points & badge fields (added in Phase 1.5 — optional for backward compat)
  aiPoints?: number;
  badges?: string[];
  conceptsLearned?: string[];
  creationsByType?: Record<string, number>;
  shareCount?: number;
  // Beat the AI skill & stats fields (Phase 1.5)
  beatTheAiSkills?: Record<string, { xp: number; level: number }>;
  beatTheAiStats?: {
    totalRounds: number;
    wins: number;
    losses: number;
    ties: number;
    currentStreak: number;
    longestStreak: number;
    byCategory: Record<string, { rounds: number; wins: number }>;
  };
  // MindX — Skill Arena fields (Phase 1.5)
  skillArenaProgress?: Record<string, { band: number; score: number; assessments: number }>;
  skillArenaStats?: { totalAssessments: number; averageBand: number };
  // Homework fields (Phase 2) — populated by the `complete_homework` action
  homeworkStats?: {
    sessionsCompleted: number;
    currentStreak: number;
    longestStreak: number;
    lastCompletedDate: string | null;
  };
  /** Per-studio daily activity streaks. Bumped by `track_creation` when
   *  the action carries a `todayDate` and the `creationType` is a known
   *  studio (book/story/music/quiz/comic/game). See lib/badges.ts
   *  `studio_streak` criteria. */
  perStudioStreaks?: Record<string, { count: number; lastDay: string }>;
}

/** Studio creationTypes that maintain a daily-activity streak. Other types
 *  (e.g. `beat-the-ai`, `homework`) have their own dedicated counters and
 *  are intentionally excluded from this map to keep it focused. */
const STUDIO_STREAK_TYPES = new Set([
  'book',
  'story',
  'music',
  'quiz',
  'comic',
  'game',
]);

// ─── Points types ─────────────────────────────────────────────────────────────

export interface SessionPointsData {
  aiPoints: number;
  badges: string[];
  conceptsLearned: string[];
  creationsByType: Record<string, number>;
  shareCount: number;
  /** Homework completion counters. Absent on sessions that predate the
   *  homework feature — treat missing/undefined as all-zero. */
  homeworkStats?: HomeworkStatsSnapshot;
  /** Per-studio daily activity streaks. Read by `studio_streak` badge
   *  criteria. Absent on sessions that predate the streak feature. */
  perStudioStreaks?: Record<string, { count: number; lastDay: string }>;
}

export type PointsAction =
  | { action: 'add_points'; points: number; concept?: string }
  | { action: 'learn_concept'; concept: string }
  | {
      action: 'track_creation';
      creationType: string;
      /** Optional ISO `YYYY-MM-DD` in the kid's local day. When supplied
       *  and `creationType` is a known studio, bumps the per-studio streak
       *  using the same yesterday/today/older logic as homework streaks. */
      todayDate?: string;
    }
  | { action: 'track_share' }
  | {
      /** Completion of a homework session via the bot. Awards points and
       *  updates the per-day homework streak. Streak logic:
       *    - `todayDate` same as `lastCompletedDate` → streak unchanged (idempotent for same-day completions)
       *    - `todayDate` = `lastCompletedDate + 1 day` → streak += 1
       *    - otherwise → streak resets to 1.
       *  `longestStreak` monotonically grows. */
      action: 'complete_homework';
      points: number;
      /** ISO `YYYY-MM-DD` of the completion day. Caller supplies so the
       *  day boundary follows the kid's local day when we have a kid
       *  profile with a tz; Asia/Kolkata used in the bot caller. */
      todayDate: string;
    };

function extractPointsData(data: SessionDoc): SessionPointsData {
  return {
    aiPoints: data.aiPoints ?? 0,
    badges: data.badges ?? [],
    conceptsLearned: data.conceptsLearned ?? [],
    creationsByType: data.creationsByType ?? {},
    shareCount: data.shareCount ?? 0,
    homeworkStats: data.homeworkStats
      ? { ...data.homeworkStats }
      : undefined,
    perStudioStreaks: data.perStudioStreaks
      ? { ...data.perStudioStreaks }
      : undefined,
  };
}

/** Mirror of `computeHomeworkStreak` for per-studio daily streaks. Same
 *  semantics: same-day = idempotent, yesterday = bump, older/null = reset to 1. */
export function computeStudioStreak(params: {
  previousCount: number;
  lastDay: string | null | undefined;
  today: string;
}): { count: number; lastDay: string } {
  const { previousCount, lastDay, today } = params;

  if (lastDay === today) {
    return { count: Math.max(previousCount, 1), lastDay: today };
  }

  const yesterdayISO = (() => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  const next = lastDay === yesterdayISO ? previousCount + 1 : 1;
  return { count: next, lastDay: today };
}

/** Compute the new streak state given the previous `lastCompletedDate`
 *  (ISO `YYYY-MM-DD`) and the `today` value supplied by the caller.
 *  Exported for unit testing. */
export function computeHomeworkStreak(params: {
  previousStreak: number;
  previousLongest: number;
  lastCompletedDate: string | null | undefined;
  today: string;
}): { currentStreak: number; longestStreak: number; lastCompletedDate: string } {
  const { previousStreak, previousLongest, lastCompletedDate, today } = params;

  // Idempotent same-day completion — don't double-count streaks when a kid
  // finishes two homework sessions back-to-back.
  if (lastCompletedDate === today) {
    return {
      currentStreak: Math.max(previousStreak, 1),
      longestStreak: Math.max(previousLongest, previousStreak, 1),
      lastCompletedDate: today,
    };
  }

  const yesterdayISO = (() => {
    // today is YYYY-MM-DD → step back one UTC day. Caller already aligned
    // the value to the kid's local day, so simple UTC math is fine here.
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  const next =
    lastCompletedDate === yesterdayISO ? previousStreak + 1 : 1;

  return {
    currentStreak: next,
    longestStreak: Math.max(previousLongest, next),
    lastCompletedDate: today,
  };
}

function applyAction(current: SessionPointsData, action: PointsAction): SessionPointsData {
  switch (action.action) {
    case 'add_points': {
      const updated: SessionPointsData = {
        ...current,
        aiPoints: current.aiPoints + action.points,
      };
      if (action.concept && !current.conceptsLearned.includes(action.concept)) {
        updated.conceptsLearned = [...current.conceptsLearned, action.concept];
      }
      return updated;
    }
    case 'learn_concept': {
      if (current.conceptsLearned.includes(action.concept)) return current;
      return { ...current, conceptsLearned: [...current.conceptsLearned, action.concept] };
    }
    case 'track_creation': {
      const prev = current.creationsByType[action.creationType] ?? 0;
      const updated: SessionPointsData = {
        ...current,
        creationsByType: { ...current.creationsByType, [action.creationType]: prev + 1 },
      };
      // Bump per-studio streak only when the caller supplied today's date
      // AND the creationType is a known studio. Other types (e.g.
      // 'beat-the-ai') have dedicated counters elsewhere.
      if (action.todayDate && STUDIO_STREAK_TYPES.has(action.creationType)) {
        const prevStreak = current.perStudioStreaks?.[action.creationType];
        const next = computeStudioStreak({
          previousCount: prevStreak?.count ?? 0,
          lastDay: prevStreak?.lastDay ?? null,
          today: action.todayDate,
        });
        updated.perStudioStreaks = {
          ...(current.perStudioStreaks ?? {}),
          [action.creationType]: next,
        };
      }
      return updated;
    }
    case 'track_share':
      return { ...current, shareCount: current.shareCount + 1 };
    case 'complete_homework': {
      const prev = current.homeworkStats ?? {
        sessionsCompleted: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastCompletedDate: null,
      };
      const streak = computeHomeworkStreak({
        previousStreak: prev.currentStreak ?? 0,
        previousLongest: prev.longestStreak ?? 0,
        lastCompletedDate: prev.lastCompletedDate ?? null,
        today: action.todayDate,
      });
      // Count same-day repeat completions toward sessionsCompleted so the
      // "sessions" badge reflects raw effort; streak stays idempotent.
      const sessionsCompleted = (prev.sessionsCompleted ?? 0) + 1;
      return {
        ...current,
        aiPoints: current.aiPoints + action.points,
        homeworkStats: {
          sessionsCompleted,
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          lastCompletedDate: streak.lastCompletedDate,
        },
      };
    }
  }
}

export interface SessionResult {
  sessionId: string;
  creationsRemaining: number;
  cooldownSeconds: number;
  expiresAt: string;
}

/**
 * Get an existing session or create a new one.
 * Sessions are stored in Firestore and used for anonymous rate limiting.
 *
 * Uses a Firestore transaction to prevent the race condition where two
 * concurrent requests both see "not exists" and both create — the second
 * would overwrite the first with a fresh createdAt timestamp.
 */
export async function getOrCreateSession(
  sessionId: string,
  fingerprint?: string,
  ipHash?: string
): Promise<SessionResult> {
  const docRef = adminDb.collection(SESSIONS_COLLECTION).doc(sessionId);

  const data = await adminDb.runTransaction(async (tx) => {
    const doc = await tx.get(docRef);
    const now = Date.now();

    if (doc.exists) {
      const existing = doc.data() as SessionDoc;

      // Session expired — recreate within transaction
      if (now > existing.expiresAt.toMillis()) {
        const fresh = buildNewSessionDoc(sessionId, fingerprint, ipHash, now);
        tx.set(docRef, fresh);
        return fresh;
      }

      return existing;
    }

    // No session found — create new within transaction
    const fresh = buildNewSessionDoc(sessionId, fingerprint, ipHash, now);
    tx.set(docRef, fresh);
    return fresh;
  });

  return buildSessionResult(sessionId, data);
}

/**
 * Track a creation for rate limiting. Call this after a successful AI generation.
 * Uses a Firestore transaction to prevent concurrent requests from bypassing limits.
 * Throws if rate limited.
 */
export async function trackCreation(sessionId: string): Promise<SessionResult> {
  const docRef = adminDb.collection(SESSIONS_COLLECTION).doc(sessionId);

  const updatedData = await adminDb.runTransaction(async (tx) => {
    const doc = await tx.get(docRef);

    if (!doc.exists) {
      throw new AppException('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    const data = doc.data() as SessionDoc;
    const now = Date.now();

    // Check session expiry
    if (now > data.expiresAt.toMillis()) {
      throw new AppException('SESSION_EXPIRED', 'Session has expired. Please refresh.', 401);
    }

    // Bypass daily-limit + cooldown when the kill switch is on (testing only).
    if (!RATE_LIMIT_DISABLED) {
      // Check daily limit
      if (data.creationCount >= MAX_CREATIONS_PER_DAY) {
        throw new AppException('RATE_LIMITED', 'Daily creation limit reached. Come back tomorrow!', 429);
      }

      // Check cooldown
      if (data.lastCreationAt) {
        const elapsed = (now - data.lastCreationAt.toMillis()) / 1000;
        if (elapsed < COOLDOWN_SECONDS) {
          const remaining = Math.ceil(COOLDOWN_SECONDS - elapsed);
          throw new AppException(
            'COOLDOWN',
            `Please wait ${remaining} seconds before creating again.`,
            429
          );
        }
      }
    }

    // Atomically update within the transaction
    const newCount = data.creationCount + 1;
    const newLastCreation = Timestamp.fromMillis(now);
    tx.update(docRef, {
      creationCount: newCount,
      lastCreationAt: newLastCreation,
    });

    return {
      ...data,
      creationCount: newCount,
      lastCreationAt: newLastCreation,
    };
  });

  return buildSessionResult(sessionId, updatedData);
}

/**
 * Check rate limit without tracking. Used before starting a generation.
 */
export async function checkRateLimit(sessionId: string): Promise<SessionResult> {
  const docRef = adminDb.collection(SESSIONS_COLLECTION).doc(sessionId);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new AppException('SESSION_NOT_FOUND', 'Session not found', 404);
  }

  const data = doc.data() as SessionDoc;
  const now = Date.now();

  if (now > data.expiresAt.toMillis()) {
    throw new AppException('SESSION_EXPIRED', 'Session has expired. Please refresh.', 401);
  }

  // Skip cap + cooldown checks when RATE_LIMIT_DISABLED. Session expiry still applies.
  if (!RATE_LIMIT_DISABLED) {
    if (data.creationCount >= MAX_CREATIONS_PER_DAY) {
      throw new AppException('RATE_LIMITED', 'Daily creation limit reached. Come back tomorrow!', 429);
    }

    if (data.lastCreationAt) {
      const elapsed = (now - data.lastCreationAt.toMillis()) / 1000;
      if (elapsed < COOLDOWN_SECONDS) {
        const remaining = Math.ceil(COOLDOWN_SECONDS - elapsed);
        throw new AppException(
          'COOLDOWN',
          `Please wait ${remaining} seconds before creating again.`,
          429
        );
      }
    }
  }

  return buildSessionResult(sessionId, data);
}

// ─── Points & badge service functions ────────────────────────────────────────

/**
 * Read the current points/badge state for a session.
 * Returns zero defaults for sessions that predate the points system.
 */
export async function getSessionPoints(sessionId: string): Promise<SessionPointsData> {
  const doc = await adminDb.collection(SESSIONS_COLLECTION).doc(sessionId).get();
  if (!doc.exists) {
    throw new AppException('SESSION_NOT_FOUND', 'Session not found', 404);
  }
  return extractPointsData(doc.data() as SessionDoc);
}

/**
 * Atomically apply a points action and check for newly unlocked badges.
 * Returns the updated points data and any badges unlocked by this action.
 *
 * When an `activeKidId` is provided (authenticated flow), the same mutation
 * is mirrored onto the kid document inside the same transaction so the
 * kid's profile survives page refreshes and sign-outs.
 */
export async function updateSessionPoints(
  sessionId: string,
  action: PointsAction,
  activeKidId?: string,
): Promise<{ data: SessionPointsData; newBadges: string[] }> {
  const sessionRef = adminDb.collection(SESSIONS_COLLECTION).doc(sessionId);
  const kidRef = activeKidId
    ? adminDb.collection('kids').doc(activeKidId)
    : null;

  const result = await adminDb.runTransaction(async (tx) => {
    const sessionDoc = await tx.get(sessionRef);
    if (!sessionDoc.exists) {
      throw new AppException('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    // When a kid is active, the kid doc is the source of truth for the
    // mutation base — the session may have been freshly minted (e.g. after
    // a hard sign-out reset) and would otherwise wipe the kid's progress.
    let current: SessionPointsData;
    let kidData: Record<string, unknown> | null = null;
    if (kidRef) {
      const kidDoc = await tx.get(kidRef);
      if (kidDoc.exists) {
        kidData = kidDoc.data() as Record<string, unknown>;
        current = {
          aiPoints: (kidData.aiPoints as number) ?? 0,
          badges: (kidData.badges as string[]) ?? [],
          conceptsLearned: (kidData.conceptsLearned as string[]) ?? [],
          creationsByType:
            (kidData.creationsByType as Record<string, number>) ?? {},
          shareCount: (kidData.shareCount as number) ?? 0,
          homeworkStats:
            (kidData.homeworkStats as SessionPointsData['homeworkStats']) ??
            undefined,
          perStudioStreaks:
            (kidData.perStudioStreaks as SessionPointsData['perStudioStreaks']) ??
            undefined,
        };
      } else {
        current = extractPointsData(sessionDoc.data() as SessionDoc);
      }
    } else {
      current = extractPointsData(sessionDoc.data() as SessionDoc);
    }

    const updated = applyAction(current, action);

    // Determine which badges are newly earned
    const alreadyEarned = new Set(current.badges);
    const nowEligible = checkBadgeUnlocks(updated, undefined, updated.homeworkStats);
    const newBadges = nowEligible.filter((id) => !alreadyEarned.has(id));
    if (newBadges.length > 0) {
      updated.badges = [...current.badges, ...newBadges];
    }

    const pointsUpdate: Record<string, unknown> = {
      aiPoints: updated.aiPoints,
      badges: updated.badges,
      conceptsLearned: updated.conceptsLearned,
      creationsByType: updated.creationsByType,
      shareCount: updated.shareCount,
    };
    // Only write homeworkStats when the action actually touched it —
    // otherwise we'd stamp `undefined` into documents that have never
    // seen a homework action (harmless but noisy in Firestore exports).
    if (updated.homeworkStats) {
      pointsUpdate.homeworkStats = updated.homeworkStats;
    }
    // Same idea for perStudioStreaks — only written when track_creation
    // with a `todayDate` actually bumped a studio counter.
    if (updated.perStudioStreaks) {
      pointsUpdate.perStudioStreaks = updated.perStudioStreaks;
    }

    tx.update(sessionRef, pointsUpdate);

    if (kidRef && kidData) {
      const totalCreations = Object.values(updated.creationsByType).reduce(
        (sum, n) => sum + n,
        0,
      );
      // Mirror onto the kid doc — gated on the kid actually existing
      // (kidData was populated from tx.get above). If the kid was deleted
      // concurrently, the set-with-merge would otherwise resurrect a
      // ghost record with only points fields and no parentId / name /
      // age — a malformed doc that downstream queries can't trust.
      // Session-level writes still happen, so points aren't lost for any
      // flow that reads the session doc directly; the kid mirror simply
      // skips when there's no kid to mirror to.
      tx.set(
        kidRef,
        { ...pointsUpdate, totalCreations, updatedAt: Timestamp.now() },
        { merge: true },
      );
    }

    return { data: updated, newBadges };
  });

  return result;
}

/**
 * Authenticated-kid points write. Keyed PURELY on `kidId` — the kid document
 * is the single source of truth for points/badges/creationsByType/etc. for
 * signed-in kids, and this function never touches the anonymous `sessions`
 * collection.
 *
 * Use this from authenticated-only flows (Kid CEO, and any future flow that
 * requires a Firebase Bearer token + X-Active-Kid-Id). The older
 * `updateSessionPoints` still exists for anonymous studios (Beat the AI,
 * Skill Arena, unsigned-in creations) where the session doc IS the source of
 * truth; when those flows authenticate, they migrate to this function.
 *
 * Set-with-merge rather than `update` so the first points write after a
 * freshly-created kid profile (without prior gamification fields) still
 * succeeds instead of erroring on missing-field updates.
 */
export async function updateKidPoints(
  kidId: string,
  action: PointsAction,
): Promise<{ data: SessionPointsData; newBadges: string[] }> {
  const kidRef = adminDb.collection('kids').doc(kidId);

  return await adminDb.runTransaction(async (tx) => {
    const kidDoc = await tx.get(kidRef);
    if (!kidDoc.exists) {
      throw new AppException('NOT_FOUND', 'Kid profile not found', 404);
    }
    const kidData = kidDoc.data() as Record<string, unknown>;

    const current: SessionPointsData = {
      aiPoints: (kidData.aiPoints as number) ?? 0,
      badges: (kidData.badges as string[]) ?? [],
      conceptsLearned: (kidData.conceptsLearned as string[]) ?? [],
      creationsByType: (kidData.creationsByType as Record<string, number>) ?? {},
      shareCount: (kidData.shareCount as number) ?? 0,
      perStudioStreaks:
        (kidData.perStudioStreaks as SessionPointsData['perStudioStreaks']) ??
        undefined,
    };

    const updated = applyAction(current, action);

    // Badges — only award ones not already earned.
    const alreadyEarned = new Set(current.badges);
    const nowEligible = checkBadgeUnlocks(updated);
    const newBadges = nowEligible.filter((id) => !alreadyEarned.has(id));
    if (newBadges.length > 0) {
      updated.badges = [...current.badges, ...newBadges];
    }

    const totalCreations = Object.values(updated.creationsByType).reduce(
      (sum, n) => sum + n,
      0,
    );

    const writeFields: Record<string, unknown> = {
      aiPoints: updated.aiPoints,
      badges: updated.badges,
      conceptsLearned: updated.conceptsLearned,
      creationsByType: updated.creationsByType,
      shareCount: updated.shareCount,
      totalCreations,
      updatedAt: Timestamp.now(),
    };
    if (updated.perStudioStreaks) {
      writeFields.perStudioStreaks = updated.perStudioStreaks;
    }

    tx.set(kidRef, writeFields, { merge: true });

    return { data: updated, newBadges };
  });
}

// ─── Internal helpers ────────────────────────────────────

function buildNewSessionDoc(
  sessionId: string,
  fingerprint?: string,
  ipHash?: string,
  nowMs?: number,
): SessionDoc {
  const now = nowMs ?? Date.now();
  return {
    id: sessionId,
    // Anonymous device session — the default lifecycle. Kid-scoped sessions
    // are created via createOrResumeKidSession instead.
    type: 'anonymous',
    fingerprint: fingerprint ?? null,
    creationCount: 0,
    lastCreationAt: null,
    ipHash: ipHash ?? null,
    createdAt: Timestamp.fromMillis(now),
    expiresAt: Timestamp.fromMillis(now + SESSION_TTL_MS),
  };
}

function buildSessionResult(sessionId: string, data: SessionDoc): SessionResult {
  // Kill-switch path — surface a sentinel high count so the kid sees the
  // pill say "999 drawings left today" (the obvious testing-mode tell).
  if (RATE_LIMIT_DISABLED) {
    return {
      sessionId,
      creationsRemaining: UNLIMITED_REMAINING,
      cooldownSeconds: 0,
      expiresAt: data.expiresAt.toDate().toISOString(),
    };
  }

  const now = Date.now();
  const remaining = MAX_CREATIONS_PER_DAY - data.creationCount;

  let cooldownSeconds = 0;
  if (data.lastCreationAt) {
    const elapsed = (now - data.lastCreationAt.toMillis()) / 1000;
    if (elapsed < COOLDOWN_SECONDS) {
      cooldownSeconds = Math.ceil(COOLDOWN_SECONDS - elapsed);
    }
  }

  return {
    sessionId,
    creationsRemaining: Math.max(0, remaining),
    cooldownSeconds,
    expiresAt: data.expiresAt.toDate().toISOString(),
  };
}

// ─── Session lifecycle helpers (claim eligibility, archive, kid sessions) ───

/**
 * Throw if `sessionId` is not eligible to be claimed/migrated.
 * Ineligible reasons:
 *   - session already claimed (claimedBy set) → would be a duplicate migration
 *   - session archived (archivedAt set) → user already discarded it
 *   - session is a kid-scoped session (type === 'kid') → kid sessions are
 *     never migratable per the architectural invariant
 *
 * If `tx` is provided, the read uses the transaction (must be called before
 * any writes inside the same transaction).
 */
export async function assertSessionEligibleForClaim(
  sessionId: string,
  tx?: FirebaseFirestore.Transaction,
): Promise<void> {
  // A kid-scoped session id (`kid-<kidId>-<dayKey>`) belongs to a logged-in kid
  // — it is never anonymous guest work, so it must never be migrated. Reject by
  // FORMAT up front: the daily session doc may not exist yet at claim time, so
  // the `type === 'kid'` doc check below isn't enough on its own. This is what
  // stops the sign-in migration prompt from nagging a signed-in user about
  // their own session.
  if (sessionId.startsWith('kid-')) {
    throw new AppException(
      'SESSION_INELIGIBLE',
      'Kid-scoped sessions cannot be migrated',
      409,
    );
  }
  const ref = adminDb.collection(SESSIONS_COLLECTION).doc(sessionId);
  const snap = tx ? await tx.get(ref) : await ref.get();
  if (!snap.exists) return; // No doc → nothing to claim, but not an error either
  const data = snap.data() as SessionDoc;
  if (data.type === 'kid') {
    throw new AppException(
      'SESSION_INELIGIBLE',
      'Kid-scoped sessions cannot be migrated',
      409,
    );
  }
  if (data.claimedBy) {
    throw new AppException(
      'SESSION_ALREADY_CLAIMED',
      'This session has already been migrated',
      409,
    );
  }
  if (data.archivedAt) {
    throw new AppException(
      'SESSION_ARCHIVED',
      'This session has been archived and cannot be migrated',
      409,
    );
  }
}

/**
 * Soft-archive a session. Sets archivedAt + archivedBy. The doc and its
 * orphan creations stay in Firestore for the retention window (a future cron
 * job hard-deletes after N days). Used by the "Discard" path of the
 * sign-in migration prompt.
 *
 * Safe no-op if the session doesn't exist or is already archived.
 */
export async function archiveSession(
  sessionId: string,
  archivedBy?: string,
): Promise<void> {
  const ref = adminDb.collection(SESSIONS_COLLECTION).doc(sessionId);
  const snap = await ref.get();
  if (!snap.exists) return;
  const data = snap.data() as SessionDoc;
  if (data.archivedAt) return; // Already archived — keep the original stamp
  await ref.update({
    archivedAt: Timestamp.now(),
    ...(archivedBy ? { archivedBy } : {}),
  });
}

/**
 * Create (or resume) a kid's daily session.
 *
 * The doc id is deterministic: `kid-{kidId}-{dayKey}` where dayKey is
 * `YYYY-MM-DD` in the caller's local timezone. Calling this twice for the
 * same (kidId, dayKey) is idempotent — the first call creates the doc and
 * subsequent calls return the existing one.
 *
 * Caller MUST pass the verified `parentUid` (from the request's Firebase
 * token) so we can store it on the doc for downstream ownership checks.
 */
export async function createOrResumeKidSession(params: {
  kidId: string;
  parentUid: string;
  dayKey: string;
}): Promise<{ sessionId: string; created: boolean }> {
  const { kidId, parentUid, dayKey } = params;
  const sessionId = kidSessionId(kidId, dayKey);
  const ref = adminDb.collection(SESSIONS_COLLECTION).doc(sessionId);

  const created = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const existing = snap.data() as SessionDoc;
      // Re-stamp endedAt to undefined if the session was previously ended
      // (kid switched away, then back). Firestore can't store `undefined` —
      // use FieldValue.delete() for clearing.
      if (existing.endedAt) {
        tx.update(ref, {
          endedAt: FieldValue.delete(),
        });
      }
      return false;
    }
    const now = Date.now();
    const doc: SessionDoc = {
      id: sessionId,
      type: 'kid',
      kidId,
      parentUid,
      dayKey,
      fingerprint: null,
      creationCount: 0,
      lastCreationAt: null,
      ipHash: null,
      createdAt: Timestamp.fromMillis(now),
      expiresAt: Timestamp.fromMillis(now + SESSION_TTL_MS),
    };
    tx.set(ref, doc);
    return true;
  });

  return { sessionId, created };
}

/**
 * Mark a kid-scoped session as ended. Subsequent writes should rotate to a
 * fresh session. Safe no-op if doc doesn't exist or is already ended.
 */
export async function endKidSession(sessionId: string): Promise<void> {
  const ref = adminDb.collection(SESSIONS_COLLECTION).doc(sessionId);
  const snap = await ref.get();
  if (!snap.exists) return;
  const data = snap.data() as SessionDoc;
  if (data.endedAt) return;
  await ref.update({ endedAt: Timestamp.now() });
}

// (localDayKey + kidSessionId are re-exported from '@/lib/sessions/dayKey' at
// the top of this file so both server and client can import them by name.)

// ─── Per-IP rate limiting (sybil guard for anonymous users) ──────────────────

function dayKeyUtc(date = new Date()): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Enforces a per-IP daily creation cap regardless of how many sessions the
 * caller minted. Closes the localStorage-reset loophole on MAX_CREATIONS_PER_DAY.
 *
 * Call at the top of every AI-generating route. Increments the counter on
 * successful checks — do not call twice for the same request. Ignores calls
 * with no IP (local dev) so the dev flow isn't blocked.
 */
export async function enforceIpRateLimit(ipAddress: string | null): Promise<void> {
  if (!ipAddress) return; // local dev or missing header — skip
  if (RATE_LIMIT_DISABLED) return; // testing kill switch

  const ipHash = await sha256Hex(ipAddress);
  const docId = `${ipHash}_${dayKeyUtc()}`;
  const docRef = adminDb.collection(IP_RATE_LIMITS_COLLECTION).doc(docId);

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    const count = snap.exists ? ((snap.data()?.count as number) ?? 0) : 0;
    if (count >= MAX_CREATIONS_PER_IP_PER_DAY) {
      throw new AppException(
        'RATE_LIMITED',
        'Too many creations from this network today. Try again tomorrow!',
        429,
      );
    }
    const tomorrow = new Date();
    tomorrow.setUTCHours(24, 0, 0, 0);
    tx.set(
      docRef,
      {
        count: count + 1,
        updatedAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(tomorrow),
      },
      { merge: true },
    );
  });
}
