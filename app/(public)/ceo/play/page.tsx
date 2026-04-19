'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, PartyPopper } from 'lucide-react';
import { BusinessDashboard } from '@/components/ceo/BusinessDashboard';
import { CeoProfileCard } from '@/components/ceo/CeoProfileCard';
import { DecisionFeedback } from '@/components/ceo/DecisionFeedback';
import { EventFeed } from '@/components/ceo/EventFeed';
import { PhaseProgress } from '@/components/ceo/PhaseProgress';
import { Mascot } from '@/components/mascot/Mascot';
import { useCeoBusiness } from '@/hooks/useCeoBusiness';
import { useCeoProfile } from '@/hooks/useCeoProfile';
import type {
  CeoChoiceId,
  CeoDimensionScores,
} from '@/types';

interface FeedbackPayload {
  eventTitle: string;
  choiceText: string;
  scores: CeoDimensionScores;
  feedback: string;
  aiPointsEarned: number;
  newBadges: string[];
  phaseAdvanced: boolean;
  milestoneResolved: string | null;
  businessCompleted: boolean;
}

function PlaySkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-col items-center gap-3">
        <Mascot expression="thinking" size="md" />
        <p className="animate-pulse text-sm text-brand-text-muted">
          Your first decision is coming...
        </p>
      </div>
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-3xl bg-gray-100" />
        <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
        <div className="h-48 animate-pulse rounded-3xl bg-gray-100" />
      </div>
    </div>
  );
}

function PlayPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const businessIdParam = searchParams.get('businessId') ?? undefined;

  const {
    business,
    pendingEvent,
    decisionHistory,
    loading,
    error,
    decide,
  } = useCeoBusiness({
    businessId: businessIdParam,
    autoFetch: true,
  });

  // Completed-state profile (only fetch when we need it)
  const profileHook = useCeoProfile(
    business && business.status === 'completed'
      ? { businessId: business.id }
      : { businessId: '' },
  );

  const [feedback, setFeedback] = useState<FeedbackPayload | null>(null);
  const [deciding, setDeciding] = useState(false);
  const [decideError, setDecideError] = useState<string | null>(null);

  // Track when the current pending event was first shown so we can compute
  // a response-time in seconds when the kid picks a choice.
  const eventStartRef = useRef<number | null>(null);
  const currentEventIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (pendingEvent && pendingEvent.id !== currentEventIdRef.current) {
      currentEventIdRef.current = pendingEvent.id;
      eventStartRef.current = Date.now();
    }
    if (!pendingEvent) {
      currentEventIdRef.current = null;
      eventStartRef.current = null;
    }
  }, [pendingEvent]);

  // Redirect to register if we're done loading and there's no business
  useEffect(() => {
    if (!loading && !error && !business) {
      router.replace('/ceo/register');
    }
  }, [loading, error, business, router]);

  const handleChoose = useCallback(
    async (choiceId: CeoChoiceId) => {
      if (!pendingEvent) return;
      const start = eventStartRef.current ?? Date.now();
      const responseTimeSeconds = Math.max(
        1,
        Math.round((Date.now() - start) / 1000),
      );

      const eventTitle = pendingEvent.title;
      const choiceText =
        pendingEvent.choices.find((c) => c.id === choiceId)?.text ?? '';

      setDeciding(true);
      setDecideError(null);
      try {
        const res = await decide({
          eventId: pendingEvent.id,
          choiceId,
          responseTimeSeconds,
        });
        setFeedback({
          eventTitle,
          choiceText,
          scores: res.scores,
          feedback: res.feedback,
          aiPointsEarned: res.aiPointsEarned,
          newBadges: res.newBadges,
          phaseAdvanced: res.phaseAdvanced,
          milestoneResolved: res.milestoneResolved,
          businessCompleted: res.updatedBusiness.status === 'completed',
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Could not record your choice.';
        setDecideError(message);
      } finally {
        setDeciding(false);
      }
    },
    [decide, pendingEvent],
  );

  const closeFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  // ─── Render states ───────────────────────────────────────

  if (loading && !business) {
    return <PlaySkeleton />;
  }

  if (error && !business) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="font-display text-xl font-bold text-red-700">
            We couldn&apos;t load your business.
          </div>
          <p className="mt-1 text-sm text-red-700/80">{error}</p>
          <Link
            href="/ceo"
            className="mt-4 inline-block rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-ai"
          >
            Back to Kid CEO
          </Link>
        </div>
      </div>
    );
  }

  if (!business) {
    // Effect above handles the redirect. Render a minimal skeleton meanwhile.
    return <PlaySkeleton />;
  }

  // Completed: show celebration + profile CTA
  if (business.status === 'completed') {
    const profile = profileHook.profile;
    const shareUrl = profile?.shareUrl;
    const isPublic = profile?.isPublic ?? false;

    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/ceo"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-primary hover:text-brand-ai"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kid CEO
        </Link>

        <div className="rounded-3xl bg-gradient-to-br from-purple-500 to-brand-primary p-8 text-center text-white shadow-2xl">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
            <PartyPopper className="h-7 w-7" />
          </div>
          <h1 className="font-display text-3xl font-bold">
            Simulation complete!
          </h1>
          <p className="mt-2 text-white/90">
            You ran {business.businessName} through every phase. Time to meet
            your CEO Profile.
          </p>

          {profileHook.loading && !profile ? (
            <div className="mt-6 h-4 animate-pulse rounded bg-white/20" />
          ) : shareUrl && isPublic ? (
            <Link
              href={`/ceo/profile/${shareUrl}`}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 font-semibold text-brand-primary shadow-lg transition hover:-translate-y-0.5"
            >
              See your CEO Profile
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>

        {profile && business && (
          <div className="mt-6">
            <CeoProfileCard
              business={business}
              profile={profile}
              shareUrl={shareUrl ?? ''}
              canShare
            />
          </div>
        )}
      </div>
    );
  }

  // Active: main play surface
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-16">
      <Link
        href="/ceo"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-primary hover:text-brand-ai"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Kid CEO
      </Link>

      {decideError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {decideError}
        </div>
      )}

      <div className="space-y-5">
        <BusinessDashboard business={business} />

        <PhaseProgress
          currentPhase={business.phase}
          phaseMilestones={business.phaseMilestones}
        />

        <EventFeed
          activeEvent={pendingEvent}
          history={decisionHistory}
          onChoose={handleChoose}
          loading={deciding}
        />
      </div>

      {feedback && (
        <DecisionFeedback
          open
          choiceText={feedback.choiceText}
          scores={feedback.scores}
          feedback={feedback.feedback}
          aiPointsEarned={feedback.aiPointsEarned}
          phaseAdvanced={feedback.phaseAdvanced}
          milestoneResolved={feedback.milestoneResolved}
          businessCompleted={feedback.businessCompleted}
          onClose={closeFeedback}
        />
      )}
    </div>
  );
}

export default function CeoPlayPage() {
  return (
    <Suspense fallback={<PlaySkeleton />}>
      <PlayPageInner />
    </Suspense>
  );
}
