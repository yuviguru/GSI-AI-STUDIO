# GSI AI Studio — Tech Standards

## Language & Runtime

- **Language**: TypeScript (strict mode) for all code
- **Runtime**: Node.js 20 LTS
- **Package Manager**: pnpm (workspace support for future monorepo)

## Frontend

### Framework & Libraries
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: React hooks + Context for global state (keep it simple — no Redux)
- **Forms**: react-hook-form + zod validation
- **PWA**: next-pwa (service worker, manifest, offline shell)
- **Firebase**: firebase client SDK (auth, firestore, storage)
- **Animations**: Framer Motion (creation previews, page transitions), Lottie (`lottie-react` for Koko mascot)
- **Audio**: Web Audio API (synthesized sound effects in `lib/sounds.ts`), base64 data URIs for music playback
- **Confetti**: canvas-confetti (celebration animations)
- **Data fetching**: SWR (stale-while-revalidate for creation data)

### File Naming
- Components: `PascalCase.tsx` (e.g., `StoryStudio.tsx`)
- Hooks: `camelCase.ts` prefixed with `use` (e.g., `useCreation.ts`)
- Utils: `camelCase.ts` (e.g., `safetyFilter.ts`)
- Types: `camelCase.types.ts` (e.g., `creation.types.ts`)
- Constants: `SCREAMING_SNAKE_CASE` inside `camelCase.ts` files

### Component Patterns
- Functional components only (no class components)
- Props interface defined above component
- Named exports (no default exports except pages)
- Co-locate component + styles + tests in same directory
- Max 150 lines per component — extract sub-components

```typescript
// StoryPromptForm.tsx
interface StoryPromptFormProps {
  onSubmit: (data: StoryPrompt) => void
  isGenerating: boolean
}

export function StoryPromptForm({ onSubmit, isGenerating }: StoryPromptFormProps) {
  // component logic
}
```

### State Management
- **Local state**: `useState` for component-level state
- **Shared state**: React Context for auth, session, and creation state
- **Server state**: SWR or React Query for Firestore data fetching
- **No global store** — keep state as close to usage as possible

### Error Handling (Frontend)
```typescript
try {
  const result = await generateStory(prompt)
  // handle success
} catch (error) {
  if (error instanceof AiSafetyError) {
    showToast('Your prompt was flagged. Try rephrasing!', 'warning')
  } else if (error instanceof RateLimitError) {
    showToast(`Try again in ${error.cooldownSeconds} seconds`, 'info')
  } else {
    showToast('Something went wrong. Please try again.', 'error')
    captureException(error) // Sentry
  }
}
```

### Error Boundaries
The app uses a React error boundary (`components/layout/ErrorBoundary.tsx`) wrapping all providers in the public layout. This prevents context failures (e.g. AiPointsContext throwing) from crashing the entire app. The boundary shows a kid-friendly fallback with a retry button.

### fetchWithSession Wrapper
All client-side API calls must use `fetchWithSession()` from `lib/fetchWithSession.ts` instead of raw `fetch()`. This wrapper auto-injects the `X-Session-Id` header from localStorage, eliminating manual header management and preventing 404 errors from missing session IDs.

```typescript
import { fetchWithSession } from '@/lib/fetchWithSession';

// Instead of:
// fetch('/api/ai/story', { headers: { 'X-Session-Id': sessionId } })

// Use:
const res = await fetchWithSession('/api/ai/story', {
  method: 'POST',
  body: JSON.stringify(input),
});
```

---

## Backend (Netlify Functions + Firebase)

### Netlify Functions
- Located in `app/api/` (Next.js API routes) or `netlify/functions/`
- Each function handles one concern
- Keep functions lean (fast cold starts)
- Environment variables via Netlify dashboard (never in code)

### Function Pattern
```typescript
// app/api/ai/story/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { validateStoryInput } from '@/lib/validators'
import { checkRateLimit } from '@/lib/rateLimit'
import { generateStory } from '@/lib/ai/storyGenerator'
import { filterSafety } from '@/lib/safety'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate
    const input = validateStoryInput(body)

    // Rate limit
    const session = await checkRateLimit(request)

    // Safety filter input
    const safeInput = await filterSafety(input)

    // Generate
    const result = await generateStory(safeInput)

    // Safety filter output
    const safeResult = await filterSafety(result)

    return NextResponse.json({ success: true, data: safeResult })
  } catch (error) {
    return handleApiError(error)
  }
}
```

### Firebase Cloud Functions
- Used for background/scheduled tasks only
- Trigger-based: Firestore onCreate, onUpdate, scheduled
- Examples: update analytics aggregates, cleanup expired sessions, send notifications

### Error Handling (Backend)
- Use custom exception classes
- Always include error code for client handling
- Log errors with context (but never log PII or API keys)

```typescript
export class AppException extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500
  ) {
    super(message)
  }
}

// Usage
throw new AppException('UNSAFE_CONTENT', 'Input flagged by safety filter', 400)
throw new AppException('RATE_LIMITED', 'Creation limit reached', 429)
```

---

## AI Integration

### Prompt Engineering Standards
- All system prompts stored in `/lib/ai/prompts/` as template literals
- System prompts include: age-appropriate instructions, safety boundaries, output format
- Never expose system prompts to the client
- Version control prompts (track which prompt version generated which creation)

