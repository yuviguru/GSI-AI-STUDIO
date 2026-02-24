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
│  │  Netlify Functions (Edge/Serverless)                │  │
│  │  ├── /api/ai/generate — AI proxy (rate limiting)   │  │
│  │  ├── /api/share — Create shareable links           │  │
│  │  └── /api/og — Dynamic OG image generation         │  │
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
│  │  Claude API  │ │  Replicate   │ │  Suno / MusicGen │ │
│  │  (Text/Logic)│ │  (SDXL/Flux) │ │  (Audio Gen)     │ │
│  │  - Stories   │ │  - Story art │ │  - Music creation│ │
│  │  - Quizzes   │ │  - Thumbnails│ │  - Sound effects │ │
│  │  - AI X-Ray  │ │              │ │                  │ │
│  └──────────────┘ └──────────────┘ └──────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

## Components

### Frontend (Next.js PWA)
**Tech**: Next.js 14+ (App Router), React, Tailwind CSS, next-pwa
**Host**: Netlify
**Responsibilities**:
- Creation studio UIs (Story, Music, Quiz/Game)
- AI X-Ray learning popups
- Shareable creation viewer (SSR for OG tags/SEO)
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
│   │   └── quiz/       # Quiz & Game Maker
│   ├── view/[id]/      # Public creation viewer (SSR)
│   └── learn/          # AI learning content
├── (auth)/             # Phase 2: authenticated pages
│   ├── dashboard/      # User dashboard
│   ├── portfolio/      # Creator portfolio
│   └── settings/       # Account settings
├── api/                # Netlify Functions (serverless)
│   ├── ai/             # AI generation proxy
│   ├── share/          # Share link creation
│   └── og/             # Dynamic OG images
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

| Service | Purpose | Auth Method | Phase |
|---------|---------|-------------|-------|
| Claude API (Anthropic) | Text generation, quiz logic, AI X-Ray explanations | API key (server-side) | 1 |
| Replicate API | SDXL/Flux image generation | API token (server-side) | 1 |
| Suno / MusicGen | Music and audio generation | API key (server-side) | 1 |
| Firebase Auth | Phone OTP authentication | Firebase SDK | 2 |
| Firebase Firestore | Database | Firebase SDK | 1 |
| Firebase Cloud Storage | Media file storage | Firebase SDK | 1 |
| Razorpay | Payments (UPI, cards, wallets) | API key + webhook | 2 |
| WhatsApp Share API | Social sharing | URL scheme (client-side) | 1 |
| Google Classroom API | School distribution | OAuth | 3 |

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
