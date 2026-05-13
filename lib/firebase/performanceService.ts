/**
 * Performance service (PERF-001).
 *
 * Kid-recorded responses to creations — sing-alongs, book readings,
 * voice memos, reactions. Lives parallel to creations: same UX
 * affordances (cards, share, like, public/private), but a separate
 * data shape because the artifact is a kid voice (UGC) not AI output.
 *
 * Server-write only via Admin SDK — clients hit the /api/performances
 * routes, never write Firestore directly.
 *
 * See docs/data-model.md#performances and docs/api-contracts.md.
 */

import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './admin';
import { AppException } from '@/lib/api-utils';
import { getAsset, attachAssetToParent } from '@/lib/storage/assetService';
import { getCreation } from './creationService';
import { ALLOWED_REACTIONS, isAllowedReaction } from './classFeedTypes';
import type {
  Performance,
  PerformanceFeedItem,
  PerformanceKind,
  PerformanceStatus,
  PerformanceVisibility,
} from '@/types/performance.types';
import type { CreationType } from '@/types/creation.types';

const PERFORMANCES_COLLECTION = 'performances';
const REACTIONS_SUBCOLLECTION = 'reactions';
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const PRE_MOD_THRESHOLD = 3; // First 3 public publishes per session require review

// ─────────────────────────────────────────────────────────────────────
// Inputs
// ─────────────────────────────────────────────────────────────────────

export interface CreatePerformanceInput {
  kind: PerformanceKind;
  parentCreationId?: string;
  audioAssetId: string;
  videoAssetId?: string;
  durationSec: number;
  caption?: string;
  visibility?: PerformanceVisibility;
  ownerSessionId: string;
  ownerKidId?: string;
  ownerKidName?: string;
  ownerKidAvatar?: string;
}

export interface ListPerformancesFilters {
  ownerSessionId?: string;
  parentCreationId?: string;
  parentCreationType?: CreationType;
  kind?: PerformanceKind;
  visibility?: PerformanceVisibility;
  status?: PerformanceStatus;
  sort?: 'newest' | 'trending';
  limit?: number;
  cursor?: string;
}

export interface ListPerformancesResult {
  items: PerformanceFeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ─────────────────────────────────────────────────────────────────────
// Mapping
// ─────────────────────────────────────────────────────────────────────

function docToPerformance(doc: FirebaseFirestore.DocumentSnapshot): Performance {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    kind: data.kind,
    parentCreationId: data.parentCreationId ?? undefined,
    parentCreationType: data.parentCreationType ?? undefined,
    audioAssetId: data.audioAssetId,
    videoAssetId: data.videoAssetId ?? undefined,
    ownerSessionId: data.ownerSessionId,
    ownerKidId: data.ownerKidId ?? undefined,
    ownerKidName: data.ownerKidName ?? undefined,
    ownerKidAvatar: data.ownerKidAvatar ?? undefined,
    durationSec: data.durationSec,
    caption: data.caption ?? undefined,
    visibility: data.visibility,
    status: data.status,
    moderation: {
      state: data.moderation?.state ?? 'pending',
      reason: data.moderation?.reason ?? undefined,
      reviewedBy: data.moderation?.reviewedBy ?? undefined,
      reviewedAt: data.moderation?.reviewedAt?.toDate
        ? data.moderation.reviewedAt.toDate()
        : undefined,
    },
    viewCount: data.viewCount ?? 0,
    likeCount: data.likeCount ?? 0,
    reactionCounts: data.reactionCounts ?? {},
    shareUrl: data.shareUrl ?? `/perform/${doc.id}`,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
  };
}

