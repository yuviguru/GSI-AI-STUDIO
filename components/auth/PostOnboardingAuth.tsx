'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Sparkles } from 'lucide-react';
import { PhoneAuthFlow } from './PhoneAuthFlow';
import { useOnboardingProfile } from '@/hooks/useOnboardingProfile';
import { MascotAvatar } from '@/components/mascot/MascotAvatar';

interface PostOnboardingAuthProps {
  /** Called when the user signs in or dismisses with warning acknowledged */
  onContinue: () => void;
}

/**
 * Full-screen sign-in prompt shown immediately after anonymous onboarding.
 *
 * Flow:
 *   Onboarding done → this screen → Sign In  → dashboard (authenticated)
 *                                  → Dismiss  → warning overlay
 *                                             → Acknowledge → dashboard (anon)
 */
export function PostOnboardingAuth({ onContinue }: PostOnboardingAuthProps) {
  const { profile } = useOnboardingProfile();
  const [showAuth, setShowAuth] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const handleDismiss = useCallback(() => {
    setShowWarning(true);
  }, []);

  const handleWarningAcknowledge = useCallback(() => {
    // Mark in localStorage so we can show a persistent soft reminder later
    try {
      localStorage.setItem('gsi-signin-deferred', Date.now().toString());
    } catch {
      // non-blocking
    }
    onContinue();
  }, [onContinue]);

  const handleAuthComplete = useCallback(() => {
    setShowAuth(false);
    onContinue();
  }, [onContinue]);

  // Warning overlay — shown when user tries to skip sign-in
  if (showWarning) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[70] flex items-center justify-center bg-gradient-to-b from-amber-50 to-white p-5"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="w-full max-w-sm text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <ShieldAlert className="h-8 w-8 text-amber-600" />
          </div>

          <h2 className="text-xl font-bold text-gray-900">
            Heads up! Your stuff isn&apos;t saved yet
          </h2>

          <div className="mt-4 space-y-2 text-left">
            {[
              { emoji: '🎨', text: 'Your avatar you just created' },
              { emoji: '📖', text: 'Any stories, music, or games you make' },
              { emoji: '⚡', text: 'AI Points and badges you earn' },
              { emoji: '👤', text: 'Your name and profile' },
            ].map((item) => (
              <div key={item.emoji} className="flex items-center gap-2.5 rounded-xl bg-white p-2.5 shadow-sm">
                <span className="text-lg">{item.emoji}</span>
                <span className="text-sm text-gray-700">{item.text}</span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-gray-500">
            All of this lives only in this browser. Clear your browser data
            or switch devices, and it&apos;s gone forever.
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                setShowWarning(false);
                setShowAuth(true);
              }}
              className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Sign in to save everything
            </button>
            <button
              type="button"
              onClick={handleWarningAcknowledge}
              className="text-xs text-gray-400 transition hover:text-gray-600"
            >
              I understand, continue without saving
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <>
      {/* Main sign-in prompt */}
      <AnimatePresence>
        {!showAuth && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-gradient-to-b from-purple-50 via-white to-blue-50 p-5"
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 25 }}
              className="w-full max-w-sm text-center"
            >
              {/* Avatar + mascot preview */}
              <div className="relative mx-auto mb-5 inline-block">
                {profile?.avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={profile.avatarUrl}
                    alt="Your avatar"
                    className="h-24 w-24 rounded-3xl object-cover shadow-md"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-100 to-blue-100">
                    <Sparkles className="h-10 w-10 text-purple-400" />
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2">
                  <MascotAvatar id={profile?.mascotId} size="sm" tile />
                </div>
              </div>

              <h2 className="text-xl font-bold text-gray-900">
                One last thing, {profile?.name || 'friend'}!
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Ask a parent to sign in so your avatar, creations, and
                progress are saved safely.
              </p>

              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAuth(true)}
                  className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Sign in with parent&apos;s phone
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="text-xs text-gray-400 transition hover:text-gray-600"
                >
                  Skip for now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth flow */}
      <AnimatePresence>
        {showAuth && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-gradient-to-b from-purple-50 to-white p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="w-full max-w-sm rounded-3xl bg-white p-2 shadow-xl"
            >
              <PhoneAuthFlow
                onComplete={handleAuthComplete}
                onClose={() => {
                  setShowAuth(false);
                  // Go back to the prompt, not straight to warning
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
