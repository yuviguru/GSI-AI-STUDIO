import type { ModeGroup } from './GameModes';

type Variant = 'desktop' | 'mobile';

/**
 * Tile shape — drives the foreground layout (text vs object positioning)
 * inside ModeTile. Derived from the bento cell each card occupies.
 *
 *  - 'tall'   : taller-than-wide (or square big) → object on top, text bottom
 *  - 'wide'   : wider-than-tall                 → text on left, object on right
 *  - 'single' : roughly 1×1 small               → text top-left, object bottom-right
 */
export type TileShape = 'tall' | 'wide' | 'single';

/**
 * Bento layout per group — featured hero + supporting cards of varied sizes,
 * matching the reference board. Shared by desktop ModeGrid and mobile
 * HubScene (one source of truth).
 *
 * CREATE (6) — 3×3 matrix:
 *     [ A B B ]   A = (0,0)+(1,0)  tall left  (1 wide × 2 tall) → index 0 (Book)
 *     [ A C D ]   B = (0,1)+(0,2)  wide top   (2 wide)          → index 1 (Story)
 *     [ E E F ]   C,D = (1,1),(1,2) single tiles                → index 2,3 (Game, Music)
 *                 E = (2,0)+(2,1)  wide bottom (2 wide)         → index 4 (Comic)
 *                 F = (2,2)        single bottom-right          → index 5 (Quiz)
 *
 * PLAY (3) — 2×2 matrix mirroring the Story/Game/Music portion of Create:
 *     [ A A ]     A = (0,0)+(0,1)  wide hero  (2 wide)          → index 0 (Kid CEO)
 *     [ B C ]     B,C = (1,0),(1,1) single tiles                → index 1,2 (MindX, Beat AI)
 *
 * LEARN (2) — 1×2 stack of Story-style wide cinema strips:
 *     [ A ]       A = (0,0)        wide                         → index 0 (AI Lab)
 *     [ B ]       B = (1,0)        wide                         → index 1 (Explore)
 */
export function bentoContainer(group: ModeGroup, _variant: Variant): string {
  if (group === 'create') return 'grid-cols-3 grid-rows-3 grid-flow-row-dense';
  if (group === 'play') return 'grid-cols-2 grid-rows-2 grid-flow-row-dense';
  return 'grid-cols-1 grid-rows-2 grid-flow-row-dense'; // learn
}

export function bentoSpan(group: ModeGroup, index: number, _variant: Variant): string {
  if (group === 'create') {
    if (index === 0) return 'row-span-2'; //          A: tall left (1 wide × 2 tall)
    if (index === 1 || index === 4) return 'col-span-2'; // B, E: wide (2 wide)
    return ''; //                                     C, D, F: single 1×1
  }
  if (group === 'play') {
    // Index 0 (Kid CEO) spans both columns at the top → wide cinema-strip hero.
    // Indices 1 & 2 sit as singles in row 2 (no span class needed).
    if (index === 0) return 'col-span-2';
    return '';
  }
  // learn — single column, every tile is full-width; nothing to span explicitly.
  return '';
}

export function bentoShape(group: ModeGroup, index: number, _variant: Variant): TileShape {
  if (group === 'create') {
    if (index === 0) return 'tall';                       // A: row-span-2
    if (index === 1 || index === 4) return 'wide';        // B, E: col-span-2
    return 'single';                                       // C, D, F
  }
  if (group === 'play') {
    if (index === 0) return 'wide';                       // CEO: hero cinema strip
    return 'single';                                       // MindX, Beat AI
  }
  // learn — both cards render as Story-style wide cinema strips, stacked.
  return 'wide';
}
