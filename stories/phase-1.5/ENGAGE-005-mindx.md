# ENGAGE-005: MindX — AI Skill Assessment (IELTS-style + Mentor)

## Description
Build an IELTS-inspired multi-module assessment system where AI tests kids on Speaking, Listening, Thinking, and Reading — then Koko (AI mentor) gives personalized feedback and improvement tips. Each module has 5 challenges, adaptive difficulty, and band-style scoring (5 levels). Teaches metacognition and self-improvement (CBSE AI curriculum alignment).

**Core mechanic**: Pick module → Get 5 adaptive challenges → Complete tasks (voice/text/MCQ) → AI evaluates → Band score + Mentor feedback → AI Points.

**Linear ticket**: CLA-36

## Requires KB Updates
- `docs/data-model.md` — Add `skillArenaAssessments` collection + session fields ✅
- `docs/api-contracts.md` — Add MindX endpoints (start, evaluate, progress, history) ✅
- `docs/ux-patterns.md` — Add 4-step assessment UX flow ✅
- `docs/security.md` — Add voice input safety, assessment content safety, rate limits ✅
- `types/mindx.types.ts` — All type definitions ✅
- `firestore.rules` — Add `skillArenaAssessments` collection rule ✅

## Subtasks

### [TYPE] Create MindX types
**Target**: `types/mindx.types.ts` ✅ (already created)
**Action**: Created
**Contents**: SkillArenaModule (4 modules), challenge types per module, SkillArenaQuestion, SkillArenaChallenge, SkillArenaAnswer, SkillArenaChallengeResult, SkillArenaMentorFeedback, SkillArenaAssessment (Firestore doc), SKILL_ARENA_BANDS, SkillArenaModuleProgress, MODULE_INFO, MODULE_XRAY_CONCEPTS, all API request/response types

### [LIB] Create question bank
**Target**: `lib/mindx/questionBank.ts`
**Action**: Create
**Requirements**:
- 15+ questions per challenge type (~60+ per module, 240+ total)
- India-culturally-relevant, age-appropriate, CBSE-aligned
- **Speaking questions**:
  - read_aloud: Short passages (2-3 sentences) about Indian topics
  - describe: Scenarios to describe (festivals, daily life, nature, sports)
  - respond: Open questions ("What do you think about...", "If you could...")
- **Listening questions**:
  - comprehension: Passages with 4-option MCQ (audio text + question + options)
  - follow_instructions: Multi-step instructions → select correct sequence
  - key_points: Passages → kid writes 3 key points
- **Thinking questions**:
  - logic: If-then puzzles, number/letter sequences, pattern completion
  - what_if: "What would happen if..." open-ended reasoning
  - odd_one_out: 4 items, pick which doesn't belong + explain why
  - analogy: "A is to B as C is to ___" with 4 options
- **Reading questions**:
  - comprehension: 3-5 sentence passages with MCQ
  - inference: Scenarios → "What can you conclude?"
  - vocabulary: Words in context → pick meaning
  - summarize: Passage → write 2-sentence summary
- Each question: `{ text, passage?, audioText?, options?, correctOption?, timeLimit, isIndiaThemed? }`
- `getRandomChallenges(module, difficulty, count)` function
- Difficulty affects: passage length, vocabulary complexity, reasoning depth
- India themes: cricket, monsoon, festivals, school life, space (ISRO), history

### [LIB] Create AI evaluator service
**Target**: `lib/mindx/evaluator.ts`
**Action**: Create
**Requirements**:
- `evaluateChallenge(challenge, answer)` → `{ score, maxScore, feedback }`
- **MCQ evaluation**: Direct comparison (correct = 20, wrong = 0-5 based on closeness)
- **Text evaluation** (via Claude): Assess relevance, depth, accuracy, vocabulary
  - System prompt: "You are evaluating a child's response. Score 0-20. Be encouraging."
  - Returns score + one-line feedback
- **Voice transcript evaluation** (via Claude): Same as text but also assess:
  - Completeness (did they read the full passage?)
  - Natural flow (based on transcript quality)
- Difficulty multiplier: easy questions have max 15, medium 20, hard 25 (normalized to 20)
- Safety: filter kid answers through safety pipeline before evaluation
- @see `lib/ai/` for Claude API patterns

### [LIB] Create mentor feedback generator
**Target**: `lib/mindx/mentorFeedback.ts`
**Action**: Create
**Requirements**:
- `generateMentorFeedback(module, challengeResults, score, band)` → `SkillArenaMentorFeedback`
- Uses Claude to generate personalized, kid-friendly feedback
- System prompt enforces:
  - Positive, encouraging tone (never harsh)
  - 2-3 specific strengths based on challenge results
  - 2-3 growth areas framed as opportunities ("Next time try...")
  - 1-2 actionable tips (specific practice suggestions)
  - Identifies weakest challenge type as `recommendedPractice`
  - Motivational message based on band (celebrate high, encourage low)
