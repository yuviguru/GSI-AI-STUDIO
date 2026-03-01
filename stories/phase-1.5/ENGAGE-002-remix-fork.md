# ENGAGE-002: Remix/Fork System for Shared Creations

## Description
When viewing someone's shared creation, let kids "remix" it — clone the original prompt and settings as a starting point for their own version. This creates a viral creation loop: share → view → remix → share again. Tracks remix lineage so original creators get credit.

## Requires KB Updates
- None

## Dependencies
- SHARE-001 (sharing — already complete)
- UI-001 (CreationCard for remix badge display)

## Subtasks

### [TYPE] Add remix fields to creation type
**Target**: `types/creation.types.ts`
**Action**: Update
**Requirements**:
- Add optional `remixedFromId?: string` to `Creation` interface
- Add optional `remixCount?: number` to `Creation` interface (denormalized count)

### [FE] Create RemixButton component
**Target**: `components/shared/RemixButton.tsx`
**Action**: Create
**Requirements**:
- Button with sparkle/refresh icon + "Remix This!" label
- Props: `creation: Creation`, `className?: string`
- On click: navigates to the appropriate studio (`/create/{type}`) with query params:
  - `?remix={creationId}&prompt={encodedPrompt}`
- Animated entry: slight bounce on render
- Fun tooltip: "Make your own version!"
- Variant: `compact` (icon only for cards) and `full` (icon + label for viewer)

### [FE] Add Remix button to creation viewer
**Target**: `app/(viewer)/view/[id]/ViewerClient.tsx`
**Action**: Update
**Requirements**:
- Add `RemixButton` above the "Create Your Own" CTA
- Shows between the studio-specific viewer and the CTA section
- Only visible on shared/public creations (not on your own creations)

### [FE] Handle remix pre-fill in PromptForms
**Target**: `components/studios/story/StoryPromptForm.tsx`
**Action**: Update
**Requirements**:
- Accept `defaultPrompt?: string` and `remixFromId?: string` props
- On mount: if `defaultPrompt` exists, pre-fill textarea
- Show "Remixed from..." banner above textarea when `remixFromId` is set
- Same for `MusicPromptForm.tsx` and `QuizPromptForm.tsx`
- Studio page reads `remix` and `prompt` from URL search params and passes to form

### [API] Track remix lineage on creation save
**Target**: `app/api/ai/story/route.ts` (and music/quiz/game routes)
**Action**: Update
**Requirements**:
- Accept optional `remixedFromId` in request body
- Pass through to `saveCreation` input
- On save: fire-and-forget increment of `remixCount` on original creation

### [FE] Show remix badge on CreationCard
**Target**: `components/creation/CreationCard.tsx` (from UI-001)
**Action**: Update
**Requirements**:
- If creation has `remixedFromId`, show small "Remixed" badge on card
- If creation has `remixCount > 0`, show "🔄 {count} remixes" indicator
- Tap remix count navigates to a filtered view (future — just show count for now)

## Acceptance Criteria
- [ ] "Remix This!" button visible on shared creation viewer
- [ ] Clicking remix navigates to studio with prompt pre-filled
- [ ] "Remixed from..." banner shows in prompt form
- [ ] Remix lineage saved in creation metadata
- [ ] Original creation's remix count increments
- [ ] Remix badge visible on remixed creation cards
- [ ] Works for all creation types (story, music, quiz, game)
