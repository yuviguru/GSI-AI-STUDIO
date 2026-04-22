# NOTIF-001: Assignment & Activity Notifications

## Description
Phase 3 gap: kids, parents, and teachers don't get alerts for assignment lifecycle events. This feature wires up email + in-app push notifications on: new assignment created, assignment due in 24h, submission reviewed, badge earned, and teacher actions requiring attention. Reuses the notification groundwork from `stories/phase-2/PLATFORM-002-notifications.md`.

## Requires KB Updates
- Update `docs/api-contracts.md` with notifications endpoints
- Update `docs/data-model.md` with `notifications` collection + `userNotificationPrefs`

## Dependencies
- ADMIN-002 (Assignment System) — hooks into submission lifecycle
- PROFILE-001 (Parent-Kid Profiles) — recipient identity

## Subtasks

### [LIB] Create notification service
**Target**: `lib/notifications/notificationService.ts`
**Action**: Create
**Requirements**:
- `enqueueNotification(input): Promise<NotificationDoc>` input `{ recipientUid, type, payload, channels }`
- Types: `assignment_new`, `assignment_due_soon`, `submission_reviewed`, `badge_earned`, `teacher_feedback`, `sub_assigned`
- Channels: `in_app`, `email`, optionally `telegram` / `whatsapp` via COMMS-001
- Respects `userNotificationPrefs` (opt-outs per type)
- Rate-limit: 1 notification per kid per type per hour (coalesce dupes)

### [LIB] Email provider wrapper
**Target**: `lib/notifications/emailProvider.ts`
**Action**: Create
**Requirements**:
- Wraps SendGrid / SES / Resend (pick one — design-pluggable)
- Supports transactional templates with locale (English / Hindi)
- Logs delivery receipts

### [LIB] In-app notification helpers
**Target**: `lib/firebase/notificationService.ts`
**Action**: Create
**Requirements**:
- `createNotification`, `listForUser`, `markAsRead`, `markAllAsRead`
- Subcollection at `users/{uid}/notifications/{id}` for fast query
- Unread counter cached on user doc

### [API] Notification endpoints
**Target**: `app/api/notifications/route.ts`, `app/api/notifications/[id]/route.ts`, `app/api/notifications/prefs/route.ts`
**Action**: Create
**Requirements**:
- `GET /api/notifications` — list for current user
- `PATCH /api/notifications/[id]` — mark read
- `POST /api/notifications/mark-all-read`
- `GET/PATCH /api/notifications/prefs` — user preferences

### [LIB] Submission lifecycle hooks
**Target**: `lib/firebase/submissionService.ts` (extend)
**Action**: Modify
**Requirements**:
- On assignment create → enqueue for all students in class
- On assignment due in 24h (cron) → reminder to pending students
- On submission reviewed → notify student + parent
- Badge earned → notify

### [LIB] Cron job for due reminders
**Target**: `netlify/functions/dueReminderCron.ts`
**Action**: Create
**Requirements**:
- Scheduled: daily at 08:00 IST
- Finds assignments due within 24h with no submission
- Enqueues reminders with dedup (not more than 1/day per assignment per student)

### [FE] Notification bell + dropdown
**Target**: `components/shared/NotificationBell.tsx`, `components/shared/NotificationList.tsx`
**Action**: Create
**Requirements**:
- Bell icon in header with unread badge
- Dropdown with last 10 notifications
- Click → navigate to contextual page
- "Mark all read" action

### [FE] Notification preferences page
**Target**: `app/(auth)/settings/notifications/page.tsx`
**Action**: Create
**Requirements**:
- Toggles per notification type × per channel
- Default enabled on first account creation

### [TEST] Notification tests
**Target**: `lib/notifications/__tests__/`
**Action**: Create
**Requirements**:
- Pref-respecting: opt-out suppresses send
- Coalesce: 5 rapid triggers → 1 notification
- Cron reminders idempotent

## Acceptance Criteria
- [ ] New assignment triggers notifications to all students in class
- [ ] Due-in-24h reminder runs daily
- [ ] Review triggers notification to student + parent
- [ ] Badge earned triggers celebration notification
- [ ] Bell icon shows unread count
- [ ] User can toggle preferences
- [ ] No notifications sent when user opts out
