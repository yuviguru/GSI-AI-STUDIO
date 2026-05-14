/**
 * Phase 4 (PLATFORM-007): locale-aware system-prompt helpers.
 *
 * Wraps any base system prompt with a tight locale directive plus a
 * curated CBSE/NEP glossary so terminology stays consistent across
 * generators. Cheap and prompt-cacheable per locale.
 */

import enGlossary from '@/lib/i18n/glossary/en.json';
import hiGlossary from '@/lib/i18n/glossary/hi.json';
import {
  DEFAULT_LOCALE,
  LOCALE_LABELS,
  LOCALE_SCRIPTS,
  type Locale,
} from '@/lib/i18n/locales';

interface Glossary {
  domains: Record<string, string>;
  blooms: Record<string, string>;
  pedagogy: Record<string, string>;
  tone: string[];
}

const GLOSSARIES: Record<Locale, Glossary> = {
  en: enGlossary as Glossary,
  hi: hiGlossary as Glossary,
};

function flattenTerms(g: Glossary): Array<[string, string]> {
  return [
    ...Object.entries(g.domains),
    ...Object.entries(g.blooms),
    ...Object.entries(g.pedagogy),
  ];
}

/** Render the glossary as a compact `English term → translated term` block. */
function glossaryBlock(locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return '';
  const pairs = flattenTerms(GLOSSARIES[locale]);
  if (pairs.length === 0) return '';
  const lines = pairs.map(([en, native]) => `- ${en} → ${native}`);
  return `Glossary (use these translations consistently):\n${lines.join('\n')}`;
}

export interface LocaleSystemPromptInput {
  basePrompt: string;
  locale: Locale;
}

/**
 * Compose `basePrompt` with a locale directive and (for non-default
 * locales) a CBSE/NEP glossary. Output is a single string suitable for
 * `system:` on a Claude messages call.
 */
export function buildLocaleSystemPrompt({
  basePrompt,
  locale,
}: LocaleSystemPromptInput): string {
  const label = LOCALE_LABELS[locale]?.native ?? 'English';
  const script = LOCALE_SCRIPTS[locale] ?? 'latin';
  const tone = GLOSSARIES[locale]?.tone ?? [];
  const directives = [
    `Output language: ${label} (${script} script).`,
    `Do not switch scripts mid-output.`,
    ...tone,
  ].join('\n');

  const glossary = glossaryBlock(locale);
  return [basePrompt.trim(), directives, glossary].filter(Boolean).join('\n\n');
}

export { type Locale, DEFAULT_LOCALE };
