# NCERT Chapter Index (CONTENT-001)

Curated CBSE NCERT chapter metadata consumed by the Question Paper
Generator (ADMIN-005), Lesson Plan Generator (ADMIN-007), and HPC
Narrative Assistant (ADMIN-004).

## File naming

One JSON file per (class, subject):

```
data/curriculum/ncert/{class}-{subject}.json
```

Examples: `6-science.json`, `6-mathematics.json`, `7-social-science.json`.

## Entry schema

Each file is an array of chapter entries:

```json
{
  "id": "cbse-6-science-ch1",
  "chapterNumber": 1,
  "chapterName": "Food: Where Does It Come From?",
  "class": "6",
  "subject": "Science",
  "board": "cbse",
  "learningOutcomes": [
    "Identify sources of commonly used food items",
    "Classify ingredients as plant-based or animal-based"
  ],
  "aiCtConceptTags": ["classification", "data-collection"],
  "durationHours": 6,
  "keyTerms": ["ingredients", "herbivore", "omnivore"]
}
```

- `id` is globally unique: `cbse-{class}-{subject}-ch{n}` pattern.
- `aiCtConceptTags` references concept IDs in
  [`lib/curriculum/curriculumMap.ts`](../../../lib/curriculum/curriculumMap.ts).
  Tags that don't resolve are dropped at load time.
- `learningOutcomes` phrases should start with a Bloom's verb (identify,
  classify, explain, design, evaluate, create).

## Adding content

1. Pull the latest NCERT textbook contents page + Learning Outcomes
   booklet for the class/subject.
2. Create one entry per chapter; keep outcomes to 3-6 items each.
3. Run `pnpm typecheck` to confirm the index builds.
4. Content PRs live outside the regular `<TICKET-ID>` commit prefix —
   use `CONTENT-001: seed NCERT class X {subject}` instead.

## Sprint plan

- **Sprint 1 (this change)**: schema + loader + Class 6 Science seed.
- **Sprint 2**: Class 6 Mathematics + Social Science + English.
- **Sprint 3**: Classes 7-8 across the same four subjects.
- Classes 3-5 and 9-12 follow once Sprint 3 pilots validate generator
  quality.
