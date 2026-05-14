/**
 * Phase 4 (COMMS-001): high-level outbound messaging facade.
 *
 * Route picks per-parent preferred channel, checks DPDP consent on the
 * target kid, dispatches to the right provider, and logs every attempt
 * to `commsLog` for auditability + the compliance report (B4).
 */

import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@gsi/firebase/admin';
import { hasConsent } from '@gsi/dpdp';
import { TelegramProvider } from './providers/telegramProvider';
import { WhatsAppProvider } from './providers/whatsappProvider';
import type {
  ChannelRecipient,
  CommsChannel,
  DeliveryReceipt,
  MessagingProvider,
  OutboundMessage,
  ParentChannelPref,
} from './types';

const COMMS_LOG_COLLECTION = 'commsLog';
const CHANNEL_PREFS_SUBCOLLECTION = 'channelPrefs';
const USERS_COLLECTION = 'users';

const providers = new Map<CommsChannel, MessagingProvider>();
providers.set('telegram', new TelegramProvider());
providers.set('whatsapp', new WhatsAppProvider());

function getProvider(channel: CommsChannel): MessagingProvider {
  const p = providers.get(channel);
  if (!p) {
    throw new Error(`No provider registered for channel: ${channel}`);
  }
  return p;
}

interface ChannelPrefFirestore {
  parentUid: string;
  channel: CommsChannel;
  handle: string;
  consentStatus: 'granted' | 'revoked';
  consentedAt: Timestamp;
  revokedAt?: Timestamp;
  locale?: 'en' | 'hi';
}

function toPref(raw: ChannelPrefFirestore): ParentChannelPref {
  return {
    ...raw,
    consentedAt: raw.consentedAt.toDate(),
    revokedAt: raw.revokedAt?.toDate(),
  };
}

// ─── Preference management ────────────────────────────────────────────────

export async function getActiveChannelPref(
  parentUid: string,
): Promise<ParentChannelPref | null> {
  const snap = await adminDb
    .collection(USERS_COLLECTION)
    .doc(parentUid)
    .collection(CHANNEL_PREFS_SUBCOLLECTION)
    .where('consentStatus', '==', 'granted')
    .orderBy('consentedAt', 'desc')
    .limit(1)
    .get();
  if (snap.empty) return null;
  return toPref(snap.docs[0]!.data() as ChannelPrefFirestore);
}

export async function listChannelPrefs(
  parentUid: string,
): Promise<ParentChannelPref[]> {
  const snap = await adminDb
    .collection(USERS_COLLECTION)
    .doc(parentUid)
    .collection(CHANNEL_PREFS_SUBCOLLECTION)
    .get();
  return snap.docs.map((d) => toPref(d.data() as ChannelPrefFirestore));
}

export interface SetChannelPrefInput {
  parentUid: string;
  channel: CommsChannel;
  handle: string;
  locale?: 'en' | 'hi';
}

export async function setChannelPref(
  input: SetChannelPrefInput,
): Promise<ParentChannelPref> {
  const ref = adminDb
    .collection(USERS_COLLECTION)
    .doc(input.parentUid)
    .collection(CHANNEL_PREFS_SUBCOLLECTION)
    .doc(input.channel);
  const now = Timestamp.now();
  const doc: ChannelPrefFirestore = {
    parentUid: input.parentUid,
    channel: input.channel,
    handle: input.handle,
    consentStatus: 'granted',
    consentedAt: now,
    locale: input.locale,
  };
  await ref.set(doc);
  return toPref(doc);
}

export async function revokeChannelPref(
  parentUid: string,
  channel: CommsChannel,
): Promise<void> {
  await adminDb
    .collection(USERS_COLLECTION)
    .doc(parentUid)
    .collection(CHANNEL_PREFS_SUBCOLLECTION)
    .doc(channel)
    .set(
      {
        consentStatus: 'revoked',
        revokedAt: Timestamp.now(),
      },
      { merge: true },
    );
}

