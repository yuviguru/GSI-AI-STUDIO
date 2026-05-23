'use client';

import { Check, Lock } from 'lucide-react';
import { XpBar } from '../shared/XpBar';

// Placeholder quest data — to be wired to real quest system later.
interface Quest {
  id: string;
  emoji: string;
  title: string;
  reward: number;
  state: 'done' | 'active' | 'locked';
  progress?: number; // 0-100
  progressText?: string; // "2/3"
  variant?: 'primary' | 'amber';
}

const QUESTS: Quest[] = [
  { id: 'create', emoji: '✓', title: 'Make a creation', reward: 25, state: 'done' },
  { id: 'stories', emoji: '🎯', title: 'Write 3 stories', reward: 50, state: 'active', progress: 66, progressText: '2/3', variant: 'primary' },
  { id: 'beat-ai', emoji: '🔥', title: 'Beat AI in 3 rounds', reward: 75, state: 'active', progress: 33, progressText: '1/3', variant: 'amber' },
  { id: 'level-29', emoji: '🔒', title: 'Reach Level 29', reward: 100, state: 'locked' },
];

export function QuestsCard() {
  const completed = QUESTS.filter((q) => q.state === 'done').length;

  return (
    <div className="game-hud-frame game-glass flex min-h-0 flex-1 flex-col rounded-lg p-3 shadow-glass">
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <div className="font-display text-[11px] font-bold uppercase tracking-wider">⚡ Daily Quests</div>
        <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-brand-text-secondary">
          {completed}/{QUESTS.length}
        </span>
      </div>

      <div className="flex-1 space-y-1.5">
        {QUESTS.map((q) => {
          if (q.state === 'done') {
            return (
              <div
                key={q.id}
                className="rounded-lg bg-gradient-to-r from-emerald-100/60 to-emerald-50 p-2 ring-1 ring-emerald-200/50"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </div>
                  <div className="min-w-0 flex-1 text-[10px] font-semibold text-emerald-900 line-through opacity-70">
                    {q.title}
                  </div>
                  <span className="font-mono text-[10px] font-bold text-emerald-700">+{q.reward}</span>
                </div>
              </div>
            );
          }

          if (q.state === 'locked') {
            return (
              <div
                key={q.id}
                className="rounded-lg bg-gray-50/80 p-2 opacity-70 ring-1 ring-gray-200"
              >
                <div className="flex items-center gap-2">
                  <Lock className="h-3 w-3 text-gray-400" />
                  <div className="min-w-0 flex-1 text-[10px] font-semibold text-brand-text-secondary">
                    {q.title}
                  </div>
                  <span className="font-mono text-[10px] font-bold text-brand-text-secondary">+{q.reward}</span>
                </div>
              </div>
            );
          }

          const isPrimary = q.variant === 'primary';
          const wrapBg = isPrimary
            ? 'from-indigo-100/60 to-indigo-50 ring-brand-primary/30'
            : 'from-amber-100/60 to-amber-50 ring-amber-200/50';
          const rewardColor = isPrimary ? 'text-brand-primary' : 'text-amber-700';
          const fillStyle = isPrimary
            ? undefined
            : 'linear-gradient(90deg, #FF9F43, #F59E0B)';

          return (
            <div
              key={q.id}
              className={`rounded-lg bg-gradient-to-r p-2 ring-1 ${wrapBg}`}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs">{q.emoji}</span>
                <div className="min-w-0 flex-1 text-[10px] font-semibold">{q.title}</div>
                <span className={`font-mono text-[10px] font-bold ${rewardColor}`}>+{q.reward}</span>
              </div>
              <XpBar percent={q.progress ?? 0} height={4} fillStyle={fillStyle} />
              <div className="mt-0.5 text-right font-mono text-[9px] text-brand-text-secondary">
                {q.progressText}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
