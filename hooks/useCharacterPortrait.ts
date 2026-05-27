'use client';

import { useState } from 'react';
import { fetchWithSession } from '@/lib/fetchWithSession';
import {
  handleBillingApiError,
  useBillingNotifications,
} from '@/contexts/BillingNotificationContext';

export interface CharacterPortraitOptions {
  lookDescription: string;
  styleHint?: string;
}

export interface CharacterPortraitResult {
  imageUrl: string;
  prompt: string;
  model: string;
  latencyMs: number;
}

/**
 * Generate a character anchor portrait. Used inside the wizard's "Who's in
 * your book?" step — no bookId needed because the book doesn't exist yet.
 * The returned imageUrl + prompt are stored in wizard state and persisted
 * with the book on creation.
 */
export function useCharacterPortrait() {
  const { show: showBillingNotification } = useBillingNotifications();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (
    opts: CharacterPortraitOptions
  ): Promise<CharacterPortraitResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithSession('/api/ai/character-portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      });
      const json = await res.json();
      if (!json.success) {
        if (handleBillingApiError(res.status, json, showBillingNotification)) return null;
        throw new Error(json.error?.message ?? 'Could not draw the character');
      }
      return json.data as CharacterPortraitResult;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not draw the character');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => setError(null);

  return { loading, error, generate, reset };
}
