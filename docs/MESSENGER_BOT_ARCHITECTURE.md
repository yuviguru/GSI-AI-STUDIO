# GSI-AI-STUDIO — Shared Messenger Bot Architecture
> Two bots, one codebase: `@GSIPersonalAssistantBot` (homework · challenges · skills · notifications) + `@GSIKidCeoAssistantBot` (Kid CEO sim)
> Platforms in v1: **Telegram only**. WhatsApp adapter interface built but not wired; Discord later.

---

## 1. THE BIG PICTURE

```
                        ┌─────────────────────────────┐
                        │     GSI-AI-STUDIO Web App    │
                        │   (Next.js + Firestore)      │
                        └─────────────┬───────────────┘
                                      │ shared Firestore
                                      │ shared AI pipeline
                                      │ shared lib/bot/ infra
                        ┌─────────────┴───────────────┐
                        │   Bot Webhook Gateway         │
                        │   (Netlify Functions)         │
                        └──┬─────────────────────┬───┘
                           │                     │
            ┌──────────────┴──────────┐   ┌──────┴───────────────┐
            │ telegram-webhook-studio │   │ telegram-webhook-ceo │
            │ router registers:       │   │ router registers:    │
            │ • homework              │   │ • ceo                │
            │ • challenge             │   │                      │
            │ • skills                │   │                      │
            │ • notifications         │   │                      │
            └────────────┬────────────┘   └──────────┬───────────┘
                         │                           │
                         ▼                           ▼
                  ┌─────────────┐              ┌──────────────┐
                  │@GSIPersonalAssistantBot│              │@GSIKidCeoAssistantBot │
                  └──────┬──────┘              └──────┬───────┘
                         │                           │
                         ▼                           ▼
                  ┌────────────────────────────────────────┐
                  │   Telegram (v1) — Grammy adapter       │
                  │   WhatsApp (v2) — Cloud API adapter    │
                  │   Discord (v3) — discord.js adapter    │
                  └────────────────────────────────────────┘
```

### Why Two Bots, One Shared Codebase?

**Shared `lib/bot/` infrastructure** (adapter, router, context, modules, services) — one codebase, zero duplication.

**Two bot instances** — different module sets per bot, different webhook URLs:

| Bot Handle | Modules | Rationale |
|---|---|---|
| `@GSIPersonalAssistantBot` | `homework`, `challenge`, `skills`, `notifications` | Day-to-day studio tools + outbound alerts |
| `@GSIKidCeoAssistantBot` | `ceo` only | Long-running (30-90 day) sim; separate chat keeps it mentally distinct; clean command namespace; independent positioning for parents/schools |

**Feature modules don't care which bot they're in.** Any module implementing `BotFeatureModule` can be registered in any webhook handler. Adding WhatsApp later means registering the `WhatsAppAdapter` — no module code changes.

| Feature Module | Bot Role | Registered In |
|---|---|---|
| **Kid CEO Sim** | Deliver business events, capture decisions, show feedback | `@GSIKidCeoAssistantBot` |
| **Homework** | Receive forwarded homework, create interactive sessions, voice recitation | `@GSIPersonalAssistantBot` |
| **Beat the AI** | Quick challenge rounds via chat | `@GSIPersonalAssistantBot` |
| **Skill Arena** | Voice-based speaking assessments | `@GSIPersonalAssistantBot` |
| **Creation Alerts** | "Your story is ready!" notifications | `@GSIPersonalAssistantBot` |
| **Parent Updates** | Weekly progress summaries (Phase 2 — WhatsApp via adapter) | `@GSIPersonalAssistantBot` |

---

## 2. ARCHITECTURE

### 2.1 Messenger Adapter Interface

Every platform implements this interface. Feature modules never touch platform APIs directly.

```typescript
// lib/bot/types.ts

/** Normalized incoming message from any platform */
interface BotIncomingMessage {
  platform: 'telegram' | 'whatsapp' | 'discord';
  chatId: string;               // platform-specific chat/conversation ID
  userId: string;               // platform-specific user ID
  messageId: string;            // for editing/replying
  type: 'text' | 'command' | 'callback' | 'voice' | 'document' | 'photo' | 'forward';
  text?: string;                // text content or command args
  command?: string;             // '/start', '/homework', '/ceo'
  callbackData?: string;        // button tap data
  voiceUrl?: string;            // voice message audio URL
  documentUrl?: string;         // forwarded document URL
  documentMimeType?: string;    // PDF, image, etc.
  forwardedFrom?: string;       // original sender (for homework forwarding)
  replyToMessageId?: string;    // if replying to a specific message
  timestamp: Date;
  raw: unknown;                 // original platform object for edge cases
}

/** Normalized outgoing message to any platform */
interface BotOutgoingMessage {
  chatId: string;
  text: string;
  parseMode?: 'markdown' | 'html' | 'plain';
  buttons?: BotButton[][];       // rows of buttons
  editMessageId?: string;        // edit existing message
  replyToMessageId?: string;
  image?: { url: string; caption?: string };
  audio?: { url: string; caption?: string };
  document?: { url: string; filename: string };
}

interface BotButton {
  text: string;
  callbackData: string;         // returned when tapped
}

/** Platform adapter interface — one per messenger */
interface MessengerAdapter {
  platform: 'telegram' | 'whatsapp' | 'discord';
  
  /** Initialize the adapter (set up webhook handlers) */
  init(): Promise<void>;
  
  /** Send a message */
  send(message: BotOutgoingMessage): Promise<string>;  // returns messageId
  
  /** Handle incoming webhook payload → normalized BotIncomingMessage */
  parseWebhook(body: unknown, headers: Record<string, string>): BotIncomingMessage | null;
  
  /** Verify webhook signature */
  verifySignature(body: string, headers: Record<string, string>): boolean;
  
  /** Send typing/recording indicator */
  sendTyping(chatId: string): Promise<void>;
  
  /** Get a voice message as audio buffer (for STT) */
  downloadVoice(voiceUrl: string): Promise<Buffer>;
  
  /** Platform-specific: set up webhook URL */
  registerWebhook(url: string): Promise<void>;
}
```

