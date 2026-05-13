import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireAuthWithKid } from '@/lib/auth-utils';
import {
  deleteCustomWorkflow,
  getCustomWorkflow,
  setCustomWorkflowEnabled,
} from '@gsi/firebase/ceoCustomWorkflowService';

const patchSchema = z.object({
  enabled: z.boolean(),
});

/**
 * DELETE /api/ceo/custom-workflows/:workflowDocId
 * PATCH  /api/ceo/custom-workflows/:workflowDocId  { enabled: bool }
 */
export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ workflowDocId: string }> },
) {
  try {
    const { userId, kidId } = await requireAuthWithKid(request);
    const { workflowDocId } = await ctx.params;
    const wf = await getCustomWorkflow(workflowDocId);
    if (wf.kidId !== kidId || wf.userId !== userId) {
      throw new AppException('FORBIDDEN', 'Not your recipe', 403);
    }
    await deleteCustomWorkflow(workflowDocId);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ workflowDocId: string }> },
) {
  try {
    const { userId, kidId } = await requireAuthWithKid(request);
    const { workflowDocId } = await ctx.params;
    const body = await request.json();
    const { enabled } = patchSchema.parse(body);

    const wf = await getCustomWorkflow(workflowDocId);
    if (wf.kidId !== kidId || wf.userId !== userId) {
      throw new AppException('FORBIDDEN', 'Not your recipe', 403);
    }

    const updated = await setCustomWorkflowEnabled(workflowDocId, enabled);
    return apiSuccess({ workflow: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export const dynamic = 'force-dynamic';
