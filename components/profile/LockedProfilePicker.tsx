'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKidProfile } from '@/hooks/useKidProfile';
import { getAvatarEmoji } from './AvatarPicker';
import { ProfileSetupCarousel } from '@/components/onboarding/ProfileSetupCarousel';

interface LockedProfilePickerProps {
  /** Called when the new kid has been created and the migration is complete. */
  onComplete: () => void;
}

/**
 * Variant of ProfilePicker used during the sign-in migration flow when the
 * parent has 1-3 existing kids AND chose to keep guest work.
 *
 * The existing kids are visually present but **locked** — a lock badge and
 * subdued styling communicate that guest work cannot be merged into an
 * existing profile (because we don't know which kid did the guest work). The
 * only interactive path is "Create new profile," which routes into the
 * standard ProfileSetupCarousel in createKid mode — that auto-consumes the
 * pending `claimedSessionData` server-side via createKid().
 *
 * This is the picker side of the design: rather than telling the user
 * "merging into existing kids isn't allowed," we *show* them why — the kids
 * are there, untouched, and the only forward path is the one that makes
 * sense.
 */
export function LockedProfilePicker({ onComplete }: LockedProfilePickerProps) {
  const { kids, refreshKids } = useKidProfile();
  const [showAddKid, setShowAddKid] = useState(false);

  async function handleKidCreated() {
    await refreshKids();
    onComplete();
  }

  if (showAddKid) {
    return (
      <ProfileSetupCarousel
        createKidProfile
        onComplete={handleKidCreated}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-purple-50 via-white to-blue-50 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8 max-w-md text-center"
      >
        <span className="text-5xl">🎨</span>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">
          Your guest work needs its own profile
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
          We can&apos;t merge it into an existing kid (we don&apos;t know which
          kid did the guest work). Create a new profile for it.
        </p>
      </motion.div>

      {/* Profile grid — existing kids locked, only "Create new" interactive */}
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
        {kids.map((kid, index) => (
          <motion.div
            key={kid.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.55, scale: 1 }}
            transition={{
              delay: index * 0.06,
              type: 'spring',
              stiffness: 300,
              damping: 25,
            }}
            className={cn(
              'group relative flex cursor-not-allowed flex-col items-center gap-2 rounded-2xl p-4',
              'pointer-events-none select-none',
            )}
            aria-disabled
          >
            <div className="relative">
              {kid.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={kid.avatarUrl}
                  alt={kid.name}
                  className="h-20 w-20 rounded-full object-cover grayscale"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200 text-4xl grayscale">
                  {getAvatarEmoji(kid.avatar)}
                </div>
              )}
              {/* Lock overlay */}
              <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-gray-700 text-white shadow-md ring-2 ring-white">
                <Lock className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
            </div>
            <span className="max-w-[100px] truncate text-sm font-semibold text-gray-500">
              {kid.name}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
              Can&apos;t receive guest work
            </span>
          </motion.div>
        ))}

        {/* Create new profile — the only interactive tile */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: kids.length * 0.06,
            type: 'spring',
            stiffness: 300,
            damping: 25,
          }}
          onClick={() => setShowAddKid(true)}
          className="group flex flex-col items-center gap-2 rounded-2xl p-4 transition-all hover:bg-white hover:shadow-lg ring-2 ring-purple-200 ring-offset-2 ring-offset-transparent"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-3xl text-white transition-all group-hover:scale-110 group-hover:shadow-lg">
            +
          </div>
          <span className="text-sm font-semibold text-purple-600">
            Create new profile
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-purple-400">
            For your guest work
          </span>
        </motion.button>
      </div>
    </div>
  );
}
