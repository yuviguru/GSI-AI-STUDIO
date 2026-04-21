'use client';

import { useMemo, useState } from 'react';
import { Filter, Star, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SubmissionDoc, SubmissionStatus } from '@/types/user.types';

export interface SubmissionRow extends SubmissionDoc {
  kid: { id: string; name: string; avatar?: string; grade?: string };
  creation: {
    id: string;
    type: string;
    title: string;
    thumbnail?: string;
    aiConceptsTaught: string[];
    createdAt: Date;
  } | null;
}

type FilterKey = 'all' | SubmissionStatus;
type SortKey = 'submittedAt' | 'name';

const STATUS_META: Record<SubmissionStatus, { label: string; tone: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: 'Pending', tone: 'bg-blue-50 text-blue-700', icon: Clock },
  approved: { label: 'Approved', tone: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  revision_requested: {
    label: 'Revise',
    tone: 'bg-amber-50 text-amber-700',
    icon: AlertTriangle,
  },
};

interface Props {
  submissions: SubmissionRow[];
  totalExpected?: number;
  onSelect: (submissionId: string) => void;
  onBulkApprove: () => Promise<void>;
  selectedId?: string;
}

export function SubmissionGrid({
  submissions,
  totalExpected,
  onSelect,
  onBulkApprove,
  selectedId,
}: Props) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState<SortKey>('submittedAt');
  const [bulkBusy, setBulkBusy] = useState(false);

  const filtered = useMemo(() => {
    const list = submissions.filter((s) => filter === 'all' || s.status === filter);
    return list.sort((a, b) => {
      if (sort === 'name') return a.kid.name.localeCompare(b.kid.name);
      return b.submittedAt.getTime() - a.submittedAt.getTime();
    });
  }, [submissions, filter, sort]);

  const pendingCount = submissions.filter((s) => s.status === 'pending').length;
  const expected = totalExpected ?? submissions.length;

  async function handleBulkApprove() {
    if (pendingCount === 0) return;
    if (!window.confirm(`Approve all ${pendingCount} pending submissions?`)) return;
    setBulkBusy(true);
    try {
      await onBulkApprove();
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-700">
              {submissions.length} submitted
              {expected > 0 ? ` / ${expected} students` : ''}
            </p>
            <div className="mt-1 h-1.5 w-48 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-purple-500"
                style={{
                  width: `${
                    expected > 0
                      ? Math.min(100, (submissions.length / expected) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
          <button
            onClick={handleBulkApprove}
            disabled={pendingCount === 0 || bulkBusy}
            className={cn(
              'rounded-xl px-3 py-2 text-xs font-semibold text-white transition',
              pendingCount === 0 || bulkBusy
                ? 'bg-gray-300'
                : 'bg-purple-600 hover:bg-purple-700',
            )}
          >
            {bulkBusy
              ? 'Approving…'
              : pendingCount > 0
                ? `Approve all pending (${pendingCount})`
                : 'No pending submissions'}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <Filter className="h-3.5 w-3.5" /> Filter:
          </span>
          {(['all', 'pending', 'approved', 'revision_requested'] as FilterKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium',
                filter === key
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100',
              )}
            >
              {key === 'all'
                ? 'All'
                : key === 'revision_requested'
                  ? 'Revise'
                  : key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-500">
            Sort:{' '}
            <button
              onClick={() => setSort('submittedAt')}
              className={cn('ml-1', sort === 'submittedAt' ? 'font-semibold text-purple-600' : '')}
            >
              Recent
            </button>{' '}
            ·{' '}
            <button
              onClick={() => setSort('name')}
              className={cn(sort === 'name' ? 'font-semibold text-purple-600' : '')}
            >
              Name
            </button>
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          {submissions.length === 0
            ? 'No submissions yet. Waiting for students…'
            : 'No submissions match this filter.'}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => {
            const meta = STATUS_META[s.status];
            const Icon = meta.icon;
            return (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={cn(
                  'flex flex-col gap-2 rounded-2xl border bg-white p-3 text-left transition hover:border-purple-200 hover:shadow-sm',
                  selectedId === s.id ? 'border-purple-400 shadow' : 'border-gray-100',
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold text-purple-700">
                    {s.kid.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {s.kid.name}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {s.creation?.title ?? 'Untitled creation'}
                    </p>
                  </div>
                  {s.starred && <Star className="h-4 w-4 flex-shrink-0 fill-amber-400 text-amber-400" />}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">
                    {s.submittedAt.toLocaleDateString()}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium',
                      meta.tone,
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {meta.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
