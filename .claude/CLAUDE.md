# GSI AI Studio

AI creation + learning platform for Indian kids (ages 8-17). Create stories, music, quizzes and games with AI while learning how it works — aligned to CBSE AI & CT curriculum.

**Tech Stack**: Next.js 14 (App Router) + Tailwind CSS + shadcn/ui | Netlify Functions (serverless) + Firebase Firestore | Claude API (text), Replicate (images), Suno (audio)

---

## Development Workflow (MANDATORY — follow for every task)

Every task — whether triggered by a Linear ticket, a terminal command, or a manual request — MUST follow these four phases in order. Do NOT skip phases.

### Phase 1: Understand — Load Context

Before writing any code, load the project's knowledge base:

1. **Read this file** (`.claude/CLAUDE.md`) for conventions and workflow
2. **Find the story file** in `stories/` matching the ticket prefix (e.g., `STUDIO-004`, `UI-001`). If no story exists and the task is non-trivial, create one using `.claude/skills/story-creator.md`
3. **Load context for every file you'll touch**:
   - Read `CONTEXT.md` in the target file's directory (if it exists)
   - Read `CONTEXT.md` in each parent directory up to the repo root
   - For each `@import /docs/file.md#section` directive found, read that doc section
   - Note `@see` references as related files to check
4. **Read the relevant docs** even if not imported by CONTEXT.md:
   - `docs/data-model.md` — if touching Firestore or types
   - `docs/api-contracts.md` — if touching API routes
   - `docs/tech-standards.md` — for coding conventions
   - `docs/ux-patterns.md` — if touching UI components
   - `docs/security.md` — if touching AI, auth, or safety
   - `docs/architecture.md` — if adding new services or integrations

### Phase 2: Plan & Document — Architect First, Code Second

**Check whether existing docs cover the feature you're building.** If docs already have the data model, API contracts, and component patterns — proceed to Phase 3.

**If docs are missing or incomplete — you are the architect.** Do NOT start coding with undocumented patterns. Instead:

1. **STOP** — Do not write application code yet
2. **THINK** — Act as an expert software architect. Design:
   - Data model (Firestore collections, document schemas, relationships)
   - API contracts (endpoints, request/response shapes, error cases)
   - Component structure (pages, components, hooks, their responsibilities)
   - Integration points (how this connects to existing systems)
   - Security considerations (auth, safety, rate limiting)
3. **UPDATE DOCS FIRST** — Add your architecture decisions to the relevant docs following `.claude/skills/kb-updater.md` patterns:
   - New Firestore collection/fields → update `docs/data-model.md` AND `types/*.types.ts` AND `firestore.rules`
   - New API endpoints → update `docs/api-contracts.md`
   - New service/integration → update `docs/architecture.md`
   - New UI pattern → update `docs/ux-patterns.md`
   - New auth/safety flow → update `docs/security.md`
   - Preserve existing content, match formatting, add to correct sections
4. **Commit doc updates separately** — e.g., `CLA-10: update docs with Game Studio API, data model, and UX patterns`

This ensures the knowledge base stays current. Future tasks (by you or another agent) will find documented patterns instead of having to reverse-engineer code.

### Phase 3: Implement — Follow Patterns, Not Instinct

With context loaded and docs updated, now write code:

1. **If a story file exists**, follow its subtasks in order:
   - KB updates first (Phase 2 handles this)
   - Server before client (`[API]` before `[FE]`)
   - Dependencies first (check `@see` references, generate missing deps)
2. **For every file you create or modify**, follow the patterns from:
   - The loaded CONTEXT.md chain (local patterns)
   - `.claude/skills/code-generator.md` (file type patterns, kid-friendly design rules)
   - `.claude/skills/fn-generator.md` (API route template: validate → rate limit → safety filter → process → respond)
3. **Match existing code style** in the target directory — read a sibling file first
4. **Commit logically grouped work** — after backend (service + API), after frontend components, after wiring/integration

### Phase 4: Verify — All Checks Must Pass

Before creating a PR or considering work done, run ALL checks:

