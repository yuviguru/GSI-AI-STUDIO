# ENGAGE-004: Gamification System — Streaks, Levels, and Creator Coins

## Description
Full gamification engine: daily creation streaks with Duolingo-style streak counter, XP-based leveling system (Creator Levels 1-20), and "Creator Coins" currency earned per creation. Levels unlock cosmetic rewards (new avatars, creation frame styles). This is the primary retention mechanism.

## Requires KB Updates
- Update `docs/data-model.md` with gamification fields on kid profile

## Dependencies
- PROFILE-001 (Parent-Kid Profiles — streak/points stored on kid profile)
- PLATFORM-001 (AI Points & Badge system — extends that foundation)

## Subtasks

### [LIB] Design gamification system
**Target**: `lib/gamification.ts`
**Action**: Create
**Requirements**:
- **Level system**: 20 levels with XP thresholds
  - Level titles: "Beginner Creator" (1) → "Apprentice" (3) → "Rising Star" (6) → "Creative Pro" (10) → "AI Artist" (14) → "Master Creator" (17) → "AI Wizard" (20)
  - XP formula: `level * 100` XP per level (Level 2 = 200 XP, Level 5 = 500 XP, etc.)
- **XP earnings**: creation = 50 XP, share = 20 XP, X-Ray view = 10 XP, streak bonus = 25 XP per day of streak
- **Creator Coins**: 10 per creation, 5 per share, 2 per X-Ray view, 50 per streak milestone (7 days, 14 days, 30 days)
- **Streak logic**: `calculateStreak(lastActiveDate, today): { current, longest, isActive }`
  - Active if created within last 24 hours
  - Resets to 0 if gap > 24 hours
  - Updates `longest` if `current > longest`
- Export `getLevelForXP(xp)`, `getXPForNextLevel(currentLevel)`, `calculateCoinsEarned(action)`

### [FE] Create StreakCounter component
**Target**: `components/gamification/StreakCounter.tsx`
**Action**: Create
**Requirements**:
- Flame emoji with streak number: "🔥 5"
- Pulsing flame animation when streak is active (framer-motion)
- Grey/dim when streak is at risk (no creation today)
- Tap to show streak detail tooltip: "5 day streak! Create today to keep it going!"
- Compact enough to fit in Header alongside AiPointsBadge
- Animated counter when streak increments

### [FE] Create LevelProgress component
**Target**: `components/gamification/LevelProgress.tsx`
**Action**: Create
**Requirements**:
- Horizontal progress bar showing XP toward next level
- Current level badge on left, next level on right
- Progress percentage label: "350/500 XP"
- Level title below: "Rising Star (Level 6)"
- Animated fill on XP gain (spring animation)
- Compact variant for header, expanded variant for profile/dashboard

### [FE] Create CreatorCoinsDisplay component
**Target**: `components/gamification/CreatorCoinsDisplay.tsx`
**Action**: Create
**Requirements**:
- Coin emoji + count: "🪙 125"
- Animated count-up when coins earned (matching AiPointsBadge counter pattern)
- Floating "+10" animation on coin earn
- Shows in profile section (not header — to avoid crowding)

### [FE] Create LevelUpModal component
**Target**: `components/gamification/LevelUpModal.tsx`
**Action**: Create
**Requirements**:
- Full-screen celebration overlay on level up
- Shows new level number, title, and mascot celebrating
- Lists unlocked rewards (if any): new avatar, new creation frame
- ConfettiCelebration in background (from UI-002)
- Auto-dismiss after 5 seconds or tap to close
- Sound effect: `celebration` (from UI-002)

### [API] Track gamification events
**Target**: `app/api/users/kids/[kidId]/gamification/route.ts`
**Action**: Create
**Requirements**:
- `POST` method: accepts `{ action: 'creation' | 'share' | 'xray_view', metadata?: {} }`
- Updates kid profile: XP, coins, streak, level
- Checks for level-up and returns `{ leveledUp: boolean, newLevel?, newBadges?, coinsEarned, xpEarned }`
- Runs streak calculation on each action
- Requires auth token

### [FE] Integrate gamification into creation flow
**Target**: `hooks/useAiGeneration.ts`
**Action**: Update
**Requirements**:
- After successful creation: call gamification endpoint
- If level up returned: show LevelUpModal
- Update streak counter in header
- Show floating coin animation
- Same integration after share and X-Ray view events

## Acceptance Criteria
- [ ] Streak counter shows in header and updates daily
- [ ] Streak resets after 24 hours of no creation
- [ ] XP system tracks progress across 20 levels
- [ ] Level progress bar shows current XP / next threshold
- [ ] Level-up triggers celebration modal + confetti
- [ ] Creator Coins earned and displayed for each action
- [ ] Gamification data persists on kid profile (Firestore)
- [ ] Level titles progress from "Beginner Creator" to "AI Wizard"
