'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PhoneAuthFlow } from './PhoneAuthFlow';
import { useAuth } from '@/hooks/useAuth';

const DISMISS_KEY = 'gsi-login-prompt-dismissed';
const CREATION_COUNT_KEY = 'gsi-creation-count';
const DISMISS_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

/**
 * Non-blocking login prompt.
 * Shows after 2nd creation for unauthenticated users.
 * Dismissable with "Maybe later" — re-shows after 3 days.
 */
export function LoginPrompt() {
  const { isAuthenticated, loading } = useAuth();
  const [visible, setVisible] = useState(false);
  const [showAuthFlow, setShowAuthFlow] = useState(false);

  useEffect(() => {
    if (loading || isAuthenticated) return;

    // Check creation count
    const count = parseInt(localStorage.getItem(CREATION_COUNT_KEY) ?? '0', 10);
    if (count < 2) return;

    // Check dismissal
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < DISMISS_DURATION_MS) return;
    }

    setVisible(true);
  }, [loading, isAuthenticated]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }, []);

  const handleSuccess = useCallback(() => {
    setShowAuthFlow(false);
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <>
      <AnimatePresence>
        {!showAuthFlow && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              'fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md',
              'rounded-2xl bg-white p-4 shadow-xl ring-1 ring-gray-100',
              'lg:bottom-6',
            )}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">💾</span>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Save your creations forever!</p>
                <p className="mt-0.5 text-sm text-gray-500">
                  Ask a parent to sign up so your work is always safe.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setShowAuthFlow(true)}
                    className={cn(
                      'h-10 rounded-full bg-indigo-500 px-5 text-sm font-semibold text-white',
                      'hover:bg-indigo-600 active:scale-[0.98] transition-all',
                    )}
                  >
                    Sign Up
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="h-10 px-3 text-sm text-gray-400 hover:text-gray-600"
                  >
                    Maybe later
                  </button>
                </div>
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
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
            onClick={() => setShowAuthFlow(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-md rounded-t-3xl bg-white pb-safe"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-gray-300" />
              <PhoneAuthFlow
                onSuccess={handleSuccess}
                onClose={() => setShowAuthFlow(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Increment the creation count (call after each successful creation).
 * Used by LoginPrompt to trigger after 2nd creation.
 */
export function trackCreationForPrompt(): void {
  if (typeof window === 'undefined') return;
  const count = parseInt(localStorage.getItem(CREATION_COUNT_KEY) ?? '0', 10);
  localStorage.setItem(CREATION_COUNT_KEY, String(count + 1));
}
