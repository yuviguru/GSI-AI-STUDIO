import type { CreationType } from '@gsi/types';
import type { Template } from './types';
import { STORY_TEMPLATES, STORY_CATEGORIES } from './storyTemplates';
import { MUSIC_TEMPLATES, MUSIC_CATEGORIES } from './musicTemplates';
import { QUIZ_TEMPLATES, QUIZ_CATEGORIES } from './quizTemplates';
import { COMIC_TEMPLATES, COMIC_CATEGORIES } from './comicTemplates';
import { GAME_TEMPLATES, GAME_CATEGORIES } from './gameTemplates';

export type { Template } from './types';
export { getDailySpark } from './dailySpark';
export * from './bookTemplates';

const TEMPLATES_BY_TYPE: Record<string, Template[]> = {
  story: STORY_TEMPLATES,
  music: MUSIC_TEMPLATES,
  quiz: QUIZ_TEMPLATES,
  comic: COMIC_TEMPLATES,
  game: GAME_TEMPLATES,
};

const CATEGORIES_BY_TYPE: Record<string, string[]> = {
  story: STORY_CATEGORIES,
  music: MUSIC_CATEGORIES,
  quiz: QUIZ_CATEGORIES,
  comic: COMIC_CATEGORIES,
  game: GAME_CATEGORIES,
};

/** Get all templates for a creation type */
export function getTemplatesByType(type: CreationType): Template[] {
  return TEMPLATES_BY_TYPE[type] ?? [];
}

/** Get category names for a creation type */
export function getCategoriesByType(type: CreationType): string[] {
  return CATEGORIES_BY_TYPE[type] ?? [];
}

/** Get a random template for a creation type */
export function getRandomTemplate(type: CreationType): Template | null {
  const templates = TEMPLATES_BY_TYPE[type];
  if (!templates || templates.length === 0) return null;
  return templates[Math.floor(Math.random() * templates.length)] ?? null;
}
