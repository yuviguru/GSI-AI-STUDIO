import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './admin';
import { AppException } from '@/lib/api-utils';
import type { UserRole, UserPlan } from '@/types/user.types';

const USERS_COLLECTION = 'users';
const CREATIONS_COLLECTION = 'creations';
const SESSIONS_COLLECTION = 'sessions';

// ─── Firestore document shape (server-side, with Timestamps) ──────────────

interface UserDocFirestore {
  id: string;
  phone: string;
  name: string;
  email?: string;
  role: UserRole;
  plan: UserPlan;
  planExpiresAt?: Timestamp;
  kidIds: string[];
  schoolId?: string;
  consentedAt: Timestamp; // When parent confirmed they are 18+ and agreed to T&C
  preferences?: {
    language: 'en' | 'hi';
    notifications: boolean;
    theme: 'light' | 'dark';
  };
  claimedSessionIds?: string[];
  // Temporary holding for session data before kid profile is created
  claimedSessionData?: {
    aiPoints: number;
    badges: string[];
    conceptsLearned: string[];
    creationsByType: Record<string, number>;
    shareCount: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Public API ────────────────────────────────────────────────────────────

export interface CreateUserInput {
  uid: string;
  phone: string;
  name: string;
  role: UserRole;
}

/**
 * Create a new user document after phone auth registration.
 * Age verification is handled client-side via consent checkbox.
 * Called from POST /api/auth/register.
 */
export async function createUser(input: CreateUserInput): Promise<UserDocFirestore> {
  const { uid, phone, name, role } = input;

  // Check if user already exists
  const existing = await adminDb.collection(USERS_COLLECTION).doc(uid).get();
  if (existing.exists) {
    return existing.data() as UserDocFirestore;
  }

  const now = Timestamp.now();
  const userDoc: UserDocFirestore = {
    id: uid,
    phone,
    name,
    role,
    plan: 'free',
    kidIds: [],
    consentedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await adminDb.collection(USERS_COLLECTION).doc(uid).set(userDoc);
  return userDoc;
}

/**
 * Get a user document by Firebase UID.
 */
export async function getUser(uid: string): Promise<UserDocFirestore | null> {
  const doc = await adminDb.collection(USERS_COLLECTION).doc(uid).get();
  if (!doc.exists) return null;
  return doc.data() as UserDocFirestore;
}

/**
 * Claim an anonymous session — migrate creations and points to the authenticated user.
 *
 * 1. Find all creations with matching sessionId → set userId
 * 2. Copy session points/badges to user doc (temporary holding until kid profile is created)
 * 3. Mark session as claimed
 *
 * Idempotent: safe to call multiple times for the same session.
 */
export async function claimSession(
  uid: string,
  sessionId: string
): Promise<{ claimedCreations: number; pointsMigrated: number }> {
  // Check if already claimed
  const userDoc = await adminDb.collection(USERS_COLLECTION).doc(uid).get();
  if (!userDoc.exists) {
    throw new AppException('USER_NOT_FOUND', 'User not found', 404);
  }

  const userData = userDoc.data() as UserDocFirestore;
  if (userData.claimedSessionIds?.includes(sessionId)) {
    return { claimedCreations: 0, pointsMigrated: 0 };
  }

  // 1. Find and update creations
  const creationsSnapshot = await adminDb
    .collection(CREATIONS_COLLECTION)
    .where('sessionId', '==', sessionId)
    .get();

  const batch = adminDb.batch();
  let claimedCreations = 0;

  creationsSnapshot.docs.forEach((doc) => {
    // Only claim creations that don't already have a userId
    if (!doc.data().userId) {
      batch.update(doc.ref, { userId: uid });
      claimedCreations++;
    }
  });

  // 2. Read session points data
  const sessionDoc = await adminDb.collection(SESSIONS_COLLECTION).doc(sessionId).get();
  let pointsMigrated = 0;

  if (sessionDoc.exists) {
    const sessionData = sessionDoc.data();
    const sessionPoints = {
      aiPoints: sessionData?.aiPoints ?? 0,
      badges: sessionData?.badges ?? [],
      conceptsLearned: sessionData?.conceptsLearned ?? [],
      creationsByType: sessionData?.creationsByType ?? {},
      shareCount: sessionData?.shareCount ?? 0,
    };
    pointsMigrated = sessionPoints.aiPoints;

    // Store on user doc as temporary holding (moves to kid doc in CLA-17)
    if (sessionPoints.aiPoints > 0 || sessionPoints.badges.length > 0) {
      batch.update(adminDb.collection(USERS_COLLECTION).doc(uid), {
        claimedSessionData: sessionPoints,
        claimedSessionIds: FieldValue.arrayUnion(sessionId),
        updatedAt: Timestamp.now(),
      });
    } else {
      batch.update(adminDb.collection(USERS_COLLECTION).doc(uid), {
        claimedSessionIds: FieldValue.arrayUnion(sessionId),
        updatedAt: Timestamp.now(),
      });
    }

    // Mark session as claimed
    batch.update(sessionDoc.ref, { claimedBy: uid });
  } else {
    // No session doc — just mark claimed on user
    batch.update(adminDb.collection(USERS_COLLECTION).doc(uid), {
      claimedSessionIds: FieldValue.arrayUnion(sessionId),
      updatedAt: Timestamp.now(),
    });
  }

  await batch.commit();

  return { claimedCreations, pointsMigrated };
}
