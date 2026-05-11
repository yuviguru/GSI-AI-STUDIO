'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function SubstituteAlertWidget() {
  const { getIdToken, isAuthenticated } = useAuth();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated) return;

    (async () => {
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch('/api/substitutes/today', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { absencesToday?: number };
        if (!cancelled) setCount(data.absencesToday ?? 0);
      } catch {
        // Endpoint may not exist yet — leave count null and render the link only.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getIdToken, isAuthenticated]);

  return (
    <Link
      href="/school/substitutes"
      className="group flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
        <UserCheck className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-brand-text">Substitutes</p>
        <p className="text-[11px] text-brand-text-secondary">
          {count === null ? 'View timetable' : `${count} absence${count === 1 ? '' : 's'} today`}
        </p>
      </div>
      <span className="text-xs font-semibold text-brand-primary opacity-0 transition group-hover:opacity-100">
        Open →
      </span>
    </Link>
  );
}
