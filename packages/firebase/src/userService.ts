import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './admin';
import { AppException } from '@/lib/api-utils';
import type { UserRole, UserPlan } from '@gsi/types';

const USERS_COLLECTION = 'users';
const CREATIONS_COLLECTION = 'creations';
const SESSIONS_COLLECTION = 'sessions';
const KIDS_COLLECTION = 'kids';

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

  // 2. Merge session data — either onto the first existing kid (returning user)
  //    or into claimedSessionData (new user, consumed later by createKid).
  const sessionRef = adminDb.collection(SESSIONS_COLLECTION).doc(sessionId);
  let pointsMigrated = 0;

  await adminDb.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) {
      throw new AppException('USER_NOT_FOUND', 'User profile vanished', 500);
    }
    const userData = userSnap.data() as UserDocFirestore;

    // Already claimed this session — no-op.
    if (userData.claimedSessionIds?.includes(sessionId)) {
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

    // ── Always stash in claimedSessionData ──
    // We never auto-merge onto an existing kid because we don't know WHICH
    // kid did the anonymous work. The parent must explicitly assign via the
    // "Who was creating?" UI (or createKid() consumes it for the first kid
    // when no kids exist yet).
    const previous = userData.claimedSessionData ?? {
      aiPoints: 0,
      badges: [],
      conceptsLearned: [],
      creationsByType: {},
      shareCount: 0,
    };

    const mergedOnboarding = mergeOnboarding(previous.onboarding, options.onboarding);

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
 * Assign pending claimedSessionData to a specific kid profile.
 *
 * Called from the "Who was creating?" UI when a returning user (who already has
 * kid profiles) claims an anonymous session. The parent picks which kid did
 * the anonymous work, and we merge the accumulated points/badges/concepts
 * onto that kid — then clear claimedSessionData.
 *
 * For avatar/mascot: only adopted if the target kid doesn't already have one
 * (preserves the kid's existing identity).
 */
export async function assignClaimedDataToKid(
  uid: string,
  kidId: string,
): Promise<{ pointsAssigned: number }> {
  const userRef = adminDb.collection(USERS_COLLECTION).doc(uid);
  const kidRef = adminDb.collection(KIDS_COLLECTION).doc(kidId);

  let pointsAssigned = 0;

  await adminDb.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) {
      throw new AppException('USER_NOT_FOUND', 'User profile not found', 404);
    }
    const userData = userSnap.data() as UserDocFirestore;

    if (!userData.claimedSessionData) {
      // Nothing to assign — already consumed or never existed.
      return;
    }

    // Verify the kid belongs to this parent.
    if (!userData.kidIds?.includes(kidId)) {
      throw new AppException('KID_NOT_FOUND', 'Kid profile not found under this account', 404);
    }

    const kidSnap = await tx.get(kidRef);
    if (!kidSnap.exists) {
      throw new AppException('KID_NOT_FOUND', 'Kid profile document missing', 404);
    }

    const kidData = kidSnap.data()!;
    const claimed = userData.claimedSessionData;
    pointsAssigned = claimed.aiPoints ?? 0;

    // Merge points, badges, concepts, creations onto kid (additive).
    const kidUpdate: Record<string, unknown> = {
      aiPoints: (kidData.aiPoints ?? 0) + (claimed.aiPoints ?? 0),
      badges: dedupe([...(kidData.badges ?? []), ...(claimed.badges ?? [])]),
      conceptsLearned: dedupe([
        ...(kidData.conceptsLearned ?? []),
        ...(claimed.conceptsLearned ?? []),
      ]),
      creationsByType: addCounts(
        kidData.creationsByType ?? {},
        claimed.creationsByType ?? {},
      ),
      shareCount: (kidData.shareCount ?? 0) + (claimed.shareCount ?? 0),
      updatedAt: Timestamp.now(),
    };

    // Adopt avatar/mascot only if the kid doesn't already have one.
    const onboarding = claimed.onboarding;
    if (onboarding?.avatarUrl && !kidData.avatarUrl) {
      kidUpdate.avatarUrl = onboarding.avatarUrl;
    }
    if (onboarding?.mascotId && !kidData.mascotId) {
      kidUpdate.mascotId = onboarding.mascotId;
    }

    tx.update(kidRef, kidUpdate);

    // Clear claimedSessionData — it's been consumed.
    tx.update(userRef, {
      claimedSessionData: FieldValue.delete(),
      updatedAt: Timestamp.now(),
    });
  });

  return { pointsAssigned };
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
  if (!data.claimedSessionData) return;
  await userRef.update({
    claimedSessionData: FieldValue.delete(),
    updatedAt: Timestamp.now(),
  });
}
