/**
 * Raw workflow registry store — kept in its own file so individual
 * workflow modules can register themselves at import time without
 * creating an import cycle with `workflows/index.ts` (which also
 * side-effect-imports every workflow for production wiring).
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
