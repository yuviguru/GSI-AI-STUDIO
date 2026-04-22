# ADMIN-009: School Settings + Branding

## Description
Closes the Phase 3 gap where there's no `PATCH /api/schools/[id]` — schools can't update their metadata post-bootstrap. Also adds white-label support: schools upload a logo + letterhead which all PDF exports (HPC narratives, question papers, compliance reports, progress reports) pick up automatically. This is foundational — it unblocks A1/A2/B4/C3 PDF rendering. Plan-tier management lives here too (trial → basic → premium upgrade path).

## Requires KB Updates
- Update `docs/api-contracts.md` with `PATCH /api/schools/[id]` and settings endpoints
- Update `docs/security.md` with schoolAdmin permissions on settings

## Dependencies
- ADMIN-001 (Teacher Admin Portal) — existing school bootstrap flow

## Subtasks

### [LIB] Extend school service
**Target**: `lib/firebase/schoolService.ts`
**Action**: Modify
**Requirements**:
- `updateSchool(schoolId, updates, actingUid): Promise<SchoolDoc>` — enforce `adminUid === actingUid`
- `updateSchoolBranding(schoolId, branding, actingUid): Promise<void>` where branding = `{ logoUrl?, letterheadUrl?, primaryColor?, secondaryColor? }`
- `setSchoolPlan(schoolId, plan, actingUid): Promise<void>`
- Validate board / state / city against enum lists

### [LIB] Create asset upload helper
**Target**: `lib/storage/schoolAssets.ts`
**Action**: Create
**Requirements**:
- `uploadSchoolLogo(schoolId, file): Promise<string>` — returns public URL
- `uploadSchoolLetterhead(schoolId, file): Promise<string>`
- Uses Firebase Storage or existing image pipeline
- Validates: PNG/JPG, max 2MB, dimensions 200×200 (logo) / A4 (letterhead)
- Strips EXIF, generates optimized versions

### [API] School settings endpoints
**Target**: `app/api/schools/[id]/route.ts`, `app/api/schools/[id]/branding/route.ts`, `app/api/schools/[id]/assets/route.ts`
**Action**: Create
**Requirements**:
- `PATCH /api/schools/[id]` — update metadata (name, city, state, board)
- `PATCH /api/schools/[id]/branding` — update branding colors
- `POST /api/schools/[id]/assets` — upload logo / letterhead (multipart)
- `DELETE /api/schools/[id]/assets?type=logo|letterhead`
- schoolAdmin role only, matching school

### [FE] School settings page
**Target**: `app/(auth)/school/settings/page.tsx`, `components/admin/SchoolSettings.tsx`
**Action**: Create
**Requirements**:
- Tabs: General / Branding / Plan / Integrations (placeholder for D5)
- General: editable name, city, state, board, admin phone
- Branding: logo upload + preview, letterhead upload + preview, color pickers (primary, secondary)
- Plan: current plan + student count + upgrade CTA (links to future billing)
- Live preview of letterhead against a sample HPC paragraph

### [LIB] PDF branding hook
**Target**: `lib/pdf/schoolBranding.ts`
**Action**: Create
**Requirements**:
- `getSchoolBranding(schoolId): Promise<SchoolBranding>` — cached read
- `renderBrandedHeader(doc: jsPDF, branding): void` — inserts logo + school name + letterhead
- Consumed by A1 HPC export, A2 paper export, B4 compliance export, C3 progress report

### [TEST] Settings RBAC tests
**Target**: `app/api/schools/[id]/__tests__/route.test.ts`
**Action**: Create
**Requirements**:
- Non-admin user gets 403 on PATCH
- Admin of school A cannot PATCH school B
- Asset upload validates file type + size
- Removed logo falls back to default

## Acceptance Criteria
- [ ] Admin can update school metadata
- [ ] Admin can upload logo + letterhead
- [ ] All PDF exports (HPC, papers, compliance, progress) render with school branding
- [ ] Non-admin gets 403 on settings endpoints
- [ ] Plan tier shown with upgrade CTA
- [ ] Asset validation: PNG/JPG only, <2MB
