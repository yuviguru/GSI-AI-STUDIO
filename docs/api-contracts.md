# GSI AI Studio — API Contracts

## Base URL

- Development: `http://localhost:8888/.netlify/functions` (Netlify Dev)
- Production: `https://gsiaistudio.com/api`

Netlify Functions are deployed as serverless endpoints under `/api/*` via Next.js API routes or Netlify Functions directory.

## Authentication

### Phase 1 (Anonymous)
All requests include a session token:
```
X-Session-Id: <session_id>
```
Session ID is generated client-side (UUID) and stored in localStorage.

### Phase 2+ (Authenticated)
Authenticated endpoints require Firebase Auth token:
```
Authorization: Bearer <firebase_id_token>
```
See `security.md#auth-flow` for token generation.

## Response Format

All responses follow:
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

Error responses:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "RATE_LIMITED",
    "message": "You've reached the creation limit. Try again in 2 minutes."
  }
}
```

## Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `RATE_LIMITED` | 429 | Too many requests |
| `INVALID_INPUT` | 400 | Input validation failed |
| `UNSAFE_CONTENT` | 400 | Input flagged by safety filter |
| `AI_GENERATION_FAILED` | 502 | External AI API error |
| `NOT_FOUND` | 404 | Resource not found |
| `UNAUTHORIZED` | 401 | Missing or invalid auth token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `SESSION_EXPIRED` | 401 | Anonymous session expired |
| `CREATION_LIMIT` | 429 | Daily creation limit reached |

---

## AI Generation Endpoints

### POST /api/ai/story

Generate an AI story with illustrations.

**Request:**
```json
{
  "premise": "A brave cat who explores the ocean",
  "characters": ["Luna the cat", "Finn the fish"],
  "setting": "underwater kingdom",
  "genre": "adventure",
  "pages": 5,
  "style": "watercolor",
  "ageGroup": "8-10"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "story": {
      "title": "Luna's Ocean Adventure",
      "pages": [
        {
          "pageNumber": 1,
          "text": "Deep beneath the waves, Luna the cat discovered...",
          "imageUrl": "https://storage.googleapis.com/gsi-ai-studio/creations/abc123/page-1.png",
          "imagePrompt": "watercolor illustration of a cat in diving gear exploring coral reef"
        }
      ]
    },
    "aiXray": {
      "model": "claude-sonnet",
      "concept": "natural_language_generation",
      "explanation": "The AI read your story idea and created a narrative by predicting what words should come next...",
      "curriculumTag": "ai_basics_nlg",
      "aiPoints": 10
    }
  }
}
```

**Errors:**
- `400 UNSAFE_CONTENT` — Input contains inappropriate content
- `400 INVALID_INPUT` — Missing required fields
- `429 RATE_LIMITED` — Too many requests
- `502 AI_GENERATION_FAILED` — Claude or Replicate API error

---

### POST /api/ai/music

Generate an AI music track.

**Request:**
```json
{
  "mood": "happy",
  "genre": "pop",
  "theme": "friendship",
  "duration": 30,
  "instruments": ["piano", "guitar"],
  "lyricsPrompt": "A song about best friends going on an adventure",
  "ageGroup": "10-12"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "music": {
      "title": "Best Friends Forever",
      "audioUrl": "https://storage.googleapis.com/gsi-ai-studio/creations/def456/track.mp3",
      "duration": 32,
      "lyrics": "We're heading out the door...",
      "bpm": 120,
      "waveformData": [0.1, 0.3, 0.8, ...]
    },
    "aiXray": {
      "model": "suno-v3",
      "concept": "pattern_recognition_audio",
      "explanation": "The AI learned musical patterns from millions of songs to create melodies that match your mood...",
      "curriculumTag": "ml_pattern_recognition",
      "aiPoints": 10
    }
  }
}
```

---

### POST /api/ai/quiz

Generate an AI quiz or game.

**Request:**
```json
{
  "topic": "Solar System",
  "format": "trivia",
  "difficulty": "intermediate",
  "questionCount": 10,
  "ageGroup": "12-14"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "quiz": {
      "title": "Solar System Challenge",
      "format": "trivia",
      "questions": [
        {
          "id": "q1",
          "question": "Which planet is known as the Red Planet?",
          "options": ["Venus", "Mars", "Jupiter", "Saturn"],
          "correctAnswer": "Mars",
          "explanation": "Mars appears red due to iron oxide (rust) on its surface.",
          "difficulty": "easy"
        }
      ],
      "totalQuestions": 10,
      "estimatedTime": "5 minutes"
    },
    "aiXray": {
      "model": "claude-sonnet",
      "concept": "knowledge_representation",
      "explanation": "The AI organized facts about the Solar System into a structured format with questions, answers, and distractors...",
      "curriculumTag": "ai_basics_knowledge_rep",
      "aiPoints": 10
    }
  }
}
```

### POST /api/ai/game

Generate a text adventure game with branching scenes and choices.

**Request:**
```json
{
  "premise": "A treasure hunt in ancient India",
  "setting": "indian_palace",
  "characterName": "Arjun",
  "difficulty": "medium",
  "ageGroup": "10-12"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "game": {
      "title": "The Lost Treasure of Hampi",
      "scenes": [
        {
          "id": "scene_1",
          "title": "The Ancient Map",
          "text": "You find a weathered map in your grandmother's attic...",
          "choices": [
            { "text": "Follow the river path", "nextSceneId": "scene_2" },
            { "text": "Take the mountain trail", "nextSceneId": "scene_3" }
          ],
          "isEnding": false
        }
      ],
      "startSceneId": "scene_1",
      "totalScenes": 8,
      "totalEndings": 3,
      "setting": "indian_palace",
      "characterName": "Arjun"
    },
    "aiXray": {
      "model": "claude-sonnet",
      "concept": "Decision Trees & Branching Logic",
      "explanation": "The AI created a branching story graph where each choice leads to different outcomes...",
      "curriculumTag": "ai_decision_trees",
      "aiPoints": 15
    }
  }
}
```

---

### POST /api/ai/comic

Generate a multi-panel illustrated comic strip with dialogue bubbles.

**Request:**
```json
{
  "premise": "Two friends discover a time machine in their school basement",
  "style": "manga",
  "panelCount": 4,
  "characters": ["Priya, tall girl with red hair", "Arjun, stocky boy with glasses"],
  "ageGroup": "10-12"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| premise | string | yes | Comic idea (5-500 chars) |
| style | string | yes | `manga` \| `cartoon` \| `superhero` \| `indie` \| `chibi` |
| panelCount | number | no | 4 (default), 6, or 8 panels |
| characters | string[] | no | Up to 4 character descriptions (name + appearance) |
| ageGroup | string | yes | `8-10` \| `10-12` \| `12-14` \| `14-17` |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "comic": {
      "title": "The Time Machine Mystery",
      "style": "manga",
      "panels": [
        {
          "panelNumber": 1,
          "imageUrl": "data:image/png;base64,...",
          "dialogue": [
            { "character": "Priya", "text": "Arjun, look what I found!", "position": "left" },
            { "character": "Arjun", "text": "No way!", "position": "right" }
          ],
          "caption": "After school one Tuesday...",
          "imagePrompt": "manga style: two kids discovering a glowing portal"
        }
      ],
      "characters": [
        { "name": "Priya", "description": "tall girl with red hair and blue jacket" }
      ],
      "setting": "Indian school basement",
      "synopsis": "Two friends discover a time machine in their school",
      "totalPanels": 4
    },
    "aiXray": {
      "model": "claude-sonnet",
      "concept": "multimodal_ai",
      "explanation": "The AI combined text generation (writing the story and dialogue) with image generation (drawing each panel) — this is called multimodal AI...",
      "curriculumTag": "ai_applications_creative",
      "aiPoints": 12
    },
    "creationId": "abc123",
    "shareUrl": "/view/abc123"
  }
}
```

**Pipeline:** validate → rate limit → safety filter → Claude generates panel scripts → safety filter outputs → Replicate/Pollinations generates panel images (parallel, concurrency=3, 512x512) → save creation → track

**Errors:**
- `400 UNSAFE_CONTENT` — Input contains inappropriate content
- `400 INVALID_INPUT` — Missing required fields or invalid style/panelCount
- `429 RATE_LIMITED` — Too many requests
- `502 AI_GENERATION_FAILED` — Claude or image generation API error

---

## Beat the AI Endpoints

### POST /api/beat-the-ai/start

Get a random challenge prompt for a category. Returns a prompt the kid must respond to without AI assistance.

**Request:**
```json
{
  "category": "story_sprint"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| category | string | yes | `story_sprint` \| `quiz_whiz` \| `caption_battle` \| `rhyme_time` |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "roundId": "round-uuid",
    "prompt": {
      "text": "Write a 3-sentence story about an auto-rickshaw that can fly",
      "theme": "Indian transport meets magic",
      "timeLimit": 180,
      "category": "story_sprint",
      "isIndiaThemed": true
    },
    "aiDifficulty": "easy"
  }
}
```

**Errors:**
- `400 INVALID_INPUT` — Invalid category
- `429 RATE_LIMITED` — Too many rounds (5/day Phase 1)

---

### POST /api/beat-the-ai/submit

Submit the kid's response. Server generates the AI response, saves the round, and returns both for comparison.

**Request:**
```json
{
  "roundId": "round-uuid",
  "kidResponse": "The old auto-rickshaw coughed twice, then sprouted golden wings...",
  "kidScores": { "creativity": 5, "funFactor": 4, "accuracy": 3, "heart": 5 },
  "aiScores": { "creativity": 3, "funFactor": 3, "accuracy": 5, "heart": 2 }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| roundId | string | yes | Round ID from /start |
| kidResponse | string | yes | Kid's text response (10-2000 chars) |
| kidScores | map | yes | Kid's self-rating `{creativity, funFactor, accuracy, heart}` (1-5 each) |
| aiScores | map | yes | Kid's rating of AI `{creativity, funFactor, accuracy, heart}` (1-5 each) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "roundId": "round-uuid",
    "aiResponse": "In the bustling streets of Mumbai, an auto-rickshaw named Raja discovered...",
    "kidAvgScore": 4.25,
    "aiAvgScore": 3.25,
    "result": "kid_wins",
    "aiPointsEarned": 25,
    "skillXpEarned": {
      "storytelling": 8,
      "creativity": 7,
      "speedThinking": 3,
      "culturalConnect": 2
    },
    "aiXray": {
      "concept": "ai_capabilities_limitations",
      "explanation": "You just competed against AI! Notice how AI was accurate and consistent, but your story had more heart and creativity. AI generates text by predicting likely next words — it's great at grammar and facts, but human imagination adds surprise and emotion that AI can't match!",
      "curriculumTag": "ai_basics_capabilities"
    }
  }
}
```

**Pipeline:** validate → rate limit → safety filter kid input → Claude generates AI response → safety filter AI output → calculate scores → save round → award points → respond

**Errors:**
- `400 INVALID_INPUT` — Missing fields or invalid scores
- `400 UNSAFE_CONTENT` — Kid's response flagged by safety filter
- `404 NOT_FOUND` — Round ID not found or expired
- `429 RATE_LIMITED` — Too many rounds
- `502 AI_GENERATION_FAILED` — Claude API error

---

### GET /api/beat-the-ai/history

Get past rounds for the current session/user.

**Query Params:**
- `limit` (number) — Results per page (default: 10, max: 50)
- `cursor` (string) — Pagination cursor

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "round-uuid",
        "category": "story_sprint",
        "prompt": { "text": "...", "theme": "..." },
        "result": "kid_wins",
        "kidAvgScore": 4.25,
        "aiAvgScore": 3.25,
        "aiPointsEarned": 25,
        "completedAt": "2026-03-08T10:30:00Z"
      }
    ],
    "nextCursor": "xyz789",
    "hasMore": true
  }
}
```

