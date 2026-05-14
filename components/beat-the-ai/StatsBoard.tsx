'use client';

import { useState, useEffect, useCallback } from 'react';
import type { BeatTheAiSkills, BeatTheAiStats } from '@gsi/types';
import { fetchWithSession } from '@/lib/fetchWithSession';
import { SkillRadarChart } from './SkillRadarChart';
import { SkillProgressCard } from './SkillProgressCard';
import { Trophy, Handshake, XCircle, Flame, Bot } from 'lucide-react';

interface StatsBoardProps {
  skills: BeatTheAiSkills;
  onChallenge: () => void;
}

export function StatsBoard({ skills, onChallenge }: StatsBoardProps) {
  const [stats, setStats] = useState<BeatTheAiStats | null>(null);

  const loadStats = useCallback(async () => {
    if (typeof window === 'undefined' || !localStorage.getItem('gsi-session-id')) return;

    try {
      const res = await fetchWithSession('/api/beat-the-ai/stats');
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
    <div className="space-y-5">
      <h2 className="font-display text-center text-lg font-bold text-brand-text">My Skills & Stats</h2>

      {/* Win/Loss/Tie */}
      {stats && stats.totalRounds > 0 && (
        <div className="rounded-xl bg-white p-4 shadow-card">
          <div className="flex justify-between text-center">
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                <Trophy className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-xl font-bold text-green-600">{stats.wins}</p>
              <p className="text-[10px] text-brand-text-muted">Wins</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                <Handshake className="h-4 w-4 text-amber-600" />
              </div>
              <p className="text-xl font-bold text-amber-500">{stats.ties}</p>
              <p className="text-[10px] text-brand-text-muted">Ties</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
                <XCircle className="h-4 w-4 text-red-500" />
              </div>
              <p className="text-xl font-bold text-red-400">{stats.losses}</p>
              <p className="text-[10px] text-brand-text-muted">Losses</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                <Flame className="h-4 w-4 text-purple-600" />
              </div>
              <p className="text-xl font-bold text-purple-600">{stats.currentStreak}</p>
              <p className="text-[10px] text-brand-text-muted">Streak</p>
            </div>
          </div>
          {stats.longestStreak > 0 && (
            <p className="mt-2 text-center text-[10px] text-brand-text-muted">
              Best streak: {stats.longestStreak} wins
            </p>
          )}
        </div>
      )}

      {/* Radar chart */}
      <div className="rounded-xl bg-white p-4 shadow-card">
        <h3 className="mb-2 text-center text-sm font-bold text-brand-text-secondary">Skill Map</h3>
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
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-primary to-brand-ai py-3 text-sm font-bold text-white shadow-card transition-all hover:shadow-card-hover active:scale-[0.98]"
      >
        <Bot className="h-4 w-4" />
        Challenge Again!
      </button>
    </div>
  );
}