async function performanceToFeedItem(
  perf: Performance,
  viewerSessionId?: string,
): Promise<PerformanceFeedItem> {
  // Fetch the audio (and video) asset URLs in parallel.
  const [audioAsset, videoAsset, parentCreation, myReaction] = await Promise.all([
    getAsset(perf.audioAssetId).catch(() => null),
    perf.videoAssetId ? getAsset(perf.videoAssetId).catch(() => null) : Promise.resolve(null),
    perf.parentCreationId ? getCreation(perf.parentCreationId).catch(() => null) : Promise.resolve(null),
    viewerSessionId ? getMyReaction(perf.id, viewerSessionId) : Promise.resolve(undefined),
  ]);

  return {
    id: perf.id,
    kind: perf.kind,
    parentCreation: parentCreation
      ? {
          id: parentCreation.id,
          type: parentCreation.type,
          title: parentCreation.title,
          thumbnail: parentCreation.thumbnail,
        }
      : undefined,
    audioUrl: audioAsset?.publicUrl ?? '',
    videoUrl: videoAsset?.publicUrl ?? undefined,
    durationSec: perf.durationSec,
    kid: {
      name: perf.ownerKidName ?? 'A kid',
      avatar: perf.ownerKidAvatar,
    },
    caption: perf.caption,
    visibility: perf.visibility,
    status: perf.status,
    viewCount: perf.viewCount,
    likeCount: perf.likeCount,
    reactionCounts: perf.reactionCounts,
    myReaction,
    shareUrl: perf.shareUrl,
    createdAt: perf.createdAt,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Public-published count (for pre-moderation gate)
// ─────────────────────────────────────────────────────────────────────

async function countPublicPublished(ownerSessionId: string): Promise<number> {
  const snap = await adminDb
    .collection(PERFORMANCES_COLLECTION)
    .where('ownerSessionId', '==', ownerSessionId)
    .where('visibility', '==', 'public')
    .where('status', '==', 'published')
    .count()
    .get();
  return snap.data().count;
}

// ─────────────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────────────

/**
 * Create a performance. Caller (API route) must validate session and
 * caption profanity before invoking.
 */
export async function createPerformance(
  input: CreatePerformanceInput,
): Promise<Performance> {
  // Validate audio asset
  const audioAsset = await getAsset(input.audioAssetId);
  if (audioAsset.ownerSessionId !== input.ownerSessionId) {
    throw new AppException('FORBIDDEN', 'Audio asset is not yours', 403);
  }
  if (audioAsset.kind !== 'audio') {
    throw new AppException(
      'INVALID_INPUT',
      'audioAssetId must reference an audio asset',
      400,
    );
  }
  if (audioAsset.status !== 'ready') {
    throw new AppException(
      'ASSET_INVALID_STATE',
      `Audio asset must be ready (got ${audioAsset.status})`,
      409,
    );
  }
  // Asset is "linked" only when parentRefId is set. The upload contract
  // pre-declares parentRefType='performance' before the performance exists,
  // so we accept that case (parentRefId === null/undefined). Reject only
  // when the asset already references a concrete parent doc.
  if (audioAsset.parentRefId) {
    throw new AppException(
      'ASSET_ALREADY_LINKED',
      'Audio asset is already attached to another parent',
      409,
    );
  }

  // Validate video asset (if provided)
  if (input.videoAssetId) {
    const videoAsset = await getAsset(input.videoAssetId);
    if (videoAsset.ownerSessionId !== input.ownerSessionId) {
      throw new AppException('FORBIDDEN', 'Video asset is not yours', 403);
    }
    if (videoAsset.kind !== 'video') {
      throw new AppException(
        'INVALID_INPUT',
        'videoAssetId must reference a video asset',
        400,
      );
    }
    // Same linkage rule as audio — only reject when already attached to
    // a concrete parent doc.
    if (videoAsset.parentRefId) {
      throw new AppException(
        'ASSET_ALREADY_LINKED',
        'Video asset is already attached to another parent',
        409,
      );
    }
  }

  // Validate parent creation (if provided)
  let parentCreationType: CreationType | undefined;
  if (input.parentCreationId) {
    const parent = await getCreation(input.parentCreationId);
    parentCreationType = parent.type;
  } else if (input.kind === 'sing_along' || input.kind === 'reading') {
    throw new AppException(
      'INVALID_INPUT',
      `${input.kind} performances require parentCreationId`,
      400,
    );
  }

  const requestedVisibility = input.visibility ?? 'private';
  const docRef = adminDb.collection(PERFORMANCES_COLLECTION).doc();
  const id = docRef.id;
  const now = Timestamp.now();

  // Pre-moderation gate: first N public publishes per session route to draft.
  let initialStatus: PerformanceStatus = 'published';
  if (requestedVisibility === 'public') {
    const priorCount = await countPublicPublished(input.ownerSessionId);
    if (priorCount < PRE_MOD_THRESHOLD) {
      initialStatus = 'draft';
    }
  }

  const reactionCounts: Record<string, number> = {};
  for (const e of ALLOWED_REACTIONS) reactionCounts[e] = 0;

  const performanceDoc = {
    id,
    kind: input.kind,
    parentCreationId: input.parentCreationId ?? null,
    parentCreationType: parentCreationType ?? null,
    audioAssetId: input.audioAssetId,
    videoAssetId: input.videoAssetId ?? null,
    ownerSessionId: input.ownerSessionId,
    ownerKidId: input.ownerKidId ?? null,
    ownerKidName: input.ownerKidName ?? null,
    ownerKidAvatar: input.ownerKidAvatar ?? null,
    durationSec: input.durationSec,
    caption: input.caption ?? null,
    visibility: requestedVisibility,
    status: initialStatus,
    moderation: {
      state: initialStatus === 'draft' ? 'pending' : 'auto_approved',
    },
    viewCount: 0,
    likeCount: 0,
    reactionCounts,
    shareUrl: `/perform/${id}`,
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(performanceDoc);

  // Link audio/video assets to this performance so they can't be re-attached.
  await attachAssetToParent(input.audioAssetId, 'performance', id);
  if (input.videoAssetId) {
    await attachAssetToParent(input.videoAssetId, 'performance', id);
  }

  return docToPerformance(await docRef.get());
}

// ─────────────────────────────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────────────────────────────

export async function getPerformance(id: string): Promise<Performance> {
  const snap = await adminDb.collection(PERFORMANCES_COLLECTION).doc(id).get();
  if (!snap.exists) {
    throw new AppException('NOT_FOUND', 'Performance not found', 404);
  }
  return docToPerformance(snap);
}

export async function getPerformanceFeedItem(
  id: string,
  viewerSessionId?: string,
): Promise<PerformanceFeedItem> {
  const perf = await getPerformance(id);
  return performanceToFeedItem(perf, viewerSessionId);
}

/**
 * List performances with filters. The most common queries:
 *   - "my performances": ownerSessionId = X
 *   - "performances of this song": parentCreationId = X
 *   - "explore": visibility=public + status=published
 *   - "trending in music": parentCreationType=music + visibility=public + sort=trending
 */
export async function listPerformances(
  filters: ListPerformancesFilters = {},
  viewerSessionId?: string,
): Promise<ListPerformancesResult> {
  const limit = Math.min(filters.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  let q: FirebaseFirestore.Query = adminDb.collection(PERFORMANCES_COLLECTION);

  if (filters.ownerSessionId) {
    q = q.where('ownerSessionId', '==', filters.ownerSessionId);
  }
  if (filters.parentCreationId) {
    q = q.where('parentCreationId', '==', filters.parentCreationId);
  }
  if (filters.parentCreationType) {
    q = q.where('parentCreationType', '==', filters.parentCreationType);
  }
  if (filters.kind) {
    q = q.where('kind', '==', filters.kind);
  }
  if (filters.visibility) {
    q = q.where('visibility', '==', filters.visibility);
  }
  if (filters.status) {
    q = q.where('status', '==', filters.status);
  }

  // Default sort: newest first. 'trending' uses likeCount as proxy.
  const sortField = filters.sort === 'trending' ? 'likeCount' : 'createdAt';
  q = q.orderBy(sortField, 'desc');
  if (sortField !== 'createdAt') {
    q = q.orderBy('createdAt', 'desc'); // tiebreaker
  }

  if (filters.cursor) {
    if (filters.cursor.includes('/')) {
      throw new AppException('INVALID_INPUT', 'Invalid cursor', 400);
    }
    const cursorSnap = await adminDb
      .collection(PERFORMANCES_COLLECTION)
      .doc(filters.cursor)
      .get();
    if (cursorSnap.exists) {
      q = q.startAfter(cursorSnap);
    }
  }

  const snap = await q.limit(limit + 1).get();
  const docs = snap.docs.slice(0, limit);
  const hasMore = snap.docs.length > limit;
  const nextCursor = hasMore && docs.length > 0 ? docs[docs.length - 1]!.id : null;

  // Filter out archived in memory (avoids a composite index for an
  // exclusion case).
  const items = await Promise.all(
    docs
      .map((d) => docToPerformance(d))
      .filter((p) => p.status !== 'archived')
      .map((p) => performanceToFeedItem(p, viewerSessionId)),
  );

  return { items, nextCursor, hasMore };
}

// ─────────────────────────────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────────────────────────────

export interface UpdatePerformanceInput {
  visibility?: PerformanceVisibility;
  caption?: string;
}

export async function updatePerformance(
  id: string,
  ownerSessionId: string,
  input: UpdatePerformanceInput,
): Promise<Performance> {
  const docRef = adminDb.collection(PERFORMANCES_COLLECTION).doc(id);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw new AppException('NOT_FOUND', 'Performance not found', 404);
  }
  const data = snap.data() ?? {};
  if (data.ownerSessionId !== ownerSessionId) {
    throw new AppException('FORBIDDEN', 'Not your performance', 403);
  }

  const updates: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  if (input.caption !== undefined) {
    updates.caption = input.caption;
  }

  if (input.visibility !== undefined && input.visibility !== data.visibility) {
    updates.visibility = input.visibility;

    // Switching to public triggers the pre-mod gate (same as create).
    if (input.visibility === 'public' && data.status === 'published') {
      const priorCount = await countPublicPublished(ownerSessionId);
      if (priorCount < PRE_MOD_THRESHOLD) {
        updates.status = 'draft';
        updates.moderation = { state: 'pending' };
      }
    }
  }

  await docRef.update(updates);
  return docToPerformance(await docRef.get());
}

// ─────────────────────────────────────────────────────────────────────
// Delete (soft)
// ─────────────────────────────────────────────────────────────────────

export async function deletePerformance(
  id: string,
  ownerSessionId: string,
): Promise<void> {
  const docRef = adminDb.collection(PERFORMANCES_COLLECTION).doc(id);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw new AppException('NOT_FOUND', 'Performance not found', 404);
  }
  const data = snap.data() ?? {};
  if (data.ownerSessionId !== ownerSessionId) {
    throw new AppException('FORBIDDEN', 'Not your performance', 403);
  }
  await docRef.update({
    status: 'archived',
    updatedAt: Timestamp.now(),
  });
}

// ─────────────────────────────────────────────────────────────────────
// Reactions
// ─────────────────────────────────────────────────────────────────────

async function getMyReaction(
  performanceId: string,
  reactorSessionId: string,
): Promise<string | undefined> {
  const snap = await adminDb
    .collection(PERFORMANCES_COLLECTION)
    .doc(performanceId)
    .collection(REACTIONS_SUBCOLLECTION)
    .doc(reactorSessionId)
    .get();
  if (!snap.exists) return undefined;
  const data = snap.data() ?? {};
  return data.emoji;
}

/** Toggle a reaction on a performance. Sending the same emoji twice removes it. */
export async function reactToPerformance(
  performanceId: string,
  reactorSessionId: string,
  emoji: string,
): Promise<{ reactionCounts: Record<string, number>; myReaction?: string }> {
  if (!isAllowedReaction(emoji)) {
    throw new AppException('INVALID_INPUT', `Reaction '${emoji}' not allowed`, 400);
  }

  const perfRef = adminDb.collection(PERFORMANCES_COLLECTION).doc(performanceId);
  const reactionRef = perfRef
    .collection(REACTIONS_SUBCOLLECTION)
    .doc(reactorSessionId);

  return adminDb.runTransaction(async (tx) => {
    const [perfSnap, reactionSnap] = await Promise.all([
      tx.get(perfRef),
      tx.get(reactionRef),
    ]);
    if (!perfSnap.exists) {
      throw new AppException('NOT_FOUND', 'Performance not found', 404);
    }

    const counts: Record<string, number> = perfSnap.data()?.reactionCounts ?? {};
    const prior = reactionSnap.exists
      ? (reactionSnap.data()?.emoji as string | undefined)
      : undefined;

    let myReaction: string | undefined;
    if (prior === emoji) {
      // toggle off
      tx.delete(reactionRef);
      counts[emoji] = Math.max(0, (counts[emoji] ?? 0) - 1);
      myReaction = undefined;
    } else {
      // switch or set
      if (prior) counts[prior] = Math.max(0, (counts[prior] ?? 0) - 1);
      counts[emoji] = (counts[emoji] ?? 0) + 1;
      tx.set(reactionRef, { emoji, createdAt: Timestamp.now() });
      myReaction = emoji;
    }

    const totalLikes = Object.values(counts).reduce((s, n) => s + n, 0);
    tx.update(perfRef, {
      reactionCounts: counts,
      likeCount: totalLikes,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { reactionCounts: counts, myReaction };
  });
}
