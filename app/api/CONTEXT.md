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
├── ai/                 # AI generation proxy endpoints
│   ├── story/route.ts  # POST — generate story + illustrations
│   ├── music/route.ts  # POST — generate music track
│   └── quiz/route.ts   # POST — generate quiz/game
├── creations/
│   ├── route.ts        # GET (list), POST (save)
│   └── [id]/route.ts   # GET (single creation)
├── sessions/
│   └── route.ts        # POST — create/refresh anonymous session
├── auth/
│   ├── profile/route.ts # POST — create/update user profile
│   └── kids/route.ts    # POST — add kid profile
├── share/
│   └── [id]/route.ts   # POST — generate share link + OG image
└── webhooks/
    └── razorpay/route.ts # POST — payment webhook (Phase 2)
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
