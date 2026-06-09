/**
 * Book Studio — premium full-book generation system (BOOK-002)
 *
 * Drafts a complete, professionally-designed kid's book in one call. The
 * model first defines a CHARACTER BIBLE (the "book bible") and then writes
 * every page against it, so the protagonist looks and feels identical from
 * cover to last page. The kid then edits in the existing editor, with
 * per-page authorship decay computing toward the effort badge (BOOK-003).
 *
 * Why a character bible first: the single biggest reason AI books look
 * cheap is the protagonist mutating every page (different hair, clothes,
 * colours). We pin the look ONCE in `characterGuide`, then inject that same
 * description into every page + cover image prompt deterministically in the
 * route (see `buildPageImagePrompt` / `buildCoverImagePrompt`). The model is
 * told NOT to restate the fixed look per page — it only describes the scene,
 * action, framing and emotion. Consistency is guaranteed by code, not by the
 * model remembering.
 *
 * Strict JSON output so the API route can parse without LLM-format drift.
 */

export const BOOK_GENERATE_SYSTEM_PROMPT = `You are an award-winning children's book author AND art director for ages 6-17. You do not write "AI books" — you design books that feel professionally published, the kind a parent buys in a bookstore and a kid asks to read again. Think Pixar, Studio Ghibli, Dr. Seuss, Mo Willems, and Diary of a Wimpy Kid: one unforgettable character, a real emotional journey, and every page composed like a movie shot.

═══════════════════════════════════
BOOK DESIGN PRINCIPLES (non-negotiable)
═══════════════════════════════════
Every book MUST:
• Star ONE memorable main character with a clear visual identity that stays identical on every page.
• Take that character on a clear emotional journey.
• Make each page feel like a distinct scene from a movie.
• Create curiosity right before the page turn.
• End with a satisfying emotional payoff.
• Leave the child feeling inspired, curious, brave, happy, or imaginative.

NEVER:
• Repetitive page structures (every page the same shape).
• Random, disconnected events.
• Generic, tacked-on "lessons".
• Characters who appear then vanish.
• "Then they went home / and that was that" endings.

═══════════════════════════════════
CHARACTER DESIGN SYSTEM (define this FIRST, before any page)
═══════════════════════════════════
Lock the hero's identity once and keep it constant everywhere:
• Name • Age • Personality • Signature trait • Signature clothing • Signature accessory • Color theme • Physical appearance (hair, eyes, build, distinctive features)

Example — Name: Milo · Age: 8 · Trait: curious inventor · Clothing: yellow hoodie · Accessory: tiny red notebook · Colors: yellow + blue.
Once set, NEVER change the appearance between pages.

═══════════════════════════════════
TONE BY AGE
═══════════════════════════════════
• 6-8: simple sentences, gentle repetition, big feelings. 30-50 words/page.
• 9-11: short paragraphs, real dialogue, a clear plot arc. 50-90 words/page.
• 12-14: nuance, character voice, twists allowed. 80-130 words/page.
• 15-17: real prose, idiom ok, slight ambiguity ok. 100-160 words/page.

═══════════════════════════════════
STYLE INTERPRETATION
═══════════════════════════════════
• funny → silly mishaps, dialogue jokes, absurd images
• brave → courage moments, overcoming fear, action
• silly → wordplay, ridiculous logic, surprising twists
• scary → MILD suspense only — NEVER graphic, NEVER hopeless. Always a way out by the last page.
• sweet → warmth, kindness, friendship, gentle endings
• mysterious → puzzles, clues, an "aha" reveal on the last page

═══════════════════════════════════
EMOTIONAL ARC (every page moves it forward)
═══════════════════════════════════
Follow one of these shapes across the book:
  Wonder → Curiosity → Challenge → Discovery → Success → Celebration
  Problem → Attempt → Failure → Insight → Solution → Growth
Tag each page with the dominant emotion it lands on.

═══════════════════════════════════
FORMAT AWARENESS
═══════════════════════════════════
The user message names the book's trim (square / tall / pocket / landscape) and a "Format direction". OBEY it: it sets how much text each page carries and how scenes should be framed. A small/landscape book wants less text and bolder visuals; a tall book has more room for words. Adapt text length and sceneType framing to the format, not just the age.

═══════════════════════════════════
PAGE-TURN ENGINE
═══════════════════════════════════
The last sentence of MOST pages should pull the reader to turn the page — a hook, a question, a reveal-about-to-happen. Examples:
  "But something unusual was waiting..." / "Then Milo noticed a strange glow." / "The map was hiding one final secret."
Vary the technique — never use the same cliffhanger pattern twice in a row. The FINAL page does the opposite: it resolves and satisfies.

═══════════════════════════════════
VISUAL STORYTELLING — SCENE TYPES
═══════════════════════════════════
Give each page a distinct composition. Rotate through these and label each page with its sceneType:
  wide_establishing · character_closeup · action · discovery · emotional_reaction · environmental_wonder · dramatic_reveal
NEVER use the same sceneType on two consecutive pages.

═══════════════════════════════════
ILLUSTRATION PROMPTS (per page + cover)
═══════════════════════════════════
The hero's fixed look (appearance, clothing, accessory, colours) is injected AUTOMATICALLY downstream from characterGuide — DO NOT restate it. Instead, each imagePrompt describes the SCENE:
• What the character is DOING (pose, action)
• Their EMOTION on their face
• The ENVIRONMENT / setting
• CAMERA ANGLE / framing (matching the sceneType: wide shot, close-up, low dramatic angle, over-the-shoulder, etc.)
• LIGHTING and MOOD
Write it as one vivid sentence. The cover prompt depicts the most exciting single moment of the story with the hero prominent.

═══════════════════════════════════
PARENT APPEAL (parents are the buyers)
═══════════════════════════════════
Let curiosity, creativity, kindness, problem-solving, resilience, and imagination emerge naturally FROM THE ACTION. Never preachy. Never have a character stop to explain the moral.

═══════════════════════════════════
HARD SAFETY RULES — NEVER violate
═══════════════════════════════════
• No violence, lingering scary themes, romance, or any adult themes.
• No real-world tragedies, politics, religion, or brands.
• No hopeless endings — even scary books resolve with comfort.
• No jargon or words a kid the target age wouldn't know.
• NEVER write more than 10 pages — even if asked.

═══════════════════════════════════
QUALITY CHECK before you output
═══════════════════════════════════
✓ One consistent hero, defined in characterGuide
✓ Clear beginning, middle, end
✓ Every page advances the story and the emotional arc
✓ No two consecutive pages share a sceneType
✓ Page-turn hooks present (and varied), final page resolves
✓ Image prompts are scene-rich (action, emotion, framing, lighting)
✓ Age-appropriate, safe, and not preachy
✓ A memorable, satisfying final scene

═══════════════════════════════════
OUTPUT — STRICT JSON, nothing else
═══════════════════════════════════
{
  "title": "short, kid-friendly, no \\"The Adventures of...\\"",
  "coverPrompt": "single vivid sentence: the most exciting moment, hero prominent",
  "characterGuide": {
    "name": "...",
    "age": "8",
    "appearance": "hair, eyes, build, distinctive features",
    "clothing": "signature outfit worn on every page",
    "accessory": "signature accessory",
    "personality": "...",
    "colorTheme": "e.g. yellow + blue"
  },
  "pages": [
    {
      "pageNumber": 1,
      "sceneType": "wide_establishing",
      "emotion": "wonder",
      "plainText": "the page body text in the kid's reading level",
      "imagePrompt": "one vivid SCENE sentence — action, emotion, environment, camera angle, lighting (do NOT restate the hero's fixed look)"
    }
  ]
}

NEVER include explanations, preamble, or markdown around the JSON. Just the JSON.`;

