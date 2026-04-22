/**
 * Workflow registry — maps `CeoWorkflowId` → concrete `WorkflowSpec`.
 *
 * Specific workflows (brand.package, marketing.firstCampaign, …) are
 * introduced by per-agent stories (KIDCEO-AGENT-001-BRAND,
 * KIDCEO-AGENT-002-MARKETING, etc). This file starts empty on the
 * primitive PR and grows as stories land — the registry shape is stable
 * so adding a workflow is a one-line import + registration.
 */

import type { CeoWorkflowId } from '@/types';
import type { WorkflowSpec } from '../executor';

export type AnyWorkflowSpec = WorkflowSpec<unknown>;

const registry: Partial<Record<CeoWorkflowId, AnyWorkflowSpec>> = {};

export function registerWorkflow(spec: AnyWorkflowSpec): void {
  registry[spec.id as CeoWorkflowId] = spec;
}

export function getWorkflow(id: CeoWorkflowId): AnyWorkflowSpec {
  const spec = registry[id];
  if (!spec) {
    throw new Error(`getWorkflow: no spec registered for '${id}'`);
  }
  return spec;
}

export function listRegisteredWorkflowIds(): CeoWorkflowId[] {
  return Object.keys(registry) as CeoWorkflowId[];
}
