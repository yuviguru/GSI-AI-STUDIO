import { describe, it, expect } from 'vitest';
import {
  calculateSkillXp,
  getSkillLevel,
  getAiDifficulty,
  detectLevelUp,
  getDefaultSkills,
  calculateAvgScore,
  determineResult,
  calculateAiPoints,
} from './skillEngine';
import type { BeatTheAiRound, BeatTheAiScores, BeatTheAiSkills } from '@/types/beatTheAi.types';

// ─── Helper factories ─────────────────────────────────────

function makeRound(overrides: Partial<Pick<BeatTheAiRound, 'category' | 'prompt' | 'result' | 'kidScores' | 'timeUsedSeconds'>> = {}) {
  return {
    category: 'story_sprint' as const,
    prompt: { text: 'Test', theme: 'Test', timeLimit: 180, category: 'story_sprint' as const, isIndiaThemed: true },
    result: 'kid_wins' as const,
    kidScores: { creativity: 4, funFactor: 4, accuracy: 4, heart: 4 } as BeatTheAiScores,
    timeUsedSeconds: 60,
    ...overrides,
  };
}

// ─── getSkillLevel ────────────────────────────────────────

describe('getSkillLevel', () => {
  it('returns Beginner at 0 XP', () => {
    const result = getSkillLevel(0);
    expect(result.level).toBe(1);
    expect(result.title).toBe('Beginner');
    expect(result.xp).toBe(0);
  });

  it('returns Apprentice at 51 XP', () => {
    expect(getSkillLevel(51).level).toBe(2);
    expect(getSkillLevel(51).title).toBe('Apprentice');
  });

  it('returns Creator at 151 XP', () => {
    expect(getSkillLevel(151).level).toBe(3);
  });

  it('returns Master at 301 XP', () => {
    expect(getSkillLevel(301).level).toBe(4);
  });

  it('returns Legend at 501 XP', () => {
    expect(getSkillLevel(501).level).toBe(5);
    expect(getSkillLevel(501).title).toBe('Legend');
  });

  it('stays at current level between thresholds', () => {
    expect(getSkillLevel(50).level).toBe(1);
    expect(getSkillLevel(150).level).toBe(2);
    expect(getSkillLevel(300).level).toBe(3);
    expect(getSkillLevel(500).level).toBe(4);
  });

  it('provides nextLevelXp correctly', () => {
    expect(getSkillLevel(0).nextLevelXp).toBe(51);
    expect(getSkillLevel(51).nextLevelXp).toBe(151);
    // Legend has no next level — returns own minXp
    expect(getSkillLevel(501).nextLevelXp).toBe(501);
  });
});

// ─── calculateSkillXp ────────────────────────────────────

describe('calculateSkillXp', () => {
  it('gives +5 XP to primary skill for category', () => {
    const round = makeRound({ result: 'ai_wins', kidScores: { creativity: 1, funFactor: 1, accuracy: 1, heart: 1 }, timeUsedSeconds: 170 });
    round.prompt.isIndiaThemed = false;
    const xp = calculateSkillXp(round, 0);
    expect(xp.storytelling).toBeGreaterThanOrEqual(5);
  });

  it('gives +3 bonus on kid win', () => {
    const winRound = makeRound({ result: 'kid_wins', kidScores: { creativity: 1, funFactor: 1, accuracy: 1, heart: 1 }, timeUsedSeconds: 170 });
    winRound.prompt.isIndiaThemed = false;
    const loseRound = makeRound({ result: 'ai_wins', kidScores: { creativity: 1, funFactor: 1, accuracy: 1, heart: 1 }, timeUsedSeconds: 170 });
    loseRound.prompt.isIndiaThemed = false;

    const winXp = calculateSkillXp(winRound, 0);
    const loseXp = calculateSkillXp(loseRound, 0);
    expect((winXp.storytelling ?? 0) - (loseXp.storytelling ?? 0)).toBe(3);
  });

  it('gives +2 for each score criteria ≥ 4', () => {
    const round = makeRound({
      result: 'ai_wins',
      kidScores: { creativity: 5, funFactor: 5, accuracy: 5, heart: 5 },
      timeUsedSeconds: 170,
    });
    round.prompt.isIndiaThemed = false;
    const xp = calculateSkillXp(round, 0);
    // creativity: +2, storytelling(funFactor): +2, knowledge(accuracy): +2, culturalConnect(heart): +2
    expect(xp.creativity).toBe(2);
    expect(xp.knowledge).toBe(2);
  });

  it('gives +3 Speed Thinking for fast completion', () => {
    const round = makeRound({ timeUsedSeconds: 50 }); // < 180*0.5 = 90
    round.prompt.isIndiaThemed = false;
    const xp = calculateSkillXp(round, 0);
    expect(xp.speedThinking).toBe(3);
  });

  it('does NOT give Speed Thinking for slow completion', () => {
    const round = makeRound({ timeUsedSeconds: 170 });
    round.prompt.isIndiaThemed = false;
    const xp = calculateSkillXp(round, 0);
    expect(xp.speedThinking).toBeUndefined();
  });

  it('gives +2 Cultural Connect for India-themed prompts', () => {
    const round = makeRound({ result: 'ai_wins', kidScores: { creativity: 1, funFactor: 1, accuracy: 1, heart: 1 }, timeUsedSeconds: 170 });
    round.prompt.isIndiaThemed = true;
    const xp = calculateSkillXp(round, 0);
    expect(xp.culturalConnect).toBe(2);
  });

  it('gives +5 Creativity bonus on 3-win streak', () => {
    const round = makeRound({ result: 'kid_wins', kidScores: { creativity: 1, funFactor: 1, accuracy: 1, heart: 1 }, timeUsedSeconds: 170 });
    round.prompt.isIndiaThemed = false;
    const xp = calculateSkillXp(round, 3);
    expect(xp.creativity).toBe(5);
  });

  it('does NOT give streak bonus when not winning', () => {
    const round = makeRound({ result: 'ai_wins', kidScores: { creativity: 1, funFactor: 1, accuracy: 1, heart: 1 }, timeUsedSeconds: 170 });
    round.prompt.isIndiaThemed = false;
    const xp = calculateSkillXp(round, 3);
    expect(xp.creativity).toBeUndefined();
  });

  it('gives quiz_whiz primary skill to knowledge', () => {
    const round = makeRound({ category: 'quiz_whiz', result: 'ai_wins', kidScores: { creativity: 1, funFactor: 1, accuracy: 1, heart: 1 }, timeUsedSeconds: 230 });
    round.prompt = { ...round.prompt, category: 'quiz_whiz', timeLimit: 240, isIndiaThemed: false };
    const xp = calculateSkillXp(round, 0);
    expect(xp.knowledge).toBeGreaterThanOrEqual(5);
  });
});