// ─── Outbound send ────────────────────────────────────────────────────────

export interface SendMessageInput {
  parentUid: string;
  /** Subject kid — used for DPDP consent check on `parent_messaging`. */
  kidId: string;
  templateId: string;
  text: string;
  params?: Record<string, string>;
  cta?: { label: string; url: string };
  /** Explicit channel override; if omitted, picks parent's active pref. */
  channel?: CommsChannel;
}

export interface SendMessageResult extends DeliveryReceipt {
  commsLogId: string;
}

async function logDelivery(input: {
  parentUid: string;
  kidId: string;
  templateId: string;
  receipt: DeliveryReceipt;
}): Promise<string> {
  const ref = adminDb.collection(COMMS_LOG_COLLECTION).doc();
  await ref.set({
    id: ref.id,
    recipientUid: input.parentUid,
    kidId: input.kidId,
    channel: input.receipt.channel,
    templateId: input.templateId,
    messageId: input.receipt.messageId ?? null,
    status: input.receipt.status,
    error: input.receipt.error ?? null,
    sentAt: Timestamp.now(),
  });
  return ref.id;
}

/**
 * Send a message respecting consent + parent's channel preference. Returns
 * the receipt + the commsLog row id. Does NOT throw on delivery failure —
 * the caller inspects the `status` field.
 */
export async function sendMessage(
  input: SendMessageInput,
): Promise<SendMessageResult> {
  // DPDP gate — matches the kid-level parent_messaging consent scope.
  const consented = await hasConsent(input.kidId, 'parent_messaging');
  if (!consented) {
    const receipt: DeliveryReceipt = {
      channel: input.channel ?? 'telegram',
      status: 'failed',
      error:
        'Parent has not granted parent_messaging consent for this child.',
    };
    const commsLogId = await logDelivery({
      parentUid: input.parentUid,
      kidId: input.kidId,
      templateId: input.templateId,
      receipt,
    });
    return { ...receipt, commsLogId };
  }

  let channel = input.channel;
  let handle: string | undefined;
  let locale: 'en' | 'hi' | undefined;
  if (channel) {
    const pref = await listChannelPrefs(input.parentUid);
    const match = pref.find(
      (p) => p.channel === channel && p.consentStatus === 'granted',
    );
    handle = match?.handle;
    locale = match?.locale;
  } else {
    const active = await getActiveChannelPref(input.parentUid);
    if (active) {
      channel = active.channel;
      handle = active.handle;
      locale = active.locale;
    }
  }

  if (!channel || !handle) {
    const receipt: DeliveryReceipt = {
      channel: channel ?? 'telegram',
      status: 'failed',
      error: 'No active messaging channel on file for this parent.',
    };
    const commsLogId = await logDelivery({
      parentUid: input.parentUid,
      kidId: input.kidId,
      templateId: input.templateId,
      receipt,
    });
    return { ...receipt, commsLogId };
  }

  const recipient: ChannelRecipient = {
    parentUid: input.parentUid,
    handle,
    locale,
  };
  const message: OutboundMessage = {
    templateId: input.templateId,
    text: input.text,
    params: input.params,
    cta: input.cta,
  };

  const provider = getProvider(channel);
  const receipt = await provider.send(recipient, message);
  const commsLogId = await logDelivery({
    parentUid: input.parentUid,
    kidId: input.kidId,
    templateId: input.templateId,
    receipt,
  });
  return { ...receipt, commsLogId };
}

// ─── Expose provider registry for settings UIs ───────────────────────────

export async function channelHealthReport(): Promise<
  Array<{ channel: CommsChannel; ok: boolean; message?: string }>
> {
  const out: Array<{ channel: CommsChannel; ok: boolean; message?: string }> = [];
  for (const [channel, provider] of providers.entries()) {
    const h = (await provider.healthCheck?.()) ?? { ok: true };
    out.push({ channel, ...h });
  }
  return out;
}
