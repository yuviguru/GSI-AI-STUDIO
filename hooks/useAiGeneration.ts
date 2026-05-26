'use client';

import { useState, useCallback } from 'react';
import type { ApiResponse, AiXrayData } from '@gsi/types';
import { friendlyError } from '@/lib/utils';
import { fetchWithSession } from '@/lib/fetchWithSession';
import {
  handleBillingApiError,
  useBillingNotifications,
} from '@/contexts/BillingNotificationContext';

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
  game: [
    'Building your world... 🌍',
    'Creating storylines... ✍️',
    'Adding plot twists... 🔀',
    'Preparing your adventure... 🕹️',
  ],
  comic: [
    'Sketching your characters... ✏️',
    'Drawing the first panel... 🎨',
    'Adding speech bubbles... 💬',
    'Inking the final panels... 🖊️',
  ],
};

interface GenerationState<T> {
  data: T | null;
  aiXray: AiXrayData | null;
  creationId: string | null;
  loading: boolean;
  error: string | null;
  progressMessage: string;
}

export function useAiGeneration<T>(studioType: 'story' | 'music' | 'quiz' | 'game' | 'comic') {
  const { show: showBillingNotification } = useBillingNotifications();
  const [state, setState] = useState<GenerationState<T>>({
    data: null,
    aiXray: null,
    creationId: null,
    loading: false,
    error: null,
    progressMessage: '',
  });

  const generate = useCallback(
    async (input: Record<string, unknown>): Promise<T | null> => {
      setState({ data: null, aiXray: null, creationId: null, loading: true, error: null, progressMessage: '' });

      // Rotate progress messages
      const messages: string[] = PROGRESS_MESSAGES[studioType] ?? PROGRESS_MESSAGES.story!;
      let msgIndex = 0;
      const interval = setInterval(() => {
        msgIndex = (msgIndex + 1) % messages.length;
        setState((prev) => ({ ...prev, progressMessage: messages[msgIndex]! }));
      }, 4000);
      setState((prev) => ({ ...prev, progressMessage: messages[0]! }));

      try {
        const res = await fetchWithSession(`/api/ai/${studioType}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });

        const json: ApiResponse<Record<string, unknown> & { aiXray: AiXrayData }> = await res.json();

        if (!json.success || !json.data) {
          // Billing errors get a global actionable modal (BILLING-001)
          // rather than a generic "Something went wrong" inline.
          if (handleBillingApiError(res.status, json, showBillingNotification)) {
            setState((prev) => ({ ...prev, loading: false, error: null }));
            return null;
          }
          const errorMsg = json.error ? friendlyError(json.error.code) : 'Generation failed';
          setState((prev) => ({ ...prev, loading: false, error: errorMsg }));
          return null;
        }

        const { aiXray, creationId: cid, ...rest } = json.data as Record<string, unknown> & { aiXray: AiXrayData; creationId?: string };
        const creationData = rest[studioType] as T;

        setState({
          data: creationData,
          aiXray,
          creationId: cid ?? null,
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
    [studioType, showBillingNotification]
  );

  const reset = useCallback(() => {
    setState({ data: null, aiXray: null, creationId: null, loading: false, error: null, progressMessage: '' });
  }, []);

  return { ...state, generate, reset };
}
