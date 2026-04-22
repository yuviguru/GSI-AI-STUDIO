'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeacherRow {
  teacherUid: string;
  teacherName: string;
  classes: number;
  assignmentsCreated: number;
  avgCompletionRate: number;
  lastActiveAt?: Date;
}

type SortKey = 'teacherName' | 'classes' | 'assignmentsCreated' | 'avgCompletionRate' | 'lastActiveAt';

interface Props {
  teachers: TeacherRow[];
}

function compare(a: TeacherRow, b: TeacherRow, key: SortKey, dir: 1 | -1): number {
  const getVal = (row: TeacherRow): number | string => {
    if (key === 'teacherName') return row.teacherName ?? '';
    if (key === 'lastActiveAt') return row.lastActiveAt?.getTime() ?? 0;
    return (row[key] as number) ?? 0;
  };
  const va = getVal(a);
  const vb = getVal(b);
  if (typeof va === 'string' && typeof vb === 'string') {
    return dir * va.localeCompare(vb);
  }
  return dir * ((va as number) - (vb as number));
}

export function TeacherActivityTable({ teachers }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('assignmentsCreated');
  const [dir, setDir] = useState<1 | -1>(-1);

  const sorted = useMemo(
    () => [...teachers].sort((a, b) => compare(a, b, sortKey, dir)),
    [teachers, sortKey, dir],
  );

  function toggleSort(key: SortKey) {
    if (key === sortKey) setDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setDir(-1);
    }
  }

  function exportCsv() {
    const header = [
      'Teacher',
      'Classes',
      'Assignments created',
      'Avg completion %',
      'Last active',
    ];
    const rows = sorted.map((t) => [
      escapeCsv(t.teacherName ?? ''),
      t.classes,
      t.assignmentsCreated,
      t.avgCompletionRate,
      t.lastActiveAt ? t.lastActiveAt.toISOString() : '',
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teachers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns: { key: SortKey; label: string; width?: string }[] = [
    { key: 'teacherName', label: 'Teacher' },
    { key: 'classes', label: 'Classes' },
    { key: 'assignmentsCreated', label: 'Assignments' },
    { key: 'avgCompletionRate', label: 'Completion %' },
    { key: 'lastActiveAt', label: 'Last active' },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-700">Teacher activity</h3>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="cursor-pointer px-4 py-2 text-left font-medium hover:text-gray-600"
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      dir === 1 ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-6 text-center text-sm text-gray-400"
                >
                  No teacher activity yet.
                </td>
              </tr>
            ) : (
              sorted.map((t) => (
                <tr
                  key={t.teacherUid}
                  className={cn(
                    'border-b border-gray-50 transition',
                    'hover:bg-purple-50/40',
                  )}
                >
                  <td className="px-4 py-2 font-medium text-gray-900">
                    {t.teacherName}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{t.classes}</td>
                  <td className="px-4 py-2 text-gray-600">{t.assignmentsCreated}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {t.avgCompletionRate}%
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {t.lastActiveAt
                      ? t.lastActiveAt.toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