// ─── getAiDifficulty ─────────────────────────────────────

describe('getAiDifficulty', () => {
  it('returns easy for all level 1-2 skills', () => {
    const skills = getDefaultSkills();
    expect(getAiDifficulty(skills)).toBe('easy');
  });

  it('returns medium when any skill reaches level 3', () => {
    const skills = getDefaultSkills();
    skills.creativity = getSkillLevel(151); // level 3
    expect(getAiDifficulty(skills)).toBe('medium');
  });

  it('returns hard when any skill reaches level 4+', () => {
    const skills = getDefaultSkills();
    skills.storytelling = getSkillLevel(301); // level 4
    expect(getAiDifficulty(skills)).toBe('hard');
  });
});

// ─── detectLevelUp ───────────────────────────────────────

describe('detectLevelUp', () => {
  it('returns empty array when no levels changed', () => {
    const old = getDefaultSkills();
    const now = getDefaultSkills();
    expect(detectLevelUp(old, now)).toEqual([]);
  });

  it('detects single level up', () => {
    const old = getDefaultSkills();
    const now = getDefaultSkills();
    now.creativity = getSkillLevel(51);
    expect(detectLevelUp(old, now)).toEqual(['creativity']);
  });

  it('detects multiple level ups', () => {
    const old = getDefaultSkills();
    const now = getDefaultSkills();
    now.creativity = getSkillLevel(51);
    now.wordplay = getSkillLevel(151);
    const result = detectLevelUp(old, now);
    expect(result).toContain('creativity');
    expect(result).toContain('wordplay');
    expect(result.length).toBe(2);
  });
});

// ─── getDefaultSkills ────────────────────────────────────

describe('getDefaultSkills', () => {
  it('returns all 6 skills', () => {
    const skills = getDefaultSkills();
    expect(Object.keys(skills).length).toBe(6);
  });

  it('all skills start at level 1 with 0 XP', () => {
    const skills = getDefaultSkills();
    for (const skill of Object.values(skills)) {
      expect(skill.level).toBe(1);
      expect(skill.xp).toBe(0);
    }
  });
});

// ─── calculateAvgScore ───────────────────────────────────

describe('calculateAvgScore', () => {
  it('returns correct average', () => {
    expect(calculateAvgScore({ creativity: 5, funFactor: 3, accuracy: 4, heart: 4 })).toBe(4);
  });

  it('rounds to 2 decimal places', () => {
    expect(calculateAvgScore({ creativity: 5, funFactor: 4, accuracy: 3, heart: 3 })).toBe(3.75);
  });
});

// ─── determineResult ─────────────────────────────────────

describe('determineResult', () => {
  it('kid wins when kid avg > 50% of AI avg', () => {
    // AI avg 4.0, threshold 2.0 → kid 3.0 > 2.0 → kid wins
    expect(determineResult(3.0, 4.0)).toBe('kid_wins');
  });

  it('kid wins when kid avg is higher than AI', () => {
    expect(determineResult(4.5, 3.2)).toBe('kid_wins');
  });

  it('kid wins with genuine effort (2.5 vs 4.0)', () => {
    // AI avg 4.0, threshold 2.0 → kid 2.5 > 2.0 → kid wins
    expect(determineResult(2.5, 4.0)).toBe('kid_wins');
  });

  it('ai wins when kid avg < 50% of AI avg', () => {
    // AI avg 4.0, threshold 2.0 → kid 1.5 < 2.0 → AI wins
    expect(determineResult(1.5, 4.0)).toBe('ai_wins');
  });

  it('tie when kid avg exactly at 50% threshold', () => {
    // AI avg 4.0, threshold 2.0 → kid exactly 2.0 → tie
    expect(determineResult(2.0, 4.0)).toBe('tie');
  });
});

// ─── calculateAiPoints ───────────────────────────────────

describe('calculateAiPoints', () => {
  it('returns 25 for kid win (15 base + 10 bonus)', () => {
    expect(calculateAiPoints('kid_wins')).toBe(25);
  });

  it('returns 15 for ai win', () => {
    expect(calculateAiPoints('ai_wins')).toBe(15);
  });

  it('returns 15 for tie', () => {
    expect(calculateAiPoints('tie')).toBe(15);
  });
});
