import type { SessionPointsData } from '@/lib/firebase/sessionService';

// ─── Badge types ─────────────────────────────────────────────────────────────

export type BadgeCriteria =
  | { type: 'total_creations'; min: number }
  | { type: 'creations_of_type'; creationType: string; min: number }
  | { type: 'concepts_learned'; min: number }
  | { type: 'points_total'; min: number }
  | { type: 'share_count'; min: number }
  | { type: 'all_three_types' }
  | { type: 'ceo_register_any' }
  | { type: 'ceo_phases_completed'; min: number }
  | { type: 'ceo_distinct_business_types'; min: number }
  | { type: 'ceo_dimension_score'; dimension: string; min: number }
  | { type: 'ceo_quick_decisions'; responseSeconds: number; count: number }
  | { type: 'ceo_completed_with_cash_ratio'; min: number };

export interface Badge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  criteria: BadgeCriteria;
}

/**
 * Optional snapshot of Kid CEO progress, passed alongside SessionPointsData
 * when checking for CEO-specific badge unlocks. When undefined or missing
 * fields, CEO badges simply never unlock (safe no-op).
 */
export interface CeoProgressSnapshot {
  businessesRegistered?: number;
  phasesCompleted?: number;
  distinctBusinessTypes?: string[];
  dimensionScores?: Record<string, number>;
  quickDecisionsCount?: number; // count of decisions made under responseSeconds threshold
  bestCashRatio?: number; // max ratio at completion across all sims
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
  {
    id: 'first_business',
    name: 'First Business',
    description: 'Register your very first Kid CEO business',
    emoji: '🏪',
    criteria: { type: 'ceo_register_any' },
  },
  {
    id: 'quick_thinker',
    name: 'Quick Thinker',
    description: '3 snap decisions in under 15 seconds',
    emoji: '⚡',
    criteria: { type: 'ceo_quick_decisions', responseSeconds: 15, count: 3 },
  },
  {
    id: 'money_smart',
    name: 'Money Smart',
    description: 'Finish a full business with more than 50% of your starting cash',
    emoji: '💰',
    criteria: { type: 'ceo_completed_with_cash_ratio', min: 0.5 },
  },
  {
    id: 'phase_master',
    name: 'Phase Master',
    description: 'Run a business through all 5 phases',
    emoji: '🏆',
    criteria: { type: 'ceo_phases_completed', min: 5 },
  },
  {
    id: 'serial_ceo',
    name: 'Serial CEO',
    description: 'Try 3 different kinds of businesses',
    emoji: '🔄',
    criteria: { type: 'ceo_distinct_business_types', min: 3 },
  },
  {
    id: 'cool_head',
    name: 'Cool Head',
    description: 'Hit 70+ on Cool Under Pressure',
    emoji: '🧊',
    criteria: { type: 'ceo_dimension_score', dimension: 'crisis_response', min: 70 },
  },
];

// ─── Unlock evaluator ─────────────────────────────────────────────────────────

function meetsCriteria(
  criteria: BadgeCriteria,
  data: SessionPointsData,
  ceoProgress?: CeoProgressSnapshot,
): boolean {
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

    case 'ceo_register_any':
      return (ceoProgress?.businessesRegistered ?? 0) >= 1;

    case 'ceo_phases_completed':
      return (ceoProgress?.phasesCompleted ?? 0) >= criteria.min;

    case 'ceo_distinct_business_types':
      return (ceoProgress?.distinctBusinessTypes?.length ?? 0) >= criteria.min;

    case 'ceo_dimension_score':
      return (ceoProgress?.dimensionScores?.[criteria.dimension] ?? 0) >= criteria.min;

    case 'ceo_quick_decisions':
      // quickDecisionsCount is already gated by the same responseSeconds threshold upstream
      return (ceoProgress?.quickDecisionsCount ?? 0) >= criteria.count;

    case 'ceo_completed_with_cash_ratio':
      return (ceoProgress?.bestCashRatio ?? 0) >= criteria.min;
  }
}

/**
 * Returns the IDs of all badges that the given session data qualifies for.
 * Used server-side to check for new unlocks after each points action.
 *
 * The optional `ceoProgress` snapshot carries Kid CEO–specific state that
 * isn't (yet) on SessionPointsData. When omitted, CEO-gated badges simply
 * never unlock.
 */
export function checkBadgeUnlocks(
  data: SessionPointsData,
  ceoProgress?: CeoProgressSnapshot,
): string[] {
  return BADGE_CATALOG.filter((badge) => meetsCriteria(badge.criteria, data, ceoProgress)).map(
    (badge) => badge.id,
  );
}

/**
 * Returns a human-readable progress hint for a locked badge.
 * E.g. "Create 2 more stories" for story_wizard when at 1/3.
 */
export function getBadgeProgressHint(
  badge: Badge,
  data: SessionPointsData,
  ceoProgress?: CeoProgressSnapshot,
): string {
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
    case 'ceo_register_any':
      return (ceoProgress?.businessesRegistered ?? 0) >= 1
        ? ''
        : 'Register your first business to unlock!';
    case 'ceo_phases_completed': {
      const remaining = badge.criteria.min - (ceoProgress?.phasesCompleted ?? 0);
      return remaining <= 0
        ? ''
        : `Complete ${remaining} more business phase${remaining === 1 ? '' : 's'}`;
    }
    case 'ceo_distinct_business_types': {
      const remaining = badge.criteria.min - (ceoProgress?.distinctBusinessTypes?.length ?? 0);
      return remaining <= 0
        ? ''
        : `Try ${remaining} more kind${remaining === 1 ? '' : 's'} of business`;
    }
    case 'ceo_dimension_score': {
      const current = ceoProgress?.dimensionScores?.[badge.criteria.dimension] ?? 0;
      return current >= badge.criteria.min
        ? ''
        : `Score ${badge.criteria.min}+ on Cool Under Pressure`;
    }
    case 'ceo_quick_decisions': {
      const remaining = badge.criteria.count - (ceoProgress?.quickDecisionsCount ?? 0);
      return remaining <= 0
        ? ''
        : `Make ${remaining} more decision${remaining === 1 ? '' : 's'} in under ${badge.criteria.responseSeconds} seconds!`;
    }
    case 'ceo_completed_with_cash_ratio': {
      const pct = Math.round(badge.criteria.min * 100);
      return (ceoProgress?.bestCashRatio ?? 0) >= badge.criteria.min
        ? ''
        : `Finish a business with ${pct}%+ of your starting cash`;
    }
  }
}
