/**
 * Scheduled Kid CEO milestone-event delivery — "TODAY'S BIG CHOICE" cron.
 *
 * Runs every 2 hours (see the `schedule` export at the bottom). On each
 * invocation:
 *   1. Queries ceoBusiness for `status == 'active'` AND
 *      `lastMilestoneDeliveredAt <= now - minIntervalHoursFor(pace)`.
 *   2. For each due business, picks the next milestone, generates a
 *      MILESTONE event (using the two-path engine and anti-repetition
 *      context), and saves it via saveCeoEvent with deliveredVia='scheduled'.
 *   3. Stamps lastMilestoneDeliveredAt = now on the business (so the next
 *      cron tick doesn't double-fire).
 *   4. Best-effort: pushes a "⭐ TODAY'S BIG CHOICE ⭐" ping to every
 *      linked Telegram chat for the owning kid. If the bot send fails,
 *      the event is still in Firestore — the kid will find it when they
 *      open the web app or hit /ceo in the bot.
 *
 * Pacing:
 *   - 15-day pace → ~1.3 milestones/day → min interval ~18h
 *   - 30-day pace → ~0.7/day           → min interval ~34h
 *   - 45-day pace → ~0.5/day           → min interval ~48h
 *   Cron fires every 2h so the 18/34/48h thresholds resolve within one tick
 *   of the ideal time. We don't try to align to the kid's local 6:30am —
 *   that would require per-kid timezone data we don't have yet.
 *
 * Idempotency: if a business still has a pending event (kid hasn't decided
 * the last milestone), we SKIP delivery — don't pile up two milestones on
 * top of each other. The kid decides yesterday's, next cron picks up today's.
 *
 * Auth: protected by `BOT_SETUP_SECRET` the same way bot-setup is — callers
 * (including Netlify's scheduler, which hits the endpoint with no auth) can
 * pass `?secret=...` or the `x-bot-setup-secret` header. Netlify's scheduler
 * DOES NOT pass a secret, but Netlify-scheduled invocations set a known
 * header that we recognize so the scheduler gets through while randoms
 * don't. (`x-nf-scheduled-function` present on scheduled invocations.)
 *
 * Environment variables:
 *   - BOT_SETUP_SECRET             (required) — same secret bot-setup uses
 *   - TELEGRAM_BOT_TOKEN_CEO       (required) — for the push-to-chat side
 */

import type { Handler, HandlerContext } from '@netlify/functions';
import { schedule } from '@netlify/functions';
import { isAuthorizedCronCall } from '../../lib/netlify-cron-auth';
import { Timestamp } from 'firebase-admin/firestore';
import { TelegramAdapter } from '../../lib/bot/adapters/telegram';
import {
  getPendingEventForBusiness,
  getRecentEventsForBusiness,
  listBusinessesDueForMilestone,
  markMilestoneDelivered,
  saveCeoEvent,
} from '../../lib/firebase/ceoService';
import { generateMilestoneEvent } from '../../lib/ceo/eventEngine';
import { pickNextMilestone } from '../../lib/ceo/phases';
import { findBotSessionsForKid } from '../../lib/bot/services/sessionStore';
import type { CeoBusiness, CeoEvent, CeoPace } from '../../types';
import { coerceLegacyPace } from '../../lib/ceo/constants';

const DEPLOY_SECRET = process.env.BOT_SETUP_SECRET;
const CEO_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_CEO ?? '';
const CEO_BOT_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET_CEO;

/** How many hours since the last milestone before a business is "due" for
 *  the next one. Pace-aware: shorter pace → more frequent milestones. */
function minIntervalHoursFor(pace: CeoPace): number {
  switch (pace) {
    case '15':
      return 18; // ~1.3 milestones/day
    case '30':
      return 34; // ~0.7/day
    case '45':
      return 48; // ~0.5/day
  }
}

/** Max businesses handled per cron tick. Keeps the worst-case run under
 *  Netlify's 10s wall clock even with LLM latency. At 15 businesses × ~500ms
 *  LLM + 300ms Firestore + 200ms Telegram send = ~15s — tight, but we run
 *  every 2h so stragglers catch up next tick. */
const MAX_BUSINESSES_PER_RUN = 15;

