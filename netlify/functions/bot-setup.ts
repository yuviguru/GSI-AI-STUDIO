/**
 * One-shot webhook-registration endpoint.
 *
 * Registers the Telegram webhook URL for both @GSIKidCeoAssistantBot and @GSIPersonalAssistantBot
 * with the Telegram Bot API. Call this once per deploy after a new function
 * URL comes online:
 *
 *   curl 'https://<site>.netlify.app/.netlify/functions/bot-setup?secret=<deploy_secret>'
 *
 * Returns a JSON body summarizing the per-bot outcome. Bots whose token env
 * var is unset are skipped rather than erroring, so this function works
 * correctly in environments that only have one of the two bots configured.
 *
 * Environment variables:
 *  - BOT_SETUP_SECRET             (required) — Shared secret required in the
 *    `?secret=` query param or `X-Bot-Setup-Secret` header. Prevents random
 *    callers from re-pointing the webhooks.
 *  - URL or NEXT_PUBLIC_URL       (required) — Base URL of the deployed site
 *    (Netlify injects `URL` automatically).
 *  - TELEGRAM_BOT_TOKEN_CEO       (optional) — Token for @GSIKidCeoAssistantBot.
 *  - TELEGRAM_WEBHOOK_SECRET_CEO  (optional) — Secret token for CEO webhook.
 *  - TELEGRAM_BOT_TOKEN_STUDIO    (optional) — Token for @GSIPersonalAssistantBot.
 *  - TELEGRAM_WEBHOOK_SECRET_STUDIO (optional) — Secret token for Studio webhook.
 */

import type { Handler } from '@netlify/functions';
import { TelegramAdapter } from '../../lib/bot/adapters/telegram';

const DEPLOY_SECRET = process.env.BOT_SETUP_SECRET;
const SITE_URL = process.env.URL ?? process.env.NEXT_PUBLIC_URL ?? '';

const handler: Handler = async (event) => {
  // Require a deploy secret to prevent random internet people hitting setup.
  const providedSecret =
    event.queryStringParameters?.secret ??
    event.headers['x-bot-setup-secret'] ??
    event.headers['X-Bot-Setup-Secret'];

  if (!DEPLOY_SECRET || providedSecret !== DEPLOY_SECRET) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  if (!SITE_URL) {
    return { statusCode: 500, body: 'SITE_URL or NEXT_PUBLIC_URL must be set' };
  }

  const results: Record<string, string> = {};

  // @GSIKidCeoAssistantBot
  const ceoToken = process.env.TELEGRAM_BOT_TOKEN_CEO;
  const ceoSecret = process.env.TELEGRAM_WEBHOOK_SECRET_CEO;
  if (ceoToken) {
    try {
      const adapter = new TelegramAdapter(
        ceoToken,
        ceoSecret ? { secretToken: ceoSecret } : undefined,
      );
      await adapter.registerWebhook(`${SITE_URL}/.netlify/functions/telegram-webhook-ceo`);
      results.ceo = 'registered';
    } catch (err) {
      results.ceo = `failed: ${(err as Error).message}`;
    }
  } else {
    results.ceo = 'skipped (TELEGRAM_BOT_TOKEN_CEO not set)';
  }

  // @GSIPersonalAssistantBot
  const studioToken = process.env.TELEGRAM_BOT_TOKEN_STUDIO;
  const studioSecret = process.env.TELEGRAM_WEBHOOK_SECRET_STUDIO;
  if (studioToken) {
    try {
      const adapter = new TelegramAdapter(
        studioToken,
        studioSecret ? { secretToken: studioSecret } : undefined,
      );
      await adapter.registerWebhook(`${SITE_URL}/.netlify/functions/telegram-webhook-studio`);
      results.studio = 'registered';
    } catch (err) {
      results.studio = `failed: ${(err as Error).message}`;
    }
  } else {
    results.studio = 'skipped (TELEGRAM_BOT_TOKEN_STUDIO not set)';
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(results, null, 2),
  };
};

export { handler };
