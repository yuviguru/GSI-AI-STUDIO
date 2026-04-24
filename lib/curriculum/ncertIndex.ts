/**
 * Phase 4 (CONTENT-001): loader + accessors for the NCERT chapter index.
 *
 * The raw data lives as JSON files under `data/curriculum/ncert/`. This
 * module is the only place that imports those files, so additions don't
 * ripple through the codebase. Generators (A2 question paper, A4 lesson
 * plan) and the chapter-picker UI go through these accessors.
 */

import science6 from '../../data/curriculum/ncert/6-science.json';

export type Subject =
  | 'Science'
  | 'Mathematics'
  | 'English'
  | 'Social Science'
  | 'Hindi';

export type Board = 'cbse' | 'icse' | 'state';

export interface ChapterEntry {
  id: string;
  chapterNumber: number;
  chapterName: string;
  class: string;
  subject: Subject;
  board: Board;
  learningOutcomes: string[];
  aiCtConceptTags: string[];
  durationHours: number;
  keyTerms?: string[];
}

const RAW: ChapterEntry[] = [
  ...(science6 as ChapterEntry[]),
];

// Build a map for O(1) lookup by id. Duplicate ids would be a data bug.
const BY_ID = new Map<string, ChapterEntry>();
for (const entry of RAW) {
  if (BY_ID.has(entry.id)) {
    // eslint-disable-next-line no-console
    console.warn(`[ncertIndex] duplicate chapter id: ${entry.id}`);
  }
  BY_ID.set(entry.id, entry);
}

export interface ChapterFilter {
  subject?: Subject;
  classGrade?: string;
  board?: Board;
  aiCtConcept?: string;
}

export function listChapters(filter: ChapterFilter = {}): ChapterEntry[] {
  return RAW.filter((c) => {
    if (filter.subject && c.subject !== filter.subject) return false;
    if (filter.classGrade && c.class !== filter.classGrade) return false;
    if (filter.board && c.board !== filter.board) return false;
    if (filter.aiCtConcept && !c.aiCtConceptTags.includes(filter.aiCtConcept)) {
      return false;
    }
    return true;
  });
}

export function getChapter(id: string): ChapterEntry | null {
  return BY_ID.get(id) ?? null;
}

export function searchChapters(query: string, limit = 20): ChapterEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];
  const matches: ChapterEntry[] = [];
  for (const c of RAW) {
    if (
      c.chapterName.toLowerCase().includes(q) ||
      (c.keyTerms ?? []).some((t) => t.toLowerCase().includes(q))
    ) {
      matches.push(c);
      if (matches.length >= limit) break;
    }
  }
  return matches;
}

export function getChaptersByAiCtConcept(conceptId: string): ChapterEntry[] {
  return RAW.filter((c) => c.aiCtConceptTags.includes(conceptId));
}

/** Availability sweep — used by admin UIs to render "coverage" indicators. */
export function summarizeCoverage(): Array<{
  classGrade: string;
  subject: Subject;
  chapterCount: number;
}> {
  const counts = new Map<string, { classGrade: string; subject: Subject; chapterCount: number }>();
  for (const c of RAW) {
    const key = `${c.class}_${c.subject}`;
    const existing = counts.get(key);
    if (existing) {
      existing.chapterCount += 1;
    } else {
      counts.set(key, { classGrade: c.class, subject: c.subject, chapterCount: 1 });
    }
  }
  return Array.from(counts.values()).sort((a, b) =>
    a.classGrade === b.classGrade
      ? a.subject.localeCompare(b.subject)
      : a.classGrade.localeCompare(b.classGrade),
  );
}
