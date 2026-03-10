import type {
  BeatTheAiCategory,
  BeatTheAiDifficulty,
  BeatTheAiResult,
  BeatTheAiRound,
  BeatTheAiScores,
  BeatTheAiSkillId,
  BeatTheAiSkills,
  SkillLevel,
} from '@/types/beatTheAi.types';
import {
  CATEGORY_PRIMARY_SKILL,
  SCORE_SKILL_MAP,
  SKILL_LEVELS,
} from '@/types/beatTheAi.types';

/** Calculate skill XP earned from a completed round */
export function calculateSkillXp(
  round: Pick<BeatTheAiRound, 'category' | 'prompt' | 'result' | 'kidScores' | 'timeUsedSeconds'>,
  currentStreak: number
): Partial<Record<BeatTheAiSkillId, number>> {
  const xp: Partial<Record<BeatTheAiSkillId, number>> = {};

  function add(skill: BeatTheAiSkillId, amount: number) {
    xp[skill] = (xp[skill] ?? 0) + amount;
  }

  // +5 XP to primary skill for category
  const primarySkill = CATEGORY_PRIMARY_SKILL[round.category];
  add(primarySkill, 5);

  // +3 bonus if kid wins
  if (round.result === 'kid_wins') {
    add(primarySkill, 3);
  }

  // +2 for each score criteria where kid scored ≥ 4
  for (const [key, skillId] of Object.entries(SCORE_SKILL_MAP)) {
    const score = round.kidScores[key as keyof BeatTheAiScores];
    if (score >= 4) {
      add(skillId, 2);
    }
  }

  // +3 Speed Thinking if completed in under half the time limit
  if (round.timeUsedSeconds < round.prompt.timeLimit * 0.5) {
    add('speedThinking', 3);
  }

  // +2 Cultural Connect if India-themed prompt
  if (round.prompt.isIndiaThemed) {
    add('culturalConnect', 2);
  }

  // +5 Creativity bonus on 3-round win streak
  if (currentStreak >= 3 && round.result === 'kid_wins') {
    add('creativity', 5);
  }

  return xp;
}

/** Get skill level info from XP amount */
export function getSkillLevel(xp: number): SkillLevel {
  let matchedIndex = 0;
  for (let i = 0; i < SKILL_LEVELS.length; i++) {
    if (xp >= SKILL_LEVELS[i]!.minXp) {
      matchedIndex = i;
    }
  }

  const matched = SKILL_LEVELS[matchedIndex]!;
  const nextLevel = SKILL_LEVELS[matchedIndex + 1];

  return {
    xp,
    level: matched.level,
    title: matched.title,
    nextLevelXp: nextLevel ? nextLevel.minXp : matched.minXp,
  };
}

/** Determine AI difficulty based on current skill levels */
export function getAiDifficulty(skills: BeatTheAiSkills): BeatTheAiDifficulty {
  const levels = Object.values(skills).map((s) => s.level);
  if (levels.some((l) => l >= 4)) return 'hard';
  if (levels.some((l) => l >= 3)) return 'medium';
  return 'easy';
}

/** Detect which skills leveled up by comparing old and new */
export function detectLevelUp(
  oldSkills: BeatTheAiSkills,
  newSkills: BeatTheAiSkills
): BeatTheAiSkillId[] {
  const levelUps: BeatTheAiSkillId[] = [];
  for (const id of Object.keys(oldSkills) as BeatTheAiSkillId[]) {
    if (newSkills[id].level > oldSkills[id].level) {
      levelUps.push(id);
    }
  }
  return levelUps;
}

/** Get default skills for a new player (all level 1, 0 XP) */
export function getDefaultSkills(): BeatTheAiSkills {
  const skillIds: BeatTheAiSkillId[] = [
    'creativity', 'storytelling', 'wordplay',
    'knowledge', 'speedThinking', 'culturalConnect',
  ];
  const skills = {} as BeatTheAiSkills;
  for (const id of skillIds) {
    skills[id] = getSkillLevel(0);
  }
  return skills;
}

/** Calculate average of BeatTheAiScores */
export function calculateAvgScore(scores: BeatTheAiScores): number {
  const values = [scores.creativity, scores.funFactor, scores.accuracy, scores.heart];
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

/** Determine round result from average scores */
export function determineResult(kidAvg: number, aiAvg: number): BeatTheAiResult {
  // Kid wins if their avg >= 50% of AI avg (generous, confidence-boosting)
  const threshold = aiAvg * 0.5;
  if (kidAvg > threshold) return 'kid_wins';
  if (kidAvg === threshold) return 'tie';
  return 'ai_wins';
}

/** Calculate AI points earned for a round */
export function calculateAiPoints(result: BeatTheAiResult): number {
  const BASE_POINTS = 15;
  const WIN_BONUS = 10;
  return result === 'kid_wins' ? BASE_POINTS + WIN_BONUS : BASE_POINTS;
}
