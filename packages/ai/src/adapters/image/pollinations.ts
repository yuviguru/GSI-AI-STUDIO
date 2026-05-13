/**
 * Pollinations image adapter — free, lower quality, last-resort fallback.
 */

import { generateImageFree } from '@gsi/ai/pollinationsClient';
import type {
  ImageProvider,
  ImageGenerateOptions,
  ImageGenerateResult,
  HealthStatus,
} from '@gsi/ai/ports';

export interface PollinationsAdapterConfig {
  name?: string;
  priority?: number;
}

export function makePollinationsProvider(
  cfg: PollinationsAdapterConfig = {},
): ImageProvider {
  const name = cfg.name ?? 'pollinations';
  const priority = cfg.priority ?? 4;

  return {
    name,
    priority,
    costTier: 'free',
    costPerImage: 0,

    async generate(opts: ImageGenerateOptions): Promise<ImageGenerateResult> {
      const start = Date.now();
      const url = await generateImageFree({
        prompt: opts.prompt,
        style: opts.style,
        width: opts.width,
        height: opts.height,
        seed: opts.seed,
      });
      return {
        url,
        costUsd: 0,
        providerName: name,
        latencyMs: Date.now() - start,
      };
    },

    async healthCheck(): Promise<HealthStatus> {
      const start = Date.now();
      try {
        const res = await fetch('https://image.pollinations.ai/', {
          method: 'HEAD',
          signal: AbortSignal.timeout(3000),
        });
        return {
          healthy: res.ok || res.status < 500,
          checkedAt: Date.now(),
          latencyMs: Date.now() - start,
          reason: res.status >= 500 ? `HTTP ${res.status}` : undefined,
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