---

### GET /api/beat-the-ai/stats

Get aggregated win/loss/tie stats for the current session/user.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalRounds": 12,
    "wins": 7,
    "losses": 3,
    "ties": 2,
    "winRate": 0.58,
    "currentStreak": 3,
    "longestStreak": 5,
    "favoriteCategory": "story_sprint",
    "totalPointsEarned": 270,
    "byCategory": {
      "story_sprint": { "rounds": 5, "wins": 3 },
      "caption_battle": { "rounds": 4, "wins": 2 },
      "rhyme_time": { "rounds": 3, "wins": 2 }
    }
  }
}
```

---

### GET /api/beat-the-ai/skills

Get current skill levels and XP for the radar chart and skill progress cards.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "skills": {
      "creativity": { "xp": 87, "level": 2, "title": "Apprentice", "nextLevelXp": 150 },
      "storytelling": { "xp": 42, "level": 1, "title": "Beginner", "nextLevelXp": 51 },
      "wordplay": { "xp": 0, "level": 1, "title": "Beginner", "nextLevelXp": 51 },
      "knowledge": { "xp": 15, "level": 1, "title": "Beginner", "nextLevelXp": 51 },
      "speedThinking": { "xp": 63, "level": 2, "title": "Apprentice", "nextLevelXp": 150 },
      "culturalConnect": { "xp": 22, "level": 1, "title": "Beginner", "nextLevelXp": 51 }
    },
    "overallLevel": 2,
    "totalXp": 229
  }
}
```

