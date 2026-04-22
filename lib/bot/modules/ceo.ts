/** Kid CEO Telegram module — powers @GSIKidCeoAssistantBot.
 *
 *  Ports the web-app Kid CEO flow into a chat UX:
 *    - /start (optionally with a link token) connects a web session to the chat
 *    - /link <code> is the 6-digit fallback for kids who typed the bot name
 *    - /ceo opens a new business (or resumes the pending event on an existing one)
 *    - /mybusiness shows live status
 *    - /ceoprofile deep-links to the web-app CEO Profile Card
 *    - ceo_biz:/ceo_pace: callbacks create a business
 *    - ceo_choice: callbacks run the full decision loop (score → state →
 *      profile dimensions → milestone/phase → next event → AI Points)
 *
 *  Everything goes through the existing server-side services — this module
 *  is a thin presentation layer, no direct Firestore writes. */

import type {
  BotButton,
  BotContext,
  BotFeatureModule,
  BotIncomingMessage,
  BotOutgoingMessage,
} from '@/lib/bot/types';
import type {
  CeoBusiness,
  CeoBusinessType,
  CeoChoiceId,
  CeoEvent,
  CeoPace,
} from '@/types';
import { AppException } from '@/lib/api-utils';
import {
  redeemBotLinkCode,
  redeemBotLinkToken,
} from '@/lib/firebase/botLinkService';
import { linkBotSession } from '@/lib/bot/services/sessionStore';
import {
  advanceBusinessPhase,
  createCeoBusiness,
  getActiveBusinessForKid,
  getCeoBusiness,
  getCeoEvent,
  getCeoProfileByBusiness,
  getOrCreateCeoProfile,
  getPendingEventForBusiness,
  getRecentEventsForBusiness,
  listBusinessesForKid,
  markMilestoneDelivered,
  recordEventDecision,
  reserveRegularEventSlot,
  saveCeoEvent,
} from '@/lib/firebase/ceoService';
import { timestampToMillis } from '@/lib/utils/timestamps';
import { applyStateChanges } from '@/lib/ceo/businessState';
import { applyScoreAdjustments } from '@/lib/ceo/profileEngine';
import {
  generateMilestoneEvent,
  generateRegularEvent,
} from '@/lib/ceo/eventEngine';
import { scoreDecision } from '@/lib/ceo/scoringEngine';
import { isPhaseComplete, pickNextMilestone } from '@/lib/ceo/phases';
import {
  BUSINESS_TYPE_DEFAULT_NAMES,
  CEO_AI_POINTS,
  DIMENSION_LABELS,
  PHASE_LABELS,
  REGULAR_EVENTS_PER_DAY_CAP,
} from '@/lib/ceo/constants';
import businessesCatalog from '@/lib/ceo/templates/businesses.json';
import { updateKidPoints } from '@/lib/firebase/sessionService';

type Send = (msg: BotOutgoingMessage) => Promise<string>;

interface BusinessCatalogEntry {
  type: CeoBusinessType;
  name: string;
  emoji: string;
  tagline: string;
}

const CATALOG = businessesCatalog as unknown as BusinessCatalogEntry[];
const BOT_HANDLE = 'GSIKidCeoAssistantBot' as const;
const GENERIC_ERROR = 'Something went wrong — try again in a moment!';
/** Mirrors MAX_CONCURRENT_ACTIVE_BUSINESSES in /api/ceo/register. Kept as a
 *  module-level constant rather than re-imported so the bot stays
 *  route-independent. If these drift, the server is source-of-truth —
 *  the kid will just see the 400 error from the register route. */
const CONCURRENT_ACTIVE_CAP = 3;

const BUSINESS_TYPES: readonly CeoBusinessType[] = [
  'lemonade',
  'icecream',
  'tshirt',
  'games',
  'crafts',
  'blog',
  'custom',
];

const PACES: readonly CeoPace[] = ['15', '30', '45'];

// ─── Module export ───────────────────────────────────────────

