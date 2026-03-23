'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { PhoneAuthFlow } from './PhoneAuthFlow';

const DISMISSED_KEY = 'gsi-login-prompt-dismissed';
const DISMISSED_EXPIRY_DAYS = 3;

/**
 * Non-blocking prompt encouraging login after the user has made a couple of creations.
 * Appears as a bottom sheet when triggered. Dismissable with "Maybe later".
 * Re-shows after 3 days if dismissed.
 */
export function LoginPrompt() {
  const { isAuthenticated } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showAuthFlow, setShowAuthFlow] = useState(false);

  useEffect(() => {
    // Don't show if already authenticated
    if (isAuthenticated) return undefined;

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem(DISMISSED_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < DISMISSED_EXPIRY_DAYS * 24 * 60 * 60 * 1000) return undefined;
    }

    // Check creation count — show after 2nd creation
    const pointsCache = localStorage.getItem('gsi-ai-points');
    if (pointsCache) {
      try {
        const data = JSON.parse(pointsCache);
        const totalCreations = Object.values(data.creationsByType || {}).reduce(
          (sum: number, count) => sum + (count as number),
          0
        );
        if (totalCreations >= 2) {
          // Delay showing to not interrupt the flow
          const timer = setTimeout(() => setShowPrompt(true), 3000);
          return () => clearTimeout(timer);
        }
      } catch {
        // Ignore parse errors
      }
    }

    return undefined;
  }, [isAuthenticated]);

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setShowPrompt(false);
  }

  function handleSignUp() {
    setShowPrompt(false);
    setShowAuthFlow(true);
  }

  function handleAuthComplete() {
    setShowAuthFlow(false);
  }

  // Don't render anything if authenticated
  if (isAuthenticated) return null;

  return (
    <>
      {/* Prompt banner */}
      <AnimatePresence>
        {showPrompt && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm"
          >
            <div className="rounded-2xl border border-purple-100 bg-white p-4 shadow-lg">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💾</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    Save your creations forever!
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Ask a parent to sign up so your stories, music, and games are never lost.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleSignUp}
                  className="flex-1 rounded-xl bg-purple-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-purple-700 active:scale-[0.98]"
                >
                  Sign Up
                </button>
                <button
                  onClick={handleDismiss}
                  className="rounded-xl px-3 py-2 text-xs text-gray-400 transition hover:text-gray-600"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth flow bottom sheet */}
      <AnimatePresence>
        {showAuthFlow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAuthFlow(false);
            }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-sm rounded-t-3xl bg-white pb-safe sm:rounded-3xl sm:mb-0"
            >
              <PhoneAuthFlow
                onComplete={handleAuthComplete}
                onClose={() => setShowAuthFlow(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
