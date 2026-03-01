# PLATFORM-002: In-App Notification System

## Description
In-app notification system for key events: reactions received, badge unlocked, streak reminders, challenge results, level-up. Bell icon in header with unread count. Notifications are pull-based (no push notifications in this phase) stored in Firestore.

## Requires KB Updates
- Update `docs/data-model.md` with notifications sub-collection schema

## Dependencies
- AUTH-001 (notifications tied to authenticated users)

## Subtasks

### [LIB] Create notification service
**Target**: `lib/firebase/notificationService.ts`
**Action**: Create
**Requirements**:
- `createNotification(userId, notification): Promise<void>` — write to `users/{userId}/notifications` sub-collection
- `getNotifications(userId, limit, cursor): Promise<NotificationResult>` — paginated fetch, newest first
- `getUnreadCount(userId): Promise<number>` — count where `readAt` is null
- `markAsRead(userId, notificationId): Promise<void>` — set `readAt` timestamp
- `markAllAsRead(userId): Promise<void>` — batch update all unread
- NotificationDoc: `{ id, type, title, body, emoji, metadata: {}, readAt?, createdAt }`
- Types: `'reaction' | 'badge' | 'streak_reminder' | 'challenge_result' | 'level_up' | 'system'`

### [FE] Create NotificationBell component
**Target**: `components/notifications/NotificationBell.tsx`
**Action**: Create
**Requirements**:
- Bell icon (lucide-react `Bell`) in header
- Red unread count badge (top-right of bell): shows number 1-99, "99+" for more
- Subtle shake animation when new notification arrives
- Tap opens `NotificationDrawer`
- Only renders when authenticated
- Polls for unread count every 60 seconds (or uses Firestore onSnapshot listener)

### [FE] Create NotificationDrawer component
**Target**: `components/notifications/NotificationDrawer.tsx`
**Action**: Create
**Requirements**:
- Slide-in panel from right (or bottom sheet on mobile)
- Header: "Notifications" + "Mark all read" link
- Notification list with infinite scroll
- Each notification: emoji + title + body + relative timestamp
- Unread notifications: slightly highlighted background
- Tap notification: marks as read + navigates to relevant page (e.g., creation for reaction, badges for badge unlock)
- Empty state: mascot with "No notifications yet!" message
- "Clear all" option (marks all as read, doesn't delete)

### [FE] Create NotificationItem component
**Target**: `components/notifications/NotificationItem.tsx`
**Action**: Create
**Requirements**:
- Compact row: emoji (left), title + body (center), timestamp (right)
- Unread indicator: blue dot on left edge
- Type-specific styling:
  - Reaction: "🤩 Someone reacted to your story!"
  - Badge: "🏆 You earned the Story Wizard badge!"
  - Streak: "🔥 Don't break your streak! Create something today."
  - Level up: "⬆️ You reached Level 5: Creative Pro!"
  - Challenge: "🏅 Challenge results are in!"
- Tap handler for navigation
- Swipe to dismiss (optional — framer-motion gesture)

### [API] Create notification endpoints
**Target**: `app/api/notifications/route.ts`
**Action**: Create
**Requirements**:
- `GET /api/notifications` — list notifications with pagination, requires auth
- `PATCH /api/notifications/[id]` — mark single as read
- `PATCH /api/notifications/read-all` — mark all as read
- Returns `{ items, unreadCount, nextCursor, hasMore }`

### [FE] Add NotificationBell to Header
**Target**: `components/layout/Header.tsx`
**Action**: Update
**Requirements**:
- Add `NotificationBell` between AiPointsBadge and user avatar (when authenticated)
- Position: right side of header, before avatar dropdown
- Don't show for anonymous users

### [LIB] Create notification triggers
**Target**: `lib/notifications/triggers.ts`
**Action**: Create
**Requirements**:
- `notifyReaction(userId, reaction, creation): void` — called when someone reacts
- `notifyBadgeUnlock(userId, badge): void` — called on badge unlock
- `notifyLevelUp(userId, newLevel): void` — called on level up
- `notifyChallengeResult(userId, challenge, result): void` — called when challenge ends
- All are fire-and-forget calls to `createNotification`
- Called from relevant API endpoints (react, gamification, challenge close)

## Acceptance Criteria
- [ ] Bell icon shows in header with unread count badge
- [ ] Tapping bell opens notification drawer
- [ ] Notifications display with correct type, emoji, and content
- [ ] Unread notifications highlighted
- [ ] "Mark all read" clears unread count
- [ ] Tapping a notification navigates to relevant page
- [ ] Empty state shows when no notifications
- [ ] Notifications only show for authenticated users
