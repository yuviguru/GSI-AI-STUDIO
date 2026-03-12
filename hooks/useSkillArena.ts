'use client';

import { useState, useCallback } from 'react';
import type {
  SkillArenaModule,
  SkillArenaChallenge,
  SkillArenaAnswer,
  SkillArenaStartResponse,
  SkillArenaEvaluateResponse,
  SkillArenaDifficulty,
} from '@/types/mindx.types';

export type SkillArenaPhase =
  | 'picking'
  | 'loading'
  | 'challenging'
  | 'submitting'
  | 'evaluating'
  | 'results';

interface SkillArenaState {
  phase: SkillArenaPhase;
  module: SkillArenaModule | null;
  assessmentId: string | null;
  difficulty: SkillArenaDifficulty | null;
  challenges: SkillArenaChallenge[];
  currentIndex: number;
  answers: SkillArenaAnswer[];
  result: SkillArenaEvaluateResponse | null;
  error: string | null;
  isLoading: boolean;
}

function getSessionId(): string {
  return typeof window !== 'undefined'
    ? (localStorage.getItem('gsi-session-id') ?? '')
    : '';
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Id': getSessionId(),
      ...options?.headers,
    },
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message ?? 'Something went wrong');
  }
  return json.data as T;
}

const initialState: SkillArenaState = {
  phase: 'picking',
  module: null,
  assessmentId: null,
  difficulty: null,
  challenges: [],
  currentIndex: 0,
  answers: [],
  result: null,
  error: null,
  isLoading: false,
};

export function useSkillArena() {
  const [state, setState] = useState<SkillArenaState>(initialState);

  const startAssessment = useCallback(async (module: SkillArenaModule) => {
    setState((s) => ({ ...s, phase: 'loading', module, isLoading: true, error: null }));

    try {
      const data = await apiFetch<SkillArenaStartResponse>('/api/mindx/start', {
        method: 'POST',
        body: JSON.stringify({ module }),
      });

      setState((s) => ({
        ...s,
        phase: 'challenging',
        assessmentId: data.assessmentId,
        difficulty: data.difficulty,
        challenges: data.challenges,
        currentIndex: 0,
        answers: [],
        isLoading: false,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        phase: 'picking',
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to start assessment',
      }));
    }
  }, []);

  const submitAnswer = useCallback((answer: SkillArenaAnswer) => {
    setState((s) => {
      const newAnswers = [...s.answers, answer];
      const nextIndex = s.currentIndex + 1;

      if (nextIndex >= s.challenges.length) {
        // All challenges done, ready to submit
        return { ...s, answers: newAnswers, currentIndex: nextIndex, phase: 'submitting' };
      }

      return { ...s, answers: newAnswers, currentIndex: nextIndex };
    });
  }, []);

  const finishAssessment = useCallback(async () => {
    setState((s) => ({ ...s, phase: 'evaluating', isLoading: true, error: null }));

    try {
      const data = await apiFetch<SkillArenaEvaluateResponse>('/api/mindx/evaluate', {
        method: 'POST',
        body: JSON.stringify({
          assessmentId: state.assessmentId,
          answers: state.answers,
        }),
      });

      setState((s) => ({
        ...s,
        phase: 'results',
        result: data,
        isLoading: false,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        phase: 'submitting',
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to evaluate',
      }));
    }
  }, [state.assessmentId, state.answers]);

  const tryAgain = useCallback(() => {
    setState(initialState);
  }, []);

  const currentChallenge = state.challenges[state.currentIndex] ?? null;

  return {
    ...state,
    currentChallenge,
    startAssessment,
    submitAnswer,
    finishAssessment,
    tryAgain,
  };
}
