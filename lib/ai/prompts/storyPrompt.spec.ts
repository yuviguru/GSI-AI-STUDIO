import { describe, it, expect } from 'vitest';
import { STORY_SYSTEM_PROMPT, buildStoryUserPrompt } from './storyPrompt';
import { QUIZ_SYSTEM_PROMPT, buildQuizUserPrompt } from './quizPrompt';
import { MUSIC_SYSTEM_PROMPT, buildMusicUserPrompt } from './musicPrompt';

// ─── System prompt safety verification ───────────────────────
describe('STORY_SYSTEM_PROMPT safety rules', () => {
  it('specifies target age range 8-17', () => {
    expect(STORY_SYSTEM_PROMPT).toMatch(/8.?17/);
  });

  it('requires age-appropriate content', () => {
    expect(STORY_SYSTEM_PROMPT.toLowerCase()).toContain('age-appropriate');
  });

  it('prohibits violence', () => {
    expect(STORY_SYSTEM_PROMPT.toLowerCase()).toContain('violence');
  });

  it('prohibits sexual or romantic content', () => {
    expect(STORY_SYSTEM_PROMPT.toLowerCase()).toMatch(/sexual|romantic|romance/);
  });

  it('requires positive and educational themes', () => {
    expect(STORY_SYSTEM_PROMPT.toLowerCase()).toContain('positive');
    expect(STORY_SYSTEM_PROMPT.toLowerCase()).toContain('educational');
  });

  it('requires Indian cultural context', () => {
    expect(STORY_SYSTEM_PROMPT.toLowerCase()).toContain('indian');
  });

  it('includes JSON output format instructions', () => {
    expect(STORY_SYSTEM_PROMPT).toContain('"title"');
    expect(STORY_SYSTEM_PROMPT).toContain('"pages"');
  });

  it('includes aiXray metadata in output format', () => {
    expect(STORY_SYSTEM_PROMPT).toContain('"aiXray"');
    expect(STORY_SYSTEM_PROMPT).toContain('"curriculumTag"');
  });

  it('requires child-friendly illustration style for images', () => {
    expect(STORY_SYSTEM_PROMPT.toLowerCase()).toMatch(/child.?friendly|cartoon|watercolor|illustration/);
  });

  it('prohibits real people and copyrighted characters in image prompts', () => {
    expect(STORY_SYSTEM_PROMPT.toLowerCase()).toMatch(/real people|copyrighted/);
  });
});

describe('QUIZ_SYSTEM_PROMPT safety rules', () => {
  it('specifies target age range 8-17', () => {
    expect(QUIZ_SYSTEM_PROMPT).toMatch(/8.?17/);
  });

  it('requires age-appropriate content', () => {
    expect(QUIZ_SYSTEM_PROMPT.toLowerCase()).toContain('age-appropriate');
  });

  it('requires educational content', () => {
    expect(QUIZ_SYSTEM_PROMPT.toLowerCase()).toContain('educational');
  });

  it('references Indian curriculum (CBSE/ICSE)', () => {
    expect(QUIZ_SYSTEM_PROMPT).toMatch(/CBSE|ICSE/);
  });

  it('includes JSON output format with questions array', () => {
    expect(QUIZ_SYSTEM_PROMPT).toContain('"questions"');
    expect(QUIZ_SYSTEM_PROMPT).toContain('"answer"');
  });

  it('includes aiXray metadata', () => {
    expect(QUIZ_SYSTEM_PROMPT).toContain('"aiXray"');
  });
});

describe('MUSIC_SYSTEM_PROMPT safety rules', () => {
  it('specifies target age range 8-17', () => {
    expect(MUSIC_SYSTEM_PROMPT).toMatch(/8.?17/);
  });

  it('requires age-appropriate content', () => {
    expect(MUSIC_SYSTEM_PROMPT.toLowerCase()).toContain('age-appropriate');
  });

  it('prohibits violence and mature topics', () => {
    expect(MUSIC_SYSTEM_PROMPT.toLowerCase()).toContain('violence');
  });

  it('requires Indian cultural context', () => {
    expect(MUSIC_SYSTEM_PROMPT.toLowerCase()).toContain('indian');
  });

  it('includes redirect rule for inappropriate requests', () => {
    expect(MUSIC_SYSTEM_PROMPT.toLowerCase()).toMatch(/redirect|inappropriate/);
  });

  it('requires positive themes', () => {
    expect(MUSIC_SYSTEM_PROMPT.toLowerCase()).toContain('positive');
  });

  it('includes JSON output format with lyrics', () => {
    expect(MUSIC_SYSTEM_PROMPT).toContain('"lyrics"');
    expect(MUSIC_SYSTEM_PROMPT).toContain('"bpm"');
  });

  it('includes aiXray metadata', () => {
    expect(MUSIC_SYSTEM_PROMPT).toContain('"aiXray"');
  });

  it('prohibits referencing specific artists or copyrighted songs', () => {
    expect(MUSIC_SYSTEM_PROMPT.toLowerCase()).toMatch(/artist|copyrighted/);
  });
});

