# INTEGRATION-001: School Data Provider Interface + ERP Adapters

## Description
Indian schools already run ERP systems (Fedena, MasterSoft, Schoollog, Neverskip). Asking them to re-enter attendance, timetable, and roster data into GSI is a non-starter. This feature defines a provider-agnostic `SchoolDataProvider` interface with a `LocalProvider` (reads GSI's own Firestore as the default) and one reference third-party adapter (Fedena) to prove the plug-in pattern end-to-end. Additional adapters (MasterSoft, Schoollog, Neverskip) build on-demand as partner schools request them.

## Requires KB Updates
- Update `docs/architecture.md` with provider interface + adapter pattern
- Update `docs/api-contracts.md` with `/api/integrations/erp/*`
- Update `docs/data-model.md` with `erpIntegrations` collection

## Dependencies
- ADMIN-008 (Substitute Finder consumes timetable data)
- ADMIN-004 (HPC consumes attendance for richer narratives)

## Subtasks

### [LIB] Provider interface
**Target**: `lib/integrations/schoolDataProvider.ts`
**Action**: Create
**Requirements**:
- `interface SchoolDataProvider { id: string; fetchRoster(schoolId): Promise<RosterEntry[]>; fetchAttendance(schoolId, dateRange): Promise<AttendanceRecord[]>; fetchTimetable(schoolId): Promise<TimetableRecord[]>; healthCheck(): Promise<ProviderHealth> }`
- `resolveProvider(schoolId): Promise<SchoolDataProvider>` — reads `erpIntegrations` config, falls back to LocalProvider
- Caches per request

### [LIB] Local provider (default)
**Target**: `lib/integrations/adapters/localProvider.ts`
**Action**: Create
**Requirements**:
- Reads from existing Firestore collections (classes, kids, teacherTimetable, attendance once built)
- Always available, no config
- Used by all Phase 4 features as baseline

### [LIB] Fedena reference adapter
**Target**: `lib/integrations/adapters/fedenaProvider.ts`
**Action**: Create
**Requirements**:
- Wraps Fedena REST API (token auth)
- Maps Fedena schema → GSI `RosterEntry / AttendanceRecord / TimetableRecord`
- Read-only (no writes back to Fedena in v1)
- Handles rate limits + retries

### [LIB] Integration configuration
**Target**: `lib/firebase/erpIntegrationService.ts`
**Action**: Create
**Requirements**:
- `setErpIntegration(schoolId, { provider, credentials }): Promise<void>` — encrypted credential storage
- `removeErpIntegration(schoolId): Promise<void>`
- Credentials encrypted at rest (KMS / env-based key)
- Health check runs on save + daily

### [API] Integration endpoints
**Target**: `app/api/integrations/erp/route.ts`, `app/api/integrations/erp/test/route.ts`, `app/api/integrations/erp/sync/route.ts`
**Action**: Create
**Requirements**:
- `GET /api/integrations/erp` — current config + health
- `PUT /api/integrations/erp` — save config (admin only)
- `DELETE /api/integrations/erp` — remove
- `POST /api/integrations/erp/test` — test connection
- `POST /api/integrations/erp/sync` — manual sync trigger

### [FE] ERP integration settings
**Target**: `components/admin/ErpIntegrationSettings.tsx`, `app/(auth)/school/integrations/page.tsx`
**Action**: Create
**Requirements**:
- Provider dropdown (Local / Fedena / "Request other…")
- Credential form per provider
- Test-connection button
- Last-sync status + manual sync trigger
- Security note: "credentials stored encrypted; read-only access"

### [TEST] Provider interface tests
**Target**: `lib/integrations/__tests__/`
**Action**: Create
**Requirements**:
- LocalProvider: returns expected Firestore shape
- FedenaProvider: mocked API response → correct mapping
- `resolveProvider` falls back to Local when no config
- Credential encryption at rest

## Acceptance Criteria
- [ ] `SchoolDataProvider` interface defined and documented
- [ ] LocalProvider backs all Phase 4 features by default
- [ ] FedenaProvider reads roster + attendance + timetable
- [ ] Admin can configure + test ERP connection
- [ ] Credentials stored encrypted
- [ ] New adapter can be added with ~1 week of work and no changes to consumers
