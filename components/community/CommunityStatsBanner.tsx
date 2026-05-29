'use client';

import { Sparkles } from 'lucide-react';
import { useCommunityStats } from '@/hooks/useCommunityStats';
import { CommunityStatsPill } from './CommunityStatsPill';
import type { CommunityScope } from '@/lib/social/onlineCounter';

interface CommunityStatsBannerProps {
  scope: CommunityScope;
  /** Optional copy override for the lifetime headline.
   *  Default: "1,247 creations made on GSI so far" (or scope-specific). */
  headline?: string;
  className?: string;
}

/**
 * Cumulative + online combo banner (COMMUNITY-001).
 *
 * Big honest stat ("X created so far") + small subtle pill ("Y online"). The
 * cumulative side is real Firestore data — never has to be retracted. The
 * online side is synthetic for now (clearly labelled-by-implication via the
 * ambiguous "online" copy) and swaps to real telemetry later.
 *
 * Returns `null` while the first fetch is in flight so the layout doesn't
 * jump on initial render.
 */
export function CommunityStatsBanner({
  scope,
  headline,
  className,
}: CommunityStatsBannerProps) {
  const stats = useCommunityStats(scope);
  if (!stats) return null;

  const computedHeadline =
    headline ??
    (scope === 'global'
      ? `${stats.creationsLifetime.toLocaleString('en-IN')} creations made on GSI so far`
      : scope === 'book'
        ? `${stats.creationsLifetime.toLocaleString('en-IN')} books written by kids so far`
        : `${stats.creationsLifetime.toLocaleString('en-IN')} ${scopeNoun(scope)} created so far`);

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-full bg-white/70 px-4 py-2 ring-1 ring-indigo-100 backdrop-blur ${className ?? ''}`}
    >
      <div className="inline-flex items-center gap-1.5 text-sm">
        <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden />
        <span className="font-display font-bold text-gray-900">{computedHeadline}</span>
      </div>
      <CommunityStatsPill scope={scope} size="xs" />
    </div>
  );
}

function scopeNoun(scope: CommunityScope): string {
  switch (scope) {
    case 'story': return 'stories';
    case 'music': return 'songs';
    case 'quiz': return 'quizzes';
    case 'comic': return 'comics';
    case 'game': return 'games';
    case 'book': return 'books';
    default: return 'creations';
  }
}
