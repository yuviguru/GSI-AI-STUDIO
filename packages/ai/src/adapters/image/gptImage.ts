/**
 * gpt-image (OpenAI) adapter — PREMIUM reference-capable image provider. Does
 * both text→image and identity-preserving reference edits. Gated on
 * OPENAI_API_KEY.
 */

import { generateWithOpenAiImage, isOpenAiImageConfigured } from '@gsi/ai/openaiImageClient';
import type {
  ImageProvider,
  ImageGenerateOptions,
  ImageGenerateResult,
  HealthStatus,
} from '@gsi/ai/ports';

export interface GptImageAdapterConfig {
  name?: string;
  priority?: number;
}

/** ~$0.04–0.07 per image depending on size (gpt-image-1). */
const COST_PER_IMAGE = 0.05;

export function makeGptImageProvider(cfg: GptImageAdapterConfig = {}): ImageProvider {
  const name = cfg.name ?? 'gpt-image';
  const priority = cfg.priority ?? 6;

  return {
    name,
    priority,
    costTier: 'premium',
    costPerImage: COST_PER_IMAGE,
    supportsText2Img: true,
    supportsReference: true,

    async generate(opts: ImageGenerateOptions): Promise<ImageGenerateResult> {
      const start = Date.now();
      const url = await generateWithOpenAiImage({
        prompt: opts.prompt,
        referenceImageUrl: opts.referenceImageUrl,
        width: opts.width,
        height: opts.height,
      });
      return { url, costUsd: COST_PER_IMAGE, providerName: name, latencyMs: Date.now() - start };
    },

    async healthCheck(): Promise<HealthStatus> {
      return isOpenAiImageConfigured()
        ? { healthy: true, checkedAt: Date.now() }
        : { healthy: false, checkedAt: Date.now(), reason: 'OPENAI_API_KEY not configured' };
    },
  };
}
