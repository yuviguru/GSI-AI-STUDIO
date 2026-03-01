# STUDIO-001: Story Creation Flow

## Description
Implement the end-to-end Story Studio experience. The flagship creation flow: user enters a story premise → Claude generates story pages → Replicate generates illustrations for each page → user previews the illustrated storybook → AI X-Ray explains how it was made.

## Requires KB Updates
- None

## Subtasks

### [FE] Create StoryPromptForm component
**Target**: `components/studios/story/StoryPromptForm.tsx`
**Action**: Create
**Requirements**:
- Text input for story premise (main idea)
- Suggestion chips for quick prompts ("A space adventure", "My pet dragon", etc.)
- Optional character/setting/genre selectors
- Age group selector (auto-detect or manual)
- Style selector (watercolor, cartoon, pixel-art, comic)
- "Create My Story" button with loading state
- Kid-friendly validation with encouraging error messages
- Mobile-first, large touch targets

### [FE] Create StoryViewer component
**Target**: `components/studios/story/StoryViewer.tsx`
**Action**: Create
**Requirements**:
- Page-by-page storybook display with swipe/arrow navigation
- Full-width illustration per page
- Story text below each illustration
- Page counter ("Page 2 of 5")
- Animated page transitions (swipe or fade)
- "Share", "Save", "AI X-Ray" action buttons
- Loading skeleton while images generate

### [FE] Create StoryProgress component
**Target**: `components/studios/story/StoryProgress.tsx`
**Action**: Create
**Requirements**:
- Animated progress indicator during generation (5-30 seconds)
- Rotating encouraging messages from useAiGeneration hook
- Animated character/illustration (not a spinner)
- Cancel button

### [API] Implement story generation pipeline
**Target**: `app/api/ai/story/route.ts`
**Action**: Update (replace stub)
**Requirements**:
- Validate input with storyInputSchema + safety filter
- Check rate limit via sessionService
- Call Claude with STORY_SYSTEM_PROMPT → get story pages + AI X-Ray
- For each page, call Replicate to generate illustration
- Upload images to Firebase Storage
- Save complete creation to Firestore
- Return story data + aiXray to client

### [FE] Wire up Story Studio page
**Target**: `app/(public)/create/story/page.tsx`
**Action**: Update (replace stub)
**Requirements**:
- 3-step flow: INSPIRE (prompt form) → CREATE (progress) → SHARE (viewer)
- Use useAiGeneration('story') hook
- Use useSession for rate limit awareness
- Transitions between steps with framer-motion

## Acceptance Criteria
- [ ] User can enter a story idea and generate an illustrated story
- [ ] Stories have 3-8 pages with illustrations
- [ ] Generation takes 5-30 seconds with animated progress
- [ ] Generated stories are age-appropriate (safety filter working)
- [ ] Storybook viewer supports swipe/arrow page navigation
- [ ] Share, Save, and AI X-Ray buttons visible after creation
- [ ] Works well on mobile (tested at 375px width)
- [ ] Rate limiting prevents abuse (5/day, 2-min cooldown)
