/**
 * Firestore CRUD for `ceoArtifacts` — agent-produced artifacts (logos,
 * posters, schedules, pricing strategies, …).
 *
 * Phase 3 decisions A2 / A3:
 *   - Every run is charged (`costInr` on the doc).
 *   - Accepted artifacts are kept forever — kids can export after the
 *     sim completes.
 *
 * The service is a thin persistence layer; the cost + executor live
 * elsewhere so this file is easy to unit-test against a fake DB.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './admin';
import { AppException } from '@/lib/api-utils';
import type {
  CeoArtifact,
  CeoArtifactAsset,
  CeoArtifactStatus,
  CeoArtifactTrigger,
  CeoWorkflowId,
  CeoWorkflowStepTrace,
} from '@gsi/types';

const ARTIFACT_COLLECTION = 'ceoArtifacts';
const BUSINESS_COLLECTION = 'ceoBusiness';

function docToArtifact(doc: FirebaseFirestore.DocumentSnapshot): CeoArtifact {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    userId: data.userId ?? '',
    kidId: data.kidId ?? '',
    businessId: data.businessId ?? '',
    agentHireId: data.agentHireId ?? '',
    workflowId: data.workflowId as CeoWorkflowId,
    trigger: (data.trigger as CeoArtifactTrigger) ?? 'manual',
    trace: (data.trace as CeoWorkflowStepTrace[]) ?? [],
    assets: (data.assets as CeoArtifactAsset[]) ?? [],
    status: (data.status as CeoArtifactStatus) ?? 'candidate',
    decisionEventId: data.decisionEventId ?? null,
    attachedTo: data.attachedTo ?? null,
    costInr: typeof data.costInr === 'number' ? data.costInr : 0,
    runIndex: typeof data.runIndex === 'number' ? data.runIndex : 1,
    createdAt: data.createdAt,
    acceptedAt: data.acceptedAt ?? null,
  };
}

export interface CandidateArtifactInput {
  userId: string;
  kidId: string;
  businessId: string;
  agentHireId: string;
  workflowId: CeoWorkflowId;
  trigger: CeoArtifactTrigger;
  trace: CeoWorkflowStepTrace[];
  assets: CeoArtifactAsset[];
  costInr: number;
  runIndex: number;
  decisionEventId?: string | null;
}

/** Persist a fresh workflow run as a `candidate` artifact. Caller is
 *  responsible for deducting `costInr` from `business.currentCash` —
 *  handled in the run route's transaction rather than here so a failed
 *  save and a cash deduction can be reverted together. */
export async function saveCandidateArtifact(
  input: CandidateArtifactInput,
): Promise<CeoArtifact> {
  const ref = adminDb.collection(ARTIFACT_COLLECTION).doc();
  const now = Timestamp.now();
  const artifact: CeoArtifact = {
    id: ref.id,
    userId: input.userId,
    kidId: input.kidId,
    businessId: input.businessId,
    agentHireId: input.agentHireId,
    workflowId: input.workflowId,
    trigger: input.trigger,
    trace: input.trace,
    assets: input.assets,
    status: 'candidate',
    decisionEventId: input.decisionEventId ?? null,
    attachedTo: null,
    costInr: input.costInr,
    runIndex: input.runIndex,
    createdAt: now,
    acceptedAt: null,
  };
  await ref.set(artifact);
  return artifact;
}

export async function getArtifact(artifactId: string): Promise<CeoArtifact> {
  const doc = await adminDb.collection(ARTIFACT_COLLECTION).doc(artifactId).get();
  if (!doc.exists) throw new AppException('NOT_FOUND', 'Artifact not found', 404);
  return docToArtifact(doc);
}

/** Atomic accept — marks the artifact `accepted` AND (optionally)
 *  attaches its asset bundle to the parent business OR its deciding
 *  event in the SAME transaction.
 *
 *  For BRAND-like acceptance where the kid picks a subset of candidate
 *  assets (one logo of 3, one motto of 3), caller passes `finalAssets`
 *  — the filtered subset — which is written to the artifact in place
 *  of the full candidate set AND (if attached to the business) merged
 *  into `business.brandAssets`. */
export interface AcceptArtifactInput {
  artifactId: string;
  /** Subset of the candidate `assets` the kid picked. Must be a strict
   *  subset (by reference equality on URL / content). */
  finalAssets: CeoArtifactAsset[];
  /** Where the accepted artifact lands. */
  attachTo:
    | { kind: 'business_field'; field: 'brandAssets' }
    | { kind: 'event'; eventId: string }
    | { kind: 'marketing_feed' };
}

