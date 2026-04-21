# GSI AI Studio — Data Model

## Overview

Database: Firebase Firestore (NoSQL document database)
ORM: Firebase Admin SDK / Firebase Client SDK (no traditional ORM — Firestore is schemaless)

**Design Principles**:
- Denormalize for read performance (Firestore charges per read)
- Structure for the queries you need (no JOINs in Firestore)
- Use sub-collections for parent-child relationships
- Keep documents under 1MB (Firestore limit)

## Collection Hierarchy

```
firestore/
├── creations/              # All user creations (Phase 1: anonymous, Phase 2: linked to users)
│   └── {creationId}/
│       ├── [creation document]
│       └── comments/       # Phase 2: community comments
│           └── {commentId}
├── users/                  # Phase 2: parent accounts
│   └── {userId}/
│       ├── [user document]
│       └── kids/           # Kid profiles under parent
│           └── {kidId}
├── sessions/               # Phase 1: anonymous sessions for rate limiting
│   └── {sessionId}
├── beatTheAiRounds/        # Human vs AI creative challenge rounds
│   └── {roundId}
├── skillArenaAssessments/  # MindX skill assessments + mentor feedback
│   └── {assessmentId}
├── competitions/           # Phase 2: Cerebro competitive exam competitions
│   └── {competitionId}
├── examSessions/           # Phase 2: Cerebro exam attempts + proctoring data
│   └── {examSessionId}
├── leaderboards/           # Phase 2: Cerebro leaderboard data per competition
│   └── {leaderboardId}
├── growthMapReports/       # Phase 2: GrowthMap parent insight reports
│   └── {reportId}
├── challenges/             # Phase 2: weekly creation challenges
│   └── {challengeId}
├── ceoBusiness/            # Kid CEO: registered businesses
│   └── {businessId}
├── ceoEvents/              # Kid CEO: LLM-generated business events
│   └── {eventId}
├── ceoProfiles/            # Kid CEO: 6-dimension DNA Card profiles
│   └── {profileId}
├── botSessions/            # Telegram chat <-> GSI session binding
│   └── {chatId}
├── botLinkCodes/           # Short-lived bot auth-binding tokens
│   └── {token}
├── homeworkSessions/       # Phase 2: forwarded homework interactive sessions
│   └── {id}
├── curriculum/             # CBSE AI & CT curriculum mapping
│   └── {topicId}
├── schools/                # Phase 3: school accounts
│   └── {schoolId}/
│       ├── [school document]
│       ├── classes/
│       │   └── {classId}
│       └── assignments/
│           └── {assignmentId}
└── analytics/              # Aggregated analytics (Cloud Function maintained)
    └── {period}
```

## Collections

### creations

Core collection storing all AI-generated creations.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Document ID (auto-generated) |
| type | string | yes | `story` \| `music` \| `quiz` \| `game` \| `comic` |
| title | string | yes | User-provided or AI-generated title |
| status | string | yes | `draft` \| `published` \| `archived` |
| prompt | string | yes | Original user input/premise |
| content | map | yes | Type-specific content (see below) |
| media | array\<map\> | no | Generated media files `[{url, type, alt}]` |
| thumbnail | string | no | Thumbnail URL for share cards |
| aiMetadata | map | yes | AI X-Ray data: model used, tokens, generation params |
| sessionId | string | yes (P1) | Anonymous session ID (Phase 1) |
| userId | string | no (P2) | Parent user ID (Phase 2+) |
| kidId | string | no (P2) | Kid profile ID (Phase 2+) |
| schoolId | string | no (P3) | School ID (Phase 3) |
| shareUrl | string | no | Public shareable URL slug |
| viewCount | number | yes | Number of views (default 0) |
| shareCount | number | yes | Number of shares (default 0) |
| likeCount | number | yes | Phase 2: community likes (default 0) |
| aiConceptsTaught | array\<string\> | yes | AI concepts covered `["prompt_engineering", "nlg"]` |
| curriculumTags | array\<string\> | no | CBSE curriculum mapping tags |
| downloadCount | number | yes | Number of downloads (default 0) |
| templateId | string | no | ID of the template used for creation (if any) |
| remixedFromId | string | no | ID of original creation this was remixed from |
| remixCount | number | no | Denormalized count of remixes (default 0) |
| isPublic | boolean | yes | Whether creation is publicly viewable |
| createdAt | timestamp | yes | Creation timestamp |
| updatedAt | timestamp | yes | Last modification timestamp |

**Content field by type**:

Story:
```json
{
  "pages": [
    { "text": "...", "imageUrl": "...", "pageNumber": 1 },
    { "text": "...", "imageUrl": "...", "pageNumber": 2 }
  ],
  "genre": "adventure",
  "characters": ["Luna", "Rex"],
  "setting": "magical forest"
}
```

