/**
 * Phase 4 (NOTIF-001): per-user notification persistence.
 *
 * Uses a subcollection `users/{uid}/notifications/{id}` plus a cached
 * `unreadCount` field on the user doc for fast header badge rendering.
 */

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './admin';
import type {
  NotificationChannel,
  NotificationDoc,
  NotificationPayload,
  NotificationType,
} from '@/types/notification.types';

const USERS_COLLECTION = 'users';
const NOTIFICATIONS_SUBCOLLECTION = 'notifications';

interface NotificationDocFirestore {
  id: string;
  recipientUid: string;
  type: NotificationType;
  payload: NotificationPayload;
  channels: NotificationChannel[];
  readAt: Timestamp | null;
  createdAt: Timestamp;
}

function toDoc(raw: NotificationDocFirestore): NotificationDoc {
  return {
    ...raw,
    readAt: raw.readAt ? raw.readAt.toDate() : null,
    createdAt: raw.createdAt.toDate(),
  };
}

export interface CreateNotificationInput {
  recipientUid: string;
  type: NotificationType;
  payload: NotificationPayload;
  channels: NotificationChannel[];
}

/** Writes a notification and increments the user's unreadCount. */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<NotificationDoc> {
  const userRef = adminDb.collection(USERS_COLLECTION).doc(input.recipientUid);
  const notifRef = userRef.collection(NOTIFICATIONS_SUBCOLLECTION).doc();

  const now = Timestamp.now();
  const doc: NotificationDocFirestore = {
    id: notifRef.id,
    recipientUid: input.recipientUid,
    type: input.type,
    payload: input.payload,
    channels: input.channels,
    readAt: null,
    createdAt: now,
  };

  const batch = adminDb.batch();
  batch.set(notifRef, doc);
  batch.set(
    userRef,
    { unreadNotificationCount: FieldValue.increment(1), updatedAt: now },
    { merge: true },
  );
  await batch.commit();

  return toDoc(doc);
}

export async function listNotifications(
  uid: string,
  limit = 20,
): Promise<NotificationDoc[]> {
  const snap = await adminDb
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection(NOTIFICATIONS_SUBCOLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => toDoc(d.data() as NotificationDocFirestore));
}

export async function getUnreadCount(uid: string): Promise<number> {
  const userDoc = await adminDb.collection(USERS_COLLECTION).doc(uid).get();
  const value = (userDoc.data()?.unreadNotificationCount as number | undefined) ?? 0;
  return Math.max(0, value);
}

export async function markNotificationRead(
  uid: string,
  notificationId: string,
): Promise<void> {
  // Ownership is enforced by path: each user's notifications live under
  // `users/{uid}/notifications/{id}`. A notification ID belonging to a
  // different user resolves to a non-existent doc under *this* user's
  // subcollection, so the transaction below is an idempotent no-op — no
  // additional `data.recipientUid === uid` check is needed.
  const userRef = adminDb.collection(USERS_COLLECTION).doc(uid);
  const notifRef = userRef.collection(NOTIFICATIONS_SUBCOLLECTION).doc(notificationId);
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(notifRef);
    if (!snap.exists) return;
    const data = snap.data() as NotificationDocFirestore;
    if (data.readAt) return; // idempotent
    tx.update(notifRef, { readAt: Timestamp.now() });
    tx.set(
      userRef,
      { unreadNotificationCount: FieldValue.increment(-1) },
      { merge: true },
    );
  });
}

export async function markAllNotificationsRead(uid: string): Promise<number> {
  const userRef = adminDb.collection(USERS_COLLECTION).doc(uid);
  const pending = await userRef
    .collection(NOTIFICATIONS_SUBCOLLECTION)
    .where('readAt', '==', null)
    .get();
  if (pending.empty) {
    await userRef.set({ unreadNotificationCount: 0 }, { merge: true });
    return 0;
  }
  const now = Timestamp.now();
  const batch = adminDb.batch();
  for (const doc of pending.docs) batch.update(doc.ref, { readAt: now });
  batch.set(userRef, { unreadNotificationCount: 0 }, { merge: true });
  await batch.commit();
  return pending.size;
}
