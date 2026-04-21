import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './admin';
import { AppException } from '@/lib/api-utils';
import { incrementSubmissionCount, getAssignment } from './schoolService';
import type { SubmissionDoc, SubmissionStatus } from '@/types/user.types';

const SUBMISSIONS_COLLECTION = 'submissions';
const CREATIONS_COLLECTION = 'creations';
const KIDS_COLLECTION = 'kids';

interface SubmissionDocFirestore {
  id: string;
  assignmentId: string;
  classId: string;
  schoolId: string;
  kidId: string;
  creationId: string;
  status: SubmissionStatus;
  feedback?: string;
  starred?: boolean;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  submittedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

function toSubmissionDoc(raw: SubmissionDocFirestore): SubmissionDoc {
  return {
    ...raw,
    reviewedAt: raw.reviewedAt ? raw.reviewedAt.toDate() : undefined,
    submittedAt: raw.submittedAt.toDate(),
    createdAt: raw.createdAt.toDate(),
    updatedAt: raw.updatedAt.toDate(),
  };
}

/**
 * Submit (or re-submit) a creation to an assignment. Idempotent per
 * (assignmentId, kidId) — re-submission updates the existing doc and
 * resets status to pending. Also stamps the creation doc with assignmentId /
 * classId / schoolId so analytics queries can filter cheaply.
 */
export async function submitCreation(input: {
  assignmentId: string;
  kidId: string;
  creationId: string;
}): Promise<SubmissionDoc> {
  const assignment = await getAssignment(input.assignmentId);
  if (!assignment) {
    throw new AppException('NOT_FOUND', 'Assignment not found.', 404);
  }

  const kidDoc = await adminDb.collection(KIDS_COLLECTION).doc(input.kidId).get();
  if (!kidDoc.exists) {
    throw new AppException('KID_NOT_FOUND', 'Kid profile not found.', 404);
  }
  const kidClassIds: string[] = kidDoc.data()?.classIds ?? [];
  if (!kidClassIds.includes(assignment.classId)) {
    throw new AppException(
      'NOT_IN_CLASS',
      'This kid is not in the assignment\'s class.',
      403,
    );
  }

  const creationRef = adminDb.collection(CREATIONS_COLLECTION).doc(input.creationId);
  const creationDoc = await creationRef.get();
  if (!creationDoc.exists) {
    throw new AppException('NOT_FOUND', 'Creation not found.', 404);
  }
  const creationData = creationDoc.data()!;
  if (creationData.type !== assignment.creationType) {
    throw new AppException(
      'INVALID_CREATION_TYPE',
      `This assignment needs a ${assignment.creationType}; you submitted a ${creationData.type}.`,
      400,
    );
  }
  if (creationData.kidId && creationData.kidId !== input.kidId) {
    throw new AppException(
      'FORBIDDEN',
      'That creation belongs to another kid.',
      403,
    );
  }

  const now = Timestamp.now();

  // Upsert submission (one per (assignmentId, kidId))
  const existingSnap = await adminDb
    .collection(SUBMISSIONS_COLLECTION)
    .where('assignmentId', '==', input.assignmentId)
    .where('kidId', '==', input.kidId)
    .limit(1)
    .get();

  let submission: SubmissionDocFirestore;
  let isNew = false;

  if (!existingSnap.empty) {
    const ref = existingSnap.docs[0]!.ref;
    submission = {
      ...(existingSnap.docs[0]!.data() as SubmissionDocFirestore),
      creationId: input.creationId,
      status: 'pending',
      feedback: undefined,
      starred: false,
      reviewedBy: undefined,
      reviewedAt: undefined,
      submittedAt: now,
      updatedAt: now,
    };
    await ref.set(submission);
  } else {
    const ref = adminDb.collection(SUBMISSIONS_COLLECTION).doc();
    submission = {
      id: ref.id,
      assignmentId: input.assignmentId,
      classId: assignment.classId,
      schoolId: assignment.schoolId,
      kidId: input.kidId,
      creationId: input.creationId,
      status: 'pending',
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(submission);
    isNew = true;
  }

  // Stamp the creation
  await creationRef.update({
    assignmentId: input.assignmentId,
    classId: assignment.classId,
    schoolId: assignment.schoolId,
    updatedAt: now,
  });

  if (isNew) {
    await incrementSubmissionCount(input.assignmentId, 1);
  }

  return toSubmissionDoc(submission);
}

export async function getSubmission(submissionId: string): Promise<SubmissionDoc | null> {
  const doc = await adminDb.collection(SUBMISSIONS_COLLECTION).doc(submissionId).get();
  if (!doc.exists) return null;
  return toSubmissionDoc(doc.data() as SubmissionDocFirestore);
}

export async function listSubmissionsForAssignment(
  assignmentId: string,
): Promise<SubmissionDoc[]> {
  const snap = await adminDb
    .collection(SUBMISSIONS_COLLECTION)
    .where('assignmentId', '==', assignmentId)
    .orderBy('submittedAt', 'desc')
    .get();
  return snap.docs.map((d) => toSubmissionDoc(d.data() as SubmissionDocFirestore));
}

/**
 * Expand submissions with kid + creation summaries, in one batch.
 */
export interface SubmissionWithContext extends SubmissionDoc {
  kid: {
    id: string;
    name: string;
    avatar?: string;
    grade?: string;
  };
  creation: {
    id: string;
    type: string;
    title: string;
    thumbnail?: string;
    content: Record<string, unknown>;
    aiConceptsTaught: string[];
    media?: Array<{ url: string; type: string; alt: string }>;
    createdAt: Date;
  } | null;
}

export async function listSubmissionsWithContext(
  assignmentId: string,
): Promise<SubmissionWithContext[]> {
  const submissions = await listSubmissionsForAssignment(assignmentId);
  if (submissions.length === 0) return [];

  const kidIds = Array.from(new Set(submissions.map((s) => s.kidId)));
  const creationIds = Array.from(new Set(submissions.map((s) => s.creationId)));

  const kidDocs = await batchedIn(KIDS_COLLECTION, kidIds);
  const creationDocs = await batchedIn(CREATIONS_COLLECTION, creationIds);

  const kidMap = new Map(kidDocs.map((d) => [d.id, d.data]));
  const creationMap = new Map(creationDocs.map((d) => [d.id, d.data]));

  return submissions.map((s) => {
    const kid = kidMap.get(s.kidId) as Record<string, unknown> | undefined;
    const creation = creationMap.get(s.creationId) as Record<string, unknown> | undefined;
    const createdAtField = creation?.createdAt as
      | { toDate?: () => Date }
      | undefined;
    return {
      ...s,
      kid: {
        id: s.kidId,
        name: (kid?.name as string | undefined) ?? 'Student',
        avatar: kid?.avatar as string | undefined,
        grade: kid?.grade as string | undefined,
      },
      creation: creation
        ? {
            id: s.creationId,
            type: (creation.type as string) ?? 'story',
            title: (creation.title as string) ?? 'Untitled',
            thumbnail: creation.thumbnail as string | undefined,
            content: (creation.content as Record<string, unknown>) ?? {},
            aiConceptsTaught: (creation.aiConceptsTaught as string[]) ?? [],
            media: creation.media as
              | Array<{ url: string; type: string; alt: string }>
              | undefined,
            createdAt: createdAtField?.toDate?.() ?? new Date(),
          }
        : null,
    };
  });
}

async function batchedIn(
  collection: string,
  ids: string[],
): Promise<{ id: string; data: Record<string, unknown> }[]> {
  if (ids.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 30) {
    chunks.push(ids.slice(i, i + 30));
  }
  const results: { id: string; data: Record<string, unknown> }[] = [];
  for (const chunk of chunks) {
    const snap = await adminDb
      .collection(collection)
      .where('__name__', 'in', chunk)
      .get();
    for (const doc of snap.docs) {
      results.push({ id: doc.id, data: doc.data() });
    }
  }
  return results;
}

export interface ReviewSubmissionInput {
  status?: SubmissionStatus;
  feedback?: string | null;
  starred?: boolean;
}

export async function reviewSubmission(
  submissionId: string,
  teacherUid: string,
  schoolId: string,
  input: ReviewSubmissionInput,
): Promise<SubmissionDoc> {
  const ref = adminDb.collection(SUBMISSIONS_COLLECTION).doc(submissionId);
  const doc = await ref.get();
  if (!doc.exists) {
    throw new AppException('NOT_FOUND', 'Submission not found.', 404);
  }
  const data = doc.data() as SubmissionDocFirestore;
  if (data.schoolId !== schoolId) {
    throw new AppException('FORBIDDEN', 'Submission is not in your school.', 403);
  }

  const now = Timestamp.now();
  const updates: Record<string, unknown> = {
    updatedAt: now,
    reviewedBy: teacherUid,
    reviewedAt: now,
  };
  if (input.status !== undefined) updates.status = input.status;
  if (input.feedback !== undefined) {
    updates.feedback = input.feedback === null ? FieldValue.delete() : input.feedback;
  }
  if (input.starred !== undefined) updates.starred = input.starred;

  await ref.update(updates);
  const updated = await ref.get();
  return toSubmissionDoc(updated.data() as SubmissionDocFirestore);
}

export async function bulkApprovePending(
  assignmentId: string,
  teacherUid: string,
  schoolId: string,
): Promise<number> {
  const snap = await adminDb
    .collection(SUBMISSIONS_COLLECTION)
    .where('assignmentId', '==', assignmentId)
    .where('status', '==', 'pending')
    .get();
  if (snap.empty) return 0;

  const now = Timestamp.now();
  const batch = adminDb.batch();
  let count = 0;
  for (const d of snap.docs) {
    const data = d.data() as SubmissionDocFirestore;
    if (data.schoolId !== schoolId) continue;
    batch.update(d.ref, {
      status: 'approved',
      reviewedBy: teacherUid,
      reviewedAt: now,
      updatedAt: now,
    });
    count++;
  }
  if (count > 0) await batch.commit();
  return count;
}
