'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  ProfileSetupCarousel,
  ONBOARDING_DONE_KEY,
} from '@/components/onboarding/ProfileSetupCarousel';
import { ContinueCreatingCard } from '@/components/dashboard';
import { AssignmentView } from '@/components/student/AssignmentView';
import { SectionHub, DashboardRightRail } from '@/components/navigation';
import { kidDashboardConfig } from '@/lib/dashboard/configs/kid.config';

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

      <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
        <ContinueCreatingCard />
        <div className="mb-4">
          <AssignmentView />
        </div>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px]">
          <SectionHub sections={kidDashboardConfig.sections} />
          <div className="mt-6 lg:mt-0">
            <DashboardRightRail widgets={kidDashboardConfig.rightRailWidgets} />
          </div>
        </div>
      </div>
    </div>
  );
}
