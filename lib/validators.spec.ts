import { describe, it, expect } from 'vitest';
import {
  storyInputSchema,
  musicInputSchema,
  quizInputSchema,
  saveCreationSchema,
  kidProfileSchema,
} from './validators';

describe('storyInputSchema', () => {
  const validStory = {
    premise: 'A brave cat explores the jungle',
    ageGroup: '8-10',
  };

  it('accepts valid minimal input', () => {
    const result = storyInputSchema.parse(validStory);
    expect(result.premise).toBe(validStory.premise);
    expect(result.pages).toBe(5); // default
    expect(result.style).toBe('cartoon'); // default
  });

  it('accepts full input with all optional fields', () => {
    const result = storyInputSchema.parse({
      ...validStory,
      characters: ['Luna', 'Max'],
      setting: 'A magical forest',
      genre: 'fantasy',
      pages: 8,
      style: 'watercolor',
    });
    expect(result.characters).toEqual(['Luna', 'Max']);
    expect(result.genre).toBe('fantasy');
    expect(result.pages).toBe(8);
    expect(result.style).toBe('watercolor');
  });

  it('rejects premise shorter than 5 characters', () => {
    expect(() => storyInputSchema.parse({ ...validStory, premise: 'Hi' })).toThrow();
  });

  it('rejects premise longer than 500 characters', () => {
    expect(() =>
      storyInputSchema.parse({ ...validStory, premise: 'x'.repeat(501) })
    ).toThrow();
  });

  it('rejects invalid genre', () => {
    expect(() =>
      storyInputSchema.parse({ ...validStory, genre: 'horror' })
    ).toThrow();
  });

  it('rejects pages below 1', () => {
    expect(() =>
      storyInputSchema.parse({ ...validStory, pages: 0 })
    ).toThrow();
  });

  it('rejects pages above 8', () => {
    expect(() =>
      storyInputSchema.parse({ ...validStory, pages: 9 })
    ).toThrow();
  });

  it('rejects invalid ageGroup', () => {
    expect(() =>
      storyInputSchema.parse({ ...validStory, ageGroup: '5-7' })
    ).toThrow();
  });

  it('rejects more than 5 characters', () => {
    expect(() =>
      storyInputSchema.parse({
        ...validStory,
        characters: ['a', 'b', 'c', 'd', 'e', 'f'],
      })
    ).toThrow();
  });
});

describe('musicInputSchema', () => {
  const validMusic = {
    mood: 'happy',
    genre: 'pop',
    ageGroup: '10-12',
  };

  it('accepts valid minimal input with defaults', () => {
    const result = musicInputSchema.parse(validMusic);
    expect(result.mood).toBe('happy');
    expect(result.duration).toBe(30); // default
  });

  it('accepts full input', () => {
    const result = musicInputSchema.parse({
      ...validMusic,
      theme: 'Summer fun',
      duration: 60,
      instruments: ['guitar', 'drums'],
      lyricsPrompt: 'A song about friendship',
    });
    expect(result.theme).toBe('Summer fun');
    expect(result.duration).toBe(60);
  });

  it('rejects missing mood', () => {
    expect(() =>
      musicInputSchema.parse({ genre: 'pop', ageGroup: '10-12' })
    ).toThrow();
  });

  it('rejects missing genre', () => {
    expect(() =>
      musicInputSchema.parse({ mood: 'happy', ageGroup: '10-12' })
    ).toThrow();
  });

  it('rejects duration below 15', () => {
    expect(() =>
      musicInputSchema.parse({ ...validMusic, duration: 10 })
    ).toThrow();
  });

  it('rejects duration above 60', () => {
    expect(() =>
      musicInputSchema.parse({ ...validMusic, duration: 120 })
    ).toThrow();
  });

  it('rejects invalid mood', () => {
    expect(() =>
      musicInputSchema.parse({ ...validMusic, mood: 'angry' })
    ).toThrow();
  });
});

