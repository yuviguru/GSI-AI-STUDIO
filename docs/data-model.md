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
| likeCount | number | yes | Phase 2: community likes (default 0) |
| aiConceptsTaught | array\<string\> | yes | AI concepts covered `["prompt_engineering", "nlg"]` |
| curriculumTags | array\<string\> | no | CBSE curriculum mapping tags |
| isPublic | boolean | yes | Whether creation is publicly viewable |
| createdAt | timestamp | yes | Creation timestamp |
| updatedAt | timestamp | yes | Last modification timestamp |

**Content field by type**:

Story/Comic:
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

Anonymous session tracking for Phase 1 rate limiting.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Session ID (stored in localStorage) |
| fingerprint | string | no | Browser fingerprint hash (abuse prevention) |
| creationCount | number | yes | Number of creations this session (default 0) |
| lastCreationAt | timestamp | no | Timestamp of last creation |
| ipHash | string | no | Hashed IP for rate limiting (not raw IP) |
| createdAt | timestamp | yes | Session start |
| expiresAt | timestamp | yes | Session expiry (24 hours) |

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
