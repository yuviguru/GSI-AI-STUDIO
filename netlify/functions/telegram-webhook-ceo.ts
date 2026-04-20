/**
 * Telegram webhook handler for @GSIKidCeoAssistantBot.
 *
 * Receives update payloads from Telegram, verifies the optional secret-token
 * header, normalizes the update into a `BotIncomingMessage`, and routes it
 * through a `BotRouter` that has the CEO module registered.
 *
 * Always returns 200 once the request has been accepted — Telegram retries
 * with the same `update_id` on non-2xx responses, which would cause duplicate
 * processing for transient downstream failures.
 *
 * Environment variables:
 *  - TELEGRAM_BOT_TOKEN_CEO       (required) — Bot API token for @GSIKidCeoAssistantBot.
 *  - TELEGRAM_WEBHOOK_SECRET_CEO  (optional) — Shared secret token sent by
 *    Telegram in `X-Telegram-Bot-Api-Secret-Token`. When set, requests
 *    without a matching header are rejected with 401.
 */

import type { Handler } from '@netlify/functions';
import { BotRouter } from '../../lib/bot/router';
import { TelegramAdapter } from '../../lib/bot/adapters/telegram';
import { ceoModule } from '../../lib/bot/modules/ceo';

// Instantiate at module load. Netlify warm containers reuse this.
const TOKEN = process.env.TELEGRAM_BOT_TOKEN_CEO ?? '';
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET_CEO;
// Graceful fallback: if the token is missing at cold start we still construct
// nothing that would throw, and surface the misconfiguration as a 500 at
// request time. This avoids crashing the whole function container.
const telegram = TOKEN
  ? new TelegramAdapter(TOKEN, SECRET ? { secretToken: SECRET } : undefined)
  : null;
const router = new BotRouter();
if (telegram) {
  router.registerAdapter(telegram);
  router.registerModule(ceoModule);
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST' || !event.body) {
    return { statusCode: 400, body: 'Bad request' };
  }
  if (!TOKEN || !telegram) {
    return { statusCode: 500, body: 'TELEGRAM_BOT_TOKEN_CEO not set' };
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
    await router.route(message, 'GSIKidCeoAssistantBot');
    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    // Log with enough context for on-call grep. chatId + updateId narrow
    // down which kid's message hit which code path.
    const raw = parsed as { update_id?: number | string };
    console.error(
      '[telegram-webhook-ceo] route error',
      JSON.stringify({
        chatId: message.chatId,
        updateId: raw?.update_id,
        errorMessage: (err as Error).message,
        errorName: (err as Error).name,
      }),
    );
    // Best-effort: tell the kid something went wrong so they don't stare
    // at silence. A failure to send this fallback is itself caught so the
    // webhook still returns 200 and Telegram doesn't retry.
    try {
      await telegram.send({
        chatId: message.chatId,
        text: 'Something went wrong on my side. Try again in a moment.',
      });
    } catch (sendErr) {
      console.error('[telegram-webhook-ceo] fallback send also failed', sendErr);
    }
    // Return 200 so Telegram doesn't retry the same update_id — the kid
    // already saw the error toast (or at least we tried), and retrying a
    // genuine bug would just burn the same code path again.
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