### 2.2 Feature Module Interface

Each feature (CEO, Homework, etc.) is a self-contained module. The router dispatches to the right one.

```typescript
// lib/bot/types.ts (continued)

/** Feature module — handles one domain of bot functionality */
interface BotFeatureModule {
  /** Unique module ID */
  id: string;  // 'ceo', 'homework', 'beat-the-ai', etc.
  
  /** Commands this module handles */
  commands: string[];  // ['/ceo', '/mybusiness', '/ceoprofile']
  
  /** Callback data prefixes this module owns */
  callbackPrefixes: string[];  // ['ceo:', 'ceochoice:']
  
  /** Can this module handle a forwarded message? */
  canHandleForward?(message: BotIncomingMessage): boolean;
  
  /** Can this module handle a voice message? */
  canHandleVoice?(message: BotIncomingMessage): boolean;
  
  /** Process an incoming message */
  handle(
    message: BotIncomingMessage,
    send: (msg: BotOutgoingMessage) => Promise<string>,
    context: BotContext
  ): Promise<void>;
}

/** Shared context available to all modules */
interface BotContext {
  /** Firestore-linked session for this chat */
  session: ChatSession;
  
  /** Get or create GSI-AI-STUDIO session ID from platform chat */
  getGsiSessionId(): Promise<string>;
  
  /** Get kid profile if authenticated (Phase 2) */
  getKidProfile(): Promise<KidProfile | null>;
  
  /** AI generation (reuses GSI pipeline) */
  generateText(systemPrompt: string, userPrompt: string): Promise<string>;
  
  /** Speech-to-text for voice messages */
  transcribeVoice(audioBuffer: Buffer): Promise<string>;
}

/** Per-chat session stored in Firestore */
interface ChatSession {
  chatId: string;
  platform: 'telegram' | 'whatsapp' | 'discord';
  gsiSessionId: string;           // links to GSI-AI-STUDIO session
  userId?: string;                 // Phase 2: Firebase Auth UID
  kidId?: string;                  // Phase 2: active kid profile
  activeModule?: string;           // which module is "active" in this chat
  moduleState?: Record<string, unknown>;  // module-specific state
  createdAt: Date;
  lastActiveAt: Date;
}
```

### 2.3 Router (The Brain)

```typescript
// lib/bot/router.ts

class BotRouter {
  private modules: Map<string, BotFeatureModule> = new Map();
  private adapters: Map<string, MessengerAdapter> = new Map();
  
  registerModule(module: BotFeatureModule) {
    this.modules.set(module.id, module);
  }
  
  registerAdapter(adapter: MessengerAdapter) {
    this.adapters.set(adapter.platform, adapter);
  }
  
  async route(message: BotIncomingMessage): Promise<void> {
    const adapter = this.adapters.get(message.platform)!;
    const send = (msg: BotOutgoingMessage) => adapter.send({ ...msg, chatId: message.chatId });
    const context = await this.buildContext(message);
    
    // 1. Command routing — exact match
    if (message.type === 'command' && message.command) {
      for (const [, module] of this.modules) {
        if (module.commands.includes(message.command)) {
          context.session.activeModule = module.id;
          await this.saveSession(context.session);
          return module.handle(message, send, context);
        }
      }
      // Unknown command
      return send({ chatId: message.chatId, text: this.buildHelpMessage() });
    }
    
    // 2. Callback routing — prefix match
    if (message.type === 'callback' && message.callbackData) {
      for (const [, module] of this.modules) {
        if (module.callbackPrefixes.some(p => message.callbackData!.startsWith(p))) {
          return module.handle(message, send, context);
        }
      }
    }
    
    // 3. Forward routing — ask each module
    if (message.type === 'forward') {
      for (const [, module] of this.modules) {
        if (module.canHandleForward?.(message)) {
          context.session.activeModule = module.id;
          await this.saveSession(context.session);
          return module.handle(message, send, context);
        }
      }
    }
    
    // 4. Voice routing — ask each module
    if (message.type === 'voice') {
      for (const [, module] of this.modules) {
        if (module.canHandleVoice?.(message)) {
          return module.handle(message, send, context);
        }
      }
    }
    
    // 5. Fall through to active module (conversational context)
    if (context.session.activeModule) {
      const activeModule = this.modules.get(context.session.activeModule);
      if (activeModule) {
        return activeModule.handle(message, send, context);
      }
    }
    
    // 6. No match — show help
    return send({ chatId: message.chatId, text: this.buildHelpMessage() });
  }
  
  private buildHelpMessage(): string {
    return (
      '🎓 *GSI AI Studio Bot*\n\n' +
      'Here\'s what I can do:\n\n' +
      '🏪 /ceo — Start a business simulation\n' +
      '📚 /homework — Forward homework to make it interactive\n' +
      '🤖 /challenge — Quick AI challenge\n' +
      '🧠 /skills — Test your skills\n' +
      '📊 /profile — See your progress\n\n' +
      '_Forward any homework image or document to get started!_'
    );
  }
}
```

---

## 3. DEPLOYMENT: NETLIFY FUNCTIONS (WEBHOOK MODE)

### Why Webhook, Not Polling

- SimPrenuer uses `bot.start()` (long-polling) — requires always-on server
- GSI-AI-STUDIO runs on Netlify (serverless) — no persistent process
- **Webhook mode**: Telegram sends HTTP POST → Netlify Function handles → responds
- Stateless, scales automatically, costs nothing idle

### Webhook Endpoints

Two webhook handlers — one per bot instance, each registering its own module set.