---

## MindX (AI Skill Assessment) Endpoints

### POST /api/mindx/start

Start an assessment for a module. Returns 5 adaptive challenges.

**Request:**
```json
{
  "module": "speaking"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| module | string | yes | `speaking` \| `listening` \| `thinking` \| `reading` |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "assessmentId": "assessment-uuid",
    "module": "speaking",
    "difficulty": "medium",
    "challenges": [
      {
        "id": "ch-1",
        "type": "read_aloud",
        "question": {
          "text": "Read this passage aloud clearly and confidently:",
          "passage": "The monsoon clouds gathered over Mumbai, bringing the promise of rain to the dusty streets below.",
          "timeLimit": 60
        }
      },
      {
        "id": "ch-2",
        "type": "describe",
        "question": {
          "text": "Describe what's happening in this scenario:",
          "passage": "A busy Indian railway station during Diwali — families reuniting, vendors selling sweets, trains arriving.",
          "timeLimit": 90
        }
      }
    ],
    "totalChallenges": 5,
    "estimatedTime": "8 minutes"
  }
}
```

**Errors:**
- `400 INVALID_INPUT` — Invalid module
- `429 RATE_LIMITED` — Too many assessments (3/day Phase 1)

---

### POST /api/mindx/evaluate

Submit answers for all challenges. AI evaluates and returns score + mentor feedback.