// ─── Prompt builder functions ────────────────────────────────
describe('buildStoryUserPrompt', () => {
  const baseInput = {
    premise: 'A dog finds a treasure map',
    pages: 5,
    ageGroup: '8-10',
  };

  it('includes the premise', () => {
    const result = buildStoryUserPrompt(baseInput);
    expect(result).toContain('A dog finds a treasure map');
  });

  it('includes the page count', () => {
    const result = buildStoryUserPrompt(baseInput);
    expect(result).toContain('5-page');
  });

  it('includes the age group', () => {
    const result = buildStoryUserPrompt(baseInput);
    expect(result).toContain('8-10');
  });

  it('includes characters when provided', () => {
    const result = buildStoryUserPrompt({ ...baseInput, characters: ['Ravi', 'Priya'] });
    expect(result).toContain('Ravi');
    expect(result).toContain('Priya');
  });

  it('includes setting when provided', () => {
    const result = buildStoryUserPrompt({ ...baseInput, setting: 'Ancient India' });
    expect(result).toContain('Ancient India');
  });

  it('includes genre when provided', () => {
    const result = buildStoryUserPrompt({ ...baseInput, genre: 'adventure' });
    expect(result).toContain('adventure');
  });

  it('omits characters line when not provided', () => {
    const result = buildStoryUserPrompt(baseInput);
    expect(result).not.toContain('Characters:');
  });

  it('omits setting line when not provided', () => {
    const result = buildStoryUserPrompt(baseInput);
    expect(result).not.toContain('Setting:');
  });

  it('omits genre line when not provided', () => {
    const result = buildStoryUserPrompt(baseInput);
    expect(result).not.toContain('Genre:');
  });
});

describe('buildQuizUserPrompt', () => {
  const baseInput = {
    topic: 'Indian History',
    format: 'trivia',
    difficulty: 'intermediate',
    questionCount: 10,
    ageGroup: '12-14',
  };

  it('includes the topic', () => {
    expect(buildQuizUserPrompt(baseInput)).toContain('Indian History');
  });

  it('includes the difficulty', () => {
    expect(buildQuizUserPrompt(baseInput)).toContain('intermediate');
  });

  it('includes the question count', () => {
    expect(buildQuizUserPrompt(baseInput)).toContain('10');
  });

  it('includes the format', () => {
    expect(buildQuizUserPrompt(baseInput)).toContain('trivia');
  });

  it('includes the age group', () => {
    expect(buildQuizUserPrompt(baseInput)).toContain('12-14');
  });
});

describe('buildMusicUserPrompt', () => {
  const baseInput = {
    mood: 'happy',
    genre: 'pop',
    duration: 30,
    ageGroup: '10-12',
  };

  it('includes mood and genre', () => {
    const result = buildMusicUserPrompt(baseInput);
    expect(result).toContain('happy');
    expect(result).toContain('pop');
  });

  it('includes duration', () => {
    expect(buildMusicUserPrompt(baseInput)).toContain('30-second');
  });

  it('includes the age group', () => {
    expect(buildMusicUserPrompt(baseInput)).toContain('10-12');
  });

  it('includes theme when provided', () => {
    const result = buildMusicUserPrompt({ ...baseInput, theme: 'Friendship' });
    expect(result).toContain('Friendship');
  });

  it('includes lyrics prompt when provided', () => {
    const result = buildMusicUserPrompt({ ...baseInput, lyricsPrompt: 'about rainy days' });
    expect(result).toContain('about rainy days');
  });

  it('includes instruments when provided', () => {
    const result = buildMusicUserPrompt({ ...baseInput, instruments: ['tabla', 'sitar'] });
    expect(result).toContain('tabla');
    expect(result).toContain('sitar');
  });

  it('omits theme line when not provided', () => {
    expect(buildMusicUserPrompt(baseInput)).not.toContain('Theme:');
  });

  it('omits lyrics line when not provided', () => {
    expect(buildMusicUserPrompt(baseInput)).not.toContain('Lyrics idea:');
  });

  it('omits instruments line when not provided', () => {
    expect(buildMusicUserPrompt(baseInput)).not.toContain('instruments:');
  });
});
