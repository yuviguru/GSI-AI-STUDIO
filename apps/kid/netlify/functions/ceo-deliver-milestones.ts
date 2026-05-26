/**
 * Scheduled Kid CEO milestone-event delivery — "TODAY'S BIG CHOICE" cron.
 *
 * Phase 3 Daily Rhythm (decisions D1/D3/D5 locked in
 * `stories/phase-3/KIDCEO-PHASE-3-DECISIONS.md`):
 *   1. Fires every 2h (Netlify schedule). On each invocation, queries
 *      ceoBusiness for `status == 'active'` AND
 *      `nextMilestoneScheduledAt <= now`. Businesses without the new
 *      field (pre-Phase-3) are also picked up via the legacy interval
 *      query until the migration window closes.
 *   2. For each candidate, verifies the scheduled tick is inside the
 *      2h delivery window (so a tick that slipped past the window waits
 *      for the next day's 18:30 IST instead of surprise-pinging at 9pm).
 *   3. If `pendingMilestoneEventId` is set AND it's a stale milestone
 *      from a PRIOR IST day, calls `expireStaleMilestone` to mark it
 *      `status: 'expired'` and apply the D3 scaling penalty (rep -1xM,
 *      morale -1xM, cash -R50xM when category is cash-adjacent).
 *   4. Picks the next milestone, generates + saves via saveCeoEvent
 *      (which also sets `pendingMilestoneEventId` atomically).
 *   5. Stamps `lastMilestoneDeliveredAt` + bumps
 *      `nextMilestoneScheduledAt` to tomorrow's 18:30 IST.
 *   6. Best-effort: pushes a "⭐ TODAY'S BIG CHOICE ⭐" ping to every
 *      linked Telegram chat for the kid. If the bot send fails, the
 *      event is still in Firestore — the kid will find it on web.
 *
 * Delivery window: we target 18:30 IST ± 2h (the 2h tick frequency means
 * we catch the target within one cron tick). A business that misses that
 * window today doesn't get a late-evening surprise — it waits for
 * tomorrow's tick.
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
 *   - CEO_MILESTONE_DELIVERY_HOUR_IST (optional, default 18) — override the
 *                                 daily delivery hour (0-23, IST) without a
 *                                 code change. Minute is locked at 30.
 */

import type { Handler, HandlerContext } from '@netlify/functions';
import { schedule } from '@netlify/functions';
import { isAuthorizedCronCall } from '../../../../lib/netlify-cron-auth';
import { Timestamp } from 'firebase-admin/firestore';
import { TelegramAdapter } from '../../../../lib/bot/adapters/telegram';
import {
  expireStaleMilestone,
  getCeoBusiness,
  getPendingMilestoneForBusiness,
  getRecentEventsForBusiness,
  listBusinessesDueByScheduledAt,
  markMilestoneDelivered,
  saveCeoEvent,
  type StaleMilestoneExpiryResult,
} from '@gsi/firebase/ceoService';
import { generateMilestoneEvent } from '../../../../lib/ceo/eventEngine';
import { pickNextMilestone } from '../../../../lib/ceo/phases';
import {
  DEFAULT_MILESTONE_HOUR_IST,
  DEFAULT_MILESTONE_MINUTE_IST,
  DELIVERY_TOLERANCE_MS,
  isSameIstDay,
} from '../../../../lib/ceo/cadence';
import { findBotSessionsForKid } from '../../../../lib/bot/services/sessionStore';
import type { CeoBusiness, CeoEvent, CeoPace } from '@gsi/types';
import { coerceLegacyPace } from '../../../../lib/ceo/constants';

const DEPLOY_SECRET = process.env.BOT_SETUP_SECRET;
const CEO_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_CEO ?? '';
const CEO_BOT_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET_CEO;

/** Resolve the current delivery hour from env (0-23), falling back to the
 *  D1 default (18 = 6:30 PM IST). Minute is locked at 30. */
