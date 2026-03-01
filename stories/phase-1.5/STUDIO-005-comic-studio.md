# STUDIO-005: Comic Studio — Multi-Panel Illustrated Comics

## Description
Build a comic strip creator where kids describe characters and a scenario, AI generates a 4-8 panel comic with illustrations, dialogue bubbles, and captions. The `comic` type already exists in `CreationType`. This is a visual variation of the Story Studio with a different output format — panel grid instead of page-by-page storybook.

## Requires KB Updates
- Update `docs/data-model.md` with `ComicContent` schema
- Update `docs/api-contracts.md` with `/api/ai/comic` endpoint

## Subtasks

### [TYPE] Define ComicContent type
**Target**: `types/creation.types.ts`
**Action**: Update
**Requirements**:
- Add `ComicContent` interface:
  ```
  {
    panels: Array<{
      panelNumber: number;
      imageUrl: string;
      caption?: string;
      dialogue: Array<{ character: string; text: string; position: 'left' | 'right' | 'center' }>;
      description: string; // Used for image generation prompt
    }>;
    characters: Array<{ name: string; description: string }>;
    setting: string;
    style: 'manga' | 'cartoon' | 'superhero' | 'indie' | 'chibi';
    totalPanels: number;
  }
  ```
- Add `ComicContent` to `CreationContent` union type

### [FE] Create ComicPromptForm component
**Target**: `components/studios/comic/ComicPromptForm.tsx`
**Action**: Create
**Requirements**:
- Text input for comic premise ("Two friends discover a portal to a dinosaur world")
- Character name inputs (1-3 characters with optional description)
- Panel count selector: 4, 6, or 8 panels
- Style selector chips: Cartoon, Manga, Superhero, Indie, Chibi
- Same prop pattern as `StoryPromptForm`
- Kid-friendly validation

### [API] Implement comic generation pipeline
**Target**: `app/api/ai/comic/route.ts`
**Action**: Create
**Requirements**:
- Follow `app/api/ai/story/route.ts` pattern
- Claude generates: panel descriptions, dialogue per panel, captions, character consistency notes
- Replicate generates panel illustrations (parallel, matching story pipeline concurrency)
- Image generation prompts include style prefix ("cartoon style", "manga style", etc.)
- AI X-Ray explains "visual storytelling" and "sequential art" concepts
- Save creation via `saveCreation` with type `'comic'`

### [FE] Create ComicViewer component
**Target**: `components/studios/comic/ComicViewer.tsx`
**Action**: Create
**Requirements**:
- Panel grid layout: 2 columns on mobile, adjusts for 4/6/8 panels
- Each panel: illustration image + speech bubble overlays + optional caption
- Speech bubbles: rounded containers with character name, positioned left/right/center
- Tap a panel to view fullscreen (modal with pinch-to-zoom)
- Swipe horizontal for a sequential "read mode" (one panel at a time)
- Toggle between grid view and read mode
- AI X-Ray and Share buttons (matching `StoryViewer` pattern)
- Title and character roster at top

### [FE] Create ComicProgress component
**Target**: `components/studios/comic/ComicProgress.tsx`
**Action**: Create
**Requirements**:
- Mascot with `painting` expression
- Progress messages: "Sketching panels...", "Drawing characters...", "Adding dialogue bubbles...", "Coloring the comic..."
- Cancel button

### [FE] Wire up Comic Studio page
**Target**: `app/(public)/create/comic/page.tsx` and `app/(public)/create/comic/ComicStudioClient.tsx`
**Action**: Create
**Requirements**:
- Follow `StoryStudioClient` 3-step pattern exactly
- Use `useAiGeneration<ComicData>('comic')` — add `'comic'` to hook's type union
- Add comic progress messages to `useAiGeneration` PROGRESS_MESSAGES

### [FE] Add Comic Studio to navigation and viewer
**Target**: `app/(public)/page.tsx`, `components/layout/BottomNav.tsx`, `app/(viewer)/view/[id]/ViewerClient.tsx`
**Action**: Update
**Requirements**:
- Landing page: add Comic card with emoji '🖼️', gradient 'from-pink-400 to-rose-500'
- Bottom nav: add Comic tab (now 5 tabs — Story, Music, Quiz, Game, Comic; may need "More" overflow or redesign bottom nav for 5+)
- ViewerClient: add comic rendering case with ComicViewer in readOnly mode
- Update studio grid to handle 5 studios (scroll or 2-row layout on mobile)

## Acceptance Criteria
- [ ] User can create a multi-panel comic with dialogue and illustrations
- [ ] Comics support 4, 6, or 8 panels with 5 art styles
- [ ] Panel grid displays correctly on mobile and desktop
- [ ] Speech bubbles overlay on illustrations with character names
- [ ] Full-screen panel view works with tap
- [ ] Sequential read mode with swipe navigation
- [ ] Shared comics are viewable via public link
- [ ] AI X-Ray explains visual storytelling concepts