- Template fallback if Claude fails (pre-written per band level)
- @see `lib/ai/` for Claude API patterns

### [LIB] Create scoring engine
**Target**: `lib/mindx/scoring.ts`
**Action**: Create
**Requirements**:
- `calculateTotalScore(challengeResults)` → number (0-100)
  - Sum of challenge scores / sum of maxScores * 100
- `getBand(score)` → `{ band, title, badge }` using SKILL_ARENA_BANDS thresholds
- `getDifficulty(moduleProgress)` → SkillArenaDifficulty
  - No previous assessment → medium
  - Band 1-2 → easy
  - Band 3 → medium
  - Band 4-5 → hard
- `calculatePoints(score, band, isFirst, previousBand)` → number
  - 20 base + 10 if band ≥ 3 + 20 if band 5 + 15 if first assessment + 10 if improved
- `detectBandImprovement(oldBand, newBand)` → boolean
- Pure functions, no side effects — tested independently

### [API] Create start endpoint
**Target**: `app/api/mindx/start/route.ts`
**Action**: Create
**Requirements**:
- POST handler following `fn-generator.md` template
- Validate: `{ module: SkillArenaModule }` via zod
- Rate limit: 3 assessments/day per session (reuse `checkRateLimit` pattern)
- Load session's `skillArenaProgress` → determine `difficulty`
- Get 5 random challenges from question bank for module + difficulty
- Create pending assessment in Firestore (id, module, difficulty, challenges, sessionId, createdAt)
- Return: `{ assessmentId, module, difficulty, challenges, totalChallenges, estimatedTime }`
- @see `app/api/beat-the-ai/start/route.ts` for pattern

### [API] Create evaluate endpoint
**Target**: `app/api/mindx/evaluate/route.ts`
**Action**: Create
**Requirements**:
- POST handler following `fn-generator.md` template
- Validate: SkillArenaEvaluateRequest via zod (assessmentId, 5 answers with required fields)
- Load pending assessment from Firestore, verify sessionId matches, verify not already evaluated
- Safety filter text/voice answers
- Evaluate each challenge via `evaluator.evaluateChallenge()` (parallel where possible)
- Calculate total score and band via `scoring.calculateTotalScore()` + `scoring.getBand()`
- Generate mentor feedback via `mentorFeedback.generateMentorFeedback()`
- Calculate AI Points via `scoring.calculatePoints()`
- Update session: `skillArenaProgress` for this module + `skillArenaStats`
- Award AI Points (via `updateSessionPoints`)
- Save completed assessment to Firestore
- Return: SkillArenaEvaluateResponse
- @see `app/api/beat-the-ai/submit/route.ts` for pattern

### [API] Create progress endpoint
**Target**: `app/api/mindx/progress/route.ts`
**Action**: Create
**Requirements**:
- GET handler, load from session's `skillArenaProgress` field
- Return: SkillArenaProgressResponse (all 4 modules with band/score/assessments/trend)
- Calculate overallBand, strongestModule, recommendedModule
- If no progress yet, return defaults (all modules band 0, "Not Started")

### [API] Create history endpoint
**Target**: `app/api/mindx/history/route.ts`
**Action**: Create
**Requirements**:
- GET handler, query params: module (optional filter), limit (default 10, max 50), cursor
- Query `skillArenaAssessments` where sessionId matches, ordered by createdAt desc
- Return condensed list (id, module, score, band, bandTitle, difficulty, aiPointsEarned, completedAt)
- Pagination via Firestore cursor

### [FE] Create MindXPage
**Target**: `app/(public)/mindx/page.tsx`
**Action**: Create
**Requirements**:
- Server component page with client component wrapper
- State machine flow: idle → picking → loading → challenging → submitting → evaluating → results
- Orchestrates: ModulePicker → AssessmentArena → MentorFeedback
- Uses `useSkillArena` hook for all state management
- Koko mascot appears at each step with contextual expression
- Mobile-first responsive layout

### [FE] Create ModulePicker component
**Target**: `components/mindx/ModulePicker.tsx`
**Action**: Create
**Requirements**:
- 2x2 grid of module cards
- Each card: icon, name, description, estimated time, current band badge (or "New!")
- Tap to select → triggers `/start` API call
- Overall band display at bottom
- "View My Progress" button linking to ProgressDashboard
- Mic permission hint on Speaking card (🎤 icon + "Needs microphone")
- @see `components/studios/` for card patterns

### [FE] Create AssessmentArena component
**Target**: `components/mindx/AssessmentArena.tsx`
**Action**: Create
**Requirements**:
- Renders current challenge based on type
- Progress dots at bottom (● ● ○ ○ ○)
- Challenge counter ("Challenge 2 of 5")
- Module-specific input components:
  - Speaking: SpeakingInput (mic recording + transcript display)
  - Listening: ListeningPlayer (TTS audio + replay button) + text/MCQ input
  - Thinking: MCQ selector or textarea (depending on challenge type)
  - Reading: Passage display + MCQ selector or textarea
