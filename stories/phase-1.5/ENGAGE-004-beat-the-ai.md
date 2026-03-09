# ENGAGE-004: Beat the AI — Human vs AI Creative Challenges

## Description
Build a competitive "Beat the AI" mode where kids go head-to-head against AI on the same creative prompt — without AI assistance. The kid writes their own version using pure human creativity, then AI generates its version, and both are revealed side-by-side for comparison. Kids rate both on 4 criteria and develop 6 creative skills that level up through XP. Teaches AI capabilities vs limitations (CBSE AI curriculum alignment).

**Core mechanic**: Same prompt → kid writes raw text (timed) → AI generates its version → side-by-side reveal → rate both → skill XP + AI Points.

**Linear ticket**: CLA-35

## Requires KB Updates
- `docs/data-model.md` — Add `beatTheAiRounds` collection + session skill fields ✅
- `docs/api-contracts.md` — Add Beat the AI endpoints (start, submit, history, stats, skills) ✅
- `docs/ux-patterns.md` — Add 5-step UX flow + skill radar chart ✅
- `docs/security.md` — Add kid input safety filter, rate limits, Firestore rules ✅
- `types/beatTheAi.types.ts` — All type definitions including skills ✅
- `firestore.rules` — Add `beatTheAiRounds` collection rule ✅

## Subtasks

### [TYPE] Create Beat the AI types
**Target**: `types/beatTheAi.types.ts` ✅ (already created)
**Action**: Created
**Contents**: BeatTheAiCategory, BeatTheAiResult, BeatTheAiDifficulty, BeatTheAiSkillId (6 skills), BeatTheAiPrompt, BeatTheAiScores, BeatTheAiRound, SkillLevel, BeatTheAiSkills, SKILL_LEVELS, CATEGORY_PRIMARY_SKILL, SCORE_SKILL_MAP, all API request/response types

### [LIB] Create prompt bank
**Target**: `lib/beat-the-ai/prompts.ts`
**Action**: Create
**Requirements**:
- 20+ prompts per category (80+ total), India-culturally-relevant, age-appropriate
- Each prompt: `{ text, theme, category, isIndiaThemed }` matching `BeatTheAiPrompt`
- Story Sprint: scenario premises ("Write a 3-sentence story about...")
- Quiz Whiz: topic names ("Create 3 quiz questions about...")
- Caption Battle: funny scenarios ("Write a witty caption for...")
- Rhyme Time: theme words ("Write a 4-line poem about...")
- India themes: auto-rickshaws, cricket, samosas, monsoon, Diwali, school tiffin, etc.
- `getRandomPrompt(category)` function that avoids recent repeats (track in localStorage)

### [LIB] Create AI opponent service
**Target**: `lib/beat-the-ai/aiOpponent.ts`
**Action**: Create
**Requirements**:
- `generateAiResponse(prompt, category, difficulty)` → string
- 3 Claude system prompts per difficulty tier:
  - **easy**: Basic, slightly formulaic — uses simple vocabulary, predictable structure
  - **medium**: Good quality with some creativity — better vocabulary, surprising elements
  - **hard**: Best quality — vivid language, humor, cultural references, emotional depth
- Category-specific format instructions:
  - story_sprint: 3-5 sentences, narrative with beginning/middle/end
  - quiz_whiz: 3 questions with 4 options + correct answer + explanation
  - caption_battle: 1-2 witty sentences
  - rhyme_time: 4-line rhyming poem
- Safety: standard output safety pipeline on AI response
- @see `lib/ai/` for Claude API patterns

### [LIB] Create skill XP engine
**Target**: `lib/beat-the-ai/skillEngine.ts`
**Action**: Create
**Requirements**:
- `calculateSkillXp(round)` → `Partial<Record<BeatTheAiSkillId, number>>`
- XP rules:
  - +5 XP to primary skill for category (CATEGORY_PRIMARY_SKILL mapping)
  - +3 bonus if kid wins (kidAvgScore > aiAvgScore)
  - +2 for each score criteria ≥ 4 (SCORE_SKILL_MAP mapping)
  - +3 Speed Thinking if timeUsedSeconds < timeLimit * 0.5
  - +2 Cultural Connect if prompt.isIndiaThemed
  - +5 Creativity bonus on 3-round win streak
- `getSkillLevel(xp)` → SkillLevel using SKILL_LEVELS thresholds
- `getAiDifficulty(skills)` → BeatTheAiDifficulty
  - All skills level 1-2 → easy
  - Any skill level 3 → medium
  - Any skill level 4-5 → hard
