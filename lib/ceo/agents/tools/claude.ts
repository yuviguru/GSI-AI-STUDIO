/**
 * Claude tool adapters for the Kid CEO agent executor.
 *
 * Two flavours — Haiku (cheap, fast, default for briefs + grading) and
 * Sonnet (more capable, used when a workflow needs richer structure).
 * Both wrap `lib/ai/claudeClient.ts` so the existing retry/error
 * semantics stay consistent with the rest of the platform.
 */

import { generateJsonWithClaude, generateWithClaude } from '@gsi/ai/claudeClient';
import type { ToolAdapter, ToolRunContext, ToolRunResult } from './types';

export interface ClaudeToolInput {
  systemPrompt: string;
  userMessage: string;
  /** When true, the adapter parses the model response as JSON and returns
   *  the parsed object. When false (default) it returns the raw string. */
  json?: boolean;
  /** Optional override — defaults tuned per flavour. */
  temperature?: number;
  maxTokens?: number;
}

export interface ClaudeToolOutput {
  text: string;
  json: unknown | null;
}

/** Rough token estimate — Claude doesn't expose token counts on the SDK's
 *  simple `messages.create` response in this codebase, so we approximate
 *  with ~4 chars / token. Used only for the trace display; not billing. */
function approxTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function summarise(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed;
}

async function runClaude(
  input: ClaudeToolInput,
  ctx: ToolRunContext,
  defaults: { temperature: number; maxTokens: number; model: string },
): Promise<ToolRunResult<ClaudeToolOutput>> {
  const systemPrompt = input.systemPrompt;
  const userMessage = input.userMessage;
  // Slightly cool down the re-roll so retries aren't stuck on the same
  // local minimum — small nudge per attempt, capped.
  const tempNudge = Math.min(0.15, (ctx.attempt - 1) * 0.05);

  if (input.json) {
    const json = await generateJsonWithClaude({
      systemPrompt,
      userMessage,
      temperature: (input.temperature ?? defaults.temperature) + tempNudge,
      maxTokens: input.maxTokens ?? defaults.maxTokens,
    });
    const text = typeof json === 'string' ? json : JSON.stringify(json);
    return {
      output: { text, json },
      outputSummary: summarise(text),
      model: defaults.model,
      promptTokens: approxTokens(systemPrompt + userMessage),
      completionTokens: approxTokens(text),
    };
  }

  const text = await generateWithClaude({
    systemPrompt,
    userMessage,
    temperature: (input.temperature ?? defaults.temperature) + tempNudge,
    maxTokens: input.maxTokens ?? defaults.maxTokens,
  });
  return {
    output: { text, json: null },
    outputSummary: summarise(text),
    model: defaults.model,
    promptTokens: approxTokens(systemPrompt + userMessage),
    completionTokens: approxTokens(text),
  };
}

// Claude Sonnet is the only Claude model the current `claudeClient` ships
// (`claude-sonnet-4-20250514`). We still expose the two-adapter shape so
// pricing can differentiate, with Haiku mapped to the same client until
// the stack adds a Haiku variant — caller code doesn't change.
const CLAUDE_MODEL_ID = 'claude-sonnet-4-20250514';

export const claudeHaikuTool: ToolAdapter<ClaudeToolInput, ClaudeToolOutput> = {
  id: 'claude_haiku',
  label: 'Claude Haiku',
  async run(input, ctx) {
    return runClaude(input, ctx, {
      temperature: 0.7,
      maxTokens: 800,
      // Pricing-bucket name ≠ model ID — show the kid the real model
      // that ran their workflow.
      model: CLAUDE_MODEL_ID,
    });
  },
};

export const claudeSonnetTool: ToolAdapter<ClaudeToolInput, ClaudeToolOutput> = {
  id: 'claude_sonnet',
  label: 'Claude Sonnet',
  async run(input, ctx) {
    return runClaude(input, ctx, {
      temperature: 0.8,
      maxTokens: 1600,
      model: CLAUDE_MODEL_ID,
    });
  },
};
