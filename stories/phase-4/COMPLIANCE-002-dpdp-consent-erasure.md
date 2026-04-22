# COMPLIANCE-002: DPDP Consent + Erasure Infrastructure

## Description
India's DPDP Act 2023 + Rules 2025 require verifiable parental consent for all children's data processing, plus a right-to-erasure mechanism. Penalties reach Rs 200 crore. This feature adds: (1) consent capture with audit trail, (2) right-to-erasure endpoint that cascades across all collections, (3) data-export endpoint for subject access requests. Consent flow uses OTP + explicit affirmation in Phase 4; DigiLocker integration deferred.

## Requires KB Updates
- Update `docs/security.md` with full DPDP compliance section
- Update `docs/api-contracts.md` with `/api/dpdp/*` endpoints
- Update `docs/data-model.md` with `consentLog`, `erasureRequests` collections

## Dependencies
- AUTH-001 (Phone OTP Auth) — for OTP-based consent verification
- PROFILE-001 (Parent-Kid Profiles) — the consenting parent

## Subtasks

### [LIB] Consent service
**Target**: `lib/dpdp/consentService.ts`
**Action**: Create
**Requirements**:
- `recordConsent(parentUid, kidId, scope, method): Promise<ConsentRecord>` — scopes: `ai_generation`, `data_storage`, `parent_messaging`, `peer_sharing`, `analytics`
- `hasConsent(parentUid, kidId, scope): Promise<boolean>`
- `revokeConsent(parentUid, kidId, scope): Promise<void>` — triggers downstream data stop
- `getConsentAudit(parentUid, kidId): Promise<ConsentRecord[]>`
- Stores with audit trail: `{ parentUid, kidId, scope, granted, method, ip, userAgent, timestamp }`

### [LIB] Data erasure orchestrator
**Target**: `lib/dpdp/dataErasure.ts`
**Action**: Create
**Requirements**:
- `requestErasure(parentUid, kidId, reason): Promise<ErasureRequest>` — queues request
- `processErasure(requestId): Promise<ErasureSummary>` — runs cascade: creations, submissions, reactions, HPC narratives, notifications, AI usage logs, comms log, media files in Storage
- Idempotent + resumable
- Creates a tamper-evident receipt (signed) for audit
- Completes within 30 days (DPDP requirement)

### [LIB] Data export builder
**Target**: `lib/dpdp/dataExport.ts`
**Action**: Create
**Requirements**:
- `exportStudentData(parentUid, kidId): Promise<{ json: object; pdf: Buffer }>`
- JSON contains all collections referencing the kid; PDF is human-readable summary
- Rate-limited: 1 request per 7 days per kid (to prevent abuse)

### [API] DPDP endpoints
**Target**: `app/api/dpdp/consent/route.ts`, `app/api/dpdp/erasure/route.ts`, `app/api/dpdp/export/route.ts`, `app/api/dpdp/consent/audit/route.ts`
**Action**: Create
**Requirements**:
- `POST /api/dpdp/consent` — record new consent (post OTP affirmation)
- `GET /api/dpdp/consent` — parent's consent status list
- `DELETE /api/dpdp/consent?scope=` — revoke
- `GET /api/dpdp/consent/audit?kidId=` — full audit log
- `POST /api/dpdp/erasure` — request data deletion
- `GET /api/dpdp/erasure/[id]` — status
- `GET /api/dpdp/export?kidId=` — generate export
- All endpoints: authenticated parent of kid OR schoolAdmin (latter for DPO operations)

### [FE] Consent collection UI
**Target**: `components/parent/ConsentRegister.tsx`
**Action**: Create
**Requirements**:
- Plain-language explanation per scope (no legalese)
- Checkbox per scope + "I am the parent / legal guardian" affirmation
- OTP re-verification on first submission
- Can change anytime in parent settings

### [FE] Erasure + export UI
**Target**: `components/parent/DataRightsPanel.tsx`, `app/(auth)/parent/settings/data-rights/page.tsx`
**Action**: Create
**Requirements**:
- "Download my child's data" button → triggers export endpoint, emails download link when ready
- "Delete my child's account" → multi-step confirmation, 30-day grace period explained
- Erasure status tracker

### [LIB] Upstream consent enforcement hooks
**Target**: various services (modify)
**Action**: Modify
**Requirements**:
- Every AI generator endpoint checks `hasConsent(parentUid, kidId, 'ai_generation')` before running
- Every message send checks `hasConsent(parentUid, kidId, 'parent_messaging')`
- Analytics dashboards read `analytics` scope
- Share/Explore checks `peer_sharing`

### [TEST] DPDP cascade tests
**Target**: `lib/dpdp/__tests__/dataErasure.test.ts`, `lib/dpdp/__tests__/consentService.test.ts`
**Action**: Create
**Requirements**:
- Erasure cascades across ALL collections (spot-check each)
- Consent revoke stops all downstream activity within 1 minute
- Export contains 100% of referenced records
- Audit log immutable

## Acceptance Criteria
- [ ] Parents capture consent per scope with OTP
- [ ] Revoking consent stops all affected flows within 1 minute
- [ ] Erasure request cascades and completes within 30 days
- [ ] Erasure receipt is signed and downloadable
- [ ] Data export produces JSON + PDF
- [ ] Audit log is tamper-evident
- [ ] Every AI generator gates on consent
