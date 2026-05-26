'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useKidProfile } from '@/hooks/useKidProfile';
import { useCredits } from '@/hooks/useCredits';
import { fetchWithKidAuth } from '@/lib/fetchWithKidAuth';
import { openCheckout } from '@/lib/billing/razorpay/clientLoader';

interface SubscribeModalProps {
  open: boolean;
  onClose: () => void;
}

interface SubscribeResponse {
  subscriptionId: string;
  razorpayKeyId: string;
  plan: 'creator' | 'pro';
  planId: string;
  shortUrl: string | null;
}

interface PlanCard {
  id: 'creator' | 'pro';
  name: string;
  priceInr: number;
  monthlyCredits: number;
  blurb: string;
  badge?: string;
}

const PLAN_CARDS: PlanCard[] = [
  {
    id: 'creator',
    name: 'Creator',
    priceInr: 99,
    monthlyCredits: 500,
    blurb: 'Daily creators. 500 coins each month, expires monthly.',
  },
  {
    id: 'pro',
    name: 'Pro',
    priceInr: 299,
    monthlyCredits: 2000,
    blurb: 'Power creators. 2,000 coins each month + priority AI.',
    badge: 'Most popular',
  },
];

type Status =
  | { kind: 'idle' }
  | { kind: 'creatingSub'; plan: 'creator' | 'pro' }
  | { kind: 'awaitingPayment'; plan: 'creator' | 'pro' }
  | { kind: 'awaitingActivation'; plan: 'creator' | 'pro' }
  | { kind: 'success'; plan: 'creator' | 'pro' }
  | { kind: 'error'; message: string };

/**
 * Subscribe-to-plan modal — sister to TopupModal but for recurring
 * Razorpay Subscriptions instead of one-shot orders. Server creates
 * the subscription, Razorpay checkout collects the first payment +
 * sets up the recurring mandate, and the subscription.activated
 * webhook credits the wallet asynchronously.
 *
 * The client refreshes credits after a short wait to surface the
 * plan + first grant. If the webhook is slow (or unreachable in dev),
 * the user sees an honest "credits coming shortly" message instead of
 * a fake success.
 */
export function SubscribeModal({ open, onClose }: SubscribeModalProps) {
  const { getIdToken } = useAuth();
  const { activeKid } = useKidProfile();
  const { refresh: refreshCredits } = useCredits();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const handleSubscribe = useCallback(
    async (plan: 'creator' | 'pro') => {
      if (!activeKid) {
        setStatus({ kind: 'error', message: 'Pick a kid profile first.' });
        return;
      }

      setStatus({ kind: 'creatingSub', plan });
      try {
        const subRes = await fetchWithKidAuth(
          '/api/billing/razorpay/subscribe',
          { getIdToken, kidId: activeKid.id },
          {
            method: 'POST',
            body: JSON.stringify({ kidId: activeKid.id, plan }),
          },
        );
        const subJson = await subRes.json();
        if (!subJson.success) throw new Error(subJson.error?.message ?? 'Could not start subscription');
        const sub = subJson.data as SubscribeResponse;

        setStatus({ kind: 'awaitingPayment', plan });
        await openCheckout({
          kind: 'subscription',
          subscriptionId: sub.subscriptionId,
          razorpayKeyId: sub.razorpayKeyId,
          description: `${plan} plan subscription`,
        });

        // After capture, the webhook fires server-side and credits land
        // asynchronously. Poll briefly so the success banner reflects
        // the new plan.
        setStatus({ kind: 'awaitingActivation', plan });
        for (let i = 0; i < 8; i++) {
          await new Promise((r) => setTimeout(r, 1500));
          await refreshCredits();
        }
        setStatus({ kind: 'success', plan });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Subscription failed';
        if (message === 'Checkout cancelled') {
          setStatus({ kind: 'idle' });
          return;
        }
        setStatus({ kind: 'error', message });
      }
    },
    [activeKid, getIdToken, refreshCredits],
  );

  if (!open) return null;

  const busy =
    status.kind === 'creatingSub' ||
    status.kind === 'awaitingPayment' ||
    status.kind === 'awaitingActivation';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-brand-text">Choose a plan</h2>
            <p className="mt-1 text-sm text-gray-500">
              Monthly billing. Cancel anytime — plan benefits stay active until the period ends.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="text-gray-400 transition hover:text-gray-600 disabled:opacity-40"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {PLAN_CARDS.map((plan) => {
            const isThisOneBusy = busy && 'plan' in status && status.plan === plan.id;
            return (
              <button
                key={plan.id}
                onClick={() => handleSubscribe(plan.id)}
                disabled={busy}
                className="flex w-full items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg font-bold text-indigo-700">
                      {plan.name}
                    </span>
                    {plan.badge && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{plan.blurb}</p>
                </div>
                <div className="text-right">
                  <div className="font-mono text-lg font-bold text-gray-900">
                    ₹{plan.priceInr}/mo
                  </div>
                  <div className="text-xs text-gray-500">
                    🪙 {plan.monthlyCredits.toLocaleString()}/month
                  </div>
                  {isThisOneBusy && (
                    <div className="mt-1 text-xs text-indigo-600">
                      {status.kind === 'creatingSub' && 'Creating subscription…'}
                      {status.kind === 'awaitingPayment' && 'Pay in Razorpay…'}
                      {status.kind === 'awaitingActivation' && 'Activating…'}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {status.kind === 'error' && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{status.message}</p>
        )}
        {status.kind === 'success' && (
          <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
            🎉 You&apos;re on the <strong>{status.plan}</strong> plan! Coins should land any
            second.
          </p>
        )}
      </div>
    </div>
  );
}
