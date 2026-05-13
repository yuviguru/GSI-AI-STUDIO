'use client';

import { useState } from 'react';
import { fetchWithSession } from '@/lib/fetchWithSession';
import type { BookCharacter } from '@gsi/types';
import type { CharacterCreateInput, CharacterPatchInput } from '@/lib/validators';

/**
 * Mutations for the character array on an existing book. Pair with `useBook`
 * — pass its `refresh` so the cache updates after each mutation. The 3-cap
 * is enforced server-side.
 */
export function useBookCharacters(
  bookId: string | null,
  onChange: () => Promise<unknown>
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async <T>(fn: () => Promise<T>): Promise<T | null> => {
    setBusy(true);
    setError(null);
    try {
      const result = await fn();
      await onChange();
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Character action failed');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const addCharacter = (input: CharacterCreateInput) =>
    run(async () => {
      if (!bookId) throw new Error('No book');
      const res = await fetchWithSession(`/api/books/${bookId}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Could not add character');
      return json.data.character as BookCharacter;
    });

  const updateCharacter = (characterId: string, patch: CharacterPatchInput) =>
    run(async () => {
      if (!bookId) throw new Error('No book');
      const res = await fetchWithSession(
        `/api/books/${bookId}/characters/${characterId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Could not update character');
      return json.data.character as BookCharacter;
    });

  const removeCharacter = (characterId: string) =>
    run(async () => {
      if (!bookId) throw new Error('No book');
      const res = await fetchWithSession(
        `/api/books/${bookId}/characters/${characterId}`,
        { method: 'DELETE' }
      );
      if (!res.ok && res.status !== 204) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message ?? 'Could not remove character');
      }
      return true as const;
    });

  return { busy, error, addCharacter, updateCharacter, removeCharacter };
}
