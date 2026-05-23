'use client';

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ShieldAlert } from 'lucide-react';
import { PhoneAuthFlow } from './PhoneAuthFlow';
import { MascotAvatar } from '@/components/mascot/MascotAvatar';
import { DEFAULT_MASCOT_ID } from '@/lib/mascots/roster';

interface AuthChoiceScreenProps {
  /** Called when the user picks "Continue as guest". */
  onContinueAsGuest: () => void;
  /** Called after sign-in completes. AppGate then handles routing. */
  onSignedIn?: () => void;
}

/**
 * First-touch entry screen — primary CTA is phone OTP (highest conversion path),
 * secondary CTA is a "Continue as guest" text link. The hub renders blurred
 * behind via the fixed overlay's `backdrop-blur-xl`, hinting at the playful
 * world the user is about to enter.
 *
 * The guest CTA is paired with an inline warning chip so the user sees the
 * "stuff stays in this browser" trade-off before tapping. Returning guests get
 * a fuller warning modal after 24h (GuestWarningModal).
 */
export function AuthChoiceScreen({
  onContinueAsGuest,
  onSignedIn,
}: AuthChoiceScreenProps) {
  const handleAuthComplete = useCallback(() => {
    onSignedIn?.();
  }, [onSignedIn]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-white/55 p-4 backdrop-blur-xl"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative w-full max-w-sm rounded-[28px] bg-white p-5 shadow-[0_24px_70px_rgba(99,102,241,0.18)] ring-1 ring-purple-100/60"
      >
        {/* Mascot peeks above the card */}
        <div className="-mt-16 mb-1 flex justify-center">
          <div className="rounded-full bg-white p-1.5 shadow-lg ring-1 ring-purple-100">
            <MascotAvatar id={DEFAULT_MASCOT_ID} size="lg" tile />
          </div>
        </div>

        <div className="text-center">
          <h2 className="font-display text-lg font-bold text-gray-900">
            Welcome to GSI AI Studio
          </h2>
          <p className="mt-1 text-xs text-gray-600">
            Sign in to save your stuff across devices — or jump in as a guest.
          </p>
        </div>

        {/* Primary path: embedded phone OTP. PhoneAuthFlow owns its own
            container styling (max-w-sm + padding), so we just drop it in. */}
        <PhoneAuthFlow onComplete={handleAuthComplete} />

        {/* Secondary path: guest CTA + inline warning chip. The warning text
            is intentionally visible BEFORE the tap so the user knows the
            trade-off. A fuller warning modal hits returning guests after 24h. */}
        <div className="-mt-2 flex flex-col items-center gap-2 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onContinueAsGuest}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-purple-600 transition hover:text-purple-700"
          >
            <Sparkles className="h-4 w-4" />
            Continue as guest
          </button>
          <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 ring-1 ring-amber-200/70">
            <ShieldAlert className="h-3 w-3 text-amber-600" />
            <span className="text-[10px] font-medium text-amber-700">
              Your stuff will live only in this browser
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