describe('quizInputSchema', () => {
  const validQuiz = {
    topic: 'Solar System',
    ageGroup: '12-14',
  };

  it('accepts valid minimal input with defaults', () => {
    const result = quizInputSchema.parse(validQuiz);
    expect(result.format).toBe('trivia');
    expect(result.difficulty).toBe('intermediate');
    expect(result.questionCount).toBe(10);
  });

  it('accepts full input', () => {
    const result = quizInputSchema.parse({
      ...validQuiz,
      format: 'true_false',
      difficulty: 'beginner',
      questionCount: 5,
    });
    expect(result.format).toBe('true_false');
    expect(result.questionCount).toBe(5);
  });

  it('rejects topic shorter than 2 characters', () => {
    expect(() =>
      quizInputSchema.parse({ ...validQuiz, topic: 'A' })
    ).toThrow();
  });

  it('rejects topic longer than 200 characters', () => {
    expect(() =>
      quizInputSchema.parse({ ...validQuiz, topic: 'x'.repeat(201) })
    ).toThrow();
  });

  it('rejects questionCount below 3', () => {
    expect(() =>
      quizInputSchema.parse({ ...validQuiz, questionCount: 2 })
    ).toThrow();
  });

  it('rejects questionCount above 20', () => {
    expect(() =>
      quizInputSchema.parse({ ...validQuiz, questionCount: 21 })
    ).toThrow();
  });

  it('rejects invalid format', () => {
    expect(() =>
      quizInputSchema.parse({ ...validQuiz, format: 'essay' })
    ).toThrow();
  });
});

describe('saveCreationSchema', () => {
  const validCreation = {
    type: 'story',
    title: 'My Cool Story',
    content: { pages: [] },
    aiMetadata: { model: 'claude' },
    aiConceptsTaught: ['prompt engineering'],
  };

  it('accepts valid input', () => {
    const result = saveCreationSchema.parse(validCreation);
    expect(result.title).toBe('My Cool Story');
    expect(result.isPublic).toBe(true); // default
  });

  it('accepts with optional media and thumbnail', () => {
    const result = saveCreationSchema.parse({
      ...validCreation,
      media: [{ url: 'https://example.com/img.png', type: 'image', alt: 'An image' }],
      thumbnail: 'https://example.com/thumb.png',
      isPublic: false,
    });
    expect(result.media).toHaveLength(1);
    expect(result.isPublic).toBe(false);
  });

  it('rejects invalid type', () => {
    expect(() =>
      saveCreationSchema.parse({ ...validCreation, type: 'essay' })
    ).toThrow();
  });

  it('rejects empty title', () => {
    expect(() =>
      saveCreationSchema.parse({ ...validCreation, title: '' })
    ).toThrow();
  });

  it('rejects title over 200 characters', () => {
    expect(() =>
      saveCreationSchema.parse({ ...validCreation, title: 'x'.repeat(201) })
    ).toThrow();
  });

  it('defaults prompt to empty string when omitted', () => {
    const result = saveCreationSchema.parse(validCreation);
    expect(result.prompt).toBe('');
  });

  it('accepts a valid prompt', () => {
    const result = saveCreationSchema.parse({ ...validCreation, prompt: 'Write a story about a cat' });
    expect(result.prompt).toBe('Write a story about a cat');
  });

  it('rejects prompt over 2000 characters', () => {
    expect(() =>
      saveCreationSchema.parse({ ...validCreation, prompt: 'x'.repeat(2001) })
    ).toThrow();
  });

  it('rejects non-string prompt', () => {
    expect(() =>
      saveCreationSchema.parse({ ...validCreation, prompt: 123 })
    ).toThrow();
  });
});

describe('kidProfileSchema', () => {
  const validProfile = {
    name: 'Priya',
    age: 12,
    grade: '7',
  };

  it('accepts valid input', () => {
    const result = kidProfileSchema.parse(validProfile);
    expect(result.name).toBe('Priya');
  });

  it('accepts with optional board and avatar', () => {
    const result = kidProfileSchema.parse({
      ...validProfile,
      board: 'cbse',
      avatar: 'astronaut',
    });
    expect(result.board).toBe('cbse');
  });

  it('rejects age below 5', () => {
    expect(() =>
      kidProfileSchema.parse({ ...validProfile, age: 4 })
    ).toThrow();
  });

  it('rejects age above 18', () => {
    expect(() =>
      kidProfileSchema.parse({ ...validProfile, age: 19 })
    ).toThrow();
  });

  it('rejects invalid board', () => {
    expect(() =>
      kidProfileSchema.parse({ ...validProfile, board: 'ib' })
    ).toThrow();
  });

  it('rejects empty name', () => {
    expect(() =>
      kidProfileSchema.parse({ ...validProfile, name: '' })
    ).toThrow();
  });

  it('rejects name over 50 characters', () => {
    expect(() =>
      kidProfileSchema.parse({ ...validProfile, name: 'x'.repeat(51) })
    ).toThrow();
  });
});