Comic:
```json
{
  "title": "The Time Machine Mystery",
  "style": "manga",
  "panels": [
    {
      "panelNumber": 1,
      "imageUrl": "data:image/png;base64,...",
      "dialogue": [
        { "character": "Priya", "text": "Arjun, look what I found!", "position": "left" },
        { "character": "Arjun", "text": "No way — is that a portal?!", "position": "right" }
      ],
      "caption": "After school one Tuesday...",
      "imagePrompt": "manga style: two kids in school uniforms discovering a glowing portal in a basement"
    }
  ],
  "characters": [
    { "name": "Priya", "description": "tall girl with red hair and blue jacket" },
    { "name": "Arjun", "description": "stocky boy with glasses and green hoodie" }
  ],
  "setting": "Indian school basement",
  "synopsis": "Two friends discover a time machine in their school",
  "totalPanels": 4
}
```

Music:
```json
{
  "audioUrl": "...",
  "duration": 120,
  "genre": "pop",
  "mood": "happy",
  "lyrics": "...",
  "instruments": ["piano", "drums"],
  "bpm": 120
}
```

Quiz:
```json
{
  "questions": [
    { "question": "...", "options": ["a", "b", "c", "d"], "answer": "b", "explanation": "..." }
  ],
  "topic": "space",
  "difficulty": "intermediate",
  "format": "trivia",
  "totalQuestions": 10
}
```

Game:
```json
{
  "scenes": [
    {
      "id": "scene_1",
      "title": "The Beginning",
      "text": "You stand at the entrance of a mysterious cave...",
      "choices": [
        { "text": "Enter the cave", "nextSceneId": "scene_2" },
        { "text": "Explore outside", "nextSceneId": "scene_3" }
      ],
      "isEnding": false
    }
  ],
  "startSceneId": "scene_1",
  "totalScenes": 8,
  "totalEndings": 3,
  "setting": "mystery_island",
  "characterName": "You"
}
```

**Indexes**:
- `type` + `createdAt` (desc) — browse by type
- `sessionId` + `createdAt` (desc) — user's creations in Phase 1
- `userId` + `createdAt` (desc) — user's creations in Phase 2
- `isPublic` + `likeCount` (desc) — popular public creations
- `schoolId` + `createdAt` (desc) — school creations in Phase 3
- `shareUrl` — lookup by share slug (unique)

---

### sessions

Anonymous session tracking for Phase 1 rate limiting, AI Points, and badges.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Session ID (stored in localStorage) |
| fingerprint | string | no | Browser fingerprint hash (abuse prevention) |
| creationCount | number | yes | Number of creations this session (default 0) |
| lastCreationAt | timestamp | no | Timestamp of last creation |
| ipHash | string | no | Hashed IP for rate limiting (not raw IP) |
| createdAt | timestamp | yes | Session start |
| expiresAt | timestamp | yes | Session expiry (24 hours) |
| aiPoints | number | no | AI Knowledge Points earned (default 0). Added Phase 1.5. |
| badges | array\<string\> | no | Earned badge IDs (default []). See Badge Catalog below. |
| conceptsLearned | array\<string\> | no | AI concepts discovered, e.g. `["natural_language_generation", "text_to_image"]` |
| creationsByType | map | no | Denormalized creation counts per type `{story: 3, music: 1, quiz: 2}` |
| shareCount | number | no | Total shares across all creations (default 0) |
| homeworkStats | map | no | Homework rewards counters — `{sessionsCompleted, currentStreak, longestStreak, lastCompletedDate}`. Added for Homework Hero badge family. `lastCompletedDate` is an ISO `YYYY-MM-DD` string in the kid's local day (UTC fallback); streak increments when `lastCompletedDate` is yesterday, resets when it's older than that, no-ops when same day. |

**Rate Limits (Phase 1)**:
- 5 creations per session per day
- 1 creation per 2 minutes (cooldown)

**Badge Catalog (12 badges)**:

| ID | Name | Criteria |
|----|------|----------|
| `first_spark` | First Spark | 1 total creation |
| `story_wizard` | Story Wizard | 3 stories |
| `music_maestro` | Music Maestro | 3 songs |
| `quiz_champion` | Quiz Champion | 3 quizzes |
| `creative_machine` | Creative Machine | 5 total creations |
| `triple_threat` | Triple Threat | 1 story + 1 song + 1 quiz |
| `ai_explorer` | AI Explorer | 5 concepts learned |
| `sharing_star` | Sharing Star | 1 share |
| `knowledge_seeker` | Knowledge Seeker | 10 concepts learned |
| `maker_milestone` | Maker Milestone | 10 total creations |
| `point_collector` | Point Collector | 100 AI Points |
| `super_creator` | Super Creator | 15 total creations |

Badge unlock detection runs server-side via `checkBadgeUnlocks()` in Firestore transactions.
See `lib/badges.ts` for the full catalog and unlock logic.

---

### users (Phase 2+)

