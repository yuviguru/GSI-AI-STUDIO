'use client';

import { useCallback, useState } from 'react';
import { fetchWithSession } from '@/lib/fetchWithSession';
import type { GrammarSuggestion } from '@/types/book.types';

export interface GrammarCheckOptions {
  text: string;
  ageHint?: number;
  bookId?: string;
  pageId?: string;
}

/**
 * Run a Groq grammar check on a piece of text. Returns the suggestions array
 * (may be empty — empty is a SUCCESS state meaning "no mistakes"). The
 * editor wires this to a "Check grammar" button.
 */
export function useGrammarCheck() {
  const [suggestions, setSuggestions] = useState<GrammarSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const run = useCallback(async (opts: GrammarCheckOptions): Promise<GrammarSuggestion[]> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithSession('/api/ai/grammar-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? 'Grammar check failed');
      }
      const next = (json.data.suggestions as GrammarSuggestion[]) ?? [];
      setSuggestions(next);
      setHasRun(true);
      return next;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Grammar check failed';
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const dismissSuggestion = useCallback((id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const reset = useCallback(() => {
    setSuggestions([]);
    setError(null);
    setHasRun(false);
  }, []);

  return {
    suggestions,
    loading,
    error,
    hasRun,
    run,
    dismissSuggestion,
    reset,
  };
}
