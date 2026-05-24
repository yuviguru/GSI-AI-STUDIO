'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MascotPickerStep } from './MascotPickerStep';
import { NameStep } from './NameStep';
import {
  AvatarBuilderStep,
  type GeneratedAvatar,
} from './AvatarBuilderStep';
import { XrayTeachingStep } from './XrayTeachingStep';
import { DEFAULT_MASCOT_ID, getMascot } from '@/lib/mascots/roster';
import { MascotAvatar } from '@/components/mascot/MascotAvatar';
import { useAuth } from '@/hooks/useAuth';
import { useKidProfile } from '@/hooks/useKidProfile';
import {
  useOnboardingProfile,
  persistableAvatarUrl,
  type OnboardingProfile,
} from '@/hooks/useOnboardingProfile';

const ONBOARDING_DONE_KEY = 'gsi-onboarding-complete';

type Step = 'mascot' | 'name' | 'avatar' | 'xray' | 'done';

interface ProfileSetupCarouselProps {
  onComplete: () => void;
  /**
   * When true, the final step creates a verified kid profile in Firestore
   * via /api/users/kids instead of (or in addition to) localStorage.
   * Used by the authenticated layout gate when the parent has 0 kids.
   */
  createKidProfile?: boolean;
  /**
   * Start the carousel at a specific step instead of 'mascot'. Use 'avatar'
   * when an existing profile only needs the avatar filled in. Defaults to 'mascot'.
   */
  initialStep?: Step;
  /**
   * When set, finishing the carousel updates this existing kid via PATCH
   * `/api/users/kids/[kidId]` instead of creating a new one. Used by the
   * "missing-fields" gate to fill in mascot/avatar for a kid that was created
   * with incomplete data (e.g. avatar generation didn't persist).
   */
  targetKidId?: string;
}

