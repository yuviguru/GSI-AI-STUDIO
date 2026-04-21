/** Integration tests for the homework module's callback ownership gate.
 *
 *  The attack we're guarding against: a crafted callback like
 *    `hw_ans:<other_kid_session_id>:0`
 *  arriving on chat A must NOT mutate the homework session that belongs
 *  to chat B. Every callback handler resolves the session via
 *  `loadOwnedSession` which compares `session.sessionId` (the chat id
 *  recorded at creation time) to `context.session.chatId`. This spec
 *  exercises the gate end-to-end. */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import type {
  BotContext,
  BotIncomingMessage,
  BotOutgoingMessage,
  HomeworkSession,
} from '@/lib/bot/types';

// ─── Mock every service the module touches ────────────────
//
// Use `vi.hoisted` so the mock-state variables are constructed BEFORE any
// top-of-file `vi.mock(...)` call runs — otherwise vitest's ESM hoisting
// evaluates the mocks above the `const x = vi.fn()` lines.

const mocks = vi.hoisted(() => ({
  getHomeworkSession: vi.fn(),
  recordAnswer: vi.fn(),
  setMode: vi.fn(),
  skipCurrentQuestion: vi.fn(),
  listRecentHomeworkSessions: vi.fn(),
  createHomeworkSession: vi.fn(),
  updateModuleState: vi.fn(),
  setActiveModule: vi.fn(),
  extractTextFromImage: vi.fn(),
  detectLanguage: vi.fn(() => 'en'),
  classifyAsHomework: vi.fn(),
  parseHomework: vi.fn(),
  checkAndIncrementForwardRate: vi.fn(async () => undefined),
  scoreRecitation: vi.fn(),
  applyHomeworkReward: vi.fn(async () => ({
    pointsAwarded: 0,
    newBadges: [],
    pointsData: {
      aiPoints: 0,
      badges: [],
      conceptsLearned: [],
      creationsByType: {},
      shareCount: 0,
    },
  })),
}));

vi.mock('@/lib/bot/services/homeworkSessionStore', () => ({
  getHomeworkSession: mocks.getHomeworkSession,
  recordAnswer: mocks.recordAnswer,
  setMode: mocks.setMode,
  skipCurrentQuestion: mocks.skipCurrentQuestion,
  listRecentHomeworkSessions: mocks.listRecentHomeworkSessions,
  createHomeworkSession: mocks.createHomeworkSession,
}));

vi.mock('@/lib/bot/services/sessionStore', () => ({
  updateModuleState: mocks.updateModuleState,
  setActiveModule: mocks.setActiveModule,
}));

vi.mock('@/lib/bot/services/ocr', () => ({
  extractTextFromImage: mocks.extractTextFromImage,
}));

vi.mock('@/lib/bot/services/languageDetect', () => ({
  detectLanguage: mocks.detectLanguage,
}));

vi.mock('@/lib/bot/services/homeworkClassifier', () => ({
  classifyAsHomework: mocks.classifyAsHomework,
}));

vi.mock('@/lib/bot/services/homeworkParser', () => ({
  parseHomework: mocks.parseHomework,
}));

vi.mock('@/lib/bot/services/homeworkRateLimit', () => ({
  checkAndIncrementForwardRate: mocks.checkAndIncrementForwardRate,
}));

vi.mock('@/lib/bot/services/recitationScorer', () => ({
  scoreRecitation: mocks.scoreRecitation,
}));

vi.mock('@/lib/bot/services/homeworkRewards', () => ({
  applyHomeworkReward: mocks.applyHomeworkReward,
}));

const {
  getHomeworkSession,
  recordAnswer,
  setMode,
  skipCurrentQuestion,
} = mocks;

// ─── Helpers ──────────────────────────────────────────────

import { homeworkModule } from './homework';

