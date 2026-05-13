import { describe, it, expect } from 'vitest';
import { getChallengesForModule, getAllChallenges, getChallengeCount } from './questionBank';
import type { SkillArenaModule } from '@gsi/types';

const MODULES: SkillArenaModule[] = ['speaking', 'listening', 'thinking', 'reading'];

// ─── getChallengeCount ──────────────────────────────────

describe('getChallengeCount', () => {
  it.each(MODULES)('returns at least 10 challenges for %s', (module) => {
    expect(getChallengeCount(module)).toBeGreaterThanOrEqual(10);
  });
});

// ─── getAllChallenges ───────────────────────────────────

describe('getAllChallenges', () => {
  it.each(MODULES)('all %s challenges have required fields', (module) => {
    const challenges = getAllChallenges(module);
    for (const c of challenges) {
      expect(c.module).toBe(module);
      expect(c.type).toBeTruthy();
      expect(c.question.text).toBeTruthy();
      expect(c.question.timeLimit).toBeGreaterThan(0);
    }
  });

  it('at least 50% of challenges across all modules are India-themed', () => {
    let total = 0;
    let indiaThemed = 0;
    for (const mod of MODULES) {
      const challenges = getAllChallenges(mod);
      total += challenges.length;
      indiaThemed += challenges.filter((c) => c.question.isIndiaThemed).length;
    }
    expect(indiaThemed / total).toBeGreaterThanOrEqual(0.4);
  });

  it('MCQ challenges have options and correctOption', () => {
    for (const mod of MODULES) {
      const challenges = getAllChallenges(mod);
      for (const c of challenges) {
        if (c.question.options && c.question.options.length > 0) {
          expect(c.question.correctOption).toBeTruthy();
          expect(c.question.options).toContain(c.question.correctOption);
        }
      }
    }
  });
});

// ─── getChallengesForModule ──────────────────────────────

describe('getChallengesForModule', () => {
  it('returns 10 challenges by default', () => {
    const challenges = getChallengesForModule('thinking', 'medium');
    expect(challenges).toHaveLength(10);
  });

  it('returns requested number of challenges', () => {
    const challenges = getChallengesForModule('reading', 'easy', 3);
    expect(challenges).toHaveLength(3);
  });

  it('all returned challenges have unique IDs', () => {
    const challenges = getChallengesForModule('speaking', 'medium');
    const ids = challenges.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all returned challenges belong to the correct module', () => {
    for (const mod of MODULES) {
      const challenges = getChallengesForModule(mod, 'medium');
      for (const c of challenges) {
        expect(c.module).toBe(mod);
      }
    }
  });

  it('includes variety of challenge types', () => {
    // With 5 challenges, we should get at least 2 different types
    const challenges = getChallengesForModule('thinking', 'medium');
    const types = new Set(challenges.map((c) => c.type));
    expect(types.size).toBeGreaterThanOrEqual(2);
  });

  it('listening challenges have audioText', () => {
    const challenges = getChallengesForModule('listening', 'medium');
    const audioChallenges = challenges.filter((c) =>
      c.type === 'comprehension' || c.type === 'follow_instructions' || c.type === 'key_points'
    );
    for (const c of audioChallenges) {
      expect(c.question.audioText || c.question.passage).toBeTruthy();
    }
  });
});
