'use client';

import { useCallback, useState } from 'react';
import { useAuth } from './useAuth';
import { useKidProfile } from './useKidProfile';
import {
  useOnboardingProfile,
  persistableAvatarUrl,
  type OnboardingProfile,
} from './useOnboardingProfile';
import { DEFAULT_MASCOT_ID } from '@/lib/mascots/roster';

/**
 * Kid-profile persistence for the onboarding carousel.
 *
 * Extracted from ProfileSetupCarousel so the carousel can stay a pure UI
 * state-machine. The hook owns:
 *   - localStorage cache (always-on, via useOnboardingProfile.save)
 *   - PATCH /api/users/kids/[id] for the missing-fields gate flow
 *   - POST /api/users/kids for the createKid flow (AppGate, 0 kids yet)
 *   - submit/error state surfaced to the UI
 *
 * Two operations:
 *   - `patchKid(fields)` — incremental per-step save (missing-fields gate).
 *     No-op when targetKidId is unset. Throws on failure so the caller can
 *     abort step advancement.
 *   - `commit(payload)` — terminal save at the end of the carousel. Always
 *     writes localStorage; routes to PATCH or POST depending on mode.
 *     Returns boolean (true=success, false=failed and submitError set).
 *
 * Mode resolution at commit time:
 *   - targetKidId + isAuthenticated     → PATCH existing kid
 *   - createKidProfile + isAuthenticated → POST new kid
 *   - otherwise                          → localStorage-only (anonymous)
 */

interface UseKidPersistenceOptions {
  /** PATCH this existing kid at commit (missing-fields gate flow). */
  targetKidId?: string;
  /** POST a new kid at commit (AppGate's needsProfileSetup flow). */
  createKidProfile?: boolean;
}

/** Payload shape the carousel hands off to `commit`. Avatar is narrowed
 *  to only the fields persistence cares about so the hook isn't coupled
 *  to AvatarBuilderStep's full GeneratedAvatar type. */
export interface KidPersistencePayload {
  name: string;
  age: number | null;
  mascotId: string | null;
  avatar: { imageUrl: string; persisted: boolean } | null;
}

interface PatchKidFields {
  mascotId?: string;
  avatarUrl?: string;
  name?: string;
  age?: number;
}

export interface UseKidPersistence {
  submitting: boolean;
  submitError: string | null;
  clearError: () => void;
  /**
   * Incremental PATCH per-step in targetKidId mode — no-op (returns true)
   * when targetKidId is unset. Returns boolean so the caller can short-
   * circuit step advancement on failure; submitError + submitting are
   * managed internally. Symmetric with commit() so callers don't need to
   * juggle two error-handling styles.
   */
  patchKid: (fields: PatchKidFields) => Promise<boolean>;
  commit: (payload: KidPersistencePayload) => Promise<boolean>;
}

export function useKidPersistence(
  options: UseKidPersistenceOptions = {},
): UseKidPersistence {
  const { targetKidId, createKidProfile = false } = options;
  const { save } = useOnboardingProfile();
  const { isAuthenticated, getIdToken, user } = useAuth();
  const { refreshKids, updateKidLocal } = useKidProfile();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const clearError = useCallback(() => setSubmitError(null), []);

  const patchKid = useCallback(
    async (fields: PatchKidFields): Promise<boolean> => {
      if (!targetKidId || !isAuthenticated) return true; // no-op mode
      setSubmitError(null);
      setSubmitting(true);
      try {
        const token = await getIdToken();
        if (!token) throw new Error('Not authenticated — please sign in again');
        const res = await fetch(`/api/users/kids/${targetKidId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(fields),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error?.message ?? 'Could not save your profile');
        }
        // Use the PATCH response to update local kid state directly — no
        // follow-up GET needed. Falls back to a full refresh only when the
        // response shape is unexpected (defensive).
        try {
          const json = await res.json();
          if (json?.success && json.data && typeof json.data === 'object') {
            updateKidLocal(targetKidId, json.data);
          } else {
            await refreshKids();
          }
        } catch {
          await refreshKids();
        }
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Could not save');
        return false;
      } finally {
        setSubmitting(false);
      }
      return true;
    },
    [targetKidId, isAuthenticated, getIdToken, refreshKids, updateKidLocal],
  );

  const commit = useCallback(
    async (payload: KidPersistencePayload): Promise<boolean> => {
      setSubmitError(null);

      const finalMascot = payload.mascotId ?? DEFAULT_MASCOT_ID;
      const finalAvatarUrl = payload.avatar?.persisted
        ? persistableAvatarUrl(payload.avatar.imageUrl)
        : null;
      const finalName = payload.name || 'Friend';

      // Always cache to localStorage so future visits get personalised UI
      // even before the kid profile finishes loading from Firestore.
      const profile: OnboardingProfile = {
        name: finalName,
        age: payload.age,
        mascotId: finalMascot,
        avatarUrl: finalAvatarUrl,
        completedAt: new Date().toISOString(),
      };
      save(profile);

      // Mode A: PATCH existing kid (missing-fields gate).
      if (targetKidId && isAuthenticated) {
        setSubmitting(true);
        try {
          const token = await getIdToken();
          if (!token) throw new Error('Not authenticated — please sign in again');
          const res = await fetch(`/api/users/kids/${targetKidId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: finalName,
              mascotId: finalMascot,
              ...(finalAvatarUrl ? { avatarUrl: finalAvatarUrl } : {}),
              ...(payload.age != null ? { age: payload.age } : {}),
            }),
          });
          if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            throw new Error(json.error?.message ?? 'Could not update your profile');
          }
          await refreshKids();
        } catch (err) {
          setSubmitError(err instanceof Error ? err.message : 'Something went wrong');
          setSubmitting(false);
          return false;
        }
        setSubmitting(false);
        return true;
      }

      // Mode B: POST new kid (createKid path — authenticated, 0 kids yet).
      if (createKidProfile && isAuthenticated) {
        setSubmitting(true);
        try {
          const token = await getIdToken();
          if (!token) throw new Error('Not authenticated — please sign in again');
          // Synthesise a kid email from the parent's phone (deterministic,
          // hidden from the kid). createKid requires `email` as a unique
          // identifier; the real email comes later via Google linking.
          const kidEmailSeed = user?.phoneNumber ?? user?.uid ?? Date.now().toString();
          const kidEmail = `kid-${kidEmailSeed.replace(/[^a-z0-9]/gi, '')}-${Date.now()}@kid.gsi.local`;
          const res = await fetch('/api/users/kids', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: finalName,
              email: kidEmail,
              mascotId: finalMascot,
              avatarUrl: finalAvatarUrl,
              age: payload.age ?? undefined,
            }),
          });
          if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            throw new Error(json.error?.message ?? 'Could not save your profile');
          }
          await refreshKids();
        } catch (err) {
          setSubmitError(err instanceof Error ? err.message : 'Something went wrong');
          setSubmitting(false);
          return false;
        }
        setSubmitting(false);
      }

      // Mode C: localStorage-only (anonymous) — already saved above.
      return true;
    },
    [
      targetKidId,
      createKidProfile,
      isAuthenticated,
      getIdToken,
      user,
      refreshKids,
      save,
    ],
  );

  return { submitting, submitError, clearError, patchKid, commit };
}
