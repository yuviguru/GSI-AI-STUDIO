# PLATFORM-001: AI Points Persistence & Badge System

## Description
AI Points currently live only in `localStorage` via `AiPointsContext` and are lost when browser data is cleared. Move points to session-backed Firestore storage so they persist across the session lifetime. Also implement a proper badge/achievement system with fun unlockable badges that reward exploration and creation.

## Requires KB Updates
- Update `docs/data-model.md` with badge schema and points fields on sessions

## Subtasks

### [LIB] Define badge catalog
**Target**: `lib/badges.ts`
**Action**: Create
**Requirements**:
- Badge interface: `{ id, name, emoji, description, requirement, category, unlockedAt? }`
- Categories: `creation`, `learning`, `social`, `streak`
- Badge catalog (10+ badges):
  - **First Spark** — Create your first AI creation (any type)
  - **Story Wizard** — Create 3 stories
  - **Music Maestro** — Create 3 songs
  - **Quiz Champion** — Create 3 quizzes
  - **Creative Machine** — Create 10 total creations
  - **AI Explorer** — View 5 different AI X-Ray explanations
  - **Sharing Star** — Share 3 creations
  - **Curious Mind** — Earn 100 AI Points
  - **Knowledge Seeker** — Learn 10 different AI concepts
  - **Super Creator** — Create 25 total creations
  - **All-Rounder** — Create at least 1 of each type (story, music, quiz)
- `checkBadgeUnlocks(stats: UserStats): Badge[]` — returns newly unlocked badges
- `getBadgeProgress(stats: UserStats, badge: Badge): { current: number; required: number }` — progress toward each badge

### [API] Add points and badges to session
**Target**: `lib/firebase/sessionService.ts`
**Action**: Update
**Requirements**:
- Add `aiPoints`, `badges`, `conceptsLearned`, `creationsByType` fields to `SessionDoc` interface
- `creationsByType: { story: number, music: number, quiz: number, game: number, comic: number }`
- `badges: string[]` — array of unlocked badge IDs
- `conceptsLearned: string[]` — array of learned AI concept IDs

### [API] Create points update endpoint
**Target**: `app/api/sessions/points/route.ts`
**Action**: Create
**Requirements**:
- `PATCH` method: accepts `{ action: 'add_points' | 'learn_concept' | 'track_creation' | 'track_share', payload: {...} }`
- `add_points`: increment `aiPoints` by given amount
- `learn_concept`: add concept to `conceptsLearned` array (deduplicate)
- `track_creation`: increment `creationsByType[type]` counter
- `track_share`: increment share tracking for badge checking
- After each action: run `checkBadgeUnlocks` and return any newly unlocked badges
- Validates `X-Session-Id` header

### [FE] Create BadgeGallery component
**Target**: `components/learning/BadgeGallery.tsx`
**Action**: Create
**Requirements**:
- Grid of badge circles (3 columns)
- Unlocked badges: full color with emoji, name below
- Locked badges: grayscale with lock icon, name + progress bar below
- Tap unlocked badge: show detail modal with description and unlock date
- Tap locked badge: show progress toward unlock ("2/3 stories created")
- Accessible from header AI Points badge (tap to open gallery sheet)
- Bottom sheet presentation (matching `ShareSheet` pattern from `components/shared/ShareSheet.tsx`)

### [FE] Integrate badge unlock celebrations
**Target**: `contexts/AiPointsContext.tsx`
**Action**: Update
**Requirements**:
- After each API call that returns new badges, trigger `CelebrationModal` (from UI-002)
- Show badge emoji, name, and description in celebration
- Play `badge_unlock` sound effect (from UI-002 sound system)
- Refactor context to fetch points from session API instead of localStorage
- Keep localStorage as fallback for offline/first-load

### [FE] Migrate localStorage points to session
**Target**: `components/layout/SessionInit.tsx`
**Action**: Update
**Requirements**:
- On session init: if localStorage has `gsi-ai-points` data, migrate to server
- Call `PATCH /api/sessions/points` with accumulated local points
- Clear localStorage points after successful migration
- One-time migration — set `gsi-points-migrated` flag

## Acceptance Criteria
- [ ] AI Points persist in Firestore session document
- [ ] Points survive browser cache clear (within 24hr session)
- [ ] 10+ badges defined with clear unlock criteria
- [ ] Badge gallery shows earned and locked badges with progress
- [ ] New badge unlocks trigger celebration modal + confetti
- [ ] Tapping AI Points badge opens badge gallery
- [ ] Existing localStorage points migrate to session on first load
- [ ] Badge progress updates in real-time after creation/share/X-Ray