interface DeliveryOutcome {
  businessId: string;
  kidId: string;
  pace: CeoPace;
  status: 'delivered' | 'skipped-pending' | 'skipped-no-milestone' | 'failed';
  reason?: string;
  pushedToChats?: number;
}

const baseHandler: Handler = async (event, _context: HandlerContext) => {
  if (!isAuthorizedCronCall(event, DEPLOY_SECRET)) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  if (!CEO_BOT_TOKEN) {
    // Not fatal — we can still save events to Firestore, just no push.
    console.warn('[ceo-deliver-milestones] TELEGRAM_BOT_TOKEN_CEO unset; skipping pushes');
  }
  const telegram = CEO_BOT_TOKEN
    ? new TelegramAdapter(
        CEO_BOT_TOKEN,
        CEO_BOT_SECRET ? { secretToken: CEO_BOT_SECRET } : undefined,
      )
    : null;

  // Query businesses that MIGHT be due — using the shortest interval (15-pace
  // = 18h) as the filter, then per-business filter on actual pace inside the
  // loop. This keeps the Firestore query O(log n) without needing a per-pace
  // index explosion.
  const candidates = await listBusinessesDueForMilestone({
    minIntervalMs: 18 * 60 * 60 * 1000,
    limit: MAX_BUSINESSES_PER_RUN * 3,
  });

  const outcomes: DeliveryOutcome[] = [];
  let delivered = 0;

  for (const business of candidates) {
    if (delivered >= MAX_BUSINESSES_PER_RUN) break;

    const pace = coerceLegacyPace(business.pace);
    const minInterval = minIntervalHoursFor(pace) * 60 * 60 * 1000;
    const lastMs = business.lastMilestoneDeliveredAt
      ? (business.lastMilestoneDeliveredAt as unknown as Timestamp).toMillis?.() ??
        toMillisSafe(business.lastMilestoneDeliveredAt)
      : 0;
    if (Date.now() - lastMs < minInterval) {
      // Business came back in the wider "18h" query but its specific pace
      // says it's not due yet. Skip without logging noise.
      continue;
    }

    // Don't double-fire on top of a pending event.
    const pending = await getPendingEventForBusiness(business.id);
    if (pending) {
      outcomes.push({
        businessId: business.id,
        kidId: business.kidId,
        pace,
        status: 'skipped-pending',
        reason: `pending event ${pending.id} not decided yet`,
      });
      continue;
    }

    const milestone = pickNextMilestone(business.phase, business.phaseMilestones);
    if (!milestone) {
      // All milestones in this phase resolved but phase hasn't advanced
      // (shouldn't happen — decide route advances phase when the last
      // milestone resolves). Skip rather than crashing the cron.
      outcomes.push({
        businessId: business.id,
        kidId: business.kidId,
        pace,
        status: 'skipped-no-milestone',
        reason: `no available milestone in phase ${business.phase}`,
      });
      continue;
    }

    try {
      const event = await deliverOneMilestone({ business, milestone, telegram });
      delivered += 1;
      outcomes.push({
        businessId: business.id,
        kidId: business.kidId,
        pace,
        status: 'delivered',
        pushedToChats: event.pushedToChats,
      });
    } catch (err) {
      outcomes.push({
        businessId: business.id,
        kidId: business.kidId,
        pace,
        status: 'failed',
        reason: (err as Error).message,
      });
      console.error(
        '[ceo-deliver-milestones] delivery failed',
        JSON.stringify({ businessId: business.id, kidId: business.kidId, err: (err as Error).message }),
      );
    }
  }

  const summary = {
    candidatesConsidered: candidates.length,
    delivered,
    skipped: outcomes.filter((o) => o.status.startsWith('skipped')).length,
    failed: outcomes.filter((o) => o.status === 'failed').length,
    outcomes,
  };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(summary, null, 2),
  };
};

/** Generate, save, stamp, and push a single milestone event. Throws on
 *  anything unrecoverable; the caller catches and logs. */