**Request:**
```json
{
  "assessmentId": "assessment-uuid",
  "answers": [
    { "challengeId": "ch-1", "voiceTranscript": "The monsoon clouds gathered over Mumbai...", "timeUsedSeconds": 45 },
    { "challengeId": "ch-2", "text": "I see a crowded railway station during Diwali...", "timeUsedSeconds": 70 },
    { "challengeId": "ch-3", "text": "I think cricket teaches teamwork...", "timeUsedSeconds": 55 },
    { "challengeId": "ch-4", "selectedOption": "b", "timeUsedSeconds": 20 },
    { "challengeId": "ch-5", "text": "The main idea is about water conservation...", "timeUsedSeconds": 40 }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| assessmentId | string | yes | Assessment ID from /start |
| answers | array | yes | Array of answer objects (one per challenge) |
| answers[].challengeId | string | yes | Challenge ID |
| answers[].text | string | conditional | Text answer (for text-based questions) |
| answers[].voiceTranscript | string | conditional | Speech-to-text transcript (for speaking challenges) |
| answers[].selectedOption | string | conditional | Selected option (for MCQ) |
| answers[].timeUsedSeconds | number | yes | Time taken for this challenge |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "assessmentId": "assessment-uuid",
    "score": 72,
    "band": 4,
    "bandTitle": "Expert",
    "challengeResults": [
      { "challengeId": "ch-1", "score": 16, "maxScore": 20, "feedback": "Great fluency! Try pausing at commas for natural rhythm." },
      { "challengeId": "ch-2", "score": 15, "maxScore": 20, "feedback": "Good detail! Add more sensory descriptions next time." }
    ],
    "mentorFeedback": {
      "strengths": ["Clear pronunciation", "Good vocabulary use", "Confident expression"],
      "growthAreas": ["Pacing could be more natural", "Try adding more descriptive details"],
      "tips": ["Practice reading aloud for 5 minutes daily", "Record yourself and listen back"],
      "recommendedPractice": "describe",
      "encouragement": "You're doing brilliantly! Your speaking skills are really shining. Keep practicing and you'll be a Champion in no time!"
    },
    "aiPointsEarned": 30,
    "previousBand": 3,
    "improved": true,
    "aiXray": {
      "concept": "speech_recognition_nlp",
      "explanation": "The AI used Natural Language Processing to understand your speech! It analyzed your pronunciation, vocabulary, and how well you organized your ideas — just like how voice assistants like Alexa understand what you say.",
      "curriculumTag": "ai_applications_nlp"
    }
  }
}
```

