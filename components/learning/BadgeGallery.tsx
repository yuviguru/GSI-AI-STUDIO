'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BADGE_CATALOG, getBadgeProgress, type Badge, type UserStats } from '@/lib/badges';

interface BadgeGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  earnedBadgeIds: string[];
  stats: UserStats;
}

export function BadgeGallery({
  isOpen,
  onClose,
  earnedBadgeIds,
  stats,
}: BadgeGalleryProps) {
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const isUnlocked = (badge: Badge) => earnedBadgeIds.includes(badge.id);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setSelectedBadge(null);
              onClose();
            }}
          />

          {/* Bottom sheet */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-3xl bg-white px-6 pb-8 pt-4 shadow-xl"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            role="dialog"
            aria-label="Badge gallery"
          >
            {/* Drag handle */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300" />

            {/* Header */}
            <div className="text-center">
              <h3 className="font-display text-xl font-bold text-gray-900">
                My Badges
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {earnedBadgeIds.length}/{BADGE_CATALOG.length} earned
              </p>
            </div>

            {/* Badge grid */}
            <div className="mt-5 grid grid-cols-3 gap-4">
              {BADGE_CATALOG.map((badge) => {
                const unlocked = isUnlocked(badge);
                const progress = getBadgeProgress(stats, badge);

                return (
                  <button
                    key={badge.id}
                    onClick={() => setSelectedBadge(badge)}
                    className="flex flex-col items-center gap-1.5 rounded-xl p-2 transition-colors hover:bg-gray-50 active:bg-gray-100"
                  >
                    {/* Badge circle */}
                    <div
                      className={cn(
                        'flex h-14 w-14 items-center justify-center rounded-full text-2xl',
                        unlocked
                          ? 'bg-brand-purple/10 shadow-sm'
                          : 'bg-gray-100 grayscale'
                      )}
                    >
                      {unlocked ? (
                        <span>{badge.emoji}</span>
                      ) : (
                        <Lock className="h-5 w-5 text-gray-400" />
                      )}
                    </div>

                    {/* Name */}
                    <span
                      className={cn(
                        'text-center text-xs font-medium leading-tight',
                        unlocked ? 'text-gray-900' : 'text-gray-400'
                      )}
                    >
                      {badge.name}
                    </span>

                    {/* Progress bar (locked only) */}
                    {!unlocked && (
                      <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-brand-purple/40 transition-all"
                          style={{
                            width: `${Math.round((progress.current / progress.required) * 100)}%`,
                          }}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Badge detail overlay */}
            <AnimatePresence>
              {selectedBadge && (
                <motion.div
                  className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-6 pb-8 pt-4 shadow-2xl"
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                  <button
                    onClick={() => setSelectedBadge(null)}
                    className="mx-auto mb-4 block h-1 w-10 rounded-full bg-gray-300"
                    aria-label="Close badge detail"
                  />
                  <BadgeDetail
                    badge={selectedBadge}
                    unlocked={isUnlocked(selectedBadge)}
                    progress={getBadgeProgress(stats, selectedBadge)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Badge Detail ────────────────────────────────────────

function BadgeDetail({
  badge,
  unlocked,
  progress,
}: {
  badge: Badge;
  unlocked: boolean;
  progress: { current: number; required: number };
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div
        className={cn(
          'flex h-20 w-20 items-center justify-center rounded-full text-4xl',
          unlocked ? 'bg-brand-purple/10' : 'bg-gray-100 grayscale'
        )}
      >
        {unlocked ? badge.emoji : <Lock className="h-8 w-8 text-gray-400" />}
      </div>

      <h4 className="mt-3 font-display text-lg font-bold text-gray-900">
        {badge.name}
      </h4>

      <p className="mt-1 text-sm text-gray-600">{badge.description}</p>

      {unlocked ? (
        <span className="mt-3 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
          Unlocked!
        </span>
      ) : (
        <div className="mt-3 w-full max-w-[200px]">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{badge.requirement}</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-brand-purple transition-all"
              style={{
                width: `${Math.round((progress.current / progress.required) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-1 text-xs font-medium text-gray-500">
            {progress.current}/{progress.required}
          </p>
        </div>
      )}
    </div>
  );
}
