# ENGAGE-007: GrowthMap — Parent Insight Dashboard

## Description
Build a parent insight dashboard that aggregates a child's activity across all platform features — creations, MindX assessments, Cerebro competitions, Beat the AI, AI Points — and generates AI-powered insights to help parents understand their child's strengths, growth areas, interests, and learning trajectory. "See where your child's mind is heading."

**Core mechanic**: Parent logs in → Selects kid profile → Dashboard loads with Activity Pulse, Strength Radar, Koko's Report, Interest Signals, Learning Progress, and optional Peer Comparison.

**Linear ticket**: CLA-38

## Requires KB Updates
- `docs/data-model.md` — Add `growthMapReports` collection + hierarchy entry ✅
- `docs/api-contracts.md` — Add 4 GrowthMap endpoints + rate limit ✅
- `docs/ux-patterns.md` — Add dashboard wireframes + UX notes ✅
- `docs/security.md` — Add parent data access rules + rate limits ✅
- `types/growthMap.types.ts` — All type definitions ✅
- `firestore.rules` — Add `growthMapReports` rule (parent-only read) ✅

## Subtasks

### [TYPE] Create GrowthMap types
**Target**: `types/growthMap.types.ts` ✅ (already created)
**Action**: Created
**Contents**: StrengthDimension (6 axes), StrengthScore, StrengthRadar, DetailedStrengthRadar, STRENGTH_SOURCES, ActivityPulse, InterestSignal, InterestAnalysis, GoalSuggestion, KokoReport, MindXBandSnapshot, CerebroResultSnapshot, LearningProgress, PeerPercentiles, GrowthMapReport (Firestore doc), all API response types

### [LIB] Create insight engine
**Target**: `lib/growth-map/insightEngine.ts`
**Action**: Create
**Requirements**:
- `aggregateDashboard(kidId, period)` → GrowthMapDashboardResponse
- Queries multiple collections: creations, beatTheAiRounds, skillArenaAssessments, examSessions, sessions
- Aggregates by kidId + date range (weekly = last 7 days, monthly = last 30 days)
- Returns activity pulse, strength radar, top interests, learning snapshot
- Efficient: uses pre-computed session fields where available (aiPoints, creationsByType, badges)
- Caches computed dashboard in `growthMapReports` collection

### [LIB] Create strength radar calculator
**Target**: `lib/growth-map/strengthRadar.ts`
**Action**: Create
**Requirements**:
- `calculateStrengthRadar(kidData)` → StrengthRadar (6 scores 0-100)
- **Creativity** (0-100):
  - Creation type diversity: 5+ types used = 30pts, 3 types = 20pts, 1 type = 10pts
  - Beat the AI kidAvgScore: normalized to 0-40pts
  - Cerebro creative challenge scores: normalized to 0-30pts
- **Language** (0-100):
  - MindX Speaking band: band × 20 (max 100)
  - MindX Reading band: band × 20 (max 100)
  - Average of both (weighted: 60% speaking, 40% reading if both exist)
- **Reasoning** (0-100):
  - MindX Thinking band: band × 20
  - Cerebro reasoning scores: normalized to 0-50
  - Weighted average
- **AI Knowledge** (0-100):
  - Concepts learned / grade-level target × 50
  - AI Points / 500 × 30 (caps at 30)
  - MindX + Cerebro AI topic scores: normalized to 0-20
- **Collaboration** (0-100):
  - Share count × 5 (cap at 40)
  - Community votes received × 2 (cap at 30)
  - Creations made public × 3 (cap at 30)
- **Persistence** (0-100):
  - Current streak × 5 (cap at 35)
  - Sessions this week × 5 (cap at 25)
  - Retry rate (assessments retaken) × 10 (cap at 20)
  - Improvement rate: improved in any metric = +20
- `detectTrend(current, previous)` → TrendDirection
  - Improving: current > previous + 5
  - Declining: current < previous - 5
  - Stable: within ±5
  - New: no previous data
- Pure functions, fully testable

