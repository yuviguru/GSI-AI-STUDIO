# ADMIN-004: HPC Narrative Assistant

## Description
NEP 2020 Holistic Progress Card (HPC) narrative drafting is the #1 teacher pain point in Indian CBSE schools. Teachers must write qualitative, multi-domain (cognitive / affective / psychomotor) narratives per child per term. This feature uses Claude to draft 3-paragraph narratives from student submissions + curriculum concepts + teacher quick-tags, then lets the teacher edit, approve, and export a CBSE-template PDF. Supports English + Hindi. This is the biggest India-specific differentiator in Phase 4.

## Requires KB Updates
- Update `docs/data-model.md` with `hpcNarratives` subcollection schema
- Update `docs/api-contracts.md` with `/api/hpc/*` endpoints
- Update `docs/architecture.md` to add HPC generator to the AI services section
- Update `docs/security.md` with teacher/admin role permissions on HPC data

## Dependencies
- ADMIN-001 (Teacher Admin Portal) — teacher role + class roster
- ADMIN-002 (Assignment & Submission System) — submission concept tags feed narratives
- ADMIN-009 (School Settings + Branding) — letterhead for PDF export
- PLATFORM-007 (English + Hindi AI output layer) — for regional narrative generation
- QA-001 (AI Eval Harness) — golden-set validation

## Subtasks

### [LIB] Create HPC generator service
**Target**: `lib/ai/hpcGenerator.ts`
**Action**: Create
**Requirements**:
- `generateHpcNarrative(input): Promise<HpcNarrativeDraft>` where input = `{ kidId, term, teacherTags: string[], locale: 'en' | 'hi' }`
- Assembles context: kid's submissions in the term, curriculum concepts covered, assignment approvals, teacher tags
- Calls Claude with HPC-specific system prompt (CBSE HPC Teacher Guide format)
- Returns 3 narrative paragraphs: cognitive, affective, psychomotor + suggested next-term focus
- Uses prompt caching on the rubric + locale glossary

### [LIB] Add hpcNarratives collection helpers
**Target**: `lib/firebase/schoolService.ts` (extend)
**Action**: Modify
**Requirements**:
- `getHpcNarrative(schoolId, kidId, term): Promise<HpcNarrativeDoc | null>`
- `saveHpcNarrative(schoolId, kidId, term, data): Promise<HpcNarrativeDoc>` — upsert
- `listHpcNarrativesForClass(schoolId, classId, term): Promise<HpcNarrativeDoc[]>`
- Path: `schools/{schoolId}/students/{kidId}/hpcNarratives/{term}`

### [API] Create HPC endpoints
**Target**: `app/api/hpc/route.ts`, `app/api/hpc/[id]/route.ts`, `app/api/hpc/[id]/export/route.ts`
**Action**: Create
**Requirements**:
- `POST /api/hpc/generate` — body `{ kidId, term, teacherTags, locale }` → returns draft (not persisted)
- `POST /api/hpc` — persist final edited narrative
- `PATCH /api/hpc/[id]` — update narrative
- `GET /api/hpc?classId=&term=` — list narratives for class + term
- `GET /api/hpc/[id]/export` — PDF with school letterhead
- All endpoints gated on teacher/schoolAdmin role

### [FE] Create HPCAssistant component
**Target**: `components/teacher/HPCAssistant.tsx`
**Action**: Create
**Requirements**:
- Mounted on student detail page inside teacher dashboard
- "Generate HPC draft" button + term selector + locale toggle (English / Hindi)
- Loads kid's submission + concept summary for context preview
- Shows quick-tag picker: punctual / creative / collaborative / struggles with X / strong at Y (multi-select)
- Calls `/api/hpc/generate`, streams result into editable 3-pane layout

### [FE] Create HPCEditor component
**Target**: `components/teacher/HPCEditor.tsx`
**Action**: Create
**Requirements**:
- Three editable paragraphs (cognitive / affective / psychomotor) + next-term focus
- Side-by-side English ↔ Hindi view with one-click translate
- Save draft / Publish final / Export PDF
- Version history (last 5 edits)

### [TEST] Unit tests for HPC generator
**Target**: `lib/ai/__tests__/hpcGenerator.test.ts`
**Action**: Create
**Requirements**:
- Golden-set: 5 synthetic student profiles → expected narrative structure
- Check: 3 paragraphs, domain-tagged, no PII leakage across students, Hindi translation preserves CBSE terminology

## Acceptance Criteria
- [ ] Teacher can generate HPC draft for any student in their class
- [ ] Draft uses submissions + curriculum + quick-tags, no fabricated data
- [ ] Editable English + Hindi side-by-side
- [ ] Final narrative persists under `schools/{schoolId}/students/{kidId}/hpcNarratives/{term}`
- [ ] Exports as CBSE-template PDF with school letterhead
- [ ] Generation completes in <15s for typical student
- [ ] Teacher-edit acceptance rate >70% (measured in pilot)
- [ ] Passes golden-set eval from QA-001
