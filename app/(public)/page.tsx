'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  BookOpen,
  MoreHorizontal,
  Search,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Mascot, type MascotExpression } from '@/components/mascot/Mascot';
import { useAiPoints } from '@/contexts/AiPointsContext';
import { useSession } from '@/hooks/useSession';
import { BADGE_CATALOG } from '@/lib/badges';
import {
  OnboardingCarousel,
  ONBOARDING_STORAGE_KEY,
} from '@/components/onboarding/OnboardingCarousel';

/* ─── Studio data ─── */
const studios = [
  { href: '/create/story', emoji: '📖', label: 'Story', type: 'story', color: 'bg-violet-100', textColor: 'text-violet-700' },
  { href: '/create/music', emoji: '🎵', label: 'Music', type: 'music', color: 'bg-orange-100', textColor: 'text-orange-700' },
  { href: '/create/quiz', emoji: '🎮', label: 'Quiz', type: 'quiz', color: 'bg-cyan-100', textColor: 'text-cyan-700' },
  { href: '/create/game', emoji: '🕹️', label: 'Game', type: 'game', color: 'bg-emerald-100', textColor: 'text-emerald-700' },
  { href: '/create/comic', emoji: '🎨', label: 'Comic', type: 'comic', color: 'bg-amber-100', textColor: 'text-amber-700' },
] as const;

/* ─── Leaderboard placeholder data ─── */
const leaderboard = [
  { rank: 1, name: 'Brody Bellson', xp: 65322, color: 'bg-amber-100' },
  { rank: 2, name: 'Jack Nicklson', xp: 48105, color: 'bg-blue-100' },
  { rank: 3, name: 'Timoty Bell', xp: 21780, color: 'bg-rose-100' },
  { rank: 4, name: 'Aarav Sharma', xp: 19231 },
  { rank: 5, name: 'Diya Patel', xp: 15322 },
  { rank: 6, name: 'Arjun Kumar', xp: 15101 },
  { rank: 7, name: 'Ananya Reddy', xp: 13899 },
];

/* ─── Level helpers ─── */
function getLevel(xp: number) {
  if (xp >= 300) return { level: 4, title: 'Master', next: 500, pct: Math.min(100, Math.round((xp / 500) * 100)) };
  if (xp >= 150) return { level: 3, title: 'Creator', next: 300, pct: Math.round((xp / 300) * 100) };
  if (xp >= 50) return { level: 2, title: 'Explorer', next: 150, pct: Math.round((xp / 150) * 100) };
  return { level: 1, title: 'Beginner', next: 50, pct: xp > 0 ? Math.round((xp / 50) * 100) : 0 };
}

function getKokoTip(
  totalCreations: number,
  badgeCount: number,
  conceptCount: number,
): { message: string; expression: MascotExpression } {
  if (totalCreations === 0) return { expression: 'waving', message: 'Ready to create your first AI masterpiece? Pick a studio!' };
  if (badgeCount > 0 && totalCreations < 3) return { expression: 'happy', message: 'You earned a badge! Keep creating to unlock more!' };
  if (totalCreations >= 5 && conceptCount < 3) return { expression: 'thinking', message: 'Try the AI X-Ray — learn how AI works and earn bonus XP!' };
  if (totalCreations >= 3) return { expression: 'celebrating', message: `${totalCreations} creations! Can you beat the AI next?` };
  return { expression: 'happy', message: 'What will you create today?' };
}

/* ─── Fake progress chart bars ─── */
const chartBars = [
  { month: 'Sep', h: 30 },
  { month: 'Oct', h: 50 },
  { month: 'Nov', h: 70 },
  { month: 'Dec', h: 90 },
  { month: 'Jan', h: 60 },
  { month: 'Feb', h: 45 },
];

