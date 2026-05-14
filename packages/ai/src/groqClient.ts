import Groq from 'groq-sdk';

let client: Groq | null = null;

function getClient(): Groq {
  if (!client) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY not set');
    client = new Groq({ apiKey });
  }
  return client;
}

interface GroqOptions {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
}

export async function generateWithGroq({
  systemPrompt,
  userMessage,
  maxTokens = 2048,
  temperature = 0.7,
}: GroqOptions): Promise<string> {
  const groq = getClient();

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: maxTokens,
    temperature,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error('No text response from Groq');
  return text;
}

export async function generateJsonWithGroq<T>(options: GroqOptions): Promise<T> {
  const text = await generateWithGroq({
    ...options,
    systemPrompt: `${options.systemPrompt}\n\nRespond ONLY with valid JSON. No markdown backticks, no preamble.`,
  });

  try {
    return JSON.parse(text.trim()) as T;
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match?.[1]) {
      return JSON.parse(match[1].trim()) as T;
    }
    throw new Error(`Failed to parse Groq JSON response: ${text.slice(0, 200)}`);
  }
}