### [LIB] Create interest signals detector
**Target**: `lib/growth-map/interestSignals.ts`
**Action**: Create
**Requirements**:
- `detectInterests(creations, timeRange)` → InterestSignal[]
- Analyzes creation themes, genres, topics from recent creations
- Theme clustering: group by keywords in prompts + content (space, animals, music, coding, etc.)
- Strength = frequency × recency weighting
- Returns top 5 signals with evidence strings
- `generateSuggestion(signal)` → actionable suggestion for parents
  - Maps detected interests to real-world recommendations
  - e.g., "Space" → "Consider astronomy clubs or ISRO Young Scientist Programme"
  - e.g., "Music" → "Explore online music lessons or local music classes"
  - Pre-mapped suggestions for 20+ common interest areas
- `getCreationTypeDistribution(creations)` → Record<CreationType, number>

### [LIB] Create report generator
**Target**: `lib/growth-map/reportGenerator.ts`
**Action**: Create
**Requirements**:
- `generateKokoReport(kidName, dashboard, strengths, interests)` → KokoReport
- Uses Claude to generate personalized weekly/monthly report
- System prompt enforces:
  - Warm, encouraging, parent-friendly tone
  - Never negative about the child (growth mindset framing)
  - Never diagnostic or clinical ("may have ADHD", "learning disability")
  - Never comparative with specific other children
  - Focus on: achievements, growth, actionable tips, goal suggestions
  - Disclaimer appended: "AI-generated insight, not a professional assessment"
- Template fallback if Claude fails (pre-written generic report based on metrics)
- `generateGoalSuggestions(dashboard, strengths)` → GoalSuggestion[]
  - Based on current progress, suggest 2-3 achievable goals
  - Each with realistic timeframe and current progress percentage
- @see `lib/ai/` for Claude API patterns

### [LIB] Create peer comparison service
**Target**: `lib/growth-map/peerComparison.ts`
**Action**: Create
**Requirements**:
- `calculatePercentiles(kidId, grade)` → PeerPercentiles
- Queries aggregated percentile data (pre-computed by Cloud Function)
- Returns percentile rank per strength dimension for same-grade cohort
- Only returns data if parent has opted in (check user preferences)
- **Privacy**: Never exposes individual scores, only "top X%" language
- Cloud Function runs weekly: aggregates all kids by grade → computes percentiles → stores in analytics collection

### [API] Create dashboard endpoint
**Target**: `app/api/growth-map/dashboard/route.ts`
**Action**: Create
**Requirements**:
- GET handler, requires authentication
- Query params: `kidId` (required), `period` (weekly|monthly, default weekly)
- Verify parent owns this kidId (check users/{userId}/kids/{kidId} exists)
- Load from cached `growthMapReports` if fresh (< 1 hour), else compute
- Rate limit: 10/hour
- Return: GrowthMapDashboardResponse

### [API] Create report endpoint
**Target**: `app/api/growth-map/report/route.ts`
**Action**: Create
**Requirements**:
- GET handler, requires authentication
- Query params: `kidId` (required), `period` (weekly|monthly)
- Load or generate Koko's Report
- If report exists for this period and is fresh, return cached
- If stale or missing, generate via Claude (rate limited: 3/day)
- Return: KokoReport

### [API] Create strengths endpoint
**Target**: `app/api/growth-map/strengths/route.ts`
**Action**: Create
**Requirements**:
- GET handler, requires authentication
- Query params: `kidId` (required)
- Calculate detailed strength radar with sources + trends
- Optionally include peer percentiles if parent opted in
- Return: GrowthMapStrengthsResponse

### [API] Create interests endpoint
**Target**: `app/api/growth-map/interests/route.ts`
**Action**: Create
**Requirements**:
- GET handler, requires authentication
- Query params: `kidId` (required), `timeRange` (30d|90d|all)
- Detect interest patterns from creation history
- Return: GrowthMapInterestsResponse

