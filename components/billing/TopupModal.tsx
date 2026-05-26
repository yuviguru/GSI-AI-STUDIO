'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useKidProfile } from '@/hooks/useKidProfile';
import { useCredits } from '@/hooks/useCredits';
import { fetchWithKidAuth } from '@/lib/fetchWithKidAuth';
import { openCheckout } from '@/lib/billing/razorpay/clientLoader';
import type { TopupBundle } from '@/lib/billing/razorpay';

interface TopupModalProps {
  open: boolean;
  onClose: () => void;
}

interface OrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  razorpayKeyId: string;
  purpose: string;
  displayLines: Array<{ label: string; amount: string }>;
}

interface VerifyResponse {
  kidId: string;
  creditsAdded: number;
  creditBalance: number;
  duplicate: boolean;
}

/**
 * Status state machine for the topup flow:
 *
 *   idle ──[user clicks bundle]── creatingOrder ── awaitingPayment
 *                                                      │
 *           ┌──────────────[checkout dismissed]────────┘
 *           ▼                                          │
 *   error('cancelled')              [payment captured] ▼
 *                                                  verifying
 *                                                      │
 *                                       ┌──────────────┴───────────┐
 *                                       ▼                          ▼
 *                                  success(balance)            error(...)
 */
type Status =
  | { kind: 'idle' }
  | { kind: 'loadingCatalog' }
  | { kind: 'creatingOrder'; sku: string }
  | { kind: 'awaitingPayment'; sku: string }
  | { kind: 'verifying'; sku: string }
  | { kind: 'success'; sku: string; newBalance: number; added: number }
  | { kind: 'error'; message: string };

export function TopupModal({ open, onClose }: TopupModalProps) {
  const { getIdToken } = useAuth();
  const { activeKid } = useKidProfile();
  const { refresh: refreshCredits } = useCredits();

  const [topups, setTopups] = useState<TopupBundle[]>([]);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  useEffect(() => {
    if (!open) {
      setStatus({ kind: 'idle' });
      return;
    }
    let cancelled = false;
    setStatus({ kind: 'loadingCatalog' });
    fetch('/api/billing/topups')
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.success) throw new Error(json.error?.message ?? 'Failed to load topups');
        setTopups(json.data.topups as TopupBundle[]);
        setStatus({ kind: 'idle' });
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus({ kind: 'error', message: err.message ?? 'Could not load topups' });
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleBuy = useCallback(
    async (bundle: TopupBundle) => {
      if (!activeKid) {
        setStatus({ kind: 'error', message: 'Pick a kid profile first.' });
        return;
      }
      setStatus({ kind: 'creatingOrder', sku: bundle.sku });

      try {
        // ① Create order
        const orderRes = await fetchWithKidAuth(
          '/api/billing/razorpay/order',
          { getIdToken, kidId: activeKid.id },
          {
            method: 'POST',
            body: JSON.stringify({
              kidId: activeKid.id,
              purpose: 'topup',
              topupSku: bundle.sku,
            }),
          },
        );
        const orderJson = await orderRes.json();
        if (!orderJson.success) throw new Error(orderJson.error?.message ?? 'Could not create order');
        const order = orderJson.data as OrderResponse;

        // ② Open Razorpay checkout. Resolves with the signature triple
        // on payment capture; rejects on dismiss.
        setStatus({ kind: 'awaitingPayment', sku: bundle.sku });
        const checkoutResult = await openCheckout({
          orderId: order.orderId,
          razorpayKeyId: order.razorpayKeyId,
          amount: order.amount,
          currency: order.currency,
          description: bundle.displayName,
        });

        // ③ Server-side verify + credit. Authoritative real-time path —
        // doesn't depend on the webhook reaching us.
        setStatus({ kind: 'verifying', sku: bundle.sku });
        const verifyRes = await fetchWithKidAuth(
          '/api/billing/razorpay/verify',
          { getIdToken, kidId: activeKid.id },
          {
            method: 'POST',
            body: JSON.stringify({
              razorpayPaymentId: checkoutResult.paymentId,
              razorpayOrderId: checkoutResult.orderId,
              razorpaySignature: checkoutResult.signature,
            }),
          },
        );
        const verifyJson = await verifyRes.json();
        if (!verifyJson.success) {
          throw new Error(verifyJson.error?.message ?? 'Could not verify payment');
        }
        const verified = verifyJson.data as VerifyResponse;

        // ④ Refresh the SWR cache so the nav badge picks up the new
        // balance immediately. We don't depend on this — the success
        // banner shows the balance from the verify response.
        await refreshCredits();

        setStatus({
          kind: 'success',
          sku: bundle.sku,
          newBalance: verified.creditBalance,
          added: verified.creditsAdded,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Topup failed';
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
    status.kind === 'creatingOrder' ||
    status.kind === 'awaitingPayment' ||
    status.kind === 'verifying';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-brand-text">Buy AI Coins</h2>
            <p className="mt-1 text-sm text-gray-500">
              Bigger packs are better value. All purchases are one-time — no auto-renew.
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

        {status.kind === 'loadingCatalog' && (
          <p className="mt-6 text-center text-sm text-gray-500">Loading packs…</p>
        )}

        {status.kind !== 'loadingCatalog' && (
          <div className="mt-6 space-y-3">
            {topups.map((bundle) => {
              const isThisOneBusy = busy && 'sku' in status && status.sku === bundle.sku;
              return (
                <button
                  key={bundle.sku}
                  onClick={() => handleBuy(bundle)}
                  disabled={busy}
                  className="flex w-full items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg font-bold text-indigo-700">
                        {bundle.displayName}
                      </span>
                      {bundle.badge && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          {bundle.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      ₹{(bundle.priceInr / bundle.credits).toFixed(2)} per coin
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg font-bold text-gray-900">₹{bundle.priceInr}</div>
                    {isThisOneBusy && (
                      <div className="mt-1 text-xs text-indigo-600">
                        {status.kind === 'creatingOrder' && 'Creating order…'}
                        {status.kind === 'awaitingPayment' && 'Pay in Razorpay…'}
                        {status.kind === 'verifying' && 'Verifying…'}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {status.kind === 'error' && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{status.message}</p>
        )}
        {status.kind === 'success' && (
          <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
            🎉 Added {status.added.toLocaleString()} coins! Your new balance is{' '}
            <strong>{status.newBalance.toLocaleString()}</strong>.
          </p>
        )}
      </div>
    </div>
  );
}
