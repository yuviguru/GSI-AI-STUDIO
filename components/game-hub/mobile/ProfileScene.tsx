'use client';

import { Settings, Lock } from 'lucide-react';
import { useAiPoints } from '@/contexts/AiPointsContext';
import { useAuth } from '@/hooks/useAuth';
import { useResolvedIdentity } from '@/hooks/useResolvedIdentity';
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

const BADGE_DISPLAY = [
  { emoji: '📖', bg: 'from-amber-100 to-amber-50', ring: 'ring-amber-200/60' },
  { emoji: '🎵', bg: 'from-rose-100 to-pink-50', ring: 'ring-rose-200/60' },
  { emoji: '🧠', bg: 'from-emerald-100 to-emerald-50', ring: 'ring-emerald-200/60' },
  { emoji: '🔥', bg: 'from-violet-100 to-violet-50', ring: 'ring-violet-200/60' },
];

export function ProfileScene() {
  const { totalPoints, badges, creationsByType } = useAiPoints();
  const { isAuthenticated } = useAuth();
  const { name, avatarUrl, mascotEmoji } = useResolvedIdentity({
    fallbackName: isAuthenticated ? 'Player' : 'Guest',
  });

  const level = Math.floor(totalPoints / XP_PER_LEVEL) + 1;
  const xpInLevel = totalPoints % XP_PER_LEVEL;
  const xpToNext = XP_PER_LEVEL - xpInLevel;
  const progressPct = (xpInLevel / XP_PER_LEVEL) * 100;
  const totalCreations = Object.values(creationsByType ?? {}).reduce((s, n) => s + (n ?? 0), 0);
  const badgeCount = badges?.length ?? 0;

  return (
    <div className="flex h-full flex-col">
      {/* Title */}
      <div className="flex shrink-0 items-center justify-between px-4 pt-3">
        <div>
          <div className="font-display text-lg font-bold">Profile</div>
          <div className="text-[10px] text-brand-text-secondary">Your gaming identity</div>
        </div>
        <button className="game-glass rounded-full p-2 transition hover:bg-white/60" aria-label="Settings">
          <Settings className="h-4 w-4 text-brand-text" />
        </button>
      </div>

      {/* Hero player card */}
      <div className="shrink-0 px-4 pt-3">
        <div className="game-hud-frame game-glass relative overflow-hidden rounded-lg p-4 text-center shadow-md">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-primary/15 blur-2xl" />

          <div className="relative inline-block">
            <PlayerAvatar
              avatarUrl={avatarUrl}
              emoji={mascotEmoji}
              name={name}
              level={level}
              size="lg"
              progressPct={progressPct}
            />
          </div>

          <div className="mt-4 font-display text-xl font-bold">{name}</div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-brand-primary">
            {getTitle(level)}
          </div>

          <div className="mt-3">
            <XpBar percent={progressPct} />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[10px] text-brand-text-secondary">
            <span>{totalPoints.toLocaleString()} XP</span>
            <span className="text-brand-primary">→ LVL {level + 1} · {xpToNext} XP</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid shrink-0 grid-cols-3 gap-2 px-4 pt-3">
        <div className="game-glass rounded-lg p-3 text-center">
          <div className="font-mono text-xl font-bold">{totalCreations}</div>
          <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-brand-text-secondary">
            Creations
          </div>
        </div>
        <div className="game-glass rounded-lg p-3 text-center">
          <div className="font-mono text-xl font-bold text-brand-accent">7🔥</div>
          <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-brand-text-secondary">
            Streak
          </div>
        </div>
        <div className="game-glass rounded-lg p-3 text-center">
          <div className="font-mono text-xl font-bold text-brand-secondary">{badgeCount}</div>
          <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-brand-text-secondary">
            Badges
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-2 pt-3">
        <div className="mb-2 flex shrink-0 items-center justify-between">
          <h2 className="font-display text-xs font-bold uppercase tracking-wider">🏆 Achievements</h2>
          <span className="font-mono text-[9px] text-brand-text-secondary">{badgeCount} / 12</span>
        </div>
        <div className="game-glass grid flex-1 content-start grid-cols-4 gap-2 rounded-lg p-3">
          {BADGE_DISPLAY.map((b, i) => (
            <div
              key={i}
              className={`flex aspect-square items-center justify-center rounded-xl bg-gradient-to-br ${b.bg} p-2 text-2xl ring-1 ${b.ring}`}
            >
              {b.emoji}
            </div>
          ))}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`lock-${i}`}
              className="flex aspect-square items-center justify-center rounded-xl bg-gray-100 p-2 opacity-40 ring-1 ring-gray-200"
            >
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
