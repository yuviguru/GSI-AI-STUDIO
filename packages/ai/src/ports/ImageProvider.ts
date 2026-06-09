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
  /** Reference image URL for identity-preserving EDIT models (Qwen-Image-Edit,
   *  gpt-image, Nano Banana). When set, a reference-capable provider edits this
   *  image into the new `prompt` scene — the mechanism behind cross-page
   *  character consistency. Ignored by plain text-to-image providers. */
  referenceImageUrl?: string;
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
  /** Can do plain text→image. Defaults to true when omitted (all legacy
   *  providers). Reference-only edit models (e.g. Qwen-Image-Edit) set false. */
  readonly supportsText2Img?: boolean;
  /** Accepts a `referenceImageUrl` and preserves that subject's identity in the
   *  output (edit / reference-conditioned models). Defaults to false. */
  readonly supportsReference?: boolean;

  generate(opts: ImageGenerateOptions): Promise<ImageGenerateResult>;
  healthCheck(): Promise<HealthStatus>;
}
