/** Homework module — powers @GSIPersonalAssistantBot.
 *
 *  Flow (happy path):
 *    1. Kid/parent forwards a message (text/photo/voice) to the bot
 *    2. We rate-limit, OCR/STT if needed, classify "is this homework?", parse
 *       into structured questions, persist a HomeworkSession, and show the
 *       mode selector with a smart default.
 *    3. Kid picks a mode → we send Q1 of N.
 *    4. Kid answers (text / voice / button) → evaluate → next question,
 *       with hints + reveal-after-3-attempts + skip + explain escapes.
 *    5. On completion → rewards (AI Points + Homework Hero badges + streak).
 *
 *  See /docs/MESSENGER_BOT_ARCHITECTURE.md §5 for the v1 design decisions.
 *  See stories/phase-2/HOMEWORK-001 (to be written) for the story. */

import { Timestamp } from 'firebase-admin/firestore';
import { AppException } from '@/lib/api-utils';
import type {
  BotContext,
  BotFeatureModule,
  BotIncomingMessage,
  BotOutgoingMessage,
  HomeworkMode,
  HomeworkQuestion,
  HomeworkSession,
  HomeworkAnswer,
} from '@/lib/bot/types';
import {
  updateModuleState,
  setActiveModule,
} from '@/lib/bot/services/sessionStore';
import { extractTextFromImage } from '@/lib/bot/services/ocr';
import { detectLanguage } from '@/lib/bot/services/languageDetect';
import { classifyAsHomework } from '@/lib/bot/services/homeworkClassifier';
import { parseHomework } from '@/lib/bot/services/homeworkParser';
import {
  createHomeworkSession,
  getHomeworkSession,
  recordAnswer,
  setMode,
  skipCurrentQuestion,
} from '@/lib/bot/services/homeworkSessionStore';
import { checkAndIncrementForwardRate } from '@/lib/bot/services/homeworkRateLimit';
import { scoreRecitation } from '@/lib/bot/services/recitationScorer';
import { applyHomeworkReward } from '@/lib/bot/services/homeworkRewards';

type Send = (msg: BotOutgoingMessage) => Promise<string>;

const MAX_ATTEMPTS_BEFORE_REVEAL = 3;

/** Per-chat state we persist under `botSessions.moduleState.homework` so
 *  text/voice messages that arrive outside a callback can find the active
 *  session. Keeping it tiny — the source of truth is `homeworkSessions`. */
interface HomeworkChatState {
  currentSessionId: string | null;
  pendingConfirm: {
    originalText: string;
    sourceChannelId: string | null;
  } | null;
}

export const homeworkModule: BotFeatureModule = {
  id: 'homework',
  commands: ['/homework'],
  callbackPrefixes: [
    'hw_mode:',
    'hw_ans:',
    'hw_hint:',
    'hw_next:',
    'hw_explain:',
    'hw_skip:',
    'hw_continue:',
    'hw_confirm:',
    'hw_cancel:',
  ],

  canHandleForward(_message: BotIncomingMessage): boolean {
    // Accept every forward — the real "is this homework?" decision happens
    // inside handleForward via the LLM classifier, not here.
    return true;
  },

  canHandleVoice(_message: BotIncomingMessage): boolean {
    // Voice messages are only meaningful while a session is active; the
    // router checks activeModule before calling this.
    return true;
  },

  async handle(message, send, context) {
    try {
      if (message.type === 'command' && message.command === '/homework') {
        await sendIntroMessage(message, send);
        return;
      }

      if (message.type === 'forward') {
        await handleForward(message, send, context);
        return;
      }

      if (message.type === 'callback' && message.callbackData) {
        await handleCallback(message, send, context);
        return;
      }

      if (message.type === 'voice') {
        await handleVoiceAnswer(message, send, context);
        return;
      }

      if (message.type === 'text') {
        await handleTextAnswer(message, send, context);
        return;
      }
    } catch (err) {
      await sendFallbackError(err, message.chatId, send);
    }
  },
};

// ─── /homework intro ───────────────────────────────────────