**Pipeline:** validate → rate limit → safety filter answers → Claude evaluates each challenge → calculate scores → generate mentor feedback → save assessment → award points → respond

**Errors:**
- `400 INVALID_INPUT` — Missing answers or invalid format
- `400 UNSAFE_CONTENT` — Answer flagged by safety filter
- `404 NOT_FOUND` — Assessment ID not found
- `429 RATE_LIMITED` — Too many assessments
- `502 AI_GENERATION_FAILED` — Claude API error

---

### GET /api/mindx/progress

Get band scores and progress across all 4 modules.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "modules": {
      "speaking": { "band": 4, "bandTitle": "Expert", "score": 72, "assessments": 5, "trend": "improving" },
      "listening": { "band": 3, "bandTitle": "Achiever", "score": 55, "assessments": 3, "trend": "stable" },
      "thinking": { "band": 2, "bandTitle": "Explorer", "score": 38, "assessments": 2, "trend": "new" },
      "reading": { "band": 0, "bandTitle": "Not Started", "score": 0, "assessments": 0, "trend": "new" }
    },
    "overallBand": 3,
    "totalAssessments": 10,
    "totalPointsEarned": 280,
    "strongestModule": "speaking",
    "recommendedModule": "reading"
  }
}
```

---

### GET /api/mindx/history

Get past assessments for the current session/user.

**Query Params:**
- `module` (string) — Filter by module (optional)
- `limit` (number) — Results per page (default: 10, max: 50)
- `cursor` (string) — Pagination cursor

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "assessment-uuid",
        "module": "speaking",
        "score": 72,
        "band": 4,
        "bandTitle": "Expert",
        "difficulty": "medium",
        "aiPointsEarned": 30,
        "completedAt": "2026-03-08T10:30:00Z"
      }
    ],
    "nextCursor": "xyz789",
    "hasMore": true
  }
}
```

---

## Cerebro (Competition) Endpoints

> **Phase 2+ only** — All Cerebro endpoints require authentication (`Authorization: Bearer <token>`).

### GET /api/cerebro/competitions

List upcoming and active competitions.

