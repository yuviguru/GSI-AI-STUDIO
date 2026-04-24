/**
 * Phase 4 (ENGAGE-008): class-shared creation feed.
 *
 * Surfaces only submissions that the teacher has explicitly opted to
 * share (`sharedToClassFeed === true`) AND that are approved. Reactions
 * are limited to a positive-only emoji whitelist; no comments in v1.
 */

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './admin';
import { AppException } from '@/lib/api-utils';
import {
  ALLOWED_REACTIONS,
  isAllowedReaction,
  type ClassFeedItem,
  type ReactionEmoji,
} from './classFeedTypes';

export {
  ALLOWED_REACTIONS,
  isAllowedReaction,
  type ClassFeedItem,
  type ReactionEmoji,
};

const SUBMISSIONS = 'submissions';
const CREATIONS = 'creations';
const KIDS = 'kids';
const REACTIONS_SUBCOLLECTION = 'reactions';

export async function isKidInClass(
  schoolId: string,
  classId: string,
  kidId: string,
): Promise<boolean> {
  const snap = await adminDb
    .collection('schools')
    .doc(schoolId)
    .collection('classes')
    .doc(classId)
    .get();
  if (!snap.exists) return false;
  const data = snap.data() as { studentKidIds?: string[]; schoolId?: string };
  return Array.isArray(data.studentKidIds) && data.studentKidIds.includes(kidId);
}

async function loadReactionCounts(
  creationId: string,
  viewerKidId?: string,
): Promise<{ counts: Record<string, number>; myReaction?: ReactionEmoji }> {
  const snap = await adminDb
    .collection(CREATIONS)
    .doc(creationId)
    .collection(REACTIONS_SUBCOLLECTION)
    .get();
  const counts: Record<string, number> = {};
  let mine: ReactionEmoji | undefined;
  for (const doc of snap.docs) {
    const data = doc.data() as { emoji?: string; kidId?: string };
    if (!data.emoji) continue;
    counts[data.emoji] = (counts[data.emoji] ?? 0) + 1;
    if (viewerKidId && data.kidId === viewerKidId && isAllowedReaction(data.emoji)) {
      mine = data.emoji;
    }
  }
  return { counts, myReaction: mine };
}

export interface ListClassFeedInput {
  schoolId: string;
  classId: string;
  viewerKidId?: string;
  limit?: number;
  /** Cursor: most-recent approvedAt millis from the previous page. */
  cursor?: number;
}

export async function listClassFeed(
  input: ListClassFeedInput,
): Promise<{ items: ClassFeedItem[]; nextCursor: number | null }> {
  const limit = Math.min(20, Math.max(1, input.limit ?? 10));
  const snap = await adminDb
    .collection(SUBMISSIONS)
    .where('classId', '==', input.classId)
    .where('status', '==', 'approved')
    .where('sharedToClassFeed', '==', true)
    .get();

  const rows = snap.docs
    .map((d) => d.data() as Record<string, unknown>)
    .filter((d) => d.schoolId === input.schoolId)
    .map((d) => ({
      submissionId: d.id as string,
      creationId: d.creationId as string,
      classId: d.classId as string,
      schoolId: d.schoolId as string,
      kidId: d.kidId as string,
      reviewedAt:
        (d.reviewedAt as { toDate?: () => Date } | undefined)?.toDate?.() ??
        (d.updatedAt as { toDate?: () => Date } | undefined)?.toDate?.() ??
        new Date(0),
    }))
    .sort((a, b) => b.reviewedAt.getTime() - a.reviewedAt.getTime());

  const filtered = input.cursor
    ? rows.filter((r) => r.reviewedAt.getTime() < input.cursor!)
    : rows;
  const page = filtered.slice(0, limit);

  // Resolve kid + creation for each.
  const kidIds = Array.from(new Set(page.map((r) => r.kidId)));
  const creationIds = Array.from(new Set(page.map((r) => r.creationId)));

  const kidsMap = new Map<string, Record<string, unknown>>();
  for (let i = 0; i < kidIds.length; i += 30) {
    const chunk = kidIds.slice(i, i + 30);
    const s = await adminDb
      .collection(KIDS)
      .where('__name__', 'in', chunk)
      .get();
    for (const d of s.docs) kidsMap.set(d.id, d.data());
  }
  const creationsMap = new Map<string, Record<string, unknown>>();
  for (let i = 0; i < creationIds.length; i += 30) {
    const chunk = creationIds.slice(i, i + 30);
    const s = await adminDb
      .collection(CREATIONS)
      .where('__name__', 'in', chunk)
      .get();
    for (const d of s.docs) creationsMap.set(d.id, d.data());
  }

  const items: ClassFeedItem[] = [];
  for (const r of page) {
    const kid = kidsMap.get(r.kidId);
    const creation = creationsMap.get(r.creationId);
    if (!kid || !creation) continue;
    const { counts, myReaction } = await loadReactionCounts(
      r.creationId,
      input.viewerKidId,
    );
    const createdAtField = creation.createdAt as
      | { toDate?: () => Date }
      | undefined;
    items.push({
      submissionId: r.submissionId,
      creationId: r.creationId,
      classId: r.classId,
      schoolId: r.schoolId,
      kid: {
        id: r.kidId,
        name: ((kid.name as string) ?? 'Student').split(' ')[0]!,
        avatar: kid.avatar as string | undefined,
      },
      creation: {
        id: r.creationId,
        type: (creation.type as string) ?? 'story',
        title: (creation.title as string) ?? 'Untitled',
        thumbnail: creation.thumbnail as string | undefined,
        aiConceptsTaught: (creation.aiConceptsTaught as string[]) ?? [],
        createdAt: createdAtField?.toDate?.() ?? new Date(),
      },
      approvedAt: r.reviewedAt,
      reactionCounts: counts,
      myReaction,
    });
  }

  const nextCursor =
    filtered.length > limit ? page[page.length - 1]?.reviewedAt.getTime() ?? null : null;
  return { items, nextCursor };
}

export async function addReaction(input: {
  creationId: string;
  kidId: string;
  emoji: ReactionEmoji;
}): Promise<void> {
  if (!isAllowedReaction(input.emoji)) {
    throw new AppException('INVALID_INPUT', 'emoji is not in the allowed set.', 400);
  }
  const ref = adminDb
    .collection(CREATIONS)
    .doc(input.creationId)
    .collection(REACTIONS_SUBCOLLECTION)
    .doc(input.kidId);
  await ref.set(
    {
      kidId: input.kidId,
      emoji: input.emoji,
      reactedAt: Timestamp.now(),
    },
    { merge: true },
  );
}

export async function removeReaction(input: {
  creationId: string;
  kidId: string;
}): Promise<void> {
  const ref = adminDb
    .collection(CREATIONS)
    .doc(input.creationId)
    .collection(REACTIONS_SUBCOLLECTION)
    .doc(input.kidId);
  await ref.delete().catch(() => undefined);
}

/** Helper to clear stale reaction-doc shape on demand (no-op if empty). */
export const _internals = { FieldValue };
