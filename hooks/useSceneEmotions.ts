'use client';

import { useState } from 'react';
import { fetchWithSession } from '@/lib/fetchWithSession';

export interface SceneEmotionSuggestion {
  emotions: Array<{ characterId: string; emotion: string }>;
  mood: 'bright' | 'neutral' | 'dark';
}

export interface SuggestEmotionsOptions {
  bookId: string;
  pageId?: string;
  text: string;
  characterIds: string[];
}

/**
 * Suggest per-character emotions for a page from its current text (BOOK-012).
 * Best-effort: returns null on any failure — the caller should already have a
 * zero-cost heuristic default in place, so this only refines it.
 */
export function useSceneEmotions() {
  const [loading, setLoading] = useState(false);

  const suggest = async (
    opts: SuggestEmotionsOptions,
  ): Promise<SceneEmotionSuggestion | null> => {
    setLoading(true);
    try {
      const res = await fetchWithSession('/api/ai/scene-emotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      });
      const json = await res.json();
      if (!json.success) return null;
      return json.data as SceneEmotionSuggestion;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { loading, suggest };
}
