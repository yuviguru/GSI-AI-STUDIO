# ADMIN-001: Teacher Admin Portal

## Description
Teacher role accounts that can manage classes, invite students, assign creation tasks, and view student progress. Teachers sign up with a school code, get verified, and access a dedicated dashboard. The `schools`, `classes`, and `assignments` collections are already defined in the data model. This is the B2B revenue enabler.

## Requires KB Updates
- Update `docs/data-model.md` with confirmed school/class/assignment schemas
- Update `docs/security.md` with teacher role permissions

## Dependencies
- AUTH-001 (Phone OTP Authentication)
- PROFILE-001 (Kid profiles — students are kids linked to classes)

## Subtasks

### [LIB] Create school service
**Target**: `lib/firebase/schoolService.ts`
**Action**: Create
**Requirements**:
- `createSchool(data): Promise<SchoolDoc>` — create school record
- `createClass(schoolId, data): Promise<ClassDoc>` — create a class under school
- `addStudentToClass(classId, kidId): Promise<void>` — link kid profile to class
- `removeStudentFromClass(classId, kidId): Promise<void>` — unlink
- `getClassStudents(classId): Promise<KidDoc[]>` — list students in class
- `generateInviteCode(classId): Promise<string>` — 6-char alphanumeric code
- `joinClassByCode(code, kidId): Promise<ClassDoc>` — student joins via code
- SchoolDoc: `{ id, name, city, state, board, adminUid, createdAt }`
- ClassDoc: `{ id, schoolId, name, grade, section, teacherUid, studentKidIds: string[], inviteCode, createdAt }`

### [API] Create teacher authentication flow
**Target**: `app/api/auth/teacher/route.ts`
**Action**: Create
**Requirements**:
- `POST /api/auth/teacher/register` — register as teacher with school code + phone verification
- Validates school code against `schools` collection
- Sets custom claim `role: 'teacher'` on Firebase Auth user
- Creates teacher profile in `users` collection with `role: 'teacher'`
- `GET /api/auth/teacher/verify` — check if current user has teacher role

### [FE] Create Teacher Dashboard page
**Target**: `app/(auth)/teacher/page.tsx`
**Action**: Create
**Requirements**:
- Requires teacher role (redirect if not teacher)
- **My Classes**: grid of class cards with student count, recent activity
- **Quick Actions**: "Create Assignment", "View Reports", "Add Class"
- **Activity Feed**: recent student submissions across all classes
- Stats bar: total students, total submissions this week, avg concepts per student

### [FE] Create ClassManagement component
**Target**: `components/teacher/ClassManagement.tsx`
**Action**: Create
**Requirements**:
- Class detail view: name, grade, student roster
- Invite code display with "Copy" and "Share" buttons
- Student list: avatar, name, creation count, last active, concepts learned
- "Add Student" manually or via invite code
- "Remove Student" with confirmation
- Sort students by: name, activity, concepts learned

### [FE] Create AssignmentCreator component
**Target**: `components/teacher/AssignmentCreator.tsx`
**Action**: Create
**Requirements**:
- Form fields:
  - Title: "Create a story about the water cycle"
  - Description: detailed instructions
  - Creation type: Story / Music / Quiz / Game / Comic (radio)
  - Due date: date picker
  - Class: class selector dropdown
  - Curriculum tags: multi-select from CBSE curriculum map
  - Optional: template or prompt starter to include
- Preview before publish
- "Assign" button creates assignment and notifies students

### [API] Create assignment endpoints
**Target**: `app/api/assignments/route.ts`, `app/api/assignments/[id]/route.ts`
**Action**: Create
**Requirements**:
- `POST /api/assignments` — create assignment (teacher only)
- `GET /api/assignments` — list assignments for teacher or student
  - Teacher: all assignments across their classes
  - Student: assignments for their classes, with submission status
- `GET /api/assignments/[id]` — single assignment with submissions
- `PATCH /api/assignments/[id]` — update assignment (extend deadline, etc.)
- Assignment schema: `{ id, title, description, creationType, classId, teacherUid, dueDate, curriculumTags, templateId?, status: 'active' | 'closed', submissions: number, createdAt }`

### [FE] Create StudentAssignmentView component
**Target**: `components/student/AssignmentView.tsx`
**Action**: Create
**Requirements**:
- Shows in student's dashboard: list of pending assignments
- Each assignment: title, type badge, due date, status (pending/submitted/late)
- "Start" button navigates to appropriate studio with `assignmentId` in URL
- After creation: auto-submits to assignment
- Past-due assignments marked but still submittable

## Acceptance Criteria
- [ ] Teachers can register with school code
- [ ] Teachers can create classes and generate invite codes
- [ ] Students can join classes via invite code
- [ ] Teachers can create assignments with creation type and due date
- [ ] Students see pending assignments in their dashboard
- [ ] Starting an assignment navigates to the correct studio
- [ ] Completed creations auto-link to assignments
- [ ] Teacher dashboard shows class activity and stats
- [ ] Student roster shows per-student progress