```
netlify/functions/
├── telegram-webhook-studio.ts   # POST /.netlify/functions/telegram-webhook-studio → @GSIPersonalAssistantBot
├── telegram-webhook-ceo.ts      # POST /.netlify/functions/telegram-webhook-ceo    → @GSIKidCeoAssistantBot
├── whatsapp-webhook.ts          # Phase 2 — same pattern, wired when Meta Business approval lands
└── bot-setup.ts                 # One-time: registers webhook URLs with both bots via BotFather API
```

### Telegram Webhook Function — `@GSIKidCeoAssistantBot`

```typescript
// netlify/functions/telegram-webhook-ceo.ts
import type { Handler } from '@netlify/functions';
import { BotRouter } from '../../lib/bot/router';
import { TelegramAdapter } from '../../lib/bot/adapters/telegram';
import { ceoModule } from '../../lib/bot/modules/ceo';

const telegram = new TelegramAdapter(process.env.TELEGRAM_BOT_TOKEN_CEO!);
const router = new BotRouter();
router.registerAdapter(telegram);
router.registerModule(ceoModule);  // CEO module ONLY

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST' || !event.body) {
    return { statusCode: 400, body: 'Bad request' };
  }

  if (!telegram.verifySignature(event.body, event.headers as Record<string, string>)) {
    return { statusCode: 401, body: 'Invalid signature' };
  }

  const message = telegram.parseWebhook(JSON.parse(event.body), event.headers as Record<string, string>);
  if (!message) {
    return { statusCode: 200, body: 'OK — no actionable message' };
  }

  await router.route(message);
  return { statusCode: 200, body: 'OK' };
};

export { handler };
```

### Telegram Webhook Function — `@GSIPersonalAssistantBot`

```typescript
// netlify/functions/telegram-webhook-studio.ts
import type { Handler } from '@netlify/functions';
import { BotRouter } from '../../lib/bot/router';
import { TelegramAdapter } from '../../lib/bot/adapters/telegram';
import { homeworkModule } from '../../lib/bot/modules/homework';
import { challengeModule } from '../../lib/bot/modules/challenge';
import { skillsModule } from '../../lib/bot/modules/skills';
import { notificationsModule } from '../../lib/bot/modules/notifications';

const telegram = new TelegramAdapter(process.env.TELEGRAM_BOT_TOKEN_STUDIO!);
const router = new BotRouter();
router.registerAdapter(telegram);
router.registerModule(homeworkModule);
router.registerModule(challengeModule);
router.registerModule(skillsModule);
router.registerModule(notificationsModule);
// ceoModule is NOT registered here

const handler: Handler = async (event) => {
  // ... same pattern as above
};

export { handler };
```

Both functions share the same `BotRouter` class, the same `TelegramAdapter`, the same module interface — only the registered module set differs.

### 3.1 Auth Binding — Linking a Bot Chat to a Web Session

The bot needs to know: which GSI web session / Firebase Phone Auth user / kid profile does this Telegram `chatId` belong to? Solved via a short-lived link token in Firestore.

**Primary flow — Telegram deep link:**

```
Web app (signed in)                    Telegram                    Bot webhook
      │                                   │                           │
  [Connect Telegram]                      │                           │
      │                                   │                           │
      │  POST /api/bot/link/create        │                           │
      │  { botHandle: 'GSIKidCeoAssistantBot' }    │                           │
      │──────────────────────────────────▶│                           │
      │  server writes botLinkCodes/{token} with:                     │
      │    { gsiSessionId, userId, kidId, botHandle, expiresAt: now+10m, used: false }│
      │  returns deep link:                                           │
      │  https://t.me/GSIKidCeoAssistantBot?start=link_<token>                │
      │◀──────────────────────────────────│                           │
      │                                   │                           │
  kid taps link                           │                           │
      │──────────────────────────────────▶│                           │
      │                              /start link_<token>              │
      │                                   │──────────────────────────▶│
      │                                   │                           │
      │                                   │                    [validate token]
      │                                   │                    • exists? not used? not expired?
      │                                   │                    • botHandle matches THIS bot?
      │                                   │                    ↓
      │                                   │                    write botSessions/{chatId}:
      │                                   │                      { gsiSessionId, userId, kidId,
      │                                   │                        platform: 'telegram', botHandle,
      │                                   │                        linkedAt: now }
      │                                   │                    mark botLinkCodes/{token}.used = true
      │                                   │                    ↓
      │                                   │◀──────────────────────────│
      │                                   │  "✅ Connected! Let's start your business."
```

**Fallback flow — 6-digit `/link <code>`:** same `botLinkCodes` collection, same validation. Used when a kid opens the bot manually (no deep link). Web app shows the code; kid types `/link 823914` in the bot.

**Anonymous fallback:** if the kid hasn't completed Firebase Phone Auth yet, the bot still works on the anonymous `gsi-session-id` (existing pattern). `botSessions.userId` and `botSessions.kidId` are left `null`, and linking to an authenticated user happens as an upgrade step later.

**Security properties:**
- Tokens are 32-byte hex, generated via `crypto.randomBytes(16).toString('hex')`
- Single-use: marked `used: true` on first redemption
- Short TTL: 10 minutes from creation
- Bot-scoped: a `@GSIKidCeoAssistantBot` token cannot be redeemed in `@GSIPersonalAssistantBot` (prevents confused-deputy)
- Server-write-only collection — clients never write `botLinkCodes` directly

### WhatsApp Webhook Function (same pattern)