**Query Params:**
- `status` (string) — Filter by status (optional)
- `ageGroup` (string) — Filter by age group (optional)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "comp-uuid",
        "title": "AI Olympiad 2026 — Season 1",
        "status": "registration",
        "ageGroups": ["junior", "middle", "senior"],
        "registrationEnd": "2026-04-10T23:59:59Z",
        "rounds": [
          { "round": 1, "name": "Prelims", "examWindow": { "start": "...", "end": "..." } }
        ],
        "participantCount": 1247,
        "prizesByLevel": { "national": ["Grand Prize: Laptop + Scholarship"], "state": ["..."] }
      }
    ]
  }
}
```

---

### POST /api/cerebro/register

Register a kid for a competition.

**Request:**
```json
{
  "competitionId": "comp-uuid",
  "kidId": "kid-uuid",
  "ageGroup": "middle"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "registrationId": "reg-uuid",
    "competitionId": "comp-uuid",
    "examWindow": { "start": "2026-04-15T10:00:00Z", "end": "2026-04-15T11:00:00Z" },
    "instructions": "Be ready 10 minutes before. Use Chrome/Edge. Ensure stable internet."
  }
}
```

**Errors:**
- `400 INVALID_INPUT` — Invalid age group or already registered
- `403 FORBIDDEN` — Parent consent not given or school not verified
- `410 GONE` — Registration closed

---

### POST /api/cerebro/start-exam

Start an exam. Returns randomized questions and begins server-side timer.

**Request:**
```json
{
  "competitionId": "comp-uuid",
  "roundNumber": 1,
  "deviceFingerprint": "fp-hash"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "examSessionId": "exam-uuid",
    "questions": [
      {
        "id": "q-1",
        "type": "mcq",
        "category": "ai_knowledge",
        "text": "Which of these is an example of Natural Language Processing?",
        "options": ["Image filters", "Voice assistants", "Video games", "Calculators"],
        "timeLimit": 60,
        "points": 5
      },
      {
        "id": "q-2",
        "type": "creative",
        "category": "creative_challenge",
        "text": "Write a 3-sentence story about an AI that helps farmers predict monsoon patterns.",
        "timeLimit": 180,
        "points": 15
      }
    ],
    "totalQuestions": 25,
    "totalTimeMinutes": 45,
    "proctorLevel": "browser_lockdown",
    "serverStartTime": "2026-04-15T10:02:15Z"
  }
}
```

**Errors:**
- `400 INVALID_INPUT` — Not registered or wrong round
- `403 FORBIDDEN` — Outside exam window or already attempted
- `409 CONFLICT` — Exam already in progress

---

### POST /api/cerebro/submit-answer

Submit answer for a single question (real-time, one at a time, cannot go back).

**Request:**
```json
{
  "examSessionId": "exam-uuid",
  "questionId": "q-1",
  "selectedOption": "Voice assistants",
  "timeUsedSeconds": 32,
  "keystrokeTimings": []
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { "accepted": true, "questionsRemaining": 24 }
}
```

---

### POST /api/cerebro/finish-exam

Complete the exam. Triggers scoring + anomaly detection.

**Request:**
```json
{
  "examSessionId": "exam-uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "score": 78,
    "totalPossible": 100,
    "breakdown": {
      "ai_knowledge": { "score": 35, "total": 40 },
      "creative_challenge": { "score": 22, "total": 30 },
      "reasoning": { "score": 16, "total": 20 },
      "application": { "score": 5, "total": 10 }
    },
    "timeUsedMinutes": 38,
    "provisionalRank": 42,
    "totalParticipants": 1247,
    "flagLevel": "green",
    "message": "Great job! Your results will be finalized after the exam window closes."
  }
}
```

---

### POST /api/cerebro/proctor-event

Log a proctoring event from the client.

**Request:**
```json
{
  "examSessionId": "exam-uuid",
  "type": "tab_switch",
  "details": "Focus lost at question 5",
  "timestamp": "2026-04-15T10:15:23Z"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "warning": "You switched tabs. This has been recorded. 2 more switches will auto-submit your exam.",
    "tabSwitchCount": 1,
    "maxAllowed": 3
  }
}
```

---

### GET /api/cerebro/leaderboard

Get leaderboard for a competition at a specific level.

**Query Params:**
- `competitionId` (string, required)
- `roundNumber` (number, default: latest)
- `ageGroup` (string, required)
- `level` (string, required) — `school` | `district` | `city` | `state` | `national`
- `scope` (string) — Specific school/district/city/state (required for non-national)
- `limit` (number, default: 50)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "level": "city",
    "scope": "Mumbai",
    "entries": [
      { "rank": 1, "kidName": "Aarav S.", "schoolName": "DPS Mumbai", "score": 94, "flagLevel": "green" },
      { "rank": 2, "kidName": "Priya M.", "schoolName": "Ryan International", "score": 91, "flagLevel": "green" }
    ],
    "totalParticipants": 342,
    "myRank": 15,
    "myScore": 78
  }
}
```

---

### GET /api/cerebro/my-results

Get own results across all competitions.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "competitionId": "comp-uuid",
        "competitionTitle": "AI Olympiad 2026",
        "round": 1,
        "score": 78,
        "rank": 42,
        "totalParticipants": 1247,
        "advanced": true,
        "flagLevel": "green"
      }
    ]
  }
}
```

---

## GrowthMap (Parent Insight) Endpoints

> **Phase 2+ only** — All GrowthMap endpoints require parent authentication (`Authorization: Bearer <token>`).

### GET /api/growth-map/dashboard

Full dashboard data for a kid profile.

**Query Params:**
- `kidId` (string, required) — Kid profile ID
- `period` (string) — `weekly` | `monthly` (default: weekly)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "kidName": "Aarav",
    "period": "weekly",
    "activityPulse": {
      "sessionsCount": 12,
      "creationsCount": 5,
      "timeSpentMinutes": 180,
      "streak": { "current": 4, "longest": 7 },
      "activeDays": ["2026-03-03", "2026-03-04", "2026-03-05", "2026-03-07"]
    },
    "strengthRadar": {
      "creativity": 72, "language": 58, "reasoning": 45,
      "aiKnowledge": 65, "collaboration": 30, "persistence": 80
    },
    "previousStrengthRadar": {
      "creativity": 65, "language": 55, "reasoning": 42,
      "aiKnowledge": 60, "collaboration": 28, "persistence": 75
    },
    "topInterests": [
      { "signal": "Space & Astronomy", "strength": 0.85, "evidence": "8 space-themed creations this month" }
    ],
    "learningSnapshot": {
      "conceptsLearned": 12,
      "conceptsTotal": 30,
      "mindxBands": { "speaking": 3, "listening": 2, "thinking": 1, "reading": 0 }
    }
  }
}
```

