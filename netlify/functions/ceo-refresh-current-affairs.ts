/**
 * Scheduled Kid CEO current-affairs refresh.
 *
 * Runs once a day at 00:30 UTC (≈6am IST — right before the milestone
 * delivery cron starts firing at 00:00/02:00/04:00 UTC). Asks the LLM for
 * 12 fresh kid-safe, India-grounded "business story hooks" for the day,
 * and caches them at `currentAffairsDaily/{YYYY-MM-DD}` so milestone-event
 * generation on the hot path (`getCurrentAffairsReadOnly()`) can pull
 * today's themes without hitting the LLM itself.
 *
 * Idempotent: if the doc already exists for today, we still regenerate — a
 * second call later in the day gets fresh hooks. That's fine; we control
 * the spend (1 LLM call/day) and kids who play mid-day get slightly more
 * varied themes than those who play right after the cron.
 *
 * Auth: same pattern as bot-setup — accepts Netlify's scheduled header AND
 * manual calls carrying BOT_SETUP_SECRET.
 *
 * Environment variables:
 *  - BOT_SETUP_SECRET (required) — for manual invocation
 *  - GROQ_API_KEY + ANTHROPIC_API_KEY (required) — LLM providers
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import { schedule } from '@netlify/functions';
import { getOrFreshenCurrentAffairs } from '../../lib/ceo/currentAffairs';

const DEPLOY_SECRET = process.env.BOT_SETUP_SECRET;

const baseHandler: Handler = async (event) => {
  if (!authorized(event)) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  try {
    const themes = await getOrFreshenCurrentAffairs();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        {
          ok: true,
          themeCount: themes.length,
          preview: themes.slice(0, 3).map((t) => t.label),
        },
        null,
        2,
      ),
    };
  } catch (err) {
    console.error('[ceo-refresh-current-affairs] failed:', (err as Error).message);
    return {
      statusCode: 500,
      body: `Failed: ${(err as Error).message}`,
    };
  }
};

function authorized(event: HandlerEvent): boolean {
  const headers = Object.fromEntries(
    Object.entries(event.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]),
  );
  if (headers['x-nf-scheduled-function']) return true;
  const providedSecret =
    event.queryStringParameters?.secret ?? headers['x-bot-setup-secret'];
  return !!DEPLOY_SECRET && providedSecret === DEPLOY_SECRET;
}

/** Daily at 00:30 UTC = ~6am IST. Generates before the milestone delivery
 *  cron starts firing, so the first milestone of any IST morning has fresh
 *  themes to draw from. */
const handler = schedule('30 0 * * *', baseHandler);

export { handler };
