import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './admin';
import { AppException } from '@/lib/api-utils';
import type { Creation, CreationType } from '@/types/creation.types';

const CREATIONS_COLLECTION = 'creations';
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

/** Input for saving a new creation */
export interface SaveCreationInput {
  type: CreationType;
  title: string;
  prompt: string;
  content: Record<string, unknown>;
  media?: Array<{ url: string; type: string; alt: string }>;
  thumbnail?: string;
  aiMetadata: Record<string, unknown>;
  aiConceptsTaught: string[];
  curriculumTags?: string[];
  isPublic?: boolean;
  sessionId: string;
}

/** Filters for listing creations */
export interface ListCreationsFilters {
  type?: CreationType;
  isPublic?: boolean;
  limit?: number;
  cursor?: string;
}

/** Paginated list result */
export interface ListCreationsResult {
  items: Creation[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Save a new creation to Firestore with auto-generated ID.
 * Returns the creation ID and share URL.
 */
export async function saveCreation(input: SaveCreationInput): Promise<{ id: string; shareUrl: string }> {
  const docRef = adminDb.collection(CREATIONS_COLLECTION).doc();
  const id = docRef.id;

  const now = Timestamp.now();
  const creationDoc = {
    id,
    type: input.type,
    title: input.title,
    status: 'published' as const,
    prompt: input.prompt,
    content: input.content,
    media: input.media ?? [],
    thumbnail: input.thumbnail ?? null,
    aiMetadata: input.aiMetadata,
    sessionId: input.sessionId,
    userId: null,
    kidId: null,
    shareUrl: `/view/${id}`,
    viewCount: 0,
    shareCount: 0,
    likeCount: 0,
    aiConceptsTaught: input.aiConceptsTaught,
    curriculumTags: input.curriculumTags ?? [],
    isPublic: input.isPublic ?? true,
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(creationDoc);

  return { id, shareUrl: `/view/${id}` };
}

/**
 * Fetch a single creation by ID.
 * Throws NOT_FOUND if creation doesn't exist.
 */
export async function getCreation(id: string): Promise<Creation> {
  const doc = await adminDb.collection(CREATIONS_COLLECTION).doc(id).get();

  if (!doc.exists) {
    throw new AppException('NOT_FOUND', 'Creation not found', 404);
  }

  return docToCreation(doc);
}

/**
 * List creations for a given session with optional filters and cursor pagination.
 *
 * Note: archived status is filtered in memory rather than via Firestore `!=` to avoid
 * requiring a composite index on (sessionId, status, createdAt). The existing indexes
 * on (sessionId, createdAt) and (sessionId, type, createdAt) are sufficient.
 */
export async function listCreations(
  sessionId: string,
  filters: ListCreationsFilters = {}
): Promise<ListCreationsResult> {
  const limit = Math.min(filters.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  // Fetch extra docs to account for any archived ones filtered in memory
  const fetchLimit = limit + 10;

  // Build base query — all WHERE clauses must come before orderBy
  let query = adminDb
    .collection(CREATIONS_COLLECTION)
    .where('sessionId', '==', sessionId);

  if (filters.type) {
    // Uses composite index: (sessionId, type, createdAt)
    query = query.where('type', '==', filters.type);
  }

  // Uses index: (sessionId, createdAt) or (sessionId, type, createdAt)
  query = query.orderBy('createdAt', 'desc').limit(fetchLimit);

  if (filters.cursor) {
    if (filters.cursor.includes('/')) {
      throw new AppException('INVALID_INPUT', 'Invalid cursor', 400);
    }
    const cursorDoc = await adminDb.collection(CREATIONS_COLLECTION).doc(filters.cursor).get();
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc);
    }
  }

  const snapshot = await query.get();

  // Filter archived docs in memory — avoids needing a composite index on (sessionId, status, createdAt)
  const activeDocs = snapshot.docs.filter((doc) => doc.data().status !== 'archived');

  const hasMore = activeDocs.length > limit;
  const items = activeDocs.slice(0, limit).map(docToCreation);
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]!.id : null;

  return { items, nextCursor, hasMore };
}

/**
 * Atomically increment the view count for a creation.
 */
export async function incrementView(id: string): Promise<void> {
  const docRef = adminDb.collection(CREATIONS_COLLECTION).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new AppException('NOT_FOUND', 'Creation not found', 404);
  }

  await docRef.update({
    viewCount: FieldValue.increment(1),
    updatedAt: Timestamp.now(),
  });
}

/**
 * Atomically increment the share count for a creation.
 */
export async function incrementShare(id: string): Promise<void> {
  const docRef = adminDb.collection(CREATIONS_COLLECTION).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new AppException('NOT_FOUND', 'Creation not found', 404);
  }

  await docRef.update({
    shareCount: FieldValue.increment(1),
    updatedAt: Timestamp.now(),
  });
}

/**
 * Soft-delete a creation by setting its status to 'archived'.
 * Verifies the requesting session owns the creation.
 */
export async function archiveCreation(id: string, sessionId: string): Promise<void> {
  const docRef = adminDb.collection(CREATIONS_COLLECTION).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new AppException('NOT_FOUND', 'Creation not found', 404);
  }

  const data = doc.data()!;
  if (data.sessionId !== sessionId) {
    throw new AppException('FORBIDDEN', 'You do not own this creation', 403);
  }

  await docRef.update({
    status: 'archived',
    updatedAt: Timestamp.now(),
  });
}

// ─── Internal helpers ────────────────────────────────────

function docToCreation(doc: FirebaseFirestore.DocumentSnapshot): Creation {
  const data = doc.data()!;
  return {
    id: doc.id,
    type: data.type,
    title: data.title,
    status: data.status,
    prompt: data.prompt,
    content: data.content,
    media: data.media ?? [],
    thumbnail: data.thumbnail ?? undefined,
    aiMetadata: data.aiMetadata,
    sessionId: data.sessionId,
    userId: data.userId ?? undefined,
    kidId: data.kidId ?? undefined,
    shareUrl: data.shareUrl ?? undefined,
    viewCount: data.viewCount ?? 0,
    shareCount: data.shareCount ?? 0,
    likeCount: data.likeCount ?? 0,
    aiConceptsTaught: data.aiConceptsTaught ?? [],
    curriculumTags: data.curriculumTags ?? [],
    isPublic: data.isPublic ?? true,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
  } as Creation;
}
