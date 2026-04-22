'use client';

import { useState } from 'react';
import { Copy, Share2, Users, BookOpen, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClassDoc } from '@/types/user.types';

interface Student {
  id: string;
  name: string;
  avatar?: string;
  grade?: string;
  totalCreations: number;
  aiPoints: number;
  conceptsLearned: string[];
  lastActiveDate?: string;
}

type SortKey = 'name' | 'activity' | 'concepts';

interface Props {
  classDoc: ClassDoc;
  students: Student[];
  onOpenAssignmentCreator?: () => void;
}

export function ClassManagement({ classDoc, students, onOpenAssignmentCreator }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [copied, setCopied] = useState(false);

  const sorted = [...students].sort((a, b) => {
    if (sortKey === 'name') return a.name.localeCompare(b.name);
    if (sortKey === 'activity') return b.totalCreations - a.totalCreations;
    return b.conceptsLearned.length - a.conceptsLearned.length;
  });

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(classDoc.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  async function handleShareCode() {
    const text = `Join my class "${classDoc.name}" on GSI AI Studio. Invite code: ${classDoc.inviteCode}`;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: `Join ${classDoc.name}`, text });
      } catch {
        // cancelled
      }
    } else {
      await handleCopyCode();
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-gray-100 bg-white p-5">
        <div>
          <h2 className="font-display text-xl font-bold text-gray-900">{classDoc.name}</h2>
          <p className="mt-1 text-sm text-gray-500">
            Grade {classDoc.grade}
            {classDoc.section ? ` · Section ${classDoc.section}` : ''} ·{' '}
            {students.length} {students.length === 1 ? 'student' : 'students'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 rounded-2xl bg-purple-50 px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-purple-500">
              Invite code
            </span>
            <code className="font-mono text-lg font-bold text-purple-700">
              {classDoc.inviteCode}
            </code>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1 rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-50"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleShareCode}
              className="inline-flex items-center gap-1 rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-50"
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
            {onOpenAssignmentCreator && (
              <button
                onClick={onOpenAssignmentCreator}
                className="rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700"
              >
                Create assignment
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Students</h3>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>Sort:</span>
            {(['name', 'activity', 'concepts'] as SortKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setSortKey(k)}
                className={cn(
                  'rounded-md px-2 py-1',
                  sortKey === k ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100',
                )}
              >
                {k === 'name' ? 'Name' : k === 'activity' ? 'Most active' : 'Concepts'}
              </button>
            ))}
          </div>
        </div>

        {students.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-500">
              No students yet. Share the invite code — students join by entering it from
              their parent account.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {sorted.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold text-purple-700">
                    {s.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/images/avatars/${s.avatar}.png`} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      s.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{s.name}</p>
                    {s.grade && (
                      <p className="text-xs text-gray-400">Grade {s.grade}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" /> {s.totalCreations}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {s.conceptsLearned.length}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Award className="h-3.5 w-3.5 text-amber-500" /> {s.aiPoints}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
