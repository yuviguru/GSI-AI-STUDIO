# ADMIN-003: School Dashboard & Analytics

## Description
School-level analytics dashboard for principals and administrators: total active students, creations per week, curriculum coverage heatmap, teacher activity, and inter-school competition leaderboards. Enables data-driven decision making for AI education programs and provides compliance evidence for CBSE AI curriculum adoption.

## Requires KB Updates
- None

## Dependencies
- ADMIN-001 (Teacher Admin Portal)
- ADMIN-002 (Assignment & Submission System)

## Subtasks

### [API] Create analytics aggregation
**Target**: `app/api/admin/analytics/route.ts`
**Action**: Create
**Requirements**:
- `GET /api/admin/analytics/school/[schoolId]` — school-wide analytics (admin only)
- Returns:
  - `totalStudents`, `activeStudentsThisWeek`, `totalCreations`, `creationsThisWeek`
  - `creationsByType`: `{ story: N, music: N, quiz: N, game: N, comic: N }`
  - `curriculumCoverage`: array of `{ conceptId, conceptName, studentsExposed, percentage }`
  - `teacherActivity`: array of `{ teacherName, assignmentsCreated, avgCompletionRate }`
  - `weeklyTrend`: array of `{ week, creations, students }` for last 8 weeks
- Aggregated from Firestore queries across classes and student profiles
- Cached in a `schoolAnalytics` collection (refreshed daily via Cloud Function)

### [FE] Create School Dashboard page
**Target**: `app/(auth)/school/page.tsx`
**Action**: Create
**Requirements**:
- Requires school admin role (redirect if not admin)
- **Stats Cards**: total students, weekly active, total creations, avg concepts/student
- **Weekly Trend Chart**: line chart showing creations and active students over 8 weeks
  - Use a lightweight chart library (e.g., `recharts` or pure SVG)
- **Curriculum Coverage Heatmap**: grid showing CBSE AI topics, colored by % coverage
- **Teacher Leaderboard**: table of teachers ranked by assignment completion rates
- **Class Breakdown**: expandable accordion per class with stats

### [FE] Create CurriculumHeatmap component
**Target**: `components/admin/CurriculumHeatmap.tsx`
**Action**: Create
**Requirements**:
- Grid of CBSE AI curriculum concepts organized by category
- Color scale: red (0-25% coverage) → yellow (25-50%) → green (50-75%) → dark green (75-100%)
- Tap a cell: shows which classes/assignments covered this concept
- Legend explaining color scale
- Responsive: scrollable on mobile

### [FE] Create TeacherActivityTable component
**Target**: `components/admin/TeacherActivityTable.tsx`
**Action**: Create
**Requirements**:
- Table columns: Teacher Name, Classes, Assignments Created, Avg Completion Rate, Last Active
- Sortable by any column
- Row click: navigate to teacher's class detail view
- Export as CSV button

### [API] Create inter-school competition endpoints
**Target**: `app/api/admin/competitions/route.ts`
**Action**: Create
**Requirements**:
- `GET /api/admin/competitions/leaderboard` — inter-school leaderboard
- Ranks schools by: total creations, curriculum coverage, active student %
- Returns top 20 schools with anonymous identifiers (school name, city)
- Optional: filter by board (CBSE/ICSE), state, grade range
- Updated weekly

### [FE] Create compliance export
**Target**: `components/admin/ComplianceExport.tsx`
**Action**: Create
**Requirements**:
- "Generate Compliance Report" button on school dashboard
- Date range selector: last month, last quarter, custom range
- Generates PDF via `complianceReport.ts` (from ADMIN-002)
- Report includes: curriculum mapping, student participation, teacher activity
- Formatted for CBSE audit submission
- Download as PDF with school letterhead area

## Acceptance Criteria
- [ ] School dashboard shows key metrics and weekly trends
- [ ] Curriculum coverage heatmap visualizes CBSE AI topic coverage
- [ ] Teacher activity table with sorting and CSV export
- [ ] Inter-school leaderboard shows anonymous rankings
- [ ] Compliance report generates as PDF with curriculum mapping
- [ ] Analytics refresh daily (or on-demand)
- [ ] Dashboard requires school admin authentication
- [ ] Responsive layout works on tablet and desktop
