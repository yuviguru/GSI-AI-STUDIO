/**
 * Image dimensions helper for per-page + cover scene-image generation.
 *
 * Rule: every image is generated at the BOOK'S aspect ratio. Square book
 * → square image, tall book → portrait image, etc. We do not size to the
 * page-layout slot (that's a layer-of-abstraction mistake — kids think
 * "my book is square so my pictures are square", and so do AI models that
 * have to build the scene composition).
 *
 * Page layouts that show the image in less-than-full space (text-top +
 * image-bottom, recipe-split, etc.) will crop or letterbox in the
 * flipbook + PDF — that's the page layout's responsibility, not the
 * image generator's. Narrative books default to `image_full_bleed` so
 * the common case has no cropping at all.
 *
 * The `layout` parameter is kept on the function signature so callers
 * can pass it in case future buckets really do need slot-aware sizing,
 * but it's currently ignored.
 */

import { BOOK_SIZES } from '@/lib/templates/bookTemplates';
import type { BookSize, PageLayout } from '@/types/book.types';

const TARGET_LONG_SIDE = 1024;
const SIZE_STEP = 64; // round dims to a multiple of 64 — image-gen providers prefer this

function roundToStep(value: number, step: number): number {
  return Math.max(step, Math.round(value / step) * step);
}

export interface ImageDims {
  width: number;
  height: number;
  /** The actual aspect we generated at — useful for client preview sizing. */
  aspectRatio: number;
}

/**
 * Compute generation dimensions for a page's image. Always book aspect.
 *
 * @param bookSize – the book's locked trim size
 * @param _layout – ignored (kept for API symmetry with previous slot-aware version)
 */
export function dimsForBookAndLayout(
  bookSize: BookSize,
  _layout?: PageLayout,
): ImageDims {
  void _layout; // currently ignored — see header comment
  const bookData = BOOK_SIZES[bookSize];
  const bookAspect = bookData.widthMm / bookData.heightMm;

  let width: number;
  let height: number;
  if (bookAspect >= 1) {
    width = TARGET_LONG_SIDE;
    height = TARGET_LONG_SIDE / bookAspect;
  } else {
    height = TARGET_LONG_SIDE;
    width = TARGET_LONG_SIDE * bookAspect;
  }

  width = roundToStep(width, SIZE_STEP);
  height = roundToStep(height, SIZE_STEP);

  return {
    width,
    height,
    aspectRatio: width / height,
  };
}

/**
 * CSS aspect-ratio value for the editor preview — book aspect, regardless
 * of the page layout. The kid sees "my book is square, so my image is
 * square" in the preview panel.
 */
export function slotAspectRatioForCss(bookSize: BookSize, _layout?: PageLayout): string {
  void _layout;
  const { aspectRatio } = dimsForBookAndLayout(bookSize);
  return `${aspectRatio}`;
}
