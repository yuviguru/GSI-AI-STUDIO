'use client';

import { useAiPoints } from '@/contexts/AiPointsContext';
import { useKidProfile } from '@/hooks/useKidProfile';
import { useOnboardingProfile } from '@/hooks/useOnboardingProfile';
import { useAuth } from '@/hooks/useAuth';
import { DEFAULT_MASCOT_ID, getMascot } from '@/lib/mascots/roster';
import { PlayerAvatar } from '../shared/PlayerAvatar';
import { XpBar } from '../shared/XpBar';

const XP_PER_LEVEL = 100;

function getTitle(level: number): string {
  if (level >= 50) return 'AI Master';
  if (level >= 30) return 'Story Wizard';
  if (level >= 15) return 'Creator Pro';
  if (level >= 5) return 'Rising Star';
  return 'Apprentice';
}

export function PlayerCard() {
  const { totalPoints, creationsByType, badges } = useAiPoints();
  const { activeKid } = useKidProfile();
  const { profile: onboardingProfile } = useOnboardingProfile();
  const { isAuthenticated } = useAuth();

  const level = Math.floor(totalPoints / XP_PER_LEVEL) + 1;
  const xpInLevel = totalPoints % XP_PER_LEVEL;
  const xpNextLevel = level * XP_PER_LEVEL;
  const progressPct = (xpInLevel / XP_PER_LEVEL) * 100;
  const totalCreations = Object.values(creationsByType ?? {}).reduce((s, n) => s + (n ?? 0), 0);

  // Identity resolution: auth kid → anonymous onboarding → generic fallback.
  // The hub must always show the real user (their AI-generated avatar + their
  // chosen mascot), never a hardcoded "Guest 🦊".
  const name =
    activeKid?.name ?? onboardingProfile?.name ?? (isAuthenticated ? 'Player' : 'Guest');
  const avatarUrl = activeKid?.avatarUrl ?? onboardingProfile?.avatarUrl ?? null;
  const mascotId =
    activeKid?.mascotId ?? onboardingProfile?.mascotId ?? DEFAULT_MASCOT_ID;
  const mascotEmoji = getMascot(mascotId).art;
  const title = getTitle(level);

  return (
    <div className="game-hud-frame game-glass relative shrink-0 overflow-hidden rounded-lg p-4 shadow-glass">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-primary/15 blur-2xl" />

      <div className="relative flex items-center gap-3">
        <div className="shrink-0">
          <PlayerAvatar
            avatarUrl={avatarUrl}
            emoji={mascotEmoji}
            name={name}
            level={level}
            size="md"
            progressPct={progressPct}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-base font-bold leading-tight">{name}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-brand-primary">{title}</div>
          <div className="mt-2">
            <XpBar percent={progressPct} />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[9px] text-brand-text-secondary">
            <span>{totalPoints.toLocaleString()} XP</span>
            <span>{xpNextLevel.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/60 pt-2.5">
        <div className="text-center">
          <div className="font-mono text-sm font-bold">{totalCreations}</div>
          <div className="text-[8px] font-semibold uppercase tracking-wider text-brand-text-secondary">Made</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-sm font-bold text-brand-accent">7🔥</div>
          <div className="text-[8px] font-semibold uppercase tracking-wider text-brand-text-secondary">Streak</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-sm font-bold text-brand-secondary">{badges?.length ?? 0}</div>
          <div className="text-[8px] font-semibold uppercase tracking-wider text-brand-text-secondary">Badges</div>
        </div>
      </div>
    </div>
  );
}
