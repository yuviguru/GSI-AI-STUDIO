'use client';

import Link from 'next/link';
import { useAiPoints } from '@/contexts/AiPointsContext';

export function BeatAiInfoCard() {
  const { totalPoints, creationsByType } = useAiPoints();
  const beatAiPlays = creationsByType['beat_ai'] ?? 0;

  return (
    <Link href="/beat-the-ai" className="group block">
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover">

        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base font-bold text-gray-900">
              Beat the AI 🤖
            </h3>
            <p className="mt-1.5 text-xs leading-snug text-gray-500">
              Challenge AI with your creativity. Can your story outsmart the machine?
            </p>
          </div>

          {/* Rating circle — matches reference "5.0" badge */}
          <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-full border-2 border-brand-purple/25">
            <p className="font-mono text-sm font-extrabold leading-none text-brand-purple">5.0</p>
          </div>
        </div>

        {/* Stats row — matches reference Hours/Lessons row */}
        <div className="mt-3 flex divide-x divide-gray-100 overflow-hidden rounded-xl bg-gray-50">
          <div className="flex flex-1 flex-col items-center py-3">
            <div className="flex items-center gap-1">
              <span className="text-base">🏆</span>
              <p className="font-mono text-sm font-bold text-gray-900">{beatAiPlays}</p>
            </div>
            <p className="mt-0.5 text-[10px] text-gray-400">Challenges</p>
          </div>
          <div className="flex flex-1 flex-col items-center py-3">
            <div className="flex items-center gap-1">
              <span className="text-base">⭐</span>
              <p className="font-mono text-sm font-bold text-gray-900">{totalPoints}</p>
            </div>
            <p className="mt-0.5 text-[10px] text-gray-400">Total XP</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
