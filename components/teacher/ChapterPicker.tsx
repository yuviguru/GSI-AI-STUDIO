'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { searchChapters, listChapters, type ChapterEntry } from '@/lib/curriculum/ncertIndex';

interface Props {
  value?: string;
  onChange: (chapterId: string, chapter: ChapterEntry) => void;
  classGrade?: string;
  subject?: string;
}

export function ChapterPicker({ value, onChange, classGrade, subject }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    if (query.trim().length === 0) {
      return listChapters({ classGrade, subject: subject as never })
        .slice(0, 8);
    }
    return searchChapters(query, 8);
  }, [query, classGrade, subject]);

  const current = useMemo(
    () => (value ? listChapters().find((c) => c.id === value) : undefined),
    [value],
  );

  return (
    <div>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 100)}
          placeholder="Search NCERT chapters…"
          className="w-full rounded border border-slate-300 px-9 py-2 text-sm"
        />
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
      </div>
      {open && results.length > 0 && (
        <ul className="z-10 mt-1 max-h-60 overflow-y-auto rounded border border-slate-200 bg-white shadow-md">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(c.id, c);
                  setOpen(false);
                  setQuery('');
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-indigo-50"
              >
                <span className="font-medium text-slate-900">
                  {c.subject} · Class {c.class}
                </span>
                <span className="ml-2 text-slate-700">{c.chapterName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {current && (
        <p className="mt-2 text-xs text-slate-600">
          Selected: <strong>{current.subject} · Class {current.class}</strong> — {current.chapterName}
        </p>
      )}
    </div>
  );
}