Parent user accounts.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Firebase Auth UID |
| phone | string | yes | Phone number (from Firebase Auth) |
| name | string | yes | Parent display name |
| email | string | no | Optional email |
| role | string | yes | `parent` \| `teacher` \| `admin` |
| plan | string | yes | `free` \| `creator` \| `family` |
| planExpiresAt | timestamp | no | Subscription expiry |
| schoolId | string | no | Linked school (Phase 3) |
| preferences | map | no | `{language, notifications, theme}` |
| createdAt | timestamp | yes | Account creation |
| updatedAt | timestamp | yes | Last update |

---

### users/{userId}/kids (Phase 2+)

Kid profiles under a parent account.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Kid profile ID |
| name | string | yes | Kid's display name |
| age | number | yes | Current age |
| grade | string | yes | Class/grade (e.g., "5", "9") |
| board | string | no | `cbse` \| `icse` \| `state` |
| avatar | string | no | Selected avatar identifier |
| totalCreations | number | yes | Lifetime creation count (default 0) |
| aiPoints | number | yes | AI Knowledge Points earned (default 0) |
| streak | map | no | `{current: 3, longest: 7, lastActiveDate: "..."}` |
| learningProgress | map | no | `{beginner: 0.4, intermediate: 0.0}` completion ratios |
| badges | array\<string\> | no | Earned badge IDs |
| createdAt | timestamp | yes | Profile creation |

---

### curriculum

CBSE AI & CT curriculum mapping.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Topic ID |
| title | string | yes | Topic title (e.g., "What is Artificial Intelligence?") |
| description | string | yes | Brief description |
| gradeRange | map | yes | `{min: 3, max: 5}` — applicable class range |
| category | string | yes | `ai_basics` \| `ml_concepts` \| `ethics` \| `applications` \| `ct_skills` |
| studioMapping | array\<string\> | yes | Which studios teach this `["story", "quiz"]` |
| xrayPrompt | string | yes | AI X-Ray explanation template for this concept |
| order | number | yes | Display order within category |
| cbseReference | string | no | CBSE curriculum document reference |

---

### beatTheAiRounds

Human vs AI creative challenge rounds. Kids write their own response to a prompt, then AI generates its version. Both are compared side-by-side.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Round ID |
| category | string | yes | `story_sprint` \| `quiz_whiz` \| `caption_battle` \| `rhyme_time` |
| prompt | map | yes | `{text, theme, timeLimit, category, isIndiaThemed}` — the challenge prompt |
| kidResponse | string | yes | Kid's raw text response (no AI assistance) |
| aiResponse | string | yes | AI-generated response to same prompt |
| kidScores | map | yes | `{creativity, funFactor, accuracy, heart}` — kid's self-rating (1-5 each) |
| aiScores | map | yes | `{creativity, funFactor, accuracy, heart}` — kid's rating of AI (1-5 each) |
| kidAvgScore | number | yes | Calculated average of kidScores |
| aiAvgScore | number | yes | Calculated average of aiScores |
| result | string | yes | `kid_wins` \| `ai_wins` \| `tie` |
| timeUsedSeconds | number | yes | Seconds the kid took to respond |
| aiDifficulty | string | yes | `easy` \| `medium` \| `hard` — based on kid's skill level |
| skillXpEarned | map | yes | `{creativity: 5, storytelling: 8, ...}` — XP earned this round |
| aiPointsEarned | number | yes | Points earned (15 base + 10 bonus if kid wins) |
| aiXray | map | yes | `{concept, explanation, curriculumTag}` |
| sessionId | string | yes (P1) | Anonymous session ID |
| userId | string | no (P2) | User ID (Phase 2+) |
| completedAt | timestamp | yes | When round was completed |
| createdAt | timestamp | yes | When round started |

**Kid Skills (6 skills, leveled by XP)**:

| Skill | Primary Category | Also Leveled By |
|-------|-----------------|-----------------|
| creativity | All categories | `creativity` score ≥ 4 |
| storytelling | story_sprint | `funFactor` score ≥ 4 |
| wordplay | caption_battle, rhyme_time | — |
| knowledge | quiz_whiz | `accuracy` score ≥ 4 |
| speedThinking | All (if >50% time left) | — |
| culturalConnect | India-themed prompts | `heart` score ≥ 4 |

**Skill Levels**: Beginner (0-50 XP), Apprentice (51-150), Creator (151-300), Master (301-500), Legend (501+)

**Session fields (extended)**: `beatTheAiSkills` map `{creativity: {xp, level}, ...}` + `beatTheAiStats` map `{totalRounds, wins, losses, ties, currentStreak, longestStreak}`

**Indexes**:
- `sessionId` + `createdAt` (desc) — user's rounds in Phase 1
- `category` + `result` — stats aggregation by category
- `sessionId` + `result` — win/loss/tie stats per session

---

### skillArenaAssessments

