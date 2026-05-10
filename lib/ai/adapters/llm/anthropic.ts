/**
 * Anthropic LLM adapter — Claude family.
 *
 * Health check: `GET /v1/models` — free, no tokens consumed.
 * Supports prompt caching via cacheControl: 'ephemeral'.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  LlmProvider,
  GenerateOptions,
  GenerateResult,
  Capability,
  CostTier,
} from '@/lib/ai/ports';
import type { HealthStatus } from '@/lib/ai/ports';

export interface AnthropicAdapterConfig {
  name: string;
  apiKey: string;
  model: string;
  priority: number;
  costTier: CostTier;
  costPerMTokIn: number;
  costPerMTokOut: number;
  capabilities?: Capability[];
}

export function makeAnthropicProvider(cfg: AnthropicAdapterConfig): LlmProvider {
  const client = new Anthropic({ apiKey: cfg.apiKey });

  const provider: LlmProvider = {
    name: cfg.name,
    priority: cfg.priority,
    costTier: cfg.costTier,
    capabilities: cfg.capabilities ?? ['text', 'json', 'tool-use', 'vision'],
    costPerMTokIn: cfg.costPerMTokIn,
    costPerMTokOut: cfg.costPerMTokOut,

    async generate(opts: GenerateOptions): Promise<GenerateResult> {
      const start = Date.now();
      // System prompt — wrap with cache_control if requested.
      const system = opts.cacheControl === 'ephemeral' && opts.systemPrompt
        ? [
            {
              type: 'text' as const,
              text: opts.systemPrompt,
              cache_control: { type: 'ephemeral' as const },
            },
          ]
        : opts.systemPrompt;

      // For JSON mode, append the standard "respond JSON only" instruction
      // (Anthropic doesn't have a strict response_format like OpenAI).
      const userMessage =
        opts.responseFormat === 'json'
          ? `${opts.userMessage}\n\nRespond ONLY with valid JSON. No markdown backticks, no preamble.`
          : opts.userMessage;

      const response = await client.messages.create({
        model: cfg.model,
        max_tokens: opts.maxTokens ?? 2048,
        temperature: opts.temperature ?? 0.7,
        system,
        messages: [{ role: 'user', content: userMessage }],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error(`Anthropic (${cfg.name}) returned no text block`);
      }

      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;

      return {
        text: textBlock.text,
        inputTokens,
        outputTokens,
        costUsd:
          (inputTokens / 1_000_000) * cfg.costPerMTokIn +
          (outputTokens / 1_000_000) * cfg.costPerMTokOut,
        providerName: cfg.name,
        latencyMs: Date.now() - start,
      };
    },

    async generateJson<T>(opts: GenerateOptions): Promise<T> {
      const result = await provider.generate({ ...opts, responseFormat: 'json' });
      const cleaned = result.text.trim();
      try {
        return JSON.parse(cleaned) as T;
      } catch {
        // Fallback: extract from markdown fence.
        const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (match?.[1]) return JSON.parse(match[1].trim()) as T;
        throw new Error(
          `Anthropic (${cfg.name}) returned invalid JSON: ${cleaned.slice(0, 200)}`,
        );
      }
    },

    async healthCheck(): Promise<HealthStatus> {
      const start = Date.now();
      try {
        const res = await fetch('https://api.anthropic.com/v1/models', {
          method: 'GET',
          headers: {
            'x-api-key': cfg.apiKey,
            'anthropic-version': '2023-06-01',
          },
          signal: AbortSignal.timeout(3000),
        });
        return {
          healthy: res.ok,
          checkedAt: Date.now(),
          latencyMs: Date.now() - start,
          rateLimited: res.status === 429,
          reason: res.ok ? undefined : `HTTP ${res.status}`,
        };
      } catch (err) {
        return {
          healthy: false,
          checkedAt: Date.now(),
          reason: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };

  return provider;
}
