/** Kid CEO + GSI Studio bot layer — context builder.
 *
 *  `BotContext` is the per-message surface that feature modules receive:
 *    - the `BotSession` for this chat (chatId ↔ gsiSessionId binding)
 *    - `getGsiSessionId()` helper (may create one for anonymous chats)
 *    - `getKidProfile()` for Phase-2 authenticated flows
 *    - thin wrappers over the existing Groq → Claude LLM pipeline and
 *      Groq Whisper STT. Bot modules never touch SDKs directly. */

import type { BotContext, BotIncomingMessage, BotSession } from './types';
import { generateWithGroq } from '@/lib/ai/groqClient';
import { generateWithClaude } from '@/lib/ai/claudeClient';
import { getOrCreateBotSession, touchBotSession } from './services/sessionStore';
import type { KidProfile } from '@/types';

/** Build a BotContext for the given incoming message. Ensures a
 *  `botSessions/{chatId}` doc exists and refreshes its `lastActiveAt`. */
export async function buildBotContext(params: {
  message: BotIncomingMessage;
  botHandle: BotSession['botHandle'];
}): Promise<BotContext> {
  const { message, botHandle } = params;

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
      try {
        return await generateWithGroq({ systemPrompt, userMessage: userPrompt });
      } catch {
        return generateWithClaude({ systemPrompt, userMessage: userPrompt });
      }
    },

    async transcribeVoice(audioBuffer: Buffer): Promise<string> {
      // Groq Whisper wrapper — kept as a stub until a Groq STT client is added.
      // Homework module will wire this up in its sprint.
      void audioBuffer;
      throw new Error('Voice transcription not yet wired. Install a Whisper STT client in lib/bot/services/stt.ts.');
    },

    async downloadVoice(voiceUrl: string): Promise<Buffer> {
      const res = await fetch(voiceUrl);
      if (!res.ok) throw new Error(`Voice download failed: ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    },
  };
}
