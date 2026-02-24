'use client';

import { useState, useCallback } from 'react';
import type { ApiResponse, AiXrayData } from '@/types';
import { friendlyError } from '@/lib/utils';

const PROGRESS_MESSAGES: Record<string, string[]> = {
  story: [
    'Imagining your story world... 🌍',
    'Writing the first chapter... ✍️',
    'Creating beautiful illustrations... 🎨',
    'Adding the finishing touches... ✨',
  ],
  music: [
    'Picking the perfect instruments... 🎸',
    'Composing your melody... 🎶',
    'Mixing the beat... 🥁',
    'Mastering the final track... 🎵',
  ],
  quiz: [
    'Researching your topic... 📚',
    'Crafting tricky questions... 🧩',
    'Writing fun explanations... 💡',
    'Finalizing your quiz... 🎮',
  ],
};

interface GenerationState<T> {
  data: T | null;
  aiXray: AiXrayData | null;
  loading: boolean;
  error: string | null;
  progressMessage: string;
}

export function useAiGeneration<T>(studioType: 'story' | 'music' | 'quiz') {
  const [state, setState] = useState<GenerationState<T>>({
    data: null,
    aiXray: null,
    loading: false,
    error: null,
    progressMessage: '',
  });

  const generate = useCallback(
    async (input: Record<string, unknown>): Promise<T | null> => {
      setState({ data: null, aiXray: null, loading: true, error: null, progressMessage: '' });

      // Rotate progress messages
      const messages: string[] = PROGRESS_MESSAGES[studioType] ?? PROGRESS_MESSAGES.story!;
      let msgIndex = 0;
      const interval = setInterval(() => {
        msgIndex = (msgIndex + 1) % messages.length;
        setState((prev) => ({ ...prev, progressMessage: messages[msgIndex]! }));
      }, 4000);
      setState((prev) => ({ ...prev, progressMessage: messages[0]! }));

      try {
        const sessionId = localStorage.getItem('gsi-session-id') ?? '';
        const res = await fetch(`/api/ai/${studioType}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-Id': sessionId,
          },
          body: JSON.stringify(input),
        });

        const json: ApiResponse<Record<string, unknown> & { aiXray: AiXrayData }> = await res.json();

        if (!json.success || !json.data) {
          const errorMsg = json.error ? friendlyError(json.error.code) : 'Generation failed';
          setState((prev) => ({ ...prev, loading: false, error: errorMsg }));
          return null;
        }

        const { aiXray, ...rest } = json.data;
        const creationData = rest[studioType] as T;

        setState({
          data: creationData,
          aiXray,
          loading: false,
          error: null,
          progressMessage: '',
        });
        return creationData;
      } catch {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Something went wrong. Please try again!',
        }));
        return null;
      } finally {
        clearInterval(interval);
      }
    },
    [studioType]
  );

  const reset = useCallback(() => {
    setState({ data: null, aiXray: null, loading: false, error: null, progressMessage: '' });
  }, []);

  return { ...state, generate, reset };
}
