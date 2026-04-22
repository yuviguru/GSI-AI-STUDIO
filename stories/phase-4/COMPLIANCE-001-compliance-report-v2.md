# COMPLIANCE-001: Compliance Report v2 + DPDP Artifact

## Description
Upgrades the existing Phase 3 `/api/admin/compliance` PDF with DPDP-specific sections. Post-Nov-2026 the DPDP Act enforcement window closes and schools will be asked by their boards / regulators for data-processing registers. Penalties reach Rs 200 crore. This PDF becomes both a CBSE AI-curriculum compliance artifact AND a DPDP compliance artifact — one download, two purposes. Also adds a DPO (Data Protection Officer) view for consent + erasure audit.

## Requires KB Updates
- Update `docs/security.md` with DPDP register schema + retention policies
- Update `docs/api-contracts.md` with compliance v2 endpoints

## Dependencies
- ADMIN-003 (existing compliance export)
- ADMIN-009 (school branding)
- COMPLIANCE-002 (DPDP Consent + Erasure) — source for consent log
- QA-001 — cross-check tests

## Subtasks

### [LIB] Compliance report composer v2
**Target**: `lib/pdf/complianceReport.ts` (modify or create if missing)
**Action**: Create / Modify
**Requirements**:
- Sections: cover + school info → CBSE AI-CT curriculum coverage per grade → teacher AI usage summary → DPDP data-processing register → consent status snapshot → data-deletion request log → retention policy confirmation
- Uses jsPDF with school letterhead
- Data assembled from multiple services (analytics + consent + erasure log + AI usage)

### [LIB] Teacher AI usage aggregator
**Target**: `lib/analytics/teacherAiUsage.ts`
**Action**: Create
**Requirements**:
- Rolls up counts of AI generator invocations per teacher per month
- Sources: `teacherAiUsage` Firestore collection (logged by each generator endpoint)
- Exports: tools used, frequency, tokens consumed (for cost visibility)

### [LIB] DPDP register builder
**Target**: `lib/dpdp/dataRegister.ts`
**Action**: Create
**Requirements**:
- Enumerates personal data held per kid: name, age, grade, creation content, AI prompts, submissions, parent phone
- Per category: purpose, retention, consent status, legal basis
- Output is structured for both PDF and JSON export

### [API] Compliance v2 endpoint
**Target**: `app/api/admin/compliance/route.ts` (modify)
**Action**: Modify
**Requirements**:
- Extends existing endpoint with `?version=2` for new format; v1 stays for back-compat
- Date range selector
- schoolAdmin role only
- Caching: pre-computes on demand, stores in `complianceCache` with 1-day TTL

### [FE] DPO dashboard
**Target**: `app/(auth)/school/compliance/page.tsx`, `components/admin/DpoDashboard.tsx`
**Action**: Create
**Requirements**:
- Consent log table (per parent × scope × timestamp)
- Deletion request queue (pending / in-progress / completed)
- Data-export button (per-student JSON dump)
- "Generate compliance PDF" CTA
- DPDP data-register preview (editable purpose field)

### [FE] Upgrade existing export UI
**Target**: `components/admin/ComplianceExport.tsx` (modify)
**Action**: Modify
**Requirements**:
- Add v1/v2 toggle
- Preview thumbnails of report sections
- Date range + school-year presets

### [TEST] Compliance PDF structure tests
**Target**: `lib/pdf/__tests__/complianceReport.test.ts`
**Action**: Create
**Requirements**:
- All required sections present
- DPDP register counts match actual Firestore data
- Retention dates consistent with published policy

## Acceptance Criteria
- [ ] PDF includes DPDP data-processing register
- [ ] DPO dashboard shows consent + deletion + export
- [ ] v1 endpoint still works for back-compat
- [ ] PDF renders with school letterhead
- [ ] Generation <15s for a full school
- [ ] Retention dates match actual data
