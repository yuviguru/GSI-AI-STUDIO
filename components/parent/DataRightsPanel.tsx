'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Download, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { ErasureRequest } from '@/types/dpdp.types';

interface Props {
  kidId: string;
  kidName?: string;
}

export function DataRightsPanel({ kidId, kidName }: Props) {
  const { getIdToken } = useAuth();
  const [requests, setRequests] = useState<ErasureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch('/api/dpdp/erasure', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (res.ok) {
      setRequests(
        (json.data?.requests ?? []).map((r: ErasureRequest & { createdAt: string; completedAt?: string }) => ({
          ...r,
          createdAt: new Date(r.createdAt),
          completedAt: r.completedAt ? new Date(r.completedAt) : undefined,
        })),
      );
    }
    setLoading(false);
  }, [getIdToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/dpdp/erasure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ kidId, reason: reason.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? 'Request failed');
      setMessage(
        'Erasure request queued. We\'ll complete the cascade within 30 days and email you a signed receipt.',
      );
      setConfirmOpen(false);
      setReason('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  }

  const requestsForThisKid = requests.filter((r) => r.kidId === kidId);
  const pending = requestsForThisKid.find((r) => r.status === 'pending' || r.status === 'in_progress');

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Download className="h-4 w-4" />
          Download your child&apos;s data
        </h3>
        <p className="mt-1 text-xs text-slate-600">
          Request a one-time export (JSON + PDF) of everything GSI stores about
          {kidName ? ` ${kidName}` : ' your child'}. Available once per 7 days per kid.
        </p>
        <button
          type="button"
          disabled
          className="mt-3 inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500"
          title="Wiring the export endpoint is a follow-up to this DPDP MVP."
        >
          <Download className="h-3 w-3" />
          Request export (coming soon)
        </button>
      </div>

      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-red-900">
          <Trash2 className="h-4 w-4" />
          Delete your child&apos;s account
        </h3>
        <p className="mt-1 text-xs text-red-900/80">
          Removes all creations, submissions, AI-generated narratives, badges, and
          messaging history. Cannot be undone. Completes within 30 days per the DPDP
          Act 2023 and we deliver you a signed receipt.
        </p>

        {loading ? (
          <p className="mt-3 text-xs text-red-900/60">Loading…</p>
        ) : pending ? (
          <div className="mt-3 rounded border border-red-200 bg-white p-3 text-xs text-red-900">
            <p className="font-semibold">Erasure already in progress</p>
            <p className="mt-0.5">
              Status: {pending.status} · Requested{' '}
              {pending.createdAt.toLocaleString()}
            </p>
          </div>
        ) : confirmOpen ? (
          <div className="mt-3 space-y-2">
            <label className="block text-xs font-medium text-red-900">
              Reason (optional — helps us improve)
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value.slice(0, 500))}
                rows={2}
                className="mt-1 w-full rounded border border-red-300 bg-white px-2 py-1 text-xs text-red-900"
                placeholder="Tell us why you're leaving if you'd like."
              />
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                <AlertTriangle className="h-3 w-3" />
                {submitting ? 'Submitting…' : 'Yes, delete my child\'s data'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="mt-3 inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-3 w-3" />
            Request account deletion
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
      {message && (
        <p className="text-xs text-emerald-700">{message}</p>
      )}

      {requestsForThisKid.length > 0 && (
        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Past requests</h3>
          <ul className="mt-2 divide-y divide-slate-100 text-xs text-slate-700">
            {requestsForThisKid.map((r) => (
              <li key={r.id} className="py-2">
                <span className="font-medium capitalize">{r.status}</span>
                <span className="ml-2 text-slate-500">
                  {r.createdAt.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
