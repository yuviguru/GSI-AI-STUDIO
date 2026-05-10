/**
 * OpenAI-compatible LLM adapter — the mega-adapter.
 *
 * Works with ANY provider that exposes the OpenAI Chat Completions API:
 *   - OpenAI (api.openai.com)
 *   - Groq (api.groq.com/openai)
 *   - DeepSeek (api.deepseek.com)
 *   - Together AI, Fireworks, OpenRouter
 *   - Ollama, vLLM, LM Studio (self-hosted)
 *
 * One file → 90% of the LLM ecosystem. Uses `fetch` directly so no SDK
 * dependency is required.
 */

import type {
  LlmProvider,
  GenerateOptions,
  GenerateResult,
  Capability,
  CostTier,
} from '@/lib/ai/ports';
import type { HealthStatus } from '@/lib/ai/ports';

export interface OpenAiCompatibleConfig {
  /** Stable provider name (e.g. "groq-llama-3.3", "openai-gpt-4o-mini"). */
  name: string;
  /** Base URL up to and including `/v1` (e.g. https://api.groq.com/openai/v1). */
  baseUrl: string;
  apiKey: string;
  /** Model identifier as accepted by the upstream provider. */
  model: string;
  priority: number;
  costTier: CostTier;
  costPerMTokIn: number;
  costPerMTokOut: number;
  capabilities?: Capability[];
  /**
   * Some providers (Ollama, vLLM) don't enforce auth or use a different
   * scheme. Override this to skip the Bearer header.
   */
  authScheme?: 'bearer' | 'none';
  /**
   * Some providers ignore `response_format`. Set to false to disable.
   * Default: true.
   */
  supportsJsonMode?: boolean;
}

export function makeOpenAiCompatibleProvider(
  cfg: OpenAiCompatibleConfig,
): LlmProvider {
  const authHeader: Record<string, string> =
    cfg.authScheme === 'none'
      ? {}
      : { Authorization: `Bearer ${cfg.apiKey}` };
  const supportsJsonMode = cfg.supportsJsonMode ?? true;

  const provider: LlmProvider = {
    name: cfg.name,
    priority: cfg.priority,
    costTier: cfg.costTier,
    capabilities: cfg.capabilities ?? ['text', 'json'],
    costPerMTokIn: cfg.costPerMTokIn,
    costPerMTokOut: cfg.costPerMTokOut,

    async generate(opts: GenerateOptions): Promise<GenerateResult> {
      const start = Date.now();
      // For JSON mode without native support, append the standard hint.
      const userMessage =
        opts.responseFormat === 'json' && !supportsJsonMode
          ? `${opts.userMessage}\n\nRespond ONLY with valid JSON. No markdown, no preamble.`
          : opts.userMessage;

      const body: Record<string, unknown> = {
        model: cfg.model,
        max_tokens: opts.maxTokens ?? 2048,
        temperature: opts.temperature ?? 0.7,
        messages: [
          ...(opts.systemPrompt
            ? [{ role: 'system', content: opts.systemPrompt }]
            : []),
          { role: 'user', content: userMessage },
        ],
      };
      if (opts.responseFormat === 'json' && supportsJsonMode) {
        body.response_format = { type: 'json_object' };
      }

      const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          ...authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });

      if (!res.ok) {
        const errBody = await res.text();
        const err = new Error(
          `OpenAI-compatible provider ${cfg.name} returned HTTP ${res.status}: ${errBody.slice(0, 200)}`,
        );
        (err as { status?: number }).status = res.status;
        const retryAfter = res.headers.get('retry-after');
        if (retryAfter) (err as { headers?: Record<string, string> }).headers = { 'retry-after': retryAfter };
        throw err;
      }

      const data = (await res.json()) as {
        choices: Array<{ message: { content: string } }>;
        usage?: { prompt_tokens: number; completion_tokens: number };
      };

      const text = data.choices[0]?.message?.content ?? '';
      const inputTokens = data.usage?.prompt_tokens ?? 0;
      const outputTokens = data.usage?.completion_tokens ?? 0;

      return {
        text,
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
        const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (match?.[1]) return JSON.parse(match[1].trim()) as T;
        throw new Error(
          `${cfg.name} returned invalid JSON: ${cleaned.slice(0, 200)}`,
        );
      }
    },

    async healthCheck(): Promise<HealthStatus> {
      const start = Date.now();
      try {
        const res = await fetch(`${cfg.baseUrl}/models`, {
          method: 'GET',
          headers: authHeader,
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