/* ─── Animation ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

/* ─── Page ─── */
export default function HomePage() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const { totalPoints, badges, conceptsLearned, creationsByType } = useAiPoints();
  const { creationsRemaining } = useSession();

  const totalCreations = useMemo(
    () => Object.values(creationsByType).reduce((s, n) => s + n, 0),
    [creationsByType],
  );
  const { pct, next } = useMemo(() => getLevel(totalPoints), [totalPoints]);
  const kokoTip = useMemo(
    () => getKokoTip(totalCreations, badges.length, conceptsLearned.length),
    [totalCreations, badges.length, conceptsLearned.length],
  );
  const earnedBadges = useMemo(
    () => BADGE_CATALOG.filter((b) => badges.includes(b.id)),
    [badges],
  );

  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARDING_STORAGE_KEY)) setShowOnboarding(true);
    } catch { /* noop */ }
  }, []);

  const handleOnboardingComplete = useCallback(() => setShowOnboarding(false), []);

  return (
    <div className="min-h-[70vh]">
      <AnimatePresence>
        {showOnboarding && <OnboardingCarousel onComplete={handleOnboardingComplete} />}
      </AnimatePresence>

      <motion.div
        initial={prefersReducedMotion ? false : 'hidden'}
        animate="show"
        transition={{ staggerChildren: 0.06 }}
      >
        {/* ═══ Stats Row ═══ */}
        <motion.section variants={fadeUp} className="px-4 pt-5 sm:px-8 lg:px-12">
          <div className="mx-auto grid max-w-7xl grid-cols-3 gap-3 sm:gap-4">
            {/* Stat 1: Completed % */}
            <div className="rounded-2xl bg-blue-50 p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold text-gray-500 sm:text-sm">Completed</p>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-200/60 text-sm">🎯</span>
              </div>
              <p className="mt-2 font-display text-2xl font-extrabold text-gray-900 sm:text-3xl">
                {pct}%
              </p>
            </div>

            {/* Stat 2: Creations */}
            <div className="rounded-2xl bg-amber-50 p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold text-gray-500 sm:text-sm">Creations</p>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-200/60 text-sm">
                  <BookOpen className="h-4 w-4 text-amber-700" />
                </span>
              </div>
              <p className="mt-2 font-display text-2xl font-extrabold text-gray-900 sm:text-3xl">
                {totalCreations}
                <span className="text-base font-bold text-gray-400 sm:text-lg">/{5 - creationsRemaining + totalCreations > 10 ? 10 : 5 - creationsRemaining + totalCreations}</span>
              </p>
            </div>

            {/* Stat 3: XP Points */}
            <div className="rounded-2xl bg-rose-50 p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold text-gray-500 sm:text-sm">XP Points</p>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-200/60 text-sm">
                  <Sparkles className="h-4 w-4 text-rose-600" />
                </span>
              </div>
              <p className="mt-2 font-display text-2xl font-extrabold text-gray-900 sm:text-3xl">
                {totalPoints}
                <span className="text-base font-bold text-gray-400 sm:text-lg">/{next}</span>
              </p>
            </div>
          </div>
        </motion.section>

        {/* ═══ 3-Column Grid ═══ */}
        <section className="px-4 py-5 sm:px-8 lg:px-12">
          <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[280px_1fr_280px]">

            {/* ── LEFT COLUMN: Studios ── */}
            <motion.div variants={fadeUp} className="space-y-4">
              {/* Select Studio header */}
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-sm font-bold text-gray-900">Select Studio</h2>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-[10px] font-bold text-white">
                      {studios.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Add">
                      <span className="text-lg leading-none">+</span>
                    </button>
                    <button className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Search">
                      <Search className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Studio pills grid */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {studios.map((s) => (
                    <Link
                      key={s.href}
                      href={s.href}
                      className={cn(
                        'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-transform hover:scale-105',
                        s.color, s.textColor,
                      )}
                    >
                      <span className="text-base">{s.emoji}</span>
                      {s.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Studio Cards (2 stacked, like Dei course cards) */}
              {[
                { ...studios[0], desc: 'Write & illustrate amazing AI stories', mascotExpr: 'painting' as const },
                { ...studios[1], desc: 'Create songs & beats with AI', mascotExpr: 'singing' as const },
              ].map((card) => {
                const count = creationsByType[card.type] ?? 0;
                return (
                  <Link
                    key={card.href}
                    href={card.href}
                    className="group block rounded-2xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <Mascot expression={card.mascotExpr} size="sm" />
                      </div>
                      <div className="min-w-0 flex-1">
                        {/* XP indicators */}
                        <div className="mb-2 flex items-center gap-2">
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                            💎+{count > 0 ? count * 5 : 5}
                          </span>
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-600">
                            🔥+{totalPoints}
                          </span>
                        </div>

                        <p className="text-[10px] font-semibold uppercase tracking-wider text-green-600">
                          {count > 0 ? 'Continue Creating' : 'Start Creating'}
                        </p>
                        <h3 className="mt-0.5 font-display text-base font-extrabold text-gray-900">
                          {card.label === 'Story' ? 'The Story Studio' : 'The Music Lab'}
                        </h3>
                        <p className="mt-0.5 text-xs text-gray-400">{card.desc}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </motion.div>

            {/* ── CENTER COLUMN: Progress + Badges + Challenges ── */}
            <motion.div variants={fadeUp} className="space-y-4">
              {/* Your Progress (Study Success chart) */}
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-display text-sm font-bold text-gray-900">Your Progress</h2>
                    <p className="mt-0.5 text-xs text-gray-400">Activity over time</p>
                  </div>
                  <button className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-200">
                    Learn more
                  </button>
                </div>

                {/* Study Success bar chart */}
                <div className="mt-3 rounded-xl bg-gradient-to-br from-amber-50/50 via-white to-emerald-50/50 p-4">
                  <p className="mb-2 text-xs font-semibold text-gray-500">Study Success</p>
                  <div className="flex items-end justify-between gap-2" style={{ height: 100 }}>
                    {chartBars.map((bar) => (
                      <div key={bar.month} className="flex flex-1 flex-col items-center gap-1">
                        <motion.div
                          className="w-full rounded-t-md bg-gradient-to-t from-amber-300 to-amber-200"
                          initial={{ height: 0 }}
                          animate={{ height: bar.h }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                        <span className="text-[10px] text-gray-400">{bar.month}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Badges */}
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-sm font-bold text-gray-900">Badges</h2>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">
                      {badges.length}
                    </span>
                  </div>
                  <button className="flex items-center gap-0.5 text-xs font-semibold text-gray-400 hover:text-gray-600">
                    View all <ChevronRight className="h-3 w-3" />
                  </button>
                </div>

                <div className="mt-3 flex gap-4 overflow-x-auto">
                  {(earnedBadges.length > 0 ? earnedBadges : BADGE_CATALOG.slice(0, 4)).map((badge) => {
                    const isEarned = badges.includes(badge.id);
                    return (
                      <div
                        key={badge.id}
                        className={cn(
                          'flex flex-shrink-0 flex-col items-center gap-1.5',
                          !isEarned && 'opacity-40',
                        )}
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-2xl">
                          {badge.emoji}
                        </div>
                        <span className="w-16 text-center text-[10px] font-semibold leading-tight text-gray-600">
                          {badge.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Challenges */}
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-sm font-bold text-gray-900">Challenges</h2>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                      2
                    </span>
                  </div>
                  <button className="flex items-center gap-0.5 text-xs font-semibold text-gray-400 hover:text-gray-600">
                    View all <ChevronRight className="h-3 w-3" />
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  {/* Beat the AI challenge */}
                  <Link
                    href="/beat-the-ai"
                    className="group flex items-center gap-3 rounded-xl bg-purple-50/60 p-3 transition-colors hover:bg-purple-50"
                  >
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-purple-100 text-xl">
                      🤖
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-bold text-gray-900">Beat the AI</p>
                      <p className="text-[11px] text-gray-400">Daily challenge</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">💎+15</span>
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">🔥+250</span>
                    </div>
                    <button
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 hover:bg-white"
                      onClick={(e) => e.preventDefault()}
                      aria-label="More options"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </Link>

                  {/* MindX Quest */}
                  <Link
                    href="/skill-arena"
                    className="group flex items-center gap-3 rounded-xl bg-teal-50/60 p-3 transition-colors hover:bg-teal-50"
                  >
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-teal-100 text-xl">
                      🧠
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-bold text-gray-900">MindX Quest</p>
                      <p className="text-[11px] text-gray-400">Skill training</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">💎+5</span>
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">🔥+200</span>
                    </div>
                    <button
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 hover:bg-white"
                      onClick={(e) => e.preventDefault()}
                      aria-label="More options"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* ── RIGHT COLUMN: Leaderboard ── */}
            <motion.div variants={fadeUp}>
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="font-display text-base font-bold text-gray-900">Leaderboard</h2>

                {/* Top 3 Podium */}
                {(() => {
                  const [first, second, third] = leaderboard as [typeof leaderboard[number], typeof leaderboard[number], typeof leaderboard[number]];
                  return (
                    <div className="mt-4 flex items-end justify-center gap-2">
                      {/* #2 */}
                      <div className="flex flex-col items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-200 text-lg font-bold text-blue-800">
                          {second.name[0]}
                        </div>
                        <p className="mt-1 text-[10px] font-semibold text-gray-600">{second.name.split(' ')[0]}</p>
                        <div className="mt-1 flex h-16 w-16 flex-col items-center justify-center rounded-t-xl bg-blue-100">
                          <span className="text-sm font-extrabold text-blue-800">#2</span>
                        </div>
                        <span className="mt-1 rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-bold text-green-700">
                          💎{second.xp.toLocaleString()}
                        </span>
                      </div>

                      {/* #1 (tallest) */}
                      <div className="flex flex-col items-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-200 text-xl font-bold text-amber-800">
                          {first.name[0]}
                        </div>
                        <p className="mt-1 text-[10px] font-semibold text-gray-600">{first.name.split(' ')[0]}</p>
                        <div className="mt-1 flex h-24 w-16 flex-col items-center justify-center rounded-t-xl bg-amber-100">
                          <span className="text-sm font-extrabold text-amber-800">#1</span>
                        </div>
                        <span className="mt-1 rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-bold text-green-700">
                          💎{first.xp.toLocaleString()}
                        </span>
                      </div>

                      {/* #3 */}
                      <div className="flex flex-col items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-200 text-lg font-bold text-rose-800">
                          {third.name[0]}
                        </div>
                        <p className="mt-1 text-[10px] font-semibold text-gray-600">{third.name.split(' ')[0]}</p>
                        <div className="mt-1 flex h-12 w-16 flex-col items-center justify-center rounded-t-xl bg-rose-100">
                          <span className="text-sm font-extrabold text-rose-800">#3</span>
                        </div>
                        <span className="mt-1 rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-bold text-green-700">
                          💎{third.xp.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Ranked list #4+ */}
                <div className="mt-4 space-y-2">
                  {leaderboard.slice(3).map((entry) => (
                    <div
                      key={entry.rank}
                      className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2"
                    >
                      <span className="w-5 text-center text-xs font-extrabold text-gray-400">
                        #{entry.rank}
                      </span>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">
                        {entry.name[0]}
                      </div>
                      <p className="flex-1 text-xs font-semibold text-gray-700">{entry.name}</p>
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                        💎{entry.xp.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ═══ Koko Tip ═══ */}
        <motion.section variants={fadeUp} className="px-4 pb-6 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <Mascot expression={kokoTip.expression} size="sm" />
              <p className="text-sm font-medium text-gray-600">{kokoTip.message}</p>
            </div>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
