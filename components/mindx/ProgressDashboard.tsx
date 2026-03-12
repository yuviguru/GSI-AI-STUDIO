'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BandScoreCard } from './BandScoreCard';
import { MODULE_INFO } from '@/types/mindx.types';
import type { SkillArenaProgress, SkillArenaModule, SkillArenaHistoryItem } from '@/types/mindx.types';

interface ProgressDashboardProps {
  onBack: () => void;
}

function getSessionId(): string {
  return typeof window !== 'undefined'
    ? (localStorage.getItem('gsi-session-id') ?? '')
    : '';
}

export function ProgressDashboard({ onBack }: ProgressDashboardProps) {
  const [progress, setProgress] = useState<SkillArenaProgress | null>(null);
  const [history, setHistory] = useState<SkillArenaHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const headers = {
          'Content-Type': 'application/json',
          'X-Session-Id': getSessionId(),
        };

        const [progressRes, historyRes] = await Promise.all([
          fetch('/api/mindx/progress', { headers }),
          fetch('/api/mindx/history', { headers }),
        ]);

        const progressJson = await progressRes.json();
        const historyJson = await historyRes.json();

        if (progressJson.success) setProgress(progressJson.data);
        if (historyJson.success) setHistory(historyJson.data);
      } catch {
        // Non-blocking
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
      </div>
    );
  }

  const allModules: SkillArenaModule[] = ['speaking', 'listening', 'thinking', 'reading'];

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="text-sm text-brand-purple hover:underline"
      >
        &larr; Back to Modules
      </button>

      <h2 className="font-display text-lg font-bold text-gray-900">
        Your Progress
      </h2>

      {/* Module band cards */}
      <div className="grid grid-cols-2 gap-3">
        {allModules.map((mod) => {
          const modData = progress?.modules[mod];
          const info = MODULE_INFO[mod];
          return (
            <div key={mod} className="text-center">
              <div className="mb-1 text-lg">{info.icon}</div>
              <BandScoreCard
                band={modData?.band ?? 0}
                bandTitle={modData?.bandTitle ?? 'Starter'}
                score={modData?.score ?? 0}
                label={info.name}
              />
            </div>
          );
        })}
      </div>

      {/* Stats row */}
      {progress && (
        <div className="flex items-center justify-around rounded-xl bg-gray-50 px-4 py-3">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {progress.totalAssessments}
            </div>
            <div className="text-xs text-gray-400">Assessments</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {progress.overallBand || '-'}
            </div>
            <div className="text-xs text-gray-400">Overall Band</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-brand-purple">
              {progress.totalPointsEarned}
            </div>
            <div className="text-xs text-gray-400">AI Points</div>
          </div>
        </div>
      )}

      {/* Recent history */}
      {history.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-bold text-gray-800">
            Recent Assessments
          </h3>
          <div className="space-y-2">
            {history.map((item) => {
              const info = MODULE_INFO[item.module];
              return (
                <motion.div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-3 py-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <span className="text-lg">{info.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700">
                      {info.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(item.completedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      'text-sm font-bold',
                      item.band >= 4 ? 'text-purple-600' : item.band >= 3 ? 'text-amber-500' : 'text-gray-600',
                    )}>
                      Band {item.band}
                    </div>
                    <div className="text-xs text-gray-400">{item.score}/100</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
