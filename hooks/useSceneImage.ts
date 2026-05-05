'use client';

import { useState } from 'react';
import { fetchWithSession } from '@/lib/fetchWithSession';

export interface SceneImageOptions {
  bookId: string;
  pageId?: string;
  characterIds: string[];
  action: string;
  styleHint?: string;
}

export interface SceneImageResult {
  imageUrl: string;
  prompt: string;
  model: string;
  latencyMs: number;
  charactersUsed: Array<{ id: string; name: string }>;
}

/**
 * Generate a per-page scene image with character consistency. Server combines
 * the selected characters' anchor descriptions with the kid's short action
 * description, then runs the image cascade. Use this in the editor when the
 * book has characters; for non-narrative books (no characters), use
 * `usePageImage` instead.
 */
export function useSceneImage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SceneImageResult | null>(null);

  const generate = async (opts: SceneImageOptions): Promise<SceneImageResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithSession('/api/ai/scene-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? 'Could not draw this scene');
      }
      const result = json.data as SceneImageResult;
      setLastResult(result);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not draw this scene');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setError(null);
    setLastResult(null);
  };

  return { loading, error, lastResult, generate, reset };
}
