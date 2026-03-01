# ADMIN-002: Assignment & Submission System

## Description
Complete assignment lifecycle: teachers create assignments, students see them in their dashboard, create content tagged to the assignment, and teachers review submissions with feedback. Includes curriculum tag auto-mapping and compliance reporting showing how assignments map to CBSE AI curriculum.

## Requires KB Updates
- None

## Dependencies
- ADMIN-001 (Teacher Admin Portal — class and assignment infrastructure)

## Subtasks

### [FE] Create SubmissionReview component
**Target**: `components/teacher/SubmissionReview.tsx`
**Action**: Create
**Requirements**:
- Teacher view of a single student submission
- Embeds the appropriate viewer (StoryViewer, MusicPlayer, QuizPlayer, etc.) in readOnly mode
- Feedback section: text area for teacher comments
- Status actions: "Approve", "Request Revision", "Star" (highlight as exemplary)
- AI concepts covered: auto-populated from creation's `aiConceptsTaught` field
- Curriculum alignment: shows which CBSE topics this submission covers
- Navigation: Previous / Next student buttons

### [FE] Create SubmissionGrid component
**Target**: `components/teacher/SubmissionGrid.tsx`
**Action**: Create
**Requirements**:
- Grid view of all submissions for an assignment
- Each card: student avatar + name, creation thumbnail, submission date, status badge
- Filter: All / Pending / Approved / Revision Requested
- Sort: by date, by student name
- Bulk actions: "Approve all pending"
- Empty state: "No submissions yet. Waiting for students..."
- Progress bar: "12/25 submitted"

### [API] Create submission endpoints
**Target**: `app/api/assignments/[id]/submissions/route.ts`
**Action**: Create
**Requirements**:
- `POST /api/assignments/[id]/submissions` — submit a creation to an assignment
  - Body: `{ creationId }`
  - Validates student is in the assignment's class
  - Validates creation type matches assignment type
  - Updates creation doc: sets `assignmentId`
  - Updates assignment: increments `submissions` count
- `GET /api/assignments/[id]/submissions` — list submissions (teacher only)
  - Returns submissions with student profile + creation data
  - Includes submission status and teacher feedback
- `PATCH /api/assignments/[id]/submissions/[submissionId]` — teacher review
  - Body: `{ status: 'approved' | 'revision_requested', feedback?: string, starred?: boolean }`

### [FE] Integrate assignment flow into studios
**Target**: `app/(public)/create/story/StoryStudioClient.tsx` (and all studios)
**Action**: Update
**Requirements**:
- Read `assignmentId` from URL search params
- If present: show assignment banner at top ("Assignment: Create a story about...")
- After creation: auto-submit to assignment via API
- Show success toast: "Submitted to assignment!"
- Hide the creation type selector (locked to assignment type)
- Same integration for Music, Quiz, Game, Comic studios

### [LIB] Create compliance report generator
**Target**: `lib/export/complianceReport.ts`
**Action**: Create
**Requirements**:
- `generateComplianceReport(classId, dateRange): Promise<Blob>` — PDF report
- Contents:
  - Class info: name, grade, student count
  - Curriculum coverage: heatmap of CBSE AI topics covered by assignments
  - Per-student summary: assignments completed, concepts covered, creation types
  - Assignment completion rates
- Format: formal, printable, suitable for school administration
- Uses `jspdf` dependency

### [FE] Add assignment notifications
**Target**: `lib/notifications/triggers.ts`
**Action**: Update
**Requirements**:
- `notifyNewAssignment(studentIds, assignment)` — notify all students in class
- `notifySubmissionReviewed(studentId, assignment, status)` — notify student of teacher feedback
- `notifyAssignmentDueSoon(studentIds, assignment)` — reminder 24hr before due date
- Integrates with PLATFORM-002 notification system

## Acceptance Criteria
- [ ] Students can submit creations to assignments
- [ ] Teachers can review submissions with feedback
- [ ] Approval and revision request statuses tracked
- [ ] Assignment banner shows in studios when creating for assignment
- [ ] Auto-submission after creation when assignment context present
- [ ] Compliance report generates with curriculum mapping
- [ ] Notifications sent for new assignments, reviews, and due date reminders
- [ ] Bulk approval works for teachers with many submissions
