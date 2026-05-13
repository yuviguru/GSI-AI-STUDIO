import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireAuthWithKid } from '@/lib/auth-utils';
import { getCeoBusiness } from '@gsi/firebase/ceoService';
import {
  createCustomWorkflow,
  listCustomWorkflowsForBusiness,
} from '@gsi/firebase/ceoCustomWorkflowService';
import { getAgentDescriptor } from '@/lib/ceo/agents/catalog';

const TRIGGER_ENUM = z.enum([
  'negative_customer_feedback',
  'positive_customer_feedback',
  'cash_below_threshold',
  'cash_above_threshold',
  'reputation_below_threshold',
  'new_phase_reached',
  'milestone_missed',
  'end_of_day',
]);

const AGENT_ENUM = z.enum([
  'design',
  'marketing',
  'ops',
  'finance',
  'customer_success',
  'product',
]);

const WORKFLOW_ENUM = z.enum([
  'brand.package',
  'marketing.firstCampaign',
  'marketing.dailyPush',
  'ops.setupPackage',
  'ops.scheduleCheck',
  'finance.pricingPackage',
  'finance.cashCheck',
]);

const createSchema = z.object({
  businessId: z.string().min(1).max(128),
  name: z.string().min(1).max(80),
  trigger: TRIGGER_ENUM,
  triggerThreshold: z.number().int().min(0).max(100_000).optional(),
  agentId: AGENT_ENUM,
  workflowId: WORKFLOW_ENUM,
});

/**
 * GET /api/ceo/custom-workflows?businessId=...
 * POST /api/ceo/custom-workflows
 *
 * Kid-authored automation recipes (Scale phase). The recipes persist
 * but don't FIRE yet — the event-driven runner that watches business
 * state deltas + triggers the matching workflow lands in a follow-up.
 * Shipping the persistence layer + UI first so kids can author and
 * review recipes before the runner is live.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, kidId } = await requireAuthWithKid(request);
    const url = new URL(request.url);
    const businessId = url.searchParams.get('businessId');
    if (!businessId) {
      throw new AppException('INVALID_INPUT', 'businessId query param is required', 400);
    }

    const business = await getCeoBusiness(businessId);
    if (business.kidId !== kidId || business.userId !== userId) {
      throw new AppException('FORBIDDEN', 'Not your business', 403);
    }

    const workflows = await listCustomWorkflowsForBusiness(businessId);
    return apiSuccess({ workflows });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, kidId } = await requireAuthWithKid(request);
    const body = await request.json();
    const input = createSchema.parse(body);

    const business = await getCeoBusiness(input.businessId);
    if (business.kidId !== kidId || business.userId !== userId) {
      throw new AppException('FORBIDDEN', 'Not your business', 403);
    }
    // Scale-phase gate (W1) — enforced server-side so kids can't
    // bypass the UI.
    if (business.phase !== 'scale' && business.phase !== 'mature') {
      throw new AppException(
        'WORKFLOW_BUILDER_LOCKED',
        'Custom workflows unlock at the Scale phase.',
        400,
      );
    }

    const agent = getAgentDescriptor(input.agentId);
    if (!agent.workflows.includes(input.workflowId)) {
      throw new AppException(
        'WORKFLOW_AGENT_MISMATCH',
        `${agent.name} doesn't handle the ${input.workflowId} workflow.`,
        400,
      );
    }

    const created = await createCustomWorkflow({
      userId,
      kidId,
      businessId: input.businessId,
      name: input.name,
      trigger: input.trigger,
      triggerThreshold: input.triggerThreshold,
      agentId: input.agentId,
      workflowId: input.workflowId,
    });

    return apiSuccess({ workflow: created }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export const dynamic = 'force-dynamic';
