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
| downloadCount | number | yes | Number of downloads (default 0) |
| likeCount | number | yes | Phase 2: community likes (default 0) |
| aiConceptsTaught | array\<string\> | yes | AI concepts covered `["prompt_engineering", "nlg"]` |
| curriculumTags | array\<string\> | no | CBSE curriculum mapping tags |
| templateId | string | no | Template ID if created from a template |
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
  "setting": "magical forest",
  "title": "Luna's Adventure",
  "moral": "Friendship conquers all"
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
      "isEnding": false,
      "endingType": "success | neutral | try_again",
      "endingMessage": "Congratulations! You found the treasure!"
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

Anonymous session tracking for Phase 1 rate limiting and Phase 1.5 points/badges.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Session ID (stored in localStorage) |
| fingerprint | string | no | Browser fingerprint hash (abuse prevention) |
| creationCount | number | yes | Number of creations this session (default 0) |
| lastCreationAt | timestamp | no | Timestamp of last creation |
| ipHash | string | no | Hashed IP for rate limiting (not raw IP) |
| createdAt | timestamp | yes | Session start |
| expiresAt | timestamp | yes | Session expiry (24 hours) |
| aiPoints | number | no | AI Knowledge Points earned (default 0). Added Phase 1.5 |
| badges | array\<string\> | no | Earned badge IDs. Added Phase 1.5 |
| conceptsLearned | array\<string\> | no | AI concepts learned via X-Ray. Added Phase 1.5 |
| creationsByType | map | no | Count of creations per type `{story: 3, music: 1}`. Added Phase 1.5 |
| shareCount | number | no | Number of shares from this session. Added Phase 1.5 |

**Rate Limits (Phase 1)**:
- 5 creations per session per day
- 1 creation per 2 minutes (cooldown)

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
Phase 1 (current implementation):
- creations: read=public (isPublic==true OR status=='published'), write=server only (Admin SDK)
- sessions: read/write=server only (Admin SDK)
- curriculum: read=public, write=none
- beatTheAiRounds: read/write=server only (Admin SDK)
- skillArenaAssessments: read/write=server only (Admin SDK)

Phase 2+:
- users/{userId}: read=owner only (request.auth.uid == userId), write=server only
- users/{userId}/kids: read=parent only, write=server only
- competitions: read=public, write=server only
- examSessions: read/write=server only
- leaderboards: read=public, write=server only (Cloud Functions)
- growthMapReports: read=owner (userId match), write=server only (Cloud Functions)
- challenges: read=public, write=server only

Phase 3:
- schools: read=authenticated, write=server only
```

See `firestore.rules` for exact rule definitions.

## Migration Strategy

Firestore is schemaless, so "migrations" are handled differently:
- **Schema changes**: Add new fields with defaults; old documents get updated on next read/write
- **Data backfills**: Cloud Functions triggered manually or on schedule
- **Phase transitions**: Phase 1 anonymous creations get `userId` field added when user claims them in Phase 2
- **Backup**: Firestore scheduled exports to Cloud Storage (weekly)
