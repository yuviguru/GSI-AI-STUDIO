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
}

const stepVariants = {
  enter: { opacity: 0, x: 30 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
};

export function ProfileSetupCarousel({
  onComplete,
  createKidProfile = false,
}: ProfileSetupCarouselProps) {
  const { save } = useOnboardingProfile();
  const { isAuthenticated, getIdToken, user } = useAuth();
  const { refreshKids } = useKidProfile();
  const [step, setStep] = useState<Step>('mascot');
  // Pre-select the brand default (Pixie). During pilot all other mascots are
  // locked so the picker is effectively a "meet your buddy" screen — no need
  // to make the kid click before Next is enabled. They can still see all
  // mascots in the grid; locked tiles show a "Soon" badge.
  const [mascotId, setMascotId] = useState<string | null>(DEFAULT_MASCOT_ID);
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [avatar, setAvatar] = useState<GeneratedAvatar | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
    isAuthenticated,
    getIdToken,
    user,
    refreshKids,
  ]);

  const skip = useCallback(() => {
    // Write a minimal default profile so downstream features (greeting, leaderboard
    // self-row, mascot-aware copy) always have a mascot to render. Better than
    // null-checking everywhere. The kid can change it later from settings.
    const existing = (() => {
      try {
        const raw = localStorage.getItem('gsi-kid-profile');
        return raw ? (JSON.parse(raw) as OnboardingProfile) : null;
      } catch {
        return null;
      }
    })();
    if (!existing) {
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
  }, [name, age, mascotId, avatar, save, onComplete]);

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
                onNext={() => setStep('name')}
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
                onNext={(a) => {
                  setAvatar(a);
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
