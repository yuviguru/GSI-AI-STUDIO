'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Megaphone, Send } from 'lucide-react';
import { fetchWithKidAuth } from '@/lib/fetchWithKidAuth';
import { useAuth } from '@/hooks/useAuth';
import { useKidProfile } from '@/hooks/useKidProfile';
import type { CeoArtifact, CeoArtifactAsset, CeoBusiness } from '@/types';

interface MarketingTabProps {
  business: CeoBusiness;
  /** Bump the parent's business state after a successful "Post this"
   *  so reputation + cap counter stay in sync. */
  onBusinessChanged?: () => void;
}

const MAX_POSTS_PER_DAY = 3;

/**
 * Marketing tab — surfaces every accepted Marketing artifact so the kid
 * can tap "Post this" to apply a small reputation bump (capped at
 * +3/day across the whole business per C2). Empty state nudges the kid
 * to run their first campaign via the FIRST_CUSTOMERS milestone.
 */
export function MarketingTab({ business, onBusinessChanged }: MarketingTabProps) {
  const { isAuthenticated, getIdToken, loading: authLoading } = useAuth();
  const { activeKid, loading: kidLoading } = useKidProfile();
  const kidId = activeKid?.id ?? null;
  const ready = isAuthenticated && !!kidId;

  const [artifacts, setArtifacts] = useState<CeoArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [postingId, setPostingId] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);

  const postsToday = business.marketingDailyPostCount ?? 0;
  const slotsLeft = Math.max(0, MAX_POSTS_PER_DAY - postsToday);

  const load = useCallback(async () => {
    if (!ready) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithKidAuth(
        `/api/ceo/artifacts?businessId=${encodeURIComponent(business.id)}&status=accepted&limit=50`,
        { getIdToken, kidId },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Failed to load campaigns');
      const all = (json.data.artifacts as CeoArtifact[]) ?? [];
      // Filter to marketing only.
      setArtifacts(all.filter((a) => a.workflowId === 'marketing.firstCampaign'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load campaigns');
    } finally {
      setLoading(false);
    }
  }, [ready, business.id, getIdToken, kidId]);

  useEffect(() => {
    if (authLoading || kidLoading) return;
    void load();
  }, [authLoading, kidLoading, load]);

  async function handlePost(artifactId: string) {
    setPostingId(artifactId);
    setPostError(null);
    try {
      const res = await fetchWithKidAuth('/api/ceo/marketing/post', {
        getIdToken,
        kidId,
      }, {
        method: 'POST',
        body: JSON.stringify({ artifactId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Post failed');
      onBusinessChanged?.();
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Could not post.');
    } finally {
      setPostingId(null);
    }
  }

  const campaigns = useMemo(() => artifacts, [artifacts]);

  return (
    <section
      aria-labelledby="marketing-tab-heading"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <header className="mb-4 flex items-center gap-2">
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-700"
          aria-hidden="true"
        >
          <Megaphone className="h-4 w-4" />
        </span>
        <h2
          id="marketing-tab-heading"
          className="font-display text-xs font-bold uppercase tracking-wider text-rose-700"
        >
          Marketing
        </h2>
        <span
          className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600"
          aria-label={`${postsToday} of ${MAX_POSTS_PER_DAY} posts used today`}
        >
          {postsToday} / {MAX_POSTS_PER_DAY} posts today
        </span>
      </header>

      {postError && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {postError}
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" aria-hidden />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState phase={business.phase} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {campaigns.map((artifact) => (
            <CampaignCard
              key={artifact.id}
              artifact={artifact}
              onPost={() => handlePost(artifact.id)}
              disabled={slotsLeft <= 0 || postingId !== null}
              posting={postingId === artifact.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CampaignCard({
  artifact,
  onPost,
  disabled,
  posting,
}: {
  artifact: CeoArtifact;
  onPost: () => void;
  disabled: boolean;
  posting: boolean;
}) {
  const poster = artifact.assets.find(
    (a): a is CeoArtifactAsset & { type: 'image' } =>
      a.type === 'image' && a.kind === 'poster',
  );
  const post = artifact.assets.find(
    (a): a is CeoArtifactAsset & { type: 'text'; kind: 'post'; content: string } =>
      a.type === 'text' && a.kind === 'post',
  );
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {poster ? (
        <Image
          src={poster.url}
          alt={poster.altText}
          width={poster.widthPx}
          height={poster.heightPx}
          className="aspect-video h-auto w-full object-cover"
          unoptimized
        />
      ) : (
        <div className="flex aspect-video items-center justify-center bg-slate-100 text-xs text-slate-500">
          (no poster)
        </div>
      )}
      <div className="space-y-2 p-3">
        {post ? (
          <p className="line-clamp-3 text-sm text-slate-700">{post.content}</p>
        ) : null}
        <button
          type="button"
          onClick={onPost}
          disabled={disabled}
          aria-busy={posting}
          className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-3 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {posting ? 'Posting…' : disabled ? 'Daily cap hit' : 'Post this (+1 reputation)'}
        </button>
      </div>
    </article>
  );
}

function EmptyState({ phase }: { phase: CeoBusiness['phase'] }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5 text-center">
      <p className="text-sm text-slate-600">
        No campaigns yet. Your{' '}
        <strong>
          {phase === 'pre_launch'
            ? 'Marketing Agent unlocks at Launch'
            : 'first campaign will appear here'}
        </strong>{' '}
        once you hire the Marketing Agent and finish the First Customers milestone.
      </p>
    </div>
  );
}
