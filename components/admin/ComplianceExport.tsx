'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

type RangePreset = 'month' | 'quarter' | 'custom';

function monthAgo(d = new Date()): Date {
  const copy = new Date(d);
  copy.setMonth(copy.getMonth() - 1);
  return copy;
}

function quarterAgo(d = new Date()): Date {
  const copy = new Date(d);
  copy.setMonth(copy.getMonth() - 3);
  return copy;
}

/**
 * Button + date-range selector that downloads a CBSE AI compliance PDF
 * (generated server-side via /api/admin/compliance).
 */
export function ComplianceExport() {
  const { getIdToken } = useAuth();
  const [preset, setPreset] = useState<RangePreset>('month');
  const [customStart, setCustomStart] = useState(() =>
    monthAgo().toISOString().slice(0, 10),
  );
  const [customEnd, setCustomEnd] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setError(null);
    setBusy(true);
    try {
      const end = preset === 'custom' ? new Date(customEnd) : new Date();
      let start: Date;
      if (preset === 'month') start = monthAgo(end);
      else if (preset === 'quarter') start = quarterAgo(end);
      else start = new Date(customStart);

      const token = await getIdToken();
      if (!token) throw new Error('Please sign in as a school admin first.');

      const url = `/api/admin/compliance?start=${encodeURIComponent(
        start.toISOString(),
      )}&end=${encodeURIComponent(end.toISOString())}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'PDF generation failed.');
      }
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `compliance-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Compliance report</h3>
        <button
          onClick={download}
          disabled={busy}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]',
            busy ? 'bg-gray-300' : 'bg-purple-600 hover:bg-purple-700',
          )}
        >
          <Download className="h-4 w-4" />
          {busy ? 'Building PDF…' : 'Download'}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {(['month', 'quarter', 'custom'] as RangePreset[]).map((p) => (
          <button
            key={p}
            onClick={() => setPreset(p)}
            className={cn(
              'rounded-full px-3 py-1 font-medium',
              preset === p ? 'bg-purple-100 text-purple-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100',
            )}
          >
            {p === 'month' ? 'Last month' : p === 'quarter' ? 'Last quarter' : 'Custom range'}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1 text-gray-500">
            Start
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-purple-400 focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-1 text-gray-500">
            End
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-purple-400 focus:outline-none"
            />
          </label>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400">
        PDF covers curriculum alignment, student participation, assignment
        completion — formatted for CBSE audit submission.
      </p>
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
