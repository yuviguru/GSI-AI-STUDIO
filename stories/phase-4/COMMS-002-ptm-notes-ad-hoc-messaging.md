# COMMS-002: PTM Prep Notes + Ad-Hoc Parent Messaging

## Description
Two teacher-side comms tools built on COMMS-001's messaging layer: (1) "Draft PTM note" produces talking points for parent-teacher meetings by summarizing last-term data per student, and (2) "Message parent" drafts a short editable message from the teacher's one-line intent ("X is late submitting homework lately"). Sends via the parent's preferred channel (Telegram / WhatsApp) with teacher approval. Tight DPDP guardrails: consent-checked, no cross-student leakage in prompts.

## Requires KB Updates
- Update `docs/api-contracts.md` with PTM + ad-hoc message endpoints

## Dependencies
- COMMS-001 (Multi-Channel Parent Digest) — messaging layer + consent
- COMPLIANCE-002 (DPDP) — consent enforcement

## Subtasks

### [LIB] PTM note generator
**Target**: `lib/ai/ptmNoteGenerator.ts`
**Action**: Create
**Requirements**:
- `generatePtmNote(kidId, termRange): Promise<PtmNoteDraft>`
- Output sections: progress highlights, areas to discuss, recommended at-home practice, questions to ask parent
- Pulls from submissions + curriculum + teacher feedback + attendance (if available)
- Locale-aware (English / Hindi)
- No cross-student data in prompt context (isolate per student)

### [LIB] Ad-hoc message drafter
**Target**: `lib/ai/adhocMessageDrafter.ts`
**Action**: Create
**Requirements**:
- `draftParentMessage(input): Promise<MessageDraft>` input `{ kidId, teacherIntent: string, tone: 'informative' | 'concerned' | 'congratulatory', locale }`
- Output: 1-2 sentence draft, polite and specific
- Enforces: no PII beyond first name, no absolute judgements, includes teacher name
- Always human-review before send

### [API] PTM + messaging endpoints
**Target**: `app/api/comms/ptm/route.ts`, `app/api/comms/adhoc/route.ts`
**Action**: Create
**Requirements**:
- `POST /api/comms/ptm` — generate PTM note
- `GET /api/comms/ptm?classId=&term=` — list prior PTM notes
- `POST /api/comms/adhoc/draft` — draft message
- `POST /api/comms/adhoc/send` — route through `MessagingService` (COMMS-001)

### [FE] PTM prep view
**Target**: `components/teacher/PtmPrepBoard.tsx`, `app/(auth)/teacher/parent-comms/ptm/page.tsx`
**Action**: Create
**Requirements**:
- Select class + term → generate notes for whole class (batch)
- Printable booklet export
- Flag "needs attention" students visually

### [FE] Ad-hoc message composer
**Target**: `components/teacher/AdhocMessageComposer.tsx`
**Action**: Create
**Requirements**:
- Student picker + intent textarea + tone dropdown
- Shows draft + channel used + parent consent status
- "Regenerate" + "Send"
- Delivery confirmation in same view

### [TEST] Cross-student leakage + tone tests
**Target**: `lib/ai/__tests__/ptmNoteGenerator.test.ts`, `lib/ai/__tests__/adhocMessageDrafter.test.ts`
**Action**: Create
**Requirements**:
- Generate for student A; output must not mention student B even if both in class
- Tone classifier check: "concerned" outputs no praise padding
- PII scan: no phone numbers, addresses in output

## Acceptance Criteria
- [ ] PTM notes generate for whole class in under 60s
- [ ] Ad-hoc drafts under 3s
- [ ] Send goes through parent's preferred channel
- [ ] No cross-student leakage in any output
- [ ] Delivery status visible to teacher
- [ ] Pilot: >70% of drafts sent without edit
