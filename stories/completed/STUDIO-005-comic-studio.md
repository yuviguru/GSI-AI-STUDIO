# STUDIO-005: Comic Studio — Multi-Panel Illustrated Comics

## Description
Build a comic strip creator where kids describe characters and a scenario, AI generates a 4-8 panel comic with illustrations, dialogue bubbles, and captions. The `comic` type already exists in `CreationType`. This is a visual variation of the Story Studio with a different output format — panel grid instead of page-by-page storybook.

## Design Decisions
- **BottomNav**: Redesign from flat 6-tab to 3-tab (Create+, Explore, My Stuff) with "Create+" bottom sheet showing all 5 studios
- **Dialogue**: Multiple speech bubbles per panel — `Array<{ character, text, position }>` — allows two characters talking in same panel
- **Image styles**: Style-specific prompt prefixes (manga/cartoon/superhero/indie/chibi) passed in image prompt, `style='comic'` to image clients — no shared client changes
- **Speech bubbles**: CSS overlays positioned by `position` field (left/right/center)
- **Panel dimensions**: 512x512 square (optimal for 2-col grid + SDXL)
- **Default panel count**: 4 (with 6/8 as advanced options)
- **View modes**: Grid (2-col, default) + Read mode (swipe) toggle
- **AI Points**: 12 pts per creation (story=10, game=15)

## Requires KB Updates
- Update `docs/data-model.md` with `ComicContent` schema ✅
- Update `docs/api-contracts.md` with `/api/ai/comic` endpoint ✅

## Subtasks

### [TYPE] Define ComicContent type
**Target**: `types/creation.types.ts`
**Action**: Update
**Requirements**:
- Add `ComicPanel` interface:
  ```ts
  {
    panelNumber: number;
    imageUrl: string;
    caption?: string;
    dialogue: Array<{ character: string; text: string; position: 'left' | 'right' | 'center' }>;
    imagePrompt: string;
  }
  ```
- Add `ComicContent` interface:
  ```ts
  {
    panels: ComicPanel[];
    title: string;
    style: 'manga' | 'cartoon' | 'superhero' | 'indie' | 'chibi';
    characters: Array<{ name: string; description: string }>;
    setting: string;
    synopsis: string;
    totalPanels: number;
  }
  ```
- Add `ComicContent` to `CreationContent` union type

### [TYPE] Add comicInputSchema
**Target**: `lib/validators.ts`
**Action**: Update
**Requirements**:
- Add `comicInputSchema`: premise (5-500 chars), style enum, panelCount (4/6/8), characters (array of strings, max 4), ageGroup
- Export `ComicInput` type

### [TYPE] Update useAiGeneration hook
**Target**: `hooks/useAiGeneration.ts`
**Action**: Update
**Requirements**:
- Add `'comic'` to `studioType` union
- Add comic progress messages: "Sketching your characters...", "Drawing the first panel...", "Adding speech bubbles...", "Inking the final panels..."

### [API] Create comic prompt template
**Target**: `lib/ai/prompts/comicPrompt.ts`
**Action**: Create
**Requirements**:
- `COMIC_SYSTEM_PROMPT` — instructs Claude to output panel descriptions + multi-character dialogue + captions as structured JSON
- `COMIC_STYLE_PREFIXES` — maps manga/cartoon/superhero/indie/chibi to detailed prompt prefixes
- `buildComicUserPrompt()` — assembles user message from input fields
- Pattern: follow `lib/ai/prompts/storyPrompt.ts`

### [API] Implement comic generation pipeline
**Target**: `app/api/ai/comic/route.ts`
**Action**: Create
**Requirements**:
- Follow `app/api/ai/story/route.ts` 11-step pipeline
- Claude generates: panel descriptions, multi-character dialogue per panel, captions, character consistency notes
- Image generation: parallel batches (concurrency=3, 512x512 square panels)
- Style-specific prompt prefixes (manga/cartoon/superhero/indie/chibi) prepended to each panel's imagePrompt
- Pass `style='comic'` to image client — visual style detail is in prompt prefix, not client enum
- `filterOutput()` on all dialogue text; `filterImagePrompt()` on panel descriptions
- AI X-Ray concept: `multimodal_ai`, aiPoints: 12
- Save creation via `saveCreation` with type `'comic'`