- `detectLevelUp(oldSkills, newSkills)` → array of skill IDs that leveled up (for celebration)
- Pure functions, no side effects — tested independently

### [API] Create start endpoint
**Target**: `app/api/beat-the-ai/start/route.ts`
**Action**: Create
**Requirements**:
- POST handler following `fn-generator.md` template
- Validate: `{ category: BeatTheAiCategory }` via zod
- Rate limit: 5 rounds/day per session (reuse `checkRateLimit` pattern)
- Load session's `beatTheAiSkills` → determine `aiDifficulty`
- Get random prompt from prompt bank for category
- Create pending round in Firestore (id, category, prompt, sessionId, createdAt)
- Return: `{ roundId, prompt, aiDifficulty }`
- @see `app/api/ai/story/route.ts` for pattern

### [API] Create submit endpoint
**Target**: `app/api/beat-the-ai/submit/route.ts`
**Action**: Create
**Requirements**:
- POST handler following `fn-generator.md` template
- Validate: BeatTheAiSubmitRequest via zod (roundId, kidResponse 10-2000 chars, scores 1-5 integers)
- Load pending round from Firestore, verify sessionId matches, verify not already submitted
- Safety filter kid's response (same filter as AI prompt input)
- Generate AI response via `aiOpponent.generateAiResponse(prompt, category, difficulty)`
- Safety filter AI output
- Calculate scores: kidAvgScore, aiAvgScore, result
- Calculate skill XP via `skillEngine.calculateSkillXp(round)`
- Update session: increment `beatTheAiSkills` XP + recalculate levels, update `beatTheAiStats`
- Award AI Points: 15 base + 10 if kid wins (via `updateSessionPoints`)
- Save completed round to Firestore
- Detect skill level-ups for client celebration
- Return: BeatTheAiSubmitResponse + skillXpEarned
- @see `app/api/sessions/points/route.ts` for points pattern

### [API] Create history endpoint
**Target**: `app/api/beat-the-ai/history/route.ts`
**Action**: Create
**Requirements**:
- GET handler, query params: limit (default 10, max 50), cursor
- Query `beatTheAiRounds` where sessionId matches, ordered by createdAt desc
- Return condensed round list (id, category, prompt.text, result, scores, points, completedAt)
- Pagination via Firestore cursor

### [API] Create stats endpoint
**Target**: `app/api/beat-the-ai/stats/route.ts`
**Action**: Create
**Requirements**:
- GET handler, load from session's `beatTheAiStats` field
- Return: BeatTheAiStats (totalRounds, wins, losses, ties, winRate, streaks, byCategory)

### [API] Create skills endpoint
**Target**: `app/api/beat-the-ai/skills/route.ts`
**Action**: Create
**Requirements**:
- GET handler, load from session's `beatTheAiSkills` field
- Return: BeatTheAiSkillsResponse (all 6 skills with xp/level/title/nextLevelXp, overallLevel, totalXp)
- If no skills yet, return defaults (all level 1, 0 XP)

### [FE] Create BeatTheAiPage
**Target**: `app/(public)/beat-the-ai/page.tsx`
**Action**: Create
**Requirements**:
- Server component page with client component wrapper
- State machine flow: idle → picking → challenging → submitting → revealing → scoring → results
- Orchestrates: CategoryPicker → ChallengeArena → SideBySideReveal → ResultsScreen
- Uses `useBeatTheAi` hook for all state management
- Koko mascot appears at each step with contextual expression
- Mobile-first responsive layout

### [FE] Create CategoryPicker component
**Target**: `components/beat-the-ai/CategoryPicker.tsx`
**Action**: Create
**Requirements**:
- 2x2 grid of category cards
- Each card: icon, name, description, time limit, primary skill badge
- Tap to select → triggers `/start` API call
- Disabled state during loading
- "Your Skills" button linking to StatsBoard/radar chart
- @see `components/studios/` for card patterns

### [FE] Create ChallengeArena component
**Target**: `components/beat-the-ai/ChallengeArena.tsx`
**Action**: Create
**Requirements**:
- Prompt display with theme context
- Countdown timer (pulsing animation when <30s remain, red when <10s)
- Large textarea for kid's response with character count (min/max per category)
- AI difficulty badge (easy/medium/hard)
- Submit button (disabled until min chars met)
- Auto-submit when timer hits 0
- Koko mascot with "thinking" expression during writing

