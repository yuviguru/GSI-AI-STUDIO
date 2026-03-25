# INFRA-009: Session Init Race Condition & fetchWithSession Wrapper

## Description
Fix three infrastructure issues: (1) race condition in `getOrCreateSession()` where concurrent requests can overwrite each other, (2) manual `X-Session-Id` header management scattered across all client hooks, and (3) missing React error boundaries that cause full app crashes on context failures.

## Requires KB Updates
- [ ] docs/architecture.md — Add fetchWithSession wrapper pattern
- [ ] docs/tech-standards.md — Add error boundary pattern and fetchWithSession convention

## Subtasks

### [API] Fix session creation race condition
**Target**: `lib/firebase/sessionService.ts`
**Action**: Update
**Requirements**:
- Replace plain read-then-write in `getOrCreateSession` with `set({ merge: true })` for idempotent creation
- Concurrent requests with same sessionId must not overwrite existing session data

### [LIB] Create fetchWithSession wrapper
**Target**: `lib/fetchWithSession.ts`
**Action**: Create
**Requirements**:
- Auto-inject `X-Session-Id` header from localStorage
- Support all fetch options (method, body, headers, etc.)
- Drop-in replacement for `fetch()` in client code

### [FE] Replace manual X-Session-Id headers across all hooks
**Target**: Multiple hooks and components
**Action**: Update
**Requirements**:
- Replace manual `X-Session-Id` header in: useAiGeneration, useCreation, useCreations, useBeatTheAi, useSkillArena, useSkills, useSkillArenaProgress, AiPointsContext, StatsBoard, SessionInit
- Remove duplicated `getSessionId()` helper functions from each file

### [FE] Add ErrorBoundary component
**Target**: `components/layout/ErrorBoundary.tsx` + `app/(public)/layout.tsx`
**Action**: Create + Update
**Requirements**:
- Create React error boundary that catches context/render failures
- Show kid-friendly fallback UI with retry option
- Wrap providers in public layout with error boundary

## Acceptance Criteria
- [ ] Concurrent session creation is idempotent
- [ ] fetchWithSession wrapper used in all client hooks
- [ ] Error boundary catches context failures gracefully
