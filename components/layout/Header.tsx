'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { AiPointsBadge } from '@/components/learning/AiPointsBadge';
import { MuteToggle } from '@/components/layout/MuteToggle';
import { useAuth } from '@/hooks/useAuth';
import { PhoneAuthFlow } from '@/components/auth/PhoneAuthFlow';

export function Header() {
  const { user, isAuthenticated, signOut } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAuthFlow, setShowAuthFlow] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDropdown]);

  const handleSignOut = useCallback(async () => {
    setShowDropdown(false);
    await signOut();
  }, [signOut]);

  const avatarLetter = user?.phoneNumber
    ? user.phoneNumber.slice(-2, -1)
    : user?.displayName?.[0] ?? '?';

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

            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown((prev) => !prev)}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full',
                    'bg-indigo-500 text-sm font-bold text-white',
                    'hover:bg-indigo-600 transition-colors',
                  )}
                  aria-label="Account menu"
                >
                  {avatarLetter.toUpperCase()}
                </button>

                {showDropdown && (
                  <div
                    className={cn(
                      'absolute right-0 top-full mt-2 w-48 rounded-xl bg-white py-2',
                      'shadow-lg ring-1 ring-gray-100',
                    )}
                  >
                    <div className="border-b border-gray-100 px-4 pb-2 pt-1">
                      <p className="text-xs text-gray-400">Signed in as</p>
                      <p className="truncate text-sm font-medium text-gray-700">
                        {user?.phoneNumber ?? 'User'}
                      </p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAuthFlow(true)}
                className="text-sm font-medium text-indigo-500 hover:text-indigo-700"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Auth flow modal */}
      {showAuthFlow && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setShowAuthFlow(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white pb-safe sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-gray-300 sm:hidden" />
            <PhoneAuthFlow
              onSuccess={() => setShowAuthFlow(false)}
              onClose={() => setShowAuthFlow(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
