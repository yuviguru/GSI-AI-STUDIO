/**
 * Image dimensions helper for the per-page scene-image flow.
 *
 * The book has a locked physical size (square / tall / pocket / landscape)
 * but each page's *image slot* depends on the layout:
 *  - image_full_bleed / gallery → image fills the whole page (book aspect)
 *  - text_top_image_bottom / image_top_text_bottom → image is half the height,
 *    full width → slot aspect = book aspect × 2 (much wider than the book)
 *  - recipe_split / concept_letter → image is half the width, full height →
 *    slot aspect = book aspect ÷ 2 (much taller than the book)
 *
 * If we generate at the book aspect for a half-height slot, the rendered
 * <img object-cover> crops the top/bottom — characters' heads or feet get
 * cut off. The PDF generator stretches the same image to fit, distorting
 * faces. Generating at the slot aspect avoids both problems.
 */

import { BOOK_SIZES } from '@/lib/templates/bookTemplates';
import type { BookSize, PageLayout } from '@/types/book.types';

const TARGET_LONG_SIDE = 1024;
const ASPECT_MIN = 0.4; // taller than this (e.g. 5:12 ≈ 0.42) is fine for SDXL
const ASPECT_MAX = 2.5; // wider than this (e.g. 12:5 = 2.4) is the practical SDXL limit
const SIZE_STEP = 64; // round dims to a multiple of 64 — image-gen providers prefer this

function slotAspectForLayout(bookAspect: number, layout: PageLayout): number {
  switch (layout) {
    case 'text_top_image_bottom':
    case 'image_top_text_bottom':
      return bookAspect * 2; // image is half the page height, full width
    case 'recipe_split':
    case 'concept_letter':
      return bookAspect / 2; // image is half the page width, full height
    case 'image_full_bleed':
    case 'gallery':
    case 'text_only':
    case 'entry_centered':
    default:
      return bookAspect;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

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
 * Compute generation dimensions for a page's image slot.
 *
 * @param bookSize – the book's locked trim size
 * @param layout – the page layout (omit for cover or general full-page gen)
 */
export function dimsForBookAndLayout(
  bookSize: BookSize,
  layout?: PageLayout,
): ImageDims {
  const bookData = BOOK_SIZES[bookSize];
  const bookAspect = bookData.widthMm / bookData.heightMm;
  const rawSlotAspect = layout ? slotAspectForLayout(bookAspect, layout) : bookAspect;
  const aspect = clamp(rawSlotAspect, ASPECT_MIN, ASPECT_MAX);

  let width: number;
  let height: number;
  if (aspect >= 1) {
    width = TARGET_LONG_SIDE;
    height = TARGET_LONG_SIDE / aspect;
  } else {
    height = TARGET_LONG_SIDE;
    width = TARGET_LONG_SIDE * aspect;
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
 * CSS aspect-ratio value for the image slot — used by the editor's preview
 * so the empty/loading state matches the size the generated image will be.
 */
export function slotAspectRatioForCss(bookSize: BookSize, layout?: PageLayout): string {
  const { aspectRatio } = dimsForBookAndLayout(bookSize, layout);
  return `${aspectRatio}`;
}
