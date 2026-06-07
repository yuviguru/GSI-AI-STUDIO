/**
 * Nano Banana (Google Gemini Flash Image) adapter — PREMIUM reference-capable
 * image provider. Does both text→image and identity-preserving reference edits.
 * Gated on GEMINI_API_KEY.
 */

import { generateWithGeminiImage, isGeminiImageConfigured } from '@gsi/ai/geminiImageClient';
import type {
  ImageProvider,
  ImageGenerateOptions,
  ImageGenerateResult,
  HealthStatus,
} from '@gsi/ai/ports';

export interface NanoBananaAdapterConfig {
  name?: string;
  priority?: number;
}

/** ~$0.08 per image (Gemini Flash Image, 1K). */
const COST_PER_IMAGE = 0.08;

export function makeNanoBananaProvider(cfg: NanoBananaAdapterConfig = {}): ImageProvider {
  const name = cfg.name ?? 'nano-banana';
  const priority = cfg.priority ?? 5;

  return {
    name,
    priority,
    costTier: 'premium',
    costPerImage: COST_PER_IMAGE,
    supportsText2Img: true,
    supportsReference: true,

    async generate(opts: ImageGenerateOptions): Promise<ImageGenerateResult> {
      const start = Date.now();
      const url = await generateWithGeminiImage({
        prompt: opts.prompt,
        referenceImageUrl: opts.referenceImageUrl,
      });
      return { url, costUsd: COST_PER_IMAGE, providerName: name, latencyMs: Date.now() - start };
    },

    async healthCheck(): Promise<HealthStatus> {
      return isGeminiImageConfigured()
        ? { healthy: true, checkedAt: Date.now() }
        : { healthy: false, checkedAt: Date.now(), reason: 'GEMINI_API_KEY not configured' };
    },
  };
}
