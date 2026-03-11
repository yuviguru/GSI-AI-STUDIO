'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
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
    gradient: 'from-violet-500 to-purple-600',
    hoverShadow: 'hover:shadow-violet-200',
    bg: 'bg-violet-50',
    hoverRing: 'hover:ring-violet-200',
  },
  {
    href: '/create/music',
    emoji: '🎵',
    title: 'Music Lab',
    description: 'Create songs & beats with AI',
    gradient: 'from-orange-400 to-rose-500',
    hoverShadow: 'hover:shadow-orange-200',
    bg: 'bg-orange-50',
    hoverRing: 'hover:ring-orange-200',
  },
  {
    href: '/create/quiz',
    emoji: '🎮',
    title: 'Quiz Maker',
    description: 'Build quizzes & challenge friends',
    gradient: 'from-cyan-400 to-blue-500',
    hoverShadow: 'hover:shadow-cyan-200',
    bg: 'bg-cyan-50',
    hoverRing: 'hover:ring-cyan-200',
  },
  {
    href: '/create/game',
    emoji: '🕹️',
    title: 'Game Studio',
    description: 'Create text adventures with AI',
    gradient: 'from-emerald-400 to-teal-500',
    hoverShadow: 'hover:shadow-emerald-200',
    bg: 'bg-emerald-50',
    hoverRing: 'hover:ring-emerald-200',
  },
  {
    href: '/create/comic',
    emoji: '🎨',
    title: 'Comic Studio',
    description: 'Draw illustrated comics with AI',
    gradient: 'from-orange-400 to-amber-500',
    hoverShadow: 'hover:shadow-orange-200',
    bg: 'bg-orange-50',
    hoverRing: 'hover:ring-orange-200',
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

      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-purple/8 blur-3xl" />
        <div className="absolute -right-32 top-1/3 h-80 w-80 rounded-full bg-brand-orange/8 blur-3xl" />
        <div className="absolute -left-20 bottom-1/4 h-72 w-72 rounded-full bg-brand-cyan/8 blur-3xl" />
      </div>

      {/* Floating emojis */}
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

      {/* Hero */}
      <motion.section
        className="px-4 pb-4 pt-10 text-center sm:pt-16"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fadeUp}>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-purple/10 px-3 py-1 text-xs font-semibold text-brand-purple">
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
          Build stories, music, quizzes, games & comics with AI — then peek behind the curtain to see how it works!
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
        className="mx-auto max-w-lg px-4 pb-8 pt-4 sm:max-w-3xl lg:max-w-5xl"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {studios.map((studio) => (
            <motion.div key={studio.href} variants={fadeUp}>
              <StudioCard {...studio} />
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Beat the AI challenge card */}
      <motion.section
        className="mx-auto max-w-lg px-4 pb-6 sm:max-w-3xl"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fadeUp}>
          <Link href="/beat-the-ai" className="group block">
            <div className="relative overflow-hidden rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50 p-5 transition-shadow hover:shadow-lg hover:shadow-purple-100">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-3xl">
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
                  Play →
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
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fadeUp}>
          <Link href="/skill-arena" className="group block">
            <div className="relative overflow-hidden rounded-2xl border border-cyan-100 bg-gradient-to-r from-cyan-50 to-blue-50 p-5 transition-shadow hover:shadow-lg hover:shadow-cyan-100">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-100 text-3xl">
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
                  Try →
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
        <div className="mt-3 flex flex-col items-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-6 py-10 text-center">
          <span className="text-4xl">🚀</span>
          <p className="mt-3 font-display text-base font-bold text-gray-700">
            No creations yet!
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Your AI masterpieces will show up here.
          </p>
          <Link
            href="/create/story"
            className={cn(
              'mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5',
              'bg-brand-purple text-sm font-semibold text-white',
              'shadow-lg shadow-brand-purple/25',
              'transition-transform hover:scale-105 active:scale-95',
            )}
          >
            Create Your First Story ✨
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
  gradient,
  hoverShadow,
  bg,
  hoverRing,
}: {
  href: string;
  emoji: string;
  title: string;
  description: string;
  gradient: string;
  hoverShadow: string;
  bg: string;
  hoverRing: string;
}) {
  return (
    <Link href={href} className="group block">
      <motion.div
        className={cn(
          'relative rounded-2xl border border-gray-100 bg-white p-5 text-center',
          'ring-1 ring-transparent transition-shadow',
          hoverRing,
          hoverShadow,
        )}
        whileHover={{ y: -6, scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <div
          className={cn(
            'mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-3xl',
            bg,
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

        <div
          className={cn(
            'mt-4 rounded-full bg-gradient-to-r py-1.5 text-xs font-semibold text-white',
            gradient,
          )}
        >
          Start Creating →
        </div>
      </motion.div>
    </Link>
  );
}
