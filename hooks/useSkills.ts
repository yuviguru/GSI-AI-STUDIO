'use client';

import { useState, useEffect, useCallback } from 'react';
import type { BeatTheAiSkills, BeatTheAiSkillsResponse } from '@/types/beatTheAi.types';
import { getDefaultSkills } from '@/lib/beat-the-ai/skillEngine';

const CACHE_KEY = 'gsi-btai-skills';

function getSessionId(): string {
  return typeof window !== 'undefined'
    ? (localStorage.getItem('gsi-session-id') ?? '')
    : '';
}

export function useSkills() {
  const [skills, setSkills] = useState<BeatTheAiSkills>(getDefaultSkills());
  const [overallLevel, setOverallLevel] = useState(1);
  const [totalXp, setTotalXp] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadSkills = useCallback(async () => {
    const sessionId = getSessionId();
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/beat-the-ai/skills', {
        headers: { 'X-Session-Id': sessionId },
      });
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
  }, [loadSkills]);

  const refreshSkills = useCallback(async () => {
    setIsLoading(true);
    await loadSkills();
  }, [loadSkills]);

  return { skills, overallLevel, totalXp, isLoading, refreshSkills };
}