export const ceoModule: BotFeatureModule = {
  id: 'ceo',
  commands: ['/start', '/ceo', '/mybusiness', '/ceoprofile', '/link', '/help'],
  callbackPrefixes: ['ceo_biz:', 'ceo_choice:', 'ceo_pace:', 'ceo_loc:', 'ceo_resume:'],

  async handle(message, send, context) {
    try {
      if (message.type === 'command') {
        switch (message.command) {
          case '/start':
            return await handleStart(message, send, context);
          case '/link':
            return await handleLink(message, send, context);
          case '/ceo':
            return await handleCeo(message, send, context);
          case '/mybusiness':
            return await handleMyBusiness(message, send, context);
          case '/ceoprofile':
            return await handleCeoProfile(message, send, context);
          case '/help':
            return await handleHelp(message, send);
          default:
            return;
        }
      }

      if (message.type === 'callback' && message.callbackData) {
        const data = message.callbackData;
        if (data.startsWith('ceo_biz:')) {
          return await handleBizPick(data, message, send);
        }
        if (data.startsWith('ceo_pace:')) {
          return await handlePacePick(data, message, send, context);
        }
        if (data.startsWith('ceo_choice:')) {
          return await handleChoice(data, message, send, context);
        }
        if (data.startsWith('ceo_resume:')) {
          return await handleResumePick(data, message, send, context);
        }
      }
    } catch (err) {
      console.error('[ceo module] Unexpected error:', err);
      await send({
        chatId: message.chatId,
        text: err instanceof AppException ? err.message : GENERIC_ERROR,
      });
    }
  },
};

// ─── Command handlers ────────────────────────────────────────

/** /start with optional `link_<token>` deep-link payload.
 *  NOTE: `TelegramAdapter.parseWebhook` strips the command already — `message.text`
 *  is only the args part (e.g. `link_abc123`, not `/start link_abc123`). */
async function handleStart(
  message: BotIncomingMessage,
  send: Send,
  context: BotContext,
): Promise<void> {
  const payload = (message.text ?? '').trim();
  const firstToken = payload.split(/\s+/)[0] ?? '';

  if (firstToken.startsWith('link_')) {
    const token = firstToken.slice('link_'.length);
    try {
      const redeemed = await redeemBotLinkToken({
        token,
        chatId: message.chatId,
        botHandle: BOT_HANDLE,
      });
      await finalizeBotLink(context, redeemed, send, message.chatId);
    } catch (err) {
      await send({
        chatId: message.chatId,
        text: err instanceof AppException ? err.message : GENERIC_ERROR,
      });
    }
    return;
  }

  await send({
    chatId: message.chatId,
    text:
      'Welcome to *Kid CEO*!\n\n' +
      'Type /ceo to start your first business.\n' +
      'Or if the web app gave you a code, type `/link 123456`.',
    parseMode: 'markdown',
  });
}

/** /link <6-digit-code> fallback for kids who did not tap the deep-link.
 *  NOTE: `TelegramAdapter.parseWebhook` strips the command — `message.text`
 *  is only the args part (e.g. `123456`, not `/link 123456`). */
async function handleLink(
  message: BotIncomingMessage,
  send: Send,
  context: BotContext,
): Promise<void> {
  const code = (message.text ?? '').trim();

  if (!/^\d{6}$/.test(code)) {
    await send({
      chatId: message.chatId,
      text: 'Please send a 6-digit code from the web app. For example: `/link 123456`.',
      parseMode: 'markdown',
    });
    return;
  }

  try {
    const redeemed = await redeemBotLinkCode({
      code,
      chatId: message.chatId,
      botHandle: BOT_HANDLE,
    });
    await finalizeBotLink(context, redeemed, send, message.chatId);
  } catch (err) {
    await send({
      chatId: message.chatId,
      text: err instanceof AppException ? err.message : GENERIC_ERROR,
    });
  }
}

/** Shared tail of both link flows.
 *
 *  1. Migrates any pre-existing CEO data (businesses, events, profiles)
 *     from the chat's current anonymous session into the target web session.
 *     Without this step, a business the kid started inside the bot would be
 *     stranded on an abandoned session and never appear in the web `/ceo`
 *     landing list. `migrateSessionBusinesses` is a no-op when the two
 *     sessions already match.
 *  2. Rewrites `botSessions.gsiSessionId` to the target.
 *  3. Sends the Connected! confirmation.
 *
 *  Kept as a single helper so `/start link_...` and `/link <code>` produce
 *  identical behavior. */
async function finalizeBotLink(
  _context: BotContext,
  redeemed: {
    gsiSessionId: string;
    userId: string | null;
    kidId: string | null;
    businessId?: string | null;
  },
  send: Send,
  chatId: string,
): Promise<void> {
  // Kid CEO is authenticated-only — redeemed tokens must carry both userId
  // and kidId. A token minted for an anonymous web caller (shouldn't happen
  // after the Phase-2 refactor, but defensive) is rejected here.
  if (!redeemed.userId || !redeemed.kidId) {
    await send({
      chatId,
      text: 'Please sign in on the web app and pick a kid profile before connecting Telegram.',
      parseMode: 'markdown',
    });
    return;
  }

  await linkBotSession({
    chatId,
    gsiSessionId: redeemed.gsiSessionId,
    userId: redeemed.userId,
    kidId: redeemed.kidId,
  });

  // If the link carried a specific businessId ("Continue on Telegram" on a
  // particular business's play page), jump straight into that business's
  // pending event. Otherwise show the generic Connected! welcome.
  if (redeemed.businessId) {
    try {
      await resumeSpecificBusiness({
        chatId,
        businessId: redeemed.businessId,
        kidId: redeemed.kidId,
        send,
      });
      return;
    } catch (err) {
      // Falls through to the generic confirmation if the jump fails — at
      // minimum the chat is still linked.
      console.error(
        '[ceo module] resumeSpecificBusiness failed:',
        (err as Error).message,
      );
    }
  }

  await send({
    chatId,
    text: 'Connected! Type /ceo to start your business.',
    parseMode: 'markdown',
  });
}

