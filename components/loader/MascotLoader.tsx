'use client';

import { motion } from 'framer-motion';
import { useKidProfile } from '@/hooks/useKidProfile';
import { useOnboardingProfile } from '@/hooks/useOnboardingProfile';
import { DEFAULT_MASCOT_ID } from '@/lib/mascots/roster';
import { MascotAvatar } from '@/components/mascot/MascotAvatar';

interface MascotLoaderProps {
  /** Kid-friendly hint shown under the mascot. Falls back to 'Getting things ready…' */
  message?: string;
}

/**
 * Full-screen, kid-friendly boot loader.
 *
 * Renders the user's chosen mascot at full size (authenticated kid →
 * anonymous onboarding cache → Pixie default). Use anywhere a blank screen
 * would otherwise show during Firebase auth + kid-list fetch.
 */
export function MascotLoader({
  message = 'Getting your studio ready…',
}: MascotLoaderProps) {
  const { activeKid } = useKidProfile();
  const { profile: onboardingProfile } = useOnboardingProfile();
  const mascotId =
    activeKid?.mascotId ?? onboardingProfile?.mascotId ?? DEFAULT_MASCOT_ID;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-purple-50 via-white to-blue-50"
      role="status"
      aria-live="polite"
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      >
        <MascotAvatar id={mascotId} size="2xl" tile />
      </motion.div>

      {/* Bouncing dots */}
      <div className="flex items-center gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-purple-400"
            animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>

      <p className="font-display text-sm font-semibold text-gray-600">
        {message}
      </p>
    </motion.div>
  );
}
