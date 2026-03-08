import { z } from 'zod';

/** Story generation input */
export const storyInputSchema = z.object({
  premise: z.string().min(5, 'Tell us a bit more about your story idea').max(500),
  characters: z.array(z.string().max(50)).max(5).optional(),
  setting: z.string().max(100).optional(),
  genre: z.enum(['adventure', 'sci-fi', 'fantasy', 'mystery', 'funny', 'friendship']).optional(),
  pages: z.number().int().min(1).max(8).default(5),
  style: z.enum(['watercolor', 'cartoon', 'pixel-art', 'comic']).default('cartoon'),
  ageGroup: z.enum(['8-10', '10-12', '12-14', '14-17']),
  remixedFromId: z.string().max(128).optional(),
});

/** Music generation input */
export const musicInputSchema = z.object({
  mood: z.enum(['happy', 'chill', 'energetic', 'dreamy', 'epic']),
  genre: z.enum(['pop', 'rock', 'electronic', 'classical', 'hip-hop', 'folk']),
  theme: z.string().max(200).optional(),
  duration: z.number().int().min(15).max(60).default(30),
  instruments: z.array(z.string()).max(4).optional(),
  lyricsPrompt: z.string().max(500).optional(),
  ageGroup: z.enum(['8-10', '10-12', '12-14', '14-17']),
  remixedFromId: z.string().max(128).optional(),
});

/** Quiz generation input */
export const quizInputSchema = z.object({
  topic: z.string().min(2, "What's the quiz about?").max(200),
  format: z.enum(['trivia', 'true_false', 'fill_blank', 'adventure']).default('trivia'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
  questionCount: z.number().int().min(3).max(20).default(10),
  ageGroup: z.enum(['8-10', '10-12', '12-14', '14-17']),
  remixedFromId: z.string().max(128).optional(),
});

/** Game generation input */
export const gameInputSchema = z.object({
  premise: z.string().min(5, 'Tell us more about your adventure idea!').max(500),
  setting: z
    .enum([
      'fantasy_world',
      'space_station',
      'underwater_city',
      'enchanted_forest',
      'indian_palace',
      'time_machine',
      'mystery_island',
      'futuristic_city',
    ])
    .optional(),
  characterName: z.string().max(30).optional().default('You'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  ageGroup: z.enum(['8-10', '10-12', '12-14', '14-17']),
  remixedFromId: z.string().max(128).optional(),
});

/** Comic generation input */
export const comicInputSchema = z.object({
  premise: z.string().min(5, 'Tell us more about your comic idea!').max(500),
  characters: z
    .array(
      z.object({
        name: z.string().min(1).max(50),
        description: z.string().max(100).optional(),
      })
    )
    .min(1, 'Add at least one character')
    .max(4),
  panelCount: z.union([z.literal(4), z.literal(6), z.literal(8)]).default(4),
  style: z.enum(['manga', 'cartoon', 'superhero', 'indie', 'chibi']).default('cartoon'),
  ageGroup: z.enum(['8-10', '10-12', '12-14', '14-17']),
  remixedFromId: z.string().max(128).optional(),
});

/** Creation save input */
export const saveCreationSchema = z.object({
  type: z.enum(['story', 'music', 'quiz', 'game', 'comic']),
  title: z.string().min(1).max(200),
  prompt: z.string().max(2000).default(''),
  content: z.record(z.unknown()),
  media: z.array(z.object({ url: z.string().url(), type: z.string(), alt: z.string() })).optional(),
  thumbnail: z.string().url().optional(),
  aiMetadata: z.record(z.unknown()),
  aiConceptsTaught: z.array(z.string()),
  isPublic: z.boolean().default(true),
  remixedFromId: z.string().max(128).optional(),
});

/** Kid profile input */
export const kidProfileSchema = z.object({
  name: z.string().min(1, "What's your name?").max(50),
  age: z.number().int().min(5).max(18),
  grade: z.string().min(1).max(5),
  board: z.enum(['cbse', 'icse', 'state']).optional(),
  avatar: z.string().max(30).optional(),
});

export type StoryInput = z.infer<typeof storyInputSchema>;
export type MusicInput = z.infer<typeof musicInputSchema>;
export type QuizInput = z.infer<typeof quizInputSchema>;
export type GameInput = z.infer<typeof gameInputSchema>;
export type ComicInput = z.infer<typeof comicInputSchema>;
export type SaveCreationInput = z.infer<typeof saveCreationSchema>;
export type KidProfileInput = z.infer<typeof kidProfileSchema>;
