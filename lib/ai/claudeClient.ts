import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
    client = new Anthropic({ apiKey });
  }
  return client;
}

interface ClaudeOptions {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
}

export async function generateWithClaude({
  systemPrompt,
  userMessage,
  maxTokens = 2048,
  temperature = 0.7,
}: ClaudeOptions): Promise<string> {
  const claude = getClient();

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  return textBlock.text;
}

export async function generateJsonWithClaude<T>(options: ClaudeOptions): Promise<T> {
  const text = await generateWithClaude({
    ...options,
    systemPrompt: `${options.systemPrompt}\n\nRespond ONLY with valid JSON. No markdown backticks, no preamble.`,
  });

  try {
    return JSON.parse(text.trim()) as T;
  } catch {
    // Try extracting JSON from potential markdown wrapper
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match?.[1]) {
      return JSON.parse(match[1].trim()) as T;
    }
    throw new Error(`Failed to parse Claude JSON response: ${text.slice(0, 200)}`);
  }
}