```typescript
// netlify/functions/whatsapp-webhook.ts
import type { Handler } from '@netlify/functions';
import { createRouter } from '../../lib/bot/setup';
import { WhatsAppAdapter } from '../../lib/bot/adapters/whatsapp';

const router = createRouter();
const whatsapp = new WhatsAppAdapter(process.env.WHATSAPP_TOKEN!, process.env.WHATSAPP_VERIFY_TOKEN!);

const handler: Handler = async (event) => {
  // WhatsApp verification challenge (GET request)
  if (event.httpMethod === 'GET') {
    const params = event.queryStringParameters || {};
    if (params['hub.mode'] === 'subscribe' && params['hub.verify_token'] === process.env.WHATSAPP_VERIFY_TOKEN) {
      return { statusCode: 200, body: params['hub.challenge'] || '' };
    }
    return { statusCode: 403, body: 'Forbidden' };
  }
  
  if (event.httpMethod !== 'POST' || !event.body) {
    return { statusCode: 400, body: 'Bad request' };
  }
  
  if (!whatsapp.verifySignature(event.body, event.headers as Record<string, string>)) {
    return { statusCode: 401, body: 'Invalid signature' };
  }
  
  const message = whatsapp.parseWebhook(JSON.parse(event.body), event.headers as Record<string, string>);
  if (!message) {
    return { statusCode: 200, body: 'OK' };
  }
  
  await router.route(message);
  
  return { statusCode: 200, body: 'OK' };
};

export { handler };
```

---

## 4. FEATURE MODULE: CEO SIMULATION

Port of FoundersDNA bot.js → clean feature module.

```typescript
// lib/bot/modules/ceo.ts

import { BotFeatureModule, BotIncomingMessage, BotOutgoingMessage, BotContext } from '../types';
import { generateEvent, scoreDecision } from '../../ceo/engines';
import { getCeoBusiness, createCeoBusiness, saveCeoDecision, updateBusinessState } from '../../firebase/ceoService';

export const ceoModule: BotFeatureModule = {
  id: 'ceo',
  commands: ['/ceo', '/mybusiness', '/ceoprofile'],
  callbackPrefixes: ['ceo_choice:', 'ceo_biz:'],
  
  async handle(message, send, context) {
    // --- Command: /ceo ---
    if (message.type === 'command' && message.command === '/ceo') {
      const sessionId = await context.getGsiSessionId();
      const existing = await getCeoBusiness(sessionId);
      
      if (existing && existing.status === 'active') {
        // Resume existing business
        await this.sendNextEvent(existing, send, context);
      } else {
        // Start new business — show business type picker
        await send({
          chatId: message.chatId,
          text: '🏪 *Start Your Business!*\n\nPick a business type:',
          parseMode: 'markdown',
          buttons: [
            [{ text: '🍋 Lemonade Stand', callbackData: 'ceo_biz:lemonade' },
             { text: '🍦 Ice Cream Shop', callbackData: 'ceo_biz:icecream' }],
            [{ text: '👕 T-Shirt Shop', callbackData: 'ceo_biz:tshirt' },
             { text: '🎮 Game Studio', callbackData: 'ceo_biz:games' }],
            [{ text: '🎨 Craft Shop', callbackData: 'ceo_biz:crafts' },
             { text: '📰 School Blog', callbackData: 'ceo_biz:blog' }],
            [{ text: '💡 My Own Idea', callbackData: 'ceo_biz:custom' }],
          ],
        });
      }
      return;
    }
    
    // --- Callback: business type selection ---
    if (message.callbackData?.startsWith('ceo_biz:')) {
      const bizType = message.callbackData.split(':')[1];
      const sessionId = await context.getGsiSessionId();
      const business = await createCeoBusiness(sessionId, bizType);
      
      await send({
        chatId: message.chatId,
        text: `✅ *${business.businessName}* is registered!\n\n` +
              `💰 Starting money: ₹${business.startingCapital.toLocaleString()}\n` +
              `📍 Phase: Getting Ready\n\n` +
              `Your first business decision is coming...\n`,
        parseMode: 'markdown',
      });
      
      // Fire first event
      await this.sendNextEvent(business, send, context);
      return;
    }
    
    // --- Callback: decision on an event ---
    if (message.callbackData?.startsWith('ceo_choice:')) {
      const [, eventId, choiceIdx] = message.callbackData.split(':');
      await this.handleDecision(eventId, parseInt(choiceIdx), message, send, context);
      return;
    }
    
    // --- Command: /mybusiness ---
    if (message.type === 'command' && message.command === '/mybusiness') {
      const sessionId = await context.getGsiSessionId();
      const biz = await getCeoBusiness(sessionId);
      if (!biz) {
        return send({ chatId: message.chatId, text: 'No active business. Use /ceo to start!' });
      }
      return send({
        chatId: message.chatId,
        text: `🏪 *${biz.businessName}*\n\n` +
              `💰 Cash: ₹${biz.currentCash.toLocaleString()}\n` +
              `⭐ Reputation: ${biz.reputation}/100\n` +
              `😊 Morale: ${biz.morale}/100\n` +
              `📍 Phase: ${biz.phase}\n` +
              `📊 Decisions: ${biz.totalDecisions}`,
        parseMode: 'markdown',
      });
    }
    
    // --- Command: /ceoprofile ---
    if (message.type === 'command' && message.command === '/ceoprofile') {
      // Send profile card link (web app renders it)
      const sessionId = await context.getGsiSessionId();
      const profileUrl = `${process.env.NEXT_PUBLIC_URL}/ceo/profile?s=${sessionId}`;
      return send({
        chatId: message.chatId,
        text: `📊 *Your CEO Profile*\n\nView your full profile and share your CEO Card:\n${profileUrl}`,
        parseMode: 'markdown',
      });
    }
  },
  
  // ... sendNextEvent and handleDecision methods
};
```

---

## 5. FEATURE MODULE: HOMEWORK

This is the key new module. School sends homework via channel → parent/kid forwards to bot → bot creates interactive session.

### v1 design decisions (shipped)

