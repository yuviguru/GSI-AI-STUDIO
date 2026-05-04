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

## Book Studio Endpoints

Book Studio uses a different lifecycle than one-shot AI generation: persistent multi-session state with a `books` collection + `pages` subcollection. See `data-model.md#books` for schemas. Grammar AI is **Groq** (not Claude) — uses existing `lib/ai/groqClient.ts`.

### POST /api/books

Create a new book from the wizard. Fields `size`, `format`, `bucket` are **LOCKED at creation** — cannot be changed after.

**Request:**
```json
{
  "title": "My Trip to Goa",
  "author": "Aanya",
  "type": "travel",
  "bucket": "memoir_catalog",
  "format": "text_image",
  "size": "square",
  "pageLimit": 16,
  "typography": {
    "titleFont": "Fredoka",
    "bodyFont": "Quicksand",
    "baseFontSize": 16
  },
  "themeColor": "#FF9F43"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "book": { "id": "...", "title": "...", "...": "..." }
  }
}
```

**Errors:**
- `400 INVALID_INPUT` — Unknown `type` / `format` / `size` / `bucket` combo, missing required fields
- `400 PAGE_LIMIT_EXCEEDS_TIER` — `pageLimit` > 5 on free tier, > 40 on paid
- `429 RATE_LIMITED` — Too many books per session

---

### GET /api/books

List the current session's (or user's) books, most-recently-edited first.