async function sendIntroMessage(
  message: BotIncomingMessage,
  send: Send,
): Promise<void> {
  await send({
    chatId: message.chatId,
    text: [
      '*Homework helper* 📚',
      '',
      'Forward me a homework message from your school group — text, a photo of a worksheet, or even a voice note — and I will turn it into an interactive practice session.',
      '',
      'I can:',
      '📝 Quiz you question by question',
      '🗣 Listen to you read aloud',
      '💡 Explain concepts before you try',
      '🔄 Give you similar problems to practise',
      '',
      "Just forward something to get started!",
    ].join('\n'),
    parseMode: 'markdown',
  });
}

// ─── Forward handling ──────────────────────────────────────

async function handleForward(
  message: BotIncomingMessage,
  send: Send,
  context: BotContext,
): Promise<void> {
  await checkAndIncrementForwardRate({
    chatId: message.chatId,
    kidId: context.session.kidId,
  });

  // 1. Turn the forward into plain text (text / photo OCR / voice STT).
  await send({ chatId: message.chatId, text: '📚 Looking at your homework...' });
  const extracted = await extractTextFromForward(message, context);
  if (!extracted) {
    await send({
      chatId: message.chatId,
      text: "Hmm — I couldn't read that one. Try forwarding it again as text or a clear photo 📸",
    });
    return;
  }

  const sourceChannelId = deriveSourceChannelId(message);

  // 2. "Is this actually homework?" gate. When the classifier says no, ask
  //    the kid to confirm before we run the expensive parser.
  const classification = await classifyAsHomework(extracted, context);
  if (!classification.isHomework && classification.confidence >= 0.6) {
    await savePendingConfirm(context, {
      originalText: extracted,
      sourceChannelId,
    });
    await send({
      chatId: message.chatId,
      text: `🤔 ${classification.reason} Want me to try to turn it into homework practice anyway?`,
      buttons: [
        [
          { text: '✅ Yes, try it', callbackData: 'hw_confirm:try' },
          { text: '❌ No, cancel', callbackData: 'hw_cancel:confirm' },
        ],
      ],
    });
    return;
  }

  await startSessionFromText(
    { originalText: extracted, sourceChannelId },
    message,
    send,
    context,
  );
}

async function extractTextFromForward(
  message: BotIncomingMessage,
  context: BotContext,
): Promise<string | null> {
  if (message.text && message.text.trim().length > 0) {
    return message.text.trim();
  }

  if (message.voiceUrl) {
    try {
      const audio = await context.downloadVoice(message.voiceUrl);
      return (await context.transcribeVoice(audio)).trim();
    } catch (err) {
      console.warn(
        '[homework] voice forward transcription failed:',
        err instanceof Error ? err.message : err,
      );
      return null;
    }
  }

  if (message.documentUrl) {
    try {
      const bytes = await context.downloadVoice(message.documentUrl);
      const ocr = await extractTextFromImage(bytes);
      if (!ocr) return null;
      return ocr.lowConfidence ? `${ocr.text}` : ocr.text;
    } catch (err) {
      console.warn(
        '[homework] photo/document OCR failed:',
        err instanceof Error ? err.message : err,
      );
      return null;
    }
  }

  return null;
}

function deriveSourceChannelId(message: BotIncomingMessage): string | null {
  // Pre-Bot-API-7.0 clients still send forward_from_chat; newer ones send
  // forward_origin (which we also need for anything forwarded after Dec 2023).
  const raw = message.raw as
    | {
        message?: {
          forward_from_chat?: { id?: number | string };
          forward_origin?: {
            type?: string;
            chat?: { id?: number | string };
            sender_chat?: { id?: number | string };
          };
        };
      }
    | undefined;
  const msg = raw?.message;
  const legacyId = msg?.forward_from_chat?.id;
  if (typeof legacyId === 'number' || typeof legacyId === 'string') {
    return String(legacyId);
  }
  const origin = msg?.forward_origin;
  if (origin?.type === 'channel') {
    const id = origin.chat?.id;
    if (typeof id === 'number' || typeof id === 'string') return String(id);
  }
  if (origin?.type === 'chat') {
    const id = origin.sender_chat?.id;
    if (typeof id === 'number' || typeof id === 'string') return String(id);
  }
  return null;
}

async function savePendingConfirm(
  context: BotContext,
  pending: HomeworkChatState['pendingConfirm'],
): Promise<void> {
  await updateModuleState(context.session.chatId, 'homework', {
    pendingConfirm: pending,
  });
}

