'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useKidProfile } from '@/hooks/useKidProfile';
import { getAvatarEmoji } from './AvatarPicker';
import { ProfileSetupCarousel } from '@/components/onboarding/ProfileSetupCarousel';

const MAX_KIDS = 4;

interface ProfilePickerProps {
  /** When true, picker cannot be dismissed — used as a gate */
  forceSelection?: boolean;
  /** Called when a kid is selected */
  onSelect?: () => void;
  /** Called when picker is dismissed (only if !forceSelection) */
  onClose?: () => void;
}

/**
 * Netflix-style "Who's creating today?" full-screen profile picker.
 * Shows all kid profiles as large tappable circles.
 * Used as a gate after login (forceSelection=true) and
 * as an overlay from header/sidebar for switching profiles.
 *
 * "Add Kid" now uses the same ProfileSetupCarousel as initial onboarding
 * (mascot → name → AI avatar → X-Ray lesson) so all kids get the full
 * experience instead of the bare-bones KidProfileSetup form.
 */
export function ProfilePicker({ forceSelection, onSelect, onClose }: ProfilePickerProps) {
  const { signOut } = useAuth();
  const { kids, activeKid, switchKid, refreshKids } = useKidProfile();
  const [showAddKid, setShowAddKid] = useState(false);

  function handleSelectKid(kidId: string) {
    switchKid(kidId);
    onSelect?.();
  }

  async function handleKidCreated() {
    await refreshKids();
    setShowAddKid(false);
  }

  // Use the same onboarding carousel for adding new kids
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
        className="mb-10 text-center"
      >
        <span className="text-5xl">🎨</span>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">
          Who&apos;s creating today?
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Pick a profile to get started
        </p>
      </motion.div>

      {/* Profile grid */}
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
        {kids.map((kid, index) => (
          <motion.button
            key={kid.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
            onClick={() => handleSelectKid(kid.id)}
            className={cn(
              'group flex flex-col items-center gap-2 rounded-2xl p-4 transition-all',
              'hover:bg-white hover:shadow-lg',
              activeKid?.id === kid.id && 'bg-white shadow-lg ring-2 ring-purple-400'
            )}
          >
            {kid.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={kid.avatarUrl}
                alt={kid.name}
                className={cn(
                  'h-20 w-20 rounded-full object-cover transition-transform',
                  'group-hover:scale-110'
                )}
              />
            ) : (
              <div
                className={cn(
                  'flex h-20 w-20 items-center justify-center rounded-full text-4xl transition-transform',
                  'bg-gradient-to-br from-purple-100 to-blue-100',
                  'group-hover:scale-110'
                )}
              >
                {getAvatarEmoji(kid.avatar)}
              </div>
            )}
            <span className="max-w-[100px] truncate text-sm font-semibold text-gray-800">
              {kid.name}
            </span>
            {kid.aiPoints > 0 && (
              <span className="text-[10px] font-medium text-purple-500">
                ⚡ {kid.aiPoints} XP
              </span>
            )}
          </motion.button>
        ))}

        {/* Add Kid button */}
        {kids.length < MAX_KIDS && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: kids.length * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
            onClick={() => setShowAddKid(true)}
            className="group flex flex-col items-center gap-2 rounded-2xl p-4 transition-all hover:bg-white hover:shadow-lg"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-3 border-dashed border-gray-300 text-3xl text-gray-400 transition-all group-hover:border-purple-400 group-hover:text-purple-500">
              +
            </div>
            <span className="text-sm font-medium text-gray-400 group-hover:text-purple-500">
              Add Kid
            </span>
          </motion.button>
        )}
      </div>

      {/* Bottom actions */}
      <div className="mt-12 flex flex-col items-center gap-3">
        {!forceSelection && onClose && (
          <button
            onClick={onClose}
            className="text-sm text-gray-400 transition hover:text-gray-600"
          >
            ← Back
          </button>
        )}
        <button
          onClick={() => signOut()}
          className="text-xs text-gray-400 transition hover:text-red-500"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