**Query params:** `status` (optional: `draft` | `complete` | `published`), `limit` (default 20), `cursor`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "...",
        "title": "My Trip to Goa",
        "type": "travel",
        "size": "square",
        "pageCount": 7,
        "pageLimit": 16,
        "status": "draft",
        "coverThumbnail": "...",
        "updatedAt": "..."
      }
    ],
    "nextCursor": null,
    "hasMore": false
  }
}
```

---

### GET /api/books/:id

Fetch a book + its pages (ordered by `pageNumber`).

**Response (200):** `{ book: {...}, pages: [{...}, ...] }`

**Errors:** `404 NOT_FOUND` if book doesn't exist or isn't owned by current session/user.

---

### PATCH /api/books/:id

Update book metadata. **Cannot change** `size`, `format`, `bucket`, `dimensions`. Server rejects with `400 LOCKED_FIELD`.

**Allowed fields:** `title`, `author`, `themeColor`, `typography` (defaults — already-set page overrides keep their values), `cover`, `backCover`, `isPublic`.

---

### DELETE /api/books/:id

Delete book and all pages (Firestore batch cascade).

**Response:** `204 No Content`

---

### POST /api/books/:id/pages

Append a new page. Server checks `book.pageCount < book.pageLimit`.

**Request:**
```json
{
  "layout": "text_top_image_bottom",
  "richText": null,
  "imagePrompt": null
}
```

**Response (201):** `{ page: {...}, pageNumber: 8 }`

**Errors:** `400 PAGE_LIMIT_REACHED` if at cap.

---

### PATCH /api/books/:id/pages/:pageId

Update a page. All fields optional.

**Request:**
```json
{
  "richText": { "type": "doc", "content": [ ] },
  "plainText": "Once upon a time...",
  "imageUrl": "...",
  "imagePrompt": "...",
  "imageStyle": "watercolor",
  "style": { "font": "Patrick Hand", "fontSize": 18, "alignment": "left" }
}
```

Server input-filters `plainText` and `imagePrompt` through safety pipeline before write. Auto-derives `plainText` from `richText` if both present and inconsistent.

---

### DELETE /api/books/:id/pages/:pageId

Remove page. Server transactionally renumbers remaining pages.

---

### POST /api/books/:id/pages/reorder

Reorder pages.

**Request:**
```json
{ "order": [{ "pageId": "p1", "pageNumber": 1 }, { "pageId": "p3", "pageNumber": 2 }] }
```

Server runs the renumber inside a Firestore transaction so failed midway leaves no gaps.

---

### POST /api/books/:id/cover

Update cover composition. Triggers regeneration of `coverThumbnail`.

**Request:** any subset of `{ title, subtitle, authorName, backgroundColor, imagePrompt, font }`

---

### POST /api/books/:id/publish

Move book to `published`. Server:
1. Validates `book.pageCount >= 1`
2. Mints `shareUrl` slug
3. Generates PDF (or reuses cached `pdfUrl`)
4. Sets `publishedAt`, `isPublic` (per request)

**Response (200):** `{ shareUrl, pdfUrl }`

---

### POST /api/books/:id/export-pdf

Generate PDF on-demand. Idempotent — returns cached `pdfUrl` if `updatedAt` hasn't moved since last export.

**Response (200):** `{ pdfUrl, generatedAt }`

---

### POST /api/ai/grammar-check

Get grammar / spelling / punctuation suggestions for a piece of text. Uses **Groq** (`llama-3.3-70b-versatile`) via `lib/ai/groqClient.ts`. **Preserves the kid's voice** — only flags clear mistakes, never rephrases for style.

**Request:**
```json
{
  "text": "The cat are jumping on the bed yesterday.",
  "ageHint": 10,
  "bookId": "...",
  "pageId": "..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "id": "s1",
        "type": "grammar",
        "original": "The cat are",
        "suggested": "The cat is",
        "explanation": "‘Cat’ is one cat, so it goes with ‘is’.",
        "startIndex": 0,
        "endIndex": 11
      },
      {
        "id": "s2",
        "type": "grammar",
        "original": "are jumping",
        "suggested": "was jumping",
        "explanation": "‘Yesterday’ is in the past, so use past tense.",
        "startIndex": 8,
        "endIndex": 19
      }
    ]
  }
}
```

**Guardrails (system prompt):**
- Flag ONLY: grammar errors, spelling errors, punctuation errors
- NEVER: rephrase for style, "improve" wording, change kid-isms, alter creative phrasing
- Each suggestion includes a kid-friendly `explanation` (no jargon)
- Empty array is normal and expected

---

### POST /api/ai/page-image

Generate an illustration for a book page. Reuses the existing cascade (`lib/ai/imageProvider.ts`: Pixazo → Replicate → Pollinations).

**Request:**
```json
{
  "prompt": "watercolor of a kitten on a windowsill at sunset",
  "style": "watercolor",
  "aspect": "square",
  "bookId": "...",
  "pageId": "..."
}
```

**Response (200):** `{ imageUrl, model, latencyMs }`

**Errors:** `400 UNSAFE_CONTENT` (input prompt filtered), `502 AI_GENERATION_FAILED`.

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

## Kid CEO Endpoints

Schemas: see `types/ceo.types.ts` and `docs/data-model.md`.

### POST /api/ceo/register

Register a new business and generate the first event.

**Headers:** `X-Session-Id: <session_id>`

**Request:**
```json
{
  "businessType": "lemonade",
  "businessName": "Luna's Lemonade Stand",
  "customBusinessDescription": null,
  "location": "Bengaluru, Karnataka",
  "pace": "60"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| businessType | string | yes | `lemonade` \| `icecream` \| `tshirt` \| `games` \| `crafts` \| `blog` \| `custom` |
| businessName | string | no | Optional display name (safety-filtered) |
| customBusinessDescription | string | no | Required when `businessType === 'custom'` (safety-filtered) |
| location | string | yes | City / region string used to flavour events |
| pace | string | yes | `30` \| `60` \| `90` — target minutes between events |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "businessId": "biz_abc123",
    "business": {
      "id": "biz_abc123",
      "sessionId": "uuid-v4",
      "businessType": "lemonade",
      "businessName": "Luna's Lemonade Stand",
      "location": "Bengaluru, Karnataka",
      "pace": "60",
      "phase": 1,
      "cash": 500,
      "reputation": 50,
      "morale": 70,
      "nextEventAt": "2026-04-19T10:30:00Z"
    },
    "firstEvent": {
      "id": "evt_first01",
      "businessId": "biz_abc123",
      "phase": 1,
      "title": "Your first customer arrives",
      "narrative": "A neighbor walks up to your stand and asks how much a cup costs...",
      "choices": [
        { "id": "A", "text": "Offer a friendly discount" },
        { "id": "B", "text": "Stick to the list price" },
        { "id": "C", "text": "Give a free sample first" }
      ],
      "expiresAt": "2026-04-19T10:35:00Z"
    }
  }
}
```

**Pipeline:** validate → rate limit → safety filter (on `businessName` + `customBusinessDescription`) → seed Phase 1 milestones → generate first event via LLM → save → respond.

**Errors:**
- `400 INVALID_INPUT` — Missing required fields or invalid enum values
- `400 UNSAFE_CONTENT` — Business name or custom description flagged
- `429 RATE_LIMITED` — Registration cap reached
- `502 AI_GENERATION_FAILED` — LLM provider failure

---

### POST /api/ceo/event

Generate the next event for a business, or return the current pending event if one exists (idempotent).

**Headers:** `X-Session-Id: <session_id>`

**Request:**
```json
{
  "businessId": "biz_abc123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "event": {
      "id": "evt_next02",
      "businessId": "biz_abc123",
      "phase": 1,
      "title": "Supplier raises prices",
      "narrative": "Your lemon supplier says prices are going up 20% next week...",
      "choices": [
        { "id": "A", "text": "Switch to a cheaper supplier" },
        { "id": "B", "text": "Absorb the cost for now" },
        { "id": "C", "text": "Raise your own prices" }
      ],
      "expiresAt": "2026-04-19T11:30:00Z"
    },
    "pendingDecisionExists": false
  }
}
```

**Pipeline:** verify ownership → if pending event exists, return it (idempotent) → else check `nextEventAt` timing → generate new event via LLM (Groq primary, Claude fallback) → safety filter output → save.

**Errors:**
- `404 NOT_FOUND` — Business not found
- `403 FORBIDDEN` — Caller does not own this business
- `429 COOLDOWN` — `nextEventAt` is still in the future
- `502 AI_GENERATION_FAILED` — LLM provider failure

---

### POST /api/ceo/decide

Submit a decision on a pending event.

**Headers:** `X-Session-Id: <session_id>`

**Request:**
```json
{
  "eventId": "evt_next02",
  "choiceId": "A"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "scores": {
      "strategy": 14,
      "empathy": 11,
      "resilience": 13,
      "creativity": 9,
      "ethics": 15,
      "execution": 12
    },
    "feedback": "Switching suppliers protects your margins, but check the new supplier's quality before committing...",
    "updatedBusiness": {
      "id": "biz_abc123",
      "phase": 1,
      "cash": 620,
      "reputation": 52,
      "morale": 68,
      "nextEventAt": "2026-04-19T12:30:00Z"
    },
    "nextEvent": {
      "id": "evt_next03",
      "businessId": "biz_abc123",
      "phase": 1,
      "title": "A local newspaper wants to interview you",
      "choices": [
        { "id": "A", "text": "Say yes — tell your story" },
        { "id": "B", "text": "Politely decline" },
        { "id": "C", "text": "Offer a written quote instead" }
      ]
    },
    "phaseAdvanced": false,
    "milestoneResolved": "first_price_shock",
    "aiPointsEarned": 15,
    "newBadges": ["first_decision"]
  }
}
```

**Pipeline:** verify ownership → stop timer → score via LLM (6 dimensions) → apply enrichment layers (phase × response-time × state-context) → update business state (cash, reputation, morale) → check phase completion → generate next event if applicable → award AI points → check badge unlocks → respond.

**Errors:**
- `404 NOT_FOUND` — Event not found
- `403 FORBIDDEN` — Caller does not own the parent business
- `400 INVALID_INPUT` — `choiceId` not in `A` \| `B` \| `C`
- `409 ALREADY_DECIDED` — Event has already been decided (see idempotency note)

**Idempotent:** If the event has already been decided, the endpoint returns the stored scores + feedback instead of re-scoring.

---

### GET /api/ceo/business

Get current business state, any pending event, and recent decision history.

**Headers:** `X-Session-Id: <session_id>`

**Query Params:**
- `businessId` (string, optional) — Defaults to the most recent active business for this session

**Response (200):**
```json
{
  "success": true,
  "data": {
    "business": {
      "id": "biz_abc123",
      "businessType": "lemonade",
      "businessName": "Luna's Lemonade Stand",
      "phase": 1,
      "cash": 620,
      "reputation": 52,
      "morale": 68,
      "nextEventAt": "2026-04-19T12:30:00Z"
    },
    "pendingEvent": null,
    "decisionHistory": [
      {
        "event": { "id": "evt_next02", "title": "Supplier raises prices" },
        "decision": { "choiceId": "A", "decidedAt": "2026-04-19T11:00:00Z" },
        "scores": { "strategy": 14, "empathy": 11, "resilience": 13, "creativity": 9, "ethics": 15, "execution": 12 }
      }
    ]
  }
}
```

**Errors:**
- `404 NOT_FOUND` — No business found for this session
- `403 FORBIDDEN` — Caller does not own the requested business

---

### GET /api/ceo/profile

Get the CEO profile (6-dimension DNA Card) for a business.

**Headers:** `X-Session-Id: <session_id>` (authenticated view) OR query `?s=<shareUrl>` (public view when `isPublic === true`)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "profile": {
      "dimensions": {
        "strategy": 62,
        "empathy": 58,
        "resilience": 71,
        "creativity": 49,
        "ethics": 80,
        "execution": 55
      },
      "archetype": "The Principled Builder",
      "summary": "You make steady, values-driven decisions and bounce back from setbacks well...",
      "totalDecisions": 8,
      "shareUrl": "abc-share-token"
    },
    "business": {
      "id": "biz_abc123",
      "businessType": "lemonade",
      "businessName": "Luna's Lemonade Stand",
      "phase": 2,
      "isPublic": true
    }
  }
}
```

