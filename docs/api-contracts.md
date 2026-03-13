# GSI AI Studio — API Contracts

## Base URL

- Development: `http://localhost:3000/api` (Next.js dev server)
- Production: `https://gsiaistudio.com/api`

All endpoints are Next.js API routes (`app/api/`) deployed via Netlify.

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
| `COOLDOWN` | 429 | Cooldown period between creations |
| `SESSION_NOT_FOUND` | 404 | Session ID not found in Firestore |
| `SESSION_EXPIRED` | 401 | Anonymous session has expired |
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
  "ageGroup": "8-10",
  "remixedFromId": "optional-creation-id"
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
    },
    "creationId": "abc123",
    "shareUrl": "/view/abc123"
  }
}
```

**Pipeline:** validate → rate limit → safety filter → Claude generates story → safety filter output → Replicate/Pollinations generates illustrations → save creation → track

**Errors:**
- `400 UNSAFE_CONTENT` — Input contains inappropriate content
- `400 INVALID_INPUT` — Missing required fields
- `429 RATE_LIMITED` / `429 COOLDOWN` — Too many requests or cooldown active
- `502 AI_GENERATION_FAILED` — Claude or image generation API error

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
  "ageGroup": "10-12",
  "remixedFromId": "optional-creation-id"
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
      "aiPoints": 15
    },
    "creationId": "def456",
    "shareUrl": "/view/def456"
  }
}
```

**Provider chain**: Lyria RealTime (if GEMINI_API_KEY) → Replicate MusicGen (if token) → Mock fallback. Audio returned as base64 data URI.

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
  "ageGroup": "12-14",
  "remixedFromId": "optional-creation-id"
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
    },
    "creationId": "ghi789",
    "shareUrl": "/view/ghi789"
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

### DELETE /api/creations/:id

Soft-delete (archive) a creation. Requires ownership via session ID.

**Headers:** `X-Session-Id: <session_id>`

**Response (200):**
```json
{
  "success": true,
  "data": { "archived": true }
}
```

**Errors:**
- `404 NOT_FOUND` — Creation not found
- `403 FORBIDDEN` — Not the owner of this creation

---

### POST /api/creations/:id/download

Track a download event (fire-and-forget). Increments `downloadCount` on the creation.

**Response (200):**
```json
{
  "success": true,
  "data": { "tracked": true }
}
```

---

### GET /api/creations/public

List public creations for the Explore feed. No session required.

**Query Params:**
- `type` (string) — Filter by creation type
- `sort` (string) — `trending` | `newest` (default: `newest`)
- `leaderboard` (boolean) — If true, include top 5 creators
- `limit` (number) — Results per page (default: 20, max: 50)
- `cursor` (string) — Pagination cursor

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

### GET /api/sessions/points

Load AI Points, badges, and concepts for a session.

**Headers:** `X-Session-Id: <session_id>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "aiPoints": 75,
    "badges": ["first_spark", "story_wizard"],
    "conceptsLearned": ["natural_language_generation", "text_to_image"],
    "creationsByType": { "story": 4, "music": 1, "quiz": 2 },
    "shareCount": 3
  }
}
```

---

### PATCH /api/sessions/points

Apply a points action (add points, learn concept, track creation, track share). Returns updated state and any newly unlocked badges.

**Headers:** `X-Session-Id: <session_id>`

**Request (add_points):**
```json
{
  "action": "add_points",
  "points": 10,
  "concept": "natural_language_generation"
}
```

**Request (track_creation):**
```json
{
  "action": "track_creation",
  "creationType": "story"
}
```

**Request (track_share):**
```json
{
  "action": "track_share"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "aiPoints": 85,
    "badges": ["first_spark", "story_wizard", "creative_machine"],
    "newBadges": ["creative_machine"],
    "conceptsLearned": ["natural_language_generation", "text_to_image"],
    "creationsByType": { "story": 5, "music": 1, "quiz": 2 },
    "shareCount": 3
  }
}
```

Badge unlocks are detected atomically in a Firestore transaction. `newBadges` contains only badges unlocked by this specific action.

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

## MindX — Skill Arena Endpoints

### POST /api/skill-arena/start

Start a new assessment for a module. Returns 5 challenges adapted to the kid's current band.

