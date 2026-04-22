# ADMIN-006: AI-Assisted Submission Feedback

## Description
Extends Phase 3 submission review with a "Suggest feedback" button. Claude analyzes the kid's creation + curriculum tags + student history and drafts: 1-para positive observation + 1-para growth area + 2-3 concept-aligned follow-up prompts. Teacher edits and approves — never auto-sends. Small enhancement, big teacher-time win. Low-risk because always human-in-the-loop.

## Requires KB Updates
- Update `docs/api-contracts.md` with new feedback-suggestion endpoint

## Dependencies
- ADMIN-002 (Assignment & Submission System) — existing review flow
- QA-001 (AI Eval Harness) — feedback tone tests

## Subtasks

### [LIB] Create feedback suggester
**Target**: `lib/ai/feedbackSuggester.ts`
**Action**: Create
**Requirements**:
- `suggestFeedback(submissionId): Promise<FeedbackDraft>` — `{ positive, growthArea, followUpPrompts: string[] }`
- Loads: submission + creation data + curriculum tags + kid's prior approvals (last 5)
- Prompt-caches the rubric + tone guidelines
- Tone: encouraging, specific, grade-appropriate, no generic praise
- Returns <150 words total for easy teacher review

### [API] Add feedback-suggestion endpoint
**Target**: `app/api/assignments/[id]/submissions/[submissionId]/suggest-feedback/route.ts`
**Action**: Create
**Requirements**:
- `POST /api/assignments/[id]/submissions/[submissionId]/suggest-feedback`
- Returns `FeedbackDraft`; does NOT persist
- Rate-limited: 30/minute per teacher
- Teacher/schoolAdmin role only
- Logs usage for `teacherAiUsage` aggregate (fed into B4 compliance)

### [FE] Add "Suggest feedback" to SubmissionReview
**Target**: `components/teacher/SubmissionReview.tsx`
**Action**: Modify
**Requirements**:
- New button above the feedback textarea: "✨ Suggest feedback"
- On click: loading spinner, calls endpoint, streams result into textarea
- "Revert to blank" button to discard suggestion
- Preserves existing manual-input workflow — button is additive

### [TEST] Feedback tone + accuracy tests
**Target**: `lib/ai/__tests__/feedbackSuggester.test.ts`
**Action**: Create
**Requirements**:
- Golden set: 10 submissions with expected feedback themes
- Checks: word count <150, no generic phrases ("Great job!"), mentions specific concept from creation
- No cross-student PII leakage

## Acceptance Criteria
- [ ] Teacher clicks "Suggest feedback" in review UI
- [ ] Draft appears in textarea within 5s
- [ ] Teacher can edit or discard before approving
- [ ] Never auto-sends to student
- [ ] Rate-limited 30/minute
- [ ] Pilot: teachers accept >60% of drafts with <25% edits
- [ ] Passes golden-set eval