**Note:** The public view accessed via `?s=<shareUrl>` returns only display-safe fields — it never includes `sessionId` or `userId`.

**Errors:**
- `404 NOT_FOUND` — Business or share token not found
- `403 FORBIDDEN` — Caller does not own this business and `isPublic` is `false`

---

## Kid CEO — Agents (Phase 3)

Agent-driven workflows that produce real artifacts (logos, posters, schedules, pricing strategies, …) the kid can review, accept, and persist. Shape is stable across agents; specific `workflowId`s are per-agent.

All endpoints in this group require `Authorization: Bearer <firebase-id-token>` + `X-Active-Kid-Id: <kidId>`. See `lib/auth-utils.ts#requireAuthWithKid`.

### GET /api/ceo/agents/catalog

Returns the static catalog of all agents with per-agent unlock rules. No kid context; safe to cache.

**Response:**
```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "design",
        "name": "Design Agent",
        "emoji": "🎨",
        "unlockPhase": "pre_launch",
        "salaryPerDay": 50,
        "tagline": "Logos, mottos, brand voice — what makes your business YOU.",
        "workflows": ["brand.package"]
      }
    ]
  }
}
```

### POST /api/ceo/agents/hire

Hires an agent for a business. Validates unlock-phase, deducts the first-day salary from `business.currentCash`, writes a `ceoAgentHires` doc.

