import type { SessionPointsData } from '@/lib/firebase/sessionService';

// ─── Badge types ─────────────────────────────────────────────────────────────

export type BadgeCriteria =
  | { type: 'total_creations'; min: number }
  | { type: 'creations_of_type'; creationType: string; min: number }
  | { type: 'concepts_learned'; min: number }
  | { type: 'points_total'; min: number }
  | { type: 'share_count'; min: number }
  | { type: 'all_three_types' };

export interface Badge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  criteria: BadgeCriteria;
}

// ─── Badge catalog (12 badges) ───────────────────────────────────────────────

export const BADGE_CATALOG: Badge[] = [
  {
    id: 'first_spark',
    name: 'First Spark',
    description: 'Create your very first AI masterpiece',
    emoji: '✨',
    criteria: { type: 'total_creations', min: 1 },
  },
  {
    id: 'story_wizard',
    name: 'Story Wizard',
    description: 'Weave 3 magical AI stories',
    emoji: '📖',
    criteria: { type: 'creations_of_type', creationType: 'story', min: 3 },
  },
  {
    id: 'music_maestro',
    name: 'Music Maestro',
    description: 'Compose 3 original AI songs',
    emoji: '🎵',
    criteria: { type: 'creations_of_type', creationType: 'music', min: 3 },
  },
  {
    id: 'quiz_champion',
    name: 'Quiz Champion',
    description: 'Create 3 brain-busting AI quizzes',
    emoji: '🏆',
    criteria: { type: 'creations_of_type', creationType: 'quiz', min: 3 },
  },
  {
    id: 'creative_machine',
    name: 'Creative Machine',
    description: 'Build 5 amazing AI creations',
    emoji: '⚙️',
    criteria: { type: 'total_creations', min: 5 },
  },
  {
    id: 'triple_threat',
    name: 'Triple Threat',
    description: 'Create a story, a song, and a quiz',
    emoji: '🎯',
    criteria: { type: 'all_three_types' },
  },
  {
    id: 'ai_explorer',
    name: 'AI Explorer',
    description: 'Discover 5 different AI concepts',
    emoji: '🔭',
    criteria: { type: 'concepts_learned', min: 5 },
  },
  {
    id: 'sharing_star',
    name: 'Sharing Star',
    description: 'Share your creation with the world',
    emoji: '⭐',
    criteria: { type: 'share_count', min: 1 },
  },
  {
    id: 'knowledge_seeker',
    name: 'Knowledge Seeker',
    description: 'Discover 10 different AI concepts',
    emoji: '🧠',
    criteria: { type: 'concepts_learned', min: 10 },
  },
  {
    id: 'maker_milestone',
    name: 'Maker Milestone',
    description: 'Reach 10 total AI creations',
    emoji: '🚀',
    criteria: { type: 'total_creations', min: 10 },
  },
  {
    id: 'point_collector',
    name: 'Point Collector',
    description: 'Earn 100 AI Points',
    emoji: '💎',
    criteria: { type: 'points_total', min: 100 },
  },
  {
    id: 'super_creator',
    name: 'Super Creator',
    description: 'Create 15 AI masterpieces',
    emoji: '🌟',
    criteria: { type: 'total_creations', min: 15 },
  },
];

// ─── Unlock evaluator ─────────────────────────────────────────────────────────

function meetsCriteria(criteria: BadgeCriteria, data: SessionPointsData): boolean {
  const totalCreations = Object.values(data.creationsByType).reduce((sum, n) => sum + n, 0);

  switch (criteria.type) {
    case 'total_creations':
      return totalCreations >= criteria.min;

    case 'creations_of_type':
      return (data.creationsByType[criteria.creationType] ?? 0) >= criteria.min;

    case 'concepts_learned':
      return data.conceptsLearned.length >= criteria.min;

    case 'points_total':
      return data.aiPoints >= criteria.min;

    case 'share_count':
      return data.shareCount >= criteria.min;

    case 'all_three_types':
      return (
        (data.creationsByType['story'] ?? 0) >= 1 &&
        (data.creationsByType['music'] ?? 0) >= 1 &&
        (data.creationsByType['quiz'] ?? 0) >= 1
      );
  }
}

/**
 * Returns the IDs of all badges that the given session data qualifies for.
 * Used server-side to check for new unlocks after each points action.
 */
export function checkBadgeUnlocks(data: SessionPointsData): string[] {
  return BADGE_CATALOG.filter((badge) => meetsCriteria(badge.criteria, data)).map(
    (badge) => badge.id
  );
}

/**
 * Returns a human-readable progress hint for a locked badge.
 * E.g. "Create 2 more stories" for story_wizard when at 1/3.
 */
export function getBadgeProgressHint(badge: Badge, data: SessionPointsData): string {
  const totalCreations = Object.values(data.creationsByType).reduce((sum, n) => sum + n, 0);

  switch (badge.criteria.type) {
    case 'total_creations': {
      const remaining = badge.criteria.min - totalCreations;
      return remaining <= 0 ? '' : `Create ${remaining} more thing${remaining === 1 ? '' : 's'}`;
    }
    case 'creations_of_type': {
      const current = data.creationsByType[badge.criteria.creationType] ?? 0;
      const remaining = badge.criteria.min - current;
      return remaining <= 0 ? '' : `Create ${remaining} more ${badge.criteria.creationType}${remaining === 1 ? '' : 's'}`;
    }
    case 'concepts_learned': {
      const remaining = badge.criteria.min - data.conceptsLearned.length;
      return remaining <= 0 ? '' : `Discover ${remaining} more AI concept${remaining === 1 ? '' : 's'}`;
    }
    case 'points_total': {
      const remaining = badge.criteria.min - data.aiPoints;
      return remaining <= 0 ? '' : `Earn ${remaining} more AI Point${remaining === 1 ? '' : 's'}`;
    }
    case 'share_count':
      return data.shareCount >= 1 ? '' : 'Share one of your creations';
    case 'all_three_types': {
      const missing: string[] = [];
      if (!data.creationsByType['story']) missing.push('a story');
      if (!data.creationsByType['music']) missing.push('a song');
      if (!data.creationsByType['quiz']) missing.push('a quiz');
      return missing.length === 0 ? '' : `Create ${missing.join(', ')}`;
    }
  }
}
