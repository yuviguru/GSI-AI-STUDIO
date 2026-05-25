# Mobile Hub

## Purpose
The bottom-tabbed mobile experience for the kid app's home page. Renders below the `lg` breakpoint; the desktop layout (`../desktop/`) takes over above it. Routed through `GameHub.tsx` which always renders both and toggles visibility with Tailwind's responsive classes — there's no JS viewport check so no hydration mismatch.

## Load References
@import /docs/ux-patterns.md#mobile-hub-layout
@import /docs/ux-patterns.md#design-system
@import /docs/tech-standards.md#frontend

## Structure
```
components/game-hub/mobile/
├── MobileHub.tsx        # Bottom-tab shell. Owns the active-tab state and
│                        # renders one of four scenes via AnimatePresence.
├── HubScene.tsx         # The "hub" tab — Game Lobby layout (see below).
├── ProfileScene.tsx     # The "profile" tab — player card + badge wall.
├── RanksScene.tsx       # The "ranks" tab — leaderboard.
├── QuestsScene.tsx      # The "quests" tab — daily challenges.
├── TabBar.tsx           # The 4-button bottom nav.
└── DailyRewardModal.tsx # Modal opened from the hub's 🎁 Daily action.
```

## Local Patterns

### Hub scene layout — "Game Lobby"
HubScene is split into five vertical bands, top to bottom:
1. **HUD** — avatar / name / LVL / XP bar / points / bell. Padded `pt-7` so the iOS notch doesn't crop it.
2. **Side action stacks** — absolutely positioned at the left and right edges. Left: 🎁 Daily, 🔥 Streak (passive), 👥 Squad. Right: ⚡ Quests, 🏆 Badges, 🧭 Explore.
3. **Hero stage** — speech bubble, animated mascot on a glowing platform, big gold RESUME pill, last-activity meta.
4. **Group switcher** — Create / Play / Learn segmented pill.
5. **Portal grid** — every mode in the active group as a `PortalCard`. 3 cols for Create / Play, 2 cols for Learn. No horizontal scroll — every card fits on one viewport.

### Side-stack action dispatch
Each tap routes through HubScene's `handleAction(action)`:
- `daily` → opens `DailyRewardModal` via local state
- `streak` → no-op (the chip is a passive status badge)
- `squad` → stubbed (`console.warn`) until a /squad route exists
- `quests` → calls `onTabChange('quests')` — `MobileHub` passes `setTab`
- `badges` → calls `onTabChange('profile')` — the badge wall lives there
- anything with `href` → `router.push(href)` (Explore today)

Adding a new side-stack action: extend the `SideAction` array (`LEFT_ACTIONS` / `RIGHT_ACTIONS` in `HubScene.tsx`) and add a case to the switch in `handleAction`.

### Why MobileHub owns the active tab
Tab switching happens in two places: the TabBar (user taps a tab) and HubScene side-stack actions (Quests / Badges shortcut). Lifting `tab` state to MobileHub lets both call `setTab` without duplicating nav logic.

### Why no AnimatePresence around the portal grid
We tried wrapping the keyed `motion.div` in `AnimatePresence mode="wait"` — the exit-then-enter cycle stalled the first transition after a state change in a wait-mode presence, leaving the previous group's cards on screen indefinitely. A plain keyed `motion.div` is enough; the fade is short (160 ms).

## Related Code
@see /components/game-hub/shared/PortalCard.tsx        # Circular-icon grid tile
@see /components/game-hub/shared/SideActionButton.tsx  # Side-stack pill + `passive` variant
@see /components/game-hub/shared/GameModes.ts          # Mode catalogue + getModesByGroup
@see /components/game-hub/shared/ModeGroupTabs.tsx     # Create / Play / Learn switcher
@see /components/mascot/MascotAvatar.tsx               # Lottie mascot for the hero stage
@see /hooks/useResolvedIdentity.ts                     # Name + avatar + mascot
@see /contexts/AiPointsContext.tsx                     # Points / level / badges
@see /lib/sounds.ts                                    # buttonTap / modeSelect / hubOpen
