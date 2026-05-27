'use client';

import { useState, useEffect, useCallback } from 'react';
import type { BeatTheAiSkills, BeatTheAiSkillsResponse } from '@gsi/types';
import { getDefaultSkills } from '@/lib/beat-the-ai/skillEngine';
import { fetchWithSession } from '@/lib/fetchWithSession';
import { useKidProfile } from './useKidProfile';

const CACHE_KEY = 'gsi-btai-skills';

export function useSkills() {
  // Refire when the kid scope changes — without this, switching profiles
  // would keep the previous kid's BtAI XP/levels on screen.
  // Note: the localStorage `gsi-btai-skills` cache below is NOT keyed by
  // kid, so a network failure right after a switch can briefly surface the
  // previous kid's cached numbers. Acceptable for now; long-term fix would
  // be to namespace the cache key with the active kid id.
  const { kidScopeVersion } = useKidProfile();
  const [skills, setSkills] = useState<BeatTheAiSkills>(getDefaultSkills());
  const [overallLevel, setOverallLevel] = useState(1);
  const [totalXp, setTotalXp] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadSkills = useCallback(async () => {
    if (typeof window === 'undefined' || !localStorage.getItem('gsi-session-id')) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetchWithSession('/api/beat-the-ai/skills');
      const json = await res.json();

      if (json.success && json.data) {
        const data = json.data as BeatTheAiSkillsResponse;
        setSkills(data.skills);
        setOverallLevel(data.overallLevel);
        setTotalXp(data.totalXp);

        // Cache in localStorage
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch {
          // skip if unavailable
        }
      }
    } catch {
      // Try loading from cache
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const data = JSON.parse(cached) as BeatTheAiSkillsResponse;
          setSkills(data.skills);
          setOverallLevel(data.overallLevel);
          setTotalXp(data.totalXp);
        }
      } catch {
        // no cache, use defaults
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSkills();
  }, [loadSkills, kidScopeVersion]);

  const refreshSkills = useCallback(async () => {
    setIsLoading(true);
    await loadSkills();
  }, [loadSkills]);

  return { skills, overallLevel, totalXp, isLoading, refreshSkills };
}
