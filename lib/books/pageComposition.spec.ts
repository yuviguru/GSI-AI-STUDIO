import { describe, it, expect } from 'vitest';
import {
  parseHex,
  hexToRgbTuple,
  derivePalette,
  resolveComposition,
  splitDropCap,
  imageCarriesOverlay,
  readableTextOn,
  autoBodyFontSize,
  maxCharsForPage,
  fontScaleForPageWidth,
  REFERENCE_PAGE_WIDTH_PX,
  BLANK_PAGE_COLORS,
} from './pageComposition';
import { sceneTypeToLayout } from './sceneLayout';

describe('parseHex', () => {
  it('parses 6-digit hex with and without #', () => {
    expect(parseHex('#ff8800')).toEqual({ r: 255, g: 136, b: 0 });
    expect(parseHex('ff8800')).toEqual({ r: 255, g: 136, b: 0 });
  });
  it('expands 3-digit shorthand', () => {
    expect(parseHex('#f80')).toEqual({ r: 255, g: 136, b: 0 });
  });
  it('returns null on garbage', () => {
    expect(parseHex('nope')).toBeNull();
    expect(parseHex(null)).toBeNull();
  });
});

describe('hexToRgbTuple', () => {
  it('falls back to white on bad input', () => {
    expect(hexToRgbTuple(undefined)).toEqual([255, 255, 255]);
  });
});