**Request body:**
```json
{
  "businessId": "biz_abc123",
  "agentId": "design",
  "config": { "focus": "brand", "aggressiveness": "medium" }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hire": { "id": "hire_xyz", "agentId": "design", "status": "active", "salary": 50, "config": {...} },
    "business": { "currentCash": 2950, ... }
  }
}
```

**Errors:**
- `400 AGENT_LOCKED` — Business phase has not reached the agent's unlock phase.
- `400 ALREADY_HIRED` — An active hire of this agent already exists for the business.
- `400 INSUFFICIENT_CASH` — Business can't cover the first-day salary.

### POST /api/ceo/agents/run

Runs a workflow for an active agent hire. Returns a CANDIDATE artifact — nothing is attached to the business until the kid accepts.

**Request body:**
```json
{
  "hireId": "hire_xyz",
  "workflowId": "brand.package",
  "brief": { "mood": "playful", "audience": "kids_my_age", "oneWord": "tropical" },
  "eventId": "event_abc"
}
```

`eventId` is optional — required only when the workflow is resolving a milestone event.

**Response:**
```json
{
  "success": true,
  "data": {
    "artifact": {
      "id": "art_abc",
      "status": "candidate",
      "assets": [
        { "type": "image", "kind": "logo", "url": "...", "altText": "..." },
        { "type": "image", "kind": "logo", "url": "...", "altText": "..." },
        { "type": "image", "kind": "logo", "url": "...", "altText": "..." },
        { "type": "text", "kind": "motto", "content": "..." },
        { "type": "text", "kind": "motto", "content": "..." },
        { "type": "text", "kind": "motto", "content": "..." },
        { "type": "text", "kind": "voice", "content": "..." }
      ],
      "trace": [ ... ],
      "costInr": 7.5
    },
    "remainingFreeReRolls": 0
  }
}
```

**Errors:**
- `400 BRIEF_INVALID` — Brief failed Zod validation or `filterInput` rejected PII.
- `402 INSUFFICIENT_CASH` — Re-roll cost exceeds business cash.
- `502 WORKFLOW_FAILED` — One or more tool steps failed. Partial trace included.

### POST /api/ceo/agents/accept

Accepts one or more candidate assets from an artifact. Writes them to the target (business field for BRAND-like milestones, event for regulars, or the marketing feed for Marketing Agent outputs). Marks the artifact `status: 'accepted'` atomically.

**Request body:**
```json
{
  "artifactId": "art_abc",
  "selections": {
    "logo": "asset_0",
    "motto": "asset_4"
  },
  "attach": { "kind": "business_field", "field": "brandAssets" }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "artifact": { "id": "art_abc", "status": "accepted", "acceptedAt": "..." },
    "business": { "brandAssets": { "logoUrl": "...", "motto": "...", "voice": "..." } }
  }
}
```

### GET /api/ceo/agents/hires?businessId=...

