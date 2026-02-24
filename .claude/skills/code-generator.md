---
name: code-generator
description: Generate code for a target file with full context awareness. Uses kb-loader to assemble context, then generates code following project standards. For frontend components, applies kid-friendly design principles.
---

# Code Generator

Generate code with proper context.

## Usage

Given a subtask with target path and requirements:

1. **Load context** — Call kb-loader with target path
2. **Analyze requirements** — Parse subtask requirements
3. **Check existing** — If updating, read current file
4. **Determine type** — Frontend, API route, hook, or utility?
5. **Generate code** — Following patterns in context
6. **Validate** — Check against tech-standards

## File Type Patterns

### Frontend Components (components/**)
- Functional components with TypeScript props interface
- Use `cn()` for conditional Tailwind classes
- Kid-friendly: large touch targets (48px), vibrant colors, rounded corners
- All loading states use animated illustrations, never spinners
- Mobile-first responsive design
- Named exports only

### API Routes (app/api/**)
- Next.js route handlers (export async function POST/GET)
- Pattern: validate → rate limit → safety filter → process → respond
- Use `apiSuccess()` and `handleApiError()` from lib/api-utils
- All AI keys server-side only
- Include X-Session-Id header parsing

### Hooks (hooks/**)
- Return `{ data, loading, error }` for async hooks
- Handle cleanup with abort controllers
- Use SWR for Firestore data fetching

### Firebase/AI Services (lib/**)
- Singleton pattern for SDK initialization
- Type-safe wrappers around Firebase/AI SDK calls
- Never expose API keys or admin SDK to client

## Kid-Friendly Design Rules

When generating UI:
- Colors: brand-purple (#7C3AED), brand-orange (#F97316), brand-cyan (#06B6D4)
- Font: font-display (Nunito) for headings, font-body (Inter) for text
- Border radius: rounded-2xl for cards, rounded-full for buttons
- Touch targets: minimum h-12 (48px)
- Errors: friendly language ("Let's try a different idea!" not "Invalid input")
- Loading: animated progress with encouraging messages
