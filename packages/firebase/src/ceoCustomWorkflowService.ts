/**
 * Firestore CRUD for `ceoCustomWorkflows` — kid-authored automation
 * recipes (Scale-phase Workflow Builder). Server-write only.
 *
 * The fire logic (listening on state deltas + actually running the
 * workflow when a trigger matches) is scaffolded in a follow-up —
 * this service + its API routes + UI are the skeleton.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './admin';
import { AppException } from '@/lib/api-utils';
import type {
  CeoAgentId,
  CeoCustomTrigger,
  CeoCustomWorkflow,
  CeoWorkflowId,
} from '@gsi/types';

const COLLECTION = 'ceoCustomWorkflows';

function docToCustom(doc: FirebaseFirestore.DocumentSnapshot): CeoCustomWorkflow {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    userId: d.userId ?? '',
    kidId: d.kidId ?? '',
    businessId: d.businessId ?? '',
    name: d.name ?? '',
    trigger: d.trigger as CeoCustomTrigger,
    triggerThreshold: typeof d.triggerThreshold === 'number' ? d.triggerThreshold : undefined,
    agentId: d.agentId as CeoAgentId,
    workflowId: d.workflowId as CeoWorkflowId,
    enabled: d.enabled !== false,
    firedCount: typeof d.firedCount === 'number' ? d.firedCount : 0,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export interface CreateCustomWorkflowInput {
  userId: string;
  kidId: string;
  businessId: string;
  name: string;
  trigger: CeoCustomTrigger;
  triggerThreshold?: number;
  agentId: CeoAgentId;
  workflowId: CeoWorkflowId;
}

export async function createCustomWorkflow(
  input: CreateCustomWorkflowInput,
): Promise<CeoCustomWorkflow> {
  const ref = adminDb.collection(COLLECTION).doc();
  const now = Timestamp.now();
  const doc: CeoCustomWorkflow = {
    id: ref.id,
    userId: input.userId,
    kidId: input.kidId,
    businessId: input.businessId,
    name: input.name,
    trigger: input.trigger,
    triggerThreshold: input.triggerThreshold,
    agentId: input.agentId,
    workflowId: input.workflowId,
    enabled: true,
    firedCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  // Admin SDK rejects undefined — strip defensively.
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc)) {
    if (v !== undefined) cleaned[k] = v;
  }
  await ref.set(cleaned);
  return doc;
}

export async function listCustomWorkflowsForBusiness(
  businessId: string,
): Promise<CeoCustomWorkflow[]> {
  try {
    const snap = await adminDb
      .collection(COLLECTION)
      .where('businessId', '==', businessId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    return snap.docs.map(docToCustom);
  } catch (err) {
    if (String((err as Error).message).includes('FAILED_PRECONDITION')) {
      console.warn(
        '[ceoCustomWorkflowService] index still building; returning []',
      );
      return [];
    }
    throw err;
  }
}

export async function getCustomWorkflow(workflowDocId: string): Promise<CeoCustomWorkflow> {
  const doc = await adminDb.collection(COLLECTION).doc(workflowDocId).get();
  if (!doc.exists) throw new AppException('NOT_FOUND', 'Custom workflow not found', 404);
  return docToCustom(doc);
}

export async function deleteCustomWorkflow(workflowDocId: string): Promise<void> {
  await adminDb.collection(COLLECTION).doc(workflowDocId).delete();
}

export async function setCustomWorkflowEnabled(
  workflowDocId: string,
  enabled: boolean,
): Promise<CeoCustomWorkflow> {
  const ref = adminDb.collection(COLLECTION).doc(workflowDocId);
  await ref.update({ enabled, updatedAt: Timestamp.now() });
  return getCustomWorkflow(workflowDocId);
}
