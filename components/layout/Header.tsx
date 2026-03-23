'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { AiPointsBadge } from '@/components/learning/AiPointsBadge';
import { MuteToggle } from '@/components/layout/MuteToggle';
import { useAuth } from '@/hooks/useAuth';
import { PhoneAuthFlow } from '@/components/auth/PhoneAuthFlow';
import { motion, AnimatePresence } from 'framer-motion';

export function Header() {
  const { user, isAuthenticated, loading, signOut } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAuthFlow, setShowAuthFlow] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user?.name || user?.displayName || 'User';
  const avatarLetter = displayName.charAt(0).toUpperCase();

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

          <div className="flex items-center gap-3">
            <MuteToggle />
            <AiPointsBadge />

            {/* Auth state */}
            {!loading && (
              isAuthenticated ? (
                // Authenticated: show avatar
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700 transition hover:bg-purple-200"
                    aria-label="Profile menu"
                  >
                    {avatarLetter}
                  </button>

                  {showDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
                      <div className="border-b border-gray-100 px-3 py-2">
                        <p className="text-sm font-medium text-gray-900">{displayName}</p>
                        <p className="text-xs text-gray-400">{user?.phoneNumber}</p>
                      </div>
                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          signOut();
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                // Not authenticated: show Sign In link
                <button
                  onClick={() => setShowAuthFlow(true)}
                  className="text-xs font-medium text-purple-600 transition hover:text-purple-700"
                >
                  Sign In
                </button>
              )
            )}
          </div>
        </div>
      </header>

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
