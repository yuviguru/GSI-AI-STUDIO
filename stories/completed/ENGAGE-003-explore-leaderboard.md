# ENGAGE-003: Explore & Leaderboard Feed

## Description
Build a browsable public feed at `/explore` showing creations from the community. Kids can discover what others have made, filter by type, sort by trending or newest, and get inspired. Also includes a simple leaderboard showing top creators. This transforms the app from a solo tool into a community platform.

## Requires KB Updates
- None

## Subtasks

### [API] Create public creations endpoint
**Target**: `app/api/creations/public/route.ts`
**Action**: Create
**Requirements**:
- `GET` method with query params: `type`, `sort` (`trending` | `newest`), `cursor`, `limit`
- Queries `creations` collection where `isPublic == true` and `status == 'published'`
- `trending` sort: order by `likeCount` descending (then `createdAt` descending)
- `newest` sort: order by `createdAt` descending
- Cursor-based pagination (matching `listCreations` pattern in `creationService.ts`)
- Does NOT require session header (public endpoint)
- Returns `{ items, nextCursor, hasMore }`

### [LIB] Add public creations query to creationService
**Target**: `lib/firebase/creationService.ts`
**Action**: Update
**Requirements**:
- Add `listPublicCreations(filters: PublicListFilters): Promise<ListCreationsResult>`
- `PublicListFilters: { type?, sort: 'trending' | 'newest', limit?, cursor? }`
- Uses composite Firestore index on `isPublic + likeCount` (already defined in data model)
- No session filtering — returns all public creations

### [FE] Create Explore page
**Target**: `app/(public)/explore/page.tsx`
**Action**: Create
**Requirements**:
- Page header: "Explore" title + "See what others are creating" subtitle
- Filter chips bar (reuse `CreationFilters` from UI-001): All / Stories / Music / Quizzes / Games / Comics
- Sort toggle: "Trending 🔥" / "Newest ⚡" (pill toggle)
- `CreationGrid` (from UI-001) displaying public creations
- Infinite scroll with `useIntersectionObserver` for load-more trigger
- Loading skeleton on initial load
- Empty state: "No creations yet — be the first!"

### [HOOK] Create useExplore hook
**Target**: `hooks/useExplore.ts`
**Action**: Create
**Requirements**:
- Fetches from `GET /api/creations/public` (no session header needed)
- Manages type filter and sort state
- Cursor-based pagination with `loadMore` function
- Returns `{ creations, loading, hasMore, loadMore, filter, setFilter, sort, setSort }`
- Re-fetches when filter or sort changes (resets cursor)

### [FE] Create Featured section
**Target**: `components/explore/FeaturedSection.tsx`
**Action**: Create
**Requirements**:
- Horizontal carousel of "Featured" creations at top of Explore page
- Initially hardcoded 3-5 featured creation IDs (can be made dynamic later)
- Larger card format than regular grid: wider with preview image
- "Featured ⭐" badge on each card
- If no featured creations configured, section doesn't render

### [FE] Create simple Leaderboard
**Target**: `components/explore/Leaderboard.tsx`
**Action**: Create
**Requirements**:
- Compact leaderboard card showing top 5 creators this week
- Each entry: rank (#1-#5), avatar placeholder, "Creator" label, creation count
- Note: In Phase 1 (anonymous sessions), creators are identified by session — display as "Anonymous Creator"
- Will become meaningful in Phase 2 when profiles exist
- Positioned as a card in the Explore page sidebar or below featured section

### [FE] Add Explore to bottom navigation
**Target**: `components/layout/BottomNav.tsx`
**Action**: Update
**Requirements**:
- Replace "My Stuff" with "Explore" in bottom nav: `{ href: '/explore', label: 'Explore', emoji: '🔍' }`
- Move "My Stuff" / "My Creations" to be accessible from the Header (profile area) or Explore page
- OR: redesign bottom nav to support 5 tabs (Story, Music, Quiz, Explore, My Stuff)
- Ensure active indicator still works correctly

## Acceptance Criteria
- [ ] `/explore` page shows public creations from all users
- [ ] Filter by type (All/Story/Music/Quiz) works
- [ ] Sort by Trending and Newest works
- [ ] Infinite scroll loads more creations
- [ ] Featured section shows highlighted creations
- [ ] Simple leaderboard shows top creators
- [ ] Explore tab accessible from bottom navigation
- [ ] Tapping a creation navigates to the viewer
- [ ] Works without authentication (public endpoint)
