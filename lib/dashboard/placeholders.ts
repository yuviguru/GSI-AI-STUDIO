/**
 * Placeholder data layer for dashboard widgets that don't yet have real data
 * pipelines wired up. The structure makes the gap visible in the UI itself
 * (a corner ribbon + muted styling) so we never accidentally ship mocks as
 * real metrics.
 *
 * Toggle with NEXT_PUBLIC_USE_DASHBOARD_PLACEHOLDERS=false to hide
 * placeholder-flagged widgets entirely.
 */

const ENABLED =
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_USE_DASHBOARD_PLACEHOLDERS !== 'false';

export interface Placeholder<T> {
  isPlaceholder: true;
  value: T;
}

export interface RealValue<T> {
  isPlaceholder: false;
  value: T;
}

export type Placeable<T> = Placeholder<T> | RealValue<T>;

export function placeholder<T>(value: T): Placeholder<T> {
  return { isPlaceholder: true, value };
}

export function isPlaceholder<T>(p: Placeable<T>): p is Placeholder<T> {
  return ENABLED && p.isPlaceholder;
}

interface ActivityItem {
  type: string;
  count: number;
}

export const PLACEHOLDERS = {
  todaysActivity: placeholder<ActivityItem[]>([
    { type: 'story', count: 3 },
    { type: 'music', count: 1 },
  ]),
  dailyChallenge: placeholder<{ title: string; reward: number }>({
    title: 'Beat the AI today!',
    reward: 30,
  }),
  leaderboard: placeholder<Array<{ name: string; points: number }>>([
    { name: 'Aarav', points: 420 },
    { name: 'Diya', points: 380 },
    { name: 'Krish', points: 310 },
  ]),
  streak: placeholder<number>(7),
};
