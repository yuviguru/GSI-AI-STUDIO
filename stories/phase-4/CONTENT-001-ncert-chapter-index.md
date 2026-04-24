# CONTENT-001: NCERT Chapter Index (Seed Content)

## Description
Curated data set mapping CBSE NCERT chapters (Class 3-12) to learning outcomes and AI-CT concept tags. Consumed by the Question Paper Generator (ADMIN-005), Lesson Plan Generator (ADMIN-007), and HPC Narrative Assistant (ADMIN-004) to produce curriculum-anchored outputs. This is primarily content work (scraping / curating NCERT portals + CBSE learning outcome documents) with a thin code layer. Can run in parallel with code sprints.

## Requires KB Updates
- Update `docs/architecture.md` with NCERT index location + loader
- Update `docs/tech-standards.md` on curriculum data conventions

## Dependencies
- None (content-first)

## Subtasks

### [DATA] Curate NCERT chapter index
**Target**: `data/curriculum/ncert/` (new directory), `data/curriculum/ncert/{class}-{subject}.json`
**Action**: Create
**Requirements**:
- Priority order: Class 6-8 Maths + Science + English + Social Science (largest GSI user cohort) → then Class 3-5 → then Class 9-12
- Per chapter: `{ id, chapterNumber, chapterName, class, subject, board: 'cbse', learningOutcomes: string[], aiCtConceptTags: string[], durationHours, keyTerms: string[] }`
- Sources: NCERT Learning Outcomes booklets + CBSE curriculum documents + NEP HPC guide
- Deliverable: JSON files under `data/curriculum/ncert/`

### [LIB] Curriculum loader
**Target**: `lib/curriculum/ncertIndex.ts`
**Action**: Create
**Requirements**:
- `listChapters({ subject, classGrade }): ChapterEntry[]`
- `getChapter(id): ChapterEntry | null`
- `searchChapters(query): ChapterEntry[]` — lightweight in-memory search
- `getChaptersByAiCtConcept(conceptId): ChapterEntry[]`
- Loads from JSON files at build time

### [LIB] Extend curriculumMap
**Target**: `lib/curriculum/curriculumMap.ts` (modify)
**Action**: Modify
**Requirements**:
- Add bidirectional map: AI-CT concept ↔ NCERT chapters where that concept can be taught
- Enables cross-reference: "teacher teaching chapter X → which AI-CT concepts are relevant?"

### [FE] Chapter picker component
**Target**: `components/teacher/ChapterPicker.tsx`
**Action**: Create
**Requirements**:
- Typeahead search on chapter name
- Filter by class + subject
- Used by ADMIN-005 and ADMIN-007 generators
- Multi-select for question paper generator

### [TEST] Index integrity tests
**Target**: `lib/curriculum/__tests__/ncertIndex.test.ts`
**Action**: Create
**Requirements**:
- All JSON files parse without errors
- Every chapter has non-empty learningOutcomes
- No duplicate chapter IDs
- Concept tags all reference valid AI-CT concept IDs

## Acceptance Criteria
- [ ] Class 6-8 fully indexed (all 4 subjects) at launch
- [ ] Chapter picker typeahead works with <100ms response
- [ ] Question paper + lesson plan generators consume chapter data correctly
- [ ] Concept ↔ chapter cross-references resolve
- [ ] Data integrity tests pass in CI