MindX skill assessments. Kids complete 5 challenges per module (Speaking, Listening, Thinking, Reading), AI evaluates responses and Koko provides mentor feedback.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Assessment ID |
| module | string | yes | `speaking` \| `listening` \| `thinking` \| `reading` |
| difficulty | string | yes | `easy` \| `medium` \| `hard` |
| challenges | array\<map\> | yes | 5 challenges with questions + kid's answers (see below) |
| score | number | yes | Overall score 0-100 |
| band | number | yes | Band level 1-5 |
| bandTitle | string | yes | `Starter` \| `Explorer` \| `Achiever` \| `Expert` \| `Champion` |
| mentorFeedback | map | yes | `{strengths[], growthAreas[], tips[], recommendedPractice, encouragement}` |
| aiXray | map | yes | `{concept, explanation, curriculumTag}` |
| timeUsedSeconds | number | yes | Total time taken |
| aiPointsEarned | number | yes | Points earned (20 base + bonuses) |
| previousBand | number | no | Previous band for this module (for improvement tracking) |
| sessionId | string | yes (P1) | Anonymous session ID |
| userId | string | no (P2) | User ID (Phase 2+) |
| completedAt | timestamp | yes | When assessment was completed |
| createdAt | timestamp | yes | When assessment started |

**Challenge structure** (inside `challenges` array):
```json
{
  "type": "read_aloud | describe | respond | comprehension | follow_instructions | key_points | logic | what_if | odd_one_out | analogy | inference | vocabulary | summarize",
  "question": { "text": "...", "audioText": "...", "options": ["a","b","c","d"], "passage": "..." },
  "kidAnswer": { "text": "...", "selectedOption": "b", "voiceTranscript": "..." },
  "score": 18,
  "maxScore": 20,
  "feedback": "Great fluency! Try slowing down on longer words."
}
```

**5-Band Scoring**:

| Band | Title | Score Range | Badge |
|------|-------|-------------|-------|
| 1 | Starter | 0-20 | seed |
| 2 | Explorer | 21-40 | compass |
| 3 | Achiever | 41-60 | star |
| 4 | Expert | 61-80 | medal |
| 5 | Champion | 81-100 | crown |

**Session fields (extended)**: `skillArenaProgress` map `{speaking: {band, score, assessments}, listening: {...}, thinking: {...}, reading: {...}}` + `skillArenaStats` map `{totalAssessments, averageBand, moduleBreakdown}`

**Indexes**:
- `sessionId` + `createdAt` (desc) — user's assessments in Phase 1
- `module` + `band` — stats aggregation by module
- `sessionId` + `module` + `createdAt` (desc) — module history per session

---

### competitions (Phase 2+)

Cerebro competition definitions. Admin-created, scheduled exam competitions with multi-round elimination.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Competition ID |
| title | string | yes | Competition name (e.g., "AI Olympiad 2026 — Season 1") |
| description | string | yes | Competition details |
| status | string | yes | `upcoming` \| `registration` \| `prelims` \| `semifinals` \| `finals` \| `completed` |
| ageGroups | array\<string\> | yes | `['junior', 'middle', 'senior']` |
| rounds | array\<map\> | yes | Round definitions (see below) |
| questionConfig | map | yes | `{totalQuestions, mcqPercent, creativePercent, reasoningPercent, applicationPercent, timeLimitMinutes}` |
| prizesByLevel | map | yes | `{school: [...], district: [...], city: [...], state: [...], national: [...]}` |
| registrationStart | timestamp | yes | Registration opens |
| registrationEnd | timestamp | yes | Registration closes |
| participantCount | number | yes | Total registered (default 0) |
| createdBy | string | yes | Admin user ID |
| createdAt | timestamp | yes | Creation timestamp |

**Round structure** (inside `rounds` array):
```json
{
  "round": 1,
  "name": "Prelims",
  "examWindow": { "start": "2026-04-15T10:00:00Z", "end": "2026-04-15T11:00:00Z" },
  "advancePercent": 50,
  "proctorLevel": "browser_lockdown",
  "status": "upcoming"
}
```

**Indexes**:
- `status` + `registrationStart` (desc) — active/upcoming competitions
- `ageGroups` + `status` — competitions by age group

---

### examSessions (Phase 2+)

Individual exam attempts with answers, scores, proctoring data, and anti-malpractice flags.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Exam session ID |
| competitionId | string | yes | Competition reference |
| roundNumber | number | yes | Which round (1=prelims, 2=semis, 3=finals) |
| userId | string | yes | Authenticated user ID |
| kidId | string | yes | Kid profile ID |
| ageGroup | string | yes | `junior` \| `middle` \| `senior` |
| questions | array\<map\> | yes | Questions served (randomized, with shuffled options) |
| answers | array\<map\> | yes | Answers submitted per question |
| score | number | yes | Total score (0-100) |
| rank | number | no | Rank within same competition + round + ageGroup |
| timeUsedSeconds | number | yes | Total time taken |
| proctorEvents | array\<map\> | yes | Proctoring events log (see below) |
| flags | map | yes | `{level: 'green'|'yellow'|'orange'|'red', details: [...], reviewStatus: 'pending'|'approved'|'suspended'}` |
| deviceFingerprint | string | yes | Browser/device fingerprint hash |
| ipHash | string | yes | Hashed IP address |
| typingCadence | array\<map\> | no | Keystroke timing data for text answers |
| schoolId | string | yes | Kid's school ID (for leaderboard grouping) |
| district | string | yes | School's district |
| city | string | yes | School's city |
| state | string | yes | School's state |
| startedAt | timestamp | yes | Exam start time |
| completedAt | timestamp | no | Exam completion time |
| createdAt | timestamp | yes | Session creation time |

