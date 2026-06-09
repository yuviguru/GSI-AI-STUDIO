/**
 * Scene-type → page-layout mapping (BOOK-006).
 *
 * The premium book prompt tags every page with a `sceneType` (the composition
 * the AI framed it as). Here we turn that into a concrete `PageLayout`, varied
 * by the book's trim `size`, so the generated book alternates between
 * full-bleed cinematic pages and framed art-and-text pages — the
 * "hybrid by scene type" direction — instead of every page looking identical.
 *
 * The result is always validated against the book's bucket by
 * `createGeneratedBook`, which falls back to the bucket default if a mapped
 * layout isn't allowed there. So this only needs to express intent.
 */

import type { BookSize, PageLayout } from '@gsi/types';
import type { BookSceneType } from '@gsi/ai/prompts/bookGeneratePrompt';

/** Scenes that want the art to dominate the page (cinematic, edge-to-edge). */
const CINEMATIC_SCENES: ReadonlySet<BookSceneType> = new Set([
  'wide_establishing',
  'environmental_wonder',
  'dramatic_reveal',
  'action',
]);

/**
 * A full-bleed page overlays its text in a small caption card, which only reads
 * well for a SHORT caption (a line or two). A story page with a full paragraph
 * must get a framed layout with a real text area instead — otherwise the caption
 * swallows the image on screen and (historically) the PDF dropped the overflow.
 * Above this many characters, route the page away from full-bleed.
 */
const FULL_BLEED_MAX_CAPTION_CHARS = 110;

/**
 * Pick a layout for a page given its scene type and the book trim.
 *
 * - Cinematic scenes → full-bleed, EXCEPT on the small pocket trim where
 *   full-bleed leaves no room for legible text, so we frame them instead.
 * - character_closeup → full-bleed on wide/large trims (a big portrait reads
 *   as a poster), framed otherwise.
 * - discovery / emotional_reaction → framed, alternating which side the art
 *   sits on so consecutive framed pages don't look identical.
 */
export function sceneTypeToLayout(
  scene: BookSceneType | undefined,
  size: BookSize,
  pageIndex: number,
  /** The page's body text. Text-heavy pages are kept out of full-bleed so the
   *  caption card never swallows the image / loses text. */
  text?: string,
): PageLayout {
  const framedAlternating: PageLayout =
    pageIndex % 2 === 0 ? 'image_top_text_bottom' : 'text_top_image_bottom';

  if (!scene) return framedAlternating;

  // A paragraph of story text needs a real text area, never a caption overlay.
  const textHeavy = (text?.trim().length ?? 0) > FULL_BLEED_MAX_CAPTION_CHARS;

  if (CINEMATIC_SCENES.has(scene)) {
    // Pocket trim has no room for a legible overlay, and text-heavy pages need a
    // real text area — both fall back to the framed (alternating) layout.
    return size === 'pocket' || textHeavy ? framedAlternating : 'image_full_bleed';
  }

  if (scene === 'character_closeup') {
    return (size === 'landscape' || size === 'square') && !textHeavy
      ? 'image_full_bleed'
      : 'image_top_text_bottom';
  }

  // discovery, emotional_reaction, and any future scene → framed, alternating.
  return framedAlternating;
}
