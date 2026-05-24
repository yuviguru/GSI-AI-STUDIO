'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LogIn, Settings } from 'lucide-react';
import { useAiPoints } from '@/contexts/AiPointsContext';
import { useAuth } from '@/hooks/useAuth';
import { useKidProfile } from '@/hooks/useKidProfile';
import { useOnboardingProfile } from '@/hooks/useOnboardingProfile';
import { useResolvedIdentity } from '@/hooks/useResolvedIdentity';
import { PhoneAuthFlow } from '@/components/auth/PhoneAuthFlow';
import { ProfilePicker } from '@/components/profile/ProfilePicker';

interface TopHudProps {
  onlineCount?: number;
  streakDays?: number;
}

export function TopHud({ onlineCount = 12, streakDays = 7 }: TopHudProps) {
  const { totalPoints, isLoaded } = useAiPoints();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { activeKid } = useKidProfile();
  const { profile: onboardingProfile } = useOnboardingProfile();
  const [showAuthFlow, setShowAuthFlow] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // TopHud needs to distinguish "real profile" from "no identity yet" to
  // pick the right auth-chip variant (logged-in pill / anonymous-with-
  // profile pill / sign-in button). hasProfile carries that signal so we
  // don't have to compare names against fallbacks.
  const {
    name: profileName,
    avatarUrl: profileAvatarUrl,
    mascotEmoji: profileMascotEmoji,
    hasProfile,
  } = useResolvedIdentity();

  return (
    <>
      <header className="game-glass relative z-20 shrink-0 border-b border-white/40">
        <div className="mx-auto flex max-w-[1520px] items-center justify-between px-6 py-2.5 xl:px-8">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-primary to-brand-ai shadow-glass">
              <span className="text-sm">🎮</span>
            </div>
            <div className="font-display text-sm font-bold">
              GSI <span className="text-brand-primary">Studio</span>
            </div>
          </div>

          {/* Center status pills */}
          <div className="hidden items-center gap-3 lg:flex">
            <div className="flex items-center gap-1.5 rounded-full bg-brand-secondary/10 px-2.5 py-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-secondary opacity-75"></span>
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-secondary"></span>
              </span>
              <span className="text-[11px] font-semibold text-brand-secondary">
                {onlineCount} online
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-brand-accent/10 px-2.5 py-1">
              <span className="text-xs">🔥</span>
              <span className="font-mono text-[11px] font-bold text-brand-accent">
                {streakDays} days
              </span>
            </div>
          </div>

          {/* Right: points + auth state + settings */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400/20 to-orange-400/20 px-2.5 py-1 ring-1 ring-amber-300/40">
              <span className="text-xs">✨</span>
              <span className="font-mono text-xs font-bold text-amber-700">
                {isLoaded ? totalPoints.toLocaleString() : '—'}
              </span>
            </div>

            {/* Auth state chip — visible signal of who's logged in */}
            {!authLoading && (
              isAuthenticated && activeKid ? (
                // Authenticated with active kid: avatar pill → opens profile picker
                <button
                  onClick={() => setShowPicker(true)}
                  className="group flex items-center gap-2 rounded-full bg-white/70 py-1 pl-1 pr-3 ring-1 ring-brand-primary/15 transition hover:bg-white hover:ring-brand-primary/30"
                  aria-label={`Switch profile (signed in as ${activeKid.name})`}
                >
                  {profileAvatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={profileAvatarUrl}
                      alt={activeKid.name}
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-blue-100 text-lg">
                      {profileMascotEmoji}
                    </span>
                  )}
                  <span className="max-w-[80px] truncate font-display text-xs font-bold text-brand-text">
                    {activeKid.name}
                  </span>
                </button>
              ) : !isAuthenticated && onboardingProfile ? (
                // Anonymous but onboarded: profile pill with "Sign in" nudge
                <button
                  onClick={() => setShowAuthFlow(true)}
                  className="group flex items-center gap-2 rounded-full bg-white/70 py-1 pl-1 pr-3 ring-1 ring-amber-300/40 transition hover:bg-white hover:ring-amber-400/60"
                  aria-label="Sign in to save your profile"
                >
                  {profileAvatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={profileAvatarUrl}
                      alt={onboardingProfile.name}
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-blue-100 text-lg">
                      {profileMascotEmoji}
                    </span>
                  )}
                  <span className="flex flex-col items-start leading-tight">
                    <span className="max-w-[80px] truncate font-display text-[11px] font-bold text-brand-text">
                      {onboardingProfile.name}
                    </span>
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-600">
                      Tap to sign in
                    </span>
                  </span>
                </button>
              ) : !isAuthenticated ? (
                // Truly anonymous (no onboarding): explicit Sign In button
                <button
                  onClick={() => setShowAuthFlow(true)}
                  className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-primary to-brand-ai px-3 py-1.5 font-display text-xs font-bold text-white shadow-button transition-transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <LogIn className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Sign In
                </button>
              ) : null
            )}

            <button
              className="rounded-full p-1.5 transition hover:bg-white/60"
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4 text-brand-text-secondary" />
            </button>
          </div>
        </div>
      </header>

      {/* Profile Picker overlay */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white"
          >
            <ProfilePicker
              onSelect={() => setShowPicker(false)}
              onClose={() => setShowPicker(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth flow modal */}
      <AnimatePresence>
        {showAuthFlow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAuthFlow(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-sm rounded-3xl bg-white"
            >
              <PhoneAuthFlow
                onComplete={() => setShowAuthFlow(false)}
                onClose={() => setShowAuthFlow(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
