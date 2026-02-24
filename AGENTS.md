# GSI AI Studio

AI creation + learning platform for Indian kids (ages 8-17). Create stories, music, quizzes and games with AI while learning how artificial intelligence works — aligned to CBSE AI & Computational Thinking curriculum.

## Tech Stack
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
- **Backend**: Next.js API Routes (deployed as Netlify Functions)
- **Database**: Firebase Firestore (NoSQL)
- **Auth**: Anonymous sessions (Phase 1), Firebase Phone OTP (Phase 2+)
- **AI**: Claude API (text/logic), Replicate SDXL (images), Suno/MusicGen (audio)
- **Hosting**: Netlify (frontend + functions), Firebase (Firestore, Auth, Storage)

## Context System

This project uses hierarchical CONTEXT.md files for AI-assisted development:

1. **Read CONTEXT.md** in the target folder
2. **Follow @import directives** to load relevant doc sections
3. **Generate code** following the loaded patterns

### @import Syntax
```
@import /docs/tech-standards.md#frontend    # Load specific section
@import /docs/ux-patterns.md                # Load entire file
@see /lib/utils.ts                          # Note related file
```

## Reference Documentation

All canonical docs in `/docs/`:
| Doc | Purpose |
|-----|---------|
| `prd.md` | Product requirements, personas, phased features |
| `architecture.md` | Serverless architecture, system diagram, data flows |
| `data-model.md` | Firestore schema (single source of truth) |
| `api-contracts.md` | API endpoint specifications |
| `tech-standards.md` | Coding conventions, file patterns |
| `ux-patterns.md` | UI/UX patterns, design system |
| `security.md` | Auth, content safety, DPDPA compliance |

## Skills

Task-specific instructions in `.claude/skills/`:

| Skill | Purpose |
|-------|---------|
| `kb-loader.md` | Load context for a target file path |
| `code-generator.md` | Generate code with proper context |
| `story-runner.md` | Execute all subtasks in a story |
| `test-generator.md` | Generate tests for code |
| `fn-generator.md` | Generate API route handlers |
| `story-creator.md` | Create stories from requirements |
| `kb-updater.md` | Update docs when needed |

## Project Structure

```
├── app/
│   ├── (public)/             # Public pages (landing, create studios, view)
│   │   ├── create/story/     # Story Studio
│   │   ├── create/music/     # Music Lab
│   │   ├── create/quiz/      # Quiz Maker
│   │   └── view/             # Creation viewer (shared links)
│   ├── (auth)/               # Authenticated pages (Phase 2)
│   │   ├── dashboard/        # Parent dashboard
│   │   └── portfolio/        # Kid portfolio
│   └── api/                  # API routes (Netlify Functions)
│       ├── ai/               # AI generation endpoints
│       ├── creations/        # CRUD operations
│       ├── sessions/         # Session management
│       └── share/            # Sharing endpoints
├── components/               # React components
│   ├── ui/                   # shadcn/ui primitives
│   ├── studios/              # Creation studio components
│   ├── creation/             # Creation display/management
│   ├── learning/             # AI X-Ray, curriculum components
│   ├── layout/               # Nav, footer, layout wrappers
│   └── shared/               # Cross-cutting (loading, errors)
├── hooks/                    # Custom React hooks
├── lib/                      # Utilities and services
│   ├── ai/                   # AI client wrappers + prompts
│   ├── firebase/             # Firebase client + admin SDK
│   └── safety/               # Content safety filters
├── types/                    # TypeScript type definitions
├── docs/                     # Reference documentation
└── stories/                  # Implementation stories
```

## Commands

```bash
pnpm dev              # Start Next.js dev server (port 3000)
pnpm dev:full         # Start dev + Firebase emulators
pnpm build            # Production build
pnpm test             # Run Vitest tests
pnpm lint             # ESLint
pnpm firebase:emulators  # Start Firestore/Auth/Storage emulators
```

## Workflow

1. **New feature?** → Read story in `/stories/` or create with story-creator
2. **Before coding** → Run kb-loader to get context for target file
3. **Generate code** → Follow patterns from loaded context
4. **Update docs** → Use kb-updater if schema/API changes needed
