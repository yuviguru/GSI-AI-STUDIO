# ENGAGE-006: Cerebro — Competitive Exam with Anti-Malpractice + Leaderboards

## Description
Build a competitive exam system where kids test their AI knowledge and skills against peers across India. Features multi-round elimination (Prelims → Semi-Finals → Finals), geographic leaderboards (School → District → City → State → National), 3-layer anti-malpractice system, and valuable prizes for winners. Phase 2+ (requires authentication for identity and prize distribution).

**Core mechanic**: Browse competitions → Register → Take proctored exam → Get results & rank → View leaderboard at multiple levels.

**Linear ticket**: CLA-37

## Requires KB Updates
- `docs/data-model.md` — Add `competitions`, `examSessions`, `leaderboards` collections ✅
- `docs/api-contracts.md` — Add 9 Cerebro endpoints ✅
- `docs/ux-patterns.md` — Add 5-step exam UX flow ✅
- `docs/security.md` — Add anti-malpractice 3-layer defense + flag system ✅
- `types/cerebro.types.ts` — All type definitions ✅
- `firestore.rules` — Add `competitions`, `examSessions`, `leaderboards` rules ✅

## Subtasks

### [TYPE] Create Cerebro types
**Target**: `types/cerebro.types.ts` ✅ (already created)
**Action**: Created
**Contents**: CompetitionStatus, AgeGroup, AGE_GROUP_INFO, ProctorLevel, CompetitionRound, QuestionConfig, Competition, ExamQuestionType, ExamQuestion, FlagLevel, ReviewStatus, ProctorEventType, ProctorEvent, ExamAnswer, ExamFlags, ExamSession, LeaderboardLevel, LeaderboardEntry, Leaderboard, ScoreBreakdown, all API request/response types, BrowserLockdownConfig, AnomalyThresholds, DEFAULT_LOCKDOWN, DEFAULT_ANOMALY_THRESHOLDS

### [LIB] Create question bank
**Target**: `lib/cerebro/questionBank.ts`
**Action**: Create
**Requirements**:
- 50+ questions per category (AI knowledge, reasoning, creative, application)
- Difficulty tiers per age group (junior/middle/senior)
- India-relevant, CBSE AI curriculum-aligned
- **AI Knowledge**: AI concepts, ML basics, data science, NLP, computer vision
- **Reasoning**: Logic puzzles, pattern recognition, algorithmic thinking
- **Creative**: Open-ended scenarios, "design an AI for...", ethical dilemmas
- **Application**: Real-world AI use cases, evaluate AI solutions
- Each question: `{ id, type, category, text, options?, correctOption?, timeLimit, points }`
- `buildExamQuestionSet(config: QuestionConfig, ageGroup: AgeGroup)` → shuffled question array
- Question randomization: different question subsets per student
- Option shuffling: MCQ options reordered per student
- Never send `correctOption` to client

### [LIB] Create scoring engine
**Target**: `lib/cerebro/scoring.ts`
**Action**: Create
**Requirements**:
- `evaluateMcqAnswer(question, answer)` → `{ score, maxScore }`
- `evaluateCreativeAnswer(question, answer)` → `{ score, maxScore }` (via Claude)
  - System prompt: "Evaluate this response from a child. Score 0-{maxPoints}. Be fair and consistent."
- `calculateTotalScore(answers)` → number (0-100 normalized)
- `getScoreBreakdown(answers, questions)` → ScoreBreakdown
- `calculateProvisionalRank(examSessionId, competitionId, round, ageGroup)` → number
- Pure scoring functions, no side effects

### [LIB] Create anti-malpractice engine
**Target**: `lib/cerebro/antiMalpractice.ts`
**Action**: Create
**Requirements**:
- **Layer 1 — Browser lockdown** (client-side utilities):
  - `enterLockdown()` → request fullscreen, register event listeners
  - `exitLockdown()` → clean up
  - `detectTabSwitch()` → fire proctor event on visibilitychange
  - `blockCopyPaste()` → prevent clipboard events
  - `blockDevTools()` → detect F12/Ctrl+Shift+I
- **Layer 2 — AI anomaly detection** (server-side):
  - `detectAnomalies(examSession)` → `FlagLevel`
  - Check: response time patterns (too fast = suspicious)
  - Check: answer similarity with nearby IP sessions
  - Check: typing cadence consistency (copy-paste detection)
  - Check: IP clustering (multiple exams from same IP)
