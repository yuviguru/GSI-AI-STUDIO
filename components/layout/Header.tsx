'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AiPointsBadge } from '@/components/learning/AiPointsBadge';
import { BadgeGallery } from '@/components/learning/BadgeGallery';
import { useAiPoints } from '@/contexts/AiPointsContext';

export function Header() {
  const {
    badges,
    stats,
    badgeGalleryOpen,
    closeBadgeGallery,
    recentBadgeUnlock,
    dismissBadgeUnlock,
  } = useAiPoints();

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-40 w-full',
          'border-b border-gray-100 bg-white/80 backdrop-blur-md',
        )}
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🎨</span>
            <span className="font-display text-lg font-bold text-gray-900">
              GSI AI Studio
            </span>
          </Link>

          <AiPointsBadge />
        </div>
      </header>

      {/* Badge Gallery */}
      <BadgeGallery
        isOpen={badgeGalleryOpen}
        onClose={closeBadgeGallery}
        earnedBadgeIds={badges}
        stats={stats}
      />

      {/* Badge Unlock Celebration */}
      <AnimatePresence>
        {recentBadgeUnlock && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={dismissBadgeUnlock}
            />
            <motion.div
              className="fixed inset-x-4 top-1/3 z-[70] mx-auto max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            >
              <div className="text-6xl">{recentBadgeUnlock.badge.emoji}</div>
              <h3 className="mt-3 font-display text-xl font-bold text-gray-900">
                Badge Unlocked!
              </h3>
              <p className="mt-1 text-lg font-semibold text-brand-purple">
                {recentBadgeUnlock.badge.name}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                {recentBadgeUnlock.badge.description}
              </p>
              <button
                onClick={dismissBadgeUnlock}
                className="mt-5 rounded-full bg-brand-purple px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-purple/90 active:bg-brand-purple/80"
              >
                Awesome!
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
