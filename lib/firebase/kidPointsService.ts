import { adminDb } from './admin';
import { AppException } from '@/lib/api-utils';
import { checkBadgeUnlocks } from '@/lib/badges';
import { applyAction } from './sessionService';
import type { SessionPointsData, PointsAction } from './sessionService';

const KIDS_COLLECTION = 'kids';
const SESSIONS_COLLECTION = 'sessions';

/**
 * Extract points data from a kid document.
 * Kid docs always have these fields (defaults set at creation),
 * but we still fall back for safety.
 */
function extractKidPointsData(data: Record<string, unknown>): SessionPointsData {
  return {
    aiPoints: (data.aiPoints as number) ?? 0,
    badges: (data.badges as string[]) ?? [],
    conceptsLearned: (data.conceptsLearned as string[]) ?? [],
    creationsByType: (data.creationsByType as Record<string, number>) ?? {},
    shareCount: (data.shareCount as number) ?? 0,
  };
}

/**
 * Read the current points/badge state for a kid profile.
 */
export async function getKidPoints(kidId: string): Promise<SessionPointsData> {
  const doc = await adminDb.collection(KIDS_COLLECTION).doc(kidId).get();
  if (!doc.exists) {
    throw new AppException('KID_NOT_FOUND', 'Kid profile not found', 404);
  }
  return extractKidPointsData(doc.data() as Record<string, unknown>);
}

/**
 * Atomically apply a points action to a kid profile and check for newly unlocked badges.
 * Returns the updated points data and any badges unlocked by this action.
 *
 * Mirrors `updateSessionPoints` but operates on the `kids` collection.
 */
export async function updateKidPoints(
  kidId: string,
  action: PointsAction
): Promise<{ data: SessionPointsData; newBadges: string[] }> {
  const docRef = adminDb.collection(KIDS_COLLECTION).doc(kidId);

  const result = await adminDb.runTransaction(async (tx) => {
    const doc = await tx.get(docRef);
    if (!doc.exists) {
      throw new AppException('KID_NOT_FOUND', 'Kid profile not found', 404);
    }

    const kidData = doc.data() as Record<string, unknown>;
    const current = extractKidPointsData(kidData);
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

/**
 * One-time migration: merge session points data into a kid profile.
 * Takes the MAX of points, UNION of badges/concepts, MAX of creationsByType.
 *
 * IMPORTANT: Only migrates if the kid's `claimedSessionId` matches the given
 * sessionId. This prevents session data from bleeding into kids that never
 * owned that session (e.g., a second child profile created fresh with 0 points).
 *
 * Called automatically on GET /api/sessions/points when both headers are present.
 */
export async function migrateSessionToKid(
  kidId: string,
  sessionId: string
): Promise<SessionPointsData> {
  const kidRef = adminDb.collection(KIDS_COLLECTION).doc(kidId);
  const sessionRef = adminDb.collection(SESSIONS_COLLECTION).doc(sessionId);

  const result = await adminDb.runTransaction(async (tx) => {
    const [kidDoc, sessionDoc] = await Promise.all([
      tx.get(kidRef),
      tx.get(sessionRef),
    ]);

    if (!kidDoc.exists) {
      throw new AppException('KID_NOT_FOUND', 'Kid profile not found', 404);
    }

    const kidRaw = kidDoc.data() as Record<string, unknown>;
    const kidData = extractKidPointsData(kidRaw);

    // Only migrate if this kid owns the session
    // Kids without a claimedSessionId (e.g., second child) should NOT inherit session data
    const claimedSession = kidRaw.claimedSessionId as string | undefined;
    if (!claimedSession) {
      // Fallback for existing kids created before claimedSessionId was set:
      // Only the first kid (the one with points > 0 from initial migration) qualifies
      // A kid with 0 points was never the session owner
      if (kidData.aiPoints === 0 && kidData.badges.length === 0) {
        return kidData;
      }
      // Kid has points from initial migration — this is likely the first kid, allow merge
    } else if (claimedSession !== sessionId) {
      return kidData;
    }

    // Session might not exist (e.g., expired) — return kid data as-is
    if (!sessionDoc.exists) {
      return kidData;
    }

    const sessionData: SessionPointsData = {
      aiPoints: (sessionDoc.data()?.aiPoints as number) ?? 0,
      badges: (sessionDoc.data()?.badges as string[]) ?? [],
      conceptsLearned: (sessionDoc.data()?.conceptsLearned as string[]) ?? [],
      creationsByType: (sessionDoc.data()?.creationsByType as Record<string, number>) ?? {},
      shareCount: (sessionDoc.data()?.shareCount as number) ?? 0,
    };

    // Skip if kid already has equal or more points (already migrated)
    if (kidData.aiPoints >= sessionData.aiPoints) {
      return kidData;
    }

    // Merge: take the best of both
    const merged: SessionPointsData = {
      aiPoints: Math.max(kidData.aiPoints, sessionData.aiPoints),
      badges: [...new Set([...kidData.badges, ...sessionData.badges])],
      conceptsLearned: [...new Set([...kidData.conceptsLearned, ...sessionData.conceptsLearned])],
      creationsByType: { ...kidData.creationsByType },
      shareCount: Math.max(kidData.shareCount, sessionData.shareCount),
    };

    // Merge creationsByType: take max per type
    for (const [type, count] of Object.entries(sessionData.creationsByType)) {
      merged.creationsByType[type] = Math.max(merged.creationsByType[type] ?? 0, count);
    }

    // Check for any badge unlocks from merged data
    const nowEligible = checkBadgeUnlocks(merged);
    const allBadges = new Set(merged.badges);
    for (const badge of nowEligible) {
      allBadges.add(badge);
    }
    merged.badges = [...allBadges];

    tx.update(kidRef, {
      aiPoints: merged.aiPoints,
      badges: merged.badges,
      conceptsLearned: merged.conceptsLearned,
      creationsByType: merged.creationsByType,
      shareCount: merged.shareCount,
    });

    return merged;
  });

  return result;
}
