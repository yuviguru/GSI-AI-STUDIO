/**
 * @gsi/ai — public surface.
 *
 * Heavy generators and clients are addressed via subpaths to keep the
 * top-level import surface light. Callers can do either:
 *   import { generateStory } from '@gsi/ai/storyGenerator';     // direct
 *   import { getImageProvider } from '@gsi/ai/imageProvider';   // direct
 * Common types + the ports layer re-export here.
 */

export * from './ports';