Lists active + dismissed hires for a business.

### GET /api/ceo/artifacts?businessId=...&status=accepted

Paginated artifact feed. Supports `?status=candidate|accepted|rejected|expired`, `?workflowId=...`, `?limit=`, `?cursor=`.

### POST /api/ceo/marketing/post

(Marketing agent story — KIDCEO-AGENT-002-MARKETING.) Surfaces an accepted marketing artifact to the business's customers. Applies a small, deterministic reputation/reach bump, capped at +3/day across all posts.

### Custom Workflows (KIDCEO-WORKFLOW-BUILDER)

Unlocks at Scale phase. Scratch-style canvas serialises to a `WorkflowSpec` the existing executor runs — no new runtime.

- `GET /api/ceo/workflows/custom?businessId=...` — list.
- `POST /api/ceo/workflows/custom` — create.
- `PATCH /api/ceo/workflows/custom/:id` — update (rename, re-wire, enable/disable).
- `DELETE /api/ceo/workflows/custom/:id` — delete.
- `POST /api/ceo/workflows/custom/:id/run` — manual test-run (bypasses the trigger evaluator).

---

## Learn (AI Lab, Phase 3)

### GET /api/learn/progress

Returns `learnProgress/{kidId}` for the active kid — completed Foundation cards, workshops, embeds tried, CBSE tags covered.

### POST /api/learn/progress/complete

Idempotent "mark this Foundation card / workshop / embed as tried/completed". Body: `{ kind: 'foundation'|'workshop'|'embed', id: string, artifactId?: string }`.

**Response:** updated `learnProgress` doc. Safe to call repeatedly — server dedups.

---

## Bot Endpoints

### POST /api/bot/link/create

Mint a short-lived link token for binding a web-app session (or Phase 2 authenticated user) to a Telegram bot conversation.

**Headers:** `X-Session-Id: <session_id>` (Phase 1) OR `Authorization: Bearer <firebase_id_token>` (Phase 2)

**Request:**
```json
{
  "botHandle": "GSIKidCeoAssistantBot"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| botHandle | string | yes | `GSIPersonalAssistantBot` \| `GSIKidCeoAssistantBot` |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    "deepLink": "https://t.me/GSIKidCeoAssistantBot?start=link_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    "code": "482913",
    "expiresAt": "2026-04-19T10:40:00Z"
  }
}
```

- `deepLink`: `https://t.me/<botHandle>?start=link_<token>` — opens Telegram and auto-sends `/start link_<token>` to the bot
- `code`: user-readable 6-digit numeric code for `/link <code>` fallback inside the bot when the deep link cannot be used
- `token`: 32-byte hex string, stored in `botLinkCodes`, single-use, 10-minute TTL, bot-scoped

**Pipeline:** validate session → generate token + 6-digit code → write `botLinkCodes/{token}` → return.

**Errors:**
- `400 INVALID_INPUT` — Unknown `botHandle`
- `429 RATE_LIMITED` — Link-create cap reached for this session

---

### Telegram Webhooks

`POST /.netlify/functions/telegram-webhook-ceo` and `POST /.netlify/functions/telegram-webhook-studio` are **Netlify Functions**, not Next.js API routes. They receive Telegram Bot API update payloads for `@GSIKidCeoAssistantBot` and `@GSIPersonalAssistantBot` respectively. Full request/response contracts, secret-token verification, and update handling are documented in `MESSENGER_BOT_ARCHITECTURE.md` §3.

---

## Homework Endpoints

Transparency surface for the Homework messenger module. Parents use these to review what the bot asked / what the kid answered (the primary trust lever documented in `docs/MESSENGER_BOT_ARCHITECTURE.md` §5). The bot itself writes to `homeworkSessions` via the shared server-side service (`lib/bot/services/homeworkSessionStore.ts`); these endpoints only read.

### GET /api/homework/history

List recent homework sessions for the caller. Paginated, ordered by `createdAt` desc.

**Headers:** `X-Session-Id: <session_id>` (Phase 1) OR `Authorization: Bearer <firebase_id_token>` (Phase 2)

