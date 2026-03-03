'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAiPoints } from '@/contexts/AiPointsContext';
import { BADGE_CATALOG } from '@/lib/badges';

/**
 * Full-screen badge unlock celebration modal.
 * Reads `newBadges` from AiPointsContext — renders when non-empty.
 * Shows one badge at a time; auto-dismisses after 3.5 seconds.
 */
export function CelebrationModal() {
  const { newBadges, dismissBadgeCelebration } = useAiPoints();
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show the first queued badge
  const badgeId = newBadges[0];
  const badge = badgeId ? BADGE_CATALOG.find((b) => b.id === badgeId) : null;
  const isOpen = !!badge;

  // Auto-dismiss after 3.5 s
  useEffect(() => {
    if (!isOpen) return;
    autoTimer.current = setTimeout(() => dismissBadgeCelebration(), 3500);
    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
    };
  }, [isOpen, dismissBadgeCelebration]);

  return (
    <AnimatePresence>
      {isOpen && badge && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60] bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismissBadgeCelebration}
          />

          {/* Modal card */}
          <motion.div
            className="fixed inset-x-0 top-1/2 z-[61] mx-auto flex max-w-xs -translate-y-1/2 flex-col items-center rounded-3xl bg-white px-8 py-10 text-center shadow-2xl"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            {/* Burst rings */}
            <div className="relative mb-4 flex h-32 w-32 items-center justify-center">
              <motion.div
                className="absolute inset-0 rounded-full bg-brand-purple/10"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [0.8, 1.4, 1.2], opacity: [0, 0.6, 0] }}
                transition={{ duration: 0.8, delay: 0.1 }}
              />
              <motion.div
                className="absolute inset-0 rounded-full bg-brand-yellow/20"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [0.8, 1.6, 1.3], opacity: [0, 0.5, 0] }}
                transition={{ duration: 0.9, delay: 0.2 }}
              />
              <motion.span
                className="relative z-10 text-7xl"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.1 }}
              >
                {badge.emoji}
              </motion.span>
            </div>

            <motion.p
              className="text-xs font-bold uppercase tracking-widest text-brand-purple"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              New Badge Unlocked!
            </motion.p>

            <motion.h2
              className="mt-2 font-display text-2xl font-bold text-gray-900"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              {badge.name}
            </motion.h2>

            <motion.p
              className="mt-2 text-sm text-gray-500"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {badge.description}
            </motion.p>

            <motion.button
              onClick={dismissBadgeCelebration}
              className="mt-7 w-full rounded-full bg-brand-purple py-3 font-bold text-white transition-transform active:scale-95"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              Awesome! 🎉
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
