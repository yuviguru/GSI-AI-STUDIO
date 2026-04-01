'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useAiPoints } from '@/contexts/AiPointsContext';
import { useModal } from '@/contexts/ModalContext';
import { BADGE_CATALOG, getBadgeProgressHint, type Badge } from '@/lib/badges';

function BadgeCard({ badge, earned, hint }: { badge: Badge; earned: boolean; hint: string }) {
  return (
    <div
      className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center transition-all ${
        earned
          ? 'bg-brand-purple/8 ring-1 ring-brand-purple/20'
          : 'bg-gray-50 opacity-45 grayscale'
      }`}
    >
      <span className="text-3xl leading-none">{badge.emoji}</span>
      <p className="text-xs font-bold leading-tight text-gray-800">{badge.name}</p>
      {earned ? (
        <span className="rounded-full bg-brand-purple/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand-purple">
          Earned ✓
        </span>
      ) : hint ? (
        <p className="text-[10px] leading-tight text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Single badge gallery modal, rendered once in the layout.
 * Open from anywhere via useModal().openModal('badgeGallery').
 */
export function BadgeGallery() {
  const { badges, creationsByType, conceptsLearned, totalPoints } = useAiPoints();
  const { isOpen, closeModal } = useModal();
  const open = isOpen('badgeGallery');
  const onClose = () => closeModal('badgeGallery');

  const earnedSet = new Set(badges);

  const pointsData = {
    aiPoints: totalPoints,
    badges,
    conceptsLearned,
    creationsByType,
    shareCount: 0,
  };

  const earnedCount = BADGE_CATALOG.filter((b) => earnedSet.has(b.id)).length;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[100] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Bottom sheet */}
          <motion.div
            className="fixed inset-x-4 bottom-0 z-[101] mx-auto max-h-[80vh] max-w-lg overflow-y-auto overscroll-contain rounded-t-3xl bg-white px-5 pb-8 pt-4 shadow-xl md:bottom-auto md:top-[10vh] md:rounded-3xl"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Drag handle (mobile) */}
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300 md:hidden" />

            {/* Header */}
            <div className="text-center">
              <span className="text-3xl">🏅</span>
              <h3 className="mt-1.5 font-display text-xl font-bold text-gray-900">My Badges</h3>
              <p className="mt-0.5 text-sm text-gray-400">
                {earnedCount} / {BADGE_CATALOG.length} earned
              </p>
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <motion.div
                className="h-full rounded-full bg-brand-purple"
                initial={{ width: 0 }}
                animate={{ width: `${(earnedCount / BADGE_CATALOG.length) * 100}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>

            {/* Badge grid */}
            <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {BADGE_CATALOG.map((badge) => {
                const earned = earnedSet.has(badge.id);
                const hint = earned ? '' : getBadgeProgressHint(badge, pointsData);
                return <BadgeCard key={badge.id} badge={badge} earned={earned} hint={hint} />;
              })}
            </div>

            <button
              onClick={onClose}
              className="mt-6 w-full rounded-full bg-gray-100 py-3 text-sm font-semibold text-gray-600 transition-transform active:scale-95"
            >
              Close
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
