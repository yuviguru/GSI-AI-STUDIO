# GSI AI Studio — Product Walkthrough

A guided tour through every feature in GSI AI Studio, from the kid creating
their first story to the school administrator configuring the entire campus.
Hand this to a new team member, a teacher evaluating the platform, a parent,
or an investor on a demo — they should be able to read it cold and understand
the whole product.

> Throughout this doc: **routes are absolute URLs** (e.g. `/teacher`),
> **page files** are referenced as `app/(public)/page.tsx` so engineers can
> jump to source, and feature-ticket prefixes (`COMMS-001`, `ADMIN-004` etc.)
> indicate which backend ticket the surface implements.

---

## 1 · What is GSI AI Studio?

A safety-first AI creation and learning platform for Indian kids (ages 8–17),
aligned to the CBSE AI & Computational-Thinking curriculum. Kids create
stories, books, music, comics, games, and quizzes with AI while learning how
AI actually works. Teachers and schools use the same platform to deliver
NCERT-anchored lesson plans, AI-graded feedback, parent communications, and
DPDP-compliant data governance.

The platform serves four distinct audiences, each with a dedicated dashboard:

| Audience | URL | What they do |
|---|---|---|
| **Kids** | `/` | Create with AI, learn AI/CT concepts, play creative challenges |
| **Parents** | `/parent/settings/data-rights` | Read their child's progress, manage consent, see school messages |
| **Teachers** | `/teacher` | Plan lessons, run classes, review submissions, message parents |
| **School Admins** | `/school` | Analytics, compliance, branding, integrations, school-wide messaging |

All four share one visual shell (3-column layout: sidebar + main + right rail)
configured per role from `lib/dashboard/configs/*.config.ts`. The same
illustrations, design tokens, and interaction patterns flow across every
surface — only the navigation and content differ.

---

## 2 · The Kid Experience

> **Who they are:** Indian kids ages 8–17. They land in an open-beta mode
> by default (no login required) — phone auth + parent linkage is optional
> but rewards them with full progress tracking. They use phones, tablets,
> classroom laptops, and the occasional projector display.

### 2.1 Where they enter

The home page at `/` (`app/(public)/page.tsx`). On first visit, a `ProfileSetupCarousel`
onboarding walks them through picking a mascot, an AI avatar, and an "X-Ray
lesson" that explains how AI sees the world.

### 2.2 The home dashboard

The kid home is a 3-column layout (on tablet landscape and up):

**Left rail — Sidebar navigation:**
- Dashboard (home)
- Create (expandable to six studios: Story, Book, Music, Comic, Game, Quiz)
- Beat AI
- Kid CEO
- Explore (community gallery)
- Learn (AI lab + skill arena)
- My Stuff (creations + library)
- Help / Settings (coming soon)
- Profile chip at the bottom — switch between sibling profiles

**Center — Section Hub:**
- A greeting ("Hi, Aarav! Let's create something today.")
- Three tabs: Recent / In Progress / Today (presentational at the moment)
- **Three hero cards — Create, Play, Learn** — clicking any one expands it
  inline like an accordion to reveal the studios it contains. Only one card
  expands at a time. This is `components/navigation/ExpandableSectionCard.tsx`.

```
┌────────────────────────────────────────────────────┐
│  CREATE                                         ⌃  │
│  Tell stories, write books, make music & more      │
│  [illustration]                                    │
├────────────────────────────────────────────────────┤
│  ┌────┬────┬────┬────┬────┬────┐                   │
│  │Sto │Boo │Mus │Com │Gam │Qui │  6 studios        │
│  └────┴────┴────┴────┴────┴────┘                   │
└────────────────────────────────────────────────────┘

  PLAY                                            ⌄
  Beat the AI or run your own kid business

  LEARN                                           ⌄
  Skill arena, AI Lab, and homework
```

**Right rail — At-a-glance widgets:**
- **Profile chip:** avatar, level (derived from total AI Points / 50),
  bell button → notifications, mail button (stub).
- **Today's Activity:** in-progress creations with progress bars. When there
  is no real activity, a small amber "Demo" ribbon appears with placeholder
  data — intentional and toggleable via `NEXT_PUBLIC_USE_DASHBOARD_PLACEHOLDERS`.
