'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  ProfileSetupCarousel,
  ONBOARDING_DONE_KEY,
} from '@/components/onboarding/ProfileSetupCarousel';
import {
  DashboardStatsRow,
  BeatAiWidget,
  MindXWidget,
  ShowAllAppsWidget,
  StudioSelectorPanel,
  CreativeStreakChart,
  ChallengesWidget,
  LeaderboardPanel,
  ContinueCreatingCard,
  CeoLinkWidget,
  HomeworkLinkWidget,
} from '@/components/dashboard';
import { AssignmentView } from '@/components/student/AssignmentView';

export default function HomePage() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    try {
      const completed = localStorage.getItem(ONBOARDING_DONE_KEY);
      if (!completed) setShowOnboarding(true);
    } catch {
      // localStorage unavailable — skip onboarding
    }
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  return (
    <div className="min-h-screen bg-brand-background">
      <AnimatePresence>
        {showOnboarding && (
          <ProfileSetupCarousel onComplete={handleOnboardingComplete} />
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-screen-xl px-5 py-6 sm:px-6">

        {/* Continue Creating (only if in-progress session) */}
        <ContinueCreatingCard />

        {/* Pending assignments from teachers (Phase 3) */}
        <div className="mb-4">
          <AssignmentView />
        </div>

        {/* ── QUICK ACCESS — CEO + Homework ───────────────────────────── */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CeoLinkWidget />
          <HomeworkLinkWidget />
        </div>

        {/* ── ROW 1 — Stats + Badges: 4 equal cards ────────────────────── */}
        <DashboardStatsRow />

        {/* ── BODY — content area + leaderboard sidebar ────────────────── */}
        <div className="mt-5 lg:grid lg:grid-cols-[1fr_280px] lg:gap-5">

          {/* ── Content area ───────────────────────────────────────────── */}
          <div className="flex flex-col gap-5">

            {/* ROW 2: 3 equal CTA cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <BeatAiWidget />
              <MindXWidget />
              <ShowAllAppsWidget />
            </div>

            {/* ROW 3: Select Studio — full-width horizontal pills */}
            <StudioSelectorPanel />

            {/* ROW 4: 2 columns — streak chart + scrollable challenges */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" style={{ minHeight: 320 }}>
              <CreativeStreakChart />
              <ChallengesWidget />
            </div>
          </div>

          {/* ── Leaderboard — right side, stretches full height ─────────── */}
          <aside className="mt-5 self-stretch lg:mt-0">
            <LeaderboardPanel />
          </aside>
        </div>
      </div>
    </div>
  );
}