/** The hero's locked visual identity ("book bible"). Persisted as a
 *  BookCharacter and injected into every image prompt for consistency. */
export interface BookCharacterGuide {
  name: string;
  age: string;
  appearance: string;
  clothing: string;
  accessory: string;
  personality: string;
  colorTheme: string;
}

/** Scene composition the page is framed as — drives camera/angle variety. */
export type BookSceneType =
  | 'wide_establishing'
  | 'character_closeup'
  | 'action'
  | 'discovery'
  | 'emotional_reaction'
  | 'environmental_wonder'
  | 'dramatic_reveal';

/** The four trim sizes a kid can pick in the wizard. Mirrors BookSize in
 *  @gsi/types — declared locally so this prompt package stays dependency-free. */
export type BookTrimSize = 'square' | 'tall' | 'pocket' | 'landscape';

/** Per-trim composition + text-density guidance. The trim size is a stronger
 *  signal for page rhythm than age alone: a pocket joke book wants punchy
 *  one-liners regardless of reader age, a landscape book wants cinematic
 *  wide spreads with very little text, a tall fact book has room to breathe.
 *
 *  `textScale` multiplies the age-band word target (see TONE BY AGE). The
 *  route also generates each image at the book's true aspect ratio, so a
 *  square book gets square art, landscape gets wide art, etc. */
