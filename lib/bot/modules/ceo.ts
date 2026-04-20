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
  getActiveBusinessForSession,
  getCeoBusiness,
  getCeoEvent,
  getCeoProfileByBusiness,
  getOrCreateCeoProfile,
  getPendingEventForBusiness,
  migrateSessionBusinesses,
  recordEventDecision,
  saveCeoEvent,
} from '@/lib/firebase/ceoService';
import { timestampToMillis } from '@/lib/utils/timestamps';
import { applyStateChanges } from '@/lib/ceo/businessState';
import { applyScoreAdjustments } from '@/lib/ceo/profileEngine';
import { generateEvent } from '@/lib/ceo/eventEngine';
import { scoreDecision } from '@/lib/ceo/scoringEngine';
import { isPhaseComplete, pickNextMilestone } from '@/lib/ceo/phases';
import {
  BUSINESS_TYPE_DEFAULT_NAMES,
  CEO_AI_POINTS,
  DIMENSION_LABELS,
  PHASE_LABELS,
} from '@/lib/ceo/constants';
import businessesCatalog from '@/lib/ceo/templates/businesses.json';
import { updateSessionPoints } from '@/lib/firebase/sessionService';

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

const BUSINESS_TYPES: readonly CeoBusinessType[] = [
  'lemonade',
  'icecream',
  'tshirt',
  'games',
  'crafts',
  'blog',
  'custom',
];

const PACES: readonly CeoPace[] = ['30', '60', '90'];

// ─── Module export ───────────────────────────────────────────

