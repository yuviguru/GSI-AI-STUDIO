'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Coins, Gift, Heart, ShoppingBag, Sparkles } from 'lucide-react';

/**
 * BOOK-006 — kid-facing royalties dashboard.
 *
 * Renders entirely from in-component placeholders for now. Once BOOK-004
 * Phase 2 ships real sales, the four values (balance, lifetime, KIT total,
 * KIT-share-of-revenue) will be wired to `useRoyaltyBalance` and
 * `useKitFund` hooks (planned in BOOK-004's API spec). Until then, ₹0 is
 * the honest answer — no fake numbers.
 */
export function RoyaltiesClient() {
  // Phase 1 — all values are zero. Wired to real hooks in BOOK-004 Phase 2.
  const balanceInr = 0;
  const lifetimeInr = 0;
  const kitTotalInr = 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-orange-50">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        {/* Back link */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-amber-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to studio
          </Link>
        </div>

        {/* Header */}
        <header className="mb-6 text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-md">
            <Coins className="h-7 w-7 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-gray-900">
            Your Royalties
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Earn from books you sell. Part of every sale supports KIT — kids who
            don&apos;t have books.
          </p>
        </header>

        {/* Balance summary */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <BalanceCard
            label="Current balance"
            valueInr={balanceInr}
            tone="amber"
            tagline="Ready to redeem when sales unlock."
          />
          <BalanceCard
            label="Lifetime earned"
            valueInr={lifetimeInr}
            tone="violet"
            tagline="Total across every book you've sold."
          />
        </section>

        {/* What you can do */}
        <section className="mt-8">
          <h2 className="font-display text-lg font-bold text-gray-900">
            What you can do with royalties
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Real-money redemption opens once GSI&apos;s buying flow is live. Here&apos;s
            what&apos;s planned:
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <RedemptionCard
              icon={<Coins className="h-7 w-7" />}
              gradient="from-emerald-200 to-teal-100"
              accent="text-emerald-700"
              title="Cash to parent's bank"
              description="Withdraw to a verified parent bank account in INR."
            />
            <RedemptionCard
              icon={<ShoppingBag className="h-7 w-7" />}
              gradient="from-violet-200 to-indigo-100"
              accent="text-violet-700"
              title="GSI Merch"
              description="Stickers, T-shirts, hardcover prints of your book."
            />
            <RedemptionCard
              icon={<Heart className="h-7 w-7" />}
              gradient="from-rose-200 to-pink-100"
              accent="text-rose-700"
              title="Donate extra to KIT"
              description="Send more from your balance to kids without books."
            />
          </div>
        </section>

        {/* KIT explainer */}
        <section className="mt-10 overflow-hidden rounded-3xl bg-gradient-to-br from-rose-50 via-amber-50 to-yellow-50 p-6 shadow-card ring-1 ring-rose-100">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 shadow-md">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-xl font-bold text-gray-900">
                About KIT
              </h2>
              <p className="mt-1 text-sm text-gray-700">
                <strong>KIT (Kids In Tomorrow)</strong> is a fund that buys books,
                learning materials, and GSI AI Studio access for kids who don&apos;t
                have them.
              </p>
              <p className="mt-2 text-sm text-gray-700">
                Every book sold on GSI sends a share to KIT — automatically, no
                extra step from you. When you sell, you&apos;re helping another kid
                make their first book.
              </p>
              <div className="mt-4 rounded-2xl bg-white/70 p-4 ring-1 ring-rose-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                  KIT total raised so far
                </div>
                <div className="mt-1 font-mono text-3xl font-extrabold text-gray-900">
                  ₹ {kitTotalInr.toLocaleString('en-IN')}
                </div>
                <div className="mt-1 text-[11px] text-gray-500">
                  Updates the moment a sale completes.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer status */}
        <p className="mt-8 text-center text-xs text-gray-500">
          Selling and redeeming will go live as the GSI Bookshop launches. Until
          then this page tracks the setup.
        </p>
      </div>
    </div>
  );
}

interface BalanceCardProps {
  label: string;
  valueInr: number;
  tone: 'amber' | 'violet';
  tagline: string;
}

function BalanceCard({ label, valueInr, tone, tagline }: BalanceCardProps) {
  const toneClasses = {
    amber: 'from-amber-100 to-orange-50 ring-amber-200',
    violet: 'from-violet-100 to-indigo-50 ring-violet-200',
  }[tone];
  const accent = {
    amber: 'text-amber-700',
    violet: 'text-violet-700',
  }[tone];
  return (
    <div className={`rounded-2xl bg-gradient-to-br p-5 shadow-card ring-1 ${toneClasses}`}>
      <div className={`text-[10px] font-bold uppercase tracking-wider ${accent}`}>
        {label}
      </div>
      <div className="mt-1 font-mono text-4xl font-extrabold text-gray-900">
        ₹ {valueInr.toLocaleString('en-IN')}
      </div>
      <p className="mt-2 text-xs text-gray-600">{tagline}</p>
    </div>
  );
}

interface RedemptionCardProps {
  icon: React.ReactNode;
  gradient: string;
  accent: string;
  title: string;
  description: string;
}

function RedemptionCard({ icon, gradient, accent, title, description }: RedemptionCardProps) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="relative overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-gray-100"
    >
      <div
        className={`flex h-24 items-center justify-center bg-gradient-to-br ${gradient} ${accent}`}
      >
        {icon}
      </div>
      <div className="px-4 pb-4 pt-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-sm font-bold text-gray-900">{title}</h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Coming Soon
          </span>
        </div>
        <p className="mt-1 text-xs leading-snug text-gray-600">{description}</p>
      </div>
      {/* Disabled overlay so taps don't go anywhere yet */}
      <button
        type="button"
        disabled
        aria-label={`${title} — coming soon`}
        className="absolute inset-0 cursor-not-allowed"
      />
    </motion.div>
  );
}
