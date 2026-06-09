/**
 * Book page composition + colour system (BOOK-006).
 *
 * One shared, render-agnostic source of truth for how a page looks, used by
 * BOTH the on-screen flipbook (`FlipbookPreview`) and the print PDF
 * (`generateBookPdf`) so the editor preview, the public viewer, and the
 * downloaded book all match.
 *
 * Two halves:
 *  1. `derivePalette` — turns the book's single `themeColor` into a small,
 *     readable, COLOURFUL palette (tinted page background, image mat/frame,
 *     accent, body text). This is what moves books off the "plain white page
 *     with an image in a box" look toward the framed, themed references.
 *  2. `resolveComposition` — maps a page's `layout` + the book's trim `size`
 *     to a concrete composition (full-bleed cinematic vs framed art vs text
 *     feature), with size-aware image proportions and padding. This is the
 *     render side of the hybrid-by-scene-type direction: the AI picks a
 *     scene type → `sceneLayout` maps it to a `PageLayout` → here we turn
 *     that into pixels/millimetres.
 *
 * Everything is returned as plain hex/number/boolean so jsPDF and React can
 * each consume it without pulling in the other's primitives.
 */

import type { BookSize, PageLayout } from '@gsi/types';

// ── Colour maths ─────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Parse `#rgb` / `#rrggbb` (with or without leading #). Null on bad input. */
export function parseHex(hex: string | null | undefined): Rgb | null {
  if (!hex) return null;
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** Convert to an `[r,g,b]` tuple (0-255), defaulting to white on bad input.
 *  Convenience for jsPDF's `setFillColor(r,g,b)`. */
export function hexToRgbTuple(hex: string | null | undefined): [number, number, number] {
  const rgb = parseHex(hex) ?? { r: 255, g: 255, b: 255 };
  return [rgb.r, rgb.g, rgb.b];
}

function rgbToHsl({ r, g, b }: Rgb): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h *= 60;
  }
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  s = clamp(s, 0, 1);
  l = clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp >= 0 && hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ── Palette ──────────────────────────────────────────────────────

export interface PagePalette {
  /** Tinted page background — colourful, never plain white. */
  pageBg: string;
  /** Mat/card behind a framed image. */
  matBg: string;
  /** Frame border colour. */
  border: string;
  /** Saturated accent — page-number pill, drop cap, rules. */
  accent: string;
  /** Readable body text colour (dark, faintly hue-tinted). */
  text: string;
  /** Scrim behind text on a full-bleed image (CSS rgba). */
  captionBg: string;
  captionText: string;
}

/** The app brand purple — palette fallback when a book has no themeColor. */
const FALLBACK_THEME = '#5B5FFF';

/**
 * Build a small, readable, colourful palette from one theme colour. We keep
 * the hue but pull saturation/lightness to safe bands so text stays legible
 * and pages feel warm rather than neon.
 */
export function derivePalette(themeColor: string | null | undefined): PagePalette {
  const base = parseHex(themeColor) ?? parseHex(FALLBACK_THEME)!;
  const [h, rawS] = rgbToHsl(base);
  const s = clamp(rawS, 0.25, 0.8);
  return {
    pageBg: hslToHex(h, s * 0.4, 0.965),
    matBg: hslToHex(h, s * 0.5, 0.9),
    border: hslToHex(h, s * 0.6, 0.76),
    accent: hslToHex(h, Math.max(0.55, s), 0.54),
    text: hslToHex(h, 0.32, 0.19),
    captionBg: 'rgba(18,15,38,0.62)',
    captionText: '#ffffff',
  };
}

// ── Composition ──────────────────────────────────────────────────

export type CompositionMode =
  | 'full_bleed' // cinematic — art edge to edge, text overlaid in a caption card
  | 'framed_image_top' // framed art card on top, themed text below
  | 'framed_image_bottom' // themed text on top, framed art card below
  | 'text_feature'; // text-led page (poem/diary/closeup), optional small art

export interface PageComposition {
  mode: CompositionMode;
  /** Fraction of page height the framed image occupies. Size-aware. */
  imageHeightRatio: number;
  /** Inner page padding as a fraction of the page's shorter side. Size-aware. */
  paddingRatio: number;
  /** Render a decorative drop-cap on the first letter of the body text. */
  dropCap: boolean;
  /** Centre the text block (poems, single-line landscape pages). */
  centerText: boolean;
  /** Oversized hero letter page (alphabet/concept books). */
  conceptLetter: boolean;
}

/** Size-aware framed-image height. Compact formats give the image less of the
 *  page so the (shorter) text still breathes; landscape leans cinematic. */
const IMAGE_RATIO_BY_SIZE: Record<BookSize, number> = {
  landscape: 0.6,
  square: 0.56,
  tall: 0.5,
  pocket: 0.44,
};

const PADDING_RATIO_BY_SIZE: Record<BookSize, number> = {
  landscape: 0.05,
  square: 0.07,
  tall: 0.07,
  pocket: 0.05,
};

/**
 * Resolve a page's concrete composition from its layout + the book trim.
 * Pure — both renderers call this so screen and print agree.
 */
export function resolveComposition(layout: PageLayout, size: BookSize): PageComposition {
  const isFullBleed = layout === 'image_full_bleed' || layout === 'gallery';
  const isImageBottom = layout === 'text_top_image_bottom';
  const isTextOnly = layout === 'text_only' || layout === 'entry_centered';
  const isCentered = layout === 'entry_centered';
  const conceptLetter = layout === 'concept_letter';

  let mode: CompositionMode;
  if (isFullBleed) mode = 'full_bleed';
  else if (isTextOnly) mode = 'text_feature';
  else if (isImageBottom) mode = 'framed_image_bottom';
  else mode = 'framed_image_top'; // image_top_text_bottom, concept_letter, recipe_split

  return {
    mode,
    imageHeightRatio: IMAGE_RATIO_BY_SIZE[size] ?? 0.54,
    paddingRatio: PADDING_RATIO_BY_SIZE[size] ?? 0.06,
    // Drop-cap any text-bearing page that isn't pure cinematic.
    dropCap: mode !== 'full_bleed',
    centerText: isCentered,
    conceptLetter,
  };
}

/** True when a page's image carries text laid OVER it (so the art needs a calm
 *  band for legibility). Only full-bleed pages overlay their caption; framed
 *  and text-feature pages put text on a separate themed area. Covers always
 *  overlay their title — callers pass that case explicitly. */
export function imageCarriesOverlay(mode: CompositionMode): boolean {
  return mode === 'full_bleed';
}

/** Appended to an image-generation prompt when the image will carry overlaid
 *  text (covers + full-bleed pages). Asks the model to keep the lower band calm
 *  and the subjects up top — the safe-zone composition that makes professional
 *  picture-book covers read cleanly under their title. */
export const OVERLAY_SAFE_ZONE_HINT =
  'Composition: keep the lower third simpler and less busy (open sky, ground, water, or soft background) and place the main subjects in the upper two-thirds, leaving clean space for an overlaid title or caption.';

/** Split text into a drop-cap leading character + the remainder, skipping
 *  leading quotes/spaces so the cap lands on a real letter. Returns null cap
 *  when there's nothing sensible to enlarge. */
export function splitDropCap(text: string): { cap: string | null; rest: string } {
  if (!text) return { cap: null, rest: '' };
  const m = /^(\s*["“'']?\s*)([A-Za-z0-9])/.exec(text);
  if (!m) return { cap: null, rest: text };
  const lead = m[1] ?? '';
  const capChar = m[2] ?? '';
  const idx = lead.length + capChar.length;
  return { cap: capChar, rest: text.slice(idx) };
}
