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
import { useKidProfile } from '@/hooks/useKidProfile';
import {
  useOnboardingProfile,
  persistableAvatarUrl,
  type OnboardingProfile,
} from '@/hooks/useOnboardingProfile';
import { useKidPersistence } from '@/hooks/useKidPersistence';

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
  const { activeKid } = useKidProfile();
  // Persistence (PATCH/POST/localStorage + submit state) lives in this hook
  // so the carousel stays a pure UI state-machine. patchKid is the
  // per-step incremental save; commit is the terminal end-of-flow save.
  const {
    patchKid,
    commit,
    submitting,
    submitError,
    clearError,
  } = useKidPersistence({ targetKidId, createKidProfile });
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

  // Terminal save at the end of the flow. The hook owns the three
  // persistence modes (PATCH existing kid / POST new kid / localStorage-
  // only) and the submit/error state; we just hand it the final payload
  // and route on success.
  const finish = useCallback(async () => {
    const ok = await commit({ name, age, mascotId, avatar });
    if (!ok) return;
    try {
      localStorage.setItem(ONBOARDING_DONE_KEY, 'true');
    } catch {
      // non-blocking
    }
    onComplete();
  }, [commit, name, age, mascotId, avatar, onComplete]);

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
                  // away in targetKidId mode (no-op otherwise). patchKid
                  // manages submitting/submitError internally and returns
                  // false on failure so we can block advancement; the
                  // submitError banner above surfaces the error.
                  if (mascotId) {
                    const ok = await patchKid({ mascotId });
                    if (!ok) return;
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
                  // Incremental save: persist avatarUrl as soon as the
                  // generated avatar is on the allowlist (AvatarBuilderStep
                  // already blocks Next when persisted=false; this is a
                  // second-line check). patchKid is a no-op outside
                  // targetKidId mode, so this is safe in all flows.
                  if (a.persisted) {
                    const url = persistableAvatarUrl(a.imageUrl);
                    if (url) {
                      const ok = await patchKid({ avatarUrl: url });
                      if (!ok) return;
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
