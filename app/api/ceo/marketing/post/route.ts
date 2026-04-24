import { NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireAuthWithKid } from '@/lib/auth-utils';
import { adminDb } from '@/lib/firebase/admin';
import { getArtifact } from '@/lib/firebase/ceoArtifactService';
import { istDayKey } from '@/lib/ceo/cadence';
import type { CeoBusiness } from '@/types';

/**
 * POST /api/ceo/marketing/post
 *
 * Kid taps "Post this" on an accepted Marketing artifact — surfaces it
 * to the business's customers. Applies a small, deterministic
 * reputation bump (+1 / post), capped at +3 / IST day per decision C2.
 * Bigger campaigns don't stack — the cap is the whole-business daily
 * cap, not per-artifact.
 */
const MARKETING_POST_REP_DELTA = 1;
const MARKETING_POST_DAILY_REP_CAP = 3;

const bodySchema = z.object({
  artifactId: z.string().min(1).max(128),
});

export async function POST(request: NextRequest) {
  try {
    const { userId, kidId } = await requireAuthWithKid(request);
    const body = await request.json();
    const { artifactId } = bodySchema.parse(body);

    const artifact = await getArtifact(artifactId);
    if (artifact.kidId !== kidId || artifact.userId !== userId) {
      throw new AppException('FORBIDDEN', 'Not your artifact', 403);
    }
    if (artifact.status !== 'accepted') {
      throw new AppException('ARTIFACT_NOT_ACCEPTED', 'Post only accepted campaigns', 400);
    }
    if (artifact.workflowId !== 'marketing.firstCampaign') {
      throw new AppException(
        'WORKFLOW_NOT_SUPPORTED',
        'Only marketing campaigns can be posted.',
        400,
      );
    }

    const bizRef = adminDb.collection('ceoBusiness').doc(artifact.businessId);
    const today = istDayKey(new Date());

    const result = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(bizRef);
      if (!snap.exists) throw new AppException('NOT_FOUND', 'Business not found', 404);
      const business = snap.data() as CeoBusiness;

      const lastDay = business.marketingLastPostDayUtc ?? null;
      const prevCount =
        lastDay === today ? (business.marketingDailyPostCount ?? 0) : 0;

      if (prevCount >= MARKETING_POST_DAILY_REP_CAP) {
        return {
          capped: true as const,
          postsToday: prevCount,
          appliedRepDelta: 0,
          reputation: business.reputation,
        };
      }

      const repDelta = MARKETING_POST_REP_DELTA;
      const nextRep = Math.max(0, Math.min(100, (business.reputation ?? 0) + repDelta));

      tx.update(bizRef, {
        reputation: nextRep,
        marketingDailyPostCount: prevCount + 1,
        marketingLastPostDayUtc: today,
        updatedAt: Timestamp.now(),
      });

      return {
        capped: false as const,
        postsToday: prevCount + 1,
        appliedRepDelta: repDelta,
        reputation: nextRep,
      };
    });

    return apiSuccess({
      ...result,
      cap: MARKETING_POST_DAILY_REP_CAP,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const dynamic = 'force-dynamic';