- **Layer 3 — Flag computation**:
  - `computeFlagLevel(proctorEvents, anomalyResults)` → FlagLevel
  - Green: 0 events, all anomaly checks pass
  - Yellow: 1-2 minor proctor events OR borderline anomaly
  - Orange: 3+ proctor events OR strong anomaly signals
  - Red: auto-submit triggered OR multiple strong anomalies
- @see `docs/security.md#talentquest-anti-malpractice` for full spec

### [LIB] Create leaderboard aggregator
**Target**: `lib/cerebro/leaderboard.ts`
**Action**: Create
**Requirements**:
- `aggregateLeaderboard(competitionId, round, ageGroup, level, scope)` → Leaderboard
- Queries `examSessions` collection, groups by geographic level
- Excludes red-flagged sessions from leaderboard
- Yellow/orange flagged results marked with flag indicator
- Returns top N entries + total participant count
- Designed to be called by Cloud Function after exam window closes
- For real-time provisional: `getProvisionalRank(examSessionId)` query

### [API] Create competitions list endpoint
**Target**: `app/api/cerebro/competitions/route.ts`
**Action**: Create
**Requirements**:
- GET handler — list upcoming/active competitions
- Query params: `status` (optional), `ageGroup` (optional)
- Requires authentication (Phase 2+ — `Authorization: Bearer <token>`)
- Query Firestore `competitions` where status != 'completed', ordered by registrationStart desc
- Return competition list with rounds, prize info, participant count

### [API] Create register endpoint
**Target**: `app/api/cerebro/register/route.ts`
**Action**: Create
**Requirements**:
- POST handler — register kid for competition
- Validate: `{ competitionId, kidId, ageGroup }` via zod
- Requires authentication + parent consent check
- Check: registration window open, not already registered, age group valid
- Update competition `participantCount` atomically
- Return registration confirmation + exam window details

### [API] Create start-exam endpoint
**Target**: `app/api/cerebro/start-exam/route.ts`
**Action**: Create
**Requirements**:
- POST handler — start proctored exam
- Validate: `{ competitionId, roundNumber, deviceFingerprint }` via zod
- Check: within exam window, registered, not already attempted this round
- Build randomized question set from question bank (per student)
- Create exam session in Firestore with server-side start time
- Return questions (WITHOUT correctOption), time limit, proctor level
- Rate limit: 1 per exam window per user

### [API] Create submit-answer endpoint
**Target**: `app/api/cerebro/submit-answer/route.ts`
**Action**: Create
**Requirements**:
- POST handler — submit single answer during exam
- Validate: `{ examSessionId, questionId, selectedOption?, text?, timeUsedSeconds, keystrokeTimings? }`
- Verify exam session belongs to auth user and is in progress
- Safety filter text answers
- Store answer in exam session (append to answers array)
- Return questions remaining count

### [API] Create finish-exam endpoint
**Target**: `app/api/cerebro/finish-exam/route.ts`
**Action**: Create
**Requirements**:
- POST handler — complete exam and trigger scoring
- Validate: `{ examSessionId }`
- Verify exam not already completed
- Score all answers (MCQ immediate, creative via Claude evaluator)
- Run anomaly detection → compute flag level
- Calculate provisional rank within competition/round/ageGroup
- Calculate AI Points (base 20 + score-based bonus)
- Save completed session to Firestore
- Return score breakdown, rank, flag level

### [API] Create proctor-event endpoint
**Target**: `app/api/cerebro/proctor-event/route.ts`
**Action**: Create
**Requirements**:
- POST handler — log proctoring event from client
- Validate: `{ examSessionId, type, details, timestamp }`
- Append to exam session's proctorEvents array
- Count tab switches — if exceeds maxAllowed, auto-submit exam
- Return warning message + switch count

### [API] Create leaderboard endpoint
**Target**: `app/api/cerebro/leaderboard/route.ts`
**Action**: Create
**Requirements**:
- GET handler — get leaderboard for competition
- Query params: `competitionId`, `roundNumber`, `ageGroup`, `level`, `scope`, `limit`
- Read from pre-aggregated `leaderboards` collection
- Include requester's own rank if authenticated
- Public read (no auth required for viewing)

### [API] Create my-results endpoint
**Target**: `app/api/cerebro/my-results/route.ts`
**Action**: Create
**Requirements**:
- GET handler — own results across competitions
- Requires authentication
- Query `examSessions` where userId matches, join competition titles
- Return list with score, rank, advancement status, flag level

