/** Phase 4 (NOTIF-001): notification types + shared shapes. */

export type NotificationType =
  | 'assignment_new'
  | 'assignment_due_soon'
  | 'submission_reviewed'
  | 'badge_earned'
  | 'teacher_feedback'
  | 'sub_assigned';

export type NotificationChannel =
  | 'in_app'
  | 'email'
  | 'telegram'
  | 'whatsapp';

export interface NotificationPayload {
  title: string;
  body: string;
  /** Deep link to open when notification is clicked. */
  href?: string;
  /** Arbitrary type-specific context. */
  context?: Record<string, string | number | boolean>;
}

export interface NotificationDoc {
  id: string;
  recipientUid: string;
  type: NotificationType;
  payload: NotificationPayload;
  channels: NotificationChannel[];
  /** null = unread */
  readAt: Date | null;
  createdAt: Date;
}

export type NotificationPrefs = Partial<
  Record<NotificationType, Partial<Record<NotificationChannel, boolean>>>
>;
