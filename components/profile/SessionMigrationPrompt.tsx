'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth, type ClaimedSessionSummary } from '@/hooks/useAuth';
import { useKidProfile } from '@/hooks/useKidProfile';
import { ProfileSetupCarousel } from '@/components/onboarding/ProfileSetupCarousel';

const MAX_KIDS = 4;

interface SessionMigrationPromptProps {
  claimedData: ClaimedSessionSummary;
  hasKids: boolean;
  kidCount: number;
  onComplete: () => void;
}

type View = 'prompt' | 'confirm-delete' | 'carousel';

/**
 * Simplified session migration prompt — shown when a user authenticates
 * and has pending anonymous session data (`claimedSessionData`).
 *
 * Two scenarios:
 * 1. New user (no kids): "Keep my work" → ProfileSetupCarousel (createKid
 *    auto-consumes claimedSessionData) or "Start fresh" → discard + carousel.
 * 2. Existing user (has kids): "Save as new profile" → carousel → assign data
 *    to new kid, or "Delete this data" → discard.
 */
export function SessionMigrationPrompt({
  claimedData,
  hasKids,
  kidCount,
  onComplete,
}: SessionMigrationPromptProps) {
  const { getIdToken, refreshProfile } = useAuth();
  const { refreshKids, kids } = useKidProfile();

  const [view, setView] = useState<View>('prompt');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAddNewProfile = kidCount < MAX_KIDS;

  // ── Discard claimed data ──────────────────────────────────────────────

  async function handleDiscard() {
    setError(null);
    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/users/discard-claimed-data', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message || 'Failed to discard data');
      }

      await refreshProfile();
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  // ── New kid created (existing user "save as new profile" path) ────────

  async function handleNewKidCreated() {
    // Carousel creates the kid. For new users (no existing kids), createKid()
    // auto-consumes claimedSessionData. For existing users, we need to
    // explicitly assign via the API.
    if (hasKids) {
      const token = await getIdToken();
      if (token) {
        try {
          // Re-fetch kids list to find the newly created kid
          const res = await fetch('/api/users/kids', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const json = await res.json();
            const allKids = (json.data?.kids ?? []) as { id: string }[];
            const existingIds = new Set(kids.map((k) => k.id));
            const newKid = allKids.find((k) => !existingIds.has(k.id));

            if (newKid) {
              await fetch('/api/users/assign-claimed-data', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ kidId: newKid.id }),
              });
            }
          }
        } catch {
          // Non-blocking — data persists and prompt will reappear
        }
      }
    }

    await Promise.all([refreshProfile(), refreshKids()]);
    onComplete();
  }

  // ── Inline carousel for creating a new kid profile ─────────────────────

  if (view === 'carousel') {
    return (
      <ProfileSetupCarousel
        createKidProfile
        onComplete={handleNewKidCreated}
      />
    );
  }

  // ── Data summary card ─────────────────────────────────────────────────

  const hasAnything =
    claimedData.aiPoints > 0 ||
    claimedData.badgeCount > 0 ||
    claimedData.totalCreationCount > 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-amber-50 via-white to-purple-50 p-6">
      <AnimatePresence mode="wait">
        {/* ─── Main prompt ─── */}
        {view === 'prompt' && (
          <motion.div
            key="prompt"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm space-y-6 text-center"
          >
            {/* Icon + heading */}
            <div>
              <span className="text-5xl">{hasKids ? '📦' : '🎨'}</span>
              <h1 className="mt-3 text-xl font-bold text-gray-900">
                {hasKids
                  ? 'Guest session found'
                  : 'You have work from your guest session!'}
              </h1>
              <p className="mx-auto mt-2 max-w-xs text-sm text-gray-500">
                {hasKids
                  ? "There's unsaved work from before you signed in."
                  : "You created some cool stuff before signing in. Want to keep it?"}
              </p>
            </div>

            {/* Summary card */}
            {hasAnything && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
                className="mx-auto rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
              >
                <div className="flex items-center gap-4">
                  {claimedData.onboarding?.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={claimedData.onboarding.avatarUrl}
                      alt="Guest avatar"
                      className="h-14 w-14 rounded-full object-cover ring-2 ring-amber-200"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl">
                      🎨
                    </div>
                  )}
                  <div className="text-left text-sm">
                    {claimedData.onboarding?.name && (
                      <p className="font-semibold text-gray-800">
                        {claimedData.onboarding.name}&apos;s session
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                      {claimedData.aiPoints > 0 && (
                        <span className="rounded-full bg-purple-50 px-2 py-0.5 font-medium text-purple-600">
                          {claimedData.aiPoints} XP
                        </span>
                      )}
                      {claimedData.badgeCount > 0 && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-600">
                          {claimedData.badgeCount} badge{claimedData.badgeCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      {claimedData.totalCreationCount > 0 && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-600">
                          {claimedData.totalCreationCount} creation{claimedData.totalCreationCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Action buttons */}
            <div className="space-y-3">
              {!hasKids ? (
                /* ── New user: Keep / Start fresh ── */
                <>
                  <button
                    onClick={onComplete}
                    className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 active:scale-[0.98]"
                  >
                    Keep my work
                  </button>
                  <button
                    onClick={() => setView('confirm-delete')}
                    className="w-full text-sm text-gray-400 transition hover:text-gray-600"
                  >
                    Start fresh instead
                  </button>
                </>
              ) : (
                /* ── Existing user: Save as new / Delete ── */
                <>
                  <button
                    onClick={() => setView('carousel')}
                    disabled={!canAddNewProfile}
                    className={cn(
                      'w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]',
                      canAddNewProfile
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'cursor-not-allowed bg-gray-300',
                    )}
                  >
                    Save as new profile
                  </button>
                  {!canAddNewProfile && (
                    <p className="text-xs text-amber-600">
                      Account full ({MAX_KIDS} profiles max). Delete this data or use a different number.
                    </p>
                  )}
                  <button
                    onClick={() => setView('confirm-delete')}
                    className="w-full text-sm text-gray-400 transition hover:text-gray-600"
                  >
                    Delete this data
                  </button>
                </>
              )}
            </div>

            {/* Skip */}
            <button
              onClick={onComplete}
              className="text-xs text-gray-300 transition hover:text-gray-500"
            >
              Skip for now
            </button>

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">
                {error}
              </p>
            )}
          </motion.div>
        )}

        {/* ─── Confirm delete ─── */}
        {view === 'confirm-delete' && (
          <motion.div
            key="confirm-delete"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm space-y-6 text-center"
          >
            <div>
              <span className="text-5xl">
                {'⚠️'}
              </span>
              <h2 className="mt-3 text-xl font-bold text-gray-900">
                Are you sure?
              </h2>
              <p className="mx-auto mt-2 max-w-xs text-sm text-gray-500">
                This will permanently erase all guest session data — XP, badges,
                and creations. This cannot be undone.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleDiscard}
                disabled={loading}
                className={cn(
                  'w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]',
                  loading
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-red-500 hover:bg-red-600',
                )}
              >
                {loading ? 'Deleting...' : 'Yes, delete it'}
              </button>
              <button
                onClick={() => { setView('prompt'); setError(null); }}
                disabled={loading}
                className="w-full text-sm text-gray-500 transition hover:text-gray-700"
              >
                Go back
              </button>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">
                {error}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
