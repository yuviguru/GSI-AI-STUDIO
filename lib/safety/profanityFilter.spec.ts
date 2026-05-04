import { describe, it, expect } from 'vitest';
import {
  findProfanity,
  containsProfanity,
  maskProfanity,
  assertClean,
} from './profanityFilter';

describe('findProfanity', () => {
  it('returns empty array for clean text', () => {
    expect(findProfanity('A happy story about a dog')).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(findProfanity('')).toEqual([]);
  });

  it('finds an exact severe word', () => {
    const hits = findProfanity('this is shit');
    expect(hits).toHaveLength(1);
    const hit = hits[0]!;
    expect(hit.term).toBe('shit');
    expect(hit.severity).toBe('severe');
    expect(hit.matchedText).toBe('shit');
  });

  it('finds multiple hits in order', () => {
    const hits = findProfanity('damn that shit hurts');
    expect(hits.map((h) => h.matchedText)).toEqual(['damn', 'shit']);
    expect(hits[0]!.index).toBeLessThan(hits[1]!.index);
  });

  it('reports correct index and length', () => {
    const text = 'oh shit';
    const hits = findProfanity(text);
    const hit = hits[0]!;
    expect(hit.index).toBe(3);
    expect(hit.length).toBe(4);
    expect(text.slice(hit.index, hit.index + hit.length)).toBe('shit');
  });
});

describe('containsProfanity', () => {
  it('returns false for clean text', () => {
    expect(containsProfanity('A happy story')).toBe(false);
  });

  it('returns true for severe content', () => {
    expect(containsProfanity('what the fuck')).toBe(true);
  });

  it('returns true for moderate content at default severity', () => {
    expect(containsProfanity('damn that hurt')).toBe(true);
  });

  it('returns true for mild content at default severity', () => {
    expect(containsProfanity('you are stupid')).toBe(true);
  });

  it('respects minSeverity = moderate (mild words pass)', () => {
    expect(containsProfanity('you are stupid', 'moderate')).toBe(false);
    expect(containsProfanity('damn that hurt', 'moderate')).toBe(true);
  });

  it('respects minSeverity = severe (moderate words pass)', () => {
    expect(containsProfanity('damn that hurt', 'severe')).toBe(false);
    expect(containsProfanity('that is shit', 'severe')).toBe(true);
  });
});

describe('case insensitivity', () => {
  it('matches uppercase', () => {
    expect(containsProfanity('SHIT')).toBe(true);
  });

  it('matches mixed case', () => {
    expect(containsProfanity('ShIt')).toBe(true);
  });
});

describe('leetspeak handling', () => {
  it('catches digit substitutions (sh1t)', () => {
    expect(containsProfanity('that is sh1t')).toBe(true);
  });

  it('catches symbol substitutions ($hit)', () => {
    expect(containsProfanity('total $hit show')).toBe(true);
  });

  it('catches at-symbol for a (b@stard)', () => {
    expect(containsProfanity('that b@stard')).toBe(true);
  });

  it('catches multiple substitutions (5h1t)', () => {
    expect(containsProfanity('total 5h1t')).toBe(true);
  });
});

describe('repeated-letter handling', () => {
  it('catches stretched vowels (fuuuck)', () => {
    expect(containsProfanity('what the fuuuck')).toBe(true);
  });

  it('catches doubled consonants (shittt)', () => {
    expect(containsProfanity('that is shittt')).toBe(true);
  });
});

describe('inter-letter punctuation handling', () => {
  it('catches dot-separated (s.h.i.t)', () => {
    expect(containsProfanity('that is s.h.i.t')).toBe(true);
  });

  it('catches dash-separated (s-h-i-t)', () => {
    expect(containsProfanity('that is s-h-i-t')).toBe(true);
  });

  it('catches space-separated (s h i t) — falls under inter-letter punctuation', () => {
    expect(containsProfanity('that is s h i t')).toBe(true);
  });
});