### [FE] Create ComicPromptForm component
**Target**: `components/studios/comic/ComicPromptForm.tsx`
**Action**: Create
**Requirements**:
- Follow `StoryPromptForm` pattern
- Textarea for premise (500 char limit)
- 6 suggestion chips (Indian-themed comic ideas)
- Style selector chips: Cartoon, Manga, Superhero, Indie, Chibi
- Panel count selector: 4 (default), 6, 8 — with time warning at 6+
- Character inputs: up to 2 optional character descriptions (name + appearance)
- Age group selector
- Accent color: `brand-orange`
- Submit label: "Draw My Comic"

### [FE] Create ComicProgress component
**Target**: `components/studios/comic/ComicProgress.tsx`
**Action**: Create
**Requirements**:
- Mascot with `painting` expression
- Progress messages from `useAiGeneration` (rotating)
- Animated dots in `brand-orange`
- Cancel button calls `reset()`
- Pattern: follow `StoryProgress.tsx`

### [FE] Create ComicPanelView component
**Target**: `components/studios/comic/ComicPanelView.tsx`
**Action**: Create
**Requirements**:
- Single panel renderer: square image + CSS speech bubble overlays + caption strip
- **Multiple speech bubbles per panel** — each dialogue entry rendered at its `position` (left/right/center)
- Semi-transparent white bubbles with character name label + CSS triangle tail
- Caption as dark strip at bottom of panel
- Panel number badge (bottom-right)

### [FE] Create ComicViewer component
**Target**: `components/studios/comic/ComicViewer.tsx`
**Action**: Create
**Requirements**:
- Two view modes with toggle: Grid (2-col, default) and Read (swipe, one panel at a time)
- Grid mode: `grid grid-cols-2 gap-3` rendering `ComicPanelView` for each panel
- Read mode: reuse swipe/drag logic from StoryViewer, `AnimatePresence` transitions
- Title + style badge at top, character roster
- Share button, AI X-Ray button, "Create Another" button
- Auto-show AI X-Ray on first creation (sessionStorage pattern)
- `readOnly` prop for shared view at `/view/[id]`
- Pattern: follow `StoryViewer.tsx`

### [FE] Wire up Comic Studio page
**Target**: `app/(public)/create/comic/page.tsx` and `app/(public)/create/comic/ComicStudioClient.tsx`
**Action**: Create
**Requirements**:
- Follow `StoryStudioClient` 3-step pattern exactly
- `useAiGeneration<ComicData>('comic')`
- Background gradient: `from-brand-orange/5`

### [FE] Redesign BottomNav with Create+ sheet
**Target**: `components/layout/BottomNav.tsx`
**Action**: Update
**Requirements**:
- Replace flat 6-tab layout with 3 persistent tabs: **Create+**, **Explore**, **My Stuff**
- "Create+" button opens animated bottom sheet (AnimatePresence) with 5 studio cards in a grid
- Sheet shows: Story, Music, Quiz, Game, Comic — each with emoji + label + colored text
- `isStudioActive` check highlights Create+ tab when any `/create/*` route is active
- Sheet backdrop overlay dismisses on tap

### [FE] Add Comic Studio to landing page
**Target**: `app/(public)/page.tsx`
**Action**: Update
**Requirements**:
- Add Comic Studio card: emoji '🎨', gradient `from-orange-400 to-amber-500`
- Update grid for 5 studios
- Update hero text to mention "comics"

### [FE] Add Comic to ViewerClient
**Target**: `app/(viewer)/view/[id]/ViewerClient.tsx`
**Action**: Update
**Requirements**:
- Import `ComicViewer`
- Add `{creation.type === 'comic' && <ComicViewer ... readOnly />}` branch
- Comic already in `TYPE_LABELS`, `STUDIO_LINKS`, `CTA_LABELS` — just needs viewer branch

## Acceptance Criteria
- [ ] User can create a multi-panel comic with dialogue and illustrations
- [ ] Comics support 4, 6, or 8 panels with 5 art styles (manga, cartoon, superhero, indie, chibi)
- [ ] Panel grid displays correctly on mobile (2-col) and desktop
- [ ] Multiple speech bubbles per panel with character names and CSS overlay positioning
- [ ] Toggle between grid view and sequential read mode with swipe
- [ ] Shared comics are viewable via public link (`/view/[id]`)
- [ ] AI X-Ray explains visual storytelling / multimodal AI concepts
- [ ] BottomNav redesigned to 3-tab + Create+ sheet (handles 5+ studios cleanly)
- [ ] All checks pass: `pnpm lint && pnpm build && pnpm test -- --run`
