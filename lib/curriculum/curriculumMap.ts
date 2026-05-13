/**
 * Hand-curated CBSE AI & Computational Thinking curriculum map.
 *
 * Used by:
 *   - ADMIN-001 AssignmentCreator — multi-select for assignment tags
 *   - ADMIN-002 complianceReport   — curriculum alignment mapping
 *   - ADMIN-003 CurriculumHeatmap  — coverage visualisation
 *
 * Minimal v1 stub. LEARN-002 will extend this with full CBSE topic
 * coverage, grade-level progressions, and skill-tree metadata — but the
 * shape here is forward-compatible: add fields, don't break existing ones.
 */

import type { CreationType } from '@gsi/types';

export type CurriculumCategory =
  | 'ai_basics'
  | 'ml_concepts'
  | 'ethics'
  | 'applications'
  | 'ct_skills';

export interface CurriculumConcept {
  /** Stable slug used in `aiConceptsTaught` arrays and assignment tags */
  id: string;
  /** Short human label for chips / table rows */
  name: string;
  /** One-sentence description shown in tooltips & compliance reports */
  description: string;
  category: CurriculumCategory;
  /** CBSE grade range this concept applies to */
  gradeRange: { min: number; max: number };
  /** Studios whose default AI-taught concept list commonly touches this */
  studioMapping: CreationType[];
  /** Optional CBSE document reference string */
  cbseReference?: string;
}

export const CURRICULUM_CATEGORIES: Record<
  CurriculumCategory,
  { label: string; color: string }
> = {
  ai_basics: { label: 'AI Basics', color: '#8b5cf6' },
  ml_concepts: { label: 'ML Concepts', color: '#3b82f6' },
  ethics: { label: 'Ethics & Safety', color: '#f59e0b' },
  applications: { label: 'Applications', color: '#10b981' },
  ct_skills: { label: 'Computational Thinking', color: '#ec4899' },
};

