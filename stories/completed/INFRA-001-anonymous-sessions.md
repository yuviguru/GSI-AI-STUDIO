# INFRA-001: Anonymous Session Management

## Description
Implement anonymous session management for Phase 1. Users get a UUID stored in localStorage, tracked in Firestore for rate limiting (5 creations/day, 2-min cooldown between creations, 24-hour session expiry).

## Requires KB Updates
- None (schema already defined in data-model.md)

## Subtasks

### [API] Implement session endpoint
**Target**: `app/api/sessions/route.ts`
**Action**: Update (replace stub)
**Requirements**:
- POST: Create or refresh session
- Check Firestore `sessions` collection for existing session
- If expired (>24h) or missing, create new document
- If exists, return remaining creation count
- Calculate cooldown from `lastCreationAt`
- Return: `{ sessionId, creationsRemaining, cooldownSeconds, expiresAt }`

### [LIB] Create session service
**Target**: `lib/firebase/sessionService.ts`
**Action**: Create
**Requirements**:
- `getOrCreateSession(sessionId)` — Firestore lookup/create
- `trackCreation(sessionId)` — Increment count, update lastCreationAt
- `checkRateLimit(sessionId)` — Return remaining count + cooldown
- Use Firebase Admin SDK (server-side only)

### [HOOK] Update useSession hook
**Target**: `hooks/useSession.ts`
**Action**: Update
**Requirements**:
- Call POST /api/sessions on mount to sync state
- Auto-refresh session if expired
- Expose `canCreate` boolean and `cooldownSeconds` countdown
- Show friendly message when rate limited

### [TEST] Session rate limiting tests
**Target**: `lib/firebase/sessionService.spec.ts`
**Action**: Create
**Requirements**:
- Test creation count tracking
- Test cooldown enforcement
- Test session expiry
- Test concurrent request handling

## Acceptance Criteria
- [ ] Anonymous user gets a session ID on first visit
- [ ] Session persists across page refreshes (localStorage)
- [ ] Creation count is tracked accurately
- [ ] Rate limit enforced: max 5/day, 2-min cooldown
- [ ] Session expires after 24 hours
- [ ] Friendly error messages for rate-limited users
