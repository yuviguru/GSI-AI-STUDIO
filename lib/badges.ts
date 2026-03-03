import type { CreationType } from '@/types/creation.types';

// ─── Types ───────────────────────────────────────────────

export type BadgeCategory = 'creation' | 'learning' | 'social' | 'streak';

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  requirement: string;
  category: BadgeCategory;
}

export interface EarnedBadge extends Badge {
  unlockedAt: string;
}

export interface BadgeProgress {
  current: number;
  required: number;
}

export interface UserStats {
  aiPoints: number;
  conceptsLearned: string[];
  creationsByType: Record<CreationType, number>;
  shareCount: number;
  totalCreations: number;
  badges: string[];
}

// ─── Badge Catalog ───────────────────────────────────────

export const BADGE_CATALOG: Badge[] = [
  {
    id: 'first_spark',
    name: 'First Spark',
    emoji: '⚡',
    description: 'You created your very first AI creation!',
    requirement: 'Create your first AI creation (any type)',
    category: 'creation',
  },
  {
    id: 'story_wizard',
    name: 'Story Wizard',
    emoji: '📖',
    description: 'A master storyteller powered by AI!',
    requirement: 'Create 3 stories',
    category: 'creation',
  },
  {
    id: 'music_maestro',
    name: 'Music Maestro',
    emoji: '🎵',
    description: 'Making music with artificial intelligence!',
    requirement: 'Create 3 songs',
    category: 'creation',
  },
  {
    id: 'quiz_champion',
    name: 'Quiz Champion',
    emoji: '🏆',
    description: 'A quiz master who loves to learn!',
    requirement: 'Create 3 quizzes',
    category: 'creation',
  },
  {
    id: 'creative_machine',
    name: 'Creative Machine',
    emoji: '🤖',
    description: 'Unstoppable creativity — 10 creations and counting!',
    requirement: 'Create 10 total creations',
    category: 'creation',
  },
  {
    id: 'ai_explorer',
    name: 'AI Explorer',
    emoji: '🔬',
    description: 'Curious about how AI works under the hood!',
    requirement: 'View 5 different AI X-Ray explanations',
    category: 'learning',
  },
  {
    id: 'sharing_star',
    name: 'Sharing Star',
    emoji: '⭐',
    description: 'Loves sharing creations with friends and family!',
    requirement: 'Share 3 creations',
    category: 'social',
  },
  {
    id: 'curious_mind',
    name: 'Curious Mind',
    emoji: '🧠',
    description: 'Earned 100 AI Points by exploring and learning!',
    requirement: 'Earn 100 AI Points',
    category: 'learning',
  },
  {
    id: 'knowledge_seeker',
    name: 'Knowledge Seeker',
    emoji: '📚',
    description: 'Learned 10 different AI concepts — wow!',
    requirement: 'Learn 10 different AI concepts',
    category: 'learning',
  },
  {
    id: 'super_creator',
    name: 'Super Creator',
    emoji: '🌟',
    description: 'An AI creation superstar with 25 creations!',
    requirement: 'Create 25 total creations',
    category: 'streak',
  },
  {
    id: 'all_rounder',
    name: 'All-Rounder',
    emoji: '🎯',
    description: 'Tried every type of AI creation — stories, music, and quizzes!',
    requirement: 'Create at least 1 story, 1 song, and 1 quiz',
    category: 'creation',
  },
];

// ─── Unlock Checking ─────────────────────────────────────

type UnlockChecker = (stats: UserStats) => boolean;

const UNLOCK_CRITERIA: Record<string, UnlockChecker> = {
  first_spark: (s) => s.totalCreations >= 1,
  story_wizard: (s) => (s.creationsByType.story ?? 0) >= 3,
  music_maestro: (s) => (s.creationsByType.music ?? 0) >= 3,
  quiz_champion: (s) => (s.creationsByType.quiz ?? 0) >= 3,
  creative_machine: (s) => s.totalCreations >= 10,
  ai_explorer: (s) => s.conceptsLearned.length >= 5,
  sharing_star: (s) => s.shareCount >= 3,
  curious_mind: (s) => s.aiPoints >= 100,
  knowledge_seeker: (s) => s.conceptsLearned.length >= 10,
  super_creator: (s) => s.totalCreations >= 25,
  all_rounder: (s) =>
    (s.creationsByType.story ?? 0) >= 1 &&
    (s.creationsByType.music ?? 0) >= 1 &&
    (s.creationsByType.quiz ?? 0) >= 1,
};

/**
 * Check which badges should be newly unlocked based on current stats.
 * Returns only badges that are not already in the user's badges array.
 */
export function checkBadgeUnlocks(stats: UserStats): Badge[] {
  const newBadges: Badge[] = [];

  for (const badge of BADGE_CATALOG) {
    if (stats.badges.includes(badge.id)) continue;
    const checker = UNLOCK_CRITERIA[badge.id];
    if (checker && checker(stats)) {
      newBadges.push(badge);
    }
  }

  return newBadges;
}

/**
 * Get progress toward a specific badge.
 */
export function getBadgeProgress(stats: UserStats, badge: Badge): BadgeProgress {
  switch (badge.id) {
    case 'first_spark':
      return { current: Math.min(stats.totalCreations, 1), required: 1 };
    case 'story_wizard':
      return { current: Math.min(stats.creationsByType.story ?? 0, 3), required: 3 };
    case 'music_maestro':
      return { current: Math.min(stats.creationsByType.music ?? 0, 3), required: 3 };
    case 'quiz_champion':
      return { current: Math.min(stats.creationsByType.quiz ?? 0, 3), required: 3 };
    case 'creative_machine':
      return { current: Math.min(stats.totalCreations, 10), required: 10 };
    case 'ai_explorer':
      return { current: Math.min(stats.conceptsLearned.length, 5), required: 5 };
    case 'sharing_star':
      return { current: Math.min(stats.shareCount, 3), required: 3 };
    case 'curious_mind':
      return { current: Math.min(stats.aiPoints, 100), required: 100 };
    case 'knowledge_seeker':
      return { current: Math.min(stats.conceptsLearned.length, 10), required: 10 };
    case 'super_creator':
      return { current: Math.min(stats.totalCreations, 25), required: 25 };
    case 'all_rounder': {
      const types = ['story', 'music', 'quiz'] as const;
      const done = types.filter((t) => (stats.creationsByType[t] ?? 0) >= 1).length;
      return { current: done, required: 3 };
    }
    default:
      return { current: 0, required: 1 };
  }
}
