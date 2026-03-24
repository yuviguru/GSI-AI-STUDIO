import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './admin';
import { AppException } from '@/lib/api-utils';
import type { UserDoc, UserRole, User } from '@/types/user.types';

const USERS_COLLECTION = 'users';
const CREATIONS_COLLECTION = 'creations';

/**
 * Create a new user document after Firebase Auth verification.
 * Idempotent — returns existing user if doc already exists.
 */
export async function createUser(
  uid: string,
  phone: string,
  name: string,
  role: UserRole = 'parent',
  email?: string
): Promise<User> {
  const docRef = adminDb.collection(USERS_COLLECTION).doc(uid);
  const existing = await docRef.get();

  if (existing.exists) {
    return docToUser(existing.data() as UserDoc);
  }

  const now = Timestamp.now();
  const userDoc: UserDoc = {
    id: uid,
    phone,
    name,
    role,
    plan: 'free',
    kidIds: [],
    createdAt: now,
    updatedAt: now,
  };
  if (email) userDoc.email = email;

  await docRef.set(userDoc);
  return docToUser(userDoc);
}

/**
 * Get a user document by UID. Returns null if not found.
 */
export async function getUser(uid: string): Promise<User | null> {
  const doc = await adminDb.collection(USERS_COLLECTION).doc(uid).get();
  if (!doc.exists) return null;
  return docToUser(doc.data() as UserDoc);
}

/**
 * Claim an anonymous session — migrate creations, points, and badges to the authenticated user.
 * Idempotent: skips creations already claimed (those with a userId set).
 */
export async function claimSession(
  uid: string,
  sessionId: string
): Promise<{ claimedCount: number; pointsMigrated: number; badgesMigrated: string[] }> {
  // Find all creations belonging to this session that haven't been claimed yet
  const creationsSnap = await adminDb
    .collection(CREATIONS_COLLECTION)
    .where('sessionId', '==', sessionId)
    .get();

  let claimedCount = 0;
  const batch = adminDb.batch();

  for (const doc of creationsSnap.docs) {
    const data = doc.data();
    // Skip already-claimed creations
    if (data.userId) continue;

    batch.update(doc.ref, { userId: uid, updatedAt: Timestamp.now() });
    claimedCount++;
  }

  if (claimedCount > 0) {
    await batch.commit();
  }

  // Migrate session points and badges to user profile
  const sessionDoc = await adminDb.collection('sessions').doc(sessionId).get();
  let pointsMigrated = 0;
  let badgesMigrated: string[] = [];

  if (sessionDoc.exists) {
    const sessionData = sessionDoc.data()!;
    pointsMigrated = sessionData.aiPoints ?? 0;
    badgesMigrated = sessionData.badges ?? [];

    // Update user doc with migrated points/badges if there's anything to migrate
    if (pointsMigrated > 0 || badgesMigrated.length > 0) {
      const userRef = adminDb.collection(USERS_COLLECTION).doc(uid);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const userData = userDoc.data()!;
        const existingBadges: string[] = userData.badges ?? [];
        const newBadges = badgesMigrated.filter((b) => !existingBadges.includes(b));

        await userRef.update({
          aiPoints: (userData.aiPoints ?? 0) + pointsMigrated,
          badges: [...existingBadges, ...newBadges],
          updatedAt: Timestamp.now(),
        });
        badgesMigrated = newBadges;
      }
    }
  }

  return { claimedCount, pointsMigrated, badgesMigrated };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function docToUser(doc: UserDoc): User {
  return {
    id: doc.id,
    phone: doc.phone,
    name: doc.name,
    email: doc.email,
    role: doc.role,
    plan: doc.plan,
    kidIds: doc.kidIds,
    preferences: doc.preferences,
    createdAt: doc.createdAt.toDate(),
    updatedAt: doc.updatedAt.toDate(),
  };
}
