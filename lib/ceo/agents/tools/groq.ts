/**
 * Groq tool adapter — cheap-fast Llama 3.3-70B for brief expansion and
 * grading steps that don't need Claude-level nuance. Wraps the shared
 * `lib/ai/groqClient.ts` so retries + error semantics stay consistent.
 */

import { generateJsonWithGroq, generateWithGroq } from '@gsi/ai/groqClient';
import type { ToolAdapter, ToolRunContext, ToolRunResult } from './types';

export interface GroqToolInput {
  systemPrompt: string;
  userMessage: string;
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface GroqToolOutput {
  text: string;
  json: unknown | null;
}

function approxTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function summarise(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed;
}

const GROQ_MODEL_ID = 'llama-3.3-70b-versatile';

export const groqLlamaTool: ToolAdapter<GroqToolInput, GroqToolOutput> = {
  id: 'groq_llama',
  label: 'Llama 3.3 70B (Groq)',
  async run(input, ctx: ToolRunContext): Promise<ToolRunResult<GroqToolOutput>> {
    const temperature =
      (input.temperature ?? 0.7) + Math.min(0.15, (ctx.attempt - 1) * 0.05);
    const maxTokens = input.maxTokens ?? 1200;

    if (input.json) {
      const json = await generateJsonWithGroq({
        systemPrompt: input.systemPrompt,
        userMessage: input.userMessage,
        temperature,
        maxTokens,
      });
      const text = typeof json === 'string' ? json : JSON.stringify(json);
      return {
        output: { text, json },
        outputSummary: summarise(text),
        model: GROQ_MODEL_ID,
        promptTokens: approxTokens(input.systemPrompt + input.userMessage),
        completionTokens: approxTokens(text),
      };
    }

    const text = await generateWithGroq({
      systemPrompt: input.systemPrompt,
      userMessage: input.userMessage,
      temperature,
      maxTokens,
    });
    return {
      output: { text, json: null },
      outputSummary: summarise(text),
      model: GROQ_MODEL_ID,
      promptTokens: approxTokens(input.systemPrompt + input.userMessage),
      completionTokens: approxTokens(text),
    };
  },
};
