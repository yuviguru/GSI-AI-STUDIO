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
import { TelegramAdapter } from '../../../../lib/bot/adapters/telegram';

const DEPLOY_SECRET = process.env.BOT_SETUP_SECRET;
const SITE_URL = process.env.URL ?? process.env.NEXT_PUBLIC_URL ?? '';

/** Command menu for @GSIKidCeoAssistantBot — what kids see in the Telegram
 *  `☰ Menu` button and the `/` autocomplete. Keep descriptions short (under
 *  ~60 chars) and kid-friendly. Keep in sync with `ceoModule.commands` in
 *  `lib/bot/modules/ceo.ts` — the bot won't recognize a command it doesn't
 *  register, and this list won't show one it doesn't advertise. */
const CEO_COMMANDS: Array<{ command: string; description: string }> = [
  { command: 'ceo', description: '🏪 Pick a business to play or start a new one' },
  { command: 'mybusiness', description: '📊 See your business stats (cash, rep, morale)' },
  { command: 'ceoprofile', description: '🧠 Open your CEO Profile Card in the web app' },
  { command: 'link', description: '🔗 Connect this chat with a 6-digit code' },
  { command: 'help', description: '❓ Show every command and what it does' },
  { command: 'start', description: '👋 Welcome message' },
];

/** Command menu for @GSIPersonalAssistantBot — deep-links into each studio,
 *  plus account linking and help. Keep in sync with `studioLinksModule.commands`
 *  in `lib/bot/modules/studioLinks.ts`. */
const STUDIO_COMMANDS: Array<{ command: string; description: string }> = [
  { command: 'story', description: '📖 Write an AI-illustrated story' },
  { command: 'music', description: '🎵 Make a song with lyrics and beats' },
  { command: 'quiz', description: '🧠 Build a quiz on any topic' },
  { command: 'game', description: '🎮 Design a choose-your-own-adventure game' },
  { command: 'comic', description: '💥 Draw a comic strip from your idea' },
  { command: 'creations', description: '🎨 See every creation you have made' },
  { command: 'link', description: '🔗 Connect this chat with a 6-digit code' },
  { command: 'help', description: '❓ Show every command and what it does' },
  { command: 'start', description: '👋 Welcome message' },
];

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
      // Command-menu registration is best-effort — webhook is what actually
      // wires the bot up. If the menu call fails (e.g. Telegram rate-limited
      // us mid-deploy) we still want the bot functional, so we report the
      // menu status separately rather than failing the whole row.
      try {
        await adapter.setMyCommands(CEO_COMMANDS);
        results.ceo = 'registered (webhook + commands)';
      } catch (menuErr) {
        results.ceo = `registered (webhook only — commands failed: ${(menuErr as Error).message})`;
      }
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
      try {
        await adapter.setMyCommands(STUDIO_COMMANDS);
        results.studio = 'registered (webhook + commands)';
      } catch (menuErr) {
        results.studio = `registered (webhook only — commands failed: ${(menuErr as Error).message})`;
      }
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
