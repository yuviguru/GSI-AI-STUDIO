'use client';

import Link from 'next/link';
import { useCeoBusiness } from '@/hooks/useCeoBusiness';
import { MascotSpeechBubble } from '@/components/mascot/MascotSpeechBubble';
import { ArrowRight, Send, Sparkles } from 'lucide-react';

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

export default function CeoLandingPage() {
  const { business, loading, error } = useCeoBusiness({ autoFetch: true });

  const hasActiveBusiness = business && business.status === 'active';

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

          {/* Primary CTA area */}
          <div className="mt-10">
            {loading ? (
              <div className="mx-auto flex max-w-md flex-col gap-3">
                <div className="h-14 animate-pulse rounded-2xl bg-white/20" />
                <div className="h-4 animate-pulse rounded bg-white/10" />
              </div>
            ) : hasActiveBusiness ? (
              <div className="mx-auto max-w-md">
                <Link
                  href={`/ceo/play?businessId=${business.id}`}
                  className="block rounded-3xl bg-white p-6 text-left text-brand-text shadow-2xl transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(0,0,0,0.25)]"
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-brand-primary">
                    Continue your journey
                  </div>
                  <div className="mt-1 font-display text-2xl font-bold">
                    {business.businessName}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-sm text-brand-text-secondary">
                    <span className="rounded-full bg-green-100 px-2 py-0.5 font-semibold text-green-700">
                      ₹{business.currentCash.toLocaleString('en-IN')}
                    </span>
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 font-semibold capitalize text-purple-700">
                      {business.phase.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-1 text-sm font-semibold text-brand-primary">
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>

                <Link
                  href="/ceo/register"
                  className="mt-3 inline-block text-sm font-medium text-white/80 underline-offset-2 hover:text-white hover:underline"
                >
                  Start a new one
                </Link>
              </div>
            ) : (
              <div className="mx-auto max-w-md">
                {error && (
                  <div className="mb-4 rounded-lg bg-white/15 px-4 py-2 text-sm text-white/90">
                    {error}
                  </div>
                )}
                <Link
                  href="/ceo/register"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 font-display text-lg font-bold text-brand-primary shadow-2xl transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(0,0,0,0.25)]"
                >
                  Start Your Business
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <p className="mt-3 text-sm text-white/80">
                  Takes about 2 minutes to set up.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mx-auto max-w-5xl px-4 py-12">
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
              <p className="mt-1 text-sm text-brand-text-secondary">
                {f.desc}
              </p>
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