The original design for this module (in the flow + module-template below) was the aspirational spec. v1 ships a scoped subset with the following deliberate choices:

| # | Decision | Rationale |
|---|---|---|
| 1 | **Telegram only** | `@GSIPersonalAssistantBot`. WhatsApp via `MessengerAdapter` interface later (Meta approval timeline). |
| 2 | **English + Hindi** | Language detected per forward (session-level) with optional per-question override (`HomeworkQuestion.language`). TTS + Whisper voice selection follows `HomeworkSession.language`. |
| 3 | **"Is this homework?" classifier before parse** | After OCR/STT, a cheap LLM classifier returns `{ isHomework: boolean, reason }`. On `no`, the bot replies with a confirm-to-continue prompt instead of hallucinating questions from random forwards. |
| 4 | **Reveal answer + worked explanation after 3 failed attempts** | Quiz loop tracks `HomeworkAnswer.attempts`; at 3, the answer is revealed, `revealed` flips to `true`, and the session `revealedQuestionIds` list grows by that qId. Revealed questions contribute 0 to the mastery score but still earn reduced AI Points. |
| 5 | **Half math scope** | Arithmetic, word problems, and text-expressible equations shipped. `HomeworkQuestion.meta.steps[]` is populated for multi-step scaffolding. `meta.latex` and `meta.diagramUrl` are reserved in the schema but NOT populated in v1 — v1.1 adds Mathpix equation OCR + KaTeX web rendering + diagram handling. |
| 6 | **"I'm stuck" / "Explain first" escape hatches** | New callbacks: `hw_explain:<sessionId>:<qId>` (teach me before I try — never penalised) and `hw_skip:<sessionId>:<qId>` (come back later — session persists). `hw_continue:<sessionId>` resumes an in-progress session from the help menu. |
| 7 | **Parent surface: weekly digest + on-demand transcript** | Scheduled function (Sunday evening IST) sends a Telegram DM summary per linked kid. Web app exposes `/homework/history` for full transcripts as a trust lever. |
| 8 | **School/teacher anchor on day 1** | `homeworkSessions.schoolId` + `sourceChannelId` shipped as nullable fields. v1 populates `sourceChannelId` from `forward_from_chat.id` when present; `schoolId` stays null until the Phase 3 school-channel registry exists. |
| 9 | **Rewards integration** | Completing a homework session = `complete_homework` points action → AI Points (scaled by score, revealed questions weighted 0.3×) + Homework Hero badge family (Bronze/Silver/Gold on 1/5/15 sessions) + daily streak counter on `sessions.homeworkStats`. |
| 10 | **Recitation scoring = WER + LLM encouragement** | Numeric accuracy comes from word-level alignment against `recitationText` (cheap, deterministic); the LLM only writes the warm encouragement + one concrete tip. |

See `docs/data-model.md` §homeworkSessions for the full updated schema, and `docs/api-contracts.md` §Homework for the web-facing endpoints (history + digest). Rate limits and retention live in `docs/security.md` §Telegram Bot Safety.

### Original flow (design intent preserved for reference)

### Flow

```
School Telegram Channel
        │
        │ teacher posts homework
        │ (text, image, PDF, voice note)
        ↓
Parent/Kid forwards message to GSI Bot
        │
        ↓
Bot detects forward → Homework Module activates
        │
        ├── Text homework → LLM parses questions/topics
        ├── Image/PDF → OCR (Google Vision / Tesseract) → LLM parses
        ├── Voice note → STT transcription → LLM parses
        │
        ↓
LLM creates interactive session:
        │
        ├── Quiz mode: questions one-by-one with hints
        ├── Recitation mode: kid reads aloud → voice compared
        ├── Explain mode: kid explains concept → AI evaluates
        ├── Practice mode: similar problems generated
        │
        ↓
Kid interacts via:
        ├── Text replies (answers)
        ├── Voice messages (recitation / speaking)
        ├── Button taps (multiple choice)
        │
        ↓
Completion → Score + feedback saved to Firestore
        │
        ↓
Parent gets summary (in-app or WhatsApp)
```

### Module Implementation

```typescript
// lib/bot/modules/homework.ts

export const homeworkModule: BotFeatureModule = {
  id: 'homework',
  commands: ['/homework'],
  callbackPrefixes: ['hw_mode:', 'hw_ans:', 'hw_next:', 'hw_hint:'],
  
  // Detect forwarded messages that look like homework
  canHandleForward(message) {
    // Accept any forwarded text, document, image, or voice
    return true;
  },
  
  // Accept voice messages when homework session is active
  canHandleVoice(message) {
    return true;  // Router checks activeModule before calling this
  },
  
  async handle(message, send, context) {
    
    // --- Forwarded message: parse as homework ---
    if (message.type === 'forward') {
      await send({ chatId: message.chatId, text: '📚 Analysing homework...' });
      await context.send({ chatId: message.chatId, text: '' }); // typing indicator
      
      let homeworkText = '';
      
      if (message.text) {
        // Plain text homework
        homeworkText = message.text;
      } else if (message.documentUrl) {
        // PDF or image — OCR it
        homeworkText = await this.extractFromDocument(message.documentUrl, message.documentMimeType);
      } else if (message.voiceUrl) {
        // Voice homework instruction — transcribe
        const audio = await context.downloadVoice(message.voiceUrl);
        homeworkText = await context.transcribeVoice(audio);
      }
      
      if (!homeworkText) {
        return send({
          chatId: message.chatId,
          text: '❌ Could not read the homework. Try forwarding it as text or a clear photo.',
        });
      }
      
      // LLM parses homework into structured session
      const session = await this.parseHomework(homeworkText, context);
      
      // Save to Firestore
      await this.saveHomeworkSession(context, session);
      
      // Ask which mode
      await send({
        chatId: message.chatId,
        text: `📚 *Homework detected!*\n\n` +
              `Subject: ${session.subject}\n` +
              `Questions: ${session.totalQuestions}\n\n` +
              `How do you want to practice?`,
        parseMode: 'markdown',
        buttons: [
          [{ text: '📝 Quiz Me', callbackData: `hw_mode:quiz:${session.id}` }],
          [{ text: '🗣 Read Aloud', callbackData: `hw_mode:recite:${session.id}` }],
          [{ text: '💡 Explain It', callbackData: `hw_mode:explain:${session.id}` }],
          [{ text: '🔄 More Practice', callbackData: `hw_mode:practice:${session.id}` }],
        ],
      });
      return;
    }
    
    // --- Voice message during recitation mode ---
    if (message.type === 'voice') {
      const audio = await context.downloadVoice(message.voiceUrl!);
      const transcript = await context.transcribeVoice(audio);
      await this.evaluateRecitation(transcript, message, send, context);
      return;
    }
    
    // --- Text answer during quiz mode ---
    if (message.type === 'text' && context.session.activeModule === 'homework') {
      await this.evaluateAnswer(message.text!, message, send, context);
      return;
    }
    
    // --- Callback buttons ---
    if (message.callbackData?.startsWith('hw_mode:')) {
      const [, mode, sessionId] = message.callbackData.split(':');
      await this.startMode(mode, sessionId, send, context);
      return;
    }
    
    if (message.callbackData?.startsWith('hw_hint:')) {
      await this.showHint(message, send, context);
      return;
    }
    
    if (message.callbackData?.startsWith('hw_next:')) {
      await this.nextQuestion(message, send, context);
      return;
    }
  },
  
  // --- Internal methods ---
  
  async parseHomework(text: string, context: BotContext) {
    const systemPrompt = `You are a homework parser for Indian school children (ages 8-17).
    
