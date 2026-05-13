/**
 * LlmRouter — picks the best healthy LLM provider per request.
 *
 * Selection algorithm:
 *  1. Filter by required capability (e.g. 'json', 'vision').
 *  2. Filter by `maxCostTier` ceiling (free users → cheap only).
 *  3. Filter by health (skip providers marked unhealthy / rate-limited).
 *  4. Sort by priority (lower = preferred).
 *  5. Pick the top candidate.
 *
 * On generate failure: fall through to next-best candidate, up to N attempts.
 * Marks providers unhealthy reactively from real request errors.
 */

import type {
  LlmProvider,
  GenerateOptions,
  GenerateResult,
  Capability,
  CostTier,
} from '@gsi/ai/ports';
import { tierAtMost } from '@gsi/ai/ports';
import type { HealthMonitor } from './HealthMonitor';

export interface PickHints {
  capability?: Capability;
  /** Don't pick providers above this cost tier. */
  maxCostTier?: CostTier;
  /** Excluded providers (used for retry — don't repeat the failed one). */
  exclude?: Set<string>;
}

export interface RouterGenerateOptions extends GenerateOptions {
  /** Per-call hints — typically `maxCostTier` based on the user's plan. */
  routing?: PickHints;
  /** Max retries across providers. Default: providers.length. */
  maxAttempts?: number;
}

export interface RouterMetricsSink {
  /** Called after every generate attempt — successful or failed. */
  recordAttempt(event: {
    providerName: string;
    success: boolean;
    latencyMs: number;
    inputTokens?: number;
    outputTokens?: number;
    costUsd?: number;
    error?: string;
  }): void;
}

export class LlmRouter {
  constructor(
    private readonly providers: LlmProvider[],
    private readonly monitor: HealthMonitor,
    private readonly metrics?: RouterMetricsSink,
  ) {}

  /** Synchronously pick a provider. Throws if none are eligible. */
  pick(hints: PickHints = {}): LlmProvider {
    const excluded = hints.exclude ?? new Set();
    const candidates = this.providers
      .filter((p) => !excluded.has(p.name))
      .filter((p) => !hints.capability || p.capabilities.includes(hints.capability))
      .filter((p) => !hints.maxCostTier || tierAtMost(p.costTier, hints.maxCostTier))
      .filter((p) => this.monitor.status(p.name).healthy)
      .sort((a, b) => a.priority - b.priority);

    if (candidates.length === 0) {
      throw new Error(
        'No healthy LLM provider available' +
          (hints.capability ? ` for capability '${hints.capability}'` : '') +
          (hints.maxCostTier ? ` at tier ≤'${hints.maxCostTier}'` : ''),
      );
    }
    return candidates[0]!;
  }

  /** Generate text with auto-pick + cross-provider retry on transient failures. */
  async generate(opts: RouterGenerateOptions): Promise<GenerateResult> {
    const tried = new Set<string>(opts.routing?.exclude ?? []);
    const maxAttempts = opts.maxAttempts ?? this.providers.length;
    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let provider: LlmProvider;
      try {
        provider = this.pick({ ...opts.routing, exclude: tried });
      } catch (err) {
        if (attempt === 0) throw err; // No candidates from the start.
        break; // Exhausted candidates after retries.
      }
      tried.add(provider.name);

      try {
        const result = await provider.generate(opts);
        this.monitor.markHealthy(provider.name, result.latencyMs);
        this.metrics?.recordAttempt({
          providerName: result.providerName,
          success: true,
          latencyMs: result.latencyMs,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          costUsd: result.costUsd,
        });
        return result;
      } catch (err) {
        lastError = err;
        this.monitor.markUnhealthyFromError(provider.name, err);
        this.metrics?.recordAttempt({
          providerName: provider.name,
          success: false,
          latencyMs: 0,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    throw new Error(
      `All LLM providers failed: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`,
    );
  }

  /** Convenience: generate + parse JSON. */
  async generateJson<T>(opts: RouterGenerateOptions): Promise<T> {
    const result = await this.generate({ ...opts, responseFormat: 'json' });
    try {
      return JSON.parse(result.text) as T;
    } catch (err) {
      throw new Error(
        `LLM (${result.providerName}) returned invalid JSON: ${
          err instanceof Error ? err.message : String(err)
        }\nResponse: ${result.text.slice(0, 500)}`,
      );
    }
  }

  /** Diagnostic: list all providers + their current health. */
  health(): Array<{ name: string; priority: number; costTier: string; healthy: boolean }> {
    return this.providers.map((p) => ({
      name: p.name,
      priority: p.priority,
      costTier: p.costTier,
      healthy: this.monitor.status(p.name).healthy,
    }));
  }
}
