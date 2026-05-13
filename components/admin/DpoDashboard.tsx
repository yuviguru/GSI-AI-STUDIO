'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, FileText, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { ErasureRequest } from '@gsi/types';

interface SnapshotResponseRaw {
  consentSnapshot: {
    kidsTotal: number;
    consentCounts: Record<string, number>;
  };
  teacherAiUsage: Array<{
    generator: string;
    last30Days: number;
    last12Months: number;
  }>;
  erasureRequests: Array<{
    id: string;
    status: ErasureRequest['status'];
    createdAt: string;
    completedAt?: string;
  }>;
}

interface SnapshotResponse {
  consentSnapshot: {
    kidsTotal: number;
    consentCounts: Record<string, number>;
  };
  teacherAiUsage: Array<{
    generator: string;
    last30Days: number;
    last12Months: number;
  }>;
  erasureRequests: Array<{
    id: string;
    status: ErasureRequest['status'];
    createdAt: Date;
    completedAt?: Date;
  }>;
}

const GENERATOR_LABELS: Record<string, string> = {
  hpc: 'HPC narratives',
  questionPaper: 'Question papers',
  feedback: 'Submission feedback',
  lessonPlan: 'Lesson plans',
  ptm: 'PTM notes',
  digest: 'Parent digests',
  adhoc: 'Ad-hoc messages',
  subInstructions: 'Substitute instructions',
};

export function DpoDashboard() {
  const { getIdToken } = useAuth();
  const [snapshot, setSnapshot] = useState<SnapshotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/admin/compliance/dpdp-snapshot', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? 'Could not load snapshot.');
      const data = json.data as SnapshotResponseRaw;
      setSnapshot({
        ...data,
        erasureRequests: data.erasureRequests.map((r) => ({
          ...r,
          createdAt: new Date(r.createdAt),
          completedAt: r.completedAt ? new Date(r.completedAt) : undefined,
        })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load snapshot.');
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function downloadV2() {
    setDownloading(true);
    setError(null);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/admin/compliance?version=2', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? 'PDF download failed.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF download failed.');
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading DPDP snapshot…</p>;
  }
  if (!snapshot) {
    return <p className="text-sm text-red-600">{error ?? 'No data.'}</p>;
  }

  const { consentSnapshot, teacherAiUsage, erasureRequests } = snapshot;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <h3 className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="h-4 w-4" /> Compliance v2 PDF
        </h3>
        <p className="mt-1 text-xs">
          One download serves both the CBSE AI-CT compliance artifact and the
          DPDP Act 2023 data-processing register. Includes consent snapshot,
          teacher AI usage rollup, and the erasure-request log.
        </p>
        <button
          type="button"
          onClick={downloadV2}
          disabled={downloading}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          {downloading ? 'Preparing…' : 'Download Compliance v2 PDF'}
        </button>
        {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">Consent snapshot</h3>
          <p className="mt-1 text-xs text-slate-600">
            <strong>{consentSnapshot.kidsTotal}</strong> kid
            {consentSnapshot.kidsTotal === 1 ? '' : 's'} on roster.
          </p>
          <ul className="mt-2 space-y-1 text-xs">
            {Object.entries(consentSnapshot.consentCounts).map(([scope, count]) => (
              <li key={scope} className="flex items-center justify-between">
                <span className="capitalize text-slate-700">{scope.replace(/_/g, ' ')}</span>
                <span className="font-medium text-slate-900">{count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">Teacher AI usage</h3>
          <table className="mt-2 w-full text-xs">
            <thead>
              <tr className="text-slate-500">
                <th className="pb-1 text-left">Generator</th>
                <th className="pb-1 text-right">30d</th>
                <th className="pb-1 text-right">12m</th>
              </tr>
            </thead>
            <tbody>
              {teacherAiUsage.map((u) => (
                <tr key={u.generator} className="border-t border-slate-100">
                  <td className="py-1 text-slate-700">
                    {GENERATOR_LABELS[u.generator] ?? u.generator}
                  </td>
                  <td className="py-1 text-right">{u.last30Days}</td>
                  <td className="py-1 text-right">{u.last12Months}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <FileText className="h-4 w-4" /> Right-to-erasure log
        </h3>
        {erasureRequests.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">No erasure requests on file.</p>
        ) : (
          <table className="mt-2 w-full text-xs">
            <thead>
              <tr className="text-slate-500">
                <th className="pb-1 text-left">ID</th>
                <th className="pb-1 text-left">Status</th>
                <th className="pb-1 text-left">Created</th>
                <th className="pb-1 text-left">Completed</th>
              </tr>
            </thead>
            <tbody>
              {erasureRequests.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="py-1 font-mono text-slate-700">{r.id.slice(0, 10)}</td>
                  <td className="py-1 capitalize text-slate-700">{r.status}</td>
                  <td className="py-1 text-slate-700">
                    {r.createdAt.toLocaleDateString()}
                  </td>
                  <td className="py-1 text-slate-700">
                    {r.completedAt ? r.completedAt.toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
