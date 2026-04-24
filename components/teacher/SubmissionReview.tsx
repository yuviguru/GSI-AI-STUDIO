'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ExternalLink, Star, Sparkles, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getConcept } from '@/lib/curriculum/curriculumMap';
import { useAuth } from '@/hooks/useAuth';
import type { SubmissionStatus } from '@/types/user.types';
import type { SubmissionRow } from './SubmissionGrid';

interface Props {
  submission: SubmissionRow;
  assignmentId: string;
  onReview: (
    submissionId: string,
    input: {
      status?: SubmissionStatus;
      feedback?: string | null;
      starred?: boolean;
      sharedToClassFeed?: boolean;
    },
  ) => Promise<void>;
  onPrev?: () => void;
  onNext?: () => void;
}

export function SubmissionReview({ submission, assignmentId, onReview, onPrev, onNext }: Props) {
  const { getIdToken } = useAuth();
  const [feedback, setFeedback] = useState(submission.feedback ?? '');
  const [starred, setStarred] = useState(!!submission.starred);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<'approved' | 'revision_requested' | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [previousFeedback, setPreviousFeedback] = useState<string | null>(null);
  const [locale, setLocale] = useState<'en' | 'hi'>('en');
  const [sharedToClassFeed, setSharedToClassFeed] = useState(
    !!submission.sharedToClassFeed,
  );
  const [shareSaving, setShareSaving] = useState(false);

  // Reset local state when the submission changes
  useEffect(() => {
    setFeedback(submission.feedback ?? '');
    setStarred(!!submission.starred);
    setSaved(null);
    setSuggestError(null);
    setPreviousFeedback(null);
    setSharedToClassFeed(!!submission.sharedToClassFeed);
  }, [
    submission.id,
    submission.feedback,
    submission.starred,
    submission.sharedToClassFeed,
  ]);

  async function toggleShareToFeed() {
    const next = !sharedToClassFeed;
    setSharedToClassFeed(next);
    setShareSaving(true);
    try {
      await onReview(submission.id, { sharedToClassFeed: next });
    } finally {
      setShareSaving(false);
    }
  }

  async function handleSuggestFeedback() {
    setSuggesting(true);
    setSuggestError(null);
    try {
      const token = await getIdToken();
      const res = await fetch(
        `/api/assignments/${assignmentId}/submissions/${submission.id}/suggest-feedback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ locale }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message ?? 'Could not generate feedback draft.');
      }
      const data = json.data as {
        positive: string;
        growthArea: string;
        followUpPrompts: string[];
      };
      const assembled = [
        data.positive,
        data.growthArea,
        data.followUpPrompts.length > 0
          ? `Follow-up questions:\n${data.followUpPrompts.map((p) => `• ${p}`).join('\n')}`
          : null,
      ]
        .filter(Boolean)
        .join('\n\n');
      setPreviousFeedback(feedback);
      setFeedback(assembled);
    } catch (err) {
      setSuggestError(
        err instanceof Error ? err.message : 'Could not generate feedback draft.',
      );
    } finally {
      setSuggesting(false);
    }
  }

  function handleRevertSuggestion() {
    if (previousFeedback === null) return;
    setFeedback(previousFeedback);
    setPreviousFeedback(null);
  }

  async function act(status: SubmissionStatus) {
    setBusy(true);
    try {
      await onReview(submission.id, {
        status,
        feedback: feedback.trim().length > 0 ? feedback : null,
        starred,
      });
      setSaved(status === 'pending' ? null : status);
    } finally {
      setBusy(false);
    }
  }

  async function toggleStar() {
    const next = !starred;
    setStarred(next);
    setBusy(true);
    try {
      await onReview(submission.id, { starred: next });
    } finally {
      setBusy(false);
    }
  }

  const concepts = submission.creation?.aiConceptsTaught ?? [];

  return (
    <div className="space-y-4 rounded-3xl border border-gray-100 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            {submission.kid.name}
            {submission.kid.grade ? ` · Grade ${submission.kid.grade}` : ''}
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Submitted {submission.submittedAt.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onPrev && (
            <button
              onClick={onPrev}
              className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
              aria-label="Previous"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          {onNext && (
            <button
              onClick={onNext}
              className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
              aria-label="Next"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={toggleStar}
            disabled={busy}
            className={cn(
              'rounded-lg border p-2 transition',
              starred
                ? 'border-amber-300 bg-amber-50 text-amber-500'
                : 'border-gray-200 text-gray-400 hover:bg-gray-50',
            )}
            aria-label="Star as exemplary"
          >
            <Star className={cn('h-4 w-4', starred && 'fill-amber-400')} />
          </button>
        </div>
      </div>

      {/* Creation preview */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
        {submission.creation ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">
                {submission.creation.title}
              </p>
              <Link
                href={`/view/${submission.creation.id}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700"
              >
                Open full view
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
            <p className="mt-1 text-xs text-gray-500">Type: {submission.creation.type}</p>
            {submission.creation.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={submission.creation.thumbnail}
                alt=""
                className="mt-3 max-h-48 w-full rounded-xl object-contain"
              />
            )}
            {concepts.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  AI concepts covered
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {concepts.map((id) => {
                    const c = getConcept(id);
                    return (
                      <span
                        key={id}
                        className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs text-purple-700"
                      >
                        {c?.name ?? id}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">
            The original creation is no longer available.
          </p>
        )}
      </div>

      {/* Feedback */}
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <label
            htmlFor={`feedback-${submission.id}`}
            className="text-sm font-medium text-gray-700"
          >
            Feedback (optional)
          </label>
          <div className="flex items-center gap-1.5">
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as 'en' | 'hi')}
              disabled={suggesting}
              className="rounded-md border border-gray-200 bg-white px-1.5 py-1 text-xs"
              aria-label="Suggestion language"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
            </select>
            {previousFeedback !== null && (
              <button
                type="button"
                onClick={handleRevertSuggestion}
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                title="Revert to what you had"
              >
                <Undo2 className="h-3 w-3" />
                Revert
              </button>
            )}
            <button
              type="button"
              onClick={handleSuggestFeedback}
              disabled={suggesting}
              className={cn(
                'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium',
                suggesting
                  ? 'border-gray-200 bg-gray-50 text-gray-400'
                  : 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100',
              )}
              title="Draft encouraging feedback with AI — you review and edit before saving"
            >
              <Sparkles className="h-3 w-3" />
              {suggesting ? 'Drafting…' : 'Suggest feedback'}
            </button>
          </div>
        </div>
        <textarea
          id={`feedback-${submission.id}`}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value.slice(0, 2000))}
          rows={5}
          placeholder="What did you love? What could be stronger next time?"
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
        />
        {suggestError && (
          <p className="mt-1 text-xs text-red-600">{suggestError}</p>
        )}
        {previousFeedback !== null && !suggestError && (
          <p className="mt-1 text-xs text-gray-500">
            AI draft inserted — edit freely before saving.
          </p>
        )}
      </div>

      {submission.status === 'approved' && (
        <label
          className={cn(
            'flex items-center justify-between rounded-xl border px-3 py-2 text-sm',
            sharedToClassFeed
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-gray-200 bg-gray-50 text-gray-700',
          )}
        >
          <span>
            <strong>Share to class feed</strong> — let classmates see this and
            react with positive emojis.
          </span>
          <input
            type="checkbox"
            checked={sharedToClassFeed}
            onChange={toggleShareToFeed}
            disabled={shareSaving}
            className="h-4 w-4 accent-emerald-600"
            aria-label="Share to class feed"
          />
        </label>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          onClick={() => act('revision_requested')}
          disabled={busy}
          className="rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
        >
          Request revision
        </button>
        <button
          onClick={() => act('approved')}
          disabled={busy}
          className={cn(
            'rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]',
            busy ? 'bg-gray-300' : 'bg-emerald-600 hover:bg-emerald-700',
          )}
        >
          Approve
        </button>
      </div>

      {saved && (
        <p className="text-right text-xs text-gray-500">
          Saved · status now{' '}
          <span className="font-semibold text-gray-700">
            {saved === 'approved' ? 'approved' : 'revision requested'}
          </span>
          .
        </p>
      )}
    </div>
  );
}
