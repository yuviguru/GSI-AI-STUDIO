/** Weekly homework digest — Sunday-evening summary sent to every bound
 *  Telegram chat with at least one homework session in the last 7 days.
 *
 *  The parent-transparency surface comes in two parts:
 *    - proactive: this digest (delivered via @GSIPersonalAssistantBot DM)
 *    - on-demand: the web `/homework/history/{id}` transcript view
 *
 *  The scheduled function (`netlify/functions/homework-weekly-digest.ts`)
 *  invokes `runWeeklyDigest` once a week (Sunday 19:00 IST). This module
 *  handles the business logic; the Netlify wrapper handles auth, env,
 *  and HTTP.
 *
 *  @see /docs/MESSENGER_BOT_ARCHITECTURE.md §5 "Weekly digest + on-demand transcript"
 */

import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { TelegramAdapter } from '@/lib/bot/adapters/telegram';
import type {
  BotOutgoingMessage,
  HomeworkSession,
  MessengerAdapter,
} from '@/lib/bot/types';

const BOT_SESSIONS = 'botSessions';
const HOMEWORK_SESSIONS = 'homeworkSessions';
const STUDIO_BOT_HANDLE = 'GSIPersonalAssistantBot';
const DEFAULT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface DigestResult {
  chatsConsidered: number;
  digestsSent: number;
  chatsSkippedNoActivity: number;
  failures: Array<{ chatId: string; error: string }>;
}

export interface RunDigestOptions {
  /** Override the "now" timestamp — useful for tests and manual backfills. */
  now?: number;
  /** Override the 7-day window (ms) — useful for tests. */
  windowMs?: number;
  /** Inject a sender for tests. When omitted, a real TelegramAdapter is
   *  constructed from `TELEGRAM_BOT_TOKEN_STUDIO`. */
  adapter?: Pick<MessengerAdapter, 'send'>;
}

/** Kick off the weekly digest run. Iterates every studio-bot chat, pulls
 *  last-week sessions, composes a digest per chat, and sends one DM per
 *  chat that actually had activity. Returns a structured result for the
 *  cron wrapper to log + surface to dashboards. */
export async function runWeeklyDigest(
  opts: RunDigestOptions = {},
): Promise<DigestResult> {
  const now = opts.now ?? Date.now();
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
  const sinceMs = now - windowMs;

  const adapter = opts.adapter ?? buildStudioAdapter();
  if (!adapter) {
    return {
      chatsConsidered: 0,
      digestsSent: 0,
      chatsSkippedNoActivity: 0,
      failures: [
        {
          chatId: '-',
          error:
            'TELEGRAM_BOT_TOKEN_STUDIO is not set — digest cannot send.',
        },
      ],
    };
  }

  const chats = await adminDb
    .collection(BOT_SESSIONS)
    .where('botHandle', '==', STUDIO_BOT_HANDLE)
    .get();

  let digestsSent = 0;
  let chatsSkippedNoActivity = 0;
  const failures: Array<{ chatId: string; error: string }> = [];

  for (const chatDoc of chats.docs) {
    const chatData = chatDoc.data() as {
      chatId: string;
      gsiSessionId?: string;
    };
    const chatId = chatData.chatId ?? chatDoc.id;
    const gsiSessionId = chatData.gsiSessionId;
    if (!gsiSessionId) {
      chatsSkippedNoActivity += 1;
      continue;
    }

    const sessionsSnap = await adminDb
      .collection(HOMEWORK_SESSIONS)
      .where('gsiSessionId', '==', gsiSessionId)
      .where('createdAt', '>=', Timestamp.fromMillis(sinceMs))
      .orderBy('createdAt', 'desc')
      .get();

    if (sessionsSnap.empty) {
      chatsSkippedNoActivity += 1;
      continue;
    }

    const sessions = sessionsSnap.docs.map(
      (d) => d.data() as HomeworkSession,
    );
    const message = buildDigestMessage(sessions);
    try {
      await adapter.send({
        chatId,
        text: message.text,
        parseMode: 'markdown',
      });
      digestsSent += 1;
    } catch (err) {
      failures.push({
        chatId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    chatsConsidered: chats.size,
    digestsSent,
    chatsSkippedNoActivity,
    failures,
  };
}

/** Compose the digest message for one chat. Exported for unit testing. */
export function buildDigestMessage(
  sessions: HomeworkSession[],
): Pick<BotOutgoingMessage, 'text'> & { stats: DigestStats } {
  const stats = computeStats(sessions);
  const lines = [
    '📚 *Homework this week*',
    '',
    `You finished *${stats.completed}* homework session${stats.completed === 1 ? '' : 's'} — nice going!`,
    `Average score: *${stats.averageScore}%*`,
    `Subjects practised: ${stats.subjects.join(', ') || '—'}`,
  ];

  if (stats.strongest) {
    lines.push(`💪 Strongest: *${stats.strongest}*`);
  }
  if (stats.workingOn) {
    lines.push(`🪄 Working on: *${stats.workingOn}*`);
  }
  if (stats.revealedTotal > 0) {
    lines.push(
      `📖 Let me help with ${stats.revealedTotal} question${
        stats.revealedTotal === 1 ? '' : 's'
      } this week — totally fine!`,
    );
  }

  lines.push('');
  lines.push(
    'Open `My Homework` in the app to see every question and answer from the sessions this week.',
  );

  return { text: lines.join('\n'), stats };
}

export interface DigestStats {
  completed: number;
  averageScore: number;
  subjects: string[];
  strongest: string | null;
  workingOn: string | null;
  revealedTotal: number;
}

/** Aggregate stats across a week of sessions. Pure function — exported so
 *  unit tests can verify the math without touching Firestore. */
export function computeStats(sessions: HomeworkSession[]): DigestStats {
  const completedSessions = sessions.filter(
    (s) => s.progress.completedAt != null,
  );
  const completed = completedSessions.length;
  const averageScore =
    completed === 0
      ? 0
      : Math.round(
          completedSessions.reduce((sum, s) => sum + s.score, 0) / completed,
        );

  const subjectSet = new Set<string>();
  const subjectScores = new Map<string, { sum: number; count: number }>();
  let revealedTotal = 0;

  for (const s of completedSessions) {
    subjectSet.add(s.subject);
    const prev = subjectScores.get(s.subject) ?? { sum: 0, count: 0 };
    subjectScores.set(s.subject, {
      sum: prev.sum + s.score,
      count: prev.count + 1,
    });
    revealedTotal += s.revealedQuestionIds?.length ?? 0;
  }

  let strongest: string | null = null;
  let workingOn: string | null = null;
  let best = -Infinity;
  let worst = Infinity;
  for (const [subject, { sum, count }] of subjectScores) {
    const avg = sum / count;
    if (avg > best) {
      best = avg;
      strongest = subject;
    }
    if (avg < worst) {
      worst = avg;
      workingOn = subject;
    }
  }
  // If the kid only has one subject, don't claim a "working on" — same
  // subject would appear as both strongest and workingOn which is silly.
  if (subjectScores.size < 2) {
    workingOn = null;
  }

  return {
    completed,
    averageScore,
    subjects: Array.from(subjectSet),
    strongest,
    workingOn,
    revealedTotal,
  };
}

function buildStudioAdapter(): MessengerAdapter | null {
  const token = process.env.TELEGRAM_BOT_TOKEN_STUDIO;
  if (!token) return null;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET_STUDIO;
  return new TelegramAdapter(token, secret ? { secretToken: secret } : undefined);
}