**Query:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| kidId | string | no (P2) | Scope results to a specific kid profile when the auth user has multiple kids. Ignored in Phase 1 / anonymous. |
| limit | number | no | Default 20, max 50. |
| cursor | string | no | Opaque pagination cursor returned by a previous call. |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "hw_01HX...",
        "subject": "Math",
        "language": "en",
        "gradeEstimate": 5,
        "totalQuestions": 6,
        "score": 83,
        "revealedCount": 1,
        "mode": "quiz",
        "startedAt": "2026-04-19T10:15:00Z",
        "completedAt": "2026-04-19T10:32:00Z"
      }
    ],
    "nextCursor": "eyJjcmVhdGVkQXQiOiIuLi4ifQ"
  }
}
```

**Errors:**
- `401 UNAUTHENTICATED` — Missing session or invalid token.

---

### GET /api/homework/sessions/:id

Fetch a single homework session with the full transcript — every question, answer, attempt count, and whether the answer was revealed. Used by the web `/homework/history/[id]` transparency view.

**Headers:** same as above.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "hw_01HX...",
    "subject": "Math",
    "language": "en",
    "gradeEstimate": 5,
    "totalQuestions": 6,
    "score": 83,
    "revealedQuestionIds": [3],
    "mode": "quiz",
    "startedAt": "2026-04-19T10:15:00Z",
    "completedAt": "2026-04-19T10:32:00Z",
    "questions": [
      {
        "id": 1,
        "text": "What is 7 x 8?",
        "type": "multiple_choice",
        "correctAnswer": "56",
        "hint": "Think of it as 7 x 8 = 7 x 4 x 2."
      }
    ],
    "answers": [
      { "questionId": 1, "answer": "56", "correct": true, "attempts": 1, "score": 100, "revealed": false }
    ]
  }
}
```

**Errors:**
- `401 UNAUTHENTICATED`
- `403 FORBIDDEN` — Session exists but does not belong to the caller's session/kid scope.
- `404 NOT_FOUND` — Session does not exist.

---

## Rate Limits

| Endpoint Category | Phase 1 (Anonymous) | Phase 2 (Free) | Phase 2 (Paid) |
|-------------------|---------------------|-----------------|----------------|
| AI Generation | 5/day, 1/2min | 5/week | Unlimited |
| Creation Save | 5/day | 10/week | Unlimited |
| Beat the AI | 5/day, 1/2min | 5/week | Unlimited |
| MindX | 3/day | 5/week | Unlimited |
| Kid CEO Register | 3/day, 1/10min | 3/week | Unlimited |
| Kid CEO Event generate | 50/day | 50/day | Unlimited |
| Kid CEO Decide | 50/day | 50/day | Unlimited |
| Bot Link Create | 5/hour | 5/hour | 5/hour |
| Homework Forwards | 5/hour/chat, 5/hour/kid | 5/hour/chat, 5/hour/kid | 5/hour/chat, 5/hour/kid |
| Homework History Read | 30/min | 30/min | 30/min |
| Cerebro | N/A | 1/exam window | 1/exam window |
| GrowthMap | N/A | 10/hour | 10/hour |
| Public Read | 100/min | 100/min | 100/min |
| Auth | N/A | 5/min | 5/min |
| Teacher/Admin writes | N/A | 30/min | 30/min |

**Note:** Kid CEO rate limits are shared across web and bot channels for the same `sessionId`.

---

## School Side (Phase 3)

All school-side endpoints require `Authorization: Bearer <firebase_id_token>` and are gated by server-side role checks via `requireRole()` from `lib/auth-utils.ts`. The `role` is read from the user's Firestore doc — no custom claims.

### POST /api/auth/teacher/register

Upgrade the authenticated user to a `teacher` role and attach them to a school. The first teacher to register against a given `schoolCode` becomes the school `adminUid`; subsequent teachers join the existing school.

**Auth:** authenticated (any role; upgrades to `teacher`).

**Request:**
```json
{
  "schoolCode": "DPS-DEL-042",
  "name": "Ms. Priya Sharma",
  "school": {
    "name": "Delhi Public School",
    "city": "New Delhi",
    "state": "Delhi",
    "board": "cbse"
  }
}
```
`school` is only required when no school with this `schoolCode` exists yet (the first teacher bootstraps it).

**Response (201):**
```json
{ "success": true, "data": { "schoolId": "...", "role": "teacher", "isAdmin": true }, "error": null }
```

**Errors:** `INVALID_INPUT` (400), `SCHOOL_CODE_TAKEN` (409) when code exists with a different school name.

### GET /api/auth/teacher/verify

Check if the authenticated user has `teacher` or `schoolAdmin` role.

**Response (200):**
```json
{ "success": true, "data": { "role": "teacher", "schoolId": "..." }, "error": null }
```

### POST /api/schools/[id]/classes

Create a class in the teacher's school. Gated to `teacher`/`schoolAdmin`.

**Request:**
```json
{ "name": "Class 5A", "grade": "5", "section": "A" }
```