### [FE] Create CerebroPage
**Target**: `app/(public)/cerebro/page.tsx`
**Action**: Create
**Requirements**:
- Server component page with client component wrapper
- State machine: browsing → registered → pre-exam → exam → submitting → results → leaderboard
- Orchestrates: CompetitionList → ExamLockdown → ExamArena → ExamResults → LeaderboardView
- Uses `useCerebro` hook for state management
- Phase 2+ gating — show auth prompt if not logged in

### [FE] Create CompetitionList component
**Target**: `components/cerebro/CompetitionList.tsx`
**Action**: Create
**Requirements**:
- List of competition cards with title, age groups, dates, registration count
- Filter chips: age group, status
- Registration CTA with countdown timer to registration close
- Prize preview badges per level
- "My Competitions" tab for registered competitions

### [FE] Create ExamLockdown component
**Target**: `components/cerebro/ExamLockdown.tsx`
**Action**: Create
**Requirements**:
- Pre-exam environment check screen
- Checklist: fullscreen, notifications, connection
- Rules reminder (no tab switching, no copy-paste)
- "Start Exam" button triggers lockdown + fullscreen
- Uses `useBrowserLockdown` hook

### [FE] Create ExamArena component
**Target**: `components/cerebro/ExamArena.tsx`
**Action**: Create
**Requirements**:
- Clean, distraction-free exam UI
- Question display with type-specific input (MCQ radio, textarea for creative)
- Prominent countdown timer (turns red at 5 min remaining)
- Question counter (Q12 of 30)
- Previous/Next navigation
- "Secure Mode" indicator
- Progress dots/bar
- Auto-submit when timer expires

### [FE] Create ExamResults component
**Target**: `components/cerebro/ExamResults.tsx`
**Action**: Create
**Requirements**:
- Score display with progress bar
- Category breakdown with per-category bars
- Provisional rank + total participants
- "Qualified for next round!" celebration (if applicable — confetti)
- AI Points earned
- CTA: "View Leaderboard"
- Message about results finalization timeline

### [FE] Create LeaderboardView component
**Target**: `components/cerebro/LeaderboardView.tsx`
**Action**: Create
**Requirements**:
- Filterable leaderboard: National → State → City → District → School
- Ranked list with name, school, score, flag indicator
- Own rank highlighted
- Geographic filter dropdowns
- "Your School" shortcut filter
- Display names only (privacy — no full names)

### [FE] Create useCerebro hook
**Target**: `hooks/useCerebro.ts`
**Action**: Create
**Requirements**:
- State machine: `browsing | registered | pre-exam | exam | submitting | results | leaderboard`
- `loadCompetitions()` → fetches competition list
- `register(competitionId, kidId, ageGroup)` → registers kid
- `startExam(competitionId, roundNumber)` → starts proctored exam
- `submitAnswer(answer)` → submits single answer
- `finishExam()` → completes exam and loads results
- `loadLeaderboard(level, scope)` → fetches leaderboard data
- Error handling with kid-friendly messages
- Holds: competitions, currentExam, examResults, leaderboard state

### [FE] Create useBrowserLockdown hook
**Target**: `hooks/useBrowserLockdown.ts`
**Action**: Create
**Requirements**:
- `enterLockdown(config)` → enables all lockdown features
- `exitLockdown()` → cleans up all event listeners
- Detects: tab switch (visibilitychange), fullscreen exit, copy/paste, DevTools
- Fires proctor event callback on each detected event
- Returns: `{ isLocked, tabSwitchCount, warnings, enterLockdown, exitLockdown }`
- Cleanup on unmount (remove all listeners)

### [FE] Wire into navigation
**Target**: Multiple files
**Action**: Update
**Requirements**:
- Add "Cerebro" to Create+ bottom sheet or dedicated Engage section
- Add competition banner/card on homepage when registration is open
- Route: `/cerebro`
- Phase 2+ — show behind auth gate

### [TEST] Write tests
**Target**: Multiple test files
**Action**: Create
**Requirements**:
- `lib/cerebro/scoring.test.ts` — MCQ scoring, creative scoring, total score, breakdown, rank
- `lib/cerebro/antiMalpractice.test.ts` — Flag computation, anomaly detection rules
- `lib/cerebro/questionBank.test.ts` — Question generation, randomization, option shuffling
- `app/api/cerebro/start-exam/route.test.ts` — Auth check, exam window validation, rate limit
- `app/api/cerebro/submit-answer/route.test.ts` — Answer validation, safety filter
- Test priority: antiMalpractice (100%), scoring (100%), API (80%), questionBank (70%)
