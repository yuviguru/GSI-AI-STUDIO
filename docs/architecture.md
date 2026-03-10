# GSI AI Studio — Architecture

## System Overview

GSI AI Studio is a serverless PWA built on Next.js (Netlify) + Firebase, designed for zero-ops overhead as a solo developer project. The frontend handles all UI and creation workflows, Firebase provides auth/database/storage/functions, and external AI APIs (Claude, Replicate, Suno) power the creation engines. The architecture prioritizes fast iteration, low cost, and progressive enhancement from anonymous playground to authenticated creator platform.

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    CLIENTS                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │  Browser     │  │  PWA (Mobile)│  │  Shared Link    │  │
│  │  (Desktop)   │  │  (Installed) │  │  (View Only)    │  │
│  └──────┬───────┘  └──────┬──────┘  └───────┬─────────┘  │
└─────────┼─────────────────┼─────────────────┼────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌──────────────────────────────────────────────────────────┐
│                 NETLIFY (Frontend Host)                    │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Next.js PWA (Static + SSR)                        │  │
│  │  ├── /create/* — Creation studio pages             │  │
│  │  ├── /view/* — Public creation viewer (SSR)        │  │
│  │  ├── /learn/* — AI learning paths                  │  │
│  │  └── /dashboard/* — User dashboard (Phase 2)       │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Next.js API Routes (Serverless on Netlify)        │  │
│  │  ├── /api/ai/* — AI generation (5 studios)        │  │
│  │  ├── /api/creations/* — CRUD + explore + download │  │
│  │  ├── /api/sessions/* — Rate limiting + points     │  │
│  │  └── /api/share/* — Shareable links               │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
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
│   └── share/          # Share link creation
└── layout.tsx          # Root layout with PWA manifest
```

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

**Provider Chain Logic**:
- **Text (LLM)**: Groq (if GROQ_API_KEY) → Claude Sonnet (if ANTHROPIC_API_KEY)
- **Images**: ComfyUI (if COMFYUI_URL) → Replicate SDXL (if token) → Pollinations.ai (free, always works) → SVG placeholder
- **Music**: Lyria RealTime (if GEMINI_API_KEY) → Replicate MusicGen (if token valid) → Mock (silence)

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
