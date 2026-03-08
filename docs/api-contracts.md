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

Generate a multi-panel illustrated comic strip with dialogue and captions.

**Request:**
```json
{
  "premise": "Two friends discover a portal to a dinosaur world",
  "characters": [
    { "name": "Priya", "description": "A curious inventor" },
    { "name": "Arjun", "description": "A brave adventurer" }
  ],
  "panelCount": 4,
  "style": "manga",
  "ageGroup": "10-12"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "comic": {
      "title": "Portal to the Dino Age",
      "panels": [
        {
          "panelNumber": 1,
          "imageUrl": "https://storage.googleapis.com/.../panel-1.png",
          "caption": "One ordinary afternoon...",
          "dialogue": [
            { "character": "Priya", "text": "What's that glowing behind the bushes?", "position": "left" },
            { "character": "Arjun", "text": "Let's find out!", "position": "right" }
          ],
          "description": "Two kids in a park notice a glowing portal"
        }
      ],
      "characters": [
        { "name": "Priya", "description": "A curious inventor" }
      ],
      "setting": "A park that leads to prehistoric world",
      "style": "manga",
      "totalPanels": 4
    },
    "aiXray": {
      "model": "claude-sonnet",
      "concept": "Visual Storytelling & Multimodal AI",
      "explanation": "The AI combined text generation with image generation to create a sequential visual narrative...",
      "curriculumTag": "ai_multimodal_generation",
      "aiPoints": 12
    },
    "creationId": "abc123",
    "shareUrl": "https://gsiaistudio.com/view/abc123"
  }
}
```

**Errors:**
- `400 UNSAFE_CONTENT` — Input contains inappropriate content
- `400 INVALID_INPUT` — Missing required fields
- `429 RATE_LIMITED` — Too many requests
- `502 AI_GENERATION_FAILED` — Claude or Replicate API error

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
| Public Read | 100/min | 100/min | 100/min |
| Auth | N/A | 5/min | 5/min |
