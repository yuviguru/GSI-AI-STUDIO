/** Firestore CRUD for `homeworkSessions/{id}` — interactive homework sessions
 *  kicked off by a forwarded message to @GSIPersonalAssistantBot.
 *
 *  Server-side only via Admin SDK. Mirrors the idempotent + defaults-aware
 *  pattern from `sessionStore.ts` (bot session store).
 *
 *  @see /docs/data-model.md#homeworksessions-phase-2 for the schema.
 *  @see /lib/bot/modules/homework.ts for the caller. */

import crypto from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@gsi/firebase/admin';
import { AppException } from '@/lib/api-utils';
import type {
  HomeworkAnswer,
  HomeworkLanguage,
  HomeworkMode,
  HomeworkProgress,
  HomeworkQuestion,
  HomeworkSession,
  BotPlatform,
} from '@/lib/bot/types';

const HOMEWORK_SESSIONS_COLLECTION = 'homeworkSessions';

/** Internal Firestore document shape — Timestamps stored as Firestore
 *  Timestamp, converted back to the public `HomeworkSession` shape on read. */
interface HomeworkSessionDoc {
  id: string;
  sessionId: string;
  gsiSessionId: string;
  kidId: string | null;
  platform: BotPlatform;
  subject: string;
  gradeEstimate: number;
  language: HomeworkLanguage;
  originalText: string;
  totalQuestions: number;
  questions: HomeworkQuestion[];
  progress: {
    currentIndex: number;
    answers: HomeworkAnswer[];
    mode: HomeworkMode;
    startedAt: Timestamp;
    completedAt: Timestamp | null;
  };
  score: number;
  revealedQuestionIds: number[];
  schoolId: string | null;
  sourceChannelId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

function newId(): string {
  return `hw_${crypto.randomBytes(12).toString('hex')}`;
}

function mapDoc(data: HomeworkSessionDoc): HomeworkSession {
  return {
    id: data.id,
    sessionId: data.sessionId,
    gsiSessionId: data.gsiSessionId,
    kidId: data.kidId,
    platform: data.platform,
    subject: data.subject,
    gradeEstimate: data.gradeEstimate,
    language: data.language,
    originalText: data.originalText,
    totalQuestions: data.totalQuestions,
    questions: data.questions,
    progress: {
      currentIndex: data.progress.currentIndex,
      answers: data.progress.answers,
      mode: data.progress.mode,
      startedAt: data.progress.startedAt as unknown as HomeworkProgress['startedAt'],
      completedAt: data.progress
        .completedAt as unknown as HomeworkProgress['completedAt'],
    },
    score: data.score,
    revealedQuestionIds: data.revealedQuestionIds ?? [],
    schoolId: data.schoolId ?? null,
    sourceChannelId: data.sourceChannelId ?? null,
    createdAt: data.createdAt as unknown as HomeworkSession['createdAt'],
    updatedAt: data.updatedAt as unknown as HomeworkSession['updatedAt'],
  };
}

export interface CreateHomeworkSessionInput {
  sessionId: string;
  gsiSessionId: string;
  kidId: string | null;
  platform: BotPlatform;
  subject: string;
  gradeEstimate: number;
  language: HomeworkLanguage;
  originalText: string;
  questions: HomeworkQuestion[];
  mode: HomeworkMode;
  schoolId?: string | null;
  sourceChannelId?: string | null;
}

/** Create a new homework session. Returns the persisted `HomeworkSession`.
 *  Throws `INVALID_INPUT` when `questions` is empty — a homework session
 *  with no questions is never useful and usually means the LLM parser
 *  returned garbage. */
export async function createHomeworkSession(
  input: CreateHomeworkSessionInput,
): Promise<HomeworkSession> {
  if (input.questions.length === 0) {
    throw new AppException(
      'INVALID_INPUT',
      'No questions could be extracted from this homework. Try forwarding again as text or a clearer photo.',
      400,
    );
  }

  const id = newId();
  const now = Timestamp.now();
  const doc: HomeworkSessionDoc = {
    id,
    sessionId: input.sessionId,
    gsiSessionId: input.gsiSessionId,
    kidId: input.kidId,
    platform: input.platform,
    subject: input.subject,
    gradeEstimate: input.gradeEstimate,
    language: input.language,
    originalText: input.originalText,
    totalQuestions: input.questions.length,
    questions: input.questions,
    progress: {
      currentIndex: 0,
      answers: [],
      mode: input.mode,
      startedAt: now,
      completedAt: null,
    },
    score: 0,
    revealedQuestionIds: [],
    schoolId: input.schoolId ?? null,
    sourceChannelId: input.sourceChannelId ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await adminDb.collection(HOMEWORK_SESSIONS_COLLECTION).doc(id).set(doc);
  return mapDoc(doc);
}

/** Fetch a homework session by ID. Returns null when not found. */
export async function getHomeworkSession(id: string): Promise<HomeworkSession | null> {
  const snap = await adminDb.collection(HOMEWORK_SESSIONS_COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return mapDoc(snap.data() as HomeworkSessionDoc);
}

/** Record an answer attempt for the current question. Handles the
 *  reveal-after-3-attempts product decision server-side so every caller is
 *  consistent. Returns the updated session. */
export async function recordAnswer(params: {
  id: string;
  questionId: number;
  answer: string;
  correct: boolean;
  score: number;
  revealed: boolean;
  advance: boolean;
}): Promise<HomeworkSession> {
  const ref = adminDb.collection(HOMEWORK_SESSIONS_COLLECTION).doc(params.id);

  const updated = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new AppException('NOT_FOUND', 'Homework session not found', 404);
    }
    const data = snap.data() as HomeworkSessionDoc;

    const existing = data.progress.answers.find(
      (a) => a.questionId === params.questionId,
    );
    const attempts = (existing?.attempts ?? 0) + 1;
    const nextAnswer: HomeworkAnswer = {
      questionId: params.questionId,
      answer: params.answer,
      correct: params.correct,
      score: params.score,
      attempts,
      revealed: params.revealed,
    };

    const nextAnswers = existing
      ? data.progress.answers.map((a) =>
          a.questionId === params.questionId ? nextAnswer : a,
        )
      : [...data.progress.answers, nextAnswer];

    const nextRevealed = params.revealed
      ? Array.from(new Set([...(data.revealedQuestionIds ?? []), params.questionId]))
      : data.revealedQuestionIds ?? [];

    const nextIndex = params.advance
      ? Math.min(data.progress.currentIndex + 1, data.totalQuestions)
      : data.progress.currentIndex;

    const completed = nextIndex >= data.totalQuestions;

    const updatedDoc: HomeworkSessionDoc = {
      ...data,
      revealedQuestionIds: nextRevealed,
      progress: {
        ...data.progress,
        currentIndex: nextIndex,
        answers: nextAnswers,
        completedAt: completed ? Timestamp.now() : data.progress.completedAt,
      },
      score: computeScore(nextAnswers, data.totalQuestions, nextRevealed.length),
      updatedAt: Timestamp.now(),
    };

    tx.set(ref, updatedDoc);
    return updatedDoc;
  });

