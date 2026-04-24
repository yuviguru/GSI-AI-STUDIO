# ENGAGE-008: Class-Shared Creation Feed

## Description
Inside a class, students see their peers' teacher-approved creations in a simple feed. Social reinforcement of learning — kids are more motivated when they see classmates' work. v1 is intentionally minimal: positive-emoji reactions only (no comments), teacher approves what's visible, and the feed is scoped to the class only (no cross-class discovery from here). Reuses existing explore-feed patterns for the UI.

## Requires KB Updates
- Update `docs/api-contracts.md` with class-feed endpoints
- Update `docs/security.md` on student-visibility rules inside a class

## Dependencies
- ADMIN-001 (Teacher Admin Portal) — class roster
- ADMIN-002 (Assignment System) — approved submissions are the source

## Subtasks

### [LIB] Class feed service
**Target**: `lib/firebase/classFeedService.ts`
**Action**: Create
**Requirements**:
- `listClassFeed(classId, { limit, cursor }): Promise<ClassFeedItem[]>` — paginated approved creations
- `addReaction(creationId, kidId, emoji): Promise<void>` — limited to whitelist: 👍 🎉 🌟 🔥 💯
- `removeReaction(creationId, kidId, emoji): Promise<void>`
- `getReactionCounts(creationId): Promise<Record<emoji, count>>`
- Reactions subcollection: `creations/{creationId}/reactions/{kidId}`

### [API] Class feed endpoints
**Target**: `app/api/classes/[classId]/feed/route.ts`, `app/api/creations/[id]/reactions/route.ts`
**Action**: Create
**Requirements**:
- `GET /api/classes/[classId]/feed?cursor=` — paged feed of teacher-approved creations
- `POST /api/creations/[id]/reactions` — add reaction
- `DELETE /api/creations/[id]/reactions?emoji=` — remove reaction
- All endpoints: student must be in class roster

### [FE] Class feed page
**Target**: `app/(auth)/kid/class/[classId]/feed/page.tsx`, `components/class/ClassFeed.tsx`, `components/class/FeedCard.tsx`
**Action**: Create
**Requirements**:
- Card per creation: kid first name + creation preview + reaction bar + teacher approval badge
- Infinite scroll
- Reaction-to-creation is instant (optimistic UI, revert on error)
- Empty state for kids when no creations yet

### [FE] Teacher approval toggle
**Target**: `components/teacher/SubmissionReview.tsx` (modify)
**Action**: Modify
**Requirements**:
- Add "Share to class feed" toggle on approved submissions
- Shows preview of how it'll appear in feed
- Defaults to off — teacher opt-in for each submission

### [TEST] Feed + reaction tests
**Target**: `lib/firebase/__tests__/classFeedService.test.ts`
**Action**: Create
**Requirements**:
- Non-class-member gets 403 on feed
- Reaction limited to whitelist emojis
- Pagination cursor correctness
- Only teacher-approved + explicitly-shared creations appear

## Acceptance Criteria
- [ ] Students see approved peer creations in class feed
- [ ] Only works when teacher has opted to share via review UI
- [ ] Students react with whitelisted positive emojis
- [ ] No comments in v1
- [ ] No cross-class leakage
- [ ] Works on mobile (card layout)
