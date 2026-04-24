/**
 * Phase 4 (ENGAGE-008) — isomorphic types and constants for the class
 * feed. Kept separate from `classFeedService.ts` (which imports
 * `firebase-admin`) so client components can consume the reaction
 * whitelist without bundling `firebase-admin` for the browser.
 */

export const ALLOWED_REACTIONS = ['👍', '🎉', '🌟', '🔥', '💯'] as const;
export type ReactionEmoji = (typeof ALLOWED_REACTIONS)[number];

export function isAllowedReaction(v: unknown): v is ReactionEmoji {
  return (
    typeof v === 'string' &&
    (ALLOWED_REACTIONS as readonly string[]).includes(v)
  );
}

export interface ClassFeedItem {
  submissionId: string;
  creationId: string;
  classId: string;
  schoolId: string;
  kid: { id: string; name: string; avatar?: string };
  creation: {
    id: string;
    type: string;
    title: string;
    thumbnail?: string;
    aiConceptsTaught: string[];
    createdAt: Date;
  };
  approvedAt: Date;
  reactionCounts: Record<string, number>;
  myReaction?: ReactionEmoji;
}
