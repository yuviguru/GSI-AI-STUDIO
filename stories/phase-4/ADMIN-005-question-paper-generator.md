# ADMIN-005: CBSE Blueprint-Aware Question Paper Generator

## Description
Teachers spend 8-10 hrs/week creating question papers and worksheets. This feature generates CBSE blueprint-aware papers from subject × class × chapters × difficulty mix × Bloom's distribution. Supports bring-your-own-chapter PDF upload OR built-in NCERT chapter index (see CONTENT-001). Outputs print-ready PDF with school letterhead, marking scheme, and blueprint table. Competitive space (Testmate, CraftExam, SchoolDeck) — we win on UX + price + curriculum freshness.

## Requires KB Updates
- Update `docs/data-model.md` with `questionPapers` collection
- Update `docs/api-contracts.md` with `/api/papers/*` endpoints
- Update `docs/architecture.md` with paper generator in AI services

## Dependencies
- ADMIN-009 (School Settings + Branding) — letterhead for PDF
- CONTENT-001 (NCERT Chapter Index) — chapter picker data
- PLATFORM-007 (English + Hindi AI output) — regional paper generation
- QA-001 (AI Eval Harness) — blueprint compliance tests

## Subtasks

### [LIB] Create question paper generator
**Target**: `lib/ai/questionPaperGenerator.ts`
**Action**: Create
**Requirements**:
- `generateQuestionPaper(input): Promise<QuestionPaperDraft>` where input = `{ subject, classGrade, chapters: string[], totalMarks, durationMinutes, bloomsDistribution: { remember, understand, apply, analyze, evaluate, create }, difficultyMix: { easy, medium, hard }, questionTypes: QuestionTypeSpec[], locale }`
- `QuestionTypeSpec`: `{ type: 'mcq' | 'short' | 'long' | 'application' | 'case-study', count, marksEach }`
- Uses NCERT chapter context or uploaded chapter text as source
- Returns paper sections, questions with answer keys, marking scheme, blueprint table
- Reuses quiz-studio prompting patterns from `lib/ai/`

### [LIB] Paper persistence helpers
**Target**: `lib/firebase/questionPaperService.ts`
**Action**: Create
**Requirements**:
- `createQuestionPaper(data): Promise<QuestionPaperDoc>`
- `listQuestionPapers(teacherUid, filters): Promise<QuestionPaperDoc[]>`
- `getQuestionPaper(id): Promise<QuestionPaperDoc>`
- `cloneQuestionPaper(id): Promise<QuestionPaperDoc>` — for iteration
- Collection: `questionPapers` at root level, teacher-scoped

### [API] Create paper endpoints
**Target**: `app/api/papers/route.ts`, `app/api/papers/[id]/route.ts`, `app/api/papers/[id]/export/route.ts`
**Action**: Create
**Requirements**:
- `POST /api/papers/generate` — body as above → draft (not persisted)
- `POST /api/papers` — persist final paper
- `GET /api/papers` — list teacher's papers
- `GET /api/papers/[id]` — fetch paper + answer key
- `PATCH /api/papers/[id]` — edit questions
- `GET /api/papers/[id]/export?variant=question|answer|blueprint` — PDF export

### [FE] Create QuestionPaperGenerator page
**Target**: `app/(auth)/teacher/papers/page.tsx`, `app/(auth)/teacher/papers/new/page.tsx`, `app/(auth)/teacher/papers/[id]/page.tsx`
**Action**: Create
**Requirements**:
- List view: past papers with filter by subject / class / date
- New paper: multi-step wizard (subject → chapters → blueprint → preview)
- Chapter picker: NCERT index OR upload PDF
- Blueprint visualizer: bar chart of Bloom's distribution

### [FE] Create QuestionPaperEditor component
**Target**: `components/teacher/QuestionPaperGenerator.tsx`, `components/teacher/QuestionPaperEditor.tsx`
**Action**: Create
**Requirements**:
- Editable question list with regenerate-single-question button
- Drag to reorder sections
- Marks recount on edit
- Three export buttons: Question paper / Answer key / Blueprint table

### [TEST] Blueprint compliance tests
**Target**: `lib/ai/__tests__/questionPaperGenerator.test.ts`
**Action**: Create
**Requirements**:
- Generated paper's actual Bloom's distribution matches requested within ±10%
- Total marks match spec
- No out-of-chapter content (grep question text against chapter scope)

## Acceptance Criteria
- [ ] Teacher generates paper from chapters + blueprint
- [ ] BYO chapter PDF upload works
- [ ] Generated paper matches requested blueprint within ±10%
- [ ] Three PDF exports (question / answer / blueprint) with school letterhead
- [ ] English + Hindi output
- [ ] Generation <30s for a 3-hour paper
- [ ] Teacher can edit individual questions and regenerate
