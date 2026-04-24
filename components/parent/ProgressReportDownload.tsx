'use client';

import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

type Range = 'month' | 'term' | 'year';

interface Props {
  kidId: string;
  kidName?: string;
}

export function ProgressReportDownload({ kidId, kidName }: Props) {
  const { getIdToken } = useAuth();
  const [range, setRange] = useState<Range>('term');
  const [locale, setLocale] = useState<'en' | 'hi'>('en');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const token = await getIdToken();
      const res = await fetch(
        `/api/reports/progress?kidId=${encodeURIComponent(kidId)}&range=${range}&locale=${locale}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? 'Download failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <FileText className="h-4 w-4 text-indigo-600" />
        Progress report{kidName ? ` for ${kidName}` : ''}
      </h3>
      <p className="mt-1 text-xs text-slate-600">
        A school-branded PDF summarising creations, AI concepts engaged, badges,
        streaks, and recent teacher feedback.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-slate-700">Range</span>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as Range)}
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="month">Past month</option>
            <option value="term">This term</option>
            <option value="year">This year</option>
          </select>
        </label>
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-slate-700">Language</span>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as 'en' | 'hi')}
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
          </select>
        </label>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={download}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          {busy ? 'Preparing…' : 'Download PDF'}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}
