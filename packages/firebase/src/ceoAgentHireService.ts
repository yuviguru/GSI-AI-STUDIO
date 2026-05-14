/**
 * Firestore CRUD for `ceoAgentHires`.
 *
 * Each doc = one kid's hire of one agent for one business. Hires are
 * independent of artifacts — a kid can keep a hire active without
 * running anything, and a workflow run needs an active hire. Schema
 * documented in `docs/data-model.md`.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './admin';
import { AppException } from '@/lib/api-utils';
import type {
  CeoAgentConfig,
  CeoAgentHire,
  CeoAgentHireStatus,
  CeoAgentId,
} from '@gsi/types';

const HIRE_COLLECTION = 'ceoAgentHires';

function docToHire(doc: FirebaseFirestore.DocumentSnapshot): CeoAgentHire {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    userId: data.userId ?? '',
    kidId: data.kidId ?? '',
    businessId: data.businessId ?? '',
    agentId: data.agentId as CeoAgentId,
    config: (data.config as CeoAgentConfig) ?? { focus: 'brand', aggressiveness: 'medium' },
    salary: typeof data.salary === 'number' ? data.salary : 0,
    status: (data.status as CeoAgentHireStatus) ?? 'active',
    hiredAt: data.hiredAt,
    updatedAt: data.updatedAt,
  };
}

export interface CreateHireInput {
  userId: string;
  kidId: string;
  businessId: string;
  agentId: CeoAgentId;
  config: CeoAgentConfig;
  salary: number;
}

/** Create a new hire. Caller is responsible for salary deduction +
 *  phase-unlock validation — this service is a pure store. */
export async function createCeoAgentHire(input: CreateHireInput): Promise<CeoAgentHire> {
  const ref = adminDb.collection(HIRE_COLLECTION).doc();
  const now = Timestamp.now();
  const hire: CeoAgentHire = {
    id: ref.id,
    userId: input.userId,
    kidId: input.kidId,
    businessId: input.businessId,
    agentId: input.agentId,
    config: input.config,
    salary: input.salary,
    status: 'active',
    hiredAt: now,
    updatedAt: now,
  };
  await ref.set(hire);
  return hire;
}

export async function getCeoAgentHire(hireId: string): Promise<CeoAgentHire> {
  const doc = await adminDb.collection(HIRE_COLLECTION).doc(hireId).get();
  if (!doc.exists) throw new AppException('NOT_FOUND', 'Hire not found', 404);
  return docToHire(doc);
}

/** List hires for a business, most-recent first. Optional status filter.
 *  Graceful degradation: returns [] while the composite index is still
 *  building in Firebase. */
export async function listHiresForBusiness(
  businessId: string,
  opts?: { status?: CeoAgentHireStatus },
): Promise<CeoAgentHire[]> {
  try {
    let query: FirebaseFirestore.Query = adminDb
      .collection(HIRE_COLLECTION)
      .where('businessId', '==', businessId);
    if (opts?.status) {
      query = query.where('status', '==', opts.status);
    }
    const snap = await query.orderBy('hiredAt', 'desc').limit(50).get();
    return snap.docs.map(docToHire);
  } catch (err) {
    if (String((err as Error).message).includes('FAILED_PRECONDITION')) {
      console.warn('[ceoAgentHireService] hires index still building; returning []');
      return [];
    }
    throw err;
  }
}

/** Look up an ACTIVE hire for a specific (business, agent) pair. Returns
 *  null if the kid hasn't hired that agent (or already dismissed). Used
 *  by the hire route to enforce one-active-hire-per-agent. */
export async function getActiveHireForAgent(
  businessId: string,
  agentId: CeoAgentId,
): Promise<CeoAgentHire | null> {
  const snap = await adminDb
    .collection(HIRE_COLLECTION)
    .where('businessId', '==', businessId)
    .where('agentId', '==', agentId)
    .where('status', '==', 'active')
    .limit(1)
    .get();
  if (snap.empty) return null;
  return docToHire(snap.docs[0]!);
}

export async function updateCeoAgentHire(
  hireId: string,
  patch: Partial<Pick<CeoAgentHire, 'config' | 'status' | 'salary'>>,
): Promise<CeoAgentHire> {
  const ref = adminDb.collection(HIRE_COLLECTION).doc(hireId);
  await ref.update({ ...patch, updatedAt: Timestamp.now() });
  return getCeoAgentHire(hireId);
}
