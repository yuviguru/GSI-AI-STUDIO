'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Play, Sparkles, Gift, Flame, Users, Zap, Trophy, Compass } from 'lucide-react';
import { MascotAvatar } from '@/components/mascot/MascotAvatar';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { useAiPoints } from '@/contexts/AiPointsContext';
import { useAuth } from '@/hooks/useAuth';
import { useKidProfile } from '@/hooks/useKidProfile';
import { useResolvedIdentity } from '@/hooks/useResolvedIdentity';
import { ModeGroupTabs } from '../shared/ModeGroupTabs';
import { PortalCard } from '../shared/PortalCard';
import { SideActionButton, type SideAction } from '../shared/SideActionButton';
import { XpBar } from '../shared/XpBar';
import { getModesByGroup, type ModeGroup } from '../shared/GameModes';
import { playSound } from '@/lib/sounds';
import { CreditsBadge } from '@/components/billing/CreditsBadge';
import type { MobileTab } from './TabBar';
import { DailyRewardModal } from './DailyRewardModal';

const XP_PER_LEVEL = 100;

/** Right rail: progress, achievement, discovery. */
const RIGHT_ACTIONS: SideAction[] = [
  { key: 'quests',  icon: Zap,     label: 'Quests',  pip: 3,    g1: 'from-violet-500',  g2: 'to-violet-700' },
  { key: 'badges',  icon: Trophy,  label: 'Badges',             g1: 'from-amber-400',   g2: 'to-yellow-600' },
  { key: 'explore', icon: Compass, label: 'Explore',            g1: 'from-emerald-400', g2: 'to-emerald-600', href: '/explore' },
];

/** Grid column count per group — 3 for Create / Play, 2 for Learn so a
 *  2-card group reads as two equal half-width tiles instead of two
 *  stretched-thin thirds. */
const GRID_COLS: Record<ModeGroup, string> = {
  create: 'grid-cols-3',
  play:   'grid-cols-3',
  learn:  'grid-cols-2',
};

interface HubSceneProps {
  /** Switches the MobileHub's active bottom-nav tab. Used by side-stack
   *  actions that route to another tab (Quests → quests, Badges →
   *  profile) instead of navigating to a new page. */
  onTabChange?: (tab: MobileTab) => void;
}

/**
 * Mobile hub scene — "Game Lobby" layout.
 *
 * Hierarchy (top → bottom):
 *   1. HUD card (avatar + name + LVL pill + XP bar + points + bell).
 *      Padded `pt-7` so the iOS notch / camera cut-out doesn't crop it.
 *   2. Side action stacks anchored at the outer edges (Daily / Streak /
 *      Squad on the left, Quests / Badges / Explore on the right).
 *   3. Hero stage — mascot on a glowing platform, speech bubble, and the
 *      big gold RESUME CTA with last-activity meta underneath.
 *   4. Create / Play / Learn group switcher.
 *   5. Portal grid — every mode in the active group visible on one screen
 *      (no horizontal scroll). Circular-icon tiles with a 1-line tagline.
 */
