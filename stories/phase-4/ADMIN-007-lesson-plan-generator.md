# ADMIN-007: Lesson Plan Generator

## Description
Matches PRD Phase 3 promise (`docs/prd.md:131`) that was never built. Teacher picks class × chapter × duration; Claude drafts learning outcomes, hook activity, main activity (mapped to one of our studios where possible), closure, assessment, and differentiation notes. One-click "Create assignment from this lesson" ties it to Phase 3's assignment flow so lessons flow directly into classroom use.

## Requires KB Updates
- Update `docs/data-model.md` with `lessonPlans` collection schema
- Update `docs/api-contracts.md` with `/api/lessons/*` endpoints

## Dependencies
- CONTENT-001 (NCERT Chapter Index) — chapter picker
- ADMIN-002 (Assignment System) — assignment-from-lesson integration
- PLATFORM-007 (multilingual) — Hindi output

## Subtasks

### [LIB] Create lesson plan generator
**Target**: `lib/ai/lessonPlanGenerator.ts`
**Action**: Create
**Requirements**:
- `generateLessonPlan(input): Promise<LessonPlanDraft>` with input `{ subject, classGrade, chapterId, durationMinutes, locale, studioPreference? }`
- Output fields: `learningOutcomes[]`, `hookActivity`, `mainActivity { title, description, linkedStudio? }`, `closure`, `assessment { type, sample }`, `differentiation { lower, higher }`, `materials[]`
- `linkedStudio`: attempts to map main activity to `story | music | quiz | game | comic` studio; null if no fit
- Uses NCERT chapter context

### [LIB] Lesson plan persistence
**Target**: `lib/firebase/lessonPlanService.ts`
**Action**: Create
**Requirements**:
- `createLessonPlan(data): Promise<LessonPlanDoc>`
- `listLessonPlans(teacherUid, filters): Promise<LessonPlanDoc[]>`
- `getLessonPlan(id): Promise<LessonPlanDoc>`
- `cloneLessonPlan(id): Promise<LessonPlanDoc>`
- Collection: `lessonPlans`, teacher-scoped

### [API] Lesson plan endpoints
**Target**: `app/api/lessons/route.ts`, `app/api/lessons/[id]/route.ts`, `app/api/lessons/[id]/assignment/route.ts`
**Action**: Create
**Requirements**:
- `POST /api/lessons/generate` — draft
- `POST /api/lessons` — persist
- `GET /api/lessons` — list
- `PATCH /api/lessons/[id]` — edit
- `POST /api/lessons/[id]/assignment` — create assignment from lesson (uses existing `/api/assignments` internally)

### [FE] Lesson plan page + component
**Target**: `app/(auth)/teacher/lessons/page.tsx`, `app/(auth)/teacher/lessons/[id]/page.tsx`, `components/teacher/LessonPlanGenerator.tsx`, `components/teacher/LessonPlanEditor.tsx`
**Action**: Create
**Requirements**:
- List view with filters by subject / class / chapter
- New plan wizard: class → chapter → duration → generate
- Editor with section-level regenerate buttons
- "Create assignment from this lesson" button wired to assignment endpoint
- Export PDF with school letterhead

### [TEST] Lesson plan eval tests
**Target**: `lib/ai/__tests__/lessonPlanGenerator.test.ts`
**Action**: Create
**Requirements**:
- Golden-set: 5 chapters → expected outcome + studio-link rate
- Checks: learning outcomes tagged to NCERT, duration realistic, studio link resolves
- Hindi output preserves CBSE terminology

## Acceptance Criteria
- [ ] Teacher generates lesson plan in <15s
- [ ] Plan has all required sections populated
- [ ] "Create assignment from lesson" creates valid assignment
- [ ] English + Hindi
- [ ] PDF export with school letterhead
- [ ] Passes golden-set eval
