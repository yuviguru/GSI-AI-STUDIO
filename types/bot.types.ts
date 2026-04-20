/** Shared Telegram / messenger bot layer types — powers @GSIPersonalAssistantBot and @GSIKidCeoAssistantBot
 *  via a platform-agnostic adapter + feature-module architecture. */

import type { KidProfile } from './user.types';

/** Local Timestamp alias — mirrors ceo.types.ts; avoids a firebase-admin dependency.
 *  Not exported: kept file-local to avoid barrel-export collision with ceo.types.ts. */
type Timestamp = { seconds: number; nanoseconds: number } | string;

// ─── Primitive Unions ──────────────────────────────────────

export type BotPlatform = 'telegram' | 'whatsapp' | 'discord';

export type BotHandle = 'GSIPersonalAssistantBot' | 'GSIKidCeoAssistantBot';

export type BotIncomingMessageType =
  | 'text'
  | 'command'
  | 'callback'
  | 'voice'
  | 'document'
  | 'photo'
  | 'forward';

export type BotOutgoingParseMode = 'markdown' | 'html' | 'plain';

export type BotActiveModuleId =
  | 'ceo'
  | 'homework'
  | 'challenge'
  | 'skills'
  | 'notifications';

export type HomeworkMode = 'quiz' | 'recite' | 'explain' | 'practice';

export type HomeworkQuestionType =
  | 'multiple_choice'
  | 'short_answer'
  | 'recitation'
  | 'explanation'
  | 'calculation';

// ─── Incoming / Outgoing Messages ──────────────────────────

export interface BotIncomingMessage {
  platform: BotPlatform;
  chatId: string;
  userId: string;
  messageId: string;
  type: BotIncomingMessageType;
  text?: string;
  command?: string;
  callbackData?: string;
  voiceUrl?: string;
  documentUrl?: string;
  documentMimeType?: string;
  forwardedFrom?: string;
  replyToMessageId?: string;
  timestamp: Date;
  raw: unknown;
}

export interface BotButton {
  text: string;
  callbackData: string;
}

export interface BotOutgoingMessage {
  chatId: string;
  text: string;
  parseMode?: BotOutgoingParseMode;
  buttons?: BotButton[][];
  editMessageId?: string;
  replyToMessageId?: string;
  image?: { url: string; caption?: string };
  audio?: { url: string; caption?: string };
  document?: { url: string; filename: string };
}

// ─── Adapter & Module Interfaces ───────────────────────────

/** Platform adapter — one implementation per messenger (Telegram first). */
export interface MessengerAdapter {
  platform: BotPlatform;
  init(): Promise<void>;
  send(message: BotOutgoingMessage): Promise<string>;
  parseWebhook(
    body: unknown,
    headers: Record<string, string>,
  ): BotIncomingMessage | null;
  verifySignature(body: string, headers: Record<string, string>): boolean;
  sendTyping(chatId: string): Promise<void>;
  /** Dismiss the loading spinner on an inline-keyboard callback button.
   *  Only meaningful for Telegram (no-op for platforms without callback
   *  queries). Best-effort — errors should not reject. */
  answerCallbackQuery?(queryId: string, text?: string): Promise<void>;
  downloadVoice(voiceUrl: string): Promise<Buffer>;
  registerWebhook(url: string): Promise<void>;
}

/** Feature module — self-contained handler (ceo, homework, challenge, ...). */
export interface BotFeatureModule {
  id: string;
  commands: string[];
  callbackPrefixes: string[];
  canHandleForward?: (message: BotIncomingMessage) => boolean;
  canHandleVoice?: (message: BotIncomingMessage) => boolean;
  handle: (
    message: BotIncomingMessage,
    send: (message: BotOutgoingMessage) => Promise<string>,
    context: BotContext,
  ) => Promise<void>;
}

/** Per-request context passed into every feature module handler. */
export interface BotContext {
  session: BotSession;
  getGsiSessionId(): Promise<string>;
  getKidProfile(): Promise<KidProfile | null>;
  generateText(systemPrompt: string, userPrompt: string): Promise<string>;
  transcribeVoice(audioBuffer: Buffer): Promise<string>;
  downloadVoice(voiceUrl: string): Promise<Buffer>;
}

// ─── Firestore documents ───────────────────────────────────

/** Firestore document in `botSessions` collection — per-chat state keyed by chatId. */
export interface BotSession {
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

/** Firestore document in `botLinkCodes` collection — short-lived auth binding tokens. */
export interface BotLinkCode {
  token: string;
  gsiSessionId: string;
  userId: string | null;
  kidId: string | null;
  botHandle: BotHandle;
  code: string; // 6-digit numeric fallback for manual entry
  /** Optional business to resume after redemption. Set when the web app's
   *  "Continue on Telegram" button is tapped inside a specific business;
   *  null for a plain "Connect Telegram" from the landing page. */
  businessId: string | null;
  used: boolean;
  usedByChatId: string | null;
  expiresAt: Timestamp;
  createdAt: Timestamp;
}

// ─── Homework Helper ───────────────────────────────────────

export interface HomeworkQuestion {
  id: number;
  text: string;
  type: HomeworkQuestionType;
  options: string[] | null;
  correctAnswer: string | null;
  hint: string;
  recitationText: string | null;
  similarPractice: string | null;
}

export interface HomeworkAnswer {
  questionId: number;
  answer: string;
  correct: boolean;
  score: number;
  attempts: number;
}

export interface HomeworkProgress {
  currentIndex: number;
  answers: HomeworkAnswer[];
  mode: HomeworkMode;
  startedAt: Timestamp;
  completedAt: Timestamp | null;
}

/** Firestore document in `homeworkSessions` collection — interactive homework helper state. */
export interface HomeworkSession {
  id: string;
  sessionId: string;
  gsiSessionId: string;
  kidId: string | null;
  platform: BotPlatform;
  subject: string;
  gradeEstimate: number;
  originalText: string;
  totalQuestions: number;
  questions: HomeworkQuestion[];
  progress: HomeworkProgress;
  score: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
