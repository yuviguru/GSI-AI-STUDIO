/**
 * Challenge Catalog — daily, weekly, and ongoing tasks for kids.
 *
 * Each challenge declares:
 *   - A target metric (creations, points, concepts, share count, streak)
 *   - A goal (e.g. 1 story today, 10 creations all-time)
 *   - A reward (XP + optional gems)
 *   - Where to go to start (`href`)
 *
 * Completion is computed client-side from the AiPoints context (single source
 * of truth for kid progress) — no per-challenge Firestore doc needed for
 * Phase 1.5. Server-side gating can be layered on later.
 */

export type ChallengeCadence = 'daily' | 'weekly' | 'ongoing';

export type ChallengeMetric =
  | 'creationsByType'
  | 'totalCreations'
  | 'totalPoints'
  | 'conceptsLearned'
  | 'shareCount';

export interface Challenge {
  id: string;
  title: string;
  subtitle: string;
  cadence: ChallengeCadence;
  metric: ChallengeMetric;
  /** Target value for completion. */
  goal: number;
  /** Optional creationType filter (only for `creationsByType`). */
  creationType?: 'story' | 'music' | 'quiz' | 'comic' | 'game';
  xpReward: number;
  gemReward?: number;
  /** Tailwind background class for the icon tile. */
  bg: string;
  /** Lucide icon name — looked up by the widget. */
  icon: 'GraduationCap' | 'CalendarCheck' | 'FlaskConical' | 'Music' | 'BookOpen' | 'Trophy' | 'Share2' | 'Lightbulb';
  href: string;
}

export const CHALLENGES: readonly Challenge[] = [
  {
    id: 'daily-creation',
    title: 'Make today count',
    subtitle: 'Daily challenge',
    cadence: 'daily',
    metric: 'totalCreations',
    goal: 1,
    xpReward: 50,
    gemReward: 1,
    bg: 'bg-orange-100',
    icon: 'CalendarCheck',
    href: '/create/story',
  },
  {
    id: 'weekly-quiz-master',
    title: 'Quiz Master',
    subtitle: 'Weekly · make 3 quizzes',
    cadence: 'weekly',
    metric: 'creationsByType',
    creationType: 'quiz',
    goal: 3,
    xpReward: 180,
    bg: 'bg-cyan-100',
    icon: 'FlaskConical',
    href: '/create/quiz',
  },
  {
    id: 'weekly-beat-maker',
    title: 'Beat Maker',
    subtitle: 'Weekly · make 2 songs',
    cadence: 'weekly',
    metric: 'creationsByType',
    creationType: 'music',
    goal: 2,
    xpReward: 150,
    gemReward: 3,
    bg: 'bg-rose-100',
    icon: 'Music',
    href: '/create/music',
  },
  {
    id: 'ongoing-storyteller',
    title: 'Storyteller',
    subtitle: 'Make 5 stories',
    cadence: 'ongoing',
    metric: 'creationsByType',
    creationType: 'story',
    goal: 5,
    xpReward: 250,
    bg: 'bg-violet-100',
    icon: 'BookOpen',
    href: '/create/story',
  },
  {
    id: 'ongoing-curious-mind',
    title: 'Curious Mind',
    subtitle: 'Learn 5 AI concepts',
    cadence: 'ongoing',
    metric: 'conceptsLearned',
    goal: 5,
    xpReward: 200,
    bg: 'bg-amber-100',
    icon: 'Lightbulb',
    href: '/learn',
  },
  {
    id: 'ongoing-share-the-love',
    title: 'Share the love',
    subtitle: 'Share 3 creations',
    cadence: 'ongoing',
    metric: 'shareCount',
    goal: 3,
    xpReward: 100,
    bg: 'bg-emerald-100',
    icon: 'Share2',
    href: '/creations',
  },
] as const;

export interface ChallengeProgress {
  challenge: Challenge;
  current: number;
  completed: boolean;
  /** 0..1 ratio for progress bar. */
  ratio: number;
}

interface ChallengeMetrics {
  totalPoints: number;
  totalCreations: number;
  creationsByType: Record<string, number>;
  conceptsLearned: string[];
  shareCount: number;
}

export function computeProgress(
  challenge: Challenge,
  metrics: ChallengeMetrics,
): ChallengeProgress {
  let current = 0;

  switch (challenge.metric) {
    case 'totalPoints':
      current = metrics.totalPoints;
      break;
    case 'totalCreations':
      current = metrics.totalCreations;
      break;
    case 'creationsByType':
      current = challenge.creationType
        ? metrics.creationsByType[challenge.creationType] ?? 0
        : 0;
      break;
    case 'conceptsLearned':
      current = metrics.conceptsLearned.length;
      break;
    case 'shareCount':
      current = metrics.shareCount;
      break;
  }

  const ratio = Math.min(1, challenge.goal === 0 ? 0 : current / challenge.goal);
  return {
    challenge,
    current,
    completed: current >= challenge.goal,
    ratio,
  };
}