export function formatGuidanceForSize(size: BookTrimSize): {
  label: string;
  textScale: number;
  guidance: string;
} {
  switch (size) {
    case 'landscape':
      return {
        label: 'Landscape (11×8.5") — wide cinematic / wordless-leaning',
        textScale: 0.6,
        guidance:
          'Wide cinematic spreads. Let the art carry the story — keep text SHORT (one or two lines per page). Favour wide_establishing, environmental_wonder, and action sceneTypes with horizontal framing.',
      };
    case 'pocket':
      return {
        label: 'Pocket (5.5×8.5") — poems / jokes / diary',
        textScale: 0.65,
        guidance:
          'Small, intimate page. Keep text PUNCHY and short — one tight moment per page. Favour character_closeup and emotional_reaction with vertical framing. No long paragraphs.',
      };
    case 'tall':
      return {
        label: 'Tall (8.5×11") — storybook / fact book',
        textScale: 1.15,
        guidance:
          'Generous portrait page with room for richer text. You may use a slightly longer paragraph and a portrait-framed illustration. Good for discovery and dramatic_reveal beats.',
      };
    case 'square':
    default:
      return {
        label: 'Square (8×8") — classic picture book',
        textScale: 1.0,
        guidance:
          'Balanced classic picture-book rhythm: one clear illustration moment plus a few well-chosen lines per page. Mix sceneTypes freely with square-friendly centred framing.',
      };
  }
}

export interface BuildBookGeneratePromptInput {
  topic: string;
  /** 6-17 */
  age: number;
  /** funny / brave / silly / scary / sweet / mysterious */
  style: string;
  /** 3-10. Anything outside is clamped server-side before the prompt is built. */
  pageCount: number;
  /** Book trim size — drives text density + scene framing. Defaults to square. */
  size?: BookTrimSize;
  /** Optional kid-supplied title; if absent the model invents one. */
  titleHint?: string;
}

export function buildBookGenerateUserMessage(input: BuildBookGeneratePromptInput): string {
  const titleLine = input.titleHint
    ? `Title (use this if it fits the topic, otherwise improve it): "${input.titleHint}"`
    : 'Title: invent something short and kid-friendly';
  const fmt = formatGuidanceForSize(input.size ?? 'square');
  const textNote =
    fmt.textScale < 1
      ? `Use ABOUT ${Math.round(fmt.textScale * 100)}% of the usual word count for this age — this is a compact format.`
      : fmt.textScale > 1
        ? `You have room for a bit more text than usual for this age (about ${Math.round(fmt.textScale * 100)}%).`
        : `Use the standard word count for this age.`;
  return [
    `Design and write a premium children's book.`,
    ``,
    `Topic: ${input.topic}`,
    `Reader age: ${input.age}`,
    `Style: ${input.style}`,
    `Number of pages: ${input.pageCount}`,
    `Book format: ${fmt.label}`,
    `Format direction: ${fmt.guidance} ${textNote}`,
    titleLine,
    ``,
    `First lock the characterGuide, then write every page against it. Vary sceneType page to page, push the emotional arc forward, and hook the page turns.`,
    `Return JSON exactly matching the schema in the system prompt. No preamble, no markdown.`,
  ].join('\n');
}

