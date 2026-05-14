/**
 * ImageProvider port — backend-neutral image generation.
 *
 * Adapters: Pixazo (Flux Schnell — current primary), ComfyUI (local),
 * Replicate SDXL (paid fallback), Pollinations (free, lower quality).
 *
 * The router cascades: try the highest-priority healthy adapter; on
 * failure, fall through to the next.
 */

import type { HealthStatus, ProviderMeta } from './common';

export type ImageStyle = 'watercolor' | 'cartoon' | 'pixel-art' | 'comic';

export interface ImageGenerateOptions {
  prompt: string;
  style?: ImageStyle;
  width: number;
  height: number;
  /** Pinning a seed across pages of a story keeps characters/palette consistent. */
  seed?: number;
  negativePrompt?: string;
}

export interface ImageGenerateResult {
  /** Public URL or data URI of the generated image. */
  url: string;
  /** USD cost for this single image. 0 for free providers. */
  costUsd: number;
  /** Adapter that served the image — populated by the adapter. */
  providerName: string;
  latencyMs: number;
}

export interface ImageProvider extends ProviderMeta {
  readonly costPerImage: number;

  generate(opts: ImageGenerateOptions): Promise<ImageGenerateResult>;
  healthCheck(): Promise<HealthStatus>;
}
