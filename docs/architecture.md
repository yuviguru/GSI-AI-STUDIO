# GSI AI Studio — Architecture

## System Overview

GSI AI Studio is a serverless PWA built on Next.js (Netlify) + Firebase, designed for zero-ops overhead as a solo developer project. The frontend handles all UI and creation workflows, Firebase provides auth/database/storage/functions, and external AI APIs (Claude, Replicate, Suno) power the creation engines. The architecture prioritizes fast iteration, low cost, and progressive enhancement from anonymous playground to authenticated creator platform.

### Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │  Browser     │  │  PWA (Mobile)│  │  Shared Link│  │  Telegram    │  │
│  │  (Desktop)   │  │  (Installed) │  │  (View Only)│  │  (chat app)  │  │
│  └──────┬───────┘  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘  │
└─────────┼─────────────────┼────────────────┼────────────────┼──────────┘
          │                 │                │                │
          ▼                 ▼                ▼                ▼
┌────────────────────────────────────────────────────┐  ┌─────────────────┐
│              NETLIFY (Frontend Host)                │  │  MESSENGERS      │
│  ┌────────────────────────────────────────────┐   │  │  ┌────────────┐ │
│  │  Next.js PWA (Static + SSR)                │   │  │  │ Telegram   │ │
│  │  ├── /create/* — Creation studio pages     │   │  │  │ Bot API    │ │
│  │  ├── /ceo/* — Kid CEO business sim         │   │  │  │ (Grammy)   │ │
│  │  ├── /view/* — Public creation viewer      │   │  │  └─────┬──────┘ │
│  │  ├── /learn/* — AI learning paths          │   │  │        │        │
│  │  └── /dashboard/* — User dashboard (P2)    │   │  │  ┌─────┴──────┐ │
│  └────────────────────────────────────────────┘   │  │  │@GSIStudio  │ │
│  ┌────────────────────────────────────────────┐   │  │  │Bot         │ │
│  │  Next.js API Routes (Serverless)           │   │  │  └────────────┘ │
│  │  ├── /api/ai/* — AI generation (5 studios) │   │  │  ┌────────────┐ │
│  │  ├── /api/creations/* — CRUD + explore     │   │  │  │@GSIKidCeo  │ │
│  │  ├── /api/sessions/* — Rate limit + points │   │  │  │Bot         │ │
│  │  ├── /api/share/* — Shareable links        │   │  │  └────────────┘ │
│  │  ├── /api/ceo/* — CEO sim (register,event, │   │  │                 │
│  │  │   decide, business, profile)            │   │  │  WhatsApp (P2)  │
│  │  └── /api/bot/link/* — link token mint     │   │  │  Cloud API      │
│  └────────────────────────────────────────────┘   │  │  (adapter only) │
│  ┌────────────────────────────────────────────┐   │  └────────┬────────┘
│  │  Bot Webhook Gateway (Netlify Functions)   │◀──┼───────────┘
│  │  ├── telegram-webhook-studio.ts            │   │
│  │  │   (homework, challenge, skills,         │   │
│  │  │    notifications modules)               │   │
│  │  └── telegram-webhook-ceo.ts               │   │
│  │       (ceo module only)                    │   │
│  │  Both share lib/bot/ (adapter, router,     │   │
│  │  context, services, modules)               │   │
│  └────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
          │                 │                │
          ▼                 ▼                ▼
┌──────────────────────────────────────────────────────────┐
│                   FIREBASE SERVICES                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│  │  Firestore   │ │  Auth        │ │  Cloud Storage   │ │
│  │  (Database)  │ │  (Phone OTP) │ │  (Media Files)   │ │
│  └──────────────┘ └──────────────┘ └──────────────────┘ │
│  ┌──────────────┐ ┌──────────────────────────────────┐  │
│  │  Cloud       │ │  Firebase Hosting (backup/CDN)   │  │
│  │  Functions   │ │                                  │  │
│  └──────────────┘ └──────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌──────────────────────────────────────────────────────────┐
│                   EXTERNAL AI SERVICES                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│  │  LLM (Text)  │ │  Image Gen   │ │  Music Gen       │ │
│  │  Groq →      │ │  ComfyUI →   │ │  Lyria →         │ │
│  │  Claude      │ │  Replicate → │ │  Replicate →     │ │
│  │  (fallback)  │ │  Pollinations│ │  Mock (fallback) │ │
│  │  - Stories   │ │  (fallback)  │ │                  │ │
│  │  - Quizzes   │ │  - Story art │ │  - Music creation│ │
│  │  - Games     │ │  - Comic art │ │                  │ │
│  │  - Comics    │ │  - Game art  │ │                  │ │
│  │  - AI X-Ray  │ │              │ │                  │ │
│  │  - CEO events│ │              │ │                  │ │
│  └──────────────┘ └──────────────┘ └──────────────────┘ │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│  │  STT (Voice) │ │  TTS         │ │  OCR             │ │
│  │  Groq Whisper│ │  Google Cloud│ │  Google Cloud    │ │
│  │  (large-v3)  │ │  TTS (hi+en) │ │  Vision          │ │
│  │  (Phase 2)   │ │  (Phase 2)   │ │  (Phase 2)       │ │
│  └──────────────┘ └──────────────┘ └──────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

## Components

### Frontend (Next.js PWA)
**Tech**: Next.js 14+ (App Router), React, Tailwind CSS, next-pwa
**Host**: Netlify
**Responsibilities**:
- Creation studio UIs (Story, Music, Quiz, Game, Comic — 5 studios)
- AI X-Ray learning popups
- AI Points, badges, and celebration system
- Koko mascot with expressions and speech bubbles
- Shareable creation viewer (SSR for OG tags/SEO)
- Explore feed (public creations) and My Creations gallery
- PWA shell (installable, offline-capable basics)
- Anonymous session management (Phase 1)
- Authenticated user flows (Phase 2+)

**Key Directories**:
```
app/
├── (public)/           # No-auth pages
│   ├── page.tsx        # Landing / playground entry
│   ├── create/         # Creation studios
│   │   ├── story/      # Story Studio
│   │   ├── music/      # Music Lab
│   │   ├── quiz/       # Quiz Maker
│   │   ├── game/       # Game Studio (text adventures)
│   │   └── comic/      # Comic Studio (multi-panel)
│   ├── ceo/            # Kid CEO business sim (register/play/profile/leaderboard)
│   ├── explore/        # Public creations feed
│   ├── creations/      # My Creations gallery
│   └── view/[id]/      # Public creation viewer (SSR)
├── (auth)/             # Phase 2: authenticated pages
│   ├── dashboard/      # User dashboard
│   ├── portfolio/      # Creator portfolio
│   └── settings/       # Account settings
├── api/                # Next.js API routes (serverless on Netlify)
│   ├── ai/             # AI generation (story, music, quiz, game, comic)
│   ├── creations/      # Creation CRUD + public feed + downloads
│   ├── sessions/       # Session management + points/badges
│   ├── share/          # Share link creation
│   ├── ceo/            # Kid CEO sim (register, event, decide, business, profile)
│   └── bot/link/       # Mints one-time link tokens for web↔bot auth binding
└── layout.tsx          # Root layout with PWA manifest
```

**New API groups** (introduced alongside Kid CEO + shared bot layer):
- `api/ceo/*` — Handlers for the business simulation: `register` (create business + seed events), `event` (generate next event via LLM), `decide` (score + advance phase), `business` (current state), `profile` (6-dimension CEO card), `leaderboard` (Phase 2).
- `api/bot/link/*` — Mints short-lived, single-use link tokens used by the Telegram deep-link flow (`/start link_<token>`) to bind a chat ID to a logged-in web user. Backed by the `botLinkCodes` Firestore collection (server-write-only, 10-minute TTL).

### Backend (Firebase + Netlify Functions)
**Tech**: Firebase SDK, Netlify Functions (Node.js)
**Responsibilities**:
- AI API proxying with rate limiting and safety filters
- Creation storage and retrieval
- User authentication (Phase 2+)
- Media file storage
- Analytics event tracking

**Why split between Netlify Functions and Firebase**:
- Netlify Functions: AI proxy (keeps API keys server-side), OG image generation, share link creation — things tightly coupled to the frontend
- Firebase Cloud Functions: Background tasks (creation processing, notification triggers, scheduled jobs) — things that run independently

### Database (Firestore)
**Tech**: Firebase Firestore (NoSQL)
**Key Collections**: See `data-model.md` for complete schema
**Why Firestore**:
- Zero ops — no server to manage
- Real-time listeners (for live creation updates)
- Scales automatically
- Free tier covers Phase 1 (50K reads/day, 20K writes/day)
- Firebase Auth integration is native

### Storage (Firebase Cloud Storage)
**Purpose**: Generated media files (images, audio, creation assets)
**Strategy**:
- AI-generated images → Cloud Storage with CDN
- Audio files (music creations) → Cloud Storage
- Creation thumbnails → Cloud Storage (auto-generated)
- Public read access for shared creations, write access requires auth or server-side

### Kid CEO (Business Simulation)

**What it is**: A 30/60/90-day kid-friendly business simulation ported from the internal FoundersDNA/SimPrenuer project (`C:\Yuvi\Development\SimPrenuer`). The kid picks a business type, runs it through 5 phases, responds to events (school fair, local trend, cash crunch, etc.), and ends with a shareable CEO profile card scored across 6 dimensions. Target age **10+**. Delivery is **dual-channel**: in-app route group plus a dedicated Telegram bot `@GSIKidCeoAssistantBot`. Same Firestore state backs both — the kid can start on web and continue in chat.

**Route group**:
```
app/(public)/ceo/
├── page.tsx           # Landing — "Start Your Business"
├── register/          # Business registration wizard
├── play/              # Main sim — event feed + decisions
├── profile/           # CEO Profile Card (6 dimensions)
└── leaderboard/       # Phase 2 — compare with friends
```

**Engine (`lib/ceo/`)**: Ported from the SimPrenuer JavaScript source and rewritten in TypeScript. Pure, deterministic, unit-testable — no framework coupling.
- `phases.ts` — 5-phase state machine + milestone DAG
- `eventEngine.ts` — Builds LLM prompts, parses events, applies safety pipeline
- `scoringEngine.ts` — Scores a kid's decision against dimensions, updates business state
- `profileEngine.ts` — Aggregates decisions into the 6-dimension CEO profile card
- `businessState.ts` — Serializable business state (cash, reputation, inventory, metrics)

**LLM usage**: Event generation and decision scoring both use the **existing** AI clients — `lib/ai/groqClient.ts` (primary, llama-3.3-70b) with `lib/ai/claudeClient.ts` as fallback. No new LLM clients are introduced. CEO-specific system prompts live in `lib/ceo/prompts/`.

**Firestore collections**: `ceoBusiness`, `ceoEvents`, `ceoProfiles` — see `docs/data-model.md` for full schemas. Server-write-only via Admin SDK, following the same pattern as `creations`.

**Integration with existing systems**:
- **AI Points + badges**: CEO milestones (first event, phase complete, business launched, 90-day finish) award points and unlock new CEO-specific badges via the existing `lib/badges.ts` catalog and `checkBadgeUnlocks()` flow.
- **Koko mascot**: Reused as the "business advisor" persona — same component, new speech-bubble copy keyed off CEO state. No new mascot art required in v1.
- **Shareable profile cards**: The CEO Profile Card is published through the existing `/view/[id]` SSR viewer, using the same OG-tag and thumbnail pipeline as story/comic creations.
- **Safety pipeline**: All user-entered strings (business name, decision answers) and LLM output (event text) run through the existing `lib/safety/` pipeline — the same profanity/PII/age-appropriate filters used by the creation studios. CEO events are kid-safe by design (no finance realism, no adult scenarios).

### Unified Telegram Bot Layer

**Two bots, one codebase**: GSI AI Studio ships two Telegram bot instances that share a single `lib/bot/` infrastructure (adapter, router, context, services, feature modules). Each bot instance registers only the modules it needs.

| Bot Handle | Modules | Role |
|---|---|---|
| `@GSIPersonalAssistantBot` | `homework`, `challenge`, `skills`, `notifications` | Day-to-day studio companion + outbound alerts (creation ready, weekly progress) |
| `@GSIKidCeoAssistantBot` | `ceo` only | Dedicated chat for the long-running business sim |

**Why two bots instead of one**:
- The CEO sim runs for 30/60/90 days of real time — it deserves its own chat context so the scrollback stays focused on the business, not interleaved with homework tasks or creation alerts.
- Clean command namespaces — no collisions between `/help` for CEO vs. `/help` for homework.
- Independent positioning — parents/schools can discover `@GSIKidCeoAssistantBot` as a standalone "Run your first business" offering without first understanding the full studio.
- Independent deploy cadence — a CEO-only change never risks regressing the studio bot, and vice versa.

**Deployment**: Two Netlify Functions, one webhook per bot, both stateless and webhook-mode (no long polling):
```
netlify/functions/telegram-webhook-studio.ts   # registers studio modules
netlify/functions/telegram-webhook-ceo.ts      # registers ceo module only
```
Both import from the shared `lib/bot/` tree. Scaling is handled by Netlify's function runtime — no persistent process to manage.

**Shared services (`lib/bot/services/`)**:
- **Groq Whisper STT** (`whisper-large-v3`) — Transcribes voice messages for recitation (Skill Arena) and spoken answers. Uses the existing `GROQ_API_KEY`.
- **Google Cloud Text-to-Speech** — Hindi + English read-aloud and dictation output. Primary TTS provider in v1.
- **Google Cloud Vision OCR** — Extracts text from forwarded homework images and PDFs (the "snap your homework" flow in the homework module).
- **Reused LLM pipeline** — Bot handlers call the same `groqClient` / `claudeClient` used by web; no duplicate clients.

**Auth binding (web ↔ bot)**: A logged-in web user binds their Telegram chat to their account via a short-lived, single-use link token:
1. **Primary flow — deep link**: Web UI calls `POST /api/bot/link/create`, server mints a token, web renders `https://t.me/GSIKidCeoAssistantBot?start=link_<token>`. Kid taps it, Telegram opens the bot with `/start link_<token>`, the webhook validates the token, writes `botSessions/{chatId}` with the linked userId, and marks the token used.
2. **Fallback — 6-digit code**: Same endpoint also returns a 6-digit display code. If the deep link fails (paste / old Telegram client), the kid opens the bot manually and types `/link 823914`. Same validation, same outcome.

Tokens are stored in the `botLinkCodes` collection (server-write-only, 10-minute TTL, single-use, bot-scoped so a Studio token cannot be redeemed on the CEO bot).

**Firestore collections**: `botSessions`, `botLinkCodes`, `homeworkSessions` — see `docs/data-model.md` for schemas.

**Extensibility**:
- **WhatsApp (Phase 2)** — Plugs in via the `MessengerAdapter` interface. A new `WhatsAppAdapter` implementation wraps the Meta Business Cloud API; feature modules (homework, challenge, ceo, etc.) require **zero changes** because they only consume the normalized `BotIncomingMessage` / `BotOutgoingMessage` types.
- **Discord (Phase 3)** — Same story, different adapter (`discord.js`).
- **Adding a new bot instance** — One new file: `netlify/functions/<name>-webhook.ts` that imports the shared router, registers the desired module subset, and points a new bot token at its URL. No infrastructure rewrite.

**Reference**: See `docs/MESSENGER_BOT_ARCHITECTURE.md` for the full spec — adapter interface, router, context, per-module contracts, session model, safety, and the Phase 1/2/3 rollout.

## Data Flow

### Creation Flow (Phase 1 — Anonymous)
```
1. Kid opens Story Studio → Next.js (no login required)
2. Kid enters story premise + characters → Frontend form
3. Frontend calls POST /api/ai/generate → Netlify Function
4. Netlify Function:
   a. Applies safety filter to input (block inappropriate content)
   b. Calls Claude API with kid-safe system prompt
   c. Receives story text → calls Replicate API for illustrations
   d. Applies safety filter to output
   e. Returns story + images → Frontend
5. Frontend renders interactive storybook preview
6. Kid clicks "Share" → POST /api/share
   a. Stores creation in Firestore (creations collection)
   b. Uploads images to Cloud Storage
   c. Returns shareable URL
7. Shared link opens SSR page with OG tags → /view/[creationId]
```

### Auth Flow (Phase 2 — Phone OTP)
```
1. Parent taps "Sign Up" → Frontend
2. Enter phone number → Firebase Auth sends OTP via SMS
3. Parent enters OTP → Firebase Auth verifies
4. First login → create parent profile in Firestore
5. Parent adds kid profile(s) → Firestore sub-collection
6. Kid selects their profile → session stored client-side
7. All subsequent creations linked to kid profile
8. Auth token included in API calls for rate limiting
```

### Kid CEO Flow (Phase 1 — Anonymous)
```
1. Kid opens /ceo → landing page → taps "Start Your Business"
2. Kid completes registration wizard (business type, name, pace 30/60/90d)
3. Frontend calls POST /api/ceo/register → Netlify Function
4. Register handler:
   a. Applies safety filter to business name (profanity / PII)
   b. Creates ceoBusiness/{id} doc (Admin SDK, server-write-only)
   c. Seeds Phase 1 milestones via lib/ceo/phases.ts
   d. Calls lib/ai/groqClient.ts (fallback: claudeClient) to
      generate the first event (lib/ceo/eventEngine.ts builds the prompt)
   e. Runs LLM output through safety pipeline, writes ceoEvents/{id}
   f. Returns { businessId, firstEvent } → Frontend
5. Frontend renders /ceo/play event feed, kid taps a choice
6. Frontend calls POST /api/ceo/decide with { eventId, choiceId, response? }
7. Decide handler:
   a. lib/ceo/scoringEngine.ts scores decision against 6 dimensions
   b. Updates ceoBusiness state (cash, reputation, metrics)
   c. Checks badge unlocks via lib/badges.ts + awards AI Points
   d. If phase complete, advances via lib/ceo/phases.ts
   e. Calls LLM to generate the next event → safety filter → ceoEvents
   f. Returns { feedback, newEvent, updatedBusiness, newBadges } → Frontend
8. Loop steps 5-7 through all 5 phases (event → decide → next event)
9. On 90-day finish → lib/ceo/profileEngine.ts builds CEO Profile Card
10. Profile published through existing /view/[id] SSR viewer for sharing
```

### Bot Link Binding Flow
```
1. Logged-in web user taps "Connect Telegram" in settings
2. Frontend calls POST /api/bot/link/create { bot: 'ceo' | 'studio' }
3. Link handler:
   a. Verifies user is authenticated
   b. Mints a single-use token (server-side, cryptographically random)
   c. Also generates a 6-digit display code derived from the token
   d. Writes botLinkCodes/{token} with { userId, bot, expiresAt: now+10min, used: false }
   e. Returns { deepLink: "https://t.me/GSIKidCeoAssistantBot?start=link_<token>",
                code: "823914" } → Frontend
4. Frontend shows BOTH: the deep-link button + the 6-digit code (fallback)

-- Primary path: deep link --
5a. Kid taps deep link → Telegram opens @GSIKidCeoAssistantBot with /start link_<token>
6a. Netlify Function telegram-webhook-ceo.ts receives update
7a. Bot router routes to link handler:
    - Looks up botLinkCodes/{token}
    - Validates: exists, not used, not expired, bot matches current webhook
    - Writes botSessions/{chatId} = { userId, linkedAt, platform: 'telegram', bot }
    - Marks token used = true (single-use)
    - Replies in chat: "✅ Connected to your GSI AI Studio account"

-- Fallback path: 6-digit code --
5b. Kid opens @GSIKidCeoAssistantBot manually, types `/link 823914`
6b. Webhook receives message, router matches /link command
7b. Same validation + same botSessions write + same reply as primary path

8. All subsequent bot messages from chatId carry the linked userId via
   botSessions, so CEO state and AI Points stay in sync across web + chat.
```

### AI Safety Pipeline
```
Input → [Profanity Filter] → [Age-Appropriate Check] → Claude API
  ↓
Claude Response → [Content Safety Filter] → [PII Detection] → Frontend
  ↓
Image Prompt → [Safety Keywords Block] → Replicate API
  ↓
Generated Image → [NSFW Detection] → Cloud Storage → Frontend
```

## External Integrations

| Service | Purpose | Auth Method | Phase | Fallback |
|---------|---------|-------------|-------|----------|
| Groq (llama-3.3-70b) | Primary LLM text generation | API key (server-side) | 1 | → Claude |
| Claude API (Anthropic) | Fallback LLM text generation | API key (server-side) | 1 | — |
| ComfyUI (FLUX.1 Schnell) | Local image generation | URL (localhost:8000) | 1 | → Replicate |
| Replicate API (SDXL) | Cloud image generation | API token (server-side) | 1 | → Pollinations |
| Pollinations.ai | Free image generation (no key) | None (public API) | 1 | → SVG placeholder |
| Lyria RealTime (Google) | Music generation (WebSocket) | API key (GEMINI_API_KEY) | 1 | → Replicate MusicGen |
| Replicate MusicGen | Music generation fallback | API token (server-side) | 1 | → Mock silence |
| Firebase Auth | Phone OTP authentication | Firebase SDK | 2 | — |
| Firebase Firestore | Database | Firebase SDK | 1 | — |
| Firebase Cloud Storage | Media file storage | Firebase SDK | 1 | — |
| Razorpay | Payments (UPI, cards, wallets) | API key + webhook | 2 | — |
| WhatsApp Share API | Social sharing | URL scheme (client-side) | 1 | — |
| Google Classroom API | School distribution | OAuth | 3 | — |
| Telegram Bot API (Grammy) | Messenger bot adapter (2 bots) | Bot tokens (server-side) | 1 (Kid CEO), 1 (Studio bot, later sprints) | — |
| Groq Whisper (whisper-large-v3) | Voice message transcription (recitation, speaking) | GROQ_API_KEY (already exists) | 2 | — |
| Google Cloud Text-to-Speech | Read-aloud / dictation (Hindi + English) | GOOGLE_CLOUD_TTS_KEY (server-side) | 2 | — |
| Google Cloud Vision | OCR for forwarded homework (images/PDFs) | GOOGLE_CLOUD_VISION_KEY (server-side) | 2 | — |
| Meta WhatsApp Business Cloud API | WhatsApp messenger adapter | Token + verify token (server-side) | 2+ (after Meta approval) | — |

**Provider Chain Logic**:
- **Text (LLM)**: Groq (if GROQ_API_KEY) → Claude Sonnet (if ANTHROPIC_API_KEY)
- **Images**: ComfyUI (if COMFYUI_URL) → Replicate SDXL (if token) → Pollinations.ai (free, always works) → SVG placeholder
- **Music**: Lyria RealTime (if GEMINI_API_KEY) → Replicate MusicGen (if token valid) → Mock (silence)
- **STT**: Groq Whisper (only provider in v1)
- **TTS**: Google Cloud TTS (only provider in v1)

## Deployment

### Environments

| Env | Frontend URL | Firebase Project | Purpose |
|-----|-------------|-----------------|---------|
| Development | localhost:3000 | gsi-ai-studio-dev | Local development |
| Staging | staging.gsiaistudio.com | gsi-ai-studio-staging | Testing & demo |
| Production | gsiaistudio.com | gsi-ai-studio-prod | Live |

### Infrastructure
- **Frontend Hosting**: Netlify (auto-deploys from Git, edge CDN, serverless functions)
- **Backend**: Firebase (Firestore, Auth, Cloud Storage, Cloud Functions)
- **CDN**: Netlify Edge + Firebase CDN for media
- **CI/CD**: Netlify auto-deploy on push to main; Firebase deploy via GitHub Actions
- **Domain**: Custom domain on Netlify with SSL
- **Monitoring**: Netlify Analytics + Firebase Analytics + Sentry (error tracking)

### Deployment Pipeline
```
Git Push → Netlify Build → Deploy Preview (PRs) / Production (main)
                         → Firebase Deploy (via GitHub Actions for functions/rules)
```

## Scalability Considerations

- **AI API Costs**: Rate limit anonymous users (3-5 creations/session), increase for authenticated users. Cache common quiz topics. Batch image generation where possible.
- **Firestore**: Design collections for read-heavy patterns (creations are written once, read many times). Use composite indexes for common queries.
- **Media Storage**: Use Cloud Storage lifecycle rules to delete orphaned files. Compress images before storage. Lazy-load media on creation viewer.
- **Cold Starts**: Netlify Functions have cold starts — keep functions lean. Consider Netlify Edge Functions for latency-critical paths (AI proxy).
- **PWA Caching**: Cache static assets aggressively. Use stale-while-revalidate for creation feeds. Service worker for offline landing page.
- **Phase 3 Multi-tenancy**: Schools get isolated Firestore sub-collections under a school document. Teacher roles scoped to their school.

## Infrastructure Patterns

### Idempotent Session Creation
`getOrCreateSession()` in `lib/firebase/sessionService.ts` uses Firestore `set({ merge: true })` to handle concurrent session creation safely. Two requests with the same sessionId will both succeed without overwriting each other's data — the merge ensures only missing fields are written while preserving existing fields like `createdAt`.

### fetchWithSession Wrapper
`lib/fetchWithSession.ts` wraps the Fetch API to auto-inject `X-Session-Id` from localStorage on every client-side API call. All hooks and components use this instead of raw `fetch()`, preventing the common bug of forgetting the session header.

### Error Boundary
`components/layout/ErrorBoundary.tsx` wraps the provider tree in `app/(public)/layout.tsx`. Catches render errors from context providers (AiPointsContext, AuthProvider, etc.) and shows a kid-friendly retry UI instead of crashing the entire app.
