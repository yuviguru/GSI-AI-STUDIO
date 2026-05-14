/** Studio deep-link module — powers @GSIPersonalAssistantBot.
 *
 *  Minimal v1: each command replies with a URL that opens the web studio.
 *  The studio runs well on mobile web, so the bot's job is to be a pleasant
 *  entry point (kid types `/story` and gets a one-tap link) rather than to
 *  reimplement the studios in chat.
 *
 *  Future sprints will add homework/challenge/skills modules; this file
 *  coexists with them because each owns different command prefixes.
 *
 *  Note: the bot adapter currently only supports callback-data buttons, not
 *  URL buttons. Links are therefore embedded in message text — Telegram
 *  autolinks URLs, which is good enough for MVP. */

import type { BotFeatureModule, BotIncomingMessage, BotOutgoingMessage } from '@/lib/bot/types';
import { AppException } from '@/lib/api-utils';
import {
  redeemBotLinkCode,
  redeemBotLinkToken,
} from '@gsi/firebase/botLinkService';
import { linkBotSession } from '@/lib/bot/services/sessionStore';

type Send = (msg: BotOutgoingMessage) => Promise<string>;

const BOT_HANDLE = 'GSIPersonalAssistantBot' as const;
const GENERIC_ERROR = 'Something went wrong — try again in a moment!';

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_URL ??
    'https://gsiaistudio.com'
  ).replace(/\/$/, '');
}

function deepLink(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl()}${p}`;
}

interface StudioCard {
  path: string;
  title: string;
  blurb: string;
}

const STUDIOS: Record<string, StudioCard> = {
  '/story': {
    path: '/create/story',
    title: '📖 Story Studio',
    blurb: 'Write an AI-illustrated story in minutes.',
  },
  '/music': {
    path: '/create/music',
    title: '🎵 Music Studio',
    blurb: 'Turn any idea into a song with lyrics and beats.',
  },
  '/quiz': {
    path: '/create/quiz',
    title: '🧠 Quiz Studio',
    blurb: 'Build a quiz on anything you want to learn.',
  },
  '/game': {
    path: '/create/game',
    title: '🎮 Game Studio',
    blurb: 'Make a choose-your-own-adventure game with AI.',
  },
  '/comic': {
    path: '/create/comic',
    title: '💥 Comic Studio',
    blurb: 'Draw a full comic strip from your idea.',
  },
  '/creations': {
    path: '/creations',
    title: '🎨 My Creations',
    blurb: 'Every story, song, quiz, and game you have made.',
  },
};

export const studioLinksModule: BotFeatureModule = {
  id: 'studio-links',
  commands: [
    '/start',
    '/story',
    '/music',
    '/quiz',
    '/game',
    '/comic',
    '/creations',
    '/link',
    '/help',
  ],
  callbackPrefixes: [],

  async handle(message, send) {
    if (message.type !== 'command' || !message.command) return;

    try {
      const studio = STUDIOS[message.command];
      if (studio) {
        return await sendStudioCard(message.chatId, send, studio);
      }

      switch (message.command) {
        case '/start':
          return await handleStart(message, send);
        case '/link':
          return await handleLink(message, send);
        case '/help':
        default:
          return await sendHelp(message.chatId, send);
      }
    } catch (err) {
      console.error('[studio-links] unexpected error:', err);
      await send({
        chatId: message.chatId,
        text: err instanceof AppException ? err.message : GENERIC_ERROR,
      });
    }
  },
};

// ─── Handlers ───────────────────────────────────────────────

async function sendStudioCard(chatId: string, send: Send, studio: StudioCard): Promise<void> {
  await send({
    chatId,
    text: `*${studio.title}*\n${studio.blurb}\n\n${deepLink(studio.path)}`,
    parseMode: 'markdown',
  });
}

async function handleStart(message: BotIncomingMessage, send: Send): Promise<void> {
  const payload = (message.text ?? '').trim();
  const firstToken = payload.split(/\s+/)[0] ?? '';

  // /start link_<token> — deep-link from web "Link Telegram" button.
  if (firstToken.startsWith('link_')) {
    const token = firstToken.slice('link_'.length);
    try {
      const redeemed = await redeemBotLinkToken({
        token,
        chatId: message.chatId,
        botHandle: BOT_HANDLE,
      });
      await linkBotSession({
        chatId: message.chatId,
        gsiSessionId: redeemed.gsiSessionId,
        userId: redeemed.userId,
        kidId: redeemed.kidId,
      });
      await send({
        chatId: message.chatId,
        text: '✅ Linked! This chat is now connected to your web account. Your creations will sync here.',
      });
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
    text: [
      '*Welcome to GSI AI Studio!* 🎨',
      '',
      "I'm your shortcut into the studio where you create with AI.",
      '',
      '📖 /story — write an illustrated story',
      '🎵 /music — make a song',
      '🧠 /quiz — build a quiz',
      '🎮 /game — design a game',
      '💥 /comic — draw a comic',
      '🎨 /creations — see everything you have made',
      '',
      `Open the app: ${deepLink('/')}`,
      '',
      'Got a pairing code from the web? Send `/link 123456`.',
    ].join('\n'),
    parseMode: 'markdown',
  });
}

async function handleLink(message: BotIncomingMessage, send: Send): Promise<void> {
  const parts = (message.text ?? '').trim().split(/\s+/);
  const code = parts[1];

  if (!code || !/^\d{6}$/.test(code)) {
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
    await linkBotSession({
      chatId: message.chatId,
      gsiSessionId: redeemed.gsiSessionId,
      userId: redeemed.userId,
      kidId: redeemed.kidId,
    });
    await send({
      chatId: message.chatId,
      text: '✅ Linked! This chat is now connected to your web account. Your creations will sync here.',
    });
  } catch (err) {
    await send({
      chatId: message.chatId,
      text: err instanceof AppException ? err.message : GENERIC_ERROR,
    });
  }
}

async function sendHelp(chatId: string, send: Send): Promise<void> {
  await send({
    chatId,
    text: [
      '*GSI AI Studio — what can I do?* 🎨',
      '',
      "I'm your shortcut into the studios. Each command opens a creative tool in the web app:",
      '',
      '📖 /story — Write a story with AI — I draw the pictures too.',
      '🎵 /music — Turn any idea into a song with lyrics and beats.',
      '🧠 /quiz — Build a quiz on anything you want to learn.',
      '🎮 /game — Design a choose-your-own-adventure game with AI.',
      '💥 /comic — Draw a comic strip from your story idea.',
      '',
      '🎨 /creations — See every story, song, quiz, and game you have made.',
      '',
      '🔗 /link `123456` — Connect this chat to your web account using a',
      '    6-digit code. Needed once — after that your creations sync here.',
      '',
      '👋 /start — Welcome message, anytime you want to say hi again.',
      '❓ /help — Show this menu.',
    ].join('\n'),
    parseMode: 'markdown',
  });
}