/** Post-link jump — after a deep link carries `businessId`, resume THAT
 *  business's pending event in the chat. Silently throws on ownership /
 *  missing-event so the caller can fall back to the generic Connected! msg. */
async function resumeSpecificBusiness(params: {
  chatId: string;
  businessId: string;
  kidId: string;
  send: Send;
}): Promise<void> {
  const business = await getCeoBusiness(params.businessId);
  if (business.kidId !== params.kidId) {
    throw new AppException('FORBIDDEN', 'Business belongs to a different kid', 403);
  }

  await params.send({
    chatId: params.chatId,
    text: `Connected! Resuming *${escapeMd(business.businessName)}*…`,
    parseMode: 'markdown',
  });

  const pending = await getPendingEventForBusiness(business.id);
  if (pending) {
    await sendEvent(params.chatId, pending, params.send);
    return;
  }

  // No pending event — let the kid know they're caught up and point them
  // at /mybusiness so they can see state.
  await params.send({
    chatId: params.chatId,
    text: 'No pending decision right now — type /mybusiness to see where you are.',
    parseMode: 'markdown',
  });
}

/** Gate for every CEO command that reads or writes business data. Returns
 *  the linked `kidId` + `userId` or sends the "please connect on the web"
 *  prompt and returns null. Kid CEO is authenticated-only — unlinked bot
 *  chats cannot create or touch any business. */
async function requireLinkedKid(
  context: BotContext,
  send: Send,
  chatId: string,
): Promise<{ userId: string; kidId: string } | null> {
  const { userId, kidId } = context.session;
  if (!userId || !kidId) {
    await send({
      chatId,
      text:
        "You're not connected yet!\n\n" +
        'Sign in on the web app at gsiaistudio.com, pick a kid profile, ' +
        'then tap *Connect Telegram* on the Kid CEO page. After that I can ' +
        'track your businesses here.',
      parseMode: 'markdown',
    });
    return null;
  }
  return { userId, kidId };
}

/** /ceo — picker that adapts to how many businesses the kid has:
 *    - 0 active           → new-business picker (business types)
 *    - 1 active           → resume immediately (send pending event)
 *    - 2..N active        → list picker (which one do you want to play?) + "New" button
 *
 *  Mirrors the web `/ceo` landing-page model so the kid has the same mental
 *  model in both channels. Cap matches MAX_CONCURRENT_ACTIVE_BUSINESSES
 *  (3 — server-enforced in /api/ceo/register). */
async function handleCeo(
  message: BotIncomingMessage,
  send: Send,
  context: BotContext,
): Promise<void> {
  const linked = await requireLinkedKid(context, send, message.chatId);
  if (!linked) return;

  const allBusinesses = await listBusinessesForKid(linked.kidId, 20);
  const actives = allBusinesses.filter((b) => b.status === 'active');

  // 1 active → resume immediately.
  if (actives.length === 1) {
    const only = actives[0]!;
    await send({
      chatId: message.chatId,
      text:
        `You're still running *${escapeMd(only.businessName)}*!\n\n` +
        'Type /mybusiness to see your status, or wait for the next event here.',
      parseMode: 'markdown',
    });
    const pending = await getPendingEventForBusiness(only.id);
    if (pending) {
      await sendEvent(message.chatId, pending, send);
    }
    return;
  }

  // 2+ active → list picker. One button per business, plus a "New" button
  // if the kid is under the concurrent-active cap.
  if (actives.length >= 2) {
    const rows: BotButton[][] = actives.map((b) => [
      {
        text: `${businessEmojiFor(b.businessType)} ${truncate(b.businessName, 40)} · ₹${b.currentCash}`,
        callbackData: `ceo_resume:${b.id}`,
      },
    ]);

    if (actives.length < CONCURRENT_ACTIVE_CAP) {
      rows.push([
        {
          text: '➕ Start a new business',
          callbackData: 'ceo_biz:__new__',
        },
      ]);
    }

    await send({
      chatId: message.chatId,
      text:
        `You have *${actives.length}* businesses running. Which one do you want to play?`,
      parseMode: 'markdown',
      buttons: rows,
    });
    return;
  }

  // 0 active → new-business picker (business types).
  const rows: BotButton[][] = [];
  for (let i = 0; i < CATALOG.length; i += 2) {
    const row: BotButton[] = [];
    const left = CATALOG[i]!;
    row.push({ text: `${left.emoji} ${left.name}`, callbackData: `ceo_biz:${left.type}` });
    const right = CATALOG[i + 1];
    if (right) {
      row.push({ text: `${right.emoji} ${right.name}`, callbackData: `ceo_biz:${right.type}` });
    }
    rows.push(row);
  }

  await send({
    chatId: message.chatId,
    text: "Let's start your business! Pick the kind you want to run:",
    parseMode: 'markdown',
    buttons: rows,
  });
}

