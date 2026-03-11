'use client';

import { useState, useEffect, useCallback } from 'react';
import type { BeatTheAiSkills, BeatTheAiStats } from '@/types/beatTheAi.types';
import { SkillRadarChart } from './SkillRadarChart';
import { SkillProgressCard } from './SkillProgressCard';

interface StatsBoardProps {
  skills: BeatTheAiSkills;
  onChallenge: () => void;
}

function getSessionId(): string {
  return typeof window !== 'undefined'
    ? (localStorage.getItem('gsi-session-id') ?? '')
    : '';
}

export function StatsBoard({ skills, onChallenge }: StatsBoardProps) {
  const [stats, setStats] = useState<BeatTheAiStats | null>(null);

  const loadStats = useCallback(async () => {
    const sessionId = getSessionId();
    if (!sessionId) return;

    try {
      const res = await fetch('/api/beat-the-ai/stats', {
        headers: { 'X-Session-Id': sessionId },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setStats(json.data as BeatTheAiStats);
      }
    } catch {
      // stats are optional
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const skillIds = Object.keys(skills) as (keyof typeof skills)[];

  return (
    <div className="space-y-6">
      <h2 className="text-center text-lg font-bold text-gray-900">My Skills & Stats</h2>

      {/* Win/Loss/Tie */}
      {stats && stats.totalRounds > 0 && (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex justify-between text-center">
            <div>
              <p className="text-xl font-bold text-green-600">{stats.wins}</p>
              <p className="text-[10px] text-gray-500">Wins</p>
            </div>
            <div>
              <p className="text-xl font-bold text-amber-500">{stats.ties}</p>
              <p className="text-[10px] text-gray-500">Ties</p>
            </div>
            <div>
              <p className="text-xl font-bold text-red-400">{stats.losses}</p>
              <p className="text-[10px] text-gray-500">Losses</p>
            </div>
            <div>
              <p className="text-xl font-bold text-purple-600">{stats.currentStreak}</p>
              <p className="text-[10px] text-gray-500">Streak</p>
            </div>
          </div>
          {stats.longestStreak > 0 && (
            <p className="mt-2 text-center text-[10px] text-gray-400">
              Best streak: {stats.longestStreak} wins
            </p>
          )}
        </div>
      )}

      {/* Radar chart */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-center text-sm font-bold text-gray-700">Skill Map</h3>
        <SkillRadarChart skills={skills} />
      </div>

      {/* Skill cards */}
      <div className="grid grid-cols-2 gap-3">
        {skillIds.map((id) => (
          <SkillProgressCard key={id} skillId={id} skill={skills[id]} />
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onChallenge}
        className="w-full rounded-xl bg-purple-600 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-purple-700 active:scale-[0.98]"
      >
        Challenge Again!
      </button>
    </div>
  );
}
