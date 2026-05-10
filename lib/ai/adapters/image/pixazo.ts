/**
 * Pixazo image adapter — current PRIMARY image provider.
 * Wraps the existing pixazoClient behind the ImageProvider port.
 */

import { generateWithPixazo, isPixazoConfigured } from '@/lib/ai/pixazoClient';
import type {
  ImageProvider,
  ImageGenerateOptions,
  ImageGenerateResult,
  HealthStatus,
} from '@/lib/ai/ports';

export interface PixazoAdapterConfig {
  name?: string;
  priority?: number;
}

export function makePixazoProvider(cfg: PixazoAdapterConfig = {}): ImageProvider {
  const name = cfg.name ?? 'pixazo-flux-schnell';
  const priority = cfg.priority ?? 1;

  return {
    name,
    priority,
    costTier: 'free',
    costPerImage: 0,

    async generate(opts: ImageGenerateOptions): Promise<ImageGenerateResult> {
      const start = Date.now();
      const url = await generateWithPixazo({
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
      // Pixazo doesn't have a documented status endpoint. We probe the
      // endpoint with a HEAD/OPTIONS request — most APIs respond.
      const endpoint =
        process.env.PIXAZO_API_ENDPOINT ?? 'https://gateway.pixazo.ai/flux-1-schnell/v1/getData';
      try {
        if (!isPixazoConfigured()) {
          return {
            healthy: false,
            checkedAt: Date.now(),
            reason: 'PIXAZO_API_KEY not configured',
          };
        }
        const res = await fetch(endpoint, {
          method: 'OPTIONS',
          signal: AbortSignal.timeout(3000),
        }).catch(() => null);
        // Even a 4xx response means the endpoint is reachable.
        if (res) {
          return {
            healthy: res.status < 500,
            checkedAt: Date.now(),
            latencyMs: Date.now() - start,
            reason: res.status >= 500 ? `HTTP ${res.status}` : undefined,
          };
        }
        return {
          healthy: false,
          checkedAt: Date.now(),
          reason: 'unreachable',
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
