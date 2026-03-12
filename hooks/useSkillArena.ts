'use client';

import { useState, useCallback } from 'react';
import type {
  SkillArenaModule,
  SkillArenaDifficulty,
  SkillArenaChallenge,
  SkillArenaAnswer,
  SkillArenaChallengeResult,
  SkillArenaMentorFeedback,
  SkillArenaXray,
  SkillArenaBandTitle,
  SkillArenaStartResponse,
  SkillArenaEvaluateResponse,
} from '@/types/mindx.types';

export type SkillArenaPhase =
  | 'modulePicking'
  | 'loading'
  | 'assessing'
  | 'evaluating'
  | 'results';

interface SkillArenaState {
  phase: SkillArenaPhase;
  assessmentId: string | null;
  module: SkillArenaModule | null;
  difficulty: SkillArenaDifficulty | null;
  challenges: SkillArenaChallenge[];
  currentChallengeIndex: number;
  answers: SkillArenaAnswer[];
  // Results
  score: number | null;
  band: number | null;
  bandTitle: SkillArenaBandTitle | null;
  challengeResults: SkillArenaChallengeResult[];
  mentorFeedback: SkillArenaMentorFeedback | null;
  aiXray: SkillArenaXray | null;
  aiPointsEarned: number;
  previousBand: number | null;
  improved: boolean;
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
  phase: 'modulePicking',
  assessmentId: null,
  module: null,
  difficulty: null,
  challenges: [],
  currentChallengeIndex: 0,
  answers: [],
  score: null,
  band: null,
  bandTitle: null,
  challengeResults: [],
  mentorFeedback: null,
  aiXray: null,
  aiPointsEarned: 0,
  previousBand: null,
  improved: false,
  error: null,
  isLoading: false,
};

export function useSkillArena() {
  const [state, setState] = useState<SkillArenaState>(initialState);

  const startAssessment = useCallback(async (module: SkillArenaModule) => {
    setState((s) => ({ ...s, phase: 'loading', module, isLoading: true, error: null }));

    try {
      const data = await apiFetch<SkillArenaStartResponse>('/api/skill-arena/start', {
        method: 'POST',
        body: JSON.stringify({ module }),
      });

      setState((s) => ({
        ...s,
        phase: 'assessing',
        assessmentId: data.assessmentId,
        difficulty: data.difficulty,
        challenges: data.challenges,
        currentChallengeIndex: 0,
        answers: [],
        isLoading: false,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        phase: 'modulePicking',
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to start assessment',
      }));
    }
  }, []);

  // Core evaluation function that takes answers as params (no stale closure)
  const submitAllWithAnswers = useCallback(async (assessmentId: string, answers: SkillArenaAnswer[]) => {
    try {
      const data = await apiFetch<SkillArenaEvaluateResponse>('/api/skill-arena/evaluate', {
        method: 'POST',
        body: JSON.stringify({ assessmentId, answers }),
      });

      setState((s) => ({
        ...s,
        phase: 'results',
        score: data.score,
        band: data.band,
        bandTitle: data.bandTitle,
        challengeResults: data.challengeResults,
        mentorFeedback: data.mentorFeedback,
        aiXray: data.aiXray,
        aiPointsEarned: data.aiPointsEarned,
        previousBand: data.previousBand,
        improved: data.improved,
        isLoading: false,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        phase: 'assessing',
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to evaluate',
      }));
    }
  }, []);

  const submitAnswer = useCallback((answer: SkillArenaAnswer) => {
    setState((s) => {
      const newAnswers = [...s.answers, answer];
      const nextIndex = s.currentChallengeIndex + 1;
      const isLast = nextIndex >= s.challenges.length;

      if (isLast) {
        // Auto-trigger evaluation with the complete answers array.
        // Use queueMicrotask so evaluation runs after this state update commits,
        // avoiding the stale closure bug where setTimeout + separate callback
        // could read pre-update state.
        const id = s.assessmentId!;
        queueMicrotask(() => submitAllWithAnswers(id, newAnswers));
        return { ...s, answers: newAnswers, phase: 'evaluating' as const, isLoading: true };
      }

      return {
        ...s,
        answers: newAnswers,
        currentChallengeIndex: nextIndex,
      };
    });
  }, [submitAllWithAnswers]);

  // Manual fallback (e.g. "Submit All" button) — captures latest state via updater
  const submitAllAnswers = useCallback(async () => {
    let capturedId = '';
    let capturedAnswers: SkillArenaAnswer[] = [];
    setState((s) => {
      capturedId = s.assessmentId!;
      capturedAnswers = s.answers;
      return { ...s, phase: 'evaluating', isLoading: true, error: null };
    });
    await submitAllWithAnswers(capturedId, capturedAnswers);
  }, [submitAllWithAnswers]);

  const goToNextChallenge = useCallback(() => {
    setState((s) => {
      const nextIndex = s.currentChallengeIndex + 1;
      if (nextIndex >= s.challenges.length) return s;
      return { ...s, currentChallengeIndex: nextIndex };
    });
  }, []);

  const tryAgain = useCallback(() => {
    setState(initialState);
  }, []);

  const currentChallenge = state.challenges[state.currentChallengeIndex] ?? null;
  const isLastChallenge = state.currentChallengeIndex >= state.challenges.length - 1;
  const hasAnsweredCurrent = state.answers.length > state.currentChallengeIndex;

  return {
    ...state,
    currentChallenge,
    isLastChallenge,
    hasAnsweredCurrent,
    startAssessment,
    submitAnswer,
    submitAllAnswers,
    goToNextChallenge,
    tryAgain,
  };
}