- **Daily Challenge:** illustrated CTA pointing at Beat the AI ("Win 30 AI
  Points"). Also placeholder-tagged.
- **Stats grid:** AI Points (real), Badges (real), Streak days (real).

### 2.3 The six creation studios

Each lives under `/create/*`. All follow the same 3-step pattern: prompt →
generate → review.

| Studio | URL | What kids do |
|---|---|---|
| **Story Studio** | `/create/story` | Type a prompt → AI writes an illustrated short story (3–6 panels). |
| **Book Studio** | `/create/book` | Long-form authoring: wizard collects characters/setting → page-by-page editor with per-page illustration → flipbook preview → printable PDF. Persistent state across sessions. |
| **Music Lab** | `/create/music` | Compose tracks; record sing-alongs over backing music using `SingAlongRecorder` (Web Audio mixed output). |
| **Comic Studio** | `/create/comic` | Multi-panel comics with speech bubbles. |
| **Game Studio** | `/create/game` | Branching text adventures. |
| **Quiz Maker** | `/create/quiz` | Build a quiz game with AI-generated questions. |

Every studio runs prompts and outputs through a safety pipeline
(`lib/safety/`) — kid-appropriate content only.

### 2.4 Play & Learn

| Surface | URL | What it is |
|---|---|---|
| **Beat the AI** | `/beat-the-ai` | Creative duels: kid and AI both create on a prompt, voters or judges pick the winner. |
| **Kid CEO** | `/ceo` | Business simulation. Hire agents, make decisions, watch your tiny business grow. |
| **Skill Arena** | `/skill-arena` | IELTS-style assessments (Speaking, Listening, Reading, Thinking). |
| **AI Lab** | `/learn` | Card-based AI education aligned to CBSE AI/CT curriculum. |

### 2.5 Their own gallery

- `/creations` — every creation the kid has ever made.
- `/explore` — community gallery, opt-in shared creations from other kids.

### 2.6 Engagement loops

- **AI Points:** earned for every creation, milestone, and challenge win. The
  number drives the level shown on the profile chip.
- **Badges:** ~30 named achievements (e.g. "First Story", "5 Comics", "Streak
  Week"). Catalog in `lib/badges.ts`.
- **Streak:** consecutive days the kid created something. Visible in the
  right-rail stats grid.
- **Leaderboard:** classroom and school-wide.
- **Notifications:** assignments, feedback from teachers, badge unlocks,
  reminders. Inbox at `/notifications`.

### 2.7 Mobile experience

Below 1024px the sidebar collapses; a top header and a bottom navigation bar
(`components/layout/BottomNav.tsx`) take over. The hero cards stack
vertically. Expanded studios reflow from a 2-column grid (portrait phone)
to a 3-column grid (landscape phone, tablet) using
`grid-template-columns: repeat(auto-fit, minmax(140px, 1fr))` — no bespoke
breakpoints required.

---

## 3 · The Parent Experience

> **Who they are:** Indian parents of GSI Studio kids. Usually phone-first.
> Care about: their kid's progress, what data is collected, who messages
> them, and (occasionally) seeing what other kids in the class are making.

### 3.1 Where they enter

The parent home today is **`/parent/settings/data-rights`**. (A dedicated
landing page is on the roadmap; for now data-rights is the entry point —
appropriate, since DPDP transparency is the parent's primary contract with
the platform.)

### 3.2 Parent dashboard navigation

The dashboard shell shows:

**Left rail:**
- Dashboard
- My Children
- Messages & Digests
- Data & Consent
- Notifications
- Settings

The brand wordmark reads **"GSI for Parents"**.

### 3.3 Data & Consent (`/parent/settings/data-rights`) — COMPLIANCE-002

This is the DPDP-compliant cockpit. Parents can:

- **`ConsentRegister`:** see every consent scope (`ai_generation`,
  `parent_messaging`, `class_feed_visibility`, etc.) for each of their kids,
  with timestamps of when they granted/revoked.
- **`DataRightsPanel`:** exercise their DPDP rights — request a data export,
  request erasure of a kid's data, request correction. Each request goes
  into an erasure/rights queue surfaced to the DPO via the school admin
  dashboard.
- **Channel preferences (`ChannelPreferences`):** opt into or out of
  individual channels (Telegram, WhatsApp, Email) for parent-facing
  communication. Choose a preferred locale (English / Hindi).

### 3.4 Messages & Digests (`/parent/comms`) — COMMS-001

The parent inbox. Read-only feed of everything teachers and the school have
sent to the parent, across channels.

Each row shows:
- Channel icon (Mail / Telegram / WhatsApp)
- Template label ("Weekly digest", "PTM invitation", "Message")
- Timestamp
- Status pill (`delivered` / `pending` / `failed`)
- Delivery error if a send failed

Empty state when no messages have been sent yet.

The underlying data is the `commsLog` Firestore collection filtered to
messages where `recipientUid === auth.userId`.

### 3.5 Class Feed (`/kid/class/[classId]/feed`) — ENGAGE-008

When a class has positive-only sharing enabled, parents can view what the
class is making together. Positive-only means reactions like "Wow", "Cool",
"Nice" — no down-votes, no comments. A gentle community feed.

### 3.6 Notifications (`/notifications`) — NOTIF-001

Shared inbox UI. Parents see assignment alerts, teacher feedback summaries,
badge unlocks for their kids, and consent-required prompts.

---

## 4 · The Teacher Experience

> **Who they are:** CBSE-curriculum teachers, typically classroom teachers
> with 30–60 kids. They use the platform to generate NCERT-anchored
> materials, run AI-assisted assignments, and message parents at scale.
> Mostly on laptops; some on tablets.

### 4.1 Where they enter

`/teacher/login` — phone OTP + school code. This page is intentionally
**chrome-less** (it lives in `app/(auth)/(no-shell)/teacher/login/`) — no
sidebar, no shell. After signing in, the teacher lands on `/teacher`.

### 4.2 Teacher dashboard

**Left rail:**
- Dashboard
- Classes
- Lesson Plans
- Question Papers
- Curriculum (NCERT browse)
- Notifications
- AI Usage (secondary)
- Settings (secondary)

Brand reads **"GSI for Teachers"**.

The dashboard page shows the teacher's classes grid, pending assignments
list, and the "Create new class" / "Create new assignment" buttons.

### 4.3 Class management

Each class lives at `/teacher/classes/[classId]`. From there teachers can:

- See the **roster** (every kid enrolled).
- Create **assignments** via `AssignmentCreator` — pick a creation type
  (story / quiz / etc.), a chapter (NCERT-anchored via `ChapterPicker`),
  a due date.
- **Review submissions** for any assignment at
  `/teacher/classes/[classId]/assignments/[assignmentId]` — `SubmissionGrid`
  shows every kid's work; `SubmissionReview` opens a single submission.
- **AI-suggested feedback** (`ADMIN-006`): inside `SubmissionReview`, click
  "Suggest feedback" — the AI drafts a kid-appropriate feedback message in
  English or Hindi. Teachers edit and post.

### 4.4 HPC Narrative Assistant — ADMIN-004

From the class roster, click a student → "HPC narrative" → `HPCAssistant`
modal. The teacher picks a term; the AI generates a Holistic Progress Card
narrative summarising strengths, areas for growth, and suggested next steps.
The narrative is rendered into a school-branded PDF (the school's logo and
colours from `SchoolSettings` are applied).

### 4.5 Lesson Plan Generator — ADMIN-007

`/teacher/lessons`. Pick an NCERT chapter via `ChapterPicker`. AI generates
a 40-minute lesson plan: learning outcomes, activities, AI/CT integration
prompts, formative assessment ideas. Editable, exportable.

### 4.6 Question Paper Generator — ADMIN-005

`/teacher/papers`. Pick a chapter + difficulty distribution. AI generates
**three variants** of a CBSE-pattern question paper, each as a branded PDF.
Three variants exists so teachers can give different rows of the class
different papers without spoiling the answers.

### 4.7 NCERT Curriculum Browse (`/teacher/curriculum`) — CONTENT-001

A standalone reference. Search across every NCERT chapter in the index
(Class 6 Science seeded; more classes/subjects coming). Filter by class +
subject + free-text search.

Click a chapter to see:
- Learning outcomes
- Key terms (amber chips)
- AI/CT concept tags (violet chips, cross-referenced to the AI/CT skill map)
- Suggested duration
- Deep-links to "Plan lesson" or "Generate paper" — both pre-fill the
  chapter id.

### 4.8 Parent–Teacher Meeting Notes (`/teacher/classes/[classId]/ptm`) — COMMS-002

A dedicated PTM workspace per class. Layout: **roster on the left, editor on
the right**.

1. Pick a student → editor opens.
2. Pick the term (Term 1 / 2 / 3 / Annual).
3. Click **"Draft with AI"** — AI generates summary + strengths + areas to
   improve + suggested actions, joined into a single editable block. Uses
   the existing `/api/comms/ptm` AI generator.
4. Edit, then **Save draft** — persists to the `ptmNotes` Firestore
   collection via `/api/comms/ptm-notes`.
5. Each note is shown in the per-student **history** below the editor,
   with status pills (`draft` / `sent` / `acknowledged`).
6. **Mark sent** → flips status; will eventually trigger an outbound
   message to the parent.
7. **Delete** → removes the note.

DPDP gate: the AI draft requires `ai_generation` consent on the kid;
without it, the surface shows a clear error.

### 4.9 Ad-hoc parent messaging — COMMS-002

`ParentCommsModal` is launched from a class detail row. Two tabs:
- **PTM**: a one-shot AI-drafted talking-points generator (lighter than
  the full PTM workspace).
- **Adhoc**: type a one-off message to the parent. Sends via the parent's
  preferred channel.

### 4.10 Notifications & AI Usage

- `/notifications`: shared inbox (assignment-due-soon for their classes,
  submission-reviewed acknowledgements, sub-assigned alerts).
- `/admin/usage`: school-wide AI usage telemetry (cost USD/INR, events,
  failures by provider). Currently school-wide; per-teacher scoping is on
  the roadmap.

---

## 5 · The School Admin Experience

> **Who they are:** The principal, vice-principal, or designated school
> coordinator. The first teacher per school is automatically promoted to
> schoolAdmin; subsequent admins are added via the existing role-management
> flow. They run the campus-wide deployment: analytics, compliance,
> branding, integrations, and school-wide messaging.

### 5.1 Where they enter

`/school` — the school dashboard.

### 5.2 School admin dashboard

**Left rail:**
- Dashboard
- Analytics
- Teachers (links into `/teacher` — the same teacher dashboard)
- Compliance
- Substitutes
- Comms
- Integrations
- Notifications
- School Settings (secondary)

Brand reads **"GSI for Schools"**.

**Right rail tiles (school-admin-specific):**
- **`SubstituteAlertWidget`** — "X absences today" with deep-link to the
  Substitute Finder. Surfaces today's absences if the backend exposes
  `/api/substitutes/today`; falls back gracefully to a static
  "View timetable" CTA if not.
- **`ComplianceStatusWidget`** — DPDP consent rate + open data-rights
  requests, deep-linked to the DPO Dashboard.

### 5.3 School analytics (`/school`)

The dashboard body shows:

- **`CurriculumHeatmap`** — coverage map: which NCERT chapters the school is
  actively teaching, hotspots by class/subject.
- **`WeeklyTrendChart`** — creations / engagement / active-student counts
  over time.
- **`TeacherActivityTable`** — per-teacher AI usage, assignments created,
  submissions reviewed.
- **`ComplianceExport`** — download CBSE / DPDP reports.
- **Inter-school leaderboard** — opt-in benchmarking against other schools.

### 5.4 Compliance (`/school/compliance`) — COMPLIANCE-001

The **DPO Dashboard** (`DpoDashboard` component) — Data Protection Officer
view.

- **DPDP register** snapshot: consents granted by scope across the school.
- **Compliance Report v2:** generate a branded PDF audit trail.
- **Open data rights requests:** queue of parent erasure / correction /
  export requests, with action buttons.
- **AI safety log:** flagged content, content-filter triggers, recovery
  actions.

### 5.5 Substitute Finder (`/school/substitutes`) — ADMIN-008

The substitute teacher workflow:

1. Mark a teacher absent (today or future date).
2. The ranker (`lib/firebase/substituteService` etc.) returns candidate
   replacements ranked by availability, subject expertise, and class
   familiarity.
3. Click **"Generate handover sheet"** — AI produces a one-page document
   listing today's lessons (pulled from the absent teacher's plans),
   class quirks, and any kid-specific notes the absent teacher flagged.
4. Assign a substitute → `sub_assigned` notification fires to the chosen
   teacher.

### 5.6 School Settings (`/school/settings`) — ADMIN-009

White-label branding:
- School name and code
- Logo upload (rendered on HPC PDFs, question papers, compliance reports)
- Letterhead upload
- Primary + secondary colour
- Metadata (board, address, contact)

All branding flows through to every PDF the platform generates for the
school.

### 5.7 Parent Digests (`/school/comms/digests`) — COMMS-001 + REPORT-001

The school-wide parent communication panel.

1. **Top form:**
   - Optional teacher note (200 character cap) — gets appended to every
     digest in this send.
   - Locale dropdown (English / Hindi).
2. **Students list:** every kid in the school, with class name and
   "parent linked" status. Each row has two buttons: **Preview** and
   **Send**.
3. **Preview** opens a modal that runs `/api/comms/parent-digest/preview`.
   The modal shows the assembled digest body (creations summary, AI/CT
   concepts learned this week, upcoming assignments, optional teacher
   note). Slide-up bottom sheet on mobile, centered card on tablet+.
4. **Send** posts to `/api/comms/parent-digest/send` which:
   - DPDP-gates on `parent_messaging` consent (clear failure if missing).
   - Picks the parent's preferred channel.
   - Records the delivery in `commsLog`.
   - Returns a receipt.
5. **Recent sends** (right column): last 50 digests across the school with
   channel + status pill + timestamp + error if any.

### 5.8 SIS Integrations (`/school/settings/integrations`) — INTEGRATION-001

Connect the school's existing Student Information System (SIS / ERP).

1. **Provider picker** — five options:
   - **GSI Local** (default) — store roster, attendance, timetable in
     GSI Firestore.
   - **Fedena** (planned) — fetch from Fedena ERP.
   - **MasterSoft / Schoollog / Neverskip** (planned scaffolds).
2. **Credentials reference** — opaque pointer to the encrypted secret in
   the secret store (e.g. `vault://schools/<id>/sis-creds`). Raw keys are
   never stored in Firestore.
3. **Enabled toggle** — disable to fall back to Local without losing the
   saved config.
4. **Test connection** button — runs `resolveProvider(schoolId).healthCheck()`
   and displays an emerald (success) or rose (failure) result strip with
   the provider's diagnostic message.

The SIS abstraction (`lib/integrations/schoolDataProvider.ts`) is what
keeps the rest of the platform vendor-neutral: HPC, substitute finder, and
compliance all go through it.

### 5.9 Notifications

Same `/notifications` inbox: school-wide alerts, compliance gate triggers,
sub-assignment confirmations.

---

## 6 · Cross-Role Journeys

How the four roles interact to deliver real workflows.

### 6.1 Assignment lifecycle

```
Teacher                  Kid                       Parent
   │                      │                          │
   │ creates assignment   │                          │
   ├─────────────────────►│                          │
   │                      │ notification fires       │
   │                      │ "New assignment" 🔔       │
   │                      │                          │
   │                      │ kid opens studio,        │
   │                      │ creates work,            │
   │                      │ submits                  │
   │ ◄────────────────────┤                          │
   │                      │                          │
   │ reviews submission   │                          │
   │ + AI-suggested       │                          │
   │ feedback, posts      │                          │
   ├─────────────────────►│                          │
   │                      │ notification:            │
   │                      │ "Teacher feedback" 🔔     │
   │                      │                          │
   │ school admin sends   │                          │
   │ weekly digest        │                          │
   │       │              │                          │
   │       └─────────────────────────────────────────►│
   │                      │                          │ parent reads digest
   │                      │                          │ in /parent/comms
```

### 6.2 Parent digest delivery (end-to-end)

1. **School admin** at `/school/comms/digests` picks a kid → **Preview**.
2. Reviews the assembled digest, optionally adds a teacher note.
3. **Send** → backend assembles the digest, DPDP-gates consent, picks the
   parent's preferred channel, sends via the appropriate adapter
   (Telegram / WhatsApp / Email), and logs to `commsLog`.
4. **Parent** at `/parent/comms` sees the digest in their inbox with the
   channel pill and `delivered` status (or `pending` / `failed`).
5. If failed, the parent's row shows the delivery error; the school admin's
   recent-sends column also shows it. The school admin can resend after
   resolving (e.g. parent linked Telegram).

### 6.3 PTM cycle

1. **Teacher** at `/teacher/classes/[classId]/ptm`:
   - Picks a kid + term → drafts notes with AI → edits → **Save draft**.
   - Reviews drafts before the actual PTM date.
   - At the PTM: opens the draft, reads it with the parent, then
     **Mark sent**.
2. (Roadmap: "Mark sent" will also trigger a parent message with the notes.)
3. **Parent** sees a record at `/parent/comms` once the delivery hook is
   wired up.

### 6.4 Substitute assigned

1. **School admin** marks a teacher absent → ranker suggests candidates →
   admin picks one → AI handover sheet generated.
2. **Substitute teacher** receives `sub_assigned` notification at
   `/notifications` with the deep link into the class + the handover sheet.
3. (Optionally) **Parents** are notified that today's class has a substitute.

### 6.5 Compliance request

1. **Parent** at `/parent/settings/data-rights` requests data export for
   their kid.
2. Request lands in the school's DPO queue.
3. **School admin / DPO** opens `/school/compliance` → sees the request →
   triggers the export job.
4. Parent receives a notification + the download link when the export is
   ready.

---

## 7 · The Shared Dashboard Shell

Every role's dashboard is built from the same primitives. Worth knowing
how they fit:

```
DashboardShell             ← composes the 3-column layout
├── DashboardSidebar       ← left rail (config-driven)
│   └── SidebarItem[]      ← icons, labels, badges, nested children
├── (children)             ← role-specific page content
│   └── SectionHub         ← Recent/InProgress/Today tabs + hero cards
│       └── ExpandableSectionCard ← accordion: header + studios grid
│           └── StudioTile ← illustration + name + caption
└── DashboardRightRail     ← right rail widgets per role
```

Configs at `lib/dashboard/configs/{kid,teacher,schoolAdmin,parent}.config.ts`
define the per-role sidebar items, hero sections, and right-rail widgets.
Same components, different content.

**Responsive contract:**

| Width | Layout |
|---|---|
| < 1024px | Single column, sidebar collapsed, bottom nav (kid) or top header (others) |
| ≥ 1024px | 3-column: 220px sidebar + main + 300–380px right rail |
| ≥ 1536px | Same as above; content widens up to 1600px max |
| Any landscape phone | Studio grids inside expanded cards switch to 3 columns automatically (`auto-fit minmax(140px,1fr)`) |

Documented in detail at `docs/ux-patterns.md` § "Responsive Layout Contract".

---

## 8 · Safety, Privacy, and Compliance

Three guarantees that run through every surface above:

| Guarantee | Where it lives | What it does |
|---|---|---|
| **Content safety** | `lib/safety/` | Every kid-facing AI prompt and output goes through an input filter, blocklist, and output filter. Anything flagged is replaced or rejected with a kid-friendly message. |
| **DPDP consent** | `lib/dpdp/consentService` | Every PII assembly path (`ai_generation`, `parent_messaging`, `class_feed_visibility`, etc.) is gated on the kid's per-scope consent before any AI call or message send. Failures surface clearly. |
| **AI vocal generation is intentionally not used** | Documented in `docs/architecture.md` | Kids record their own voices for sing-alongs and book readings. Better pedagogy + dodges deepfake/voice-clone risk. |

Compliance is not a bolt-on — it's an architectural constraint enforced at
the API layer (`requireConsent()` calls before any PII access).

---

## 9 · Feature Catalog by Ticket

For traceability between this product walkthrough and the engineering
backlog. Each ticket has shipped to production (FE + BE) unless flagged.

| Ticket | Feature | Surfaces in this doc |
|---|---|---|
| ADMIN-004 | HPC Narrative Assistant | § 4.4 |
| ADMIN-005 | Question Paper Generator | § 4.6 |
| ADMIN-006 | AI-suggested submission feedback | § 4.3 |
| ADMIN-007 | Lesson Plan Generator | § 4.5 |
| ADMIN-008 | Substitute Finder | § 5.5 |
| ADMIN-009 | School Settings + branding | § 5.6 |
| COMMS-001 | Parent prefs + digests | § 3.3, § 5.7 |
| COMMS-002 | PTM notes + ad-hoc messaging | § 4.8, § 4.9 |
| COMPLIANCE-001 | Compliance Report v2 + DPO | § 5.4 |
| COMPLIANCE-002 | DPDP consent + parent data rights | § 3.3 |
| CONTENT-001 | NCERT chapter index + browse | § 4.7 |
| ENGAGE-008 | Class-shared creation feed | § 3.5 |
| INTEGRATION-001 | SchoolDataProvider + SIS config | § 5.8 |
| NOTIF-001 | In-app notifications inbox | § 2.6, § 3.6, § 4.10, § 5.9 |
| PLATFORM-007 | English + Hindi locale layer | embedded in feedback, digests, prompts |
| QA-001 | AI eval harness | backend tooling; no user surface |
| REPORT-001 | Parent progress report PDF | § 5.7 (delivered via digest pipeline) |
| DASH-001 | Generic 3-column shell + responsive foundation | § 7 |
| DASH-002 | School-side shell wiring + missing FE surfaces | § 3.4, § 4.7, § 4.8, § 5.7, § 5.8 |

---

## 10 · Currently placeholder / on the roadmap

Things visible in the UI today but not yet wired to live data, or features
that have been explicitly deferred:

| What | Where | State |
|---|---|---|
| Today's Activity (kid) | Right rail at `/` | Falls back to placeholder data with a "Demo" ribbon when no real activity. Wire to `creationService.listInProgress()` to remove. |
| Daily Challenge (kid) | Right rail at `/` | Always the "Beat the AI today!" CTA. Wire to a real challenge rotation. |
| Recent / In Progress / Today tabs (kid) | `SectionHub` | Presentational; clicking doesn't filter content yet. |
| NotificationBell live badge on school sidebar | `DashboardSidebar` | Notifications nav item is present in every role config; the live unread badge bubble isn't rendered on the school-side header yet. |
| `Mail` icon on kid profile chip | `KidProfileChip` | Stub. |
| AI Usage per-role scoping | (deferred) | `/admin/usage` covers school-wide for now. |
| Asset Library viewer (R2) | (deferred) | Backend exists; no end-user need yet. |
| MCP UI | (deferred) | Programmatic surface by design. |
| Performances feed widget | (deferred) | Waiting for the sing-along surface to ship. |
| Global locale switcher | (deferred) | Per-feature locale exists; a global switcher is a separate ticket. |
| Per-class context in teacher sidebar | Teacher shell | The sidebar shows top-level nav only — once you're inside a class, the active class isn't surfaced as a breadcrumb. |

---

## Appendix · How to test this yourself

For engineers and QA validating a release.

### A.1 Bring up the dev environment

```bash
pnpm install
pnpm dev:full      # Next.js + Firebase emulators (recommended for full coverage)
# or
pnpm dev           # Next.js only, against live Firebase
```

Open `http://localhost:3000`. Emulator UI at `http://localhost:4000` if you
used `dev:full`.

### A.2 Provision test accounts — automated

Use the seeder. It creates the full graph (school, classes, teachers, parents,
kids, consents, channel prefs, assignments, submissions, notifications, PTM
notes, comms history, SIS config, sample creations) with deterministic IDs so
re-runs upsert instead of duplicating.

```bash
# Against the Firebase emulator (recommended for local testing)
pnpm seed:test:emulator

# Preview without writing
pnpm seed:test:emulator -- --dry-run --verbose

# Wipe everything seeded and re-create
pnpm seed:test:emulator -- --reset

# Against a live Firebase project (requires SEED_ALLOW_LIVE=1)
SEED_ALLOW_LIVE=1 pnpm seed:test
```

Seeded test accounts (phone OTP — the emulator accepts any 6-digit code):

| Role | Phone | Lands on |
|---|---|---|
| **School admin** (Priya) | `+919000000001` | `/school` |
| **Teacher — Class 6A** (Anand) | `+919000000002` | `/teacher` |
| **Teacher — Class 7B** (Meera) | `+919000000003` | `/teacher` |
| **Parent — Aarav** (Rajesh) | `+919000000010` | `/parent/settings/data-rights` |
| **Parent — Diya+Krish** (Lakshmi) | `+919000000011` | `/parent/settings/data-rights` |

Kid profiles (use the profile picker once signed in as a parent, or visit
anonymously for Sneha):

- **Aarav** — Class 6A, parent Rajesh, full DPDP consent. 5 creations,
  120 AI points.
- **Diya** — Class 6A, parent Lakshmi, full DPDP consent. 3 creations,
  85 AI points.
- **Krish** — Class 7B, parent Lakshmi, consent granted except
  `peer_sharing` (revoked — for testing the negative path). 8 creations,
  200 AI points.
- **Sneha** — Class 7B, no linked parent (open-beta path), teacher-
  verified. 1 creation, 40 AI points.

Plus master data: 1 school (`GSI Test School`, CBSE, Chennai), 2 classes
(6A / 7B), 2 assignments (one Story, one Quiz), 2 submissions (one pending,
one approved with feedback), 4 notifications (one per role), 2 PTM notes
(draft + sent), 4 commsLog entries covering delivered / pending / failed
digest paths and one ad-hoc message, 1 SIS integration config (Local
provider, enabled).

If you'd rather provision manually, see § A.2.alt below.

### A.2.alt Manual provisioning (fallback)

| Role | How to create |
|---|---|
| Kid (anonymous) | Visit `/` in an incognito window → onboarding carousel. |
| Kid (linked) | Create via parent's `/parent/settings/data-rights`. |
| Parent | Phone OTP at `/`, then set `role: parent` in Firestore (one-time) or via the parent signup flow. |
| Teacher | `/teacher/login` → phone OTP + school code. First teacher per school becomes schoolAdmin. |
| School admin | Promote a teacher's `role` to `schoolAdmin` in Firestore, or use the first-teacher path. |

### A.3 Walk every journey

Use § 2, § 3, § 4, § 5 above as your script. Section anchors map to URLs and
to the feature catalog. Test the cross-role journeys in § 6 last — they
exercise the integrations.

### A.4 Responsive matrix

For each role, sample at:

| Width × Height | Device class |
|---|---|
| 360 × 640 | Phone portrait |
| 640 × 360 | Phone landscape |
| 768 × 1024 | Tablet portrait |
| 1024 × 768 | Tablet landscape |
| 1280 × 800 | Laptop |
| 1920 × 1080 | Desktop |
| 2560 × 1440 | Large monitor |
| 3840 × 2160 | 4K / projector |

What to look for: no horizontal scroll, sidebar/right-rail toggle at 1024px,
expanded studio grid reflows 2 → 3 cols when rotating, illustrations stay
crisp on the 4K end.

### A.5 Verification gates

```bash
pnpm typecheck            # 0 errors expected
pnpm lint                 # warnings OK, 0 errors expected
pnpm test -- --run        # 814 passing + 4 todo
pnpm build                # production build; inspect route output
```

All four must pass before pushing.

### A.6 Sanity-check the new surfaces (DASH-001/002)

These are the freshly built pages — give them extra attention:

- `/notifications` — inbox + filter + mark-all-read.
- `/teacher/classes/[classId]/ptm` — full save/send/delete cycle.
- `/teacher/curriculum` — search + filter + detail + deep-links.
- `/school/comms/digests` — preview modal + send + history.
- `/school/settings/integrations` — provider pick + test connection.
- `/parent/comms` — read-only message feed.

---

This doc is the single source of truth for "what's in the product right now."
Update it when features ship; remove placeholder rows from § 10 when they're
wired to live data. If you can't answer "what does role X do on this page?"
in 30 seconds by reading this doc, the doc has drifted from the product.