async function clearPendingConfirm(context: BotContext): Promise<void> {
  await updateModuleState(context.session.chatId, 'homework', {
    pendingConfirm: null,
  });
}

async function startSessionFromText(
  input: { originalText: string; sourceChannelId: string | null },
  message: BotIncomingMessage,
  send: Send,
  context: BotContext,
): Promise<void> {
  const parsed = await parseHomework(input.originalText, context);
  if (!parsed) {
    await send({
      chatId: message.chatId,
      text:
        "I couldn't pull questions out of that. If it was a photo, a clearer picture helps — or you can just type the questions to me!",
    });
    return;
  }

  // Save the session.
  const language = parsed.language === 'hi' ? 'hi' : detectLanguage(input.originalText);
  const session = await createHomeworkSession({
    sessionId: context.session.chatId,
    gsiSessionId: context.session.gsiSessionId,
    kidId: context.session.kidId,
    platform: context.session.platform,
    subject: parsed.subject,
    gradeEstimate: parsed.gradeEstimate,
    language,
    originalText: input.originalText,
    questions: parsed.questions,
    mode: parsed.suggestedMode,
    sourceChannelId: input.sourceChannelId,
  });

  await updateModuleState(context.session.chatId, 'homework', {
    currentSessionId: session.id,
    pendingConfirm: null,
  });
  await setActiveModule(context.session.chatId, 'homework');

  await send({
    chatId: message.chatId,
    text: [
      '*Homework detected!* 📚',
      '',
      `Subject: ${escapeMarkdown(session.subject)}`,
      `Questions: ${session.totalQuestions}`,
      `Language: ${session.language === 'hi' ? 'Hindi' : 'English'}`,
      '',
      'How do you want to practise?',
    ].join('\n'),
    parseMode: 'markdown',
    buttons: modeButtons(session.id, parsed.suggestedMode),
  });
}

function modeButtons(sessionId: string, suggested: HomeworkMode) {
  const all: Array<{ mode: HomeworkMode; text: string }> = [
    { mode: 'quiz', text: '📝 Quiz Me' },
    { mode: 'recite', text: '🗣 Read Aloud' },
    { mode: 'explain', text: '💡 Explain It' },
    { mode: 'practice', text: '🔄 More Practice' },
  ];
  return [
    all.map((b) => ({
      text: b.mode === suggested ? `⭐ ${b.text}` : b.text,
      callbackData: `hw_mode:${b.mode}:${sessionId}`,
    })),
  ];
}

// ─── Callback routing ──────────────────────────────────────

async function handleCallback(
  message: BotIncomingMessage,
  send: Send,
  context: BotContext,
): Promise<void> {
  const data = message.callbackData!;

  if (data.startsWith('hw_confirm:')) {
    await handleConfirmNonHomework(message, send, context);
    return;
  }
  if (data.startsWith('hw_cancel:')) {
    await clearPendingConfirm(context);
    await send({
      chatId: message.chatId,
      text: 'No problem — forward me some homework whenever you are ready!',
    });
    return;
  }

  const parts = data.split(':');

  if (data.startsWith('hw_mode:')) {
    const mode = parts[1];
    const sessionId = parts[2];
    if (!mode || !sessionId) return;
    await startMode(mode as HomeworkMode, sessionId, message, send, context);
    return;
  }

  if (data.startsWith('hw_ans:')) {
    const sessionId = parts[1];
    const choice = parts[2];
    if (!sessionId || choice === undefined) return;
    await handleMcqAnswer(sessionId, choice, message, send, context);
    return;
  }

  if (data.startsWith('hw_hint:')) {
    const sessionId = parts[1];
    if (!sessionId) return;
    await sendHint(sessionId, message, send);
    return;
  }

  if (data.startsWith('hw_explain:')) {
    const sessionId = parts[1];
    if (!sessionId) return;
    await explainCurrent(sessionId, message, send, context);
    return;
  }

  if (data.startsWith('hw_skip:')) {
    const sessionId = parts[1];
    if (!sessionId) return;
    await skipCurrent(sessionId, message, send, context);
    return;
  }

  if (data.startsWith('hw_next:')) {
    const sessionId = parts[1];
    if (!sessionId) return;
    await sendCurrentQuestion(sessionId, message, send);
    return;
  }

  if (data.startsWith('hw_continue:')) {
    const sessionId = parts[1];
    if (!sessionId) return;
    await sendCurrentQuestion(sessionId, message, send);
    return;
  }
}