- Timer per challenge (from question.timeLimit)
- "Next Challenge" button (disabled until answer provided)
- Auto-advance when timer expires (save partial answer)

### [FE] Create SpeakingInput component
**Target**: `components/mindx/SpeakingInput.tsx`
**Action**: Create
**Requirements**:
- Uses `useVoiceInput` hook for Web Speech API
- States: idle → requesting-permission → ready → recording → done
- Recording button (large, pulsing when active)
- Live transcript display as kid speaks
- Timer showing recording duration
- "Stop Recording" button
- Fallback: text input if mic denied (with message: "No microphone? Type your answer instead!")
- Re-record button (one retry allowed)

### [FE] Create ListeningPlayer component
**Target**: `components/mindx/ListeningPlayer.tsx`
**Action**: Create
**Requirements**:
- Uses Web Speech Synthesis API (SpeechSynthesis)
- "Tap to Listen" button → plays audio
- Visual waveform/speaker animation during playback
- "Replay" button (allowed once per challenge)
- Playback speed selector (normal / slow)
- Fallback: display text if TTS unavailable (with note: "Read this passage carefully")

### [FE] Create MentorFeedback component
**Target**: `components/mindx/MentorFeedback.tsx`
**Action**: Create
**Requirements**:
- Band score display (large, prominent, with progress bar and badge)
- Band improvement celebration (if improved from previous)
- Koko mascot with speech bubble delivering feedback
- Strengths section (green checkmarks)
- Growth areas section (purple growth icons)
- Tips section (lightbulb icons)
- Challenge breakdown: 5 mini progress bars with per-challenge scores + one-line feedback
- AI X-Ray section
- AI Points earned display
- CTAs: "Try Again" (same module) + "Try Another Module"
- Confetti on band 4+ or band improvement

### [FE] Create BandScoreCard component
**Target**: `components/mindx/BandScoreCard.tsx`
**Action**: Create
**Requirements**:
- Individual module band display: icon, module name, band badge, score, band title
- Progress bar showing score (0-100)
- Trend indicator (improving ↑, stable →, new ✨)
- Compact enough for 4-module grid on mobile (2 columns)
- Tap to open module history

### [FE] Create ProgressDashboard component
**Target**: `components/mindx/ProgressDashboard.tsx`
**Action**: Create
**Requirements**:
- 4 BandScoreCards in grid (2x2)
- Overall band display with aggregate score
- "Strongest Module" highlight
- "Recommended Next" suggestion
- Total AI Points from MindX
- Assessment history list (recent 5, expandable)
- "Start Assessment" CTA for recommended module

### [FE] Create useSkillArena hook
**Target**: `hooks/useSkillArena.ts`
**Action**: Create
**Requirements**:
- State machine: `idle | picking | loading | challenging | submitting | evaluating | results`
- `startAssessment(module)` → calls `/start`, transitions to challenging
- `submitAnswer(answer)` → stores answer locally, advances to next challenge
- `finishAssessment()` → calls `/evaluate` with all answers, transitions to results
- `tryAgain()` → resets to picking
- Holds: currentAssessment, challenges, answers[], currentChallengeIndex, results, mentorFeedback
- Error handling with kid-friendly messages

### [FE] Create useVoiceInput hook
**Target**: `hooks/useVoiceInput.ts`
**Action**: Create
**Requirements**:
- Wraps Web Speech API (SpeechRecognition)
- `startRecording()` → requests mic permission, starts recognition
- `stopRecording()` → stops recognition, returns final transcript
- States: idle → requesting → recording → processing → done → error
- Handles: permission denied, not supported, recognition errors
- Returns: { transcript, isRecording, isSupported, error, startRecording, stopRecording }
- Continuous recognition mode (for longer speaking tasks)
- Language: 'en-IN' (Indian English) with fallback to 'en-US'

### [FE] Wire into navigation
**Target**: Multiple files
**Action**: Update
**Requirements**:
- Add "MindX" to Create+ bottom sheet (BottomNav)
- Add card on homepage for MindX (with module progress preview if data exists)
- Route: `/mindx`
- @see existing navigation patterns from CLA-11, CLA-35

### [TEST] Write tests
**Target**: Multiple test files
**Action**: Create
**Requirements**:
- `lib/mindx/scoring.test.ts` — Score calculation (all formulas), band mapping, difficulty selection, points calculation, band improvement detection
- `lib/mindx/questionBank.test.ts` — All questions have required fields, no duplicates, time limits valid, difficulty distribution
- `app/api/mindx/evaluate/route.test.ts` — Safety filter, answer validation, evaluation flow
- Test priority: scoring (100%), questionBank (100%), API (80%)