---

### GET /api/growth-map/report

AI-generated Koko's Report for a period.

**Query Params:**
- `kidId` (string, required)
- `period` (string) — `weekly` | `monthly` (default: weekly)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "summary": "Great week for Aarav! He improved his Speaking band to Achiever and created 3 amazing space stories.",
    "highlights": [
      "Speaking band improved from Explorer to Achiever!",
      "Created first-ever music composition",
      "5 AI concepts learned this week"
    ],
    "parentTips": [
      "Encourage Aarav to try the Thinking module — his reasoning skills are growing!",
      "Reading aloud together for 10 minutes daily could boost his MindX Reading score"
    ],
    "goalSuggestions": [
      { "goal": "Reach Achiever in all MindX modules", "timeframe": "4 weeks", "currentProgress": 0.25 },
      { "goal": "Complete 20 AI concepts", "timeframe": "6 weeks", "currentProgress": 0.6 }
    ],
    "encouragement": "Aarav is showing real talent in creative storytelling. His space stories show great imagination!"
  }
}
```

---

### GET /api/growth-map/strengths

Detailed strength radar breakdown with data sources.

**Query Params:**
- `kidId` (string, required)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "radar": {
      "creativity": { "score": 72, "trend": "improving", "sources": ["5 creations", "Beat the AI avg 4.2/5"] },
      "language": { "score": 58, "trend": "stable", "sources": ["MindX Speaking band 3", "MindX Reading band 2"] },
      "reasoning": { "score": 45, "trend": "improving", "sources": ["MindX Thinking band 2", "Cerebro reasoning 70%"] },
      "aiKnowledge": { "score": 65, "trend": "improving", "sources": ["12 concepts learned", "450 AI Points"] },
      "collaboration": { "score": 30, "trend": "new", "sources": ["3 shares", "0 community votes"] },
      "persistence": { "score": 80, "trend": "stable", "sources": ["4-day streak", "3 retries this week"] }
    },
    "topStrength": "persistence",
    "growthOpportunity": "collaboration",
    "peerPercentiles": { "creativity": 72, "language": 55, "reasoning": 40, "aiKnowledge": 68, "persistence": 85 }
  }
}
```

---

### GET /api/growth-map/interests

Interest signal detection from creation patterns.

**Query Params:**
- `kidId` (string, required)
- `timeRange` (string) — `30d` | `90d` | `all` (default: 30d)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "signals": [
      {
        "signal": "Space & Astronomy",
        "strength": 0.85,
        "evidence": "8 space-themed stories, 2 space quizzes, watched ISRO AI X-Ray",
        "suggestion": "Consider astronomy clubs or ISRO Young Scientist Programme"
      },
      {
        "signal": "Music & Rhythm",
        "strength": 0.6,
        "evidence": "3 music creations, chose music studio 40% of the time",
        "suggestion": "Try creating a story with a musical theme!"
      }
    ],
    "favoriteCreationType": "story",
    "creationTypeDistribution": { "story": 12, "music": 5, "quiz": 3, "game": 2, "comic": 1 }
  }
}
```

---

## Creation Management Endpoints

### POST /api/creations

Save a creation (publish or draft).

**Request:**
```json
{
  "type": "story",
  "title": "Luna's Ocean Adventure",
  "content": { ... },
  "media": [{ "url": "...", "type": "image", "alt": "..." }],
  "thumbnail": "...",
  "aiMetadata": { ... },
  "aiConceptsTaught": ["prompt_engineering", "nlg"],
  "isPublic": true
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "creationId": "abc123",
    "shareUrl": "https://gsiaistudio.com/view/abc123",
    "shareCard": {
      "title": "Luna's Ocean Adventure",
      "description": "An AI-generated story by a young creator on GSI AI Studio",
      "image": "https://storage.googleapis.com/gsi-ai-studio/creations/abc123/og.png"
    }
  }
}
```

---

### GET /api/creations/:id

Get a single creation (public view).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "type": "story",
    "title": "Luna's Ocean Adventure",
    "content": { ... },
    "media": [ ... ],
    "viewCount": 42,
    "shareCount": 7,
    "createdAt": "2026-03-15T10:30:00Z",
    "creator": {
      "name": "Young Creator",
      "avatar": "cat"
    }
  }
}
```

