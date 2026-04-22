# REPORT-001: Parent-Facing Student Progress Report PDF

## Description
Per-kid exportable PDF showing concepts mastered, creations summary, teacher feedback highlights, badges, and streaks — branded with the school's letterhead. Closes the loop on parent engagement: something concrete for PTM meetings or to share with extended family. Mostly an assembly of data that already exists; new work is the PDF renderer + branding integration.

## Requires KB Updates
- Update `docs/api-contracts.md` with progress-report endpoint

## Dependencies
- ADMIN-009 (School Settings + Branding) — letterhead
- PLATFORM-007 (Multilingual) — Hindi variant
- PROFILE-003 (Parent Dashboard) — existing data surface

## Subtasks

### [LIB] Progress report composer
**Target**: `lib/pdf/progressReport.ts`
**Action**: Create
**Requirements**:
- `renderProgressReport(kidId, { range, locale }): Promise<Buffer>` — jsPDF output
- Sections: header (school branding), student info, concepts mastered (chart), creations summary (count by type), top-3 creations thumbnails, teacher feedback highlights, badges + streaks, suggested next steps
- A4 portrait, professional formatting
- Locale-aware text

### [API] Progress report endpoint
**Target**: `app/api/reports/progress/route.ts`
**Action**: Create
**Requirements**:
- `GET /api/reports/progress?kidId=&range=month|term|year&locale=en|hi` — returns PDF stream
- Auth: parent of kid OR teacher of kid's class OR schoolAdmin
- Rate-limit: 10/hour per user

### [FE] Parent-side export button
**Target**: `components/parent/ProgressReportButton.tsx`, `app/(auth)/parent/kid/[kidId]/page.tsx` (modify)
**Action**: Create / Modify
**Requirements**:
- "Download progress report" CTA on parent's kid view
- Range + locale picker
- Shows loading state during generation
- Opens PDF in new tab on ready

### [FE] Teacher-side export button
**Target**: `components/teacher/ClassManagement.tsx` (modify)
**Action**: Modify
**Requirements**:
- Per-student row: "Download report" action
- Bulk-download-for-class action (zip of all PDFs)

### [TEST] Progress report snapshot tests
**Target**: `lib/pdf/__tests__/progressReport.test.ts`
**Action**: Create
**Requirements**:
- Snapshot: render for synthetic kid, compare buffer length / structure
- Branding: fallback to GSI default when school has no letterhead
- Locale: Hindi variant renders all text correctly (no ??? characters)

## Acceptance Criteria
- [ ] Parent can download kid's progress report as PDF
- [ ] Teacher can download per-student or bulk
- [ ] PDF includes school letterhead when configured
- [ ] English + Hindi variants
- [ ] Generates in under 5s per kid
