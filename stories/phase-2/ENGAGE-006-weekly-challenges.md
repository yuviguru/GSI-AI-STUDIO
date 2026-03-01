# ENGAGE-006: Weekly Creation Challenges

## Description
Themed weekly challenges ("Space Week: Create a story set in outer space!") with community submissions and voting. Winners get featured on the Explore feed and earn bonus Creator Coins. The `challenges` collection is already defined in the data model. Challenges create recurring engagement and a sense of community.

## Requires KB Updates
- Update `docs/data-model.md` with confirmed challenge schema

## Dependencies
- AUTH-001 (authentication — needed to submit and vote)
- ENGAGE-004 (Creator Coins — winners earn bonus coins)
- ENGAGE-005 (reactions used for voting)

## Subtasks

### [LIB] Create challenge service
**Target**: `lib/firebase/challengeService.ts`
**Action**: Create
**Requirements**:
- `getActiveChallenge(): Promise<Challenge | null>` — fetch current week's challenge
- `getPastChallenges(limit): Promise<Challenge[]>` — list completed challenges
- `submitToChallenge(challengeId, creationId): Promise<void>` — tag creation as challenge entry
- `getChallengeEntries(challengeId, sort): Promise<Creation[]>` — list submissions sorted by reactions
- Challenge schema: `{ id, title, description, emoji, theme, creationType, startsAt, endsAt, featured: boolean, winnerIds: string[], bonusCoins: number }`

### [API] Create challenge endpoints
**Target**: `app/api/challenges/route.ts`, `app/api/challenges/[id]/route.ts`, `app/api/challenges/[id]/entries/route.ts`
**Action**: Create
**Requirements**:
- `GET /api/challenges` — list active + recent past challenges
- `GET /api/challenges/[id]` — single challenge detail
- `GET /api/challenges/[id]/entries` — submissions with reaction counts, sorted by popularity
- `POST /api/challenges/[id]/entries` — submit a creation to the challenge (auth required)
- Validates that creation type matches challenge `creationType`
- Validates that challenge is still active (before `endsAt`)

### [FE] Create Challenges page
**Target**: `app/(public)/challenges/page.tsx`
**Action**: Create
**Requirements**:
- **Active Challenge**: large hero card with theme, description, countdown timer, "Join Challenge!" CTA
- **Submissions Gallery**: grid of challenge entries using `CreationCard` with reaction counts
- **Past Challenges**: collapsible section showing previous weeks with winners
- Sort: "Most Popular" (reactions) / "Newest"
- Filter: by creation type if challenge allows multiple types

### [FE] Create ChallengeCard component
**Target**: `components/challenges/ChallengeCard.tsx`
**Action**: Create
**Requirements**:
- Vibrant themed card: emoji, title, description, time remaining
- Countdown timer: "3 days, 12 hours left"
- Submission count: "47 entries"
- "Join" button navigates to appropriate studio with challenge context
- Past challenges: show winner avatar + name, "View Entries" link
- Animated countdown (updates every minute)

### [FE] Integrate challenge submission into creation flow
**Target**: `hooks/useAiGeneration.ts`
**Action**: Update
**Requirements**:
- Accept optional `challengeId` in generation input
- After successful creation: auto-submit to challenge if `challengeId` present
- Show "Submitted to [Challenge Name]!" toast after submission
- Studio page reads `challenge` from URL search params

### [FE] Add challenge banner to landing page
**Target**: `app/(public)/page.tsx`
**Action**: Update
**Requirements**:
- If active challenge exists: show compact challenge banner above studio cards
- Banner: emoji + title + "Join now!" link
- Animated border/glow to draw attention
- Dismissable (but re-shows on next visit)

### [ADMIN] Create challenge admin API
**Target**: `app/api/admin/challenges/route.ts`
**Action**: Create
**Requirements**:
- `POST` — create new challenge (admin only, verified via admin UID list)
- `PATCH` — update challenge (set winners, close early)
- Admin verification: check UID against hardcoded admin list or Firestore `admins` collection
- Used by admin dashboard (Phase 3) or direct API calls initially

## Acceptance Criteria
- [ ] Active challenge displayed prominently on challenges page
- [ ] Countdown timer shows remaining time
- [ ] Users can submit creations to active challenges
- [ ] Challenge entries gallery shows submissions sorted by reactions
- [ ] Past challenges show winners and entries
- [ ] Challenge banner appears on landing page when active
- [ ] Winners earn bonus Creator Coins
- [ ] Only matching creation types can be submitted
- [ ] Challenge closes automatically at `endsAt` timestamp
