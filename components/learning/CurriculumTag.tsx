'use client';

import { cn } from '@/lib/utils';

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  'NLP & Text Generation': { bg: 'bg-brand-purple/10', text: 'text-brand-purple' },
  'Neural Networks': { bg: 'bg-brand-cyan/10', text: 'text-brand-cyan' },
  'Computer Vision': { bg: 'bg-brand-orange/10', text: 'text-brand-orange' },
  'Generative AI': { bg: 'bg-violet-100', text: 'text-violet-700' },
  'Machine Learning': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  'Data & Pattern Recognition': { bg: 'bg-amber-100', text: 'text-amber-700' },
  'Prompt Engineering': { bg: 'bg-rose-100', text: 'text-rose-700' },
  'AI Ethics & Safety': { bg: 'bg-sky-100', text: 'text-sky-700' },
};

const FALLBACK = { bg: 'bg-gray-100', text: 'text-gray-700' };

interface CurriculumTagProps {
  tag: string;
  size?: 'sm' | 'md';
}

export function CurriculumTag({ tag, size = 'sm' }: CurriculumTagProps) {
  const colors = TAG_COLORS[tag] ?? FALLBACK;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        colors.bg,
        colors.text,
        size === 'sm' && 'px-2.5 py-0.5 text-xs',
        size === 'md' && 'px-3 py-1 text-sm',
      )}
    >
      <span aria-hidden>📚</span>
      {tag}
    </span>
  );
}