const CONCEPTS: CurriculumConcept[] = [
  // ─── AI Basics ────────────────────────────────────────────────────
  {
    id: 'what_is_ai',
    name: 'What is AI?',
    description:
      'Understanding that AI is software that learns from examples rather than following fixed rules.',
    category: 'ai_basics',
    gradeRange: { min: 3, max: 8 },
    studioMapping: ['story', 'quiz', 'music', 'game', 'comic'],
    cbseReference: 'CBSE AI Curriculum Module 1',
  },
  {
    id: 'prompt_engineering',
    name: 'Prompt Engineering',
    description:
      'Writing clear instructions so an AI produces the output you actually want.',
    category: 'ai_basics',
    gradeRange: { min: 5, max: 12 },
    studioMapping: ['story', 'quiz', 'music', 'game', 'comic'],
  },
  {
    id: 'natural_language_generation',
    name: 'Natural Language Generation',
    description: 'How AI turns a short prompt into a longer, coherent piece of text.',
    category: 'ai_basics',
    gradeRange: { min: 5, max: 12 },
    studioMapping: ['story', 'quiz', 'game'],
  },
  {
    id: 'text_to_image',
    name: 'Text-to-Image',
    description: 'Generating pictures from a written description using diffusion models.',
    category: 'ai_basics',
    gradeRange: { min: 5, max: 12 },
    studioMapping: ['story', 'comic'],
  },
  {
    id: 'text_to_audio',
    name: 'Text-to-Audio',
    description: 'Turning a description or lyric into music or speech.',
    category: 'ai_basics',
    gradeRange: { min: 5, max: 12 },
    studioMapping: ['music'],
  },

  // ─── ML Concepts ──────────────────────────────────────────────────
  {
    id: 'training_data',
    name: 'Training Data',
    description: 'Why an AI\'s quality depends on the examples it learned from.',
    category: 'ml_concepts',
    gradeRange: { min: 6, max: 12 },
    studioMapping: ['quiz', 'game'],
  },
  {
    id: 'pattern_recognition',
    name: 'Pattern Recognition',
    description: 'How AI spots repeating structures in data to make predictions.',
    category: 'ml_concepts',
    gradeRange: { min: 6, max: 12 },
    studioMapping: ['quiz', 'game'],
  },
  {
    id: 'tokens_and_context',
    name: 'Tokens & Context',
    description: 'Language models read text as tokens; context length limits what they see.',
    category: 'ml_concepts',
    gradeRange: { min: 8, max: 12 },
    studioMapping: ['story', 'quiz'],
  },

  // ─── Ethics & Safety ──────────────────────────────────────────────
  {
    id: 'ai_bias',
    name: 'AI Bias',
    description: 'AI can inherit unfair patterns from its training data.',
    category: 'ethics',
    gradeRange: { min: 6, max: 12 },
    studioMapping: ['quiz', 'story'],
  },
  {
    id: 'responsible_use',
    name: 'Responsible Use',
    description: 'When to trust AI output, when to fact-check, and when to ask a human.',
    category: 'ethics',
    gradeRange: { min: 3, max: 12 },
    studioMapping: ['story', 'quiz', 'music', 'game', 'comic'],
  },
  {
    id: 'attribution_and_copyright',
    name: 'Attribution & Copyright',
    description: 'Why crediting sources matters when remixing AI-generated work.',
    category: 'ethics',
    gradeRange: { min: 7, max: 12 },
    studioMapping: ['story', 'music', 'comic'],
  },

  // ─── Applications ─────────────────────────────────────────────────
  {
    id: 'storytelling_with_ai',
    name: 'Storytelling with AI',
    description: 'Using AI as a co-author for plot, characters, and dialogue.',
    category: 'applications',
    gradeRange: { min: 3, max: 12 },
    studioMapping: ['story', 'comic'],
  },
  {
    id: 'music_composition',
    name: 'AI Music Composition',
    description: 'Using AI to suggest melodies, lyrics, or styles for original songs.',
    category: 'applications',
    gradeRange: { min: 5, max: 12 },
    studioMapping: ['music'],
  },
  {
    id: 'quiz_generation',
    name: 'AI Quiz Generation',
    description: 'Auto-creating questions from a topic and checking answers.',
    category: 'applications',
    gradeRange: { min: 5, max: 12 },
    studioMapping: ['quiz'],
  },
  {
    id: 'interactive_fiction',
    name: 'Interactive Fiction',
    description: 'Branching stories powered by AI choose-your-own-adventure logic.',
    category: 'applications',
    gradeRange: { min: 5, max: 12 },
    studioMapping: ['game'],
  },

  // ─── Computational Thinking ───────────────────────────────────────
  {
    id: 'decomposition',
    name: 'Decomposition',
    description: 'Breaking a big problem into smaller, solvable parts.',
    category: 'ct_skills',
    gradeRange: { min: 3, max: 12 },
    studioMapping: ['game', 'story'],
  },
  {
    id: 'abstraction',
    name: 'Abstraction',
    description: 'Focusing on the important ideas and ignoring unnecessary details.',
    category: 'ct_skills',
    gradeRange: { min: 5, max: 12 },
    studioMapping: ['quiz', 'game'],
  },
  {
    id: 'algorithmic_thinking',
    name: 'Algorithmic Thinking',
    description: 'Describing a repeatable step-by-step process to reach a goal.',
    category: 'ct_skills',
    gradeRange: { min: 5, max: 12 },
    studioMapping: ['game', 'quiz'],
  },
  {
    id: 'pattern_generalisation',
    name: 'Pattern Generalisation',
    description: 'Spotting a pattern in specific cases and extending it to new ones.',
    category: 'ct_skills',
    gradeRange: { min: 5, max: 12 },
    studioMapping: ['quiz'],
  },
];

const CONCEPT_BY_ID: Record<string, CurriculumConcept> = CONCEPTS.reduce(
  (acc, concept) => {
    acc[concept.id] = concept;
    return acc;
  },
  {} as Record<string, CurriculumConcept>,
);

/**
 * Return every concept (stable order — category, then grade, then id).
 */
export function getAllConcepts(): CurriculumConcept[] {
  return [...CONCEPTS];
}

/**
 * Look up a single concept by id. Returns null when unknown so callers can
 * render gracefully for legacy / removed concept ids.
 */
export function getConcept(id: string): CurriculumConcept | null {
  return CONCEPT_BY_ID[id] ?? null;
}

/**
 * Return concepts relevant to a given creation type, optionally filtered by
 * grade. Used by the AssignmentCreator to narrow the tag picker to concepts
 * that actually make sense for the selected studio.
 */
export function getConceptsForCreation(
  type: CreationType,
  grade?: number,
): CurriculumConcept[] {
  return CONCEPTS.filter((concept) => {
    if (!concept.studioMapping.includes(type)) return false;
    if (grade !== undefined) {
      if (grade < concept.gradeRange.min || grade > concept.gradeRange.max) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Group concepts by category — convenience for UI renderers (heatmap &
 * picker both group this way).
 */
export function getConceptsByCategory(): Record<CurriculumCategory, CurriculumConcept[]> {
  const buckets: Record<CurriculumCategory, CurriculumConcept[]> = {
    ai_basics: [],
    ml_concepts: [],
    ethics: [],
    applications: [],
    ct_skills: [],
  };
  for (const concept of CONCEPTS) {
    buckets[concept.category].push(concept);
  }
  return buckets;
}
