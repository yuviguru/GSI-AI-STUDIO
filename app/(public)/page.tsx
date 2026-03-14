'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MascotSpeechBubble } from '@/components/mascot/MascotSpeechBubble';
import {
  OnboardingCarousel,
  ONBOARDING_STORAGE_KEY,
} from '@/components/onboarding/OnboardingCarousel';

const floatingItems = [
  { emoji: '🚀', x: '10%', y: '15%', delay: 0, size: 'text-3xl' },
  { emoji: '⭐', x: '85%', y: '10%', delay: 0.3, size: 'text-2xl' },
  { emoji: '🎨', x: '75%', y: '30%', delay: 0.6, size: 'text-3xl' },
  { emoji: '💡', x: '5%', y: '55%', delay: 0.9, size: 'text-2xl' },
  { emoji: '🌈', x: '90%', y: '60%', delay: 1.2, size: 'text-2xl' },
  { emoji: '✏️', x: '15%', y: '75%', delay: 0.4, size: 'text-xl' },
];

const studios = [
  {
    href: '/create/story',
    emoji: '📖',
    title: 'Story Studio',
    description: 'Write & illustrate amazing AI stories',
    cta: 'Launch Story →',
    accentColor: 'text-violet-600',
    accentBg: 'bg-violet-100/60',
    ctaBg: 'bg-violet-50 text-violet-700 hover:bg-violet-100',
  },
  {
    href: '/create/music',
    emoji: '🎵',
    title: 'Music Lab',
    description: 'Create songs & beats with AI',
    cta: 'Launch Music →',
    accentColor: 'text-orange-600',
    accentBg: 'bg-orange-100/60',
    ctaBg: 'bg-orange-50 text-orange-700 hover:bg-orange-100',
  },
  {
    href: '/create/quiz',
    emoji: '🎮',
    title: 'Quiz Maker',
    description: 'Build quizzes & challenge friends',
    cta: 'Launch Quiz →',
    accentColor: 'text-cyan-600',
    accentBg: 'bg-cyan-100/60',
    ctaBg: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100',
  },
  {
    href: '/create/game',
    emoji: '🕹️',
    title: 'Game Studio',
    description: 'Create text adventures with AI',
    cta: 'Launch Game →',
    accentColor: 'text-emerald-600',
    accentBg: 'bg-emerald-100/60',
    ctaBg: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  },
  {
    href: '/create/comic',
    emoji: '🎨',
    title: 'Comic Studio',
    description: 'Draw illustrated comics with AI',
    cta: 'Launch Comic →',
    accentColor: 'text-amber-600',
    accentBg: 'bg-amber-100/60',
    ctaBg: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
  },
];

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function HomePage() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    try {
      const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!completed) {
        setShowOnboarding(true);
      }
    } catch {
      // localStorage unavailable — skip onboarding
    }
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  return (
    <div className="relative overflow-hidden">
      {/* Onboarding overlay for first-time visitors */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingCarousel onComplete={handleOnboardingComplete} />
        )}
      </AnimatePresence>

      {/* Background blobs — softened */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-purple/5 blur-3xl" />
        <div className="absolute -right-32 top-1/3 h-80 w-80 rounded-full bg-brand-orange/5 blur-3xl" />
        <div className="absolute -left-20 bottom-1/4 h-72 w-72 rounded-full bg-brand-cyan/5 blur-3xl" />
      </div>

      {/* Floating emojis — hidden when prefers-reduced-motion */}
      {!prefersReducedMotion && (
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          {floatingItems.map((item, i) => (
            <motion.span
              key={i}
              className={cn('absolute select-none opacity-20', item.size)}
              style={{ left: item.x, top: item.y }}
              animate={{ y: [0, -14, 0] }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                delay: item.delay,
                ease: 'easeInOut',
              }}
            >
              {item.emoji}
            </motion.span>
          ))}
        </div>
      )}

      {/* Hero */}
      <motion.section
        className="px-4 pb-4 pt-10 text-center sm:pt-16"
        variants={staggerContainer}
        initial={prefersReducedMotion ? false : 'hidden'}
        animate="show"
      >
        <motion.div variants={fadeUp}>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            <Rocket className="h-3.5 w-3.5" />
            Free to create — no login needed
          </span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="mx-auto mt-5 max-w-lg font-display text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl"
        >
          Imagine it.{' '}
          <span className="bg-gradient-to-r from-brand-purple via-brand-orange to-brand-cyan bg-clip-text text-transparent">
            AI creates it.
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mx-auto mt-4 max-w-md text-base leading-relaxed text-gray-500 sm:text-lg"
        >
          Build stories, music, quizzes, games & comics with AI — then peek
          behind the curtain to see how it works!
        </motion.p>

        <motion.div variants={fadeUp} className="mt-6 flex justify-center">
          <MascotSpeechBubble
            expression="waving"
            size="md"
            message="Hi! I'm Koko. Let's create something cool!"
            position="right"
          />
        </motion.div>
      </motion.section>

      {/* Studio cards */}
      <motion.section
        className="mx-auto max-w-lg px-4 pb-8 pt-4 sm:max-w-3xl lg:max-w-4xl"
        variants={staggerContainer}
        initial={prefersReducedMotion ? false : 'hidden'}
        animate="show"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {studios.map((studio) => (
            <motion.div key={studio.href} variants={fadeUp}>
              <StudioCard
                {...studio}
                prefersReducedMotion={!!prefersReducedMotion}
              />
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Beat the AI challenge card */}
      <motion.section
        className="mx-auto max-w-lg px-4 pb-6 sm:max-w-3xl"
        variants={staggerContainer}
        initial={prefersReducedMotion ? false : 'hidden'}
        animate="show"
      >
        <motion.div variants={fadeUp}>
          <Link
            href="/beat-the-ai"
            className="group block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
            aria-label="Beat the AI challenge"
          >
            <div className="relative overflow-hidden rounded-3xl border border-brand-warm-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100/60 text-3xl">
                  🤖
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-base font-bold text-gray-900">
                    Beat the AI
                  </h3>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Can your creativity beat artificial intelligence?
                  </p>
                </div>
                <span className="text-sm font-semibold text-purple-600 transition-transform group-hover:translate-x-1">
                  Accept Challenge →
                </span>
              </div>
            </div>
          </Link>
        </motion.div>
      </motion.section>

      {/* MindX Skill Arena card */}
      <motion.section
        className="mx-auto max-w-lg px-4 pb-6 sm:max-w-3xl"
        variants={staggerContainer}
        initial={prefersReducedMotion ? false : 'hidden'}
        animate="show"
      >
        <motion.div variants={fadeUp}>
          <Link
            href="/skill-arena"
            className="group block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
            aria-label="MindX Skill Arena"
          >
            <div className="relative overflow-hidden rounded-3xl border border-brand-warm-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-100/60 text-3xl">
                  🧠
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-base font-bold text-gray-900">
                    MindX Skill Arena
                  </h3>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Test your skills and get AI-powered feedback
                  </p>
                </div>
                <span className="text-sm font-semibold text-cyan-600 transition-transform group-hover:translate-x-1">
                  Test Your Skills →
                </span>
              </div>
            </div>
          </Link>
        </motion.div>
      </motion.section>

      {/* Recent Creations — empty state */}
      <section className="mx-auto max-w-lg px-4 pb-10 sm:max-w-3xl">
        <h2 className="font-display text-lg font-bold text-gray-900">
          Recent Creations
        </h2>
        <div className="mt-3 flex flex-col items-center rounded-3xl border-2 border-dashed border-brand-warm-border bg-amber-50/30 px-6 py-10 text-center">
          <span className="text-4xl">🚀</span>
          <p className="mt-3 font-display text-base font-bold text-gray-700">
            No adventures yet!
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Create your first story, song, or game and watch your masterpieces
            appear here.
          </p>
          <Link
            href="/create/story"
            className={cn(
              'mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5',
              'bg-brand-purple text-sm font-semibold text-white',
              'shadow-lg shadow-brand-purple/25',
              'transition-transform hover:scale-105 active:scale-95',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2',
            )}
          >
            Begin Your First Adventure ✨
          </Link>
        </div>
      </section>
    </div>
  );
}

