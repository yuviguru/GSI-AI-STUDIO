'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface ComplianceSnapshot {
  consentRate: number;
  openRequests: number;
  lastSnapshotAt?: string | null;
}

export function ComplianceStatusWidget() {
  const { getIdToken, isAuthenticated } = useAuth();
  const [snapshot, setSnapshot] = useState<ComplianceSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated) return;

    (async () => {
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch('/api/admin/compliance/dpdp-snapshot', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = (await res.json()) as ComplianceSnapshot;
        if (!cancelled) setSnapshot(data);
      } catch {
        // Endpoint may be permissioned — render the link with no metrics.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getIdToken, isAuthenticated]);

  return (
    <Link
      href="/school/compliance"
      className="group flex items-start gap-3 rounded-2xl bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
        <ShieldCheck className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-brand-text">Compliance</p>
        {snapshot ? (
          <div className="mt-0.5 flex items-baseline gap-3">
            <span className="text-[11px] text-brand-text-secondary">
              {Math.round(snapshot.consentRate * 100)}% consent
            </span>
            <span className="text-[11px] text-brand-text-secondary">
              {snapshot.openRequests} open
            </span>
          </div>
        ) : (
          <p className="text-[11px] text-brand-text-secondary">DPDP register & data rights</p>
        )}
      </div>
      <span className="text-xs font-semibold text-brand-primary opacity-0 transition group-hover:opacity-100">
        Open →
      </span>
    </Link>
  );
}