/** Resolve a business-type code to its catalog emoji (fallback 🏪). */
function businessEmojiFor(type: CeoBusinessType): string {
  return CATALOG.find((c) => c.type === type)?.emoji ?? '🏪';
}

/** Callback — kid picked an existing business from the multi-biz list. */
async function handleResumePick(
  data: string,
  message: BotIncomingMessage,
  send: Send,
  context: BotContext,
): Promise<void> {
  const businessId = data.slice('ceo_resume:'.length);
  if (!businessId) {
    await send({ chatId: message.chatId, text: 'Pick one of the buttons above.' });
    return;
  }

  const linked = await requireLinkedKid(context, send, message.chatId);
  if (!linked) return;

  const business = await getCeoBusiness(businessId);
  if (business.kidId !== linked.kidId) {
    await send({ chatId: message.chatId, text: "That's not one of your businesses." });
    return;
  }

  if (business.status !== 'active') {
    await send({
      chatId: message.chatId,
      text: `*${escapeMd(business.businessName)}* is ${business.status}. Type /ceo to pick another.`,
      parseMode: 'markdown',
    });
    return;
  }

  await send({
    chatId: message.chatId,
    text: `Resuming *${escapeMd(business.businessName)}*…`,
    parseMode: 'markdown',
  });

  const pending = await getPendingEventForBusiness(business.id);
  if (pending) {
    await sendEvent(message.chatId, pending, send);
  } else {
    await send({
      chatId: message.chatId,
      text:
        'No pending decision right now. Type /mybusiness to see where you are, ' +
        'or wait for the next event to arrive.',
      parseMode: 'markdown',
    });
  }
}

/** Callback — kid picked a business type → offer pace picker.
 *
 *  Special case: `ceo_biz:__new__` comes from the "Start a new business"
 *  button in the multi-biz resume picker. Re-renders the business-type
 *  picker so the kid can pick what KIND of new business to start. */
async function handleBizPick(
  data: string,
  message: BotIncomingMessage,
  send: Send,
): Promise<void> {
  const rawType = data.slice('ceo_biz:'.length);

  if (rawType === '__new__') {
    const rows: BotButton[][] = [];
    for (let i = 0; i < CATALOG.length; i += 2) {
      const row: BotButton[] = [];
      const left = CATALOG[i]!;
      row.push({ text: `${left.emoji} ${left.name}`, callbackData: `ceo_biz:${left.type}` });
      const right = CATALOG[i + 1];
      if (right) {
        row.push({ text: `${right.emoji} ${right.name}`, callbackData: `ceo_biz:${right.type}` });
      }
      rows.push(row);
    }
    await send({
      chatId: message.chatId,
      text: 'Pick the kind of business you want to run:',
      parseMode: 'markdown',
      buttons: rows,
    });
    return;
  }

  if (!BUSINESS_TYPES.includes(rawType as CeoBusinessType)) {
    await send({ chatId: message.chatId, text: 'Pick one of the buttons above.' });
    return;
  }
  const type = rawType as CeoBusinessType;
  const businessName = BUSINESS_TYPE_DEFAULT_NAMES[type];

  await send({
    chatId: message.chatId,
    text: `Pick your pace for *${escapeMd(businessName)}*:`,
    parseMode: 'markdown',
    buttons: [
      [
        { text: '15 days (snappy)', callbackData: `ceo_pace:${type}:15` },
        { text: '30 days', callbackData: `ceo_pace:${type}:30` },
        { text: '45 days (deep)', callbackData: `ceo_pace:${type}:45` },
      ],
    ],
  });
}

