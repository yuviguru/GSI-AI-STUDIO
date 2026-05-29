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
├── assets/                 # Unified binary-media metadata (audio/video/image/pdf) — payloads in object storage
│   └── {assetId}
├── performances/           # Kid-recorded responses to creations (sing-alongs, readings, voice memos)
│   └── {performanceId}/
│       ├── [performance document]
│       └── reactions/      # Emoji reactions (positive-only whitelist, mirrors classFeed)
│           └── {kidId}
├── books/                  # Book Studio: kid-authored books (multi-session authoring)
│   └── {bookId}/
│       ├── [book document]
│       └── pages/          # Page documents (TipTap rich text + optional image)
│           └── {pageId}
├── users/                  # Phase 2: parent accounts (top-level)
│   └── {userId}
├── kids/                   # Phase 2: kid profiles (top-level — parentId links back to users)
│   └── {kidId}/
│       ├── [kid document]
│       └── creditLedger/   # Billing: append-only ledger of grants, debits, topups (Phase 5)
│           └── {entryId}
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
├── ceoAgentHires/          # Phase 3: Kid CEO agent hires (Design, Marketing, Ops, …)
│   └── {hireId}
├── ceoArtifacts/           # Phase 3: agent-produced artifacts (logos, posters, schedules, …)
│   └── {artifactId}
├── ceoCustomWorkflows/     # Phase 3: kid-authored workflows (Scratch-style builder)
│   └── {workflowId}
├── learnProgress/          # Phase 3: per-kid AI Lab progress
│   └── {kidId}
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
│       └── classes/
│           └── {classId}
├── assignments/            # Phase 3: teacher-created assignments (top-level)
│   └── {assignmentId}
├── submissions/            # Phase 3: student creations submitted to assignments
│   └── {submissionId}
├── schoolAnalytics/        # Phase 3: per-school cached aggregate metrics
│   └── {schoolId}
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
  "audioAssetId": "asset_abc123",
  "duration": 120,
  "genre": "pop",
  "mood": "happy",
  "lyrics": "...",
  "instruments": ["piano", "drums"],
  "bpm": 120,
  "waveformData": [0.1, 0.4, 0.7, "..."]
}
```

> **Music persistence note (PERF-001 onward)**: prior to PERF-001, `audioUrl` was a base64 data URI returned in-memory and never persisted (Firestore 1MB limit). PERF-001 introduces the `assets` collection; music creations now reference an `audioAssetId` and the audio binary lives in Cloudflare R2. Old `audioUrl`-only documents are migrated lazily — if a creation has no `audioAssetId`, the player falls back to regenerating the track on view.

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

### assets

Unified metadata layer for binary media (audio, video, image, pdf) across every studio. Payloads live in Cloudflare R2 (object storage); Firestore stores the metadata + access URL only. Introduced by PERF-001 to fix the music persistence gap and to give every studio (story hero images, comic panels, music tracks, book PDFs, sing-along recordings) a single storage path with consistent quotas, moderation, and retention.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Document ID (auto-generated, also used as R2 storage key prefix) |
| kind | string | yes | `audio` \| `video` \| `image` \| `pdf` |
| storageProvider | string | yes | `r2` (default for new uploads) \| `firebase` (legacy) \| `replicate` (external URL passthrough) |
| storageKey | string | yes | Provider-specific key, e.g. `assets/audio/{assetId}.webm` |
| publicUrl | string | yes | CDN-fronted URL for `r2` (custom domain via Cloudflare); direct URL for `firebase`/`replicate` |
| thumbnailUrl | string | no | Auto-generated for video/image/pdf; optional for audio (waveform PNG) |
| mimeType | string | yes | e.g. `audio/webm`, `audio/mpeg`, `video/webm`, `image/png`, `application/pdf` |
| sizeBytes | number | yes | File size — used for per-kid quota enforcement |
| durationSec | number | no | Audio/video only |
| width | number | no | Image/video only |
| height | number | no | Image/video only |
| ownerSessionId | string | yes (P1) | Anonymous session that uploaded the asset |
| ownerKidId | string | no (P2) | Kid profile (Phase 2+) |
| ownerUserId | string | no (P2) | Parent user (Phase 2+) |
| parentRefType | string | no | `creation` \| `performance` \| `standalone` — what this asset belongs to |
| parentRefId | string | no | ID of the parent doc; null for standalone uploads |
| sourceType | string | yes | `ai_generated` (Lyria, MusicGen, Replicate image, Claude PDF) \| `user_recording` (kid's voice/video) \| `user_upload` (future) |
| visibility | string | yes | `private` \| `public` \| `class` — mirrors parent doc; queried independently for moderation jobs |
| status | string | yes | `uploading` \| `ready` \| `flagged` \| `deleted` |
| moderation | map | yes | `{ state: 'pending'\|'auto_approved'\|'approved'\|'flagged', reason?: string, reviewedBy?: string, reviewedAt?: timestamp }` |
| createdAt | timestamp | yes | Upload finalization timestamp |
| expiresAt | timestamp | no | Optional TTL — set for ephemeral previews; absent = retain indefinitely |

**Indexes**:
- `ownerSessionId` + `createdAt` (desc) — kid's asset library, quota checks
- `ownerKidId` + `createdAt` (desc) — Phase 2+ kid library
- `parentRefType` + `parentRefId` — fetch all assets for a creation/performance
- `status` + `createdAt` (asc) — moderation worker queue (`status='flagged'` or `moderation.state='pending'`)
- `expiresAt` (asc) — cleanup worker for ephemeral previews

**Storage layout (R2)**:
```
gsi-assets/                              # bucket
├── audio/{assetId}.{webm|mp3|wav}       # music tracks, sing-alongs, voice memos
├── video/{assetId}.webm                 # video performances (gated by consent)
├── image/{assetId}.{png|jpg|webp}       # comic panels, story illustrations, thumbnails
├── pdf/{assetId}.pdf                    # book studio output
└── thumb/{assetId}.{png|webp}           # generated thumbnails
```

**Quota (per kid, MVP)**:
- Audio: 100 recordings or 50 MB, whichever first
- Video: 20 recordings or 200 MB, whichever first
- Asset deletion frees quota; assets are reference-counted via `parentRefId` (a single asset is owned by exactly one parent doc).

**Lifecycle**:
1. Client requests pre-signed PUT URL via `POST /api/assets/upload-url`. Server creates `assets/{id}` with `status='uploading'`.
2. Client uploads directly to R2 (server bandwidth = 0).
3. Client calls `POST /api/assets/finalize`. Server HEADs the R2 object to verify upload, sets `status='ready'`, runs auto-moderation, sets `moderation.state` accordingly.
4. Asset is referenced by parent (`creation`, `performance`, or remains `standalone`).
5. On parent delete, asset is soft-deleted (`status='deleted'`); R2 cleanup runs nightly.

---

### performances

Kid-recorded responses tied (usually) to a creation — sing-alongs, book readings, voice memos, reactions. Lives parallel to `creations`: same UI affordances (cards, share, like, public/private), but a different data shape because the artifact is the kid's voice (UGC), not AI output.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Document ID (auto-generated) |
| kind | string | yes | `sing_along` \| `reading` \| `voice_memo` \| `reaction` |
| parentCreationId | string | no | Creation this performance responds to (sing-along source, book being read). Null = standalone voice memo |
| parentCreationType | string | no | Denormalized `creation.type` for index queries (`music`, `story`, `book`, etc.) |
| audioAssetId | string | yes | FK to `assets` doc (`kind='audio'`) |
| videoAssetId | string | no | FK to `assets` doc (`kind='video'`) — only set when video consent is granted |
| ownerSessionId | string | yes (P1) | Anonymous session |
| ownerKidId | string | no (P2) | Kid profile (Phase 2+) |
| ownerKidName | string | no | Denormalized first-name only (DPDP — no last names public) |
| ownerKidAvatar | string | no | Denormalized avatar URL |
| durationSec | number | yes | Recording duration |
| caption | string | no | Optional kid-written caption (max 280 chars, safety-filtered) |
| visibility | string | yes | `private` (default) \| `public` \| `class` |
| status | string | yes | `draft` \| `published` \| `flagged` \| `archived` |
| moderation | map | yes | Same shape as `assets.moderation` — performance-level review on top of asset-level |
| viewCount | number | yes | Default 0 |
| likeCount | number | yes | Default 0 |
| reactionCounts | map | yes | `{ '👍': 0, '🎉': 0, ... }` — reuses `ALLOWED_REACTIONS` from classFeedTypes |
| shareUrl | string | yes | Public slug `/perform/{id}` |
| createdAt | timestamp | yes | Creation timestamp |
| updatedAt | timestamp | yes | Last modification |

**Indexes**:
- `parentCreationId` + `visibility` + `createdAt` (desc) — show performances on a creation's view page
- `ownerSessionId` + `createdAt` (desc) — "My Performances" tab (Phase 1)
- `ownerKidId` + `createdAt` (desc) — Phase 2+
- `visibility=public` + `status=published` + `likeCount` (desc) — Explore Performances trending
- `visibility=public` + `status=published` + `createdAt` (desc) — Explore Performances newest
- `parentCreationType` + `visibility=public` + `status=published` + `createdAt` (desc) — type-filtered Explore (Performances tab > Sing-Alongs filter)
- `shareUrl` — public lookup

**Reactions subcollection**: `performances/{id}/reactions/{reactorKidId}` — same shape as ClassFeed reactions (`{ emoji: ReactionEmoji, createdAt }`); positive-only whitelist; one reaction per reactor.

**Relationship to creations**:
- A creation can have 0..N performances (e.g. one song, many kids singing it).
- A performance can reference 0..1 creations (`parentCreationId` optional — standalone voice memos are valid).
- The creation viewer (`/view/{id}`) shows a "Performances" rail when 1+ public performances exist for it; the kid can tap into any.
- Performance card is a sibling type to creation card on `/creations` (My Creations) and `/explore` (Explore) — see ux-patterns.md `#performances-tab`.

