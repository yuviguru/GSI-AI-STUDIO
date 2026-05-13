/**
 * ImageRouter — picks the best healthy image provider per request.
 *
 * Same model as LlmRouter: priority + health + retry on failure.
 * Image gen has more "fallback to lower quality" semantics than LLMs (e.g.
 * SDXL → Pollinations is a real quality drop). The router still tries them
 * in priority order; capabilities aren't differentiated yet.
 */

import type {
  ImageProvider,
  ImageGenerateOptions,
  ImageGenerateResult,
  CostTier,
} from '@/lib/ai/ports';
import { tierAtMost } from '@/lib/ai/ports';
import type { HealthMonitor } from './HealthMonitor';
import type { RouterMetricsSink } from './LlmRouter';

export interface ImagePickHints {
  maxCostTier?: CostTier;
  exclude?: Set<string>;
}

export interface RouterImageGenerateOptions extends ImageGenerateOptions {
  routing?: ImagePickHints;
  maxAttempts?: number;
}

export class ImageRouter {
  constructor(
    private readonly providers: ImageProvider[],
    private readonly monitor: HealthMonitor,
    private readonly metrics?: RouterMetricsSink,
  ) {}

  pick(hints: ImagePickHints = {}): ImageProvider {
    const excluded = hints.exclude ?? new Set();
    const candidates = this.providers
      .filter((p) => !excluded.has(p.name))
      .filter((p) => !hints.maxCostTier || tierAtMost(p.costTier, hints.maxCostTier))
      .filter((p) => this.monitor.status(p.name).healthy)
      .sort((a, b) => a.priority - b.priority);

    if (candidates.length === 0) {
      throw new Error('No healthy image provider available');
    }
    return candidates[0]!;
  }

  async generate(opts: RouterImageGenerateOptions): Promise<ImageGenerateResult> {
    const tried = new Set<string>(opts.routing?.exclude ?? []);
    const maxAttempts = opts.maxAttempts ?? this.providers.length;
    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let provider: ImageProvider;
      try {
        provider = this.pick({ ...opts.routing, exclude: tried });
      } catch (err) {
        if (attempt === 0) throw err;
        break;
      }
      tried.add(provider.name);

      try {
        const result = await provider.generate(opts);
        this.monitor.markHealthy(provider.name, result.latencyMs);
        this.metrics?.recordAttempt({
          providerName: result.providerName,
          success: true,
          latencyMs: result.latencyMs,
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
      `All image providers failed: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`,
    );
  }

  health(): Array<{ name: string; priority: number; costTier: string; healthy: boolean }> {
    return this.providers.map((p) => ({
      name: p.name,
      priority: p.priority,
      costTier: p.costTier,
      healthy: this.monitor.status(p.name).healthy,
    }));
  }
}
