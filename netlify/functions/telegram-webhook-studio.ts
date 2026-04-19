/**
 * Telegram webhook handler for @GSIStudioBot.
 *
 * Same shape as `telegram-webhook-ceo.ts` but for the Studio bot. No feature
 * modules are registered yet — homework, challenge, skills, and notifications
 * will be wired here in later sprints. Until then, `BotRouter`'s built-in
 * help fallback handles every incoming message cleanly.
 *
 * Environment variables:
 *  - TELEGRAM_BOT_TOKEN_STUDIO       (required) — Bot API token for @GSIStudioBot.
 *  - TELEGRAM_WEBHOOK_SECRET_STUDIO  (optional) — Shared secret token sent by
 *    Telegram in `X-Telegram-Bot-Api-Secret-Token`. When set, requests
 *    without a matching header are rejected with 401.
 */

import type { Handler } from '@netlify/functions';
import { BotRouter } from '../../lib/bot/router';
import { TelegramAdapter } from '../../lib/bot/adapters/telegram';

// Instantiate at module load. Netlify warm containers reuse this.
const TOKEN = process.env.TELEGRAM_BOT_TOKEN_STUDIO ?? '';
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET_STUDIO;
// Graceful fallback: if the token is missing at cold start we still construct
// nothing that would throw, and surface the misconfiguration as a 500 at
// request time. This avoids crashing the whole function container.
const telegram = TOKEN
  ? new TelegramAdapter(TOKEN, SECRET ? { secretToken: SECRET } : undefined)
  : null;
const router = new BotRouter();
if (telegram) {
  router.registerAdapter(telegram);
  // TODO: Register homework, challenge, skills, notifications modules when they ship.
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST' || !event.body) {
    return { statusCode: 400, body: 'Bad request' };
  }
  if (!TOKEN || !telegram) {
    return { statusCode: 500, body: 'TELEGRAM_BOT_TOKEN_STUDIO not set' };
  }

  const headers = normalizeHeaders(event.headers);
  if (!telegram.verifySignature(event.body, headers)) {
    return { statusCode: 401, body: 'Invalid signature' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const message = telegram.parseWebhook(parsed, headers);
  if (!message) {
    return { statusCode: 200, body: 'OK' };
  }

  try {
    await router.route(message, 'GSIStudioBot');
    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('[telegram-webhook-studio] route error', err);
    // Return 200 to Telegram so it doesn't retry with the same update_id.
    return { statusCode: 200, body: 'OK (logged)' };
  }
};

function normalizeHeaders(headers: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (typeof v === 'string') out[k.toLowerCase()] = v;
  }
  return out;
}

export { handler };
