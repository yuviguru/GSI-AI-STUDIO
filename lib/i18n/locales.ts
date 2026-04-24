/**
 * Phase 4 (PLATFORM-007): supported locales for teacher-facing AI output.
 *
 * Add a new locale by appending to SUPPORTED_LOCALES + dropping a
 * matching glossary file under `lib/i18n/glossary/{locale}.json`. The
 * AI prompt helpers and generators read both lazily so no other code
 * changes are required for additional locales.
 */

export const SUPPORTED_LOCALES = ['en', 'hi'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export function isSupportedLocale(value: unknown): value is Locale {
  return (
    typeof value === 'string' &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}

/** Coerce arbitrary input to a supported Locale, defaulting safely. */
export function toLocale(value: unknown): Locale {
  return isSupportedLocale(value) ? value : DEFAULT_LOCALE;
}

export const LOCALE_LABELS: Record<Locale, { label: string; native: string }> = {
  en: { label: 'English', native: 'English' },
  hi: { label: 'Hindi', native: 'हिंदी' },
};

export const LOCALE_SCRIPTS: Record<Locale, 'latin' | 'devanagari'> = {
  en: 'latin',
  hi: 'devanagari',
};
