'use client';

import { useMemo, useState } from 'react';
import {
  getConceptsByCategory,
  CURRICULUM_CATEGORIES,
  type CurriculumCategory,
} from '@/lib/curriculum/curriculumMap';
import { cn } from '@/lib/utils';

interface Cell {
  conceptId: string;
  conceptName: string;
  studentsExposed: number;
  percentage: number;
}

interface Props {
  coverage: Cell[];
  totalStudents: number;
}

function colorFor(pct: number): string {
  if (pct >= 75) return 'bg-emerald-600 text-white';
  if (pct >= 50) return 'bg-emerald-300 text-emerald-900';
  if (pct >= 25) return 'bg-amber-200 text-amber-900';
  if (pct > 0) return 'bg-rose-200 text-rose-900';
  return 'bg-gray-100 text-gray-500';
}

export function CurriculumHeatmap({ coverage, totalStudents }: Props) {
  const byCategory = useMemo(() => getConceptsByCategory(), []);
  const coverageById = useMemo(
    () => new Map(coverage.map((c) => [c.conceptId, c])),
    [coverage],
  );
  const [selected, setSelected] = useState<Cell | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span className="font-semibold uppercase tracking-wide">Coverage legend:</span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-4 rounded bg-rose-200" /> 1–24%
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-4 rounded bg-amber-200" /> 25–49%
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-4 rounded bg-emerald-300" /> 50–74%
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-4 rounded bg-emerald-600" /> 75–100%
        </span>
        <span className="ml-auto">{totalStudents} students tracked</span>
      </div>

      <div className="space-y-4">
        {(Object.keys(byCategory) as CurriculumCategory[]).map((cat) => {
          const concepts = byCategory[cat];
          if (!concepts || concepts.length === 0) return null;
          return (
            <div key={cat}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {CURRICULUM_CATEGORIES[cat].label}
              </p>
              <div className="grid gap-1.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {concepts.map((c) => {
                  const row = coverageById.get(c.id);
                  const pct = row?.percentage ?? 0;
                  return (
                    <button
                      key={c.id}
                      onClick={() =>
                        setSelected({
                          conceptId: c.id,
                          conceptName: c.name,
                          studentsExposed: row?.studentsExposed ?? 0,
                          percentage: pct,
                        })
                      }
                      className={cn(
                        'flex flex-col items-start gap-0.5 rounded-xl p-3 text-left transition hover:ring-2 hover:ring-purple-200',
                        colorFor(pct),
                      )}
                    >
                      <span className="text-xs font-semibold">{c.name}</span>
                      <span className="text-xs opacity-90">{pct}% coverage</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Concept detail
            </p>
            <h3 className="mt-1 text-lg font-bold text-gray-900">{selected.conceptName}</h3>
            <p className="mt-3 text-sm text-gray-600">
              <span className="font-semibold text-gray-900">
                {selected.studentsExposed}
              </span>{' '}
              of {totalStudents} students exposed ({selected.percentage}%)
            </p>
            <button
              onClick={() => setSelected(null)}
              className="mt-4 w-full rounded-xl bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