  return mapDoc(updated);
}

/** Switch a session's mode. Resets `currentIndex` so the kid starts from
 *  Q1 in the new mode — previous answers are preserved but not replayed. */
export async function setMode(id: string, mode: HomeworkMode): Promise<HomeworkSession> {
  const ref = adminDb.collection(HOMEWORK_SESSIONS_COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppException('NOT_FOUND', 'Homework session not found', 404);
  }
  const data = snap.data() as HomeworkSessionDoc;
  const updated: HomeworkSessionDoc = {
    ...data,
    progress: { ...data.progress, mode, currentIndex: 0 },
    updatedAt: Timestamp.now(),
  };
  await ref.set(updated);
  return mapDoc(updated);
}

/** Mark a question as skipped — advances `currentIndex` without changing
 *  answers. Skipped questions keep the session resumable. */
export async function skipCurrentQuestion(id: string): Promise<HomeworkSession> {
  const ref = adminDb.collection(HOMEWORK_SESSIONS_COLLECTION).doc(id);
  const updated = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new AppException('NOT_FOUND', 'Homework session not found', 404);
    }
    const data = snap.data() as HomeworkSessionDoc;
    const nextIndex = Math.min(data.progress.currentIndex + 1, data.totalQuestions);
    const completed = nextIndex >= data.totalQuestions;
    const next: HomeworkSessionDoc = {
      ...data,
      progress: {
        ...data.progress,
        currentIndex: nextIndex,
        completedAt: completed ? Timestamp.now() : data.progress.completedAt,
      },
      updatedAt: Timestamp.now(),
    };
    tx.set(ref, next);
    return next;
  });
  return mapDoc(updated);
}

/** Compute the session score. Revealed questions count for 0 points toward
 *  mastery but are excluded from the denominator — "mastery" reflects what
 *  the kid figured out independently. Participation / reduced-points is
 *  handled separately in the rewards pipeline. */
function computeScore(
  answers: HomeworkAnswer[],
  totalQuestions: number,
  revealedCount: number,
): number {
  if (totalQuestions === 0) return 0;
  const eligibleDenominator = totalQuestions - revealedCount;
  if (eligibleDenominator <= 0) return 0;
  const masteredPoints = answers
    .filter((a) => !a.revealed && a.correct)
    .reduce((sum, a) => sum + a.score, 0);
  return Math.round(masteredPoints / eligibleDenominator);
}

/** List a kid/session's recent homework sessions. Used by the web history
 *  endpoint (GET /api/homework/history). */
export async function listRecentHomeworkSessions(params: {
  gsiSessionId: string;
  kidId?: string | null;
  limit?: number;
}): Promise<HomeworkSession[]> {
  const limit = Math.min(params.limit ?? 20, 50);
  let query = adminDb
    .collection(HOMEWORK_SESSIONS_COLLECTION)
    .where('gsiSessionId', '==', params.gsiSessionId);
  if (params.kidId) {
    query = query.where('kidId', '==', params.kidId);
  }
  const snap = await query.orderBy('createdAt', 'desc').limit(limit).get();
  return snap.docs.map((d) => mapDoc(d.data() as HomeworkSessionDoc));
}