export async function acceptArtifact(input: AcceptArtifactInput): Promise<CeoArtifact> {
  const ref = adminDb.collection(ARTIFACT_COLLECTION).doc(input.artifactId);

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new AppException('NOT_FOUND', 'Artifact not found', 404);
    const artifact = docToArtifact(snap);
    if (artifact.status === 'accepted') {
      throw new AppException('ALREADY_ACCEPTED', 'Artifact already accepted', 400);
    }
    if (artifact.status === 'rejected' || artifact.status === 'expired') {
      throw new AppException('ARTIFACT_NOT_ACCEPTABLE', `Artifact is ${artifact.status}`, 400);
    }

    const now = Timestamp.now();

    // 1. Update the artifact.
    tx.update(ref, {
      status: 'accepted' as const,
      assets: input.finalAssets,
      attachedTo: input.attachTo,
      acceptedAt: now,
    });

    // 2. Attach — only business_field is fully handled here; event /
    //    marketing_feed attachments are no-ops at this layer because the
    //    caller (API route) already holds the event/marketing-feed
    //    update as part of its own transaction flow.
    if (input.attachTo.kind === 'business_field' && input.attachTo.field === 'brandAssets') {
      const brandAssets = deriveBrandAssetsFromArtifact(input.finalAssets);
      if (brandAssets) {
        const bizRef = adminDb.collection(BUSINESS_COLLECTION).doc(artifact.businessId);
        tx.update(bizRef, {
          brandAssets,
          updatedAt: now,
        });
      }
    }

    return {
      ...artifact,
      status: 'accepted' as const,
      assets: input.finalAssets,
      attachedTo: input.attachTo,
      acceptedAt: now,
    };
  });
}

/** Read a subset of accepted assets to populate `business.brandAssets`.
 *  Returns null when the subset doesn't look like a full brand package
 *  (caller is expected to re-roll) — e.g. missing the logo or motto. */
function deriveBrandAssetsFromArtifact(
  assets: CeoArtifactAsset[],
): { logoUrl: string; motto: string; voice: string; palette?: string[] } | null {
  const logo = assets.find((a) => a.type === 'image' && a.kind === 'logo');
  const motto = assets.find((a) => a.type === 'text' && a.kind === 'motto');
  const voice = assets.find((a) => a.type === 'text' && a.kind === 'voice');
  const palette = assets.find((a) => a.type === 'palette');
  if (!logo || logo.type !== 'image') return null;
  if (!motto || motto.type !== 'text') return null;
  if (!voice || voice.type !== 'text') return null;
  return {
    logoUrl: logo.url,
    motto: motto.content,
    voice: voice.content,
    ...(palette && palette.type === 'palette' ? { palette: palette.colors } : {}),
  };
}

export async function rejectArtifact(artifactId: string): Promise<CeoArtifact> {
  const ref = adminDb.collection(ARTIFACT_COLLECTION).doc(artifactId);
  await ref.update({ status: 'rejected' as const });
  return getArtifact(artifactId);
}

export async function listArtifactsForBusiness(
  businessId: string,
  opts?: { status?: CeoArtifactStatus; limit?: number },
): Promise<CeoArtifact[]> {
  try {
    let query: FirebaseFirestore.Query = adminDb
      .collection(ARTIFACT_COLLECTION)
      .where('businessId', '==', businessId);
    if (opts?.status) query = query.where('status', '==', opts.status);
    const snap = await query.orderBy('createdAt', 'desc').limit(opts?.limit ?? 50).get();
    return snap.docs.map(docToArtifact);
  } catch (err) {
    if (String((err as Error).message).includes('FAILED_PRECONDITION')) {
      console.warn('[ceoArtifactService] artifacts index still building; returning []');
      return [];
    }
    throw err;
  }
}

/** Count the not-yet-accepted-or-rejected candidate runs for a specific
 *  (hire, workflow) pair in the last 24h — feeds the pricing's
 *  run-escalation multiplier. Each candidate counts as one prior run. */
export async function countRecentCandidatesForWorkflow(
  hireId: string,
  workflowId: CeoWorkflowId,
): Promise<number> {
  const cutoff = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
  try {
    const snap = await adminDb
      .collection(ARTIFACT_COLLECTION)
      .where('agentHireId', '==', hireId)
      .where('workflowId', '==', workflowId)
      .where('status', '==', 'candidate')
      .where('createdAt', '>=', cutoff)
      .get();
    return snap.size;
  } catch {
    // Index still building — behave as if no priors (cheapest re-roll),
    // erring on the kid's side. Production will fix itself as the index
    // finishes.
    return 0;
  }
}
