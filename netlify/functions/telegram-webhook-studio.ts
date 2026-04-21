/**
 * Telegram webhook handler for @GSIPersonalAssistantBot.
 *
 * Registers studio deep-link commands + the interactive homework helper.
 * Challenge, skills, and notifications modules will be added in later
 * sprints — order of registration doesn't matter (the router dispatches
 * by command/prefix/forward-predicate).
 *
 * Environment variables:
 *  - TELEGRAM_BOT_TOKEN_STUDIO       (required) — Bot API token for @GSIPersonalAssistantBot.
 *  - TELEGRAM_WEBHOOK_SECRET_STUDIO  (optional) — Shared secret token sent by
 *    Telegram in `X-Telegram-Bot-Api-Secret-Token`. When set, requests
 *    without a matching header are rejected with 401.
 */

import type { Handler } from '@netlify/functions';
import { BotRouter } from '../../lib/bot/router';
import { TelegramAdapter } from '../../lib/bot/adapters/telegram';
import { studioLinksModule } from '../../lib/bot/modules/studioLinks';
import { homeworkModule } from '../../lib/bot/modules/homework';

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
  router.registerModule(studioLinksModule);
  router.registerModule(homeworkModule);
  // Future: register challenge, skills, notifications modules here.
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
    await router.route(message, 'GSIPersonalAssistantBot');
    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    const raw = parsed as { update_id?: number | string };
    console.error(
      '[telegram-webhook-studio] route error',
      JSON.stringify({
        chatId: message.chatId,
        updateId: raw?.update_id,
        errorMessage: (err as Error).message,
        errorName: (err as Error).name,
      }),
    );
    try {
      await telegram.send({
        chatId: message.chatId,
        text: 'Something went wrong on my side. Try again in a moment.',
      });
    } catch (sendErr) {
      console.error('[telegram-webhook-studio] fallback send also failed', sendErr);
    }
    return { statusCode: 200, body: 'OK (error logged + user notified)' };
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
