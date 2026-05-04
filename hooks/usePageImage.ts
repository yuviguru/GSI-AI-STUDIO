'use client';

import { useState } from 'react';
import { fetchWithSession } from '@/lib/fetchWithSession';

export interface PageImageOptions {
  prompt: string;
  style?: string;
  aspect?: 'square' | 'portrait' | 'landscape' | 'cover';
  bookId?: string;
  pageId?: string;
}

export interface PageImageResult {
  imageUrl: string;
  model: string;
  latencyMs: number;
}

/**
 * Generate an illustration for a book page or cover. Reuses the existing
 * imageProvider cascade server-side. Counts toward AI rate limit.
 */
export function usePageImage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<PageImageResult | null>(null);

  const generate = async (opts: PageImageOptions): Promise<PageImageResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithSession('/api/ai/page-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? 'Image generation failed');
      }
      const result = json.data as PageImageResult;
      setLastResult(result);
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Image generation failed';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setError(null);
    setLastResult(null);
  };

  return {
    loading,
    error,
    lastResult,
    generate,
    reset,
  };
}
