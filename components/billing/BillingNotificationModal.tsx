'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useBillingNotifications } from '@/contexts/BillingNotificationContext';
import { TopupModal } from './TopupModal';

/**
 * Global modal that renders the actionable billing errors raised
 * anywhere in the app (insufficient credits → "Buy coins" CTA;
 * plan-locked capability → "Upgrade plan" CTA).
 *
 * Rendered once at the root layout. Hidden by default.
 */
export function BillingNotificationModal() {
  const { notification, dismiss } = useBillingNotifications();
  const [topupOpen, setTopupOpen] = useState(false);

  if (!notification) return null;

  if (notification.kind === 'insufficient') {
    return (
      <>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="text-3xl" aria-hidden>
                🪙
              </span>
              <div className="flex-1">
                <h2 className="font-display text-lg font-bold text-brand-text">Out of AI Coins</h2>
                <p className="mt-1 text-sm text-gray-600">
                  This action costs <strong>{notification.required}</strong> coins. You have{' '}
                  <strong>{notification.available}</strong>.
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  Top up to keep creating, or wait until next month when your plan refreshes.
                </p>
              </div>
              <button
                onClick={dismiss}
                aria-label="Close"
                className="text-gray-400 transition hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={dismiss}
                className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Not now
              </button>
              <button
                onClick={() => {
                  setTopupOpen(true);
                }}
                className="flex-1 rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700"
              >
                Buy coins
              </button>
            </div>
          </div>
        </div>
        <TopupModal
          open={topupOpen}
          onClose={() => {
            setTopupOpen(false);
            dismiss();
          }}
        />
      </>
    );
  }

  // planLocked
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="text-3xl" aria-hidden>
            ⭐
          </span>
          <div className="flex-1">
            <h2 className="font-display text-lg font-bold text-brand-text">Pro feature</h2>
            <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
            {notification.requiredPlan && (
              <p className="mt-2 text-xs text-gray-500">
                Available on the <strong>{notification.requiredPlan}</strong> plan and above.
              </p>
            )}
          </div>
          <button
            onClick={dismiss}
            aria-label="Close"
            className="text-gray-400 transition hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        <div className="mt-5 flex gap-2">
          <button
            onClick={dismiss}
            className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Not now
          </button>
          <Link
            href={notification.upgradeUrl}
            onClick={dismiss}
            className="flex-1 rounded-full bg-indigo-600 px-4 py-2 text-center text-sm font-bold text-white transition hover:bg-indigo-700"
          >
            See plans
          </Link>
        </div>
      </div>
    </div>
  );
}