### [FE] Create SideBySideReveal component
**Target**: `components/beat-the-ai/SideBySideReveal.tsx`
**Action**: Create
**Requirements**:
- Animated reveal: kid's version slides in from left (purple border), AI slides in from right (cyan border)
- Staggered animation (kid first, then AI after 1s)
- 4 rating rows below: Creativity, Fun Factor, Accuracy, Heart
- Each row: kid rating (1-5 stars, tappable) + AI rating (1-5 stars, tappable)
- Stars are 48px touch targets
- "See Results" button enabled only when all 8 ratings filled
- Mobile: stack vertically (kid on top, AI below)

### [FE] Create ResultsScreen component
**Target**: `components/beat-the-ai/ResultsScreen.tsx`
**Action**: Create
**Requirements**:
- Winner announcement with Koko (celebrating if kid wins, encouraging if AI wins, neutral if tie)
- Score comparison: "Your avg: 4.25 vs AI avg: 3.25"
- AI X-Ray section explaining AI strengths/weaknesses
- Skill XP breakdown: "+5 Storytelling, +2 Creativity, +3 Speed Thinking" with mini progress bars
- AI Points earned display
- If skill level-up detected → trigger CelebrationModal
- CTAs: "Play Again" (prominent) + "View My Stats"
- Confetti animation on kid win

### [FE] Create SkillRadarChart component
**Target**: `components/beat-the-ai/SkillRadarChart.tsx`
**Action**: Create
**Requirements**:
- 6-axis spider/radar chart showing all skill levels
- SVG-based (no heavy chart library — keep bundle small)
- Axes: Creativity, Storytelling, Wordplay, Knowledge, Speed Thinking, Cultural Connect
- Filled area with purple gradient
- Skill icons at each axis endpoint
- Animated fill on mount
- Shows "Play 3+ rounds to see your skill chart" if insufficient data

### [FE] Create SkillProgressCard component
**Target**: `components/beat-the-ai/SkillProgressCard.tsx`
**Action**: Create
**Requirements**:
- Individual skill card: icon, name, level badge, XP progress bar
- Progress bar shows XP towards next level (e.g., "87/150 XP")
- Level badge: seed(1), sprout(2), tree(3), star(4), crown(5)
- Compact enough to show 6 in a grid on mobile (2 columns)
- Animates XP gain when new XP earned

### [FE] Create StatsBoard component
**Target**: `components/beat-the-ai/StatsBoard.tsx`
**Action**: Create
**Requirements**:
- Win/loss/tie record with visual bar chart
- Current streak + longest streak
- SkillRadarChart (if 3+ rounds played)
- 6 SkillProgressCards in grid
- Favorite category highlight
- Total AI Points earned from Beat the AI
- "Challenge Again" CTA

### [FE] Create useBeatTheAi hook
**Target**: `hooks/useBeatTheAi.ts`
**Action**: Create
**Requirements**:
- State machine: `idle | picking | loading | challenging | submitting | revealing | scoring | results`
- `startRound(category)` → calls `/start`, transitions to challenging
- `submitResponse(kidResponse)` → calls `/submit`, transitions to revealing
- `rateAndFinish(kidScores, aiScores)` → calculates result, transitions to results
- `playAgain()` → resets to picking
- Holds: currentRound, prompt, aiResponse, scores, result, skillXpEarned
- Error handling with kid-friendly messages

### [FE] Create useSkills hook
**Target**: `hooks/useSkills.ts`
**Action**: Create
**Requirements**:
- Loads skill levels from `/api/beat-the-ai/skills` on mount
- Caches in localStorage (optimistic)
- `refreshSkills()` to reload after a round
- `detectLevelUp(oldSkills, newSkills)` for celebration trigger
- Returns: skills, overallLevel, totalXp, isLoading

### [FE] Wire into navigation
**Target**: Multiple files
**Action**: Update
**Requirements**:
- Add "Beat the AI" to Create+ bottom sheet (BottomNav)
- Add card on homepage for Beat the AI (with skill radar preview if data exists)
- Route: `/beat-the-ai`
- @see existing navigation patterns from CLA-11

### [TEST] Write tests
**Target**: Multiple test files
**Action**: Create
**Requirements**:
- `lib/beat-the-ai/skillEngine.test.ts` — XP calculation (all rules), level thresholds, difficulty selection, level-up detection
- `lib/beat-the-ai/prompts.test.ts` — All prompts have required fields, no duplicates, isIndiaThemed accuracy
- `app/api/beat-the-ai/submit/route.test.ts` — Safety filter, score validation, round completion flow
- Test priority: skillEngine (100%), prompts (100%), API (80%)
