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
  name?: string;
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
  // Temporary holding for session data before kid profile is created.
  // Repeated claim-session calls MERGE points/badges (additive) instead of
  // overwriting, so a parent who claims multiple anonymous sessions before
  // creating a kid keeps the cumulative total.
  claimedSessionData?: {
    aiPoints: number;
    badges: string[];
    conceptsLearned: string[];
    creationsByType: Record<string, number>;
    shareCount: number;
    /** Onboarding profile picked anonymously — name/age/mascot/avatar.
     *  Carried through from useOnboardingProfile localStorage on first claim,
     *  then migrated onto first kid by createKid(). */
    onboarding?: {
      name?: string;
      age?: number;
      mascotId?: string;
      avatarUrl?: string;
    };
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Public API ────────────────────────────────────────────────────────────

export interface CreateUserInput {
  uid: string;
  phone: string;
  role: UserRole;
}

/**
 * Create a new user document after phone auth registration.
 * Age verification is handled client-side via consent checkbox.
 * Called from POST /api/auth/register.
 */
export async function createUser(input: CreateUserInput): Promise<UserDocFirestore> {
  const { uid, phone, role } = input;

  // Check if user already exists
  const existing = await adminDb.collection(USERS_COLLECTION).doc(uid).get();
  if (existing.exists) {
    return existing.data() as UserDocFirestore;
  }

  const now = Timestamp.now();
  const userDoc: UserDocFirestore = {
    id: uid,
    phone,
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

export interface ClaimSessionOnboarding {
  name?: string;
  age?: number;
  mascotId?: string;
  avatarUrl?: string;
}

/**
 * Claim an anonymous session — migrate creations and points to the authenticated user.
 *
 * 1. Auto-create user doc if missing (handles claim-before-register race).
 * 2. Find all creations with matching sessionId → set userId.
 * 3. Merge session points/badges into user.claimedSessionData (additive across
 *    multiple claims — first kid created consumes the merged total).
 * 4. Carry forward the kid's anonymous onboarding profile (mascot, avatar,
 *    name, age) so it lands on the first kid doc.
 * 5. Mark session as claimed.
 *
 * Idempotent: safe to call multiple times for the same session — the first
 * claim wins for points, subsequent calls for the same sessionId are no-ops.
 *
 * `phone`/`role` parameters are used only when the user doc doesn't yet exist
 * (race recovery). They come from the verified Firebase ID token — never from
 * the request body.
 */
export async function claimSession(
  uid: string,
  sessionId: string,
  options: {
    phone?: string;
    role?: UserRole;
    onboarding?: ClaimSessionOnboarding;
  } = {},
): Promise<{ claimedCreations: number; pointsMigrated: number }> {
  const userRef = adminDb.collection(USERS_COLLECTION).doc(uid);

  // 0. Auto-create the user doc if it's missing — closes the race where
  //    SessionInit fires claim-session before PhoneAuthFlow has finished
  //    register. Phone is the only required field (from verified token).
  const initialUserDoc = await userRef.get();
  if (!initialUserDoc.exists) {
    if (!options.phone) {
      throw new AppException(
        'USER_NOT_FOUND',
        'User profile not found and no phone available to auto-create',
        404,
      );
    }
    const now = Timestamp.now();
    await userRef.set({
      id: uid,
      phone: options.phone,
      role: options.role ?? 'parent',
      plan: 'free',
      kidIds: [],
      consentedAt: now,
      createdAt: now,
      updatedAt: now,
    } satisfies UserDocFirestore);
  }

  // 1. Find and update creations (read outside the transaction — large batches
  //    don't fit in a transaction and creation ownership is monotonic anyway).
  const creationsSnapshot = await adminDb
    .collection(CREATIONS_COLLECTION)
    .where('sessionId', '==', sessionId)
    .get();

  const creationBatch = adminDb.batch();
  let claimedCreations = 0;

  creationsSnapshot.docs.forEach((doc) => {
    if (!doc.data().userId) {
      creationBatch.update(doc.ref, { userId: uid });
      claimedCreations++;
    }
  });

  if (claimedCreations > 0) {
    await creationBatch.commit();
  }

  // 2. Merge session data into user.claimedSessionData inside a transaction so
  //    concurrent claims don't clobber each other. Idempotent on sessionId.
  const sessionRef = adminDb.collection(SESSIONS_COLLECTION).doc(sessionId);
  let pointsMigrated = 0;

  await adminDb.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) {
      // Should be unreachable — created above — but guard anyway.
      throw new AppException('USER_NOT_FOUND', 'User profile vanished', 500);
    }
    const userData = userSnap.data() as UserDocFirestore;

    // Already claimed this session — no-op (return early but still merge
    // onboarding profile if the caller sent one and the user has none yet).
    if (userData.claimedSessionIds?.includes(sessionId)) {
      const existing = userData.claimedSessionData?.onboarding ?? {};
      const merged = mergeOnboarding(existing, options.onboarding);
      if (merged && JSON.stringify(merged) !== JSON.stringify(existing)) {
        tx.update(userRef, {
          'claimedSessionData.onboarding': merged,
          updatedAt: Timestamp.now(),
        });
      }
      return;
    }

    const sessionSnap = await tx.get(sessionRef);
    const sessionData = sessionSnap.exists ? sessionSnap.data() : null;

    const sessionPoints = {
      aiPoints: sessionData?.aiPoints ?? 0,
      badges: (sessionData?.badges ?? []) as string[],
      conceptsLearned: (sessionData?.conceptsLearned ?? []) as string[],
      creationsByType: (sessionData?.creationsByType ?? {}) as Record<string, number>,
      shareCount: sessionData?.shareCount ?? 0,
    };
    pointsMigrated = sessionPoints.aiPoints;

    const previous = userData.claimedSessionData ?? {
      aiPoints: 0,
      badges: [],
      conceptsLearned: [],
      creationsByType: {},
      shareCount: 0,
    };

    const mergedOnboarding = mergeOnboarding(previous.onboarding, options.onboarding);

    // Build the payload field-by-field — Firestore rejects nested
    // `FieldValue.delete()` inside an `update()` map value, and also rejects
    // explicit `undefined` values. So we omit `onboarding` entirely when there
    // is nothing to write. Because we're replacing the whole claimedSessionData
    // map atomically (top-level key, not dot-path), omitting the field cleanly
    // drops any previously-stored onboarding too — no delete sentinel needed.
    const claimedSessionDataPayload: Record<string, unknown> = {
      aiPoints: previous.aiPoints + sessionPoints.aiPoints,
      badges: dedupe([...previous.badges, ...sessionPoints.badges]),
      conceptsLearned: dedupe([...previous.conceptsLearned, ...sessionPoints.conceptsLearned]),
      creationsByType: addCounts(previous.creationsByType, sessionPoints.creationsByType),
      shareCount: previous.shareCount + sessionPoints.shareCount,
    };
    if (mergedOnboarding) {
      claimedSessionDataPayload.onboarding = mergedOnboarding;
    }

    tx.update(userRef, {
      claimedSessionData: claimedSessionDataPayload,
      claimedSessionIds: FieldValue.arrayUnion(sessionId),
      updatedAt: Timestamp.now(),
    });

    if (sessionSnap.exists) {
      tx.update(sessionRef, { claimedBy: uid });
    }
  });

  return { claimedCreations, pointsMigrated };
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function addCounts(
  a: Record<string, number>,
  b: Record<string, number>,
): Record<string, number> {
  const out = { ...a };
  for (const key of Object.keys(b)) {
    out[key] = (out[key] ?? 0) + (b[key] ?? 0);
  }
  return out;
}

function mergeOnboarding(
  prev: ClaimSessionOnboarding | undefined,
  next: ClaimSessionOnboarding | undefined,
): ClaimSessionOnboarding | undefined {
  if (!prev && !next) return undefined;
  // First-write wins for each field — don't let a later anonymous session
  // overwrite a name/mascot/avatar the kid already chose.
  // Build the object incrementally so absent fields don't appear as
  // `undefined` values (which Firestore rejects on write).
  const merged: ClaimSessionOnboarding = {};
  const name = prev?.name ?? next?.name;
  const age = prev?.age ?? next?.age;
  const mascotId = prev?.mascotId ?? next?.mascotId;
  const avatarUrl = prev?.avatarUrl ?? next?.avatarUrl;
  if (name !== undefined) merged.name = name;
  if (age !== undefined) merged.age = age;
  if (mascotId !== undefined) merged.mascotId = mascotId;
  if (avatarUrl !== undefined) merged.avatarUrl = avatarUrl;
  return Object.keys(merged).length > 0 ? merged : undefined;
}

/**
 * Server-side cleanup hook for sign-out. Clears any orphaned claimedSessionData
 * so that if the user signs back in later their stale anonymous-session points
 * snapshot doesn't seed a future kid by mistake. Safe no-op if absent.
 */
export async function clearOrphanedClaimSnapshot(uid: string): Promise<void> {
  const userRef = adminDb.collection(USERS_COLLECTION).doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) return;
  const data = snap.data() as UserDocFirestore;
  // Only clear if there's no kid yet — once a kid exists the snapshot is already
  // consumed (createKid deletes it). This guards against overwriting in-flight
  // claim writes from a parallel session.
  if (!data.claimedSessionData) return;
  if ((data.kidIds ?? []).length > 0) return;
  await userRef.update({
    claimedSessionData: FieldValue.delete(),
    updatedAt: Timestamp.now(),
  });
}