```typescript
// lib/ai/prompts/storyPrompt.ts
export const STORY_SYSTEM_PROMPT = (ageGroup: string) => `
You are a children's story writer creating age-appropriate stories for ${ageGroup} year olds.

Rules:
- Content must be suitable for children
- No violence, scary themes, or inappropriate content
- Use simple language for younger age groups
- Stories should have a positive message
- Maximum 5 pages, ~100 words per page

Output format: JSON with pages array...
`
```

### AI Safety Pipeline
- **Input**: Profanity filter → age-appropriate check → Claude moderation
- **Output**: Content safety scan → PII detection → image NSFW check
- All AI calls go through server-side proxy (never expose API keys to client)

### Cost Tracking
- Log every AI API call with: model, tokens used, cost estimate, creation ID
- Monthly cost dashboard via Firebase Analytics
- Alert if daily spend exceeds threshold

---

## Database

### Firestore Conventions
- Collection names: `camelCase` plural (e.g., `creations`, `users`)
- Document fields: `camelCase` (e.g., `createdAt`, `viewCount`)
- Always include `createdAt` and `updatedAt` timestamps
- Use Firestore server timestamps: `serverTimestamp()`
- Denormalize data for read-heavy patterns

### Query Patterns
- Always use composite indexes for multi-field queries
- Paginate with cursors (not offsets — Firestore charges per read)
- Limit results (never fetch unbounded collections)
- Use `where` + `orderBy` for filtered lists

---

## Testing

### Test File Naming
- Unit tests: `*.spec.ts` (co-located with source)
- Integration tests: `*.test.ts` (in `__tests__/`)
- E2E tests: `*.e2e.ts` (in `e2e/`)

### Test Structure
```typescript
describe('generateStory', () => {
  it('should generate a story with the correct number of pages', async () => {
    const input = { premise: 'A cat in space', pages: 3, ageGroup: '8-10' }
    const result = await generateStory(input)
    expect(result.pages).toHaveLength(3)
  })

  it('should reject unsafe input', async () => {
    const input = { premise: '<unsafe content>', pages: 3, ageGroup: '8-10' }
    await expect(generateStory(input)).rejects.toThrow(AppException)
  })
})
```

### Coverage Targets
- Phase 1: Focus on AI safety filters (100% coverage), API endpoints (80%)
- Skip UI unit tests in Phase 1 — invest in E2E for critical flows
- Critical paths: creation flow, sharing flow, rate limiting

---

## Git Conventions

### Branch Naming
Format: `<TICKET-ID>-<title-in-kebab-case-max-6-words>`

Examples:
- `CLA-14-ai-points-persistence-badge-system`
- `CLA-7-fun-kid-ui-overhaul`
- `CLA-34-docs-architecture-audit`

Always branch from `main`: `git checkout main && git pull && git checkout -b ...`

### Commit Messages
Format: `<TICKET-ID>: <imperative description>`

Examples:
- `CLA-14: implement badge catalog and points persistence`
- `CLA-7: add Koko mascot with Lottie animations`
- `CLA-34: sync data-model.md with session points schema`

### Release Strategy
- PR-based workflow with feature branches per ticket
- Netlify auto-deploys preview on PR, production on merge to main

## Established Patterns

### Multi-Provider Fallback Chain
AI services use ordered fallback chains configured by environment variables:
```
Text: Groq (GROQ_API_KEY) → Claude (ANTHROPIC_API_KEY)
Images: ComfyUI (COMFYUI_URL) → Replicate (REPLICATE_API_TOKEN) → Pollinations (free)
Music: Lyria (GEMINI_API_KEY) → Replicate MusicGen → Mock silence
```
Each provider implements the same interface. First available provider is used.

### Optimistic localStorage + Firestore Sync
Used by AiPointsContext for AI Points and badges:
1. Read from localStorage on mount (instant display)
2. GET from server to sync truth
3. On actions, update localStorage optimistically → PATCH server in background
4. Server uses Firestore transactions for atomicity

### Web Audio Synthesized Sounds
`lib/sounds.ts` generates 5 sounds via oscillators + gain envelopes (zero asset files):
- `pointsEarned`: ascending 2-note beep
- `badgeUnlocked`: 3-note arpeggio
- `creationComplete`: sine sweep
- `buttonTap`: single high tone
- `celebrate`: C major chord + ascending scale

Respects `gsi-sound-muted` localStorage key. Safari AudioContext suspension handled.

### Lottie Mascot Pattern
`components/mascot/Mascot.tsx` loads Koko expressions on-demand from `public/lottie/koko-*.json`:
- 7 expressions: happy, thinking, celebrating, waving, surprised, painting, singing
- 3 sizes: sm (64px), md (120px), lg (200px)
- Module-level cache prevents re-fetching
- Bobbing animation via Framer Motion

### 3-Step Studio Pattern
All 5 creation studios follow: PromptForm → Progress → Viewer
- PromptForm: premise textarea + suggestion chips + template carousel + collapsible options
- Progress: Mascot (context-appropriate expression) + rotating messages
- Viewer: Creation display + Share/Download/AI X-Ray/Create Another buttons