Given homework text, extract:
1. Subject (math, english, science, hindi, social studies, etc.)
2. Grade level estimate (class 1-12)
3. Individual questions or tasks
4. For each question: the text, expected answer type (text, number, recitation, diagram), 
   a hint, and the correct answer if determinable

Return JSON:
{
  "subject": "string",
  "gradeEstimate": number,
  "totalQuestions": number,
  "questions": [
    {
      "id": 1,
      "text": "question text",
      "type": "multiple_choice | short_answer | recitation | explanation | calculation",
      "options": ["a", "b", "c", "d"] | null,
      "correctAnswer": "string or null if open-ended",
      "hint": "helpful hint",
      "recitationText": "text to read aloud (for recitation type)" | null,
      "similarPractice": "a similar extra problem for practice"
    }
  ]
}`;
    
    const result = await context.generateText(systemPrompt, text);
    return JSON.parse(result);
  },
  
  async evaluateRecitation(transcript: string, message, send, context) {
    const state = context.session.moduleState as HomeworkState;
    const currentQ = state.questions[state.currentIndex];
    
    const systemPrompt = `You are evaluating a child's read-aloud recitation.

Expected text: "${currentQ.recitationText}"
Child said: "${transcript}"

Evaluate:
1. accuracy (0-100): how closely they matched the text
2. pronunciation_notes: specific words they struggled with
3. encouragement: a kind, specific comment about what they did well
4. tip: one concrete tip to improve

Be warm and encouraging. This is a child, not an exam.
Return JSON: { accuracy, pronunciation_notes, encouragement, tip }`;

    const evaluation = await context.generateText(systemPrompt, transcript);
    const result = JSON.parse(evaluation);
    
    const emoji = result.accuracy >= 80 ? '🌟' : result.accuracy >= 60 ? '👍' : '💪';
    
    await send({
      chatId: message.chatId,
      text: `${emoji} *Recitation Score: ${result.accuracy}%*\n\n` +
            `${result.encouragement}\n\n` +
            (result.pronunciation_notes ? `📝 Watch out for: ${result.pronunciation_notes}\n\n` : '') +
            `💡 Tip: ${result.tip}`,
      parseMode: 'markdown',
      buttons: [
        [{ text: '🔄 Try Again', callbackData: `hw_next:${state.currentIndex}` },
         { text: '➡️ Next', callbackData: `hw_next:${state.currentIndex + 1}` }],
      ],
    });
  },
};
```

---

## 6. VOICE AGENT INTEGRATION

### For Homework Recitation

The bot needs speech-to-text for:
1. **Recitation evaluation** — kid reads passage aloud via voice message
2. **Speaking practice** — kid explains a concept
3. **Dictation** — bot reads (TTS), kid writes, bot checks

### STT Options (server-side)

| Provider | Cost | Quality | Integration |
|---|---|---|---|
| **Groq Whisper** (whisper-large-v3) | Free tier | Excellent | Already have Groq client |
| **Google Cloud STT** | $0.006/15s | Excellent | Already use Google GenAI |
| **Deepgram** | Free tier | Good | REST API |
| Web Speech API | Free | Varies | Client-only (for web app) |

**Recommendation:** Groq Whisper — you already have the Groq API key and client. Zero additional cost.

### TTS Options (for bot reading to kid)

| Provider | Use Case |
|---|---|
| **Google Cloud TTS** | Hindi + English, natural voices |
| **ElevenLabs** | Most natural, higher cost |
| **Edge TTS** | Free, Microsoft voices, good quality |
| Telegram voice message | Bot sends audio file |

### Voice Flow (Recitation)

```
Bot sends text to read:
  "Read this aloud and send me a voice message: 
   'The quick brown fox jumps over the lazy dog.'"
        ↓
Kid records voice message in Telegram/WhatsApp
        ↓
Webhook receives voice message
        ↓
Adapter downloads audio file
        ↓
Groq Whisper transcribes → text
        ↓
LLM compares transcript vs expected text
  → Accuracy score
  → Pronunciation notes
  → Encouragement + tip
        ↓
Bot sends feedback + "Try Again" / "Next" buttons
```

