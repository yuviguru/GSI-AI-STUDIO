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
  const Icon = mode.icon;
  // Status badge — rendered as a ribbon pill straddling the card's top edge
  // (Smash-Badminton "Open" treatment) instead of inline with the title.
  // Studios drive it off launch state (LIVE/BETA/COMING SOON); other modes
  // fall back to their hardcoded `mode.badge`.
  const topBadgeEl = isStudio ? (
    <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2">
      <StudioLaunchPill studioId={mode.key} size="xs" showLive className="shadow-sm" />
    </div>
  ) : mode.badge ? (
    <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2">
      <span
        className={`inline-flex items-center rounded-full border border-white/70 ${mode.badgeBg ?? 'bg-brand-primary'} px-1.5 py-0 text-[7px] font-extrabold uppercase tracking-wider text-white shadow-sm`}
      >
        {mode.badge}
      </span>
    </div>
  ) : null;
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 340, damping: 16 }}
      onClick={onClick}
      className="game-mode-tile group relative flex h-[104px] flex-col items-center rounded-lg pt-3 text-center shadow-tile ring-1 ring-white/70"
      style={{ background: mode.bg }}
      aria-label={mode.label}
    >
      {topBadgeEl}
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/85 shadow-md ring-[3px] ring-white">
        <Icon aria-hidden className={`h-6 w-6 ${mode.iconColor ?? mode.textColor}`} strokeWidth={2.2} />
      </div>
      {/* Name banner — icon + name read as one container, with the label
          anchored to the bottom on a soft strip (badminton-style). */}
      <div className="mt-auto w-full rounded-b-lg bg-white/55 px-1 pb-1.5 pt-1 backdrop-blur-sm">
        <div className={`font-display text-[11px] font-extrabold leading-tight ${mode.textColor}`}>
          {mode.shortLabel}
        </div>
        <div className={`text-[9px] font-medium leading-tight line-clamp-1 ${mode.taglineColor}`}>
          {mode.tagline}
        </div>
      </div>
    </motion.button>
  );
}