**Request:**
```json
{
  "module": "speaking" // "speaking" | "listening" | "thinking" | "reading"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "assessmentId": "abc123",
    "module": "speaking",
    "difficulty": "medium",
    "challenges": [
      {
        "id": "ch_1",
        "type": "read_aloud",
        "module": "speaking",
        "question": {
          "text": "Read the following passage aloud clearly",
          "passage": "The mango tree in our school garden...",
          "timeLimit": 60,
          "isIndiaThemed": true
        }
      }
    ],
    "totalChallenges": 5,
    "estimatedTime": "8 minutes"
  }
}
```

**Errors:** `RATE_LIMITED` (3/day), `INVALID_INPUT`, `SESSION_NOT_FOUND`

**Difficulty Adaptation:** Band 1-2 → easy, Band 3 → medium, Band 4-5 → hard. First assessment defaults to medium.

---

### POST /api/skill-arena/evaluate

Submit all 5 answers for AI evaluation. Returns scores, band, mentor feedback, and AI points.

**Request:**
```json
{
  "assessmentId": "abc123",
  "answers": [
    {
      "challengeId": "ch_1",
      "voiceTranscript": "The mango tree in our school garden...",
      "timeUsedSeconds": 45
    },
    {
      "challengeId": "ch_2",
      "selectedOption": "B",
      "timeUsedSeconds": 30
    },
    {
      "challengeId": "ch_3",
      "text": "I think the character felt worried because...",
      "timeUsedSeconds": 55
    }
  ]
}
```

**Answer fields** (at least one required per answer):
- `text` — Free-text answer (thinking/reading modules)
- `voiceTranscript` — Speech-to-text transcript (speaking module)
- `selectedOption` — MCQ selection (listening/thinking/reading modules)
- `timeUsedSeconds` — Time taken for this challenge

**Response (200):**
```json
{
  "success": true,
  "data": {
    "assessmentId": "abc123",
    "score": 72,
    "band": 4,
    "bandTitle": "Expert",
    "challengeResults": [
      { "challengeId": "ch_1", "score": 16, "maxScore": 20, "feedback": "Great fluency!" }
    ],
    "mentorFeedback": {
      "strengths": ["Clear pronunciation", "Good pacing"],
      "growthAreas": ["Try adding more expression when reading"],
      "tips": ["Practice reading to a friend or family member"],
      "recommendedPractice": "describe",
      "encouragement": "You're doing amazing! Keep practicing!"
    },
    "aiPointsEarned": 30,
    "previousBand": 3,
    "improved": true,
    "aiXray": {
      "concept": "speech_recognition_nlp",
      "explanation": "AI uses speech recognition to convert your voice into text...",
      "curriculumTag": "ai_applications_nlp"
    }
  }
}
```

**Errors:** `INVALID_INPUT`, `NOT_FOUND` (assessment), `UNAUTHORIZED` (not owner), `UNSAFE_CONTENT`

**Idempotent:** If assessment already completed, returns stored results without re-evaluating.

**Scoring:** MCQs auto-scored (20 pts if correct, 0 if wrong). Open-ended scored by AI (0-20 per challenge). Total 0-100.

**Points:** +20 base, +10 for Band 3+, +20 for Band 5, +15 first assessment per module, +10 if improved from previous band.

---

### GET /api/skill-arena/progress

Get band scores across all 4 modules.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "modules": {
      "speaking": { "module": "speaking", "band": 3, "bandTitle": "Achiever", "score": 55, "assessments": 4, "trend": "improving" },
      "listening": { "module": "listening", "band": 0, "bandTitle": "Starter", "score": 0, "assessments": 0, "trend": "new" },
      "thinking": { "module": "thinking", "band": 4, "bandTitle": "Expert", "score": 72, "assessments": 6, "trend": "stable" },
      "reading": { "module": "reading", "band": 2, "bandTitle": "Explorer", "score": 38, "assessments": 2, "trend": "improving" }
    },
    "overallBand": 3,
    "totalAssessments": 12,
    "totalPointsEarned": 280,
    "strongestModule": "thinking",
    "recommendedModule": "listening"
  }
}
```

---

### GET /api/skill-arena/history

Get past assessments for the session. Cursor-paginated.

**Query params:** `limit` (10-50, default 20), `cursor` (optional)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "abc123",
        "module": "speaking",
        "score": 72,
        "band": 4,
        "bandTitle": "Expert",
        "difficulty": "medium",
        "aiPointsEarned": 30,
        "completedAt": "2026-03-11T10:30:00Z"
      }
    ],
    "nextCursor": "def456"
  }
}
```

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