/** Callback — pace picked → create business, seed first event, fire messages. */
async function handlePacePick(
  data: string,
  message: BotIncomingMessage,
  send: Send,
  context: BotContext,
): Promise<void> {
  const parts = data.split(':');
  const rawType = parts[1] ?? '';
  const rawPace = parts[2] ?? '';
  if (
    !BUSINESS_TYPES.includes(rawType as CeoBusinessType) ||
    !PACES.includes(rawPace as CeoPace)
  ) {
    await send({ chatId: message.chatId, text: 'Pick one of the buttons above.' });
    return;
  }
  const businessType = rawType as CeoBusinessType;
  const pace = rawPace as CeoPace;

  const linked = await requireLinkedKid(context, send, message.chatId);
  if (!linked) return;

  const business = await createCeoBusiness({
    userId: linked.userId,
    kidId: linked.kidId,
    businessType,
    location: 'India',
    pace,
  });

  // Seed the FIRST MILESTONE EVENT so the kid has a "TODAY'S BIG CHOICE" to
  // decide right away (otherwise they'd wait until tomorrow's 6:30am cron).
  // pickNextMilestone always returns a pre-launch milestone here since the
  // business is freshly created with an all-pending milestone dict, so the
  // `!` assertion is safe.
  const milestone = pickNextMilestone(business.phase, business.phaseMilestones)!;
  const generated = await generateMilestoneEvent({ business, milestone });
  const firstEvent = await saveCeoEvent({ ...generated, deliveredVia: 'telegram' });
  // Mark the milestone as delivered so the cron knows to wait a full kid-day
  // before firing the next milestone event for this business.
  await markMilestoneDelivered(business.id);

  // Profile is keyed by businessId — create it now so /decide later can find it.
  await getOrCreateCeoProfile({
    userId: linked.userId,
    kidId: linked.kidId,
    businessId: business.id,
  });

  await send({
    chatId: message.chatId,
    text:
      `*${escapeMd(business.businessName)}* is live!\n\n` +
      `Starting cash: Rs. ${business.currentCash}\n` +
      `Phase: ${PHASE_LABELS[business.phase]}\n` +
      `Pace: ${pace} days\n\n` +
      'Your first decision is coming up...',
    parseMode: 'markdown',
  });

  await sendEvent(message.chatId, firstEvent, send);
}

/** /mybusiness — concise status for the current active business. */
async function handleMyBusiness(
  message: BotIncomingMessage,
  send: Send,
  context: BotContext,
): Promise<void> {
  const linked = await requireLinkedKid(context, send, message.chatId);
  if (!linked) return;
  const business = await getActiveBusinessForKid(linked.kidId);

  if (!business) {
    await send({
      chatId: message.chatId,
      text: 'No business yet — type /ceo to start.',
    });
    return;
  }

  const done = Object.values(business.phaseMilestones).filter((m) => m === 'resolved').length;
  const total = Object.keys(business.phaseMilestones).length;

  await send({
    chatId: message.chatId,
    text:
      `*${escapeMd(business.businessName)}* (${escapeMd(business.businessType)})\n` +
      `Cash: Rs. ${business.currentCash}\n` +
      `Reputation: ${business.reputation}/100\n` +
      `Morale: ${business.morale}/100\n` +
      `Phase: ${PHASE_LABELS[business.phase]}\n` +
      `Milestones: ${done}/${total} done\n\n` +
      '_Type /ceo or wait for your next event to arrive._',
    parseMode: 'markdown',
  });
}

/** /ceoprofile — deep-link to the web profile card. */
async function handleCeoProfile(
  message: BotIncomingMessage,
  send: Send,
  context: BotContext,
): Promise<void> {
  const linked = await requireLinkedKid(context, send, message.chatId);
  if (!linked) return;
  const business = await getActiveBusinessForKid(linked.kidId);
  if (!business) {
    await send({
      chatId: message.chatId,
      text: "You don't have a business yet — type /ceo to start one!",
    });
    return;
  }
  const base = process.env.NEXT_PUBLIC_URL ?? 'https://gsiaistudio.com';
  await send({
    chatId: message.chatId,
    text: `See your *CEO Profile* here:\n${base}/ceo/play?businessId=${business.id}`,
    parseMode: 'markdown',
  });
}

/** /help — kid-friendly menu of every Kid CEO command, written for a 10-year-old.
 *  Plain sentences, one line per command, concrete examples for `/link`. No
 *  auth gate — kids who aren't connected yet should still be able to see what
 *  the bot can do. */
