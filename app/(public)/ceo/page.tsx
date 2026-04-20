'use client';

import Link from 'next/link';
import { useCeoBusinesses } from '@/hooks/useCeoBusinesses';
import { MascotSpeechBubble } from '@/components/mascot/MascotSpeechBubble';
import { TelegramConnectButton } from '@/components/ceo/TelegramConnectButton';
import { PHASE_LABELS } from '@/lib/ceo/constants';
import { ArrowRight, Plus, Send, Sparkles, Trophy } from 'lucide-react';
import type { CeoBusiness } from '@/types';

const FEATURES = [
  {
    emoji: '🏪',
    title: 'Pick a business',
    desc: 'Lemonade stand, t-shirt shop, game studio — or invent your own.',
  },
  {
    emoji: '🧠',
    title: 'Make decisions',
    desc: 'Real events pop up. Your choices shape the story.',
  },
  {
    emoji: '🧬',
    title: 'Discover your CEO DNA',
    desc: 'Unlock a shareable profile of how you think as a founder.',
  },
];

const MAX_CONCURRENT_ACTIVE = 5;

export default function CeoLandingPage() {
  const { activeBusinesses, completedBusinesses, loading, error } = useCeoBusinesses({
    autoFetch: true,
  });

  const canStartNew = activeBusinesses.length < MAX_CONCURRENT_ACTIVE;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-primary via-purple-500 to-purple-700 px-4 py-12 text-white sm:py-16">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute left-10 top-10 h-40 w-40 rounded-full bg-white blur-3xl" />
          <div className="absolute right-10 bottom-10 h-48 w-48 rounded-full bg-yellow-300 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-5xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            For kids age 10+
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Kid CEO
          </h1>
          <p className="mt-3 text-xl text-white/90 sm:text-2xl">
            Run your first business before you spend a rupee.
          </p>

          <div className="mt-8 flex justify-center">
            <MascotSpeechBubble
              message="Ready to start your business? You'll learn how real founders think — through your own choices."
              expression="waving"
              size="md"
              position="right"
            />
          </div>

          {error && (
            <div className="mx-auto mt-6 max-w-md rounded-lg bg-white/15 px-4 py-2 text-sm text-white/90">
              {error}
            </div>
          )}
        </div>
      </section>

      {/* Businesses list */}
      <section className="mx-auto max-w-5xl px-4 py-10">
        {loading ? (
          <BusinessListSkeleton />
        ) : activeBusinesses.length === 0 && completedBusinesses.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Connect banner — surfaces cross-channel sync for kids who
             *  may have already started a business inside @GSIKidCeoAssistantBot
             *  but don't see it here yet. Migration runs when they tap Connect. */}
            <ConnectBanner />

            {activeBusinesses.length > 0 && (
              <>
                <div className="mb-3 flex items-end justify-between gap-2">
                  <h2 className="font-display text-2xl font-bold text-brand-text">
                    Your businesses
                  </h2>
                  <span className="text-xs text-brand-text-secondary">
                    {activeBusinesses.length} of {MAX_CONCURRENT_ACTIVE} active
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {activeBusinesses.map((b) => (
                    <ActiveBusinessCard key={b.id} business={b} />
                  ))}
                  {canStartNew && <StartNewCard />}
                </div>
                {!canStartNew && (
                  <p className="mt-3 text-center text-xs text-brand-text-secondary">
                    You&apos;ve hit the {MAX_CONCURRENT_ACTIVE}-active limit.
                    Finish or pause one before starting a new business.
                  </p>
                )}
              </>
            )}

            {completedBusinesses.length > 0 && (
              <>
                <h2 className="mb-3 mt-10 font-display text-2xl font-bold text-brand-text">
                  Completed
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {completedBusinesses.map((b) => (
                    <CompletedBusinessCard key={b.id} business={b} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </section>

      {/* Feature cards */}
      <section className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="text-4xl" aria-hidden>
                {f.emoji}
              </div>
              <div className="mt-3 font-display text-lg font-bold text-brand-text">
                {f.title}
              </div>
              <p className="mt-1 text-sm text-brand-text-secondary">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Telegram footer */}
      <section className="mx-auto max-w-5xl px-4 pb-12">
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-gray-50 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-brand-text">
                Also on Telegram
              </div>
              <div className="text-xs text-brand-text-secondary">
                Get decision events delivered to your chat.
              </div>
            </div>
          </div>
          <a
            href="https://t.me/GSIKidCeoAssistantBot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
          >
            @GSIKidCeoAssistantBot
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>
    </div>
  );
}

// ─── Cards ────────────────────────────────────────────────────────────────

function ActiveBusinessCard({ business }: { business: CeoBusiness }) {
  return (
    <Link
      href={`/ceo/play?businessId=${business.id}`}
      className="group block rounded-3xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-primary/30 hover:shadow-md"
    >
      <div className="text-xs font-semibold uppercase tracking-wider text-brand-primary">
        Continue
      </div>
      <div className="mt-1 font-display text-xl font-bold text-brand-text">
        {business.businessName}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-green-100 px-2 py-0.5 font-semibold text-green-700">
          ₹{business.currentCash.toLocaleString('en-IN')}
        </span>
        <span className="rounded-full bg-purple-100 px-2 py-0.5 font-semibold text-purple-700">
          {PHASE_LABELS[business.phase]}
        </span>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 font-semibold text-blue-700">
          {business.totalDecisions} decision{business.totalDecisions === 1 ? '' : 's'}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-end gap-1 text-sm font-semibold text-brand-primary">
        Play
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function CompletedBusinessCard({ business }: { business: CeoBusiness }) {
  return (
    <Link
      href={`/ceo/play?businessId=${business.id}`}
      className="group block rounded-3xl border border-gray-100 bg-white/60 p-5 opacity-90 shadow-sm transition hover:opacity-100 hover:shadow-md"
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600">
        <Trophy className="h-3.5 w-3.5" />
        Completed
      </div>
      <div className="mt-1 font-display text-xl font-bold text-brand-text">
        {business.businessName}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-brand-text-secondary">
        <span>{business.totalDecisions} decisions</span>
        <span>·</span>
        <span>{PHASE_LABELS[business.phase]}</span>
      </div>
      <div className="mt-4 flex items-center justify-end gap-1 text-sm font-semibold text-brand-text-secondary">
        View profile
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function StartNewCard() {
  return (
    <Link
      href="/ceo/register"
      className="group flex items-center justify-center rounded-3xl border-2 border-dashed border-brand-primary/30 bg-brand-primary/5 p-5 text-center transition hover:border-brand-primary hover:bg-brand-primary/10"
    >
      <div>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary text-white">
          <Plus className="h-6 w-6" />
        </div>
        <div className="mt-3 font-display text-lg font-bold text-brand-primary">
          Start a new business
        </div>
        <div className="mt-1 text-xs text-brand-text-secondary">
          Takes about 2 minutes to set up.
        </div>
      </div>
    </Link>
  );
}

function ConnectBanner() {
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-sky-100 bg-sky-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
          <Send className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-sky-900">
            Playing in Telegram too?
          </div>
          <div className="text-xs text-sky-800/80">
            Connect your bot chat to see all your businesses here and on Telegram.
          </div>
        </div>
      </div>
      <div className="shrink-0">
        <TelegramConnectButton label="Connect Telegram" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
      <div className="text-5xl" aria-hidden>
        🏪
      </div>
      <h2 className="mt-4 font-display text-2xl font-bold text-brand-text">
        Start your first business
      </h2>
      <p className="mt-2 text-sm text-brand-text-secondary">
        Pick a type, name it, set your pace. Your first decision arrives in seconds.
      </p>
      <Link
        href="/ceo/register"
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-brand-primary px-6 py-3 font-display text-base font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        Start Your Business
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function BusinessListSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-36 animate-pulse rounded-3xl bg-gray-100"
          aria-hidden
        />
      ))}
    </div>
  );
}
