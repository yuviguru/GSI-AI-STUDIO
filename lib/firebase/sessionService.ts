import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './admin';
import { AppException } from '@/lib/api-utils';
import { checkBadgeUnlocks } from '@/lib/badges';

const SESSIONS_COLLECTION = 'sessions';
const MAX_CREATIONS_PER_DAY = 5;
const COOLDOWN_SECONDS = 120; // 2 minutes
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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
 */
export async function getOrCreateSession(
  sessionId: string,
  fingerprint?: string,
  ipHash?: string
): Promise<SessionResult> {
  const docRef = adminDb.collection(SESSIONS_COLLECTION).doc(sessionId);
  const doc = await docRef.get();

  const now = Date.now();

  if (doc.exists) {
    const data = doc.data() as SessionDoc;
    const expiresAtMs = data.expiresAt.toMillis();

    // Session expired — create a fresh one
    if (now > expiresAtMs) {
      return createSession(docRef, sessionId, fingerprint, ipHash);
    }

    // Session valid — return current state
    return buildSessionResult(sessionId, data);
  }

  // No session found — create new
  return createSession(docRef, sessionId, fingerprint, ipHash);
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
 */
export async function updateSessionPoints(
  sessionId: string,
  action: PointsAction
): Promise<{ data: SessionPointsData; newBadges: string[] }> {
  const docRef = adminDb.collection(SESSIONS_COLLECTION).doc(sessionId);

  const result = await adminDb.runTransaction(async (tx) => {
    const doc = await tx.get(docRef);
    if (!doc.exists) {
      throw new AppException('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    const sessionData = doc.data() as SessionDoc;
    const current = extractPointsData(sessionData);
    const updated = applyAction(current, action);

    // Determine which badges are newly earned
    const alreadyEarned = new Set(current.badges);
    const nowEligible = checkBadgeUnlocks(updated);
    const newBadges = nowEligible.filter((id) => !alreadyEarned.has(id));
    if (newBadges.length > 0) {
      updated.badges = [...current.badges, ...newBadges];
    }

    tx.update(docRef, {
      aiPoints: updated.aiPoints,
      badges: updated.badges,
      conceptsLearned: updated.conceptsLearned,
      creationsByType: updated.creationsByType,
      shareCount: updated.shareCount,
    });

    return { data: updated, newBadges };
  });

  return result;
}

// ─── Internal helpers ────────────────────────────────────

async function createSession(
  docRef: FirebaseFirestore.DocumentReference,
  sessionId: string,
  fingerprint?: string,
  ipHash?: string
): Promise<SessionResult> {
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(Date.now() + SESSION_TTL_MS);

  const sessionData: SessionDoc = {
    id: sessionId,
    fingerprint: fingerprint ?? null,
    creationCount: 0,
    lastCreationAt: null,
    ipHash: ipHash ?? null,
    createdAt: now,
    expiresAt,
  };

  await docRef.set(sessionData);

  return {
    sessionId,
    creationsRemaining: MAX_CREATIONS_PER_DAY,
    cooldownSeconds: 0,
    expiresAt: expiresAt.toDate().toISOString(),
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
