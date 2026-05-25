'use client';

import Link from 'next/link';
import { useCredits } from '@/hooks/useCredits';

/**
 * AI Coins pill for the top nav. Mirrors the AI Points pill's visual
 * vocabulary (rounded-full, ring, mono digits) but uses a sky/indigo
 * palette to distinguish "currency" from "XP".
 *
 * Renders nothing for anonymous flows — no signed-in kid means no
 * wallet, and the marketing page already explains AI Coins for those
 * users.
 */
export function CreditsBadge() {
  const { snapshot, balance, isLoading } = useCredits();

  // No wallet for this caller (anonymous, no active kid, or auth still
  // resolving with no prior data). Hide rather than show a misleading 0.
  if (!isLoading && !snapshot) return null;

  return (
    <Link
      href="/billing/credits"
      title="AI Coins — your AI generation balance"
      aria-label={`AI Coins: ${balance}`}
      className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-400/20 to-indigo-400/20 px-2.5 py-1 ring-1 ring-sky-300/40 transition hover:from-sky-400/30 hover:to-indigo-400/30"
    >
      <span className="text-xs">🪙</span>
      <span className="font-mono text-xs font-bold text-indigo-700">
        {snapshot ? balance.toLocaleString() : '—'}
      </span>
    </Link>
  );
}
