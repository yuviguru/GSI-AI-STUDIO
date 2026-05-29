'use client';

import { Users } from 'lucide-react';
import { useCommunityStats } from '@/hooks/useCommunityStats';
import type { CommunityScope } from '@/lib/social/onlineCounter';

type Size = 'xs' | 'sm' | 'md';

interface CommunityStatsPillProps {
  scope: CommunityScope;
  size?: Size;
  className?: string;
}

const SIZE_CLASSES: Record<Size, string> = {
  xs: 'px-2 py-0.5 text-[10px] gap-1',
  sm: 'px-2.5 py-1 text-xs gap-1.5',
  md: 'px-3 py-1.5 text-sm gap-2',
};

const ICON_SIZE: Record<Size, string> = {
  xs: 'h-3 w-3',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
};

/**
 * Small "creators online" pill (COMMUNITY-001). Renders the synthetic count
 * from `useCommunityStats`. Returns `null` while the first fetch is in
 * flight so the layout doesn't jump.
 *
 * Copy is intentionally ambiguous ("creators online") — the value covers
 * "active in last hour" through "actively clicking right now". When the
 * synthetic baseline is later replaced by real telemetry, the wording
 * stays valid.
 */
export function CommunityStatsPill({
  scope,
  size = 'sm',
  className,
}: CommunityStatsPillProps) {
  const stats = useCommunityStats(scope);
  if (!stats) return null;
  const label = scope === 'global'
    ? 'creators online'
    : scope === 'book'
      ? 'reading & writing'
      : `in the ${scopeShortLabel(scope)} studio`;
  return (
    <span
      className={`inline-flex items-center rounded-full bg-emerald-50 font-semibold text-emerald-700 ring-1 ring-emerald-200 ${SIZE_CLASSES[size]} ${className ?? ''}`}
      aria-label={`${stats.onlineNow.toLocaleString('en-IN')} ${label}`}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <Users className={ICON_SIZE[size]} aria-hidden />
      <span className="font-mono tabular-nums">{stats.onlineNow.toLocaleString('en-IN')}</span>
      <span className="font-normal opacity-80">{label}</span>
    </span>
  );
}

function scopeShortLabel(scope: CommunityScope): string {
  switch (scope) {
    case 'book': return 'Book';
    case 'story': return 'Story';
    case 'music': return 'Music';
    case 'quiz': return 'Quiz';
    case 'comic': return 'Comic';
    case 'game': return 'Game';
    default: return scope;
  }
}
