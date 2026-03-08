'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const studioCards = [
  { href: '/create/story', label: 'Story Studio', emoji: '📖', gradient: 'from-violet-500 to-purple-600' },
  { href: '/create/music', label: 'Music Lab', emoji: '🎵', gradient: 'from-orange-400 to-rose-500' },
  { href: '/create/quiz', label: 'Quiz Maker', emoji: '🎮', gradient: 'from-cyan-400 to-blue-500' },
  { href: '/create/game', label: 'Game Studio', emoji: '🕹️', gradient: 'from-emerald-400 to-teal-500' },
  { href: '/create/comic', label: 'Comic Studio', emoji: '🖼️', gradient: 'from-pink-400 to-rose-500' },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const [showCreateSheet, setShowCreateSheet] = useState(false);

  const isCreateActive = pathname.startsWith('/create');
  const isExploreActive = pathname === '/explore' || pathname.startsWith('/explore/');
  const isMyStuffActive = pathname === '/creations' || pathname.startsWith('/creations/');

  const toggleSheet = useCallback(() => {
    setShowCreateSheet((prev) => !prev);
  }, []);

  const closeSheet = useCallback(() => {
    setShowCreateSheet(false);
  }, []);

  return (
    <>
      {/* Backdrop overlay */}
      <AnimatePresence>
        {showCreateSheet && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSheet}
          />
        )}
      </AnimatePresence>

      {/* Create+ bottom sheet */}
      <AnimatePresence>
        {showCreateSheet && (
          <motion.div
            className={cn(
              'fixed bottom-14 left-0 right-0 z-50',
              'rounded-t-3xl border-t border-gray-100 bg-white px-4 pb-4 pt-5 shadow-2xl',
              'safe-area-bottom',
            )}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-gray-900">Create Something</h3>
              <button
                onClick={closeSheet}
                className="text-sm font-medium text-gray-400"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {studioCards.map((studio) => (
                <Link
                  key={studio.href}
                  href={studio.href}
                  onClick={closeSheet}
                  className="group flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-4 text-center transition-all hover:shadow-md active:scale-95"
                >
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-xl text-2xl',
                      `bg-gradient-to-br ${studio.gradient} text-white`,
                    )}
                  >
                    {studio.emoji}
                  </div>
                  <span className="text-xs font-semibold text-gray-700">{studio.label}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom nav bar — 3 persistent tabs */}
      <nav
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'border-t border-gray-100 bg-white/90 backdrop-blur-md',
          'safe-area-bottom',
        )}
      >
        <div className="mx-auto flex h-14 max-w-lg items-stretch">
          {/* Create+ tab */}
          <button
            onClick={toggleSheet}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-0.5',
              'text-xs font-medium transition-colors',
              isCreateActive || showCreateSheet ? 'text-brand-purple' : 'text-gray-400',
            )}
          >
            {(isCreateActive || showCreateSheet) && (
              <motion.span
                layoutId="bottomnav-indicator"
                className="absolute -top-px left-3 right-3 h-0.5 rounded-full bg-brand-purple"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <motion.span
              className="text-lg leading-none"
              animate={{ rotate: showCreateSheet ? 45 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {'\u2795'}
            </motion.span>
            <span>Create</span>
          </button>

          {/* Explore tab */}
          <Link
            href="/explore"
            onClick={closeSheet}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-0.5',
              'text-xs font-medium transition-colors',
              isExploreActive ? 'text-brand-purple' : 'text-gray-400',
            )}
          >
            {isExploreActive && !showCreateSheet && (
              <motion.span
                layoutId="bottomnav-indicator"
                className="absolute -top-px left-3 right-3 h-0.5 rounded-full bg-brand-purple"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="text-lg leading-none">{'\uD83D\uDD0D'}</span>
            <span>Explore</span>
          </Link>

          {/* My Stuff tab */}
          <Link
            href="/creations"
            onClick={closeSheet}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-0.5',
              'text-xs font-medium transition-colors',
              isMyStuffActive ? 'text-brand-purple' : 'text-gray-400',
            )}
          >
            {isMyStuffActive && !showCreateSheet && (
              <motion.span
                layoutId="bottomnav-indicator"
                className="absolute -top-px left-3 right-3 h-0.5 rounded-full bg-brand-purple"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="text-lg leading-none">{'\u2728'}</span>
            <span>My Stuff</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
