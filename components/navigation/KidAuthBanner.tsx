'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useKidProfile } from '@/hooks/useKidProfile';
import { useAiPoints } from '@/contexts/AiPointsContext';
import { KidAvatar } from '@/components/navigation/KidSidebarUserChip';
import { PhoneAuthFlow } from '@/components/auth/PhoneAuthFlow';
import { ProfilePicker } from '@/components/profile/ProfilePicker';

/**
 * Always-visible sign-in / profile band on the kid home.
 *
 * The desktop sidebar surfaces auth state, but the sidebar is hidden below
 * `lg` (1024px). On phones and tablet portrait the mobile Header chip was
 * the only signal — too small to notice. This banner sits at the top of
 * the home page on every viewport so the kid can't miss whether they're
 * signed in or anonymous.
 *
 * States:
 *  - loading                    → skeleton band
 *  - anonymous                  → "Sign in to save your work" + CTA button
 *  - signed in, active kid      → avatar + name + level + AI Points + "Switch"
 *  - signed in, no active kid   → "Choose your profile" + CTA button
 */
export function KidAuthBanner() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { activeKid } = useKidProfile();
  const { totalPoints } = useAiPoints();
  const [showAuthFlow, setShowAuthFlow] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  if (authLoading) {
    return (
      <div className="mb-4 h-[68px] w-full animate-pulse rounded-2xl bg-gray-100" />
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowAuthFlow(true)}
          className="group mb-4 flex w-full items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 p-4 text-left text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl backdrop-blur-sm">
              👋
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm font-bold leading-tight sm:text-base">
                You&apos;re using GSI as a guest
              </p>
              <p className="mt-0.5 text-[12px] text-white/85 sm:text-sm">
                Sign in to save your work, earn badges, and keep your streak.
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-violet-700 shadow-sm sm:text-sm">
            Sign in
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </button>
        <AuthFlowOverlay open={showAuthFlow} onClose={() => setShowAuthFlow(false)} />
      </>
    );
  }

  if (!activeKid) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="group mb-4 flex w-full items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 p-4 text-left text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl backdrop-blur-sm">
              👤
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm font-bold leading-tight sm:text-base">
                You&apos;re signed in
              </p>
              <p className="mt-0.5 text-[12px] text-white/85 sm:text-sm">
                Choose a profile to start creating.
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm sm:text-sm">
            Choose profile
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </button>
        <ProfilePickerOverlay open={showPicker} onClose={() => setShowPicker(false)} />
      </>
    );
  }

  // Signed in, active kid — keep this slim so it doesn't crowd the home.
  const level = Math.floor(totalPoints / 50) + 1;
  return (
    <>
      <button
        type="button"
        onClick={() => setShowPicker(true)}
        className="group mb-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-brand-border bg-white p-3 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated"
      >
        <div className="flex min-w-0 items-center gap-3">
          <KidAvatar
            avatarUrl={activeKid.avatarUrl}
            emojiId={activeKid.avatar}
            name={activeKid.name}
            size={44}
          />
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold leading-tight text-brand-text sm:text-base">
              {activeKid.name}
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-brand-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-primary">
                Signed in
              </span>
            </p>
            <p className="mt-0.5 flex items-center gap-2 text-[12px] text-brand-text-secondary">
              <span>Level {level}</span>
              <span className="text-brand-text-muted">·</span>
              <span className="inline-flex items-center gap-1 font-mono font-semibold text-brand-primary">
                <Sparkles className="h-3 w-3" />
                {totalPoints} AI Points
              </span>
            </p>
          </div>
        </div>
        <span className="hidden shrink-0 items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-brand-text transition group-hover:bg-gray-200 sm:inline-flex">
          Switch profile
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-brand-text-muted sm:hidden" />
      </button>
      <ProfilePickerOverlay open={showPicker} onClose={() => setShowPicker(false)} />
    </>
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

function AuthFlowOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
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
