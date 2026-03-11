'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SkillArenaProgress } from '@/types/mindx.types';

const CACHE_KEY = 'gsi-skill-arena-progress';

function getSessionId(): string {
  return typeof window !== 'undefined'
    ? (localStorage.getItem('gsi-session-id') ?? '')
    : '';
}

const defaultProgress: SkillArenaProgress = {
  modules: {
    speaking: { module: 'speaking', band: 0, bandTitle: 'Starter', score: 0, assessments: 0, trend: 'new' },
    listening: { module: 'listening', band: 0, bandTitle: 'Starter', score: 0, assessments: 0, trend: 'new' },
    thinking: { module: 'thinking', band: 0, bandTitle: 'Starter', score: 0, assessments: 0, trend: 'new' },
    reading: { module: 'reading', band: 0, bandTitle: 'Starter', score: 0, assessments: 0, trend: 'new' },
  },
  overallBand: 0,
  totalAssessments: 0,
  totalPointsEarned: 0,
  strongestModule: null,
  recommendedModule: null,
};

export function useSkillArenaProgress() {
  const [progress, setProgress] = useState<SkillArenaProgress>(defaultProgress);
  const [isLoading, setIsLoading] = useState(true);

  const loadProgress = useCallback(async () => {
    const sessionId = getSessionId();
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/skill-arena/progress', {
        headers: { 'X-Session-Id': sessionId },
      });
      const json = await res.json();

      if (json.success && json.data) {
        setProgress(json.data as SkillArenaProgress);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(json.data));
        } catch {
          // skip if unavailable
        }
      }
    } catch {
      // Try loading from cache
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          setProgress(JSON.parse(cached) as SkillArenaProgress);
        }
      } catch {
        // no cache, use defaults
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const refreshProgress = useCallback(async () => {
    setIsLoading(true);
    await loadProgress();
  }, [loadProgress]);

  return { progress, isLoading, refreshProgress };
}