**Proctor event structure**:
```json
{
  "type": "tab_switch | fullscreen_exit | copy_attempt | devtools_open | resize | webcam_violation",
  "timestamp": "2026-04-15T10:15:23Z",
  "details": "Tab switched to chrome://newtab"
}
```

**Answer structure**:
```json
{
  "questionId": "q-uuid",
  "selectedOption": "b",
  "text": "...",
  "timeUsedSeconds": 45,
  "score": 5,
  "maxScore": 5,
  "keystrokeTimings": [12, 45, 23, 67, ...]
}
```

**Indexes**:
- `competitionId` + `roundNumber` + `ageGroup` + `score` (desc) — leaderboard queries
- `competitionId` + `userId` — check if user already attempted
- `flags.level` + `flags.reviewStatus` — admin flag review queue
- `competitionId` + `schoolId` + `score` (desc) — school-level leaderboard

---

### leaderboards (Phase 2+)

Pre-aggregated leaderboard data per competition, round, and geographic level. Updated by Cloud Function after exam window closes.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Leaderboard ID (composite: `{competitionId}_{round}_{ageGroup}_{level}_{scope}`) |
| competitionId | string | yes | Competition reference |
| roundNumber | number | yes | Round number |
| ageGroup | string | yes | `junior` \| `middle` \| `senior` |
| level | string | yes | `school` \| `district` \| `city` \| `state` \| `national` |
| scope | string | yes | Specific school/district/city/state name or "all" for national |
| entries | array\<map\> | yes | Top participants `[{rank, kidName, schoolName, score, flagLevel}]` |
| totalParticipants | number | yes | Total participants in this scope |
| updatedAt | timestamp | yes | Last aggregation time |

**Indexes**:
- `competitionId` + `roundNumber` + `ageGroup` + `level` + `scope` — leaderboard lookup

---

### growthMapReports (Phase 2+)

GrowthMap parent insight reports. AI-generated periodic reports with aggregated child analytics.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Report ID |
| kidId | string | yes | Kid profile ID |
| userId | string | yes | Parent user ID |
| period | string | yes | `weekly` \| `monthly` |
| periodStart | timestamp | yes | Start of reporting period |
| periodEnd | timestamp | yes | End of reporting period |
| activityPulse | map | yes | `{sessionsCount, creationsCount, timeSpentMinutes, streak, activeDays[]}` |
| strengthRadar | map | yes | `{creativity, language, reasoning, aiKnowledge, collaboration, persistence}` — each 0-100 |
| interestSignals | array\<map\> | yes | `[{signal, evidence, strength, suggestion}]` — detected interests |
| learningProgress | map | yes | `{conceptsLearned, conceptsTotal, mindxBands: {speaking, listening, thinking, reading}, cerebroResults[]}` |
| kokoReport | map | yes | `{summary, highlights[], parentTips[], goalSuggestions[], encouragement}` |
| peerComparison | map | no | `{creativity: percentile, language: percentile, ...}` — opt-in only |
| previousStrengthRadar | map | no | Previous period's radar for comparison |
| createdAt | timestamp | yes | Report generation time |

**Indexes**:
- `kidId` + `period` + `periodStart` (desc) — child's reports
- `userId` + `createdAt` (desc) — parent's all reports

---

### ceoBusiness

Kid CEO — kid's registered business. Each business is a long-running simulation (30/60/90 days depending on pace) that drives event generation and decision capture.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Business ID (auto-generated) |
| sessionId | string | yes (P1) | Anonymous session ID (links to `sessions`) |
| userId | string | no (P2) | Firebase Auth UID (Phase 2+) |
| kidId | string | no (P2) | Top-level kid profile ID (Phase 2+) |
| businessName | string | yes | Kid-chosen business name |
| businessType | string | yes | `lemonade` \| `icecream` \| `tshirt` \| `games` \| `crafts` \| `blog` \| `custom` |
| customBusinessDescription | string | no | Free-text description (only required when `businessType == 'custom'`) |
| location | string | yes | City / area (e.g., "Bangalore") |
| startingCapital | number | yes | Initial cash in rupees |
| currentCash | number | yes | Current cash on hand (rupees) |
| reputation | number | yes | Brand reputation 0-100 |
| morale | number | yes | Team/founder morale 0-100 |
| employees | number | yes | Employee headcount |
| phase | string | yes | `pre_launch` \| `launch` \| `early_growth` \| `scale` \| `mature` |
| phaseMilestones | map | yes | Per-milestone status, e.g. `{BRAND: 'pending'\|'resolved', LOCATION: 'pending'\|'resolved'}` |
| totalDecisions | number | yes | Total decisions taken across all events (default 0) |
| status | string | yes | `active` \| `completed` \| `paused` |
| pace | string | yes | `30` \| `60` \| `90` — simulation length in days |
| nextEventAt | timestamp | no | When the next event should be delivered (driven by `pace`) |
| createdAt | timestamp | yes | Business creation timestamp |
| updatedAt | timestamp | yes | Last update timestamp |
| completedAt | timestamp | no | Completion timestamp (when `status == 'completed'`) |