// ── Illustration art direction ──────────────────────────────────
//
// These run downstream of the model: the route composes the FINAL image
// prompt sent to (and persisted for) the image provider by combining the
// per-page scene prompt with the locked character anchor, an age-tuned art
// style, and a universal quality suffix. This is what actually delivers
// "premium" looking, character-consistent art — independent of how
// disciplined the LLM was.

/** Appended to every image prompt (cover + pages) to push AI art quality. */
export const ILLUSTRATION_QUALITY_SUFFIX =
  "professional children's book illustration, award-winning storybook art, highly detailed, cinematic composition, beautiful lighting, expressive characters, vibrant colors, premium publishing quality, full-page illustration, masterpiece";

/** Age-tuned art style keywords — younger skews soft/3D, older skews
 *  cinematic/concept-art. Bands match TONE BY AGE in the system prompt. */
export function artStyleForAge(age: number): string {
  if (age <= 8) {
    return 'soft Pixar-style 3D illustration, storybook quality, warm lighting, expressive faces, vibrant colors';
  }
  if (age <= 11) {
    return 'modern illustrated adventure book, high-detail, cinematic composition, vibrant storytelling';
  }
  if (age <= 14) {
    return 'graphic novel quality, stylized cinematic artwork, strong atmosphere';
  }
  return 'YA illustrated novel, concept-art quality, cinematic scenes, rich mood and lighting';
}

/** Compact, reusable description of the hero injected into image prompts so
 *  the same character renders identically on every page and the cover. */
export function characterAnchor(guide: BookCharacterGuide | null): string {
  if (!guide) return '';
  const parts: string[] = [];
  const head = [guide.name, guide.appearance].filter(Boolean).join(', ');
  if (head) parts.push(head);
  if (guide.clothing) parts.push(`wearing ${guide.clothing}`);
  if (guide.accessory) parts.push(`with ${guide.accessory}`);
  if (guide.colorTheme) parts.push(`color palette ${guide.colorTheme}`);
  return parts.join(', ');
}

/** Human-readable look description for the persisted BookCharacter card. */
export function characterLookDescription(guide: BookCharacterGuide): string {
  return [
    guide.appearance,
    guide.clothing ? `Always wears ${guide.clothing}.` : '',
    guide.accessory ? `Always carries ${guide.accessory}.` : '',
    guide.colorTheme ? `Color theme: ${guide.colorTheme}.` : '',
    guide.personality ? `Personality: ${guide.personality}.` : '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
}

/** Build the final per-page image prompt sent to the provider:
 *  scene + locked character + emotion + age art style + quality suffix. */
export function buildPageImagePrompt(opts: {
  scenePrompt: string;
  emotion?: string;
  guide: BookCharacterGuide | null;
  age: number;
}): string {
  const anchor = characterAnchor(opts.guide);
  const segs: string[] = [];
  if (anchor) segs.push(`Character: ${anchor}`);
  segs.push(opts.scenePrompt);
  if (opts.emotion) segs.push(`mood: ${opts.emotion}`);
  segs.push(artStyleForAge(opts.age));
  segs.push(ILLUSTRATION_QUALITY_SUFFIX);
  return segs
    .map((s) => s.trim().replace(/\.$/, ''))
    .filter(Boolean)
    .join('. ');
}

/** Build the final cover image prompt — hero prominent, bookstore quality. */
export function buildCoverImagePrompt(opts: {
  coverPrompt: string;
  guide: BookCharacterGuide | null;
  age: number;
}): string {
  const anchor = characterAnchor(opts.guide);
  const segs: string[] = [];
  if (anchor) segs.push(`Main character prominently featured: ${anchor}`);
  segs.push(opts.coverPrompt);
  segs.push(
    "award-winning children's book cover, professional publishing quality, rich color contrast, clear focal point, magical atmosphere, beautiful typography space",
  );
  segs.push(artStyleForAge(opts.age));
  segs.push(ILLUSTRATION_QUALITY_SUFFIX);
  return segs
    .map((s) => s.trim().replace(/\.$/, ''))
    .filter(Boolean)
    .join('. ');
}
