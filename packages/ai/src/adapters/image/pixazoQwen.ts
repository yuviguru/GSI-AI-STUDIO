/**
 * Pixazo Qwen-Image-Edit adapter — reference-conditioned, identity-preserving
 * image editing. Same Pixazo key as Flux Schnell. EDIT-only: it requires a
 * `referenceImageUrl` and does NOT do plain text→image, so it's kept out of the
 * txt2img cascade (supportsText2Img=false) and only selected for reference
 * requests (supportsReference=true).
 */

import { editWithPixazoQwen } from '@gsi/ai/pixazoQwenClient';
import { isPixazoConfigured } from '@gsi/ai/pixazoClient';
import type {
  ImageProvider,
  ImageGenerateOptions,
  ImageGenerateResult,
  HealthStatus,
} from '@gsi/ai/ports';

export interface PixazoQwenAdapterConfig {
  name?: string;
  priority?: number;
}

/** ~$0.045 per edit (Pixazo Qwen-Image-Edit, all resolutions). */
const COST_PER_IMAGE = 0.045;

export function makePixazoQwenProvider(cfg: PixazoQwenAdapterConfig = {}): ImageProvider {
  const name = cfg.name ?? 'pixazo-qwen-edit';
  const priority = cfg.priority ?? 2;

  return {
    name,
    priority,
    costTier: 'cheap',
    costPerImage: COST_PER_IMAGE,
    supportsText2Img: false,
    supportsReference: true,

    async generate(opts: ImageGenerateOptions): Promise<ImageGenerateResult> {
      if (!opts.referenceImageUrl) {
        throw new Error('pixazo-qwen-edit requires a referenceImageUrl (edit-only model)');
      }
      const start = Date.now();
      const url = await editWithPixazoQwen({
        referenceImageUrl: opts.referenceImageUrl,
        prompt: opts.prompt,
        negativePrompt: opts.negativePrompt,
      });
      return {
        url,
        costUsd: COST_PER_IMAGE,
        providerName: name,
        latencyMs: Date.now() - start,
      };
    },

    async healthCheck(): Promise<HealthStatus> {
      if (!isPixazoConfigured()) {
        return { healthy: false, checkedAt: Date.now(), reason: 'PIXAZO_API_KEY not configured' };
      }
      return { healthy: true, checkedAt: Date.now() };
    },
  };
}