const stepVariants = {
  enter: { opacity: 0, x: 30 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
};

export function ProfileSetupCarousel({
  onComplete,
  createKidProfile = false,
  initialStep = 'mascot',
  targetKidId,
}: ProfileSetupCarouselProps) {
  const { profile: existingOnboarding, save } = useOnboardingProfile();
  const { isAuthenticated, getIdToken, user } = useAuth();
  const { activeKid, refreshKids, updateKidLocal } = useKidProfile();
  const [step, setStep] = useState<Step>(initialStep);

  // Pre-fill from whatever profile data already exists, in priority order:
  // authenticated active kid → anonymous onboarding profile → defaults. This
  // lets the carousel be re-opened to fill in *just* the missing pieces (e.g.
  // mascot was saved, avatar generation failed → re-enter at the avatar step
  // with the existing mascot/name already populated).
  const initialMascotId =
    activeKid?.mascotId ?? existingOnboarding?.mascotId ?? DEFAULT_MASCOT_ID;
  const initialName = activeKid?.name ?? existingOnboarding?.name ?? '';
  const initialAge = activeKid?.age ?? existingOnboarding?.age ?? null;
  const initialAvatar: GeneratedAvatar | null = (() => {
    const existingUrl = activeKid?.avatarUrl ?? existingOnboarding?.avatarUrl;
    if (!existingUrl) return null;
    // Already-persisted URL — re-hydrate enough of GeneratedAvatar so the
    // avatar step's preview shows it and "Next" works without regenerating.
    return { imageUrl: existingUrl, persisted: true } as GeneratedAvatar;
  })();

  const [mascotId, setMascotId] = useState<string | null>(initialMascotId);
  const [name, setName] = useState(initialName);
  const [age, setAge] = useState<number | null>(initialAge);
  const [avatar, setAvatar] = useState<GeneratedAvatar | null>(initialAvatar);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * Incremental kid-doc save. Used in `targetKidId` mode (the missing-fields
   * gate scenario) so that each step persists its own field as the user
   * completes it — instead of all data piling up until the final "Open my
   * dashboard" click. Two reasons:
   *   1. Drop-off safety: if the user closes the carousel mid-flow, what
   *      they've already done is saved. Refresh re-opens the gate only on
   *      the fields that are still missing.
   *   2. Visibility: the user (and dev console) sees the PATCH go out
   *      immediately after each step, instead of a hidden batch at the end.
   *
   * No-op when targetKidId is unset (the createKid path still uses the
   * end-of-flow POST).
   */
  const patchKid = useCallback(
    async (fields: {
      mascotId?: string;
      avatarUrl?: string;
      name?: string;
      age?: number;
    }) => {
      if (!targetKidId || !isAuthenticated) return;
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
      // need for a follow-up GET /api/users/kids since we already have
      // the authoritative new values. This eliminates the redundant kids
      // refresh that previously fired after every incremental save.
      try {
        const json = await res.json();
        if (json?.success && json.data && typeof json.data === 'object') {
          updateKidLocal(targetKidId, json.data);
        } else {
          // Defensive — if the response shape is unexpected, fall back to
          // the full refresh so we don't leave the UI showing stale state.
          await refreshKids();
        }
      } catch {
        // Couldn't parse JSON — fall back to full refresh.
        await refreshKids();
      }
    },
    [targetKidId, isAuthenticated, getIdToken, refreshKids, updateKidLocal],
  );

  const finish = useCallback(async () => {
    setSubmitError(null);

    const finalMascot = mascotId ?? DEFAULT_MASCOT_ID;
    const finalAvatarUrl = avatar?.persisted
      ? persistableAvatarUrl(avatar.imageUrl)
      : null;
    const finalName = name || 'Friend';

    // Always cache to localStorage so future visits get the personalised UI
    // even before the kid profile finishes loading.
    const profile: OnboardingProfile = {
      name: finalName,
      age,
      mascotId: finalMascot,
      avatarUrl: finalAvatarUrl,
      completedAt: new Date().toISOString(),
    };
    save(profile);

    // Authenticated PATCH mode: an existing kid is being updated to fill in
    // missing mascot/avatar. Uses /api/users/kids/[kidId] instead of POST.
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
            ...(age != null ? { age } : {}),
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
        return;
      }
      setSubmitting(false);
      onComplete();
      return;
    }

    // Authenticated mode: create the verified kid profile in Firestore.
    // This is the path taken by the AppGate when the parent has 0 kids —
    // we skip the legacy KidProfileSetup form because we already collected
    // everything in this carousel.
    if (createKidProfile && isAuthenticated) {
      setSubmitting(true);
      try {
        const token = await getIdToken();
        if (!token) throw new Error('Not authenticated — please sign in again');

        // Synthesise a kid email from the parent's phone (deterministic, hidden
        // from the kid). The email field is required by the createKid API as
        // a unique identifier; for parent-managed kids the real email comes
        // later via Google linking. This pattern matches the legacy form.
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
            age: age ?? undefined,
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
        return;
      }
      setSubmitting(false);
    }

    try {
      localStorage.setItem(ONBOARDING_DONE_KEY, 'true');
    } catch {
      // non-blocking
    }
    onComplete();
  }, [
    name,
    age,
    mascotId,
    avatar,
    save,
    onComplete,
    createKidProfile,
    targetKidId,
    isAuthenticated,
    getIdToken,
    user,
    refreshKids,
  ]);

  const skip = useCallback(() => {
    // Write a minimal default profile so downstream features (greeting,
    // leaderboard self-row, mascot-aware copy) always have a mascot to
    // render. Better than null-checking everywhere. The kid can change it
    // later from settings.
    //
    // Use the existingOnboarding value already loaded by the hook above as
    // the "do I need to write a default?" signal — earlier this read a
    // separate localStorage key directly, but that key (`gsi-kid-profile`)
    // is never the one useOnboardingProfile writes to, so the read always
    // missed and the check was dead code.
    if (!existingOnboarding) {
      save({
        name: name || 'Friend',
        age: age,
        mascotId: mascotId ?? DEFAULT_MASCOT_ID,
        avatarUrl: avatar?.persisted ? persistableAvatarUrl(avatar.imageUrl) : null,
        completedAt: new Date().toISOString(),
      });
    }
    try {
      localStorage.setItem(ONBOARDING_DONE_KEY, 'true');
    } catch {
      // non-blocking
    }
    onComplete();
  }, [existingOnboarding, name, age, mascotId, avatar, save, onComplete]);

  const mascot = getMascot(mascotId);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
    >
      {/* Skip button */}
      <div className="absolute right-4 top-4 z-10">
        <button
          type="button"
          onClick={skip}
          className="rounded-full px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:text-gray-600"
        >
          Skip
        </button>
      </div>

      {/* Top-level error banner — surfaces failures from incremental kid-doc
          PATCH calls (mascot, avatar) that happen on step transitions. Without
          this, errors set by the per-step handlers would never be visible
          (the per-step error UI only renders inside the done step). */}
      {submitError && step !== 'done' && (
        <div className="absolute inset-x-4 top-16 z-10 mx-auto max-w-md">
          <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600 shadow-sm">
            {submitError}
          </p>
        </div>
      )}

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {step === 'mascot' && (
            <motion.div
              key="mascot"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="flex flex-1 flex-col"
            >
              <MascotPickerStep
                selectedId={mascotId}
                onSelect={setMascotId}
                onNext={async () => {
                  // Incremental save: persist mascot to the kid doc right
                  // away in targetKidId mode. Block advancement on failure
                  // so the user sees the error instead of moving on with
                  // unsaved state.
                  if (targetKidId && mascotId) {
                    setSubmitError(null);
                    setSubmitting(true);
                    try {
                      await patchKid({ mascotId });
                    } catch (err) {
                      setSubmitError(
                        err instanceof Error
                          ? err.message
                          : 'Could not save mascot',
                      );
                      setSubmitting(false);
                      return;
                    }
                    setSubmitting(false);
                  }
                  setStep('name');
                }}
              />
            </motion.div>
          )}

          {step === 'name' && (
            <motion.div
              key="name"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="flex flex-1 flex-col"
            >
              <NameStep
                mascotId={mascotId}
                initialName={name}
                initialAge={age}
                onNext={(n, a) => {
                  setName(n);
                  setAge(a);
                  setStep('avatar');
                }}
                onBack={() => setStep('mascot')}
              />
            </motion.div>
          )}

          {step === 'avatar' && (
            <motion.div
              key="avatar"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="flex flex-1 flex-col"
            >
              <AvatarBuilderStep
                initial={avatar}
                onNext={async (a) => {
                  setAvatar(a);
                  // Incremental save: persist avatarUrl to the kid doc as
                  // soon as the generated avatar is on the allowlist. If the
                  // server returned persisted=false (Storage upload failed),
                  // AvatarBuilderStep already blocks the Next button — but
                  // we double-check here too so a stale state can't slip
                  // past.
                  if (targetKidId && a.persisted) {
                    const url = persistableAvatarUrl(a.imageUrl);
                    if (url) {
                      setSubmitError(null);
                      setSubmitting(true);
                      try {
                        await patchKid({ avatarUrl: url });
                      } catch (err) {
                        setSubmitError(
                          err instanceof Error
                            ? err.message
                            : 'Could not save avatar',
                        );
                        setSubmitting(false);
                        return;
                      }
                      setSubmitting(false);
                    }
                  }
                  setStep('xray');
                }}
                onBack={() => setStep('name')}
              />
            </motion.div>
          )}

          {step === 'xray' && avatar && (
            <motion.div
              key="xray"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="flex flex-1 flex-col"
            >
              <XrayTeachingStep
                avatar={avatar}
                kidName={name || 'you'}
                mascotName={mascot.name}
                onNext={() => setStep('done')}
                onBack={() => setStep('avatar')}
              />
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div
              key="done"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="flex flex-1 flex-col items-center justify-center px-5 py-6 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="relative">
                  {avatar?.imageUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={avatar.imageUrl}
                      alt={`${name}'s avatar`}
                      className="h-32 w-32 rounded-3xl object-cover shadow-md"
                    />
                  )}
                  <div className="absolute -bottom-3 -right-3">
                    <MascotAvatar id={mascotId} size="md" tile animate />
                  </div>
                </div>

                <div>
                  <h2 className="font-display text-2xl font-bold text-gray-900">
                    Welcome aboard, {name || 'friend'}! 🎉
                  </h2>
                  <p className="mt-2 text-sm text-gray-600">
                    {mascot.name} is right beside you. Let&rsquo;s build something amazing.
                  </p>
                </div>

                {submitError && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                    {submitError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={finish}
                  disabled={submitting}
                  className="mt-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 px-8 py-3 text-base font-semibold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Saving…' : 'Open my dashboard ✨'}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export { ONBOARDING_DONE_KEY };
