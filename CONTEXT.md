# GSI AI Studio

## Overview
GSI AI Studio is an AI creation + learning platform for Indian kids (ages 8-17) that teaches AI literacy through hands-on creation. Kids build stories, music, quizzes, and games using AI tools while learning how AI works — aligned to India's mandatory CBSE AI & Computational Thinking curriculum (2026-27). Built as a Next.js PWA on Netlify + Firebase, solo-dev optimized.

## Tech Stack
- **Frontend**: Next.js 14+ (App Router) with Tailwind CSS, shadcn/ui, next-pwa
- **Backend**: Netlify Functions (serverless) + Firebase Cloud Functions (background tasks)
- **Database**: Firebase Firestore (NoSQL)
- **Auth**: Firebase Auth (Phone OTP) — Phase 2+; anonymous sessions Phase 1
- **Storage**: Firebase Cloud Storage (media files)
- **AI**: Claude API (text/logic), Replicate (SDXL/Flux images), Suno/MusicGen (audio)
- **Hosting**: Netlify (frontend + functions), Firebase (backend services)
- **Payments**: Razorpay (Phase 2+)

## Quick Commands
```bash
pnpm install            # Install dependencies
pnpm dev                # Start Next.js dev server (localhost:3000)
pnpm build              # Production build
pnpm lint               # Run ESLint
pnpm test               # Run test suite
netlify dev             # Start with Netlify Functions locally
firebase emulators:start # Start Firebase emulators (Firestore, Auth)
```

## Reference Docs
All canonical documentation in `docs/`:
- `docs/prd.md` — Product requirements, personas, features, success metrics
- `docs/architecture.md` — System design, component boundaries, data flow
- `docs/data-model.md` — Firestore collections and document schemas
- `docs/api-contracts.md` — API endpoint specifications
- `docs/tech-standards.md` — Coding conventions, patterns, testing
- `docs/ux-patterns.md` — UI/UX patterns for kid-friendly design
- `docs/security.md` — Auth, child safety, data protection, AI safety

## Project Structure
```
app/
├── (public)/               # No-auth pages (Phase 1 playground)
│   ├── page.tsx            # Landing / studio picker
│   ├── create/
│   │   ├── story/          # Story Studio
│   │   ├── music/          # Music Lab
│   │   └── quiz/           # Quiz & Game Maker
│   ├── view/[id]/          # Public creation viewer (SSR)
│   └── learn/              # AI curriculum content
├── (auth)/                 # Phase 2: authenticated pages
│   ├── dashboard/          # User dashboard
│   ├── portfolio/          # Creator portfolio
│   └── settings/           # Account settings
├── api/                    # Netlify Functions (serverless API)
│   ├── ai/                 # AI generation proxy endpoints
│   ├── creations/          # Creation CRUD
│   ├── sessions/           # Anonymous session management
│   ├── auth/               # Auth helper endpoints
│   └── share/              # Share link generation
└── layout.tsx              # Root layout with PWA manifest
components/
├── ui/                     # Base UI primitives (shadcn/ui)
├── studios/                # Creation studio components
│   ├── story/              # Story Studio components
│   ├── music/              # Music Lab components
│   └── quiz/               # Quiz Maker components
├── creation/               # Creation display/viewer components
├── learning/               # AI X-Ray and curriculum components
├── layout/                 # Header, Footer, Navigation
└── shared/                 # Shared components (ShareButton, LoadingAnimation)
lib/
├── firebase/               # Firebase client + admin SDK setup
├── ai/                     # AI service integrations
│   ├── prompts/            # System prompts for each studio
│   ├── storyGenerator.ts   # Claude + Replicate story pipeline
│   ├── musicGenerator.ts   # Suno/MusicGen music pipeline
│   └── quizGenerator.ts    # Claude quiz generation
├── safety/                 # Content safety filters
├── utils.ts                # General utilities
└── validators.ts           # Zod validation schemas
hooks/
├── useSession.ts           # Anonymous session management
├── useAuth.ts              # Firebase Auth state
├── useCreation.ts          # Creation CRUD operations
└── useAiGeneration.ts      # AI generation with loading/error states
types/
├── creation.types.ts       # Creation interfaces
├── user.types.ts           # User/Kid profile types
├── ai.types.ts             # AI request/response types
└── api.types.ts            # API response types
```

## Global Standards
- TypeScript strict mode — no `any` types
- Named exports only (no default exports except Next.js pages)
- All AI calls server-side only (never expose API keys to client)
- Child safety first: all content through safety pipeline
- Mobile-first responsive design with 48px minimum touch targets
- Firestore security rules enforce all access control
