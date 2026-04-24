/**
 * Workflow registry — re-exports the raw store from `./registry` plus
 * side-effect-imports every workflow module so they self-register.
 *
 * Individual workflow modules import `registerWorkflow` from `./registry`
 * (not this file) to avoid an import cycle — see `registry.ts` header.
 */

export { getWorkflow, listRegisteredWorkflowIds, registerWorkflow } from './registry';
export type { AnyWorkflowSpec } from './registry';

// Side-effect imports: each workflow module calls `registerWorkflow()` on
// load. Listing them here guarantees the registry is populated before
// any API route reads it.
import './brandPackage';
import './marketingFirstCampaign';
import './opsSetupPackage';
import './financePricingPackage';
