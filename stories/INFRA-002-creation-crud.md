# INFRA-002: Creation CRUD & Firestore Integration

## Description
Implement the core creation storage layer. All AI-generated content (stories, music, quizzes) saves to Firestore `creations` collection with proper metadata, AI X-Ray data, and curriculum tags.

## Requires KB Updates
- None (schema already defined)

## Subtasks

### [LIB] Create creation service
**Target**: `lib/firebase/creationService.ts`
**Action**: Create
**Requirements**:
- `saveCreation(data)` — Write to Firestore with auto-ID
- `getCreation(id)` — Fetch single creation
- `listCreations(sessionId, filters)` — Query with cursor pagination
- `incrementView(id)` — Atomic view count increment
- `incrementShare(id)` — Atomic share count increment
- Use Firebase Admin SDK for writes, client SDK for reads

### [API] Implement creations endpoints
**Target**: `app/api/creations/route.ts`
**Action**: Update (replace stub)
**Requirements**:
- POST: Validate with `saveCreationSchema`, save via creationService
- GET: List by sessionId with optional type filter, cursor pagination
- Include session validation for POST

### [API] Implement single creation endpoint
**Target**: `app/api/creations/[id]/route.ts`
**Action**: Create
**Requirements**:
- GET: Fetch creation by ID, increment view count
- Return full creation data with AI metadata

### [HOOK] Create useCreation hook
**Target**: `hooks/useCreation.ts`
**Action**: Create
**Requirements**:
- `useCreation(id)` — Fetch single creation with SWR
- `useMyCreations(type?)` — List current session's creations
- `useSaveCreation()` — Save mutation with optimistic update

### [TEST] Creation service tests
**Target**: `lib/firebase/creationService.spec.ts`
**Action**: Create
**Requirements**:
- Test save and retrieve flow
- Test pagination
- Test view count increment
- Test type filtering

## Acceptance Criteria
- [ ] Creations save to Firestore with all required fields
- [ ] "My Creations" tab shows session's creations
- [ ] Creations load on shared link (public read)
- [ ] View count increments on each unique view
- [ ] Pagination works for users with many creations