export const ceoModule: BotFeatureModule = {
  id: 'ceo',
  commands: ['/start', '/ceo', '/mybusiness', '/ceoprofile', '/link'],
  callbackPrefixes: ['ceo_biz:', 'ceo_choice:', 'ceo_pace:', 'ceo_loc:'],

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
  context: BotContext,
  redeemed: {
    gsiSessionId: string;
    userId: string | null;
    kidId: string | null;
    businessId?: string | null;
  },
  send: Send,
  chatId: string,
): Promise<void> {
  const oldSessionId = context.session.gsiSessionId;
  const newSessionId = redeemed.gsiSessionId;

  if (oldSessionId && oldSessionId !== newSessionId) {
    try {
      const moved = await migrateSessionBusinesses(oldSessionId, newSessionId);
      if (moved.businesses > 0) {
        console.log(
          `[ceo module] Migrated ${moved.businesses} businesses, ${moved.events} events, ${moved.profiles} profiles from ${oldSessionId} → ${newSessionId}`,
        );
      }
    } catch (err) {
      // Migration failure shouldn't block the link — log and continue so
      // the kid at least gets bound to the web session going forward.
      console.error('[ceo module] migrateSessionBusinesses failed:', (err as Error).message);
    }
  }

  await linkBotSession({
    chatId,
    gsiSessionId: newSessionId,
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
        sessionId: newSessionId,
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
  sessionId: string;
  send: Send;
}): Promise<void> {
  const business = await getCeoBusiness(params.businessId);
  if (business.sessionId !== params.sessionId) {
    throw new AppException('FORBIDDEN', 'Business belongs to a different session', 403);
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

/** /ceo — resume or start a business. */
async function handleCeo(
  message: BotIncomingMessage,
  send: Send,
  context: BotContext,
): Promise<void> {
  const sessionId = await context.getGsiSessionId();
  const active = await getActiveBusinessForSession(sessionId);

  if (active) {
    await send({
      chatId: message.chatId,
      text:
        `You're still running *${escapeMd(active.businessName)}*!\n\n` +
        'Type /mybusiness to see your status, or wait for the next event here.',
      parseMode: 'markdown',
    });
    const pending = await getPendingEventForBusiness(active.id);
    if (pending) {
      await sendEvent(message.chatId, pending, send);
    }
    return;
  }

  // Business picker — 2-column grid with emoji + name.
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

/** Callback — kid picked a business type → offer pace picker. */
async function handleBizPick(
  data: string,
  message: BotIncomingMessage,
  send: Send,
): Promise<void> {
  const rawType = data.slice('ceo_biz:'.length);
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
        { text: '30 days', callbackData: `ceo_pace:${type}:30` },
        { text: '60 days', callbackData: `ceo_pace:${type}:60` },
        { text: '90 days', callbackData: `ceo_pace:${type}:90` },
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

  const sessionId = await context.getGsiSessionId();

  const business = await createCeoBusiness({
    sessionId,
    businessType,
    location: 'India',
    pace,
  });

  // Seed first event so the kid has something to decide right away.
  const milestone = pickNextMilestone(business.phase, business.phaseMilestones);
  const generated = await generateEvent({ business, milestone });
  const firstEvent = await saveCeoEvent({ ...generated, deliveredVia: 'telegram' });

  // Profile is keyed by businessId — create it now so /decide later can find it.
  await getOrCreateCeoProfile({ sessionId, businessId: business.id });

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
  const sessionId = await context.getGsiSessionId();
  const business = await getActiveBusinessForSession(sessionId);

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
  const sessionId = await context.getGsiSessionId();
  const business = await getActiveBusinessForSession(sessionId);
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

// ─── Event rendering + decision loop ─────────────────────────

/** Send a pending event as a markdown message + A/B/C choice keyboard. */
async function sendEvent(chatId: string, event: CeoEvent, send: Send): Promise<void> {
  const buttons: BotButton[][] = event.choices.map((choice) => [
    {
      text: `${choice.id}. ${truncate(choice.text, 80)}`,
      callbackData: `ceo_choice:${event.id}:${choice.id}`,
    },
  ]);

  await send({
    chatId,
    text:
      `*${escapeMd(event.title)}*\n` +
      `_${escapeMd(event.category)}_\n\n` +
      event.description,
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

  const event = await getCeoEvent(eventId);

  // Ownership check — matches the web /api/ceo/decide route. Prevents a
  // chat from deciding another kid's event if the callback data leaks or
  // the chat gets rebound via /link to a different session mid-flight.
  const sessionId = await context.getGsiSessionId();
  if (event.sessionId !== sessionId) {
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

  const business = await getCeoBusiness(event.businessId);
  const profile = await getCeoProfileByBusiness(event.businessId);

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

  let latestBusiness: CeoBusiness = postDecisionBusiness;
  let phaseAdvanced = false;
  if (event.milestone && isPhaseComplete(latestBusiness.phase, latestBusiness.phaseMilestones)) {
    latestBusiness = await advanceBusinessPhase(business.id);
    phaseAdvanced = true;
  }

  let nextEvent: CeoEvent | null = null;
  if (latestBusiness.status === 'active') {
    const nextMilestone = pickNextMilestone(latestBusiness.phase, latestBusiness.phaseMilestones);
    const generated = await generateEvent({ business: latestBusiness, milestone: nextMilestone });
    nextEvent = await saveCeoEvent({ ...generated, deliveredVia: 'telegram' });
  }

  // AI Points — same formula as the web /api/ceo/decide route.
  let aiPointsEarned = CEO_AI_POINTS.MAKE_DECISION;
  if (event.milestone) aiPointsEarned += CEO_AI_POINTS.COMPLETE_MILESTONE;
  if (phaseAdvanced) aiPointsEarned += CEO_AI_POINTS.COMPLETE_PHASE;
  if (latestBusiness.status === 'completed') aiPointsEarned += CEO_AI_POINTS.COMPLETE_SIMULATION;

  // Don't lie to the kid: only claim points if the points write succeeded.
  let actualPointsEarned = 0;
  let pointsSaveFailed = false;
  try {
    await updateSessionPoints(sessionId, { action: 'add_points', points: aiPointsEarned });
    actualPointsEarned = aiPointsEarned;
  } catch (err) {
    pointsSaveFailed = true;
    console.error('[ceo module] updateSessionPoints failed:', (err as Error).message);
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

  // Next event follows on an 800ms delay so the feedback lands first.
  if (nextEvent) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await sendEvent(message.chatId, nextEvent, send);
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
