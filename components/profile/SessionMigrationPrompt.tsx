'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth, type ClaimedSessionSummary } from '@/hooks/useAuth';
import { useKidProfile } from '@/hooks/useKidProfile';
import { LockedProfilePicker } from './LockedProfilePicker';

const MAX_KIDS = 4;

interface SessionMigrationPromptProps {
  claimedData: ClaimedSessionSummary;
  hasKids: boolean;
  kidCount: number;
  /** The anonymous session id whose migration this prompt is resolving.
   *  Passed to the discard endpoint so the server can soft-archive that
   *  specific session doc + its creations. */
  pendingSessionId: string | null;
  /** Resolution callback. Receives the resolution outcome so AppGate /
   *  caller can route accordingly:
   *    - 'kept'      → user accepted; let the next gate render (profile setup
   *                    carousel for new users, AppGate's normal flow takes over)
   *    - 'discarded' → user rejected; data archived server-side
   *    - 'signed-out'→ user chose sign-out instead (full account case). No
   *                    further routing needed — the page reloads via signOut. */
  onResolved: (outcome: 'kept' | 'discarded' | 'signed-out') => void;
}

type View = 'prompt' | 'confirm-discard' | 'locked-picker';

/**
 * Sign-in migration prompt — one-shot per sign-in, three branches.
 *
 *   Branch A — New user (0 kids):
 *     "We found your guest work. Let's give it a home."
 *     [Keep my work] → onResolved('kept'). AppGate routes to
 *       needsProfileSetup → ProfileSetupCarousel → createKid auto-consumes
 *       the claimedSessionData.
 *     [Start fresh] → archive server-side → onResolved('discarded').
 *
 *   Branch B — Existing user with room (1-3 kids):
 *     "Your guest work needs its own profile."
 *     [Save as new profile] → LockedProfilePicker → createKid carousel
 *       → onResolved('kept').
 *     [Discard] → archive → onResolved('discarded').
 *
 *   Branch C — Existing user, account full (4 kids):
 *     "Account full. To keep this work, sign out and sign up with a
 *      different phone number."
 *     [Discard and continue] → archive → onResolved('discarded').
 *     [Sign out instead] → signOut({ preserveAnonymous: true })
 *       → onResolved('signed-out'). Anonymous localStorage stays intact so
 *       the user can immediately re-sign-up under a new number.
 */