function makeSession(overrides: Partial<HomeworkSession> = {}): HomeworkSession {
  const now = Timestamp.now();
  return {
    id: 'hw_victim',
    sessionId: 'chat_victim', // owned by chat_victim
    gsiSessionId: 'sess_victim',
    kidId: null,
    platform: 'telegram',
    subject: 'Math',
    gradeEstimate: 5,
    language: 'en',
    originalText: '',
    totalQuestions: 2,
    questions: [
      {
        id: 1,
        text: 'What is 2+2?',
        type: 'multiple_choice',
        options: ['3', '4'],
        correctAnswer: '4',
        hint: 'Count.',
        recitationText: null,
        similarPractice: null,
      },
      {
        id: 2,
        text: 'What is 3+3?',
        type: 'multiple_choice',
        options: ['5', '6'],
        correctAnswer: '6',
        hint: 'Count.',
        recitationText: null,
        similarPractice: null,
      },
    ],
    progress: {
      currentIndex: 0,
      mode: 'quiz',
      startedAt: now,
      completedAt: null,
      answers: [],
    },
    score: 0,
    revealedQuestionIds: [],
    schoolId: null,
    sourceChannelId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeCallbackMessage(
  attackerChatId: string,
  data: string,
): BotIncomingMessage {
  return {
    platform: 'telegram',
    chatId: attackerChatId,
    userId: 'u_attacker',
    messageId: 'm1',
    type: 'callback',
    callbackData: data,
    timestamp: new Date(),
    raw: {},
  };
}

function makeContext(chatId: string): BotContext {
  return {
    session: {
      chatId,
      platform: 'telegram',
      botHandle: 'GSIPersonalAssistantBot',
      gsiSessionId: `sess_${chatId}`,
      userId: null,
      kidId: null,
      activeModule: 'homework',
      moduleState: {},
      linkedAt: null,
      createdAt: Timestamp.now(),
      lastActiveAt: Timestamp.now(),
    },
    async getGsiSessionId() {
      return `sess_${chatId}`;
    },
    async getKidProfile() {
      return null;
    },
    async generateText() {
      return 'yes';
    },
    async transcribeVoice() {
      return '';
    },
    async downloadVoice() {
      return Buffer.from([]);
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────

describe('homeworkModule ownership gate', () => {
  it('refuses hw_ans callbacks from a chat that does not own the session', async () => {
    getHomeworkSession.mockResolvedValue(makeSession());
    const sent: BotOutgoingMessage[] = [];
    const send = async (m: BotOutgoingMessage) => {
      sent.push(m);
      return 'ok';
    };

    const attackerCallback = makeCallbackMessage(
      'chat_attacker',
      'hw_ans:hw_victim:1', // picks answer "4" on the victim's MCQ
    );

    await homeworkModule.handle(attackerCallback, send, makeContext('chat_attacker'));

    expect(recordAnswer).not.toHaveBeenCalled();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.text).toMatch(/gone|forward your homework/i);
  });

  it('allows the same callback from the chat that owns the session', async () => {
    getHomeworkSession.mockResolvedValue(makeSession());
    recordAnswer.mockResolvedValue(makeSession({
      progress: {
        currentIndex: 1,
        mode: 'quiz',
        startedAt: Timestamp.now(),
        completedAt: null,
        answers: [
          {
            questionId: 1,
            answer: '4',
            correct: true,
            attempts: 1,
            score: 100,
            revealed: false,
          },
        ],
      },
    }));
    const sent: BotOutgoingMessage[] = [];
    const send = async (m: BotOutgoingMessage) => {
      sent.push(m);
      return 'ok';
    };

    const ownerCallback = makeCallbackMessage(
      'chat_victim',
      'hw_ans:hw_victim:1',
    );

    await homeworkModule.handle(ownerCallback, send, makeContext('chat_victim'));

    expect(recordAnswer).toHaveBeenCalledTimes(1);
  });

  it('refuses hw_skip callbacks from a non-owner chat', async () => {
    getHomeworkSession.mockResolvedValue(makeSession());
    const sent: BotOutgoingMessage[] = [];
    const send = async (m: BotOutgoingMessage) => {
      sent.push(m);
      return 'ok';
    };

    const attackerCallback = makeCallbackMessage(
      'chat_attacker',
      'hw_skip:hw_victim:1',
    );

    await homeworkModule.handle(
      attackerCallback,
      send,
      makeContext('chat_attacker'),
    );

    // Crucially: the mutation function must not fire.
    expect(skipCurrentQuestion).not.toHaveBeenCalled();
  });

  it('refuses hw_mode callbacks from a non-owner chat', async () => {
    getHomeworkSession.mockResolvedValue(makeSession());
    const sent: BotOutgoingMessage[] = [];
    const send = async (m: BotOutgoingMessage) => {
      sent.push(m);
      return 'ok';
    };

    const attackerCallback = makeCallbackMessage(
      'chat_attacker',
      'hw_mode:quiz:hw_victim',
    );

    await homeworkModule.handle(
      attackerCallback,
      send,
      makeContext('chat_attacker'),
    );

    expect(setMode).not.toHaveBeenCalled();
  });
});
