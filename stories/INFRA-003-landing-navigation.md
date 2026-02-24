# INFRA-003: Landing Page & Navigation

## Description
Polish the landing page with the kid-friendly design system and implement the bottom navigation bar. This is the first thing users see — it needs to be vibrant, inviting, and instantly communicate what GSI AI Studio does.

## Requires KB Updates
- None

## Subtasks

### [FE] Create BottomNav component
**Target**: `components/layout/BottomNav.tsx`
**Action**: Create
**Requirements**:
- Fixed bottom navigation bar (mobile-first)
- 4 tabs: Story (📖), Music (🎵), Quiz (🎮), My Creations (✨)
- Active tab highlighted with brand-purple
- Icons + labels, large touch targets (56px height)
- Hide on creation viewer page (full-screen mode)
- Smooth transition animations

### [FE] Create Header component
**Target**: `components/layout/Header.tsx`
**Action**: Create
**Requirements**:
- GSI AI Studio logo/wordmark
- AI Points badge (from LEARN-001)
- Minimal — don't compete with studios for attention
- Sticky top on scroll

### [FE] Polish landing page
**Target**: `app/(public)/page.tsx`
**Action**: Update
**Requirements**:
- Hero section: catchy tagline + animated illustration
- Studio cards with hover animations (already stubbed)
- "Recent Creations" showcase (popular public creations)
- Featured challenge banner (Phase 2 prep)
- Mobile-optimized with smooth scroll
- Apply frontend-design skill for distinctive look

### [FE] Create PublicLayout wrapper
**Target**: `app/(public)/layout.tsx`
**Action**: Create
**Requirements**:
- Header + BottomNav wrapping all public pages
- Content area with proper padding for fixed nav elements
- Session initialization (useSession on mount)

## Acceptance Criteria
- [ ] Landing page loads in under 1.5 seconds (FCP)
- [ ] Bottom nav is visible on all public pages
- [ ] Active tab reflects current route
- [ ] Design is vibrant and kid-friendly
- [ ] Works well on iPhone SE (smallest target) through iPad
- [ ] AI Points badge visible in header
