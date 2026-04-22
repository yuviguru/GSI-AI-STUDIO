import { NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireAuthWithKid } from '@/lib/auth-utils';
import { ceoAgentRunSchema } from '@/lib/validators';
import { adminDb } from '@/lib/firebase/admin';
import { getCeoBusiness } from '@/lib/firebase/ceoService';
import { getCeoAgentHire } from '@/lib/firebase/ceoAgentHireService';
import {
  countRecentCandidatesForWorkflow,
  saveCandidateArtifact,
} from '@/lib/firebase/ceoArtifactService';
import { executeWorkflow, WorkflowExecutionError } from '@/lib/ceo/agents/executor';
import { getWorkflow } from '@/lib/ceo/agents/workflows';
import { DEFAULT_TOOL_REGISTRY } from '@/lib/ceo/agents/toolRegistry';
import { baseWorkflowCostInr, runMultiplier } from '@/lib/ceo/agents/pricing';
import type { CeoArtifactTrigger, CeoBusiness } from '@/types';

/**
 * POST /api/ceo/agents/run
 *
 * Runs an agent workflow for the kid and persists the result as a
 * CANDIDATE artifact. Nothing lands on the business (e.g. brandAssets)
 * until the kid hits accept.
 *
 * Cost per A2: base (sum of per-tool step costs) × run-escalation
 * multiplier. Counter comes from
 * `countRecentCandidatesForWorkflow(hireId, workflowId)` — counts
 * candidate artifacts from the last 24h for the same hire+workflow.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, kidId } = await requireAuthWithKid(request);
    const body = await request.json();
    const { hireId, workflowId, brief, eventId } = ceoAgentRunSchema.parse(body);

    const hire = await getCeoAgentHire(hireId);
    if (hire.kidId !== kidId || hire.userId !== userId) {
      throw new AppException('FORBIDDEN', 'Not your hire', 403);
    }
    if (hire.status !== 'active') {
      throw new AppException('HIRE_INACTIVE', `Agent status: ${hire.status}`, 400);
    }

    const business = await getCeoBusiness(hire.businessId);
    if (business.kidId !== kidId) {
      throw new AppException('FORBIDDEN', 'Not your business', 403);
    }
    if (business.status !== 'active') {
      throw new AppException('BUSINESS_INACTIVE', 'Business is not active', 400);
    }

    // Compute the run index (1-indexed) based on prior candidates in the
    // same (hire, workflow) attempt session.
    const priorCandidates = await countRecentCandidatesForWorkflow(hireId, workflowId);
    const runIndex = priorCandidates + 1;
    const multiplier = runMultiplier(runIndex);

    const spec = getWorkflow(workflowId);

    // Up-front cash check: predict the total cost before we run anything.
    // The executor will also only charge succeeded steps, but the kid
    // needs to be able to afford the worst case or we shouldn't start.
    const maxPossibleCost = Math.round(
      sumBaseCost(spec) * multiplier,
    );
    if (business.currentCash < maxPossibleCost) {
      throw new AppException(
        'INSUFFICIENT_CASH',
        `This run costs up to ₹${maxPossibleCost}. You have ₹${business.currentCash}.`,
        402,
      );
    }

    let execResult;
    try {
      execResult = await executeWorkflow({
        spec,
        brief,
        tools: DEFAULT_TOOL_REGISTRY,
        contextPreamble: { business, hire, kidId, userId, workflowId },
      });
    } catch (err) {
      if (err instanceof WorkflowExecutionError) {
        // Even on failure, charge the steps that SUCCEEDED. That's fair
        // and teaches kids that real LLM calls cost real money even when
        // a downstream step blows up.
        const partialBase = err.trace
          .filter((t) => !t.failed)
          .reduce((sum, t) => sum + t.costInr, 0);
        if (partialBase > 0) {
          await deductCashAtomic(business, Math.round(partialBase * multiplier));
        }
        throw new AppException(
          'WORKFLOW_FAILED',
          `Step '${err.stepId}' failed: ${err.message}. Partial charge applied.`,
          502,
        );
      }
      throw err;
    }

    const totalCostInr = Math.round(execResult.baseCostInr * multiplier);

    // Atomic: deduct cost + save candidate artifact.
    const artifact = await adminDb.runTransaction(async (tx) => {
      const bizRef = adminDb.collection('ceoBusiness').doc(business.id);
      const snap = await tx.get(bizRef);
      if (!snap.exists) throw new AppException('NOT_FOUND', 'Business not found', 404);
      const current = snap.data() as CeoBusiness;
      if ((current.currentCash ?? 0) < totalCostInr) {
        throw new AppException(
          'INSUFFICIENT_CASH',
          'Cash dropped below run cost between check and commit.',
          402,
        );
      }
      tx.update(bizRef, {
        currentCash: Math.max(0, (current.currentCash ?? 0) - totalCostInr),
        updatedAt: Timestamp.now(),
      });

      // Inline save — saveCandidateArtifact uses its own write, not the tx
      // wrapper, so we replicate it inside the tx here.
      const ref = adminDb.collection('ceoArtifacts').doc();
      const now = Timestamp.now();
      const trigger: CeoArtifactTrigger = eventId ? 'milestone' : 'manual';
      const doc = {
        id: ref.id,
        userId,
        kidId,
        businessId: business.id,
        agentHireId: hireId,
        workflowId,
        trigger,
        trace: execResult.trace,
        assets: execResult.assets,
        status: 'candidate' as const,
        decisionEventId: eventId ?? null,
        attachedTo: null,
        costInr: totalCostInr,
        runIndex,
        createdAt: now,
        acceptedAt: null,
      };
      tx.set(ref, doc);
      return doc;
    });

    return apiSuccess({
      artifact,
      runIndex,
      costInr: totalCostInr,
      multiplier,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function sumBaseCost(spec: ReturnType<typeof getWorkflow>): number {
  return baseWorkflowCostInr(
    spec.steps.map((s) => ({ tool: s.tool, unitCount: s.unitCount ?? 1 })),
  );
}

async function deductCashAtomic(business: CeoBusiness, amount: number): Promise<void> {
  if (amount <= 0) return;
  await adminDb.runTransaction(async (tx) => {
    const bizRef = adminDb.collection('ceoBusiness').doc(business.id);
    const snap = await tx.get(bizRef);
    if (!snap.exists) return;
    const current = snap.data() as CeoBusiness;
    tx.update(bizRef, {
      currentCash: Math.max(0, (current.currentCash ?? 0) - amount),
      updatedAt: Timestamp.now(),
    });
  });
}

// Referenced to keep linter happy — service is imported above and used
// transitively via pricing/executor.
void saveCandidateArtifact;

export const dynamic = 'force-dynamic';
