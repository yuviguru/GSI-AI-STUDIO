'use client';

import { useCreditCost } from '@/hooks/useCreditCosts';
import { cn } from '@/lib/utils';

interface CreditCostBadgeProps {
  /** Feature key from `CREDIT_COSTS` — e.g. `'story.generate'`, `'image.flux'`. */
  feature: string;
  /** Tight variant for inline use inside crowded button rows. */
  compact?: boolean;
  /** Render even when cost is 0. By default the badge hides for free features. */
  showFree?: boolean;
  className?: string;
}

/**
 * Inline label that tells the kid how many AI Coins an action will cost
 * BEFORE they tap the button. Server enforcement is the authority — this
 * is purely a UX preview (the real cost may differ if ops set a promo
 * env override).
 *
 * Use right next to action buttons:
 *   <button>Generate</button>
 *   <CreditCostBadge feature="story.generate" />
 */
export function CreditCostBadge({
  feature,
  compact = false,
  showFree = false,
  className,
}: CreditCostBadgeProps) {
  const cost = useCreditCost(feature);

  if (cost === 0 && !showFree) return null;

  const label = cost === 0 ? 'Free' : compact ? `${cost} 🪙` : `${cost} ${cost === 1 ? 'coin' : 'coins'}`;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        cost === 0
          ? 'bg-emerald-100/70 text-emerald-700 ring-1 ring-emerald-300/50'
          : 'bg-sky-100/80 text-indigo-700 ring-1 ring-sky-300/50',
        className,
      )}
      title={cost === 0 ? 'No coins needed' : `Costs ${cost} AI Coin${cost === 1 ? '' : 's'}`}
    >
      {!compact && cost > 0 && <span aria-hidden>🪙</span>}
      <span>{label}</span>
    </span>
  );
}
