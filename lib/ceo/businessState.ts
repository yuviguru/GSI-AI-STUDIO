/** Kid CEO business-state math — ported from SimPrenuer/backend/profileEngine.js
 *  (`applyStateChanges`, lines 267-281).
 *
 *  SimPrenuer tracks a richer state (cash / revenue / expenses / reputation /
 *  employee_morale / supplier_trust / customer_satisfaction / month). Kid CEO
 *  deliberately simplifies: only currentCash, reputation, morale, employees,
 *  totalDecisions survive as first-class state.
 *
 *  Mapping decisions for incoming LLM `stateChanges`:
 *  - cash_delta          → currentCash (floored at 0)
 *  - reputation_delta    → reputation (clamped 0-100)
 *  - morale_delta        → morale (clamped 0-100)
 *  - customer_satisfaction_delta → AVERAGED into morale when both present;
 *    used alone if only it is present. Rationale: customer happiness and team
 *    morale are strongly correlated for a kid-scale biz, and averaging keeps
 *    the signal from the LLM without inventing a new tracked field. Cleaner
 *    than discarding outright.
 *  - revenue_delta / expenses_delta → tolerated for schema compat, ignored.
 *
 *  This module is pure math: no Firebase imports, no async, no mutation.
 *  The caller (e.g. ceoService) is responsible for persisting the result and
 *  setting Firestore Timestamp fields like `updatedAt`.
 */

import type { CeoBusiness } from '@gsi/types';

export interface StateChanges {
  cash_delta?: number;
  reputation_delta?: number;
  morale_delta?: number;
  /** Tolerated from LLM; merged into morale if present. See file header. */
  customer_satisfaction_delta?: number;
  /** Tolerated for SimPrenuer schema compat; ignored by Kid CEO. */
  revenue_delta?: number;
  /** Tolerated for SimPrenuer schema compat; ignored by Kid CEO. */
  expenses_delta?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Combine the raw morale delta with the customer-satisfaction delta.
 *  - both present → average the two
 *  - one present  → use it
 *  - neither      → 0 (no change) */
function combinedMoraleDelta(
  moraleDelta: number | undefined,
  satisfactionDelta: number | undefined,
): number {
  const hasMorale = typeof moraleDelta === 'number';
  const hasSatisfaction = typeof satisfactionDelta === 'number';
  if (hasMorale && hasSatisfaction) {
    return ((moraleDelta as number) + (satisfactionDelta as number)) / 2;
  }
  if (hasMorale) return moraleDelta as number;
  if (hasSatisfaction) return satisfactionDelta as number;
  return 0;
}

/**
 * Apply incremental state changes to a business. Clamps 0-100 fields to
 * [0, 100] and cash to [0, ∞). Increments `totalDecisions` by 1. Returns a
 * new Business; does not mutate the input.
 *
 * `updatedAt` is intentionally not touched here — setting a Firestore
 * Timestamp is the caller's responsibility (this keeps the function pure
 * and unit-testable without a Firebase dependency).
 */
export function applyStateChanges(
  business: CeoBusiness,
  changes: StateChanges,
): CeoBusiness {
  const cashDelta = changes.cash_delta ?? 0;
  const reputationDelta = changes.reputation_delta ?? 0;
  const moraleDelta = combinedMoraleDelta(
    changes.morale_delta,
    changes.customer_satisfaction_delta,
  );

  return {
    ...business,
    currentCash: Math.max(0, business.currentCash + cashDelta),
    reputation: clamp(business.reputation + reputationDelta, 0, 100),
    morale: clamp(business.morale + moraleDelta, 0, 100),
    totalDecisions: business.totalDecisions + 1,
  };
}
