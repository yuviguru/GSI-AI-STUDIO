/**
 * @file Billing module barrel — single import path for entitlement +
 * credit + bypass logic.
 *
 *   import { assertEntitled, PLANS, ENTITLEMENTS } from '@/lib/billing';
 *
 * See the individual files for full docs:
 *   - plans.ts          tier catalog (price, monthly credits, marketing copy)
 *   - entitlements.ts   capability matrix per plan
 *   - creditCosts.ts    feature → credit cost map
 *   - credits.ts        ledger read/write (atomic debit, monthly grant, topup, bonus)
 *   - guard.ts          assertEntitled (the choke point routes call)
 *   - bypass.ts         dev override (BILLING_BYPASS env vars)
 */

export {
  PLANS,
  PLAN_IDS,
  DEFAULT_PLAN,
  getPlan,
  type Plan,
  type PlanPrice,
  type PlanMarketing,
} from './plans';

export {
  ENTITLEMENTS,
  getEntitlements,
  hasEntitlement,
  type PlanEntitlements,
} from './entitlements';

export {
  CREDIT_COSTS,
  getCost,
  listCosts,
} from './creditCosts';

export {
  getBalance,
  getCreditSnapshot,
  getRecentLedger,
  debitCredits,
  grantMonthlyCredits,
  addTopupCredits,
  addBonusCredits,
  InsufficientCreditsError,
  type CreditSnapshot,
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

export {
  shouldBypass,
  isUnmetered,
  logBypassStatusOnce,
} from './bypass';

export {
  resolveBillingContext,
  toAppException,
  withBillingErrors,
} from './apiErrors';
