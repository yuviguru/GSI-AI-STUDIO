# Custom Hooks

## Purpose
Reusable React hooks for session management, auth, AI generation, and creation CRUD.

## Load References
@import /docs/tech-standards.md#frontend
@import /docs/api-contracts.md

## Hooks
- `useSession()` — Anonymous session management (Phase 1): session ID, creation count, cooldown timer
- `useAuth()` — Firebase Auth state (Phase 2+): current user, login/logout, kid profile switching
- `useCreation(id?)` — Creation CRUD: fetch, save, delete, list with pagination
- `useAiGeneration()` — AI generation state: loading, progress messages, error handling, retry
- `useShare(creationId)` — Share link generation and WhatsApp/clipboard sharing
- `useAiPoints()` — AI Points tracking and badge unlocks (Phase 2)
- `useCurriculum(grade?)` — Fetch curriculum topics for grade level

## Local Patterns
- Return `{ data, loading, error }` for async hooks
- Handle cleanup in useEffect (abort controllers for AI calls)
- Memoize expensive computations
- Use SWR for Firestore data fetching with caching

## Related Code
@see /lib/firebase/auth.ts          # Firebase Auth utilities
@see /lib/firebase/firestore.ts     # Firestore client utilities
@see /types/                        # Type definitions for hook return values