async function handleHelp(message: BotIncomingMessage, send: Send): Promise<void> {
  await send({
    chatId: message.chatId,
    text: [
      '*Kid CEO — what can I do?* 🚀',
      '',
      "I'm your Kid CEO sidekick. Here's every command and what it does:",
      '',
      '🏪 /ceo — Pick a business to play, or start a brand-new one.',
      '    You can run up to 5 businesses at once.',
      '',
      '📊 /mybusiness — See how your business is doing right now:',
      '    cash, reputation, morale, phase, and milestones.',
      '',
      '🧠 /ceoprofile — Open your *CEO Profile Card* in the web app.',
      '    Shows your strengths as a founder — creativity, grit, and more.',
      '',
      '🔗 /link `123456` — Connect this chat to your web account using a',
      '    6-digit code from the Kid CEO page. Needed once per kid profile.',
      '',
      '👋 /start — Welcome message, anytime you want to say hi again.',
      '',
      '❓ /help — Show this menu.',
      '',
      '_Tip: if a decision pops up, just tap one of the buttons — A, B, or C._',
    ].join('\n'),
    parseMode: 'markdown',
  });
}

// ─── Event rendering + decision loop ─────────────────────────

/** Send a pending event as a markdown message + A/B/C choice keyboard.
 *
 *  PR2 dual shape: milestone events render with a "⭐ TODAY'S BIG CHOICE ⭐"
 *  banner, a hyphen-rule, the named title (or legacy title fallback), the
 *  category + phase label, and a closing stakes reminder — so kids instantly
 *  feel the weight of a once-a-day Big Choice. Regular events get a compact
 *  💼-prefixed shape so they read as everyday small decisions. Detection:
 *  prefer `event.eventType`, falling back to "milestone if there's a
 *  `milestone` field" for legacy events that pre-date the typed field. */