export function SessionMigrationPrompt({
  claimedData,
  hasKids,
  kidCount,
  pendingSessionId,
  onResolved,
}: SessionMigrationPromptProps) {
  const { getIdToken, refreshProfile, signOut } = useAuth();
  const { refreshKids } = useKidProfile();

  const [view, setView] = useState<View>('prompt');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAddNewProfile = kidCount < MAX_KIDS;
  const isFull = hasKids && !canAddNewProfile;

  // ── Discard (soft-archive) ────────────────────────────────────────────

  async function handleDiscard() {
    setError(null);
    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/users/discard-claimed-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(
          pendingSessionId ? { sessionId: pendingSessionId } : {},
        ),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message || 'Failed to archive data');
      }

      await refreshProfile();
      onResolved('discarded');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  // ── LockedProfilePicker completed (new kid created with the data) ─────

  async function handleNewKidCreated() {
    await Promise.all([refreshProfile(), refreshKids()]);
    onResolved('kept');
  }

  // ── Branch C escape hatch — sign out preserving anonymous bucket ──────

  async function handleSignOutInstead() {
    setError(null);
    setLoading(true);
    try {
      onResolved('signed-out');
      // signOut redirects to '/' so the prompt unmounts naturally.
      await signOut({ preserveAnonymous: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign out failed');
      setLoading(false);
    }
  }

  // ── LockedProfilePicker view (Branch B keep path) ─────────────────────

  if (view === 'locked-picker') {
    return <LockedProfilePicker onComplete={handleNewKidCreated} />;
  }

  // ── Data summary card content ─────────────────────────────────────────

  const hasAnything =
    claimedData.aiPoints > 0 ||
    claimedData.badgeCount > 0 ||
    claimedData.totalCreationCount > 0 ||
    Boolean(claimedData.onboarding?.name);

  // Resolve copy by branch
  const heading = hasKids
    ? isFull
      ? 'Account full — guest work can\'t be saved here'
      : 'Your guest work needs its own profile'
    : 'Let\'s give your guest work a home';

  const subheading = hasKids
    ? isFull
      ? `You already have ${MAX_KIDS} kid profiles. To keep this work, sign out and sign up with a different phone number.`
      : 'We can\'t merge it into an existing kid — we don\'t know which kid did the guest work. Create a new profile for it instead.'
    : 'Your guest creations, points, and avatar are ready to move into your new profile.';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-amber-50 via-white to-purple-50 p-6">
      <AnimatePresence mode="wait">
        {view === 'prompt' && (
          <motion.div
            key="prompt"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm space-y-6 text-center"
          >
            <div>
              <span className="text-5xl">{isFull ? '🚫' : hasKids ? '📦' : '🎨'}</span>
              <h1 className="mt-3 text-xl font-bold text-gray-900">{heading}</h1>
              <p className="mx-auto mt-2 max-w-xs text-sm text-gray-500">
                {subheading}
              </p>
            </div>

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
                          {claimedData.badgeCount} badge
                          {claimedData.badgeCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      {claimedData.totalCreationCount > 0 && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-600">
                          {claimedData.totalCreationCount} creation
                          {claimedData.totalCreationCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Action buttons — branched by case */}
            <div className="space-y-3">
              {isFull ? (
                /* ── Branch C: full account ── */
                <>
                  <button
                    type="button"
                    onClick={handleSignOutInstead}
                    disabled={loading}
                    className={cn(
                      'w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]',
                      loading
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700',
                    )}
                  >
                    Sign out — keep guest work on this device
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('confirm-discard')}
                    disabled={loading}
                    className="w-full text-sm text-gray-400 transition hover:text-gray-600"
                  >
                    Discard and continue
                  </button>
                </>
              ) : hasKids ? (
                /* ── Branch B: existing user with room ── */
                <>
                  <button
                    type="button"
                    onClick={() => setView('locked-picker')}
                    disabled={loading}
                    className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 active:scale-[0.98]"
                  >
                    Save as new profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('confirm-discard')}
                    disabled={loading}
                    className="w-full text-sm text-gray-400 transition hover:text-gray-600"
                  >
                    Discard guest work
                  </button>
                </>
              ) : (
                /* ── Branch A: new user (0 kids) ── */
                <>
                  <button
                    type="button"
                    onClick={() => onResolved('kept')}
                    disabled={loading}
                    className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 active:scale-[0.98]"
                  >
                    Keep my work
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('confirm-discard')}
                    disabled={loading}
                    className="w-full text-sm text-gray-400 transition hover:text-gray-600"
                  >
                    Start fresh
                  </button>
                </>
              )}
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">
                {error}
              </p>
            )}
          </motion.div>
        )}

        {view === 'confirm-discard' && (
          <motion.div
            key="confirm-discard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm space-y-6 text-center"
          >
            <div>
              <span className="text-5xl">⚠️</span>
              <h2 className="mt-3 text-xl font-bold text-gray-900">
                Are you sure?
              </h2>
              <p className="mx-auto mt-2 max-w-xs text-sm text-gray-500">
                Your guest avatar, XP, badges, and creations will be archived
                and removed from this account.
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleDiscard}
                disabled={loading}
                className={cn(
                  'w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]',
                  loading
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-red-500 hover:bg-red-600',
                )}
              >
                {loading ? 'Archiving…' : 'Yes, discard it'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setView('prompt');
                  setError(null);
                }}
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