function deliveryHourIst(): number {
  const raw = process.env.CEO_MILESTONE_DELIVERY_HOUR_IST;
  if (!raw) return DEFAULT_MILESTONE_HOUR_IST;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 0 || n > 23) return DEFAULT_MILESTONE_HOUR_IST;
  return n;
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
  status:
    | 'delivered'
    | 'skipped-pending-today'
    | 'skipped-out-of-window'
    | 'skipped-no-milestone'
    | 'expired-and-delivered'
    | 'failed';
  reason?: string;
  pushedToChats?: number;
  expiredPenalty?: { reputation: number; morale: number; cash: number; stakesMultiplier: number };
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

  // Phase 3 fixed-hour gate — query by `nextMilestoneScheduledAt <= now`.
  // We fetch up to 3× the per-tick budget so a handful of "not yet due
  // today" candidates can be skipped without starving real deliveries.
  const now = new Date();
  const candidates = await listBusinessesDueByScheduledAt({
    upTo: now,
    limit: MAX_BUSINESSES_PER_RUN * 3,
  });

  const outcomes: DeliveryOutcome[] = [];
  let delivered = 0;

  for (const business of candidates) {
    if (delivered >= MAX_BUSINESSES_PER_RUN) break;

    const pace = coerceLegacyPace(business.pace);
    const scheduledAt = business.nextMilestoneScheduledAt
      ? new Date(
          (business.nextMilestoneScheduledAt as unknown as Timestamp).toMillis?.() ??
            toMillisSafe(business.nextMilestoneScheduledAt),
        )
      : null;

    // Out-of-window guard: the scheduled tick passed and we're already
    // >2h past it. Skip rather than delivering at a weird hour — the next
    // cron tick (max 2h later) will try again once we're back inside a
    // fresh window or we've rolled to tomorrow's target.
    if (scheduledAt && now.getTime() - scheduledAt.getTime() > DELIVERY_TOLERANCE_MS) {
      outcomes.push({
        businessId: business.id,
        kidId: business.kidId,
        pace,
        status: 'skipped-out-of-window',
        reason: `scheduled=${scheduledAt.toISOString()} now=${now.toISOString()}`,
      });
      continue;
    }

    // Already delivered today (same IST day) — short-circuit to avoid
    // a double-mint if the scheduled pointer hasn't rolled yet.
    const lastDelivered = business.lastMilestoneDeliveredAt
      ? new Date(
          (business.lastMilestoneDeliveredAt as unknown as Timestamp).toMillis?.() ??
            toMillisSafe(business.lastMilestoneDeliveredAt),
        )
      : null;
    if (lastDelivered && isSameIstDay(now, lastDelivered)) {
      outcomes.push({
        businessId: business.id,
        kidId: business.kidId,
        pace,
        status: 'skipped-pending-today',
        reason: 'milestone already delivered this IST day',
      });
      continue;
    }

    // Expire yesterday's stale milestone (if any) BEFORE minting today's.
    // Applies the D3 scaling penalty atomically.
    let expiredPenalty: StaleMilestoneExpiryResult['penalty'] | undefined;
    const pendingMilestone = await getPendingMilestoneForBusiness(business.id);
    if (pendingMilestone) {
      const pendingCreatedAt = pendingMilestone.createdAt
        ? new Date(
            (pendingMilestone.createdAt as unknown as Timestamp).toMillis?.() ??
              toMillisSafe(pendingMilestone.createdAt),
          )
        : null;
      if (!pendingCreatedAt || !isSameIstDay(now, pendingCreatedAt)) {
        const expired = await expireStaleMilestone(business.id);
        expiredPenalty = expired?.penalty;
        // Re-fetch the business so downstream uses the post-penalty cash /
        // rep / morale when generating today's milestone context.
        try {
          const refreshed = await getCeoBusiness(business.id);
          Object.assign(business, refreshed);
        } catch {
          // Business vanished mid-loop (deleted) — skip quietly on the
          // next iteration; nothing to deliver to anyway.
        }
      } else {
        // Pending AND same IST day → delivery already happened today,
        // skip.
        outcomes.push({
          businessId: business.id,
          kidId: business.kidId,
          pace,
          status: 'skipped-pending-today',
          reason: `pending milestone ${pendingMilestone.id} from today`,
        });
        continue;
      }
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
        status: expiredPenalty ? 'expired-and-delivered' : 'delivered',
        pushedToChats: event.pushedToChats,
        expiredPenalty,
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