describe('derivePalette', () => {
  it('returns a full set of valid hex colors', () => {
    const p = derivePalette('#5B5FFF');
    for (const key of ['pageBg', 'matBg', 'border', 'accent', 'text'] as const) {
      expect(p[key]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
  it('keeps a colourful (non-white) page background', () => {
    expect(derivePalette('#e23a3a').pageBg.toLowerCase()).not.toBe('#ffffff');
  });
  it('is deterministic for the same input', () => {
    expect(derivePalette('#123456')).toEqual(derivePalette('#123456'));
  });
  it('falls back to the brand colour when themeColor is null', () => {
    expect(derivePalette(null)).toEqual(derivePalette('#5B5FFF'));
  });
});

describe('resolveComposition', () => {
  it('maps full-bleed layouts to cinematic with no drop-cap', () => {
    const c = resolveComposition('image_full_bleed', 'square');
    expect(c.mode).toBe('full_bleed');
    expect(c.dropCap).toBe(false);
  });
  it('collapses image layouts to full_bleed (BOOK-008 full-bleed everywhere)', () => {
    expect(resolveComposition('image_top_text_bottom', 'square').mode).toBe('full_bleed');
    expect(resolveComposition('text_top_image_bottom', 'tall').mode).toBe('full_bleed');
    expect(resolveComposition('recipe_split', 'square').mode).toBe('full_bleed');
    expect(resolveComposition('concept_letter', 'square').mode).toBe('full_bleed');
  });
  it('keeps text-only layouts as a text feature', () => {
    expect(resolveComposition('text_only', 'tall').mode).toBe('text_feature');
    expect(resolveComposition('entry_centered', 'pocket').mode).toBe('text_feature');
  });
  it('centres text for entry_centered', () => {
    const c = resolveComposition('entry_centered', 'pocket');
    expect(c.mode).toBe('text_feature');
    expect(c.centerText).toBe(true);
  });
  it('gives landscape a larger image ratio than pocket', () => {
    expect(resolveComposition('image_top_text_bottom', 'landscape').imageHeightRatio).toBeGreaterThan(
      resolveComposition('image_top_text_bottom', 'pocket').imageHeightRatio,
    );
  });
});

describe('imageCarriesOverlay', () => {
  it('is true only for full-bleed (text sits on the art)', () => {
    expect(imageCarriesOverlay('full_bleed')).toBe(true);
  });
  it('is false for framed + text-feature (text on a separate themed area)', () => {
    expect(imageCarriesOverlay('framed_image_top')).toBe(false);
    expect(imageCarriesOverlay('framed_image_bottom')).toBe(false);
    expect(imageCarriesOverlay('text_feature')).toBe(false);
  });
});

describe('readableTextOn (BOOK-009)', () => {
  it('returns dark text on light/white backgrounds', () => {
    expect(readableTextOn('#FFFFFF')).toBe('#1F2937');
    expect(readableTextOn('#FFF8E7')).toBe('#1F2937'); // cream
    expect(readableTextOn('#FFE9A8')).toBe('#1F2937'); // gold
  });
  it('returns light text on dark backgrounds', () => {
    expect(readableTextOn('#222A39')).toBe('#FFFFFF'); // night
    expect(readableTextOn('#1F2937')).toBe('#FFFFFF');
  });
  it('defaults to dark text on bad input (assumes white)', () => {
    expect(readableTextOn(null)).toBe('#1F2937');
  });
  it('keeps every blank-page swatch legible with its auto text colour', () => {
    for (const c of BLANK_PAGE_COLORS) {
      expect(readableTextOn(c)).toMatch(/^#(1F2937|FFFFFF)$/);
    }
  });
});

describe('autoBodyFontSize (BOOK-009)', () => {
  it('makes short text on a blank page big and confident', () => {
    expect(autoBodyFontSize('Hi!', { hasImage: false })).toBe(34);
  });
  it('scales blank-page text down as it grows so it still fits', () => {
    const short = autoBodyFontSize('A short line of text here.', { hasImage: false });
    const long = autoBodyFontSize('x'.repeat(700), { hasImage: false });
    expect(short).toBeGreaterThan(long);
    expect(long).toBeGreaterThanOrEqual(14);
  });
  it('keeps captions over art smaller than blank-page defaults', () => {
    const caption = autoBodyFontSize('A caption.', { hasImage: true });
    const blank = autoBodyFontSize('A caption.', { hasImage: false });
    expect(caption).toBeLessThan(blank);
  });
});

describe('fontScaleForPageWidth (BOOK-011)', () => {
  it('is 1 at the reference width', () => {
    expect(fontScaleForPageWidth(REFERENCE_PAGE_WIDTH_PX)).toBe(1);
  });
  it('scales down proportionally on smaller rendered pages', () => {
    expect(fontScaleForPageWidth(REFERENCE_PAGE_WIDTH_PX / 2)).toBeCloseTo(0.5);
  });
  it('clamps extremes so text stays readable', () => {
    expect(fontScaleForPageWidth(50)).toBeGreaterThanOrEqual(0.35);
    expect(fontScaleForPageWidth(5000)).toBeLessThanOrEqual(1.5);
  });
  it('returns 1 when the width is unknown (SSR / first paint)', () => {
    expect(fontScaleForPageWidth(undefined)).toBe(1);
    expect(fontScaleForPageWidth(0)).toBe(1);
  });
});

describe('maxCharsForPage (BOOK-009)', () => {
  it('gives a blank writing page a much larger budget than an image caption', () => {
    expect(maxCharsForPage({ hasImage: false })).toBeGreaterThan(
      maxCharsForPage({ hasImage: true }),
    );
  });
});

describe('splitDropCap', () => {
  it('pulls the first letter off', () => {
    expect(splitDropCap('Milo ran fast')).toEqual({ cap: 'M', rest: 'ilo ran fast' });
  });
  it('skips a leading quote to land on a real letter', () => {
    const { cap } = splitDropCap('"Hello," she said');
    expect(cap).toBe('H');
  });
  it('returns null cap when there is no leading letter', () => {
    expect(splitDropCap('...').cap).toBeNull();
  });
});

describe('sceneTypeToLayout', () => {
  it('makes cinematic scenes full-bleed on roomy trims', () => {
    expect(sceneTypeToLayout('wide_establishing', 'square', 0)).toBe('image_full_bleed');
    expect(sceneTypeToLayout('dramatic_reveal', 'landscape', 1)).toBe('image_full_bleed');
  });
  it('avoids full-bleed on the tiny pocket trim (keeps text legible)', () => {
    expect(sceneTypeToLayout('action', 'pocket', 0)).not.toBe('image_full_bleed');
  });
  it('alternates framed layouts for quieter scenes so neighbours differ', () => {
    expect(sceneTypeToLayout('discovery', 'square', 0)).toBe('image_top_text_bottom');
    expect(sceneTypeToLayout('discovery', 'square', 1)).toBe('text_top_image_bottom');
  });
  it('falls back to an alternating framed layout when scene is missing', () => {
    expect(sceneTypeToLayout(undefined, 'square', 0)).toBe('image_top_text_bottom');
  });

  // Regression (PR #73 Codex review): a full-bleed page overlays its text in a
  // small caption card, so a paragraph of story text must NOT go full-bleed —
  // otherwise the caption swallows the art and the PDF dropped the overflow.
  it('keeps a SHORT cinematic caption full-bleed', () => {
    expect(sceneTypeToLayout('action', 'square', 0, 'Pip soared into the night.')).toBe(
      'image_full_bleed',
    );
  });
  it('routes a TEXT-HEAVY cinematic page to a framed layout', () => {
    const paragraph =
      'Pip the firefly took a deep breath and flew higher than he ever had before, ' +
      'past the tallest trees, across the windy canyon, all the way to the glowing beacon.';
    expect(sceneTypeToLayout('action', 'square', 0, paragraph)).toBe('image_top_text_bottom');
    expect(sceneTypeToLayout('dramatic_reveal', 'landscape', 1, paragraph)).toBe(
      'text_top_image_bottom',
    );
  });
  it('routes a text-heavy character_closeup to a framed layout', () => {
    const paragraph =
      'Ember gazed at the village below, her tiny wings trembling, wondering whether ' +
      'she was truly brave enough to light the great Sky Beacon all by herself tonight.';
    expect(sceneTypeToLayout('character_closeup', 'square', 0, paragraph)).toBe(
      'image_top_text_bottom',
    );
  });
});