---

## 7. FIRESTORE SCHEMA (NEW COLLECTIONS)

### Bot Sessions
```
botSessions/{chatId}
├── chatId: string
├── platform: 'telegram' | 'whatsapp'
├── botHandle: string ('GSIPersonalAssistantBot' | 'GSIKidCeoAssistantBot')
├── gsiSessionId: string (links to existing sessions collection)
├── userId: string | null (Firebase Phone Auth UID, Phase 2)
├── kidId: string | null (top-level kid profile ID, Phase 2)
├── activeModule: string | null ('ceo' | 'homework' | null)
├── moduleState: map (module-specific state)
├── linkedAt: timestamp | null (when auth binding completed)
├── createdAt: timestamp
└── lastActiveAt: timestamp
```

### Bot Link Codes (Auth Binding)
```
botLinkCodes/{token}
├── token: string (32-byte hex, doc ID)
├── gsiSessionId: string
├── userId: string | null (nullable if anonymous link)
├── kidId: string | null
├── botHandle: string ('GSIPersonalAssistantBot' | 'GSIKidCeoAssistantBot')
├── used: boolean (flipped true on first redemption)
├── usedByChatId: string | null (audit — which chat redeemed it)
├── expiresAt: timestamp (createdAt + 10 minutes)
└── createdAt: timestamp
```

Server-side TTL policy deletes expired tokens after 24 hours (Firestore TTL field on `expiresAt`).

### Homework Sessions
```
homeworkSessions/{id}
├── id: string (auto)
├── sessionId: string (→ botSessions)
├── gsiSessionId: string (→ sessions)
├── kidId: string | null
├── platform: string
├── subject: string
├── gradeEstimate: number
├── originalText: string
├── totalQuestions: number
├── questions: array [
│     { id, text, type, options, correctAnswer, hint, recitationText, similarPractice }
│   ]
├── progress: map {
│     currentIndex: number,
│     answers: [{ questionId, answer, correct, score, attempts }],
│     mode: 'quiz' | 'recite' | 'explain' | 'practice',
│     startedAt: timestamp,
│     completedAt: timestamp | null
│   }
├── score: number (overall %)
├── createdAt: timestamp
└── updatedAt: timestamp
```

### (CEO collections from GSI_INTEGRATION_PLAN.md also live here)

---

## 8. FILE STRUCTURE IN GSI-AI-STUDIO

```
lib/bot/
├── types.ts                        # All interfaces (adapter, module, context, session)
├── router.ts                       # BotRouter — dispatches messages to modules (instantiated per webhook)
├── context.ts                      # BotContext builder (Firestore session, AI pipeline)
├── adapters/
│   ├── telegram.ts                 # TelegramAdapter (Grammy, webhook mode)
│   ├── whatsapp.ts                 # WhatsAppAdapter (Cloud API) — Phase 2
│   └── discord.ts                  # Phase 3
├── modules/
│   ├── ceo.ts                      # Kid CEO simulation module (FoundersDNA port) — @GSIKidCeoAssistantBot only
│   ├── homework.ts                 # Homework module (forward → interactive) — @GSIPersonalAssistantBot
│   ├── challenge.ts                # Beat the AI via bot (reuses existing engine) — @GSIPersonalAssistantBot
│   ├── skills.ts                   # Skill Arena via bot (reuses existing engine) — @GSIPersonalAssistantBot
│   └── notifications.ts            # Outbound: creation alerts, parent summaries — @GSIPersonalAssistantBot
├── services/
│   ├── stt.ts                      # Speech-to-text (Groq Whisper)
│   ├── tts.ts                      # Text-to-speech (Google Cloud TTS — Hindi + English)
│   ├── ocr.ts                      # Image/PDF → text (Google Vision)
│   ├── linkService.ts              # Auth binding — create + validate botLinkCodes tokens
│   └── sessionStore.ts             # Firestore CRUD for botSessions
└── prompts/
    ├── homeworkParser.ts           # System prompt for parsing homework
    ├── recitationEval.ts           # System prompt for evaluating read-aloud
    ├── quizEval.ts                 # System prompt for evaluating answers
    └── ceoEvent.ts                 # (reuses lib/ceo/prompts/)

netlify/functions/
├── telegram-webhook-studio.ts      # @GSIPersonalAssistantBot webhook (homework · challenge · skills · notifications)
├── telegram-webhook-ceo.ts         # @GSIKidCeoAssistantBot webhook (ceo module only)
├── whatsapp-webhook.ts             # Phase 2 — same router pattern
├── bot-setup.ts                    # One-time: register both bots' webhook URLs via BotFather API
└── linear-webhook.ts               # (existing)

app/api/bot/
└── link/route.ts                   # POST — web app creates a botLinkCodes token for auth binding
```

---

## 9. PLATFORM SETUP

### Telegram Bot — `@GSIKidCeoAssistantBot` (v1 scope)
1. Create via @BotFather → save token as `TELEGRAM_BOT_TOKEN_CEO`
2. Set webhook: `https://gsiaistudio.com/.netlify/functions/telegram-webhook-ceo`
3. Set commands menu: `/ceo`, `/mybusiness`, `/ceoprofile`, `/link`
4. Short description: "Run your first business before you spend a rupee. Kid CEO from GSI AI Studio."

### Telegram Bot — `@GSIPersonalAssistantBot` (ships after Kid CEO)
1. Create via @BotFather → save token as `TELEGRAM_BOT_TOKEN_STUDIO`
2. Set webhook: `https://gsiaistudio.com/.netlify/functions/telegram-webhook-studio`
3. Set commands menu: `/homework`, `/challenge`, `/skills`, `/profile`, `/link`
4. Short description: "Your AI creation buddy — homework help, challenges, and learning games."

