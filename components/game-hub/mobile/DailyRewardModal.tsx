'use client';

import { motion } from 'framer-motion';
import { Gift, X } from 'lucide-react';
import { playSound } from '@/lib/sounds';

interface DailyRewardModalProps {
  onClose: () => void;
}

/**
 * Daily reward modal — placeholder for the mobile hub's 🎁 Daily action.
 *
 * Today this is a coming-soon teaser; the real daily-reward flow (streak
 * bonuses, claimable XP, claim-once-per-day cap, animations) lives in a
 * separate follow-up. Keeping a real modal here ensures the tap target on
 * the hub does something visible and we can swap the body for the real
 * flow without changing the call site.
 */
export function DailyRewardModal({ onClose }: DailyRewardModalProps) {
  const handleClose = () => {
    playSound('buttonTap');
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-reward-title"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-amber-50 to-white p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-slate-500 shadow-sm ring-1 ring-slate-200 hover:bg-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-amber-500 shadow-md">
          <Gift className="h-8 w-8 text-white" />
        </div>

        <h2 id="daily-reward-title" className="font-display text-xl font-extrabold text-slate-900">
          Daily Reward
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Coming soon! Check back here every day for bonus XP, streak
          rewards, and special unlocks.
        </p>

        <button
          onClick={handleClose}
          className="btn-bevel-gold mt-6 inline-flex items-center justify-center rounded-full px-6 py-2"
        >
          <span className="font-display text-sm font-extrabold uppercase tracking-wide text-white">
            Got it
          </span>
        </button>
      </motion.div>
    </motion.div>
  );
}
