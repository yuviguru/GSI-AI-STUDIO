/**
 * Replicate SDXL image adapter — paid fallback for Pixazo.
 */

import { generateImage } from '@/lib/ai/replicateClient';
import type {
  ImageProvider,
  ImageGenerateOptions,
  ImageGenerateResult,
  HealthStatus,
} from '@/lib/ai/ports';

export interface ReplicateAdapterConfig {
  name?: string;
  apiToken: string;
  priority?: number;
  /** Per-image cost. SDXL on Replicate is ~$0.0027 in 2026. */
  costPerImage?: number;
}

export function makeReplicateProvider(cfg: ReplicateAdapterConfig): ImageProvider {
  const name = cfg.name ?? 'replicate-sdxl';
  const priority = cfg.priority ?? 3;
  const costPerImage = cfg.costPerImage ?? 0.0027;

  return {
    name,
    priority,
    costTier: 'cheap',
    costPerImage,

    async generate(opts: ImageGenerateOptions): Promise<ImageGenerateResult> {
      const start = Date.now();
      const url = await generateImage({
        prompt: opts.prompt,
        style: opts.style,
        width: opts.width,
        height: opts.height,
        seed: opts.seed,
      });
      return {
        url,
        costUsd: costPerImage,
        providerName: name,
        latencyMs: Date.now() - start,
      };
    },

    async healthCheck(): Promise<HealthStatus> {
      const start = Date.now();
      try {
        const res = await fetch('https://api.replicate.com/v1/account', {
          method: 'GET',
          headers: { Authorization: `Bearer ${cfg.apiToken}` },
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
}