async function handleConfirmNonHomework(
  message: BotIncomingMessage,
  send: Send,
  context: BotContext,
): Promise<void> {
  const state = getChatState(context);
  const pending = state.pendingConfirm;
  if (!pending) {
    await send({
      chatId: message.chatId,
      text: 'Hmm, I lost track of that message — please forward it again!',
    });
    return;
  }
  await clearPendingConfirm(context);
  await startSessionFromText(pending, message, send, context);
}

// ─── Mode start ────────────────────────────────────────────

async function startMode(
  mode: HomeworkMode,
  sessionId: string,
  message: BotIncomingMessage,
  send: Send,
  context: BotContext,
): Promise<void> {
  const session = await getHomeworkSession(sessionId);
  if (!session) {
    await send({
      chatId: message.chatId,
      text: "That homework session is gone — forward your homework again!",
    });
    return;
  }
  await setMode(sessionId, mode);
  await updateModuleState(context.session.chatId, 'homework', {
    currentSessionId: sessionId,
  });
  await sendCurrentQuestion(sessionId, message, send);
}

// ─── Asking questions ──────────────────────────────────────

async function sendCurrentQuestion(
  sessionId: string,
  message: BotIncomingMessage,
  send: Send,
): Promise<void> {
  const session = await getHomeworkSession(sessionId);
  if (!session) return;

  if (session.progress.currentIndex >= session.totalQuestions) {
    await sendCompletion(session, message, send);
    return;
  }

  const q = session.questions[session.progress.currentIndex];
  if (!q) return;
  const progressTag = `Q${session.progress.currentIndex + 1} of ${session.totalQuestions}`;
  const header = `*${progressTag}*`;

  if (q.type === 'multiple_choice' && q.options && q.options.length > 0) {
    await send({
      chatId: message.chatId,
      text: `${header}\n\n${escapeMarkdown(q.text)}`,
      parseMode: 'markdown',
      buttons: [
        ...q.options.map((opt, i) => [
          {
            text: `${String.fromCharCode(65 + i)}. ${opt}`,
            callbackData: `hw_ans:${sessionId}:${i}`,
          },
        ]),
        controlButtons(sessionId, q.id),
      ],
    });
    return;
  }

  if (q.type === 'recitation' && q.recitationText) {
    await send({
      chatId: message.chatId,
      text: [
        header,
        '',
        'Read this aloud and send it as a voice message 🎙',
        '',
        `"${q.recitationText}"`,
      ].join('\n'),
      parseMode: 'markdown',
      buttons: [controlButtons(sessionId, q.id)],
    });
    return;
  }

  // short_answer, explanation, calculation — text reply expected.
  await send({
    chatId: message.chatId,
    text: [header, '', escapeMarkdown(q.text), '', '_Type your answer below._'].join('\n'),
    parseMode: 'markdown',
    buttons: [controlButtons(sessionId, q.id)],
  });
}

function controlButtons(sessionId: string, qId: number) {
  return [
    { text: '💡 Hint', callbackData: `hw_hint:${sessionId}` },
    { text: '📖 Explain', callbackData: `hw_explain:${sessionId}:${qId}` },
    { text: '⏭ Skip', callbackData: `hw_skip:${sessionId}:${qId}` },
  ];
}

// ─── MCQ answer ────────────────────────────────────────────

async function handleMcqAnswer(
  sessionId: string,
  choice: string,
  message: BotIncomingMessage,
  send: Send,
  context: BotContext,
): Promise<void> {
  const session = await getHomeworkSession(sessionId);
  if (!session) return;
  const q = session.questions[session.progress.currentIndex];
  if (!q || q.type !== 'multiple_choice' || !q.options) return;

  const index = Number(choice);
  const selected = q.options[index];
  if (typeof selected !== 'string') return;

  const correct = selected === q.correctAnswer;
  await finaliseAnswer({
    session,
    question: q,
    answerText: selected,
    correct,
    message,
    send,
    context,
  });
}

