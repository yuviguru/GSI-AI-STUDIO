'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useKidProfile } from '@/hooks/useKidProfile';
import { getAvatarEmoji } from './AvatarPicker';
import { KidProfileSetup } from './KidProfileSetup';

const MAX_KIDS = 4;

/**
 * Horizontal scrollable row of kid profile circles.
 * Shows when parent is authenticated and has kid profiles.
 * Allows switching between kids + adding new ones.
 */
export function ProfileSelector() {
  const { isAuthenticated } = useAuth();
  const { kids, activeKid, switchKid } = useKidProfile();
  const [showSetup, setShowSetup] = useState(false);

  // Don't render if not authenticated or no kids
  if (!isAuthenticated || kids.length === 0) return null;

  return (
    <>
      <div className="border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 overflow-x-auto px-4 py-2 scrollbar-none">
          {kids.map((kid) => (
            <button
              key={kid.id}
              onClick={() => switchKid(kid.id)}
              className={cn(
                'flex flex-shrink-0 flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition',
                activeKid?.id === kid.id
                  ? 'bg-purple-100 ring-2 ring-purple-400'
                  : 'hover:bg-gray-50'
              )}
            >
              <span className="text-2xl">{getAvatarEmoji(kid.avatar)}</span>
              <span
                className={cn(
                  'max-w-[60px] truncate text-[10px] font-medium',
                  activeKid?.id === kid.id ? 'text-purple-700' : 'text-gray-500'
                )}
              >
                {kid.name}
              </span>
            </button>
          ))}

          {/* Add Kid button */}
          {kids.length < MAX_KIDS && (
            <button
              onClick={() => setShowSetup(true)}
              className="flex flex-shrink-0 flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-gray-400 transition hover:bg-gray-50 hover:text-gray-600"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-lg">
                +
              </span>
              <span className="text-[10px] font-medium">Add Kid</span>
            </button>
          )}
        </div>
      </div>

      {/* Kid profile setup modal */}
      <AnimatePresence>
        {showSetup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowSetup(false);
            }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-sm rounded-t-3xl bg-white pb-safe sm:rounded-3xl"
            >
              <KidProfileSetup
                onComplete={() => setShowSetup(false)}
                onClose={() => setShowSetup(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
