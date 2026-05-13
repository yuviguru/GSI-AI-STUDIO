/**
 * Phase 4 (NOTIF-001): high-level notification dispatch.
 *
 * The MVP routes everything via the in-app channel (persisted to Firestore
 * via `lib/firebase/notificationService.ts`) and logs would-have-sent
 * email/push attempts to the console. Email providers (SendGrid / SES /
 * Resend) and push routing via the COMMS-001 MessagingService plug in
 * behind this interface in a follow-up without changing callers.
 */

import { createNotification } from '@/lib/firebase/notificationService';
import type {
  NotificationChannel,
  NotificationDoc,
  NotificationPayload,
  NotificationType,
} from '@gsi/types';

export interface EnqueueNotificationInput {
  recipientUid: string;
  type: NotificationType;
  payload: NotificationPayload;
  channels?: NotificationChannel[];
}

/**
 * Enqueue a notification. Writes the in-app record and (in future) fires
 * email/push fan-out. Failures in non-critical channels never throw; only
 * a Firestore write failure propagates.
 */
export async function enqueueNotification(
  input: EnqueueNotificationInput,
): Promise<NotificationDoc> {
  const channels = input.channels ?? ['in_app'];

  // In-app write is the source of truth — other channels are best-effort.
  const doc = await createNotification({
    recipientUid: input.recipientUid,
    type: input.type,
    payload: input.payload,
    channels,
  });

  for (const c of channels) {
    if (c === 'in_app') continue;
    // Placeholder — real provider dispatch lands with COMMS-001 (messaging
    // service) and a future email provider pick. Logging keeps visibility
    // during the rollout so we can audit what we'd have sent.
    // eslint-disable-next-line no-console
    console.info(
      `[notifications] ${c} delivery not yet wired — recipient=${input.recipientUid} type=${input.type}`,
    );
  }

  return doc;
}

/** Fan out to many recipients. Returns the created docs in input order. */
export async function enqueueNotificationBatch(
  inputs: EnqueueNotificationInput[],
): Promise<NotificationDoc[]> {
  const results = await Promise.allSettled(inputs.map(enqueueNotification));
  const out: NotificationDoc[] = [];
  for (const [i, r] of results.entries()) {
    if (r.status === 'fulfilled') {
      out.push(r.value);
    } else {
      // eslint-disable-next-line no-console
      console.error(
        `[notifications] batch item ${i} failed for ${inputs[i]?.recipientUid}:`,
        r.reason,
      );
    }
  }
  return out;
}
