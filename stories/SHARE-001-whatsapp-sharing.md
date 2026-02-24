# SHARE-001: WhatsApp Sharing & Creation Viewer

## Description
Implement the sharing system optimized for WhatsApp (the primary sharing channel for Indian parents/kids). Generate beautiful OG preview cards, one-tap WhatsApp share, and a full-screen immersive viewer for shared links.

## Requires KB Updates
- None

## Subtasks

### [API] Implement share endpoint
**Target**: `app/api/share/[id]/route.ts`
**Action**: Update (replace stub)
**Requirements**:
- Fetch creation from Firestore
- Generate share URL
- Build WhatsApp deep link with pre-filled message
- Increment share count
- Return shareUrl, whatsappUrl, ogImage URL

### [API] Create OG image generator
**Target**: `app/api/og/[id]/route.ts`
**Action**: Create
**Requirements**:
- Dynamic OG image using @vercel/og or satori
- Include: creation title, type icon, thumbnail, "Made with GSI AI Studio" branding
- Dimensions: 1200x630 (WhatsApp optimal)
- Cache generated images (Firebase Storage)
- Fallback to generic branded image if generation fails

### [FE] Create ShareSheet component
**Target**: `components/shared/ShareSheet.tsx`
**Action**: Create
**Requirements**:
- Bottom sheet with share options
- WhatsApp share (primary, large button with green styling)
- Copy link button
- Native share API (navigator.share) as fallback
- "Shared!" confirmation animation

### [FE] Implement creation viewer page
**Target**: `app/(public)/view/[id]/page.tsx`
**Action**: Update (replace stub)
**Requirements**:
- Server-side fetch creation for SEO + OG meta tags
- Render based on type:
  - Story → page flipper (StoryViewer in read-only mode)
  - Music → audio player (MusicPlayer in read-only mode)
  - Quiz → interactive play (QuizPlayer in play mode)
- "Create Your Own" CTA at bottom
- GSI AI Studio branding header
- Mobile-optimized full-screen experience

### [FE] Create ShareButton component
**Target**: `components/shared/ShareButton.tsx`
**Action**: Create
**Requirements**:
- Reusable share trigger button
- Opens ShareSheet on click
- Shows share count badge
- Calls POST /api/share/[id] before opening sheet

## Acceptance Criteria
- [ ] One-tap WhatsApp sharing with pre-filled message
- [ ] Shared links show rich preview in WhatsApp (OG image + title)
- [ ] Creation viewer renders correctly for all 3 types
- [ ] Viewer is mobile-optimized and loads fast
- [ ] "Create Your Own" CTA drives new users back to studios
- [ ] Share count tracks accurately
