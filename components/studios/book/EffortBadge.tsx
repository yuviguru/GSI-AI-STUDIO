'use client';

import { useState } from 'react';
import { getEffortBadgeMeta } from '@/lib/books/effortBadge';
import type { EffortBadge as EffortBadgeData } from '@gsi/types';

type Size = 'sm' | 'md' | 'lg';

interface EffortBadgeProps {
  badge: EffortBadgeData | null | undefined;
  size?: Size;
  /** When true, hover/tap shows a breakdown tooltip. Default true. */
  showTooltip?: boolean;
  /** Optional extra classes for positioning. */
  className?: string;
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-1.5 py-0.5 text-[10px] gap-1',
  md: 'px-2 py-1 text-xs gap-1.5',
  lg: 'px-3 py-1.5 text-sm gap-2',
};

const EMOJI_SIZE: Record<Size, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

/**
 * Visual badge for BOOK-003. Renders `null` when there's no badge (drafts
 * don't have one until publish). The kid taps for a breakdown — keeps the
 * system honest and teaches the AI%-effort relationship.
 */
export function EffortBadge({
  badge,
  size = 'md',
  showTooltip = true,
  className,
}: EffortBadgeProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  if (!badge) return null;
  const meta = getEffortBadgeMeta(badge.key);

  return (
    <span className={`relative inline-flex ${className ?? ''}`}>
      <button
        type="button"
        aria-label={`Effort badge: ${meta.displayName} (${badge.aiPercentage}% AI)`}
        onClick={() => showTooltip && setTooltipOpen((v) => !v)}
        onMouseEnter={() => showTooltip && setTooltipOpen(true)}
        onMouseLeave={() => showTooltip && setTooltipOpen(false)}
        className={`inline-flex items-center rounded-full border font-extrabold uppercase tracking-wide ${SIZE_CLASSES[size]} ${meta.bgClass} ${meta.textClass} ${meta.borderClass} ${
          showTooltip ? 'cursor-help' : 'cursor-default'
        }`}
      >
        <span className={EMOJI_SIZE[size]} aria-hidden>
          {meta.emoji}
        </span>
        {meta.displayName}
      </button>

      {showTooltip && tooltipOpen && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-full z-30 mt-2 w-60 -translate-x-1/2 rounded-xl bg-gray-900 px-3 py-2.5 text-left text-xs text-white shadow-elevated"
        >
          <div className="flex items-baseline justify-between">
            <span className="font-bold">{meta.displayName}</span>
            <span className="font-mono text-[11px] opacity-80">{badge.aiPercentage}% AI</span>
          </div>
          <p className="mt-0.5 text-[11px] opacity-80">{meta.tagline}</p>
          <div className="mt-1.5 border-t border-white/20 pt-1.5 font-mono text-[10px] opacity-80">
            <div>
              Words: <strong>{badge.breakdown.aiCharTotal}</strong> AI ·{' '}
              <strong>{badge.breakdown.kidCharTotal}</strong> you
            </div>
            <div>
              Images: <strong>{badge.breakdown.aiImagePageCount}</strong> AI ·{' '}
              <strong>{badge.breakdown.kidImagePageCount}</strong> you
            </div>
          </div>
        </span>
      )}
    </span>
  );
}