function StudioCard({
  href,
  emoji,
  title,
  description,
  cta,
  accentBg,
  ctaBg,
  prefersReducedMotion,
}: {
  href: string;
  emoji: string;
  title: string;
  description: string;
  cta: string;
  accentColor: string;
  accentBg: string;
  ctaBg: string;
  prefersReducedMotion: boolean;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
      aria-label={title}
    >
      <motion.div
        className={cn(
          'relative rounded-3xl border border-brand-warm-border bg-white p-5 text-center',
          'shadow-sm transition-shadow hover:shadow-md',
        )}
        whileHover={prefersReducedMotion ? undefined : { y: -6, scale: 1.02 }}
        whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <div
          className={cn(
            'mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-3xl',
            accentBg,
          )}
        >
          {emoji}
        </div>

        <h3 className="mt-3 font-display text-base font-bold text-gray-900">
          {title}
        </h3>
        <p className="mt-1 text-sm leading-snug text-gray-400">
          {description}
        </p>

        <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-500">
          ⭐ +10 XP
        </span>

        <div
          className={cn(
            'mt-3 flex h-12 items-center justify-center rounded-full text-sm font-semibold transition-colors',
            ctaBg,
          )}
        >
          {cta}
        </div>
      </motion.div>
    </Link>
  );
}
