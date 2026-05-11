/**
 * ComfyUI image adapter — local Flux Schnell, fastest in dev.
 * Only enabled when COMFYUI_URL is set.
 */

import { generateImageLocal } from '@/lib/ai/comfyuiClient';
import type {
  ImageProvider,
  ImageGenerateOptions,
  ImageGenerateResult,
  HealthStatus,
} from '@/lib/ai/ports';

export interface ComfyUiAdapterConfig {
  name?: string;
  baseUrl: string;
  priority?: number;
}

export function makeComfyUiProvider(cfg: ComfyUiAdapterConfig): ImageProvider {
  const name = cfg.name ?? 'comfyui-flux-local';
  const priority = cfg.priority ?? 0;

  return {
    name,
    priority,
    costTier: 'free',
    costPerImage: 0,

    async generate(opts: ImageGenerateOptions): Promise<ImageGenerateResult> {
      const start = Date.now();
      // ComfyUI client doesn't take a seed yet — local model already
      // produces consistent runs. Skip until upstream client supports it.
      const url = await generateImageLocal({
        prompt: opts.prompt,
        style: opts.style,
        width: opts.width,
        height: opts.height,
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
        const res = await fetch(`${cfg.baseUrl}/system_stats`, {
          method: 'GET',
          signal: AbortSignal.timeout(2000),
        });
        return {
          healthy: res.ok,
          checkedAt: Date.now(),
          latencyMs: Date.now() - start,
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
