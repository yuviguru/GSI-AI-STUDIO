'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { PhoneAuthFlow } from './PhoneAuthFlow';

export const GUEST_WARNED_AT_KEY = 'gsi-guest-warned-at';

/** Window between guest-warning reappearances. */
const WARN_WINDOW_MS = 24 * 60 * 60 * 1000;

interface GuestWarningModalProps {
  /** Called when the user acknowledges and keeps playing as guest. */
  onContinueAsGuest: () => void;
  /** Called after sign-in completes inside the embedded PhoneAuthFlow. */
  onSignedIn?: () => void;
}

/**
 * Returning-guest warning — surfaced for anonymous users 24h+ after their
 * onboarding `completedAt`. This is a direct port of the warning view that
 * used to live inside `PostOnboardingAuth.tsx` (now removed), so the copy,
 * iconography, and item list stay consistent with the original flow.
 *
 * Two ways out:
 *   - "Sign in to save everything" → opens PhoneAuthFlow inline. On success
 *     AppGate picks up the authenticated user.
 *   - "I understand, continue without saving" → stamp `gsi-guest-warned-at`
 *     and drop the user into the hub. We won't nag again for 24h.
 */
export function GuestWarningModal({
  onContinueAsGuest,
  onSignedIn,
}: GuestWarningModalProps) {
  const [showAuth, setShowAuth] = useState(false);

  const handleAcknowledge = useCallback(() => {
    try {
      localStorage.setItem(GUEST_WARNED_AT_KEY, Date.now().toString());
    } catch {
      // localStorage unavailable — non-blocking
    }
    onContinueAsGuest();
  }, [onContinueAsGuest]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center bg-gradient-to-b from-amber-50 to-white p-5"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
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
              <div
                key={item.emoji}
                className="flex items-center gap-2.5 rounded-xl bg-white p-2.5 shadow-sm"
              >
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
              onClick={() => setShowAuth(true)}
              className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Sign in to save everything
            </button>
            <button
              type="button"
              onClick={handleAcknowledge}
              className="text-xs text-gray-400 transition hover:text-gray-600"
            >
              I understand, continue without saving
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* PhoneAuthFlow as an inline modal — same pattern used by TopHud and
          the (now-removed) PostOnboardingAuth flow. */}
      <AnimatePresence>
        {showAuth && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAuth(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="w-full max-w-sm rounded-3xl bg-white p-2 shadow-xl"
            >
              <PhoneAuthFlow
                onComplete={() => {
                  setShowAuth(false);
                  onSignedIn?.();
                }}
                onClose={() => setShowAuth(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Decide whether to show the returning-guest warning to a user whose
 * onboarding completed at `completedAt`. We only nudge when:
 *   - the profile was completed at least 24h ago, AND
 *   - we haven't shown this warning in the past 24h.
 */
export function shouldShowGuestWarning(
  completedAt: string | undefined | null,
): boolean {
  if (!completedAt) return false;
  try {
    const completedTs = new Date(completedAt).getTime();
    if (!Number.isFinite(completedTs)) return false;
    if (Date.now() - completedTs < WARN_WINDOW_MS) return false;

    const lastWarnedRaw =
      typeof window !== 'undefined'
        ? localStorage.getItem(GUEST_WARNED_AT_KEY)
        : null;
    if (!lastWarnedRaw) return true;
    const lastWarnedTs = parseInt(lastWarnedRaw, 10);
    if (!Number.isFinite(lastWarnedTs)) return true;
    return Date.now() - lastWarnedTs > WARN_WINDOW_MS;
  } catch {
    return false;
  }
}
