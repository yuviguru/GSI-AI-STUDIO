'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCredits, type CreditsLedgerEntry } from '@/hooks/useCredits';
import { TopupModal } from '@/components/billing/TopupModal';
import { useAuth } from '@/hooks/useAuth';
import { useKidProfile } from '@/hooks/useKidProfile';

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
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { activeKid, loading: kidLoading } = useKidProfile();
  const { snapshot, balance, isLoading, error } = useCredits();
  const [topupOpen, setTopupOpen] = useState(false);

  const stillResolving = authLoading || kidLoading || (isAuthenticated && activeKid && isLoading);

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

            <section className="mt-8">
              <h2 className="mb-3 font-display text-lg font-bold text-brand-text">Recent activity</h2>
              <LedgerList entries={snapshot.recentLedger} />
            </section>
          </>
        )}

        <TopupModal open={topupOpen} onClose={() => setTopupOpen(false)} />
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

function LedgerList({ entries }: { entries: CreditsLedgerEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">
        No activity yet. Start creating to see entries here.
      </p>
    );
  }
  return (
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
