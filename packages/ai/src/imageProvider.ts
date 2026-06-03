/**
 * Unified Image Provider — single entry point for all image sourcing.
 *
 * The actual provider selection + cross-provider fallback now lives in the
 * shared `imageRouter` (packages/ai/src/router), the SAME router the LLM path
 * uses. This module is a thin policy layer on top that decides, per
 * `IMAGE_MODE`, whether to allow non-AI fallbacks (stock photos / SVG):
 *
 *   IMAGE_MODE=hybrid (recommended prod default)
 *     imageRouter (Pixazo → Replicate → Pollinations, health-aware) →
 *     Pexels/Unsplash stock (last resort) → SVG placeholder. The router gives
 *     us proper provider fallthrough; stock+SVG guarantee we ALWAYS return.
 *
 *   IMAGE_MODE=search
 *     Pexels → Unsplash → SVG (no AI cost, stock photos only).
 *
 *   IMAGE_MODE=generate
 *     imageRouter only (Pixazo → Replicate → Pollinations). No stock/SVG net.
 *
 * Historically this module did its own single-provider pick
 * (`getAiGenerator`) which, when the Pixazo key was missing, jumped straight
 * to the lowest-quality provider (Pollinations) with no fallthrough — the
 * cause of the book-generate timeout incident. Routing through `imageRouter`
 * fixes that: a missing Pixazo key now cascades to Replicate, then
 * Pollinations, with health tracking so a dead provider is skipped.
 *
 * All modes return the same interface: (opts) => Promise<string>
 * so the story/comic/book routes don't need to know which mode is active.
 */

import { imageRouter } from './router';
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

type ImageMode = 'hybrid' | 'search' | 'generate';

function getImageMode(): ImageMode {
  const mode = process.env.IMAGE_MODE?.toLowerCase();
  if (mode === 'search' || mode === 'generate' || mode === 'hybrid') return mode;
  return 'hybrid'; // new default
}

// ─── Generators ──────────────────────────────────────────────

/**
 * Router-backed AI generator. Tries every configured provider in priority
 * order (Pixazo → Replicate → Pollinations) with health-aware fallthrough,
 * exactly like the LLM path. Returns the image URL or throws if every
 * provider failed.
 */
async function generateViaRouter(opts: ImageOptions): Promise<string> {
  const result = await imageRouter.generate({
    prompt: opts.prompt,
    style: opts.style,
    width: opts.width,
    height: opts.height,
    seed: opts.seed,
  });
  return result.url;
}

function buildHybridFunction(): ImageFunction {
  return async (opts) => {
    try {
      const aiUrl = await generateViaRouter(opts);
      if (aiUrl) return aiUrl;
    } catch (err) {
      console.warn(
        '[ImageProvider/hybrid] router AI providers failed — trying stock:',
        err instanceof Error ? err.message : err,
      );
    }

    const stock = await tryStockImage(opts);
    if (stock) {
      console.log('[ImageProvider/hybrid] AI failed — served from Pexels/Unsplash stock');
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
    return {
      imageFunction: generateViaRouter,
      providerName: 'router (pixazo→replicate→pollinations)',
    };
  }

  // hybrid — router AI first, Pexels/Unsplash stock as last resort, SVG fallback
  return {
    imageFunction: buildHybridFunction(),
    providerName: 'hybrid (router → pexels → svg)',
  };
}