// ─── Text (short-answer / explanation / calculation) ──────

async function handleTextAnswer(
  message: BotIncomingMessage,
  send: Send,
  context: BotContext,
): Promise<void> {
  const state = getChatState(context);
  const sessionId = state.currentSessionId;
  if (!sessionId) {
    // No active session — pass through to the router's help fallback.
    return;
  }
  const session = await getHomeworkSession(sessionId);
  if (!session) return;
  if (session.progress.currentIndex >= session.totalQuestions) return;

  const q = session.questions[session.progress.currentIndex];
  if (!q) return;
  const answer = (message.text ?? '').trim();
  if (!answer) return;

  const correct = await scoreTextAnswer(q, answer, context);
  await finaliseAnswer({
    session,
    question: q,
    answerText: answer,
    correct,
    message,
    send,
    context,
  });
}

/** Cheap answer-equality check first — many short-answer / calculation
 *  questions have a single canonical answer. Falls back to an LLM-grader
 *  call when the question is open-ended. */
async function scoreTextAnswer(
  q: HomeworkQuestion,
  answer: string,
  context: BotContext,
): Promise<boolean> {
  if (q.correctAnswer) {
    const normalise = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
    if (normalise(answer) === normalise(q.correctAnswer)) return true;
  }

  if (q.type === 'explanation') {
    const graderPrompt = [
      'You are grading a child\'s one-sentence explanation.',
      `Question: "${q.text}"`,
      `Child\'s answer: "${answer}"`,
      q.correctAnswer ? `Expected key idea: "${q.correctAnswer}"` : '',
      'Is the child\'s answer broadly correct / on the right track? Respond ONLY with "yes" or "no".',
    ]
      .filter(Boolean)
      .join('\n');
    try {
      const result = await context.generateText(graderPrompt, answer);
      return /^\s*yes/i.test(result);
    } catch (err) {
      console.warn('[homework] text grader failed:', err);
      return false;
    }
  }

  return false;
}

// ─── Recitation (voice) ────────────────────────────────────

async function handleVoiceAnswer(
  message: BotIncomingMessage,
  send: Send,
  context: BotContext,
): Promise<void> {
  const state = getChatState(context);
  const sessionId = state.currentSessionId;
  if (!sessionId || !message.voiceUrl) return;
  const session = await getHomeworkSession(sessionId);
  if (!session) return;
  const q = session.questions[session.progress.currentIndex];
  if (!q || q.type !== 'recitation' || !q.recitationText) return;

  await send({ chatId: message.chatId, text: '🎧 Listening...' });

  let transcript: string;
  try {
    const audio = await context.downloadVoice(message.voiceUrl);
    transcript = (await context.transcribeVoice(audio)).trim();
  } catch (err) {
    console.warn('[homework] recitation STT failed:', err);
    await send({
      chatId: message.chatId,
      text: 'I had trouble hearing that — could you try recording again?',
    });
    return;
  }

  const score = await scoreRecitation({
    expected: q.recitationText,
    transcript,
    context,
  });

  const emoji = score.accuracy >= 80 ? '🌟' : score.accuracy >= 60 ? '👍' : '💪';
  await send({
    chatId: message.chatId,
    text: [
      `${emoji} *Recitation Score: ${score.accuracy}%*`,
      '',
      score.encouragement,
      score.pronunciationNotes ? `\n📝 Watch out for: ${score.pronunciationNotes}` : '',
      `\n💡 Tip: ${score.tip}`,
    ]
      .filter(Boolean)
      .join('\n'),
    parseMode: 'markdown',
  });

  await finaliseAnswer({
    session,
    question: q,
    answerText: transcript,
    correct: score.accuracy >= 70,
    message,
    send,
    context,
    overrideScore: score.accuracy,
  });
}

// ─── Hint / Explain / Skip ─────────────────────────────────

async function sendHint(
  sessionId: string,
  message: BotIncomingMessage,
  send: Send,
): Promise<void> {
  const session = await getHomeworkSession(sessionId);
  if (!session) return;
  const q = session.questions[session.progress.currentIndex];
  if (!q) return;
  await send({
    chatId: message.chatId,
    text: `💡 Hint: ${q.hint}`,
    buttons: [controlButtons(sessionId, q.id)],
  });
}

