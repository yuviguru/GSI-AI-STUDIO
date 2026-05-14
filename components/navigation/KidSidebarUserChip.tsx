'use client';

import Image from 'next/image';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, UserRound } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useKidProfile } from '@/hooks/useKidProfile';
import { useAiPoints } from '@/contexts/AiPointsContext';
import { getAvatarEmoji } from '@/components/profile/AvatarPicker';
import { PhoneAuthFlow } from '@/components/auth/PhoneAuthFlow';
import { ProfilePicker } from '@/components/profile/ProfilePicker';

/**
 * Bottom-of-sidebar chip that surfaces sign-in state at a glance.
 * Mirrors the affordance the legacy SidebarNav had — without this, kids
 * couldn't tell whether they were signed in or anonymous on the new shell.
 *
 * States:
 *   loading        — animated placeholder
 *   anonymous      — "Sign In" CTA → opens PhoneAuthFlow modal
 *   signed in, no active kid — "Choose profile" CTA → opens ProfilePicker
 *   signed in + active kid   — avatar (URL > emoji) + name + AI Points
 */
export function KidSidebarUserChip() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { activeKid } = useKidProfile();
  const { totalPoints } = useAiPoints();
  const [showAuthFlow, setShowAuthFlow] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  if (authLoading) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="h-9 w-9 animate-pulse rounded-full bg-gray-100" />
        <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowAuthFlow(true)}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-primary transition hover:bg-brand-primary/8"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary/10">
            <UserRound className="h-[18px] w-[18px] text-brand-primary" />
          </div>
          <span>Sign In</span>
        </button>
        <AuthFlowModal open={showAuthFlow} onClose={() => setShowAuthFlow(false)} />
      </>
    );
  }

  if (!activeKid) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-text transition hover:bg-gray-50"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
            <UserRound className="h-[18px] w-[18px] text-brand-text-secondary" />
          </div>
          <span>Choose profile</span>
        </button>
        <ProfilePickerOverlay open={showPicker} onClose={() => setShowPicker(false)} />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowPicker(true)}
        className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 transition hover:bg-gray-50"
        aria-label="Switch profile"
      >
        <KidAvatar
          avatarUrl={activeKid.avatarUrl}
          emojiId={activeKid.avatar}
          name={activeKid.name}
          size={40}
        />
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold leading-tight text-brand-text">
            {activeKid.name}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-brand-primary">
            <Sparkles className="h-3 w-3" />
            <span>{totalPoints} AI Points</span>
          </p>
        </div>
      </button>
      <ProfilePickerOverlay open={showPicker} onClose={() => setShowPicker(false)} />
    </>
  );
}

interface KidAvatarProps {
  avatarUrl?: string | null;
  emojiId?: string;
  name: string;
  size?: number;
  className?: string;
}

/**
 * Shared kid avatar: prefers the AI-generated `avatarUrl` (Firebase Storage),
 * falls back to the emoji from the legacy roster, then to a generic '🐣'.
 */
export function KidAvatar({
  avatarUrl,
  emojiId,
  name,
  size = 40,
  className = '',
}: KidAvatarProps) {
  const base =
    'shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center';
  const style = { height: size, width: size };

  if (avatarUrl) {
    return (
      <div className={`${base} ${className}`} style={style}>
        <Image
          src={avatarUrl}
          alt={`${name}'s avatar`}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          sizes={`${size}px`}
        />
      </div>
    );
  }

  return (
    <div
      className={`${base} ${className}`}
      style={style}
      aria-label={`${name}'s avatar`}
    >
      <span style={{ fontSize: Math.round(size * 0.55) }}>
        {emojiId ? getAvatarEmoji(emojiId) : '🐣'}
      </span>
    </div>
  );
}

function ProfilePickerOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-white"
        >
          <ProfilePicker onSelect={onClose} onClose={onClose} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AuthFlowModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-sm rounded-3xl bg-white"
          >
            <PhoneAuthFlow onComplete={onClose} onClose={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
