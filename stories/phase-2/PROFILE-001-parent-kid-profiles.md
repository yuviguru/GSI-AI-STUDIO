# PROFILE-001: Parent-Kid Profile System

## Description
Parents create the account (AUTH-001), then add kid profiles. Each kid profile has a name, age, grade, board (CBSE/ICSE/State), and a fun avatar. Kids select their profile before creating. Each kid gets their own creation history, AI points, badges, and learning progress. Supports up to 4 kid profiles per parent account.

## Requires KB Updates
- Update `docs/data-model.md` with confirmed users/kids schema

## Dependencies
- AUTH-001 (Phone OTP Authentication)

## Subtasks

### [LIB] Create user service
**Target**: `lib/firebase/userService.ts`
**Action**: Create
**Requirements**:
- `createUser(uid, phoneNumber): Promise<UserDoc>` — creates user document in `users` collection
- `getUser(uid): Promise<UserDoc>` — fetch user profile
- `addKidProfile(uid, kidData): Promise<KidDoc>` — creates kid in `users/{uid}/kids` sub-collection
- `listKidProfiles(uid): Promise<KidDoc[]>` — list all kids for a parent
- `updateKidProfile(uid, kidId, updates): Promise<void>` — update kid name/avatar/etc.
- `getActiveKid(uid, kidId): Promise<KidDoc>` — fetch specific kid profile
- UserDoc: `{ uid, phoneNumber, displayName?, createdAt, lastActiveAt, settings: { maxDailyCreations, notificationsEnabled } }`
- KidDoc: `{ id, name, age, grade, board, avatarId, aiPoints, streak: { current, longest, lastActiveDate }, badges: string[], conceptsLearned: string[], creationsByType: Record<CreationType, number>, createdAt }`

### [API] Create user profile endpoints
**Target**: `app/api/users/route.ts`, `app/api/users/kids/route.ts`
**Action**: Create
**Requirements**:
- `POST /api/users` — create user profile after auth (called once on first sign-in)
- `GET /api/users/me` — get current user profile (requires Auth token)
- `POST /api/users/kids` — add kid profile (max 4 per parent)
- `GET /api/users/kids` — list kid profiles
- `PATCH /api/users/kids/[kidId]` — update kid profile
- All endpoints require Firebase Auth token in `Authorization` header
- Validate with Zod schemas

### [FE] Create KidProfileSetup flow
**Target**: `components/profile/KidProfileSetup.tsx`
**Action**: Create
**Requirements**:
- Multi-step form:
  1. **Name**: "What's your kid's name?" — text input with fun placeholder ("e.g., Aarav, Priya, Arjun")
  2. **Age & Grade**: age selector (8-17), grade selector (3rd-12th), board selector (CBSE/ICSE/State)
  3. **Avatar**: grid of 20+ fun cartoon avatars (diverse Indian kids, animals, robots, fantasy characters)
- Review screen showing chosen name + avatar before confirming
- "Add another kid" option after first kid is set up
- Uses `framer-motion` step transitions
- Kid-friendly copy throughout

### [FE] Create AvatarPicker component
**Target**: `components/profile/AvatarPicker.tsx`
**Action**: Create
**Requirements**:
- Grid of 20+ avatar options (4 columns)
- Categories: Kids (diverse Indian children), Animals (tiger, elephant, peacock), Robots, Fantasy (unicorn, dragon)
- Selected avatar: highlighted ring + scale animation
- Each avatar is a small SVG or emoji-based illustration
- Accessible: `role="radiogroup"` with `aria-label` on each option

### [FE] Create ProfileSelector component
**Target**: `components/profile/ProfileSelector.tsx`
**Action**: Create
**Requirements**:
- Horizontal scrollable row of kid profile circles (avatar + name)
- Active kid highlighted with ring + label
- Tap to switch active kid profile
- "Add Kid" button at end (if < 4 kids)
- Shows in a bottom sheet or inline below header when authenticated
- Active kid stored in context via `useKidProfile` hook

### [HOOK] Create useKidProfile hook
**Target**: `hooks/useKidProfile.ts`
**Action**: Create
**Requirements**:
- Provides `KidProfileContext` with active kid profile
- `activeKid: KidDoc | null` — currently selected kid
- `kids: KidDoc[]` — all kid profiles
- `switchKid(kidId)` — change active kid (persists to localStorage)
- `loading: boolean`
- Active kid ID stored in localStorage: `gsi-active-kid-id`
- Fetches kid profiles on auth state change

### [FE] Wire kid profile into creation flow
**Target**: `hooks/useAiGeneration.ts`
**Action**: Update
**Requirements**:
- When authenticated with active kid: include `kidId` in API request body
- All creation API routes: save `userId` and `kidId` from auth context
- Creations list: filter by `kidId` when viewing "My Creations"
- AI Points: update kid profile's points instead of session points

## Acceptance Criteria
- [ ] Parent can add up to 4 kid profiles after sign-up
- [ ] Each kid has name, age, grade, board, and avatar
- [ ] Avatar picker shows 20+ diverse options
- [ ] Profile selector allows switching between kids
- [ ] Active kid persists across page refreshes
- [ ] Creations are tagged with kid profile ID
- [ ] "My Creations" filters by active kid
- [ ] Kid-friendly setup flow with encouraging copy
