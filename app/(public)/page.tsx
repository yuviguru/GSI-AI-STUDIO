'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  ProfileSetupCarousel,
  ONBOARDING_DONE_KEY,
} from '@/components/onboarding/ProfileSetupCarousel';
import { PostOnboardingAuth } from '@/components/auth/PostOnboardingAuth';
import { useAuth } from '@/hooks/useAuth';
import { ContinueCreatingCard } from '@/components/dashboard';
import { AssignmentView } from '@/components/student/AssignmentView';
import { SectionHub, DashboardRightRail } from '@/components/navigation';
import { KidAuthBanner } from '@/components/navigation/KidAuthBanner';
import { kidDashboardConfig } from '@/lib/dashboard/configs/kid.config';

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

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
    // After anonymous onboarding, prompt sign-in.
    // Authenticated users (handled by AppGate) don't hit this path.
    if (!isAuthenticated) {
      setShowSignInPrompt(true);
    }
  }, [isAuthenticated]);

  const handleSignInDone = useCallback(() => {
    setShowSignInPrompt(false);
  }, []);

  return (
    <div className="min-h-screen bg-brand-background">
      <AnimatePresence>
        {showOnboarding && (
          <ProfileSetupCarousel onComplete={handleOnboardingComplete} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSignInPrompt && (
          <PostOnboardingAuth onContinue={handleSignInDone} />
        )}
      </AnimatePresence>

      <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
        <KidAuthBanner />
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