---

### books

Books authored by kids in **Book Studio**. Distinct from `creations` because books are multi-session authoring artifacts (not one-shot AI generations) with locked size/format and a `pages` subcollection.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Document ID (auto-generated) |
| title | string | yes | Book title (max 100 chars) |
| author | string | yes | Author display name (kid's name or pen name) |
| status | string | yes | `draft` \| `complete` \| `published` |
| type | string | yes | Book type card the kid picked, e.g. `storybook`, `picture_book`, `about_me`, `family`, `travel`, `recipe`, `field_guide`, `fact_book`, `how_to`, `science_log`, `poem`, `joke`, `diary`, `quote`, `letter`, `sketchbook`, `wordless`, `abc_counting` (18 launch types) |
| bucket | string | yes | Underlying page-structure bucket: `narrative` \| `memoir_catalog` \| `entry_list` \| `collection` \| `concept` \| `visual` |
| format | string | yes | `text` \| `image` \| `text_image` |
| size | string | yes | **LOCKED at creation.** `square` (8"×8") \| `tall` (8.5"×11") \| `pocket` (5.5"×8.5") \| `landscape` (11"×8.5") |
| dimensions | map | yes | `{widthMm, heightMm, widthPx, heightPx}` derived from `size` at creation. Frozen. |
| typography | map | yes | `{titleFont, bodyFont, baseFontSize}`. Initial pick at creation; per-page overrides allowed via `pages.style`. |
| cover | map | yes | `{title, subtitle, authorName, backgroundColor, imageUrl, imagePrompt, font}` — front cover composition |
| backCover | map | no | `{text, imageUrl}` — optional back-cover blurb |
| pageCount | number | yes | Denormalized count of pages in subcollection (default 0) |
| pageLimit | number | yes | Tier cap: `5` (free) or `8` / `16` / `24` / `32` / `40` (paid kit choice) |
| themeColor | string | no | Accent color picked from kid-safe palette |
| sessionId | string | yes (P1) | Anonymous session ID |
| userId | string | no (P2) | Parent user ID |
| kidId | string | no (P2) | Kid profile ID |
| coverThumbnail | string | no | Cached thumbnail of front cover for library view |
| isPublic | boolean | yes | Whether published book is publicly viewable (default false) |
| publishedAt | timestamp | no | When status moved to `published` |
| pdfUrl | string | no | Cached PDF export URL (regenerated on publish) |
| printOrderEligible | boolean | yes | Always `false` for v1 — UI placeholder for future print partner |
| shareUrl | string | no | Public shareable URL slug (set on publish) |
| createdAt | timestamp | yes | Creation timestamp |
| updatedAt | timestamp | yes | Last modification |

**Lifecycle**:
- `draft` — created via wizard, kid is actively editing pages
- `complete` — kid clicked "Finish book" but hasn't published
- `published` — visible in library; PDF cached; share link enabled

**Locked-after-creation fields**: `size`, `dimensions`, `format`, `bucket`. Reason: changing these mid-authoring would re-flow every page. The wizard collects them as a one-shot lock-in.

**Indexes**:
- `sessionId` + `updatedAt` (desc) — author's library, most recently edited first
- `userId` + `updatedAt` (desc) — Phase 2 library
- `kidId` + `status` + `updatedAt` (desc) — Phase 2 kid library filtered by status
- `isPublic` + `publishedAt` (desc) — public book gallery (Phase 2+)
- `shareUrl` — lookup by share slug (unique, single-field)

**Page-count enforcement**: server validates `book.pageCount < book.pageLimit` before creating a new page document.

---

### books/{bookId}/pages

Subcollection of pages for a book. One document per page. Order maintained by `pageNumber`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Page ID (auto-generated) |
| pageNumber | number | yes | 1-indexed position; gaps allowed transiently during reorder |
| layout | string | yes | Layout variant for the bucket: `text_top_image_bottom` \| `image_top_text_bottom` \| `image_full_bleed` \| `text_only` \| `entry_centered` \| `recipe_split` \| `concept_letter` \| `gallery` |
| richText | map | no | TipTap JSON document (preserves bold/italic/underline, H1/H2, bullet/numbered lists, alignment, font + size + color overrides). Required when `format` ∈ {`text`, `text_image`}. |
| plainText | string | no | Flattened text auto-derived from `richText`. Used for grammar check + search. |
| imageUrl | string | no | Generated or uploaded illustration. Required when layout uses image. |
| imagePrompt | string | no | The prompt used to generate `imageUrl` (kid-supplied or auto-suggested). |
| imageStyle | string | no | Style hint passed to image client (e.g. `watercolor`, `cartoon`, `sketch`, `photo_real`). |
| voiceTranscriptRaw | string | no | Last raw voice-input transcript for audit (not displayed once kid accepts). |
| grammarSuggestions | array\<map\> | no | Pending Groq suggestions: `[{id, type, original, suggested, explanation, startIndex, endIndex, status}]` where `type` ∈ `grammar` \| `spelling` \| `punctuation` and `status` ∈ `pending` \| `accepted` \| `rejected`. Cleared once all resolved. |
| style | map | no | Per-page overrides: `{font, fontSize, alignment, textColor, backgroundColor}`. Falls back to book-level `typography`. |
| createdAt | timestamp | yes | Page creation |
| updatedAt | timestamp | yes | Last edit |

**Reorder protocol**: client sends new `[{pageId, pageNumber}]` array; server applies all updates in a single Firestore transaction, then bumps `books.updatedAt`.

**Indexes** (subcollection): single-field on `pageNumber` (asc) — load pages in order. No composite needed since subcollection is already scoped to one book.

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
| perStudioStreaks | map | no | Per-studio daily-activity streaks. Shape: `{ book: { count, lastDay }, story: { count, lastDay }, music: { count, lastDay }, quiz: { count, lastDay }, comic: { count, lastDay }, game: { count, lastDay } }`. `lastDay` is an ISO `YYYY-MM-DD` in the kid's local day. Increments when `lastDay` is yesterday, resets to 1 when older, no-ops same-day. Written transactionally by `updateSessionPoints` on the matching `track_creation` action. Drives per-studio streak displays and book/studio streak badges (see `lib/badges.ts`). |

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
| plan | string | yes | `free` \| `creator` \| `pro` \| `school` \| `admin` (see [Billing](#billing-plans--credits)) |
| planExpiresAt | timestamp | no | Subscription expiry — managed by Razorpay webhook |
| planRenewsAt | timestamp | no | Next auto-renewal date if `planStatus = active` |
| planStatus | string | no | `active` \| `canceled` \| `past_due` \| `trialing` — mirrors Razorpay subscription state |
| razorpaySubscriptionId | string | no | Razorpay subscription handle (for cancel/upgrade flows) |
| schoolId | string | no | Linked school (Phase 3) |
| preferences | map | no | `{language, notifications, theme}` |
| createdAt | timestamp | yes | Account creation |
| updatedAt | timestamp | yes | Last update |

---

### kids (Phase 2+)

Kid profiles. **Top-level collection** — `parentId` links back to `users/{userId}`. Each kid has their own credit balance (chosen architecture: per-kid wallet, not shared parent pool).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Kid profile ID (Firebase Auth UID or auto-generated) |
| name | string | yes | Kid's display name |
| age | number | no | Current age (set after parent/teacher verification) |
| grade | string | no | Class/grade (e.g., "5", "9") |
| board | string | no | `cbse` \| `icse` \| `state` |
| avatar | string | no | Legacy emoji-avatar id |
| mascotId | string | no | AI-buddy chosen during onboarding |
| avatarUrl | string | no | AI-generated avatar URL |
| parentId | string \| null | yes | Linked parent user ID (null for school-only kids) |
| schoolId | string \| null | yes | Linked school ID (null for parent-only kids) |
| verifiedBy | string \| null | yes | `parent` \| `teacher` \| null — DPDPA verifier |
| verifiedAt | timestamp | no | When the verifier signed off |
| totalCreations | number | yes | Lifetime creation count (default 0) |
| aiPoints | number | yes | AI Knowledge Points / XP — gamification only, NOT currency (default 0) |
| streak | map | no | `{current: 3, longest: 7, lastActiveDate: "..."}` |
| learningProgress | map | no | `{beginner: 0.4, intermediate: 0.0}` completion ratios |
| badges | array\<string\> | no | Earned badge IDs |
| plan | string | no | Effective plan for this kid: `free` \| `creator` \| `pro` \| `school` \| `admin`. Inherited from parent or school; cached here for fast guard checks. Default `free` if absent. |
| creditBalance | number | no | Cached **total** balance = `creditBalanceGrant + creditBalanceTopup`. Authoritative ledger is `kids/{kidId}/creditLedger`. Default `0`. |
| creditBalanceGrant | number | no | Unspent portion of the current monthly plan grant. Zeroed at each cycle (via `expire` + fresh `grant` ledger pair). Debits draw from this pool first. Default `0`. |
| creditBalanceTopup | number | no | Purchased + bonus credits. **Never expires.** Razorpay topups and admin `bonus` grants land here. Debits draw from this pool only after the grant pool is exhausted. Default `0`. |
| creditsMonthlyGrantAmount | number | no | Last monthly grant size (so we know how to refresh on reset). Mirrors `PLANS[plan].creditsPerMonth` at time of grant. |
| creditsMonthlyGrantedAt | timestamp | no | When the current monthly grant landed. |
| creditsMonthlyResetAt | timestamp | no | When the next monthly grant should fire (typically `creditsMonthlyGrantedAt + 30d`). |
| creditsLastDebitAt | timestamp | no | Last successful AI debit (telemetry). |
| createdAt | timestamp | yes | Profile creation |
| updatedAt | timestamp | yes | Last update |

**Credit-field invariants**:
- `creditBalance` is a denormalized cache; the ledger (subcollection) is the source of truth. A nightly reconciliation Cloud Function can recompute balance from ledger sums and flag drift.
- `creditBalance === creditBalanceGrant + creditBalanceTopup` at all times. The kid-doc write inside every transaction enforces this invariant.
- All ledger writes happen inside a Firestore transaction that also updates the pool fields atomically — clients never see a state that disagrees with the latest ledger entry.
- **Two-pool model**: `creditBalanceGrant` tracks the monthly-cycle pool (expires); `creditBalanceTopup` tracks the paid + bonus pool (never expires). Debits drain grant first so paid topups are spent last. The `expire` ledger entry zeroes only the grant pool when a new grant lands — topups are untouched.

---

### kids/{kidId}/creditLedger

Append-only audit log of every credit movement. Subcollection of kids. Never updated — only inserted. Drives both `creditBalance` reconciliation and parent-facing transaction history.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Ledger entry ID (auto-generated; sortable by `createdAt`) |
| type | string | yes | `grant` (monthly plan credits) \| `topup` (paid Razorpay purchase) \| `debit` (AI feature consumption) \| `refund` (manual reversal by admin or webhook) \| `expire` (monthly grant expiry) \| `bonus` (manual admin grant, e.g. support gesture) |
| amount | number | yes | Credit delta. Positive for grant/topup/refund/bonus, negative for debit/expire. |
| balanceAfter | number | yes | Resulting `creditBalance` after this entry. Lets us audit consistency. |
| feature | string | no | For `debit`: feature key from `CREDIT_COSTS` (e.g. `story.generate`, `image.sdxl`). Absent on grants/topups. |
| metadata | map | no | Free-form: `{ plan, sessionId, creationId, model, tokens }` for analytics. |
| paymentRef | string | no | For `topup`/`refund`: Razorpay payment or order ID. |
| paymentProvider | string | no | `razorpay` \| `stripe` \| `manual` (admin grant). |
| reversedBy | string | no | If this entry was later refunded, the ID of the refund entry. |
| expiresAt | timestamp | no | For `grant` entries: when the monthly grant expires (mirrors the kid doc `creditsMonthlyResetAt`). Topups omit this — they never expire. |
| createdAt | timestamp | yes | When the entry was written. |

**Indexes**:
- `createdAt` (desc) — single-field, default — recent-first transaction history
- `type` + `createdAt` (desc) — filter parent UI to "purchases" or "AI usage"

**Idempotency**: `topup` entries from Razorpay webhooks include `paymentRef` as a uniqueness check — webhook handler rejects duplicate `paymentRef` to handle delivery retries safely.

---

## Billing: Plans & Credits

The full billing model — plan definitions, credit costs per feature, capability matrix, and the `assertEntitled` guard — is implemented in `lib/billing/`:

- `lib/billing/plans.ts` — single config: each plan's display name, INR price, monthly credit grant. Used by both the marketing `Pricing.tsx` page and server-side enforcement.
- `lib/billing/entitlements.ts` — capability matrix per plan: `canExportPdf`, `priorityImageGen`, `maxBookPages`, `maxKidsPerAccount`, etc. Edit one row to move a feature between tiers.
- `lib/billing/creditCosts.ts` — `{ feature → credit cost }` map. Edit one number to reprice a feature.
- `lib/billing/guard.ts` — `assertEntitled(authCtx, { feature, capability })` is the single choke point every AI API route calls. Order: bypass check → entitlement check → credit cost lookup → atomic debit.
- `lib/billing/bypass.ts` — dev override. `BILLING_BYPASS=true` env flag or `BILLING_BYPASS_KIDS=uid1,uid2` allowlist. Refused in production unless `ALLOW_BILLING_BYPASS_IN_PROD=true`.

**What costs credits**: creative AI generation only — story, music, image, quiz, book pages, comic panels, beat-the-AI rounds. AI X-Ray, learn-tab content, and other learning surfaces are free. (Aligns with the product's "AI literacy first" positioning.)

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
| nextEventAt | timestamp | no | **Deprecated (Phase 3)** — legacy single-slot cursor. Superseded by the dual pending pointers below. Readable for backfill; no longer written. |
| pendingMilestoneEventId | string \| null | yes (P3) | Current pending milestone event, or null. Cleared on decide/expire. |
| pendingRegularEventId | string \| null | yes (P3) | Current pending regular event, or null. Cleared on decide. |
| nextMilestoneScheduledAt | timestamp \| null | yes (P3) | When the fixed-hour delivery cron should next mint a milestone for this business (default: today's IST 18:30 if not yet hit). |
| lastMilestoneDeliveredAt | timestamp \| null | yes (P3) | Set whenever a milestone event is minted (cron or register). Used by the daily-rhythm cron to detect "already delivered today". |
| dailyRegularEventCount | number | yes (P3) | Regulars minted today (IST day). Resets at IST midnight. |
| lastRegularEventDayUtc | string | yes (P3) | `YYYY-MM-DD` key of the last regular mint (for the reset). Kept in UTC for backwards compat; IST conversion happens in app code. |
| brandAssets | map \| null | no (P3) | Set by the Design Agent after BRAND milestone. `{ logoUrl: string, motto: string, voice: string, palette?: string[] }`. Referenced in every future event prompt so the arc coheres around the kid's brand. |
| createdAt | timestamp | yes | Business creation timestamp |
| updatedAt | timestamp | yes | Last update timestamp |
| completedAt | timestamp | no | Completion timestamp (when `status == 'completed'`) |

**Indexes**:
- `sessionId` + `createdAt` (desc) — session's businesses
- `userId` + `status` — user's active/completed businesses (Phase 2+)
- `nextEventAt` (asc) — scheduled event delivery scanner (legacy; still present for backfill)
- `status` + `nextMilestoneScheduledAt` (asc) — daily-rhythm milestone cron page (Phase 3)

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
| status | string | yes | `pending` \| `decided` \| `expired` (Phase 3: `expired` now also covers milestones that went stale overnight because the kid didn't answer before the next daily tick) |
| eventType | string | yes (P3) | `milestone` \| `regular` — first-class on the event doc (previously derived). Drives dual-pending-slot routing and phase-advance gating. |
| agentWorkflowId | string | no (P3) | When set (e.g. `brand.package`), the event is rendered through the agent-driven event card with a briefing + candidate review UX rather than the legacy A/B/C picker. |
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

### ceoAgentHires (Phase 3)

Kid CEO — each document is a single kid's "hire" of an agent for a specific business. Agent catalog itself (Design / Marketing / Ops / Finance / Customer Success / Product) lives in code (`lib/ceo/agents/catalog.ts`), not Firestore.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Hire ID (auto-generated) |
| userId | string | yes | Firebase Auth UID |
| kidId | string | yes | Kid profile ID (must match business.kidId) |
| businessId | string | yes | Parent business |
| agentId | string | yes | `design` \| `marketing` \| `ops` \| `finance` \| `customer_success` \| `product` |
| config | map | yes | Agent-specific config: `{ focus: string, aggressiveness: 'low'\|'medium'\|'high' }`. Different agents expose different focus options. |
| salary | number | yes | Daily salary in rupees (deducted from `business.currentCash` each IST midnight tick) |
| status | string | yes | `active` \| `paused` \| `dismissed` |
| hiredAt | timestamp | yes | Hire timestamp |
| updatedAt | timestamp | yes | Last config change |

**Indexes**:
- `businessId` + `status` — active hires for a business
- `kidId` + `businessId` — ownership lookup

Rule: server-write only; kid reads scoped to `kidId == auth.uid → activeKid`.

---

### ceoArtifacts (Phase 3)

Kid CEO — real artifacts produced by agent workflows (logos, mottos, posters, schedules, pricing strategies, etc.). Each artifact captures the full workflow trace for the "X-ray" view that makes the agent transparent.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Artifact ID |
| userId | string | yes | Firebase Auth UID |
| kidId | string | yes | Kid ID |
| businessId | string | yes | Parent business |
| agentHireId | string | yes | Originating hire |
| workflowId | string | yes | e.g. `brand.package`, `marketing.firstCampaign` |
| trigger | string | yes | `milestone`, `regular`, `manual`, `custom_workflow` |
| trace | array\<map\> | yes | Per-step trace — see structure below |
| assets | array\<map\> | yes | Output assets — polymorphic shape per asset type |
| status | string | yes | `candidate` \| `accepted` \| `rejected` \| `expired` |
| attachedTo | map | no | Where the accepted artifact landed: `{ kind: 'business_field', field: 'brandAssets' }` \| `{ kind: 'event', eventId: string }` \| `{ kind: 'marketing_feed' }` |
| decisionEventId | string | no | Event this artifact resolved (if any) |
| costInr | number | yes | Estimated total LLM + image-model cost across the trace |
| createdAt | timestamp | yes | Creation timestamp |
| acceptedAt | timestamp | no | When kid accepted (null for rejected/expired) |

**Trace step structure** (inside `trace` array):
```json
{
  "stepId": "logo_candidates",
  "tool": "flux_schnell",
  "model": "black-forest-labs/FLUX.1-schnell",
  "promptTokens": 0,
  "completionTokens": 0,
  "costInr": 3.2,
  "inputSummary": "tropical lemonade stand, playful, for kids my age",
  "outputSummary": "3 images generated (512x512)",
  "latencyMs": 2140
}
```

**Asset shapes** (inside `assets` array — discriminated by `type`):
```
{ type: 'image',     kind: 'logo'|'poster',  url, caption, altText, widthPx, heightPx }
{ type: 'text',      kind: 'motto'|'voice'|'post'|'checklist'|'rationale', content }
{ type: 'palette',   colors: ['#HEX', ...] }
{ type: 'schedule',  days: [{ day, open, close, notes }] }
{ type: 'pricing_strategy', price, rationale, breakEvenUnits }
```

**Indexes**:
- `businessId` + `createdAt` (desc) — artifact feed for a business
- `kidId` + `status` + `createdAt` (desc) — "all my accepted artifacts" view
- `agentHireId` + `createdAt` (desc) — per-agent history

---

### ceoCustomWorkflows (Phase 3 — Workflow Builder)

Kid CEO — custom agentic workflows kids author visually in the Scale-phase workflow builder. Serialised `WorkflowSpec` JSON is the single source of truth.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Workflow ID |
| userId | string | yes | Firebase Auth UID |
| kidId | string | yes | Kid ID |
| businessId | string | yes | Parent business |
| name | string | yes | Kid-chosen name |
| trigger | string | yes | Registered trigger ID (e.g. `customer_feedback_negative`) |
| spec | map | yes | Serialised `WorkflowSpec`: steps, tool IDs, prompts, output schema |
| status | string | yes | `active` \| `disabled` |
| runCount | number | yes | Lifetime fires |
| lastRunAt | timestamp \| null | no | Most recent fire |
| createdAt | timestamp | yes | Created |
| updatedAt | timestamp | yes | Last edited |

**Indexes**:
- `businessId` + `status` — active workflows for a business
- `kidId` + `updatedAt` (desc) — kid's recent workflows

Custom-workflow prompts pass through `filterInput` on save and `filterOutput` on every run. The trigger / tool vocabulary is closed — saved specs referencing unknown IDs are rejected at save time.

---

### learnProgress (Phase 3 — AI Lab)

Per-kid progress through the AI Lab's Foundation cards and Workshops. Drives the Learn index dashboard and unlocks gated content.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | `{kidId}` — doc ID |
| userId | string | yes | Firebase Auth UID |
| kidId | string | yes | Kid ID |
| foundationsCompleted | array\<string\> | yes | IDs of completed Foundation cards |
| workshopsCompleted | array\<map\> | yes | `{ workshopId, completedAt, artifactId? }` |
| embedsTried | array\<string\> | yes | IDs of tried Hugging Face Space embeds |
| cbseTagsCovered | array\<string\> | yes | Unique CBSE tags from completed content — powers the curriculum-coverage dashboard |
| createdAt | timestamp | yes | First interaction |
| updatedAt | timestamp | yes | Last interaction |

**Indexes**:
- `kidId` — unique lookup by kid (doc ID)

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

School accounts for B2B. Teachers register against an existing school record using `schoolCode`; the first teacher becomes `adminUid`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | School ID |
| name | string | yes | School name |
| board | string | yes | `cbse` \| `icse` \| `state` |
| city | string | yes | City |
| state | string | yes | State |
| schoolCode | string | yes | Short human-readable code used during teacher registration (unique) |
| plan | string | yes | `trial` \| `basic` \| `premium` |
| studentCount | number | yes | Current student headcount (denormalized) |
| adminUid | string | yes | Primary admin (teacher/principal) user ID |
| teacherIds | array\<string\> | yes | All teacher user IDs for this school |
| createdAt | timestamp | yes | Registration date |
| updatedAt | timestamp | yes | Last update timestamp |

**Indexes**:
- `schoolCode` — unique lookup during teacher registration

---

### schools/{schoolId}/classes (Phase 3)

Classes live as a subcollection under schools. Each class has a unique 6-char `inviteCode` that students enter to join.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Class ID |
| schoolId | string | yes | Parent school (denormalized for queries) |
| name | string | yes | Class name (e.g., "Class 5A") |
| grade | string | yes | Grade level (`3`–`12`) |
| section | string | no | Optional section letter (e.g., "A") |
| teacherUid | string | yes | Assigned teacher user ID |
| studentKidIds | array\<string\> | yes | Kid profile IDs in this class |
| inviteCode | string | yes | 6-char alphanumeric code — unique across all classes |
| createdAt | timestamp | yes | Creation timestamp |
| updatedAt | timestamp | yes | Last update timestamp |

**Indexes**:
- `inviteCode` — collection-group unique lookup when a kid joins via code
- `teacherUid` + `createdAt` (desc) — teacher's classes
- `schoolId` + `createdAt` (desc) — all classes in a school

---

### assignments (Phase 3, top-level)

Teacher-created assignments. Stored as a top-level collection (not nested under schools) so teachers can query `where('teacherUid', '==', uid)` across all their classes efficiently.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Assignment ID |
| schoolId | string | yes | Owning school |
| classId | string | yes | Target class |
| teacherUid | string | yes | Creating teacher |
| title | string | yes | Assignment title |
| description | string | yes | Instructions |
| creationType | string | yes | `story` \| `music` \| `quiz` \| `game` \| `comic` |
| dueDate | timestamp | yes | Deadline |
| curriculumTags | array\<string\> | yes | Curriculum concept IDs (from `lib/curriculum/curriculumMap.ts`) |
| templateId | string | no | Optional creation template to pre-fill |
| status | string | yes | `active` \| `closed` |
| submissions | number | yes | Denormalized submission count (default 0) |
| createdAt | timestamp | yes | Creation timestamp |
| updatedAt | timestamp | yes | Last update timestamp |

**Indexes**:
- `teacherUid` + `createdAt` (desc) — teacher's assignments across classes
- `classId` + `dueDate` (asc) — pending assignments for a class/student
- `schoolId` + `createdAt` (desc) — all assignments in a school (analytics)

---

### submissions (Phase 3, top-level)

A submission represents a kid's creation submitted to a specific assignment. One submission per `(assignmentId, kidId)` pair — re-submissions update the existing doc.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | auto | Submission ID |
| assignmentId | string | yes | Parent assignment |
| classId | string | yes | Denormalized class ID |
| schoolId | string | yes | Denormalized school ID |
| kidId | string | yes | Student kid profile |
| creationId | string | yes | The creation that was submitted |
| status | string | yes | `pending` \| `approved` \| `revision_requested` |
| feedback | string | no | Teacher's written feedback |
| starred | boolean | no | Teacher-marked as exemplary |
| reviewedBy | string | no | Teacher UID who reviewed |
| reviewedAt | timestamp | no | When reviewed |
| submittedAt | timestamp | yes | When the kid hit submit |
| createdAt | timestamp | yes | First submission timestamp |
| updatedAt | timestamp | yes | Last update timestamp |

**Indexes**:
- `assignmentId` + `submittedAt` (desc) — teacher's submission grid
- `kidId` + `createdAt` (desc) — a kid's submission history
- `classId` + `status` — per-class status breakdown
- `assignmentId` + `kidId` — uniqueness check on re-submit

**Creation linkage**: when a submission is created the referenced `creations/{creationId}` doc is updated with `assignmentId`, `classId`, and `schoolId` for analytics queries.

---

### schoolAnalytics (Phase 3)

Cached per-school aggregate metrics, refreshed daily by a scheduled Netlify function and on-demand from the admin dashboard. One doc per school (ID = `schoolId`).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| schoolId | string | yes | School ID (also the document ID) |
| totalStudents | number | yes | Total kid profiles linked to any class in the school |
| activeStudentsThisWeek | number | yes | Distinct kids with at least one creation in last 7 days |
| totalCreations | number | yes | Lifetime creations from kids in this school |
| creationsThisWeek | number | yes | Creations in last 7 days |
| creationsByType | map | yes | `{story, music, quiz, game, comic}` lifetime counts |
| curriculumCoverage | array\<map\> | yes | `[{conceptId, conceptName, studentsExposed, percentage}]` — one per concept |
| teacherActivity | array\<map\> | yes | `[{teacherUid, teacherName, classes, assignmentsCreated, avgCompletionRate, lastActiveAt}]` |
| weeklyTrend | array\<map\> | yes | `[{week: 'YYYY-Www', creations, students}]` — last 8 weeks |
| updatedAt | timestamp | yes | Last refresh timestamp |

## Platform Configuration

Top-level `config` collection — a small set of singleton documents that hold
runtime-tunable platform settings. Designed so ops can flip values from the
Firebase console without a code deploy; in-code defaults provide a safe
fallback if a doc is missing.

### config/studios (LAUNCH-001)

Single document at `config/studios`. Drives the LIVE / BETA / COMING_SOON pill
shown on studio cards across the app (mobile hub portal cards, dashboard studio
selector, dashboard featured cards, etc.).

| Field | Type | Required | Description |
|---|---|---|---|
| studios | map<StudioId, StudioConfig> | yes | Per-studio launch state |
| updatedAt | timestamp | yes | Last edit timestamp (auditing) |
| updatedBy | string | no | Email of admin who last edited (auditing) |

**StudioConfig**:

| Field | Type | Required | Description |
|---|---|---|---|
| launchState | string | yes | One of `'live' \| 'beta' \| 'coming-soon'` |
| label | string | no | Display label override; defaults to in-code constant |
| updatedAt | timestamp | no | Per-studio last-edit timestamp |

**StudioId** (enum, locked at LAUNCH-001 ship): `'book' \| 'story' \| 'music' \| 'quiz' \| 'comic' \| 'game'`. Play-group modes (Kid CEO, MindX, Beat the AI) and Learn-group modes (AI Lab, Explore) are not part of this config; they keep their own per-mode `badge` field in `components/game-hub/shared/GameModes.ts`.

**Default state at LAUNCH-001 ship**: `book` = `'live'`, all others = `'beta'`. Defined in both `lib/config/studioLaunchState.ts` (server) and `lib/config/studioLaunchStateDefaults.ts` (client-safe, no firebase-admin import). The two files must stay in sync — same dual-file pattern as `creditCosts.ts` / `creditCostsDefaults.ts`.

**No composite index needed** — single-document lookup via `.doc('studios').get()`.

**Cache contract**: `GET /api/config/studios` serves with `Cache-Control: public, max-age=60, stale-while-revalidate=300`. A console flag flip propagates within ~60s of the next page load.

## Security Rules (Firestore)

```
Phase 1:
- creations: read=public (isPublic==true), write=via server only (Netlify Functions)
- sessions: read/write=via server only
- Kid CEO (ceoBusiness, ceoEvents, ceoProfiles): server-write only; ceoProfiles public read when isPublic==true
- Bot (botSessions, botLinkCodes, homeworkSessions): server-write only
- config/{configId}: read=public, write=server only (LAUNCH-001 — display config, same risk profile as creditCosts)

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

---

## Phase 4: School Productivity Suite Collections

The Phase 4 roadmap (`stories/phase-4/`) adds collections for HPC narratives, question papers, lesson plans, parent messaging, DPDP consent & erasure, teacher timetables, ERP integration config, notifications, and eval/compliance caches. All writes flow through Admin SDK in server routes (client writes blocked at `firestore.rules`).

### hpcNarratives (subcollection under students)

Path: `schools/{schoolId}/students/{kidId}/hpcNarratives/{term}`

| Field | Type | Required | Description |
|---|---|---|---|
| id | string | yes | Term ID, e.g. `2026-T2` |
| kidId | string | yes | Student reference |
| schoolId | string | yes | Scope |
| term | string | yes | Academic term identifier |
| locale | string | yes | `'en'` or `'hi'` |
| cognitive | string | yes | Paragraph |
| affective | string | yes | Paragraph |
| psychomotor | string | yes | Paragraph |
| nextTermFocus | string | no | Teacher guidance paragraph |
| teacherTags | array\<string\> | yes | Teacher quick-tags feeding the draft |
| status | string | yes | `'draft' \| 'published'` |
| aiUsageRecordId | string | yes | Back-reference to teacherAiUsage |
| createdAt | timestamp | yes | First draft time |
| updatedAt | timestamp | yes | Last edit |

### questionPapers (top-level, teacher-scoped)

| Field | Type | Required | Description |
|---|---|---|---|
| id | string | yes | Auto ID |
| teacherUid | string | yes | Owner |
| schoolId | string | yes | Scope |
| subject | string | yes | e.g. `'Mathematics'` |
| classGrade | string | yes | `'6' \| '7' \| ... \| '12'` |
| chapters | array\<string\> | yes | NCERT chapter IDs |
| blueprint | map | yes | `{ bloomsDistribution, difficultyMix, questionTypes }` |
| totalMarks | number | yes | |
| durationMinutes | number | yes | |
| sections | array\<map\> | yes | `[{ title, questions: [{ id, type, text, marks, answerKey, bloom }] }]` |
| locale | string | yes | |
| status | string | yes | `'draft' \| 'finalized'` |
| createdAt / updatedAt | timestamp | yes | |

### lessonPlans (top-level, teacher-scoped)

| Field | Type | Required | Description |
|---|---|---|---|
| id | string | yes | Auto ID |
| teacherUid | string | yes | Owner |
| subject, classGrade, chapterId | string | yes | Source |
| durationMinutes | number | yes | |
| learningOutcomes | array\<string\> | yes | NCERT-tagged |
| hookActivity, closure | string | yes | |
| mainActivity | map | yes | `{ title, description, linkedStudio? }` |
| assessment | map | yes | `{ type, sample }` |
| differentiation | map | yes | `{ lower, higher }` |
| materials | array\<string\> | no | |
| locale | string | yes | |
| linkedAssignmentId | string | no | Set when assignment created from lesson |
| createdAt / updatedAt | timestamp | yes | |

### parentDigests (top-level)

| Field | Type | Required | Description |
|---|---|---|---|
| id | string | yes | |
| kidId, schoolId, teacherUid | string | yes | |
| weekStart | timestamp | yes | Monday of the digest week |
| content | map | yes | `{ creations, concepts, teacherNote, upcoming, summary }` |
| locale | string | yes | |
| status | string | yes | `'draft' \| 'approved' \| 'sent' \| 'failed'` |
| commsLogIds | array\<string\> | no | Delivery log refs (one per send attempt) |
| createdAt / updatedAt | timestamp | yes | |

### commsLog (top-level, audit log)

| Field | Type | Description |
|---|---|---|
| id | string | |
| recipientUid | string | Parent uid |
| kidId | string | Subject child |
| channel | string | `'telegram' \| 'whatsapp' \| 'sms' \| 'email' \| 'in_app'` |
| templateId | string | Registered message template |
| messageId | string | Provider message ID |
| status | string | `'queued' \| 'sent' \| 'delivered' \| 'read' \| 'failed'` |
| error | string | If failed |
| sentAt, deliveredAt, readAt | timestamp | |

### parentChannelPrefs (subcollection under users)

Path: `users/{parentUid}/channelPrefs/{channel}` — one per channel opt-in.

| Field | Type | Description |
|---|---|---|
| channel | string | |
| handle | string | Phone for WhatsApp / SMS, chat ID for Telegram, email addr for email |
| consentStatus | string | `'granted' \| 'revoked'` |
| consentedAt, revokedAt | timestamp | |
| locale | string | Parent's preferred language |

### consentLog (top-level, DPDP audit)

| Field | Type | Description |
|---|---|---|
| id | string | |
| parentUid, kidId | string | |
| scope | string | `'ai_generation' \| 'data_storage' \| 'parent_messaging' \| 'peer_sharing' \| 'analytics'` |
| granted | bool | |
| method | string | `'otp_affirmation' \| 'digilocker' \| 'revocation'` |
| ip, userAgent | string | Evidence |
| timestamp | timestamp | |

### erasureRequests (top-level)

| Field | Type | Description |
|---|---|---|
| id | string | |
| parentUid, kidId | string | |
| reason | string | Optional |
| status | string | `'pending' \| 'in_progress' \| 'completed' \| 'failed'` |
| cascadeSummary | map | Per-collection delete counts |
| receiptUrl | string | Signed receipt location |
| createdAt, completedAt | timestamp | Must complete within 30 days |

### teacherTimetable

Path: `teacherTimetable/{schoolId}/teachers/{teacherUid}`

| Field | Type | Description |
|---|---|---|
| periods | map | `{ monday: [{periodIdx, subject, classId}], tuesday: [...], ... }` |
| subjects | array\<string\> | Teacher's subject specializations |
| seniority | number | Years of experience (for sub ranking) |
| updatedAt | timestamp | |

### erpIntegrations (top-level, one per school)

| Field | Type | Description |
|---|---|---|
| schoolId | string | Document ID |
| provider | string | `'local' \| 'fedena' \| 'mastersoft' \| 'schoollog' \| 'neverskip'` |
| credentialsRef | string | KMS-encrypted reference |
| lastSyncAt | timestamp | |
| lastSyncStatus | string | `'success' \| 'failure'` |
| lastError | string | |
| enabled | bool | |

### notifications (subcollection under users)

Path: `users/{uid}/notifications/{id}`

| Field | Type | Description |
|---|---|---|
| id | string | |
| type | string | `'assignment_new' \| 'assignment_due_soon' \| 'submission_reviewed' \| 'badge_earned' \| 'teacher_feedback' \| 'sub_assigned'` |
| payload | map | Type-specific context |
| channels | array\<string\> | Channels attempted |
| readAt | timestamp | Null = unread |
| createdAt | timestamp | |

### userNotificationPrefs (map on user doc)

Stored directly on `users/{uid}.notificationPrefs` — `{ [type]: { in_app: bool, email: bool, telegram: bool, whatsapp: bool } }`.

### teacherAiUsage (top-level, analytics + compliance)

| Field | Type | Description |
|---|---|---|
| id | string | |
| teacherUid, schoolId | string | |
| generator | string | `'hpc' \| 'questionPaper' \| 'feedback' \| 'lessonPlan' \| 'ptm' \| 'digest' \| 'adhoc' \| 'subInstructions'` |
| timestamp | timestamp | |
| kidId | string | If scoped to a student |
| tokensIn, tokensOut | number | For cost visibility |
| locale | string | |

### complianceCache (per school)

| Field | Type | Description |
|---|---|---|
| schoolId | string | Document ID |
| version | string | `'v1' \| 'v2'` |
| dateRange | map | `{ from, to }` |
| generatedAt | timestamp | |
| ttlExpires | timestamp | 1 day later |
| pdfUrl | string | Signed URL to cached PDF in Storage |
| dataRegisterSnapshot | map | DPDP register at generation time |

### Phase 4 Firestore Rules (extensions)

```
- schools/{schoolId}/students/{kidId}/hpcNarratives/{term}: server-only write; read for school teachers + schoolAdmin + kid's parent
- questionPapers, lessonPlans: server-only write; read for teacher owner + schoolAdmin of same school
- parentDigests, commsLog: server-only write; read for teacher + schoolAdmin
- consentLog, erasureRequests: server-only write; read for parent + schoolAdmin (DPO view)
- teacherTimetable: server-only write; read for schoolAdmin + teacher self
- erpIntegrations: server-only write; read for schoolAdmin only
- users/{uid}/notifications: server-only write; read/update for owner only
- teacherAiUsage, complianceCache: server-only write; read for schoolAdmin only
```
