'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { AiPointsBadge } from '@/components/learning/AiPointsBadge';
import { MuteToggle } from '@/components/layout/MuteToggle';
import { useAuth } from '@/hooks/useAuth';
import { useKidProfile } from '@/hooks/useKidProfile';
import { getAvatarEmoji } from '@/components/profile/AvatarPicker';
import { PhoneAuthFlow } from '@/components/auth/PhoneAuthFlow';
import { ProfilePicker } from '@/components/profile/ProfilePicker';
import { motion, AnimatePresence } from 'framer-motion';

export function Header() {
  const { isAuthenticated, loading } = useAuth();
  const { activeKid } = useKidProfile();
  const [showAuthFlow, setShowAuthFlow] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/gsi-logo.svg"
              alt="GSI"
              className="h-8 w-auto"
            />
            <span className="font-display text-lg font-bold text-gray-900">
              AI Studio
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <MuteToggle />
            <AiPointsBadge />

            {!loading && (
              isAuthenticated && activeKid ? (
                // Authenticated with active kid: show kid avatar → opens picker
                <button
                  onClick={() => setShowPicker(true)}
                  className="flex items-center gap-1.5 rounded-full bg-purple-50 px-2 py-1 transition hover:bg-purple-100"
                  aria-label="Switch profile"
                >
                  <span className="text-xl">{getAvatarEmoji(activeKid.avatar)}</span>
                  <span className="max-w-[60px] truncate text-xs font-medium text-purple-700">
                    {activeKid.name}
                  </span>
                </button>
              ) : !isAuthenticated ? (
                // Not authenticated: show Sign In
                <button
                  onClick={() => setShowAuthFlow(true)}
                  className="text-xs font-medium text-purple-600 transition hover:text-purple-700"
                >
                  Sign In
                </button>
              ) : null
            )}
          </div>
        </div>
      </header>

      {/* Profile Picker overlay */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white"
          >
            <ProfilePicker
              onSelect={() => setShowPicker(false)}
              onClose={() => setShowPicker(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth flow modal */}
      <AnimatePresence>
        {showAuthFlow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAuthFlow(false);
            }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-sm rounded-t-3xl bg-white pb-safe sm:rounded-3xl"
            >
              <PhoneAuthFlow
                onComplete={() => setShowAuthFlow(false)}
                onClose={() => setShowAuthFlow(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
