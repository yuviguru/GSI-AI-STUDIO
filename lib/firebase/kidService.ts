import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './admin';
import { AppException } from '@/lib/api-utils';

const KIDS_COLLECTION = 'kids';
const USERS_COLLECTION = 'users';
const MAX_KIDS_PER_PARENT = 4;

// ─── Firestore document shape ──────────────────────────────────────────────

interface KidDocFirestore {
  id: string;
  googleEmail?: string;
  name: string;
  avatar?: string;
  verifiedBy: 'parent' | 'teacher' | null;
  verifiedAt?: Timestamp;
  verificationDeadline?: Timestamp;
  age?: number;
  grade?: string;
  board?: 'cbse' | 'icse' | 'state';
  parentId: string | null;
  schoolId: string | null;
  classIds: string[];
  aiPoints: number;
  badges: string[];
  conceptsLearned: string[];
  creationsByType: Record<string, number>;
  shareCount: number;
  totalCreations: number;
  streak: { current: number; longest: number; lastActiveDate: string };
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
  skillArenaProgress?: Record<string, { band: number; score: number; assessments: number }>;
  skillArenaStats?: { totalAssessments: number; averageBand: number };
  claimedSessionId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Input types ───────────────────────────────────────────────────────────

export interface CreateKidInput {
  name: string;
  avatar?: string;
  age?: number;
  grade?: string;
  board?: 'cbse' | 'icse' | 'state';
}

export interface UpdateKidInput {
  name?: string;
  avatar?: string;
  age?: number;
  grade?: string;
  board?: 'cbse' | 'icse' | 'state';
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Create a kid profile (parent-managed mode).
 * Auto-generates an ID. Adds kidId to parent's kidIds array.
 * Migrates claimedSessionData from parent if this is the first kid.
 */
export async function createKid(
  parentUid: string,
  input: CreateKidInput
): Promise<KidDocFirestore> {
  // Check parent exists and hasn't exceeded limit
  const parentRef = adminDb.collection(USERS_COLLECTION).doc(parentUid);
  const parentDoc = await parentRef.get();

  if (!parentDoc.exists) {
    throw new AppException('USER_NOT_FOUND', 'Parent account not found', 404);
  }

  const parentData = parentDoc.data()!;
  const existingKids: string[] = parentData.kidIds || [];

  if (existingKids.length >= MAX_KIDS_PER_PARENT) {
    throw new AppException(
      'MAX_KIDS_REACHED',
      `Maximum ${MAX_KIDS_PER_PARENT} kid profiles allowed per account`,
      400
    );
  }

  const now = Timestamp.now();
  const kidRef = adminDb.collection(KIDS_COLLECTION).doc(); // Auto-ID
  const kidId = kidRef.id;

  // Check if parent has claimed session data to migrate to first kid
  const claimedData = parentData.claimedSessionData;
  const isFirstKid = existingKids.length === 0 && claimedData;

  const kidDoc: KidDocFirestore = {
    id: kidId,
    name: input.name,
    avatar: input.avatar,
    verifiedBy: 'parent',
    verifiedAt: now,
    age: input.age,
    grade: input.grade,
    board: input.board,
    parentId: parentUid,
    schoolId: null,
    classIds: [],
    // If first kid, migrate parent's claimed session data
    aiPoints: isFirstKid ? (claimedData.aiPoints || 0) : 0,
    badges: isFirstKid ? (claimedData.badges || []) : [],
    conceptsLearned: isFirstKid ? (claimedData.conceptsLearned || []) : [],
    creationsByType: isFirstKid ? (claimedData.creationsByType || {}) : {},
    shareCount: isFirstKid ? (claimedData.shareCount || 0) : 0,
    totalCreations: 0,
    streak: { current: 0, longest: 0, lastActiveDate: '' },
    createdAt: now,
    updatedAt: now,
  };

  const batch = adminDb.batch();
  batch.set(kidRef, kidDoc);
  batch.update(parentRef, {
    kidIds: FieldValue.arrayUnion(kidId),
    updatedAt: now,
    // Clear claimed session data after migrating to first kid
    ...(isFirstKid ? { claimedSessionData: FieldValue.delete() } : {}),
  });

  await batch.commit();

  return kidDoc;
}

/**
 * Get a kid profile by ID.
 */
export async function getKid(kidId: string): Promise<KidDocFirestore | null> {
  const doc = await adminDb.collection(KIDS_COLLECTION).doc(kidId).get();
  if (!doc.exists) return null;
  return doc.data() as KidDocFirestore;
}

/**
 * List all kid profiles for a parent.
 */
export async function listKids(parentUid: string): Promise<KidDocFirestore[]> {
  const snapshot = await adminDb
    .collection(KIDS_COLLECTION)
    .where('parentId', '==', parentUid)
    .orderBy('createdAt', 'asc')
    .get();

  return snapshot.docs.map((doc) => doc.data() as KidDocFirestore);
}

/**
 * Update a kid profile. Only allows updating name, avatar, age, grade, board.
 * Verifies the parent owns the kid.
 */
export async function updateKid(
  parentUid: string,
  kidId: string,
  input: UpdateKidInput
): Promise<KidDocFirestore> {
  const kidRef = adminDb.collection(KIDS_COLLECTION).doc(kidId);
  const kidDoc = await kidRef.get();

  if (!kidDoc.exists) {
    throw new AppException('KID_NOT_FOUND', 'Kid profile not found', 404);
  }

  const kidData = kidDoc.data() as KidDocFirestore;

  // Verify parent owns this kid
  if (kidData.parentId !== parentUid) {
    throw new AppException('FORBIDDEN', 'You do not have permission to update this profile', 403);
  }

  const updates: Record<string, unknown> = { updatedAt: Timestamp.now() };
  if (input.name !== undefined) updates.name = input.name;
  if (input.avatar !== undefined) updates.avatar = input.avatar;
  if (input.age !== undefined) updates.age = input.age;
  if (input.grade !== undefined) updates.grade = input.grade;
  if (input.board !== undefined) updates.board = input.board;

  await kidRef.update(updates);

  return { ...kidData, ...updates } as KidDocFirestore;
}
