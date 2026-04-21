import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './admin';
import { AppException } from '@/lib/api-utils';
import { checkBadgeUnlocks } from '@/lib/badges';

const SESSIONS_COLLECTION = 'sessions';
const IP_RATE_LIMITS_COLLECTION = 'ipRateLimits';
const MAX_CREATIONS_PER_DAY = 10;
const MAX_CREATIONS_PER_IP_PER_DAY = 20;
const COOLDOWN_SECONDS = 120; // 2 minutes
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface SessionDoc {
  id: string;
  fingerprint: string | null;
  creationCount: number;
  lastCreationAt: Timestamp | null;
  ipHash: string | null;
  createdAt: Timestamp;
  expiresAt: Timestamp;
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
}

// ─── Points types ─────────────────────────────────────────────────────────────

export interface SessionPointsData {
  aiPoints: number;
  badges: string[];
  conceptsLearned: string[];
  creationsByType: Record<string, number>;
  shareCount: number;
}

export type PointsAction =
  | { action: 'add_points'; points: number; concept?: string }
  | { action: 'learn_concept'; concept: string }
  | { action: 'track_creation'; creationType: string }
  | { action: 'track_share' };

function extractPointsData(data: SessionDoc): SessionPointsData {
  return {
    aiPoints: data.aiPoints ?? 0,
    badges: data.badges ?? [],
    conceptsLearned: data.conceptsLearned ?? [],
    creationsByType: data.creationsByType ?? {},
    shareCount: data.shareCount ?? 0,
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
      return {
        ...current,
        creationsByType: { ...current.creationsByType, [action.creationType]: prev + 1 },
      };
    }
    case 'track_share':
      return { ...current, shareCount: current.shareCount + 1 };
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
    const nowEligible = checkBadgeUnlocks(updated);
    const newBadges = nowEligible.filter((id) => !alreadyEarned.has(id));
    if (newBadges.length > 0) {
      updated.badges = [...current.badges, ...newBadges];
    }

    const pointsUpdate = {
      aiPoints: updated.aiPoints,
      badges: updated.badges,
      conceptsLearned: updated.conceptsLearned,
      creationsByType: updated.creationsByType,
      shareCount: updated.shareCount,
    };

    tx.update(sessionRef, pointsUpdate);

    if (kidRef) {
      const totalCreations = Object.values(updated.creationsByType).reduce(
        (sum, n) => sum + n,
        0,
      );
      // Use set-with-merge so the write succeeds even when the kid doc
      // doesn't exist yet (e.g. deleted/recreated profile).  Previously
      // this was guarded by `kidData` which silently skipped the write.
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

    tx.set(
      kidRef,
      {
        aiPoints: updated.aiPoints,
        badges: updated.badges,
        conceptsLearned: updated.conceptsLearned,
        creationsByType: updated.creationsByType,
        shareCount: updated.shareCount,
        totalCreations,
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );

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
    fingerprint: fingerprint ?? null,
    creationCount: 0,
    lastCreationAt: null,
    ipHash: ipHash ?? null,
    createdAt: Timestamp.fromMillis(now),
    expiresAt: Timestamp.fromMillis(now + SESSION_TTL_MS),
  };
}

function buildSessionResult(sessionId: string, data: SessionDoc): SessionResult {
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
