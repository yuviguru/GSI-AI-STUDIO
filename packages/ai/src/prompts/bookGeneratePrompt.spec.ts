import { describe, it, expect } from 'vitest';
import {
  BOOK_GENERATE_SYSTEM_PROMPT,
  buildBookGenerateUserMessage,
  buildPageImagePrompt,
  buildCoverImagePrompt,
  characterAnchor,
  characterLookDescription,
  artStyleForAge,
  formatGuidanceForSize,
  ILLUSTRATION_QUALITY_SUFFIX,
  type BookCharacterGuide,
} from './bookGeneratePrompt';

const milo: BookCharacterGuide = {
  name: 'Milo',
  age: '8',
  appearance: 'a small boy with messy brown hair and bright green eyes',
  clothing: 'a yellow hoodie',
  accessory: 'a tiny red notebook',
  personality: 'a curious inventor',
  colorTheme: 'yellow and blue',
};

// ─── System prompt: premium design + safety ──────────────────────
describe('BOOK_GENERATE_SYSTEM_PROMPT', () => {
  it('defines a character bible up front for consistency', () => {
    expect(BOOK_GENERATE_SYSTEM_PROMPT).toContain('CHARACTER DESIGN SYSTEM');
    expect(BOOK_GENERATE_SYSTEM_PROMPT).toContain('characterGuide');
  });

  it('enforces scene-type variety (page composition)', () => {
    expect(BOOK_GENERATE_SYSTEM_PROMPT).toContain('sceneType');
    expect(BOOK_GENERATE_SYSTEM_PROMPT.toLowerCase()).toContain('consecutive');
  });

  it('drives an emotional arc and page-turn hooks', () => {
    expect(BOOK_GENERATE_SYSTEM_PROMPT.toUpperCase()).toContain('EMOTIONAL ARC');
    expect(BOOK_GENERATE_SYSTEM_PROMPT.toUpperCase()).toContain('PAGE-TURN');
  });

  it('keeps the hard safety rules (violence, romance, ≤10 pages, hopeful)', () => {
    const p = BOOK_GENERATE_SYSTEM_PROMPT.toLowerCase();
    expect(p).toContain('violence');
    expect(p).toContain('romance');
    expect(p).toContain('hopeless');
    expect(BOOK_GENERATE_SYSTEM_PROMPT).toMatch(/more than 10 pages/i);
  });

  it('demands strict JSON only', () => {
    expect(BOOK_GENERATE_SYSTEM_PROMPT).toContain('STRICT JSON');
  });

  it('tells the model NOT to restate the fixed look per page', () => {
    expect(BOOK_GENERATE_SYSTEM_PROMPT.toLowerCase()).toMatch(/do not restate|injected automatically/);
  });
});

// ─── User message ────────────────────────────────────────────────
describe('buildBookGenerateUserMessage', () => {
  it('threads topic, age, style and page count through', () => {
    const msg = buildBookGenerateUserMessage({
      topic: 'a robot who learns to paint',
      age: 9,
      style: 'sweet',
      pageCount: 6,
    });
    expect(msg).toContain('a robot who learns to paint');
    expect(msg).toContain('9');
    expect(msg).toContain('sweet');
    expect(msg).toContain('6');
  });

  it('uses the kid title hint when provided', () => {
    const msg = buildBookGenerateUserMessage({
      topic: 't', age: 8, style: 'funny', pageCount: 3, titleHint: 'My Robot Pal',
    });
    expect(msg).toContain('My Robot Pal');
  });

  it('injects format direction that varies by trim size', () => {
    const landscape = buildBookGenerateUserMessage({
      topic: 't', age: 8, style: 'funny', pageCount: 4, size: 'landscape',
    });
    const tall = buildBookGenerateUserMessage({
      topic: 't', age: 8, style: 'funny', pageCount: 4, size: 'tall',
    });
    expect(landscape).toContain('Landscape');
    expect(landscape.toLowerCase()).toContain('short');
    expect(tall).toContain('Tall');
    // landscape trims text down, tall gives more room — they must differ
    expect(landscape).not.toBe(tall);
  });
});

// ─── Size-driven composition + text density ──────────────────────
describe('formatGuidanceForSize', () => {
  it('scales text DOWN for compact pocket/landscape formats', () => {
    expect(formatGuidanceForSize('pocket').textScale).toBeLessThan(1);
    expect(formatGuidanceForSize('landscape').textScale).toBeLessThan(1);
  });
  it('gives the tall format more text room', () => {
    expect(formatGuidanceForSize('tall').textScale).toBeGreaterThan(1);
  });
  it('keeps square as the balanced 1.0 baseline', () => {
    expect(formatGuidanceForSize('square').textScale).toBe(1);
  });
});

// ─── Art direction helpers ───────────────────────────────────────
describe('artStyleForAge', () => {
  it('skews young ages to soft Pixar 3D', () => {
    expect(artStyleForAge(7).toLowerCase()).toContain('pixar');
  });
  it('skews teens to concept-art / YA', () => {
    expect(artStyleForAge(16).toLowerCase()).toMatch(/concept-art|ya illustrated/);
  });
});

describe('characterAnchor', () => {
  it('returns empty string for a null guide', () => {
    expect(characterAnchor(null)).toBe('');
  });
  it('packs name, look, clothing, accessory and palette', () => {
    const a = characterAnchor(milo);
    expect(a).toContain('Milo');
    expect(a).toContain('yellow hoodie');
    expect(a).toContain('red notebook');
    expect(a).toContain('yellow and blue');
  });
});

describe('characterLookDescription', () => {
  it('produces a human-readable cast card', () => {
    const d = characterLookDescription(milo);
    expect(d).toContain('yellow hoodie');
    expect(d).toContain('curious inventor');
  });
});

describe('buildPageImagePrompt', () => {
  it('injects the character anchor so every page renders the same hero', () => {
    const prompt = buildPageImagePrompt({
      scenePrompt: 'leaning over a glowing workbench in a cluttered garage, wide shot',
      emotion: 'wonder',
      guide: milo,
      age: 8,
    });
    expect(prompt).toContain('Milo');
    expect(prompt).toContain('yellow hoodie');
    expect(prompt).toContain('glowing workbench');
    expect(prompt).toContain('wonder');
    expect(prompt).toContain(ILLUSTRATION_QUALITY_SUFFIX);
    expect(prompt.toLowerCase()).toContain('pixar');
  });

  it('still works without a guide (graceful fallback)', () => {
    const prompt = buildPageImagePrompt({
      scenePrompt: 'a quiet forest at dawn',
      guide: null,
      age: 12,
    });
    expect(prompt).toContain('a quiet forest at dawn');
    expect(prompt).not.toContain('Character:');
    expect(prompt).toContain(ILLUSTRATION_QUALITY_SUFFIX);
  });
});

describe('buildCoverImagePrompt', () => {
  it('features the hero prominently with bookstore-quality keywords', () => {
    const prompt = buildCoverImagePrompt({
      coverPrompt: 'Milo holding his glowing invention above his head in triumph',
      guide: milo,
      age: 8,
    });
    expect(prompt.toLowerCase()).toContain('main character prominently');
    expect(prompt.toLowerCase()).toContain("children's book cover");
    expect(prompt).toContain(ILLUSTRATION_QUALITY_SUFFIX);
  });
});
