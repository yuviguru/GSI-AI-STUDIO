'use client';

import Link from 'next/link';
import { Settings } from 'lucide-react';
import { useAiPoints } from '@/contexts/AiPointsContext';
import { MuteToggle } from '@/components/layout/MuteToggle';
import { AuthChip } from './AuthChip';
import { cn } from '@/lib/utils';

/**
 * Game-styled app navigation bar for inner pages (studios, creations, etc.).
 * Mirrors the TopHud's visual language (game-glass, compact pills) but without
 * the hub-specific center pills (online count, streak).
 *
 * Layout: [Brand] ─── spacer ─── [Points • Auth • Mute • Settings]
 *
 * Back-to-home actions live on individual pages (via BackLink), not here.
 */
export function GameNavBar() {
  const { totalPoints, isLoaded } = useAiPoints();

  return (
    <header
      className={cn(
        'game-glass sticky top-0 z-40',
        'border-b border-white/40',
      )}
    >
      <div className="mx-auto flex h-12 max-w-[1520px] items-center justify-between px-4 sm:px-6">
        {/* Brand — links to Game Hub */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-primary to-brand-ai shadow-glass">
            <span className="text-sm">🎮</span>
          </div>
          <div className="hidden font-display text-sm font-bold sm:block">
            GSI <span className="text-brand-primary">Studio</span>
          </div>
        </Link>

        {/* Right: points + auth + mute + settings */}
        <div className="flex items-center gap-2">
          {/* AI Points pill */}
          <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400/20 to-orange-400/20 px-2.5 py-1 ring-1 ring-amber-300/40">
            <span className="text-xs">✨</span>
            <span className="font-mono text-xs font-bold text-amber-700">
              {isLoaded ? totalPoints.toLocaleString() : '—'}
            </span>
          </div>

          <AuthChip />

          <MuteToggle />

          <Link
            href="/settings"
            className="rounded-full p-1.5 transition hover:bg-white/60"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4 text-brand-text-secondary" />
          </Link>
        </div>
      </div>
    </header>
  );
}
