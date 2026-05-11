/**
 * Unified profanity filter — reusable across all studios for both
 * text input AND transcribed voice. Does not care where the text
 * came from; same pipeline either way.
 *
 * Public API:
 *   - findProfanity(text)     → ProfanityHit[]
 *   - containsProfanity(text) → boolean
 *   - maskProfanity(text)     → { masked, hits }
 *   - assertClean(text, min?) → throws AppException if any hit at >= minSeverity
 *
 * The list lives in `profanityList.ts`. The filter compiles each entry
 * into a leetspeak-tolerant regex once at module load.
 *
 * Design notes:
 *   - Whole-word matching is the default to avoid Scunthorpe-style false
 *     positives (e.g. "assassin" not flagged for "ass").
 *   - Leetspeak: a→[a@4], e→[e3], i→[i1!|], o→[o0], s→[s$5], etc.
 *   - Repeated letters tolerated: "fuuuck" matches "fuck".
 *   - Inter-letter punctuation tolerated: "f.u.c.k", "f-u-c-k" both match.
 *   - Diacritics stripped before matching (NFD normalization).
 *   - Case-insensitive.
 */

import { AppException } from '@/lib/api-utils';
import {
  PROFANITY_LIST,
  type ProfanityEntry,
  type ProfanitySeverity,
} from './profanityList';

export type { ProfanitySeverity, ProfanityEntry };

export interface ProfanityHit {
  term: string;
  severity: ProfanitySeverity;
  language: string;
  index: number;
  length: number;
  matchedText: string;
}

const SEVERITY_ORDER: Record<ProfanitySeverity, number> = {
  mild: 1,
  moderate: 2,
  severe: 3,
};

/** Leetspeak character classes — keys are the canonical letters in the term. */
const LEET_CLASSES: Record<string, string> = {
  a: '[a@4]',
  b: '[b8]',
  c: '[c(]',
  e: '[e3]',
  g: '[g69]',
  i: '[i1!|]',
  l: '[l1!|]',
  o: '[o0]',
  s: '[s$5]',
  t: '[t7+]',
  z: '[z2]',
};

/** Strip diacritics (NFD then drop combining marks). */
function stripDiacritics(input: string): string {
  return input.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Escape regex metacharacters for non-letter characters in a term. */
function escapeRegexChar(ch: string): string {
  return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Compile a profanity entry into a regex. Default match is 'word' which
 * builds a leet-tolerant whole-word pattern. 'substring' drops the
 * boundaries. 'regex' uses the entry's `pattern` directly.
 */
function compilePattern(entry: ProfanityEntry): RegExp {
  if (entry.match === 'regex') {
    if (!entry.pattern) {
      throw new Error(`Profanity entry "${entry.term}" with match='regex' requires a pattern`);
    }
    // Force the global + case-insensitive flags so iteration works.
    const flags = new Set(entry.pattern.flags.split(''));
    flags.add('g');
    flags.add('i');
    return new RegExp(entry.pattern.source, [...flags].join(''));
  }

  const term = stripDiacritics(entry.term.toLowerCase());

  // Build inner pattern: each letter becomes a leet class + greedy repeat,
  // with optional non-word punctuation between letters.
  const interPunct = '[\\W_]*';
  const inner = term
    .split('')
    .map((ch, i) => {
      const cls = LEET_CLASSES[ch] ?? escapeRegexChar(ch);
      const repeat = /[a-z]/.test(ch) ? '+' : '';
      // Don't insert inter-letter punctuation before the first char or
      // after a non-letter char (e.g. spaces in "screw you").
      const sep = i === 0 || !/[a-z]/.test(term[i - 1] ?? '') ? '' : interPunct;
      return `${sep}${cls}${repeat}`;
    })
    .join('');

  // For 'word' match, anchor with non-word boundaries (looser than \b so
  // it works with non-ASCII characters and our leet substitutions).
  const boundary = entry.match === 'substring' ? '' : '(?:^|[^A-Za-z0-9])';
  const tail = entry.match === 'substring' ? '' : '(?=$|[^A-Za-z0-9])';

  return new RegExp(`${boundary}(${inner})${tail}`, 'gi');
}

/** Compiled list — built once at module load. */
interface CompiledEntry {
  entry: ProfanityEntry;
  pattern: RegExp;
}

const COMPILED: CompiledEntry[] = PROFANITY_LIST.map((entry) => ({
  entry,
  pattern: compilePattern(entry),
}));

/**
 * Find every profanity hit in the input. Hits are returned in the order
 * they appear in the text (by start index). Overlapping hits from
 * different entries are kept — masking dedupes by position.
 */
export function findProfanity(
  text: string,
  list: CompiledEntry[] = COMPILED,
): ProfanityHit[] {
  if (!text || text.length === 0) return [];

  const normalized = stripDiacritics(text);
  const hits: ProfanityHit[] = [];

  for (const { entry, pattern } of list) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(normalized)) !== null) {
      // m[0] includes the leading boundary char (if non-empty); m[1] is the
      // actual matched profane substring.
      const matchedText = m[1] ?? m[0];
      const index = m.index + (m[0].length - matchedText.length);
      hits.push({
        term: entry.term,
        severity: entry.severity,
        language: entry.language,
        index,
        length: matchedText.length,
        matchedText: text.slice(index, index + matchedText.length),
      });
      // Avoid zero-width infinite loops just in case.
      if (m.index === pattern.lastIndex) pattern.lastIndex++;
    }
  }

  hits.sort((a, b) => a.index - b.index);
  return hits;
}

/** Boolean shortcut — does the text contain profanity at minSeverity or above? */
export function containsProfanity(text: string, minSeverity: ProfanitySeverity = 'mild'): boolean {
  const minRank = SEVERITY_ORDER[minSeverity];
  return findProfanity(text).some((h) => SEVERITY_ORDER[h.severity] >= minRank);
}

/**
 * Replace all profanity hits with asterisks. Preserves length so caption
 * lengths and waveform-aligned timing stay roughly correct.
 *
 * Use this for AI output (mask, don't throw) or for already-recorded
 * voice transcripts (the recording happened — best we can do is mask the
 * transcript).
 */
export function maskProfanity(text: string): { masked: string; hits: ProfanityHit[] } {
  const hits = findProfanity(text);
  if (hits.length === 0) return { masked: text, hits };

  // Build mask by walking the text and replacing hit ranges. Dedupe
  // overlaps by tracking the highest-end-index masked so far.
  let out = '';
  let cursor = 0;
  for (const h of hits) {
    if (h.index < cursor) continue; // overlap with previous mask
    out += text.slice(cursor, h.index);
    out += '*'.repeat(h.length);
    cursor = h.index + h.length;
  }
  out += text.slice(cursor);

  return { masked: out, hits };
}

/**
 * Throw an AppException if the text contains profanity at minSeverity
 * or above. Use this on input boundaries where rejecting the request is
 * the right move (e.g. before sending to AI, before publishing a caption).
 *
 * Defaults to 'moderate' so 'mild' words don't block input — they get
 * masked at the output layer instead.
 */
export function assertClean(text: string, minSeverity: ProfanitySeverity = 'moderate'): void {
  const minRank = SEVERITY_ORDER[minSeverity];
  const blocked = findProfanity(text).filter((h) => SEVERITY_ORDER[h.severity] >= minRank);
  if (blocked.length > 0) {
    throw new AppException(
      'UNSAFE_CONTENT',
      "Let's try a different word! Pick something kind and creative.",
      400,
    );
  }
}