---

### GET /api/creations

List creations with filters.

**Query Params:**
- `type` (string) — Filter by creation type
- `sessionId` (string) — Filter by session (Phase 1)
- `userId` (string) — Filter by user (Phase 2)
- `kidId` (string) — Filter by kid profile (Phase 2)
- `isPublic` (boolean) — Public creations only
- `sort` (string) — `recent` | `popular` (default: `recent`)
- `limit` (number) — Results per page (default: 20, max: 50)
- `cursor` (string) — Pagination cursor (Firestore document ID)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "nextCursor": "xyz789",
    "hasMore": true
  }
}
```

---

## Session Endpoints (Phase 1)

### POST /api/sessions

Create or refresh an anonymous session.

**Request:**
```json
{
  "sessionId": "existing-uuid-or-null",
  "fingerprint": "browser-fingerprint-hash"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid-v4",
    "creationsRemaining": 5,
    "cooldownSeconds": 0,
    "expiresAt": "2026-03-16T10:30:00Z"
  }
}
```

---

## Auth Endpoints (Phase 2+)

### POST /api/auth/send-otp

Send OTP to phone number via Firebase Auth.

**Request:**
```json
{
  "phone": "+919876543210"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "verificationId": "firebase-verification-id",
    "expiresIn": 120
  }
}
```

**Note**: OTP verification is handled client-side via Firebase Auth SDK. Server receives the verified Firebase ID token in subsequent requests.

---

### POST /api/auth/profile

Create or update user profile after Firebase Auth verification.

**Headers:** `Authorization: Bearer <firebase_id_token>`

**Request:**
```json
{
  "name": "Meena Sharma",
  "email": "meena@example.com"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "userId": "firebase-uid",
    "name": "Meena Sharma",
    "phone": "+919876543210",
    "plan": "free",
    "kids": []
  }
}
```

---

### POST /api/auth/kids

Add a kid profile.

**Headers:** `Authorization: Bearer <firebase_id_token>`

**Request:**
```json
{
  "name": "Aarav",
  "age": 10,
  "grade": "5",
  "board": "cbse",
  "avatar": "astronaut"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "kidId": "kid-uuid",
    "name": "Aarav",
    "age": 10,
    "grade": "5",
    "totalCreations": 0,
    "aiPoints": 0
  }
}
```

---

## Curriculum Endpoints

### GET /api/curriculum

Get AI curriculum topics.

**Query Params:**
- `grade` (string) — Filter by grade (e.g., "5")
- `category` (string) — Filter by category

**Response (200):**
```json
{
  "success": true,
  "data": {
    "topics": [
      {
        "id": "ai-basics-1",
        "title": "What is Artificial Intelligence?",
        "category": "ai_basics",
        "gradeRange": { "min": 3, "max": 5 },
        "studioMapping": ["story", "quiz"],
        "description": "Understand what AI is and how it's different from regular software"
      }
    ]
  }
}
```

---

## Share Endpoints

### POST /api/share/:creationId

Generate a shareable link with OG metadata.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "shareUrl": "https://gsiaistudio.com/view/abc123",
    "whatsappUrl": "https://wa.me/?text=Check%20out%20my%20AI%20creation!%20https://gsiaistudio.com/view/abc123",
    "ogImage": "https://storage.googleapis.com/gsi-ai-studio/creations/abc123/og.png"
  }
}
```

---

## Webhook Endpoints (Phase 2+)

### POST /api/webhooks/razorpay

Razorpay payment webhook.

**Headers:** `X-Razorpay-Signature: <hmac_signature>`

**Payload**: Razorpay standard webhook payload

**Actions**: Update user plan, send confirmation, log transaction

---

## Rate Limits

| Endpoint Category | Phase 1 (Anonymous) | Phase 2 (Free) | Phase 2 (Paid) |
|-------------------|---------------------|-----------------|----------------|
| AI Generation | 5/day, 1/2min | 5/week | Unlimited |
| Creation Save | 5/day | 10/week | Unlimited |
| Beat the AI | 5/day, 1/2min | 5/week | Unlimited |
| MindX | 3/day | 5/week | Unlimited |
| Cerebro | N/A | 1/exam window | 1/exam window |
| GrowthMap | N/A | 10/hour | 10/hour |
| Public Read | 100/min | 100/min | 100/min |
| Auth | N/A | 5/min | 5/min |
