'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import {
  ApiError,
  InsufficientCreditsClientError,
  PlanLockedClientError,
} from '@/lib/api/fetchJson';

/**
 * Global billing-error surface: any client-side code that hits a 402 or
 * 403 from the billing layer pushes the typed error here, and the
 * root-layout modal renders an actionable response — "Buy coins" CTA for
 * insufficient credits, "Upgrade plan" CTA for plan-locked capabilities.
 *
 * Without this, every studio would render its own ad-hoc error string
 * and the user would see "Something went wrong" instead of "You need 5
 * more coins → Top up".
 */

export type BillingNotification =
  | {
      kind: 'insufficient';
      required: number;
      available: number;
      feature?: string;
      topupUrl: string;
      message: string;
    }
  | {
      kind: 'planLocked';
      currentPlan: string;
      requiredPlan: string | null;
      feature: string;
      upgradeUrl: string;
      message: string;
    };

interface CtxValue {
  notification: BillingNotification | null;
  show: (n: BillingNotification) => void;
  dismiss: () => void;
  /**
   * Inspect an error. If it's a typed billing error, surface a
   * notification and return true. Otherwise return false so the
   * caller can render its own error UI.
   */
  handleError: (err: unknown) => boolean;
}

const BillingNotificationContext = createContext<CtxValue>({
  notification: null,
  show: () => {},
  dismiss: () => {},
  handleError: () => false,
});

export function useBillingNotifications(): CtxValue {
  return useContext(BillingNotificationContext);
}

export function BillingNotificationProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<BillingNotification | null>(null);

  const show = useCallback((n: BillingNotification) => setNotification(n), []);
  const dismiss = useCallback(() => setNotification(null), []);

  const handleError = useCallback((err: unknown): boolean => {
    if (err instanceof InsufficientCreditsClientError) {
      setNotification({
        kind: 'insufficient',
        required: err.details.required,
        available: err.details.available,
        feature: err.details.feature,
        topupUrl: err.details.topupUrl,
        message: err.message,
      });
      return true;
    }
    if (err instanceof PlanLockedClientError) {
      setNotification({
        kind: 'planLocked',
        currentPlan: err.details.currentPlan,
        requiredPlan: err.details.requiredPlan,
        feature: err.details.feature,
        upgradeUrl: err.details.upgradeUrl,
        message: err.message,
      });
      return true;
    }
    if (err instanceof ApiError) {
      // Generic API error — not a billing error, let caller handle it.
      return false;
    }
    return false;
  }, []);

  return (
    <BillingNotificationContext.Provider value={{ notification, show, dismiss, handleError }}>
      {children}
    </BillingNotificationContext.Provider>
  );
}

/**
 * Parse an api-utils envelope response. If it carries a 402 or 403
 * billing error, push it to the global notification and return true so
 * the caller can early-return without rendering its own error UI.
 *
 *   const json = await res.json();
 *   if (handleBillingApiError(res.status, json, showBillingNotification)) return;
 */
export function handleBillingApiError(
  status: number,
  body: { error?: { code?: string; message?: string; details?: unknown } | null } | null,
  show: (n: BillingNotification) => void,
): boolean {
  const err = body?.error;
  if (!err) return false;

  if (status === 402 && err.code === 'INSUFFICIENT_CREDITS') {
    const d = err.details as
      | { required: number; available: number; feature?: string; topupUrl: string }
      | undefined;
    if (d) {
      show({
        kind: 'insufficient',
        required: d.required,
        available: d.available,
        feature: d.feature,
        topupUrl: d.topupUrl,
        message: err.message ?? 'Not enough coins.',
      });
      return true;
    }
  }

  if (status === 403 && err.code === 'FORBIDDEN_BY_PLAN') {
    const d = err.details as
      | { currentPlan: string; requiredPlan: string | null; feature: string; upgradeUrl: string }
      | undefined;
    if (d) {
      show({
        kind: 'planLocked',
        currentPlan: d.currentPlan,
        requiredPlan: d.requiredPlan,
        feature: d.feature,
        upgradeUrl: d.upgradeUrl,
        message: err.message ?? 'This is a higher-tier feature.',
      });
      return true;
    }
  }

  return false;
}