async function explainCurrent(
  sessionId: string,
  message: BotIncomingMessage,
  send: Send,
  context: BotContext,
): Promise<void> {
  const session = await getHomeworkSession(sessionId);
  if (!session) return;
  const q = session.questions[session.progress.currentIndex];
  if (!q) return;

  const prompt = [
    'You are a patient teacher explaining a concept to an Indian school child (ages 8-17).',
    'Explain the idea behind this question in 3-5 short sentences, in simple language.',
    'DO NOT give the final answer — help the child understand how to think about it.',
    '',
    `Subject: ${session.subject}`,
    `Grade: ${session.gradeEstimate}`,
    `Question: ${q.text}`,
  ].join('\n');

  let explanation: string;
  try {
    explanation = await context.generateText(prompt, q.text);
  } catch (err) {
    console.warn('[homework] explain call failed:', err);
    explanation = q.hint;
  }

  await send({
    chatId: message.chatId,
    text: [`📖 *Let me help you think about it:*`, '', explanation, '', "Give it a try now!"].join(
      '\n',
    ),
    parseMode: 'markdown',
    buttons: [controlButtons(sessionId, q.id)],
  });
}

async function skipCurrent(
  sessionId: string,
  message: BotIncomingMessage,
  send: Send,
  _context: BotContext,
): Promise<void> {
  const session = await skipCurrentQuestion(sessionId);
  if (session.progress.currentIndex >= session.totalQuestions) {
    await sendCompletion(session, message, send);
    return;
  }
  await send({
    chatId: message.chatId,
    text: "No worries — we'll come back to that later.",
  });
  await sendCurrentQuestion(sessionId, message, send);
}

// ─── Answer finalisation + reveal-after-3 ──────────────────

async function finaliseAnswer(params: {
  session: HomeworkSession;
  question: HomeworkQuestion;
  answerText: string;
  correct: boolean;
  message: BotIncomingMessage;
  send: Send;
  context: BotContext;
  overrideScore?: number;
}): Promise<void> {
  const { session, question, answerText, correct, message, send } = params;
  const existing = session.progress.answers.find(
    (a: HomeworkAnswer) => a.questionId === question.id,
  );
  const attemptsSoFar = existing?.attempts ?? 0;
  const nextAttemptNumber = attemptsSoFar + 1;

  let reveal = false;
  let advance = correct;

  if (!correct && nextAttemptNumber >= MAX_ATTEMPTS_BEFORE_REVEAL) {
    reveal = true;
    advance = true;
  }

  const scoreValue =
    typeof params.overrideScore === 'number'
      ? params.overrideScore
      : correct
        ? 100
        : 0;

  const updated = await recordAnswer({
    id: session.id,
    questionId: question.id,
    answer: answerText,
    correct,
    score: scoreValue,
    revealed: reveal,
    advance,
  });

  if (reveal) {
    await sendReveal(question, message, send);
  } else if (correct) {
    await send({
      chatId: message.chatId,
      text: '✅ Nice — that\'s right!',
    });
  } else {
    const attemptsLeft = MAX_ATTEMPTS_BEFORE_REVEAL - nextAttemptNumber;
    await send({
      chatId: message.chatId,
      text: `❌ Not quite — give it another go! You have ${attemptsLeft} ${
        attemptsLeft === 1 ? 'try' : 'tries'
      } left, or tap *Hint*.`,
      parseMode: 'markdown',
      buttons: [controlButtons(session.id, question.id)],
    });
    return;
  }

  if (updated.progress.currentIndex >= updated.totalQuestions) {
    await sendCompletion(updated, message, send, params.context);
  } else {
    await sendCurrentQuestion(session.id, message, send);
  }
}

async function sendReveal(
  question: HomeworkQuestion,
  message: BotIncomingMessage,
  send: Send,
): Promise<void> {
  const answerLine = question.correctAnswer
    ? `The answer is: *${escapeMarkdown(question.correctAnswer)}*`
    : 'Here is how to think about it:';
  await send({
    chatId: message.chatId,
    text: [
      '📖 *No worries — let me walk through this one:*',
      '',
      answerLine,
      '',
      question.hint,
      '',
      "You did great trying! Let's keep going.",
    ].join('\n'),
    parseMode: 'markdown',
  });
}

