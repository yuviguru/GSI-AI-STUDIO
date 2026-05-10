/**
 * WhatsApp orchestrator — turns a free-text message into a capability call.
 *
 * Uses the LLM router to extract intent + arguments from the kid/parent's
 * message, then dispatches to the matching capability. Same pattern as the
 * MCP server, except the "MCP client" is here (the LLM picks the tool).
 *
 * Conversational state is per-phone-number; we store the active session in
 * `botSessions` (existing collection) so multi-turn flows work.
 */

import { llmRouter } from '@/lib/ai/router';
import { TOOLS, executeTool } from '@/lib/mcp/tools';
import { sendWhatsAppText } from './client';
import { backend } from '@/lib/backend';

const SYSTEM_PROMPT = `You are the GSI AI Studio WhatsApp assistant for Indian kids (ages 8-17) and their parents. You help them create stories, music, comics, games, and quizzes.

You have access to these tools (don't tell the user about them, just use them):
${TOOLS.map((t) => `- ${t.name}: ${t.description}`).join('\n')}

When a user describes what they want to create, decide which tool to call and extract the parameters. Respond with ONLY a JSON object in this format:

For tool calls:
{ "action": "tool", "tool": "create_story", "args": { "premise": "...", "ageGroup": "8-10" } }

For chat (when no tool fits, or you need clarification):
{ "action": "chat", "message": "Hi! Tell me what you'd like to create — a story, song, comic, quiz, or game?" }

Rules:
- Default ageGroup is "8-10" if not specified
- Keep chat messages short (under 2 sentences) — this is WhatsApp
- Be warm and kid-friendly, but not over-the-top
- If the user's message is unsafe or off-topic, politely redirect to creating something
- Never reveal the JSON format to the user`;

const TYPING_FALLBACK = 'Working on it... give me a moment 🎨';

interface AgentDecision {
  action: 'tool' | 'chat';
  tool?: string;
  args?: Record<string, unknown>;
  message?: string;
}

/**
 * Process an incoming WhatsApp message:
 *   1. Look up or create the bot session for this phone number.
 *   2. Ask the LLM to decide tool-or-chat.
 *   3. If tool: execute it, send the result text + share link back.
 *   4. If chat: forward the LLM's reply to the user.
 */
export async function handleIncomingMessage(args: {
  fromPhone: string;
  text: string;
}): Promise<void> {
  const session = await getOrCreateBotSession(args.fromPhone);

  // Ask the LLM to classify and extract.
  let decision: AgentDecision;
  try {
    decision = await llmRouter.generateJson<AgentDecision>({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: args.text,
      maxTokens: 500,
      routing: { maxCostTier: 'cheap' },
    });
  } catch (err) {
    await sendWhatsAppText({
      to: args.fromPhone,
      body: 'Hmm, my brain hiccuped. Try again in a moment? 🤖',
    });
    console.warn('[whatsapp] LLM classification failed:', err);
    return;
  }

  if (decision.action === 'chat') {
    await sendWhatsAppText({
      to: args.fromPhone,
      body: decision.message || 'What would you like to create today?',
    });
    return;
  }

  // Tool action — acknowledge, then execute (creation can take 10-30s).
  await sendWhatsAppText({ to: args.fromPhone, body: TYPING_FALLBACK });

  const result = await executeTool(decision.tool!, decision.args ?? {}, {
    sessionId: session.id,
    maxCostTier: 'cheap',
  });

  // The first text block in the result has the share URL.
  const replyText =
    result.content
      .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
      .map((c) => c.text)
      .join('\n') ||
    (result.isError ? 'Something went wrong creating that. Try a different idea?' : 'Done!');

  await sendWhatsAppText({ to: args.fromPhone, body: replyText, previewUrl: true });
}

interface BotSession {
  id: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
}

const BOT_SESSIONS = 'botSessions';

async function getOrCreateBotSession(phone: string): Promise<BotSession> {
  const found = await backend.data.query<BotSession>(BOT_SESSIONS, {
    where: [{ field: 'phone', op: 'eq', value: phone }],
    limit: 1,
  });
  if (found.items.length > 0) return found.items[0]!;

  const id = await backend.data.create<BotSession>(BOT_SESSIONS, null, {
    phone,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as BotSession);
  return { id, phone, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}