async function deliverOneMilestone(params: {
  business: CeoBusiness;
  milestone: string;
  telegram: TelegramAdapter | null;
}): Promise<{ event: CeoEvent; pushedToChats: number }> {
  const { business, milestone, telegram } = params;

  // Pull anti-repetition context — last 5 decided events (titles) and any
  // prior milestone named_titles on this business.
  const recent = await getRecentEventsForBusiness(business.id, 5);
  const recentEventTitles = recent.map((e) => e.title);
  const recentNamedTitles = recent
    .filter((e) => (e.eventType ?? (e.milestone ? 'milestone' : 'regular')) === 'milestone')
    .map((e) => e.namedTitle)
    .filter((t): t is string => !!t);

  const generated = await generateMilestoneEvent({
    business,
    milestone,
    recentEventTitles,
    recentNamedTitles,
  });

  const savedEvent = await saveCeoEvent({
    ...generated,
    deliveredVia: 'telegram', // cron default — the web still reads it fine
    scheduledFor: Timestamp.now(),
  });

  // Stamp AFTER the save so a save failure doesn't leave the business marked
  // as "delivered" with no corresponding event doc.
  await markMilestoneDelivered(business.id);

  // Push to every linked Telegram chat for this kid. Best-effort.
  let pushedToChats = 0;
  if (telegram) {
    try {
      const sessions = await findBotSessionsForKid(business.kidId);
      const ceoSessions = sessions.filter(
        (s) => s.botHandle === 'GSIKidCeoAssistantBot' && s.chatId,
      );
      for (const session of ceoSessions) {
        try {
          await pushMilestoneToChat(telegram, session.chatId, savedEvent, business);
          pushedToChats += 1;
        } catch (err) {
          console.warn(
            '[ceo-deliver-milestones] push to chat failed',
            JSON.stringify({ chatId: session.chatId, err: (err as Error).message }),
          );
        }
      }
    } catch (err) {
      console.warn(
        '[ceo-deliver-milestones] findBotSessionsForKid failed',
        (err as Error).message,
      );
    }
  }

  return { event: savedEvent, pushedToChats };
}

/** Send the "TODAY'S BIG CHOICE" card to one chat with inline A/B/C buttons
 *  that match the bot module's `ceo_choice:` callback prefix. Format mirrors
 *  the bot module's sendEvent milestone path. */
async function pushMilestoneToChat(
  telegram: TelegramAdapter,
  chatId: string,
  event: CeoEvent,
  business: CeoBusiness,
): Promise<void> {
  const headline = event.namedTitle?.trim() || event.title;
  const body = [
    `⭐ *TODAY'S BIG CHOICE* ⭐`,
    '━━━━━━━━━━━━━━━━',
    `*${escapeMd(headline)}* — ${escapeMd(business.businessName)}`,
    `_${escapeMd(event.category)}_`,
    '',
    event.description,
    '',
    `_Pick A, B, or C — this one counts._`,
  ].join('\n');

  const buttons = event.choices.map((choice) => [
    {
      text: `${choice.id}. ${truncate(choice.text, 80)}`,
      callbackData: `ceo_choice:${event.id}:${choice.id}`,
    },
  ]);

  await telegram.send({
    chatId,
    text: body,
    parseMode: 'markdown',
    buttons,
  });
}

/** Trim markdown-special characters for legacy Markdown (same helper shape
 *  as lib/bot/modules/ceo.ts). Local copy because the module-level helper
 *  isn't exported. */
function escapeMd(text: string): string {
  return text.replace(/([*_`\[\]])/g, '\\$1');
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

function toMillisSafe(ts: unknown): number {
  // lastMilestoneDeliveredAt is typed as a local Timestamp | string; in
  // Netlify function bundles it may arrive as {_seconds, _nanoseconds}.
  if (ts && typeof ts === 'object') {
    const rec = ts as Record<string, unknown>;
    if (typeof rec.seconds === 'number') {
      return (rec.seconds as number) * 1000 + Math.floor((rec.nanoseconds as number ?? 0) / 1e6);
    }
    if (typeof rec._seconds === 'number') {
      return (rec._seconds as number) * 1000 + Math.floor((rec._nanoseconds as number ?? 0) / 1e6);
    }
  }
  if (typeof ts === 'string') {
    const parsed = Date.parse(ts);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

// Auth moved to lib/netlify-cron-auth.ts — shared with the
// ceo-refresh-current-affairs function.

/** Netlify scheduled function — fires every 2 hours. Wrapping with
 *  `schedule()` registers the cron at deploy time; the /.netlify/functions/
 *  URL also works for manual invocation (with the secret). */
const handler = schedule('0 */2 * * *', baseHandler);

export { handler };
