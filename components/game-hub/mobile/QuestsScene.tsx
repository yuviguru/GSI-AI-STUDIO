'use client';

import { Check, Lock } from 'lucide-react';
import { XpBar } from '../shared/XpBar';

interface Quest {
  id: string;
  emoji: string;
  title: string;
  reward: number;
  state: 'done' | 'active' | 'locked';
  progress?: number;
  progressText?: string;
  variant?: 'primary' | 'amber';
}

const QUESTS: Quest[] = [
  { id: 'create', emoji: '✓', title: 'Make a creation', reward: 25, state: 'done' },
  { id: 'stories', emoji: '🎯', title: 'Write 3 stories', reward: 50, state: 'active', progress: 66, progressText: '2 of 3 complete', variant: 'primary' },
  { id: 'beat-ai', emoji: '🔥', title: 'Beat AI in 3 rounds', reward: 75, state: 'active', progress: 33, progressText: '1 of 3 complete', variant: 'amber' },
  { id: 'level-29', emoji: '🔒', title: 'Reach Level 29', reward: 100, state: 'locked' },
];

export function QuestsScene() {
  const completed = QUESTS.filter((q) => q.state === 'done').length;
  const xpEarned = QUESTS.filter((q) => q.state === 'done').reduce((sum, q) => sum + q.reward, 0);
  const overallProgress = (completed / QUESTS.length) * 100;

  return (
    <div className="flex h-full flex-col">
      {/* Title */}
      <div className="flex shrink-0 items-center justify-between px-4 pt-3">
        <div>
          <div className="font-display text-lg font-bold">Daily Quests</div>
          <div className="text-[10px] text-brand-text-secondary">Resets in 14h 22m</div>
        </div>
        <div className="rounded-full bg-gradient-to-r from-amber-400/20 to-orange-400/20 px-3 py-1 ring-1 ring-amber-300/40">
          <span className="font-mono text-xs font-bold text-amber-700">{completed}/{QUESTS.length}</span>
        </div>
      </div>

      {/* Progress overview */}
      <div className="shrink-0 px-4 pt-3">
        <div className="game-hud-frame game-glass rounded-lg p-3 shadow-md">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-display text-xs font-bold">Today&apos;s progress</div>
            <span className="font-mono text-xs font-bold text-brand-primary">+{xpEarned} XP earned</span>
          </div>
          <XpBar percent={overallProgress} />
          <div className="mt-1 text-right font-mono text-[10px] text-brand-text-secondary">
            Streak +50 if all complete
          </div>
        </div>
      </div>

      {/* Quest cards */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 pb-2 pt-3">
        {QUESTS.map((q) => {
          if (q.state === 'done') {
            return (
              <div
                key={q.id}
                className="rounded-lg bg-gradient-to-r from-emerald-100/80 to-emerald-50 p-3 ring-1 ring-emerald-200/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md">
                    <Check className="h-5 w-5" strokeWidth={3} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-emerald-900 line-through opacity-70">
                      {q.title}
                    </div>
                    <div className="text-[10px] font-semibold text-emerald-700">Completed</div>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-700">+{q.reward}</span>
                </div>
              </div>
            );
          }

          if (q.state === 'locked') {
            return (
              <div
                key={q.id}
                className="rounded-lg bg-gray-50/80 p-3 opacity-70 ring-1 ring-gray-200"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-200 text-gray-500 shadow-sm">
                    <Lock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-brand-text-secondary">{q.title}</div>
                    <div className="text-[10px] text-brand-text-secondary">Unlocks at LVL 29</div>
                  </div>
                  <span className="font-mono text-xs font-bold text-brand-text-secondary">+{q.reward}</span>
                </div>
              </div>
            );
          }

          const isPrimary = q.variant === 'primary';
          const wrapClass = isPrimary
            ? 'from-indigo-100/80 to-indigo-50 ring-2 ring-brand-primary/30'
            : 'from-amber-100/80 to-amber-50 ring-1 ring-amber-200/50';
          const iconWrap = isPrimary
            ? 'from-brand-primary to-brand-ai'
            : 'from-amber-400 to-orange-500';
          const reward = isPrimary ? 'text-brand-primary' : 'text-amber-700';
          const fillStyle = isPrimary ? undefined : 'linear-gradient(90deg, #FF9F43, #F59E0B)';

          return (
            <div
              key={q.id}
              className={`rounded-lg bg-gradient-to-r p-3 ${wrapClass}`}
            >
              <div className="mb-2 flex items-start gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${iconWrap} text-white shadow-md`}>
                  {q.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold">{q.title}</div>
                  <div className="text-[10px] text-brand-text-secondary">{q.progressText}</div>
                </div>
                <span className={`font-mono text-xs font-bold ${reward}`}>+{q.reward}</span>
              </div>
              <XpBar percent={q.progress ?? 0} height={5} fillStyle={fillStyle} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
