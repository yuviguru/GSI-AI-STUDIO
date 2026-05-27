/**
 * Scheduled function — weekly homework digest.
 *
 * Runs once per week (Sunday 19:00 IST = 13:30 UTC) and DMs every linked
 * @GSIPersonalAssistantBot chat that had homework activity in the last 7
 * days. Can also be invoked on-demand via HTTP with a shared secret for
 * ad-hoc reruns + manual testing.
 *
 * Schedule: `netlify.toml` → `[functions."homework-weekly-digest"]
 *   schedule = "30 13 * * 0"`
 *
 * Environment:
 *  - TELEGRAM_BOT_TOKEN_STUDIO  (required for sending digests)
 *  - WEEKLY_DIGEST_SECRET       (required for manual HTTP invocations)
 */

import type { Handler } from '@netlify/functions';
import { runWeeklyDigest } from '../../../../lib/bot/digests/weeklyHomeworkDigest';

const DIGEST_SECRET = process.env.WEEKLY_DIGEST_SECRET;

const handler: Handler = async (event) => {
  const isScheduled = event.headers['x-netlify-event'] === 'schedule';

  if (!isScheduled) {
    // Manual invocation — gate behind a deploy secret so random callers
    // can't spam the entire user base with digests.
    const provided =
      event.queryStringParameters?.secret ??
      event.headers['x-weekly-digest-secret'] ??
      event.headers['X-Weekly-Digest-Secret'];
    if (!DIGEST_SECRET || provided !== DIGEST_SECRET) {
      return { statusCode: 401, body: 'Unauthorized' };
    }
  }

  try {
    const result = await runWeeklyDigest();
    const body = JSON.stringify(result, null, 2);
    console.log('[weekly-digest] run complete:', body);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body,
    };
  } catch (err) {
    console.error('[weekly-digest] run failed:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: (err as Error).message }),
    };
  }
};

export { handler };
