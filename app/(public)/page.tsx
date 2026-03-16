'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Mascot } from '@/components/mascot/Mascot';
import { useAiPoints } from '@/contexts/AiPointsContext';
import {
  OnboardingCarousel,
  ONBOARDING_STORAGE_KEY,
} from '@/components/onboarding/OnboardingCarousel';

/* ─── Studio data ─── */
const studios = [
  { href: '/create/story', emoji: '📖', label: 'Story', color: 'bg-violet-100 text-violet-600' },
  { href: '/create/music', emoji: '🎵', label: 'Music', color: 'bg-orange-100 text-orange-600' },
  { href: '/create/quiz', emoji: '🎮', label: 'Quiz', color: 'bg-cyan-100 text-cyan-600' },
  { href: '/create/game', emoji: '🕹️', label: 'Game', color: 'bg-emerald-100 text-emerald-600' },
  { href: '/create/comic', emoji: '🎨', label: 'Comic', color: 'bg-amber-100 text-amber-600' },
] as const;

/* ─── Animation variants ─── */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

/* ─── Page ─── */
export default function HomePage() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const { totalPoints } = useAiPoints();

  useEffect(() => {
    try {
      const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!completed) setShowOnboarding(true);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  return (
    <div className="min-h-[70vh]">
      {/* Onboarding overlay */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingCarousel onComplete={handleOnboardingComplete} />
        )}
      </AnimatePresence>

      <motion.div
        variants={stagger}
        initial={prefersReducedMotion ? false : 'hidden'}
        animate="show"
      >
        {/* ── Top Banner: Greeting + Level + XP ── */}
        <motion.section
          variants={fadeUp}
          className="border-b border-brand-warm-border px-5 py-5 sm:px-8 sm:py-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Left: Greeting + mascot */}
            <div className="flex items-center gap-3">
              <Mascot expression="waving" size="sm" />
              <div>
                <p className="text-sm text-gray-400">Welcome back,</p>
                <h1 className="font-display text-xl font-extrabold text-gray-900">
                  Hey Explorer!
                </h1>
              </div>
            </div>

            {/* Center: Level display (like "Aggressive Investing Strategy") */}
            <div className="hidden text-center md:block">
              <p className="font-display text-3xl font-extrabold text-gray-900">
                AI Creator
              </p>
              <p className="mt-0.5 text-sm text-gray-400">
                Level 1 &middot; Beginner
              </p>
            </div>

            {/* Right: XP wallet (like "$205.5k YOUR WALLET") */}
            <div className="flex items-center gap-2 rounded-2xl border border-brand-warm-border bg-brand-warm-bg px-4 py-2.5">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Your XP
                </p>
                <p className="font-display text-2xl font-extrabold text-gray-900">
                  {totalPoints}
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── Main Dashboard Grid ── */}
        <div className="grid gap-0 lg:grid-cols-[1fr_340px]">
          {/* ══ Left Column ══ */}
          <div className="border-b border-brand-warm-border p-5 sm:p-8 lg:border-b-0 lg:border-r">
            {/* Featured Studio Card (glassmorphism like the credit card) */}
            <motion.div variants={fadeUp}>
              <Link
                href="/create/story"
                className="group block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
                aria-label="Story Studio"
              >
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500/20 via-emerald-400/15 to-cyan-400/20 p-6 backdrop-blur-sm sm:p-8">
                  {/* Glass overlay */}
                  <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/30" />
                  {/* Decorative circles */}
                  <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
                  <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10" />

                  <div className="relative">
                    <span className="text-5xl">📖</span>
                    <h2 className="mt-3 font-display text-2xl font-extrabold text-gray-900">
                      Story Studio
                    </h2>
                    <p className="mt-1 max-w-xs text-sm text-gray-600">
                      Write & illustrate amazing AI stories with characters, plots & twists
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/60 px-4 py-2 text-sm font-semibold text-teal-700 transition-transform group-hover:translate-x-1">
                      Create Now
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* CTA card (like "Load more funds") */}
            <motion.div variants={fadeUp} className="mt-5">
              <Link
                href="/create/music"
                className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
                aria-label="Start creating"
              >
                <div className="flex items-center gap-4 rounded-2xl bg-brand-warm-peach/40 p-4 transition-colors hover:bg-brand-warm-peach/60">
                  <span className="text-3xl">🎵</span>
                  <div className="flex-1">
                    <p className="font-display text-sm font-bold text-gray-900">
                      Try the Music Lab!
                    </p>
                    <p className="text-xs text-gray-500">
                      Create songs & beats with AI
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-orange-600 transition-transform group-hover:translate-x-1">
                    GO <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            </motion.div>

            {/* Studio quick-access circles (like ETFs / Bonds / NFTs) */}
            <motion.div variants={fadeUp} className="mt-6">
              <div className="flex items-center justify-around sm:justify-start sm:gap-6">
                {studios.map((s) => (
                  <Link
                    key={s.href}
                    href={s.href}
                    className="group flex flex-col items-center gap-1.5"
                    aria-label={s.label}
                  >
                    <div
                      className={cn(
                        'flex h-14 w-14 items-center justify-center rounded-full border border-brand-warm-border bg-white text-2xl shadow-sm transition-transform group-hover:scale-110',
                      )}
                    >
                      {s.emoji}
                    </div>
                    <span className="text-xs font-semibold text-gray-500">
                      {s.label}
                    </span>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Invested Value equivalent: "Your Progress" */}
            <motion.div variants={fadeUp} className="mt-8">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-gray-900">
                  Recent Creations
                </h3>
                <Link
                  href="/creations"
                  className="text-xs font-semibold text-gray-400 hover:text-gray-600"
                >
                  View all <ArrowRight className="ml-0.5 inline h-3 w-3" />
                </Link>
              </div>

              {/* Empty state (like Transactions) */}
              <div className="mt-3 flex flex-col items-center rounded-2xl border border-dashed border-brand-warm-border bg-amber-50/30 px-6 py-8 text-center">
                <span className="text-3xl">🚀</span>
                <p className="mt-2 font-display text-sm font-bold text-gray-700">
                  No adventures yet!
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Your masterpieces will appear here
                </p>
              </div>
            </motion.div>
          </div>

          {/* ══ Right Column ══ */}
          <div className="p-5 sm:p-6">
            {/* "Your Adventures" header (like "Your Assets →") */}
            <motion.div variants={fadeUp}>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-gray-900">
                  Your Adventures
                </h3>
                <ArrowRight className="h-4 w-4 text-gray-300" />
              </div>
            </motion.div>

            {/* Beat the AI card (like "Stocks" card) */}
            <motion.div variants={fadeUp} className="mt-4">
              <Link
                href="/beat-the-ai"
                className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
                aria-label="Beat the AI challenge"
              >
                <div className="rounded-2xl border border-brand-warm-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100/60 text-2xl">
                      🤖
                    </div>
                    <div className="flex-1">
                      <h4 className="font-display text-sm font-bold text-gray-900">
                        Beat the AI
                      </h4>
                      <p className="text-xs text-gray-400">
                        Can your creativity beat AI?
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-purple-600 transition-transform group-hover:translate-x-1">
                      Go <ArrowRight className="ml-0.5 inline h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* MindX card (like another asset) */}
            <motion.div variants={fadeUp} className="mt-3">
              <Link
                href="/skill-arena"
                className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
                aria-label="MindX Skill Arena"
              >
                <div className="rounded-2xl border border-brand-warm-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100/60 text-2xl">
                      🧠
                    </div>
                    <div className="flex-1">
                      <h4 className="font-display text-sm font-bold text-gray-900">
                        MindX Arena
                      </h4>
                      <p className="text-xs text-gray-400">
                        Test your AI skills
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-cyan-600 transition-transform group-hover:translate-x-1">
                      Go <ArrowRight className="ml-0.5 inline h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Explore card */}
            <motion.div variants={fadeUp} className="mt-3">
              <Link
                href="/explore"
                className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
                aria-label="Explore creations"
              >
                <div className="rounded-2xl border border-brand-warm-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100/60 text-2xl">
                      🔍
                    </div>
                    <div className="flex-1">
                      <h4 className="font-display text-sm font-bold text-gray-900">
                        Explore
                      </h4>
                      <p className="text-xs text-gray-400">
                        Discover what others made
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-amber-600 transition-transform group-hover:translate-x-1">
                      Go <ArrowRight className="ml-0.5 inline h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Top Gainers equivalent: Achievements / XP breakdown */}
            <motion.div variants={fadeUp} className="mt-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-gray-900">
                  XP Breakdown
                </h3>
                <ArrowRight className="h-4 w-4 text-gray-300" />
              </div>

              <div className="mt-3 space-y-2.5">
                {[
                  { emoji: '📖', label: 'Story Studio', xp: '+10 XP', change: 'per story', color: 'text-violet-600' },
                  { emoji: '🎵', label: 'Music Lab', xp: '+10 XP', change: 'per song', color: 'text-orange-600' },
                  { emoji: '🤖', label: 'Beat the AI', xp: '+15 XP', change: 'per challenge', color: 'text-purple-600' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-xl px-1 py-1"
                  >
                    <span className="text-xl">{item.emoji}</span>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-700">
                        {item.label}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn('text-xs font-bold', item.color)}>
                        {item.xp}
                      </p>
                      <p className="text-[10px] text-gray-400">{item.change}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
