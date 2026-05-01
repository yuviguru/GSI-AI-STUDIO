'use client';

import Link from 'next/link';
import {
  GraduationCap,
  CalendarCheck,
  FlaskConical,
  Music,
  BookOpen,
  Trophy,
  Share2,
  Lightbulb,
  Check,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAiPoints } from '@/contexts/AiPointsContext';
import {
  CHALLENGES,
  computeProgress,
  type Challenge,
  type ChallengeProgress,
} from '@/lib/challenges/catalog';

const ICON_MAP: Record<Challenge['icon'], LucideIcon> = {
  GraduationCap,
  CalendarCheck,
  FlaskConical,
  Music,
  BookOpen,
  Trophy,
  Share2,
  Lightbulb,
};

export function ChallengesWidget() {
  const { totalPoints, conceptsLearned, creationsByType } = useAiPoints();

  const totalCreations = Object.values(creationsByType).reduce((s, n) => s + n, 0);

  const progresses: ChallengeProgress[] = CHALLENGES.map((c) =>
    computeProgress(c, {
      totalPoints,
      totalCreations,
      creationsByType,
      conceptsLearned,
      // shareCount isn't tracked in the AiPoints context yet — default to 0
      // until ENGAGE-002 wires it through.
      shareCount: 0,
    }),
  );

  // Show incomplete challenges first, then completed
  const sorted = [...progresses].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return b.ratio - a.ratio;
  });

  const activeCount = progresses.filter((p) => !p.completed).length;

  return (
    <div className="flex h-full flex-col rounded-xl bg-white p-5 shadow-card">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2.5">
        <h3 className="font-display text-sm font-bold text-brand-text">Challenges</h3>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-soft font-mono text-[10px] font-bold text-brand-primary">
          {activeCount}
        </span>
        <div className="flex-1" />
        <Link
          href="/creations"
          className="text-xs font-semibold text-brand-text-secondary hover:text-brand-primary"
        >
          View all &rsaquo;
        </Link>
      </div>

      {/* Scrollable challenge list */}
      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {sorted.map((p) => (
          <ChallengeRow key={p.challenge.id} progress={p} />
        ))}
      </div>
    </div>
  );
}

function ChallengeRow({ progress }: { progress: ChallengeProgress }) {
  const { challenge, current, completed, ratio } = progress;
  const Icon = ICON_MAP[challenge.icon];
  const pct = Math.round(ratio * 100);

  return (
    <Link href={challenge.href} className="block shrink-0">
      <div
        className={`relative overflow-hidden rounded-xl bg-brand-background p-3 transition-colors hover:bg-gray-100 ${completed ? 'opacity-70' : ''}`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${challenge.bg} ${completed ? 'opacity-50' : ''}`}
          >
            {completed ? (
              <Check className="h-[18px] w-[18px] text-emerald-600" />
            ) : (
              <Icon className="h-[18px] w-[18px]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-brand-text">{challenge.title}</p>
            <p className="truncate text-[11px] text-brand-text-muted">
              {completed ? 'Completed!' : challenge.subtitle}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <span className="text-[10px] font-bold text-brand-text-muted">
              {current}/{challenge.goal}
            </span>
            <div className="flex items-center gap-1">
              {challenge.gemReward != null && (
                <span className="text-[10px] font-bold text-brand-ai">+{challenge.gemReward}💎</span>
              )}
              <span className="text-[10px] font-bold text-brand-accent">+{challenge.xpReward}XP</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full transition-all ${completed ? 'bg-emerald-500' : 'bg-purple-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
