import { NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireAuthWithKid } from '@/lib/auth-utils';
import { ceoAgentAcceptSchema } from '@/lib/validators';
import {
  acceptArtifact,
  getArtifact,
} from '@/lib/firebase/ceoArtifactService';
import { adminDb } from '@/lib/firebase/admin';
import type { CeoArtifactAsset, CeoBusiness, CeoEvent } from '@/types';

/**
 * POST /api/ceo/agents/accept
 *
 * Accepts a specific subset of candidate assets from an artifact. Writes
 * atomically: artifact → 'accepted', selected assets stored on the
 * artifact, AND (for BRAND-like flows) derived fields merged into
 * `business.brandAssets`.
 *
 * Selection mapping:
 *   `selections = { logo: 2, motto: 0 }` means "pick logo candidate #2,
 *   motto candidate #0". Selector keys match the `kind` of the asset
 *   (e.g. `logo`, `motto`, `voice`).
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, kidId } = await requireAuthWithKid(request);
    const body = await request.json();
    const { artifactId, selections, attachTo } = ceoAgentAcceptSchema.parse(body);

    const artifact = await getArtifact(artifactId);
    if (artifact.kidId !== kidId || artifact.userId !== userId) {
      throw new AppException('FORBIDDEN', 'Not your artifact', 403);
    }
    if (artifact.status !== 'candidate') {
      throw new AppException(
        'ARTIFACT_NOT_ACCEPTABLE',
        `Artifact is already ${artifact.status}`,
        400,
      );
    }

    // Resolve selections → actual assets. Keys can either be an asset
    // `kind` (filter by kind, pick Nth match) OR — when selections is
    // empty — we take all candidates as-is (legacy behaviour).
    const selectedKeys = Object.keys(selections);
    const finalAssets: CeoArtifactAsset[] =
      selectedKeys.length === 0
        ? artifact.assets
        : selectKinds(artifact.assets, selections);

    if (finalAssets.length === 0) {
      throw new AppException(
        'INVALID_SELECTIONS',
        'Selections must resolve to at least one asset.',
        400,
      );
    }

    const accepted = await acceptArtifact({
      artifactId,
      finalAssets,
      attachTo,
    });

    // When the artifact was generated to resolve a milestone event, mark
    // that event decided + resolve the milestone + clear the pending
    // pointer in one transaction. The kid's AI points award and phase-
    // advance flow are handled by the legacy decide route at present;
    // agent-driven milestones don't award dimension scores (tool use,
    // not personality), so we just synthesise a neutral decided state.
    if (accepted.decisionEventId && accepted.businessId) {
      await resolveMilestoneFromAgentAccept({
        eventId: accepted.decisionEventId,
        businessId: accepted.businessId,
      });
    }

    return apiSuccess({ artifact: accepted });
  } catch (error) {
    return handleApiError(error);
  }
}

function selectKinds(
  candidates: CeoArtifactAsset[],
  selections: Record<string, number>,
): CeoArtifactAsset[] {
  const result: CeoArtifactAsset[] = [];
  for (const [kind, index] of Object.entries(selections)) {
    const matchingKind = candidates.filter((a) => kindOf(a) === kind);
    const pick = matchingKind[index];
    if (pick) result.push(pick);
  }
  // De-dupe: an asset that matched multiple selection slots is kept once.
  return Array.from(new Set(result));
}

function kindOf(asset: CeoArtifactAsset): string {
  switch (asset.type) {
    case 'image':
    case 'text':
      return asset.kind;
    case 'palette':
      return 'palette';
    case 'schedule':
      return 'schedule';
    case 'pricing_strategy':
      return 'pricing_strategy';
    default: {
      // Exhaustiveness guard — keeps the compiler honest if we add a new
      // asset variant without updating this switch.
      const _never: never = asset;
      void _never;
      return 'unknown';
    }
  }
}

async function resolveMilestoneFromAgentAccept(params: {
  eventId: string;
  businessId: string;
}): Promise<void> {
  const eventRef = adminDb.collection('ceoEvents').doc(params.eventId);
  const businessRef = adminDb.collection('ceoBusiness').doc(params.businessId);

  await adminDb.runTransaction(async (tx) => {
    const [eventSnap, businessSnap] = await Promise.all([
      tx.get(eventRef),
      tx.get(businessRef),
    ]);
    if (!eventSnap.exists || !businessSnap.exists) return;
    const event = eventSnap.data() as CeoEvent;
    const business = businessSnap.data() as CeoBusiness;
    if (event.status !== 'pending') return; // Already decided/expired — no-op.

    const now = Timestamp.now();
    const mergedMilestones = { ...business.phaseMilestones };
    if (event.milestone) {
      mergedMilestones[event.milestone] = 'resolved';
    }

    tx.update(eventRef, {
      status: 'decided' as const,
      decidedChoice: 'A' as const, // Synthetic — kids pick assets, not A/B/C.
      decisionTimestamp: now,
      responseTimeSeconds: 0,
      scores: {
        risk_calibration: 0,
        capital_discipline: 0,
        growth_instinct: 0,
        operational_rigor: 0,
        people_leadership: 0,
        crisis_response: 0,
      },
      feedback: 'Your Design Agent delivered — brand assets saved.',
    });

    tx.update(businessRef, {
      phaseMilestones: mergedMilestones,
      totalDecisions: (business.totalDecisions ?? 0) + 1,
      pendingMilestoneEventId: null,
      updatedAt: now,
    });
  });
}

export const dynamic = 'force-dynamic';