async function sendEvent(chatId: string, event: CeoEvent, send: Send): Promise<void> {
  const buttons: BotButton[][] = event.choices.map((choice) => [
    {
      text: `${choice.id}. ${truncate(choice.text, 80)}`,
      callbackData: `ceo_choice:${event.id}:${choice.id}`,
    },
  ]);

  const isMilestone =
    (event.eventType ?? (event.milestone ? 'milestone' : 'regular')) === 'milestone';

  let text: string;
  if (isMilestone) {
    const headline = escapeMd(event.namedTitle ?? event.title);
    const phaseLabel = PHASE_LABELS[event.phase];
    text =
      `⭐ *TODAY'S BIG CHOICE* ⭐\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `*${headline}*\n` +
      `_${escapeMd(event.category)} · ${phaseLabel}_\n\n` +
      `${event.description}\n\n` +
      `_Pick A, B, or C — this one counts._`;
  } else {
    text =
      `💼 *${escapeMd(event.title)}*\n` +
      `_${escapeMd(event.category)}_\n\n` +
      event.description;
  }

  await send({
    chatId,
    text,
    parseMode: 'markdown',
    buttons,
  });
}

/** Main decision loop — scores, persists, awards points, fires next event. */
async function handleChoice(
  data: string,
  message: BotIncomingMessage,
  send: Send,
  context: BotContext,
): Promise<void> {
  const parts = data.split(':');
  const eventId = parts[1] ?? '';
  const rawChoice = parts[2] ?? '';

  if (!eventId || !['A', 'B', 'C'].includes(rawChoice)) {
    await send({ chatId: message.chatId, text: 'Pick one of the buttons above.' });
    return;
  }
  const choiceId = rawChoice as CeoChoiceId;

  const linked = await requireLinkedKid(context, send, message.chatId);
  if (!linked) return;

  const event = await getCeoEvent(eventId);

  // Ownership check — matches the web /api/ceo/decide route. Prevents a
  // chat from deciding another kid's event if the callback data leaks or
  // the chat gets rebound via /link to a different kid mid-flight.
  if (event.kidId !== linked.kidId) {
    await send({ chatId: message.chatId, text: 'That decision is not yours to make.' });
    return;
  }

  if (event.status !== 'pending') {
    await send({
      chatId: message.chatId,
      text: 'Already decided ✅',
      editMessageId: message.messageId,
    });
    return;
  }

  const chosen = event.choices.find((c) => c.id === choiceId);
  if (!chosen) {
    await send({ chatId: message.chatId, text: 'That choice is not available.' });
    return;
  }

  // Response-time: use the defensive timestampToMillis helper so we survive
  // whichever shape the Netlify function bundle hands us (Timestamp instance
  // vs. plain {seconds,nanoseconds} POJO vs. {_seconds,_nanoseconds}). Direct
  // .toMillis() was crashing in production.
  const createdAtMs = timestampToMillis(event.createdAt);
  const elapsedSec = createdAtMs > 0 ? (Date.now() - createdAtMs) / 1000 : 0;
  const responseTimeSeconds = Math.max(1, Math.round(elapsedSec));

  // Parallelize the two independent reads — both only need event.businessId,
  // which we already have. Shaves ~150ms off perceived latency.
  const [business, profile] = await Promise.all([
    getCeoBusiness(event.businessId),
    getCeoProfileByBusiness(event.businessId),
  ]);

  const scoring = await scoreDecision({
    event,
    choiceId,
    responseTimeSeconds,
    business,
  });

  const nextMath = applyStateChanges(business, scoring.state_changes);
  const nextDimensions = applyScoreAdjustments(profile.dimensions, scoring.scores);

  const businessStateUpdates: Partial<CeoBusiness> = {
    currentCash: nextMath.currentCash,
    reputation: nextMath.reputation,
    morale: nextMath.morale,
  };

  const { business: postDecisionBusiness } = await recordEventDecision({
    eventId,
    businessId: business.id,
    choiceId,
    choiceText: chosen.text,
    responseTimeSeconds,
    scores: scoring.scores,
    feedback: scoring.reasoning,
    milestoneResolved: event.milestone ?? null,
    businessStateUpdates,
    profileDimensionUpdates: nextDimensions,
  });

  // PR2: phase advance is gated on eventType === 'milestone'. Regular
  // events can't advance a phase even if they happened to resolve the
  // last milestone.
  const isMilestoneDecision =
    (event.eventType ?? (event.milestone ? 'milestone' : 'regular')) === 'milestone';

  let latestBusiness: CeoBusiness = postDecisionBusiness;
  let phaseAdvanced = false;
  if (
    isMilestoneDecision &&
    event.milestone &&
    isPhaseComplete(latestBusiness.phase, latestBusiness.phaseMilestones)
  ) {
    latestBusiness = await advanceBusinessPhase(business.id);
    phaseAdvanced = true;
  }

  // Next-event auto-generation:
  // - After MILESTONE decision → no next event here. Kid waits for the
  //   scheduled cron's next morning delivery. This is the habit hook.
  // - After REGULAR decision → mint another regular event IF under cap.
  let nextEvent: CeoEvent | null = null;
  let regularCapHit = false;
  let regularEventsToday = latestBusiness.dailyRegularEventCount ?? 0;
  if (latestBusiness.status === 'active' && !isMilestoneDecision) {
    const reservation = await reserveRegularEventSlot(
      latestBusiness.id,
      REGULAR_EVENTS_PER_DAY_CAP,
    );
    regularEventsToday = reservation.countToday;
    if (reservation.allowed) {
      const recent = await getRecentEventsForBusiness(latestBusiness.id, 5);
      const recentEventTitles = recent.map((e) => e.title);
      const generated = await generateRegularEvent({
        business: latestBusiness,
        recentEventTitles,
      });
      nextEvent = await saveCeoEvent({ ...generated, deliveredVia: 'telegram' });
    } else {
      regularCapHit = true;
    }
  }

  // AI Points — split by event type; phase/simulation bonuses layered on.
  let aiPointsEarned = isMilestoneDecision
    ? CEO_AI_POINTS.MAKE_DECISION_MILESTONE
    : CEO_AI_POINTS.MAKE_DECISION_REGULAR;
  if (isMilestoneDecision && event.milestone) {
    aiPointsEarned += CEO_AI_POINTS.COMPLETE_MILESTONE;
  }
  if (phaseAdvanced) aiPointsEarned += CEO_AI_POINTS.COMPLETE_PHASE;
  if (latestBusiness.status === 'completed') aiPointsEarned += CEO_AI_POINTS.COMPLETE_SIMULATION;

  // Don't lie to the kid: only claim points if the points write succeeded.
  // Kid CEO is authenticated-only — points live on the kid doc (same source
  // of truth the web UI reads from), so the running total ticks up in the
  // web app the next time the kid opens it.
  let actualPointsEarned = 0;
  let pointsSaveFailed = false;
  try {
    await updateKidPoints(linked.kidId, {
      action: 'add_points',
      points: aiPointsEarned,
    });
    actualPointsEarned = aiPointsEarned;
  } catch (err) {
    pointsSaveFailed = true;
    console.error('[ceo module] updateKidPoints failed:', (err as Error).message);
  }

  // Build + send feedback message
  await send({
    chatId: message.chatId,
    text: buildFeedbackMessage({
      choiceId,
      chosenText: chosen.text,
      feedback: scoring.reasoning,
      scores: scoring.scores,
      business,
      updatedBusiness: latestBusiness,
      milestoneResolved: event.milestone ?? null,
      phaseAdvanced,
      aiPointsEarned: actualPointsEarned,
      pointsSaveFailed,
    }),
    parseMode: 'markdown',
  });

  // Completion link
  if (latestBusiness.status === 'completed') {
    const base = process.env.NEXT_PUBLIC_URL ?? 'https://gsiaistudio.com';
    await send({
      chatId: message.chatId,
      text:
        'You finished the full arc! 🎉\n\n' +
        `See your full *CEO Profile Card* here:\n${base}/ceo/play?businessId=${latestBusiness.id}`,
      parseMode: 'markdown',
    });
    return;
  }

  // Next-step UX:
  // - Milestone decision → nudge the kid to come back tomorrow.
  // - Regular decision, cap not hit → send the next regular event.
  // - Regular decision, cap hit → "come back tomorrow" prompt.
  if (nextEvent) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await sendEvent(message.chatId, nextEvent, send);
  } else if (isMilestoneDecision) {
    await send({
      chatId: message.chatId,
      text:
        '⭐ You made *today\'s Big Choice*. Tomorrow morning I\'ll bring the next one.\n\n' +
        'Meanwhile, type /ceo to handle small everyday decisions (up to 5/day).',
      parseMode: 'markdown',
    });
  } else if (regularCapHit) {
    await send({
      chatId: message.chatId,
      text:
        `You've handled all *${REGULAR_EVENTS_PER_DAY_CAP}* small decisions for today (${regularEventsToday}/${REGULAR_EVENTS_PER_DAY_CAP}).\n\n` +
        '⭐ Tomorrow morning your next *Big Choice* arrives. See you then!',
      parseMode: 'markdown',
    });
  }
}

