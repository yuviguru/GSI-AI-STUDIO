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
