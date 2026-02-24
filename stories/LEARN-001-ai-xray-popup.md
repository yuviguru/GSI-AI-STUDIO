# LEARN-001: AI X-Ray Popup

## Description
Implement the AI X-Ray learning component — the educational cornerstone of GSI AI Studio. After every creation, kids can tap "AI X-Ray" to see a 30-second explanation of what the AI did, which CBSE AI concept it maps to, and earn AI Points. This is what makes us an AI learning platform, not just an AI toy.

## Requires KB Updates
- None

## Subtasks

### [FE] Create AiXrayPopup component
**Target**: `components/learning/AiXrayPopup.tsx`
**Action**: Create
**Requirements**:
- Bottom sheet or modal popup (mobile-friendly)
- Sections:
  1. "What did the AI do?" — concept name + icon
  2. "How it works" — 30-second kid-friendly explanation
  3. "CBSE Connection" — curriculum tag badge
  4. "AI Points earned" — animated point award (+5, +10)
- Animated entrance (slide up from bottom)
- "Got it!" dismiss button
- Optional "Learn More" link (Phase 2: deeper curriculum content)

### [FE] Create AiPointsBadge component
**Target**: `components/learning/AiPointsBadge.tsx`
**Action**: Create
**Requirements**:
- Display current AI Points total
- Animated increment when points earned (counting animation)
- Sparkle effect on point gain
- Points stored in localStorage (Phase 1) or Firestore (Phase 2)

### [HOOK] Create useAiPoints hook
**Target**: `hooks/useAiPoints.ts`
**Action**: Create
**Requirements**:
- Track AI Points in localStorage (Phase 1)
- `addPoints(amount)` with animation trigger
- `totalPoints` getter
- `conceptsLearned` — list of unique CBSE concepts encountered

### [FE] Create CurriculumTag component
**Target**: `components/learning/CurriculumTag.tsx`
**Action**: Create
**Requirements**:
- Small colored badge showing CBSE curriculum topic
- E.g., "NLP & Text Generation", "Neural Networks", "Computer Vision"
- Consistent color per topic area

### [FE] Integrate AI X-Ray into all studios
**Target**: `components/studios/story/StoryViewer.tsx`, `music/MusicPlayer.tsx`, `quiz/QuizPlayer.tsx`
**Action**: Update
**Requirements**:
- "AI X-Ray 🔍" button in action bar
- Opens AiXrayPopup with data from aiXray field
- Auto-show on first creation (then user-triggered)

## Acceptance Criteria
- [ ] AI X-Ray button appears after every creation
- [ ] Popup explains the AI concept in kid-friendly language
- [ ] CBSE curriculum tag is displayed
- [ ] AI Points are awarded and displayed
- [ ] Points persist across sessions (localStorage)
- [ ] Works consistently across all 3 studios
