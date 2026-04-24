# QA-001: AI Evaluation & Safety Harness

## Description
Golden-set tests for every AI generator (HPC, question paper, feedback, lesson plan, PTM note, WhatsApp digest, sub instructions, ad-hoc message) to prevent regressions when prompts evolve. Each generator has a small fixtures directory with synthetic inputs + expected output shape + structural / semantic assertions. Runs in CI on every PR that touches `lib/ai/**`. Not measuring absolute quality — measuring "didn't regress from the baseline we validated."

## Requires KB Updates
- Update `docs/tech-standards.md` with AI testing conventions

## Dependencies
- All AI generator stories (ADMIN-004 to ADMIN-008, COMMS-001/002)

## Subtasks

### [LIB] Eval harness core
**Target**: `lib/ai/eval/runner.ts`
**Action**: Create
**Requirements**:
- `runEvalSuite(suite: EvalSuite): Promise<EvalReport>`
- `EvalSuite`: `{ name, generator, cases: EvalCase[] }`
- `EvalCase`: `{ id, input, assertions: Assertion[] }`
- Builtin assertions: `hasKeys`, `lengthBetween`, `containsConcept`, `localeIs`, `noCrossStudentLeakage`, `matchesBlueprint`, `noGenericPhrases`
- Reports per-case pass/fail + structured diff

### [DATA] Golden-set fixtures
**Target**: `lib/ai/eval/fixtures/{generator}/*.json`
**Action**: Create
**Requirements**:
- 5-10 cases per generator covering: happy path, edge cases (empty tags, minimal data), locale variants (en + hi), structural validation
- Each fixture is deterministic — no real student data; all synthetic

### [LIB] Per-generator suites
**Target**: `lib/ai/eval/suites/{generator}.suite.ts`
**Action**: Create
**Requirements**:
- One suite per generator: hpc, questionPaper, feedback, lessonPlan, ptm, adhoc, digest, subInstructions
- Wire into runner

### [TEST] CI integration
**Target**: `vitest.config.ts` (modify), `.github/workflows/ci.yml` (modify if exists)
**Action**: Modify
**Requirements**:
- New test script: `pnpm test:ai-eval`
- Runs nightly and on PRs touching `lib/ai/**`
- Fails PR if regression vs baseline snapshot
- Eval runs only if `ANTHROPIC_API_KEY` is present; otherwise skipped with warning

### [LIB] Baseline snapshot management
**Target**: `lib/ai/eval/baselines/`
**Action**: Create
**Requirements**:
- Baseline JSON per suite capturing "known-good" structural signature
- Updated with explicit `pnpm test:ai-eval --update` (human-reviewed)

### [FE] Admin eval report viewer (optional, later)
**Target**: `app/(internal)/eval/page.tsx`
**Action**: Create
**Requirements**:
- Latest report with pass / fail breakdown per suite
- Diff viewer for regressions
- Internal-only (gate on admin email allow-list)

## Acceptance Criteria
- [ ] Every AI generator has ≥5 golden-set cases
- [ ] Cases cover en + hi where applicable
- [ ] PR regressions surface in CI
- [ ] Suite runs in <5 minutes total
- [ ] Baseline updates require explicit commit
