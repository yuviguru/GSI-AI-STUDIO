'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SkillArenaProgress } from '@gsi/types';
import { fetchWithSession } from '@/lib/fetchWithSession';
import { useKidProfile } from './useKidProfile';

const CACHE_KEY = 'gsi-skill-arena-progress';

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
  // Refire when the kid scope changes. Same caveat as useSkills: the
  // localStorage cache below isn't per-kid, so an offline failure right
  // after switching can briefly surface the previous kid's progress.
  const { kidScopeVersion } = useKidProfile();
  const [progress, setProgress] = useState<SkillArenaProgress>(defaultProgress);
  const [isLoading, setIsLoading] = useState(true);

  const loadProgress = useCallback(async () => {
    if (typeof window === 'undefined' || !localStorage.getItem('gsi-session-id')) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetchWithSession('/api/skill-arena/progress');
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
  }, [loadProgress, kidScopeVersion]);

  const refreshProgress = useCallback(async () => {
    setIsLoading(true);
    await loadProgress();
  }, [loadProgress]);

  return { progress, isLoading, refreshProgress };
}