// ─── Completion + rewards ──────────────────────────────────

async function sendCompletion(
  session: HomeworkSession,
  message: BotIncomingMessage,
  send: Send,
  context?: BotContext,
): Promise<void> {
  // Mark the session complete in the bot's chat state so subsequent
  // messages don't get routed into a finished session.
  if (context) {
    await updateModuleState(context.session.chatId, 'homework', {
      currentSessionId: null,
    });
    await setActiveModule(context.session.chatId, null);
  }

  // Only grant rewards once — guard via `completedAt` having been set by
  // recordAnswer / skipCurrentQuestion. Here we're called right after
  // either of those, so the rewards are applied exactly once per run.
  let rewardLine = '';
  if (context) {
    try {
      const reward = await applyHomeworkReward({
        gsiSessionId: session.gsiSessionId,
        kidId: session.kidId,
        session,
      });
      rewardLine = `\n+${reward.pointsAwarded} AI Points`;
      if (reward.newBadges.length > 0) {
        rewardLine += `\n🏅 New badge${
          reward.newBadges.length === 1 ? '' : 's'
        }: ${reward.newBadges.map(badgeLabel).join(', ')}`;
      }
    } catch (err) {
      console.warn('[homework] reward application failed:', err);
    }
  }

  const scoreLine = `Score: *${session.score}%*`;
  const revealedLine =
    session.revealedQuestionIds.length > 0
      ? `\n(I helped with ${session.revealedQuestionIds.length} ${
          session.revealedQuestionIds.length === 1 ? 'question' : 'questions'
        } — totally fine!)`
      : '';

  await send({
    chatId: message.chatId,
    text: [
      '🎉 *All done!*',
      '',
      scoreLine + revealedLine,
      rewardLine,
      '',
      'Forward another homework whenever you like — I\'ll be here!',
    ].join('\n'),
    parseMode: 'markdown',
  });
}

// Friendly label for newly earned badges. Imports are kept local to avoid
// a circular-ish import of BADGE_CATALOG into this module's top level.
function badgeLabel(id: string): string {
  // Dynamic import would be async; a simple static map avoids pulling the
  // whole catalog into the bot bundle. Keep this in sync with badges.ts.
  const labels: Record<string, string> = {
    homework_hero_bronze: '🥉 Homework Hero — Bronze',
    homework_hero_silver: '🥈 Homework Hero — Silver',
    homework_hero_gold: '🥇 Homework Hero — Gold',
    homework_streak_3: '🔥 On a Roll',
    homework_streak_7: '⚡ Week Warrior',
  };
  return labels[id] ?? id;
}

// ─── Misc helpers ──────────────────────────────────────────

function getChatState(context: BotContext): HomeworkChatState {
  const raw = (context.session.moduleState ?? {}) as Record<string, unknown>;
  const hw = (raw.homework ?? {}) as Partial<HomeworkChatState>;
  return {
    currentSessionId:
      typeof hw.currentSessionId === 'string' || hw.currentSessionId === null
        ? (hw.currentSessionId as string | null)
        : null,
    pendingConfirm:
      hw.pendingConfirm && typeof hw.pendingConfirm === 'object'
        ? (hw.pendingConfirm as HomeworkChatState['pendingConfirm'])
        : null,
  };
}

async function sendFallbackError(
  err: unknown,
  chatId: string,
  send: Send,
): Promise<void> {
  if (err instanceof AppException) {
    console.warn('[homework] handled error:', err.code, err.message);
    await send({ chatId, text: err.message });
    return;
  }
  console.error('[homework] unexpected error:', err);
  await send({
    chatId,
    text: 'Something went wrong on my side — try again in a moment!',
  });
}

function escapeMarkdown(text: string): string {
  // Telegram legacy Markdown only cares about `*`, `_`, `` ` ``, `[`.
  return text.replace(/([*_`\[])/g, '\\$1');
}

// Hint to the TypeScript compiler that Timestamp is imported for side
// effects (used implicitly by transitive imports). A tiny reference here
// ensures tree-shakers don't accidentally drop it in a future refactor.
void Timestamp;