// ─── Helpers ─────────────────────────────────────────────────

interface FeedbackMessageParams {
  choiceId: CeoChoiceId;
  chosenText: string;
  feedback: string;
  scores: Record<string, number>;
  business: CeoBusiness;
  updatedBusiness: CeoBusiness;
  milestoneResolved: string | null;
  phaseAdvanced: boolean;
  aiPointsEarned: number;
  pointsSaveFailed?: boolean;
}

function buildFeedbackMessage(params: FeedbackMessageParams): string {
  const { choiceId, chosenText, feedback, scores, business, updatedBusiness } = params;
  const lines: string[] = [];

  lines.push(`You picked *${choiceId}*: ${escapeMd(truncate(chosenText, 100))}`);
  if (feedback) lines.push('', escapeMd(feedback));

  // Top 3 dimension shifts by absolute value
  const topShifts = Object.entries(scores)
    .filter(([, v]) => Math.abs(v) >= 0.1)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 3);
  if (topShifts.length > 0) {
    lines.push('', '*Dimension shifts:*');
    for (const [dim, v] of topShifts) {
      const label = DIMENSION_LABELS[dim as keyof typeof DIMENSION_LABELS]?.name ?? dim;
      const arrow = v > 0 ? '↑' : '↓';
      lines.push(`• ${label} ${arrow} ${v > 0 ? '+' : ''}${v}`);
    }
  }

  // Business state deltas
  const cashDelta = updatedBusiness.currentCash - business.currentCash;
  const repDelta = updatedBusiness.reputation - business.reputation;
  const moraleDelta = updatedBusiness.morale - business.morale;
  const stateBits: string[] = [];
  if (cashDelta !== 0) stateBits.push(`Cash ${fmtDelta(cashDelta)}`);
  if (repDelta !== 0) stateBits.push(`Rep ${fmtDelta(repDelta)}`);
  if (moraleDelta !== 0) stateBits.push(`Morale ${fmtDelta(moraleDelta)}`);
  if (stateBits.length > 0) {
    lines.push('', `_${stateBits.join(' · ')}_`);
  }

  if (params.milestoneResolved) {
    lines.push('', `🎯 Milestone done: *${params.milestoneResolved}*`);
  }
  if (params.phaseAdvanced) {
    lines.push(`🚀 New phase: *${PHASE_LABELS[updatedBusiness.phase]}*`);
  }
  if (updatedBusiness.status === 'completed') {
    lines.push('🏆 *Simulation complete!*');
  }

  if (params.pointsSaveFailed) {
    lines.push('', '_Points server hiccup — your decision is saved, we\'ll retry the points next time._');
  } else if (params.aiPointsEarned > 0) {
    lines.push('', `+${params.aiPointsEarned} AI Points`);
  }
  return lines.join('\n');
}

function fmtDelta(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(0, max - 1))}…`;
}

/** Escape reserved Telegram Markdown v1 chars — enough for our use (asterisks
 *  and underscores inside user-typed names). The adapter applies MD v2
 *  escaping on its own, this is defensive to avoid `*Koko's*` style breakage. */
function escapeMd(text: string): string {
  return text.replace(/([*_`\[\]])/g, '\\$1');
}