### WhatsApp Business (Phase 2 — after Meta Business approval)
1. Create Meta Business account → WhatsApp Business API (approval lead time: days to weeks)
2. Set webhook URL: `https://gsiaistudio.com/.netlify/functions/whatsapp-webhook`
3. Verify webhook with challenge token
4. Configure message templates (required for proactive messages — 24-hour window rule)
5. Activate by registering `WhatsAppAdapter` in the relevant webhook handler(s)

### Environment Variables (add to Netlify)
```
# Kid CEO bot (v1)
TELEGRAM_BOT_TOKEN_CEO=xxx
TELEGRAM_WEBHOOK_SECRET_CEO=xxx

# Studio bot (v1 — homework module ships in later sprint)
TELEGRAM_BOT_TOKEN_STUDIO=xxx
TELEGRAM_WEBHOOK_SECRET_STUDIO=xxx

# WhatsApp (Phase 2, not used in v1)
WHATSAPP_TOKEN=xxx
WHATSAPP_VERIFY_TOKEN=xxx
WHATSAPP_PHONE_NUMBER_ID=xxx

# Shared
GROQ_API_KEY=xxx           # Whisper STT (already exists)
GOOGLE_CLOUD_TTS_KEY=xxx   # Google Cloud TTS (Hindi + English)
```

---

## 10. IMPLEMENTATION ORDER

### Sprint 1: Shared Bot Foundation (1 week)
- [ ] `lib/bot/types.ts` — all interfaces
- [ ] `lib/bot/router.ts` — message routing
- [ ] `lib/bot/adapters/telegram.ts` — Grammy webhook adapter
- [ ] `lib/bot/context.ts` — session management
- [ ] `lib/bot/services/sessionStore.ts` — Firestore CRUD for `botSessions`
- [ ] `lib/bot/services/linkService.ts` — `botLinkCodes` create + validate
- [ ] `app/api/bot/link/route.ts` — web endpoint to mint link tokens
- [ ] `netlify/functions/bot-setup.ts` — register webhooks for both bots

### Sprint 2: Kid CEO Bot (`@GSIKidCeoAssistantBot`) (1 week)
- [ ] Port FoundersDNA engine to `lib/ceo/` (from GSI_INTEGRATION_PLAN.md Phase A)
- [ ] `lib/bot/modules/ceo.ts` — all commands + decision handling
- [ ] `netlify/functions/telegram-webhook-ceo.ts` — webhook handler (ceo module only)
- [ ] Deep-link auth binding (`/start link_<token>`) + `/link <code>` fallback
- [ ] Business registration via bot
- [ ] Event delivery via bot
- [ ] Decision capture + scoring
- [ ] Phase advancement notifications
- [ ] CEO Profile link (to web app)

### Sprint 3: Studio Bot (`@GSIPersonalAssistantBot`) Foundation + Homework (1.5 weeks)
- [ ] `netlify/functions/telegram-webhook-studio.ts` — webhook handler (studio modules)
- [ ] `lib/bot/services/ocr.ts` — image/PDF text extraction (Google Vision)
- [ ] `lib/bot/services/stt.ts` — Groq Whisper integration
- [ ] `lib/bot/services/tts.ts` — Google Cloud TTS (Hindi + English)
- [ ] `lib/bot/prompts/homeworkParser.ts` — homework parsing prompt
- [ ] `lib/bot/modules/homework.ts` — forward detection + mode selection
- [ ] Quiz mode (text Q&A with hints)
- [ ] Recitation mode (voice → STT → evaluation)
- [ ] Practice mode (generate similar problems)
- [ ] Completion summary + score

### Sprint 4: Cross-App Integration + Studio Bot Modules (1 week)
- [ ] `lib/bot/modules/challenge.ts` — Beat the AI via bot (reuse engine)
- [ ] `lib/bot/modules/skills.ts` — Skill Arena via bot (reuse engine)
- [ ] `lib/bot/modules/notifications.ts` — outbound creation alerts
- [ ] AI Points from bot activities
- [ ] Badge unlocks from bot activities
- [ ] E2E tests for both bots

### Sprint 5: WhatsApp Adapter (Phase 2 — after Meta Business approval)
- [ ] `lib/bot/adapters/whatsapp.ts` — WhatsApp Cloud API adapter
- [ ] `netlify/functions/whatsapp-webhook.ts`
- [ ] Template message approval (WhatsApp requirement)
- [ ] Parent notification templates (weekly summaries)
- [ ] Register `WhatsAppAdapter` in studio + CEO webhook handlers

---

## 11. WHY THIS DESIGN SCALES

**Adding a new feature module:**
1. Create `lib/bot/modules/newFeature.ts` implementing `BotFeatureModule`
2. Register commands and callback prefixes
3. Register it in whichever webhook handler should expose it (`telegram-webhook-studio.ts` or `telegram-webhook-ceo.ts`, or a new bot)
4. Done — it inherits every adapter the router has (Telegram now; WhatsApp + Discord later)

**Adding a new bot instance:**
1. Create a new bot via @BotFather, get a token
2. Create `netlify/functions/telegram-webhook-<name>.ts` — same pattern as the existing two, just register the modules you want
3. Register webhook URL via `bot-setup.ts`
4. Done — the new bot shares the same `lib/bot/` infrastructure

**Adding a new messenger platform:**
1. Create `lib/bot/adapters/discord.ts` implementing `MessengerAdapter`
2. Create `netlify/functions/discord-webhook.ts`
3. Register adapter → `router.registerAdapter(discordAdapter)`
4. Done — all registered feature modules work on Discord automatically

**No feature module ever imports Grammy, WhatsApp SDK, or Discord SDK.** They only see `BotIncomingMessage`, `send()`, and `BotContext`. The adapter handles everything platform-specific. Moving a module between bots is a one-line `router.registerModule()` change.
