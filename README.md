# GSI AI Studio

**Create with AI. Learn how it works.** ✨

AI-powered creation platform for Indian kids (ages 8-17). Build stories, music, quizzes, and games using AI while learning how artificial intelligence works — aligned to India's CBSE AI & Computational Thinking curriculum.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
- **Backend**: Next.js API Routes → Netlify Functions
- **Database**: Firebase Firestore
- **AI Services**: Claude (text), Replicate SDXL (images), Suno (audio)
- **Hosting**: Netlify + Firebase
- **Language**: TypeScript (strict mode)

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Firebase CLI (`npm i -g firebase-tools`)

### Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up environment:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

3. Start Firebase emulators (optional, for local Firestore):
   ```bash
   pnpm firebase:emulators
   ```

4. Start development:
   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── app/                  # Next.js App Router (pages + API routes)
├── components/           # React components
├── hooks/                # Custom React hooks
├── lib/                  # Utilities, AI clients, Firebase, safety
├── types/                # TypeScript type definitions
├── docs/                 # Project documentation (7 canonical docs)
├── stories/              # Implementation stories
└── .claude/skills/       # AI-assisted development skills
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm dev:full` | Start dev + Firebase emulators |
| `pnpm build` | Production build |
| `pnpm test` | Run Vitest tests |
| `pnpm lint` | Lint with ESLint |

## Documentation

See `/docs` for detailed documentation:
- `prd.md` — Product requirements
- `architecture.md` — System design
- `data-model.md` — Firestore schema
- `api-contracts.md` — API specifications
- `tech-standards.md` — Coding conventions
- `ux-patterns.md` — UI/UX patterns
- `security.md` — Auth & content safety

## License

Proprietary — GSI Talent Exam © 2024
