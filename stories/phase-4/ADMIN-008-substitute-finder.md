# ADMIN-008: Substitute-Teacher Finder

## Description
Morning emergency: a teacher calls in sick at 8:45am. The admin needs to find a substitute with a free period, matching subject preference, reasonable seniority — fast. This feature ranks candidate subs from the school roster and generates a Claude-drafted instruction sheet for the period (using the absent teacher's lesson plan for that day if available from ADMIN-007). Requires a new `teacherTimetable` Firestore collection (hydrated manually or via D5 ERP integration).

## Requires KB Updates
- Update `docs/data-model.md` with `teacherTimetable` collection
- Update `docs/api-contracts.md` with `/api/substitutes/*` endpoints

## Dependencies
- ADMIN-001 (Teacher Admin Portal) — roster
- ADMIN-007 (Lesson Plan Generator) — source for sub instructions
- INTEGRATION-001 (ERP Layer) — optional timetable hydration

## Subtasks

### [LIB] Create timetable service
**Target**: `lib/firebase/timetableService.ts`
**Action**: Create
**Requirements**:
- `getTeacherTimetable(schoolId, teacherUid): Promise<TimetableDoc>`
- `saveTeacherTimetable(schoolId, teacherUid, data): Promise<void>`
- `findFreeTeachersForPeriod(schoolId, weekday, periodIdx): Promise<TeacherUid[]>`
- Schema: `teacherTimetable/{schoolId}/teachers/{teacherUid}` = `{ periods: { monday: [{subject, classId}], tuesday: [...], ... }, subjects: string[], seniority: number }`

### [LIB] Create sub-instructions generator
**Target**: `lib/ai/subInstructionsGenerator.ts`
**Action**: Create
**Requirements**:
- `generateSubInstructions(input): Promise<SubInstructionsDraft>` input `{ classId, subject, periodIdx, lessonPlanId? }`
- Output: 5-minute recap of topic, 20-minute backup activity, homework / classwork to assign, behavioral reminders
- If `lessonPlanId` provided, uses that day's plan; else falls back to last-taught-topic summary from submissions

### [API] Sub-finder endpoints
**Target**: `app/api/substitutes/route.ts`, `app/api/substitutes/instructions/route.ts`
**Action**: Create
**Requirements**:
- `POST /api/substitutes/find` — body `{ absentTeacherUid, date, periodIdxs: number[] }` → ranked candidate list per period with `{ teacherUid, score, reasoning }`
- `POST /api/substitutes/instructions` — body `{ absentTeacherUid, date, periodIdx }` → Claude-drafted instructions
- SchoolAdmin role only

### [FE] Substitute finder page
**Target**: `app/(auth)/school/substitutes/page.tsx`, `components/admin/SubstituteFinder.tsx`
**Action**: Create
**Requirements**:
- Select absent teacher + date
- Shows today's periods with status (class subject, candidate sub ranked list)
- One-click "Assign sub" sends in-app notification to candidate (uses NOTIF-001)
- "Generate instructions" opens Claude draft for that period
- Export combined sub-day PDF

### [FE] Timetable editor
**Target**: `components/admin/TimetableEditor.tsx`
**Action**: Create
**Requirements**:
- Grid editor: weekday × period × (subject + class + teacher)
- Bulk-paste CSV support for fast onboarding
- Copy-from-last-term button

## Acceptance Criteria
- [ ] Admin can input teacher timetables (CSV or manual)
- [ ] Candidate subs ranked within 2s for a given absent teacher + period
- [ ] Ranking uses: free period, subject match, seniority, recent-sub-load fairness
- [ ] Sub instructions generate in <10s
- [ ] Notifications delivered to assigned sub
- [ ] Exported sub-day PDF
