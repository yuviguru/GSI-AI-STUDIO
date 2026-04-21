/** Kid CEO + GSI Studio bot layer — context builder.
 *
 *  `BotContext` is the per-message surface that feature modules receive:
 *    - the `BotSession` for this chat (chatId ↔ gsiSessionId binding)
 *    - `getGsiSessionId()` helper (may create one for anonymous chats)
 *    - `getKidProfile()` for Phase-2 authenticated flows
 *    - thin wrappers over the existing Groq → Claude LLM pipeline and
 *      Groq Whisper STT. Bot modules never touch SDKs directly. */

import type {
  BotContext,
  BotIncomingMessage,
  BotSession,
  MessengerAdapter,
} from './types';
import { generateWithGroq } from '@/lib/ai/groqClient';
import { generateWithClaude } from '@/lib/ai/claudeClient';
import { getOrCreateBotSession, touchBotSession } from './services/sessionStore';
import { transcribeVoice } from './services/stt';
import { filterInput, filterOutput } from '@/lib/safety/inputFilter';
import { AppException } from '@/lib/api-utils';
import type { KidProfile } from '@/types';

const UNSAFE_REPLY =
  "Let's try a different idea! Think of something fun and creative — maybe a new business, a cool character, or a kind decision?";

/** Build a BotContext for the given incoming message. Ensures a
 *  `botSessions/{chatId}` doc exists and refreshes its `lastActiveAt`.
 *
 *  `adapter` — when provided, the context routes `downloadVoice` through
 *  the adapter so platform-specific handles (Telegram `file_id`s) resolve
 *  correctly. The router always passes it; tests may omit it and fall
 *  back to the raw-URL path. */
export async function buildBotContext(params: {
  message: BotIncomingMessage;
  botHandle: BotSession['botHandle'];
  adapter?: MessengerAdapter;
}): Promise<BotContext> {
  const { message, botHandle, adapter } = params;

  const session = await getOrCreateBotSession({
    chatId: message.chatId,
    platform: message.platform,
    botHandle,
  });

  await touchBotSession(session.chatId);

  return {
    session,

    async getGsiSessionId() {
      return session.gsiSessionId;
    },

    async getKidProfile(): Promise<KidProfile | null> {
      // Phase 2: resolve the linked kid profile. For Phase 1 the chat is
      // likely anonymous (userId/kidId both null) and this returns null.
      return null;
    },

    async generateText(systemPrompt: string, userPrompt: string): Promise<string> {
      let safeUserPrompt: string;
      try {
        safeUserPrompt = filterInput(userPrompt);
      } catch (err) {
        if (err instanceof AppException && err.code === 'UNSAFE_CONTENT') {
          return UNSAFE_REPLY;
        }
        throw err;
      }

      let raw: string;
      try {
        raw = await generateWithGroq({ systemPrompt, userMessage: safeUserPrompt });
      } catch {
        raw = await generateWithClaude({ systemPrompt, userMessage: safeUserPrompt });
      }

      return filterOutput(raw);
    },

    async transcribeVoice(audioBuffer: Buffer): Promise<string> {
      const result = await transcribeVoice(audioBuffer);
      if (!result) {
        throw new Error('STT_UNAVAILABLE');
      }
      console.log(`[STT] transcribed via ${result.provider}: "${result.text.slice(0, 80)}"`);
      return result.text;
    },

    /** Download the bytes behind a voice / document / photo attachment.
     *
     *  Telegram's webhook payload gives us `file_id` tokens — NOT fetchable
     *  URLs — and the adapter knows how to call `getFile` to resolve them.
     *  Delegating here keeps feature modules platform-agnostic: they hand
     *  us `message.voiceUrl` / `message.documentUrl` without caring whether
     *  it's a real URL (WhatsApp, Discord) or a `file_id` (Telegram). */
    async downloadVoice(voiceUrl: string): Promise<Buffer> {
      if (adapter) {
        return adapter.downloadVoice(voiceUrl);
      }
      // Fallback for test setups that don't wire an adapter — only works
      // when voiceUrl is already a fetchable https:// URL.
      const res = await fetch(voiceUrl);
      if (!res.ok) throw new Error(`Voice download failed: ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    },
  };
}
