# API Layer

## Purpose
Serverless API endpoints via Next.js API routes, deployed as Netlify Functions.

## Load References
@import /docs/api-contracts.md
@import /docs/tech-standards.md#backend
@import /docs/security.md#api-security
@import /docs/security.md#ai-content-safety

## Structure
```
api/
├── ai/                     # AI generation proxy endpoints
│   ├── story/route.ts      # POST — generate story + illustrations
│   ├── music/route.ts      # POST — generate music track
│   ├── quiz/route.ts       # POST — generate quiz
│   ├── game/route.ts       # POST — generate text adventure game
│   └── comic/route.ts      # POST — generate multi-panel comic
├── creations/
│   ├── route.ts            # GET (list by session), POST (save)
│   ├── public/route.ts     # GET — public feed + leaderboard
│   └── [id]/
│       ├── route.ts        # GET (single), DELETE (archive)
│       └── download/route.ts # POST — track download event
├── download/
│   └── [id]/route.ts       # POST — alternative download tracking
├── sessions/
│   ├── route.ts            # POST — create/refresh anonymous session
│   └── points/route.ts     # GET (load), PATCH (update) — AI points & badges
├── share/
│   └── [id]/route.ts       # POST — generate share link + WhatsApp URL
```

## Local Patterns
- Every endpoint: validate input → check rate limit → safety filter → process → respond
- All AI API keys kept server-side only (Netlify env vars)
- Use `handleApiError()` for consistent error responses
- Return format: `{ success: boolean, data: T | null, error: ErrorObj | null }`
- Rate limiting via Firestore session/user counters

## Related Code
@see /lib/safety/                   # Content safety filters
@see /lib/validators.ts             # Zod input validation schemas
@see /lib/firebase/admin.ts         # Firebase Admin SDK (server-side)
@see /lib/ai/                       # AI service integrations