### [FE] Create GrowthMapPage
**Target**: `app/(auth)/growth-map/page.tsx`
**Action**: Create
**Requirements**:
- Parent-only authenticated page (redirect to login if not auth'd)
- Kid selector dropdown (if parent has multiple kids)
- Period toggle: Weekly | Monthly
- Renders dashboard panels in scrollable layout
- Uses `useGrowthMap` hook for data loading
- Mobile: panels stack vertically
- Desktop: 2-column grid (Activity + Radar left, Report + Interests right)

### [FE] Create ActivityPulse component
**Target**: `components/growth-map/ActivityPulse.tsx`
**Action**: Create
**Requirements**:
- Session count, creation count, time spent stats in row
- Streak badge with flame icon (🔥 4-day streak)
- Activity heatmap (7 days for weekly, 30 for monthly) — green/gray blocks
- GitHub contribution graph style
- Compact for mobile, expanded for desktop

### [FE] Create StrengthRadar component
**Target**: `components/growth-map/StrengthRadar.tsx`
**Action**: Create
**Requirements**:
- 6-axis spider/radar chart (CSS or lightweight chart lib)
- Each axis labeled with dimension name + score
- ↑ arrow on dimensions that improved from last period
- "Strongest" and "Grow next" callouts below chart
- Tap on dimension → shows detail panel with sources
- Overlay of current vs previous period (if available)

### [FE] Create KokoReport component
**Target**: `components/growth-map/KokoReport.tsx`
**Action**: Create
**Requirements**:
- Koko mascot avatar with speech bubble for summary
- Highlights section with checkmark icons
- Parent tips section with lightbulb icons
- Goal progress bars with timeframe labels
- Warm, card-based layout with soft colors
- AI disclaimer footer: "AI-generated insight"
- "Generate new report" button (if stale, rate limited)

### [FE] Create InterestSignals component
**Target**: `components/growth-map/InterestSignals.tsx`
**Action**: Create
**Requirements**:
- Interest cards sorted by strength (progress bar)
- Evidence text + actionable suggestion per signal
- Creation type distribution as horizontal bar chart
- Favorite creation type highlighted
- Expand/collapse for detailed evidence

### [FE] Create LearningProgress component
**Target**: `components/growth-map/LearningProgress.tsx`
**Action**: Create
**Requirements**:
- CBSE concepts progress bar (X/Y concepts learned)
- MindX band display (4 modules with band badges, "Not Started" for untried)
- Cerebro results timeline (if any competitions completed)
- Grade-level benchmark indicator ("On track for Class 7")

### [FE] Create PeerComparison component
**Target**: `components/growth-map/PeerComparison.tsx`
**Action**: Create
**Requirements**:
- Opt-in toggle (default OFF) with clear explanation
- Percentile bars per dimension ("Top 30% in Creativity among Class 7")
- Anonymous — never shows other kids' names or scores
- Privacy disclaimer: "Compared with anonymized, aggregated data from same-grade students"
- Disabled/hidden state when opted out

### [FE] Create useGrowthMap hook
**Target**: `hooks/useGrowthMap.ts`
**Action**: Create
**Requirements**:
- `loadDashboard(kidId, period)` → fetches dashboard data
- `loadReport(kidId, period)` → fetches/generates Koko's Report
- `loadStrengths(kidId)` → fetches detailed strength radar
- `loadInterests(kidId, timeRange)` → fetches interest analysis
- Caching: stores last loaded dashboard in state, refreshes on period change
- Loading states per panel (panels can load independently)
- Error handling with friendly messages

### [FE] Wire into navigation
**Target**: Multiple files
**Action**: Update
**Requirements**:
- Add "GrowthMap" to parent dashboard navigation
- Route: `/growth-map`
- Only visible to authenticated parent accounts
- Add subtle CTA on kid profile: "📊 View GrowthMap"

### [CLOUD] Create weekly report generator
**Target**: Cloud Function (scheduled)
**Action**: Create
**Requirements**:
- Runs every Sunday at 6 AM IST
- For each kid with activity in the past week:
  - Compute strength radar
  - Detect interest signals
  - Generate Koko's Report via Claude
  - Save to `growthMapReports` collection
- Batch processing to stay within Claude rate limits
- Error handling: skip kid on failure, retry in next run

### [TEST] Write tests
**Target**: Multiple test files
**Action**: Create
**Requirements**:
- `lib/growth-map/strengthRadar.test.ts` — All 6 dimension calculations, trend detection, edge cases (no data, partial data)
- `lib/growth-map/interestSignals.test.ts` — Interest detection from varied creation patterns, suggestion mapping
- `lib/growth-map/reportGenerator.test.ts` — Report safety (no negative language, no diagnosis, disclaimer present)
- `app/api/growth-map/dashboard/route.test.ts` — Auth check, kidId ownership verification, caching
- Test priority: strengthRadar (100%), reportGenerator safety (100%), API auth (80%), interestSignals (70%)
