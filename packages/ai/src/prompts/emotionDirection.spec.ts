import { describe, it, expect } from 'vitest';
import {
  EMOTION_PRESETS,
  getEmotionPreset,
  renderEmotionDirection,
  sceneMoodFromEmotions,
  moodAwareQualitySuffix,
  emotionFromTextHeuristic,
} from './emotionDirection';

describe('getEmotionPreset', () => {
  it('looks up by key, case-insensitively', () => {
    expect(getEmotionPreset('ANGRY')?.key).toBe('angry');
    expect(getEmotionPreset(' happy ')?.key).toBe('happy');
  });
  it('returns null for unknown or empty', () => {
    expect(getEmotionPreset('anticipation')).toBeNull();
    expect(getEmotionPreset(null)).toBeNull();
  });
});

describe('renderEmotionDirection', () => {
  it('renders explicit facial direction for a preset', () => {
    const out = renderEmotionDirection('Arachne', 'angry');
    expect(out).toContain('Arachne');
    expect(out.toLowerCase()).toContain('scowl');
  });
  it('counter-biases the default smile for negative emotions', () => {
    expect(renderEmotionDirection('Arachne', 'angry').toLowerCase()).toContain('not smiling');
  });
  it('echoes free-text emotions the model invents', () => {
    expect(renderEmotionDirection('Milo', 'anticipation')).toBe(
      "Milo's facial expression: anticipation",
    );
  });
  it('is empty when there is no emotion', () => {
    expect(renderEmotionDirection('Milo', '')).toBe('');
    expect(renderEmotionDirection('Milo', null)).toBe('');
  });
});

describe('sceneMoodFromEmotions', () => {
  it('any dark emotion makes the scene dark', () => {
    expect(sceneMoodFromEmotions(['happy', 'angry'])).toBe('dark');
  });
  it('bright when only bright emotions', () => {
    expect(sceneMoodFromEmotions(['happy', 'excited'])).toBe('bright');
  });
  it('neutral otherwise (incl. unknown words)', () => {
    expect(sceneMoodFromEmotions(['curious'])).toBe('neutral');
    expect(sceneMoodFromEmotions(['anticipation'])).toBe('neutral');
  });
});

describe('moodAwareQualitySuffix', () => {
  it('drops the vibrant/cheerful bias on dark scenes', () => {
    const dark = moodAwareQualitySuffix('dark');
    expect(dark).not.toMatch(/vibrant|cheerful/i);
    expect(dark).toMatch(/moody|shadows|tense/i);
  });
  it('keeps vibrant for bright scenes', () => {
    expect(moodAwareQualitySuffix('bright')).toMatch(/vibrant/i);
  });
});

describe('emotionFromTextHeuristic', () => {
  it('detects anger/revenge over a stray positive word', () => {
    expect(
      emotionFromTextHeuristic('She smiled, but her heart burned for revenge against the demon.'),
    ).toBe('angry');
  });
  it('detects fear', () => {
    expect(emotionFromTextHeuristic('He was terrified and trembled in the dark.')).toBe('scared');
  });
  it('falls back to curious for neutral text', () => {
    expect(emotionFromTextHeuristic('The map showed a path to the hill.')).toBe('curious');
    expect(emotionFromTextHeuristic('')).toBe('curious');
  });
  it('every preset key the heuristic can return is a real preset', () => {
    const keys = new Set(EMOTION_PRESETS.map((p) => p.key));
    for (const sample of ['revenge', 'terrified', 'cried', 'hooray', 'brave', 'wonder', 'smiled']) {
      expect(keys.has(emotionFromTextHeuristic(sample))).toBe(true);
    }
  });
});
