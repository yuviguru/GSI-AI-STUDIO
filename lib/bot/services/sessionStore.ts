/** Firestore CRUD for `botSessions/{chatId}` — the binding between a
 *  Telegram (or later WhatsApp/Discord) chat and a GSI session.
 *
 *  Server-side only via Admin SDK. Mirrors the idempotent pattern from
 *  `lib/firebase/sessionService.ts` — first-write-wins on `createdAt`,
 *  subsequent reads return the existing doc. */

import crypto from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { AppException } from '@/lib/api-utils';
import type {
  BotSession,
  BotHandle,
  BotPlatform,
  BotActiveModuleId,
} from '../types';

const BOT_SESSIONS_COLLECTION = 'botSessions';

interface BotSessionDoc {
  chatId: string;
  platform: BotPlatform;
  botHandle: BotHandle;
  gsiSessionId: string;
  userId: string | null;
  kidId: string | null;
  activeModule: BotActiveModuleId | null;
  moduleState: Record<string, unknown>;
  linkedAt: Timestamp | null;
  createdAt: Timestamp;
  lastActiveAt: Timestamp;
}

function newGsiSessionId(): string {
  return `sess_${crypto.randomBytes(12).toString('hex')}`;
}

function mapDoc(data: BotSessionDoc): BotSession {
  return {
    chatId: data.chatId,
    platform: data.platform,
    botHandle: data.botHandle,
    gsiSessionId: data.gsiSessionId,
    userId: data.userId,
    kidId: data.kidId,
    activeModule: data.activeModule,
    moduleState: data.moduleState ?? {},
    linkedAt: data.linkedAt as unknown as BotSession['linkedAt'],
    createdAt: data.createdAt as unknown as BotSession['createdAt'],
    lastActiveAt: data.lastActiveAt as unknown as BotSession['lastActiveAt'],
  };
}

/** Find all linked bot sessions for a given kidId — used by the scheduled
 *  daily-milestone cron to push a "TODAY'S BIG CHOICE" message to every
 *  chat the kid has connected (e.g. their phone's Telegram + a tablet's).
 *  Returns [] if the index is still building — graceful degradation: the
 *  kid still gets the milestone in the web app, they just don't get the
 *  push notification for that one kid-day. */
export async function findBotSessionsForKid(kidId: string): Promise<BotSession[]> {
  try {
    const snap = await adminDb
      .collection(BOT_SESSIONS_COLLECTION)
      .where('kidId', '==', kidId)
      .get();
    return snap.docs.map((doc) => mapDoc(doc.data() as BotSessionDoc));
  } catch (err) {
    const msg = String((err as { message?: unknown })?.message ?? '').toLowerCase();
    if (msg.includes('index') && (msg.includes('build') || msg.includes('creat'))) {
      console.warn('[sessionStore] index still building for kidId lookup; returning []');
      return [];
    }
    throw err;
  }
}

/** Get the session for a chatId, creating a blank anonymous one if missing. */
export async function getOrCreateBotSession(params: {
  chatId: string;
  platform: BotPlatform;
  botHandle: BotHandle;
}): Promise<BotSession> {
  const ref = adminDb.collection(BOT_SESSIONS_COLLECTION).doc(params.chatId);
  const snap = await ref.get();
  if (snap.exists) {
    return mapDoc(snap.data() as BotSessionDoc);
  }

  const now = Timestamp.now();
  const doc: BotSessionDoc = {
    chatId: params.chatId,
    platform: params.platform,
    botHandle: params.botHandle,
    gsiSessionId: newGsiSessionId(),
    userId: null,
    kidId: null,
    activeModule: null,
    moduleState: {},
    linkedAt: null,
    createdAt: now,
    lastActiveAt: now,
  };
  await ref.set(doc, { merge: true });
  return mapDoc(doc);
}

/** Refresh lastActiveAt. No-op if the doc does not exist. */
export async function touchBotSession(chatId: string): Promise<void> {
  const ref = adminDb.collection(BOT_SESSIONS_COLLECTION).doc(chatId);
  await ref.set({ lastActiveAt: Timestamp.now() }, { merge: true });
}

/** Switch the chat's activeModule. */
export async function setActiveModule(
  chatId: string,
  module: BotActiveModuleId | null,
): Promise<void> {
  const ref = adminDb.collection(BOT_SESSIONS_COLLECTION).doc(chatId);
  await ref.set({ activeModule: module, lastActiveAt: Timestamp.now() }, { merge: true });
}

/** Shallow-merge per-module state at moduleState[module]. */
export async function updateModuleState(
  chatId: string,
  module: string,
  state: Record<string, unknown>,
): Promise<void> {
  const ref = adminDb.collection(BOT_SESSIONS_COLLECTION).doc(chatId);
  const snap = await ref.get();
  const existing = (snap.data() as BotSessionDoc | undefined)?.moduleState ?? {};
  const merged = {
    ...existing,
    [module]: { ...(existing[module] as Record<string, unknown> | undefined ?? {}), ...state },
  };
  await ref.set({ moduleState: merged, lastActiveAt: Timestamp.now() }, { merge: true });
}

/** Attach an authenticated user + kid (and optionally replace gsiSessionId)
 *  to an existing chat. Called by the bot-link redemption flow. */
export async function linkBotSession(params: {
  chatId: string;
  gsiSessionId?: string;
  userId?: string | null;
  kidId?: string | null;
}): Promise<BotSession> {
  const ref = adminDb.collection(BOT_SESSIONS_COLLECTION).doc(params.chatId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppException('NOT_FOUND', 'Bot session not found for this chat', 404);
  }

  const updates: Partial<BotSessionDoc> = {
    userId: params.userId ?? null,
    kidId: params.kidId ?? null,
    linkedAt: Timestamp.now(),
    lastActiveAt: Timestamp.now(),
  };
  if (params.gsiSessionId) {
    updates.gsiSessionId = params.gsiSessionId;
  }
  await ref.set(updates, { merge: true });

  const updated = await ref.get();
  return mapDoc(updated.data() as BotSessionDoc);
}
