/**
 * Razorpay Subscriptions — server side.
 *
 * Razorpay's subscription model: ops creates Plan entities in the
 * Razorpay dashboard (one per (plan, billing-cycle) pair). We store
 * those plan IDs in env vars and reference them when creating
 * subscriptions.
 *
 *   RAZORPAY_PLAN_CREATOR_MONTHLY=plan_xxx
 *   RAZORPAY_PLAN_PRO_MONTHLY=plan_xxx
 *
 * v1 deliberately ships monthly only — adding annual is a follow-up
 * (more env vars, swap in the order modal).
 *
 * Lifecycle (server side, driven by webhooks in
 * `/api/billing/razorpay/webhook`):
 *
 *   created  → kid clicked Subscribe; subscription_id minted
 *   authenticated → kid completed first payment in checkout
 *   active   → first cycle live; we grant credits + set kid.plan
 *   charged  → monthly renewal; we refresh credits via grantMonthlyCredits
 *   cancelled → kid asked to cancel; we mark planStatus='canceled' but
 *               keep the plan benefits until planExpiresAt
 *   completed → ran out of cycles (total_count reached) — same as cancel
 */

import type { UserPlan } from '@gsi/types';
import { getRazorpayClient } from './client';

const PLAN_SUPPORTED: ReadonlyArray<UserPlan> = ['creator', 'pro'] as const;

/** A subscribable tier. Excludes 'free', 'school', 'admin'. */
export type SubscribablePlan = (typeof PLAN_SUPPORTED)[number];

export function isSubscribablePlan(value: string): value is SubscribablePlan {
  return (PLAN_SUPPORTED as readonly string[]).includes(value);
}

/** Map our UserPlan → Razorpay Plan ID. */
export function resolveRazorpayPlanId(plan: SubscribablePlan, cycle: 'monthly' = 'monthly'): string {
  const key = `RAZORPAY_PLAN_${plan.toUpperCase()}_${cycle.toUpperCase()}`;
  const id = process.env[key];
  if (!id) {
    throw new Error(
      `${key} is not set. Create the plan in the Razorpay dashboard and add the ID to env. ` +
        `See docs/billing-deploy-checklist.md.`,
    );
  }
  return id;
}

export interface CreateSubscriptionInput {
  plan: SubscribablePlan;
  cycle?: 'monthly';
  /** Notes echoed back on every webhook so we can route to the right kid. */
  notes: Record<string, string>;
  /** How many cycles before the subscription ends naturally. Default 12 (yearly). */
  totalCount?: number;
}

export interface CreatedSubscription {
  id: string;
  status: string;
  shortUrl?: string;
  planId: string;
}

/**
 * Create a Razorpay Subscription. The returned `id` is what the client
 * passes to `Razorpay({subscription_id})` in checkout.js — Razorpay
 * handles the recurring mandate setup and emits webhooks on each
 * charge.
 */
export async function createSubscription(
  input: CreateSubscriptionInput,
): Promise<CreatedSubscription> {
  const planId = resolveRazorpayPlanId(input.plan, input.cycle ?? 'monthly');
  const client = getRazorpayClient();

  const sub = await client.subscriptions.create({
    plan_id: planId,
    customer_notify: 1,
    quantity: 1,
    total_count: input.totalCount ?? 12,
    notes: input.notes,
  });

  return {
    id: sub.id,
    status: sub.status,
    shortUrl: sub.short_url ?? undefined,
    planId,
  };
}

/** Fetch a subscription's current state. Used by the webhook handler. */
export async function fetchSubscription(subscriptionId: string): Promise<{
  id: string;
  status: string;
  notes?: Record<string, string>;
  currentStart: number | null;
  currentEnd: number | null;
}> {
  const client = getRazorpayClient();
  const sub = await client.subscriptions.fetch(subscriptionId);
  return {
    id: sub.id,
    status: sub.status,
    notes: (sub.notes as Record<string, string>) ?? undefined,
    currentStart: (sub.current_start as number | null) ?? null,
    currentEnd: (sub.current_end as number | null) ?? null,
  };
}

/**
 * Request cancellation. If `cancelAtCycleEnd` is true (default), the
 * subscription stays active until the current period ends. Set to
 * false for immediate cancellation (rare — used by support to refund).
 */
export async function cancelSubscription(
  subscriptionId: string,
  options: { cancelAtCycleEnd?: boolean } = {},
): Promise<void> {
  const client = getRazorpayClient();
  await client.subscriptions.cancel(subscriptionId, options.cancelAtCycleEnd ?? true);
}
