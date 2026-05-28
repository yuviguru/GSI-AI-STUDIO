'use client';

import { motion } from 'framer-motion';
import { STUDIO_IDS, type StudioId } from '@gsi/types';
import { StudioLaunchPill } from '@/components/studios/shared/StudioLaunchPill';
import type { GameMode } from './GameModes';

/**
 * Portal card — the circular-icon-with-halo tile used in the mobile hub's
 * mode grid. Each card shows the mode's icon, short label, and a 1-line
 * tagline so kids can read what the mode is about at a glance.
 *
 * Sized so a 3-column grid of these fits all six Create modes on one
 * mobile screen with no horizontal scroll.
 *
 * Currently consumed by the mobile `HubScene`; if desktop ever reworks
 * its mode grid into the same treatment we can drop the duplication
 * by reusing this component.
 *
 * Badge slot: for the six creation studios (StudioId) the launch-state
 * pill takes priority (LIVE/BETA/COMING_SOON, driven by config/studios).
 * Other modes (Kid CEO, MindX, Beat the AI, etc.) keep their hardcoded
 * `mode.badge` from GameModes.ts.
 */
interface PortalCardProps {
  mode: GameMode;
  onClick: () => void;
}

function isStudioMode(key: string): key is StudioId {
  return (STUDIO_IDS as readonly string[]).includes(key);
}

export function PortalCard({ mode, onClick }: PortalCardProps) {
  const isStudio = isStudioMode(mode.key);
  // Inline badge — same as ModeTile (no absolute corner). Placement is 'after'
  // on PortalCard because the title is centered: a single-row centered
  // [title][badge] hugs the cluster's centerline cleanly.
  const inlineBadgeEl = isStudio ? (
    <StudioLaunchPill studioId={mode.key} size="xs" showLive />
  ) : mode.badge ? (
    <span
      className={`shrink-0 rounded-full ${mode.badgeBg ?? 'bg-brand-primary'} px-1 py-0 text-[7px] font-extrabold uppercase tracking-wider text-white`}
    >
      {mode.badge}
    </span>
  ) : null;
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 340, damping: 16 }}
      onClick={onClick}
      className="game-mode-tile group relative flex h-[100px] flex-col items-center justify-start gap-0.5 overflow-hidden rounded-2xl px-1.5 pb-2 pt-2 text-center shadow-tile ring-1 ring-white/70"
      style={{ background: mode.bg }}
      aria-label={mode.label}
    >
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/80 text-xl shadow-md ring-[3px] ring-white">
        <span aria-hidden>{mode.emoji}</span>
      </div>
      <div className={`flex flex-wrap items-center justify-center gap-1 font-display text-[11px] font-extrabold leading-tight ${mode.textColor}`}>
        <span>{mode.shortLabel}</span>
        {inlineBadgeEl}
      </div>
      <div className={`text-[9px] font-medium leading-tight line-clamp-2 ${mode.taglineColor}`}>
        {mode.tagline}
      </div>
    </motion.button>
  );
}
