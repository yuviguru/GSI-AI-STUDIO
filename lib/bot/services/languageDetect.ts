/** Language detection for forwarded homework — English vs. Hindi (v1).
 *
 *  Uses a Unicode-script heuristic, not an LLM call — this runs on every
 *  forward and we don't want to spend tokens on a problem that's solvable
 *  with a regex. v1.1 can add Tamil/Telugu/Marathi/Bengali by extending
 *  the script ranges + HomeworkLanguage type union.
 *
 *  @see /docs/MESSENGER_BOT_ARCHITECTURE.md §5 "English + Hindi" decision.
 */

import type { HomeworkLanguage } from '@/lib/bot/types';

/** Unicode ranges for Devanagari (Hindi + Marathi + Sanskrit).  */
const DEVANAGARI_RE = /[ऀ-ॿ]/g;
/** Basic Latin letters (filter out punctuation + digits + whitespace). */
const LATIN_RE = /[A-Za-z]/g;

/** Detect the dominant script of a text. Returns `'hi'` when Devanagari
 *  characters outweigh Latin letters, else `'en'`. Ties default to `'en'`
 *  (CBSE English-medium homework is the most common case). Short texts
 *  (< 3 meaningful chars) default to `'en'`. */
export function detectLanguage(text: string): HomeworkLanguage {
  if (!text || text.trim().length < 3) return 'en';

  const devanagariMatches = text.match(DEVANAGARI_RE)?.length ?? 0;
  const latinMatches = text.match(LATIN_RE)?.length ?? 0;

  if (devanagariMatches === 0 && latinMatches === 0) return 'en';
  return devanagariMatches > latinMatches ? 'hi' : 'en';
}