**Response (201):** returns `ClassDoc` with a generated `inviteCode`.

### GET /api/schools/[id]/classes

List all classes in the school. Teachers see all; kept simple for v1 — no per-teacher filtering.

### POST /api/classes/join

A signed-in parent (on behalf of their active kid) joins a class by code. Links the kid to the class and the school.

**Request:**
```json
{ "inviteCode": "AB12CD", "kidId": "kid_123" }
```

**Response (200):** returns the `ClassDoc` the kid joined.

**Errors:** `INVALID_CODE` (400), `KID_NOT_FOUND` (404), `FORBIDDEN` (403) if kid isn't owned by the caller.

### POST /api/assignments

Create an assignment. `teacher`/`schoolAdmin` only.

**Request:**
```json
{
  "classId": "...",
  "title": "Water Cycle Story",
  "description": "Write a story that explains evaporation, condensation, and precipitation.",
  "creationType": "story",
  "dueDate": "2026-05-01T18:30:00Z",
  "curriculumTags": ["storytelling_with_ai", "responsible_use"]
}
```

**Response (201):** returns `AssignmentDoc`.

### GET /api/assignments

- **Teacher**: returns all assignments across their classes.
- **Parent**: requires `X-Active-Kid-Id`; returns assignments for the kid's classes with `submissionStatus` per assignment (`pending` / `submitted` / `approved` / `revision_requested` / `late`).

### GET /api/assignments/[id]

Returns assignment detail. Teachers also get a `submissions` summary (count + by-status).

### PATCH /api/assignments/[id]

Teacher-only update — typically extending `dueDate` or flipping `status: 'closed'`.

### POST /api/assignments/[id]/submissions

Student (via parent-authenticated request with `X-Active-Kid-Id`) submits a creation to an assignment. Idempotent per `(assignmentId, kidId)` — re-submit updates the existing submission and resets status to `pending`.

**Request:**
```json
{ "creationId": "cr_abc" }
```

**Response (201):** returns `SubmissionDoc`.

**Errors:** `INVALID_CREATION_TYPE` (400) if the creation type doesn't match the assignment, `NOT_IN_CLASS` (403) if the kid isn't enrolled in the assignment's class.

### GET /api/assignments/[id]/submissions

Teacher-only. Returns `[{ submission, kid, creation }]` for the submission grid.

### PATCH /api/assignments/[id]/submissions/[submissionId]

Teacher review.

**Request:**
```json
{ "status": "approved", "feedback": "Great plot!", "starred": true }
```

### GET /api/admin/analytics/school/[schoolId]

`schoolAdmin`-only. Returns the cached `SchoolAnalyticsDoc`; optional `?refresh=1` query forces a re-aggregation (rate-limited per school to avoid quota abuse).

### GET /api/admin/competitions/leaderboard

`schoolAdmin`-only. Returns top 20 schools ranked by creations, curriculum coverage, and active-student %. Optional filters: `?board=cbse`, `?state=Delhi`, `?gradeMin=3&gradeMax=8`.

**Response:**
```json
{
  "success": true,
  "data": {
    "rankings": [
      { "schoolId": "...", "name": "...", "city": "...", "board": "cbse",
        "creations": 1204, "curriculumCoverage": 0.68, "activeStudentPct": 0.82, "rank": 1 }
    ]
  },
  "error": null
}
```

---

## Phase 4: School Productivity Suite Endpoints

All Phase 4 endpoints require authenticated `teacher` or `schoolAdmin` role unless noted. Rate limits and auth rules follow the patterns in `lib/auth-utils.ts`. Every AI-generating endpoint gates on parent consent (`hasConsent(parentUid, kidId, 'ai_generation')`) before running; see `docs/security.md` DPDP section.

### School Settings & Branding (ADMIN-009)

- `PATCH /api/schools/[id]` — update metadata (name, city, state, board). schoolAdmin of school only.
- `PATCH /api/schools/[id]/branding` — colors `{ primaryColor, secondaryColor }`.
- `POST /api/schools/[id]/assets` — multipart upload `{ type: 'logo' | 'letterhead', file }`. Validates PNG/JPG ≤ 2MB.
- `DELETE /api/schools/[id]/assets?type=logo|letterhead`.

### HPC Narrative Assistant (ADMIN-004)

- `POST /api/hpc/generate` — `{ kidId, term, teacherTags, locale }` → draft (not persisted).
- `POST /api/hpc` — persist final narrative.
- `GET /api/hpc?classId=&term=` — list for class + term.
- `PATCH /api/hpc/[id]` — edit.
- `GET /api/hpc/[id]/export` — CBSE-template PDF with school letterhead.