export function HubScene({ onTabChange }: HubSceneProps = {}) {
  const router = useRouter();
  const { totalPoints, isLoaded } = useAiPoints();
  const { isAuthenticated } = useAuth();
  const { activeKid } = useKidProfile();
  const { name, avatarUrl, mascotId, mascotEmoji } = useResolvedIdentity({
    fallbackName: isAuthenticated ? 'Player' : 'Guest',
  });
  const [group, setGroup] = useState<ModeGroup>('create');
  const [showDailyReward, setShowDailyReward] = useState(false);
  const modes = getModesByGroup(group);

  const level = Math.floor(totalPoints / XP_PER_LEVEL) + 1;
  const xpInLevel = totalPoints % XP_PER_LEVEL;
  const progressPct = (xpInLevel / XP_PER_LEVEL) * 100;

  // Real streak count from the active kid's profile. Falls back to 0 for
  // guests / first-time users so the chip stays in the side stack as a
  // baseline "start your streak" indicator. The Streak chip is rendered
  // via SideActionButton's `passive` flag (status badge, not a button).
  const streakCount = activeKid?.streak?.current ?? 0;

  /** Left rail: claim, status, social. Built per-render so the Streak
   *  label reflects the current count instead of being a hardcoded literal. */
  const leftActions: SideAction[] = [
    { key: 'daily',  icon: Gift,  label: 'Daily',                pip: '!', g1: 'from-amber-400', g2: 'to-orange-500' },
    { key: 'streak', icon: Flame, label: `Streak ${streakCount}`,           g1: 'from-rose-400',  g2: 'to-rose-600', passive: true },
    // TODO(squad): wire this once we have a /squad or /friends route.
    { key: 'squad',  icon: Users, label: 'Squad',                          g1: 'from-sky-400',   g2: 'to-blue-600' },
  ];

  const handleResume = () => {
    playSound('buttonTap');
    // TODO(last-activity): replace with a real "resume last activity"
    // hook once we have one. Hardcoded to story for the first ship.
    router.push('/create/story');
  };

  /**
   * Dispatches a side-stack tap to the right destination.
   *   - daily → open the DailyRewardModal (placeholder until the real
   *     reward flow ships).
   *   - streak → passive, no destination (the SideActionButton itself
   *     also short-circuits, but the no-op keeps the contract explicit).
   *   - squad → stub; logs once until we have a /squad route.
   *   - quests → swap to the bottom-nav "quests" tab. Falls back to a
   *     console warning if no onTabChange is wired.
   *   - badges → swap to the bottom-nav "profile" tab (badges live in
   *     ProfileScene). Same fallback.
   *   - default: any action with `href` routes there.
   */
  const handleAction = (action: SideAction) => {
    playSound('buttonTap');
    switch (action.key) {
      case 'daily':
        setShowDailyReward(true);
        break;
      case 'streak':
        // passive — nothing to do
        break;
      case 'squad':
        // TODO(squad): wire to /squad or /friends once the route exists.
        console.warn('[HubScene] Squad tapped — no destination wired yet.');
        break;
      case 'quests':
        if (onTabChange) onTabChange('quests');
        else console.warn('[HubScene] Quests tapped but onTabChange is not wired.');
        break;
      case 'badges':
        // Badges live in the Profile scene's "Achievements" panel.
        if (onTabChange) onTabChange('profile');
        else console.warn('[HubScene] Badges tapped but onTabChange is not wired.');
        break;
      default:
        if (action.href) router.push(action.href);
    }
  };

  const handleMode = (href: string) => {
    playSound('modeSelect');
    router.push(href);
  };

  return (
    <div className="relative flex h-full flex-col">
      {/* ─── HUD ─ lowered with pt-7 so the camera/notch doesn't crop it  */}
      <div className="relative z-20 shrink-0 px-3 pt-7">
        <div className="game-hud-frame game-glass flex items-center gap-2.5 rounded-lg p-2.5 shadow-md">
          <div className="relative shrink-0">
            {avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={avatarUrl}
                alt={name}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-brand-primary/30"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-blue-100 text-lg ring-2 ring-brand-primary/30">
                {mascotEmoji}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <div className="truncate font-display text-sm font-bold">{name}</div>
              <div className="whitespace-nowrap rounded-full bg-gradient-to-br from-amber-400 to-orange-500 px-1.5 py-0 shadow-sm">
                <span className="font-mono text-[9px] font-bold text-white">LVL {level}</span>
              </div>
            </div>
            <div className="mt-1">
              <XpBar percent={progressPct} height={5} />
            </div>
          </div>
          <CreditsBadge />
          <div
            className="flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-amber-400/20 to-orange-400/20 px-2 py-0.5 ring-1 ring-amber-300/40"
            title="AI Points — your lifetime creator score"
          >
            <Sparkles aria-hidden className="h-3 w-3 text-amber-500" strokeWidth={2.4} />
            <span className="font-mono text-[10px] font-bold text-amber-700">
              {isLoaded ? totalPoints.toLocaleString() : '—'}
            </span>
          </div>
          {/* Real notifications bell with dropdown — handles its own auth
              gating (returns null for guests, so the HUD just shows
              without the bell when there's nothing to notify about). */}
          <NotificationBell />
        </div>
      </div>

      {/* ─── Body ─ side stacks anchor the edges, hero stage in the middle */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {/* LEFT side stack */}
        <div className="pointer-events-none absolute left-2 top-3 z-20 flex flex-col gap-2">
          {leftActions.map((a) => (
            <SideActionButton key={a.key} action={a} onClick={() => handleAction(a)} />
          ))}
        </div>

        {/* RIGHT side stack */}
        <div className="pointer-events-none absolute right-2 top-3 z-20 flex flex-col gap-2">
          {RIGHT_ACTIONS.map((a) => (
            <SideActionButton key={a.key} action={a} onClick={() => handleAction(a)} />
          ))}
        </div>

        {/* Centre stage — speech bubble + mascot + platform + Resume CTA.
            `flex-1` + `justify-center` makes the cluster fill and centre
            itself in the whole band between the HUD and the mode grid, so
            the mascot sits lower and the Resume CTA drops into what was
            dead space instead of clinging to the top. `mx-auto` +
            `items-center` keep the mascot, platform, and CTA on a single
            shared centre axis. */}
        <div className="relative mx-auto flex w-full flex-1 flex-col items-center justify-center pt-2">
          <div className="relative mx-auto h-[195px] w-[200px]">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[170px] w-[170px] -translate-x-1/2 -translate-y-1/2 animate-pulse-glow rounded-full bg-brand-primary/25 blur-2xl" />
            <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg rounded-bl-sm bg-white/95 px-3 py-1 text-[11px] font-semibold text-brand-text shadow-md ring-1 ring-brand-primary/15">
              Ready for adventure?
            </div>
            {/* Full-width flex wrapper centres the mascot. We deliberately
                avoid `left-1/2 -translate-x-1/2`: with no explicit width an
                absolutely-positioned box gets shrink-to-fit-clamped to the
                space right of the 50% mark, so the 2xl mascot overflowed to
                the right and landed off-centre. `inset-x-0` + `justify-center`
                sidesteps that entirely. */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-x-0 top-8 flex justify-center drop-shadow-2xl"
            >
              <MascotAvatar id={mascotId} size="2xl" animate />
            </motion.div>
            <div className="absolute bottom-2 left-1/2 h-3 w-32 -translate-x-1/2">
              <div className="absolute inset-0 animate-platform-spin platform-ring" />
              <div className="absolute inset-1 rounded-full bg-gradient-to-b from-white/80 to-brand-soft" />
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleResume}
            className="btn-bevel-gold relative mt-1 inline-flex items-center gap-2 rounded-full px-7 py-2.5 shadow-lg"
          >
            <Play className="h-4 w-4 fill-white text-white" />
            <span className="font-display text-sm font-extrabold uppercase tracking-wider text-white">
              Resume
            </span>
            <ArrowRight className="h-4 w-4 text-white" strokeWidth={3} />
          </motion.button>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-brand-text-secondary">
            <span>Dragon Story</span>
            <span className="h-1 w-1 rounded-full bg-brand-text-secondary/40" />
            <span>Ch 3</span>
          </div>
        </div>

        {/* ─── Mode grid ─ all modes for the active group, no scroll ───── */}
        <div className="relative flex min-h-0 shrink-0 flex-col px-3 pb-4 pt-3">
          <div className="mb-2 flex shrink-0 items-center justify-center">
            <ModeGroupTabs active={group} onChange={setGroup} variant="mobile" />
          </div>
          {/* Plain keyed fade — wrapping this in AnimatePresence with
              mode="wait" caused the new grid to stall on the first
              variant/group swap, so we keep it minimal. */}
          <motion.div
            key={group}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16 }}
            className={`grid gap-2 ${GRID_COLS[group]}`}
          >
            {modes.map((mode) => (
              <PortalCard
                key={mode.key}
                mode={mode}
                onClick={() => handleMode(mode.href)}
              />
            ))}
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showDailyReward && (
          <DailyRewardModal key="daily-reward" onClose={() => setShowDailyReward(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

