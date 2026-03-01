# UI-001: My Creations Gallery

## Description
Implement the full My Creations gallery at `/creations`. Currently this page shows only an empty state placeholder. Kids need a real gallery to browse, filter, and manage their AI-generated content — stories, music, quizzes — displayed as visual cards with thumbnails, type badges, and action menus.

## Requires KB Updates
- None

## Subtasks

### [FE] Create CreationCard component
**Target**: `components/creation/CreationCard.tsx`
**Action**: Create
**Requirements**:
- Displays thumbnail image (or type-specific placeholder if no thumbnail)
- Title with truncation (max 2 lines)
- Type badge (Story/Music/Quiz) with color-coded pill
- Relative timestamp ("2 hours ago", "Yesterday")
- View count + share count indicators
- Three-dot action menu: Share, Delete
- Tap navigates to `/view/[id]`
- Use `motion.div` with `whileHover` / `whileTap` scale animation (matching `StudioCard` pattern in `page.tsx`)
- Mobile-first: large touch targets (min 44px)

### [FE] Create CreationGrid component
**Target**: `components/creation/CreationGrid.tsx`
**Action**: Create
**Requirements**:
- 2-column grid layout on mobile, 3 columns on tablet+
- Responsive gap spacing (gap-3 mobile, gap-4 desktop)
- Accepts `items: Creation[]` prop
- Empty state when no items (reuse existing empty state styling)
- Loading skeleton state with 4-6 shimmer cards
- Infinite scroll support via `onLoadMore` callback + `hasMore` prop
- Uses `CreationCard` for each item

### [HOOK] Create useCreations hook
**Target**: `hooks/useCreations.ts`
**Action**: Create
**Requirements**:
- Fetches from `GET /api/creations` with `X-Session-Id` header (pattern from `useAiGeneration.ts`)
- Cursor-based pagination matching `ListCreationsResult` from `creationService.ts`
- Optional `type` filter parameter
- Returns `{ creations, loading, error, hasMore, loadMore, refresh, deleteCreation }`
- `deleteCreation(id)` calls `DELETE /api/creations/[id]` and removes from local state optimistically
- Auto-fetches on mount

### [FE] Create filter chips bar
**Target**: `components/creation/CreationFilters.tsx`
**Action**: Create
**Requirements**:
- Horizontal scrollable chip bar: All | Stories | Music | Quizzes
- Active chip highlighted with `bg-brand-purple text-white`
- Inactive chips: `bg-gray-100 text-gray-600`
- Follow existing chip pattern from `StoryPromptForm.tsx` suggestion chips
- `onFilterChange(type: CreationType | null)` callback

### [API] Implement creation delete endpoint
**Target**: `app/api/creations/[id]/route.ts`
**Action**: Update (add DELETE handler)
**Requirements**:
- Validate `X-Session-Id` header
- Verify creation belongs to requesting session (`sessionId` match)
- Soft-delete: set `status` to `archived` (not hard delete)
- Return `{ success: true }`
- Throw `FORBIDDEN` if session doesn't own the creation

### [FE] Wire up My Creations page
**Target**: `app/(public)/creations/page.tsx`
**Action**: Update (replace empty state)
**Requirements**:
- Convert to client component with `'use client'` directive
- Use `useCreations` hook for data fetching
- Include `CreationFilters` bar below page header
- Include `CreationGrid` as main content
- Show empty state only when no creations exist (keep existing empty state design)
- Page header: emoji + title + subtitle (matching existing pattern)
- Add confirmation dialog for delete ("Are you sure? This can't be undone!")
- Use `framer-motion` for filter transitions

## Acceptance Criteria
- [ ] Gallery shows all session creations with thumbnails and metadata
- [ ] Filter chips switch between All/Stories/Music/Quizzes
- [ ] Infinite scroll loads more creations as user scrolls
- [ ] Delete shows confirmation dialog and archives the creation
- [ ] Empty state appears when no creations exist
- [ ] Loading skeleton shows while fetching
- [ ] Tapping a card navigates to the creation viewer
- [ ] Works well on mobile (tested at 375px width)