**Indexes**:
- `sessionId` + `createdAt` (desc) — session's businesses
- `userId` + `status` — user's active/completed businesses (Phase 2+)
- `nextEventAt` (asc) — scheduled event delivery scanner

---

### ceoEvents

Kid CEO — LLM-generated business events. Each event presents the kid with a situation and 2-3 weighted choices; scoring happens on decision across 6 CEO dimensions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Event ID (auto-generated) |
| businessId | string | yes | Parent business reference |
| sessionId | string | yes (P1) | Anonymous session ID |
| title | string | yes | Short event title |
| description | string | yes | Full scenario description shown to kid |
| category | string | yes | Event category (e.g., marketing, operations, hiring, crisis) |
| phase | string | yes | Business phase at time of event (`pre_launch` \| `launch` \| ...) |
| milestone | string | no | Milestone key this event resolves (e.g., `BRAND`, `LOCATION`) |
| choices | array\<map\> | yes | 2-3 decision options (see structure below) |
| status | string | yes | `pending` \| `decided` \| `expired` |
| decidedChoice | string | no | `A` \| `B` \| `C` — chosen option (null until decided) |
| decisionTimestamp | timestamp | no | When kid made the decision |
| responseTimeSeconds | number | no | Seconds between delivery and decision |
| scores | map | no | 6-dimension score deltas (null until decided) |
| feedback | string | no | Koko mentor feedback for this decision (null until decided) |
| deliveredVia | string | no | `web` \| `telegram` — where this event reached the kid |
| createdAt | timestamp | yes | Event creation / delivery time |
| expiresAt | timestamp | yes | Event expiry (auto-expires if undecided) |

**Choice structure** (inside `choices` array):
```json
{
  "id": "A",
  "text": "Slash prices 30% to beat the new competitor",
  "scoring_hint": "Aggressive pricing — tests capital discipline vs growth instinct",
  "weights": {
    "risk_calibration": -5,
    "capital_discipline": -10,
    "growth_instinct": 8,
    "operational_rigor": 0,
    "people_leadership": 0,
    "crisis_response": 4
  }
}
```

**Scores structure** (inside `scores` map, populated on decision — 6 CEO dimensions):
- `risk_calibration` — reading upside/downside correctly
- `capital_discipline` — spending cash wisely
- `growth_instinct` — sensing when to push harder
- `operational_rigor` — running a tight ship
- `people_leadership` — team/customer relationships
- `crisis_response` — staying calm under pressure

**Indexes**:
- `businessId` + `createdAt` (desc) — business's event history
- `businessId` + `status` — pending events for a business
- `status` + `expiresAt` — expiry cleanup scanner

---

### ceoProfiles

Kid CEO — 6-dimension CEO profile ("DNA Card"). One profile per business; aggregates scores across all decided events and is shareable via slug.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Profile ID (auto-generated) |
| sessionId | string | yes (P1) | Anonymous session ID |
| userId | string | no (P2) | Firebase Auth UID (Phase 2+) |
| kidId | string | no (P2) | Top-level kid profile ID (Phase 2+) |
| businessId | string | yes | Linked business (unique — one profile per business) |
| dimensions | map | yes | 6 CEO dimensions, each with score/decisions/trend (see below) |
| totalDecisions | number | yes | Count of decided events contributing to profile |
| avgResponseTime | number | yes | Average decision response time in seconds |
| currentPhase | string | yes | Business phase at last aggregation |
| shareUrl | string | yes | Unique slug for public share URL |
| isPublic | boolean | yes | Whether profile is publicly viewable via shareUrl |
| createdAt | timestamp | yes | Profile creation timestamp |
| updatedAt | timestamp | yes | Last aggregation timestamp |

**Dimensions structure** (inside `dimensions` map):
```json
{
  "risk_calibration":   { "score": 72, "decisions": 14, "trend": "up" },
  "capital_discipline": { "score": 58, "decisions": 14, "trend": "stable" },
  "growth_instinct":    { "score": 81, "decisions": 14, "trend": "up" },
  "operational_rigor":  { "score": 64, "decisions": 14, "trend": "down" },
  "people_leadership":  { "score": 70, "decisions": 14, "trend": "stable" },
  "crisis_response":    { "score": 55, "decisions": 14, "trend": "up" }
}
```
`trend` is `up` \| `down` \| `stable` computed from recent vs earlier decisions.

