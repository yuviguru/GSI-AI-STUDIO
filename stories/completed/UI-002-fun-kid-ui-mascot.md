# UI-002: Fun Kid UI Overhaul — Mascot, Celebrations & Personality

## Description
Transform the app from a clean-but-generic tool into a vibrant kids' creative playground. Introduce "Koko" — a friendly AI robot mascot with multiple expressions — along with confetti celebrations on milestones, animated loading states, sound effects, and celebration modals. This is the personality layer that makes kids want to come back.

## Requires KB Updates
- Update `docs/ux-patterns.md` with mascot usage guidelines and celebration trigger rules

## Subtasks

### [FE] Create Mascot component
**Target**: `components/shared/Mascot.tsx`
**Action**: Create
**Requirements**:
- SVG-based mascot character "Koko" — a friendly, colorful AI robot
- Props: `expression: 'happy' | 'thinking' | 'celebrating' | 'waving' | 'surprised' | 'painting' | 'singing'`
- Props: `size: 'sm' | 'md' | 'lg'` (48px, 96px, 160px)
- Subtle idle animation (gentle bobbing) using `framer-motion`
- Expression-specific micro-animations (e.g., sparkle eyes when celebrating)
- Accessible: `role="img"` with `aria-label`
- Indian-inspired design elements (tilak, kurta, or rangoli-inspired accents)

### [FE] Create ConfettiCelebration component
**Target**: `components/shared/ConfettiCelebration.tsx`
**Action**: Create
**Requirements**:
- Uses `canvas-confetti` library for particle effects
- Triggers on: first creation ever, every 5th creation, badge unlock, level up
- Props: `trigger: boolean`, `variant: 'standard' | 'fireworks' | 'stars'`
- Auto-clears after 3 seconds
- Non-blocking: renders in a portal above all content
- Install `canvas-confetti` as dependency

### [FE] Create CelebrationModal component
**Target**: `components/shared/CelebrationModal.tsx`
**Action**: Create
**Requirements**:
- Full-screen overlay modal with mascot celebrating
- Shows milestone title ("Your first story!", "5 creations today!", "AI Explorer badge!")
- Includes ConfettiCelebration in background
- Animated entry: scale from 0.5 + fade in
- Auto-dismiss after 4 seconds or tap to close
- Props: `title: string`, `subtitle: string`, `emoji: string`, `onClose: () => void`

### [LIB] Create sound effects system
**Target**: `lib/sounds.ts`
**Action**: Create
**Requirements**:
- Preloads 4-5 short sound effects: `creation_complete`, `button_tap`, `share_whoosh`, `badge_unlock`, `celebration`
- `playSound(name: SoundName)` function with volume control
- Mute toggle stored in `localStorage` key `gsi-sounds-muted`
- Uses Web Audio API or `<audio>` elements
- Sounds are tiny (< 50KB each), loaded lazily on first interaction
- Export `useSoundPreference()` hook for mute toggle UI

### [FE] Add mute toggle to Header
**Target**: `components/layout/Header.tsx`
**Action**: Update
**Requirements**:
- Add volume icon button between logo and AiPointsBadge
- Toggle between `Volume2` and `VolumeX` icons (from lucide-react)
- Uses `useSoundPreference()` hook
- Small icon, doesn't crowd header

### [FE] Replace loading progress with mascot animations
**Target**: `components/studios/story/StoryProgress.tsx`, `components/studios/music/MusicProgress.tsx`, `components/studios/quiz/QuizProgress.tsx`
**Action**: Update
**Requirements**:
- Replace generic spinner/animation with Mascot component
- Story: mascot with `painting` expression, paintbrush animation
- Music: mascot with `singing` expression, musical notes floating
- Quiz: mascot with `thinking` expression, lightbulb animation
- Keep existing progress message rotation from `useAiGeneration`
- Keep cancel button

### [FE] Update landing page with mascot hero
**Target**: `app/(public)/page.tsx`
**Action**: Update
**Requirements**:
- Add Mascot `waving` expression in hero section above tagline
- Size: `lg` (160px)
- Subtle entrance animation: bounce in from bottom
- Replace generic emoji floaters with mascot-themed ones
- Keep existing studio cards unchanged

## Acceptance Criteria
- [ ] Mascot "Koko" renders with all 7 expressions
- [ ] Confetti fires on first creation completion
- [ ] CelebrationModal shows for milestones with mascot + confetti
- [ ] Sound effects play on key actions (mutable)
- [ ] Volume toggle visible in header
- [ ] All 3 studio progress screens show mascot instead of spinner
- [ ] Landing page features mascot in hero section
- [ ] No performance impact from animations (< 16ms frame budget)