```bash
pnpm lint          # Code style
pnpm typecheck     # TypeScript type checking (if available)
pnpm test -- --run # Unit tests
pnpm build         # Production build
```

Fix any failures and re-run. Do NOT skip checks or push with failures.

---

## Context System — How It Works

The project uses hierarchical `CONTEXT.md` files with `@import` directives that pull in doc sections:

```
CONTEXT.md (root)           — Project overview, structure, global standards
├── app/api/CONTEXT.md      — API patterns, @imports security + api-contracts
├── components/CONTEXT.md   — UI patterns, @imports ux-patterns + tech-standards
│   └── studios/CONTEXT.md  — Studio 3-step pattern, @imports api-contracts + safety
├── hooks/CONTEXT.md        — Hook patterns, @imports tech-standards
├── lib/ai/CONTEXT.md       — AI integration, @imports security + architecture
├── lib/firebase/CONTEXT.md — Firebase SDK patterns, @imports data-model
└── lib/safety/CONTEXT.md   — Safety pipeline, @imports security
```

**@import syntax**: `@import /docs/security.md#ai-content-safety` → Read that section from the doc file
**@see syntax**: `@see /lib/safety/` → Note as related (don't load proactively)

When working on a file, walk UP the directory tree collecting CONTEXT.md files. Each one adds relevant patterns and doc references.

---

## Skills — When to Use Each

Skills are detailed instruction files in `.claude/skills/`. Read the relevant skill file when its trigger condition matches:

| Skill | File | When to Use |
|-------|------|-------------|
| **story-runner** | `skills/story-runner.md` | Implementing a complete ticket that has a story file |
| **story-creator** | `skills/story-creator.md` | Given a requirement with no existing story file — create one |
| **kb-updater** | `skills/kb-updater.md` | Story says "Requires KB Updates" OR docs don't cover the feature |
| **kb-loader** | `skills/kb-loader.md` | Reference for context loading algorithm (apply mentally for every file) |
| **code-generator** | `skills/code-generator.md` | Generating any application code — follow its file type patterns |
| **fn-generator** | `skills/fn-generator.md` | Creating any API route handler — follow its template |
| **test-generator** | `skills/test-generator.md` | Writing tests — follow its coverage priorities (safety: 100%, API: 80%, hooks: 70%) |

**Important**: These aren't optional references. When their trigger condition matches, read the skill file and follow its process.

---

## Reference Docs

All canonical documentation lives in `docs/`:

| Doc | Purpose | Update When |
|-----|---------|-------------|
| `docs/prd.md` | Product requirements, personas, features | New feature areas |
| `docs/architecture.md` | System design, component boundaries, data flow | New services or integrations |
| `docs/data-model.md` | Firestore collections and document schemas | Any Firestore schema change |
| `docs/api-contracts.md` | API endpoint specifications | New or changed endpoints |
| `docs/tech-standards.md` | Coding conventions, patterns, testing | New patterns established |
| `docs/ux-patterns.md` | UI/UX patterns for kid-friendly design | New component patterns |
| `docs/security.md` | Auth, child safety, data protection, AI safety | Security-relevant changes |

---

## Git Workflow (MANDATORY — follow for every ticket)

### Starting a ticket
Before writing any code, create a branch from `main`:
```bash
git checkout main && git pull origin main
git checkout -b <ticket-id>-<short-kebab-slug>
# Example: CLA-14-ai-points-persistence-badge-system
```
Branch naming rule: `<TICKET-ID>-<title-in-kebab-case-max-6-words>`

### Committing changes
Every commit message MUST be prefixed with the ticket number:
```
<TICKET-ID>: <imperative description>
# Example: CLA-14: implement badge catalog and points persistence
```

### When to commit
- Commit logically grouped work (not every file save, not one giant commit at the end)
- Always run `pnpm build` before committing to confirm no type errors
- Typical commit points: after doc updates, after backend (service + API), after frontend components, after wiring/integration

---

## Commands
```bash
pnpm dev              # Start Next.js dev server
pnpm dev:full         # Start dev + Firebase emulators
pnpm build            # Production build
pnpm test             # Run tests
pnpm firebase:emulators  # Start Firestore/Auth emulators
```
