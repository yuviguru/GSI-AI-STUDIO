/**
 * Phase 4 (COMPLIANCE-002): erasure request queue.
 *
 * Requests are queued here; the actual cascade deletion across all
 * kid-referencing collections runs as a separate worker (Cloud Function /
 * scheduled job) that picks up pending requests — that lives in a
 * follow-up so we don't block Phase 4 MVP on cron infrastructure.
 *
 * DPDP Act 2023 requires completion within 30 days.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { AppException } from '@/lib/api-utils';
import type { ErasureRequest, ErasureStatus } from '@gsi/types';

const ERASURE_COLLECTION = 'erasureRequests';
const KIDS_COLLECTION = 'kids';

interface ErasureRequestFirestore {
  id: string;
  parentUid: string;
  kidId: string;
  reason?: string;
  status: ErasureStatus;
  cascadeSummary?: Record<string, number>;
  receiptUrl?: string;
  lastError?: string;
  createdAt: Timestamp;
  completedAt?: Timestamp;
}

function toRequest(doc: ErasureRequestFirestore): ErasureRequest {
  return {
    ...doc,
    createdAt: doc.createdAt.toDate(),
    completedAt: doc.completedAt?.toDate(),
  };
}

async function assertKidBelongsToParent(
  parentUid: string,
  kidId: string,
): Promise<void> {
  const kidSnap = await adminDb.collection(KIDS_COLLECTION).doc(kidId).get();
  if (!kidSnap.exists) {
    throw new AppException('NOT_FOUND', 'Kid not found.', 404);
  }
  const parentId = kidSnap.data()?.parentId as string | null | undefined;
  if (!parentId || parentId !== parentUid) {
    throw new AppException('FORBIDDEN', 'Kid is not linked to you.', 403);
  }
}

export interface CreateErasureRequestInput {
  parentUid: string;
  kidId: string;
  reason?: string;
}

export async function createErasureRequest(
  input: CreateErasureRequestInput,
): Promise<ErasureRequest> {
  await assertKidBelongsToParent(input.parentUid, input.kidId);

  // Prevent duplicate pending/in-progress requests.
  const existing = await adminDb
    .collection(ERASURE_COLLECTION)
    .where('kidId', '==', input.kidId)
    .where('status', 'in', ['pending', 'in_progress'])
    .limit(1)
    .get();
  if (!existing.empty) {
    return toRequest(existing.docs[0]!.data() as ErasureRequestFirestore);
  }

  const ref = adminDb.collection(ERASURE_COLLECTION).doc();
  const doc: ErasureRequestFirestore = {
    id: ref.id,
    parentUid: input.parentUid,
    kidId: input.kidId,
    reason: input.reason,
    status: 'pending',
    createdAt: Timestamp.now(),
  };
  await ref.set(doc);
  return toRequest(doc);
}

export async function getErasureRequest(
  requestId: string,
): Promise<ErasureRequest | null> {
  const snap = await adminDb.collection(ERASURE_COLLECTION).doc(requestId).get();
  if (!snap.exists) return null;
  return toRequest(snap.data() as ErasureRequestFirestore);
}

export async function listErasureRequestsForParent(
  parentUid: string,
): Promise<ErasureRequest[]> {
  const snap = await adminDb
    .collection(ERASURE_COLLECTION)
    .where('parentUid', '==', parentUid)
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map((d) => toRequest(d.data() as ErasureRequestFirestore));
}