### Question Paper Generator (ADMIN-005)

- `POST /api/papers/generate` — `{ subject, classGrade, chapters, blueprint, totalMarks, durationMinutes, questionTypes, locale }` → draft.
- `POST /api/papers`, `GET /api/papers`, `GET/PATCH /api/papers/[id]`.
- `GET /api/papers/[id]/export?variant=question|answer|blueprint` — PDF.

### AI-Assisted Feedback (ADMIN-006)

- `POST /api/assignments/[id]/submissions/[submissionId]/suggest-feedback` — returns `{ positive, growthArea, followUpPrompts[] }`. Rate-limit 30/min per teacher. Does NOT persist.

### Lesson Plan Generator (ADMIN-007)

- `POST /api/lessons/generate`, `POST /api/lessons`, `GET /api/lessons`, `GET/PATCH /api/lessons/[id]`.
- `POST /api/lessons/[id]/assignment` — create an assignment from lesson (internally invokes `/api/assignments`).

### Substitute-Teacher Finder (ADMIN-008)

- `POST /api/substitutes/find` — `{ absentTeacherUid, date, periodIdxs[] }` → ranked candidates per period.
- `POST /api/substitutes/instructions` — Claude-drafted instructions for a period.

### Parent Messaging — Multi-channel (COMMS-001, COMMS-002)

- `POST /api/comms/parent-digest/preview` — teacher preview for student.
- `POST /api/comms/parent-digest/send`, `.../send-batch`.
- `POST /api/comms/ptm` — generate PTM talking points.
- `POST /api/comms/adhoc/draft`, `.../adhoc/send` — ad-hoc parent message via MessagingService.
- Webhooks: `POST /api/comms/webhooks/whatsapp`, `POST /api/comms/webhooks/telegram` — delivery/read receipts.

### Notifications (NOTIF-001)

- `GET /api/notifications` — list current user's notifications with unread count.
- `PATCH /api/notifications/[id]` — mark read.
- `POST /api/notifications/mark-all-read`.
- `GET/PATCH /api/notifications/prefs` — per-type × per-channel preferences.

### Class Feed (ENGAGE-008)

- `GET /api/classes/[classId]/feed?cursor=` — teacher-approved + shared creations; paginated.
- `POST /api/creations/[id]/reactions` — `{ emoji }` (whitelist: 👍 🎉 🌟 🔥 💯).
- `DELETE /api/creations/[id]/reactions?emoji=`.

### Progress Report (REPORT-001)

- `GET /api/reports/progress?kidId=&range=month|term|year&locale=en|hi` — PDF stream. Parent-of-kid OR teacher-of-class OR schoolAdmin.

### DPDP Consent & Erasure (COMPLIANCE-002)

- `POST /api/dpdp/consent` — record consent post-OTP affirmation; body `{ kidId, scope, method }`.
- `GET /api/dpdp/consent` — parent's consent status list.
- `DELETE /api/dpdp/consent?kidId=&scope=` — revoke; stops downstream activity within 1 minute.
- `GET /api/dpdp/consent/audit?kidId=` — full audit log.
- `POST /api/dpdp/erasure` — queue erasure request; cascades within 30 days.
- `GET /api/dpdp/erasure/[id]` — status + receipt URL.
- `GET /api/dpdp/export?kidId=` — subject-access data export (JSON + PDF). Rate-limit: 1/7 days per kid.

### Compliance Report v2 (COMPLIANCE-001)

- `GET /api/admin/compliance?version=2&from=&to=` — enhanced PDF with DPDP register, teacher AI usage, CBSE coverage. schoolAdmin only. Cached in `complianceCache` for 1 day.

### ERP Integration Layer (INTEGRATION-001)

- `GET /api/integrations/erp` — current config + last sync health.
- `PUT /api/integrations/erp` — `{ provider, credentials }` (encrypted server-side).
- `DELETE /api/integrations/erp`.
- `POST /api/integrations/erp/test` — validate credentials.
- `POST /api/integrations/erp/sync` — manual sync trigger.

### Consent & role notes

- Every AI-generating endpoint (`/api/hpc`, `/api/papers`, `/api/lessons`, `/api/comms/*`, `/api/assignments/.../suggest-feedback`) logs a `teacherAiUsage` record and checks consent before writing / sending.
- Every cross-student batch endpoint must isolate prompt context per student (no bleed).
- All PDF exports route through `lib/pdf/schoolBranding.ts` to apply school letterhead uniformly.
