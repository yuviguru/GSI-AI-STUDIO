/**
 * Billing module barrel.
 *
 *   import { enforceBilling, PLANS, ENTITLEMENTS } from '@/lib/billing';
 *
 * - `enforceBilling(request, options)` is the one-line entry every AI
 *   route uses: resolves the context, runs the guard, maps errors.
 * - The lower-level pieces (`assertEntitled`, `resolveBillingContext`,
 *   `toAppException`) are exported for routes that need finer control.
 */

export { PLANS, PLAN_IDS, DEFAULT_PLAN, getPlan, type Plan } from './plans';

export { ENTITLEMENTS, getEntitlements, hasEntitlement, type PlanEntitlements } from './entitlements';

export { CREDIT_COSTS, getCost, listCosts } from './creditCosts';

export {
  getBalance,
  getCreditSnapshot,
  getRecentLedger,
  getLedgerPage,
  debitCredits,
  grantMonthlyCredits,
  ensureInitialGrant,
  addTopupCredits,
  addBonusCredits,
  setKidSubscription,
  InsufficientCreditsError,
  type CreditSnapshot,
  type LedgerPage,
} from './credits';

export {
  assertEntitled,
  PlanError,
  planErrorDetails,
  insufficientCreditsDetails,
  type AssertEntitledOptions,
  type AssertEntitledResult,
  type BillingContext,
} from './guard';

export { shouldBypass } from './bypass';

export {
  getDeviceCreditSnapshot,
  debitDeviceCredits,
  resetDeviceCredits,
  type DeviceCreditSnapshot,
} from './deviceCredits';

export {
  enforceBilling,
  resolveBillingContext,
  toAppException,
} from './apiErrors';
