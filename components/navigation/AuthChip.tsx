'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useKidProfile } from '@/hooks/useKidProfile';
import { useOnboardingProfile } from '@/hooks/useOnboardingProfile';
import { useResolvedIdentity } from '@/hooks/useResolvedIdentity';
import { PhoneAuthFlow } from '@/components/auth/PhoneAuthFlow';
import { ProfilePicker } from '@/components/profile/ProfilePicker';

/**
 * Compact auth-state chip: shows the signed-in kid's avatar+name,
 * an anonymous-with-profile pill with "Tap to sign in", or a Sign In
 * button. Handles its own picker/auth-flow overlays.
 *
 * Used by TopHud (Game Hub) and GameNavBar (inner pages) so auth
 * presentation stays consistent everywhere.
 */
export function AuthChip() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { activeKid } = useKidProfile();
  const { profile: onboardingProfile } = useOnboardingProfile();
  const [showAuthFlow, setShowAuthFlow] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const {
    avatarUrl: profileAvatarUrl,
    mascotEmoji: profileMascotEmoji,
  } = useResolvedIdentity();

  if (authLoading) return null;

  return (
    <>
      {isAuthenticated && activeKid ? (
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
        <button
          onClick={() => setShowAuthFlow(true)}
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-primary to-brand-ai px-3 py-1.5 font-display text-xs font-bold text-white shadow-button transition-transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <LogIn className="h-3.5 w-3.5" strokeWidth={2.5} />
          Sign In
        </button>
      ) : null}

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
