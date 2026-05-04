/**
 * Profanity word list for the unified profanity filter.
 *
 * Each entry tags a term with severity, language, and a match strategy.
 * The list is deliberately small and curated — false positives are
 * acceptable in a kids' app (kid sees a friendly "try a different word"),
 * false negatives are not.
 *
 * SEVERITY
 * - mild     — discouraged words; mask in output but allow input through with a warning
 * - moderate — clear profanity; block input; mask output
 * - severe   — slurs, hate speech, sexual; block input; flag for review; mask output
 *
 * MATCH STRATEGIES
 * - 'word'      — whole-word match (default). Honors leetspeak (a→4, e→3, i→1, o→0, s→$, …),
 *                 repeated letters (fuuuck), and inter-letter punctuation (f.u.c.k).
 * - 'substring' — anywhere in the text. Use sparingly; high false-positive risk.
 * - 'regex'     — provide a custom regex via `pattern` (advanced).
 *
 * EXTENDING THE LIST
 * - Add new English words under the relevant English section.
 * - Add Hinglish / Hindi-Roman / Tamil-Roman / Punjabi-Roman / Bengali-Roman /
 *   regional terms in the marked section. Tag `language` with the BCP-47-ish
 *   code we use (e.g. `hi-en` for Hindi-in-Roman-script).
 * - Slurs and hate terms always go in the SEVERE section regardless of language.
 * - Keep terms short (3+ chars). Words under 3 chars are too noisy for word-bounded
 *   matching; if you need them, use 'substring' explicitly.
 */

export type ProfanitySeverity = 'mild' | 'moderate' | 'severe';

export interface ProfanityEntry {
  term: string;
  severity: ProfanitySeverity;
  language: string; // 'en' | 'hi-en' | 'ta-en' | etc.
  match?: 'word' | 'substring' | 'regex';
  pattern?: RegExp; // only for match: 'regex'
}

export const PROFANITY_LIST: ProfanityEntry[] = [
  // ────────────────────────────────────────────────────────────
  // English — severe
  // Common profanity universally inappropriate for under-18 audience.
  // ────────────────────────────────────────────────────────────
  { term: 'fuck', severity: 'severe', language: 'en' },
  { term: 'shit', severity: 'severe', language: 'en' },
  { term: 'bitch', severity: 'severe', language: 'en' },
  { term: 'asshole', severity: 'severe', language: 'en' },
  { term: 'bastard', severity: 'severe', language: 'en' },
  { term: 'dick', severity: 'severe', language: 'en' },
  { term: 'cock', severity: 'severe', language: 'en' },
  { term: 'pussy', severity: 'severe', language: 'en' },
  { term: 'cunt', severity: 'severe', language: 'en' },
  { term: 'whore', severity: 'severe', language: 'en' },
  { term: 'slut', severity: 'severe', language: 'en' },

  // ────────────────────────────────────────────────────────────
  // English — moderate
  // Mild swears we discourage but won't escalate.
  // ────────────────────────────────────────────────────────────
  { term: 'damn', severity: 'moderate', language: 'en' },
  { term: 'crap', severity: 'moderate', language: 'en' },
  { term: 'piss', severity: 'moderate', language: 'en' },
  { term: 'screw you', severity: 'moderate', language: 'en' },
  { term: 'wtf', severity: 'moderate', language: 'en' },
  { term: 'stfu', severity: 'moderate', language: 'en' },

  // ────────────────────────────────────────────────────────────
  // English — mild
  // Words we'd rather not see on a kids' platform but aren't unsafe.
  // ────────────────────────────────────────────────────────────
  { term: 'stupid', severity: 'mild', language: 'en' },
  { term: 'idiot', severity: 'mild', language: 'en' },
  { term: 'dumb', severity: 'mild', language: 'en' },
  { term: 'loser', severity: 'mild', language: 'en' },
  { term: 'shut up', severity: 'mild', language: 'en' },

  // ────────────────────────────────────────────────────────────
  // Hinglish / Hindi-in-Roman-script — moderate / severe
  // ADD USER-SUPPLIED TERMS HERE.
  //
  // Format example:
  //   { term: '<word>', severity: 'severe', language: 'hi-en' },
  //
  // Notes:
  //   - Use 'word' (default) match strategy; transliteration variants are
  //     handled by the leetspeak/repeat normalizer (e.g. "ch" vs "ch", "a" vs "aa").
  //   - For terms with two common spellings (e.g. -h vs -aa endings), add both.
  //   - Severe slurs always tag severity: 'severe'.
  // ────────────────────────────────────────────────────────────

  // ────────────────────────────────────────────────────────────
  // Tamil-in-Roman-script — moderate / severe
  // ADD USER-SUPPLIED TERMS HERE.
  // ────────────────────────────────────────────────────────────

  // ────────────────────────────────────────────────────────────
  // Punjabi / Bengali / Telugu / Kannada / Marathi etc.
  // ADD USER-SUPPLIED TERMS HERE.
  // ────────────────────────────────────────────────────────────

  // ────────────────────────────────────────────────────────────
  // Hate speech & slurs (any language) — always severe
  // ADD USER-SUPPLIED TERMS HERE.
  //
  // Caste-based slurs, religious slurs, racial slurs, ableist slurs,
  // homophobic / transphobic slurs all belong here. Severity is always
  // 'severe' regardless of how casually a term gets used in mainstream
  // conversation.
  // ────────────────────────────────────────────────────────────
];
