'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  ProfileSetupCarousel,
  ONBOARDING_DONE_KEY,
} from '@/components/onboarding/ProfileSetupCarousel';
import { ContinueCreatingCard } from '@/components/dashboard';
import { AssignmentView } from '@/components/student/AssignmentView';
import { SectionHub, RightRail } from '@/components/navigation';

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

      <div className="mx-auto w-full max-w-screen-2xl px-4 py-5 sm:px-6 lg:px-8">
        {/* Resume strip + teacher assignments live above the hub */}
        <ContinueCreatingCard />
        <div className="mb-4">
          <AssignmentView />
        </div>

        {/* 3-column shell: SidebarNav (in (public)/layout.tsx) + Hub + RightRail */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <SectionHub />
          <div className="mt-6 lg:mt-0">
            <RightRail />
          </div>
        </div>
      </div>
    </div>
  );
}
