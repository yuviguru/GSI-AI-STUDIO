/**
 * Illustration manifest — single source of truth for the home + section UI illustrations.
 *
 * Reviewed in PR like source code. Add/edit entries here, then run
 * `pnpm tsx scripts/generate-illustrations.ts` to (re-)generate the assets.
 *
 * See docs/ux-patterns.md#illustration-system for the visual contract.
 */

export const STYLE_PREFIX =
  'Soft 3D rendered illustration, claymation feel, vibrant pastel palette ' +
  '(purples, peaches, mint, sunshine yellow), rounded shapes, friendly kid ' +
  'character age 8-12, transparent background, centered subject, no text, child-safe.';

export interface IllustrationEntry {
  /** Logical slot id, e.g. "sections/create" or "studios/books". Used as `--slot` filter. */
  slot: string;
  /** Output path relative to `public/illustrations/`. WebP preferred at runtime. */
  filename: string;
  /** Per-asset prompt body (the style prefix is applied automatically by the generator). */
  prompt: string;
  /** Square pixel dimension. 512 for tiles, 768 for hero, 256 for CTA mascots. */
  size: 256 | 512 | 768;
}

export const ILLUSTRATION_MANIFEST: IllustrationEntry[] = [
  // ── Section heroes ────────────────────────────────────────────────────────
  {
    slot: 'sections/create',
    filename: 'sections/create.webp',
    prompt: 'Kid creator at a glowing tablet with a paintbrush, surrounded by floating creative tools (pencil, music note, comic panel, dice).',
    size: 768,
  },
  {
    slot: 'sections/play',
    filename: 'sections/play.webp',
    prompt: 'Kid at a game console arm-in-arm with a friendly cartoon AI robot mascot, both grinning.',
    size: 768,
  },
  {
    slot: 'sections/learn',
    filename: 'sections/learn.webp',
    prompt: 'Kid holding an open glowing book with floating letters and a small AI brain mascot peeking over the page.',
    size: 768,
  },
  {
    slot: 'sections/discover',
    filename: 'sections/discover.webp',
    prompt: 'Kid astronaut floating in space surrounded by floating creation cards (story, comic, music) with stars.',
    size: 768,
  },

  // ── Studio tiles ──────────────────────────────────────────────────────────
  {
    slot: 'studios/story',
    filename: 'studios/story.webp',
    prompt: 'Open storybook with a small character (dragon or fox) jumping out of the pages, surrounded by sparkles.',
    size: 512,
  },
  {
    slot: 'studios/comic',
    filename: 'studios/comic.webp',
    prompt: 'Stack of comic panels with speech bubbles ("POW!", "ZAP!"), bright halftone dot accents.',
    size: 512,
  },
  {
    slot: 'studios/music',
    filename: 'studios/music.webp',
    prompt: 'Oversized cartoon headphones with floating colorful music notes and a soundwave squiggle.',
    size: 512,
  },
  {
    slot: 'studios/quiz',
    filename: 'studios/quiz.webp',
    prompt: 'Round game-show buzzer button with floating question marks and lightbulb sparks.',
    size: 512,
  },
  {
    slot: 'studios/game',
    filename: 'studios/game.webp',
    prompt: 'Cute pixel-art creature emerging from an arcade joystick controller, looking surprised.',
    size: 512,
  },
  {
    slot: 'studios/books',
    filename: 'studios/books.webp',
    prompt: 'Stack of three glowing storybooks with a bookmark and a tiny star on top.',
    size: 512,
  },
  {
    slot: 'studios/beat-the-ai',
    filename: 'studios/beat-the-ai.webp',
    prompt: 'Kid arm-wrestling a small friendly cartoon AI robot at a desk, both smiling.',
    size: 512,
  },
  {
    slot: 'studios/ceo',
    filename: 'studios/ceo.webp',
    prompt: 'Kid in a tiny suit and tie sitting at a desk with miniature charts and a coffee mug.',
    size: 512,
  },
  {
    slot: 'studios/skill-arena',
    filename: 'studios/skill-arena.webp',
    prompt: 'Kid climbing a wall of giant alphabet letters and word bubbles, reaching for a star.',
    size: 512,
  },

  // ── CTA cards ─────────────────────────────────────────────────────────────
  {
    slot: 'cta/streak-mascot',
    filename: 'cta/streak-mascot.webp',
    prompt: 'Cute fluffy fire-flame mascot with a wide grin, holding up a calendar.',
    size: 256,
  },
  {
    slot: 'cta/daily-challenge',
    filename: 'cta/daily-challenge.webp',
    prompt: 'Golden trophy on a small pedestal with confetti and stars exploding around it.',
    size: 256,
  },

  // ── Mascots / empty states ────────────────────────────────────────────────
  {
    slot: 'mascots/empty',
    filename: 'mascots/empty.webp',
    prompt: 'Sleepy round mascot with eyes half-closed, sitting on a pillow.',
    size: 256,
  },
];
