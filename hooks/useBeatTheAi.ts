'use client';

import { useState, useCallback } from 'react';
import type {
  BeatTheAiCategory,
  BeatTheAiDifficulty,
  BeatTheAiPrompt,
  BeatTheAiSubmitResponse,
  BeatTheAiSubmitResponseResult,
  BeatTheAiStartResponse,
  BeatTheAiXray,
} from '@/types/beatTheAi.types';
import { fetchWithSession } from '@/lib/fetchWithSession';

export type BeatTheAiPhase =
  | 'picking'
  | 'loading'
  | 'challenging'
  | 'submitting'
  | 'revealing'
  | 'judging'
  | 'results';

interface BeatTheAiState {
  phase: BeatTheAiPhase;
  roundId: string | null;
  prompt: BeatTheAiPrompt | null;
  aiDifficulty: BeatTheAiDifficulty | null;
  kidResponse: string;
  aiResponse: string | null;
  aiXray: BeatTheAiXray | null;
  result: BeatTheAiSubmitResponse | null;
  error: string | null;
  isLoading: boolean;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetchWithSession(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message ?? 'Something went wrong');
  }
  return json.data as T;
}

const initialState: BeatTheAiState = {
  phase: 'picking',
  roundId: null,
  prompt: null,
  aiDifficulty: null,
  kidResponse: '',
  aiResponse: null,
  aiXray: null,
  result: null,
  error: null,
  isLoading: false,
};

export function useBeatTheAi() {
  const [state, setState] = useState<BeatTheAiState>(initialState);

  const startRound = useCallback(async (category: BeatTheAiCategory) => {
    setState((s) => ({ ...s, phase: 'loading', isLoading: true, error: null }));

    try {
      const data = await apiFetch<BeatTheAiStartResponse>('/api/beat-the-ai/start', {
        method: 'POST',
        body: JSON.stringify({ category }),
      });

      setState((s) => ({
        ...s,
        phase: 'challenging',
        roundId: data.roundId,
        prompt: data.prompt,
        aiDifficulty: data.aiDifficulty,
        isLoading: false,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        phase: 'picking',
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to start round',
      }));
    }
  }, []);

  const submitResponse = useCallback(
    async (kidResponse: string, timeUsedSeconds: number) => {
      setState((s) => ({ ...s, phase: 'submitting', kidResponse, isLoading: true, error: null }));

      try {
        const data = await apiFetch<BeatTheAiSubmitResponseResult>('/api/beat-the-ai/submit', {
          method: 'POST',
          body: JSON.stringify({
            roundId: state.roundId,
            kidResponse,
            timeUsedSeconds,
          }),
        });

        setState((s) => ({
          ...s,
          phase: 'revealing',
          aiResponse: data.aiResponse,
          aiXray: data.aiXray,
          isLoading: false,
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          phase: 'challenging',
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to submit',
        }));
      }
    },
    [state.roundId]
  );

  const requestJudge = useCallback(
    async () => {
      setState((s) => ({ ...s, phase: 'judging', isLoading: true, error: null }));

      try {
        const data = await apiFetch<BeatTheAiSubmitResponse>('/api/beat-the-ai/submit', {
          method: 'POST',
          body: JSON.stringify({
            roundId: state.roundId,
            judge: true,
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
          phase: 'revealing',
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to get AI judgment',
        }));
      }
    },
    [state.roundId]
  );

  const playAgain = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    startRound,
    submitResponse,
    requestJudge,
    playAgain,
  };
}
