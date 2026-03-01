# PROFILE-003: Parent Dashboard

## Description
Parents see their kids' activity at a glance: creations made, AI concepts learned, time spent, streak status, and safety controls. Can set daily creation limits and generate learning reports for school. This is the "productive screen time" proof that convinces parents to keep the app and recommend it to others.

## Requires KB Updates
- None

## Dependencies
- AUTH-001 (Phone OTP Authentication)
- PROFILE-001 (Parent-Kid Profiles)
- LEARN-002 (Learning Dashboard — for concept data)

## Subtasks

### [FE] Create Parent Dashboard page
**Target**: `app/(auth)/parent/page.tsx`
**Action**: Create
**Requirements**:
- Requires parent authentication (redirect if not logged in)
- Page header: "Parent Dashboard" with parent phone number (masked: ****1234)
- Kid switcher: tabs or cards for each kid profile
- Summary cards per kid (see KidActivityCard below)
- "Add Kid" button if < 4 kids
- Responsive: single column on mobile, 2-column on tablet+

### [FE] Create KidActivityCard component
**Target**: `components/parent/KidActivityCard.tsx`
**Action**: Create
**Requirements**:
- Kid avatar + name header
- Stats grid (2x2):
  - Creations this week (number + trend arrow up/down)
  - Current streak (flame + days)
  - AI Concepts learned (number / total)
  - Creator Level (level number + title)
- Recent creations: last 3 thumbnails in a row (tap to view)
- "View Full Report" link → learning report (from LEARN-002)
- "Settings" link → parental controls

### [FE] Create ParentalControls component
**Target**: `components/parent/ParentalControls.tsx`
**Action**: Create
**Requirements**:
- **Daily creation limit**: slider 1-20 (default 5, matching current rate limit)
- **Daily time limit**: selector (30min, 1hr, 2hr, Unlimited)
- **Content types allowed**: toggle per type (Story, Music, Quiz, Game, Comic) — all on by default
- **Public sharing**: toggle to allow/disallow sharing creations publicly
- Save to parent's user profile in Firestore
- Confirmation dialog on save: "Settings updated!"
- Each control: label + description + input

### [API] Create parental controls endpoints
**Target**: `app/api/users/settings/route.ts`
**Action**: Create
**Requirements**:
- `GET /api/users/settings` — fetch current settings
- `PATCH /api/users/settings` — update settings
- Settings stored on user document: `settings.maxDailyCreations`, `settings.dailyTimeLimit`, `settings.allowedTypes`, `settings.publicSharingEnabled`
- Requires auth token
- Settings apply per-parent (all kids under that parent)

### [API] Enforce parental controls in creation flow
**Target**: `app/api/ai/story/route.ts` (and all AI generation routes)
**Action**: Update
**Requirements**:
- If authenticated: check parent settings instead of default rate limits
- Respect `maxDailyCreations`, `dailyTimeLimit`, `allowedTypes`
- If creation type not allowed: return friendly error ("Your parent hasn't enabled this yet")
- If daily limit reached: return friendly error ("You've reached today's creation limit!")
- Falls back to session-based limits for anonymous users (existing behavior unchanged)

### [FE] Create WeeklyDigest email template
**Target**: `lib/email/weeklyDigest.ts`
**Action**: Create
**Requirements**:
- Email content generator (HTML template): kid's weekly stats summary
- Includes: creations made, concepts learned, streak status, top creation
- CTA: "View full dashboard" link
- Note: Actual email sending via Cloud Function (future) — this story creates the template and data aggregation
- Export `generateDigestContent(kidDoc, weeklyStats): string`

## Acceptance Criteria
- [ ] Parent dashboard shows all kids with activity summaries
- [ ] Each kid card shows weekly stats, streak, and level
- [ ] Parental controls allow setting daily limits
- [ ] Content type restrictions enforced in creation flow
- [ ] Time limit tracked and enforced
- [ ] Learning report downloadable per kid
- [ ] Settings persist in Firestore
- [ ] Friendly error messages when limits reached
