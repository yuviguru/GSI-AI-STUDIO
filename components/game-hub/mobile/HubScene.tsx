'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { MascotAvatar } from '@/components/mascot/MascotAvatar';
import { useAiPoints } from '@/contexts/AiPointsContext';
import { useKidProfile } from '@/hooks/useKidProfile';
import { useOnboardingProfile } from '@/hooks/useOnboardingProfile';
import { useAuth } from '@/hooks/useAuth';
import { DEFAULT_MASCOT_ID, getMascot } from '@/lib/mascots/roster';
import { ModeTile } from '../shared/ModeTile';
import { ModeGroupTabs } from '../shared/ModeGroupTabs';
import { XpBar } from '../shared/XpBar';
import { getModesByGroup, type ModeGroup } from '../shared/GameModes';
import { bentoContainer, bentoShape, bentoSpan } from '../shared/bento';
import { playSound } from '@/lib/sounds';

const XP_PER_LEVEL = 100;

export function HubScene() {
  const router = useRouter();
  const { totalPoints, isLoaded } = useAiPoints();
  const { activeKid } = useKidProfile();
  const { profile: onboardingProfile } = useOnboardingProfile();
  const { isAuthenticated } = useAuth();
  const [group, setGroup] = useState<ModeGroup>('create');
  const modes = getModesByGroup(group);

  const level = Math.floor(totalPoints / XP_PER_LEVEL) + 1;
  const xpInLevel = totalPoints % XP_PER_LEVEL;
  const progressPct = (xpInLevel / XP_PER_LEVEL) * 100;

  // Name + avatar resolution: auth kid → anonymous onboarding → generic fallback.
  const name =
    activeKid?.name ?? onboardingProfile?.name ?? (isAuthenticated ? 'Player' : 'Guest');
  const avatarUrl = activeKid?.avatarUrl ?? onboardingProfile?.avatarUrl ?? null;
  const mascotId =
    activeKid?.mascotId ?? onboardingProfile?.mascotId ?? DEFAULT_MASCOT_ID;
  const mascotEmoji = getMascot(mascotId).art;

  const handleResume = () => {
    playSound('buttonTap');
    router.push('/create/story');
  };

  return (
    <div className="flex h-full flex-col">
      {/* HUD strip */}
      <div className="shrink-0 px-4 pt-3">
        <div className="game-hud-frame game-glass flex items-center gap-2.5 rounded-lg p-2.5 shadow-md">
          <div className="relative shrink-0">
            {avatarUrl ? (
              /* AI-generated avatar from onboarding */
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={avatarUrl}
                alt={name}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-brand-primary/30"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-blue-100 text-lg ring-2 ring-brand-primary/30">
                {mascotEmoji}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <div className="truncate font-display text-sm font-bold">{name}</div>
              <div className="whitespace-nowrap rounded-full bg-gradient-to-br from-amber-400 to-orange-500 px-1.5 py-0 shadow-sm">
                <span className="font-mono text-[9px] font-bold text-white">LVL {level}</span>
              </div>
            </div>
            <div className="mt-1">
              <XpBar percent={progressPct} height={5} />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-amber-400/20 to-orange-400/20 px-2 py-0.5 ring-1 ring-amber-300/40">
            <span className="text-[10px]">✨</span>
            <span className="font-mono text-[10px] font-bold text-amber-700">
              {isLoaded ? totalPoints.toLocaleString() : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Hero mascot */}
      <div className="shrink-0 px-4 pt-3">
        <div
          className="game-hud-frame game-glass relative overflow-hidden rounded-lg p-3 shadow-md"
          style={{ height: 155 }}
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-[120px] w-[120px] -translate-x-1/2 -translate-y-1/2 animate-pulse-glow rounded-full bg-brand-primary/20 blur-2xl" />
          </div>
          <div className="relative flex h-full items-center gap-3">
            <div className="flex shrink-0 flex-col items-center">
              <div className="relative z-10 drop-shadow-2xl">
                <MascotAvatar id={mascotId} size="xl" animate />
              </div>
              <div className="relative -mt-2 h-3 w-20">
                <div className="absolute inset-0 animate-platform-spin platform-ring" />
                <div className="absolute inset-1 rounded-full bg-gradient-to-b from-white/80 to-brand-soft" />
              </div>
            </div>
            <div className="relative z-10 min-w-0 flex-1">
              <div className="inline-block rounded-full bg-amber-100/60 px-2 py-0.5 ring-1 ring-amber-200/60">
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-amber-700">
                  +50 XP
                </span>
              </div>
              <h1 className="mt-1 font-display text-base font-bold leading-tight">
                What will you{' '}
                <span className="bg-gradient-to-r from-brand-primary to-brand-ai bg-clip-text text-transparent">
                  create
                </span>
                ?
              </h1>
              <button
                onClick={handleResume}
                className="btn-bevel-gold mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1"
              >
                <span className="text-[10px]">🎯</span>
                <span className="font-display text-[9px] font-bold uppercase tracking-wide text-white">
                  Resume
                </span>
                <ArrowRight className="h-3 w-3 text-white" strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grouped mode grid (Create / Play / Learn) fills remaining */}
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-2 pt-3">
        <div className="mb-2 flex shrink-0 items-center justify-center">
          <ModeGroupTabs active={group} onChange={setGroup} variant="mobile" />
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={group}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className={`grid min-h-0 flex-1 gap-2 ${bentoContainer(group, 'mobile')}`}
          >
            {modes.map((mode, i) => (
              <ModeTile
                key={mode.key}
                mode={mode}
                variant="mobile"
                shape={bentoShape(group, i, 'mobile')}
                className={bentoSpan(group, i, 'mobile')}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
