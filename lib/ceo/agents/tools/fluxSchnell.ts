/**
 * Flux Schnell tool adapter — routes through the shared
 * `getImageProvider()` cascade (Pixazo → Replicate SDXL → Pollinations →
 * stock → SVG placeholder) so every image in the Kid CEO agent pipeline
 * uses the same provider logic as the rest of the platform.
 *
 * We call this adapter "flux_schnell" for pricing purposes because Pixazo
 * (Flux Schnell) is the cheapest member of the cascade and our default in
 * prod; if the cascade falls through to Pollinations the cost bucket
 * should conceptually shift but we keep the uniform ₹8/image rate for
 * stability in the kid-facing trace.
 */

import { getImageProvider, type ImageOptions, type ImageStyle } from '@/lib/ai/imageProvider';
import type { ToolAdapter, ToolRunContext, ToolRunResult } from './types';

export interface FluxSchnellInput {
  prompt: string;
  style: ImageStyle;
  width: number;
  height: number;
  seed?: number;
}

export interface FluxSchnellOutput {
  url: string;
  providerName: string;
  widthPx: number;
  heightPx: number;
}

function summarise(prompt: string, providerName: string): string {
  const short = prompt.length > 90 ? `${prompt.slice(0, 87)}…` : prompt;
  return `${providerName}: "${short}"`;
}

export const fluxSchnellTool: ToolAdapter<FluxSchnellInput, FluxSchnellOutput> = {
  id: 'flux_schnell',
  label: 'Flux Schnell',
  async run(input, _ctx: ToolRunContext): Promise<ToolRunResult<FluxSchnellOutput>> {
    const { imageFunction, providerName } = getImageProvider();
    const opts: ImageOptions = {
      prompt: input.prompt,
      style: input.style,
      width: input.width,
      height: input.height,
      seed: input.seed,
    };
    const url = await imageFunction(opts);
    return {
      output: {
        url,
        providerName,
        widthPx: input.width,
        heightPx: input.height,
      },
      outputSummary: summarise(input.prompt, providerName),
      model: providerName,
      promptTokens: 0,
      completionTokens: 0,
    };
  },
};
