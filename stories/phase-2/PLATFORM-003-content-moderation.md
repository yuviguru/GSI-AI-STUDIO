# PLATFORM-003: Content Moderation Tools

## Description
As the platform opens up to community sharing and reactions, content moderation becomes essential. Implement a "Report" button on shared creations, an auto-flagging system using existing AI safety scores, and a basic moderation queue. Flagged content is hidden from public feeds until reviewed.

## Requires KB Updates
- Update `docs/security.md` with moderation workflow

## Dependencies
- AUTH-001 (authentication — needed for reporting)
- ENGAGE-003 (Explore feed — flagged content hidden from public feed)

## Subtasks

### [LIB] Create moderation service
**Target**: `lib/firebase/moderationService.ts`
**Action**: Create
**Requirements**:
- `reportCreation(creationId, reporterId, reason): Promise<void>` — create report document
- `getReports(status, limit, cursor): Promise<ReportResult>` — list reports for review
- `resolveReport(reportId, action: 'approve' | 'remove' | 'dismiss'): Promise<void>` — admin resolution
- `flagCreation(creationId): Promise<void>` — auto-flag from safety system
- `unflagCreation(creationId): Promise<void>` — remove flag after review
- Report schema: `{ id, creationId, reporterId, reason, status: 'pending' | 'resolved', resolution?, createdAt, resolvedAt?, resolvedBy? }`
- Flagged creation: set `moderation: { flagged: true, reason, flaggedAt }` on creation doc

### [FE] Create ReportButton component
**Target**: `components/shared/ReportButton.tsx`
**Action**: Create
**Requirements**:
- Flag icon button (lucide-react `Flag`)
- Tap opens report reason selector bottom sheet
- Reason options: "Inappropriate content", "Offensive language", "Not for kids", "Spam", "Other"
- "Other" allows free text (max 200 chars)
- Submit sends report to API
- Confirmation: "Thanks for reporting! We'll review this."
- Disabled after reporting (shows "Reported" state)
- Only shows for authenticated users viewing others' creations

### [API] Create report endpoints
**Target**: `app/api/moderation/reports/route.ts`
**Action**: Create
**Requirements**:
- `POST /api/moderation/reports` — submit a report (auth required)
- `GET /api/moderation/reports` — list pending reports (admin only)
- `PATCH /api/moderation/reports/[id]` — resolve report (admin only)
- Admin check: verify UID against `admins` collection in Firestore
- On report submit: if creation gets 3+ reports, auto-flag it

### [API] Auto-flag in AI generation pipeline
**Target**: `app/api/ai/story/route.ts` (and all AI routes)
**Action**: Update
**Requirements**:
- After generation: run safety score check on output
- If safety score below threshold: auto-flag creation with `flagCreation()`
- Flagged creations: set `isPublic: false` until reviewed
- Existing safety filter catches most issues pre-generation; this is a post-generation safety net

### [FE] Add ReportButton to shared viewer
**Target**: `app/(viewer)/view/[id]/ViewerClient.tsx`
**Action**: Update
**Requirements**:
- Add `ReportButton` to action area in shared viewer
- Only visible when viewing someone else's creation (not your own)
- Position: secondary action (below share/react buttons)

### [FE] Hide flagged content from public feeds
**Target**: `lib/firebase/creationService.ts`
**Action**: Update
**Requirements**:
- Update `listPublicCreations` query: add filter `moderation.flagged != true`
- Flagged creations still viewable via direct link but show warning banner
- Warning: "This content is under review"

## Acceptance Criteria
- [ ] Report button visible on shared creations (auth required)
- [ ] Report flow allows selecting reason and submitting
- [ ] 3+ reports auto-flag a creation
- [ ] Flagged content hidden from Explore feed
- [ ] Flagged content shows warning on direct link
- [ ] Post-generation safety check catches edge cases
- [ ] Admin can list and resolve reports via API
- [ ] User sees confirmation after reporting