**Indexes**:
- `sessionId` + `updatedAt` (desc) — session's profiles
- `businessId` — unique (one profile per business)
- `shareUrl` — unique lookup by share slug

Unlike other collections, `ceoProfiles` allow public read when `isPublic == true` (matches the `creations` pattern for shareable content).

---

### botSessions

Telegram chat ↔ GSI session binding. One document per Telegram chat, scoped by bot handle. Tracks which GSI session (and, in Phase 2, which user/kid) the chat is linked to, plus the currently active module.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| chatId | string | yes | Telegram chat ID (document ID) |
| platform | string | yes | `telegram` \| `whatsapp` |
| botHandle | string | yes | `GSIPersonalAssistantBot` \| `GSIKidCeoAssistantBot` |
| gsiSessionId | string | yes | Linked GSI session ID |
| userId | string | no (P2) | Firebase Auth UID (once linked) |
| kidId | string | no (P2) | Top-level kid profile ID (once linked) |
| activeModule | string | no | `ceo` \| `homework` \| null |
| moduleState | map | yes | Per-module conversation state (shape depends on `activeModule`) |
| linkedAt | timestamp | no | When user/kid identity was linked via `botLinkCodes` |
| createdAt | timestamp | yes | First chat message timestamp |
| lastActiveAt | timestamp | yes | Most recent chat activity |

**Indexes**:
- `botHandle` + `lastActiveAt` (desc) — recent chats per bot
- `gsiSessionId` — cross-channel sync lookup (find bot chats for a given session)

---

### botLinkCodes

Short-lived auth-binding tokens that let a web session claim ownership of a Telegram chat (or vice versa). Single-use and bot-scoped.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| token | string | yes | 32-byte hex token (document ID) |
| gsiSessionId | string | yes | GSI session ID to bind |
| userId | string | no (P2) | Firebase Auth UID (Phase 2+) |
| kidId | string | no (P2) | Top-level kid profile ID (Phase 2+) |
| botHandle | string | yes | `GSIPersonalAssistantBot` \| `GSIKidCeoAssistantBot` — which bot this token is scoped to |
| used | boolean | yes | Whether token has been redeemed (default false) |
| usedByChatId | string | no | Telegram chat ID that redeemed it (audit trail) |
| expiresAt | timestamp | yes | `createdAt + 10 minutes` — Firestore TTL field |
| createdAt | timestamp | yes | Token creation time |

Single-use, bot-scoped. Firestore TTL policy deletes expired tokens after 24 hours (`expiresAt` is the TTL field).

**Indexes**:
- `expiresAt` — TTL only; no composite index needed (tokens are looked up by document ID)

---

### homeworkSessions (Phase 2+)

Forwarded homework interactive sessions. Kid forwards a homework photo / text to the bot; the system extracts questions and drives an interactive quiz / recitation / explanation / practice flow.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Homework session ID (auto-generated) |
| sessionId | string | yes | Linked `botSessions` chat ID |
| gsiSessionId | string | yes | GSI session ID |
| kidId | string | no (P2) | Top-level kid profile ID |
| platform | string | yes | `telegram` \| `whatsapp` |
| subject | string | yes | Subject detected (e.g., "Math", "Science", "English") |
| gradeEstimate | number | yes | Estimated grade level (e.g., 5, 9) |
| language | string | yes | Detected primary language — `en` \| `hi` (v1) |
| originalText | string | yes | OCR'd / forwarded homework text |
| totalQuestions | number | yes | Number of questions extracted |
| questions | array\<map\> | yes | Extracted questions (see structure below) |
| progress | map | yes | Interactive progress state (see structure below) |
| score | number | no | Overall score (0-100%) once completed (excludes revealed questions from the mastery denominator) |
| revealedQuestionIds | array\<number\> | yes | Question IDs where the answer was revealed after 3 failed attempts. Empty array when nothing was revealed. |
| schoolId | string \| null | yes | Optional school anchor. Populated when the forwarded-from channel maps to a registered school (`schools` collection — Phase 3). Null otherwise. |
| sourceChannelId | string \| null | yes | Optional source-channel ID (e.g. Telegram `forward_from_chat.id`) for provenance + teacher-heatmap aggregation. Null when no detectable origin. |
| createdAt | timestamp | yes | Forwarding timestamp |
| updatedAt | timestamp | yes | Last interaction timestamp |

