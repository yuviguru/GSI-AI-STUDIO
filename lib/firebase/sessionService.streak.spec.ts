/** Focused unit tests for the pure streak-math helper. The Firestore path
 *  through updateSessionPoints is covered separately in sessionService.spec.ts. */
import { describe, it, expect } from 'vitest';
import { computeHomeworkStreak } from './sessionService';

describe('computeHomeworkStreak', () => {
  it('starts a streak from scratch', () => {
    const result = computeHomeworkStreak({
      previousStreak: 0,
      previousLongest: 0,
      lastCompletedDate: null,
      today: '2026-04-19',
    });
    expect(result).toEqual({
      currentStreak: 1,
      longestStreak: 1,
      lastCompletedDate: '2026-04-19',
    });
  });

  it('increments when yesterday had a completion', () => {
    const result = computeHomeworkStreak({
      previousStreak: 2,
      previousLongest: 3,
      lastCompletedDate: '2026-04-18',
      today: '2026-04-19',
    });
    expect(result).toEqual({
      currentStreak: 3,
      longestStreak: 3,
      lastCompletedDate: '2026-04-19',
    });
  });

  it('updates longestStreak when the new current exceeds it', () => {
    const result = computeHomeworkStreak({
      previousStreak: 4,
      previousLongest: 4,
      lastCompletedDate: '2026-04-18',
      today: '2026-04-19',
    });
    expect(result.currentStreak).toBe(5);
    expect(result.longestStreak).toBe(5);
  });

  it('is idempotent for same-day repeat completions', () => {
    const result = computeHomeworkStreak({
      previousStreak: 3,
      previousLongest: 5,
      lastCompletedDate: '2026-04-19',
      today: '2026-04-19',
    });
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(5);
    expect(result.lastCompletedDate).toBe('2026-04-19');
  });

  it('resets to 1 when a day is skipped', () => {
    const result = computeHomeworkStreak({
      previousStreak: 7,
      previousLongest: 10,
      lastCompletedDate: '2026-04-15',
      today: '2026-04-19',
    });
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(10); // preserved
    expect(result.lastCompletedDate).toBe('2026-04-19');
  });
});
