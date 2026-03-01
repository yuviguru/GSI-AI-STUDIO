# PROFILE-002: Creator Portfolio Page

## Description
Public profile page at `/creator/[kidId]` showcasing a kid's avatar, name, creation count, badges, and gallery of public creations. This is the "show off" page kids share with friends and family — their AI creative portfolio. Includes SSR for social sharing with OG metadata.

## Requires KB Updates
- None

## Dependencies
- AUTH-001 (Phone OTP Authentication)
- PROFILE-001 (Parent-Kid Profiles)

## Subtasks

### [API] Create public profile endpoint
**Target**: `app/api/creators/[id]/route.ts`
**Action**: Create
**Requirements**:
- `GET` method: returns public profile data for a kid
- Returns: name, avatarId, creation count, badge count, top 3 badges, join date
- Does NOT expose age, grade, phone, or parent info (privacy)
- No auth required (public endpoint)
- Throws `NOT_FOUND` if kid profile doesn't exist or is not public

### [FE] Create portfolio page with SSR
**Target**: `app/(public)/creator/[id]/page.tsx`
**Action**: Create
**Requirements**:
- Server component with `generateMetadata` for OG tags (following `view/[id]/page.tsx` pattern)
- OG title: "{Name}'s Creations — GSI AI Studio"
- OG description: "{Name} has created {count} AI masterpieces!"
- Fetches public profile data server-side
- Renders `PortfolioClient` component

### [FE] Create PortfolioClient component
**Target**: `app/(public)/creator/[id]/PortfolioClient.tsx`
**Action**: Create
**Requirements**:
- **CreatorHeader**: avatar (large), name, stats row (creations count, views count, shares count)
- **Badge Shelf**: horizontal scroll of earned badge emojis (tap to see name)
- **Creation Gallery**: reuse `CreationGrid` (from UI-001) filtered to this kid's public creations
- Type filter chips for gallery
- "Share My Profile" button using existing `ShareButton` pattern
- Fun gradient background matching avatar theme
- Empty state if no public creations yet

### [API] Generate portfolio OG image
**Target**: `app/api/og/creator/[id]/route.ts`
**Action**: Create
**Requirements**:
- Uses `@vercel/og` (already a dependency from SHARE-001)
- Renders avatar, name, creation count, top badges
- Colorful branded layout matching creation OG images
- 1200x630px output

### [FE] Add "My Portfolio" link to profile area
**Target**: `components/layout/Header.tsx`
**Action**: Update
**Requirements**:
- In authenticated user dropdown, add "My Portfolio" link
- Navigates to `/creator/[activeKidId]`
- Only shows when authenticated with active kid profile

## Acceptance Criteria
- [ ] Public portfolio page shows kid's avatar, name, and stats
- [ ] Badge shelf displays earned badges
- [ ] Creation gallery shows public creations with type filtering
- [ ] OG metadata generates for social sharing
- [ ] "Share My Profile" creates WhatsApp-shareable link
- [ ] Portfolio accessible without authentication (public page)
- [ ] No private data (age, phone, parent info) exposed
- [ ] My Portfolio link available in header dropdown
