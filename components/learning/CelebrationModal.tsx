'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAiPoints } from '@/contexts/AiPointsContext';
import { BADGE_CATALOG } from '@/lib/badges';
import { ConfettiCelebration } from '@/components/celebrations/ConfettiCelebration';
import { Mascot } from '@/components/mascot/Mascot';
import { playSound } from '@/lib/sounds';

/**
 * Dual-mode celebration modal:
 * 1. Badge unlock — reads `newBadges` queue, shows badge card + confetti burst
 * 2. Milestone — reads `celebration` state, shows mascot + confetti variant
 *
 * Badge takes priority if both are queued simultaneously.
 * Auto-dismisses after timeout.
 */
export function CelebrationModal() {
  const {
    newBadges,
    dismissBadgeCelebration,
    celebration,
    dismissCelebration,
  } = useAiPoints();
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundPlayed = useRef<string | null>(null);

  // Badge takes priority
  const badgeId = newBadges[0];
  const badge = badgeId ? BADGE_CATALOG.find((b) => b.id === badgeId) : null;
  const mode = badge ? 'badge' : celebration ? 'milestone' : null;
  const isOpen = mode !== null;

  const dismiss = mode === 'badge' ? dismissBadgeCelebration : dismissCelebration;

  // Play sound on open (once per celebration)
  useEffect(() => {
    if (!isOpen) {
      soundPlayed.current = null;
      return;
    }
    const key = mode === 'badge' ? `badge:${badgeId}` : `milestone:${celebration?.message}`;
    if (soundPlayed.current !== key) {
      soundPlayed.current = key;
      playSound(mode === 'badge' ? 'badgeUnlocked' : 'celebrate');
    }
  }, [isOpen, mode, badgeId, celebration?.message]);

  // Auto-dismiss timer
  useEffect(() => {
    if (!isOpen) return;
    const timeout = mode === 'badge' ? 3500 : 4000;
    autoTimer.current = setTimeout(() => dismiss(), timeout);
    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
    };
  }, [isOpen, mode, badgeId, celebration, dismiss]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Confetti (renders via canvas-confetti's own overlay) */}
          <ConfettiCelebration
            trigger
            variant={mode === 'badge' ? 'burst' : celebration?.variant ?? 'burst'}
          />

          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60] bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
          />

          {/* Modal card */}
          <motion.div
            className="fixed inset-x-0 top-1/2 z-[61] mx-auto flex max-w-xs -translate-y-1/2 flex-col items-center rounded-3xl bg-white px-8 py-10 text-center shadow-2xl"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            {mode === 'badge' && badge ? (
              <BadgeContent badge={badge} onDismiss={dismiss} />
            ) : celebration ? (
              <MilestoneContent message={celebration.message} onDismiss={dismiss} />
            ) : null}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Badge unlock content (existing design) ────────────────────────────────

function BadgeContent({
  badge,
  onDismiss,
}: {
  badge: { emoji: string; name: string; description: string };
  onDismiss: () => void;
}) {
  return (
    <>
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
        onClick={onDismiss}
        className="mt-7 w-full rounded-full bg-brand-purple py-3 font-bold text-white transition-transform active:scale-95"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        Awesome! 🎉
      </motion.button>
    </>
  );
}

// ─── Milestone celebration content (new) ────────────────────────────────────

function MilestoneContent({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <>
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.1 }}
      >
        <Mascot expression="celebrating" size="lg" bobbing={false} />
      </motion.div>

      <motion.h2
        className="mt-4 font-display text-2xl font-bold text-gray-900"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {message}
      </motion.h2>

      <motion.p
        className="mt-2 text-sm text-gray-500"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        Keep creating amazing things!
      </motion.p>

      <motion.button
        onClick={onDismiss}
        className="mt-7 w-full rounded-full bg-brand-purple py-3 font-bold text-white transition-transform active:scale-95"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {"Let's go! 🚀"}
      </motion.button>
    </>
  );
}
