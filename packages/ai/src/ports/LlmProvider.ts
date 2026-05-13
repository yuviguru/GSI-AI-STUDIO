/**
 * LlmProvider port — backend-neutral text generation interface.
 *
 * One adapter per provider (Anthropic, OpenAI-compatible mega-adapter for
 * Groq/OpenAI/DeepSeek/etc., Ollama, ...). The router picks at request time
 * based on priority + health + cost tier.
 *
 * Health checks are cheap (free /v1/models endpoint where available, or a
 * 1-token probe as last resort). Routers consult cached HealthStatus, NOT
 * a fresh probe per request.
 */

import type { CostTier, HealthStatus, ProviderMeta } from './common';

export type Capability =
  | 'text'
  | 'json'
  | 'tool-use'
  | 'vision'
  | 'long-context';

export interface GenerateOptions {
  systemPrompt?: string;
  userMessage: string;
  /** Hard ceiling on output tokens. */
  maxTokens?: number;
  /** Sampling temperature (0–1, provider may clamp). */
  temperature?: number;
  /** Force structured output (JSON-only). */
  responseFormat?: 'text' | 'json';
  /** Optional JSON schema hint (provider may or may not support strict mode). */
  schema?: object;
  /**
   * Anthropic-only: ephemeral prompt cache marker. Adapters that don't
   * support caching ignore this. When set, the adapter wraps the system
   * prompt (and any other long static content) with cache_control.
   */
  cacheControl?: 'ephemeral';
}

export interface GenerateResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  /** USD cost computed from the provider's per-token rates. 0 for free. */
  costUsd: number;
  /** The actual provider that served this — populated by the adapter. */
  providerName: string;
  /** End-to-end latency including network. */
  latencyMs: number;
}

export interface LlmProvider extends ProviderMeta {
  readonly capabilities: Capability[];
  readonly costPerMTokIn: number;
  readonly costPerMTokOut: number;

  generate(opts: GenerateOptions): Promise<GenerateResult>;
  /**
   * Convenience wrapper: forces JSON response and parses the result.
   * Throws if the model returns invalid JSON.
   */
  generateJson<T>(opts: GenerateOptions): Promise<T>;
  /**
   * Cheap probe — should NOT cost LLM tokens unless the provider has no
   * free endpoint. Adapters typically GET /v1/models or equivalent.
   */
  healthCheck(): Promise<HealthStatus>;
}

export type { CostTier };