**Question structure** (inside `questions` array):
```json
{
  "id": 1,
  "text": "What is 7 x 8?",
  "type": "multiple_choice | short_answer | recitation | explanation | calculation",
  "options": ["54", "56", "48", "63"],
  "correctAnswer": "56",
  "hint": "Think of it as 7 x 8 = 7 x 4 x 2.",
  "recitationText": "Twice two are four, twice three are six...",
  "similarPractice": "What is 6 x 9?",
  "language": "en",
  "meta": {
    "steps": [
      { "prompt": "First, break 8 into 4 + 4.", "expected": "7 x 4 + 7 x 4" },
      { "prompt": "Now add them.", "expected": "56" }
    ]
  }
}
```
`options` and `correctAnswer` apply to `multiple_choice`. `recitationText` applies to `recitation`. `similarPractice` provides a follow-up drill question. `language` overrides the session-level language for mixed-language homework. `meta.steps` enables multi-step scaffolding for math (v1); `meta.latex` and `meta.diagramUrl` are reserved for v1.1 (Mathpix + KaTeX) and not populated by v1 code paths.

**Progress structure** (inside `progress` map):
```json
{
  "currentIndex": 2,
  "answers": [
    { "questionId": 1, "answer": "56", "correct": true, "attempts": 1, "score": 100, "revealed": false },
    { "questionId": 2, "answer": "48", "correct": false, "attempts": 3, "score": 0, "revealed": true }
  ],
  "mode": "quiz | recite | explain | practice",
  "startedAt": "2026-04-19T10:15:00Z",
  "completedAt": "2026-04-19T10:32:00Z"
}
```

`revealed` is `true` when the bot revealed the answer + worked explanation after 3 failed attempts. Revealed questions contribute 0 to the mastery score but still count toward participation (and so still earn reduced AI Points in the rewards pipeline).

**Indexes**:
- `gsiSessionId` + `createdAt` (desc) — session's homework history
- `schoolId` + `createdAt` (desc) — teacher heatmap aggregation (Phase 3). Sparse — only hits docs with `schoolId != null`.

**Rate limits** (see `docs/security.md`):
- Per-chat: 5 forwards / hour (abuse guard).
- Per-kid once identity is bound: 5 forwards / hour / kid (avoids one family's shared phone getting throttled when two siblings forward homework back-to-back).

---

### challenges (Phase 2+)

Weekly creation challenges.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Challenge ID |
| title | string | yes | Challenge title |
| description | string | yes | Challenge brief |
| type | string | yes | Required creation type `story` \| `music` \| `quiz` \| `any` |
| theme | string | yes | Theme prompt (e.g., "Space Exploration") |
| startsAt | timestamp | yes | Challenge start |
| endsAt | timestamp | yes | Challenge end |
| status | string | yes | `upcoming` \| `active` \| `voting` \| `completed` |
| prizes | array\<map\> | no | Prize descriptions |
| submissionCount | number | yes | Total submissions (default 0) |

---

### schools (Phase 3)

School accounts for B2B.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | School ID |
| name | string | yes | School name |
| board | string | yes | `cbse` \| `icse` \| `state_tn` \| `state_ap` |
| city | string | yes | City |
| state | string | yes | State |
| plan | string | yes | `trial` \| `basic` \| `premium` |
| studentCount | number | yes | Licensed student count |
| adminUserId | string | yes | Primary admin (teacher/principal) user ID |
| teacherIds | array\<string\> | no | Teacher user IDs |
| createdAt | timestamp | yes | Registration date |

---

### schools/{schoolId}/classes (Phase 3)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Class ID |
| name | string | yes | Class name (e.g., "Class 5A") |
| grade | string | yes | Grade level |
| teacherId | string | yes | Assigned teacher user ID |
| studentKidIds | array\<string\> | yes | Kid profile IDs in this class |

---

### schools/{schoolId}/assignments (Phase 3)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Assignment ID |
| classId | string | yes | Target class |
| title | string | yes | Assignment title |
| description | string | yes | Instructions |
| creationType | string | yes | Required creation type |
| curriculumTopicId | string | no | Linked curriculum topic |
| dueDate | timestamp | yes | Deadline |
| submissions | number | yes | Submission count (default 0) |

## Security Rules (Firestore)

```
Phase 1:
- creations: read=public (isPublic==true), write=via server only (Netlify Functions)
- sessions: read/write=via server only
- Kid CEO (ceoBusiness, ceoEvents, ceoProfiles): server-write only; ceoProfiles public read when isPublic==true
- Bot (botSessions, botLinkCodes, homeworkSessions): server-write only

Phase 2+:
- users/{userId}: read/write=owner only (request.auth.uid == userId)
- users/{userId}/kids: read/write=parent only
- creations: read=public OR owner, write=authenticated + owner
- challenges: read=public, write=admin only
```

## Migration Strategy

Firestore is schemaless, so "migrations" are handled differently:
- **Schema changes**: Add new fields with defaults; old documents get updated on next read/write
- **Data backfills**: Cloud Functions triggered manually or on schedule
- **Phase transitions**: Phase 1 anonymous creations get `userId` field added when user claims them in Phase 2
- **Backup**: Firestore scheduled exports to Cloud Storage (weekly)
