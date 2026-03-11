'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const studioItems = [
  { href: '/create/story', label: 'Story Studio', emoji: '📖', color: 'text-violet-500' },
  { href: '/create/music', label: 'Music Lab', emoji: '🎵', color: 'text-orange-500' },
  { href: '/create/quiz', label: 'Quiz Maker', emoji: '🎮', color: 'text-cyan-500' },
  { href: '/create/game', label: 'Game Studio', emoji: '🕹️', color: 'text-emerald-500' },
  { href: '/create/comic', label: 'Comic Studio', emoji: '🎨', color: 'text-amber-500' },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isStudioActive = pathname.startsWith('/create/');
  const isBeatAiActive = pathname === '/beat-the-ai';
  const isMindXActive = pathname === '/skill-arena';
  const isExploreActive = pathname === '/explore';
  const isMyStuffActive = pathname === '/creations';

  const toggleSheet = useCallback(() => {
    setSheetOpen((prev) => !prev);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
  }, []);

  return (
    <>
      {/* Backdrop overlay */}
      <AnimatePresence>
        {sheetOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeSheet}
          />
        )}
      </AnimatePresence>

      {/* Create+ bottom sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <motion.div
            className={cn(
              'fixed bottom-14 left-0 right-0 z-50',
              'mx-auto max-w-lg rounded-t-2xl bg-white px-4 pb-3 pt-4 shadow-xl',
              'safe-area-bottom',
            )}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-gray-900">
                Choose a Studio
              </h3>
              <button
                onClick={closeSheet}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {studioItems.map((studio) => {
                const isActive = pathname === studio.href || pathname.startsWith(studio.href + '/');
                return (
                  <Link
                    key={studio.href}
                    href={studio.href}
                    onClick={closeSheet}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 transition-colors',
                      isActive
                        ? 'bg-brand-purple/10 ring-1 ring-brand-purple/20'
                        : 'hover:bg-gray-50',
                    )}
                  >
                    <span className="text-2xl">{studio.emoji}</span>
                    <span
                      className={cn(
                        'text-center text-[11px] font-semibold leading-tight',
                        isActive ? 'text-brand-purple' : studio.color,
                      )}
                    >
                      {studio.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom navigation bar — 3 tabs */}
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
              isStudioActive || sheetOpen ? 'text-brand-purple' : 'text-gray-400',
            )}
          >
            {(isStudioActive || sheetOpen) && (
              <motion.span
                layoutId="bottomnav-indicator"
                className="absolute -top-px left-3 right-3 h-0.5 rounded-full bg-brand-purple"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full transition-colors',
                sheetOpen
                  ? 'bg-brand-purple text-white'
                  : isStudioActive
                    ? 'bg-brand-purple/10 text-brand-purple'
                    : 'text-gray-400',
              )}
            >
              {sheetOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-4 w-4" />}
            </span>
            <span>Create+</span>
          </button>

          {/* Beat the AI tab */}
          <Link
            href="/beat-the-ai"
            onClick={closeSheet}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-0.5',
              'text-xs font-medium transition-colors',
              isBeatAiActive ? 'text-brand-purple' : 'text-gray-400',
            )}
          >
            {isBeatAiActive && (
              <motion.span
                layoutId="bottomnav-indicator"
                className="absolute -top-px left-3 right-3 h-0.5 rounded-full bg-brand-purple"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="text-lg leading-none">🤖</span>
            <span>Beat AI</span>
          </Link>

          {/* MindX tab */}
          <Link
            href="/skill-arena"
            onClick={closeSheet}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-0.5',
              'text-xs font-medium transition-colors',
              isMindXActive ? 'text-brand-purple' : 'text-gray-400',
            )}
          >
            {isMindXActive && (
              <motion.span
                layoutId="bottomnav-indicator"
                className="absolute -top-px left-3 right-3 h-0.5 rounded-full bg-brand-purple"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="text-lg leading-none">🧠</span>
            <span>MindX</span>
          </Link>

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
            {isExploreActive && (
              <motion.span
                layoutId="bottomnav-indicator"
                className="absolute -top-px left-3 right-3 h-0.5 rounded-full bg-brand-purple"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="text-lg leading-none">🔍</span>
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
            {isMyStuffActive && (
              <motion.span
                layoutId="bottomnav-indicator"
                className="absolute -top-px left-3 right-3 h-0.5 rounded-full bg-brand-purple"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="text-lg leading-none">✨</span>
            <span>My Stuff</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
