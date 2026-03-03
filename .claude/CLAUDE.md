# GSI AI Studio

AI creation + learning platform for Indian kids (ages 8-17). Create stories, music, quizzes and games with AI while learning how it works — aligned to CBSE AI & CT curriculum.

## Tech Stack
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
- **Backend**: Netlify Functions (serverless) + Firebase Cloud Functions
- **Database**: Firebase Firestore (NoSQL)
- **Auth**: Firebase Auth (Phone OTP) — Phase 2+; anonymous sessions Phase 1
- **AI**: Claude API (text), Replicate (images), Suno (audio)
- **Hosting**: Netlify (frontend) + Firebase (services)

## Context System

This project uses hierarchical CONTEXT.md files. When working on a file:
1. Read CONTEXT.md in that folder
2. Follow @import directives to load relevant doc sections
3. Generate code following loaded patterns

## Reference Docs
All in /docs/ — see root CONTEXT.md for full list.

## Skills
Task-specific instructions in this folder's skills/:
- kb-loader.md — Load context for target path
- code-generator.md — Generate code with context
- story-runner.md — Execute implementation stories
- test-generator.md — Generate tests
- fn-generator.md — Generate API route handlers
- story-creator.md — Create new stories
- kb-updater.md — Update docs when needed

## Commands
```bash
pnpm dev              # Start Next.js dev server
pnpm dev:full         # Start dev + Firebase emulators
pnpm build            # Production build
pnpm test             # Run tests
pnpm firebase:emulators  # Start Firestore/Auth emulators
```

## Git Workflow (MANDATORY — follow for every ticket)

### Starting a ticket
Before writing any code, always create a branch from `main` using the ticket identifier and a short slug of the title:
```
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
Multi-scope commits use the same prefix — do not omit it.

### When to commit
- Commit logically grouped work (not every file save, not one giant commit at the end)
- Always run `pnpm build` before committing to confirm no type errors
- Typical commit points: after backend (service + API), after frontend components, after wiring/integration
