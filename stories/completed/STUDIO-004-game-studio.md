# STUDIO-004: Game Studio — Text Adventure / Choose-Your-Own-Adventure

## Description
Build a text adventure game creator where kids describe a scenario and AI generates a branching narrative with choices. Players navigate through scenes, make decisions, and reach different endings. The `game` type already exists in `CreationType` but has no content type or studio. Follows the exact 3-step pattern (inspire → create → share) established by `StoryStudioClient.tsx`.

## Requires KB Updates
- Update `docs/data-model.md` with `GameContent` schema
- Update `docs/api-contracts.md` with `/api/ai/game` endpoint

## Subtasks

### [TYPE] Define GameContent type
**Target**: `types/creation.types.ts`
**Action**: Update
**Requirements**:
- Add `GameContent` interface:
  ```
  {
    scenes: Array<{
      id: string;
      text: string;
      imageUrl?: string;
      choices: Array<{ text: string; nextSceneId: string }>;
      isEnding: boolean;
      endingType?: 'victory' | 'defeat' | 'neutral';
    }>;
    startSceneId: string;
    totalScenes: number;
    totalEndings: number;
  }
  ```
- Add `GameContent` to `CreationContent` union type
- Add `GameGenerateResponse` interface matching existing `StoryGenerateResponse` pattern

### [FE] Create GamePromptForm component
**Target**: `components/studios/game/GamePromptForm.tsx`
**Action**: Create
**Requirements**:
- Text input for game premise ("You're a space explorer who finds a mysterious planet...")
- Setting selector chips: Fantasy World, Space Station, Underwater City, Enchanted Forest, Indian Palace, Time Machine
- Difficulty selector: Easy (fewer choices, shorter), Medium, Hard (complex branching)
- Character name input (optional — defaults to "You")
- "Create My Game" button with loading state
- Same prop pattern as `StoryPromptForm`: `onSubmit`, `isLoading`, `canCreate`, `cooldownSeconds`, `creationsRemaining`
- Kid-friendly validation with encouraging errors

### [API] Implement game generation pipeline
**Target**: `app/api/ai/game/route.ts`
**Action**: Create
**Requirements**:
- Follow exact pattern from `app/api/ai/story/route.ts`
- Validate input with `gameInputSchema` + safety filter
- Check rate limit via `checkRateLimit(sessionId)`
- Call Claude with `GAME_SYSTEM_PROMPT` that generates:
  - 6-10 scenes with 2-3 choices each
  - 2-4 different endings (mix of victory/defeat/neutral)
  - Scene descriptions with vivid, age-appropriate text
  - AI X-Ray data explaining "decision trees" and "branching logic" concepts
- Optionally generate scene illustrations via Replicate (1-2 key scenes only for speed)
- Save creation to Firestore via `saveCreation`
- Return game data + aiXray + creationId

### [FE] Create GamePlayer component
**Target**: `components/studios/game/GamePlayer.tsx`
**Action**: Create
**Requirements**:
- Displays current scene text with optional illustration
- Shows 2-3 choice buttons below scene text
- Tracks player path through scenes
- Scene transition animation (fade or slide)
- Ending screen: shows ending type badge (Victory!/Game Over/The End), mascot expression, "Play Again" and "Share" buttons
- "Restart" button always visible
- Scene counter: "Scene 3 of ~8"
- Back button to undo last choice
- Path history sidebar (collapsible) showing decisions made
- AI X-Ray and Share buttons (matching `StoryViewer` action pattern)

### [FE] Create GameProgress component
**Target**: `components/studios/game/GameProgress.tsx`
**Action**: Create
**Requirements**:
- Follow pattern from `StoryProgress.tsx`
- Mascot with `thinking` expression (from UI-002) or gear/brain animation
- Progress messages: "Building your world...", "Creating storylines...", "Adding plot twists...", "Preparing your adventure..."
- Cancel button

### [FE] Wire up Game Studio page
**Target**: `app/(public)/create/game/page.tsx` and `app/(public)/create/game/GameStudioClient.tsx`
**Action**: Create
**Requirements**:
- Server component `page.tsx` with metadata: title "Game Studio — GSI AI Studio"
- Client component `GameStudioClient.tsx` following exact `StoryStudioClient` pattern
- 3-step flow: inspire (GamePromptForm) → create (GameProgress) → share (GamePlayer)
- Use `useAiGeneration<GameData>('game')` — requires adding `'game'` to the hook's type union
- Use `useSession` for rate limit awareness

### [FE] Add Game Studio to navigation
**Target**: `app/(public)/page.tsx`, `components/layout/BottomNav.tsx`
**Action**: Update
**Requirements**:
- Add Game studio card to landing page `studios` array:
  - emoji: '🎮', title: 'Game Studio', description: 'Create adventure games with choices'
  - gradient: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-50'
- Add Game tab to bottom nav tabs array: `{ href: '/create/game', label: 'Game', emoji: '🕹️' }`
- Ensure grid layout adjusts for 4 studios (2x2 on mobile, 4-col on desktop)
- Update `useAiGeneration` hook to support `'game'` type in its union + progress messages

### [FE] Add Game type to ViewerClient
**Target**: `app/(viewer)/view/[id]/ViewerClient.tsx`
**Action**: Update
**Requirements**:
- Add game rendering case alongside story/music/quiz
- Render `GamePlayer` in read-only/replay mode for shared games
- Add to `STUDIO_LINKS` and `CTA_LABELS` maps

## Acceptance Criteria
- [ ] User can enter a game premise and generate a branching text adventure
- [ ] Games have 6-10 scenes with 2-3 choices per scene
- [ ] Multiple endings exist (victory, defeat, neutral)
- [ ] Player can navigate through scenes by making choices
- [ ] Back button lets player undo choices
- [ ] Ending screen shows result with Play Again option
- [ ] Game is shareable and playable via shared link
- [ ] AI X-Ray explains decision trees / branching logic
- [ ] Game Studio accessible from landing page and bottom nav
- [ ] Rate limiting works (uses same session system)
