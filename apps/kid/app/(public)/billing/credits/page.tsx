'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCredits, type CreditsLedgerEntry } from '@/hooks/useCredits';
import { TopupModal } from '@/components/billing/TopupModal';
import { SubscribeModal } from '@/components/billing/SubscribeModal';
import { useAuth } from '@/hooks/useAuth';
import { useKidProfile } from '@/hooks/useKidProfile';
import { fetchWithKidAuth } from '@/lib/fetchWithKidAuth';

/**
 * /billing/credits — wallet page.
 *
 * Shows the current balance, monthly reset countdown, recent ledger
 * history, and a Buy CTA that opens TopupModal. Requires a signed-in
 * parent with an active kid; anonymous flows get a sign-in prompt.
 *
 * Lives in the `(public)` route group so the GameNavBar + auth/kid
 * context providers from `(public)/layout.tsx` wrap this page.
 */
export default function CreditsPage() {
  const { isAuthenticated, loading: authLoading, getIdToken } = useAuth();
  const { activeKid, loading: kidLoading } = useKidProfile();
  const { snapshot, balance, isLoading, error, refresh } = useCredits();
  const [topupOpen, setTopupOpen] = useState(false);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const stillResolving = authLoading || kidLoading || (isAuthenticated && activeKid && isLoading);

  const handleCancel = async () => {
    if (!activeKid) return;
    if (!confirm('Cancel subscription? Plan benefits stay until the period ends.')) return;
    setCancelLoading(true);
    setCancelError(null);
    try {
      const res = await fetchWithKidAuth(
        '/api/billing/razorpay/cancel-subscription',
        { getIdToken, kidId: activeKid.id },
        { method: 'POST', body: JSON.stringify({ kidId: activeKid.id }) },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Could not cancel');
      await refresh();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Could not cancel');
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <h1 className="font-display text-3xl font-bold text-brand-text">AI Coins</h1>
          <p className="mt-1 text-sm text-gray-500">
            Spend coins on AI generation. Monthly plan credits expire each cycle; purchased
            coins never expire.
          </p>
        </header>

        {!isAuthenticated && !authLoading && (
          <SignInPrompt />
        )}

        {isAuthenticated && !activeKid && !kidLoading && (
          <p className="rounded-xl bg-amber-50 p-6 text-sm text-amber-800">
            Pick a kid profile first — coins are tracked per kid.
          </p>
        )}

        {stillResolving && (
          <p className="rounded-xl bg-gray-50 p-6 text-sm text-gray-500">Loading wallet…</p>
        )}

        {error && (
          <p className="rounded-xl bg-red-50 p-6 text-sm text-red-700">{error}</p>
        )}

        {snapshot && (
          <>
            <BalanceCard
              balance={balance}
              plan={snapshot.plan}
              monthlyResetAt={snapshot.creditsMonthlyResetAt}
              monthlyGrant={snapshot.creditsMonthlyGrantAmount}
              onBuy={() => setTopupOpen(true)}
            />

            <PlanSection
              currentPlan={snapshot.plan}
              onSubscribe={() => setSubscribeOpen(true)}
              onCancel={handleCancel}
              cancelLoading={cancelLoading}
              cancelError={cancelError}
            />

            <section className="mt-8">
              <h2 className="mb-3 font-display text-lg font-bold text-brand-text">Recent activity</h2>
              <LedgerSection
                kidId={snapshot.kidId}
                initialEntries={snapshot.recentLedger}
                initialCursor={snapshot.nextCursor}
              />
            </section>
          </>
        )}

        <TopupModal open={topupOpen} onClose={() => setTopupOpen(false)} />
        <SubscribeModal open={subscribeOpen} onClose={() => setSubscribeOpen(false)} />
    </main>
  );
}

function SignInPrompt() {
  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
      <p className="text-base text-gray-600">Sign in to see your AI Coins wallet.</p>
      <Link
        href="/auth/signin"
        className="mt-4 inline-flex items-center rounded-full bg-indigo-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-indigo-700"
      >
        Sign in
      </Link>
    </div>
  );
}

interface BalanceCardProps {
  balance: number;
  plan: string;
  monthlyResetAt: string | null;
  monthlyGrant: number;
  onBuy: () => void;
}

function BalanceCard({ balance, plan, monthlyResetAt, monthlyGrant, onBuy }: BalanceCardProps) {
  const resetDate = monthlyResetAt ? new Date(monthlyResetAt) : null;
  const daysToReset = resetDate ? Math.max(0, Math.ceil((resetDate.getTime() - Date.now()) / 86_400_000)) : null;

  return (
    <section className="rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 p-6 text-white shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-indigo-100">Balance</p>
          <p className="mt-1 font-mono text-4xl font-bold">
            🪙 {balance.toLocaleString()}
          </p>
          <p className="mt-2 text-xs text-indigo-100">
            <span className="font-semibold uppercase">{plan}</span> plan
            {monthlyGrant > 0 && ` · ${monthlyGrant.toLocaleString()} coins/month`}
            {daysToReset !== null && ` · Resets in ${daysToReset}d`}
          </p>
        </div>
        <button
          onClick={onBuy}
          className="rounded-full bg-white px-5 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
        >
          Buy coins
        </button>
      </div>
    </section>
  );
}

interface PlanSectionProps {
  currentPlan: string;
  onSubscribe: () => void;
  onCancel: () => void;
  cancelLoading: boolean;
  cancelError: string | null;
}

function PlanSection({ currentPlan, onSubscribe, onCancel, cancelLoading, cancelError }: PlanSectionProps) {
  const isFree = currentPlan === 'free';
  const isPaid = currentPlan === 'creator' || currentPlan === 'pro';

  return (
    <section className="mt-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <h2 className="font-display text-lg font-bold text-brand-text">
        {isPaid ? 'Your plan' : 'Upgrade your plan'}
      </h2>
      {isFree ? (
        <>
          <p className="mt-1 text-sm text-gray-600">
            You&apos;re on the <strong>Free</strong> plan. Upgrade for more monthly coins and
            priority AI.
          </p>
          <button
            onClick={onSubscribe}
            className="mt-3 rounded-full bg-indigo-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-indigo-700"
          >
            See plans
          </button>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-gray-600">
            You&apos;re subscribed to the <strong className="uppercase">{currentPlan}</strong> plan.
            Monthly credits land automatically.
          </p>
          <button
            onClick={onCancel}
            disabled={cancelLoading}
            className="mt-3 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLoading ? 'Cancelling…' : 'Cancel subscription'}
          </button>
          {cancelError && (
            <p className="mt-2 text-xs text-red-600">{cancelError}</p>
          )}
        </>
      )}
    </section>
  );
}

interface LedgerSectionProps {
  kidId: string;
  initialEntries: CreditsLedgerEntry[];
  initialCursor: string | null;
}

/**
 * Self-managing ledger list with "Load more" pagination. Owns the
 * accumulated entries + next-cursor + loading state so the page itself
 * doesn't have to thread it.
 */
function LedgerSection({ kidId, initialEntries, initialCursor }: LedgerSectionProps) {
  const { getIdToken } = useAuth();
  const [entries, setEntries] = useState<CreditsLedgerEntry[]>(initialEntries);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMore = async () => {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const url = `/api/billing/credits?kidId=${encodeURIComponent(kidId)}&before=${encodeURIComponent(cursor)}`;
      const res = await fetchWithKidAuth(url, { getIdToken, kidId }, { method: 'GET' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Could not load more');
      const data = json.data as {
        recentLedger: CreditsLedgerEntry[];
        nextCursor: string | null;
      };
      setEntries((prev) => [...prev, ...data.recentLedger]);
      setCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load more entries');
    } finally {
      setLoading(false);
    }
  };

  if (entries.length === 0) {
    return (
      <p className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">
        No activity yet. Start creating to see entries here.
      </p>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-gray-100 rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        {entries.map((e) => (
          <li key={e.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">{describeEntry(e)}</p>
              <p className="text-xs text-gray-400">{formatDate(e.createdAt)}</p>
            </div>
            <p
              className={`font-mono text-sm font-bold ${
                e.amount >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {e.amount >= 0 ? '+' : ''}
              {e.amount}
            </p>
          </li>
        ))}
      </ul>
      {error && (
        <p className="mt-2 text-center text-xs text-red-600">{error}</p>
      )}
      {cursor && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="mt-3 w-full rounded-xl border border-gray-200 bg-white py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}

function describeEntry(e: CreditsLedgerEntry): string {
  switch (e.type) {
    case 'grant':
      return 'Monthly plan grant';
    case 'topup':
      return 'Purchased coins';
    case 'bonus':
      return 'Bonus coins';
    case 'refund':
      return 'Refund';
    case 'expire':
      return 'Monthly grant expired';
    case 'debit':
      return e.feature ? `Spent on ${e.feature}` : 'AI usage';
    default:
      return e.type;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
