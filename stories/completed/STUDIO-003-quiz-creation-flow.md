# STUDIO-003: Quiz Creation Flow

## Description
Implement the Quiz Maker experience. User enters a topic and options → Claude generates an interactive quiz → user can preview and play the quiz → share with friends via link. Quizzes are playable by anyone with the link.

## Requires KB Updates
- None

## Subtasks

### [FE] Create QuizPromptForm component
**Target**: `components/studios/quiz/QuizPromptForm.tsx`
**Action**: Create
**Requirements**:
- Topic text input ("Space exploration", "Indian history", etc.)
- Suggestion chips for popular topics
- Format selector (trivia, true/false, fill in the blank, adventure)
- Difficulty selector (beginner, intermediate, advanced)
- Question count slider (3-20, default 10)
- "Create My Quiz" button

### [FE] Create QuizPlayer component
**Target**: `components/studios/quiz/QuizPlayer.tsx`
**Action**: Create
**Requirements**:
- Interactive quiz experience — one question at a time
- Multiple choice with large tappable answer buttons
- Immediate feedback (correct = green confetti, wrong = explanation)
- Score tracking with progress bar
- Final score screen with share prompt
- Animations for correct/wrong answers (framer-motion)

### [FE] Create QuizProgress component
**Target**: `components/studios/quiz/QuizProgress.tsx`
**Action**: Create
**Requirements**:
- Animated question marks/lightbulbs during generation
- Rotating messages ("Researching your topic...", "Crafting questions...")
- 5-15 second expected duration

### [API] Implement quiz generation pipeline
**Target**: `app/api/ai/quiz/route.ts`
**Action**: Update (replace stub)
**Requirements**:
- Validate input + safety filter
- Rate limit check
- Call Claude with QUIZ_SYSTEM_PROMPT
- Parse and validate quiz JSON response
- Generate AI X-Ray metadata
- Save creation to Firestore

### [FE] Wire up Quiz Maker page
**Target**: `app/(public)/create/quiz/page.tsx`
**Action**: Update (replace stub)
**Requirements**:
- 3-step flow: INSPIRE → CREATE → PLAY & SHARE
- Use useAiGeneration('quiz') hook
- After generation, go directly to playable quiz (not just preview)

## Acceptance Criteria
- [ ] User can generate a quiz on any kid-friendly topic
- [ ] Quiz is immediately playable after generation
- [ ] Correct/wrong feedback with explanations
- [ ] Final score display with share prompt
- [ ] Shared quiz link works for anyone (public play)
- [ ] Questions are factually accurate and age-appropriate
