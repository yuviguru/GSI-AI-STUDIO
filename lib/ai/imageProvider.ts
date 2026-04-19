/**
 * Unified Image Provider — single entry point for all image sourcing.
 *
 * Reads `IMAGE_MODE` env var to decide strategy:
 *
 *   IMAGE_MODE=hybrid (recommended prod default)
 *     Try Pexels stock → AI-generate fallback → SVG placeholder
 *     Best for cost: Pexels is free, only falls back to paid AI when stock misses
 *
 *   IMAGE_MODE=search
 *     Pexels → Unsplash → SVG (no AI cost, stock photos only)
 *
 *   IMAGE_MODE=generate
 *     ComfyUI (local) → Replicate → Pollinations (free) — legacy default
 *
 * All three modes return the same interface: (opts) => Promise<string>
 * so the story/comic routes don't need to know which mode is active.
 */

import { generateImage } from './replicateClient';
import { generateImageFree } from './pollinationsClient';
import { generateImageLocal } from './comfyuiClient';
import { searchImage, tryStockImage } from './imageSearchClient';

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

type ImageMode = 'hybrid' | 'search' | 'generate';

function getImageMode(): ImageMode {
  const mode = process.env.IMAGE_MODE?.toLowerCase();
  if (mode === 'search' || mode === 'generate' || mode === 'hybrid') return mode;
  return 'hybrid'; // new default
}

// ─── Generators ──────────────────────────────────────────────

function getAiGenerator(): { fn: ImageFunction; name: string } {
  if (shouldUseComfyUI()) return { fn: generateImageLocal, name: 'flux-schnell-local' };
  if (shouldUseReplicate()) return { fn: generateImage, name: 'sdxl' };
  return { fn: generateImageFree, name: 'pollinations' };
}

function buildHybridFunction(): ImageFunction {
  const ai = getAiGenerator();
  return async (opts) => {
    const stock = await tryStockImage(opts);
    if (stock) return stock;
    console.log(`[ImageProvider/hybrid] stock miss — falling back to ${ai.name}`);
    try {
      return await ai.fn(opts);
    } catch (err) {
      console.warn(`[ImageProvider/hybrid] AI fallback ${ai.name} failed:`, err instanceof Error ? err.message : err);
      // Last-resort: use searchImage which guarantees an SVG placeholder return
      return searchImage(opts);
    }
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

  // hybrid — Pexels first, AI fallback, SVG last
  const ai = getAiGenerator();
  return {
    imageFunction: buildHybridFunction(),
    providerName: `hybrid (pexels → ${ai.name} → svg)`,
  };
}
