/**
 * Unified Image Provider — single entry point for all image sourcing.
 *
 * Reads `IMAGE_MODE` env var to decide strategy:
 *
 *   IMAGE_MODE=generate  (default) → AI-generated images
 *     Priority: ComfyUI (local FLUX) → Replicate (SDXL) → Pollinations (free)
 *
 *   IMAGE_MODE=search → Fetch stock photos matching the prompt
 *     Priority: Pexels → Unsplash → SVG fallback
 *
 * Both modes return the same interface: (opts) => Promise<string>
 * so the story/comic routes don't need to know which mode is active.
 */

import { generateImage } from './replicateClient';
import { generateImageFree } from './pollinationsClient';
import { generateImageLocal } from './comfyuiClient';
import { searchImage } from './imageSearchClient';

export type ImageStyle = 'watercolor' | 'cartoon' | 'pixel-art' | 'comic';

export interface ImageOptions {
  prompt: string;
  style: ImageStyle;
  width: number;
  height: number;
}

export type ImageFunction = (opts: ImageOptions) => Promise<string>;

// ─── Provider detection helpers ──────────────────────────────

function shouldUseComfyUI(): boolean {
  return !!process.env.COMFYUI_URL;
}

function shouldUseReplicate(): boolean {
  return !!process.env.REPLICATE_API_TOKEN && !process.env.REPLICATE_API_TOKEN?.includes('your-token');
}

function getImageMode(): 'generate' | 'search' {
  const mode = process.env.IMAGE_MODE?.toLowerCase();
  if (mode === 'search') return 'search';
  return 'generate'; // default
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Returns the image function + provider name based on current config.
 *
 * Usage in routes:
 * ```ts
 * const { imageFunction, providerName } = getImageProvider();
 * const url = await imageFunction({ prompt, style, width, height });
 * ```
 */
export function getImageProvider(): { imageFunction: ImageFunction; providerName: string } {
  const mode = getImageMode();

  if (mode === 'search') {
    return { imageFunction: searchImage, providerName: 'search (pexels/unsplash)' };
  }

  // Generate mode — pick best available provider
  if (shouldUseComfyUI()) {
    return { imageFunction: generateImageLocal, providerName: 'flux-schnell-local' };
  }
  if (shouldUseReplicate()) {
    return { imageFunction: generateImage, providerName: 'sdxl' };
  }
  return { imageFunction: generateImageFree, providerName: 'pollinations' };
}
