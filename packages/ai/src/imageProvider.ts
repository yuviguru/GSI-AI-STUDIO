/**
 * Unified Image Provider — single entry point for all image sourcing.
 *
 * Reads `IMAGE_MODE` env var to decide strategy:
 *
 *   IMAGE_MODE=hybrid (recommended prod default)
 *     Try AI-generate → Pexels stock (last resort) → SVG placeholder.
 *     AI-generated illustrations look consistent with the kid's story/comic
 *     aesthetic; stock photos are the safety net when AI providers all fail.
 *
 *   IMAGE_MODE=search
 *     Pexels → Unsplash → SVG (no AI cost, stock photos only).
 *
 *   IMAGE_MODE=generate
 *     ComfyUI (local) → Pixazo (free Flux Schnell) → Replicate (paid SDXL)
 *     → Pollinations (free) — picks the best configured provider.
 *
 * All three modes return the same interface: (opts) => Promise<string>
 * so the story/comic routes don't need to know which mode is active.
 */

import { generateImage } from './replicateClient';
import { generateImageFree } from './pollinationsClient';
import { generateImageLocal } from './comfyuiClient';
import { generateWithPixazo, isPixazoConfigured } from './pixazoClient';
import { searchImage, tryStockImage } from './imageSearchClient';

export type ImageStyle = 'watercolor' | 'cartoon' | 'pixel-art' | 'comic';

export interface ImageOptions {
  prompt: string;
  style: ImageStyle;
  width: number;
  height: number;
  /** Optional seed — pinning this across a multi-image run (e.g. a story)
   *  keeps the diffusion output visually coherent (same character faces,
   *  same palette) page-to-page. Omit for variety. */
  seed?: number;
}

export type ImageFunction = (opts: ImageOptions) => Promise<string>;

// ─── Provider detection helpers ──────────────────────────────

function shouldUseComfyUI(): boolean {
  return !!process.env.COMFYUI_URL;
}

function shouldUseReplicate(): boolean {
  return !!process.env.REPLICATE_API_TOKEN && !process.env.REPLICATE_API_TOKEN?.includes('your-token');
}

type ImageMode = 'hybrid' | 'search' | 'generate';

function getImageMode(): ImageMode {
  const mode = process.env.IMAGE_MODE?.toLowerCase();
  if (mode === 'search' || mode === 'generate' || mode === 'hybrid') return mode;
  return 'hybrid'; // new default
}

// ─── Generators ──────────────────────────────────────────────

function getAiGenerator(): { fn: ImageFunction; name: string } {
  // Priority: local ComfyUI (fastest in dev) → Pixazo (free hosted Flux Schnell)
  //   → Replicate SDXL (paid fallback) → Pollinations (free but lower quality).
  if (shouldUseComfyUI()) return { fn: generateImageLocal, name: 'flux-schnell-local' };
  if (isPixazoConfigured()) return { fn: generateWithPixazo, name: 'pixazo-flux-schnell' };
  if (shouldUseReplicate()) return { fn: generateImage, name: 'sdxl' };
  return { fn: generateImageFree, name: 'pollinations' };
}

function buildHybridFunction(): ImageFunction {
  const ai = getAiGenerator();
  return async (opts) => {
    try {
      const aiUrl = await ai.fn(opts);
      if (aiUrl) return aiUrl;
    } catch (err) {
      console.warn(
        `[ImageProvider/hybrid] AI ${ai.name} failed — trying stock:`,
        err instanceof Error ? err.message : err,
      );
    }

    const stock = await tryStockImage(opts);
    if (stock) {
      console.log(`[ImageProvider/hybrid] AI failed — served from Pexels/Unsplash stock`);
      return stock;
    }

    // Last resort — searchImage guarantees an SVG data URI return
    console.warn('[ImageProvider/hybrid] AI + stock both failed — SVG placeholder');
    return searchImage(opts);
  };
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

  if (mode === 'generate') {
    const ai = getAiGenerator();
    return { imageFunction: ai.fn, providerName: ai.name };
  }

  // hybrid — AI first, Pexels/Unsplash stock as last resort, SVG fallback
  const ai = getAiGenerator();
  return {
    imageFunction: buildHybridFunction(),
    providerName: `hybrid (${ai.name} → pexels → svg)`,
  };
}