describe('false-positive guards (whole-word matching)', () => {
  it('does NOT flag "assassin" (contains the b-word substring)', () => {
    expect(containsProfanity('a story about an assassin')).toBe(false);
  });

  it('does NOT flag "passive" (contains "ass")', () => {
    expect(containsProfanity('a passive verb')).toBe(false);
  });

  it('does NOT flag "Scunthorpe" (contains the c-word)', () => {
    expect(containsProfanity('Scunthorpe is in England')).toBe(false);
  });

  it('does NOT flag "essex" or "class"', () => {
    expect(containsProfanity('she lives in essex')).toBe(false);
    expect(containsProfanity('first class seat')).toBe(false);
  });

  it('does NOT flag "shitake" (mushroom)', () => {
    // shitake doesn't contain "shit" as a separate word, but the word starts
    // with the same letters — non-word boundary at end blocks the match.
    expect(containsProfanity('shitake mushrooms')).toBe(false);
  });
});

describe('multi-word entries', () => {
  it('catches "shut up" with normal spacing', () => {
    expect(containsProfanity('shut up already')).toBe(true);
  });

  it('catches "screw you" with normal spacing', () => {
    expect(containsProfanity('well, screw you')).toBe(true);
  });
});

describe('maskProfanity', () => {
  it('returns text unchanged when clean', () => {
    const result = maskProfanity('a happy story');
    expect(result.masked).toBe('a happy story');
    expect(result.hits).toHaveLength(0);
  });

  it('masks a single hit with asterisks of matching length', () => {
    const result = maskProfanity('oh shit');
    expect(result.masked).toBe('oh ****');
    expect(result.hits).toHaveLength(1);
  });

  it('masks multiple hits', () => {
    const result = maskProfanity('damn this shit');
    expect(result.masked).toBe('**** this ****');
  });

  it('preserves surrounding text exactly', () => {
    const result = maskProfanity('the word fuck appears here');
    expect(result.masked).toBe('the word **** appears here');
  });

  it('masks leetspeak hits', () => {
    const result = maskProfanity('total $h1t');
    expect(result.masked).toBe('total ****');
  });
});

describe('assertClean', () => {
  it('does not throw on clean text', () => {
    expect(() => assertClean('a happy story')).not.toThrow();
  });

  it('throws on severe content (default minSeverity = moderate)', () => {
    expect(() => assertClean('what the fuck')).toThrow("Let's try a different word");
  });

  it('throws on moderate content (default minSeverity = moderate)', () => {
    expect(() => assertClean('damn that')).toThrow("Let's try a different word");
  });

  it('does NOT throw on mild content (default minSeverity = moderate)', () => {
    expect(() => assertClean('you are stupid')).not.toThrow();
  });

  it('throws with code UNSAFE_CONTENT', () => {
    try {
      assertClean('what the fuck');
      expect.fail('Should have thrown');
    } catch (error: unknown) {
      expect((error as { code: string }).code).toBe('UNSAFE_CONTENT');
    }
  });

  it('respects minSeverity = severe (moderate passes)', () => {
    expect(() => assertClean('damn that', 'severe')).not.toThrow();
    expect(() => assertClean('what the fuck', 'severe')).toThrow();
  });

  it('respects minSeverity = mild (mild blocked)', () => {
    expect(() => assertClean('you are stupid', 'mild')).toThrow();
  });
});

describe('voice transcript scenario (mask-not-throw)', () => {
  it('masks transcribed sing-along profanity without throwing', () => {
    // simulating a transcribed kid voice recording that slipped a swear
    const transcript = 'I love singing this damn song so much';
    const { masked, hits } = maskProfanity(transcript);
    expect(masked).toBe('I love singing this **** song so much');
    expect(hits).toHaveLength(1);
    expect(hits[0]!.severity).toBe('moderate');
  });

  it('returns hits so caller can decide flagging policy', () => {
    const transcript = 'this shit is bad';
    const { hits } = maskProfanity(transcript);
    expect(hits[0]!.severity).toBe('severe');
    // caller (e.g. performanceService) can use severity to decide:
    //   - severe → flag for review, set status='flagged'
    //   - moderate → publish but auto-mask in display
    //   - mild → publish unchanged
  });
});
